/* =====================================================
   OTIUM - FIREBASE MESSAGING SERVICE WORKER
   Archivo: firebase-messaging-sw.js
   Versión: 20260903

   Funciones:
   - Recibir notificaciones Firebase Cloud Messaging
   - Mostrar notificaciones cuando OTIUM está
     en segundo plano
   - Respetar ON/OFF de notificaciones OTIUM
   - Abrir OTIUM al hacer clic
   - Mantener el estado ON/OFF aunque la página
     esté cerrada

   IMPORTANTE:
   Este archivo debe estar en la RAÍZ del sitio.
===================================================== */


/* =====================================================
   FIREBASE COMPAT
===================================================== */

importScripts(
    "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js"
);


/* =====================================================
   CONFIGURACIÓN FIREBASE
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
   CONFIGURACIÓN ESTADO PUSH OTIUM
===================================================== */

const DB_NAME =
    "otium-push";

const DB_VERSION =
    1;

const STORE_NAME =
    "estado";

const ESTADO_ID =
    "push";


/* =====================================================
   INDEXED DB
===================================================== */

function abrirBaseDatos() {

    return new Promise(
        function(resolve, reject) {

            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );


            request.onupgradeneeded =
                function(event) {

                    const db =
                        event.target.result;


                    if (
                        !db.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {

                        db.createObjectStore(
                            STORE_NAME,
                            {
                                keyPath: "id"
                            }
                        );

                    }

                };


            request.onsuccess =
                function() {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                function() {

                    reject(
                        request.error
                    );

                };

        }
    );

}


/* =====================================================
   GUARDAR ESTADO PUSH
===================================================== */

function guardarEstadoPush(activo) {

    return abrirBaseDatos()

        .then(
            function(db) {

                return new Promise(
                    function(resolve, reject) {

                        const transaction =
                            db.transaction(
                                STORE_NAME,
                                "readwrite"
                            );


                        const store =
                            transaction.objectStore(
                                STORE_NAME
                            );


                        store.put({

                            id:
                                ESTADO_ID,

                            activo:
                                activo === true,

                            actualizado:
                                Date.now()

                        });


                        transaction.oncomplete =
                            function() {

                                db.close();

                                resolve();

                            };


                        transaction.onerror =
                            function() {

                                db.close();

                                reject(
                                    transaction.error
                                );

                            };

                    }
                );

            }
        );

}


/* =====================================================
   OBTENER ESTADO PUSH
===================================================== */

function obtenerEstadoPush() {

    return abrirBaseDatos()

        .then(
            function(db) {

                return new Promise(
                    function(resolve, reject) {

                        const transaction =
                            db.transaction(
                                STORE_NAME,
                                "readonly"
                            );


                        const store =
                            transaction.objectStore(
                                STORE_NAME
                            );


                        const request =
                            store.get(
                                ESTADO_ID
                            );


                        request.onsuccess =
                            function() {

                                db.close();


                                /*
                                   Si nunca se configuró
                                   el estado, mantenemos
                                   compatibilidad y
                                   permitimos mostrar.
                                */

                                if (
                                    !request.result
                                ) {

                                    resolve(true);

                                    return;

                                }


                                resolve(
                                    request.result.activo === true
                                );

                            };


                        request.onerror =
                            function() {

                                db.close();


                                /*
                                   Ante un error de
                                   almacenamiento,
                                   mantenemos el
                                   comportamiento anterior.
                                */

                                resolve(true);

                            };

                    }
                );

            }
        )

        .catch(
            function() {

                return true;

            }
        );

}


/* =====================================================
   MENSAJES DESDE LA PÁGINA OTIUM
===================================================== */

self.addEventListener(
    "message",
    function(event) {

        const datos =
            event.data || {};


        if (
            datos.tipo !==
            "OTIUM_PUSH_ESTADO"
        ) {

            return;

        }


        const activo =
            datos.activo === true;


        console.log(
            "[OTIUM Push] Estado recibido:",
            activo ? "ACTIVO" : "INACTIVO"
        );


        guardarEstadoPush(activo)

            .then(
                function() {

                    console.log(
                        "[OTIUM Push] Estado guardado:",
                        activo
                    );

                }
            )

            .catch(
                function(error) {

                    console.error(
                        "[OTIUM Push] Error guardando estado:",
                        error
                    );

                }
            );

    }
);


/* =====================================================
   NOTIFICACIÓN RECIBIDA EN SEGUNDO PLANO
===================================================== */

messaging.onBackgroundMessage(
    async function(payload) {

        console.log(
            "[OTIUM Push] Mensaje recibido:",
            payload
        );


        /*
           =================================================
           COMPROBAR SI OTIUM TIENE PUSH ACTIVADO
           =================================================
        */

        const pushActivo =
            await obtenerEstadoPush();


        if (
            pushActivo !== true
        ) {

            console.log(
                "[OTIUM Push] Notificación ignorada: Push desactivado."
            );

            return;

        }


        /* =================================================
           DATOS DE LA NOTIFICACIÓN
        ================================================= */

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


        const badge =
            data.badge ||
            "/assets/icono.png";


        let url =
            data.url ||
            data.click_action ||
            "/centro-avisos.html";


        /* =================================================
           VALIDACIÓN DE URL
        ================================================= */

        try {

            const urlObjeto =
                new URL(
                    url,
                    self.location.origin
                );


            if (
                urlObjeto.origin !==
                self.location.origin
            ) {

                url =
                    "/centro-avisos.html";

            }

        } catch (error) {

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
                badge,

            data: {

                url:
                    url,

                eventId:
                    data.eventId ||
                    data.eventoId ||
                    "",

                avisoId:
                    data.avisoId ||
                    ""

            },

            tag:
                data.tag ||
                "otium-aviso",

            renotify:
                true,

            requireInteraction:
                false

        };


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
   CLIC EN NOTIFICACIÓN
===================================================== */

self.addEventListener(
    "notificationclick",
    function(event) {

        console.log(
            "[OTIUM Push] Notificación seleccionada."
        );


        event.notification.close();


        const datos =
            event.notification.data || {};


        let url =
            datos.url ||
            "/centro-avisos.html";


        /* =================================================
           VALIDACIÓN DE SEGURIDAD
        ================================================= */

        try {

            const urlObjeto =
                new URL(
                    url,
                    self.location.origin
                );


            if (
                urlObjeto.origin !==
                self.location.origin
            ) {

                url =
                    "/centro-avisos.html";

            }

        } catch (error) {

            url =
                "/centro-avisos.html";

        }


        /* =================================================
           ABRIR / REUTILIZAR OTIUM
        ================================================= */

        event.waitUntil(

            clients.matchAll({

                type:
                    "window",

                includeUncontrolled:
                    true

            })

            .then(
                function(listaClientes) {


                    /*
                       Si OTIUM ya está abierta,
                       reutilizarla.
                    */

                    for (
                        const cliente
                        of listaClientes
                    ) {

                        if (
                            "focus" in cliente
                        ) {

                            return cliente
                                .navigate(url)
                                .then(
                                    function() {

                                        return cliente.focus();

                                    }
                                );

                        }

                    }


                    /*
                       Si OTIUM no está abierta,
                       abrir una nueva ventana.
                    */

                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            url
                        );

                    }


                    return null;

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
    function(event) {

        console.log(
            "[OTIUM Push] Service Worker instalado."
        );


        self.skipWaiting();

    }
);


/* =====================================================
   ACTIVACIÓN
===================================================== */

self.addEventListener(
    "activate",
    function(event) {

        console.log(
            "[OTIUM Push] Service Worker activado."
        );


        event.waitUntil(

            self.clients.claim()

        );

    }
);