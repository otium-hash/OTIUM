const css = document.createElement("link"); css.rel="stylesheet"; css.href="css/map.css"; document.head.appendChild(css);

/* =========================================================
   OTIUM - MAPA EN HOME
   No reemplaza home.js ni Firebase.
========================================================= */

async function cargarEventosMapa() {
    const mapElement = document.getElementById("homeMap");
    const status = document.getElementById("homeMapStatus");

    if (!mapElement || typeof L === "undefined") return;

    const map = L.map(mapElement, {
        scrollWheelZoom: false,
        zoomControl: true
    }).setView([-33.4489, -70.6693], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    let eventos = [];

    try {
        const modulo = await import("./modules/database.js");
        eventos = await modulo.getEvents();
    } catch (error) {
        console.error("Mapa OTIUM: no fue posible cargar eventos:", error);
        if (status) status.textContent = "Mapa disponible. No fue posible cargar los eventos.";
        return;
    }

    const bounds = [];
    let marcadores = 0;

    eventos.forEach((evento) => {
        const lat = Number(
            evento.latitud ??
            evento.latitude ??
            evento.lat
        );

        const lng = Number(
            evento.longitud ??
            evento.longitude ??
            evento.lng ??
            evento.lon
        );

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const titulo =
            evento.title ||
            evento.nombre ||
            evento.nombreEvento ||
            "Evento";

        const ciudad =
            evento.city ||
            evento.ciudad ||
            evento.ubicacion ||
            "";

        const fecha =
            evento.date ||
            evento.fecha ||
            "";

        const id =
            evento.firestoreId ||
            evento.id ||
            "";

        const marker = L.marker([lat, lng]).addTo(map);

        marker.bindPopup(`
            <div class="map-popup-title">${escapeHtml(titulo)}</div>
            <div class="map-popup-meta">
                ${escapeHtml(ciudad)}
                ${fecha ? " · " + escapeHtml(fecha) : ""}
            </div>
            ${id ? `<a class="map-popup-link" href="event-details.html?id=${encodeURIComponent(id)}">Ver evento</a>` : ""}
        `);

        bounds.push([lat, lng]);
        marcadores++;
    });

    if (bounds.length) {
        map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 13
        });
    }

    if (status) {
        status.textContent =
            marcadores > 0
                ? `${marcadores} eventos con ubicación`
                : "Mapa disponible · los eventos aparecerán cuando tengan coordenadas";
    }

    setTimeout(() => map.invalidateSize(), 250);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarEventosMapa);
} else {
    cargarEventosMapa();
}
