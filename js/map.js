import {
    getEvents
} from "./modules/database.js";


// =====================================================
// CONFIGURACIÓN INICIAL DEL MAPA
// =====================================================

const SANTIAGO_LATITUDE = -33.4489;
const SANTIAGO_LONGITUDE = -70.6693;
const DEFAULT_ZOOM = 10;
const USER_ZOOM = 12;


// =====================================================
// CREAR MAPA
// =====================================================

const map =
    L.map("map");


// =====================================================
// MAPA BASE OPENSTREETMAP
// =====================================================

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            "© OpenStreetMap"
    }
).addTo(map);


// =====================================================
// CARGAR EVENTOS
// =====================================================

async function cargarEventos() {

    try {

        const events =
            await getEvents();

        if (
            !Array.isArray(events)
        ) {

            return;

        }

        events.forEach(
            (event) => {

                if (
                    event.latitude === undefined ||
                    event.latitude === null ||
                    event.longitude === undefined ||
                    event.longitude === null
                ) {

                    return;

                }

                const latitude =
                    parseFloat(
                        event.latitude
                    );

                const longitude =
                    parseFloat(
                        event.longitude
                    );


                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {

                    return;

                }


                const marker =
                    L.marker(
                        [
                            latitude,
                            longitude
                        ]
                    ).addTo(map);


                marker.bindPopup(
                    `
                    <strong>
                        ${
                            event.title ||
                            event.nombre ||
                            "Evento"
                        }
                    </strong>

                    <br>

                    ${
                        event.city ||
                        event.ciudad ||
                        ""
                    }

                    <br>

                    ${
                        event.date ||
                        event.fecha ||
                        ""
                    }
                    `
                );

            }
        );

    } catch (error) {

        console.error(
            "Error cargando eventos en el mapa:",
            error
        );

    }

}


// =====================================================
// UBICACIÓN DEL USUARIO
// =====================================================

function centrarEnUbicacionUsuario() {

    if (
        !navigator.geolocation
    ) {

        console.warn(
            "La geolocalización no está disponible."
        );

        map.setView(
            [
                SANTIAGO_LATITUDE,
                SANTIAGO_LONGITUDE
            ],
            DEFAULT_ZOOM
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        (position) => {

            const userLatitude =
                position.coords.latitude;

            const userLongitude =
                position.coords.longitude;


            console.log(
                "Ubicación del usuario:",
                userLatitude,
                userLongitude
            );


            // -----------------------------------------
            // CENTRAR MAPA
            // -----------------------------------------

            map.setView(
                [
                    userLatitude,
                    userLongitude
                ],
                USER_ZOOM
            );


            // -----------------------------------------
            // MARCADOR DEL USUARIO
            // -----------------------------------------

            L.marker(
                [
                    userLatitude,
                    userLongitude
                ]
            )
                .addTo(map)
                .bindPopup(
                    `
                    <strong>
                        Tu ubicación
                    </strong>
                    `
                );


        },

        (error) => {

            console.warn(
                "No se pudo obtener la ubicación del usuario:",
                error
            );


            // -----------------------------------------
            // RESPALDO: SANTIAGO
            // -----------------------------------------

            map.setView(
                [
                    SANTIAGO_LATITUDE,
                    SANTIAGO_LONGITUDE
                ],
                DEFAULT_ZOOM
            );

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }

    );

}


// =====================================================
// INICIALIZACIÓN
// =====================================================

async function inicializarMapa() {

    // Cargar eventos independientemente
    // de la geolocalización.
    await cargarEventos();


    // Intentar centrar en el usuario.
    centrarEnUbicacionUsuario();

}


// =====================================================
// INICIAR
// =====================================================

inicializarMapa();