        function showSection(sectionId) {
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(section => section.classList.remove('active'));

            const targetSection = document.getElementById(sectionId);
            targetSection.classList.add('active');
        }

        document.addEventListener('DOMContentLoaded', () => {
            showSection('about');
        });

/* thank you StackOverflow :pray: */
