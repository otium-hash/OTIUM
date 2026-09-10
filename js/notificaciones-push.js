/* =====================================================
   OTIUM - NOTIFICACIONES PUSH
   Archivo: js/notificaciones-push.js
   Versión: 20260903

   Funciones:
   - Solicitar permiso de notificaciones
   - Obtener token FCM
   - Registrar Service Worker
   - Guardar token en Firestore
   - Activar / desactivar Push
   - Consultar estado Push
   - Sincronizar estado con Service Worker
   - Mostrar mensajes Push cuando OTIUM está abierta

   IMPORTANTE:
   - No solicita permiso automáticamente al cargar.
   - El usuario debe pulsar "Activar notificaciones".
   - Desactivar Push NO elimina preferencias ni recordatorios.
===================================================== */


/* =====================================================
   FIREBASE
===================================================== */

import {
    getApps,
    getApp,
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";


import {
    getMessaging,
    getToken,
    onMessage
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";


import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


import {
    auth
} from "./modules/auth.js";


import {
    firebaseConfig
} from "./modules/firebase-config.js";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const VAPID_KEY =
    "BDRAK6wGDKWhI7YT18zU7MY_tGrEQXxWDV1Sz5shEF5NJZWCOCVZ2qNMPIDwF1U4TrzjBCNGI_wgc0boBijcFJo";


const SERVICE_WORKER_PATH =
    "/firebase-messaging-sw.js";


/* =====================================================
   ESTADO INTERNO
===================================================== */

let messaging = null;

let db = null;

let firebaseInicializado = false;

let pushOTIUMActivo = false;


/* =====================================================
   INICIALIZAR FIREBASE
===================================================== */

function inicializarFirebase() {

    try {

        let app;

        if (
            getApps().length > 0
        ) {

            app =
                getApp();

        } else {

            app =
                initializeApp(
                    firebaseConfig
                );

        }


        messaging =
            getMessaging(app);


        db =
            getFirestore(app);


        firebaseInicializado =
            true;


        console.log(
            "[OTIUM Push] Firebase inicializado correctamente."
        );


        return true;

    } catch (error) {

        console.error(
            "[OTIUM Push] Error inicializando Firebase:",
            error
        );


        firebaseInicializado =
            false;


        return false;

    }

}


/* =====================================================
   INICIALIZAR AL CARGAR EL MÓDULO
===================================================== */

inicializarFirebase();


/* =====================================================
   GENERAR ID DETERMINISTA DEL TOKEN
===================================================== */

async function generarIdToken(token) {

    if (
        !token
    ) {

        throw new Error(
            "Token FCM vacío."
        );

    }


    const encoder =
        new TextEncoder();


    const datos =
        encoder.encode(token);


    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            datos
        );


    const hashArray =
        Array.from(
            new Uint8Array(
                hashBuffer
            )
        );


    const hash =
        hashArray
            .map(
                byte =>
                    byte
                        .toString(16)
                        .padStart(2, "0")
            )
            .join("");


    return "fcm_" + hash;

}


/* =====================================================
   REGISTRAR SERVICE WORKER
===================================================== */

async function registrarServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {

        console.warn(
            "[OTIUM Push] Service Worker no disponible."
        );


        return null;

    }


    try {

        /*
           Primero comprobamos si ya existe
           el Service Worker.
        */

        const registroExistente =
            await navigator.serviceWorker.getRegistration(
                SERVICE_WORKER_PATH
            );


        if (
            registroExistente
        ) {

            console.log(
                "[OTIUM Push] Service Worker ya registrado."
            );


            /*
               Esperamos a que exista un worker activo.
            */

            if (
                !registroExistente.active
            ) {

                await registroExistente.update();

            }


            return registroExistente;

        }


        /*
           Registrar Service Worker nuevo.
        */

        const registro =
            await navigator.serviceWorker.register(
                SERVICE_WORKER_PATH,
                {
                    scope: "/"
                }
            );


        console.log(
            "[OTIUM Push] Service Worker registrado."
        );


        /*
           Esperar a que quede activo.
        */

        if (
            !registro.active
        ) {

            await new Promise(
                function(resolve) {

                    const comprobar =
                        setInterval(
                            function() {

                                if (
                                    registro.active
                                ) {

                                    clearInterval(
                                        comprobar
                                    );


                                    resolve();

                                }

                            },
                            100
                        );


                        /*
                           Evitar espera indefinida.
                        */

                        setTimeout(
                            function() {

                                clearInterval(
                                    comprobar
                                );


                                resolve();

                            },
                            10000
                        );

                }
            );

        }


        return registro;

    } catch (error) {

        console.error(
            "[OTIUM Push] Error registrando Service Worker:",
            error
        );


        return null;

    }

}


/* =====================================================
   SINCRONIZAR ESTADO CON SERVICE WORKER
===================================================== */

function sincronizarEstadoConServiceWorker(
    activo
) {

    try {

        if (
            !("serviceWorker" in navigator)
        ) {

            return;

        }


        navigator.serviceWorker
            .getRegistration(
                SERVICE_WORKER_PATH
            )
            .then(
                function(registration) {

                    if (
                        !registration
                    ) {

                        console.warn(
                            "[OTIUM Push] No existe registro del Service Worker."
                        );


                        return;

                    }


                    const worker =
                        registration.active ||
                        registration.waiting ||
                        registration.installing;


                    if (
                        !worker
                    ) {

                        console.warn(
                            "[OTIUM Push] No existe Worker disponible para sincronizar."
                        );


                        return;

                    }


                    worker.postMessage({

                        tipo:
                            "OTIUM_PUSH_ESTADO",

                        activo:
                            activo === true

                    });


                    console.log(
                        "[OTIUM Push] Estado sincronizado con Service Worker:",
                        activo === true
                    );

                }
            )
            .catch(
                function(error) {

                    console.warn(
                        "[OTIUM Push] No se pudo sincronizar estado con Service Worker:",
                        error
                    );

                }
            );

    } catch (error) {

        console.warn(
            "[OTIUM Push] Error sincronizando estado:",
            error
        );

    }

}


/* =====================================================
   GUARDAR TOKEN FCM EN FIRESTORE
===================================================== */

async function guardarTokenFCM(
    token,
    user
) {

    if (
        !token ||
        !user
    ) {

        throw new Error(
            "Token FCM o usuario no disponible."
        );

    }


    if (
        !db
    ) {

        throw new Error(
            "Firestore no está inicializado."
        );

    }


    const tokenId =
        await generarIdToken(
            token
        );


    const tokenRef =
        doc(
            db,
            "usuarios",
            user.uid,
            "notificaciones",
            tokenId
        );


    const datos = {

        tipo:
            "fcm_token",

        usuarioId:
            user.uid,

        token:
            token,

        plataforma:
            "web",

        navegador:
            navigator.userAgent,

        activo:
            true,

        actualizadoEn:
            serverTimestamp()

    };


    await setDoc(
        tokenRef,
        datos,
        {
            merge: true
        }
    );


    /*
       Estado interno.
    */

    pushOTIUMActivo =
        true;


    /*
       Informar al Service Worker
       que Push está activo.
    */

    sincronizarEstadoConServiceWorker(
        true
    );


    console.log(
        "[OTIUM Push] Token guardado correctamente:",
        tokenId
    );


    return tokenId;

}


/* =====================================================
   ACTIVAR NOTIFICACIONES PUSH
===================================================== */

async function activarNotificacionesPush() {

    try {

        /* ---------------------------------------------
           Comprobar navegador
        --------------------------------------------- */

        if (
            !("Notification" in window)
        ) {

            return {

                ok:
                    false,

                mensaje:
                    "Este navegador no admite notificaciones Push."

            };

        }


        /* ---------------------------------------------
           Comprobar Service Worker
        --------------------------------------------- */

        if (
            !("serviceWorker" in navigator)
        ) {

            return {

                ok:
                    false,

                mensaje:
                    "Este navegador no permite Service Workers."

            };

        }


        /* ---------------------------------------------
           Comprobar Firebase
        --------------------------------------------- */

        if (
            !firebaseInicializado ||
            !messaging ||
            !db
        ) {

            if (
                !inicializarFirebase()
            ) {

                return {

                    ok:
                        false,

                    mensaje:
                        "No fue posible inicializar Firebase."

                };

            }

        }


        /* ---------------------------------------------
           Comprobar usuario
        --------------------------------------------- */

        const user =
            auth.currentUser;


        if (
            !user
        ) {

            return {

                ok:
                    false,

                mensaje:
                    "Debes iniciar sesión para activar las notificaciones."

            };

        }


        /* ---------------------------------------------
           Permiso actual
        --------------------------------------------- */

        let permiso =
            Notification.permission;


        /*
           Solo solicitamos permiso si está
           en estado "default".
        */

        if (
            permiso === "default"
        ) {

            permiso =
                await Notification.requestPermission();

        }


        /* ---------------------------------------------
           Permiso rechazado
        --------------------------------------------- */

        if (
            permiso !== "granted"
        ) {

            pushOTIUMActivo =
                false;


            sincronizarEstadoConServiceWorker(
                false
            );


            if (
                permiso === "denied"
            ) {

                return {

                    ok:
                        false,

                    mensaje:
                        "Las notificaciones están bloqueadas en este navegador."

                };

            }


            return {

                ok:
                    false,

                mensaje:
                    "No se concedió permiso para las notificaciones."

            };

        }


        /* ---------------------------------------------
           Registrar Service Worker
        --------------------------------------------- */

        const registration =
            await registrarServiceWorker();


        if (
            !registration
        ) {

            return {

                ok:
                    false,

                mensaje:
                    "No fue posible registrar el sistema de notificaciones."

            };

        }


        /* ---------------------------------------------
           Obtener token FCM
        --------------------------------------------- */

        const token =
            await getToken(
                messaging,
                {

                    vapidKey:
                        VAPID_KEY,

                    serviceWorkerRegistration:
                        registration

                }
            );


        if (
            !token
        ) {

            return {

                ok:
                    false,

                mensaje:
                    "Firebase no pudo generar el token de notificaciones."

            };

        }


        /* ---------------------------------------------
           Guardar token
        --------------------------------------------- */

        const tokenId =
            await guardarTokenFCM(
                token,
                user
            );


        /*
           Aseguramos nuevamente que el
           Service Worker conozca el estado.
        */

        sincronizarEstadoConServiceWorker(
            true
        );


        return {

            ok:
                true,

            mensaje:
                "Notificaciones activadas correctamente.",

            tokenId:
                tokenId

        };

    } catch (error) {

        console.error(
            "[OTIUM Push] Error activando notificaciones:",
            error
        );


        return {

            ok:
                false,

            mensaje:
                "No fue posible activar las notificaciones.",

            error:
                error

        };

    }

}


/* =====================================================
   DESACTIVAR NOTIFICACIONES PUSH
===================================================== */

async function desactivarNotificacionesPush() {

    try {

        /*
           Primero desactivamos el estado local
           para evitar que lleguen notificaciones
           mientras se actualiza Firestore.
        */

        pushOTIUMActivo =
            false;


        /*
           Informar inmediatamente al
           Service Worker.
        */

        sincronizarEstadoConServiceWorker(
            false
        );


        /* ---------------------------------------------
           Comprobar Firebase
        --------------------------------------------- */

        if (
            !firebaseInicializado ||
            !db
        ) {

            return true;

        }


        /* ---------------------------------------------
           Comprobar usuario
        --------------------------------------------- */

        const user =
            auth.currentUser;


        if (
            !user
        ) {

            return true;

        }


        /* ---------------------------------------------
           Si no hay permiso concedido
        --------------------------------------------- */

        if (
            !("Notification" in window) ||
            Notification.permission !== "granted"
        ) {

            return true;

        }


        /* ---------------------------------------------
           Obtener registro del Service Worker
        --------------------------------------------- */

        const registration =
            await navigator.serviceWorker.getRegistration(
                SERVICE_WORKER_PATH
            );


        if (
            !registration
        ) {

            return true;

        }


        /* ---------------------------------------------
           Obtener token FCM actual
        --------------------------------------------- */

        let token = null;


        try {

            token =
                await getToken(
                    messaging,
                    {
                        vapidKey:
                            VAPID_KEY,

                        serviceWorkerRegistration:
                            registration
                    }
                );

        } catch (error) {

            console.warn(
                "[OTIUM Push] No fue posible recuperar token al desactivar:",
                error
            );

        }


        if (
            !token
        ) {

            return true;

        }


        /* ---------------------------------------------
           Generar ID del token
        --------------------------------------------- */

        const tokenId =
            await generarIdToken(
                token
            );


        /* ---------------------------------------------
           Referencia Firestore
        --------------------------------------------- */

        const tokenRef =
            doc(
                db,
                "usuarios",
                user.uid,
                "notificaciones",
                tokenId
            );


        /*
           No eliminamos el documento.

           Solo marcamos el token como inactivo.
        */

        await setDoc(
            tokenRef,
            {

                activo:
                    false,

                desactivadoEn:
                    serverTimestamp(),

                actualizadoEn:
                    serverTimestamp()

            },
            {
                merge:
                    true
            }
        );


        /*
           Volvemos a enviar el estado al
           Service Worker después de Firestore.
        */

        sincronizarEstadoConServiceWorker(
            false
        );


        console.log(
            "[OTIUM Push] Notificaciones desactivadas."
        );


        return true;

    } catch (error) {

        console.error(
            "[OTIUM Push] Error desactivando notificaciones:",
            error
        );


        /*
           Aunque Firestore falle, mantenemos
           el estado local desactivado.
        */

        pushOTIUMActivo =
            false;


        sincronizarEstadoConServiceWorker(
            false
        );


        return false;

    }

}


/* =====================================================
   OBTENER ESTADO DE NOTIFICACIONES PUSH
===================================================== */

async function obtenerEstadoNotificacionesPush() {

    try {

        const estado = {

            disponible:
                "Notification" in window &&
                "serviceWorker" in navigator,

            permiso:
                "Notification" in window
                    ? Notification.permission
                    : "unsupported",

            activo:
                false,

            autenticado:
                !!auth.currentUser,

            tokenId:
                null

        };


        /* ---------------------------------------------
           Comprobar disponibilidad
        --------------------------------------------- */

        if (
            !estado.disponible
        ) {

            pushOTIUMActivo =
                false;


            return estado;

        }


        /* ---------------------------------------------
           Comprobar autenticación
        --------------------------------------------- */

        const user =
            auth.currentUser;


        if (
            !user
        ) {

            pushOTIUMActivo =
                false;


            return estado;

        }


        /* ---------------------------------------------
           Permiso del navegador
        --------------------------------------------- */

        if (
            Notification.permission !==
            "granted"
        ) {

            pushOTIUMActivo =
                false;


            sincronizarEstadoConServiceWorker(
                false
            );


            return estado;

        }


        /* ---------------------------------------------
           Firebase
        --------------------------------------------- */

        if (
            !firebaseInicializado ||
            !messaging ||
            !db
        ) {

            if (
                !inicializarFirebase()
            ) {

                return estado;

            }

        }


        /* ---------------------------------------------
           Registrar / localizar SW
        --------------------------------------------- */

        const registration =
            await registrarServiceWorker();


        if (
            !registration
        ) {

            return estado;

        }


        /* ---------------------------------------------
           Obtener token actual
        --------------------------------------------- */

        let token = null;


        try {

            token =
                await getToken(
                    messaging,
                    {

                        vapidKey:
                            VAPID_KEY,

                        serviceWorkerRegistration:
                            registration

                    }
                );

        } catch (error) {

            console.warn(
                "[OTIUM Push] No fue posible obtener token:",
                error
            );


            return estado;

        }


        if (
            !token
        ) {

            return estado;

        }


        /* ---------------------------------------------
           ID token
        --------------------------------------------- */

        const tokenId =
            await generarIdToken(
                token
            );


        estado.tokenId =
            tokenId;


        /* ---------------------------------------------
           Consultar Firestore
        --------------------------------------------- */

        const tokenRef =
            doc(
                db,
                "usuarios",
                user.uid,
                "notificaciones",
                tokenId
            );


        const tokenSnapshot =
            await getDoc(
                tokenRef
            );


        if (
            tokenSnapshot.exists()
        ) {

            const datos =
                tokenSnapshot.data();


            estado.activo =
                datos.activo === true;

        } else {

            /*
               Si todavía no existe el token
               en Firestore, está inactivo.
            */

            estado.activo =
                false;

        }


        /* ---------------------------------------------
           Sincronizar estado interno
        --------------------------------------------- */

        pushOTIUMActivo =
            estado.activo === true;


        /*
           Sincronizar con Service Worker.
        */

        sincronizarEstadoConServiceWorker(
            estado.activo
        );


        console.log(
            "[OTIUM Push] Estado actual:",
            estado
        );


        return estado;

    } catch (error) {

        console.error(
            "[OTIUM Push] Error obteniendo estado:",
            error
        );


        pushOTIUMActivo =
            false;


        return {

            disponible:
                "Notification" in window &&
                "serviceWorker" in navigator,

            permiso:
                "Notification" in window
                    ? Notification.permission
                    : "unsupported",

            activo:
                false,

            autenticado:
                !!auth.currentUser,

            tokenId:
                null,

            error:
                error

        };

    }

}


/* =====================================================
   COMPROBAR SI PUEDE MOSTRAR PUSH
===================================================== */

async function puedeMostrarNotificacionPush() {

    /*
       Si el estado interno ya está apagado,
       no mostrar.
    */

    if (
        pushOTIUMActivo !== true
    ) {

        return false;

    }


    /*
       Usuario autenticado.
    */

    if (
        !auth.currentUser
    ) {

        return false;

    }


    /*
       Permiso del navegador.
    */

    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {

        return false;

    }


    /*
       Confirmar estado real en Firestore.
    */

    try {

        const estado =
            await obtenerEstadoNotificacionesPush();


        return (
            estado.activo === true
        );

    } catch (error) {

        console.warn(
            "[OTIUM Push] No fue posible verificar estado:",
            error
        );


        return false;

    }

}


/* =====================================================
   MENSAJES PUSH CUANDO OTIUM ESTÁ ABIERTA
===================================================== */

function configurarMensajesEnPrimerPlano() {

    if (
        !messaging
    ) {

        return;

    }


    onMessage(
        messaging,
        async function(payload) {

            console.log(
                "[OTIUM Push] Mensaje recibido en primer plano:",
                payload
            );


            /*
               Comprobar si Push sigue activo.
            */

            const permitido =
                await puedeMostrarNotificacionPush();


            if (
                !permitido
            ) {

                console.log(
                    "[OTIUM Push] Mensaje ignorado: Push desactivado."
                );


                return;

            }


            const notification =
                payload.notification || {};


            const data =
                payload.data || {};


            const titulo =
                notification.title ||
                data.titulo ||
                data.title ||
                "OTIUM";


            const cuerpo =
                notification.body ||
                data.body ||
                data.mensaje ||
                "Tienes un nuevo aviso de OTIUM.";


            const icono =
                notification.icon ||
                data.icon ||
                "/assets/icono.png";


            /*
               Mostrar solo si el navegador
               permite notificaciones.
            */

            try {

                new Notification(
                    titulo,
                    {

                        body:
                            cuerpo,

                        icon:
                            icono,

                        data: {

                            url:
                                data.url ||
                                data.click_action ||
                                "/centro-avisos.html",

                            eventId:
                                data.eventId ||
                                data.eventoId ||
                                "",

                            avisoId:
                                data.avisoId ||
                                ""

                        }

                    }
                );

            } catch (error) {

                console.error(
                    "[OTIUM Push] Error mostrando notificación:",
                    error
                );

            }

        }
    );

}


/* =====================================================
   CONFIGURAR MENSAJES
===================================================== */

configurarMensajesEnPrimerPlano();


/* =====================================================
   ESTADO DE AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async function(user) {

        if (
            user
        ) {

            console.log(
                "[OTIUM Push] Usuario autenticado:",
                user.uid
            );


            /*
               Consultar estado Push del usuario.
            */

            try {

                await obtenerEstadoNotificacionesPush();

            } catch (error) {

                console.warn(
                    "[OTIUM Push] Error comprobando estado después del login:",
                    error
                );

            }

        } else {

            console.log(
                "[OTIUM Push] Usuario no autenticado."
            );


            pushOTIUMActivo =
                false;


            /*
               Si no hay usuario,
               no se deben mostrar Push en
               primer plano.
            */

            sincronizarEstadoConServiceWorker(
                false
            );

        }

    }
);


/* =====================================================
   EXPORTACIONES
===================================================== */

export {

    generarIdToken,

    registrarServiceWorker,

    activarNotificacionesPush,

    desactivarNotificacionesPush,

    obtenerEstadoNotificacionesPush,

    puedeMostrarNotificacionPush,

    sincronizarEstadoConServiceWorker

};