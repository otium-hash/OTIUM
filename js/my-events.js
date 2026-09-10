import {
    getUserEvents,
    deleteEvent
} from "./modules/database.js";

import {
    auth
} from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            alert(
                "Debes iniciar sesión."
            );

            window.location.href =
                "index.html";

            return;

        }


        console.log(
            "Usuario en Mis eventos:",
            user.uid
        );


        try {

            await loadMyEvents(
                user.uid
            );

        } catch (error) {

            console.error(
                "Error cargando mis eventos:",
                error
            );


            const container =
                document.getElementById(
                    "myEventsContainer"
                );


            if (container) {

                container.innerHTML = `
                    <div class="evento-card">

                        <h3>
                            Error al cargar tus eventos.
                        </h3>

                        <p>
                            Revisa la consola.
                        </p>

                    </div>
                `;

            }

        }

    }
);


/* =====================================================
   CARGAR EVENTOS
===================================================== */

async function loadMyEvents(
    userId
) {

    const container =
        document.getElementById(
            "myEventsContainer"
        );


    if (!container) {

        console.error(
            "No existe #myEventsContainer"
        );

        return;

    }


    container.innerHTML = `
        <p>
            Cargando tus eventos...
        </p>
    `;


    /* =================================================
       OBTENER DESDE FIRESTORE
    ================================================= */

    const events =
        await getUserEvents(
            userId
        );


    console.log(
        "Eventos del usuario:",
        events
    );


    container.innerHTML =
        "";


    /* =================================================
       SIN EVENTOS
    ================================================= */

    if (
        !events ||
        events.length === 0
    ) {

        container.innerHTML = `

            <div class="evento-card">

                <h3>
                    No has publicado ningún evento.
                </h3>

                <p>
                    Puedes publicar tu primer evento
                    desde el menú de OTIUM.
                </p>

            </div>

        `;

        return;

    }


    /* =================================================
       CREAR TARJETAS
    ================================================= */

    events.forEach(
        (event) => {


            const id =
                event.firestoreId;


            if (!id) {

                console.warn(
                    "Evento sin ID:",
                    event
                );

                return;

            }


            /* =========================================
               CAMPOS ACTUALES + ANTIGUOS
            ========================================= */

            const titulo =
                event.title ||
                event.nombre ||
                event.nombreEvento ||
                "Sin título";


            const categoria =
                event.category ||
                event.categoria ||
                "Sin categoría";


            const fecha =
                event.date ||
                event.fecha ||
                event.fechaEvento ||
                "Sin fecha";


            const hora =
                event.time ||
                event.hora ||
                event.horaEvento ||
                "";


            const ciudad =
                event.city ||
                event.ciudad ||
                event.ubicacion ||
                "Sin ciudad";


            const direccion =
                event.address ||
                event.direccion ||
                "";


            const precio =
                event.price ??
                event.precio ??
                "";


            const descripcion =
                event.description ||
                event.descripcion ||
                "";


            /* =========================================
               IMAGEN DEL EVENTO
            ========================================= */

            const imagenEvento =
                event.imagen ||
                event.imagenUrl ||
                event.imageUrl ||
                event.fotoUrl ||
                "data/otium-default-event.png";

            const esImagenPorDefecto =
                imagenEvento === "data/otium-default-event.png";


            /* =========================================
               TARJETA
            ========================================= */

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "evento-card";


            card.dataset.eventId =
                id;


            card.innerHTML = `

                <div class="evento-imagen">
                    <img
                        src="${imagenEvento}"
                        alt="${titulo}"
                        class="evento-imagen-img${esImagenPorDefecto ? " default-event-image" : ""}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='data/otium-default-event.png';this.classList.add('default-event-image');">
                </div>

                <h3>
                    ${titulo}
                </h3>


                <p>
                    🎭 ${categoria}
                </p>


                <p>
                    📍 ${ciudad}
                </p>


                <p>
                    📅 ${fecha}
                </p>


                ${
                    hora
                    ? `
                        <p>
                            🕐 ${hora}
                        </p>
                      `
                    : ""
                }


                ${
                    direccion
                    ? `
                        <p>
                            🏠 ${direccion}
                        </p>
                      `
                    : ""
                }


                ${
                    precio !== ""
                    ? `
                        <p>
                            💲 ${precio}
                        </p>
                      `
                    : ""
                }


                ${
                    descripcion
                    ? `
                        <p>
                            ${descripcion.substring(
                                0,
                                150
                            )}${descripcion.length > 150 ? "..." : ""}
                        </p>
                      `
                    : ""
                }


                <div
                    class="event-actions">


                    <button
                        type="button"
                        class="detail-btn"
                        data-id="${id}">

                        Ver detalle

                    </button>


                    <button
                        type="button"
                        class="edit-btn"
                        data-id="${id}">

                        Editar

                    </button>


                    <button
                        type="button"
                        class="delete-btn"
                        data-id="${id}">

                        Eliminar

                    </button>


                </div>

            `;


            /* =========================================
               VER DETALLE
            ========================================= */

            const detailButton =
                card.querySelector(
                    ".detail-btn"
                );


            detailButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `event-details.html?id=${encodeURIComponent(id)}`;

                }
            );


            /* =========================================
               EDITAR
            ========================================= */

            const editButton =
                card.querySelector(
                    ".edit-btn"
                );


            editButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `edit-event.html?id=${encodeURIComponent(id)}`;

                }
            );


            /* =========================================
               ELIMINAR
            ========================================= */

            const deleteButton =
                card.querySelector(
                    ".delete-btn"
                );


            deleteButton.addEventListener(
                "click",
                async () => {

                    const confirmar =
                        confirm(
                            "¿Estás seguro de que deseas eliminar este evento?"
                        );


                    if (!confirmar) {

                        return;

                    }


                    try {

                        deleteButton.disabled =
                            true;

                        deleteButton.textContent =
                            "Eliminando...";


                        await deleteEvent(
                            id
                        );


                        alert(
                            "Evento eliminado correctamente."
                        );


                        await loadMyEvents(
                            userId
                        );


                    } catch (error) {

                        console.error(
                            "Error eliminando evento:",
                            error
                        );


                        alert(
                            "No se pudo eliminar el evento."
                        );


                        deleteButton.disabled =
                            false;

                        deleteButton.textContent =
                            "Eliminar";

                    }

                }
            );


            container.appendChild(
                card
            );

        }
    );

}