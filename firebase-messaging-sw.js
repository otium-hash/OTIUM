
/* =====================================================
   OTIUM - FIREBASE MESSAGING SERVICE WORKER
   Archivo: firebase-messaging-sw.js
   Versión: 20260902

   Funciones:
   - Recibir notificaciones FCM en segundo plano
   - Mostrar notificaciones del sistema
   - Abrir OTIUM al hacer clic
   - Abrir el detalle de un evento cuando corresponde
   - Manejar mensajes enviados mediante notification/data
===================================================== */


/* =====================================================
   IMPORTAR FIREBASE COMPAT
===================================================== */

importScripts(
    "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js"
);


/* =====================================================
   CONFIGURACIÓN FIREBASE OTIUM
===================================================== */

firebase.initializeApp({

    apiKey:
        "AIzaSyAn33voku5AiWtQzIlaSPYKEG7d4nA-dTI",

    authDomain:
        "otium-e0e7e.firebaseapp.com",

    projectId:
        "otium-e0e7e",

    storageBucket:
        "otium-e0e7e.firebasestorage.app",

    messagingSenderId:
        "175356882678",

    appId:
        "1:175356882678:web:65673abbcab96d1e7746d7"

});


/* =====================================================
   FIREBASE MESSAGING
===================================================== */

const messaging =
    firebase.messaging();



/* =====================================================
   MENSAJE EN SEGUNDO PLANO
===================================================== */

messaging.onBackgroundMessage(
    payload => {

        console.log(
            "OTIUM - Mensaje FCM recibido en segundo plano:",
            payload
        );


        /* =================================================
           DATOS
        ================================================= */

        const notification =
            payload.notification || {};

        const data =
            payload.data || {};


        /* =================================================
           TÍTULO
        ================================================= */

        const titulo =
            notification.title ||
            data.title ||
            "OTIUM";


        /* =================================================
           CUERPO
        ================================================= */

        const cuerpo =
            notification.body ||
            data.body ||
            "Tienes un nuevo aviso de OTIUM.";


        /* =================================================
           ICONO
        ================================================= */

        const icono =
            notification.icon ||
            data.icon ||
            "/favicon.ico";


        /* =================================================
           IMAGEN
        ================================================= */

        const imagen =
            notification.image ||
            data.image ||
            null;


        /* =================================================
           EVENTO
        ================================================= */

        const eventoId =
            data.eventoId ||
            data.eventId ||
            "";


        /* =================================================
           URL
        ================================================= */

        let url =
            data.url ||
            data.click_action ||
            "";


        /*
           Si no viene una URL pero existe un evento,
           dirigir al detalle del evento.
        */

        if (
            !url &&
            eventoId
        ) {

            url =
                "/event-details.html?id=" +
                encodeURIComponent(
                    eventoId
                );

        }


        /*
           Si no existe evento ni URL,
           utilizar el Centro de Avisos.
        */

        if (
            !url
        ) {

            url =
                "/centro-avisos.html";

        }


        /*
           Asegurar que la URL sea válida.
        */

        if (
            typeof url !== "string" ||
            !url.trim()
        ) {

            url =
                "/centro-avisos.html";

        }


        /* =================================================
           OPCIONES
        ================================================= */

        const opciones = {

            body:
                cuerpo,

            icon:
                icono,

            badge:
                "/favicon.ico",

            tag:
                data.tag ||
                (
                    eventoId
                        ? "otium-evento-" + eventoId
                        : "otium-aviso"
                ),

            renotify:
                true,

            data: {

                url:
                    url,

                eventoId:
                    eventoId,

                tipo:
                    data.tipo ||
                    "aviso"

            },

            requireInteraction:
                false

        };


        /* =================================================
           IMAGEN OPCIONAL
        ================================================= */

        if (
            imagen
        ) {

            opciones.image =
                imagen;

        }


        /* =================================================
           MOSTRAR NOTIFICACIÓN
        ================================================= */

        return self.registration.showNotification(
            titulo,
            opciones
        );

    }
);



/* =====================================================
   CLIC SOBRE NOTIFICACIÓN
===================================================== */

self.addEventListener(
    "notificationclick",
    event => {

        console.log(
            "OTIUM - Clic en notificación."
        );


        /*
           Cerrar la notificación.
        */

        event.notification.close();


        const datos =
            event.notification.data || {};


        let url =
            datos.url ||
            "";


        const eventoId =
            datos.eventoId ||
            "";


        /*
           Si existe evento y no hay URL específica,
           abrir detalle del evento.
        */

        if (
            !url &&
            eventoId
        ) {

            url =
                "/event-details.html?id=" +
                encodeURIComponent(
                    eventoId
                );

        }


        /*
           Destino por defecto.
        */

        if (
            !url
        ) {

            url =
                "/centro-avisos.html";

        }


        /*
           Convertir la ruta relativa en URL absoluta.
        */

        const destino =
            new URL(
                url,
                self.location.origin
            ).href;


        /* =================================================
           BUSCAR VENTANAS ABIERTAS
        ================================================= */

        event.waitUntil(

            clients.matchAll(
                {

                    type:
                        "window",

                    includeUncontrolled:
                        true

                }
            )
            .then(
                ventanas => {

                    /*
                       Buscar una ventana de OTIUM.
                    */

                    for (
                        const ventana of ventanas
                    ) {

                        if (
                            ventana.url.startsWith(
                                self.location.origin
                            )
                        ) {

                            /*
                               Navegar a la URL solicitada.
                            */

                            if (
                                "navigate" in ventana
                            ) {

                                return ventana
                                    .navigate(
                                        destino
                                    )
                                    .then(
                                        () =>
                                            ventana.focus()
                                    );

                            }


                            if (
                                "focus" in ventana
                            ) {

                                return ventana.focus();

                            }

                        }

                    }


                    /*
                       Si OTIUM no está abierto,
                       abrirlo.
                    */

                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            destino
                        );

                    }

                }
            )
            .catch(
                error => {

                    console.error(
                        "OTIUM - Error al abrir notificación:",
                        error
                    );

                }
            )

        );

    }
);



/* =====================================================
   INSTALACIÓN
===================================================== */

self.addEventListener(
    "install",
    event => {

        console.log(
            "OTIUM - Service Worker instalado."
        );


        /*
           Activar inmediatamente la nueva versión.
        */

        self.skipWaiting();

    }
);



/* =====================================================
   ACTIVACIÓN
===================================================== */

self.addEventListener(
    "activate",
    event => {

        console.log(
            "OTIUM - Service Worker activado."
        );


        /*
           Tomar control inmediatamente de las páginas.
        */

        event.waitUntil(
            self.clients.claim()
        );

    }
);



/* =====================================================
   MENSAJES DE CONTROL
===================================================== */

self.addEventListener(
    "message",
    event => {

        if (
            event.data &&
            event.data.type ===
            "OTIUM_TEST"
        ) {

            console.log(
                "OTIUM - Mensaje de prueba recibido correctamente."

            );

        }

    }
);
