/* =========================================================
   OTIUM - ADMINISTRACIÓN DEL HOME
   Archivo: js/admin-home.js
   Versión: 20260904

   ADMINISTRA:

   1. CARRUSEL
      - Eventos
      - Banners promocionales
      - Orden
      - Activo / inactivo
      - Inicio / término
      - Duración

   2. DESTACADOS
      - Eventos
      - Orden
      - Activo / inactivo
      - Inicio / término
      - Máximo 6

   3. SPONSORS
      - Patrocinadores
      - Orden
      - Activo / inactivo
      - Inicio / término
      - Duración

   FIRESTORE:

   configuracion/home
========================================================= */

import { auth, db } from "./modules/firebase-config.js";

import { getEvents } from "./modules/database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const statusEl =
    $("#adminStatus");

const carouselList =
    $("#carouselList");

const featuredList =
    $("#featuredList");

const sponsorList =
    $("#sponsorList");

const saveButton =
    $("#saveConfig");


/* =========================================================
   ESTADO
========================================================= */

let events = [];

let sponsors = [];

let config = {

    carrusel: [],

    destacados: [],

    sponsors: []

};

let dragged = null;


/* =========================================================
   UTILIDADES
========================================================= */

function esc(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function uid() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }

    return (
        "otium_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2)
    );

}


/* =========================================================
   EVENTOS
========================================================= */

function getEventId(evento) {

    return String(

        evento?.firestoreId ??
        evento?.id ??
        evento?.eventId ??
        ""

    );

}


function getEventTitle(evento) {

    return String(

        evento?.title ??
        evento?.nombre ??
        evento?.nombreEvento ??
        "Evento sin título"

    ).trim();

}


function getEventImage(evento) {

    return String(

        evento?.imagen ??
        evento?.image ??
        evento?.imageUrl ??
        evento?.imagenUrl ??
        evento?.foto ??
        evento?.portada ??
        ""

    ).trim();

}


/* =========================================================
   SPONSORS
========================================================= */

function getSponsorId(sponsor) {

    return String(

        sponsor?.firestoreId ??
        sponsor?.id ??
        sponsor?.patrocinadorId ??
        ""

    );

}


function getSponsorName(sponsor) {

    return String(

        sponsor?.nombre ??
        sponsor?.name ??
        sponsor?.empresa ??
        sponsor?.marca ??
        "Patrocinador"

    ).trim();

}


/* =========================================================
   SELECT
========================================================= */

function buildOptions(
    list,
    selected,
    getId,
    getName,
    emptyText
) {

    return `

        <option value="">
            ${esc(emptyText)}
        </option>

        ${list.map(item => {

            const id =
                String(getId(item));

            return `

                <option
                    value="${esc(id)}"
                    ${
                        id === String(selected)
                            ? "selected"
                            : ""
                    }
                >
                    ${esc(getName(item))}
                </option>

            `;

        }).join("")}

    `;

}


/* =========================================================
   DURACIONES
========================================================= */

function durationOptions(
    value,
    defaultValue = 6500
) {

    const durations = [

        3000,
        5000,
        6500,
        8000,
        10000,
        12000,
        15000

    ];

    const selected =
        Number(value) ||
        defaultValue;


    return durations.map(
        duration => `

            <option
                value="${duration}"
                ${
                    duration === selected
                        ? "selected"
                        : ""
                }
            >
                ${duration / 1000} segundos
            </option>

        `
    ).join("");

}


/* =========================================================
   TIPO CARRUSEL
========================================================= */

function carouselTypeOptions(type) {

    return `

        <option
            value="evento"
            ${
                type !== "banner"
                    ? "selected"
                    : ""
            }
        >
            🎫 Evento
        </option>

        <option
            value="banner"
            ${
                type === "banner"
                    ? "selected"
                    : ""
            }
        >
            🖼️ Banner promocional
        </option>

    `;

}


/* =========================================================
   RENDER CARRUSEL
========================================================= */

function renderCarousel() {

    if (!carouselList) {
        return;
    }


    if (!config.carrusel.length) {

        carouselList.innerHTML = `

            <div class="empty">

                No hay elementos en el carrusel.

                <br>

                Agrega un evento o un banner.

            </div>

        `;

        return;

    }


    carouselList.innerHTML =

        config.carrusel
            .map(
                (item, index) => {

                    const type =
                        item.tipo === "banner"
                            ? "banner"
                            : "evento";


                    const event =
                        events.find(
                            evento =>
                                getEventId(
                                    evento
                                ) ===
                                String(
                                    item.eventoId
                                )
                        );


                    const eventTitle =
                        event
                            ? getEventTitle(
                                event
                            )
                            : "Seleccionar evento";


                    return `

                        <div
                            class="admin-item carousel-admin-item"
                            draggable="true"
                            data-index="${index}"
                        >

                            <div
                                class="drag"
                                title="Arrastrar para ordenar"
                            >
                                ☷
                            </div>


                            <div class="wide">

                                <div class="item-title">

                                    ${
                                        type === "banner"
                                            ? "🖼️ " +
                                              esc(
                                                  item.titulo ||
                                                  "Banner promocional"
                                              )
                                            : "🎫 " +
                                              esc(
                                                  eventTitle
                                              )
                                    }

                                </div>


                                <div class="item-sub">

                                    Orden ${index + 1}

                                </div>

                            </div>


                            <div>

                                <label>
                                    Tipo
                                </label>

                                <select
                                    data-field="tipo"
                                    class="carousel-type"
                                >

                                    ${carouselTypeOptions(
                                        type
                                    )}

                                </select>

                            </div>


                            <div
                                class="carousel-event-field"
                                ${
                                    type === "banner"
                                        ? 'style="display:none"'
                                        : ""
                                }
                            >

                                <label>
                                    Evento
                                </label>

                                <select
                                    data-field="eventoId"
                                >

                                    ${buildOptions(
                                        events,
                                        item.eventoId,
                                        getEventId,
                                        getEventTitle,
                                        "Seleccionar evento..."
                                    )}

                                </select>

                            </div>


                            <div
                                class="carousel-banner-fields"
                                ${
                                    type !== "banner"
                                        ? 'style="display:none"'
                                        : ""
                                }
                            >

                                <label>
                                    Título
                                </label>

                                <input
                                    type="text"
                                    data-field="titulo"
                                    value="${esc(
                                        item.titulo || ""
                                    )}"
                                    placeholder="Título del banner"
                                >


                                <label>
                                    Subtítulo
                                </label>

                                <input
                                    type="text"
                                    data-field="subtitulo"
                                    value="${esc(
                                        item.subtitulo || ""
                                    )}"
                                    placeholder="Texto del banner"
                                >


                                <label>
                                    Imagen
                                </label>

                                <input
                                    type="url"
                                    data-field="imagen"
                                    value="${esc(
                                        item.imagen || ""
                                    )}"
                                    placeholder="https://..."
                                >


                                <label>
                                    Enlace
                                </label>

                                <input
                                    type="text"
                                    data-field="enlace"
                                    value="${esc(
                                        item.enlace || ""
                                    )}"
                                    placeholder="publicita.html"
                                >

                            </div>


                            <label class="switch">

                                <input
                                    type="checkbox"
                                    data-field="activo"
                                    ${
                                        item.activo !== false
                                            ? "checked"
                                            : ""
                                    }
                                >

                                Activo

                            </label>


                            <div>

                                <label>
                                    Inicio
                                </label>

                                <input
                                    type="date"
                                    data-field="inicio"
                                    value="${esc(
                                        item.inicio || ""
                                    )}"
                                >

                            </div>


                            <div>

                                <label>
                                    Fin
                                </label>

                                <input
                                    type="date"
                                    data-field="fin"
                                    value="${esc(
                                        item.fin || ""
                                    )}"
                                >

                            </div>


                            <div>

                                <label>
                                    Duración
                                </label>

                                <select
                                    data-field="duracion"
                                >

                                    ${durationOptions(
                                        item.duracion,
                                        6500
                                    )}

                                </select>

                            </div>


                            <button
                                class="remove"
                                type="button"
                                data-remove
                            >
                                Eliminar
                            </button>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   RENDER DESTACADOS
========================================================= */

function renderFeatured() {

    if (!featuredList) {
        return;
    }


    if (!config.destacados.length) {

        featuredList.innerHTML = `

            <div class="empty">

                No hay eventos destacados
                configurados.

            </div>

        `;

        return;

    }


    featuredList.innerHTML =

        config.destacados
            .map(
                (item, index) => {

                    const event =
                        events.find(
                            evento =>
                                getEventId(
                                    evento
                                ) ===
                                String(
                                    item.eventoId
                                )
                        );


                    return `

                        <div
                            class="admin-item"
                            draggable="true"
                            data-index="${index}"
                        >

                            <div
                                class="drag"
                                title="Arrastrar para ordenar"
                            >
                                ☷
                            </div>


                            <div class="wide">

                                <div class="item-title">

                                    ${
                                        event
                                            ? esc(
                                                getEventTitle(
                                                    event
                                                )
                                            )
                                            : "Evento no encontrado"
                                    }

                                </div>


                                <div class="item-sub">

                                    Orden ${index + 1}

                                </div>

                            </div>


                            <div>

                                <label>
                                    Evento
                                </label>

                                <select
                                    data-field="eventoId"
                                >

                                    ${buildOptions(
                                        events,
                                        item.eventoId,
                                        getEventId,
                                        getEventTitle,
                                        "Seleccionar evento..."
                                    )}

                                </select>

                            </div>


                            <label class="switch">

                                <input
                                    type="checkbox"
                                    data-field="activo"
                                    ${
                                        item.activo !== false
                                            ? "checked"
                                            : ""
                                    }
                                >

                                Activo

                            </label>


                            <div>

                                <label>
                                    Inicio
                                </label>

                                <input
                                    type="date"
                                    data-field="inicio"
                                    value="${esc(
                                        item.inicio || ""
                                    )}"
                                >

                            </div>


                            <div>

                                <label>
                                    Fin
                                </label>

                                <input
                                    type="date"
                                    data-field="fin"
                                    value="${esc(
                                        item.fin || ""
                                    )}"
                                >

                            </div>


                            <button
                                class="remove"
                                type="button"
                                data-remove
                            >
                                Eliminar
                            </button>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   RENDER SPONSORS
========================================================= */

function renderSponsors() {

    if (!sponsorList) {
        return;
    }


    if (!config.sponsors.length) {

        sponsorList.innerHTML = `

            <div class="empty">

                No hay sponsors configurados.

            </div>

        `;

        return;

    }


    sponsorList.innerHTML =

        config.sponsors
            .map(
                (item, index) => {

                    const sponsor =
                        sponsors.find(
                            value =>
                                getSponsorId(
                                    value
                                ) ===
                                String(
                                    item.patrocinadorId
                                )
                        );


                    return `

                        <div
                            class="admin-item"
                            draggable="true"
                            data-index="${index}"
                        >

                            <div
                                class="drag"
                                title="Arrastrar para ordenar"
                            >
                                ☷
                            </div>


                            <div class="wide">

                                <div class="item-title">

                                    ${
                                        sponsor
                                            ? esc(
                                                getSponsorName(
                                                    sponsor
                                                )
                                            )
                                            : "Sponsor no encontrado"
                                    }

                                </div>


                                <div class="item-sub">

                                    Orden ${index + 1}

                                </div>

                            </div>


                            <div>

                                <label>
                                    Patrocinador
                                </label>

                                <select
                                    data-field="patrocinadorId"
                                >

                                    ${buildOptions(
                                        sponsors,
                                        item.patrocinadorId,
                                        getSponsorId,
                                        getSponsorName,
                                        "Seleccionar sponsor..."
                                    )}

                                </select>

                            </div>


                            <label class="switch">

                                <input
                                    type="checkbox"
                                    data-field="activo"
                                    ${
                                        item.activo !== false
                                            ? "checked"
                                            : ""
                                    }
                                >

                                Activo

                            </label>


                            <div>

                                <label>
                                    Inicio
                                </label>

                                <input
                                    type="date"
                                    data-field="inicio"
                                    value="${esc(
                                        item.inicio || ""
                                    )}"
                                >

                            </div>


                            <div>

                                <label>
                                    Fin
                                </label>

                                <input
                                    type="date"
                                    data-field="fin"
                                    value="${esc(
                                        item.fin || ""
                                    )}"
                                >

                            </div>


                            <div>

                                <label>
                                    Duración
                                </label>

                                <select
                                    data-field="duracion"
                                >

                                    ${durationOptions(
                                        item.duracion,
                                        5000
                                    )}

                                </select>

                            </div>


                            <button
                                class="remove"
                                type="button"
                                data-remove
                            >
                                Eliminar
                            </button>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   LEER ELEMENTOS DEL DOM
========================================================= */

function readCarousel() {

    if (!carouselList) {
        return [];
    }


    return [

        ...carouselList
            .querySelectorAll(
                ".admin-item"
            )

    ]

        .map(
            (row, index) => {

                const item = {

                    id:
                        row.dataset.id ||
                        uid(),

                    tipo:
                        row.querySelector(
                            '[data-field="tipo"]'
                        )?.value ||
                        "evento",

                    eventoId:
                        row.querySelector(
                            '[data-field="eventoId"]'
                        )?.value ||
                        "",

                    titulo:
                        row.querySelector(
                            '[data-field="titulo"]'
                        )?.value
                        ?.trim() ||
                        "",

                    subtitulo:
                        row.querySelector(
                            '[data-field="subtitulo"]'
                        )?.value
                        ?.trim() ||
                        "",

                    imagen:
                        row.querySelector(
                            '[data-field="imagen"]'
                        )?.value
                        ?.trim() ||
                        "",

                    enlace:
                        row.querySelector(
                            '[data-field="enlace"]'
                        )?.value
                        ?.trim() ||
                        "",

                    activo:
                        row.querySelector(
                            '[data-field="activo"]'
                        )?.checked !== false,

                    inicio:
                        row.querySelector(
                            '[data-field="inicio"]'
                        )?.value ||
                        "",

                    fin:
                        row.querySelector(
                            '[data-field="fin"]'
                        )?.value ||
                        "",

                    duracion:
                        Number(
                            row.querySelector(
                                '[data-field="duracion"]'
                            )?.value
                        ) ||
                        6500,

                    orden:
                        index + 1

                };


                /*
                   Los banners no necesitan
                   eventoId.
                */

                if (
                    item.tipo ===
                    "banner"
                ) {

                    delete item.eventoId;

                }


                return item;

            }
        );

}


/* =========================================================
   LEER DESTACADOS
========================================================= */

function readFeatured() {

    if (!featuredList) {
        return [];
    }


    return [

        ...featuredList
            .querySelectorAll(
                ".admin-item"
            )

    ]

        .map(
            (row, index) => ({

                eventoId:
                    row.querySelector(
                        '[data-field="eventoId"]'
                    )?.value ||
                    "",

                activo:
                    row.querySelector(
                        '[data-field="activo"]'
                    )?.checked !== false,

                inicio:
                    row.querySelector(
                        '[data-field="inicio"]'
                    )?.value ||
                    "",

                fin:
                    row.querySelector(
                        '[data-field="fin"]'
                    )?.value ||
                    "",

                orden:
                    index + 1

            })
        );

}


/* =========================================================
   LEER SPONSORS
========================================================= */

function readSponsors() {

    if (!sponsorList) {
        return [];
    }


    return [

        ...sponsorList
            .querySelectorAll(
                ".admin-item"
            )

    ]

        .map(
            (row, index) => ({

                patrocinadorId:
                    row.querySelector(
                        '[data-field="patrocinadorId"]'
                    )?.value ||
                    "",

                activo:
                    row.querySelector(
                        '[data-field="activo"]'
                    )?.checked !== false,

                inicio:
                    row.querySelector(
                        '[data-field="inicio"]'
                    )?.value ||
                    "",

                fin:
                    row.querySelector(
                        '[data-field="fin"]'
                    )?.value ||
                    "",

                duracion:
                    Number(
                        row.querySelector(
                            '[data-field="duracion"]'
                        )?.value
                    ) ||
                    5000,

                orden:
                    index + 1

            })
        );

}


/* =========================================================
   DRAG & DROP
========================================================= */

function setupDrag(container) {

    if (!container) {
        return;
    }


    container.addEventListener(
        "dragstart",
        event => {

            const row =
                event.target.closest(
                    ".admin-item"
                );


            if (!row) {
                return;
            }


            dragged = row;


            row.classList.add(
                "dragging"
            );

        }
    );


    container.addEventListener(
        "dragend",
        () => {

            dragged?.classList.remove(
                "dragging"
            );


            dragged = null;

        }
    );


    container.addEventListener(
        "dragover",
        event => {

            event.preventDefault();


            const row =
                event.target.closest(
                    ".admin-item"
                );


            if (
                !dragged ||
                !row ||
                row === dragged
            ) {

                return;

            }


            const rect =
                row.getBoundingClientRect();


            const before =
                event.clientY <
                rect.top +
                rect.height / 2;


            container.insertBefore(

                dragged,

                before
                    ? row
                    : row.nextSibling

            );

        }
    );

}


/* =========================================================
   EVENTOS DE CAMBIO
========================================================= */

function setupContainerEvents(
    container
) {

    if (!container) {
        return;
    }


    container.addEventListener(
        "click",
        event => {

            const remove =
                event.target.closest(
                    "[data-remove]"
                );


            if (
                !remove
            ) {

                return;

            }


            remove
                .closest(
                    ".admin-item"
                )
                ?.remove();


            updateOrders(
                container
            );

        }
    );


    container.addEventListener(
        "change",
        event => {

            /*
               Cambio entre Evento y Banner.
            */

            if (
                event.target.matches(
                    ".carousel-type"
                )
            ) {

                const row =
                    event.target.closest(
                        ".admin-item"
                    );


                const type =
                    event.target.value;


                const eventField =
                    row.querySelector(
                        ".carousel-event-field"
                    );


                const bannerFields =
                    row.querySelector(
                        ".carousel-banner-fields"
                    );


                if (
                    type === "banner"
                ) {

                    eventField.style.display =
                        "none";

                    bannerFields.style.display =
                        "block";

                } else {

                    eventField.style.display =
                        "";

                    bannerFields.style.display =
                        "none";

                }

            }

        }
    );

}


/* =========================================================
   ORDEN VISUAL
========================================================= */

function updateOrders(container) {

    container
        ?.querySelectorAll(
            ".admin-item"
        )
        .forEach(
            (row, index) => {

                const order =
                    row.querySelector(
                        ".item-sub"
                    );


                if (order) {

                    order.textContent =
                        `Orden ${index + 1}`;

                }

            }
        );

}


/* =========================================================
   AGREGAR CARRUSEL
========================================================= */

function addCarousel(
    type = "evento"
) {

    config.carrusel.push({

        id: uid(),

        tipo: type,

        eventoId:
            type === "evento"
                ? ""
                : undefined,

        titulo:
            type === "banner"
                ? "Publica tu evento en OTIUM"
                : "",

        subtitulo:
            type === "banner"
                ? "Llega a más personas y destaca tu evento."
                : "",

        imagen: "",

        enlace:
            type === "banner"
                ? "publicita.html"
                : "",

        activo: true,

        inicio: "",

        fin: "",

        duracion: 6500

    });


    renderCarousel();


    const rows =
        carouselList
            ?.querySelectorAll(
                ".admin-item"
            );


    rows?.[
        rows.length - 1
    ]?.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });

}


/* =========================================================
   AGREGAR DESTACADO
========================================================= */

function addFeatured() {

    config.destacados.push({

        eventoId: "",

        activo: true,

        inicio: "",

        fin: ""

    });


    renderFeatured();

}


/* =========================================================
   AGREGAR SPONSOR
========================================================= */

function addSponsor() {

    config.sponsors.push({

        patrocinadorId: "",

        activo: true,

        inicio: "",

        fin: "",

        duracion: 5000

    });


    renderSponsors();

}


/* =========================================================
   CREAR BOTÓN BANNER
========================================================= */

function ensureBannerButton() {

    const existing =
        document.getElementById(
            "addCarouselBanner"
        );


    if (existing) {
        return;
    }


    const eventButton =
        document.getElementById(
            "addCarouselEvent"
        );


    if (!eventButton) {
        return;
    }


    const bannerButton =
        document.createElement(
            "button"
        );


    bannerButton.id =
        "addCarouselBanner";


    bannerButton.type =
        "button";


    bannerButton.className =
        eventButton.className;


    bannerButton.textContent =
        "+ Agregar banner";


    bannerButton.style.marginLeft =
        "8px";


    eventButton
        .parentNode
        ?.appendChild(
            bannerButton
        );


    bannerButton.addEventListener(
        "click",
        () =>
            addCarousel(
                "banner"
            )
    );

}


/* =========================================================
   CARGAR CONFIGURACIÓN
========================================================= */

async function loadConfiguration() {

    statusEl.textContent =
        "Cargando configuración...";


    events =
        await getEvents();


    const sponsorsSnapshot =
        await getDocs(
            collection(
                db,
                "patrocinadores"
            )
        );


    sponsors =
        sponsorsSnapshot.docs.map(
            document => ({

                firestoreId:
                    document.id,

                ...document.data()

            })
        );


    const homeSnapshot =
        await getDoc(
            doc(
                db,
                "configuracion",
                "home"
            )
        );


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


    renderCarousel();

    renderFeatured();

    renderSponsors();

    ensureBannerButton();


    statusEl.textContent =
        `Listo · ${events.length} eventos · ${sponsors.length} sponsors disponibles`;

}


/* =========================================================
   GUARDAR
========================================================= */

async function saveConfiguration() {

    try {

        const user =
            auth.currentUser;


        if (!user) {

            statusEl.textContent =
                "Debes iniciar sesión.";

            return;

        }


        const adminSnapshot =
            await getDoc(
                doc(
                    db,
                    "administradores",
                    user.uid
                )
            );


        if (
            !adminSnapshot.exists()
        ) {

            statusEl.textContent =
                "No tienes permisos de administrador.";

            return;

        }


        statusEl.textContent =
            "Guardando configuración...";


        if (saveButton) {

            saveButton.disabled =
                true;

        }


        const carousel =
            readCarousel()
                .filter(
                    item =>
                        item.tipo === "banner" ||
                        item.eventoId
                )
                .map(
                    (item, index) => ({

                        ...item,

                        orden:
                            index + 1

                    })
                );


        const featured =
            readFeatured()
                .filter(
                    item =>
                        item.eventoId
                )
                .slice(
                    0,
                    6
                )
                .map(
                    (item, index) => ({

                        ...item,

                        orden:
                            index + 1

                    })
                );


        const sponsorConfig =
            readSponsors()
                .filter(
                    item =>
                        item.patrocinadorId
                )
                .map(
                    (item, index) => ({

                        ...item,

                        orden:
                            index + 1

                    })
                );


        await setDoc(

            doc(
                db,
                "configuracion",
                "home"
            ),

            {

                carrusel:
                    carousel,

                destacados:
                    featured,

                sponsors:
                    sponsorConfig,

                updatedAt:
                    serverTimestamp()

            },

            {
                merge:
                    true
            }

        );


        config = {

            carrusel:
                carousel,

            destacados:
                featured,

            sponsors:
                sponsorConfig

        };


        statusEl.textContent =
            "✓ Configuración del Home guardada correctamente.";


    } catch (error) {

        console.error(
            "OTIUM Admin Home:",
            error
        );


        statusEl.textContent =
            "Error guardando configuración: " +
            error.message;


    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

        }

    }

}


/* =========================================================
   TABS
========================================================= */

document
    .querySelectorAll(
        ".admin-tab"
    )
    .forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".admin-tab"
                        )
                        .forEach(
                            button =>
                                button.classList.remove(
                                    "active"
                                )
                        );


                    document
                        .querySelectorAll(
                            ".admin-panel"
                        )
                        .forEach(
                            panel =>
                                panel.classList.remove(
                                    "active"
                                )
                        );


                    tab.classList.add(
                        "active"
                    );


                    document
                        .getElementById(
                            "tab-" +
                            tab.dataset.tab
                        )
                        ?.classList.add(
                            "active"
                        );

                }
            );

        }
    );


/* =========================================================
   BOTONES
========================================================= */

document
    .getElementById(
        "addCarouselEvent"
    )
    ?.addEventListener(
        "click",
        () =>
            addCarousel(
                "evento"
            )
    );


document
    .getElementById(
        "addFeatured"
    )
    ?.addEventListener(
        "click",
        addFeatured
    );


document
    .getElementById(
        "addSponsor"
    )
    ?.addEventListener(
        "click",
        addSponsor
    );


saveButton
    ?.addEventListener(
        "click",
        saveConfiguration
    );


/* =========================================================
   DRAG
========================================================= */

setupDrag(
    carouselList
);

setupDrag(
    featuredList
);

setupDrag(
    sponsorList
);


/* =========================================================
   EVENTOS
========================================================= */

setupContainerEvents(
    carouselList
);

setupContainerEvents(
    featuredList
);

setupContainerEvents(
    sponsorList
);


/* =========================================================
   AUTENTICACIÓN
========================================================= */

onAuthStateChanged(

    auth,

    async user => {

        if (!user) {

            statusEl.textContent =
                "Debes iniciar sesión como administrador para acceder.";

            return;

        }


        try {

            const adminSnapshot =
                await getDoc(
                    doc(
                        db,
                        "administradores",
                        user.uid
                    )
                );


            if (
                !adminSnapshot.exists()
            ) {

                statusEl.textContent =
                    "Acceso denegado: esta cuenta no es administradora.";

                return;

            }


            await loadConfiguration();


        } catch (error) {

            console.error(
                "OTIUM Admin:",
                error
            );


            statusEl.textContent =
                "Error cargando la administración: " +
                error.message;

        }

    }

);