/* =========================================================
   OTIUM - CALENDARIO
   Calendario mensual + vista detallada por día

   VERSIÓN:
   2026-09-15

   FUNCIONES:
   - Soportar fechaInicio + fechaTermino.
   - Soportar eventos de un solo día.
   - Soportar eventos de varios días.
   - Mantener compatibilidad con campo fecha antiguo.
   - Mantener compatibilidad con date / fechaEvento.
   - Mostrar eventos correctamente en cada día.
   - Máximo 4 eventos visibles por día.
   - Mostrar "+ X más" cuando existen más eventos.
   - Vista detallada de todos los eventos del día.
   - Orden cronológico por hora de inicio.
   - Color visual según categoría.
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
   CONSTANTES
===================================================== */

const MAX_EVENTS_PER_DAY = 4;


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


    const dayEvents =
        eventos.filter(
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
                 */

                return (
                    fechaDia >= fechaInicio &&
                    fechaDia <= fechaFin
                );

            }
        );


    /*
     * ORDENAR POR HORA
     */

    return sortEventsByTime(
        dayEvents
    );

}


/* =====================================================
   OBTENER HORA DEL EVENTO
===================================================== */

function getEventTime(
    evento
) {

    if (!evento) {

        return "";

    }


    return (
        evento.horaInicio ||
        evento.time ||
        evento.hora ||
        ""
    );

}


/* =====================================================
   CONVERTIR HORA A MINUTOS
===================================================== */

function getTimeInMinutes(
    hora
) {

    if (!hora) {

        return 999999;

    }


    const texto =
        String(hora)
            .trim();


    /*
     * Busca formatos como:
     *
     * 09:00
     * 9:00
     * 09:30
     * 9
     */

    const match =
        texto.match(
            /^(\d{1,2})(?::(\d{1,2}))?/
        );


    if (!match) {

        return 999999;

    }


    const hours =
        parseInt(
            match[1],
            10
        );


    const minutes =
        parseInt(
            match[2] || "0",
            10
        );


    if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {

        return 999999;

    }


    return (
        hours * 60 +
        minutes
    );

}


/* =====================================================
   OBTENER TÍTULO DEL EVENTO
===================================================== */

function getEventTitle(
    evento
) {

    return (
        evento?.title ||
        evento?.nombre ||
        evento?.nombreEvento ||
        "Evento"
    );

}


/* =====================================================
   OBTENER CATEGORÍA
===================================================== */

function getEventCategory(
    evento
) {

    return (
        evento?.categoria ||
        evento?.category ||
        "Otros"
    );

}


/* =====================================================
   ORDENAR EVENTOS POR HORA
===================================================== */

function sortEventsByTime(
    lista
) {

    return [...lista].sort(
        (
            eventoA,
            eventoB
        ) => {

            const horaA =
                getTimeInMinutes(
                    getEventTime(
                        eventoA
                    )
                );


            const horaB =
                getTimeInMinutes(
                    getEventTime(
                        eventoB
                    )
                );


            if (
                horaA !== horaB
            ) {

                return horaA - horaB;

            }


            /*
             * Si tienen la misma hora,
             * ordenamos por nombre.
             */

            const tituloA =
                getEventTitle(
                    eventoA
                ).toLocaleLowerCase(
                    "es"
                );


            const tituloB =
                getEventTitle(
                    eventoB
                ).toLocaleLowerCase(
                    "es"
                );


            return tituloA.localeCompare(
                tituloB,
                "es"
            );

        }
    );

}


/* =====================================================
   OBTENER ID DEL EVENTO
===================================================== */

function getEventId(
    evento
) {

    return (
        evento?.firestoreId ||
        evento?.id ||
        evento?.eventId ||
        ""
    );

}


/* =====================================================
   COLOR SEGÚN CATEGORÍA
===================================================== */

function getCategoryClass(
    categoria
) {

    const texto =
        String(
            categoria || ""
        )
        .toLocaleLowerCase(
            "es"
        )
        .trim();


    /*
     * Categorías principales de OTIUM.
     *
     * También dejamos coincidencias
     * parciales para categorías nuevas.
     */

    if (
        texto.includes("música") ||
        texto.includes("musica") ||
        texto.includes("concierto") ||
        texto.includes("festival")
    ) {

        return "category-musica";

    }


    if (
        texto.includes("deporte") ||
        texto.includes("fútbol") ||
        texto.includes("futbol") ||
        texto.includes("basket") ||
        texto.includes("tenis")
    ) {

        return "category-deporte";

    }


    if (
        texto.includes("cultura") ||
        texto.includes("teatro") ||
        texto.includes("arte") ||
        texto.includes("cine") ||
        texto.includes("literatura")
    ) {

        return "category-cultura";

    }


    if (
        texto.includes("gastronom") ||
        texto.includes("comida") ||
        texto.includes("food")
    ) {

        return "category-gastronomia";

    }


    if (
        texto.includes("fiesta") ||
        texto.includes("noche") ||
        texto.includes("discoteca") ||
        texto.includes("bar")
    ) {

        return "category-fiesta";

    }


    if (
        texto.includes("familiar") ||
        texto.includes("familia") ||
        texto.includes("niño") ||
        texto.includes("niños") ||
        texto.includes("infantil")
    ) {

        return "category-familiar";

    }


    if (
        texto.includes("feria") ||
        texto.includes("mercado") ||
        texto.includes("emprend")
    ) {

        return "category-feria";

    }


    return "category-otros";

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
                    ),
                    "| horaInicio:",
                    getEventTime(
                        evento
                    ),
                    "| categoria:",
                    getEventCategory(
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
   RENDERIZAR EVENTO DEL CALENDARIO
===================================================== */

function renderCalendarEvent(
    evento
) {

    const eventId =
        getEventId(
            evento
        );


    const titulo =
        getEventTitle(
            evento
        );


    const hora =
        getEventTime(
            evento
        );


    const categoria =
        getEventCategory(
            evento
        );


    const categoryClass =
        getCategoryClass(
            categoria
        );


    return `

        <a
            href="event-details.html?id=${encodeURIComponent(eventId)}"
            class="
                calendar-event
                ${categoryClass}
            "
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


/* =====================================================
   RENDERIZAR BOTÓN "+ X MÁS"
===================================================== */

function renderMoreButton(
    year,
    month,
    day,
    hiddenCount
) {

    return `

        <button
            type="button"
            class="calendar-more"
            data-calendar-day="${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}"
            aria-label="Ver ${hiddenCount} eventos más"
        >

            + ${hiddenCount} más

        </button>

    `;

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
     * Convertimos:
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


        const visibleEvents =
            dayEvents.slice(
                0,
                MAX_EVENTS_PER_DAY
            );


        const hiddenCount =
            Math.max(
                0,
                dayEvents.length -
                MAX_EVENTS_PER_DAY
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
           SOLO LOS PRIMEROS 4 EVENTOS
        ============================================ */

        visibleEvents.forEach(
            (evento) => {

                html +=
                    renderCalendarEvent(
                        evento
                    );

            }
        );


        /* ============================================
           BOTÓN "+ X MÁS"
        ============================================ */

        if (
            hiddenCount > 0
        ) {

            html +=
                renderMoreButton(
                    year,
                    month,
                    day,
                    hiddenCount
                );

        }


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


    /*
     * Activar botones "+ X más"
     */

    bindMoreButtons();

}


/* =====================================================
   ACTIVAR BOTONES "+ X MÁS"
===================================================== */

function bindMoreButtons() {

    const buttons =
        calendarContainer.querySelectorAll(
            ".calendar-more"
        );


    buttons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const fecha =
                        button.dataset.calendarDay;


                    if (!fecha) {

                        return;

                    }


                    openDayView(
                        fecha
                    );

                }
            );

        }
    );

}


/* =====================================================
   ABRIR VISTA DEL DÍA
===================================================== */

function openDayView(
    fecha
) {

    const eventsForDay =
        eventos.filter(
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


                const fechaFin =
                    compareDateStrings(
                        fechaTermino,
                        fechaInicio
                    ) < 0
                        ? fechaInicio
                        : fechaTermino;


                return (
                    fecha >= fechaInicio &&
                    fecha <= fechaFin
                );

            }
        );


    const orderedEvents =
        sortEventsByTime(
            eventsForDay
        );


    const dateParts =
        fecha.split("-");


    const year =
        parseInt(
            dateParts[0],
            10
        );


    const month =
        parseInt(
            dateParts[1],
            10
        ) - 1;


    const day =
        parseInt(
            dateParts[2],
            10
        );


    const dateObject =
        new Date(
            year,
            month,
            day
        );


    const weekday =
        diasSemana[
            dateObject.getDay() === 0
                ? 6
                : dateObject.getDay() - 1
        ];


    const dateTitle =
        `${weekday} ${day} de ${meses[month]} ${year}`;


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "calendar-day-overlay";


    overlay.innerHTML = `

        <div
            class="calendar-day-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendarDayModalTitle"
        >

            <div class="calendar-day-modal-header">

                <div>

                    <div class="calendar-day-modal-label">

                        EVENTOS DEL DÍA

                    </div>


                    <h2
                        id="calendarDayModalTitle"
                    >

                        ${escapeHTML(dateTitle)}

                    </h2>

                </div>


                <button
                    type="button"
                    class="calendar-day-close"
                    aria-label="Cerrar"
                >

                    ×

                </button>

            </div>


            <div class="calendar-day-modal-content">

                ${
                    orderedEvents.length > 0
                    ? orderedEvents
                        .map(
                            renderDayDetailEvent
                        )
                        .join("")
                    : `
                        <div class="calendar-day-empty-message">

                            No hay eventos para este día.

                        </div>
                      `
                }

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    /*
     * Evitar scroll del fondo
     */

    document.body.classList.add(
        "calendar-modal-open"
    );


    /*
     * Cerrar
     */

    const closeButton =
        overlay.querySelector(
            ".calendar-day-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                closeDayView(
                    overlay
                );

            }
        );

    }


    /*
     * Clic fuera de la ventana
     */

    overlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target === overlay
            ) {

                closeDayView(
                    overlay
                );

            }

        }
    );


    /*
     * Escape
     */

    overlay._escapeHandler =
        (event) => {

            if (
                event.key === "Escape"
            ) {

                closeDayView(
                    overlay
                );

            }

        };


    document.addEventListener(
        "keydown",
        overlay._escapeHandler
    );

}


/* =====================================================
   RENDERIZAR EVENTO EN VISTA DIARIA
===================================================== */

function renderDayDetailEvent(
    evento
) {

    const eventId =
        getEventId(
            evento
        );


    const titulo =
        getEventTitle(
            evento
        );


    const hora =
        getEventTime(
            evento
        );


    const categoria =
        getEventCategory(
            evento
        );


    const categoryClass =
        getCategoryClass(
            categoria
        );


    return `

        <a
            href="event-details.html?id=${encodeURIComponent(eventId)}"
            class="
                calendar-day-event
                ${categoryClass}
            "
        >

            <div class="calendar-day-event-time">

                ${
                    hora
                    ? escapeHTML(hora)
                    : "Sin hora"
                }

            </div>


            <div class="calendar-day-event-main">

                <strong>

                    ${escapeHTML(titulo)}

                </strong>


                <span>

                    ${escapeHTML(categoria)}

                </span>

            </div>

        </a>

    `;

}


/* =====================================================
   CERRAR VISTA DEL DÍA
===================================================== */

function closeDayView(
    overlay
) {

    if (!overlay) {

        return;

    }


    if (
        overlay._escapeHandler
    ) {

        document.removeEventListener(
            "keydown",
            overlay._escapeHandler
        );

    }


    overlay.remove();


    document.body.classList.remove(
        "calendar-modal-open"
    );

}


/* =====================================================
   ESTILOS ADICIONALES
===================================================== */

/*
 * Los estilos de la vista diaria se agregan
 * desde JavaScript para no modificar todavía
 * calendario.html.
 */

function injectCalendarStyles() {

    if (
        document.getElementById(
            "otiumCalendarExtraStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "otiumCalendarExtraStyles";


    style.textContent = `

        /* ==========================================
           BOTÓN + X MÁS
        =========================================== */

        .calendar-more {

            display: block;

            width: 100%;

            margin-top: 2px;

            padding: 5px 6px;

            border: none;

            border-radius: 5px;

            background: transparent;

            color: #173b68;

            font-size: 12px;

            font-weight: 700;

            text-align: left;

            cursor: pointer;

        }


        .calendar-more:hover {

            background: #e9eef5;

        }


        /* ==========================================
           EVENTO MENSUAL
        =========================================== */

        .calendar-event {

            position: relative;

            border-left: 4px solid transparent;

        }


        .calendar-event.category-musica,
        .calendar-day-event.category-musica {

            border-left-color: #8e44ad;

        }


        .calendar-event.category-deporte,
        .calendar-day-event.category-deporte {

            border-left-color: #2980b9;

        }


        .calendar-event.category-cultura,
        .calendar-day-event.category-cultura {

            border-left-color: #16a085;

        }


        .calendar-event.category-gastronomia,
        .calendar-day-event.category-gastronomia {

            border-left-color: #d35400;

        }


        .calendar-event.category-fiesta,
        .calendar-day-event.category-fiesta {

            border-left-color: #c0392b;

        }


        .calendar-event.category-familiar,
        .calendar-day-event.category-familiar {

            border-left-color: #27ae60;

        }


        .calendar-event.category-feria,
        .calendar-day-event.category-feria {

            border-left-color: #f39c12;

        }


        .calendar-event.category-otros,
        .calendar-day-event.category-otros {

            border-left-color: #607d8b;

        }


        /* ==========================================
           MODAL DEL DÍA
        =========================================== */

        body.calendar-modal-open {

            overflow: hidden;

        }


        .calendar-day-overlay {

            position: fixed;

            inset: 0;

            z-index: 99999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 25px;

            background: rgba(
                8,
                20,
                38,
                0.72
            );

        }


        .calendar-day-modal {

            width: min(
                760px,
                100%
            );

            max-height: 85vh;

            overflow: hidden;

            background: #ffffff;

            border-radius: 16px;

            box-shadow:
                0 20px 60px
                rgba(
                    0,
                    0,
                    0,
                    0.28
                );

            display: flex;

            flex-direction: column;

        }


        .calendar-day-modal-header {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 20px;

            padding: 22px 24px;

            border-bottom: 1px solid #e5e7eb;

        }


        .calendar-day-modal-label {

            margin-bottom: 5px;

            color: #6b7280;

            font-size: 11px;

            font-weight: 800;

            letter-spacing: 1px;

        }


        .calendar-day-modal-header h2 {

            margin: 0;

            color: #173b68;

            font-size: 24px;

        }


        .calendar-day-close {

            flex: 0 0 auto;

            width: 40px;

            height: 40px;

            border: none;

            border-radius: 50%;

            background: #f1f3f5;

            color: #173b68;

            font-size: 28px;

            line-height: 1;

            cursor: pointer;

        }


        .calendar-day-close:hover {

            background: #e2e6ea;

        }


        .calendar-day-modal-content {

            padding: 18px 24px 24px;

            overflow-y: auto;

        }


        /* ==========================================
           EVENTO EN VISTA DIARIA
        =========================================== */

        .calendar-day-event {

            display: flex;

            align-items: center;

            gap: 16px;

            margin-bottom: 10px;

            padding: 13px 15px;

            border: 1px solid #e5e7eb;

            border-left-width: 5px;

            border-radius: 9px;

            background: #fafafa;

            color: inherit;

            text-decoration: none;

            transition:
                transform 0.15s ease,
                background 0.15s ease;

        }


        .calendar-day-event:hover {

            background: #f4f7fa;

            transform: translateX(2px);

        }


        .calendar-day-event-time {

            flex: 0 0 65px;

            color: #173b68;

            font-size: 14px;

            font-weight: 800;

        }


        .calendar-day-event-main {

            min-width: 0;

            display: flex;

            flex-direction: column;

            gap: 4px;

        }


        .calendar-day-event-main strong {

            color: #1f2937;

            font-size: 15px;

        }


        .calendar-day-event-main span {

            color: #6b7280;

            font-size: 12px;

        }


        .calendar-day-empty-message {

            padding: 35px 15px;

            color: #6b7280;

            text-align: center;

        }


        /* ==========================================
           MÓVIL
        =========================================== */

        @media (max-width: 600px) {

            .calendar-day-overlay {

                align-items: flex-end;

                padding: 0;

            }


            .calendar-day-modal {

                width: 100%;

                max-height: 90vh;

                border-radius:
                    16px 16px 0 0;

            }


            .calendar-day-modal-header {

                padding: 18px;

            }


            .calendar-day-modal-header h2 {

                font-size: 19px;

            }


            .calendar-day-modal-content {

                padding:
                    15px 14px 20px;

            }


            .calendar-day-event {

                gap: 10px;

                padding: 11px;

            }


            .calendar-day-event-time {

                flex-basis: 52px;

                font-size: 12px;

            }


            .calendar-day-event-main strong {

                font-size: 13px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

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
   INICIALIZAR ESTILOS
===================================================== */

injectCalendarStyles();


/* =====================================================
   INICIAR
===================================================== */

loadCalendar();