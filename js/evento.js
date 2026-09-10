import {
    getEventById
} from "./modules/database.js";

import {
    auth
} from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


// ==========================================
// OBTENER ID DEL EVENTO
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const eventId =
    params.get("id");


// ==========================================
// CONTENEDOR
// ==========================================

const container =
    document.getElementById(
        "eventoDetalle"
    );


// ==========================================
// CARGAR EVENTO
// ==========================================

async function cargarEvento() {

    if (!eventId) {

        container.innerHTML = `
            <h2>Evento no encontrado</h2>

            <p>
                No se recibió el identificador
                del evento.
            </p>

            <button
                onclick="window.location.href='eventos.html'">

                ← Volver a eventos

            </button>
        `;

        return;
    }


    try {

        const event =
            await getEventById(
                eventId
            );


        console.log(
            "Evento cargado:",
            event
        );


        if (!event) {

            container.innerHTML = `
                <h2>Evento no encontrado</h2>

                <p>
                    El evento no existe o
                    fue eliminado.
                </p>

                <button
                    onclick="window.location.href='eventos.html'">

                    ← Volver a eventos

                </button>
            `;

            return;
        }


        // ==================================
        // DATOS DEL EVENTO
        // ==================================

        const nombre =
            event.nombre ||
            event.title ||
            "Evento sin nombre";

        const categoria =
            event.categoria ||
            event.category ||
            "";

        const fecha =
            event.fecha ||
            event.date ||
            "";

        const hora =
            event.hora ||
            event.time ||
            "";

        const ciudad =
            event.ciudad ||
            event.city ||
            "";

        const region =
            event.region ||
            "";

        const ubicacion =
            event.ubicacion ||
            event.address ||
            "";

        const descripcion =
            event.descripcion ||
            event.description ||
            "Sin descripción disponible.";

        const precio =
            event.precio ??
            event.price ??
            "";

        const entradas =
            event.entradas ??
            event.tickets ??
            "";

        const latitude =
            event.latitude ||
            "";

        const longitude =
            event.longitude ||
            "";


        // ==================================
        // MOSTRAR EVENTO
        // ==================================

        container.innerHTML = `

            <div class="event-detail-content">

                <h1>
                    ${nombre}
                </h1>


                <div class="event-detail-info">

                    <p>
                        📅
                        <strong>Fecha:</strong>
                        ${fecha || "No indicada"}
                    </p>


                    <p>
                        ⏰
                        <strong>Hora:</strong>
                        ${hora || "No indicada"}
                    </p>


                    <p>
                        🎫
                        <strong>Categoría:</strong>
                        ${categoria || "No indicada"}
                    </p>


                    <p>
                        📍
                        <strong>Ciudad:</strong>
                        ${ciudad || "No indicada"}
                    </p>


                    ${
                        region
                        ?
                        `
                        <p>
                            🗺️
                            <strong>Región:</strong>
                            ${region}
                        </p>
                        `
                        :
                        ""
                    }


                    <p>
                        🏠
                        <strong>Ubicación:</strong>
                        ${ubicacion || "No indicada"}
                    </p>


                    <p>
                        💲
                        <strong>Precio:</strong>
                        ${
                            precio !== ""
                            ?
                            `$${precio}`
                            :
                            "No indicado"
                        }
                    </p>


                    <p>
                        🎟️
                        <strong>Entradas:</strong>
                        ${
                            entradas !== ""
                            ?
                            entradas
                            :
                            "No indicado"
                        }
                    </p>

                </div>


                <div class="event-description">

                    <h3>
                        Descripción
                    </h3>

                    <p>
                        ${descripcion}
                    </p>

                </div>


                ${
                    latitude && longitude
                    ?
                    `
                    <div class="event-location">

                        <h3>
                            📍 Ubicación
                        </h3>

                        <a
                            href="https://www.google.com/maps?q=${latitude},${longitude}"
                            target="_blank"
                            rel="noopener">

                            Ver ubicación en Google Maps

                        </a>

                    </div>
                    `
                    :
                    ""
                }


                <div class="event-actions">

                    <button
                        id="favoriteButton">

                        ❤️ Añadir a favoritos

                    </button>


                    <button
                        id="shareButton">

                        📤 Compartir evento

                    </button>


                    <button
                        id="backButton">

                        ← Volver a eventos

                    </button>

                </div>

            </div>

        `;


        // ==================================
        // VOLVER
        // ==================================

        document
            .getElementById(
                "backButton"
            )
            .addEventListener(
                "click",
                () => {

                    window.location.href =
                        "eventos.html";

                }
            );


        // ==================================
        // COMPARTIR
        // ==================================

        document
            .getElementById(
                "shareButton"
            )
            .addEventListener(
                "click",
                async () => {

                    const url =
                        window.location.href;


                    if (
                        navigator.share
                    ) {

                        try {

                            await navigator.share({

                                title:
                                    nombre,

                                text:
                                    `Mira este evento en OTIUM: ${nombre}`,

                                url:
                                    url

                            });

                        } catch (
                            error
                        ) {

                            console.log(
                                "Compartir cancelado"
                            );

                        }

                    } else {

                        try {

                            await navigator.clipboard.writeText(
                                url
                            );

                            alert(
                                "Enlace copiado al portapapeles."
                            );

                        } catch {

                            alert(
                                url
                            );

                        }

                    }

                }
            );


        // ==================================
        // FAVORITOS
        // ==================================

        const favoriteButton =
            document.getElementById(
                "favoriteButton"
            );


        if (favoriteButton) {

            favoriteButton.addEventListener(
                "click",
                async () => {

                    const user =
                        auth.currentUser;


                    if (!user) {

                        alert(
                            "Debes iniciar sesión para agregar favoritos."
                        );

                        return;
                    }


                    /*
                     * El módulo favoritos.js
                     * utiliza el ID de Firestore.
                     */

                    const firestoreId =
                        event.firestoreId ||
                        event.id;


                    if (!firestoreId) {

                        alert(
                            "No se pudo identificar el evento."
                        );

                        return;
                    }


                    try {

                        const {
                            addFavorite
                        } = await import(
                            "./favoritos.js"
                        );


                        await addFavorite(
                            user.uid,
                            firestoreId
                        );


                        favoriteButton.innerHTML =
                            "❤️ En favoritos";


                        alert(
                            "Evento agregado a favoritos."
                        );


                    } catch (
                        error
                    ) {

                        console.error(
                            "Error al agregar favorito:",
                            error
                        );


                        alert(
                            "No se pudo agregar el evento a favoritos."
                        );

                    }

                }
            );

        }

    } catch (
        error
    ) {

        console.error(
            "Error cargando evento:",
            error
        );


        container.innerHTML = `

            <h2>
                Error al cargar el evento
            </h2>

            <p>
                Revisa la consola para más información.
            </p>

        `;

    }

}


// ==========================================
// ESPERAR FIREBASE
// ==========================================

onAuthStateChanged(
    auth,
    () => {

        cargarEvento();

    }
);