import {
    getEvents
} from "./modules/database.js";


/* =========================================================
   OTIUM - MAPA COMPLETO

   Utiliza la misma lógica de ubicación que el mapa del index:
   - Coordenadas existentes en el evento.
   - Geocodificación mediante Nominatim/OpenStreetMap
     cuando las coordenadas no existen.
   - Caché en localStorage para evitar consultas repetidas.
   - La ubicación del usuario tiene prioridad para centrar
     el mapa.
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const GEOCODING_CACHE_KEY =
    "otium_geocoding_cache_v1";

const GEOCODING_DELAY = 1200;

const DEFAULT_LATITUDE = -33.4489;
const DEFAULT_LONGITUDE = -70.6693;

const DEFAULT_ZOOM = 5;
const USER_ZOOM = 12;


/* =========================================================
   UTILIDADES
========================================================= */

function esperar(ms) {

    return new Promise(
        resolve => {
            setTimeout(
                resolve,
                ms
            );
        }
    );

}


/* =========================================================
   CACHE DE GEOCODIFICACIÓN
========================================================= */

function cargarCacheGeocodificacion() {

    try {

        const contenido =
            localStorage.getItem(
                GEOCODING_CACHE_KEY
            );

        if (!contenido) {
            return {};
        }

        const cache =
            JSON.parse(
                contenido
            );

        if (
            !cache ||
            typeof cache !== "object" ||
            Array.isArray(cache)
        ) {

            return {};

        }

        return cache;

    } catch (error) {

        console.warn(
            "OTIUM - No fue posible leer cache de geocodificación:",
            error
        );

        return {};

    }

}


function guardarCacheGeocodificacion(cache) {

    try {

        localStorage.setItem(
            GEOCODING_CACHE_KEY,
            JSON.stringify(cache)
        );

    } catch (error) {

        console.warn(
            "OTIUM - No fue posible guardar cache de geocodificación:",
            error
        );

    }

}


/* =========================================================
   NORMALIZAR TEXTO
========================================================= */

function normalizarTexto(valor) {

    return String(
        valor || ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================================
   OBTENER COORDENADAS EXISTENTES
========================================================= */

function obtenerCoordenadasExistentes(evento) {

    if (!evento) {
        return null;
    }

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

        return null;

    }

    if (
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {

        return null;

    }

    return {
        lat,
        lng
    };

}


/* =========================================================
   OBTENER CAMPOS DE UBICACIÓN
========================================================= */

function obtenerDatosUbicacion(evento) {

    if (!evento) {

        return {
            direccion: "",
            ciudad: "",
            comuna: "",
            region: ""
        };

    }

    const direccion =
        normalizarTexto(
            evento.direccion ||
            evento.address ||
            ""
        );

    const ciudad =
        normalizarTexto(
            evento.ciudad ||
            evento.city ||
            ""
        );

    const comuna =
        normalizarTexto(
            evento.comuna ||
            ""
        );

    const region =
        normalizarTexto(
            evento.region ||
            ""
        );

    return {
        direccion,
        ciudad,
        comuna,
        region
    };

}


/* =========================================================
   CONSTRUIR CONSULTAS DE GEOCODIFICACIÓN
========================================================= */

function construirConsultasGeocodificacion(evento) {

    const {
        direccion,
        ciudad,
        comuna,
        region
    } =
        obtenerDatosUbicacion(
            evento
        );

    const consultas = [];


    /* -----------------------------------------------------
       1. Dirección completa
    ----------------------------------------------------- */

    const consultaCompleta = [
        direccion,
        ciudad,
        comuna,
        region,
        "Chile"
    ]
        .filter(Boolean)
        .join(", ");

    if (
        direccion &&
        ciudad
    ) {

        consultas.push(
            consultaCompleta
        );

    }


    /* -----------------------------------------------------
       2. Dirección + ciudad + región
    ----------------------------------------------------- */

    if (
        direccion &&
        ciudad &&
        region
    ) {

        const consultaDireccionRegion = [
            direccion,
            ciudad,
            region,
            "Chile"
        ]
            .filter(Boolean)
            .join(", ");

        if (
            !consultas.includes(
                consultaDireccionRegion
            )
        ) {

            consultas.push(
                consultaDireccionRegion
            );

        }

    }


    /* -----------------------------------------------------
       3. Ciudad + comuna + región
    ----------------------------------------------------- */

    if (ciudad) {

        const consultaCiudad = [
            ciudad,
            comuna,
            region,
            "Chile"
        ]
            .filter(Boolean)
            .join(", ");

        if (
            !consultas.includes(
                consultaCiudad
            )
        ) {

            consultas.push(
                consultaCiudad
            );

        }

    }


    /* -----------------------------------------------------
       4. Ciudad + región
    ----------------------------------------------------- */

    if (
        ciudad &&
        region
    ) {

        const consultaCiudadRegion = [
            ciudad,
            region,
            "Chile"
        ]
            .filter(Boolean)
            .join(", ");

        if (
            !consultas.includes(
                consultaCiudadRegion
            )
        ) {

            consultas.push(
                consultaCiudadRegion
            );

        }

    }


    /* -----------------------------------------------------
       5. Ciudad + Chile
    ----------------------------------------------------- */

    if (
        ciudad &&
        !region
    ) {

        const consultaSoloCiudad = [
            ciudad,
            "Chile"
        ]
            .filter(Boolean)
            .join(", ");

        if (
            !consultas.includes(
                consultaSoloCiudad
            )
        ) {

            consultas.push(
                consultaSoloCiudad
            );

        }

    }


    return consultas;

}


/* =========================================================
   CONSULTAR NOMINATIM
========================================================= */

async function consultarNominatim(consulta) {

    if (!consulta) {
        return null;
    }

    const cache =
        cargarCacheGeocodificacion();

    const cacheKey =
        normalizarTexto(
            consulta
        ).toLowerCase();


    /* -----------------------------------------------------
       CACHE
    ----------------------------------------------------- */

    if (
        Object.prototype.hasOwnProperty.call(
            cache,
            cacheKey
        )
    ) {

        const resultadoCache =
            cache[cacheKey];

        if (
            resultadoCache &&
            Number.isFinite(
                Number(
                    resultadoCache.lat
                )
            ) &&
            Number.isFinite(
                Number(
                    resultadoCache.lng
                )
            )
        ) {

            return {
                lat: Number(
                    resultadoCache.lat
                ),
                lng: Number(
                    resultadoCache.lng
                )
            };

        }

        if (
            resultadoCache &&
            resultadoCache.notFound === true
        ) {

            return null;

        }

    }


    /* -----------------------------------------------------
       ESPERA PARA NOMINATIM
    ----------------------------------------------------- */

    await esperar(
        GEOCODING_DELAY
    );


    try {

        const url =
            "https://nominatim.openstreetmap.org/search?" +
            new URLSearchParams({

                format: "jsonv2",

                limit: "1",

                countrycodes: "cl",

                q: consulta

            });


        const respuesta =
            await fetch(
                url,
                {
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!respuesta.ok) {

            console.warn(
                "OTIUM - Nominatim respondió:",
                respuesta.status,
                consulta
            );

            return null;

        }


        const resultados =
            await respuesta.json();


        if (
            !Array.isArray(
                resultados
            ) ||
            !resultados.length
        ) {

            cache[cacheKey] = {
                notFound: true,
                timestamp: Date.now()
            };

            guardarCacheGeocodificacion(
                cache
            );

            return null;

        }


        const resultado =
            resultados[0];


        const lat =
            Number(
                resultado.lat
            );

        const lng =
            Number(
                resultado.lon
            );


        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            return null;

        }


        const coordenadas = {
            lat,
            lng
        };


        cache[cacheKey] = {
            lat,
            lng,
            timestamp: Date.now()
        };


        guardarCacheGeocodificacion(
            cache
        );


        return coordenadas;

    } catch (error) {

        console.warn(
            "OTIUM - Error consultando Nominatim:",
            consulta,
            error
        );

        return null;

    }

}


/* =========================================================
   GEOCODIFICAR EVENTO
========================================================= */

async function geocodificarEvento(evento) {

    /* -----------------------------------------------------
       1. Usar coordenadas existentes
    ----------------------------------------------------- */

    const coordenadasExistentes =
        obtenerCoordenadasExistentes(
            evento
        );

    if (coordenadasExistentes) {

        return coordenadasExistentes;

    }


    /* -----------------------------------------------------
       2. Construir consultas
    ----------------------------------------------------- */

    const consultas =
        construirConsultasGeocodificacion(
            evento
        );

    if (!consultas.length) {

        return null;

    }


    /* -----------------------------------------------------
       3. Intentar consultas
    ----------------------------------------------------- */

    for (
        const consulta of consultas
    ) {

        const coordenadas =
            await consultarNominatim(
                consulta
            );

        if (coordenadas) {

            return coordenadas;

        }

    }


    return null;

}


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
       podemos cargar los eventos y geocodificarlos.
    */

    const promesaUbicacionUsuario =
        obtenerUbicacionUsuario();


    try {

        const eventos =
            await getEvents();


        const bounds = [];

        let marcadores = 0;

        let eventosSinUbicacion = 0;


        /* -------------------------------------------------
           PROCESAR EVENTOS
        ------------------------------------------------- */

        for (
            const evento of eventos
        ) {

            const coordenadas =
                await geocodificarEvento(
                    evento
                );


            if (!coordenadas) {

                eventosSinUbicacion++;

                continue;

            }


            const lat =
                coordenadas.lat;

            const lng =
                coordenadas.lng;


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


            const direccion =
                evento.direccion ||
                evento.address ||
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

            const marker =
                L.marker(
                    [
                        lat,
                        lng
                    ]
                )
                    .addTo(map);


            const metaCiudad =
                ciudad
                    ? escapeHtml(
                        ciudad
                    )
                    : "";


            const metaDireccion =
                direccion
                    ? `
                        <div>
                            ${escapeHtml(direccion)}
                        </div>
                      `
                    : "";


            const metaFecha =
                fecha
                    ? `
                        <div>
                            ${escapeHtml(fecha)}
                        </div>
                      `
                    : "";


            marker.bindPopup(
                `
                <div class="map-popup-title">
                    ${escapeHtml(titulo)}
                </div>

                <div class="map-popup-meta">

                    ${metaCiudad}

                    ${metaDireccion}

                    ${metaFecha}

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

            if (marcadores > 0) {

                if (
                    eventosSinUbicacion > 0
                ) {

                    status.textContent =
                        `${marcadores} eventos con ubicación · ${eventosSinUbicacion} sin ubicación`;

                } else {

                    status.textContent =
                        `${marcadores} eventos con ubicación`;

                }

            } else {

                status.textContent =
                    "Mapa disponible · los eventos aparecerán cuando tengan una ubicación válida";

            }

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