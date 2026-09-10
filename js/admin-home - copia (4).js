/* =====================================================
   OTIUM - ADMINISTRACIÓN DEL HOME
   Archivo: js/admin-home.js
   Versión: 20260908

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
import { getEvents } from "./modules/database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


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

        const id = String(getId(item));

        html += `
            <option
                value="${esc(id)}"
                ${id === String(selected ?? "") ? "selected" : ""}
            >
                ${esc(getLabel(item))}
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


function buildDurationOptions(selected = 6500) {

    return durationOptions
        .map(ms => {

            const seconds = ms / 1000;

            return `
                <option
                    value="${ms}"
                    ${Number(selected) === ms ? "selected" : ""}
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

function buildCarouselTypeOptions(type = "evento") {

    return `
        <option
            value="evento"
            ${type === "evento" ? "selected" : ""}
        >
            Evento
        </option>

        <option
            value="banner"
            ${type === "banner" ? "selected" : ""}
        >
            Banner promocional
        </option>
    `;

}


/* =====================================================
   VISTA PREVIA DEL BANNER
===================================================== */

function buildBannerPreview(imageUrl) {

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

function updateBannerPreview(input) {

    if (!input) return;

    const row =
        input.closest(".admin-item");

    if (!row) return;

    const preview =
        row.querySelector("[data-banner-preview]");

    const previewImage =
        row.querySelector(
            "[data-banner-preview-image]"
        );

    const previewStatus =
        row.querySelector(
            "[data-banner-preview-status]"
        );

    if (!preview || !previewImage) return;

    const url =
        input.value.trim();

    if (!url) {

        preview.style.display = "none";

        previewImage.src = "";

        if (previewStatus) {

            previewStatus.textContent = "";

        }

        input.style.borderColor = "";

        return;

    }


    if (!isValidImageUrl(url)) {

        preview.style.display = "none";

        previewImage.src = "";

        input.style.borderColor = "#dc3545";

        if (previewStatus) {

            previewStatus.textContent =
                "La URL debe comenzar con http:// o https://";

        }

        return;

    }


    input.style.borderColor = "";


    preview.style.display = "block";

    previewImage.src = url;


    if (previewStatus) {

        previewStatus.textContent =
            "Cargando vista previa...";

    }


    previewImage.onload = () => {

        if (previewStatus) {

            previewStatus.textContent =
                "Vista previa correcta";

        }

    };


    previewImage.onerror = () => {

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
        !Array.isArray(config.carrusel) ||
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
            .map((item, index) => {

                const type =
                    item.tipo === "banner"
                        ? "banner"
                        : "evento";


                const eventId =
                    item.eventoId ?? "";


                const event =
                    events.find(
                        e =>
                            getEventId(e) ===
                            String(eventId)
                    );


                /*
                 * Compatibilidad con configuraciones
                 * anteriores.
                 */

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
                    uid("carousel");


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


                                <!-- TIPO -->

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


                                <!-- EVENTO -->

                                <div
                                    class="admin-field carousel-event-field"
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


                                <!-- TITULO BANNER -->

                                <div
                                    class="admin-field carousel-banner-field"
                                    ${
                                        type === "evento"
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


                                <!-- SUBTITULO -->

                                <div
                                    class="admin-field carousel-banner-field"
                                    ${
                                        type === "evento"
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


                                <!-- URL IMAGEN -->

                                <div
                                    class="admin-field carousel-banner-field"
                                    ${
                                        type === "evento"
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


                                <!-- ENLACE -->

                                <div
                                    class="admin-field carousel-banner-field"
                                    ${
                                        type === "evento"
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


                                <!-- DURACION -->

                                <div class="admin-field">

                                    <label>
                                        Duración
                                    </label>

                                    <select
                                        data-field="duracion"
                                    >

                                        ${buildDurationOptions(
                                            item.duracion || 6500
                                        )}

                                    </select>

                                </div>


                                <!-- INICIO -->

                                <div class="admin-field">

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


                                <!-- FIN -->

                                <div class="admin-field">

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


                                <!-- ACTIVO -->

                                <div
                                    class="admin-field admin-checkbox-field"
                                >

                                    <label>

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

                                </div>


                            </div>

                        </div>

                    </article>
                `;

            })
            .join("");


    bindDragAndDrop(container);

    bindBannerPreviewEvents(container);

}


/* =====================================================
   EVENTOS DE VISTA PREVIA
===================================================== */

function bindBannerPreviewEvents(container) {

    if (!container) return;


    const inputs =
        container.querySelectorAll(
            '[data-field="bannerImage"]'
        );


    inputs.forEach(input => {

        input.addEventListener(
            "input",
            () => {

                updateBannerPreview(input);

            }
        );


        input.addEventListener(
            "change",
            () => {

                updateBannerPreview(input);

            }
        );


        /*
         * Si ya existe una URL cargada,
         * intentamos mostrar la vista previa.
         */

        if (input.value.trim()) {

            updateBannerPreview(input);

        }

    });

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
        !Array.isArray(config.destacados) ||
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
            .map((item, index) => {

                const itemId =
                    item.id ||
                    uid("featured");


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
                                            item.inicio || ""
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
                                            item.fin || ""
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
                                                item.activo !== false
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

            })
            .join("");


    bindDragAndDrop(container);

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
        !Array.isArray(config.sponsors) ||
        !config.sponsors.length
    ) {

        if (sponsors.length) {

            container.innerHTML = `
                <div class="admin-empty">

                    Hay
                    <strong>${sponsors.length}</strong>
                    patrocinador(es) disponibles en Firestore,
                    pero ninguno está configurado para el Home.

                    <br><br>

                    Usa
                    <strong>+ Agregar sponsor</strong>
                    para incorporarlos.

                </div>
            `;

        } else {

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
            .map((item, index) => {

                const sponsorId =
                    item.patrocinadorId ?? "";


                const sponsor =
                    sponsors.find(
                        s =>
                            getSponsorId(s) ===
                            String(sponsorId)
                    );


                const itemId =
                    item.id ||
                    uid("sponsor");


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
                                            item.duracion || 5000
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
                                            item.inicio || ""
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
                                            item.fin || ""
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
                                                item.activo !== false
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

            })
            .join("");


    bindDragAndDrop(container);

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
        .map((row, index) => {

            const type =
                row.querySelector(
                    '[data-field="tipo"]'
                )?.value ||
                "evento";


            const item = {

                id:
                    row.dataset.id ||
                    uid("carousel"),

                tipo:
                    type,

                activo:
                    row.querySelector(
                        '[data-field="activo"]'
                    )?.checked ?? true,

                inicio:
                    row.querySelector(
                        '[data-field="inicio"]'
                    )?.value || "",

                fin:
                    row.querySelector(
                        '[data-field="fin"]'
                    )?.value || "",

                duracion:
                    Number(
                        row.querySelector(
                            '[data-field="duracion"]'
                        )?.value || 6500
                    ),

                orden:
                    index

            };


            if (type === "banner") {

                item.titulo =
                    row.querySelector(
                        '[data-field="bannerTitle"]'
                    )?.value.trim() || "";


                item.subtitulo =
                    row.querySelector(
                        '[data-field="bannerSubtitle"]'
                    )?.value.trim() || "";


                item.imagen =
                    row.querySelector(
                        '[data-field="bannerImage"]'
                    )?.value.trim() || "";


                item.enlace =
                    row.querySelector(
                        '[data-field="bannerLink"]'
                    )?.value.trim() || "";

            }

            else {

                const eventoId =
                    row.querySelector(
                        '[data-field="eventoId"]'
                    )?.value || "";


                if (eventoId) {

                    item.eventoId =
                        eventoId;

                }

            }


            return item;

        });

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
        .map((row, index) => {

            return {

                id:
                    row.dataset.id ||
                    uid("featured"),

                eventoId:
                    row.querySelector(
                        '[data-field="eventoId"]'
                    )?.value || "",

                activo:
                    row.querySelector(
                        '[data-field="activo"]'
                    )?.checked ?? true,

                inicio:
                    row.querySelector(
                        '[data-field="inicio"]'
                    )?.value || "",

                fin:
                    row.querySelector(
                        '[data-field="fin"]'
                    )?.value || "",

                orden:
                    index

            };

        });

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
        .map((row, index) => {

            return {

                id:
                    row.dataset.id ||
                    uid("sponsor"),

                patrocinadorId:
                    row.querySelector(
                        '[data-field="patrocinadorId"]'
                    )?.value || "",

                activo:
                    row.querySelector(
                        '[data-field="activo"]'
                    )?.checked ?? true,

                inicio:
                    row.querySelector(
                        '[data-field="inicio"]'
                    )?.value || "",

                fin:
                    row.querySelector(
                        '[data-field="fin"]'
                    )?.value || "",

                duracion:
                    Number(
                        row.querySelector(
                            '[data-field="duracion"]'
                        )?.value || 5000
                    ),

                orden:
                    index

            };

        });

}


/* =====================================================
   DRAG & DROP
===================================================== */

function bindDragAndDrop(container) {

    if (!container) return;


    const items = [
        ...container.querySelectorAll(
            ".admin-item"
        )
    ];


    items.forEach(item => {

        item.addEventListener(
            "dragstart",
            () => {

                dragged = item;

                item.classList.add(
                    "dragging"
                );

            }
        );


        item.addEventListener(
            "dragend",
            () => {

                dragged = null;

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
                    rect.height / 2;


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

    });

}


/* =====================================================
   ACTUALIZAR ORDEN VISUAL
===================================================== */

function updateVisualOrder(container) {

    if (!container) return;


    [
        ...container.querySelectorAll(
            ".admin-item"
        )
    ]
        .forEach((item, index) => {

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

        });

}


/* =====================================================
   ELIMINAR ELEMENTOS
===================================================== */

function bindRemoveButtons() {

    document.addEventListener(
        "click",
        event => {


            /* -----------------------------------------
               CARRUSEL
            ----------------------------------------- */

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


            /* -----------------------------------------
               DESTACADOS
            ----------------------------------------- */

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


            /* -----------------------------------------
               SPONSORS
            ----------------------------------------- */

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
                        type === "evento"
                            ? ""
                            : "none";

                }
            );


            bannerFields.forEach(
                field => {

                    field.style.display =
                        type === "banner"
                            ? ""
                            : "none";

                }
            );


            /*
             * Si cambia a banner, actualizamos
             * la vista previa.
             */

            if (type === "banner") {

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

        config.carrusel = [];

    }


    config.carrusel.push({

        id:
            uid("carousel"),

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

        config.destacados = [];

    }


    config.destacados.push({

        id:
            uid("featured"),

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

        config.sponsors = [];

    }


    config.sponsors.push({

        id:
            uid("sponsor"),

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
        !Array.isArray(events)
    ) {

        events = [];

    }


    /* ---------------------------------------------
       CARGAR PATROCINADORES
       
       IMPORTANTE:
       Se leen todos los documentos existentes.
       Nunca se eliminan.
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


        /*
         * Si el documento existe pero todavía
         * no tenía el campo sponsors,
         * incorporamos los patrocinadores existentes.
         */

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
                            uid("sponsor"),

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

        /*
         * No existe todavía configuracion/home.
         */

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
                            uid("sponsor"),

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

function validateCarouselBanners(carousel) {

    const bannerRows =
        document.querySelectorAll(
            '#carouselList .admin-item'
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


        if (type !== "banner") {

            continue;

        }


        const imageInput =
            row.querySelector(
                '[data-field="bannerImage"]'
            );


        const imageUrl =
            imageInput?.value.trim() || "";


        /*
         * Un banner debe tener imagen.
         */

        if (!imageUrl) {

            return {
                valid: false,
                message:
                    `El banner ${index + 1} necesita una URL de imagen.`,
                input:
                    imageInput
            };

        }


        /*
         * La URL debe ser HTTP o HTTPS.
         */

        if (
            !isValidImageUrl(
                imageUrl
            )
        ) {

            return {
                valid: false,
                message:
                    `La URL del banner ${index + 1} no es válida. Debe comenzar con http:// o https://`,
                input:
                    imageInput
            };

        }

    }


    return {
        valid: true
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


    /* ---------------------------------------------
       VALIDAR LOGIN
    --------------------------------------------- */

    if (!user) {

        if (status) {

            status.textContent =
                "Debes iniciar sesión como administrador.";

        }

        return;

    }


    /* ---------------------------------------------
       VALIDAR ADMINISTRADOR
    --------------------------------------------- */

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


        /* -----------------------------------------
           LEER CARRUSEL
        ----------------------------------------- */

        const carousel =
            readCarousel()
                .filter(
                    item => {

                        /*
                         * Los banners se conservan
                         * después de validarlos.
                         */

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


        /* -----------------------------------------
           VALIDAR BANNERS
        ----------------------------------------- */

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
                    behavior: "smooth",
                    block: "center"
                });

                bannerValidation.input.style.borderColor =
                    "#dc3545";

            }


            return;

        }


        /* -----------------------------------------
           LEER DESTACADOS
           
           MÁXIMO 6
        ----------------------------------------- */

        const featured =
            readFeatured()
                .filter(
                    item =>
                        Boolean(
                            item.eventoId
                        )
                )
                .slice(0, 6)
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


        /* -----------------------------------------
           LEER SPONSORS
           
           SOLO GUARDA REFERENCIAS.
           NO MODIFICA PATROCINADORES.
        ----------------------------------------- */

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


        /* -----------------------------------------
           GUARDAR
        ----------------------------------------- */

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
                merge: true
            }

        );


        /* -----------------------------------------
           ACTUALIZAR ESTADO LOCAL
        ----------------------------------------- */

        config = {

            carrusel:
                carousel,

            destacados:
                featured,

            sponsors:
                sponsorConfig

        };


        /* -----------------------------------------
           MENSAJE
        ----------------------------------------- */

        if (status) {

            status.textContent =
                `Cambios guardados · ${carousel.length} carrusel · ${featured.length} destacados · ${sponsorConfig.length} sponsors`;

        }


        /*
         * Volver a renderizar para asegurar
         * que la pantalla coincida con Firestore.
         */

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

}


/* =====================================================
   INICIALIZACIÓN
===================================================== */

bindTabs();

bindButtons();

bindRemoveButtons();

bindCarouselTypeChange();


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