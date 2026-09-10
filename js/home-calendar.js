```javascript
/* =====================================================
   OTIUM - MINI CALENDARIO DEL HOME
   Muestra los 5 eventos futuros más próximos
===================================================== */

import {
    getEvents
} from "./modules/database.js";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const MAX_EVENTOS =
    5;


/* =====================================================
   INICIO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarMiniCalendario();

    }
);


/* =====================================================
   CARGAR EVENTOS
===================================================== */

async function cargarMiniCalendario() {

    const container =
        document.querySelector(
            ".calendar-list"
        );


    if (!container) {

        console.warn(
            "OTIUM: no existe .calendar-list"
        );

        return;

    }


    container.innerHTML = `

        <div class="calendar-loading">

            Cargando próximos eventos...

        </div>

    `;


    try {

        const eventos =
            await getEvents();


        console.log(
            "OTIUM: eventos recibidos para mini calendario:",
            eventos
        );


        const futuros =
            eventos
                .filter(
                    esEventoFuturo
                )
                .sort(
                    compararEventos
                )
                .slice(
                    0,
                    MAX_EVENTOS
                );


        if (
            futuros.length === 0
        ) {

            container.innerHTML = `

                <div class="calendar-empty">

                    <strong>
                        No hay próximos eventos.
                    </strong>

                    <span>
                        Pronto encontrarás nuevas actividades en OTIUM.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            futuros
                .map(
                    crearEventoCalendario
                )
                .join("");


        conectarBotones(
            container
        );


    } catch (error) {

        console.error(
            "OTIUM: error cargando mini calendario:",
            error
        );


        container.innerHTML = `

            <div class="calendar-error">

                No fue posible cargar los próximos eventos.

            </div>

        `;

    }

}


/* =====================================================
   DETERMINAR SI ES FUTURO
===================================================== */

function esEventoFuturo(
    evento
) {

    const fecha =
        obtenerFechaEvento(
            evento
        );


    if (!fecha) {

        return false;

    }


    return fecha.getTime()
        >= Date.now();

}


/* =====================================================
   OBTENER FECHA + HORA
===================================================== */

function obtenerFechaEvento(
    evento
) {

    const fechaTexto =
        evento.fecha ||
        evento.date ||
        evento.fechaEvento ||
        "";


    if (!fechaTexto) {

        return null;

    }


    const horaTexto =
        evento.hora ||
        evento.time ||
        evento.horaEvento ||
        "00:00";


    let fecha;


    /*
     * YYYY-MM-DD
     */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            String(
                fechaTexto
            )
        )
    ) {

        fecha =
            new Date(
                `${fechaTexto}T${horaTexto || "00:00"}:00`
            );

    }


    /*
     * DD/MM/YYYY
     */

    else if (
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(
            String(
                fechaTexto
            )
        )
    ) {

        const partes =
            String(
                fechaTexto
            ).split("/");


        const dia =
            partes[0].padStart(
                2,
                "0"
            );


        const mes =
            partes[1].padStart(
                2,
                "0"
            );


        const anio =
            partes[2];


        fecha =
            new Date(
                `${anio}-${mes}-${dia}T${horaTexto || "00:00"}:00`
            );

    }


    /*
     * Intento general
     */

    else {

        fecha =
            new Date(
                fechaTexto
            );

    }


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return null;

    }


    return fecha;

}


/* =====================================================
   ORDENAR
===================================================== */

function compararEventos(
    a,
    b
) {

    const fechaA =
        obtenerFechaEvento(
            a
        );


    const fechaB =
        obtenerFechaEvento(
            b
        );


    if (!fechaA) {

        return 1;

    }


    if (!fechaB) {

        return -1;

    }


    return (
        fechaA.getTime() -
        fechaB.getTime()
    );

}


/* =====================================================
   CREAR ITEM
===================================================== */

function crearEventoCalendario(
    evento
) {

    const id =
        evento.firestoreId ||
        evento.id ||
        "";


    const nombre =
        evento.nombre ||
        evento.title ||
        evento.nombreEvento ||
        "Evento sin título";


    const categoria =
        evento.categoria ||
        evento.category ||
        "Evento";


    const ciudad =
        evento.ciudad ||
        evento.city ||
        "";


    const hora =
        evento.hora ||
        evento.time ||
        "";


    const fecha =
        obtenerFechaEvento(
            evento
        );


    let dia =
        "--";


    let mes =
        "---";


    if (fecha) {

        dia =
            String(
                fecha.getDate()
            ).padStart(
                2,
                "0"
            );


        mes =
            fecha
                .toLocaleDateString(
                    "es-CL",
                    {
                        month:
                            "short"
                    }
                )
                .replace(
                    ".",
                    ""
                )
                .toUpperCase();

    }


    const fechaOriginal =
        evento.fecha ||
        evento.date ||
        "";


    const ciudadTexto =
        ciudad
            ? ` · ${escaparHTML(ciudad)}`
            : "";


    const horaTexto =
        hora
            ? `${escaparHTML(hora)}`
            : "Horario por confirmar";


    return `

        <article
            class="calendar-item"
            data-event-id="${escaparHTML(id)}">


            <div
                class="calendar-date">

                <strong>
                    ${dia}
                </strong>

                <span>
                    ${mes}
                </span>

            </div>


            <div
                class="calendar-event-info">

                <span
                    class="calendar-category">

                    ${escaparHTML(
                        categoria
                    )}

                </span>


                <b>
                    ${escaparHTML(
                        nombre
                    )}
                </b>


                <small>

                    ${horaTexto}
                    ${ciudadTexto}

                </small>

            </div>


            <button
                type="button"
                class="calendar-view-button"
                data-event-id="${escaparHTML(id)}">

                Ver

            </button>


        </article>

    `;

}


/* =====================================================
   BOTONES
===================================================== */

function conectarBotones(
    container
) {

    const botones =
        container.querySelectorAll(
            ".calendar-view-button"
        );


    botones.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.eventId;


                    if (!id) {

                        return;

                    }


                    window.location.href =
                        `event-details.html?id=${encodeURIComponent(id)}&origen=home`;

                }
            );

        }
    );

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
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
```
