/* =========================================================
   OTIUM - CALENDARIO
   Cargar y mostrar eventos en calendario mensual

   VERSIÓN:
   2026-09-13

   OBJETIVOS:
   - Soportar fechaInicio + fechaTermino.
   - Soportar eventos de un solo día.
   - Soportar eventos de varios días.
   - Mantener compatibilidad con campo fecha antiguo.
   - Mantener compatibilidad con date / fechaEvento.
   - Mostrar eventos correctamente en cada día.
   - Mantener navegación mensual.
   ========================================================= */


import {
    getEvents
} from "./modules/database.js";


/* =====================================================
   ELEMENTOS
===================================================== */

const calendarContainer =
    document.getElementById(
        "calendarContainer"
    );


const monthTitle =
    document.getElementById(
        "calendarMonth"
    );


const previousButton =
    document.getElementById(
        "previousMonth"
    );


const nextButton =
    document.getElementById(
        "nextMonth"
    );


/* =====================================================
   COMPROBAR CONTENEDOR
===================================================== */

if (!calendarContainer) {

    console.error(
        "OTIUM - No existe #calendarContainer"
    );

}


/* =====================================================
   FECHA ACTUAL
===================================================== */

let currentDate =
    new Date();


/* =====================================================
   EVENTOS
===================================================== */

let eventos = [];


/* =====================================================
   NOMBRES DE LOS MESES
===================================================== */

const meses = [

    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"

];


/* =====================================================
   DÍAS DE LA SEMANA
===================================================== */

const diasSemana = [

    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo"

];


/* =====================================================
   NORMALIZAR FECHA
===================================================== */

/*
 * Convierte una fecha a texto YYYY-MM-DD.
 *
 * Soporta:
 *
 * - YYYY-MM-DD
 * - YYYY-MM-DDTHH:mm:ss
 * - Date
 * - Timestamp Firestore
 * - objetos con toDate()
 */

function normalizeDate(
    value
) {

    if (!value) {

        return "";

    }


    /* =========================================
       STRING
    ========================================= */

    if (
        typeof value === "string"
    ) {

        return value
            .substring(0, 10);

    }


    /* =========================================
       FIRESTORE TIMESTAMP
    ========================================= */

    if (
        typeof value.toDate === "function"
    ) {

        const date =
            value.toDate();

        return formatDateLocal(
            date
        );

    }


    /* =========================================
       DATE
    ========================================= */

    if (
        value instanceof Date
    ) {

        return formatDateLocal(
            value
        );

    }


    return "";

}


/* =====================================================
   FORMATEAR DATE LOCAL
===================================================== */

function formatDateLocal(
    date
) {

    if (
        !(date instanceof Date) ||
        isNaN(date.getTime())
    ) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =====================================================
   OBTENER FECHA INICIO
===================================================== */

function getEventStartDate(
    evento
) {

    if (!evento) {

        return "";

    }


    /*
     * NUEVA ESTRUCTURA
     */

    const fechaInicio =
        evento.fechaInicio;


    if (fechaInicio) {

        return normalizeDate(
            fechaInicio
        );

    }


    /*
     * COMPATIBILIDAD
     */

    const fecha =
        evento.fecha ||
        evento.date ||
        evento.fechaEvento ||
        "";


    return normalizeDate(
        fecha
    );

}


/* =====================================================
   OBTENER FECHA TÉRMINO
===================================================== */

function getEventEndDate(
    evento
) {

    if (!evento) {

        return "";

    }


    /*
     * NUEVA ESTRUCTURA
     */

    const fechaTermino =
        evento.fechaTermino;


    if (fechaTermino) {

        return normalizeDate(
            fechaTermino
        );

    }


    /*
     * SI NO EXISTE FECHA TÉRMINO,
     * EL EVENTO TERMINA EL MISMO DÍA
     * DE LA FECHA DE INICIO.
     */

    return getEventStartDate(
        evento
    );

}


/* =====================================================
   COMPARAR FECHAS YYYY-MM-DD
===================================================== */

function compareDateStrings(
    fechaA,
    fechaB
) {

    if (
        !fechaA ||
        !fechaB
    ) {

        return 0;

    }


    if (
        fechaA < fechaB
    ) {

        return -1;

    }


    if (
        fechaA > fechaB
    ) {

        return 1;

    }


    return 0;

}


/* =====================================================
   OBTENER EVENTOS DE UN DÍA
===================================================== */

function getEventsForDay(
    year,
    month,
    day
) {

    /*
     * Construimos la fecha del día
     * en formato YYYY-MM-DD.
     */

    const fechaDia =
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


    return eventos.filter(
        (evento) => {

            const fechaInicio =
                getEventStartDate(
                    evento
                );


            if (!fechaInicio) {

                return false;

            }


            const fechaTermino =
                getEventEndDate(
                    evento
                ) ||
                fechaInicio;


            /*
             * Si por algún motivo la fecha
             * de término es anterior a la
             * fecha de inicio, usamos la
             * fecha de inicio como término.
             */

            const fechaFin =
                compareDateStrings(
                    fechaTermino,
                    fechaInicio
                ) < 0
                    ? fechaInicio
                    : fechaTermino;


            /*
             * EVENTO DE UN DÍA
             */

            if (
                fechaInicio === fechaFin
            ) {

                return (
                    fechaDia === fechaInicio
                );

            }


            /*
             * EVENTO DE VARIOS DÍAS
             *
             * Aparece en todos los días
             * comprendidos entre inicio
             * y término, ambos inclusive.
             */

            return (
                fechaDia >= fechaInicio &&
                fechaDia <= fechaFin
            );

        }
    );

}


/* =====================================================
   CARGAR EVENTOS
===================================================== */

async function loadCalendar() {

    try {

        eventos =
            await getEvents();


        console.log(
            "OTIUM - EVENTOS DEL CALENDARIO:",
            eventos
        );


        console.log(
            "OTIUM - Cantidad de eventos:",
            eventos.length
        );


        /*
         * Mostrar fechas que utilizará
         * el calendario para depuración.
         */

        eventos.forEach(
            (evento) => {

                console.log(
                    "OTIUM - Evento calendario:",
                    evento.firestoreId ||
                    evento.id ||
                    "",
                    "| fechaInicio:",
                    getEventStartDate(
                        evento
                    ),
                    "| fechaTermino:",
                    getEventEndDate(
                        evento
                    )
                );

            }
        );


        renderCalendar();


    } catch (error) {

        console.error(
            "OTIUM - Error cargando eventos del calendario:",
            error
        );


        if (calendarContainer) {

            calendarContainer.innerHTML = `

                <div class="calendar-error">

                    <h3>
                        Error al cargar el calendario
                    </h3>

                    <p>
                        No fue posible cargar los eventos.
                    </p>

                </div>

            `;

        }

    }

}


/* =====================================================
   RENDERIZAR CALENDARIO
===================================================== */

function renderCalendar() {

    if (!calendarContainer) {

        console.error(
            "OTIUM - No existe #calendarContainer"
        );

        return;

    }


    const year =
        currentDate.getFullYear();


    const month =
        currentDate.getMonth();


    /* ================================================
       TÍTULO DEL MES
    ================================================= */

    if (monthTitle) {

        monthTitle.textContent =
            `${meses[month]} ${year}`;

    }


    /* ================================================
       PRIMER DÍA DEL MES
    ================================================= */

    const firstDay =
        new Date(
            year,
            month,
            1
        );


    /*
     * JavaScript:
     *
     * Domingo = 0
     * Lunes = 1
     *
     * Convertimos para que:
     *
     * Lunes = 0
     * Domingo = 6
     */

    let firstDayIndex =
        firstDay.getDay();


    firstDayIndex =
        firstDayIndex === 0
            ? 6
            : firstDayIndex - 1;


    /* ================================================
       CANTIDAD DE DÍAS
    ================================================= */

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    /* ================================================
       CONSTRUIR HTML
    ================================================= */

    let html = `

        <div class="calendar-grid">

    `;


    /* ================================================
       CABECERA
    ================================================= */

    diasSemana.forEach(
        (dia) => {

            html += `

                <div class="calendar-weekday">

                    ${dia}

                </div>

            `;

        }
    );


    /* ================================================
       ESPACIOS ANTES DEL DÍA 1
    ================================================= */

    for (
        let i = 0;
        i < firstDayIndex;
        i++
    ) {

        html += `

            <div class="calendar-day empty">

            </div>

        `;

    }


    /* ================================================
       FECHA ACTUAL
    ================================================= */

    const today =
        new Date();


    /* ================================================
       DÍAS DEL MES
    ================================================= */

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dayEvents =
            getEventsForDay(
                year,
                month,
                day
            );


        const isToday =

            today.getFullYear() === year &&

            today.getMonth() === month &&

            today.getDate() === day;


        html += `

            <div
                class="
                    calendar-day
                    ${isToday ? "today" : ""}
                    ${dayEvents.length > 0 ? "has-events" : ""}
                "
            >

                <div class="calendar-day-number">

                    ${day}

                </div>

                <div class="calendar-events">

        `;


        /* ============================================
           EVENTOS DEL DÍA
        ============================================ */

        dayEvents.forEach(
            (evento) => {

                const eventId =
                    evento.firestoreId ||
                    evento.id ||
                    evento.eventId ||
                    "";


                const titulo =
                    evento.title ||
                    evento.nombre ||
                    evento.nombreEvento ||
                    "Evento";


                /*
                 * NUEVA ESTRUCTURA
                 */

                const hora =
                    evento.horaInicio ||
                    evento.time ||
                    evento.hora ||
                    "";


                html += `

                    <a
                        href="event-details.html?id=${encodeURIComponent(eventId)}"
                        class="calendar-event"
                        title="${escapeHTML(titulo)}"
                    >

                        <strong>

                            ${escapeHTML(titulo)}

                        </strong>


                        ${
                            hora
                            ? `
                                <span>
                                    ${escapeHTML(hora)}
                                </span>
                              `
                            : ""
                        }

                    </a>

                `;

            }
        );


        html += `

                </div>

            </div>

        `;

    }


    /* ================================================
       ESPACIOS DESPUÉS DEL ÚLTIMO DÍA
    ================================================= */

    const totalCells =
        firstDayIndex +
        daysInMonth;


    const remainingCells =
        totalCells % 7 === 0
            ? 0
            : 7 - (
                totalCells % 7
            );


    for (
        let i = 0;
        i < remainingCells;
        i++
    ) {

        html += `

            <div class="calendar-day empty">

            </div>

        `;

    }


    html += `

        </div>

    `;


    calendarContainer.innerHTML =
        html;

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(value)

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
   MES ANTERIOR
===================================================== */

if (previousButton) {

    previousButton.addEventListener(
        "click",
        () => {

            currentDate.setMonth(
                currentDate.getMonth() - 1
            );


            renderCalendar();

        }
    );

}


/* =====================================================
   MES SIGUIENTE
===================================================== */

if (nextButton) {

    nextButton.addEventListener(
        "click",
        () => {

            currentDate.setMonth(
                currentDate.getMonth() + 1
            );


            renderCalendar();

        }
    );

}


/* =====================================================
   INICIAR
===================================================== */

loadCalendar();