/* =========================================================
   OTIUM HOME
   Carrusel + búsqueda + eventos destacados desde Firestore
========================================================= */

import { getEvents } from "./modules/database.js";

const slides = [...document.querySelectorAll(".hero-slide")];
const dots = [...document.querySelectorAll(".hero-dot")];
const prev = document.querySelector(".hero-prev");
const next = document.querySelector(".hero-next");

let currentSlide = 0;
let carouselTimer;

function showSlide(index) {
    if (!slides.length) return;

    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === currentSlide);
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === currentSlide);
    });
}

function startCarousel() {
    clearInterval(carouselTimer);

    carouselTimer = setInterval(() => {
        showSlide(currentSlide + 1);
    }, 6500);
}

prev?.addEventListener("click", () => {
    showSlide(currentSlide - 1);
    startCarousel();
});

next?.addEventListener("click", () => {
    showSlide(currentSlide + 1);
    startCarousel();
});

dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
        showSlide(index);
        startCarousel();
    });
});

startCarousel();

/* =========================================================
   BÚSQUEDA
========================================================= */

const searchForm = document.getElementById("homeSearch");

searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const text =
        document.getElementById("homeSearchText")?.value.trim() || "";

    const location =
        document.getElementById("homeSearchLocation")?.value.trim() || "";

    const params = new URLSearchParams();

    if (text) params.set("buscar", text);
    if (location) params.set("ciudad", location);

    const query = params.toString();

    window.location.href =
        "eventos.html" + (query ? `?${query}` : "");
});

/* =========================================================
   EVENTOS DESTACADOS
========================================================= */

const featuredContainer =
    document.getElementById("featuredEvents");

function safeText(value, fallback = "") {
    return value === undefined ||
        value === null ||
        String(value).trim() === ""
        ? fallback
        : String(value).trim();
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getEventImage(evento) {
    return safeText(
        evento.imagen ||
        evento.image ||
        evento.imageUrl ||
        evento.imagenUrl ||
        evento.foto ||
        evento.portada ||
        ""
    );
}

function categoryClass(category) {
    const value = category.toLowerCase();

    if (value.includes("mús") || value.includes("conci")) return "music";
    if (value.includes("teatro") || value.includes("arte")) return "theater";
    if (value.includes("gastr")) return "food";
    if (value.includes("deport")) return "sport";
    if (value.includes("fiesta") || value.includes("noche")) return "night";
    if (value.includes("feria") || value.includes("merc")) return "market";
    if (value.includes("famil")) return "family";

    return "default";
}

function formatDate(value) {
    if (!value) return { day: "--", month: "---" };

    const raw = String(value).trim();
    const date = new Date(raw + (raw.length === 10 ? "T00:00:00" : ""));

    if (Number.isNaN(date.getTime())) {
        return {
            day: raw.slice(0, 2) || "--",
            month: raw.slice(3, 6).toUpperCase() || "---"
        };
    }

    const months = [
        "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
        "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
    ];

    return {
        day: String(date.getDate()).padStart(2, "0"),
        month: months[date.getMonth()]
    };
}

function priceLabel(evento) {
    const price =
        evento.price ??
        evento.precio ??
        "";

    if (price === "" || price === null || price === undefined) {
        return "";
    }

    const value = String(price).trim();

    if (
        value.toLowerCase() === "gratis" ||
        value === "$0" ||
        value === "0"
    ) {
        return "Gratis";
    }

    return value.startsWith("$")
        ? value
        : `$${value}`;
}

function renderEventCard(evento, index) {
    const id =
        evento.firestoreId ||
        evento.id ||
        evento.eventId ||
        "";

    const title = safeText(
        evento.title ||
        evento.nombre ||
        evento.nombreEvento,
        "Evento sin título"
    );

    const date = safeText(
        evento.date ||
        evento.fecha ||
        evento.fechaEvento,
        ""
    );

    const time = safeText(
        evento.time ||
        evento.hora ||
        evento.horaEvento,
        ""
    );

    const city = safeText(
        evento.city ||
        evento.ciudad ||
        evento.ubicacion,
        "Chile"
    );

    const category = safeText(
        evento.category ||
        evento.categoria,
        "Panorama"
    );

    const image = getEventImage(evento);
    const dateInfo = formatDate(date);
    const price = priceLabel(evento);

    const fallbackTitles = [
        "Descubre nuevos panoramas",
        "Una experiencia para recordar",
        "Tu próximo evento",
        "Vive algo diferente",
        "Disfruta tu ciudad",
        "No te lo pierdas"
    ];

    const fallback = fallbackTitles[index % fallbackTitles.length];

    const imageHTML = image
        ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" loading="lazy">`
        : `<div class="event-fallback">${escapeHTML(fallback)}</div>`;

    return `
        <article class="featured-card">
            <a
                href="${id ? `event-details.html?id=${encodeURIComponent(id)}` : "eventos.html"}"
                style="color:inherit;text-decoration:none">

                <div class="event-image event-${categoryClass(category)}">
                    ${imageHTML}
                    <span class="event-heart" aria-hidden="true">♡</span>
                </div>

                <div class="event-body">
                    <div class="event-date-row">
                        <div class="event-date">
                            <strong>${escapeHTML(dateInfo.day)}</strong><br>
                            ${escapeHTML(dateInfo.month)}
                        </div>

                        <h3 class="event-title">
                            ${escapeHTML(title)}
                        </h3>
                    </div>

                    <div class="event-meta">
                        ${escapeHTML(city)}
                        ${time ? ` · ${escapeHTML(time)}` : ""}
                    </div>

                    <div class="event-category">
                        ${escapeHTML(category)}
                    </div>

                    ${price
                        ? `<div class="event-price">${escapeHTML(price)}</div>`
                        : ""}
                </div>
            </a>
        </article>
    `;
}

async function loadFeaturedEvents() {
    if (!featuredContainer) return;

    try {
        const events = await getEvents();

        console.log("OTIUM Home - eventos encontrados:", events.length);

        const sorted = [...events].sort((a, b) => {
            const featuredA =
                a.destacado === true ||
                a.featured === true ||
                a.promocionado === true
                    ? 1 : 0;

            const featuredB =
                b.destacado === true ||
                b.featured === true ||
                b.promocionado === true
                    ? 1 : 0;

            if (featuredA !== featuredB) {
                return featuredB - featuredA;
            }

            const dateA =
                a.date ||
                a.fecha ||
                a.fechaEvento ||
                "9999-12-31";

            const dateB =
                b.date ||
                b.fecha ||
                b.fechaEvento ||
                "9999-12-31";

            return String(dateA).localeCompare(String(dateB));
        });

        const selected = sorted.slice(0, 6);

        if (!selected.length) {
            featuredContainer.innerHTML = `
                <div class="featured-loading">
                    Todavía no hay eventos destacados publicados.
                </div>
            `;
            return;
        }

        featuredContainer.innerHTML =
            selected.map(renderEventCard).join("");

    } catch (error) {
        console.error("OTIUM Home - error cargando eventos:", error);

        featuredContainer.innerHTML = `
            <div class="featured-loading">
                No fue posible cargar los eventos.
                Revisa la conexión con Firebase.
            </div>
        `;
    }
}

loadFeaturedEvents();
