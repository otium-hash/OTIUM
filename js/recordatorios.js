/* =====================================================
   OTIUM
   MIS RECORDATORIOS
   recordatorios.js
===================================================== */

import {
    getUserReminders,
    getEventById,
    removeReminder
} from "./modules/database.js";

import {
    auth
} from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   ELEMENTOS
===================================================== */

const remindersLoading =
    document.getElementById(
        "remindersLoading"
    );

const remindersList =
    document.getElementById(
        "remindersList"
    );

const remindersEmpty =
    document.getElementById(
        "remindersEmpty"
    );

const remindersMessage =
    document.getElementById(
        "remindersMessage"
    );

const remindersCount =
    document.getElementById(
        "remindersCount"
    );


/* =====================================================
   ESTADO
===================================================== */

let currentUser =
    null;

let reminders =
    [];


/* =====================================================
   UTILIDADES
===================================================== */

function clean(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(
        value
    ).trim();

}


/* =====================================================
   PRIMER VALOR
===================================================== */

function firstValue(
    object,
    keys
) {

    if (
        !object
    ) {

        return "";

    }


    for (
        const key
        of keys
    ) {

        const value =
            object[key];


        if (
            value !== undefined &&
            value !== null &&
            clean(value) !== ""
        ) {

            return value;

        }

    }


    return "";

}


/* =====================================================
   FECHA
===================================================== */

function formatDate(
    value
) {

    const text =
        clean(value);


    if (
        !text
    ) {

        return "Por confirmar";

    }


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {

        const [
            year,
            month,
            day
        ] =
            text.split(
                "-"
            );


        return `${day}-${month}-${year}`;

    }


    return text;

}


/* =====================================================
   MENSAJE
===================================================== */

function showMessage(
    text,
    type = "error"
) {

    if (
        !remindersMessage
    ) {

        return;

    }


    remindersMessage.textContent =
        text;


    remindersMessage.className =
        `reminders-message visible ${type}`;

}


function hideMessage() {

    if (
        !remindersMessage
    ) {

        return;

    }


    remindersMessage.textContent =
        "";


    remindersMessage.className =
        "reminders-message";

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


/* =====================================================
   CARGAR RECORDATORIOS
===================================================== */

async function loadReminders() {

    hideMessage();


    if (
        remindersLoading
    ) {

        remindersLoading.style.display =
            "block";

    }


    if (
        remindersList
    ) {

        remindersList.innerHTML =
            "";

    }


    if (
        remindersEmpty
    ) {

        remindersEmpty.classList.remove(
            "visible"
        );

    }


    if (
        remindersCount
    ) {

        remindersCount.style.display =
            "none";

    }


    /* =================================================
       AUTENTICACIÓN
    ================================================== */

    if (
        !currentUser
    ) {

        if (
            remindersLoading
        ) {

            remindersLoading.style.display =
                "none";

        }


        showMessage(
            "Debes iniciar sesión para ver tus recordatorios.",
            "warning"
        );


        return;

    }


    try {

        console.log(
            "OTIUM - Cargando recordatorios de:",
            currentUser.uid
        );


        /* =================================================
           OBTENER RECORDATORIOS
        ================================================== */

        const recordatorios =
            await getUserReminders(
                currentUser.uid
            );


        console.log(
            "OTIUM - Recordatorios encontrados:",
            recordatorios.length
        );


        /* =================================================
           OBTENER EVENTOS
        ================================================== */

        const remindersWithEvents =
            await Promise.all(
                recordatorios.map(
                    async (
                        recordatorio
                    ) => {

                        const eventId =
                            clean(
                                recordatorio.eventId
                            );


                        if (
                            !eventId
                        ) {

                            return {

                                ...recordatorio,

                                evento:
                                    null

                            };

                        }


                        try {

                            const evento =
                                await getEventById(
                                    eventId
                                );


                            return {

                                ...recordatorio,

                                evento

                            };

                        } catch (
                            error
                        ) {

                            console.warn(
                                "OTIUM - No fue posible cargar evento:",
                                eventId,
                                error
                            );


                            return {

                                ...recordatorio,

                                evento:
                                    null

                            };

                        }

                    }
                )
            );


        reminders =
            remindersWithEvents;


        /* =================================================
           OCULTAR CARGANDO
        ================================================== */

        if (
            remindersLoading
        ) {

            remindersLoading.style.display =
                "none";

        }


        /* =================================================
           SIN RECORDATORIOS
        ================================================== */

        if (
            reminders.length === 0
        ) {

            if (
                remindersEmpty
            ) {

                remindersEmpty.classList.add(
                    "visible"
                );

            }


            return;

        }


        /* =================================================
           CONTADOR
        ================================================== */

        if (
            remindersCount
        ) {

            const cantidad =
                reminders.length;


            remindersCount.textContent =
                cantidad === 1
                    ? "Tienes 1 recordatorio."
                    : `Tienes ${cantidad} recordatorios.`;


            remindersCount.style.display =
                "block";

        }


        /* =================================================
           RENDER
        ================================================== */

        renderReminders();


    } catch (
        error
    ) {

        console.error(
            "OTIUM - Error cargando recordatorios:",
            error
        );


        if (
            remindersLoading
        ) {

            remindersLoading.style.display =
                "none";

        }


        showMessage(
            "No fue posible cargar tus recordatorios.",
            "error"
        );

    }

}


/* =====================================================
   RENDERIZAR RECORDATORIOS
===================================================== */

function renderReminders() {

    if (
        !remindersList
    ) {

        return;

    }


    remindersList.innerHTML =
        "";


    reminders.forEach(
        (
            reminder
        ) => {

            const card =
                createReminderCard(
                    reminder
                );


            remindersList.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   CREAR TARJETA
===================================================== */

function createReminderCard(
    reminder
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "reminder-card";


    const evento =
        reminder.evento;


    /* =================================================
       DATOS
    ================================================== */

    const nombreEvento =
        firstValue(
            evento,
            [
                "nombre",
                "title",
                "name"
            ]
        ) ||
        "Evento no disponible";


    const fechaEvento =
        firstValue(
            evento,
            [
                "fecha",
                "date"
            ]
        ) ||
        reminder.fechaEvento ||
        "";


    const horaEvento =
        firstValue(
            evento,
            [
                "hora",
                "time"
            ]
        ) ||
        reminder.horaEvento ||
        "";


    const ciudad =
        firstValue(
            evento,
            [
                "ciudad",
                "city"
            ]
        );


    const ubicacion =
        firstValue(
            evento,
            [
                "ubicacion",
                "ubicación",
                "direccion",
                "dirección",
                "address"
            ]
        );


    const categoria =
        firstValue(
            evento,
            [
                "categoria",
                "category"
            ]
        );


    const eventFirestoreId =
        clean(
            evento?.firestoreId ||
            reminder.eventId
        );


    /* =================================================
       CONTENIDO
    ================================================== */

    article.innerHTML =
        `
            <div class="reminder-card-top">

                <div class="reminder-card-icon">
                    🔔
                </div>

                <div class="reminder-card-title">

                    <h2>
                        ${escapeHtml(
                            nombreEvento
                        )}
                    </h2>

                    <span class="reminder-status">
                        Recordatorio activo
                    </span>

                </div>

            </div>


            <div class="reminder-data">

                ${
                    fechaEvento
                        ? `
                            <div class="reminder-data-row">

                                <span class="reminder-data-icon">
                                    📅
                                </span>

                                <span>
                                    <strong>Fecha:</strong>
                                    ${escapeHtml(
                                        formatDate(
                                            fechaEvento
                                        )
                                    )}
                                </span>

                            </div>
                        `
                        : ""
                }


                ${
                    horaEvento
                        ? `
                            <div class="reminder-data-row">

                                <span class="reminder-data-icon">
                                    🕐
                                </span>

                                <span>
                                    <strong>Hora:</strong>
                                    ${escapeHtml(
                                        horaEvento
                                    )}
                                </span>

                            </div>
                        `
                        : ""
                }


                ${
                    ciudad
                        ? `
                            <div class="reminder-data-row">

                                <span class="reminder-data-icon">
                                    📍
                                </span>

                                <span>
                                    <strong>Ciudad:</strong>
                                    ${escapeHtml(
                                        ciudad
                                    )}
                                </span>

                            </div>
                        `
                        : ""
                }


                ${
                    ubicacion
                        ? `
                            <div class="reminder-data-row">

                                <span class="reminder-data-icon">
                                    🏛️
                                </span>

                                <span>
                                    <strong>Lugar:</strong>
                                    ${escapeHtml(
                                        ubicacion
                                    )}
                                </span>

                            </div>
                        `
                        : ""
                }


                ${
                    categoria
                        ? `
                            <div class="reminder-data-row">

                                <span class="reminder-data-icon">
                                    🏷️
                                </span>

                                <span>
                                    <strong>Categoría:</strong>
                                    ${escapeHtml(
                                        categoria
                                    )}
                                </span>

                            </div>
                        `
                        : ""
                }

            </div>


            <div class="reminder-actions">

                ${
                    eventFirestoreId &&
                    evento
                        ? `
                            <a
                                class="reminder-action"
                                href="event-details.html?id=${encodeURIComponent(
                                    eventFirestoreId
                                )}">

                                Ver evento

                            </a>
                        `
                        : ""
                }


                <button
                    type="button"
                    class="reminder-action delete"
                    data-reminder-id="${escapeHtml(
                        reminder.firestoreId
                    )}"
                    data-event-id="${escapeHtml(
                        reminder.eventId
                    )}">

                    Eliminar recordatorio

                </button>

            </div>
        `;


    const deleteButton =
        article.querySelector(
            ".reminder-action.delete"
        );


    if (
        deleteButton
    ) {

        deleteButton.addEventListener(
            "click",
            () => {

                deleteReminder(
                    reminder,
                    deleteButton
                );

            }
        );

    }


    return article;

}


/* =====================================================
   ELIMINAR RECORDATORIO
===================================================== */

async function deleteReminder(
    reminder,
    button
) {

    if (
        !currentUser
    ) {

        showMessage(
            "Debes iniciar sesión para realizar esta acción.",
            "warning"
        );

        return;

    }


    const eventId =
        clean(
            reminder.eventId
        );


    if (
        !eventId
    ) {

        showMessage(
            "No se pudo identificar el evento del recordatorio.",
            "error"
        );

        return;

    }


    const confirmar =
        window.confirm(
            "¿Quieres eliminar este recordatorio?"
        );


    if (
        !confirmar
    ) {

        return;

    }


    try {

        button.disabled =
            true;

        button.textContent =
            "Eliminando...";


        await removeReminder(
            currentUser.uid,
            eventId
        );


        reminders =
            reminders.filter(
                (
                    item
                ) =>
                    clean(
                        item.eventId
                    ) !==
                    eventId
            );


        renderReminders();


        if (
            remindersCount
        ) {

            const cantidad =
                reminders.length;


            if (
                cantidad === 0
            ) {

                remindersCount.style.display =
                    "none";

            } else {

                remindersCount.textContent =
                    cantidad === 1
                        ? "Tienes 1 recordatorio."
                        : `Tienes ${cantidad} recordatorios.`;

            }

        }


        if (
            reminders.length === 0 &&
            remindersEmpty
        ) {

            remindersEmpty.classList.add(
                "visible"
            );

        }


        showMessage(
            "Recordatorio eliminado correctamente.",
            "success"
        );


    } catch (
        error
    ) {

        console.error(
            "OTIUM - Error eliminando recordatorio:",
            error
        );


        button.disabled =
            false;

        button.textContent =
            "Eliminar recordatorio";


        showMessage(
            "No fue posible eliminar el recordatorio.",
            "error"
        );

    }

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async (
        user
    ) => {

        currentUser =
            user ||
            null;


        console.log(
            "OTIUM - Usuario:",
            currentUser
                ? currentUser.uid
                : "sin sesión"
        );


        await loadReminders();

    }
);