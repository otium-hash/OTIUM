import {
    getEventById,
    updateEvent
} from "./modules/database.js";

import {
    auth
} from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   ID DEL EVENTO
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const eventId =
    params.get("id");


console.log(
    "ID evento a editar:",
    eventId
);


/* =====================================================
   FORMULARIO
===================================================== */

const form =
    document.getElementById(
        "editForm"
    );


/* =====================================================
   OBTENER CAMPO
===================================================== */

function field(id) {

    return document.getElementById(id);

}


/* =====================================================
   CARGAR EVENTO
===================================================== */

async function loadEvent() {

    if (!eventId) {

        alert(
            "No se encontró el ID del evento."
        );

        window.location.href =
            "my-events.html";

        return;

    }


    try {

        console.log(
            "Cargando evento desde Firestore..."
        );


        const evento =
            await getEventById(
                eventId
            );


        console.log(
            "Evento encontrado:",
            evento
        );


        if (!evento) {

            alert(
                "No se encontró el evento."
            );

            window.location.href =
                "my-events.html";

            return;

        }


        /* =========================================
           CAMPOS
        ========================================= */

        const title =
            field("title");

        const category =
            field("category");

        const date =
            field("date");

        const time =
            field("time");

        const city =
            field("city");

        const address =
            field("address");

        const description =
            field("description");

        const price =
            field("price");

        const tickets =
            field("tickets");

        const latitude =
            field("latitude");

        const longitude =
            field("longitude");


        /* =========================================
           CARGAR VALORES
        ========================================= */

        if (title) {

            title.value =
                evento.title ??
                evento.nombre ??
                "";

        }


        if (category) {

            category.value =
                evento.category ??
                evento.categoria ??
                "";

        }


        if (date) {

            date.value =
                evento.date ??
                evento.fecha ??
                "";

        }


        if (time) {

            time.value =
                evento.time ??
                evento.hora ??
                "";

        }


        if (city) {

            city.value =
                evento.city ??
                evento.ciudad ??
                "";

        }


        if (address) {

            address.value =
                evento.address ??
                evento.direccion ??
                evento.ubicacion ??
                "";

        }


        if (description) {

            description.value =
                evento.description ??
                evento.descripcion ??
                "";

        }


        if (price) {

            price.value =
                evento.price ??
                evento.precio ??
                "";

        }


        if (tickets) {

            tickets.value =
                evento.tickets ??
                evento.entradas ??
                "";

        }


        if (latitude) {

            latitude.value =
                evento.latitude ??
                evento.latitud ??
                "";

        }


        if (longitude) {

            longitude.value =
                evento.longitude ??
                evento.longitud ??
                "";

        }


        console.log(
            "Formulario cargado correctamente."
        );

    } catch (error) {

        console.error(
            "Error cargando evento:",
            error
        );

        alert(
            "Error al cargar el evento."
        );

    }

}


/* =====================================================
   GUARDAR CAMBIOS
===================================================== */

if (form) {

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            console.log(
                "SUBMIT EDITAR EVENTO"
            );


            /* -----------------------------------------
               COMPROBAR USUARIO
            ----------------------------------------- */

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Debes iniciar sesión."
                );

                return;

            }


            /* -----------------------------------------
               COMPROBAR ID
            ----------------------------------------- */

            if (!eventId) {

                alert(
                    "No se encontró el ID del evento."
                );

                return;

            }


            /* -----------------------------------------
               BOTÓN
            ----------------------------------------- */

            const saveButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            try {

                if (saveButton) {

                    saveButton.disabled =
                        true;

                    saveButton.textContent =
                        "Guardando...";

                }


                /* =====================================
                   OBTENER VALORES
                ===================================== */

                const eventData = {

                    title:
                        field("title")
                            ? field("title")
                                .value
                                .trim()
                            : "",


                    category:
                        field("category")
                            ? field("category")
                                .value
                            : "",


                    date:
                        field("date")
                            ? field("date")
                                .value
                            : "",


                    time:
                        field("time")
                            ? field("time")
                                .value
                            : "",


                    city:
                        field("city")
                            ? field("city")
                                .value
                                .trim()
                            : "",


                    address:
                        field("address")
                            ? field("address")
                                .value
                                .trim()
                            : "",


                    description:
                        field("description")
                            ? field("description")
                                .value
                                .trim()
                            : "",


                    price:
                        field("price")
                            ? field("price")
                                .value
                            : "",


                    tickets:
                        field("tickets")
                            ? field("tickets")
                                .value
                            : "",


                    latitude:
                        field("latitude")
                            ? field("latitude")
                                .value
                            : "",


                    longitude:
                        field("longitude")
                            ? field("longitude")
                                .value
                            : ""

                };


                console.log(
                    "Datos que se enviarán a Firestore:",
                    eventData
                );


                /* =====================================
                   ACTUALIZAR FIRESTORE
                ===================================== */

                await updateEvent(
                    eventId,
                    eventData
                );


                console.log(
                    "Firestore actualizado correctamente."
                );


                alert(
                    "Evento actualizado correctamente."
                );


                window.location.href =
                    "my-events.html";


            } catch (error) {

                console.error(
                    "ERROR GUARDANDO EVENTO:",
                    error
                );


                alert(
                    "No se pudo guardar la modificación."
                );


                if (saveButton) {

                    saveButton.disabled =
                        false;

                    saveButton.textContent =
                        "Guardar cambios";

                }

            }

        }
    );

} else {

    console.error(
        "No existe el formulario #editForm"
    );

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "Estado auth en editar:",
            user
                ? user.email
                : "sin usuario"
        );


        if (!user) {

            alert(
                "Debes iniciar sesión."
            );

            window.location.href =
                "index.html";

            return;

        }


        await loadEvent();

    }
);