/* =====================================================
   OTIUM ADS
   PANEL DE ADMINISTRACIÓN DE PROMOCIONES
===================================================== */

import { auth } from "./modules/auth.js";

import { db } from "./modules/firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   ELEMENTOS
===================================================== */

const table =
    document.getElementById("adsTable");

const tableBody =
    document.getElementById("adsTableBody");

const loading =
    document.getElementById("adsLoading");

const empty =
    document.getElementById("adsEmpty");

const message =
    document.getElementById("adsMessage");

const statusFilter =
    document.getElementById("statusFilter");

const refreshButton =
    document.getElementById("refreshAds");

const statPending =
    document.getElementById("statPending");

const statActive =
    document.getElementById("statActive");

const statExpired =
    document.getElementById("statExpired");

const statTotal =
    document.getElementById("statTotal");


/* =====================================================
   VARIABLES
===================================================== */

let promotions = [];


/* =====================================================
   MENSAJES
===================================================== */

function showMessage(text, type = "") {

    if (!message) return;

    message.textContent = text;

    message.className =
        "ads-message show";

    if (type) {
        message.classList.add(type);
    }

    setTimeout(() => {

        message.className =
            "ads-message";

    }, 5000);

}


/* =====================================================
   FORMATO DINERO
===================================================== */

function formatMoney(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "Monto libre";

    }

    return new Intl.NumberFormat(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    ).format(Number(value));

}


/* =====================================================
   FORMATO FECHA
===================================================== */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    try {

        let date;

        if (
            value &&
            typeof value.toDate === "function"
        ) {

            date = value.toDate();

        } else {

            date = new Date(value);

        }

        if (
            !date ||
            Number.isNaN(date.getTime())
        ) {

            return "—";

        }

        return date.toLocaleDateString(
            "es-CL",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch {

        return "—";

    }

}


/* =====================================================
   ESTADO EFECTIVO
===================================================== */

function getEffectiveStatus(promotion) {

    if (
        promotion.estado === "activa" &&
        promotion.fechaFin
    ) {

        let fechaFin;

        try {

            if (
                typeof promotion.fechaFin.toDate ===
                "function"
            ) {

                fechaFin =
                    promotion.fechaFin.toDate();

            } else {

                fechaFin =
                    new Date(
                        promotion.fechaFin
                    );

            }

            if (
                fechaFin &&
                !Number.isNaN(
                    fechaFin.getTime()
                ) &&
                fechaFin < new Date()
            ) {

                return "vencida";

            }

        } catch {

            // Mantener estado original

        }

    }

    return promotion.estado ||
        "pendiente_pago";

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   CARGAR PROMOCIONES
===================================================== */

async function loadPromotions() {

    if (loading) {
        loading.style.display = "block";
    }

    if (table) {
        table.style.display = "none";
    }

    if (empty) {
        empty.style.display = "none";
    }


    try {

        console.log(
            "OTIUM ADS ADMIN: cargando promociones..."
        );


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "promociones"
                )
            );


        promotions =
            snapshot.docs.map(
                document => ({

                    id: document.id,

                    ...document.data()

                })
            );


        console.log(
            "OTIUM ADS ADMIN: promociones encontradas:",
            promotions.length
        );


        updateStats();

        renderPromotions();

    } catch (error) {

        console.error(
            "OTIUM ADS ADMIN: error cargando promociones:",
            error
        );

        showMessage(
            "No fue posible cargar las promociones.",
            "error"
        );

    } finally {

        if (loading) {
            loading.style.display = "none";
        }

    }

}


/* =====================================================
   ESTADÍSTICAS
===================================================== */

function updateStats() {

    let pending = 0;
    let active = 0;
    let expired = 0;


    promotions.forEach(
        promotion => {

            const status =
                getEffectiveStatus(
                    promotion
                );


            if (
                status === "pendiente_pago"
            ) {

                pending++;

            }


            if (
                status === "activa"
            ) {

                active++;

            }


            if (
                status === "vencida"
            ) {

                expired++;

            }

        }
    );


    if (statPending) {
        statPending.textContent =
            pending;
    }

    if (statActive) {
        statActive.textContent =
            active;
    }

    if (statExpired) {
        statExpired.textContent =
            expired;
    }

    if (statTotal) {
        statTotal.textContent =
            promotions.length;
    }

}


/* =====================================================
   MOSTRAR PROMOCIONES
===================================================== */

function renderPromotions() {

    if (!tableBody) return;

    tableBody.innerHTML = "";


    const filter =
        statusFilter
            ? statusFilter.value
            : "todos";


    const filtered =
        promotions.filter(
            promotion => {

                const status =
                    getEffectiveStatus(
                        promotion
                    );


                if (
                    filter === "todos"
                ) {

                    return true;

                }


                return status ===
                    filter;

            }
        );


    if (
        filtered.length === 0
    ) {

        if (table) {
            table.style.display =
                "none";
        }

        if (empty) {
            empty.style.display =
                "block";
        }

        return;

    }


    if (table) {
        table.style.display =
            "table";
    }

    if (empty) {
        empty.style.display =
            "none";
    }


    filtered.forEach(
        promotion => {

            tableBody.appendChild(
                createPromotionRow(
                    promotion
                )
            );

        }
    );

}


/* =====================================================
   CREAR FILA
===================================================== */

function createPromotionRow(
    promotion
) {

    const row =
        document.createElement("tr");


    const status =
        getEffectiveStatus(
            promotion
        );


    let statusClass =
        "pending";


    if (
        status === "activa"
    ) {

        statusClass =
            "active";

    }

    if (
        status === "vencida"
    ) {

        statusClass =
            "expired";

    }

    if (
        status === "rechazada"
    ) {

        statusClass =
            "rejected";

    }


    /* =================================================
       EVENTO
    ================================================= */

    const eventCell =
        document.createElement("td");


    eventCell.innerHTML = `

        <div class="ads-event-name">

            ${escapeHtml(
                promotion.eventoNombre ||
                promotion.nombreEvento ||
                "Evento"
            )}

        </div>

        <div class="ads-small">

            ID:
            ${escapeHtml(
                promotion.eventoId ||
                "—"
            )}

        </div>

    `;


    /* =================================================
       USUARIO
    ================================================= */

    const userCell =
        document.createElement("td");


    userCell.innerHTML = `

        <div>

            ${escapeHtml(
                promotion.usuarioEmail ||
                "Sin correo"
            )}

        </div>

        <div class="ads-small">

            ${escapeHtml(
                promotion.usuarioId ||
                ""
            )}

        </div>

    `;


    /* =================================================
       PLAN
    ================================================= */

    const planCell =
        document.createElement("td");


    planCell.innerHTML = `

        <strong>

            ${escapeHtml(
                promotion.nombrePlan ||
                promotion.plan ||
                "—"
            )}

        </strong>

        <div class="ads-small">

            ${formatMoney(
                promotion.precio
            )}

        </div>

    `;


    /* =================================================
       PAGO
    ================================================= */

    const paymentCell =
        document.createElement("td");


    const paymentStatus =
        promotion.pagoEstado ||
        "pendiente";


    paymentCell.innerHTML = `

        <span class="ads-badge ${
            paymentStatus === "pagado"
                ? "active"
                : "pending"
        }">

            ${escapeHtml(
                paymentStatus
            )}

        </span>

    `;


    /* =================================================
       ESTADO
    ================================================= */

    const statusCell =
        document.createElement("td");


    statusCell.innerHTML = `

        <span class="ads-badge ${statusClass}">

            ${escapeHtml(
                status
            )}

        </span>

    `;


    /* =================================================
       VIGENCIA
    ================================================= */

    const validityCell =
        document.createElement("td");


    validityCell.innerHTML = `

        <div>

            Inicio:
            ${formatDate(
                promotion.fechaInicio
            )}

        </div>

        <div>

            Fin:
            ${formatDate(
                promotion.fechaFin
            )}

        </div>

    `;


    /* =================================================
       ACCIONES
    ================================================= */

    const actionsCell =
        document.createElement("td");


    const actions =
        document.createElement("div");


    actions.className =
        "ads-actions";


    /* =================================================
       CONFIRMAR PAGO
    ================================================= */

    if (
        status === "pendiente_pago"
    ) {

        const confirmButton =
            document.createElement(
                "button"
            );


        confirmButton.type =
            "button";


        confirmButton.className =
            "ads-btn ads-btn-confirm";


        confirmButton.textContent =
            "Confirmar pago";


        confirmButton.addEventListener(
            "click",
            () => {

                confirmPayment(
                    promotion,
                    confirmButton
                );

            }
        );


        actions.appendChild(
            confirmButton
        );

    }


    /* =================================================
       MARCAR VENCIDA
    ================================================= */

    if (
        status === "activa"
    ) {

        const expireButton =
            document.createElement(
                "button"
            );


        expireButton.type =
            "button";


        expireButton.className =
            "ads-btn ads-btn-expire";


        expireButton.textContent =
            "Marcar vencida";


        expireButton.addEventListener(
            "click",
            () => {

                expirePromotion(
                    promotion,
                    expireButton
                );

            }
        );


        actions.appendChild(
            expireButton
        );

    }


    /* =================================================
       VER EVENTO
    ================================================= */

    const viewButton =
        document.createElement(
            "button"
        );


    viewButton.type =
        "button";


    viewButton.className =
        "ads-btn ads-btn-view";


    viewButton.textContent =
        "Ver evento";


    viewButton.addEventListener(
        "click",
        () => {

            if (
                promotion.eventoId
            ) {

                window.open(
                    "event-details.html?id=" +
                    encodeURIComponent(
                        promotion.eventoId
                    ),
                    "_blank"
                );

            }

        }
    );


    actions.appendChild(
        viewButton
    );


    actionsCell.appendChild(
        actions
    );


    row.appendChild(
        eventCell
    );

    row.appendChild(
        userCell
    );

    row.appendChild(
        planCell
    );

    row.appendChild(
        paymentCell
    );

    row.appendChild(
        statusCell
    );

    row.appendChild(
        validityCell
    );

    row.appendChild(
        actionsCell
    );


    return row;

}


/* =====================================================
   CONFIRMAR PAGO
===================================================== */

async function confirmPayment(
    promotion,
    button
) {

    const confirmed =
        window.confirm(
            "¿Confirmas que Mercado Pago recibió correctamente el pago de esta promoción?"
        );


    if (!confirmed) {
        return;
    }


    if (
        !promotion.eventoId
    ) {

        showMessage(
            "La promoción no tiene evento asociado.",
            "error"
        );

        return;

    }


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Activando...";

        }


        console.log(
            "OTIUM ADS ADMIN: confirmando pago:",
            promotion
        );


        /* =================================================
           DURACIÓN
        ================================================= */

        const duracionDias =
            Number(
                promotion.duracionDias
            );


        if (
            !duracionDias ||
            duracionDias <= 0
        ) {

            throw new Error(
                "La promoción no tiene una duración válida."
            );

        }


        /* =================================================
           FECHAS
        ================================================= */

        const fechaInicio =
            new Date();


        const fechaFin =
            new Date(
                fechaInicio.getTime() +
                (
                    duracionDias *
                    24 *
                    60 *
                    60 *
                    1000
                )
            );


        /* =================================================
           1. ACTUALIZAR PROMOCIÓN
        ================================================= */

        const promotionRef =
            doc(
                db,
                "promociones",
                promotion.id
            );


        await updateDoc(
            promotionRef,
            {

                estado:
                    "activa",

                pagoEstado:
                    "pagado",

                fechaInicio:
                    serverTimestamp(),

                fechaFin:
                    fechaFin,

                actualizadoEn:
                    serverTimestamp()

            }
        );


        console.log(
            "OTIUM ADS ADMIN: promoción activada."
        );


        /* =================================================
           2. ACTUALIZAR EVENTO
        ================================================= */

        const eventRef =
            doc(
                db,
                "eventos",
                promotion.eventoId
            );


        await updateDoc(
            eventRef,
            {

                promocionActiva:
                    true,

                tipoPromocion:
                    "carrusel",

                planPromocion:
                    promotion.plan ||
                    null,

                nombrePlanPromocion:
                    promotion.nombrePlan ||
                    null,

                precioPromocion:
                    promotion.precio ??
                    null,

                duracionPromocion:
                    duracionDias,

                fechaInicioPromocion:
                    fechaInicio,

                fechaFinPromocion:
                    fechaFin,

                promocionId:
                    promotion.id,

                promocionPagoEstado:
                    "pagado",

                promocionEstado:
                    "activa",

                promocionActualizadaEn:
                    serverTimestamp()

            }
        );


        console.log(
            "OTIUM ADS ADMIN: evento actualizado correctamente."
        );


        showMessage(
            "Pago confirmado. La promoción está activa y el evento quedó habilitado para el carrusel.",
            "success"
        );


        await loadPromotions();

    }
    catch (error) {

        console.error(
            "OTIUM ADS ADMIN: error confirmando pago:",
            error
        );


        showMessage(
            "No fue posible activar la promoción: " +
            (
                error.message ||
                "error desconocido"
            ),
            "error"
        );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Confirmar pago";

        }

    }

}


/* =====================================================
   MARCAR VENCIDA
===================================================== */

async function expirePromotion(
    promotion,
    button
) {

    const confirmed =
        window.confirm(
            "¿Deseas marcar esta promoción como vencida?"
        );


    if (!confirmed) {
        return;
    }


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Actualizando...";

        }


        /* =================================================
           1. PROMOCIÓN
        ================================================= */

        await updateDoc(
            doc(
                db,
                "promociones",
                promotion.id
            ),
            {

                estado:
                    "vencida",

                actualizadoEn:
                    serverTimestamp()

            }
        );


        /* =================================================
           2. EVENTO
        ================================================= */

        if (
            promotion.eventoId
        ) {

            await updateDoc(
                doc(
                    db,
                    "eventos",
                    promotion.eventoId
                ),
                {

                    promocionActiva:
                        false,

                    promocionEstado:
                        "vencida",

                    promocionActualizadaEn:
                        serverTimestamp()

                }
            );

        }


        showMessage(
            "La promoción fue marcada como vencida y retirada del carrusel.",
            "success"
        );


        await loadPromotions();

    }
    catch (error) {

        console.error(
            "OTIUM ADS ADMIN: error marcando vencida:",
            error
        );


        showMessage(
            "No fue posible actualizar la promoción.",
            "error"
        );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Marcar vencida";

        }

    }

}


/* =====================================================
   FILTRO
===================================================== */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderPromotions
    );

}


/* =====================================================
   ACTUALIZAR
===================================================== */

if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        loadPromotions
    );

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "OTIUM ADS ADMIN: estado autenticación:",
            user
                ? user.uid
                : "sin usuario"
        );


        if (!user) {

            showMessage(
                "Debes iniciar sesión para acceder al panel.",
                "error"
            );

            return;

        }


        await loadPromotions();

    }
);