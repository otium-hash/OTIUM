/* =====================================================
   OTIUM - DETALLE COMPLETO DEL EVENTO

   VERSIÓN CORREGIDA
   Fecha: 2026-09-13

   OBJETIVOS:
   - Mostrar correctamente el encabezado.
   - Soportar fechaInicio + fechaTermino.
   - Soportar eventos de un solo día.
   - Soportar eventos de varios días.
   - Soportar horaInicio + horaTermino.
   - Mantener compatibilidad con fecha/hora antiguos.
   - Mantener favoritos.
   - Mantener compartir.
   - Mantener organizador.
   - Mantener mapa.
   - Mantener enlaces.
   - Mantener promoción.
   - Mantener invitaciones.
===================================================== */

import {
    getEventById,
    addFavorite,
    removeFavorite,
    isFavorite
} from "./modules/database.js";

import {
    auth
} from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   PARÁMETROS
===================================================== */

const params = new URLSearchParams(
    window.location.search
);

const eventId = params.get("id");


/* =====================================================
   ELEMENTOS PRINCIPALES
===================================================== */

const eventMessage =
    document.getElementById("eventMessage");

const eventLoading =
    document.getElementById("eventLoading");

const eventContent =
    document.getElementById("eventContent");


/* =====================================================
   INFORMACIÓN EVENTO
===================================================== */

const eventTitle =
    document.getElementById("eventTitle");

const eventCategory =
    document.getElementById("eventCategory");

const eventDate =
    document.getElementById("eventDate");

const eventTime =
    document.getElementById("eventTime");

const eventCity =
    document.getElementById("eventCity");

const eventRegion =
    document.getElementById("eventRegion");

const eventLocation =
    document.getElementById("eventLocation");

const eventPrice =
    document.getElementById("eventPrice");

const eventTickets =
    document.getElementById("eventTickets");

const eventDescription =
    document.getElementById("eventDescription");


/* =====================================================
   EDAD
===================================================== */

const ageBox =
    document.getElementById("ageBox");

const eventAge =
    document.getElementById("eventAge");


/* =====================================================
   META
===================================================== */

const eventDateMeta =
    document.getElementById("eventDateMeta");

const eventCityMeta =
    document.getElementById("eventCityMeta");


/* =====================================================
   IMAGEN
===================================================== */

const eventImageWrap =
    document.getElementById("eventImageWrap");

const eventImage =
    document.getElementById("eventImage");


/* =====================================================
   ORGANIZADOR
===================================================== */

const organizerSection =
    document.getElementById("organizerSection");

const organizerName =
    document.getElementById("organizerName");

const organizerInfo =
    document.getElementById("organizerInfo");


/* =====================================================
   MAPA
===================================================== */

const mapSection =
    document.getElementById("mapSection");

const eventMap =
    document.getElementById("eventMap");

const mapLink =
    document.getElementById("mapLink");


/* =====================================================
   ENLACE OFICIAL
===================================================== */

const eventLinkSection =
    document.getElementById("eventLinkSection");

const eventLink =
    document.getElementById("eventLink");


/* =====================================================
   ACCIONES
===================================================== */

const favoriteButton =
    document.getElementById("favoriteButton");

const shareButton =
    document.getElementById("shareButton");

const invitationButton =
    document.getElementById("invitationButton");

const promoteButton =
    document.getElementById("promoteButton");


/* =====================================================
   ESTADO
===================================================== */

let currentEvent = null;
let currentUser = null;
let favoriteState = false;


/* =====================================================
   LIMPIAR VALOR
===================================================== */

function clean(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


/* =====================================================
   OBTENER PRIMER VALOR DISPONIBLE
===================================================== */

function firstValue(object, keys) {

    if (!object) {
        return "";
    }

    for (const key of keys) {

        const value = object[key];

        if (
            value !== undefined &&
            value !== null &&
            clean(value) !== ""
        ) {
            return value;
        }
    }

    return "";
}


/* =====================================================
   FORMATEAR FECHA

   Soporta:
   YYYY-MM-DD
   YYYY/MM/DD
   DD/MM/YYYY
   DD-MM-YYYY
===================================================== */

function formatDate(value) {

    const text = clean(value);

    if (!text) {
        return "";
    }


    /* -----------------------------------------------
       YYYY-MM-DD
    ------------------------------------------------ */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {

        const [
            year,
            month,
            day
        ] = text.split("-");

        return `${day}-${month}-${year}`;
    }


    /* -----------------------------------------------
       YYYY/MM/DD
    ------------------------------------------------ */

    if (
        /^\d{4}\/\d{2}\/\d{2}$/.test(text)
    ) {

        const [
            year,
            month,
            day
        ] = text.split("/");

        return `${day}-${month}-${year}`;
    }


    /* -----------------------------------------------
       DD/MM/YYYY
    ------------------------------------------------ */

    if (
        /^\d{2}\/\d{2}\/\d{4}$/.test(text)
    ) {

        const [
            day,
            month,
            year
        ] = text.split("/");

        return `${day}-${month}-${year}`;
    }


    /* -----------------------------------------------
       DD-MM-YYYY
    ------------------------------------------------ */

    if (
        /^\d{2}-\d{2}-\d{4}$/.test(text)
    ) {
        return text;
    }


    return text;
}


/* =====================================================
   OBTENER FECHA DE INICIO
===================================================== */

function obtenerFechaInicio(event) {

    return firstValue(
        event,
        [
            "fechaInicio",
            "fecha",
            "date"
        ]
    );
}


/* =====================================================
   OBTENER FECHA DE TÉRMINO
===================================================== */

function obtenerFechaTermino(event) {

    const fechaTermino =
        firstValue(
            event,
            [
                "fechaTermino"
            ]
        );

    if (fechaTermino) {
        return fechaTermino;
    }

    return obtenerFechaInicio(event);
}


/* =====================================================
   FORMATEAR RANGO DE FECHAS
===================================================== */

function formatDateRange(event) {

    const fechaInicio =
        obtenerFechaInicio(event);

    const fechaTermino =
        obtenerFechaTermino(event);

    const inicio =
        formatDate(fechaInicio);

    const termino =
        formatDate(fechaTermino);


    if (!inicio && !termino) {
        return "No informada";
    }


    if (!inicio) {
        return termino;
    }


    if (!termino) {
        return inicio;
    }


    /* -----------------------------------------------
       MISMA FECHA
    ------------------------------------------------ */

    if (
        clean(fechaInicio) ===
        clean(fechaTermino)
    ) {
        return inicio;
    }


    /* -----------------------------------------------
       RANGO
    ------------------------------------------------ */

    return `${inicio} al ${termino}`;
}


/* =====================================================
   FORMATEAR HORARIO
===================================================== */

function formatTimeRange(event) {

    const horaInicio =
        firstValue(
            event,
            [
                "horaInicio",
                "hora",
                "time"
            ]
        );

    const horaTermino =
        firstValue(
            event,
            [
                "horaTermino"
            ]
        );


    const inicio =
        clean(horaInicio);

    const termino =
        clean(horaTermino);


    if (!inicio && !termino) {
        return "No informada";
    }


    if (!inicio) {
        return termino;
    }


    if (!termino) {
        return inicio;
    }


    if (inicio === termino) {
        return inicio;
    }


    return `${inicio} - ${termino}`;
}


/* =====================================================
   MENSAJES
===================================================== */

function showMessage(
    text,
    type = "error"
) {

    if (!eventMessage) {
        return;
    }

    eventMessage.textContent =
        text;

    eventMessage.className =
        `event-message ${type}`;
}


function hideMessage() {

    if (!eventMessage) {
        return;
    }

    eventMessage.textContent =
        "";

    eventMessage.className =
        "event-message";
}


/* =====================================================
   MOSTRAR / OCULTAR BOX OPCIONAL
===================================================== */

function renderOptionalBox(
    boxId,
    value
) {

    const box =
        document.getElementById(boxId);

    if (!box) {
        return;
    }

    box.style.display =
        clean(value)
            ? ""
            : "none";
}


/* =====================================================
   NORMALIZAR URL
===================================================== */

function normalizeUrl(value) {

    const url =
        clean(value);

    if (!url) {
        return "";
    }

    if (
        /^https?:\/\//i.test(url)
    ) {
        return url;
    }

    return `https://${url}`;
}


/* =====================================================
   OBTENER RANGO DE EDAD
===================================================== */

function obtenerInformacionEdad(event) {

    const edad =
        event?.edad || {};

    let edadMinima =
        Number(
            edad.edadMinima
        );

    let edadMaxima =
        Number(
            edad.edadMaxima
        );


    /* -------------------------------------------------
       COMPATIBILIDAD CON EVENTOS ANTIGUOS
    ------------------------------------------------- */

    if (
        !Number.isFinite(edadMinima)
    ) {

        edadMinima =
            Number(
                event?.edadMinima
            );
    }


    if (
        !Number.isFinite(edadMaxima)
    ) {

        edadMaxima =
            Number(
                event?.edadMaxima
            );
    }


    const tieneRango =
        edad.tieneRango === true;


    /* -------------------------------------------------
       SIN INFORMACIÓN DE EDAD
    ------------------------------------------------- */

    if (
        !tieneRango &&
        !Number.isFinite(edadMinima) &&
        !Number.isFinite(edadMaxima)
    ) {
        return null;
    }


    /* -------------------------------------------------
       RANGO COMPLETO
    ------------------------------------------------- */

    if (
        Number.isFinite(edadMinima) &&
        Number.isFinite(edadMaxima)
    ) {

        return {

            tipo: "rango",

            edadMinima:
                edadMinima,

            edadMaxima:
                edadMaxima
        };
    }


    /* -------------------------------------------------
       SOLO MÍNIMA
    ------------------------------------------------- */

    if (
        Number.isFinite(edadMinima)
    ) {

        return {

            tipo: "minima",

            edadMinima:
                edadMinima,

            edadMaxima:
                null
        };
    }


    /* -------------------------------------------------
       SOLO MÁXIMA
    ------------------------------------------------- */

    if (
        Number.isFinite(edadMaxima)
    ) {

        return {

            tipo: "maxima",

            edadMinima:
                null,

            edadMaxima:
                edadMaxima
        };
    }


    return null;
}


/* =====================================================
   FORMATEAR TEXTO DE EDAD
===================================================== */

function formatearEdad(
    informacionEdad
) {

    if (!informacionEdad) {
        return "";
    }

    const minimo =
        informacionEdad.edadMinima;

    const maximo =
        informacionEdad.edadMaxima;


    if (
        informacionEdad.tipo === "rango"
    ) {

        if (
            minimo === maximo
        ) {
            return `👤 ${minimo} años`;
        }

        return `👨‍👩‍👧 Edad recomendada: ${minimo} a ${maximo} años`;
    }


    if (
        informacionEdad.tipo === "minima"
    ) {
        return `👤 Desde ${minimo} años`;
    }


    if (
        informacionEdad.tipo === "maxima"
    ) {
        return `👤 Hasta ${maximo} años`;
    }


    return "";
}


/* =====================================================
   RENDER EVENTO
===================================================== */

function renderEvent(event) {

    if (!event) {
        return;
    }


    /* =================================================
       DATOS PRINCIPALES
    ================================================= */

    const nombre =
        firstValue(
            event,
            [
                "nombre",
                "title",
                "name"
            ]
        ) ||
        "Evento sin nombre";


    const categoria =
        firstValue(
            event,
            [
                "categoria",
                "category"
            ]
        ) ||
        "Evento";


    const subcategoria =
        firstValue(
            event,
            [
                "subcategoria",
                "subcategory"
            ]
        );


    /* =================================================
       FECHAS NUEVAS
    ================================================= */

    const fecha =
        formatDateRange(event);


    /* =================================================
       HORARIOS NUEVOS
    ================================================= */

    const hora =
        formatTimeRange(event);


    /* =================================================
       CIUDAD
    ================================================= */

    const ciudad =
        firstValue(
            event,
            [
                "ciudad",
                "city"
            ]
        ) ||
        "No informada";


    /* =================================================
       REGIÓN
    ================================================= */

    const region =
        firstValue(
            event,
            [
                "region",
                "región"
            ]
        ) ||
        "No informada";


    /* =================================================
       UBICACIÓN
    ================================================= */

    const ubicacion =
        firstValue(
            event,
            [
                "ubicacion",
                "ubicación",
                "direccion",
                "dirección",
                "address"
            ]
        ) ||
        "No informada";


    /* =================================================
       DESCRIPCIÓN
    ================================================= */

    const descripcion =
        firstValue(
            event,
            [
                "descripcion",
                "description"
            ]
        ) ||
        "Este evento no tiene una descripción disponible.";


    /* =================================================
       PRECIO
    ================================================= */

    const precio =
        firstValue(
            event,
            [
                "precio",
                "price"
            ]
        );


    /* =================================================
       ENTRADAS
    ================================================= */

    const entradas =
        firstValue(
            event,
            [
                "entradas",
                "tickets",
                "linkEntradas"
            ]
        );


    /* =================================================
       IMAGEN
    ================================================= */

    const imagen =
        firstValue(
            event,
            [
                "imagenUrl",
                "imageUrl",
                "imagen",
                "image",
                "fotoUrl",
                "foto",
                "urlImagen",
                "url_imagen"
            ]
        );


    /* =================================================
       ORGANIZADOR
    ================================================= */

    const organizer =
        firstValue(
            event,
            [
                "organizador",
                "organizer",
                "nombreOrganizador",
                "organizerName"
            ]
        );


    const organizerEmail =
        firstValue(
            event,
            [
                "organizadorEmail",
                "organizerEmail",
                "emailOrganizador"
            ]
        );


    /* =================================================
       ENLACE
    ================================================= */

    const externalLink =
        firstValue(
            event,
            [
                "enlaceEvento",
                "linkEvento",
                "urlEvento",
                "eventoUrl",
                "eventLink",
                "eventUrl",
                "link",
                "url"
            ]
        );


    /* =================================================
       COORDENADAS
    ================================================= */

    const lat =
        Number(
            firstValue(
                event,
                [
                    "latitud",
                    "latitude",
                    "lat"
                ]
            )
        );


    const lng =
        Number(
            firstValue(
                event,
                [
                    "longitud",
                    "longitude",
                    "lng",
                    "lon"
                ]
            )
        );


    /* =================================================
       TIPO EVENTO
    ================================================= */

    const tipoEvento =
        firstValue(
            event,
            [
                "tipoEvento",
                "tipo"
            ]
        ) ||
        "publico";


    console.log(
        "OTIUM - Tipo de evento:",
        tipoEvento
    );


    /* =================================================
       DATOS DE DIAGNÓSTICO
    ================================================= */

    console.log(
        "OTIUM - Fecha inicio:",
        event.fechaInicio
    );

    console.log(
        "OTIUM - Fecha término:",
        event.fechaTermino
    );

    console.log(
        "OTIUM - Fecha mostrada:",
        fecha
    );

    console.log(
        "OTIUM - Hora inicio:",
        event.horaInicio
    );

    console.log(
        "OTIUM - Hora término:",
        event.horaTermino
    );

    console.log(
        "OTIUM - Hora mostrada:",
        hora
    );


    /* =================================================
       TÍTULO
    ================================================= */

    document.title =
        `${nombre} | OTIUM`;


    if (eventTitle) {

        eventTitle.textContent =
            nombre;
    }


    /* =================================================
       CATEGORÍA
    ================================================= */

    if (eventCategory) {

        eventCategory.textContent =
            subcategoria
                ? `${categoria} · ${subcategoria}`
                : categoria;
    }


    /* =================================================
       FECHA

       Se utiliza la nueva fechaInicio /
       fechaTermino y se mantiene compatibilidad
       con fecha antigua.
    ================================================= */

    if (eventDate) {

        eventDate.textContent =
            fecha;
    }


    if (eventDateMeta) {

        eventDateMeta.textContent =
            `📅 ${fecha}`;
    }


    /* =================================================
       HORA
    ================================================= */

    if (eventTime) {

        eventTime.textContent =
            hora;
    }


    /* =================================================
       CIUDAD
    ================================================= */

    if (eventCity) {

        eventCity.textContent =
            ciudad;
    }


    if (eventCityMeta) {

        eventCityMeta.textContent =
            `📍 ${ciudad}`;
    }


    /* =================================================
       REGIÓN
    ================================================= */

    if (eventRegion) {

        eventRegion.textContent =
            region;
    }


    /* =================================================
       UBICACIÓN
    ================================================= */

    if (eventLocation) {

        eventLocation.textContent =
            ubicacion;
    }


    /* =================================================
       DESCRIPCIÓN
    ================================================= */

    if (eventDescription) {

        eventDescription.textContent =
            descripcion;
    }


    /* =================================================
       PRECIO
    ================================================= */

    if (eventPrice) {

        if (clean(precio)) {

            eventPrice.textContent =
                precio;

            renderOptionalBox(
                "priceBox",
                precio
            );

        } else {

            eventPrice.textContent =
                "Gratis";

            renderOptionalBox(
                "priceBox",
                ""
            );
        }
    }


    /* =================================================
       ENTRADAS
    ================================================= */

    if (eventTickets) {

        if (clean(entradas)) {

            eventTickets.textContent =
                entradas;

            renderOptionalBox(
                "ticketsBox",
                entradas
            );

        } else {

            eventTickets.textContent =
                "";

            renderOptionalBox(
                "ticketsBox",
                ""
            );
        }
    }


    /* =================================================
       EDAD
    ================================================= */

    const informacionEdad =
        obtenerInformacionEdad(
            event
        );


    const textoEdad =
        formatearEdad(
            informacionEdad
        );


    if (
        ageBox &&
        eventAge
    ) {

        if (textoEdad) {

            eventAge.textContent =
                textoEdad;

            ageBox.classList.add(
                "visible"
            );

            ageBox.style.display =
                "";

        } else {

            eventAge.textContent =
                "";

            ageBox.classList.remove(
                "visible"
            );

            ageBox.style.display =
                "none";
        }
    }


    /* =================================================
       IMAGEN
    ================================================= */

    if (
        imagen &&
        eventImage &&
        eventImageWrap
    ) {

        const imageUrl =
            normalizeUrl(imagen);


        if (imageUrl) {

            eventImage.src =
                imageUrl;

            eventImage.alt =
                nombre;

            eventImageWrap.style.display =
                "block";


            eventImage.onerror =
                () => {

                    console.warn(
                        "OTIUM - No fue posible cargar la imagen:",
                        imageUrl
                    );

                    eventImageWrap.style.display =
                        "none";
                };
        }

    } else if (eventImageWrap) {

        eventImageWrap.style.display =
            "none";
    }


    /* =================================================
       ORGANIZADOR
    ================================================= */

    if (
        organizer ||
        organizerEmail
    ) {

        if (organizerSection) {

            organizerSection.style.display =
                "block";
        }


        if (organizerName) {

            organizerName.textContent =
                organizer ||
                "Organizador del evento";
        }


        if (organizerInfo) {

            if (organizerEmail) {

                const safeEmail =
                    clean(organizerEmail)
                        .replace(/"/g, "");


                organizerInfo.innerHTML =
                    `Contacto: <a href="mailto:${encodeURIComponent(safeEmail)}">${safeEmail}</a>`;

            } else {

                organizerInfo.textContent =
                    "Información proporcionada por el responsable de la publicación.";
            }
        }

    } else if (organizerSection) {

        organizerSection.style.display =
            "none";
    }


    /* =================================================
       MAPA
    ================================================= */

    if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat !== 0 &&
        lng !== 0 &&
        eventMap &&
        mapSection
    ) {

        mapSection.style.display =
            "block";


        const bbox =
            `${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}`;


        eventMap.innerHTML = `
            <iframe
                title="Ubicación del evento"
                src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        `;


        if (mapLink) {

            mapLink.href =
                `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

            mapLink.target =
                "_blank";

            mapLink.rel =
                "noopener noreferrer";
        }

    } else if (mapSection) {

        mapSection.style.display =
            "none";
    }


    /* =================================================
       ENLACE OFICIAL
    ================================================= */

    const safeExternalLink =
        normalizeUrl(
            externalLink
        );


    if (
        safeExternalLink &&
        eventLinkSection &&
        eventLink
    ) {

        eventLinkSection.style.display =
            "block";

        eventLink.href =
            safeExternalLink;

        eventLink.target =
            "_blank";

        eventLink.rel =
            "noopener noreferrer";

    } else if (eventLinkSection) {

        eventLinkSection.style.display =
            "none";
    }


    /* =================================================
       PROPIETARIO DEL EVENTO
    ================================================= */

    const ownerId =
        firstValue(
            event,
            [
                "usuarioId",
                "userId",
                "ownerId"
            ]
        );


    const realEventId =
        event.firestoreId ||
        event.id ||
        eventId;


    const isOwner =
        Boolean(
            currentUser &&
            ownerId &&
            ownerId === currentUser.uid
        );


    /* =================================================
       PROMOCIONAR
    ================================================= */

    if (promoteButton) {

        if (isOwner) {

            promoteButton.style.display =
                "inline-flex";

            promoteButton.href =
                `promocionar-evento.html?id=${encodeURIComponent(realEventId)}`;

        } else {

            promoteButton.style.display =
                "none";
        }
    }


    /* =================================================
       INVITACIÓN / QR
    ================================================= */

    if (invitationButton) {

        if (isOwner) {

            invitationButton.style.display =
                "inline-flex";

            invitationButton.href =
                `event-invitation-QR.html?id=${encodeURIComponent(realEventId)}`;

        } else {

            invitationButton.style.display =
                "none";
        }
    }
}


/* =====================================================
   CARGAR EVENTO
===================================================== */

async function loadEvent() {

    hideMessage();


    if (!eventId) {

        if (eventLoading) {

            eventLoading.style.display =
                "none";
        }


        showMessage(
            "No se recibió el ID del evento.",
            "error"
        );

        return;
    }


    try {

        console.log(
            "OTIUM - Cargando evento:",
            eventId
        );


        currentEvent =
            await getEventById(
                eventId
            );


        if (!currentEvent) {

            if (eventLoading) {

                eventLoading.style.display =
                    "none";
            }


            showMessage(
                "No se encontró el evento.",
                "error"
            );

            return;
        }


        console.log(
            "OTIUM - Evento encontrado:",
            currentEvent
        );


        renderEvent(
            currentEvent
        );


        if (eventLoading) {

            eventLoading.style.display =
                "none";
        }


        if (eventContent) {

            eventContent.style.display =
                "block";
        }


        await refreshFavoriteState();

    } catch (error) {

        console.error(
            "OTIUM - Error cargando evento:",
            error
        );


        if (eventLoading) {

            eventLoading.style.display =
                "none";
        }


        showMessage(
            "No fue posible cargar la información del evento.",
            "error"
        );
    }
}


/* =====================================================
   ESTADO FAVORITO
===================================================== */

async function refreshFavoriteState() {

    if (!favoriteButton) {
        return;
    }


    if (
        !currentUser ||
        !currentEvent
    ) {

        favoriteState =
            false;


        favoriteButton.textContent =
            "☆ Guardar en favoritos";


        favoriteButton.classList.remove(
            "saved"
        );

        return;
    }


    try {

        const realEventId =
            currentEvent.firestoreId ||
            currentEvent.id ||
            eventId;


        favoriteState =
            await isFavorite(
                currentUser.uid,
                realEventId
            );


        favoriteButton.textContent =
            favoriteState
                ? "★ Guardado en favoritos"
                : "☆ Guardar en favoritos";


        favoriteButton.classList.toggle(
            "saved",
            favoriteState
        );

    } catch (error) {

        console.warn(
            "OTIUM - No fue posible comprobar favorito:",
            error
        );
    }
}


/* =====================================================
   FAVORITOS
===================================================== */

async function toggleFavorite() {

    if (!currentUser) {

        showMessage(
            "Debes iniciar sesión para guardar favoritos.",
            "warning"
        );

        return;
    }


    if (!currentEvent) {
        return;
    }


    const realEventId =
        currentEvent.firestoreId ||
        currentEvent.id ||
        eventId;


    try {

        favoriteButton.disabled =
            true;


        if (favoriteState) {

            await removeFavorite(
                currentUser.uid,
                realEventId
            );


            favoriteState =
                false;


            favoriteButton.textContent =
                "☆ Guardar en favoritos";


            favoriteButton.classList.remove(
                "saved"
            );

        } else {

            await addFavorite(
                currentUser.uid,
                realEventId
            );


            favoriteState =
                true;


            favoriteButton.textContent =
                "★ Guardado en favoritos";


            favoriteButton.classList.add(
                "saved"
            );
        }

    } catch (error) {

        console.error(
            "OTIUM - Error modificando favorito:",
            error
        );


        showMessage(
            "No fue posible actualizar favoritos.",
            "error"
        );

    } finally {

        favoriteButton.disabled =
            false;
    }
}


/* =====================================================
   COMPARTIR
===================================================== */

async function shareEvent() {

    if (!currentEvent) {
        return;
    }


    const title =
        firstValue(
            currentEvent,
            [
                "nombre",
                "title",
                "name"
            ]
        ) ||
        "Evento OTIUM";


    const url =
        window.location.href;


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    title,

                text:
                    `Mira este evento en OTIUM: ${title}`,

                url:
                    url
            });

            return;
        }


        if (
            navigator.clipboard
        ) {

            await navigator.clipboard.writeText(
                url
            );


            showMessage(
                "Enlace copiado al portapapeles.",
                "success"
            );

            return;
        }


        showMessage(
            "No fue posible copiar el enlace.",
            "error"
        );

    } catch (error) {

        if (
            error?.name === "AbortError"
        ) {
            return;
        }


        console.warn(
            "OTIUM - No fue posible compartir:",
            error
        );


        showMessage(
            "No fue posible compartir el evento.",
            "error"
        );
    }
}


/* =====================================================
   EVENTOS DE BOTONES
===================================================== */

if (favoriteButton) {

    favoriteButton.addEventListener(
        "click",
        toggleFavorite
    );
}


if (shareButton) {

    shareButton.addEventListener(
        "click",
        shareEvent
    );
}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        currentUser =
            user || null;


        console.log(
            "OTIUM: estado de autenticación:",
            currentUser
                ? currentUser.uid
                : "sin usuario"
        );


        if (!currentEvent) {
            return;
        }


        const ownerId =
            firstValue(
                currentEvent,
                [
                    "usuarioId",
                    "userId",
                    "ownerId"
                ]
            );


        const realEventId =
            currentEvent.firestoreId ||
            currentEvent.id ||
            eventId;


        const isOwner =
            Boolean(
                currentUser &&
                ownerId &&
                ownerId === currentUser.uid
            );


        /* =================================================
           PROMOCIÓN
        ================================================= */

        if (promoteButton) {

            if (isOwner) {

                promoteButton.style.display =
                    "inline-flex";

                promoteButton.href =
                    `promocionar-evento.html?id=${encodeURIComponent(realEventId)}`;

            } else {

                promoteButton.style.display =
                    "none";
            }
        }


        /* =================================================
           INVITACIÓN
        ================================================= */

        if (invitationButton) {

            if (isOwner) {

                invitationButton.style.display =
                    "inline-flex";

                invitationButton.href =
                    `event-invitation-QR.html?id=${encodeURIComponent(realEventId)}`;

            } else {

                invitationButton.style.display =
                    "none";
            }
        }


        /* =================================================
           FAVORITOS
        ================================================= */

        await refreshFavoriteState();
    }
);


/* =====================================================
   INICIAR
===================================================== */

loadEvent();