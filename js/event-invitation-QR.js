/* =====================================================
   OTIUM
   INVITACIÓN PÚBLICA
   event-invitation-QR.js
===================================================== */

import {
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    db
} from "./modules/database.js";


/* =====================================================
   ELEMENTOS
===================================================== */

const loading =
    document.getElementById("loading");

const error =
    document.getElementById("error");

const errorText =
    document.getElementById("errorText");

const content =
    document.getElementById("content");

const invitationTitle =
    document.getElementById("invitationTitle");

const eventName =
    document.getElementById("eventName");

const invitationMessage =
    document.getElementById("invitationMessage");

const eventDate =
    document.getElementById("eventDate");

const eventTime =
    document.getElementById("eventTime");

const eventCity =
    document.getElementById("eventCity");

const eventLocation =
    document.getElementById("eventLocation");

const accessValue =
    document.getElementById("accessValue");

const accessPrice =
    document.getElementById("accessPrice");

const attendance =
    document.getElementById("attendance");

const attendanceButton =
    document.getElementById("attendanceButton");

const eventLink =
    document.getElementById("eventLink");

const eventLinkButton =
    document.getElementById("eventLinkButton");


/* =====================================================
   OBTENER ID DE LA INVITACIÓN
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const invitationId =
    params.get("id");


/* =====================================================
   FUNCIONES AUXILIARES
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
   FORMATEAR FECHA
===================================================== */

function formatDate(value) {

    const fecha =
        clean(value);

    if (!fecha) {

        return "Por confirmar";

    }


    /*
     * YYYY-MM-DD
     */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {

        const partes =
            fecha.split("-");

        return `${partes[2]}-${partes[1]}-${partes[0]}`;

    }


    return fecha;

}


/* =====================================================
   MOSTRAR ERROR
===================================================== */

function mostrarError(
    mensaje
) {

    loading.style.display =
        "none";

    content.classList.remove(
        "visible"
    );

    errorText.textContent =
        mensaje;

    error.classList.add(
        "visible"
    );

}


/* =====================================================
   CARGAR INVITACIÓN
===================================================== */

async function cargarInvitacion() {

    /*
     * Comprobar ID
     */

    if (!invitationId) {

        mostrarError(
            "No se proporcionó el código de la invitación."
        );

        return;

    }


    try {

        console.log(
            "OTIUM - ID invitación:",
            invitationId
        );


        /* =================================================
           BUSCAR INVITACIÓN
        ================================================= */

        const invitationRef =
            doc(
                db,
                "invitaciones",
                invitationId
            );


        const invitationSnapshot =
            await getDoc(
                invitationRef
            );


        if (
            !invitationSnapshot.exists()
        ) {

            mostrarError(
                "La invitación no existe o ya no está disponible."
            );

            return;

        }


        const invitacion =
            invitationSnapshot.data();


        console.log(
            "OTIUM - Invitación:",
            invitacion
        );


        /* =================================================
           OBTENER EVENTO ID
        ================================================= */

        const eventoId =
            clean(
                invitacion.eventoId ||
                invitacion.eventId
            );


        if (!eventoId) {

            mostrarError(
                "La invitación no tiene asociado un evento válido."
            );

            return;

        }


        /* =================================================
           BUSCAR EVENTO
        ================================================= */

        const eventoRef =
            doc(
                db,
                "eventos",
                eventoId
            );


        const eventoSnapshot =
            await getDoc(
                eventoRef
            );


        if (
            !eventoSnapshot.exists()
        ) {

            mostrarError(
                "El evento asociado a esta invitación ya no está disponible."
            );

            return;

        }


        const evento = {

            firestoreId:
                eventoSnapshot.id,

            ...eventoSnapshot.data()

        };


        console.log(
            "OTIUM - Evento asociado:",
            evento
        );


        /* =================================================
           MOSTRAR INVITACIÓN
        ================================================= */

        mostrarInvitacion(
            invitacion,
            evento
        );


    } catch (
        errorException
    ) {

        console.error(
            "OTIUM - Error cargando invitación:",
            errorException
        );


        mostrarError(
            "Ocurrió un error al cargar la invitación."
        );

    }

}


/* =====================================================
   MOSTRAR INVITACIÓN
===================================================== */

function mostrarInvitacion(
    invitacion,
    evento
) {

    /* =================================================
       DATOS DE LA INVITACIÓN
    ================================================= */

    const titulo =
        clean(
            invitacion.titulo ||
            invitacion.title
        );


    const mensaje =
        clean(
            invitacion.mensaje ||
            invitacion.message
        );


    /* =================================================
       DATOS DEL EVENTO
    ================================================= */

    const nombreEvento =
        clean(
            evento.nombre ||
            evento.title ||
            evento.name
        ) ||
        "Evento";


    const fecha =
        evento.fecha ||
        evento.date ||
        "";


    const hora =
        clean(
            evento.hora ||
            evento.time
        );


    const ciudad =
        clean(
            evento.ciudad ||
            evento.city
        );


    const lugar =
        clean(
            evento.ubicacion ||
            evento.direccion ||
            evento.address
        );


    /* =================================================
       TÍTULO
    ================================================= */

    invitationTitle.textContent =
        titulo ||
        "¡Estás invitado!";


    /* =================================================
       EVENTO
    ================================================= */

    eventName.textContent =
        nombreEvento;


    /* =================================================
       MENSAJE
    ================================================= */

    invitationMessage.textContent =
        mensaje ||
        `Te invitamos a participar de ${nombreEvento}. ¡Esperamos contar contigo!`;


    /* =================================================
       FECHA
    ================================================= */

    eventDate.textContent =
        formatDate(
            fecha
        );


    /* =================================================
       HORA
    ================================================= */

    eventTime.textContent =
        hora ||
        "Por confirmar";


    /* =================================================
       CIUDAD
    ================================================= */

    eventCity.textContent =
        ciudad ||
        "Por confirmar";


    /* =================================================
       LUGAR
    ================================================= */

    eventLocation.textContent =
        lugar ||
        "Por confirmar";


    /* =================================================
       ACCESO
    ================================================= */

    mostrarAcceso(
        evento
    );


    /* =================================================
       CONFIRMACIÓN
    ================================================= */

    mostrarConfirmacion(
        invitacion,
        evento
    );


    /* =================================================
       ENLACE DEL EVENTO
    ================================================= */

    mostrarEnlaceEvento(
        evento
    );


    /* =================================================
       MOSTRAR CONTENIDO
    ================================================= */

    loading.style.display =
        "none";

    error.classList.remove(
        "visible"
    );

    content.classList.add(
        "visible"
    );

}


/* =====================================================
   MOSTRAR ACCESO
===================================================== */

function mostrarAcceso(
    evento
) {

    /*
     * Compatibilidad con las estructuras
     * actuales de OTIUM.
     */

    const esGratis =
        evento.entradaGratuita === true
        ||
        evento.ticketing?.modalidad === "gratuita"
        ||
        evento.ticketing?.tipo === "gratuita";


    if (esGratis) {

        accessValue.textContent =
            "🆓 Entrada gratuita";

        accessPrice.textContent =
            "";

        return;

    }


    accessValue.textContent =
        "🎟️ Entrada pagada";


    const precio =
        clean(
            evento.precio ||
            evento.ticketing?.precio ||
            evento.valorEntrada ||
            evento.price
        );


    if (precio) {

        accessPrice.textContent =
            `Precio: ${precio}`;

    } else {

        accessPrice.textContent =
            "Consulta el precio con el organizador.";

    }

}


/* =====================================================
   MOSTRAR CONFIRMACIÓN
===================================================== */

function mostrarConfirmacion(
    invitacion,
    evento
) {

    /*
     * La información puede estar
     * directamente en la invitación
     * o en la estructura anterior
     * del evento.
     */

    const requiereConfirmacion =
        invitacion.requiereConfirmacion === true
        ||
        evento.asistencia?.requiereConfirmacion === true;


    let urlConfirmacion =
        clean(
            invitacion.urlConfirmacion
        );


    if (!urlConfirmacion) {

        urlConfirmacion =
            clean(
                evento.asistencia?.urlConfirmacion
            );

    }


    urlConfirmacion =
        normalizeUrl(
            urlConfirmacion
        );


    /*
     * Mostrar solamente si existe
     * una confirmación configurada.
     */

    if (
        requiereConfirmacion &&
        urlConfirmacion
    ) {

        attendanceButton.href =
            urlConfirmacion;

        attendance.classList.add(
            "visible"
        );

    } else {

        attendance.classList.remove(
            "visible"
        );

    }

}


/* =====================================================
   MOSTRAR ENLACE DEL EVENTO
===================================================== */

function mostrarEnlaceEvento(
    evento
) {

    const enlace =
        normalizeUrl(
            evento.enlaceEvento ||
            evento.ticketing?.urlExterna ||
            evento.urlEvento ||
            evento.link ||
            ""
        );


    if (enlace) {

        eventLinkButton.href =
            enlace;

        eventLink.classList.add(
            "visible"
        );

    } else {

        eventLink.classList.remove(
            "visible"
        );

    }

}


/* =====================================================
   INICIAR
===================================================== */

cargarInvitacion();