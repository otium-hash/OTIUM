/* =====================================================
   OTIUM - CENTRO DE AVISOS
   Archivo: js/centro-avisos.js
   Versión: 20260901

   Funciones:
   - Detectar usuario autenticado
   - Cargar avisos personales
   - Mostrar avisos
   - Contar avisos no leídos
   - Marcar aviso como leído
   - Marcar todos como leídos
   - Abrir evento relacionado
   - Compatible con avisos generados por motor-avisos.js

   Estructura Firestore:

   usuarios/{uid}/avisos/{avisoId}

===================================================== */


import {
    auth
} from "./modules/auth.js";


import {
    db
} from "./modules/firebase-config.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";



/* =====================================================
   ELEMENTOS
===================================================== */

const alertsMessage =
    document.getElementById(
        "alertsMessage"
    );


const loginRequired =
    document.getElementById(
        "loginRequired"
    );


const alertsContent =
    document.getElementById(
        "alertsContent"
    );


const alertsCounter =
    document.getElementById(
        "alertsCounter"
    );


const alertsToolbarText =
    document.getElementById(
        "alertsToolbarText"
    );


const alertsList =
    document.getElementById(
        "alertsList"
    );


const markAllReadButton =
    document.getElementById(
        "markAllReadButton"
    );



/* =====================================================
   ESTADO
===================================================== */

let currentUser = null;

let avisosActuales = [];

let cargandoAvisos = false;

let actualizandoAviso = false;



/* =====================================================
   MENSAJES
===================================================== */

function mostrarMensaje(
    texto,
    tipo = "info"
) {

    if (!alertsMessage) {
        return;
    }


    alertsMessage.textContent =
        texto;


    alertsMessage.className =
        `alerts-message visible ${tipo}`;

}


function ocultarMensaje() {

    if (!alertsMessage) {
        return;
    }


    alertsMessage.textContent =
        "";


    alertsMessage.className =
        "alerts-message";

}



/* =====================================================
   UTILIDADES
===================================================== */

/**
 * Obtiene el primer valor válido
 * de una lista de propiedades.
 */

function obtenerValor(
    objeto,
    propiedades,
    valorDefecto = ""
) {

    if (!objeto) {
        return valorDefecto;
    }


    for (
        const propiedad of propiedades
    ) {

        const valor =
            objeto[propiedad];


        if (
            valor !== undefined &&
            valor !== null &&
            valor !== ""
        ) {

            return valor;

        }

    }


    return valorDefecto;

}



/* =====================================================
   TEXTO SEGURO PARA HTML
===================================================== */

function escaparHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor)
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



/* =====================================================
   FECHAS
===================================================== */

function convertirFecha(
    valor
) {

    if (!valor) {
        return null;
    }


    /*
     * Timestamp de Firestore
     */

    if (
        typeof valor.toDate ===
        "function"
    ) {

        const fecha =
            valor.toDate();


        if (
            !Number.isNaN(
                fecha.getTime()
            )
        ) {

            return fecha;

        }

    }


    /*
     * Timestamp compatible
     * con seconds / nanoseconds
     */

    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {

        const fecha =
            new Date(
                valor.seconds * 1000
            );


        if (
            !Number.isNaN(
                fecha.getTime()
            )
        ) {

            return fecha;

        }

    }


    /*
     * Fecha JavaScript
     */

    if (
        valor instanceof Date
    ) {

        return valor;

    }


    /*
     * String o número
     */

    const fecha =
        new Date(
            valor
        );


    if (
        !Number.isNaN(
            fecha.getTime()
        )
    ) {

        return fecha;

    }


    return null;

}



/* =====================================================
   FORMATEAR FECHA
===================================================== */

function formatearFecha(
    valor
) {

    const fecha =
        convertirFecha(
            valor
        );


    if (!fecha) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "es-CL",
        {
            dateStyle:
                "medium",
            timeStyle:
                "short"
        }
    ).format(
        fecha
    );

}



/* =====================================================
   FECHA DEL EVENTO
===================================================== */

function formatearFechaEvento(
    valor
) {

    if (!valor) {
        return "";
    }


    const fecha =
        convertirFecha(
            valor
        );


    if (!fecha) {

        /*
         * Puede ser una fecha
         * almacenada como texto.
         */

        return String(
            valor
        );

    }


    return new Intl.DateTimeFormat(
        "es-CL",
        {
            dateStyle:
                "medium"
        }
    ).format(
        fecha
    );

}



/* =====================================================
   OBTENER COLECCIÓN DE AVISOS
===================================================== */

function obtenerColeccionAvisos() {

    if (
        !currentUser
    ) {

        return null;

    }


    return collection(
        db,
        "usuarios",
        currentUser.uid,
        "avisos"
    );

}



/* =====================================================
   ORDENAR AVISOS
===================================================== */

function obtenerFechaOrdenAviso(
    aviso
) {

    const fecha =
        obtenerValor(
            aviso,
            [
                "creadoEn",
                "fechaCreacion",
                "fecha",
                "createdAt"
            ],
            null
        );


    const fechaConvertida =
        convertirFecha(
            fecha
        );


    return fechaConvertida
        ? fechaConvertida.getTime()
        : 0;

}



function ordenarAvisos(
    avisos
) {

    return [
        ...avisos
    ].sort(
        (
            a,
            b
        ) => {

            return (
                obtenerFechaOrdenAviso(
                    b
                ) -
                obtenerFechaOrdenAviso(
                    a
                )
            );

        }
    );

}



/* =====================================================
   ESTADO LEÍDO
===================================================== */

function avisoEstaLeido(
    aviso
) {

    /*
     * Compatibilidad con distintos
     * nombres que pueda utilizar
     * el motor.
     */

    if (
        aviso.leido === true
    ) {

        return true;

    }


    if (
        aviso.leido === false
    ) {

        return false;

    }


    if (
        aviso.leidoEn
    ) {

        return true;

    }


    if (
        aviso.estado === "leido"
    ) {

        return true;

    }


    /*
     * Por defecto un aviso nuevo
     * se considera no leído.
     */

    return false;

}



/* =====================================================
   CONTADOR
===================================================== */

function actualizarContador() {

    if (!alertsCounter) {
        return;
    }


    const noLeidos =
        avisosActuales.filter(
            aviso =>
                !avisoEstaLeido(
                    aviso
                )
        ).length;


    alertsCounter.textContent =
        String(
            noLeidos
        );


    if (
        noLeidos > 0
    ) {

        alertsCounter.classList
            .remove(
                "empty"
            );

        alertsCounter.setAttribute(
            "aria-label",
            `${noLeidos} avisos no leídos`
        );

    } else {

        alertsCounter.classList
            .add(
                "empty"
            );

        alertsCounter.setAttribute(
            "aria-label",
            "No hay avisos no leídos"
        );

    }


    if (
        alertsToolbarText
    ) {

        if (
            avisosActuales.length === 0
        ) {

            alertsToolbarText.textContent =
                "No tienes avisos todavía.";

        } else if (
            noLeidos === 0
        ) {

            alertsToolbarText.textContent =
                `${avisosActuales.length} aviso${avisosActuales.length === 1 ? "" : "s"} · Todo leído`;

        } else {

            alertsToolbarText.textContent =
                `${avisosActuales.length} aviso${avisosActuales.length === 1 ? "" : "s"} · ${noLeidos} sin leer`;

        }

    }


    if (
        markAllReadButton
    ) {

        markAllReadButton.disabled =
            noLeidos === 0;

    }

}



/* =====================================================
   OBTENER INFORMACIÓN DEL AVISO
===================================================== */

function prepararAviso(
    snapshot
) {

    const datos =
        snapshot.data() || {};


    return {

        ...datos,

        _id:
            snapshot.id

    };

}



/* =====================================================
   CARGAR AVISOS
===================================================== */

async function cargarAvisos() {

    if (
        !currentUser
    ) {

        return;

    }


    if (
        cargandoAvisos
    ) {

        return;

    }


    cargandoAvisos =
        true;


    try {

        ocultarMensaje();


        if (
            alertsList
        ) {

            alertsList.innerHTML =
                `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            ⏳
                        </div>

                        <h2>
                            Cargando tus avisos
                        </h2>

                        <p>
                            Estamos consultando tus avisos
                            personales.
                        </p>
                    </div>
                `;

        }


        const referencia =
            obtenerColeccionAvisos();


        if (!referencia) {

            return;

        }


        /*
         * No utilizamos orderBy()
         * para evitar depender de índices
         * compuestos de Firestore.
         *
         * Ordenamos posteriormente
         * en el navegador.
         */

        const snapshot =
            await getDocs(
                referencia
            );


        const avisos = [];


        snapshot.forEach(
            documento => {

                avisos.push(
                    prepararAviso(
                        documento
                    )
                );

            }
        );


        avisosActuales =
            ordenarAvisos(
                avisos
            );


        actualizarContador();


        renderizarAvisos();


        console.log(
            "OTIUM: avisos cargados:",
            avisosActuales
        );


    } catch (
        error
    ) {

        console.error(
            "OTIUM: error cargando avisos:",
            error
        );


        if (
            alertsList
        ) {

            alertsList.innerHTML =
                "";

        }


        mostrarMensaje(
            "No fue posible cargar tus avisos. Verifica la configuración de Firebase.",
            "error"
        );


    } finally {

        cargandoAvisos =
            false;

    }

}



/* =====================================================
   CREAR URL DEL EVENTO
===================================================== */

function obtenerURLDelEvento(
    aviso
) {

    const eventId =
        obtenerValor(
            aviso,
            [
                "eventId",
                "eventoId",
                "idEvento",
                "evento_id"
            ],
            ""
        );


    if (!eventId) {

        return "";

    }


    return (
        `event-details.html?id=${encodeURIComponent(
            String(eventId)
        )}`
    );

}



/* =====================================================
   RENDERIZAR AVISO
===================================================== */

function crearHTMLAviso(
    aviso
) {

    const leido =
        avisoEstaLeido(
            aviso
        );


    const titulo =
        obtenerValor(
            aviso,
            [
                "titulo",
                "nombre",
                "eventoNombre",
                "eventName"
            ],
            "Nuevo evento"
        );


    const categoria =
        obtenerValor(
            aviso,
            [
                "categoria",
                "category"
            ],
            ""
        );


    const ciudad =
        obtenerValor(
            aviso,
            [
                "ciudad",
                "city"
            ],
            ""
        );


    const region =
        obtenerValor(
            aviso,
            [
                "region"
            ],
            ""
        );


    const descripcion =
        obtenerValor(
            aviso,
            [
                "descripcion",
                "description",
                "mensaje",
                "message"
            ],
            "Hay un evento que coincide con tus preferencias."
        );


    const motivo =
        obtenerValor(
            aviso,
            [
                "motivo",
                "razon",
                "reason"
            ],
            ""
        );


    const fechaAviso =
        obtenerValor(
            aviso,
            [
                "creadoEn",
                "fechaCreacion",
                "createdAt",
                "fecha"
            ],
            null
        );


    const fechaEvento =
        obtenerValor(
            aviso,
            [
                "fechaEvento",
                "eventoFecha",
                "eventDate",
                "fecha"
            ],
            null
        );


    const tipo =
        obtenerValor(
            aviso,
            [
                "tipo",
                "tipoAviso",
                "type"
            ],
            "Evento de interés"
        );


    const urlEvento =
        obtenerURLDelEvento(
            aviso
        );


    const idAviso =
        aviso._id;


    const fechaAvisoTexto =
        formatearFecha(
            fechaAviso
        );


    const fechaEventoTexto =
        formatearFechaEvento(
            fechaEvento
        );


    const meta = [];


    if (
        categoria
    ) {

        meta.push(
            `
                <span class="alert-meta-item">
                    🎯 ${escaparHTML(categoria)}
                </span>
            `
        );

    }


    if (
        ciudad
    ) {

        meta.push(
            `
                <span class="alert-meta-item">
                    📍 ${escaparHTML(ciudad)}
                </span>
            `
        );

    }


    if (
        region
    ) {

        meta.push(
            `
                <span class="alert-meta-item">
                    🗺️ ${escaparHTML(region)}
                </span>
            `
        );

    }


    if (
        fechaEventoTexto
    ) {

        meta.push(
            `
                <span class="alert-meta-item">
                    📅 ${escaparHTML(fechaEventoTexto)}
                </span>
            `
        );

    }


    return `
        <article
            class="alert-card ${leido ? "" : "unread"}"
            data-alert-id="${escaparHTML(idAviso)}"
        >

            <div class="alert-card-top">

                <div class="alert-type">
                    🔔
                    ${escaparHTML(tipo)}
                    ${
                        leido
                            ? ""
                            : " · NUEVO"
                    }
                </div>


                ${
                    fechaAvisoTexto
                        ? `
                            <div class="alert-date">
                                ${escaparHTML(
                                    fechaAvisoTexto
                                )}
                            </div>
                          `
                        : ""
                }

            </div>


            <h2>
                ${escaparHTML(titulo)}
            </h2>


            ${
                meta.length
                    ? `
                        <div class="alert-meta">
                            ${meta.join("")}
                        </div>
                      `
                    : ""
            }


            <p class="alert-description">
                ${escaparHTML(descripcion)}
            </p>


            ${
                motivo
                    ? `
                        <div class="alert-reason">
                            <strong>
                                ¿Por qué recibiste este aviso?
                            </strong>
                            <br>
                            ${escaparHTML(motivo)}
                        </div>
                      `
                    : ""
            }


            <div class="alert-actions">

                ${
                    urlEvento
                        ? `
                            <a
                                href="${escaparHTML(urlEvento)}"
                                class="alert-action primary"
                                data-event-link="true"
                                data-alert-id="${escaparHTML(idAviso)}"
                            >
                                Ver evento
                            </a>
                          `
                        : ""
                }


                ${
                    !leido
                        ? `
                            <button
                                type="button"
                                class="alert-action"
                                data-mark-read="true"
                                data-alert-id="${escaparHTML(idAviso)}"
                            >
                                Marcar como leído
                            </button>
                          `
                        : `
                            <span
                                class="alert-action"
                                aria-label="Aviso leído"
                            >
                                ✓ Leído
                            </span>
                          `
                }

            </div>

        </article>
    `;

}



/* =====================================================
   RENDERIZAR TODOS LOS AVISOS
===================================================== */

function renderizarAvisos() {

    if (!alertsList) {
        return;
    }


    if (
        avisosActuales.length === 0
    ) {

        alertsList.innerHTML =
            `
                <div class="empty-state">

                    <div class="empty-state-icon">
                        🔔
                    </div>

                    <h2>
                        No tienes avisos todavía
                    </h2>

                    <p>
                        Cuando el motor de avisos encuentre
                        un evento que coincida con tus
                        preferencias, aparecerá aquí.
                    </p>

                    <a
                        href="mis-avisos.html"
                    >
                        Revisar mis preferencias
                    </a>

                </div>
            `;


        return;

    }


    alertsList.innerHTML =
        avisosActuales
            .map(
                aviso =>
                    crearHTMLAviso(
                        aviso
                    )
            )
            .join("");


}



/* =====================================================
   MARCAR AVISO COMO LEÍDO
===================================================== */

async function marcarAvisoComoLeido(
    avisoId
) {

    if (
        !currentUser ||
        !avisoId
    ) {

        return;

    }


    if (
        actualizandoAviso
    ) {

        return;

    }


    const aviso =
        avisosActuales.find(
            item =>
                item._id === avisoId
        );


    if (!aviso) {

        return;

    }


    if (
        avisoEstaLeido(
            aviso
        )
    ) {

        return;

    }


    actualizandoAviso =
        true;


    try {

        const referencia =
            doc(
                db,
                "usuarios",
                currentUser.uid,
                "avisos",
                avisoId
            );


        /*
         * Utilizamos únicamente campos
         * simples para mantener compatibilidad
         * con las reglas actuales.
         */

        await updateDoc(
            referencia,
            {
                leido: true
            }
        );


        aviso.leido =
            true;


        actualizarContador();


        renderizarAvisos();


        console.log(
            "OTIUM: aviso marcado como leído:",
            avisoId
        );


    } catch (
        error
    ) {

        console.error(
            "OTIUM: error marcando aviso como leído:",
            error
        );


        mostrarMensaje(
            "No fue posible marcar el aviso como leído.",
            "error"
        );


    } finally {

        actualizandoAviso =
            false;

    }

}



/* =====================================================
   MARCAR TODOS COMO LEÍDOS
===================================================== */

async function marcarTodosComoLeidos() {

    if (
        !currentUser
    ) {

        return;

    }


    const pendientes =
        avisosActuales.filter(
            aviso =>
                !avisoEstaLeido(
                    aviso
                )
        );


    if (
        pendientes.length === 0
    ) {

        return;

    }


    if (
        markAllReadButton
    ) {

        markAllReadButton.disabled =
            true;

        markAllReadButton.textContent =
            "Actualizando...";

    }


    try {

        /*
         * Actualizamos individualmente
         * para mantener compatibilidad
         * con las reglas de Firestore.
         */

        for (
            const aviso of pendientes
        ) {

            const referencia =
                doc(
                    db,
                    "usuarios",
                    currentUser.uid,
                    "avisos",
                    aviso._id
                );


            await updateDoc(
                referencia,
                {
                    leido: true
                }
            );


            aviso.leido =
                true;

        }


        actualizarContador();


        renderizarAvisos();


        mostrarMensaje(
            "Todos tus avisos fueron marcados como leídos.",
            "success"
        );


        console.log(
            "OTIUM: todos los avisos fueron marcados como leídos."
        );


    } catch (
        error
    ) {

        console.error(
            "OTIUM: error marcando todos los avisos como leídos:",
            error
        );


        mostrarMensaje(
            "No fue posible actualizar todos los avisos.",
            "error"
        );


    } finally {

        if (
            markAllReadButton
        ) {

            markAllReadButton.textContent =
                "Marcar todos como leídos";

        }


        actualizarContador();

    }

}



/* =====================================================
   EVENTOS DE LA LISTA
===================================================== */

if (
    alertsList
) {

    alertsList.addEventListener(
        "click",
        async event => {

            const boton =
                event.target.closest(
                    "[data-mark-read='true']"
                );


            if (
                boton
            ) {

                const avisoId =
                    boton.dataset.alertId;


                await marcarAvisoComoLeido(
                    avisoId
                );


                return;

            }


            /*
             * Si el usuario abre un evento
             * desde un aviso no leído,
             * lo marcamos como leído antes
             * de continuar.
             */

            const enlace =
                event.target.closest(
                    "[data-event-link='true']"
                );


            if (
                enlace
            ) {

                const avisoId =
                    enlace.dataset.alertId;


                if (
                    avisoId
                ) {

                    await marcarAvisoComoLeido(
                        avisoId
                    );

                }

            }

        }
    );

}



/* =====================================================
   BOTÓN MARCAR TODOS
===================================================== */

if (
    markAllReadButton
) {

    markAllReadButton.addEventListener(
        "click",
        marcarTodosComoLeidos
    );

}



/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async user => {

        currentUser =
            user || null;


        console.log(
            "OTIUM: estado de autenticación en Centro de avisos:",
            currentUser
                ? currentUser.uid
                : "sin usuario"
        );


        if (
            currentUser
        ) {

            loginRequired
                ?.classList
                .remove(
                    "visible"
                );


            alertsContent
                ?.classList
                .add(
                    "visible"
                );


            await cargarAvisos();

        } else {

            alertsContent
                ?.classList
                .remove(
                    "visible"
                );


            loginRequired
                ?.classList
                .add(
                    "visible"
                );


            avisosActuales =
                [];


            actualizarContador();


            ocultarMensaje();

        }

    }
);



/* =====================================================
   INICIALIZACIÓN
===================================================== */

actualizarContador();


console.log(
    "OTIUM: centro-avisos.js inicializado correctamente."
);