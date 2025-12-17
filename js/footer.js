// js/footer.js
const STATUS_URL = "/status.json";

function setStatus(state, tooltip) {
  const pill = document.getElementById("statusPill");
  const text = document.getElementById("statusText");
  if (!pill || !text) return;

  pill.classList.remove("is-online", "is-degraded", "is-offline");

  if (state === "online") {
    pill.classList.add("is-online");
    text.textContent = "Online";
  } else if (state === "degraded") {
    pill.classList.add("is-degraded");
    text.textContent = "Degraded";
  } else {
    pill.classList.add("is-offline");
    text.textContent = "Offline";
  }

  pill.title = tooltip || text.textContent;
}

async function checkSystemStatus() {
  try {
    const res = await fetch(STATUS_URL, { cache: "no-store" });
    if (!res.ok) return setStatus("offline", `Status check failed (${res.status})`);

    const data = await res.json();
    const status = (data?.status || "").toLowerCase();

    if (status === "online" || status === "degraded" || status === "offline") {
      setStatus(status, `Status: ${status}`);
    } else {
      setStatus("degraded", "Status: unknown payload");
    }
  } catch {
    setStatus("offline", "Status: unreachable");
  }
}

checkSystemStatus();
setInterval(checkSystemStatus, 60000);
