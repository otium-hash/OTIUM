
/* =====================================================
   OTIUM - HOME
   Versión 20260908 CORREGIDA

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

   CORRECCIONES:
   - Botones anterior / siguiente del Hero corregidos
   - Compatible con .hero-prev / .hero-next
   - Compatible con .hero-arrow.prev / .hero-arrow.next
   - Evita propagación del click de las flechas al slide
   - Mantiene slides originales de index.html
   - Agrega slides configurados desde Firestore
   - No elimina slides originales
   - Mantiene autoplay
   - Mantiene dots
   - Firebase usa la misma versión que firebase-config.js
   - Nunca usa searchArea con insertBefore()
===================================================== */


import { getEvents } from "./modules/database.js";
import { db } from "./modules/firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


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
   ESTADO GENERAL
===================================================== */

let events = [];


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
            !Number.isNaN(
                inicio.getTime()
            ) &&
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
            !Number.isNaN(
                fin.getTime()
            ) &&
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
        String(price)
            .toLowerCase()
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


/* =====================================================
   OBTENER SLIDES REALES DEL DOM
===================================================== */

function getHeroSlides() {

    if (!hero) {
        return [];
    }


    return Array.from(
        hero.querySelectorAll(
            ".hero-slide"
        )
    );

}


/* =====================================================
   MOSTRAR SLIDE
===================================================== */

function showSlide(index) {

    const slides =
        getHeroSlides();


    if (
        !slides.length
    ) {

        return;

    }


    /* ---------------------------------------------
       NORMALIZAR ÍNDICE
    --------------------------------------------- */

    if (index < 0) {

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


    /*
     * Mantener sincronizado el estado interno
     * con los slides reales del DOM.
     */

    carouselSlides =
        slides;


    /* ---------------------------------------------
       ACTIVAR / DESACTIVAR SLIDES
    --------------------------------------------- */

    slides.forEach(
        (slide, i) => {

            slide.classList.toggle(
                "active",
                i === currentSlide
            );

        }
    );


    /* ---------------------------------------------
       ACTUALIZAR DOTS
    --------------------------------------------- */

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


    /* ---------------------------------------------
       REINICIAR AUTOPLAY
    --------------------------------------------- */

    startCarousel();

}


/* =====================================================
   AUTOPLAY
===================================================== */

function startCarousel() {

    stopCarousel();


    /*
     * carouselSlides representa TODOS los slides:
     *
     * - originales de index.html
     * - configurados desde Firestore
     */

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


    /*
     * IMPORTANTE:
     *
     * El CSS actual de OTIUM utiliza:
     *
     * .hero-arrow
     * .hero-prev
     * .hero-next
     *
     * Algunas versiones anteriores utilizaban:
     *
     * .hero-arrow.prev
     * .hero-arrow.next
     *
     * Por eso soportamos ambas estructuras.
     */

    const prev =
        hero.querySelector(
            ".hero-prev, .hero-arrow.prev"
        );


    const next =
        hero.querySelector(
            ".hero-next, .hero-arrow.next"
        );


    /* ---------------------------------------------
       BOTÓN ANTERIOR
    --------------------------------------------- */

    if (
        prev &&
        !prev.dataset.otiumBound
    ) {

        prev.dataset.otiumBound =
            "true";


        prev.addEventListener(
            "click",
            event => {

                /*
                 * Evitar que el clic llegue al slide.
                 */

                event.preventDefault();

                event.stopPropagation();


                const slides =
                    getHeroSlides();


                if (
                    slides.length <= 1
                ) {

                    return;

                }


                showSlide(
                    currentSlide - 1
                );

            }
        );

    }


    /* ---------------------------------------------
       BOTÓN SIGUIENTE
    --------------------------------------------- */

    if (
        next &&
        !next.dataset.otiumBound
    ) {

        next.dataset.otiumBound =
            "true";


        next.addEventListener(
            "click",
            event => {

                /*
                 * Evitar que el clic llegue al slide.
                 */

                event.preventDefault();

                event.stopPropagation();


                const slides =
                    getHeroSlides();


                if (
                    slides.length <= 1
                ) {

                    return;

                }


                showSlide(
                    currentSlide + 1
                );

            }
        );

    }


    console.log(
        "[OTIUM Home] Controles del carrusel:",
        {
            anterior: !!prev,
            siguiente: !!next
        }
    );

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


        const nextArrow =
            hero.querySelector(
                ".hero-next, .hero-arrow.next"
            );


        if (nextArrow) {

            nextArrow.insertAdjacentElement(
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
                            index === currentSlide
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
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


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


    stopCarousel();


    /*
     * Si anteriormente se habían creado slides
     * configurados, solamente eliminamos esos.
     *
     * Los slides originales permanecen intactos.
     */

    hero.querySelectorAll(
        '.hero-slide[data-otium-configured="true"]'
    ).forEach(
        slide => slide.remove()
    );


    /*
     * Obtener los slides originales.
     */

    const slides =
        getHeroSlides();


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

function createEventSlide(
    event,
    item
) {

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
        item.imagenUrl ??
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

                event.preventDefault();


                if (
                    link.startsWith(
                        "http://"
                    ) ||
                    link.startsWith(
                        "https://"
                    )
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

    if (!hero) {
        return;
    }


    /* ---------------------------------------------
       DETENER CARRUSEL ANTERIOR
    --------------------------------------------- */

    stopCarousel();


    /* ---------------------------------------------
       ELEMENTOS CONFIGURADOS ACTIVOS
    --------------------------------------------- */

    const validItems =
        items
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
            );


    /* ---------------------------------------------
       ELIMINAR SOLAMENTE LOS SLIDES CONFIGURADOS
       ANTERIORMENTE
    --------------------------------------------- */

    hero.querySelectorAll(
        '.hero-slide[data-otium-configured="true"]'
    ).forEach(
        slide => slide.remove()
    );


    carouselSlides = [];

    carouselDurations = [];


    /* ---------------------------------------------
       CREAR SLIDES CONFIGURADOS
    --------------------------------------------- */

    const configuredSlides = [];


    validItems.forEach(
        item => {

            let slide = null;


            const type =
                String(
                    item.tipo ??
                    ""
                )
                    .toLowerCase()
                    .trim();


            /* -----------------------------------------
               BANNER
            ----------------------------------------- */

            if (
                type === "banner"
            ) {

                slide =
                    createBannerSlide(
                        item
                    );

            }


            /* -----------------------------------------
               EVENTO
            ----------------------------------------- */

            else {

                const configuredEventId =
                    String(
                        item.eventoId ??
                        ""
                    );


                const event =
                    events.find(
                        e =>
                            getEventId(e) ===
                            configuredEventId
                    );


                if (!event) {

                    console.warn(
                        "[OTIUM Home] Evento del carrusel no encontrado:",
                        configuredEventId
                    );

                    return;

                }


                slide =
                    createEventSlide(
                        event,
                        item
                    );

            }


            if (!slide) {
                return;
            }


            /*
             * Marcar el slide como dinámico.
             */

            slide.dataset.otiumConfigured =
                "true";


            configuredSlides.push({
                slide,
                duration:
                    Number(
                        item.duracion
                    ) || 6500
            });

        }
    );


    /* ---------------------------------------------
       INSERTAR SLIDES CONFIGURADOS
    --------------------------------------------- */

    /*
     * Buscamos el primer slide ORIGINAL.
     *
     * Los configurados quedarán antes de ellos.
     */

    const firstOriginalSlide =
        Array.from(
            hero.children
        ).find(
            element =>
                element.classList.contains(
                    "hero-slide"
                ) &&
                element.dataset.otiumConfigured !==
                    "true"
        );


    if (
        firstOriginalSlide
    ) {

        /*
         * Insertamos en reversa para conservar
         * exactamente el orden de Firestore.
         */

        configuredSlides
            .slice()
            .reverse()
            .forEach(
                configured => {

                    hero.insertBefore(
                        configured.slide,
                        firstOriginalSlide
                    );

                }
            );

    } else {

        /*
         * Si no existen slides originales,
         * agregamos los configurados normalmente.
         */

        configuredSlides.forEach(
            configured => {

                hero.appendChild(
                    configured.slide
                );

            }
        );

    }


    /* ---------------------------------------------
       CONSTRUIR CARRUSEL COMPLETO
    --------------------------------------------- */

    carouselSlides =
        getHeroSlides();


    /* ---------------------------------------------
       DURACIONES
    --------------------------------------------- */

    carouselDurations =
        carouselSlides.map(
            slide => {

                const configured =
                    configuredSlides.find(
                        item =>
                            item.slide === slide
                    );


                /*
                 * Slide configurado:
                 * utiliza duración de Firestore.
                 */

                if (configured) {

                    return configured.duration;

                }


                /*
                 * Slide original:
                 * duración estándar.
                 */

                return 6500;

            }
        );


    /* ---------------------------------------------
       SI NO EXISTEN SLIDES
    --------------------------------------------- */

    if (
        !carouselSlides.length
    ) {

        console.warn(
            "[OTIUM Home] No existen slides disponibles."
        );


        renderFallbackHero();

        return;

    }


    /* ---------------------------------------------
       INICIALIZAR
    --------------------------------------------- */

    currentSlide = 0;


    renderDots();

    bindHeroControls();

    showSlide(0);


    console.log(
        "[OTIUM Home] Carrusel completo iniciado correctamente:",
        carouselSlides.length,
        "slide(s)"
    );

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


    /* ---------------------------------------------
       DESTACADOS CONFIGURADOS
    --------------------------------------------- */

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
                .slice(
                    0,
                    6
                );

    }


    /* ---------------------------------------------
       FALLBACK
    --------------------------------------------- */

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
                .slice(
                    0,
                    6
                );

    }


    if (
        !selectedEvents.length
    ) {

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


    /* ---------------------------------------------
       SIN CONFIGURACIÓN

       Se conserva intacto el banner estático
       que ya existe en index.html.
    --------------------------------------------- */

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
                    Number(
                        a.orden ?? 0
                    ) -
                    Number(
                        b.orden ?? 0
                    )
            );


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


    if (
        !selectedSponsors.length
    ) {

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


    /*
       Evitar registrar dos veces el evento
       si Home se inicializa nuevamente.
    */

    if (
        searchForm.dataset.otiumBound
    ) {
        return;
    }


    searchForm.dataset.otiumBound =
        "true";


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

        console.log(
            "[OTIUM Home] Iniciando carga del Home..."
        );


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


        console.log(
            "[OTIUM Home] Eventos cargados:",
            events.length
        );


        /* ---------------------------------------------
           SPONSORS
        --------------------------------------------- */

        const sponsors =
            sponsorsSnapshot.docs.map(
                document => {

                    const data =
                        document.data();


                    return {

                        ...data,

                        firestoreId:
                            document.id,

                        id:
                            data.id ??
                            document.id

                    };

                }
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


            console.log(
                "[OTIUM Home] Configuración home cargada:",
                config
            );

        } else {

            console.log(
                "[OTIUM Home] No existe configuracion/home."
            );

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

            console.log(
                "[OTIUM Home] Elementos de carrusel:",
                config.carrusel.length
            );


            renderConfiguredCarousel(
                config.carrusel,
                events
            );

        } else {

            console.log(
                "[OTIUM Home] Sin configuración de carrusel. Usando Home original."
            );


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


        console.log(
            "[OTIUM Home] Home cargado correctamente."
        );


    } catch (error) {

        console.error(
            "[OTIUM Home] Error cargando Home OTIUM:",
            error
        );


        /*
         * Si Firebase falla, mantenemos el Home visual
         * original.
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

