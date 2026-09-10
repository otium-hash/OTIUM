/* =====================================================
   OTIUM - FAVORITOS
   =====================================================
   Carga los eventos favoritos del usuario.

   FUNCIONES:
   - Obtiene los favoritos del usuario.
   - Busca cada evento real en Firestore.
   - Muestra la imagen del evento.
   - Si no existe imagen, utiliza el logo OTIUM.
   - Si la imagen falla, utiliza el logo OTIUM.
   - Permite ver el detalle.
   - Permite quitar un favorito.
===================================================== */


/* =====================================================
   IMPORTS
===================================================== */

import {
    auth
} from "./modules/auth.js";


import {
    getUserFavorites,
    getEventById,
    removeFavorite
} from "./modules/database.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

/*
 * Imagen que se utilizará cuando el evento
 * no tenga fotografía.
 */

const DEFAULT_EVENT_IMAGE =
    "data/otium-default-event.png";


/* =====================================================
   ELEMENTO PRINCIPAL
===================================================== */

const container =
    document.getElementById(
        "favoritosContainer"
    );


/* =====================================================
   COMPROBAR CONTENEDOR
===================================================== */

if (!container) {

    console.error(
        "OTIUM: No existe el elemento #favoritosContainer."
    );

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * Si no existe el contenedor,
         * no continuar.
         */

        if (!container) {

            return;

        }


        console.log(
            "OTIUM: estado de autenticación en favoritos:",
            user
                ? user.uid
                : "No autenticado"
        );


        /* ---------------------------------------------
           USUARIO NO AUTENTICADO
        --------------------------------------------- */

        if (!user) {

            container.innerHTML = `

                <div class="evento-card">

                    <h3>
                        Debes iniciar sesión
                    </h3>

                    <p>
                        Inicia sesión para ver tus eventos favoritos.
                    </p>

                </div>

            `;

            return;

        }


        /* ---------------------------------------------
           CARGAR FAVORITOS
        --------------------------------------------- */

        try {

            await cargarFavoritos(
                user.uid
            );

        } catch (error) {

            console.error(
                "OTIUM: Error cargando favoritos:",
                error
            );


            container.innerHTML = `

                <div class="evento-card">

                    <h3>
                        No fue posible cargar tus favoritos.
                    </h3>

                    <p>
                        Intenta nuevamente más tarde.
                    </p>

                </div>

            `;

        }

    }
);


/* =====================================================
   CARGAR FAVORITOS
===================================================== */

async function cargarFavoritos(
    userId
) {

    /*
     * Mensaje mientras se cargan.
     */

    container.innerHTML = `

        <div class="sin-eventos">

            Cargando tus favoritos...

        </div>

    `;


    /*
     * Obtener registros de favoritos.
     *
     * Ejemplo:
     *
     * {
     *    userId: "...",
     *    eventId: "..."
     * }
     */

    const favoritos =
        await getUserFavorites(
            userId
        );


    console.log(
        "OTIUM: Favoritos encontrados:",
        favoritos
    );


    /* ---------------------------------------------
       NO HAY FAVORITOS
    --------------------------------------------- */

    if (
        !favoritos ||
        favoritos.length === 0
    ) {

        mostrarSinFavoritos();

        return;

    }


    /*
     * Limpiar contenedor.
     */

    container.innerHTML = "";


    /*
     * Cargar cada evento.
     */

    for (
        const favorito of favoritos
    ) {

        const eventId =
            favorito.eventId;


        /*
         * Comprobar ID.
         */

        if (!eventId) {

            console.warn(
                "OTIUM: Favorito sin eventId:",
                favorito
            );

            continue;

        }


        try {

            console.log(
                "OTIUM: Buscando evento favorito:",
                eventId
            );


            /*
             * Obtener el evento REAL.
             *
             * Aquí es donde obtenemos también
             * la imagen guardada en el evento.
             */

            const evento =
                await getEventById(
                    String(eventId)
                );


            /*
             * El evento pudo haber sido eliminado.
             */

            if (!evento) {

                console.warn(
                    "OTIUM: Evento favorito no encontrado:",
                    eventId
                );

                continue;

            }


            console.log(
                "OTIUM: Evento favorito encontrado:",
                evento
            );


            /*
             * Crear tarjeta.
             */

            crearTarjetaFavorito(
                evento
            );

        } catch (error) {

            console.error(
                "OTIUM: Error obteniendo evento:",
                eventId,
                error
            );

        }

    }


    /*
     * Si no quedó ninguna tarjeta,
     * mostrar mensaje.
     */

    if (
        container.children.length === 0
    ) {

        container.innerHTML = `

            <div class="evento-card">

                <h3>
                    No hay eventos disponibles.
                </h3>

                <p>
                    Algunos de tus eventos favoritos
                    ya no están disponibles.
                </p>

            </div>

        `;

    }

}


/* =====================================================
   CREAR TARJETA DE FAVORITO
===================================================== */

function crearTarjetaFavorito(
    evento
) {

    /* ---------------------------------------------
       ID
    --------------------------------------------- */

    const firestoreId =
        evento.firestoreId ||
        evento.id ||
        "";


    if (!firestoreId) {

        console.warn(
            "OTIUM: Evento favorito sin ID:",
            evento
        );

        return;

    }


    /* ---------------------------------------------
       DATOS
    --------------------------------------------- */

    const titulo =
        evento.title ||
        evento.nombre ||
        evento.nombreEvento ||
        "Sin título";


    const categoria =
        evento.category ||
        evento.categoria ||
        "Sin categoría";


    const fecha =
        evento.date ||
        evento.fecha ||
        evento.fechaEvento ||
        "Sin fecha";


    const hora =
        evento.time ||
        evento.hora ||
        evento.horaEvento ||
        "";


    const ciudad =
        evento.city ||
        evento.ciudad ||
        "Sin ciudad";


    const direccion =
        evento.address ||
        evento.direccion ||
        evento.ubicacion ||
        "";


    const precio =
        evento.price ??
        evento.precio ??
        "";


    const descripcion =
        evento.description ||
        evento.descripcion ||
        "";


    /* =================================================
       IMAGEN
    ================================================= */

    const imagenEvento =
        obtenerImagenEvento(
            evento
        );


    const esImagenPorDefecto =
        imagenEvento ===
        DEFAULT_EVENT_IMAGE;


    console.log(
        "OTIUM: Imagen del favorito:",
        {
            id: firestoreId,
            imagen: imagenEvento,
            defecto: esImagenPorDefecto
        }
    );


    /* =================================================
       CREAR TARJETA
    ================================================= */

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "evento-card";


    card.dataset.eventId =
        String(
            firestoreId
        );


    /* =================================================
       HTML
    ================================================= */

    card.innerHTML = `

        <div class="evento-imagen">

            <img
                src="${escapeHtml(imagenEvento)}"
                alt="${escapeHtml(titulo)}"
                class="evento-imagen-img${esImagenPorDefecto ? " default-event-image" : ""}"
                loading="lazy">

        </div>


        <div class="evento-card-content">

            <h3>
                ${escapeHtml(titulo)}
            </h3>


            <p>
                🎭 ${escapeHtml(categoria)}
            </p>


            <p>
                📍 ${escapeHtml(ciudad)}
            </p>


            <p>
                📅 ${escapeHtml(fecha)}
            </p>


            ${
                hora
                    ? `
                        <p>
                            🕐 ${escapeHtml(hora)}
                        </p>
                      `
                    : ""
            }


            ${
                direccion
                    ? `
                        <p>
                            🏠 ${escapeHtml(direccion)}
                        </p>
                      `
                    : ""
            }


            ${
                precio !== ""
                    ? `
                        <p>
                            💲 ${escapeHtml(
                                String(precio)
                            )}
                        </p>
                      `
                    : ""
            }


            ${
                descripcion
                    ? `
                        <p class="evento-descripcion">

                            ${escapeHtml(
                                descripcion.substring(
                                    0,
                                    150
                                )
                            )}

                            ${
                                descripcion.length > 150
                                    ? "..."
                                    : ""
                            }

                        </p>
                      `
                    : ""
            }


            <div class="event-actions">

                <button
                    type="button"
                    class="detail-btn"
                    data-id="${escapeHtml(
                        String(
                            firestoreId
                        )
                    )}">

                    Ver detalle

                </button>


                <button
                    type="button"
                    class="remove-favorite-btn"
                    data-id="${escapeHtml(
                        String(
                            firestoreId
                        )
                    )}">

                    ♥ Quitar de favoritos

                </button>

            </div>

        </div>

    `;


    /* =================================================
       AGREGAR TARJETA
    ================================================= */

    container.appendChild(
        card
    );


    /* =================================================
       FALLBACK DE IMAGEN
    ================================================= */

    const image =
        card.querySelector(
            ".evento-imagen-img"
        );


    if (image) {

        image.addEventListener(
            "error",
            () => {

                console.warn(
                    "OTIUM: Falló la imagen del evento:",
                    firestoreId
                );


                /*
                 * Evitar ciclo infinito.
                 */

                image.onerror =
                    null;


                /*
                 * Usar logo OTIUM.
                 */

                image.src =
                    DEFAULT_EVENT_IMAGE;


                image.classList.add(
                    "default-event-image"
                );

            }
        );

    }


    /* =================================================
       BOTÓN VER DETALLE
    ================================================= */

    const detailButton =
        card.querySelector(
            ".detail-btn"
        );


    if (detailButton) {

        detailButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "event-details.html?id=" +
                    encodeURIComponent(
                        String(
                            firestoreId
                        )
                    );

            }
        );

    }


    /* =================================================
       BOTÓN QUITAR FAVORITO
    ================================================= */

    const removeButton =
        card.querySelector(
            ".remove-favorite-btn"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            async () => {

                await quitarFavorito(
                    firestoreId,
                    card
                );

            }
        );

    }

}


/* =====================================================
   OBTENER IMAGEN DEL EVENTO
===================================================== */

function obtenerImagenEvento(
    evento
) {

    /*
     * Compatibilidad con diferentes
     * versiones de OTIUM.
     */

    const posiblesImagenes = [

        evento.imagen,

        evento.imagenUrl,

        evento.imageUrl,

        evento.fotoUrl,

        evento.image,

        evento.foto

    ];


    /*
     * Buscar la primera imagen válida.
     */

    for (
        const imagen
        of posiblesImagenes
    ) {

        if (
            typeof imagen === "string" &&
            imagen.trim() !== ""
        ) {

            return imagen.trim();

        }

    }


    /*
     * Si no existe imagen,
     * utilizar logo OTIUM.
     */

    return DEFAULT_EVENT_IMAGE;

}


/* =====================================================
   QUITAR FAVORITO
===================================================== */

async function quitarFavorito(
    eventId,
    card
) {

    const user =
        auth.currentUser;


    if (!user) {

        alert(
            "Debes iniciar sesión."
        );

        return;

    }


    try {

        const button =
            card.querySelector(
                ".remove-favorite-btn"
            );


        /*
         * Desactivar temporalmente.
         */

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Quitando...";

        }


        /*
         * Eliminar favorito.
         */

        await removeFavorite(
            user.uid,
            String(eventId)
        );


        /*
         * Eliminar tarjeta.
         */

        card.remove();


        /*
         * Comprobar si quedó vacío.
         */

        if (
            container.children.length === 0
        ) {

            mostrarSinFavoritos();

        }


    } catch (error) {

        console.error(
            "OTIUM: Error quitando favorito:",
            error
        );


        alert(
            "No fue posible quitar el evento de favoritos."
        );


        /*
         * Reactivar botón.
         */

        const button =
            card.querySelector(
                ".remove-favorite-btn"
            );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "♥ Quitar de favoritos";

        }

    }

}


/* =====================================================
   MENSAJE SIN FAVORITOS
===================================================== */

function mostrarSinFavoritos() {

    container.innerHTML = `

        <div class="evento-card">

            <h3>
                No tienes eventos favoritos.
            </h3>

            <p>
                Cuando guardes un evento como favorito,
                aparecerá aquí.
            </p>

        </div>

    `;

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}