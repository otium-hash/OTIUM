const css = document.createElement("link");
css.rel = "stylesheet";
css.href = "css/map.css";
document.head.appendChild(css);


/* =========================================================
   OTIUM - MAPA EN HOME
   Geolocalización de eventos mediante coordenadas
   existentes o Nominatim / OpenStreetMap.

   IMPORTANTE:
   - No modifica Firestore.
   - No modifica database.js.
   - No modifica eventos.js.
   - Las coordenadas encontradas se guardan solamente
     en localStorage para evitar repetir consultas.
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const GEOCODING_CACHE_KEY = "otium_geocoding_cache_v1";

/*
   Nominatim solicita no realizar consultas masivas
   ni simultáneas.

   Dejamos aproximadamente 1,2 segundos entre consultas
   nuevas que no estén en caché.
*/

const GEOCODING_DELAY = 1200;


/* =========================================================
   UTILIDADES
========================================================= */

function esperar(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });

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

        const cache = JSON.parse(contenido);

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

    return String(valor || "")
        .trim()
        .replace(/\s+/g, " ");

}


/* =========================================================
   OBTENER COORDENADAS EXISTENTES
========================================================= */

function obtenerCoordenadasExistentes(evento) {

    if (!evento) {
        return null;
    }


    const lat = Number(
        evento.latitud ??
        evento.latitude ??
        evento.lat
    );


    const lng = Number(
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


    /*
       Validación básica para evitar coordenadas
       imposibles.
    */

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


    const direccion = normalizarTexto(
        evento.direccion ||
        evento.address ||
        ""
    );


    const ciudad = normalizarTexto(
        evento.ciudad ||
        evento.city ||
        ""
    );


    const comuna = normalizarTexto(
        evento.comuna ||
        ""
    );


    const region = normalizarTexto(
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
    } = obtenerDatosUbicacion(evento);


    const consultas = [];


    /*
       1. Dirección completa.
    */

    const consultaCompleta = [
        direccion,
        ciudad,
        comuna,
        region,
        "Chile"
    ]
        .filter(Boolean)
        .join(", ");


    if (direccion && ciudad) {

        consultas.push(
            consultaCompleta
        );

    }


    /*
       2. Dirección + ciudad + región.
       Puede funcionar mejor cuando la comuna
       viene vacía o no es reconocida.
    */

    if (direccion && ciudad && region) {

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


    /*
       3. Ciudad + comuna + región.
    */

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


    /*
       4. Último respaldo:
          solamente ciudad + región.
    */

    if (ciudad && region) {

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


    /*
       5. Si solamente existe ciudad,
          todavía podemos intentar ciudad + Chile.
    */

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


    const cache = cargarCacheGeocodificacion();


    /*
       La clave se basa en la consulta exacta.
    */

    const cacheKey =
        normalizarTexto(consulta)
            .toLowerCase();


    /*
       Si ya tenemos resultado en cache,
       no hacemos una nueva petición.
    */

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
                Number(resultadoCache.lat)
            ) &&
            Number.isFinite(
                Number(resultadoCache.lng)
            )
        ) {

            return {
                lat: Number(resultadoCache.lat),
                lng: Number(resultadoCache.lng)
            };

        }


        /*
           También guardamos resultados fallidos
           para no repetir continuamente una consulta
           que Nominatim no pudo resolver.
        */

        if (
            resultadoCache &&
            resultadoCache.notFound === true
        ) {

            return null;

        }

    }


    /*
       Esperamos antes de realizar una consulta
       nueva a Nominatim.
    */

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


        const respuesta = await fetch(
            url,
            {
                headers: {
                    "Accept": "application/json"
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
            !Array.isArray(resultados) ||
            !resultados.length
        ) {

            /*
               Guardamos que esta búsqueda no
               encontró resultados.
            */

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
            Number(resultado.lat);


        const lng =
            Number(resultado.lon);


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


        /*
           Guardar resultado en cache.
        */

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

    /*
       1. Si ya existen coordenadas,
          utilizarlas directamente.
    */

    const coordenadasExistentes =
        obtenerCoordenadasExistentes(
            evento
        );


    if (coordenadasExistentes) {

        return coordenadasExistentes;

    }


    /*
       2. Construir diferentes niveles
          de búsqueda.
    */

    const consultas =
        construirConsultasGeocodificacion(
            evento
        );


    if (!consultas.length) {

        return null;

    }


    /*
       3. Intentar cada consulta hasta
          encontrar una ubicación válida.
    */

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
   CARGAR EVENTOS EN EL MAPA
========================================================= */

async function cargarEventosMapa() {

    const mapElement =
        document.getElementById(
            "homeMap"
        );


    const status =
        document.getElementById(
            "homeMapStatus"
        );


    if (
        !mapElement ||
        typeof L === "undefined"
    ) {

        return;

    }


    /*
       Crear mapa.
    */

    const map =
        L.map(
            mapElement,
            {
                scrollWheelZoom: false,
                zoomControl: true
            }
        ).setView(
            [-33.4489, -70.6693],
            5
        );


    /*
       OpenStreetMap.
    */

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    let eventos = [];


    /*
       Cargar eventos desde Firestore.
    */

    try {

        const modulo =
            await import(
                "./modules/database.js"
            );


        eventos =
            await modulo.getEvents();


    } catch (error) {

        console.error(
            "Mapa OTIUM: no fue posible cargar eventos:",
            error
        );


        if (status) {

            status.textContent =
                "Mapa disponible. No fue posible cargar los eventos.";

        }


        return;

    }


    /*
       Aseguramos que eventos sea un array.
    */

    if (!Array.isArray(eventos)) {

        eventos = [];

    }


    const bounds = [];

    let marcadores = 0;

    let eventosSinUbicacion = 0;


    /*
       Procesar eventos uno por uno.
       Esto permite utilizar await para
       la geocodificación.
    */

    for (
        const evento of eventos
    ) {

        /*
           Obtener coordenadas existentes
           o geocodificar automáticamente.
        */

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


        /*
           Datos del evento.
        */

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


        /*
           Crear marcador.
        */

        const marker =
            L.marker(
                [lat, lng]
            ).addTo(map);


        /*
           Construir información del popup.
        */

        const metaCiudad =
            ciudad
                ? escapeHtml(ciudad)
                : "";


        const metaDireccion =
            direccion
                ? `<div>${escapeHtml(direccion)}</div>`
                : "";


        const metaFecha =
            fecha
                ? `<div>${escapeHtml(fecha)}</div>`
                : "";


        marker.bindPopup(`

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

        `);


        /*
           Agregar coordenadas a los límites
           del mapa.
        */

        bounds.push(
            [lat, lng]
        );


        marcadores++;

    }


    /* =====================================================
       AJUSTAR MAPA A LOS EVENTOS
    ===================================================== */

    if (bounds.length) {

        map.fitBounds(
            bounds,
            {
                padding: [30, 30],
                maxZoom: 13
            }
        );

    }


    /* =====================================================
       ESTADO DEL MAPA
    ===================================================== */

    if (status) {

        if (marcadores > 0) {

            if (eventosSinUbicacion > 0) {

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


    /*
       Leaflet necesita recalcular el tamaño
       cuando el contenedor está dentro de una
       sección que puede haber terminado de renderizar.
    */

    setTimeout(
        () => map.invalidateSize(),
        250
    );

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")

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
   INICIO
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        cargarEventosMapa
    );

} else {

    cargarEventosMapa();

}