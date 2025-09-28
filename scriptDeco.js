"use strict";

{
    const menuBtn = document.getElementById("menu-btn");
    const menu = document.getElementById("menu");
    const burgerIcon = document.getElementById("burger-icon");

    menuBtn.addEventListener("click", () => {
        menu.classList.toggle("hidden");
        // Toggle burger ↔ cross
        if (!menu.classList.contains("hidden")) {
            burgerIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
        } else {
            burgerIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
        }
    });
}

{
    const roles = [
        "Futur Développeur Full Stack",
        "Passionné de Réseaux",
        "Créatif & Curieux",
        "Amateur de Technologies"
    ];
    let i = 0;
    let j = 0;
    let current = "";
    let isDeleting = false;
    const speed = 100;
    const typing = document.getElementById("typing");

    function typeEffect() {
        if (i < roles.length) {
            if (!isDeleting && j <= roles[i].length) {
                current = roles[i].substring(0, j++);
            } else if (isDeleting && j >= 0) {
                current = roles[i].substring(0, j--);
            }

            typing.textContent = current;

            if (!isDeleting && j === roles[i].length + 1) {
                isDeleting = true;
                setTimeout(typeEffect, 1500); // pause avant effacement
                return;
            } else if (isDeleting && j < 0) {
                isDeleting = false;
                i = (i + 1) % roles.length;
            }
            setTimeout(typeEffect, speed);
        }
    }
    typeEffect();
}

{
    document.addEventListener("DOMContentLoaded", () => {
        const bars = document.querySelectorAll("[data-skill]");
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const width = bar.getAttribute("data-skill");
                    bar.style.width = width + "%";
                    observer.unobserve(bar);
                }
            });
        }, { threshold: 0.5 });

        bars.forEach(bar => observer.observe(bar));
    });
}

{
    document.addEventListener("DOMContentLoaded", () => {
        const cards = document.querySelectorAll(".project-card");
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const cardsArray = Array.from(cards);
                    cardsArray.forEach((card, index) => {
                        if (!card.classList.contains("show")) {
                            setTimeout(() => card.classList.add("show"), index * 200); // délai de 200ms
                        }
                    });
                    observer.disconnect(); // une seule fois
                }
            });
        }, { threshold: 0.2 });

        cards.forEach(card => observer.observe(card));
    });
}

{
    const messageInput = document.getElementById("message");
    const charCount = document.getElementById("charCount");

    messageInput.addEventListener("input", () => {
        charCount.textContent = `${messageInput.value.length} / ${messageInput.maxLength}`;
    });
}