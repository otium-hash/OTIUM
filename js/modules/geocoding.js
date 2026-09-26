/* =========================================================
   OTIUM - GEOCODIFICACIÓN
   Geoapify + OpenStreetMap

   Funciones principales:
   - Obtener coordenadas existentes
   - Geocodificar por dirección
   - Validar que la ciudad coincida
   - Fallback automático a ciudad
   - Fallback adicional a comuna
========================================================= */

import {
    GEOAPIFY_API_KEY
} from "./geocoding-config.js";


const GEOAPIFY_URL =
    "https://api.geoapify.com/v1/geocode/search";


/* =========================================================
   NORMALIZAR TEXTO
========================================================= */

function normalizarTexto(valor) {

    return String(valor ?? "")
        .trim()
        .replace(/\s+/g, " ");

}


/* =========================================================
   NORMALIZAR CIUDAD
   Permite comparar:
   Viña del Mar
   vina del mar
   VIÑA DEL MAR
========================================================= */

function normalizarCiudad(valor) {

    return normalizarTexto(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

}


/* =========================================================
   OBTENER COORDENADAS EXISTENTES
========================================================= */

export function obtenerCoordenadas(evento) {

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
   CONSTRUIR DIRECCIÓN COMPLETA
========================================================= */

function construirDireccion(evento) {

    if (!evento) {

        return "";

    }


    const direccion =
        normalizarTexto(
            evento.direccion ||
            evento.address
        );


    const ciudad =
        normalizarTexto(
            evento.ciudad ||
            evento.city
        );


    const comuna =
        normalizarTexto(
            evento.comuna
        );


    const region =
        normalizarTexto(
            evento.region
        );


    const partes = [];


    if (direccion) {

        partes.push(direccion);

    }


    if (ciudad) {

        partes.push(ciudad);

    }


    if (comuna) {

        partes.push(comuna);

    }


    if (region) {

        partes.push(region);

    }


    partes.push("Chile");


    return partes
        .filter(Boolean)
        .join(", ");

}


/* =========================================================
   CONSULTAR GEOAPIFY
========================================================= */

async function consultarGeoapify(
    texto,
    opciones = {}
) {

    if (!texto) {

        return null;

    }


    if (!GEOAPIFY_API_KEY) {

        console.warn(
            "OTIUM Geocoding: falta configurar la API Key de Geoapify."
        );

        return null;

    }


    const params = {

        text: texto,

        filter: "countrycode:cl",

        limit: "1",

        apiKey: GEOAPIFY_API_KEY

    };


    if (opciones.type) {

        params.type = opciones.type;

    }


    const url =
        GEOAPIFY_URL +
        "?" +
        new URLSearchParams(params);


    try {

        const respuesta =
            await fetch(url);


        if (!respuesta.ok) {

            console.warn(
                "OTIUM Geocoding: Geoapify respondió HTTP",
                respuesta.status
            );

            return null;

        }


        const datos =
            await respuesta.json();


        if (
            !datos ||
            !Array.isArray(datos.features) ||
            !datos.features.length
        ) {

            return null;

        }


        const feature =
            datos.features[0];


        const propiedades =
            feature.properties || {};


        const coordenadas =
            feature.geometry?.coordinates;


        if (
            !Array.isArray(coordenadas) ||
            coordenadas.length < 2
        ) {

            return null;

        }


        const lng =
            Number(coordenadas[0]);


        const lat =
            Number(coordenadas[1]);


        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            return null;

        }


        return {

            lat,

            lng,

            nombre:
                propiedades.name ||
                "",

            ciudad:
                propiedades.city ||
                "",

            region:
                propiedades.state ||
                "",

            direccion:
                propiedades.formatted ||
                "",

            tipo:
                propiedades.result_type ||
                "",

            confianza:
                Number(
                    propiedades.rank?.confidence ??
                    0
                )

        };

    } catch (error) {

        console.error(
            "OTIUM Geocoding: error consultando Geoapify:",
            error
        );

        return null;

    }

}


/* =========================================================
   GEOCODIFICAR EVENTO
========================================================= */

export async function geocodificarEvento(evento) {

    if (!evento) {

        return null;

    }


    /* -------------------------------------------------------
       1. COORDENADAS EXISTENTES

       Si el evento ya tiene latitud/longitud válidas,
       no hacemos ninguna consulta a Geoapify.
    ------------------------------------------------------- */

    const coordenadasExistentes =
        obtenerCoordenadas(evento);


    if (coordenadasExistentes) {

        return {

            ...coordenadasExistentes,

            origen: "existente"

        };

    }


    /* -------------------------------------------------------
       2. DATOS DE UBICACIÓN
    ------------------------------------------------------- */

    const direccion =
        normalizarTexto(
            evento.direccion ||
            evento.address
        );


    const ciudadSolicitada =
        normalizarTexto(
            evento.ciudad ||
            evento.city
        );


    const comunaSolicitada =
        normalizarTexto(
            evento.comuna
        );


    /* -------------------------------------------------------
       3. INTENTAR CON DIRECCIÓN COMPLETA
    ------------------------------------------------------- */

    if (direccion) {

        const consulta =
            construirDireccion(evento);


        const resultadoDireccion =
            await consultarGeoapify(
                consulta
            );


        if (resultadoDireccion) {

            const ciudadResultado =
                normalizarCiudad(
                    resultadoDireccion.ciudad
                );


            const ciudadEsperada =
                normalizarCiudad(
                    ciudadSolicitada
                );


            /* ------------------------------------------------
               Si conocemos la ciudad del evento y Geoapify
               devuelve otra ciudad, rechazamos el resultado.

               Ejemplo:

               Evento:
               Viña del Mar

               Geoapify:
               Valparaíso

               Resultado:
               DESCARTAR
            ------------------------------------------------ */

            if (
                ciudadEsperada &&
                ciudadResultado &&
                ciudadEsperada !== ciudadResultado
            ) {

                console.warn(
                    "OTIUM Geocoding: dirección descartada porque Geoapify devolvió otra ciudad.",
                    {
                        ciudadSolicitada,
                        ciudadResultado,
                        direccion
                    }
                );

            } else {

                return {

                    ...resultadoDireccion,

                    origen: "direccion"

                };

            }

        }

    }


    /* -------------------------------------------------------
       4. FALLBACK A CIUDAD

       Si la dirección no fue encontrada o fue descartada,
       buscamos directamente la ciudad.
    ------------------------------------------------------- */

    if (ciudadSolicitada) {

        const resultadoCiudad =
            await consultarGeoapify(
                ciudadSolicitada,
                {
                    type: "city"
                }
            );


        if (resultadoCiudad) {

            return {

                ...resultadoCiudad,

                origen: "ciudad"

            };

        }

    }


    /* -------------------------------------------------------
       5. FALLBACK A COMUNA

       Se utiliza solamente si no conseguimos una ciudad.
    ------------------------------------------------------- */

    if (comunaSolicitada) {

        const resultadoComuna =
            await consultarGeoapify(
                comunaSolicitada
            );


        if (resultadoComuna) {

            return {

                ...resultadoComuna,

                origen: "comuna"

            };

        }

    }


    /* -------------------------------------------------------
       6. NO SE ENCONTRÓ UBICACIÓN
    ------------------------------------------------------- */

    return null;

}


/* =========================================================
   EXPORTACIONES ADICIONALES
========================================================= */

export {
    consultarGeoapify,
    construirDireccion
};