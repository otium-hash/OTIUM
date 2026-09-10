
import { getEvents } from "./modules/database.js";

const map = L.map("otiumMap", {
    scrollWheelZoom: true
}).setView([-33.4489, -70.6693], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const status = document.getElementById("mapPageStatus");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

try {
    const eventos = await getEvents();
    const bounds = [];
    let marcadores = 0;

    eventos.forEach((evento) => {
        const lat = Number(evento.latitud ?? evento.latitude ?? evento.lat);
        const lng = Number(evento.longitud ?? evento.longitude ?? evento.lng ?? evento.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const titulo = evento.title || evento.nombre || evento.nombreEvento || "Evento";
        const ciudad = evento.city || evento.ciudad || evento.ubicacion || "";
        const fecha = evento.date || evento.fecha || "";
        const id = evento.firestoreId || evento.id || "";

        L.marker([lat, lng]).addTo(map).bindPopup(`
            <div class="map-popup-title">${escapeHtml(titulo)}</div>
            <div class="map-popup-meta">${escapeHtml(ciudad)}${fecha ? " · " + escapeHtml(fecha) : ""}</div>
            ${id ? `<a class="map-popup-link" href="event-details.html?id=${encodeURIComponent(id)}">Ver evento</a>` : ""}
        `);

        bounds.push([lat, lng]);
        marcadores++;
    });

    if (bounds.length) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
    }

    status.textContent = marcadores
        ? `${marcadores} eventos con ubicación`
        : "Mapa disponible · faltan coordenadas en los eventos";
} catch (error) {
    console.error("Error cargando mapa OTIUM:", error);
    status.textContent = "No fue posible cargar los eventos del mapa.";
}

setTimeout(() => map.invalidateSize(), 250);
