import {
    getEvents
} from "./modules/database.js";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const DEFAULT_LATITUDE = -33.4489;
const DEFAULT_LONGITUDE = -70.6693;

const DEFAULT_ZOOM = 5;
const USER_ZOOM = 12;


/* =========================================================
   CREAR MAPA
========================================================= */

const map =
    L.map(
        "otiumMap",
        {
            scrollWheelZoom: true
        }
    ).setView(
        [
            DEFAULT_LATITUDE,
            DEFAULT_LONGITUDE
        ],
        DEFAULT_ZOOM
    );


/* =========================================================
   OPENSTREETMAP
========================================================= */

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


const status =
    document.getElementById(
        "mapPageStatus"
    );


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   OBTENER UBICACIÓN DEL USUARIO
========================================================= */

function obtenerUbicacionUsuario() {

    return new Promise(
        resolve => {

            if (
                !navigator.geolocation
            ) {

                console.warn(
                    "OTIUM - La geolocalización no está disponible."
                );

                resolve(null);

                return;

            }


            navigator.geolocation.getCurrentPosition(

                position => {

                    const lat =
                        Number(
                            position.coords.latitude
                        );

                    const lng =
                        Number(
                            position.coords.longitude
                        );


                    if (
                        !Number.isFinite(lat) ||
                        !Number.isFinite(lng)
                    ) {

                        resolve(null);

                        return;

                    }


                    console.log(
                        "OTIUM - Ubicación del usuario:",
                        lat,
                        lng
                    );


                    resolve({
                        lat,
                        lng
                    });

                },

                error => {

                    console.warn(
                        "OTIUM - No fue posible obtener la ubicación del usuario:",
                        error
                    );

                    resolve(null);

                },

                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }

            );

        }
    );

}


/* =========================================================
   MARCADOR DE UBICACIÓN DEL USUARIO
========================================================= */

function agregarMarcadorUsuario(
    ubicacion
) {

    if (!ubicacion) {
        return;
    }


    const marcadorUsuario =
        L.marker(
            [
                ubicacion.lat,
                ubicacion.lng
            ]
        ).addTo(map);


    marcadorUsuario.bindPopup(
        `
        <div class="map-popup-title">
            Tu ubicación
        </div>
        `
    );

}


/* =========================================================
   CARGAR MAPA
========================================================= */

async function cargarMapa() {

    /*
       Solicitamos la ubicación inmediatamente.

       Mientras el navegador pregunta al usuario,
       podemos cargar los eventos.
    */

    const promesaUbicacionUsuario =
        obtenerUbicacionUsuario();


    try {

        const eventos =
            await getEvents();


        const bounds = [];

        let marcadores = 0;


        /* -------------------------------------------------
           PROCESAR EVENTOS
        ------------------------------------------------- */

        eventos.forEach(
            evento => {

                const lat =
                    Number(
                        evento.latitud ??
                        evento.latitude ??
                        evento.lat
                    );


                const lng =
                    Number(
                        evento.longitud ??
                        evento.longitude ??
                        evento.lng ??
                        evento.lon
                    );


                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng)
                ) {

                    return;

                }


                const titulo =
                    evento.title ||
                    evento.nombre ||
                    evento.nombreEvento ||
                    "Evento";


                const ciudad =
                    evento.city ||
                    evento.ciudad ||
                    evento.ubicacion ||
                    "";


                const fecha =
                    evento.date ||
                    evento.fecha ||
                    evento.fechaInicio ||
                    "";


                const id =
                    evento.firestoreId ||
                    evento.id ||
                    "";


                /* -----------------------------------------
                   MARCADOR DEL EVENTO
                ----------------------------------------- */

                L.marker(
                    [
                        lat,
                        lng
                    ]
                )
                    .addTo(map)
                    .bindPopup(
                        `
                        <div class="map-popup-title">
                            ${escapeHtml(titulo)}
                        </div>

                        <div class="map-popup-meta">
                            ${escapeHtml(ciudad)}
                            ${
                                fecha
                                    ? " · " +
                                      escapeHtml(fecha)
                                    : ""
                            }
                        </div>

                        ${
                            id
                                ? `
                                    <a
                                        class="map-popup-link"
                                        href="event-details.html?id=${encodeURIComponent(id)}"
                                    >
                                        Ver evento
                                    </a>
                                  `
                                : ""
                        }
                        `
                    );


                bounds.push(
                    [
                        lat,
                        lng
                    ]
                );


                marcadores++;

            }
        );


        /* =================================================
           UBICACIÓN DEL USUARIO
        ================================================= */

        const ubicacionUsuario =
            await promesaUbicacionUsuario;


        if (
            ubicacionUsuario
        ) {

            /*
               PRIORIDAD:
               CENTRAR EN EL USUARIO.
            */

            map.setView(
                [
                    ubicacionUsuario.lat,
                    ubicacionUsuario.lng
                ],
                USER_ZOOM
            );


            agregarMarcadorUsuario(
                ubicacionUsuario
            );


        } else if (
            bounds.length
        ) {

            /*
               RESPALDO:
               MOSTRAR TODOS LOS EVENTOS.
            */

            map.fitBounds(
                bounds,
                {
                    padding: [
                        35,
                        35
                    ],
                    maxZoom: 13
                }
            );


        } else {

            /*
               SIN UBICACIÓN DEL USUARIO
               Y SIN EVENTOS CON COORDENADAS.
            */

            map.setView(
                [
                    DEFAULT_LATITUDE,
                    DEFAULT_LONGITUDE
                ],
                DEFAULT_ZOOM
            );

        }


        /* =================================================
           ESTADO
        ================================================= */

        if (status) {

            status.textContent =
                marcadores
                    ? `${marcadores} eventos con ubicación`
                    : "Mapa disponible · faltan coordenadas en los eventos";

        }


    } catch (error) {

        console.error(
            "Error cargando mapa OTIUM:",
            error
        );


        /*
           Aunque fallen los eventos, todavía intentamos
           centrar el mapa en el usuario.
        */

        const ubicacionUsuario =
            await promesaUbicacionUsuario;


        if (
            ubicacionUsuario
        ) {

            map.setView(
                [
                    ubicacionUsuario.lat,
                    ubicacionUsuario.lng
                ],
                USER_ZOOM
            );


            agregarMarcadorUsuario(
                ubicacionUsuario
            );

        } else {

            map.setView(
                [
                    DEFAULT_LATITUDE,
                    DEFAULT_LONGITUDE
                ],
                DEFAULT_ZOOM
            );

        }


        if (status) {

            status.textContent =
                "No fue posible cargar los eventos del mapa.";

        }

    }


    /* =================================================
       INVALIDAR TAMAÑO DE LEAFLET
    ================================================= */

    setTimeout(
        () => {
            map.invalidateSize();
        },
        250
    );

}


/* =========================================================
   INICIAR
========================================================= */

cargarMapa();