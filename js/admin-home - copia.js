/* =========================================================
   OTIUM - ADMINISTRACIÓN DEL HOME
   Archivo: js/admin-home.js

   Controla:
   - Carrusel
   - Eventos destacados
   - Sponsors
   - Orden mediante arrastrar
   - Activar / desactivar
   - Fechas de vigencia
   - Duración del carrusel y sponsors

   Configuración Firestore:
   configuracion/home
========================================================= */

import { auth, db } from "./modules/firebase-config.js";
import { getEvents } from "./modules/database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const statusEl = $("#adminStatus");

const carouselList = $("#carouselList");
const featuredList = $("#featuredList");
const sponsorList = $("#sponsorList");


/* =========================================================
   ESTADO
========================================================= */

let events = [];
let sponsors = [];

let config = {
    carrusel: [],
    destacados: [],
    sponsors: []
};

let dragged = null;


/* =========================================================
   UTILIDADES
========================================================= */

function esc(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getEventId(evento) {

    return String(
        evento?.firestoreId ??
        evento?.id ??
        evento?.eventId ??
        ""
    );
}


function getEventTitle(evento) {

    return String(
        evento?.title ??
        evento?.nombre ??
        evento?.nombreEvento ??
        "Evento sin título"
    ).trim();
}


function getSponsorId(sponsor) {

    return String(
        sponsor?.firestoreId ??
        sponsor?.id ??
        sponsor?.patrocinadorId ??
        ""
    );
}


function getSponsorName(sponsor) {

    return String(
        sponsor?.nombre ??
        sponsor?.name ??
        sponsor?.empresa ??
        sponsor?.marca ??
        "Patrocinador"
    ).trim();
}


/* =========================================================
   VIGENCIA
========================================================= */

function isActiveByDate(item) {

    const now = new Date();

    if (item?.activo === false) {
        return false;
    }

    if (item?.inicio) {

        const inicio = new Date(
            `${item.inicio}T00:00:00`
        );

        if (inicio > now) {
            return false;
        }
    }

    if (item?.fin) {

        const fin = new Date(
            `${item.fin}T23:59:59`
        );

        if (fin < now) {
            return false;
        }
    }

    return true;
}


/* =========================================================
   OPCIONES SELECT
========================================================= */

function buildOptions(
    list,
    selected,
    getId,
    getName,
    emptyText = "Seleccionar..."
) {

    return `
        <option value="">
            ${emptyText}
        </option>

        ${list.map(item => {

            const id = String(getId(item));

            return `
                <option
                    value="${esc(id)}"
                    ${id === String(selected) ? "selected" : ""}
                >
                    ${esc(getName(item))}
                </option>
            `;

        }).join("")}
    `;
}


/* =========================================================
   DURACIONES
========================================================= */

function durationOptions(value, sponsor = false) {

    const allowed = sponsor
        ? [3000, 5000, 8000, 10000, 15000]
        : [3000, 5000, 6500, 8000, 10000, 12000];

    const selected =
        Number(value) ||
        (sponsor ? 5000 : 6500);

    return allowed.map(seconds => {

        return `
            <option
                value="${seconds}"
                ${seconds === selected ? "selected" : ""}
            >
                ${seconds / 1000} s
            </option>
        `;

    }).join("");
}


/* =========================================================
   ESTRUCTURA COMÚN DE ITEM
========================================================= */

function buildItem(item, index, type) {

    const title =
        item._title ||
        (
            type === "sponsor"
                ? "Sponsor"
                : "Evento"
        );

    const duration =
        type === "sponsor"
            ? durationOptions(item.duracion, true)
            : durationOptions(item.duracion, false);

    return `

        <div
            class="admin-item"
            draggable="true"
            data-kind="${type}"
            data-index="${index}"
        >

            <div
                class="drag"
                title="Arrastrar para cambiar el orden"
            >
                ☷
            </div>


            <div class="wide">

                <div class="item-title">
                    ${esc(title)}
                </div>

                <div class="item-sub">
                    Orden ${index + 1}
                </div>

            </div>


            <div>

                <label>
                    ${
                        type === "sponsor"
                            ? "Patrocinador"
                            : "Evento"
                    }
                </label>

                ${
                    type === "sponsor"

                        ? `
                            <select data-field="patrocinadorId">
                                ${buildOptions(
                                    sponsors,
                                    item.patrocinadorId,
                                    getSponsorId,
                                    getSponsorName,
                                    "Seleccionar sponsor..."
                                )}
                            </select>
                        `

                        : `
                            <select data-field="eventoId">
                                ${buildOptions(
                                    events,
                                    item.eventoId,
                                    getEventId,
                                    getEventTitle,
                                    "Seleccionar evento..."
                                )}
                            </select>
                        `
                }

            </div>


            <label class="switch">

                <input
                    type="checkbox"
                    data-field="activo"
                    ${item.activo !== false ? "checked" : ""}
                >

                Activo

            </label>


            <div>

                <label>
                    Inicio
                </label>

                <input
                    type="date"
                    data-field="inicio"
                    value="${esc(item.inicio || "")}"
                >

            </div>


            <div>

                <label>
                    Fin
                </label>

                <input
                    type="date"
                    data-field="fin"
                    value="${esc(item.fin || "")}"
                >

            </div>


            ${
                type === "carousel" ||
                type === "sponsor"

                    ? `
                        <div>

                            <label>
                                Duración
                            </label>

                            <select data-field="duracion">
                                ${duration}
                            </select>

                        </div>
                    `

                    : `
                        <div></div>
                    `
            }


            <button
                class="remove"
                type="button"
                data-remove="1"
            >
                Eliminar
            </button>

        </div>

    `;
}


/* =========================================================
   CARRUSEL
========================================================= */

function renderCarousel() {

    if (!carouselList) {
        return;
    }

    if (!config.carrusel.length) {

        carouselList.innerHTML = `
            <div class="empty">
                No hay elementos en el carrusel.
                Agrega un evento para comenzar.
            </div>
        `;

        return;
    }


    carouselList.innerHTML =
        config.carrusel.map((item, index) => {

            const event = events.find(
                e =>
                    getEventId(e) ===
                    String(item.eventoId)
            );

            item._title = event
                ? getEventTitle(event)
                : "Evento no encontrado";


            return buildItem(
                item,
                index,
                "carousel"
            );

        }).join("");
}


/* =========================================================
   DESTACADOS
========================================================= */

function renderFeatured() {

    if (!featuredList) {
        return;
    }

    if (!config.destacados.length) {

        featuredList.innerHTML = `
            <div class="empty">
                No hay eventos destacados configurados.
            </div>
        `;

        return;
    }


    featuredList.innerHTML =
        config.destacados.map((item, index) => {

            const event = events.find(
                e =>
                    getEventId(e) ===
                    String(item.eventoId)
            );

            item._title = event
                ? getEventTitle(event)
                : "Evento no encontrado";


            return buildItem(
                item,
                index,
                "featured"
            );

        }).join("");
}


/* =========================================================
   SPONSORS
========================================================= */

function renderSponsors() {

    if (!sponsorList) {
        return;
    }

    if (!config.sponsors.length) {

        sponsorList.innerHTML = `
            <div class="empty">
                No hay sponsors configurados.
            </div>
        `;

        return;
    }


    sponsorList.innerHTML =
        config.sponsors.map((item, index) => {

            const sponsor = sponsors.find(
                s =>
                    getSponsorId(s) ===
                    String(item.patrocinadorId)
            );

            item._title = sponsor
                ? getSponsorName(sponsor)
                : "Sponsor no encontrado";


            return buildItem(
                item,
                index,
                "sponsor"
            );

        }).join("");
}


/* =========================================================
   LEER LISTA DESDE EL DOM
========================================================= */

function readList(container, type) {

    if (!container) {
        return [];
    }


    const rows =
        [...container.querySelectorAll(".admin-item")];


    return rows.map((row, index) => {

        const item = {};


        row.querySelectorAll("[data-field]")
            .forEach(element => {

                const field =
                    element.dataset.field;


                if (element.type === "checkbox") {

                    item[field] =
                        element.checked;

                } else {

                    item[field] =
                        element.value;
                }

            });


        item.orden = index + 1;


        if (
            type === "carousel" ||
            type === "sponsor"
        ) {

            item.duracion =
                Number(item.duracion) ||
                (
                    type === "sponsor"
                        ? 5000
                        : 6500
                );
        }


        return item;

    });
}


/* =========================================================
   DRAG & DROP
========================================================= */

function setupDrag(container) {

    if (!container) {
        return;
    }


    container.addEventListener(
        "dragstart",
        event => {

            const row =
                event.target.closest(".admin-item");

            if (!row) {
                return;
            }


            dragged = row;

            row.classList.add("dragging");

        }
    );


    container.addEventListener(
        "dragend",
        () => {

            if (dragged) {
                dragged.classList.remove("dragging");
            }

            dragged = null;

        }
    );


    container.addEventListener(
        "dragover",
        event => {

            event.preventDefault();


            const row =
                event.target.closest(".admin-item");


            if (
                !dragged ||
                !row ||
                row === dragged
            ) {
                return;
            }


            const rect =
                row.getBoundingClientRect();


            const before =
                event.clientY <
                rect.top + rect.height / 2;


            container.insertBefore(
                dragged,
                before
                    ? row
                    : row.nextSibling
            );

        }
    );
}


/* =========================================================
   ELIMINAR ELEMENTOS
========================================================= */

function setupRemove(container) {

    if (!container) {
        return;
    }


    container.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-remove]"
                );


            if (!button) {
                return;
            }


            const row =
                button.closest(".admin-item");


            if (!row) {
                return;
            }


            row.remove();


            if (
                !container.querySelector(
                    ".admin-item"
                )
            ) {

                container.innerHTML = `
                    <div class="empty">
                        Sin elementos.
                    </div>
                `;
            }

        }
    );
}


/* =========================================================
   CARGAR CONFIGURACIÓN
========================================================= */

async function loadConfiguration() {

    statusEl.textContent =
        "Cargando configuración...";


    events = await getEvents();


    const sponsorsSnapshot =
        await getDocs(
            collection(
                db,
                "patrocinadores"
            )
        );


    sponsors =
        sponsorsSnapshot.docs.map(
            document => ({
                firestoreId: document.id,
                ...document.data()
            })
        );


    const homeSnapshot =
        await getDoc(
            doc(
                db,
                "configuracion",
                "home"
            )
        );


    if (homeSnapshot.exists()) {

        const data =
            homeSnapshot.data();


        config = {

            carrusel:
                Array.isArray(data.carrusel)
                    ? data.carrusel
                    : [],

            destacados:
                Array.isArray(data.destacados)
                    ? data.destacados
                    : [],

            sponsors:
                Array.isArray(data.sponsors)
                    ? data.sponsors
                    : []

        };

    } else {

        config = {
            carrusel: [],
            destacados: [],
            sponsors: []
        };

    }


    renderCarousel();
    renderFeatured();
    renderSponsors();


    statusEl.textContent =
        `Listo · ${events.length} eventos · ${sponsors.length} sponsors disponibles`;
}


/* =========================================================
   GUARDAR CONFIGURACIÓN
========================================================= */

async function saveConfiguration() {

    try {

        const user =
            auth.currentUser;


        if (!user) {

            statusEl.textContent =
                "Debes iniciar sesión.";

            return;
        }


        statusEl.textContent =
            "Verificando permisos...";


        const adminSnapshot =
            await getDoc(
                doc(
                    db,
                    "administradores",
                    user.uid
                )
            );


        if (!adminSnapshot.exists()) {

            statusEl.textContent =
                "No tienes permisos de administrador.";

            return;
        }


        statusEl.textContent =
            "Guardando configuración...";


        const carousel =
            readList(
                carouselList,
                "carousel"
            )
            .filter(item => item.eventoId)
            .map((item, index) => ({
                ...item,
                orden: index + 1
            }));


        const featured =
            readList(
                featuredList,
                "featured"
            )
            .filter(item => item.eventoId)
            .slice(0, 6)
            .map((item, index) => ({
                ...item,
                orden: index + 1
            }));


        const sponsorsConfig =
            readList(
                sponsorList,
                "sponsor"
            )
            .filter(
                item =>
                    item.patrocinadorId
            )
            .map((item, index) => ({
                ...item,
                orden: index + 1
            }));


        const payload = {

            carrusel: carousel,

            destacados: featured,

            sponsors: sponsorsConfig,

            updatedAt:
                serverTimestamp()

        };


        await setDoc(
            doc(
                db,
                "configuracion",
                "home"
            ),
            payload,
            {
                merge: true
            }
        );


        config = {
            carrusel: carousel,
            destacados: featured,
            sponsors: sponsorsConfig
        };


        renderCarousel();
        renderFeatured();
        renderSponsors();


        statusEl.textContent =
            "✓ Configuración del Home guardada correctamente.";

    } catch (error) {

        console.error(
            "OTIUM Admin Home:",
            error
        );


        statusEl.textContent =
            "Error guardando configuración: " +
            error.message;
    }
}


/* =========================================================
   AGREGAR ELEMENTO
========================================================= */

function addItem(type) {

    let list;
    let array;
    let item;


    if (type === "carousel") {

        list = carouselList;
        array = config.carrusel;

        item = {

            id:
                crypto.randomUUID(),

            eventoId: "",

            activo: true,

            duracion: 6500,

            inicio: "",

            fin: ""

        };

    } else if (type === "featured") {

        list = featuredList;
        array = config.destacados;

        item = {

            eventoId: "",

            activo: true,

            inicio: "",

            fin: ""

        };

    } else {

        list = sponsorList;
        array = config.sponsors;

        item = {

            patrocinadorId: "",

            activo: true,

            duracion: 5000,

            inicio: "",

            fin: ""

        };
    }


    array.push(item);


    if (type === "carousel") {

        renderCarousel();

    } else if (type === "featured") {

        renderFeatured();

    } else {

        renderSponsors();
    }


    const rows =
        list?.querySelectorAll(
            ".admin-item"
        );


    rows?.[rows.length - 1]
        ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
}


/* =========================================================
   TABS
========================================================= */

document
    .querySelectorAll(".admin-tab")
    .forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".admin-tab")
                    .forEach(button =>
                        button.classList.remove(
                            "active"
                        )
                    );


                document
                    .querySelectorAll(".admin-panel")
                    .forEach(panel =>
                        panel.classList.remove(
                            "active"
                        )
                    );


                tab.classList.add("active");


                const panel =
                    document.getElementById(
                        "tab-" +
                        tab.dataset.tab
                    );


                panel?.classList.add(
                    "active"
                );

            }
        );

    });


/* =========================================================
   BOTONES
========================================================= */

$("#addCarouselEvent")
    ?.addEventListener(
        "click",
        () => addItem("carousel")
    );


$("#addFeatured")
    ?.addEventListener(
        "click",
        () => addItem("featured")
    );


$("#addSponsor")
    ?.addEventListener(
        "click",
        () => addItem("sponsor")
    );


$("#saveConfig")
    ?.addEventListener(
        "click",
        saveConfiguration
    );


/* =========================================================
   DRAG
========================================================= */

setupDrag(carouselList);
setupDrag(featuredList);
setupDrag(sponsorList);


/* =========================================================
   ELIMINACIÓN
========================================================= */

setupRemove(carouselList);
setupRemove(featuredList);
setupRemove(sponsorList);


/* =========================================================
   AUTENTICACIÓN Y ACCESO ADMIN
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            statusEl.textContent =
                "Debes iniciar sesión como administrador para acceder.";

            return;
        }


        try {

            const adminSnapshot =
                await getDoc(
                    doc(
                        db,
                        "administradores",
                        user.uid
                    )
                );


            if (!adminSnapshot.exists()) {

                statusEl.textContent =
                    "Acceso denegado: esta cuenta no es administradora.";

                return;
            }


            await loadConfiguration();


        } catch (error) {

            console.error(
                "OTIUM Admin:",
                error
            );


            statusEl.textContent =
                "Error cargando la administración: " +
                error.message;
        }

    }
);