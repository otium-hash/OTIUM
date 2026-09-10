
/* =====================================================
   OTIUM - ADMINISTRACIÓN DEL HOME
   Archivo: js/admin-home.js
   Versión: 20260909

   FUNCIONES:

   1. CARRUSEL
      - Eventos
      - Banners promocionales
      - URL de imagen externa / ImageKit
      - Orden
      - Activo / inactivo
      - Fecha inicio / fin
      - Duración

   2. DESTACADOS
      - Eventos destacados
      - Orden
      - Activo / inactivo
      - Fecha inicio / fin
      - Máximo 6

   3. SPONSORS / PATROCINADORES
      - Utiliza los patrocinadores existentes
      - NO elimina documentos de "patrocinadores"
      - Permite ordenar
      - Activo / inactivo
      - Fecha inicio / fin
      - Duración

   4. EVENTOS / LIMPIEZA
      - Total
      - Actuales / futuros
      - Pasados
      - Antiguos +90 días
      - Posibles duplicados
      - Filtros
      - Selección individual
      - Seleccionar visibles
      - Eliminación múltiple
      - Confirmación
      - Limpieza de referencias en configuracion/home

   IMPORTANTE:

   - Las imágenes de banners NO se almacenan en Firebase Storage.
   - La imagen se obtiene desde una URL pública.
   - Puede utilizarse ImageKit.
   - Firestore guarda solamente la URL.
   - No requiere Firebase Functions para subir imágenes.
   - No requiere Secret Manager.
   - No requiere Blaze.
   - Solo modifica "configuracion/home".
   - Nunca elimina patrocinadores existentes.
===================================================== */


import { auth, db } from "./modules/firebase-config.js";
import { getEvents, deleteEvent } from "./modules/database.js";

import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

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


/* =====================================================
   ESTADO
===================================================== */

let events = [];
let sponsors = [];

let config = {
    carrusel: [],
    destacados: [],
    sponsors: []
};

let dragged = null;


/* =====================================================
   ESTADO LIMPIEZA
===================================================== */

let cleanupFilter = "todos";

let cleanupSelected = new Set();

let cleanupDuplicateIds = new Set();


/* =====================================================
   UTILIDADES
===================================================== */

function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   GENERADOR DE ID
===================================================== */

function uid(prefix = "item") {

    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

}


/* =====================================================
   VALIDAR URL DE IMAGEN
===================================================== */

function isValidImageUrl(value) {

    if (!value) return false;

    try {

        const url = new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {

        return false;

    }

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

    if (!event) return "Evento sin título";

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


/* =====================================================
   DATOS DE FECHA DEL EVENTO
===================================================== */

function getEventDateValue(event) {

    if (!event) return "";

    return (
        event.fecha ??
        event.date ??
        event.fechaEvento ??
        event.eventDate ??
        ""
    );

}


function parseEventDate(event) {

    const raw =
        getEventDateValue(event);

    if (!raw) return null;


    if (
        raw instanceof Date
    ) {

        return isNaN(raw.getTime())
            ? null
            : raw;

    }


    if (
        typeof raw === "object" &&
        typeof raw.toDate === "function"
    ) {

        const date =
            raw.toDate();

        return isNaN(date.getTime())
            ? null
            : date;

    }


    const text =
        String(raw).trim();


    if (!text) return null;


    /*
       YYYY-MM-DD
       Se interpreta como fecha local
       para evitar desplazamientos por zona horaria.
    */

    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (match) {

        const year =
            Number(match[1]);

        const month =
            Number(match[2]);

        const day =
            Number(match[3]);

        const date =
            new Date(
                year,
                month - 1,
                day
            );

        return isNaN(date.getTime())
            ? null
            : date;

    }


    const date =
        new Date(text);


    return isNaN(date.getTime())
        ? null
        : date;

}


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizeText(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        );

}


/* =====================================================
   FECHA PARA DUPLICADOS
===================================================== */

function getDuplicateDateKey(event) {

    const date =
        parseEventDate(event);

    if (!date) {

        return "";

    }


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =====================================================
   CIUDAD
===================================================== */

function getEventCity(event) {

    if (!event) return "";

    return (
        event.ciudad ??
        event.city ??
        event.comuna ??
        event.localidad ??
        ""
    );

}


/* =====================================================
   CLAVE DE DUPLICADO
===================================================== */

function getDuplicateKey(event) {

    const name =
        normalizeText(
            getEventTitle(event)
        );


    const date =
        getDuplicateDateKey(event);


    const city =
        normalizeText(
            getEventCity(event)
        );


    if (
        !name ||
        !date ||
        !city
    ) {

        return "";

    }


    return `${name}|${date}|${city}`;

}


/* =====================================================
   CALCULAR DUPLICADOS
===================================================== */

function calculateDuplicates() {

    cleanupDuplicateIds =
        new Set();


    const groups =
        new Map();


    for (const event of events) {

        const key =
            getDuplicateKey(event);


        if (!key) continue;


        if (!groups.has(key)) {

            groups.set(
                key,
                []
            );

        }


        groups
            .get(key)
            .push(event);

    }


    for (const group of groups.values()) {

        if (group.length < 2) {

            continue;

        }


        for (const event of group) {

            const id =
                getEventId(event);

            if (id) {

                cleanupDuplicateIds.add(
                    id
                );

            }

        }

    }

}


/* =====================================================
   FORMATEAR FECHA
===================================================== */

function formatEventDate(event) {

    const date =
        parseEventDate(event);


    if (!date) {

        return "Sin fecha";

    }


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
   CLASIFICACIÓN DE EVENTOS
===================================================== */

function getEventStatus(event) {

    const date =
        parseEventDate(event);


    if (!date) {

        return "sin-fecha";

    }


    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const eventDay =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );


    if (
        eventDay >= today
    ) {

        return "actuales";

    }


    const diffMs =
        today.getTime() -
        eventDay.getTime();


    const diffDays =
        Math.floor(
            diffMs /
            (
                1000 *
                60 *
                60 *
                24
            )
        );


    if (
        diffDays >= 90
    ) {

        return "antiguos";

    }


    return "pasados";

}


/* =====================================================
   OBTENER EVENTOS SEGÚN FILTRO
===================================================== */

function getFilteredCleanupEvents() {

    calculateDuplicates();


    if (
        cleanupFilter ===
        "todos"
    ) {

        return [...events];

    }


    if (
        cleanupFilter ===
        "duplicados"
    ) {

        return events.filter(
            event =>
                cleanupDuplicateIds.has(
                    getEventId(event)
                )
        );

    }


    return events.filter(
        event =>
            getEventStatus(event) ===
            cleanupFilter
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

    if (!sponsor) return "Patrocinador sin nombre";

    return (
        sponsor.nombre ??
        sponsor.name ??
        sponsor.empresa ??
        sponsor.razonSocial ??
        "Patrocinador sin nombre"
    );

}


/* =====================================================
   OPCIONES SELECT
===================================================== */

function buildOptions(
    items,
    selected,
    getId,
    getLabel,
    emptyLabel
) {

    let html = `
        <option value="">
            ${esc(emptyLabel)}
        </option>
    `;

    for (const item of items) {

        const id =
            String(
                getId(item)
            );

        html += `
            <option
                value="${esc(id)}"
                ${
                    id ===
                    String(
                        selected ?? ""
                    )
                        ? "selected"
                        : ""
                }
            >
                ${esc(
                    getLabel(item)
                )}
            </option>
        `;

    }

    return html;

}


/* =====================================================
   DURACIONES
===================================================== */

const durationOptions = [
    3000,
    5000,
    6500,
    8000,
    10000,
    12000,
    15000
];


function buildDurationOptions(
    selected = 6500
) {

    return durationOptions
        .map(ms => {

            const seconds =
                ms / 1000;

            return `
                <option
                    value="${ms}"
                    ${
                        Number(selected) === ms
                            ? "selected"
                            : ""
                    }
                >
                    ${seconds} segundos
                </option>
            `;

        })
        .join("");

}


/* =====================================================
   TIPOS DE CARRUSEL
===================================================== */

function buildCarouselTypeOptions(
    type = "evento"
) {

    return `
        <option
            value="evento"
            ${
                type === "evento"
                    ? "selected"
                    : ""
            }
        >
            Evento
        </option>

        <option
            value="banner"
            ${
                type === "banner"
                    ? "selected"
                    : ""
            }
        >
            Banner promocional
        </option>
    `;

}


/* =====================================================
   VISTA PREVIA DEL BANNER
===================================================== */

function buildBannerPreview(
    imageUrl
) {

    if (!imageUrl) {

        return `
            <div
                class="banner-preview"
                data-banner-preview
                style="
                    display:none;
                    margin-top:10px;
                "
            >

                <img
                    data-banner-preview-image
                    src=""
                    alt="Vista previa del banner"
                    style="
                        display:block;
                        width:100%;
                        max-width:700px;
                        max-height:220px;
                        object-fit:cover;
                        border-radius:10px;
                        border:1px solid #ddd;
                    "
                >

                <small
                    data-banner-preview-status
                    style="
                        display:block;
                        margin-top:6px;
                    "
                ></small>

            </div>
        `;

    }


    return `
        <div
            class="banner-preview"
            data-banner-preview
            style="
                display:block;
                margin-top:10px;
            "
        >

            <img
                data-banner-preview-image
                src="${esc(imageUrl)}"
                alt="Vista previa del banner"
                style="
                    display:block;
                    width:100%;
                    max-width:700px;
                    max-height:220px;
                    object-fit:cover;
                    border-radius:10px;
                    border:1px solid #ddd;
                "
            >

            <small
                data-banner-preview-status
                style="
                    display:block;
                    margin-top:6px;
                "
            >
                Vista previa
            </small>

        </div>
    `;

}


/* =====================================================
   ACTUALIZAR VISTA PREVIA
===================================================== */

function updateBannerPreview(
    input
) {

    if (!input) return;


    const row =
        input.closest(
            ".admin-item"
        );


    if (!row) return;


    const preview =
        row.querySelector(
            "[data-banner-preview]"
        );


    const previewImage =
        row.querySelector(
            "[data-banner-preview-image]"
        );


    const previewStatus =
        row.querySelector(
            "[data-banner-preview-status]"
        );


    if (
        !preview ||
        !previewImage
    ) {

        return;

    }


    const url =
        input.value.trim();


    if (!url) {

        preview.style.display =
            "none";

        previewImage.src =
            "";

        if (previewStatus) {

            previewStatus.textContent =
                "";

        }

        input.style.borderColor =
            "";

        return;

    }


    if (
        !isValidImageUrl(url)
    ) {

        preview.style.display =
            "none";

        previewImage.src =
            "";

        input.style.borderColor =
            "#dc3545";

        if (previewStatus) {

            previewStatus.textContent =
                "La URL debe comenzar con http:// o https://";

        }

        return;

    }


    input.style.borderColor =
        "";

    preview.style.display =
        "block";

    previewImage.src =
        url;


    if (previewStatus) {

        previewStatus.textContent =
            "Cargando vista previa...";

    }


    previewImage.onload =
        () => {

            if (previewStatus) {

                previewStatus.textContent =
                    "Vista previa correcta";

            }

        };


    previewImage.onerror =
        () => {

            if (previewStatus) {

                previewStatus.textContent =
                    "No se pudo cargar la imagen. Verifica que la URL sea pública y válida.";

            }

        };

}


/* =====================================================
   CARRUSEL
===================================================== */

function renderCarousel() {

    const container =
        document.getElementById(
            "carouselList"
        );


    if (!container) return;


    if (
        !Array.isArray(
            config.carrusel
        ) ||
        !config.carrusel.length
    ) {

        container.innerHTML = `
            <div class="admin-empty">
                No hay elementos en el carrusel.
                Agrega un evento o un banner.
            </div>
        `;

        return;

    }


    container.innerHTML =
        config.carrusel
            .map(
                (
                    item,
                    index
                ) => {

                    const type =
                        item.tipo ===
                        "banner"
                            ? "banner"
                            : "evento";


                    const eventId =
                        item.eventoId ??
                        "";


                    const event =
                        events.find(
                            e =>
                                getEventId(e) ===
                                String(
                                    eventId
                                )
                        );


                    const bannerImage =
                        item.imagen ??
                        item.imagenUrl ??
                        item.imageUrl ??
                        "";


                    const bannerTitle =
                        item.titulo ??
                        item.bannerTitle ??
                        "";


                    const bannerSubtitle =
                        item.subtitulo ??
                        item.bannerSubtitle ??
                        "";


                    const bannerLink =
                        item.enlace ??
                        item.bannerLink ??
                        "";


                    const itemId =
                        item.id ||
                        uid(
                            "carousel"
                        );


                    return `
                        <article
                            class="admin-item"
                            draggable="true"
                            data-id="${esc(itemId)}"
                        >

                            <div class="admin-item-drag">
                                ☰
                            </div>


                            <div class="admin-item-content">

                                <div class="admin-item-header">

                                    <div>

                                        <strong>
                                            Elemento ${index + 1}
                                        </strong>

                                    </div>


                                    <button
                                        type="button"
                                        class="admin-remove"
                                        data-remove-carousel
                                    >
                                        Eliminar
                                    </button>

                                </div>


                                <div class="admin-grid">


                                    <div class="admin-field">

                                        <label>
                                            Tipo
                                        </label>

                                        <select
                                            data-field="tipo"
                                            data-carousel-type
                                        >

                                            ${buildCarouselTypeOptions(
                                                type
                                            )}

                                        </select>

                                    </div>


                                    <div
                                        class="admin-field carousel-event-field"
                                        ${
                                            type ===
                                            "banner"
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
                                                eventId,
                                                getEventId,
                                                getEventTitle,
                                                "Seleccionar evento"
                                            )}

                                        </select>


                                        ${
                                            event
                                                ? `
                                                    <small>
                                                        Evento seleccionado:
                                                        ${esc(
                                                            getEventTitle(
                                                                event
                                                            )
                                                        )}
                                                    </small>
                                                  `
                                                : ""
                                        }

                                    </div>


                                    <div
                                        class="admin-field carousel-banner-field"
                                        ${
                                            type ===
                                            "evento"
                                                ? 'style="display:none"'
                                                : ""
                                        }
                                    >

                                        <label>
                                            Título del banner
                                        </label>

                                        <input
                                            type="text"
                                            data-field="bannerTitle"
                                            value="${esc(
                                                bannerTitle
                                            )}"
                                            placeholder="Título del banner"
                                        >

                                    </div>


                                    <div
                                        class="admin-field carousel-banner-field"
                                        ${
                                            type ===
                                            "evento"
                                                ? 'style="display:none"'
                                                : ""
                                        }
                                    >

                                        <label>
                                            Subtítulo
                                        </label>

                                        <input
                                            type="text"
                                            data-field="bannerSubtitle"
                                            value="${esc(
                                                bannerSubtitle
                                            )}"
                                            placeholder="Subtítulo"
                                        >

                                    </div>


                                    <div
                                        class="admin-field carousel-banner-field"
                                        ${
                                            type ===
                                            "evento"
                                                ? 'style="display:none"'
                                                : ""
                                        }
                                    >

                                        <label>
                                            URL de imagen
                                        </label>

                                        <input
                                            type="url"
                                            data-field="bannerImage"
                                            value="${esc(
                                                bannerImage
                                            )}"
                                            placeholder="https://ik.imagekit.io/jevslttck/..."
                                            autocomplete="off"
                                        >

                                        <small>
                                            Pega aquí la URL pública de la imagen.
                                            No se sube a Firebase Storage.
                                        </small>


                                        ${buildBannerPreview(
                                            bannerImage
                                        )}

                                    </div>


                                    <div
                                        class="admin-field carousel-banner-field"
                                        ${
                                            type ===
                                            "evento"
                                                ? 'style="display:none"'
                                                : ""
                                        }
                                    >

                                        <label>
                                            Enlace
                                        </label>

                                        <input
                                            type="text"
                                            data-field="bannerLink"
                                            value="${esc(
                                                bannerLink
                                            )}"
                                            placeholder="publicita.html"
                                        >

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Duración
                                        </label>

                                        <select
                                            data-field="duracion"
                                        >

                                            ${buildDurationOptions(
                                                item.duracion ||
                                                6500
                                            )}

                                        </select>

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Inicio
                                        </label>

                                        <input
                                            type="date"
                                            data-field="inicio"
                                            value="${esc(
                                                item.inicio ||
                                                ""
                                            )}"
                                        >

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Fin
                                        </label>

                                        <input
                                            type="date"
                                            data-field="fin"
                                            value="${esc(
                                                item.fin ||
                                                ""
                                            )}"
                                        >

                                    </div>


                                    <div
                                        class="admin-field admin-checkbox-field"
                                    >

                                        <label>

                                            <input
                                                type="checkbox"
                                                data-field="activo"
                                                ${
                                                    item.activo !==
                                                    false
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            Activo

                                        </label>

                                    </div>


                                </div>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");


    bindDragAndDrop(
        container
    );

    bindBannerPreviewEvents(
        container
    );

}


/* =====================================================
   EVENTOS DE VISTA PREVIA
===================================================== */

function bindBannerPreviewEvents(
    container
) {

    if (!container) return;


    const inputs =
        container.querySelectorAll(
            '[data-field="bannerImage"]'
        );


    inputs.forEach(
        input => {

            input.addEventListener(
                "input",
                () => {

                    updateBannerPreview(
                        input
                    );

                }
            );


            input.addEventListener(
                "change",
                () => {

                    updateBannerPreview(
                        input
                    );

                }
            );


            if (
                input.value.trim()
            ) {

                updateBannerPreview(
                    input
                );

            }

        }
    );

}


/* =====================================================
   DESTACADOS
===================================================== */

function renderFeatured() {

    const container =
        document.getElementById(
            "featuredList"
        );


    if (!container) return;


    if (
        !Array.isArray(
            config.destacados
        ) ||
        !config.destacados.length
    ) {

        container.innerHTML = `
            <div class="admin-empty">
                No hay eventos destacados configurados.
            </div>
        `;

        return;

    }


    container.innerHTML =
        config.destacados
            .map(
                (
                    item,
                    index
                ) => {

                    const itemId =
                        item.id ||
                        uid(
                            "featured"
                        );


                    return `
                        <article
                            class="admin-item"
                            draggable="true"
                            data-id="${esc(itemId)}"
                        >

                            <div class="admin-item-drag">
                                ☰
                            </div>


                            <div class="admin-item-content">

                                <div class="admin-item-header">

                                    <strong>
                                        Destacado ${index + 1}
                                    </strong>


                                    <button
                                        type="button"
                                        class="admin-remove"
                                        data-remove-featured
                                    >
                                        Eliminar
                                    </button>

                                </div>


                                <div class="admin-grid">


                                    <div class="admin-field">

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
                                                "Seleccionar evento"
                                            )}

                                        </select>

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Inicio
                                        </label>

                                        <input
                                            type="date"
                                            data-field="inicio"
                                            value="${esc(
                                                item.inicio ||
                                                ""
                                            )}"
                                        >

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Fin
                                        </label>

                                        <input
                                            type="date"
                                            data-field="fin"
                                            value="${esc(
                                                item.fin ||
                                                ""
                                            )}"
                                        >

                                    </div>


                                    <div
                                        class="admin-field admin-checkbox-field"
                                    >

                                        <label>

                                            <input
                                                type="checkbox"
                                                data-field="activo"
                                                ${
                                                    item.activo !==
                                                    false
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            Activo

                                        </label>

                                    </div>


                                </div>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");


    bindDragAndDrop(
        container
    );

}


/* =====================================================
   SPONSORS
===================================================== */

function renderSponsors() {

    const container =
        document.getElementById(
            "sponsorList"
        );


    if (!container) return;


    if (
        !Array.isArray(
            config.sponsors
        ) ||
        !config.sponsors.length
    ) {

        if (sponsors.length) {

            container.innerHTML = `
                <div class="admin-empty">

                    Hay
                    <strong>
                        ${sponsors.length}
                    </strong>
                    patrocinador(es) disponibles en Firestore,
                    pero ninguno está configurado para el Home.

                    <br><br>

                    Usa
                    <strong>
                        + Agregar sponsor
                    </strong>
                    para incorporarlos.

                </div>
            `;

        }

        else {

            container.innerHTML = `
                <div class="admin-empty">
                    No hay sponsors disponibles.
                </div>
            `;

        }

        return;

    }


    container.innerHTML =
        config.sponsors
            .map(
                (
                    item,
                    index
                ) => {

                    const sponsorId =
                        item.patrocinadorId ??
                        "";


                    const sponsor =
                        sponsors.find(
                            s =>
                                getSponsorId(s) ===
                                String(
                                    sponsorId
                                )
                        );


                    const itemId =
                        item.id ||
                        uid(
                            "sponsor"
                        );


                    return `
                        <article
                            class="admin-item"
                            draggable="true"
                            data-id="${esc(itemId)}"
                        >

                            <div class="admin-item-drag">
                                ☰
                            </div>


                            <div class="admin-item-content">

                                <div class="admin-item-header">

                                    <div>

                                        <strong>
                                            Sponsor ${index + 1}
                                        </strong>


                                        ${
                                            sponsor
                                                ? `
                                                    <small>
                                                        ${esc(
                                                            getSponsorName(
                                                                sponsor
                                                            )
                                                        )}
                                                    </small>
                                                  `
                                                : `
                                                    <small>
                                                        Sponsor no encontrado
                                                    </small>
                                                  `
                                        }

                                    </div>


                                    <button
                                        type="button"
                                        class="admin-remove"
                                        data-remove-sponsor
                                    >
                                        Eliminar
                                    </button>

                                </div>


                                <div class="admin-grid">


                                    <div class="admin-field">

                                        <label>
                                            Patrocinador
                                        </label>

                                        <select
                                            data-field="patrocinadorId"
                                        >

                                            ${buildOptions(
                                                sponsors,
                                                sponsorId,
                                                getSponsorId,
                                                getSponsorName,
                                                "Seleccionar patrocinador"
                                            )}

                                        </select>

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Duración
                                        </label>

                                        <select
                                            data-field="duracion"
                                        >

                                            ${buildDurationOptions(
                                                item.duracion ||
                                                5000
                                            )}

                                        </select>

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Inicio
                                        </label>

                                        <input
                                            type="date"
                                            data-field="inicio"
                                            value="${esc(
                                                item.inicio ||
                                                ""
                                            )}"
                                        >

                                    </div>


                                    <div class="admin-field">

                                        <label>
                                            Fin
                                        </label>

                                        <input
                                            type="date"
                                            data-field="fin"
                                            value="${esc(
                                                item.fin ||
                                                ""
                                            )}"
                                        >

                                    </div>


                                    <div
                                        class="admin-field admin-checkbox-field"
                                    >

                                        <label>

                                            <input
                                                type="checkbox"
                                                data-field="activo"
                                                ${
                                                    item.activo !==
                                                    false
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            Activo

                                        </label>

                                    </div>


                                </div>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");


    bindDragAndDrop(
        container
    );

}


/* =====================================================
   LEER CARRUSEL DESDE EL DOM
===================================================== */

function readCarousel() {

    const container =
        document.getElementById(
            "carouselList"
        );


    if (!container) return [];


    return [
        ...container.querySelectorAll(
            ".admin-item"
        )
    ]
        .map(
            (
                row,
                index
            ) => {

                const type =
                    row.querySelector(
                        '[data-field="tipo"]'
                    )?.value ||
                    "evento";


                const item = {

                    id:
                        row.dataset.id ||
                        uid(
                            "carousel"
                        ),

                    tipo:
                        type,

                    activo:
                        row.querySelector(
                            '[data-field="activo"]'
                        )?.checked ??
                        true,

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
                            )?.value ||
                            6500
                        ),

                    orden:
                        index

                };


                if (
                    type ===
                    "banner"
                ) {

                    item.titulo =
                        row.querySelector(
                            '[data-field="bannerTitle"]'
                        )?.value.trim() ||
                        "";


                    item.subtitulo =
                        row.querySelector(
                            '[data-field="bannerSubtitle"]'
                        )?.value.trim() ||
                        "";


                    item.imagen =
                        row.querySelector(
                            '[data-field="bannerImage"]'
                        )?.value.trim() ||
                        "";


                    item.enlace =
                        row.querySelector(
                            '[data-field="bannerLink"]'
                        )?.value.trim() ||
                        "";

                }

                else {

                    const eventoId =
                        row.querySelector(
                            '[data-field="eventoId"]'
                        )?.value ||
                        "";


                    if (eventoId) {

                        item.eventoId =
                            eventoId;

                    }

                }


                return item;

            }
        );

}


/* =====================================================
   LEER DESTACADOS
===================================================== */

function readFeatured() {

    const container =
        document.getElementById(
            "featuredList"
        );


    if (!container) return [];


    return [
        ...container.querySelectorAll(
            ".admin-item"
        )
    ]
        .map(
            (
                row,
                index
            ) => {

                return {

                    id:
                        row.dataset.id ||
                        uid(
                            "featured"
                        ),

                    eventoId:
                        row.querySelector(
                            '[data-field="eventoId"]'
                        )?.value ||
                        "",

                    activo:
                        row.querySelector(
                            '[data-field="activo"]'
                        )?.checked ??
                        true,

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
                        index

                };

            }
        );

}


/* =====================================================
   LEER SPONSORS
===================================================== */

function readSponsors() {

    const container =
        document.getElementById(
            "sponsorList"
        );


    if (!container) return [];


    return [
        ...container.querySelectorAll(
            ".admin-item"
        )
    ]
        .map(
            (
                row,
                index
            ) => {

                return {

                    id:
                        row.dataset.id ||
                        uid(
                            "sponsor"
                        ),

                    patrocinadorId:
                        row.querySelector(
                            '[data-field="patrocinadorId"]'
                        )?.value ||
                        "",

                    activo:
                        row.querySelector(
                            '[data-field="activo"]'
                        )?.checked ??
                        true,

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
                            )?.value ||
                            5000
                        ),

                    orden:
                        index

                };

            }
        );

}


/* =====================================================
   DRAG & DROP
===================================================== */

function bindDragAndDrop(
    container
) {

    if (!container) return;


    const items =
        [
            ...container.querySelectorAll(
                ".admin-item"
            )
        ];


    items.forEach(
        item => {

            item.addEventListener(
                "dragstart",
                () => {

                    dragged =
                        item;

                    item.classList.add(
                        "dragging"
                    );

                }
            );


            item.addEventListener(
                "dragend",
                () => {

                    dragged =
                        null;

                    item.classList.remove(
                        "dragging"
                    );

                    updateVisualOrder(
                        container
                    );

                }
            );


            item.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();


                    if (
                        !dragged ||
                        dragged === item
                    ) {

                        return;

                    }


                    const rect =
                        item.getBoundingClientRect();


                    const middle =
                        rect.top +
                        rect.height /
                        2;


                    if (
                        event.clientY <
                        middle
                    ) {

                        item.parentNode.insertBefore(
                            dragged,
                            item
                        );

                    }

                    else {

                        item.parentNode.insertBefore(
                            dragged,
                            item.nextSibling
                        );

                    }

                }
            );

        }
    );

}


/* =====================================================
   ACTUALIZAR ORDEN VISUAL
===================================================== */

function updateVisualOrder(
    container
) {

    if (!container) return;


    [
        ...container.querySelectorAll(
            ".admin-item"
        )
    ]
        .forEach(
            (
                item,
                index
            ) => {

                const title =
                    item.querySelector(
                        ".admin-item-header strong"
                    );


                if (!title) return;


                if (
                    container.id ===
                    "carouselList"
                ) {

                    title.textContent =
                        `Elemento ${index + 1}`;

                }

                else if (
                    container.id ===
                    "featuredList"
                ) {

                    title.textContent =
                        `Destacado ${index + 1}`;

                }

                else if (
                    container.id ===
                    "sponsorList"
                ) {

                    title.textContent =
                        `Sponsor ${index + 1}`;

                }

            }
        );

}


/* =====================================================
   ELIMINAR ELEMENTOS
===================================================== */

function bindRemoveButtons() {

    document.addEventListener(
        "click",
        event => {


            const carouselButton =
                event.target.closest(
                    "[data-remove-carousel]"
                );


            if (carouselButton) {

                const item =
                    carouselButton.closest(
                        ".admin-item"
                    );


                if (item) {

                    item.remove();


                    updateVisualOrder(
                        document.getElementById(
                            "carouselList"
                        )
                    );

                }


                return;

            }


            const featuredButton =
                event.target.closest(
                    "[data-remove-featured]"
                );


            if (featuredButton) {

                const item =
                    featuredButton.closest(
                        ".admin-item"
                    );


                if (item) {

                    item.remove();


                    updateVisualOrder(
                        document.getElementById(
                            "featuredList"
                        )
                    );

                }


                return;

            }


            const sponsorButton =
                event.target.closest(
                    "[data-remove-sponsor]"
                );


            if (sponsorButton) {

                const item =
                    sponsorButton.closest(
                        ".admin-item"
                    );


                if (item) {

                    item.remove();


                    updateVisualOrder(
                        document.getElementById(
                            "sponsorList"
                        )
                    );

                }

            }

        }
    );

}


/* =====================================================
   CAMBIO TIPO CARRUSEL
===================================================== */

function bindCarouselTypeChange() {

    document.addEventListener(
        "change",
        event => {

            const select =
                event.target.closest(
                    "[data-carousel-type]"
                );


            if (!select) return;


            const item =
                select.closest(
                    ".admin-item"
                );


            if (!item) return;


            const type =
                select.value;


            const eventFields =
                item.querySelectorAll(
                    ".carousel-event-field"
                );


            const bannerFields =
                item.querySelectorAll(
                    ".carousel-banner-field"
                );


            eventFields.forEach(
                field => {

                    field.style.display =
                        type ===
                        "evento"
                            ? ""
                            : "none";

                }
            );


            bannerFields.forEach(
                field => {

                    field.style.display =
                        type ===
                        "banner"
                            ? ""
                            : "none";

                }
            );


            if (
                type ===
                "banner"
            ) {

                const imageInput =
                    item.querySelector(
                        '[data-field="bannerImage"]'
                    );


                if (imageInput) {

                    updateBannerPreview(
                        imageInput
                    );

                }

            }

        }
    );

}


/* =====================================================
   AGREGAR CARRUSEL
===================================================== */

function addCarousel(
    type = "evento"
) {

    if (
        !Array.isArray(
            config.carrusel
        )
    ) {

        config.carrusel =
            [];

    }


    config.carrusel.push({

        id:
            uid(
                "carousel"
            ),

        tipo:
            type,

        eventoId:
            "",

        titulo:
            "Publica tu evento en OTIUM",

        subtitulo:
            "Llega a más personas y destaca tu evento.",

        imagen:
            "",

        enlace:
            "publicita.html",

        activo:
            true,

        inicio:
            "",

        fin:
            "",

        duracion:
            6500,

        orden:
            config.carrusel.length

    });


    renderCarousel();

}


/* =====================================================
   AGREGAR DESTACADO
===================================================== */

function addFeatured() {

    if (
        !Array.isArray(
            config.destacados
        )
    ) {

        config.destacados =
            [];

    }


    config.destacados.push({

        id:
            uid(
                "featured"
            ),

        eventoId:
            "",

        activo:
            true,

        inicio:
            "",

        fin:
            "",

        orden:
            config.destacados.length

    });


    renderFeatured();

}


/* =====================================================
   AGREGAR SPONSOR
===================================================== */

function addSponsor() {

    if (
        !Array.isArray(
            config.sponsors
        )
    ) {

        config.sponsors =
            [];

    }


    config.sponsors.push({

        id:
            uid(
                "sponsor"
            ),

        patrocinadorId:
            "",

        activo:
            true,

        inicio:
            "",

        fin:
            "",

        duracion:
            5000,

        orden:
            config.sponsors.length

    });


    renderSponsors();

}


/* =====================================================
   BOTÓN AGREGAR BANNER
===================================================== */

function ensureBannerButton() {

    const button =
        document.getElementById(
            "addCarouselEvent"
        );


    if (!button) return;


    if (
        document.getElementById(
            "addCarouselBanner"
        )
    ) {

        return;

    }


    const bannerButton =
        document.createElement(
            "button"
        );


    bannerButton.type =
        "button";


    bannerButton.id =
        "addCarouselBanner";


    bannerButton.className =
        "admin-add";


    bannerButton.textContent =
        "+ Agregar banner";


    bannerButton.addEventListener(
        "click",
        () => {

            addCarousel(
                "banner"
            );

        }
    );


    button.insertAdjacentElement(
        "afterend",
        bannerButton
    );

}


/* =====================================================
   CARGAR CONFIGURACIÓN
===================================================== */

async function loadConfiguration() {

    const status =
        document.getElementById(
            "adminStatus"
        );


    if (status) {

        status.textContent =
            "Cargando configuración...";

    }


    /* ---------------------------------------------
       CARGAR EVENTOS
    --------------------------------------------- */

    events =
        await getEvents();


    if (
        !Array.isArray(
            events
        )
    ) {

        events =
            [];

    }


    /* ---------------------------------------------
       CARGAR PATROCINADORES
    --------------------------------------------- */

    const sponsorSnapshot =
        await getDocs(
            collection(
                db,
                "patrocinadores"
            )
        );


    sponsors =
        sponsorSnapshot.docs.map(
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
       CARGAR CONFIGURACIÓN HOME
    --------------------------------------------- */

    const homeRef =
        doc(
            db,
            "configuracion",
            "home"
        );


    const homeSnapshot =
        await getDoc(
            homeRef
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


        const hasSponsorsField =
            Object.prototype.hasOwnProperty.call(
                data,
                "sponsors"
            );


        if (
            !hasSponsorsField &&
            sponsors.length
        ) {

            config.sponsors =
                sponsors.map(
                    (
                        sponsor,
                        index
                    ) => ({

                        id:
                            uid(
                                "sponsor"
                            ),

                        patrocinadorId:
                            getSponsorId(
                                sponsor
                            ),

                        activo:
                            true,

                        inicio:
                            "",

                        fin:
                            "",

                        duracion:
                            5000,

                        orden:
                            index

                    })
                );

        }

    }

    else {

        config = {

            carrusel:
                [],

            destacados:
                [],

            sponsors:
                sponsors.map(
                    (
                        sponsor,
                        index
                    ) => ({

                        id:
                            uid(
                                "sponsor"
                            ),

                        patrocinadorId:
                            getSponsorId(
                                sponsor
                            ),

                        activo:
                            true,

                        inicio:
                            "",

                        fin:
                            "",

                        duracion:
                            5000,

                        orden:
                            index

                    })
                )

        };

    }


    /* ---------------------------------------------
       RENDER
    --------------------------------------------- */

    renderCarousel();

    renderFeatured();

    renderSponsors();

    ensureBannerButton();

    renderCleanupEvents();


    /* ---------------------------------------------
       ESTADO
    --------------------------------------------- */

    if (status) {

        status.textContent =
            `Listo · ${events.length} eventos · ${sponsors.length} sponsors disponibles`;

    }

}


/* =====================================================
   VALIDAR BANNERS ANTES DE GUARDAR
===================================================== */

function validateCarouselBanners(
    carousel
) {

    const bannerRows =
        document.querySelectorAll(
            "#carouselList .admin-item"
        );


    for (
        let index = 0;
        index < bannerRows.length;
        index++
    ) {

        const row =
            bannerRows[index];


        const type =
            row.querySelector(
                '[data-field="tipo"]'
            )?.value;


        if (
            type !==
            "banner"
        ) {

            continue;

        }


        const imageInput =
            row.querySelector(
                '[data-field="bannerImage"]'
            );


        const imageUrl =
            imageInput?.value.trim() ||
            "";


        if (!imageUrl) {

            return {

                valid:
                    false,

                message:
                    `El banner ${index + 1} necesita una URL de imagen.`,

                input:
                    imageInput

            };

        }


        if (
            !isValidImageUrl(
                imageUrl
            )
        ) {

            return {

                valid:
                    false,

                message:
                    `La URL del banner ${index + 1} no es válida. Debe comenzar con http:// o https://`,

                input:
                    imageInput

            };

        }

    }


    return {

        valid:
            true

    };

}


/* =====================================================
   GUARDAR CONFIGURACIÓN
===================================================== */

async function saveConfiguration() {

    const status =
        document.getElementById(
            "adminStatus"
        );


    const button =
        document.getElementById(
            "saveConfig"
        );


    const user =
        auth.currentUser;


    if (!user) {

        if (status) {

            status.textContent =
                "Debes iniciar sesión como administrador.";

        }

        return;

    }


    const adminRef =
        doc(
            db,
            "administradores",
            user.uid
        );


    const adminSnapshot =
        await getDoc(
            adminRef
        );


    if (
        !adminSnapshot.exists()
    ) {

        if (status) {

            status.textContent =
                "No tienes permisos de administrador.";

        }

        return;

    }


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Guardando...";

        }


        if (status) {

            status.textContent =
                "Guardando cambios...";

        }


        const carousel =
            readCarousel()
                .filter(
                    item => {

                        if (
                            item.tipo ===
                            "banner"
                        ) {

                            return true;

                        }


                        return Boolean(
                            item.eventoId
                        );

                    }
                )
                .map(
                    (
                        item,
                        index
                    ) => ({

                        ...item,

                        orden:
                            index

                    })
                );


        const bannerValidation =
            validateCarouselBanners(
                carousel
            );


        if (
            !bannerValidation.valid
        ) {

            if (status) {

                status.textContent =
                    bannerValidation.message;

            }


            if (
                bannerValidation.input
            ) {

                bannerValidation.input.focus();

                bannerValidation.input.scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "center"
                });

                bannerValidation.input.style.borderColor =
                    "#dc3545";

            }


            return;

        }


        const featured =
            readFeatured()
                .filter(
                    item =>
                        Boolean(
                            item.eventoId
                        )
                )
                .slice(
                    0,
                    6
                )
                .map(
                    (
                        item,
                        index
                    ) => ({

                        ...item,

                        orden:
                            index

                    })
                );


        const sponsorConfig =
            readSponsors()
                .filter(
                    item =>
                        Boolean(
                            item.patrocinadorId
                        )
                )
                .map(
                    (
                        item,
                        index
                    ) => ({

                        ...item,

                        orden:
                            index

                    })
                );


        const homeRef =
            doc(
                db,
                "configuracion",
                "home"
            );


        await setDoc(

            homeRef,

            {

                carrusel:
                    carousel,

                destacados:
                    featured,

                sponsors:
                    sponsorConfig,

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    user.uid

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


        if (status) {

            status.textContent =
                `Cambios guardados · ${carousel.length} carrusel · ${featured.length} destacados · ${sponsorConfig.length} sponsors`;

        }


        renderCarousel();

        renderFeatured();

        renderSponsors();

        ensureBannerButton();

    }

    catch (error) {

        console.error(
            "Error guardando configuración del Home:",
            error
        );


        if (status) {

            status.textContent =
                "Error al guardar la configuración.";

        }

    }

    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Guardar cambios";

        }

    }

}


/* =====================================================
   LIMPIEZA DE EVENTOS
===================================================== */

function renderCleanupEvents() {

    const list =
        document.getElementById(
            "eventCleanupList"
        );


    if (!list) return;


    calculateDuplicates();


    updateCleanupStats();


    const filtered =
        getFilteredCleanupEvents();


    /*
       Mantener selección solamente de eventos
       que todavía existen.
    */

    const validIds =
        new Set(
            events.map(
                event =>
                    getEventId(event)
            )
        );


    cleanupSelected =
        new Set(
            [...cleanupSelected]
                .filter(
                    id =>
                        validIds.has(id)
                )
        );


    if (!filtered.length) {

        list.innerHTML = `
            <div class="admin-empty">
                No hay eventos en esta categoría.
            </div>
        `;

        updateCleanupSelectionUI();

        return;

    }


    list.innerHTML =
        filtered
            .map(
                event => {

                    const id =
                        getEventId(
                            event
                        );


                    const status =
                        getEventStatus(
                            event
                        );


                    const isDuplicate =
                        cleanupDuplicateIds.has(
                            id
                        );


                    const checked =
                        cleanupSelected.has(
                            id
                        );


                    let badgeText =
                        "Sin fecha";

                    let badgeClass =
                        "cleanup-no-date";


                    if (
                        status ===
                        "actuales"
                    ) {

                        const date =
                            parseEventDate(
                                event
                            );

                        const now =
                            new Date();

                        const today =
                            new Date(
                                now.getFullYear(),
                                now.getMonth(),
                                now.getDate()
                            );

                        const eventDay =
                            new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate()
                            );


                        if (
                            eventDay.getTime() ===
                            today.getTime()
                        ) {

                            badgeText =
                                "Hoy";

                            badgeClass =
                                "cleanup-today";

                        }

                        else {

                            badgeText =
                                "Actual / futuro";

                            badgeClass =
                                "cleanup-future";

                        }

                    }

                    else if (
                        status ===
                        "pasados"
                    ) {

                        badgeText =
                            "Pasado";

                        badgeClass =
                            "cleanup-past";

                    }

                    else if (
                        status ===
                        "antiguos"
                    ) {

                        badgeText =
                            "Antiguo +90 días";

                        badgeClass =
                            "cleanup-old";

                    }


                    const image =
                        getEventImage(
                            event
                        );


                    const title =
                        getEventTitle(
                            event
                        );


                    const city =
                        getEventCity(
                            event
                        );


                    const category =
                        event.categoria ??
                        event.category ??
                        "";


                    return `
                        <article
                            class="cleanup-event-item ${
                                checked
                                    ? "selected"
                                    : ""
                            }"
                            data-cleanup-event-id="${esc(
                                id
                            )}"
                        >

                            <div class="cleanup-check">

                                <input
                                    type="checkbox"
                                    data-cleanup-select
                                    value="${esc(id)}"
                                    ${
                                        checked
                                            ? "checked"
                                            : ""
                                    }
                                >

                            </div>


                            <div class="cleanup-event-image">

                                ${
                                    image
                                        ? `
                                            <img
                                                src="${esc(
                                                    image
                                                )}"
                                                alt="${esc(
                                                    title
                                                )}"
                                                loading="lazy"
                                                onerror="this.style.display='none'"
                                            >
                                          `
                                        : `
                                            <span
                                                style="
                                                    display:flex;
                                                    align-items:center;
                                                    justify-content:center;
                                                    height:100%;
                                                    font-size:.75rem;
                                                    color:#888;
                                                "
                                            >
                                                Sin imagen
                                            </span>
                                          `
                                }

                            </div>


                            <div class="cleanup-event-info">

                                <div class="cleanup-event-title-row">

                                    <strong>
                                        ${esc(
                                            title
                                        )}
                                    </strong>


                                    <span
                                        class="cleanup-badge ${badgeClass}"
                                    >
                                        ${badgeText}
                                    </span>


                                    ${
                                        isDuplicate
                                            ? `
                                                <span
                                                    class="cleanup-badge cleanup-duplicate"
                                                >
                                                    Posible duplicado
                                                </span>
                                              `
                                            : ""
                                    }

                                </div>


                                <div class="cleanup-event-meta">

                                    <span>
                                        📅
                                        ${esc(
                                            formatEventDate(
                                                event
                                            )
                                        )}
                                    </span>


                                    ${
                                        city
                                            ? `
                                                <span>
                                                    📍
                                                    ${esc(
                                                        city
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }


                                    ${
                                        category
                                            ? `
                                                <span>
                                                    🏷️
                                                    ${esc(
                                                        category
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }

                                </div>


                                <small>
                                    ID:
                                    ${esc(id)}
                                </small>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");


    updateCleanupSelectionUI();

}


/* =====================================================
   ESTADÍSTICAS DE LIMPIEZA
===================================================== */

function updateCleanupStats() {

    calculateDuplicates();


    const total =
        events.length;


    const current =
        events.filter(
            event =>
                getEventStatus(event) ===
                "actuales"
        ).length;


    const past =
        events.filter(
            event =>
                getEventStatus(event) ===
                "pasados"
        ).length;


    const old =
        events.filter(
            event =>
                getEventStatus(event) ===
                "antiguos"
        ).length;


    const duplicates =
        cleanupDuplicateIds.size;


    const totalElement =
        document.getElementById(
            "cleanupTotal"
        );


    const currentElement =
        document.getElementById(
            "cleanupCurrent"
        );


    const pastElement =
        document.getElementById(
            "cleanupPast"
        );


    const oldElement =
        document.getElementById(
            "cleanupOld"
        );


    const duplicateElement =
        document.getElementById(
            "cleanupDuplicates"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (currentElement) {

        currentElement.textContent =
            current;

    }


    if (pastElement) {

        pastElement.textContent =
            past;

    }


    if (oldElement) {

        oldElement.textContent =
            old;

    }


    if (duplicateElement) {

        duplicateElement.textContent =
            duplicates;

    }


    const filterLabel =
        document.getElementById(
            "cleanupFilterLabel"
        );


    if (filterLabel) {

        const filtered =
            getFilteredCleanupEvents();


        filterLabel.textContent =
            `${filtered.length} evento(s) mostrados`;

    }

}


/* =====================================================
   ACTUALIZAR UI DE SELECCIÓN
===================================================== */

function updateCleanupSelectionUI() {

    const count =
        document.getElementById(
            "cleanupSelectedCount"
        );


    const deleteButton =
        document.getElementById(
            "deleteSelectedEvents"
        );


    const selectAll =
        document.getElementById(
            "selectAllCleanup"
        );


    const visible =
        getFilteredCleanupEvents();


    const visibleIds =
        visible
            .map(
                event =>
                    getEventId(event)
            )
            .filter(Boolean);


    const selectedVisible =
        visibleIds.filter(
            id =>
                cleanupSelected.has(id)
        );


    if (count) {

        count.textContent =
            cleanupSelected.size;

    }


    if (deleteButton) {

        deleteButton.disabled =
            cleanupSelected.size === 0;

    }


    if (selectAll) {

        if (!visibleIds.length) {

            selectAll.checked =
                false;

            selectAll.indeterminate =
                false;

        }

        else {

            const allSelected =
                selectedVisible.length ===
                visibleIds.length;


            const someSelected =
                selectedVisible.length >
                0 &&
                !allSelected;


            selectAll.checked =
                allSelected;

            selectAll.indeterminate =
                someSelected;

        }

    }


    document
        .querySelectorAll(
            "[data-cleanup-event-id]"
        )
        .forEach(
            row => {

                const id =
                    row.dataset.cleanupEventId;


                row.classList.toggle(
                    "selected",
                    cleanupSelected.has(id)
                );

            }
        );

}


/* =====================================================
   SELECCIONAR EVENTOS
===================================================== */

function bindCleanupSelection() {

    document.addEventListener(
        "change",
        event => {

            const checkbox =
                event.target.closest(
                    "[data-cleanup-select]"
                );


            if (checkbox) {

                const id =
                    checkbox.value;


                if (
                    checkbox.checked
                ) {

                    cleanupSelected.add(
                        id
                    );

                }

                else {

                    cleanupSelected.delete(
                        id
                    );

                }


                updateCleanupSelectionUI();

                return;

            }


            const selectAll =
                event.target.closest(
                    "#selectAllCleanup"
                );


            if (selectAll) {

                const visible =
                    getFilteredCleanupEvents();


                for (
                    const eventItem
                    of visible
                ) {

                    const id =
                        getEventId(
                            eventItem
                        );


                    if (!id) continue;


                    if (
                        selectAll.checked
                    ) {

                        cleanupSelected.add(
                            id
                        );

                    }

                    else {

                        cleanupSelected.delete(
                            id
                        );

                    }

                }


                renderCleanupEvents();

            }

        }
    );

}


/* =====================================================
   FILTROS
===================================================== */

function bindCleanupFilters() {

    document.addEventListener(
        "click",
        event => {

            const filterButton =
                event.target.closest(
                    "[data-cleanup-filter]"
                );


            if (!filterButton) return;


            cleanupFilter =
                filterButton.dataset.cleanupFilter ||
                "todos";


            document
                .querySelectorAll(
                    "[data-cleanup-filter]"
                )
                .forEach(
                    button => {

                        button.classList.toggle(
                            "active",
                            button ===
                            filterButton
                        );

                    }
                );


            renderCleanupEvents();

        }
    );

}


/* =====================================================
   ACTUALIZAR EVENTOS
===================================================== */

async function refreshCleanup() {

    const button =
        document.getElementById(
            "refreshCleanup"
        );


    const status =
        document.getElementById(
            "adminStatus"
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Actualizando...";

        }


        if (status) {

            status.textContent =
                "Actualizando eventos...";

        }


        events =
            await getEvents();


        if (
            !Array.isArray(
                events
            )
        ) {

            events =
                [];

        }


        renderCleanupEvents();


        if (status) {

            status.textContent =
                `Eventos actualizados · ${events.length} evento(s)`;

        }

    }

    catch (error) {

        console.error(
            "Error actualizando eventos:",
            error
        );


        if (status) {

            status.textContent =
                "Error al actualizar los eventos.";

        }

    }

    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "↻ Actualizar";

        }

    }

}


/* =====================================================
   COMPROBAR REFERENCIAS EN HOME
===================================================== */

function eventIsReferencedInCarousel(
    eventId
) {

    return Array.isArray(
        config.carrusel
    ) &&
    config.carrusel.some(
        item =>
            item.tipo !== "banner" &&
            String(
                item.eventoId ??
                ""
            ) ===
            String(eventId)
    );

}


function eventIsReferencedInFeatured(
    eventId
) {

    return Array.isArray(
        config.destacados
    ) &&
    config.destacados.some(
        item =>
            String(
                item.eventoId ??
                ""
            ) ===
            String(eventId)
    );

}


/* =====================================================
   LIMPIAR REFERENCIAS DEL HOME
===================================================== */

function removeEventReferencesFromHome(
    deletedIds
) {

    const ids =
        new Set(
            deletedIds.map(
                id =>
                    String(id)
            )
        );


    config.carrusel =
        (
            Array.isArray(
                config.carrusel
            )
                ? config.carrusel
                : []
        )
            .filter(
                item => {

                    if (
                        item.tipo ===
                        "banner"
                    ) {

                        return true;

                    }


                    return !ids.has(
                        String(
                            item.eventoId ??
                            ""
                        )
                    );

                }
            )
            .map(
                (
                    item,
                    index
                ) => ({

                    ...item,

                    orden:
                        index

                })
            );


    config.destacados =
        (
            Array.isArray(
                config.destacados
            )
                ? config.destacados
                : []
        )
            .filter(
                item =>
                    !ids.has(
                        String(
                            item.eventoId ??
                            ""
                        )
                    )
            )
            .map(
                (
                    item,
                    index
                ) => ({

                    ...item,

                    orden:
                        index

                })
            );

}


/* =====================================================
   ELIMINACIÓN MÚLTIPLE
===================================================== */

async function deleteSelectedEvents() {

    const status =
        document.getElementById(
            "adminStatus"
        );


    const button =
        document.getElementById(
            "deleteSelectedEvents"
        );


    const user =
        auth.currentUser;


    if (!user) {

        if (status) {

            status.textContent =
                "Debes iniciar sesión como administrador.";

        }

        return;

    }


    const adminRef =
        doc(
            db,
            "administradores",
            user.uid
        );


    const adminSnapshot =
        await getDoc(
            adminRef
        );


    if (
        !adminSnapshot.exists()
    ) {

        if (status) {

            status.textContent =
                "No tienes permisos de administrador.";

        }

        return;

    }


    const ids =
        [...cleanupSelected]
            .filter(Boolean);


    if (!ids.length) {

        return;

    }


    const selectedEvents =
        events.filter(
            event =>
                ids.includes(
                    getEventId(event)
                )
        );


    const oldCount =
        selectedEvents.filter(
            event =>
                getEventStatus(event) ===
                "antiguos"
        ).length;


    const duplicateCount =
        selectedEvents.filter(
            event =>
                cleanupDuplicateIds.has(
                    getEventId(event)
                )
        ).length;


    const referencedCount =
        selectedEvents.filter(
            event =>
                eventIsReferencedInCarousel(
                    getEventId(event)
                ) ||
                eventIsReferencedInFeatured(
                    getEventId(event)
                )
        ).length;


    let message =
        `Vas a eliminar ${selectedEvents.length} evento(s) de Firestore.`;


    if (oldCount) {

        message +=
            `\n\n${oldCount} pertenece(n) a eventos antiguos (+90 días).`;

    }


    if (duplicateCount) {

        message +=
            `\n${duplicateCount} está(n) marcado(s) como posible duplicado.`;

    }


    if (referencedCount) {

        message +=
            `\n${referencedCount} aparece(n) actualmente en Carrusel o Destacados y su referencia será retirada del Home.`;

    }


    message +=
        "\n\nEsta acción no se puede deshacer.\n\n¿Deseas continuar?";


    const confirmed =
        window.confirm(
            message
        );


    if (!confirmed) {

        return;

    }


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Eliminando...";

        }


        if (status) {

            status.textContent =
                `Eliminando ${ids.length} evento(s)...`;

        }


        let deleted =
            0;


        const failed =
            [];


        for (
            const id
            of ids
        ) {

            try {

                /*
                   Se utiliza la función existente
                   de database.js.
                */

                await deleteEvent(
                    id
                );


                deleted++;

            }

            catch (error) {

                console.error(
                    `Error eliminando evento ${id}:`,
                    error
                );


                failed.push(
                    id
                );

            }

        }


        /*
           Solo retiramos del Home los eventos
           que efectivamente fueron eliminados.
        */

        const deletedIds =
            ids.filter(
                id =>
                    !failed.includes(id)
            );


        if (
            deletedIds.length
        ) {

            removeEventReferencesFromHome(
                deletedIds
            );


            const homeRef =
                doc(
                    db,
                    "configuracion",
                    "home"
                );


            await setDoc(

                homeRef,

                {

                    carrusel:
                        config.carrusel,

                    destacados:
                        config.destacados,

                    updatedAt:
                        serverTimestamp(),

                    updatedBy:
                        user.uid

                },

                {
                    merge:
                        true
                }

            );

        }


        /*
           Actualizar memoria local.
        */

        const deletedSet =
            new Set(
                deletedIds
            );


        events =
            events.filter(
                event =>
                    !deletedSet.has(
                        getEventId(event)
                    )
            );


        cleanupSelected =
            new Set(
                [...cleanupSelected]
                    .filter(
                        id =>
                            !deletedSet.has(id)
                    )
            );


        renderCarousel();

        renderFeatured();

        ensureBannerButton();

        renderCleanupEvents();


        if (status) {

            if (
                failed.length
            ) {

                status.textContent =
                    `Eliminados ${deleted} evento(s). ${failed.length} no pudieron eliminarse.`;

            }

            else {

                status.textContent =
                    `Eliminados ${deleted} evento(s) correctamente.`;

            }

        }

    }

    catch (error) {

        console.error(
            "Error durante la eliminación de eventos:",
            error
        );


        if (status) {

            status.textContent =
                "Ocurrió un error durante la eliminación.";

        }

    }

    finally {

        if (button) {

            button.disabled =
                cleanupSelected.size === 0;

            button.textContent =
                "Eliminar seleccionados";

        }

    }

}


/* =====================================================
   TABS
===================================================== */

function bindTabs() {

    const tabs =
        document.querySelectorAll(
            ".admin-tab"
        );


    const panels =
        document.querySelectorAll(
            ".admin-panel"
        );


    tabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    const target =
                        tab.dataset.tab;


                    tabs.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    panels.forEach(
                        panel =>
                            panel.classList.remove(
                                "active"
                            )
                    );


                    tab.classList.add(
                        "active"
                    );


                    const panel =
                        document.getElementById(
                            `tab-${target}`
                        );


                    if (panel) {

                        panel.classList.add(
                            "active"
                        );

                    }


                    /*
                       Al abrir Eventos,
                       recalcular estadísticas.
                    */

                    if (
                        target ===
                        "eventos"
                    ) {

                        renderCleanupEvents();

                    }

                }
            );

        }
    );

}


/* =====================================================
   BOTONES PRINCIPALES
===================================================== */

function bindButtons() {

    const saveButton =
        document.getElementById(
            "saveConfig"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveConfiguration
        );

    }


    const addCarouselButton =
        document.getElementById(
            "addCarouselEvent"
        );


    if (addCarouselButton) {

        addCarouselButton.addEventListener(
            "click",
            () =>
                addCarousel(
                    "evento"
                )
        );

    }


    const addFeaturedButton =
        document.getElementById(
            "addFeatured"
        );


    if (addFeaturedButton) {

        addFeaturedButton.addEventListener(
            "click",
            addFeatured
        );

    }


    const addSponsorButton =
        document.getElementById(
            "addSponsor"
        );


    if (addSponsorButton) {

        addSponsorButton.addEventListener(
            "click",
            addSponsor
        );

    }


    const refreshButton =
        document.getElementById(
            "refreshCleanup"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            refreshCleanup
        );

    }


    const deleteButton =
        document.getElementById(
            "deleteSelectedEvents"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            deleteSelectedEvents
        );

    }

}

/* =====================================================
   LECTOR DE EXCEL - PASO 6B
   SOLO LECTURA / PREVISUALIZACIÓN

   IMPORTANTE:
   - No escribe en Firestore.
   - No modifica la colección eventos.
   - No modifica configuracion/home.
   - Solo lee el archivo seleccionado.
===================================================== */

let excelRows = [];

let excelHeaders = [];

let excelFileName = "";


/* =====================================================
   NORMALIZAR ENCABEZADO EXCEL
===================================================== */

function normalizeExcelHeader(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .trim()

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .replace(
            /\s+/g,
            " "
        );

}


/* =====================================================
   NORMALIZAR VALOR EXCEL
===================================================== */

function normalizeExcelValue(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    /*
       Fechas reconocidas por SheetJS.
    */

    if (
        value instanceof Date
    ) {

        if (
            isNaN(
                value.getTime()
            )
        ) {

            return "";

        }

        return value;

    }


    /*
       Algunos valores pueden
       venir como objetos.
    */

    if (
        typeof value ===
        "object"
    ) {

        try {

            return JSON.stringify(
                value
            );

        }

        catch {

            return String(
                value
            );

        }

    }


    return String(
        value
    ).trim();

}


/* =====================================================
   LEER ARCHIVO EXCEL
===================================================== */

async function readExcelFile(
    file
) {

    if (!file) {

        throw new Error(
            "No se seleccionó ningún archivo."
        );

    }


    const fileName =
        String(
            file.name ||
            ""
        ).trim();


    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension !== "xlsx" &&
        extension !== "xls"
    ) {

        throw new Error(
            "El archivo debe ser Excel .xlsx o .xls."
        );

    }


    const arrayBuffer =
        await file.arrayBuffer();


    const workbook =
        XLSX.read(
            arrayBuffer,
            {
                type: "array",
                cellDates: true
            }
        );


    if (
        !workbook.SheetNames ||
        !workbook.SheetNames.length
    ) {

        throw new Error(
            "El archivo Excel no contiene hojas."
        );

    }


    /*
       Por ahora utilizamos
       solamente la primera hoja.
    */

    const sheetName =
        workbook.SheetNames[0];


    const worksheet =
        workbook.Sheets[
            sheetName
        ];


    if (!worksheet) {

        throw new Error(
            "No fue posible leer la primera hoja del Excel."
        );

    }


    /*
       Convertimos la hoja en
       una matriz.

       header: 1
       permite conservar
       exactamente la estructura
       de filas y columnas.
    */

    const matrix =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: "",
                raw: true
            }
        );


    if (
        !Array.isArray(
            matrix
        ) ||
        !matrix.length
    ) {

        throw new Error(
            "La hoja Excel está vacía."
        );

    }


    /*
       Primera fila =
       encabezados.
    */

    const rawHeaders =
        matrix[0] || [];


    const headers =
        rawHeaders.map(
            value =>
                String(
                    value ??
                    ""
                ).trim()
        );


    /*
       Eliminar columnas
       completamente vacías
       del encabezado.
    */

    const validColumnIndexes =
        headers
            .map(
                (
                    header,
                    index
                ) => ({
                    header,
                    index
                })
            )
            .filter(
                item =>
                    item.header !== ""
            );


    if (
        !validColumnIndexes.length
    ) {

        throw new Error(
            "No se encontraron encabezados en la primera fila del Excel."
        );

    }


    const cleanHeaders =
        validColumnIndexes.map(
            item =>
                item.header
        );


    /*
       Convertir filas en objetos.
    */

    const rows = [];


    for (
        let rowIndex = 1;
        rowIndex < matrix.length;
        rowIndex++
    ) {

        const row =
            matrix[rowIndex] || [];


        /*
           Ignorar filas completamente
           vacías.
        */

        const hasData =
            validColumnIndexes.some(
                item => {

                    const value =
                        row[
                            item.index
                        ];

                    return (
                        value !==
                            null &&
                        value !==
                            undefined &&
                        String(
                            value
                        ).trim() !==
                            ""
                    );

                }
            );


        if (!hasData) {

            continue;

        }


        const object = {};


        validColumnIndexes.forEach(
            item => {

                object[
                    item.header
                ] =
                    normalizeExcelValue(
                        row[
                            item.index
                        ]
                    );

            }
        );


        rows.push(
            object
        );

    }


    /*
       Guardar en memoria.
    */

    excelHeaders =
        cleanHeaders;

    excelRows =
        rows;

    excelFileName =
        fileName;


    return {

        fileName,

        sheetName,

        headers:
            excelHeaders,

        rows:
            excelRows,

        totalRows:
            excelRows.length,

        totalColumns:
            excelHeaders.length

    };

}


/* =====================================================
   FORMATEAR VALOR PARA PREVIEW
===================================================== */

function formatExcelPreviewValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    if (
        value instanceof Date
    ) {

        if (
            isNaN(
                value.getTime()
            )
        ) {

            return "";

        }

        return new Intl.DateTimeFormat(
            "es-CL",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(
            value
        );

    }


    return String(
        value
    );

}


/* =====================================================
   RENDER PREVISUALIZACIÓN EXCEL
===================================================== */

function renderExcelPreview(
    result
) {

    const preview =
        document.getElementById(
            "excelPreview"
        );


    const status =
        document.getElementById(
            "excelStatus"
        );


    if (status) {

        status.textContent =
            `Archivo: ${result.fileName} · ` +
            `Hoja: ${result.sheetName} · ` +
            `${result.totalRows} filas · ` +
            `${result.totalColumns} columnas`;

    }


    if (!preview) {

        return;

    }


    const previewRows =
        result.rows.slice(
            0,
            20
        );


    let html = `

        <div class="excel-preview-summary">

            <strong>
                ${esc(
                    result.fileName
                )}
            </strong>

            <span>
                Hoja:
                ${esc(
                    result.sheetName
                )}
            </span>

            <span>
                ${result.totalRows}
                registros
            </span>

            <span>
                ${result.totalColumns}
                columnas
            </span>

        </div>

    `;


    if (
        !previewRows.length
    ) {

        html += `

            <div class="admin-empty">

                No hay registros
                para mostrar.

            </div>

        `;

        preview.innerHTML =
            html;

        return;

    }


    html += `

        <div class="excel-preview-table-wrap">

            <table
                class="excel-preview-table"
            >

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        ${
                            result.headers
                                .map(
                                    header => `
                                        <th>
                                            ${esc(
                                                header
                                            )}
                                        </th>
                                    `
                                )
                                .join("")
                        }

                    </tr>

                </thead>

                <tbody>

    `;


    previewRows.forEach(
        (
            row,
            index
        ) => {

            html += `

                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    ${
                        result.headers
                            .map(
                                header => {

                                    const value =
                                        row[
                                            header
                                        ];

                                    return `

                                        <td>

                                            ${esc(
                                                formatExcelPreviewValue(
                                                    value
                                                )
                                            )}

                                        </td>

                                    `;

                                }
                            )
                            .join("")
                    }

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    if (
        result.totalRows >
        20
    ) {

        html += `

            <div class="excel-preview-note">

                Mostrando los primeros
                20 registros de
                ${result.totalRows}.

            </div>

        `;

    }


    preview.innerHTML =
        html;

}


/* =====================================================
   CAMBIO DE ARCHIVO EXCEL
===================================================== */

async function handleExcelFileChange(
    event
) {

    const file =
        event.target?.files?.[0];


    const preview =
        document.getElementById(
            "excelPreview"
        );


    const status =
        document.getElementById(
            "excelStatus"
        );


    if (!file) {

        excelRows =
            [];

        excelHeaders =
            [];

        excelFileName =
            "";


        if (status) {

            status.textContent =
                "No hay archivo seleccionado.";

        }


        if (preview) {

            preview.innerHTML =
                "";

        }

        return;

    }


    if (status) {

        status.textContent =
            "Leyendo archivo Excel...";

    }


    if (preview) {

        preview.innerHTML =
            "";

    }


    try {

        const result =
            await readExcelFile(
                file
            );


        renderExcelPreview(
            result
        );


        if (status) {

            status.textContent =
                `Excel leído correctamente: ` +
                `${result.totalRows} registros encontrados.`;

        }

    }

    catch (error) {

        console.error(
            "Error leyendo Excel:",
            error
        );


        excelRows =
            [];

        excelHeaders =
            [];

        excelFileName =
            "";


        if (status) {

            status.textContent =
                error?.message ||
                "No fue posible leer el archivo Excel.";

        }


        if (preview) {

            preview.innerHTML = `

                <div class="admin-empty">

                    <strong>
                        Error al leer Excel
                    </strong>

                    <br><br>

                    ${esc(
                        error?.message ||
                        "No fue posible leer el archivo."
                    )}

                </div>

            `;

        }

    }

}


/* =====================================================
   VINCULAR LECTOR EXCEL
===================================================== */

function bindExcelReader() {

    const input =
        document.getElementById(
            "excelFile"
        );


    if (!input) {

        return;

    }


    /*
       Evitar registrar el mismo
       listener más de una vez.
    */

    if (
        input.dataset
            .excelReaderBound ===
        "true"
    ) {

        return;

    }


    input.dataset
        .excelReaderBound =
        "true";


    input.addEventListener(
        "change",
        handleExcelFileChange
    );

}


/* =====================================================
   OBTENER DATOS EXCEL
   Preparado para Paso 6C
===================================================== */

function getExcelRows() {

    return [
        ...excelRows
    ];

}


function getExcelHeaders() {

    return [
        ...excelHeaders
    ];

}


function getExcelFileName() {

    return excelFileName;

}


/* =====================================================
   FIN LECTOR EXCEL - PASO 6B
===================================================== */
/* =====================================================
   INICIALIZACIÓN
===================================================== */

bindTabs();

bindButtons();

bindRemoveButtons();

bindCarouselTypeChange();

bindCleanupSelection();

bindCleanupFilters();

bindExcelReader();


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(

    auth,

    async user => {

        const status =
            document.getElementById(
                "adminStatus"
            );


        if (!user) {

            if (status) {

                status.textContent =
                    "Debes iniciar sesión como administrador.";

            }

            return;

        }


        try {

            const adminRef =
                doc(
                    db,
                    "administradores",
                    user.uid
                );


            const adminSnapshot =
                await getDoc(
                    adminRef
                );


            if (
                !adminSnapshot.exists()
            ) {

                if (status) {

                    status.textContent =
                        "Usuario autenticado, pero sin permisos de administrador.";

                }

                return;

            }


            await loadConfiguration();

        }

        catch (error) {

            console.error(
                "Error verificando administrador:",
                error
            );


            if (status) {

                status.textContent =
                    "Error al cargar la administración.";

            }

        }

    }

);

/* =====================================================
   PASO 6C.1
   CONVERSIÓN EXCEL → FORMATO OTIUM
   NO IMPORTA NADA A FIRESTORE
===================================================== */

function convertirFilaExcelAEventoOTIUM(fila) {

    if (!fila) {
        return null;
    }

    const evento = {

        // ---------------------------------------------
        // IDENTIFICACIÓN
        // ---------------------------------------------

        id: limpiarValorExcel(fila.id),

        nombre: limpiarValorExcel(fila.nombre),

        categoria: limpiarValorExcel(fila.categoria),

        subcategoria: limpiarValorExcel(fila.subcategoria),


        // ---------------------------------------------
        // FECHAS Y HORARIOS
        // ---------------------------------------------

        fechaInicio: limpiarValorExcel(
            fila.fechaInicio
        ),

        fechaTermino: limpiarValorExcel(
            fila.fechaTermino
        ),

        horaInicio: limpiarValorExcel(
            fila.horaInicio
        ),

        horaTermino: limpiarValorExcel(
            fila.horaTermino
        ),


        // ---------------------------------------------
        // UBICACIÓN
        // ---------------------------------------------

        region: limpiarValorExcel(
            fila.region
        ),

        comuna: limpiarValorExcel(
            fila.comuna
        ),

        ciudad: limpiarValorExcel(
            fila.ciudad
        ),

        lugar: limpiarValorExcel(
            fila.lugar
        ),

        direccion: limpiarValorExcel(
            fila.direccion
        ),


        // ---------------------------------------------
        // INFORMACIÓN DEL EVENTO
        // ---------------------------------------------

        descripcion: limpiarValorExcel(
            fila.descripcion
        ),

        precio: limpiarValorExcel(
            fila.precio
        ),

        acceso: limpiarValorExcel(
            fila.acceso
        ),


        // ---------------------------------------------
        // ORGANIZADOR
        // ---------------------------------------------

        organizador: limpiarValorExcel(
            fila.organizador
        ),


        // ---------------------------------------------
        // ENLACES
        // ---------------------------------------------

        linkEvento: limpiarValorExcel(
            fila.linkEvento
        ),

        linkEntradas: limpiarValorExcel(
            fila.linkEntradas
        ),

        instagram: limpiarValorExcel(
            fila.instagram
        ),

        facebook: limpiarValorExcel(
            fila.facebook
        ),


        // ---------------------------------------------
        // IMAGEN Y FUENTE
        // ---------------------------------------------

        imagen: limpiarValorExcel(
            fila.imagen
        ),

        fuente: limpiarValorExcel(
            fila.fuente
        ),


        // ---------------------------------------------
        // ESTADO
        // ---------------------------------------------

        estadoVerificacion: limpiarValorExcel(
            fila.estadoVerificacion
        ),


        // ---------------------------------------------
        // CAMPOS COMPATIBLES CON OTIUM
        // ---------------------------------------------

        title: limpiarValorExcel(
            fila.nombre
        ),

        category: limpiarValorExcel(
            fila.categoria
        ),

        date: limpiarValorExcel(
            fila.fechaInicio
        ),

        time: limpiarValorExcel(
            fila.horaInicio
        ),

        city: limpiarValorExcel(
            fila.ciudad
        ),

        address: limpiarValorExcel(
            fila.direccion
        ),

        location: limpiarValorExcel(
            fila.lugar
        ),

        description: limpiarValorExcel(
            fila.descripcion
        ),

        price: limpiarValorExcel(
            fila.precio
        ),

        tickets: limpiarValorExcel(
            fila.linkEntradas
        ),


        // ---------------------------------------------
        // ESTADO DE IMPORTACIÓN
        // ---------------------------------------------

        origenImportacion: "excel",

        fechaImportacion:
            new Date().toISOString()

    };

    return evento;
}


/* =====================================================
   LIMPIAR VALORES DEL EXCEL
===================================================== */

function limpiarValorExcel(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }

    if (
        typeof valor === "string"
    ) {

        return valor.trim();

    }

    return valor;
}


/* =====================================================
   CONVERTIR TODAS LAS FILAS DEL EXCEL
   SIN GUARDAR EN FIRESTORE
===================================================== */

function convertirExcelAEventosOTIUM(filas) {

    if (
        !Array.isArray(filas)
    ) {

        console.warn(
            "No se recibió un arreglo de filas Excel."
        );

        return [];

    }

    const eventos =
        filas
            .map(
                fila =>
                    convertirFilaExcelAEventoOTIUM(
                        fila
                    )
            )
            .filter(
                evento =>
                    evento !== null
            );

    console.log(
        "OTIUM - Filas Excel convertidas:",
        eventos.length
    );

    return eventos;
}


/* =====================================================
   PREVISUALIZACIÓN DE UN EVENTO CONVERTIDO
   SOLO PARA PRUEBAS
===================================================== */

function previsualizarEventoExcelOTIUM(fila) {

    const evento =
        convertirFilaExcelAEventoOTIUM(
            fila
        );

    console.log(
        "OTIUM - Evento convertido:",
        evento
    );

    return evento;
}
window.previsualizarEventoExcelOTIUM =
    previsualizarEventoExcelOTIUM;