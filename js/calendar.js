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
        "No existe #calendarContainer"
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
   CARGAR EVENTOS
===================================================== */

async function loadCalendar() {

    try {

        eventos =
            await getEvents();


        console.log(
            "EVENTOS DEL CALENDARIO:",
            eventos
        );


        renderCalendar();


    } catch (error) {

        console.error(
            "Error cargando eventos del calendario:",
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
   OBTENER EVENTOS DE UN DÍA
===================================================== */

function getEventsForDay(
    year,
    month,
    day
) {

    return eventos.filter(
        (evento) => {

            const fecha =
                evento.date ||
                evento.fecha ||
                evento.fechaEvento ||
                "";

            if (!fecha) {

                return false;

            }


            /*
             * Normalizar fecha.
             *
             * Firestore puede contener:
             * YYYY-MM-DD
             */

            const fechaTexto =
                String(fecha)
                    .substring(0, 10);


            const partes =
                fechaTexto.split("-");


            if (
                partes.length !== 3
            ) {

                return false;

            }


            const eventYear =
                Number(partes[0]);

            const eventMonth =
                Number(partes[1]) - 1;

            const eventDay =
                Number(partes[2]);


            return (

                eventYear === year &&
                eventMonth === month &&
                eventDay === day

            );

        }
    );

}


/* =====================================================
   RENDERIZAR CALENDARIO
===================================================== */

function renderCalendar() {

    if (!calendarContainer) {

        console.error(
            "No existe #calendarContainer"
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
       DÍAS DEL MES
    ================================================= */

    const today =
        new Date();


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
                    "";


                const titulo =
                    evento.title ||
                    evento.nombre ||
                    evento.nombreEvento ||
                    "Evento";


                const hora =
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