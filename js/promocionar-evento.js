/* =====================================================
   OTIUM ADS
   PROMOCIONAR EVENTO
   OTIUM 13.0
===================================================== */

import { auth } from "./modules/auth.js";

import {
    db
} from "./modules/firebase-config.js";

import {
    getEventById
} from "./modules/database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* =====================================================
   LINKS DE MERCADO PAGO
===================================================== */

const PAYMENT_LINKS = {

    basico:
        "https://mpago.li/2AFDuzt",

    destacado:
        "https://mpago.li/1KSEkCc",

    premium:
        "https://mpago.li/2ewvvjW",

    personalizado:
        "https://link.mercadopago.cl/otium"

};


/* =====================================================
   PLANES OTIUM ADS
===================================================== */

const PLANS = {

    basico: {

        nombre:
            "OTIUM Ads Básico",

        precio:
            2990,

        dias:
            7,

        paymentLink:
            PAYMENT_LINKS.basico

    },


    destacado: {

        nombre:
            "OTIUM Ads Destacado",

        precio:
            5990,

        dias:
            15,

        paymentLink:
            PAYMENT_LINKS.destacado

    },


    premium: {

        nombre:
            "OTIUM Ads Premium",

        precio:
            9990,

        dias:
            30,

        paymentLink:
            PAYMENT_LINKS.premium

    },


    personalizado: {

        nombre:
            "OTIUM Ads Personalizado",

        precio:
            null,

        dias:
            null,

        paymentLink:
            PAYMENT_LINKS.personalizado

    }

};


/* =====================================================
   ELEMENTOS DE LA PÁGINA
===================================================== */

const eventName =
    document.getElementById(
        "eventName"
    );

const eventCity =
    document.getElementById(
        "eventCity"
    );

const eventDate =
    document.getElementById(
        "eventDate"
    );

const promotionMessage =
    document.getElementById(
        "promotionMessage"
    );


/* =====================================================
   OBTENER ID DEL EVENTO
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const eventId =
    params.get("id");


let currentEvent = null;


/* =====================================================
   MENSAJES
===================================================== */

function showMessage(
    text,
    type = ""
) {

    if (!promotionMessage) {
        return;
    }


    promotionMessage.textContent =
        text;


    promotionMessage.className =
        "promotion-message";


    if (type) {

        promotionMessage.classList.add(
            type
        );

    }

}


/* =====================================================
   CARGAR EVENTO
===================================================== */

async function loadEvent() {

    if (!eventId) {

        console.error(
            "OTIUM ADS: no se recibió ID del evento."
        );


        showMessage(
            "No se recibió el ID del evento.",
            "error"
        );


        return false;

    }


    try {

        console.log(
            "OTIUM ADS: cargando evento:",
            eventId
        );


        currentEvent =
            await getEventById(
                eventId
            );


        if (!currentEvent) {

            console.error(
                "OTIUM ADS: evento no encontrado:",
                eventId
            );


            showMessage(
                "No se encontró el evento.",
                "error"
            );


            return false;

        }


        console.log(
            "OTIUM ADS: evento cargado:",
            currentEvent
        );


        /* ---------------------------------------------
           NOMBRE
        --------------------------------------------- */

        if (eventName) {

            eventName.textContent =
                currentEvent.nombre ||
                currentEvent.title ||
                "Evento";

        }


        /* ---------------------------------------------
           CIUDAD
        --------------------------------------------- */

        if (eventCity) {

            const ciudad =
                currentEvent.ciudad ||
                currentEvent.city ||
                "Sin ciudad";


            eventCity.textContent =
                "📍 " + ciudad;

        }


        /* ---------------------------------------------
           FECHA
        --------------------------------------------- */

        if (eventDate) {

            const fecha =
                currentEvent.fecha ||
                currentEvent.date ||
                "Sin fecha";


            eventDate.textContent =
                "📅 " + fecha;

        }


        return true;

    }
    catch (error) {

        console.error(
            "OTIUM ADS: error cargando evento:",
            error
        );


        showMessage(
            "No fue posible cargar el evento.",
            "error"
        );


        return false;

    }

}


/* =====================================================
   CREAR SOLICITUD DE PROMOCIÓN
===================================================== */

async function registerPromotion(
    planId
) {

    /* ---------------------------------------------
       FIRESTORE
    --------------------------------------------- */

    if (!db) {

        throw new Error(
            "La conexión con Firestore no está disponible."
        );

    }


    /* ---------------------------------------------
       USUARIO
    --------------------------------------------- */

    if (!auth.currentUser) {

        throw new Error(
            "Usuario no autenticado."
        );

    }


    /* ---------------------------------------------
       EVENTO
    --------------------------------------------- */

    if (!eventId) {

        throw new Error(
            "No existe ID del evento."
        );

    }


    /* ---------------------------------------------
       PLAN
    --------------------------------------------- */

    const plan =
        PLANS[planId];


    if (!plan) {

        throw new Error(
            "Plan no válido."
        );

    }


    /* =================================================
       DATOS DE LA PROMOCIÓN
    ================================================= */

    const promotionData = {

        eventoId:
            eventId,

        usuarioId:
            auth.currentUser.uid,

        usuarioEmail:
            auth.currentUser.email ||
            "",

        estado:
            "pendiente_pago",

        pagoEstado:
            "pendiente",

        plan:
            planId,

        nombrePlan:
            plan.nombre,

        tipoPromocion:
            plan.precio !== null
                ? "carrusel"
                : "personalizada",

        precio:
            plan.precio,

        duracionDias:
            plan.dias,

        paymentLink:
            plan.paymentLink,

        fechaSolicitud:
            serverTimestamp()

    };


    /* =================================================
       DIAGNÓSTICO
    ================================================= */

    console.log(
        "OTIUM ADS: usuario autenticado:",
        auth.currentUser.uid
    );


    console.log(
        "OTIUM ADS: proyecto Firestore:",
        "otium-e0e7e"
    );


    console.log(
        "OTIUM ADS: colección:",
        "promociones"
    );


    console.log(
        "OTIUM ADS: creando promoción:",
        promotionData
    );


    /* =================================================
       CREAR DOCUMENTO

       promociones/{promocionId}
    ================================================= */

    const promotionRef =
        await addDoc(
            collection(
                db,
                "promociones"
            ),
            promotionData
        );


    console.log(
        "OTIUM ADS: promoción creada correctamente:",
        promotionRef.id
    );


    return {

        ...plan,

        promocionId:
            promotionRef.id

    };

}


/* =====================================================
   PROCESAR PAGO
===================================================== */

async function processPayment(
    planId,
    button
) {

    /* ---------------------------------------------
       AUTENTICACIÓN
    --------------------------------------------- */

    if (!auth.currentUser) {

        showMessage(
            "Debes iniciar sesión para promocionar un evento.",
            "error"
        );


        return;

    }


    /* ---------------------------------------------
       EVENTO
    --------------------------------------------- */

    if (!currentEvent) {

        showMessage(
            "El evento todavía no está disponible.",
            "error"
        );


        return;

    }


    /* ---------------------------------------------
       PLAN
    --------------------------------------------- */

    const plan =
        PLANS[planId];


    if (!plan) {

        showMessage(
            "El plan seleccionado no es válido.",
            "error"
        );


        return;

    }


    /* ---------------------------------------------
       EVITAR DOBLE CLIC
    --------------------------------------------- */

    if (button) {

        if (
            button.disabled
        ) {

            return;

        }


        button.disabled =
            true;


        button.dataset.originalText =
            button.textContent;


        button.textContent =
            "Preparando pago...";

    }


    try {

        /* -----------------------------------------
           MENSAJE
        ----------------------------------------- */

        showMessage(
            "Registrando tu solicitud...",
            "loading"
        );


        /* -----------------------------------------
           REGISTRAR PROMOCIÓN
        ----------------------------------------- */

        const registeredPlan =
            await registerPromotion(
                planId
            );


        console.log(
            "OTIUM ADS: solicitud registrada:",
            registeredPlan
        );


        /* -----------------------------------------
           CONFIRMACIÓN
        ----------------------------------------- */

        showMessage(
            "Solicitud registrada. Abriendo Mercado Pago...",
            "success"
        );


        /* -----------------------------------------
           ABRIR MERCADO PAGO
        ----------------------------------------- */

        setTimeout(
            function () {

                window.location.href =
                    registeredPlan.paymentLink;

            },
            500
        );

    }
    catch (error) {

        console.error(
            "OTIUM ADS: error procesando pago:",
            error
        );


        /* -----------------------------------------
           MENSAJE DE ERROR
        ----------------------------------------- */

        showMessage(
            "No fue posible iniciar el pago. Revisa tu conexión e inténtalo nuevamente.",
            "error"
        );


        /* -----------------------------------------
           RESTAURAR BOTÓN
        ----------------------------------------- */

        if (button) {

            button.disabled =
                false;


            button.textContent =
                button.dataset.originalText ||
                "Elegir plan";

        }

    }

}


/* =====================================================
   INICIALIZAR BOTONES
===================================================== */

function initializeButtons() {

    const buttons =
        document.querySelectorAll(
            ".plan-button[data-plan]"
        );


    console.log(
        "OTIUM ADS: botones encontrados:",
        buttons.length
    );


    buttons.forEach(
        function (button) {

            /* -----------------------------------------
               EVITAR DUPLICAR EVENTOS
            ----------------------------------------- */

            if (
                button.dataset.otiumReady ===
                "true"
            ) {

                return;

            }


            button.dataset.otiumReady =
                "true";


            /* -----------------------------------------
               CLICK
            ----------------------------------------- */

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    processPayment(
                        button.dataset.plan,
                        button
                    );

                }
            );

        }
    );

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async function (user) {

        console.log(
            "OTIUM ADS: estado de autenticación:",
            user
                ? user.uid
                : "NO AUTENTICADO"
        );


        /* ---------------------------------------------
           USUARIO NO AUTENTICADO
        --------------------------------------------- */

        if (!user) {

            showMessage(
                "Debes iniciar sesión para promocionar un evento.",
                "error"
            );


            return;

        }


        /* ---------------------------------------------
           CARGAR EVENTO
        --------------------------------------------- */

        const loaded =
            await loadEvent();


        if (!loaded) {

            return;

        }


        /* ---------------------------------------------
           ACTIVAR BOTONES
        --------------------------------------------- */

        initializeButtons();

    }
);