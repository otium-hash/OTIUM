/* =====================================================
   OTIUM - HOME
   Versión 20260908

   FUNCIONES:

   - Carrusel principal dinámico
   - Carrusel de eventos
   - Carrusel de banners promocionales
   - Destacados
   - Sponsors / patrocinadores
   - Banner publicitario estático de respaldo
   - Buscador del Home
   - Compatible con configuracion/home
   - Compatible con patrocinadores existentes

   IMPORTANTE:
   - No modifica el diseño base de index.html
   - Si no existe configuración de carrusel,
     conserva los slides originales del Home.
   - Si no existe configuración de sponsors,
     conserva el banner estático original.
===================================================== */

import { getEvents } from "./modules/database.js";
import { db } from "./modules/firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =====================================================
   DOM
===================================================== */

const hero =
    document.querySelector(".home-hero");

const searchForm =
    document.getElementById("homeSearch");

const featuredContainer =
    document.getElementById("featuredEvents");

const sponsorBanner =
    document.querySelector(".sponsor-banner");


/* =====================================================
   ESTADO DEL CARRUSEL
===================================================== */

let currentSlide = 0;

let carouselTimer = null;

let carouselDurations = [];

let carouselSlides = [];


/* =====================================================
   ESTADO DEL SPONSOR
===================================================== */

let sponsorTimer = null;

let sponsorIndex = 0;


/* =====================================================
   UTILIDADES
===================================================== */

function safeText(value, fallback = "") {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(value);

}


function escapeHTML(value) {

    return safeText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   EVENTOS
===================================================== */

function getEventId(event) {

    if (!event) return "";

    return String(
        event.id ??
        event.firestoreId ??
        event.eventId ??
        event.uid ??
        ""
    );

}


function getEventTitle(event) {

    if (!event) {
        return "Evento sin título";
    }

    return (
        event.nombre ??
        event.titulo ??
        event.title ??
        "Evento sin título"
    );

}


function getEventImage(event) {

    if (!event) return "";

    return (
        event.imagen ??
        event.image ??
        event.imageUrl ??
        event.foto ??
        event.portada ??
        ""
    );

}


function getEventCategory(event) {

    if (!event) return "";

    return (
        event.categoria ??
        event.category ??
        ""
    );

}


function getEventDescription(event) {

    if (!event) return "";

    return (
        event.descripcion ??
        event.description ??
        ""
    );

}


/* =====================================================
   SPONSORS
===================================================== */

function getSponsorId(sponsor) {

    if (!sponsor) return "";

    return String(
        sponsor.id ??
        sponsor.firestoreId ??
        sponsor.patrocinadorId ??
        sponsor.uid ??
        ""
    );

}


function getSponsorName(sponsor) {

    if (!sponsor) {
        return "Patrocinador";
    }

    return (
        sponsor.nombre ??
        sponsor.name ??
        sponsor.empresa ??
        sponsor.razonSocial ??
        "Patrocinador"
    );

}


function getSponsorLogo(sponsor) {

    if (!sponsor) return "";

    return (
        sponsor.logo ??
        sponsor.logoUrl ??
        sponsor.imagen ??
        sponsor.image ??
        sponsor.imageUrl ??
        ""
    );

}


function getSponsorLink(sponsor) {

    if (!sponsor) return "";

    return (
        sponsor.url ??
        sponsor.enlace ??
        sponsor.link ??
        sponsor.website ??
        ""
    );

}


/* =====================================================
   FECHAS / ACTIVIDAD
===================================================== */

function isActive(item) {

    if (!item) return false;


    if (item.activo === false) {
        return false;
    }


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    if (item.inicio) {

        const inicio =
            new Date(
                `${item.inicio}T00:00:00`
            );

        if (
            !Number.isNaN(inicio.getTime()) &&
            today < inicio
        ) {
            return false;
        }

    }


    if (item.fin) {

        const fin =
            new Date(
                `${item.fin}T23:59:59`
            );

        if (
            !Number.isNaN(fin.getTime()) &&
            today > fin
        ) {
            return false;
        }

    }


    return true;

}


/* =====================================================
   FECHA EVENTO
===================================================== */

function getEventDate(event) {

    if (!event) return null;


    const value =
        event.fecha ??
        event.date ??
        "";


    if (!value) return null;


    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


function formatDate(event) {

    const date =
        getEventDate(event);


    if (!date) return "";


    return date.toLocaleDateString(
        "es-CL",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


/* =====================================================
   PRECIO
===================================================== */

function priceLabel(event) {

    if (!event) return "";

    const price =
        event.precio ??
        event.price ??
        event.valor ??
        "";


    if (
        price === "" ||
        price === null ||
        price === undefined
    ) {

        return "";

    }


    if (
        String(price).toLowerCase()
            .includes("gratis")
    ) {

        return "Gratis";

    }


    return String(price);

}


/* =====================================================
   CATEGORÍA CSS
===================================================== */

function categoryClass(category) {

    return safeText(category)
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

}


/* =====================================================
   CAROUSEL
===================================================== */

function stopCarousel() {

    if (carouselTimer) {

        clearTimeout(
            carouselTimer
        );

        carouselTimer = null;

    }

}


function showSlide(index) {

    const slides =
        hero?.querySelectorAll(
            ".hero-slide"
        );


    if (!slides || !slides.length) {
        return;
    }


    if (
        index < 0
    ) {

        index =
            slides.length - 1;

    }


    if (
        index >= slides.length
    ) {

        index = 0;

    }


    currentSlide =
        index;


    slides.forEach(
        (slide, i) => {

            slide.classList.toggle(
                "active",
                i === currentSlide
            );

        }
    );


    const dots =
        hero?.querySelectorAll(
            ".hero-dot"
        );


    dots?.forEach(
        (dot, i) => {

            dot.classList.toggle(
                "active",
                i === currentSlide
            );

        }
    );


    startCarousel();

}


function startCarousel() {

    stopCarousel();


    if (
        carouselSlides.length <= 1
    ) {

        return;

    }


    const duration =
        Number(
            carouselDurations[currentSlide]
        ) || 6500;


    carouselTimer =
        setTimeout(
            () => {

                showSlide(
                    currentSlide + 1
                );

            },
            duration
        );

}


/* =====================================================
   CONTROLES DEL HERO
===================================================== */

function bindHeroControls() {

    if (!hero) return;


    const prev =
        hero.querySelector(
            ".hero-arrow.prev"
        );


    const next =
        hero.querySelector(
            ".hero-arrow.next"
        );


    if (prev) {

        prev.addEventListener(
            "click",
            () => {

                showSlide(
                    currentSlide - 1
                );

            }
        );

    }


    if (next) {

        next.addEventListener(
            "click",
            () => {

                showSlide(
                    currentSlide + 1
                );

            }
        );

    }

}


/* =====================================================
   CREAR DOTS
===================================================== */

function renderDots() {

    if (!hero) return;


    let dotsContainer =
        hero.querySelector(
            ".hero-dots"
        );


    if (!dotsContainer) {

        dotsContainer =
            document.createElement(
                "div"
            );

        dotsContainer.className =
            "hero-dots";


        const arrows =
            hero.querySelector(
                ".hero-arrow.next"
            );


        if (arrows) {

            arrows.insertAdjacentElement(
                "beforebegin",
                dotsContainer
            );

        } else {

            hero.appendChild(
                dotsContainer
            );

        }

    }


    dotsContainer.innerHTML =
        carouselSlides
            .map(
                (_, index) => `
                    <button
                        type="button"
                        class="hero-dot ${
                            index === 0
                                ? "active"
                                : ""
                        }"
                        data-slide="${index}"
                        aria-label="Ir al slide ${index + 1}"
                    ></button>
                `
            )
            .join("");


    dotsContainer
        .querySelectorAll(
            ".hero-dot"
        )
        .forEach(
            dot => {

                dot.addEventListener(
                    "click",
                    () => {

                        showSlide(
                            Number(
                                dot.dataset.slide
                            )
                        );

                    }
                );

            }
        );

}


/* =====================================================
   FALLBACK HERO
===================================================== */

function renderFallbackHero() {

    if (!hero) return;


    /*
     * Conservamos los slides que ya existen
     * en index.html.
     */

    const slides =
        hero.querySelectorAll(
            ".hero-slide"
        );


    carouselSlides =
        [...slides];


    carouselDurations =
        carouselSlides.map(
            () => 6500
        );


    currentSlide = 0;


    renderDots();

    bindHeroControls();

    showSlide(0);

}


/* =====================================================
   HERO - EVENTO
===================================================== */

function createEventSlide(event, item) {

    const slide =
        document.createElement(
            "article"
        );


    slide.className =
        "hero-slide";


    const image =
        getEventImage(event);


    const category =
        getEventCategory(event);


    const title =
        getEventTitle(event);


    const description =
        getEventDescription(event);


    const date =
        formatDate(event);


    const price =
        priceLabel(event);


    const eventId =
        getEventId(event);


    slide.innerHTML = `

        ${
            image
                ? `
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        class="hero-slide-image"
                    >
                  `
                : ""
        }


        <div class="hero-slide-overlay">

            ${
                category
                    ? `
                        <span class="hero-category ${escapeHTML(
                            categoryClass(category)
                        )}">
                            ${escapeHTML(category)}
                        </span>
                      `
                    : ""
            }


            <h2>
                ${escapeHTML(title)}
            </h2>


            ${
                description
                    ? `
                        <p>
                            ${escapeHTML(
                                description
                            )}
                        </p>
                      `
                    : ""
            }


            ${
                date || price
                    ? `
                        <div class="hero-meta">

                            ${
                                date
                                    ? `
                                        <span>
                                            ${escapeHTML(date)}
                                        </span>
                                      `
                                    : ""
                            }

                            ${
                                price
                                    ? `
                                        <span>
                                            ${escapeHTML(price)}
                                        </span>
                                      `
                                    : ""
                            }

                        </div>
                      `
                    : ""
            }

        </div>

    `;


    if (eventId) {

        slide.style.cursor =
            "pointer";


        slide.addEventListener(
            "click",
            () => {

                window.location.href =
                    `event-details.html?id=${encodeURIComponent(
                        eventId
                    )}`;

            }
        );

    }


    return slide;

}


/* =====================================================
   HERO - BANNER PROMOCIONAL
===================================================== */

function createBannerSlide(item) {

    const slide =
        document.createElement(
            "article"
        );


    slide.className =
        "hero-slide hero-slide-banner";


    const title =
        item.titulo ??
        item.title ??
        "Publica tu evento en OTIUM";


    const subtitle =
        item.subtitulo ??
        item.subtitle ??
        "Llega a más personas y destaca tu evento.";


    const image =
        item.imagen ??
        item.image ??
        item.imageUrl ??
        "";


    const link =
        item.enlace ??
        item.link ??
        item.url ??
        "";


    slide.innerHTML = `

        ${
            image
                ? `
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        class="hero-slide-image"
                    >
                  `
                : ""
        }


        <div class="hero-slide-overlay hero-slide-promo">

            <span class="hero-category">
                OTIUM
            </span>


            <h2>
                ${escapeHTML(title)}
            </h2>


            ${
                subtitle
                    ? `
                        <p>
                            ${escapeHTML(subtitle)}
                        </p>
                      `
                    : ""
            }


            ${
                link
                    ? `
                        <span class="hero-promo-button">
                            Conocer más
                        </span>
                      `
                    : ""
            }

        </div>

    `;


    if (link) {

        slide.style.cursor =
            "pointer";


        slide.addEventListener(
            "click",
            event => {

                /*
                 * Evitamos navegar dos veces
                 * si eventualmente se agrega
                 * un botón dentro del banner.
                 */

                event.preventDefault();


                if (
                    link.startsWith("http://") ||
                    link.startsWith("https://")
                ) {

                    window.open(
                        link,
                        "_blank",
                        "noopener,noreferrer"
                    );

                } else {

                    window.location.href =
                        link;

                }

            }
        );

    }


    return slide;

}


/* =====================================================
   CARRUSEL CONFIGURADO
===================================================== */

function renderConfiguredCarousel(
    items,
    events
) {

    if (!hero) return;


    const validItems =
        items.filter(
            item =>
                isActive(item)
        );


    if (!validItems.length) {

        renderFallbackHero();

        return;

    }


    validItems.sort(
        (a, b) =>
            Number(a.orden ?? 0) -
            Number(b.orden ?? 0)
    );


    /*
     * Eliminamos solamente los slides.
     *
     * NO tocamos:
     * - buscador
     * - flechas
     * - contenedor hero
     * - otros elementos del Home
     */

    hero.querySelectorAll(
        ".hero-slide"
    ).forEach(
        slide => slide.remove()
    );


    carouselSlides = [];

    carouselDurations = [];


    /*
     * Insertamos los nuevos slides
     * antes del buscador si existe.
     */

    const searchArea =
        hero.querySelector(
            "#homeSearch"
        )?.closest(
            "form, .home-search, .hero-search, .search-container"
        );


    validItems.forEach(
        item => {

            let slide = null;


            const type =
                item.tipo === "banner"
                    ? "banner"
                    : "evento";


            if (type === "banner") {

                slide =
                    createBannerSlide(
                        item
                    );

            } else {

                const event =
                    events.find(
                        e =>
                            getEventId(e) ===
                            String(
                                item.eventoId ?? ""
                            )
                    );


                /*
                 * Si el evento configurado
                 * ya no existe, lo omitimos.
                 */

                if (!event) {

                    return;

                }


                slide =
                    createEventSlide(
                        event,
                        item
                    );

            }


            if (!slide) return;


            if (searchArea) {

                hero.insertBefore(
                    slide,
                    searchArea
                );

            } else {

                /*
                 * Si no encontramos la zona
                 * de búsqueda, insertamos el slide
                 * al principio del hero.
                 */

                hero.insertBefore(
                    slide,
                    hero.firstChild
                );

            }


            carouselSlides.push(
                slide
            );


            carouselDurations.push(
                Number(
                    item.duracion
                ) || 6500
            );

        }
    );


    /*
     * Si ninguno de los elementos pudo
     * convertirse en slide válido,
     * recuperamos el Home original.
     */

    if (!carouselSlides.length) {

        renderFallbackHero();

        return;

    }


    currentSlide = 0;


    renderDots();

    bindHeroControls();

    showSlide(0);

}


/* =====================================================
   DESTACADOS
===================================================== */

function renderFeatured(
    events,
    configuredItems
) {

    if (!featuredContainer) {
        return;
    }


    let selectedEvents = [];


    /*
     * Si existen destacados configurados,
     * usamos exclusivamente esa configuración.
     */

    if (
        Array.isArray(
            configuredItems
        ) &&
        configuredItems.length
    ) {

        selectedEvents =
            configuredItems
                .filter(
                    item =>
                        isActive(item)
                )
                .sort(
                    (a, b) =>
                        Number(
                            a.orden ?? 0
                        ) -
                        Number(
                            b.orden ?? 0
                        )
                )
                .map(
                    item =>
                        events.find(
                            event =>
                                getEventId(event) ===
                                String(
                                    item.eventoId ?? ""
                                )
                        )
                )
                .filter(Boolean)
                .slice(0, 6);

    }


    /*
     * Si no hay configuración,
     * mantenemos el comportamiento anterior:
     * destacados por campo del evento.
     */

    else {

        selectedEvents =
            [...events]
                .filter(
                    event =>
                        event.destacado === true ||
                        event.featured === true ||
                        event.promocionado === true
                )
                .sort(
                    (a, b) => {

                        const dateA =
                            getEventDate(a);

                        const dateB =
                            getEventDate(b);


                        if (
                            dateA &&
                            dateB
                        ) {

                            return (
                                dateA -
                                dateB
                            );

                        }


                        return 0;

                    }
                )
                .slice(0, 6);

    }


    if (!selectedEvents.length) {

        featuredContainer.innerHTML = `
            <p class="empty-message">
                No hay eventos destacados disponibles.
            </p>
        `;

        return;

    }


    featuredContainer.innerHTML =
        selectedEvents
            .map(
                event => {

                    const id =
                        getEventId(event);


                    const title =
                        getEventTitle(event);


                    const image =
                        getEventImage(event);


                    const category =
                        getEventCategory(event);


                    const description =
                        getEventDescription(event);


                    const date =
                        formatDate(event);


                    const price =
                        priceLabel(event);


                    return `

                        <article
                            class="event-card"
                            data-event-id="${escapeHTML(id)}"
                        >

                            ${
                                image
                                    ? `
                                        <div class="event-card-image">

                                            <img
                                                src="${escapeHTML(image)}"
                                                alt="${escapeHTML(title)}"
                                                loading="lazy"
                                            >

                                        </div>
                                      `
                                    : ""
                            }


                            <div class="event-card-content">

                                ${
                                    category
                                        ? `
                                            <span class="event-category ${escapeHTML(
                                                categoryClass(
                                                    category
                                                )
                                            )}">
                                                ${escapeHTML(category)}
                                            </span>
                                          `
                                        : ""
                                }


                                <h3>
                                    ${escapeHTML(title)}
                                </h3>


                                ${
                                    description
                                        ? `
                                            <p>
                                                ${escapeHTML(
                                                    description
                                                )}
                                            </p>
                                          `
                                        : ""
                                }


                                <div class="event-card-meta">

                                    ${
                                        date
                                            ? `
                                                <span>
                                                    ${escapeHTML(
                                                        date
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }


                                    ${
                                        price
                                            ? `
                                                <span>
                                                    ${escapeHTML(
                                                        price
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }

                                </div>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");


    featuredContainer
        .querySelectorAll(
            "[data-event-id]"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        const id =
                            card.dataset.eventId;


                        if (!id) return;


                        window.location.href =
                            `event-details.html?id=${encodeURIComponent(
                                id
                            )}`;

                    }
                );

            }
        );

}


/* =====================================================
   SPONSORS
===================================================== */

function stopSponsorCarousel() {

    if (sponsorTimer) {

        clearTimeout(
            sponsorTimer
        );

        sponsorTimer = null;

    }

}


function renderSponsors(
    sponsors,
    configuredItems
) {

    if (!sponsorBanner) {
        return;
    }


    /*
     * IMPORTANTE:
     *
     * Si NO existe configuración de sponsors,
     * dejamos intacto el banner original de
     * index.html.
     */

    if (
        !Array.isArray(
            configuredItems
        ) ||
        !configuredItems.length
    ) {

        stopSponsorCarousel();

        return;

    }


    const activeItems =
        configuredItems
            .filter(
                item =>
                    isActive(item)
            )
            .sort(
                (a, b) =>
                    Number(a.orden ?? 0) -
                    Number(b.orden ?? 0)
            );


    /*
     * Convertimos las referencias
     * patrocinadorId en documentos reales.
     */

    const selectedSponsors =
        activeItems
            .map(
                item => {

                    const sponsor =
                        sponsors.find(
                            s =>
                                getSponsorId(s) ===
                                String(
                                    item.patrocinadorId ?? ""
                                )
                        );


                    if (!sponsor) {
                        return null;
                    }


                    return {

                        sponsor,

                        config: item

                    };

                }
            )
            .filter(Boolean);


    /*
     * Si la configuración existe pero
     * ninguno de los sponsors configurados
     * existe actualmente, conservamos el
     * banner estático original.
     */

    if (!selectedSponsors.length) {

        stopSponsorCarousel();

        return;

    }


    stopSponsorCarousel();


    sponsorIndex = 0;


    function showSponsor(index) {

        if (
            !selectedSponsors.length
        ) {
            return;
        }


        const selected =
            selectedSponsors[
                index %
                selectedSponsors.length
            ];


        const sponsor =
            selected.sponsor;


        const configItem =
            selected.config;


        const name =
            getSponsorName(
                sponsor
            );


        const logo =
            getSponsorLogo(
                sponsor
            );


        const link =
            getSponsorLink(
                sponsor
            );


        sponsorBanner.innerHTML = `

            <div class="sponsor-content">

                ${
                    logo
                        ? `
                            <img
                                src="${escapeHTML(logo)}"
                                alt="${escapeHTML(name)}"
                                class="sponsor-logo"
                            >
                          `
                        : ""
                }


                <div class="sponsor-text">

                    <span>
                        PATROCINADOR
                    </span>

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                </div>

            </div>


            ${
                link
                    ? `
                        <a
                            href="${escapeHTML(link)}"
                            class="promotion-button blue"
                            ${
                                link.startsWith(
                                    "http://"
                                ) ||
                                link.startsWith(
                                    "https://"
                                )
                                    ? 'target="_blank" rel="noopener noreferrer"'
                                    : ""
                            }
                        >
                            Conocer más
                        </a>
                      `
                    : ""
            }

        `;


        const duration =
            Number(
                configItem.duracion
            ) || 5000;


        if (
            selectedSponsors.length > 1
        ) {

            sponsorTimer =
                setTimeout(
                    () => {

                        sponsorIndex =
                            (
                                sponsorIndex +
                                1
                            ) %
                            selectedSponsors.length;


                        showSponsor(
                            sponsorIndex
                        );

                    },
                    duration
                );

        }

    }


    showSponsor(0);

}


/* =====================================================
   BUSCADOR
===================================================== */

function bindSearch() {

    if (!searchForm) {
        return;
    }


    searchForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const searchInput =
                searchForm.querySelector(
                    '[name="buscar"], [name="search"], #search'
                );


            const cityInput =
                searchForm.querySelector(
                    '[name="ciudad"], [name="city"], #city'
                );


            const search =
                searchInput?.value.trim() ||
                "";


            const city =
                cityInput?.value.trim() ||
                "";


            const params =
                new URLSearchParams();


            if (search) {

                params.set(
                    "buscar",
                    search
                );

            }


            if (city) {

                params.set(
                    "ciudad",
                    city
                );

            }


            const query =
                params.toString();


            window.location.href =
                query
                    ? `eventos.html?${query}`
                    : "eventos.html";

        }
    );

}


/* =====================================================
   INICIALIZACIÓN
===================================================== */

async function initHome() {

    try {

        /*
         * Primero cargamos los elementos
         * principales en paralelo.
         */

        const [
            eventsResult,
            homeSnapshot,
            sponsorsSnapshot
        ] = await Promise.all([

            getEvents(),

            getDoc(
                doc(
                    db,
                    "configuracion",
                    "home"
                )
            ),

            getDocs(
                collection(
                    db,
                    "patrocinadores"
                )
            )

        ]);


        /* ---------------------------------------------
           EVENTOS
        --------------------------------------------- */

        events =
            Array.isArray(
                eventsResult
            )
                ? eventsResult
                : [];


        /* ---------------------------------------------
           SPONSORS
        --------------------------------------------- */

        const sponsors =
            sponsorsSnapshot.docs.map(
                document => ({

                    ...document.data(),

                    firestoreId:
                        document.id,

                    id:
                        document.data().id ??
                        document.id

                })
            );


        /* ---------------------------------------------
           CONFIGURACIÓN HOME
        --------------------------------------------- */

        let config = {

            carrusel: [],

            destacados: [],

            sponsors: []

        };


        if (
            homeSnapshot.exists()
        ) {

            const data =
                homeSnapshot.data();


            config = {

                carrusel:
                    Array.isArray(
                        data.carrusel
                    )
                        ? data.carrusel
                        : [],

                destacados:
                    Array.isArray(
                        data.destacados
                    )
                        ? data.destacados
                        : [],

                sponsors:
                    Array.isArray(
                        data.sponsors
                    )
                        ? data.sponsors
                        : []

            };

        }


        /* ---------------------------------------------
           CARRUSEL
        --------------------------------------------- */

        if (
            Array.isArray(
                config.carrusel
            ) &&
            config.carrusel.length
        ) {

            renderConfiguredCarousel(
                config.carrusel,
                events
            );

        } else {

            /*
             * Sin configuración:
             * usamos exactamente los slides
             * existentes en index.html.
             */

            renderFallbackHero();

        }


        /* ---------------------------------------------
           DESTACADOS
        --------------------------------------------- */

        renderFeatured(
            events,
            config.destacados
        );


        /* ---------------------------------------------
           SPONSORS
        --------------------------------------------- */

        renderSponsors(
            sponsors,
            config.sponsors
        );


        /* ---------------------------------------------
           BUSCADOR
        --------------------------------------------- */

        bindSearch();


    } catch (error) {

        console.error(
            "Error cargando Home OTIUM:",
            error
        );


        /*
         * Si ocurre algún problema con Firebase,
         * recuperamos el Home visual original.
         */

        renderFallbackHero();


        if (featuredContainer) {

            featuredContainer.innerHTML = `
                <p class="empty-message">
                    No fue posible cargar los eventos.
                </p>
            `;

        }

    }

}


/* =====================================================
   ARRANCAR
===================================================== */

initHome();