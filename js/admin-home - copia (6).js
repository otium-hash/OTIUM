
/* =====================================================
   OTIUM - ADMINISTRACIÓN DEL HOME + EVENTOS
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

   4. EVENTOS
      - Total
      - Actuales / futuros
      - Pasados
      - Antiguos 90+ días
      - Posibles duplicados
      - Filtros
      - Selección individual
      - Seleccionar visibles
      - Eliminación múltiple
      - Confirmación
      - Limpieza de referencias en Home

   IMPORTANTE:

   - Las imágenes de banners NO se almacenan en Firebase Storage.
   - La imagen se obtiene desde una URL pública.
   - Puede utilizarse ImageKit.
   - Firestore guarda solamente la URL.
   - No requiere Firebase Functions.
   - No requiere Secret Manager.
   - No requiere Blaze.
   - Solo modifica "configuracion/home" para la configuración
     del Home y para limpiar referencias de eventos eliminados.
   - Nunca elimina patrocinadores existentes.
   - Los posibles duplicados NO se eliminan automáticamente.
===================================================== */


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
    deleteDoc,
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
   ESTADO DE ADMINISTRACIÓN DE EVENTOS
===================================================== */

let eventFilter = "todos";

let selectedEventIds = new Set();


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
        event.firestoreId ??
        event.id ??
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


function getEventCity(event) {

    if (!event) return "";

    return (
        event.ciudad ??
        event.city ??
        event.comuna ??
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


/* =====================================================
   FECHAS DE EVENTOS
===================================================== */

function getEventDateValue(event) {

    if (!event) return null;

    return (
        event.fecha ??
        event.date ??
        event.fechaEvento ??
        event.eventDate ??
        null
    );

}


function parseEventDate(value) {

    if (!value) return null;


    /* ---------------------------------------------
       Firestore Timestamp
    --------------------------------------------- */

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const date = value.toDate();

        if (!isNaN(date.getTime())) {

            return date;

        }

    }


    /* ---------------------------------------------
       Firestore Timestamp serializado
    --------------------------------------------- */

    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        const date =
            new Date(
                value.seconds * 1000
            );

        if (!isNaN(date.getTime())) {

            return date;

        }

    }


    /* ---------------------------------------------
       Date
    --------------------------------------------- */

    if (value instanceof Date) {

        if (!isNaN(value.getTime())) {

            return value;

        }

    }


    /* ---------------------------------------------
       String
    --------------------------------------------- */

    if (typeof value === "string") {

        const clean =
            value.trim();

        if (!clean) return null;


        /*
         * YYYY-MM-DD
         * Se interpreta como fecha local.
         */

        const match =
            clean.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (match) {

            const year =
                Number(match[1]);

            const month =
                Number(match[2]) - 1;

            const day =
                Number(match[3]);


            const date =
                new Date(
                    year,
                    month,
                    day
                );


            if (!isNaN(date.getTime())) {

                return date;

            }

        }


        const parsed =
            new Date(clean);


        if (!isNaN(parsed.getTime())) {

            return parsed;

        }

    }


    return null;

}


/* =====================================================
   FECHA SOLO - COMPARACIONES
===================================================== */

function startOfDay(date) {

    const result =
        new Date(date);


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


function daysBetween(fromDate, toDate) {

    const from =
        startOfDay(fromDate);

    const to =
        startOfDay(toDate);


    const difference =
        to.getTime() -
        from.getTime();


    return Math.floor(
        difference /
        86400000
    );

}


/* =====================================================
   CLASIFICACIÓN DE EVENTOS
===================================================== */

function getEventClassification(event) {

    const eventDate =
        parseEventDate(
            getEventDateValue(event)
        );


    if (!eventDate) {

        return "sin-fecha";

    }


    const today =
        startOfDay(
            new Date()
        );


    const normalizedEventDate =
        startOfDay(
            eventDate
        );


    if (
        normalizedEventDate >=
        today
    ) {

        return "actuales";

    }


    const daysOld =
        daysBetween(
            normalizedEventDate,
            today
        );


    if (daysOld >= 90) {

        return "antiguos";

    }


    return "pasados";

}


/* =====================================================
   FORMATEAR FECHA
===================================================== */

function formatEventDate(event) {

    const date =
        parseEventDate(
            getEventDateValue(event)
        );


    if (!date) {

        return "Sin fecha";

    }


    try {

        return new Intl.DateTimeFormat(
            "es-CL",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(date);

    }

    catch {

        return date.toLocaleDateString(
            "es-CL"
        );

    }

}


/* =====================================================
   CLAVE PARA DUPLICADOS
===================================================== */

function normalizeDuplicateValue(value) {

    return String(
        value ?? ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim()
        .replace(
            /\s+/g,
            " "
        );

}


function getDuplicateKey(event) {

    const title =
        normalizeDuplicateValue(
            getEventTitle(event)
        );


    const city =
        normalizeDuplicateValue(
            getEventCity(event)
        );


    const date =
        parseEventDate(
            getEventDateValue(event)
        );


    if (
        !title ||
        !city ||
        !date
    ) {

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


    return `${title}|${year}-${month}-${day}|${city}`;

}


/* =====================================================
   DETECTAR DUPLICADOS
===================================================== */

function getDuplicateIds() {

    const groups =
        new Map();


    events.forEach(event => {

        const key =
            getDuplicateKey(event);


        if (!key) return;


        if (!groups.has(key)) {

            groups.set(
                key,
                []
            );

        }


        groups
            .get(key)
            .push(
                getEventId(event)
            );

    });


    const duplicateIds =
        new Set();


    groups.forEach(ids => {

        if (ids.length > 1) {

            ids.forEach(
                id =>
                    duplicateIds.add(
                        String(id)
                    )
            );

        }

    });


    return duplicateIds;

}


/* =====================================================
   OBTENER EVENTOS FILTRADOS
===================================================== */

function getFilteredEvents() {

    const duplicateIds =
        getDuplicateIds();


    if (
        eventFilter ===
        "duplicados"
    ) {

        return events.filter(
            event =>
                duplicateIds.has(
                    getEventId(event)
                )
        );

    }


    if (
        eventFilter ===
        "todos"
    ) {

        return [...events];

    }


    return events.filter(
        event =>
            getEventClassification(
                event
            ) ===
            eventFilter
    );

}


/* =====================================================
   ACTUALIZAR CONTADORES DE EVENTOS
===================================================== */

function updateEventCounters() {

    const duplicateIds =
        getDuplicateIds();


    let current =
        0;

    let past =
        0;

    let old =
        0;


    events.forEach(event => {

        const classification =
            getEventClassification(
                event
            );


        if (
            classification ===
            "actuales"
        ) {

            current++;

        }

        else if (
            classification ===
            "pasados"
        ) {

            past++;

        }

        else if (
            classification ===
            "antiguos"
        ) {

            old++;

        }

    });


    const counters = {

        totalEvents:
            events.length,

        currentEvents:
            current,

        pastEvents:
            past,

        oldEvents:
            old,

        duplicateEvents:
            duplicateIds.size

    };


    const ids =
        Object.keys(
            counters
        );


    ids.forEach(id => {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                counters[id];

        }

    });


    /*
     * También soportamos IDs alternativos
     * por compatibilidad con distintas versiones
     * de admin-home.html.
     */

    const aliases = {

        totalEventos:
            events.length,

        eventosActuales:
            current,

        eventosPasados:
            past,

        eventosAntiguos:
            old,

        eventosDuplicados:
            duplicateIds.size

    };


    Object.entries(
        aliases
    ).forEach(
        ([id, value]) => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    value;

            }

        }
    );

}


/* =====================================================
   ESTADO DE EVENTO
===================================================== */

function getEventStatusLabel(event) {

    const classification =
        getEventClassification(
            event
        );


    if (
        classification ===
        "actuales"
    ) {

        return "Actual / futuro";

    }


    if (
        classification ===
        "pasados"
    ) {

        return "Pasado";

    }


    if (
        classification ===
        "antiguos"
    ) {

        return "Antiguo · 90+ días";

    }


    return "Sin fecha";

}


/* =====================================================
   RENDER EVENTOS
===================================================== */

function renderEvents() {

    const container =
        document.getElementById(
            "eventsList"
        );


    /*
     * Si el HTML todavía no contiene
     * la pestaña de eventos, no hacemos nada.
     */

    if (!container) {

        updateEventCounters();

        return;

    }


    updateEventCounters();


    const filteredEvents =
        getFilteredEvents();


    /*
     * Limpiar selecciones que ya no existen.
     */

    const existingIds =
        new Set(
            events.map(
                event =>
                    getEventId(event)
            )
        );


    selectedEventIds.forEach(
        id => {

            if (
                !existingIds.has(
                    id
                )
            ) {

                selectedEventIds.delete(
                    id
                );

            }

        }
    );


    if (
        !filteredEvents.length
    ) {

        container.innerHTML = `
            <div class="admin-empty">

                No hay eventos en esta categoría.

            </div>
        `;


        updateEventSelectionUI();

        return;

    }


    const duplicateIds =
        getDuplicateIds();


    container.innerHTML =
        filteredEvents
            .map(event => {

                const id =
                    getEventId(event);


                const title =
                    getEventTitle(event);


                const image =
                    getEventImage(event);


                const city =
                    getEventCity(event);


                const category =
                    getEventCategory(event);


                const date =
                    formatEventDate(event);


                const classification =
                    getEventClassification(
                        event
                    );


                const isDuplicate =
                    duplicateIds.has(
                        id
                    );


                const isSelected =
                    selectedEventIds.has(
                        id
                    );


                let statusClass =
                    "";


                if (
                    classification ===
                    "actuales"
                ) {

                    statusClass =
                        "event-status-current";

                }

                else if (
                    classification ===
                    "pasados"
                ) {

                    statusClass =
                        "event-status-past";

                }

                else if (
                    classification ===
                    "antiguos"
                ) {

                    statusClass =
                        "event-status-old";

                }


                return `
                    <article
                        class="admin-item admin-event-item ${isSelected ? "selected" : ""}"
                        data-event-id="${esc(id)}"
                    >

                        <div
                            class="admin-event-select"
                        >

                            <input
                                type="checkbox"
                                data-event-select
                                data-event-id="${esc(id)}"
                                ${isSelected ? "checked" : ""}
                                aria-label="Seleccionar evento"
                            >

                        </div>


                        <div
                            class="admin-event-image"
                            style="
                                width:110px;
                                min-width:110px;
                                height:75px;
                                overflow:hidden;
                                border-radius:8px;
                                background:#f1f1f1;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            "
                        >

                            ${
                                image
                                    ? `
                                        <img
                                            src="${esc(image)}"
                                            alt="${esc(title)}"
                                            style="
                                                width:100%;
                                                height:100%;
                                                object-fit:cover;
                                            "
                                            loading="lazy"
                                            onerror="this.style.display='none';"
                                        >
                                      `
                                    : `
                                        <span
                                            style="
                                                font-size:12px;
                                                opacity:.6;
                                            "
                                        >
                                            Sin imagen
                                        </span>
                                      `
                            }

                        </div>


                        <div
                            class="admin-item-content"
                            style="flex:1;"
                        >

                            <div
                                class="admin-item-header"
                            >

                                <div>

                                    <strong>
                                        ${esc(title)}
                                    </strong>

                                    ${
                                        isDuplicate
                                            ? `
                                                <span
                                                    class="event-duplicate-badge"
                                                    style="
                                                        display:inline-block;
                                                        margin-left:8px;
                                                        padding:3px 7px;
                                                        border-radius:10px;
                                                        font-size:11px;
                                                        background:#fff3cd;
                                                        color:#856404;
                                                    "
                                                >
                                                    Posible duplicado
                                                </span>
                                              `
                                            : ""
                                    }

                                </div>

                            </div>


                            <div
                                class="admin-grid"
                            >

                                <div
                                    class="admin-field"
                                >

                                    <label>
                                        Fecha
                                    </label>

                                    <div>
                                        ${esc(date)}
                                    </div>

                                </div>


                                <div
                                    class="admin-field"
                                >

                                    <label>
                                        Ciudad
                                    </label>

                                    <div>
                                        ${esc(
                                            city ||
                                            "Sin ciudad"
                                        )}
                                    </div>

                                </div>


                                <div
                                    class="admin-field"
                                >

                                    <label>
                                        Categoría
                                    </label>

                                    <div>
                                        ${esc(
                                            category ||
                                            "Sin categoría"
                                        )}
                                    </div>

                                </div>


                                <div
                                    class="admin-field"
                                >

                                    <label>
                                        Estado
                                    </label>

                                    <div
                                        class="${esc(statusClass)}"
                                    >
                                        ${esc(
                                            getEventStatusLabel(
                                                event
                                            )
                                        )}
                                    </div>

                                </div>

                            </div>

                        </div>

                    </article>
                `;

            })
            .join("");


    bindEventSelectionEvents();

    updateEventSelectionUI();

}


/* =====================================================
   SELECCIÓN DE EVENTOS
===================================================== */

function bindEventSelectionEvents() {

    const checkboxes =
        document.querySelectorAll(
            "#eventsList [data-event-select]"
        );


    checkboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    const id =
                        String(
                            checkbox.dataset.eventId ||
                            ""
                        );


                    if (!id) return;


                    if (
                        checkbox.checked
                    ) {

                        selectedEventIds.add(
                            id
                        );

                    }

                    else {

                        selectedEventIds.delete(
                            id
                        );

                    }


                    const row =
                        checkbox.closest(
                            ".admin-event-item"
                        );


                    if (row) {

                        row.classList.toggle(
                            "selected",
                            checkbox.checked
                        );

                    }


                    updateEventSelectionUI();

                }
            );

        }
    );

}


/* =====================================================
   ACTUALIZAR UI DE SELECCIÓN
===================================================== */

function updateEventSelectionUI() {

    const filteredEvents =
        getFilteredEvents();


    const visibleIds =
        filteredEvents.map(
            event =>
                getEventId(event)
        );


    const selectedVisibleCount =
        visibleIds.filter(
            id =>
                selectedEventIds.has(
                    id
                )
        ).length;


    const selectVisible =
        document.getElementById(
            "selectVisibleEvents"
        );


    if (selectVisible) {

        selectVisible.checked =
            visibleIds.length > 0 &&
            selectedVisibleCount ===
                visibleIds.length;

    }


    const selectedCount =
        selectedEventIds.size;


    const selectedCounter =
        document.getElementById(
            "selectedEventsCount"
        );


    if (selectedCounter) {

        selectedCounter.textContent =
            selectedCount;

    }


    const deleteButton =
        document.getElementById(
            "deleteSelectedEvents"
        );


    if (deleteButton) {

        deleteButton.disabled =
            selectedCount === 0;

    }


    /*
     * Compatibilidad con posibles nombres
     * alternativos utilizados en el HTML.
     */

    const deleteAliases = [
        "deleteEvents",
        "deleteSelected",
        "deleteSelectedEvent"
    ];


    deleteAliases.forEach(id => {

        const button =
            document.getElementById(
                id
            );


        if (button) {

            button.disabled =
                selectedCount === 0;

        }

    });


    const selectedAliases = [
        "eventosSeleccionados",
        "selectedCount"
    ];


    selectedAliases.forEach(id => {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                selectedCount;

        }

    });

}


/* =====================================================
   SELECCIONAR VISIBLES
===================================================== */

function toggleSelectVisibleEvents(
    checked
) {

    const filteredEvents =
        getFilteredEvents();


    filteredEvents.forEach(
        event => {

            const id =
                getEventId(event);


            if (!id) return;


            if (checked) {

                selectedEventIds.add(
                    id
                );

            }

            else {

                selectedEventIds.delete(
                    id
                );

            }

        }
    );


    renderEvents();

}


/* =====================================================
   FILTROS DE EVENTOS
===================================================== */

function bindEventFilters() {

    const filterButtons =
        document.querySelectorAll(
            "[data-event-filter]"
        );


    filterButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const filter =
                        button.dataset.eventFilter ||
                        "todos";


                    eventFilter =
                        filter;


                    filterButtons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    renderEvents();

                }
            );

        }
    );

}


/* =====================================================
   SELECCIONAR VISIBLES - EVENTO
===================================================== */

function bindSelectVisibleEvents() {

    const checkbox =
        document.getElementById(
            "selectVisibleEvents"
        );


    if (!checkbox) return;


    checkbox.addEventListener(
        "change",
        () => {

            toggleSelectVisibleEvents(
                checkbox.checked
            );

        }
    );

}


/* =====================================================
   LIMPIAR REFERENCIAS DE EVENTOS ELIMINADOS
===================================================== */

function cleanDeletedEventReferences(
    deletedIds
) {

    const ids =
        new Set(
            deletedIds.map(
                id =>
                    String(id)
            )
        );


    if (!ids.size) {

        return;

    }


    /* ---------------------------------------------
       CARRUSEL
    --------------------------------------------- */

    const cleanedCarousel =
        (
            Array.isArray(
                config.carrusel
            )
                ? config.carrusel
                : []
        )
            .filter(item => {

                if (
                    item.tipo ===
                    "banner"
                ) {

                    return true;

                }


                const eventId =
                    String(
                        item.eventoId ??
                        ""
                    );


                return !ids.has(
                    eventId
                );

            })
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


    /* ---------------------------------------------
       DESTACADOS
    --------------------------------------------- */

    const cleanedFeatured =
        (
            Array.isArray(
                config.destacados
            )
                ? config.destacados
                : []
        )
            .filter(item => {

                const eventId =
                    String(
                        item.eventoId ??
                        ""
                    );


                return !ids.has(
                    eventId
                );

            })
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


    config.carrusel =
        cleanedCarousel;


    config.destacados =
        cleanedFeatured;


    return {
        carrusel:
            cleanedCarousel,

        destacados:
            cleanedFeatured

    };

}


/* =====================================================
   GUARDAR LIMPIEZA DE REFERENCIAS
===================================================== */

async function saveCleanedHomeReferences(
    cleaned
) {

    if (!cleaned) return;


    const user =
        auth.currentUser;


    if (!user) {

        throw new Error(
            "Usuario no autenticado."
        );

    }


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
                cleaned.carrusel,

            destacados:
                cleaned.destacados,

            updatedAt:
                serverTimestamp(),

            updatedBy:
                user.uid

        },

        {
            merge: true
        }

    );

}


/* =====================================================
   VERIFICAR ADMINISTRADOR
===================================================== */

async function verifyAdmin() {

    const user =
        auth.currentUser;


    if (!user) {

        return false;

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


    return adminSnapshot.exists();

}


/* =====================================================
   ELIMINAR EVENTOS SELECCIONADOS
===================================================== */

async function deleteSelectedEvents() {

    const status =
        document.getElementById(
            "adminStatus"
        );


    const selectedIds =
        [...selectedEventIds];


    if (!selectedIds.length) {

        if (status) {

            status.textContent =
                "No hay eventos seleccionados.";

        }

        return;

    }


    const selectedEvents =
        events.filter(
            event =>
                selectedIds.includes(
                    getEventId(event)
                )
        );


    if (
        !selectedEvents.length
    ) {

        selectedEventIds.clear();

        renderEvents();

        return;

    }


    /* ---------------------------------------------
       CONFIRMACIÓN
    --------------------------------------------- */

    const names =
        selectedEvents
            .slice(0, 5)
            .map(
                event =>
                    getEventTitle(event)
            );


    let confirmationMessage =
        `¿Estás seguro de eliminar ${selectedEvents.length} evento(s)?\n\n`;


    confirmationMessage +=
        names
            .map(
                name =>
                    `• ${name}`
            )
            .join("\n");


    if (
        selectedEvents.length >
        5
    ) {

        confirmationMessage +=
            `\n• ... y ${selectedEvents.length - 5} más`;

    }


    confirmationMessage +=
        "\n\nEsta acción no se puede deshacer.";


    confirmationMessage +=
        "\n\nSi alguno está en Carrusel o Destacados, también se eliminará su referencia del Home.";


    const confirmed =
        window.confirm(
            confirmationMessage
        );


    if (!confirmed) {

        return;

    }


    /* ---------------------------------------------
       VERIFICAR ADMIN
    --------------------------------------------- */

    try {

        const isAdmin =
            await verifyAdmin();


        if (!isAdmin) {

            if (status) {

                status.textContent =
                    "No tienes permisos de administrador.";

            }

            return;

        }


        if (status) {

            status.textContent =
                `Eliminando ${selectedEvents.length} evento(s)...`;

        }


        const deleteButton =
            document.getElementById(
                "deleteSelectedEvents"
            );


        if (deleteButton) {

            deleteButton.disabled =
                true;

            deleteButton.textContent =
                "Eliminando...";

        }


        /* -----------------------------------------
           ELIMINAR DOCUMENTOS
        ----------------------------------------- */

        let deletedCount =
            0;


        for (
            const event
            of selectedEvents
        ) {

            const eventId =
                getEventId(event);


            if (!eventId) {

                console.warn(
                    "Evento sin ID. No se puede eliminar:",
                    event
                );

                continue;

            }


            /*
             * getEventId() prioriza firestoreId.
             * Si getEvents() devuelve el ID de
             * Firestore como "id", también funciona.
             */

            const eventRef =
                doc(
                    db,
                    "eventos",
                    eventId
                );


            await deleteDoc(
                eventRef
            );


            deletedCount++;

        }


        /* -----------------------------------------
           LIMPIAR REFERENCIAS HOME
        ----------------------------------------- */

        const deletedIds =
            selectedEvents
                .map(
                    event =>
                        getEventId(event)
                )
                .filter(Boolean);


        const cleaned =
            cleanDeletedEventReferences(
                deletedIds
            );


        if (cleaned) {

            await saveCleanedHomeReferences(
                cleaned
            );

        }


        /* -----------------------------------------
           ACTUALIZAR ESTADO LOCAL
        ----------------------------------------- */

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


        selectedEventIds.clear();


        /* -----------------------------------------
           RENDER
        ----------------------------------------- */

        renderEvents();

        renderCarousel();

        renderFeatured();


        if (status) {

            status.textContent =
                `${deletedCount} evento(s) eliminado(s) correctamente. Las referencias del Home fueron actualizadas.`;

        }

    }

    catch (error) {

        console.error(
            "Error eliminando eventos:",
            error
        );


        if (status) {

            status.textContent =
                "Error al eliminar los eventos. Revisa la consola.";

        }

    }

    finally {

        const deleteButton =
            document.getElementById(
                "deleteSelectedEvents"
            );


        if (deleteButton) {

            deleteButton.disabled =
                selectedEventIds.size === 0;

            deleteButton.textContent =
                "Eliminar seleccionados";

        }

    }

}


/* =====================================================
   BÚSQUEDA OPCIONAL DE EVENTOS
===================================================== */

function bindEventSearch() {

    const input =
        document.getElementById(
            "eventSearch"
        );


    if (!input) return;


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();


            const container =
                document.getElementById(
                    "eventsList"
                );


            if (!container) return;


            const items =
                container.querySelectorAll(
                    ".admin-event-item"
                );


            items.forEach(
                item => {

                    const eventId =
                        item.dataset.eventId ||
                        "";


                    const event =
                        events.find(
                            current =>
                                getEventId(
                                    current
                                ) ===
                                String(eventId)
                        );


                    if (!event) {

                        item.style.display =
                            "none";

                        return;

                    }


                    const text =
                        [
                            getEventTitle(
                                event
                            ),

                            getEventCity(
                                event
                            ),

                            getEventCategory(
                                event
                            ),

                            formatEventDate(
                                event
                            )

                        ]
                            .join(" ")
                            .toLowerCase();


                    item.style.display =
                        !query ||
                        text.includes(
                            query
                        )
                            ? ""
                            : "none";

                }
            );

        }
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

function buildCarouselTypeOptions(
    type = "evento"
) {

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

function updateBannerPreview(input) {

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
    ) return;


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
        !isValidImageUrl(
            url
        )
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
                        item.tipo === "banner"
                            ? "banner"
                            : "evento";


                    const eventId =
                        item.eventoId ??
                        "";


                    const event =
                        events.find(
                            e =>
                                getEventId(e) ===
                                String(eventId)
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
                                                item.duracion ||
                                                6500
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
                                                item.inicio ||
                                                ""
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
                                                item.fin ||
                                                ""
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

        if (
            sponsors.length
        ) {

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
                        uid("carousel"),

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
                        uid("featured"),

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
                        uid("sponsor"),

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


                return;

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

        config.destacados =
            [];

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

        config.sponsors =
            [];

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
        !Array.isArray(
            events
        )
    ) {

        events =
            [];

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

    renderEvents();

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

function validateCarouselBanners(
    carousel
) {

    const bannerRows =
        document.querySelectorAll(
            "#carouselList .admin-item"
        );


    for (
        let index = 0;
        index <
        bannerRows.length;
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
                merge:
                    true
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


                    /*
                     * Al abrir Eventos,
                     * actualizamos contadores.
                     */

                    if (
                        target ===
                        "eventos"
                    ) {

                        renderEvents();

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


    /* ---------------------------------------------
       EVENTOS
    --------------------------------------------- */

    const deleteEventsButton =
        document.getElementById(
            "deleteSelectedEvents"
        );


    if (
        deleteEventsButton
    ) {

        deleteEventsButton.addEventListener(
            "click",
            deleteSelectedEvents
        );

    }


    /*
     * Compatibilidad con IDs alternativos.
     */

    [
        "deleteEvents",
        "deleteSelected",
        "deleteSelectedEvent"
    ]
        .forEach(id => {

            const button =
                document.getElementById(
                    id
                );


            if (
                button &&
                button !==
                    deleteEventsButton
            ) {

                button.addEventListener(
                    "click",
                    deleteSelectedEvents
                );

            }

        });

}


/* =====================================================
   INICIALIZACIÓN
===================================================== */

bindTabs();

bindButtons();

bindRemoveButtons();

bindCarouselTypeChange();

bindEventFilters();

bindSelectVisibleEvents();

bindEventSearch();


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
