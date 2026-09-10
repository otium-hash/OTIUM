import {
    getEventById,
    createInvitation
} from "./modules/database.js";

import { auth } from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const loading = document.getElementById("loading");
const message = document.getElementById("message");
const content = document.getElementById("content");
const eventName = document.getElementById("eventName");
const eventDate = document.getElementById("eventDate");
const eventLocation = document.getElementById("eventLocation");
const invitationTitle = document.getElementById("invitationTitle");
const invitationMessage = document.getElementById("invitationMessage");
const requiresConfirmation = document.getElementById("requiresConfirmation");
const confirmationUrlField = document.getElementById("confirmationUrlField");
const confirmationUrl = document.getElementById("confirmationUrl");
const createButton = document.getElementById("createButton");
const result = document.getElementById("result");
const qrImage = document.getElementById("qrImage");
const publicUrl = document.getElementById("publicUrl");
const copyButton = document.getElementById("copyButton");
const openButton = document.getElementById("openButton");

let currentUser = null;
let currentEvent = null;

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function hideMessage() {
    message.textContent = "";
    message.className = "message";
}

function clean(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function getOwnerId(evento) {
    return clean(evento?.usuarioId || evento?.userId || evento?.ownerId);
}

function formatDate(value) {
    const text = clean(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [y, m, d] = text.split("-");
        return `${d}-${m}-${y}`;
    }
    return text || "Fecha por confirmar";
}

function normalizeUrl(value) {
    const text = clean(value);
    if (!text) return "";
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function renderEvent(evento) {
    const nombre = clean(evento.nombre || evento.title || evento.name) || "Evento";
    const fecha = formatDate(evento.fecha || evento.date);
    const hora = clean(evento.hora || evento.time) || "Hora por confirmar";
    const ciudad = clean(evento.ciudad || evento.city);
    const ubicacion = clean(evento.ubicacion || evento.direccion || evento.address);

    eventName.textContent = nombre;
    eventDate.textContent = `📅 ${fecha} · 🕐 ${hora}`;
    eventLocation.textContent = `📍 ${ciudad}${ubicacion ? ` · ${ubicacion}` : ""}`;

    invitationTitle.value = `¡Estás invitado a ${nombre}!`;
    invitationMessage.value =
        `Te invitamos a participar de ${nombre}. ¡Esperamos contar contigo!`;
}

async function load() {
    hideMessage();

    if (!eventId) {
        loading.style.display = "none";
        showMessage("No se recibió el ID del evento.");
        return;
    }

    try {
        currentEvent = await getEventById(eventId);

        if (!currentEvent) {
            loading.style.display = "none";
            showMessage("No se encontró el evento.");
            return;
        }

        if (!currentUser) {
            loading.style.display = "none";
            showMessage("Debes iniciar sesión para crear una invitación.");
            return;
        }

        const ownerId = getOwnerId(currentEvent);

        if (!ownerId || ownerId !== currentUser.uid) {
            loading.style.display = "none";
            showMessage("Solo el propietario del evento puede crear una invitación.");
            return;
        }

        renderEvent(currentEvent);
        loading.style.display = "none";
        content.classList.add("visible");
    } catch (error) {
        console.error("OTIUM - Error preparando invitación:", error);
        loading.style.display = "none";
        showMessage("No fue posible cargar el evento.");
    }
}

requiresConfirmation.addEventListener("change", () => {
    confirmationUrlField.style.display =
        requiresConfirmation.checked ? "block" : "none";
});

createButton.addEventListener("click", async () => {
    if (!currentUser || !currentEvent) {
        showMessage("Debes iniciar sesión y disponer de un evento válido.");
        return;
    }

    const ownerId = getOwnerId(currentEvent);

    if (ownerId !== currentUser.uid) {
        showMessage("No tienes permiso para crear esta invitación.");
        return;
    }

    const confirmUrl = requiresConfirmation.checked
        ? normalizeUrl(confirmationUrl.value)
        : "";

    if (requiresConfirmation.checked && !confirmUrl) {
        showMessage("Ingresa un enlace para la confirmación de asistencia.");
        confirmationUrl.focus();
        return;
    }

    try {
        createButton.disabled = true;
        createButton.textContent = "Generando...";

        const invitationData = {
            eventoId: currentEvent.firestoreId || currentEvent.id || eventId,
            usuarioId: currentUser.uid,
            titulo: clean(invitationTitle.value) || "Invitación especial",
            mensaje: clean(invitationMessage.value),
            requiereConfirmacion: requiresConfirmation.checked,
            urlConfirmacion: confirmUrl,
            creadoEn: new Date()
        };

        const invitationId = await createInvitation(invitationData);

        const baseUrl = window.location.href.substring(
            0,
            window.location.href.lastIndexOf("/") + 1
        );

        const invitationUrl =
            `${baseUrl}event-invitation-QR.html?id=${encodeURIComponent(invitationId)}`;

        qrImage.src =
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(invitationUrl)}`;

        publicUrl.textContent = invitationUrl;
        openButton.href = invitationUrl;
        result.classList.add("visible");

        showMessage("La invitación fue creada correctamente.", "success");
    } catch (error) {
        console.error("OTIUM - Error creando invitación:", error);

        if (error?.code === "permission-denied") {
            showMessage("Firebase rechazó la creación. Revisa las reglas de invitaciones.");
        } else {
            showMessage("No fue posible crear la invitación.");
        }
    } finally {
        createButton.disabled = false;
        createButton.textContent = "🎟️ Generar invitación y QR";
    }
});

copyButton.addEventListener("click", async () => {
    const url = publicUrl.textContent;

    if (!url) return;

    try {
        await navigator.clipboard.writeText(url);
        showMessage("Enlace copiado al portapapeles.", "success");
    } catch (error) {
        console.warn("OTIUM - No se pudo copiar:", error);
        showMessage("No fue posible copiar el enlace.");
    }
});

onAuthStateChanged(auth, user => {
    currentUser = user || null;
    load();
});
