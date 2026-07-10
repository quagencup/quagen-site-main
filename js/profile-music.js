// js/profile-music.js
document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     CONFIG
  ========================================================= */
  const FADE_MS = 320;
  const HOVER_FADE_MS = 220;

  const DEFAULT_VOL = 0.65;

  const PLAYER_MAX_WIDTH = 760;

  const COVERS_DIR = "assets/covers/";
  const COVER_EXTS = ["webp", "png", "jpg", "jpeg"];

  // Player button PNGs (swap anytime)
  const ICONS = {
    play: "assets/extraicons/controls/play.png",
    pause: "assets/extraicons/controls/pause.png",
    prev: "assets/extraicons/controls/prev.png",
    next: "assets/extraicons/controls/next.png",

    mute: "assets/extraicons/controls/mute.png",
    unmute: "assets/extraicons/controls/unmute.png",

    shuffleOn: "assets/extraicons/controls/shuffle-on.png",
    shuffleOff: "assets/extraicons/controls/shuffle-off.png",

    loopOn: "assets/extraicons/controls/loop-on.png",
    loopOff: "assets/extraicons/controls/loop-off.png",

    playlist: "assets/extraicons/controls/playlist.png",
    close: "assets/extraicons/controls/close.png",

    defaultCover: "assets/icon.webp",
  };

  // Team card theme music source:
  // <div class="card" data-music="assets/songs/person-theme.mp3">
  const TEAM_CARD_SELECTOR = ".card[data-music]";

  // Footer avoidance target
  const FOOTER_SELECTOR = ".site-footer";

  /* =========================================================
     HELPERS
  ========================================================= */
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  function fadeTo(audio, targetVolume, durationMs, onDone) {
    if (!audio) return;
    const startVol = typeof audio.volume === "number" ? audio.volume : 1;
    const target = clamp01(targetVolume);

    if (durationMs <= 0) {
      audio.volume = target;
      if (typeof onDone === "function") onDone();
      return;
    }

    const steps = 24;
    const stepTime = durationMs / steps;
    let i = 0;

    const iv = setInterval(() => {
      i++;
      const t = i / steps;
      audio.volume = startVol + (target - startVol) * t;

      if (i >= steps) {
        clearInterval(iv);
        audio.volume = target;
        if (typeof onDone === "function") onDone();
      }
    }, stepTime);
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function titleFromSrc(src) {
    try {
      const file = (src || "").split("/").pop() || "";
      const noExt = file.replace(/\.[^.]+$/, "");
      return decodeURIComponent(noExt).replace(/[_]+/g, " ").trim() || "Unknown";
    } catch {
      return "Unknown";
    }
  }

  function baseNameFromSrc(src) {
    try {
      const file = (src || "").split("/").pop() || "";
      return decodeURIComponent(file.replace(/\.[^.]+$/, "")).trim();
    } catch {
      return "";
    }
  }

  async function urlExists(url) {
    // same-origin asset check
    try {
      const res = await fetch(url, { method: "HEAD", cache: "force-cache" });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Cache resolved covers so we don't spam requests
  const coverCache = new Map(); // src -> coverUrl

  async function resolveCoverForTrackSrc(audioSrc) {
    if (!audioSrc) return ICONS.defaultCover;
    if (coverCache.has(audioSrc)) return coverCache.get(audioSrc);

    const base = baseNameFromSrc(audioSrc);
    if (!base) {
      coverCache.set(audioSrc, ICONS.defaultCover);
      return ICONS.defaultCover;
    }

    // 1) Try exact filename match
    for (const ext of COVER_EXTS) {
      const guess = `${COVERS_DIR}${base}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      if (await urlExists(guess)) {
        coverCache.set(audioSrc, guess);
        return guess;
      }
    }

    // 2) Optional: try "slug-ish" variants (helps with spaces vs underscores)
    const variants = [
      base.replace(/\s+/g, "_"),
      base.replace(/\s+/g, "-"),
      base.toLowerCase(),
      base.toLowerCase().replace(/\s+/g, "_"),
      base.toLowerCase().replace(/\s+/g, "-"),
    ];

    for (const v of variants) {
      for (const ext of COVER_EXTS) {
        const guess = `${COVERS_DIR}${v}.${ext}`;
        // eslint-disable-next-line no-await-in-loop
        if (await urlExists(guess)) {
          coverCache.set(audioSrc, guess);
          return guess;
        }
      }
    }

    coverCache.set(audioSrc, ICONS.defaultCover);
    return ICONS.defaultCover;
  }

  /* =========================================================
     AUTOPLAY UNLOCK (browser rules)
  ========================================================= */
  let audioUnlocked = false;
  function unlock() {
    audioUnlocked = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  }
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  /* =========================================================
     PLAYLIST DATA
  ========================================================= */
  const raw = Array.isArray(window.QUAGEN_PLAYLIST) ? window.QUAGEN_PLAYLIST : [];
  const playlist = raw.length ? raw : [{ src: "assets/songs/anthem.mp3" }];

  function normalizeTrack(t) {
    const src = (t?.src || "").trim();
    const title = (t?.title || "").trim() || titleFromSrc(src);
    // cover may be auto-resolved later if missing
    const cover = (t?.cover || "").trim();
    return { src, title, cover };
  }

  const Tracks = playlist.map(normalizeTrack).filter((t) => !!t.src);
  if (!Tracks.length) Tracks.push({ src: "assets/songs/anthem.mp3", title: "Anthem", cover: "" });

  /* =========================================================
     AUDIO ENGINES
     - mainAudio: the actual player (playlist)
     - hoverAudio: temporary preview 
  ========================================================= */
  const mainAudio = new Audio();
  mainAudio.preload = "auto";
  mainAudio.volume = DEFAULT_VOL;

  const hoverAudio = new Audio();
  hoverAudio.preload = "auto";
  hoverAudio.volume = DEFAULT_VOL;

  const State = {
    index: 0,
    isMuted: false,
    shuffle: false,
    loopOne: false,
    order: Tracks.map((_, i) => i),
    hoverActive: false,
    hoverSrc: "",
  };

  function reshuffleOrder(keepIndex = null) {
    const arr = Tracks.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    State.order = arr;

    if (keepIndex != null) {
      const pos = State.order.indexOf(keepIndex);
      if (pos > 0) {
        State.order.splice(pos, 1);
        State.order.unshift(keepIndex);
      }
    }
  }

  function currentTrack() {
    return Tracks[State.index] || Tracks[0];
  }

  function setMute(on) {
    State.isMuted = !!on;
    mainAudio.muted = State.isMuted;
    hoverAudio.muted = State.isMuted;
    renderIcons();
  }

  function safePlay(audio) {
    if (!audio) return;
    if (!audioUnlocked) return;
    audio.play().catch(() => {});
  }

  /* =========================================================
     PLAYER UI (auto-mounted)
  ========================================================= */
  function mountStyles() {
    if (document.getElementById("proPlayerStyles")) return;

    const css = `
      .pro-player{
        position: fixed;
        left: 50%;
        bottom: 16px;
        transform: translateX(-50%);
        z-index: 10500;
        width: min(${PLAYER_MAX_WIDTH}px, calc(100vw - 22px));
        display: grid;
        grid-template-columns: 44px 1fr auto;
        gap: 12px;
        align-items: center;

        padding: 10px 12px;
        border-radius: 16px;

        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.10);
        backdrop-filter: blur(10px);

        box-shadow: 0 18px 50px rgba(0,0,0,0.55);
        color: rgba(255,255,255,0.92);
      }

      .pp-cover{
        width: 40px; height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(255,255,255,0.12);
      }

      .pp-mid{
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }

      .pp-title{
        font-size: 0.92rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.95;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        user-select: none;
      }

      .pp-row{
        display: grid;
        grid-template-columns: 52px 1fr 52px;
        gap: 10px;
        align-items: center;
      }

      .pp-time{
        font-size: 0.82rem;
        opacity: 0.85;
        text-align: center;
        user-select: none;
      }

      .pp-seek{
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 2px;
        background: rgba(255,255,255,0.35);
        border-radius: 999px;
        outline: none;
        cursor: pointer;
      }
      .pp-seek::-webkit-slider-thumb{
        -webkit-appearance: none;
        appearance: none;
        width: 10px; height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(0,0,0,0.35);
        box-shadow: 0 0 10px rgba(255,255,255,0.25);
      }
      .pp-seek::-moz-range-thumb{
        width: 10px; height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(0,0,0,0.35);
        box-shadow: 0 0 10px rgba(255,255,255,0.25);
      }

      .pp-controls{
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
      }

      .pp-btn{
        width: 34px;
        height: 34px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.04);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 120ms ease, border-color 120ms ease, opacity 120ms ease;
        padding: 0;
      }
      .pp-btn:hover{
        transform: translateY(-1px);
        border-color: rgba(255,255,255,0.32);
      }
      .pp-btn img{ width: 18px; height: 18px; display:block; pointer-events:none; }

      .pp-vol{
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 6px;
      }

      .pp-volume{
        -webkit-appearance: none;
        appearance: none;
        width: 110px;
        height: 2px;
        background: rgba(255,255,255,0.35);
        border-radius: 999px;
        outline: none;
        cursor: pointer;
      }
      .pp-volume::-webkit-slider-thumb{
        -webkit-appearance: none;
        appearance: none;
        width: 10px; height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(0,0,0,0.35);
      }
      .pp-volume::-moz-range-thumb{
        width: 10px; height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(0,0,0,0.35);
      }

      .pp-panel{
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10500;
        width: min(${PLAYER_MAX_WIDTH}px, calc(100vw - 22px));
        max-height: min(55vh, 420px);
        overflow: auto;

        padding: 10px;
        border-radius: 16px;

        background: rgba(0,0,0,0.55);
        border: 1px solid rgba(255,255,255,0.10);
        backdrop-filter: blur(10px);
        box-shadow: 0 18px 50px rgba(0,0,0,0.55);

        display: none;
      }
      .pp-panel.open{ display:block; }

      .pp-panel-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding: 2px 2px 10px;
        position: sticky;
        top: 0;
        background: rgba(0,0,0,0.20);
        backdrop-filter: blur(10px);
      }
      .pp-panel-title{
        font-size: 0.82rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        opacity: 0.9;
        user-select: none;
      }

      .pp-track{
        display: grid;
        grid-template-columns: 36px 1fr;
        gap: 10px;
        align-items: center;
        padding: 8px;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 8px;
      }
      .pp-track:hover{
        border-color: rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.05);
      }
      .pp-track.active{
        border-color: rgba(255,255,255,0.28);
        background: rgba(255,255,255,0.06);
      }
      .pp-track img{
        width: 32px; height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }
      .pp-track-title{
        font-size: 0.86rem;
        opacity: 0.95;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 820px){
        .pro-player{ grid-template-columns: 44px 1fr; }
        .pp-controls{ justify-content: flex-start; flex-wrap: wrap; }
        .pp-vol{ width: 100%; margin-left: 0; }
        .pp-volume{ width: 160px; }
      }
    `;

    const style = document.createElement("style");
    style.id = "proPlayerStyles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mountPlayer() {
    mountStyles();
    if (document.getElementById("proPlayer")) return;

    const wrap = document.createElement("div");
    wrap.className = "pro-player";
    wrap.id = "proPlayer";

    wrap.innerHTML = `
      <img class="pp-cover" id="ppCover" alt="Cover">

      <div class="pp-mid">
        <div class="pp-title" id="ppTitle">Loading…</div>
        <div class="pp-row">
          <div class="pp-time" id="ppCur">0:00</div>
          <input class="pp-seek" id="ppSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
          <div class="pp-time" id="ppDur">0:00</div>
        </div>
      </div>

      <div class="pp-controls">
        <button class="pp-btn" id="ppPrev" aria-label="Previous"><img alt=""></button>
        <button class="pp-btn" id="ppPlay" aria-label="Play/Pause"><img alt=""></button>
        <button class="pp-btn" id="ppNext" aria-label="Next"><img alt=""></button>

        <button class="pp-btn" id="ppShuffle" aria-label="Shuffle"><img alt=""></button>
        <button class="pp-btn" id="ppLoop" aria-label="Loop One"><img alt=""></button>
        <button class="pp-btn" id="ppPlaylist" aria-label="Playlist"><img alt=""></button>

        <div class="pp-vol">
          <button class="pp-btn" id="ppMute" aria-label="Mute"><img alt=""></button>
          <input class="pp-volume" id="ppVolume" type="range" min="0" max="1" step="0.01" value="${DEFAULT_VOL}" aria-label="Volume">
        </div>
      </div>
    `;

    const panel = document.createElement("div");
    panel.className = "pp-panel";
    panel.id = "ppPanel";
    panel.innerHTML = `
      <div class="pp-panel-head">
        <div class="pp-panel-title">Playlist</div>
        <button class="pp-btn" id="ppClose" aria-label="Close playlist"><img alt=""></button>
      </div>
      <div id="ppPanelBody"></div>
    `;

    document.body.appendChild(panel);
    document.body.appendChild(wrap);
  }

  mountPlayer();

  const el = {
    wrap: document.getElementById("proPlayer"),
    panel: document.getElementById("ppPanel"),
    panelBody: document.getElementById("ppPanelBody"),

    cover: document.getElementById("ppCover"),
    title: document.getElementById("ppTitle"),
    cur: document.getElementById("ppCur"),
    dur: document.getElementById("ppDur"),
    seek: document.getElementById("ppSeek"),
    volume: document.getElementById("ppVolume"),

    prev: document.getElementById("ppPrev"),
    play: document.getElementById("ppPlay"),
    next: document.getElementById("ppNext"),

    shuffle: document.getElementById("ppShuffle"),
    loop: document.getElementById("ppLoop"),
    playlist: document.getElementById("ppPlaylist"),
    close: document.getElementById("ppClose"),

    mute: document.getElementById("ppMute"),
  };

  function setBtnIcon(button, src) {
    const img = button?.querySelector("img");
    if (img) img.src = src;
  }

  function isMainPlaying() {
    // more reliable than checking currentTime > 0
    return !mainAudio.paused && !mainAudio.ended;
  }

  function renderIcons() {
    setBtnIcon(el.prev, ICONS.prev);
    setBtnIcon(el.next, ICONS.next);
    setBtnIcon(el.play, isMainPlaying() ? ICONS.pause : ICONS.play);
    setBtnIcon(el.mute, State.isMuted ? ICONS.mute : ICONS.unmute);
    setBtnIcon(el.shuffle, State.shuffle ? ICONS.shuffleOn : ICONS.shuffleOff);
    setBtnIcon(el.loop, State.loopOne ? ICONS.loopOn : ICONS.loopOff);
    setBtnIcon(el.playlist, ICONS.playlist);
    setBtnIcon(el.close, ICONS.close);
  }

  async function renderTrackInfo() {
    const t = currentTrack();

    if (el.title) el.title.textContent = t.title || titleFromSrc(t.src);

    // cover priority:
    // 1) track.cover (if provided)
    // 2) auto-resolve from assets/covers/
    // 3) defaultCover
    let cover = (t.cover || "").trim();
    if (!cover) cover = await resolveCoverForTrackSrc(t.src);
    if (!cover) cover = ICONS.defaultCover;

    if (el.cover) el.cover.src = cover;
  }

  function renderPlaylistPanel() {
    if (!el.panelBody) return;

    el.panelBody.innerHTML = Tracks.map((t, i) => {
      const active = i === State.index ? "active" : "";
      const safeTitle = (t.title || titleFromSrc(t.src)).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `
        <div class="pp-track ${active}" data-i="${i}">
          <img data-cover-for="${i}" src="${ICONS.defaultCover}" alt="">
          <div class="pp-track-title">${safeTitle}</div>
        </div>
      `;
    }).join("");

    // async cover fill
    Tracks.forEach(async (t, i) => {
      const img = el.panelBody?.querySelector(`img[data-cover-for="${i}"]`);
      if (!img) return;
      const cover = (t.cover || "").trim() || (await resolveCoverForTrackSrc(t.src)) || ICONS.defaultCover;
      img.src = cover;
    });

    el.panelBody.querySelectorAll(".pp-track").forEach((row) => {
      row.addEventListener("click", () => {
        const i = Number(row.dataset.i);
        if (!Number.isFinite(i)) return;
        playIndex(i, true); // changing songs auto-starts
        openPanel(false);
      });
    });
  }

  function openPanel(open) {
    if (!el.panel) return;
    el.panel.classList.toggle("open", !!open);
    if (open) renderPlaylistPanel();
    updateFooterAvoidance();
  }

  /* =========================================================
     PLAYBACK
  ========================================================= */
  function loadIndex(i, autoplay) {
    State.index = Math.max(0, Math.min(Tracks.length - 1, i));
    const t = currentTrack();

    mainAudio.src = t.src;
    mainAudio.load();

    // Render immediately (title), then fill cover async
    renderIcons();
    renderPlaylistPanel();
    renderTrackInfo();

    if (autoplay) safePlay(mainAudio);
  }

  function playIndex(i, autoplay) {
    if (State.hoverActive) stopHoverPreview(true);

    fadeTo(mainAudio, 0, FADE_MS, () => {
      mainAudio.pause();
      mainAudio.currentTime = 0;

      loadIndex(i, autoplay);

      const target = clamp01(parseFloat(el.volume?.value ?? DEFAULT_VOL));
      mainAudio.volume = 0;
      if (autoplay) safePlay(mainAudio);
      fadeTo(mainAudio, target, FADE_MS);
    });
  }

  function nextTrack() {
    if (Tracks.length <= 1) return;
    if (State.shuffle) {
      const curPos = State.order.indexOf(State.index);
      const nextPos = (curPos + 1) % State.order.length;
      playIndex(State.order[nextPos], true);
      return;
    }
    playIndex((State.index + 1) % Tracks.length, true);
  }

  function prevTrack() {
    if (Tracks.length <= 1) return;
    if (State.shuffle) {
      const curPos = State.order.indexOf(State.index);
      const prevPos = (curPos - 1 + State.order.length) % State.order.length;
      playIndex(State.order[prevPos], true);
      return;
    }
    playIndex((State.index - 1 + Tracks.length) % Tracks.length, true);
  }

  mainAudio.addEventListener("ended", () => {
    if (State.loopOne) {
      mainAudio.currentTime = 0;
      safePlay(mainAudio);
      return;
    }
    nextTrack();
  });

  // keep icons in sync
  ["play", "pause", "loadeddata", "emptied", "ended"].forEach((evt) => {
    mainAudio.addEventListener(evt, () => renderIcons());
  });

  /* =========================================================
     SEEK / TIME UI
  ========================================================= */
  let seeking = false;

  mainAudio.addEventListener("loadedmetadata", () => {
    if (el.dur) el.dur.textContent = formatTime(mainAudio.duration);
  });

  mainAudio.addEventListener("timeupdate", () => {
    if (seeking) return;
    if (el.cur) el.cur.textContent = formatTime(mainAudio.currentTime);
    if (el.dur) el.dur.textContent = formatTime(mainAudio.duration);

    if (el.seek && isFinite(mainAudio.duration) && mainAudio.duration > 0) {
      const v = Math.floor((mainAudio.currentTime / mainAudio.duration) * 1000);
      el.seek.value = String(v);
    }
  });

  el.seek?.addEventListener("input", () => { seeking = true; });

  el.seek?.addEventListener("change", () => {
    if (!isFinite(mainAudio.duration) || mainAudio.duration <= 0) {
      seeking = false;
      return;
    }
    const v = Number(el.seek.value || "0") / 1000;
    mainAudio.currentTime = v * mainAudio.duration;
    seeking = false;
  });

  /* =========================================================
     BUTTONS
  ========================================================= */
  el.play?.addEventListener("click", () => {
    if (!audioUnlocked) return;

    const target = clamp01(parseFloat(el.volume?.value ?? DEFAULT_VOL));
    if (mainAudio.paused) {
      safePlay(mainAudio);
      fadeTo(mainAudio, target, 180);
    } else {
      fadeTo(mainAudio, 0, 160, () => {
        mainAudio.pause();
        mainAudio.volume = target;
      });
    }
    renderIcons();
  });

  el.next?.addEventListener("click", () => nextTrack());
  el.prev?.addEventListener("click", () => prevTrack());

  el.mute?.addEventListener("click", () => setMute(!State.isMuted));

  el.volume?.addEventListener("input", () => {
    const v = clamp01(parseFloat(el.volume.value || DEFAULT_VOL));
    mainAudio.volume = v;
    hoverAudio.volume = v;
  });

  el.shuffle?.addEventListener("click", () => {
    State.shuffle = !State.shuffle;
    if (State.shuffle) reshuffleOrder(State.index);
    renderIcons();
  });

  el.loop?.addEventListener("click", () => {
    State.loopOne = !State.loopOne;
    renderIcons();
  });

  el.playlist?.addEventListener("click", () => {
    const open = !el.panel?.classList.contains("open");
    openPanel(open);
  });

  el.close?.addEventListener("click", () => openPanel(false));

  document.addEventListener("click", (e) => {
    if (!el.panel || !el.playlist) return;
    if (!el.panel.classList.contains("open")) return;

    const insidePanel = e.target.closest("#ppPanel");
    const insideBtn = e.target.closest("#ppPlaylist");
    if (!insidePanel && !insideBtn) openPanel(false);
  });

  /* =========================================================
     TEAM CARD HOVER PREVIEW
  ========================================================= */
  function startHoverPreview(src) {
    if (!src) return;
    if (State.hoverActive && State.hoverSrc === src) return;

    State.hoverActive = true;
    State.hoverSrc = src;

    hoverAudio.src = src;
    hoverAudio.loop = true;
    hoverAudio.currentTime = 0;

    fadeTo(mainAudio, 0, HOVER_FADE_MS);

    const target = clamp01(parseFloat(el.volume?.value ?? DEFAULT_VOL));
    hoverAudio.volume = 0;
    safePlay(hoverAudio);
    fadeTo(hoverAudio, target, HOVER_FADE_MS);
  }

  function stopHoverPreview(fast = false) {
    if (!State.hoverActive) return;

    const dur = fast ? 120 : HOVER_FADE_MS;
    const target = clamp01(parseFloat(el.volume?.value ?? DEFAULT_VOL));

    fadeTo(hoverAudio, 0, dur, () => {
      hoverAudio.pause();
      hoverAudio.currentTime = 0;
      hoverAudio.src = "";
    });

    fadeTo(mainAudio, target, dur);

    State.hoverActive = false;
    State.hoverSrc = "";
  }

  document.querySelectorAll(TEAM_CARD_SELECTOR).forEach((card) => {
    const src = (card.dataset.music || "").trim();
    if (!src) return;
    card.addEventListener("mouseenter", () => startHoverPreview(src));
    card.addEventListener("mouseleave", () => stopHoverPreview(false));
  });

  /* =========================================================
     SMART FOOTER AVOIDANCE
  ========================================================= */
  function updateFooterAvoidance() {
    if (!el.wrap) return;

    const footer = document.querySelector(FOOTER_SELECTOR);
    const base = 16;

    el.wrap.style.bottom = `${base}px`;
    if (el.panel) el.panel.style.bottom = `${base + 78}px`;

    if (!footer) return;

    const f = footer.getBoundingClientRect();
    const p = el.wrap.getBoundingClientRect();

    if (f.top >= window.innerHeight) return;

    const overlap = Math.max(0, p.bottom - f.top + 10);
    if (overlap > 0) {
      el.wrap.style.bottom = `${base + overlap}px`;
      if (el.panel) el.panel.style.bottom = `${base + overlap + 78}px`;
    }
  }

  const scheduleAvoid = (() => {
    let raf = 0;
    return () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateFooterAvoidance();
      });
    };
  })();

  window.addEventListener("scroll", scheduleAvoid, { passive: true });
  window.addEventListener("resize", scheduleAvoid);

  try {
    const ro = new ResizeObserver(scheduleAvoid);
    if (el.wrap) ro.observe(el.wrap);
    const footer = document.querySelector(FOOTER_SELECTOR);
    if (footer) ro.observe(footer);
  } catch (_) {}

  /* =========================================================
     INIT
  ========================================================= */
  reshuffleOrder(State.index);
  loadIndex(0, false);
  renderIcons();
  renderPlaylistPanel();
  setMute(false);

  // Start once user interacts (autoplay rules)
  const tryStart = () => {
    if (State.isMuted) return;
    const target = clamp01(parseFloat(el.volume?.value ?? DEFAULT_VOL));
    safePlay(mainAudio);
    fadeTo(mainAudio, target, 180);
    renderIcons();
    updateFooterAvoidance();
  };
  window.addEventListener("pointerdown", tryStart, { once: true });
  window.addEventListener("keydown", tryStart, { once: true });

  updateFooterAvoidance();

  // Let other scripts (about-overlay.js) force-resume the main
  // track when they close something that was covering a hovered
  // card, instead of relying only on the implicit mouseleave.
  window.stopQuagenHoverPreview = () => stopHoverPreview(true);
});