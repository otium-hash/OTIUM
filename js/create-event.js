import {
    auth
} from "./modules/auth.js";

import {
    saveEvent,
    updateEvent
} from "./modules/database.js";

import {
    GEOAPIFY_API_KEY
} from "./modules/geocoding-config.js";

import {
    geocodificarEvento
} from "./modules/geocoding.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const IMAGE_WORKER_URL =
    "https://otium-images-api.otiumpanoramas.workers.dev/";

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ]);


/* =====================================================
   ELEMENTOS
===================================================== */

const form =
    document.getElementById(
        "createEventForm"
    );

const publishButton =
    document.getElementById(
        "publishEventButton"
    );

const createEventMessage =
    document.getElementById(
        "createEventMessage"
    );

const imageInput =
    document.getElementById(
        "eventImage"
    );

const imagePreviewContainer =
    document.getElementById(
        "imagePreviewContainer"
    );

const imagePreview =
    document.getElementById(
        "eventImagePreview"
    );

const imageFileInfo =
    document.getElementById(
        "imageFileInfo"
    );

const removeImageButton =
    document.getElementById(
        "removeImageButton"
    );

const imageUploadStatus =
    document.getElementById(
        "imageUploadStatus"
    );


/* =====================================================
   FECHA Y HORARIO
===================================================== */

const startDateInput =
    document.getElementById(
        "date"
    );

const startTimeInput =
    document.getElementById(
        "time"
    );

const endDateInput =
    document.getElementById(
        "endDate"
    );

const endTimeInput =
    document.getElementById(
        "endTime"
    );

const sameDayCheckbox =
    document.getElementById(
        "sameDay"
    );

const endDateGroup =
    document.getElementById(
        "endDateGroup"
    );


/* =====================================================
   FECHA Y HORARIO - SINCRONIZACIÓN
===================================================== */

function actualizarFechaTermino() {

    if (
        !endDateInput ||
        !sameDayCheckbox
    ) {
        return;
    }

    if (
        sameDayCheckbox.checked
    ) {

        if (
            startDateInput
        ) {
            endDateInput.value =
                startDateInput.value;
        }

        endDateInput.disabled =
            true;

        endDateInput.required =
            false;

        if (
            endDateGroup
        ) {
            endDateGroup.classList.add(
                "same-day-disabled"
            );
        }

    } else {

        endDateInput.disabled =
            false;

        endDateInput.required =
            true;

        if (
            endDateGroup
        ) {
            endDateGroup.classList.remove(
                "same-day-disabled"
            );
        }
    }
}


sameDayCheckbox?.addEventListener(
    "change",
    actualizarFechaTermino
);


startDateInput?.addEventListener(
    "change",
    () => {

        if (
            sameDayCheckbox?.checked &&
            endDateInput
        ) {
            endDateInput.value =
                startDateInput.value;
        }
    }
);


/* Estado inicial */

actualizarFechaTermino();


/* =====================================================
   TIPO DE EVENTO
===================================================== */

const eventTypePublic =
    document.getElementById(
        "eventTypePublic"
    );

const eventTypePrivate =
    document.getElementById(
        "eventTypePrivate"
    );

const attendanceSection =
    document.getElementById(
        "attendanceSection"
    );

const requiresAttendance =
    document.getElementById(
        "requiresAttendance"
    );

const attendanceLinkGroup =
    document.getElementById(
        "attendanceLinkGroup"
    );

const attendanceLink =
    document.getElementById(
        "attendanceLink"
    );


/* =====================================================
   ACCESO
===================================================== */

const accessFree =
    document.getElementById(
        "accessFree"
    );

const accessPaid =
    document.getElementById(
        "accessPaid"
    );

const freeEntry =
    document.getElementById(
        "freeEntry"
    );

const priceInput =
    document.getElementById(
        "price"
    );

const priceGroup =
    document.getElementById(
        "priceGroup"
    );

const freeEntryBox =
    document.getElementById(
        "freeEntryBox"
    );


/* =====================================================
   EDAD
===================================================== */

const ageAll =
    document.getElementById(
        "ageAll"
    );

const ageRange =
    document.getElementById(
        "ageRange"
    );

const ageRangeFields =
    document.getElementById(
        "ageRangeFields"
    );

const ageMinInput =
    document.getElementById(
        "ageMin"
    );

const ageMaxInput =
    document.getElementById(
        "ageMax"
    );


/* =====================================================
   UBICACIÓN
===================================================== */

function obtenerBotonUbicacion() {

    const posiblesIds = [
        "useLocationButton",
        "useLocationBtn",
        "useCurrentLocation",
        "btnUseLocation",
        "btnUbicacion",
        "currentLocationBtn",
        "locationBtn",
        "useLocationButton"
    ];

    for (
        const id of posiblesIds
    ) {

        const elemento =
            document.getElementById(
                id
            );

        if (
            elemento
        ) {
            return elemento;
        }
    }

    const porClase =
        document.querySelector(
            ".use-location-btn, " +
            ".current-location-btn, " +
            "[data-action='location']"
        );

    return porClase || null;
}


const locationButton =
    obtenerBotonUbicacion();

/* =====================================================
   UBICACIÓN MANUAL / GEOLOCALIZACIÓN AUTOMÁTICA
===================================================== */

const locationManualBox =
    document.getElementById(
        "locationManualBox"
    );

const locationStatus =
    document.getElementById(
        "locationStatus"
    );

const latitudeVisible =
    document.getElementById(
        "latitudeVisible"
    );

const longitudeVisible =
    document.getElementById(
        "longitudeVisible"
    );

const geocodeLocationButton =
    document.getElementById(
        "geocodeLocationButton"
    );

const latitudeHidden =
    document.getElementById(
        "latitude"
    );

const longitudeHidden =
    document.getElementById(
        "longitude"
    );
/* =====================================================
   MAPA LEAFLET - UBICACIÓN DEL EVENTO
===================================================== */

const eventLocationMapElement =
    document.getElementById(
        "eventLocationMap"
    );

let eventLocationMap =
    null;

let eventLocationMarker =
    null;

function mostrarPanelUbicacionManual() {

    if (
        !locationManualBox
    ) {
        return;
    }

    locationManualBox.classList.add(
        "visible"
    );

    /*
     * Abrimos el panel automáticamente cuando
     * encontramos una ubicación.
     */
    locationManualBox.open = true;

    /*
     * El navegador necesita un pequeño momento
     * para renderizar el <details> antes de
     * calcular correctamente el tamaño del mapa.
     */
    setTimeout(
        () => {

            inicializarMapaUbicacion();

        },
        50
    );
}

function actualizarEstadoUbicacion(
    mensaje,
    tipo = ""
) {

    if (
        !locationStatus
    ) {
        return;
    }

    locationStatus.textContent =
        mensaje;

    locationStatus.style.color =
        tipo === "success"
            ? "#198754"
            : tipo === "error"
                ? "#dc3545"
                : "#667085";
}

/* =====================================================
   INICIALIZAR MAPA DE UBICACIÓN
===================================================== */

function inicializarMapaUbicacion() {

    if (
        !eventLocationMapElement
    ) {
        return;
    }

    /*
     * Si Leaflet todavía no está disponible,
     * no hacemos nada.
     */
    if (
        typeof L === "undefined"
    ) {

        console.error(
            "OTIUM - Leaflet no está disponible."
        );

        return;
    }

    /*
     * Si el mapa ya existe solamente
     * actualizamos su tamaño.
     */
    if (
        eventLocationMap
    ) {

        eventLocationMap.invalidateSize();

        return;
    }

    const lat =
        latitudeVisible
            ? Number(
                latitudeVisible.value
            )
            : NaN;

    const lng =
        longitudeVisible
            ? Number(
                longitudeVisible.value
            )
            : NaN;

    /*
     * Coordenadas iniciales.
     *
     * Chile central como referencia mientras
     * todavía no existe una ubicación.
     */
    const centroInicial =
        Number.isFinite(lat) &&
        Number.isFinite(lng)
            ? [lat, lng]
            : [-33.0472, -71.6127];

    const zoomInicial =
        Number.isFinite(lat) &&
        Number.isFinite(lng)
            ? 16
            : 5;

    eventLocationMap =
        L.map(
            eventLocationMapElement,
            {
                scrollWheelZoom: true
            }
        ).setView(
            centroInicial,
            zoomInicial
        );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(
        eventLocationMap
    );

    /*
     * Si ya tenemos coordenadas,
     * crear marcador.
     */
    if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {

        crearOMoverMarcador(
            lat,
            lng
        );
    }

    /*
     * Permitir seleccionar directamente
     * una ubicación haciendo clic.
     */
    eventLocationMap.on(
        "click",
        (event) => {

            const latitud =
                event.latlng.lat;

            const longitud =
                event.latlng.lng;

            sincronizarCoordenadas(
                latitud,
                longitud
            );

            actualizarEstadoUbicacion(
                "Ubicación ajustada manualmente",
                "success"
            );

            mostrarMensajeUbicacion(
                "Ubicación ajustada manualmente en el mapa.",
                "success"
            );
        }
    );

    /*
     * Solucionar el problema habitual de Leaflet
     * cuando se inicializa dentro de <details>.
     */
    setTimeout(
        () => {

            eventLocationMap.invalidateSize();

        },
        100
    );
}


/* =====================================================
   CREAR / MOVER MARCADOR
===================================================== */

function crearOMoverMarcador(
    latitude,
    longitude
) {

    if (
        !eventLocationMap
    ) {
        return;
    }

    const coordenadas = [
        latitude,
        longitude
    ];

    if (
        !eventLocationMarker
    ) {

        eventLocationMarker =
            L.marker(
                coordenadas,
                {
                    draggable: true
                }
            ).addTo(
                eventLocationMap
            );

        eventLocationMarker.bindPopup(
            "Ubicación del evento"
        );

        /*
         * Cuando el usuario mueve el marcador,
         * guardamos las nuevas coordenadas.
         */
        eventLocationMarker.on(
            "dragend",
            () => {

                const posicion =
                    eventLocationMarker.getLatLng();

                sincronizarCoordenadas(
                    posicion.lat,
                    posicion.lng
                );

                actualizarEstadoUbicacion(
                    "Ubicación ajustada manualmente",
                    "success"
                );

                mostrarMensajeUbicacion(
                    "Ubicación ajustada manualmente en el mapa.",
                    "success"
                );
            }
        );

    } else {

        eventLocationMarker.setLatLng(
            coordenadas
        );
    }

    eventLocationMap.setView(
        coordenadas,
        16
    );
}


/* =====================================================
   ACTUALIZAR MAPA
===================================================== */

function actualizarMapaUbicacion(
    latitude,
    longitude
) {

    if (
        !Number.isFinite(
            Number(latitude)
        ) ||
        !Number.isFinite(
            Number(longitude)
        )
    ) {
        return;
    }

    /*
     * Si todavía no existe el mapa,
     * lo inicializamos.
     */
    if (
        !eventLocationMap
    ) {

        if (
            locationManualBox
        ) {
            locationManualBox.open =
                true;
        }

        setTimeout(
            () => {

                inicializarMapaUbicacion();

                if (
                    eventLocationMap
                ) {

                    crearOMoverMarcador(
                        Number(latitude),
                        Number(longitude)
                    );
                }

            },
            50
        );

        return;
    }

    crearOMoverMarcador(
        Number(latitude),
        Number(longitude)
    );

    eventLocationMap.invalidateSize();
}

function sincronizarCoordenadas(
    latitude,
    longitude
) {

    if (
        latitudeHidden
    ) {

        latitudeHidden.value =
            latitude;
    }

    if (
        longitudeHidden
    ) {

        longitudeHidden.value =
            longitude;
    }

    if (
        latitudeVisible
    ) {

        latitudeVisible.value =
            latitude;
    }

    if (
        longitudeVisible
    ) {

        longitudeVisible.value =
            longitude;
    }

    if (
        form
    ) {

        form.dataset.latitude =
            latitude;

        form.dataset.longitude =
            longitude;

           // Actualizar también el mapa
    actualizarMapaUbicacion(
        Number(latitude),
        Number(longitude)
    );
}
}

/* =====================================================
   CONTROL DEL PANEL DE UBICACIÓN
===================================================== */

locationManualBox?.addEventListener(
    "toggle",
    () => {

        if (
            locationManualBox.open
        ) {

            setTimeout(
                () => {

                    if (
                        eventLocationMap
                    ) {

                        eventLocationMap.invalidateSize();

                    } else {

                        inicializarMapaUbicacion();

                    }

                },
                50
            );
        }
    }
);

function obtenerCoordenadasManuales() {

    const lat =
        latitudeVisible
            ? latitudeVisible.value.trim()
            : "";

    const lng =
        longitudeVisible
            ? longitudeVisible.value.trim()
            : "";

    if (
        lat === "" &&
        lng === ""
    ) {

        return null;
    }

    const numeroLat =
        Number(lat);

    const numeroLng =
        Number(lng);

    if (
        !Number.isFinite(numeroLat) ||
        !Number.isFinite(numeroLng)
    ) {

        throw new Error(
            "Las coordenadas ingresadas no son válidas."
        );
    }

    if (
        numeroLat < -90 ||
        numeroLat > 90
    ) {

        throw new Error(
            "La latitud debe estar entre -90 y 90."
        );
    }

    if (
        numeroLng < -180 ||
        numeroLng > 180
    ) {

        throw new Error(
            "La longitud debe estar entre -180 y 180."
        );
    }

    return {
        latitude: numeroLat,
        longitude: numeroLng
    };
}


/* =====================================================
   COORDENADAS MANUALES
===================================================== */

latitudeVisible?.addEventListener(
    "input",
    () => {

        if (
            latitudeVisible.value === "" &&
            longitudeVisible?.value === ""
        ) {

            actualizarEstadoUbicacion(
                "Pendiente de ubicación"
            );

            return;
        }

        mostrarPanelUbicacionManual();

        try {

            const coordenadas =
                obtenerCoordenadasManuales();

            if (
                coordenadas
            ) {

                sincronizarCoordenadas(
                    coordenadas.latitude,
                    coordenadas.longitude
                );

                actualizarEstadoUbicacion(
                    "Ubicación manual",
                    "success"
                );
            }

        } catch {

            actualizarEstadoUbicacion(
                "Coordenadas pendientes de validar",
                "error"
            );
        }
    }
);


longitudeVisible?.addEventListener(
    "input",
    () => {

        if (
            latitudeVisible?.value === "" &&
            longitudeVisible.value === ""
        ) {

            actualizarEstadoUbicacion(
                "Pendiente de ubicación"
            );

            return;
        }

        mostrarPanelUbicacionManual();

        try {

            const coordenadas =
                obtenerCoordenadasManuales();

            if (
                coordenadas
            ) {

                sincronizarCoordenadas(
                    coordenadas.latitude,
                    coordenadas.longitude
                );

                actualizarEstadoUbicacion(
                    "Ubicación manual",
                    "success"
                );
            }

        } catch {

            actualizarEstadoUbicacion(
                "Coordenadas pendientes de validar",
                "error"
            );
        }
    }
);


/* =====================================================
   UBICAR EVENTO AUTOMÁTICAMENTE
===================================================== */

geocodeLocationButton?.addEventListener(
    "click",
    async (event) => {

        event.preventDefault();

        console.log(
            "OTIUM - Botón Ubicar automáticamente presionado."
        );

        const ciudad =
            document.getElementById(
                "city"
            )?.value.trim() || "";

        const direccion =
            document.getElementById(
                "address"
            )?.value.trim() || "";

        const region =
            document.getElementById(
                "region"
            )?.value.trim() || "";

        console.log(
            "OTIUM - Datos para geocodificación:",
            {
                ciudad,
                direccion,
                region
            }
        );

        if (
            !ciudad &&
            !direccion
        ) {

            actualizarEstadoUbicacion(
                "Ingresa primero la ciudad o dirección del evento.",
                "error"
            );

            mostrarMensajeUbicacion(
                "Ingresa primero la ciudad o dirección del evento.",
                "error"
            );

            return;
        }

        const textoOriginal =
            geocodeLocationButton.textContent;

        geocodeLocationButton.disabled =
            true;

        geocodeLocationButton.textContent =
            "🔎 Buscando ubicación...";

        actualizarEstadoUbicacion(
            "Buscando ubicación automáticamente..."
        );

        try {

            const resultado =
                await geocodificarEvento({
                    direccion:
                        direccion,

                    ciudad:
                        ciudad,

                    region:
                        region
                });

            console.log(
                "OTIUM - Resultado Geoapify:",
                resultado
            );

            if (
                !resultado ||
                !Number.isFinite(
                    Number(resultado.lat)
                ) ||
                !Number.isFinite(
                    Number(resultado.lng)
                )
            ) {

                throw new Error(
                    "Geoapify no encontró una ubicación válida."
                );
            }

            const latitude =
                Number(
                    resultado.lat
                );

            const longitude =
                Number(
                    resultado.lng
                );

            sincronizarCoordenadas(
                latitude,
                longitude
            );

            mostrarPanelUbicacionManual();

            let mensaje =
                "Ubicación encontrada automáticamente.";

            if (
                resultado.origen ===
                "ciudad"
            ) {

                mensaje =
                    "No se encontró la dirección exacta. Se ubicó el evento aproximadamente en la ciudad.";
            }

            if (
                resultado.origen ===
                "comuna"
            ) {

                mensaje =
                    "No se encontró la dirección exacta. Se ubicó el evento aproximadamente en la comuna.";
            }

            actualizarEstadoUbicacion(
                mensaje,
                "success"
            );

            mostrarMensajeUbicacion(
                mensaje,
                "success"
            );

        } catch (
            error
        ) {

            console.error(
                "OTIUM - Error geocodificando evento:",
                error
            );

            mostrarPanelUbicacionManual();

            actualizarEstadoUbicacion(
                "No se pudo encontrar automáticamente. Puedes ingresar las coordenadas manualmente.",
                "error"
            );

            mostrarMensajeUbicacion(
                "No se pudo encontrar automáticamente. Puedes ingresar las coordenadas manualmente.",
                "error"
            );

        } finally {

            geocodeLocationButton.disabled =
                false;

            geocodeLocationButton.textContent =
                textoOriginal ||
                "🔎 Ubicar automáticamente";
        }
    }
);
/* =====================================================
   AUTENTICACIÓN
===================================================== */

let currentUser =
    null;

onAuthStateChanged(
    auth,
    (user) => {

        currentUser =
            user || null;

        console.log(
            "OTIUM - Usuario actual:",
            currentUser
                ? currentUser.uid
                : "No autenticado"
        );
    }
);


/* =====================================================
   TIPO DE EVENTO
===================================================== */

function obtenerTipoEvento() {

    if (
        eventTypePrivate &&
        eventTypePrivate.checked
    ) {
        return "particular";
    }

    return "publico";
}


/* =====================================================
   ACTUALIZAR TIPO DE EVENTO
===================================================== */

function actualizarTipoEvento() {

    const tipo =
        obtenerTipoEvento();

    if (
        !attendanceSection
    ) {
        return;
    }

    if (
        tipo === "particular"
    ) {

        attendanceSection
            .classList
            .add(
                "visible"
            );

    } else {

        attendanceSection
            .classList
            .remove(
                "visible"
            );

        if (
            requiresAttendance
        ) {
            requiresAttendance.checked =
                false;
        }

        if (
            attendanceLink
        ) {
            attendanceLink.value =
                "";
        }
    }

    actualizarConfirmacionAsistencia();
}


/* =====================================================
   CONFIRMACIÓN DE ASISTENCIA
===================================================== */

function actualizarConfirmacionAsistencia() {

    if (
        !attendanceLinkGroup
    ) {
        return;
    }

    const activo =
        obtenerTipoEvento() ===
            "particular" &&
        requiresAttendance &&
        requiresAttendance.checked;

    if (
        activo
    ) {

        attendanceLinkGroup
            .classList
            .add(
                "visible"
            );

    } else {

        attendanceLinkGroup
            .classList
            .remove(
                "visible"
            );

        if (
            attendanceLink
        ) {
            attendanceLink.value =
                "";
        }
    }
}


/* =====================================================
   TIPO DE ACCESO
===================================================== */

function obtenerTipoAcceso() {

    if (
        accessPaid &&
        accessPaid.checked
    ) {
        return "pagado";
    }

    return "gratis";
}


/* =====================================================
   ACTUALIZAR ACCESO
===================================================== */

function actualizarAcceso() {

    const tipoAcceso =
        obtenerTipoAcceso();

    if (
        tipoAcceso === "pagado"
    ) {

        if (
            priceGroup
        ) {
            priceGroup
                .classList
                .add(
                    "visible"
                );
        }

        if (
            priceInput
        ) {
            priceInput.disabled =
                false;

            priceInput.required =
                true;
        }

        if (
            freeEntry
        ) {
            freeEntry.checked =
                false;
        }

        if (
            freeEntryBox
        ) {
            freeEntryBox
                .classList
                .remove(
                    "active"
                );
        }

    } else {

        if (
            priceGroup
        ) {
            priceGroup
                .classList
                .remove(
                    "visible"
                );
        }

        if (
            priceInput
        ) {
            priceInput.required =
                false;

            priceInput.value =
                "";

            priceInput.disabled =
                true;
        }

        if (
            freeEntry
        ) {
            freeEntry.checked =
                true;
        }

        if (
            freeEntryBox
        ) {
            freeEntryBox
                .classList
                .add(
                    "active"
                );
        }
    }
}


/* =====================================================
   ENTRADA GRATUITA
===================================================== */

function actualizarEntradaGratuita() {

    if (
        !freeEntry
    ) {
        return;
    }

    if (
        freeEntry.checked
    ) {

        if (
            accessFree
        ) {
            accessFree.checked =
                true;
        }

        if (
            accessPaid
        ) {
            accessPaid.checked =
                false;
        }

    } else {

        if (
            accessPaid
        ) {
            accessPaid.checked =
                true;
        }

        if (
            accessFree
        ) {
            accessFree.checked =
                false;
        }
    }

    actualizarAcceso();
}


/* =====================================================
   EDAD
===================================================== */

function obtenerTipoEdad() {

    if (
        ageRange &&
        ageRange.checked
    ) {
        return "rango";
    }

    return "todas";
}


/* =====================================================
   ACTUALIZAR EDAD
===================================================== */

function actualizarEdad() {

    const tipoEdad =
        obtenerTipoEdad();

    if (
        !ageRangeFields
    ) {
        return;
    }

    if (
        tipoEdad === "rango"
    ) {

        ageRangeFields
            .classList
            .add(
                "visible"
            );

        if (
            ageMinInput
        ) {
            ageMinInput.required =
                true;
        }

        if (
            ageMaxInput
        ) {
            ageMaxInput.required =
                true;
        }

    } else {

        ageRangeFields
            .classList
            .remove(
                "visible"
            );

        if (
            ageMinInput
        ) {
            ageMinInput.required =
                false;

            ageMinInput.value =
                "";
        }

        if (
            ageMaxInput
        ) {
            ageMaxInput.required =
                false;

            ageMaxInput.value =
                "";
        }
    }
}


/* =====================================================
   EVENTOS DE OPCIONES
===================================================== */

eventTypePublic?.addEventListener(
    "change",
    actualizarTipoEvento
);

eventTypePrivate?.addEventListener(
    "change",
    actualizarTipoEvento
);

requiresAttendance?.addEventListener(
    "change",
    actualizarConfirmacionAsistencia
);

accessFree?.addEventListener(
    "change",
    actualizarAcceso
);

accessPaid?.addEventListener(
    "change",
    actualizarAcceso
);

freeEntry?.addEventListener(
    "change",
    actualizarEntradaGratuita
);

ageAll?.addEventListener(
    "change",
    actualizarEdad
);

ageRange?.addEventListener(
    "change",
    actualizarEdad
);


/* =====================================================
   ESTADO INICIAL
===================================================== */

actualizarTipoEvento();
actualizarAcceso();
actualizarEdad();


/* =====================================================
   IMAGEN - SELECCIÓN
===================================================== */

if (
    imageInput
) {

    imageInput.addEventListener(
        "change",
        () => {

            const file =
                imageInput.files?.[0] ||
                null;

            if (
                !file
            ) {
                limpiarImagen();
                return;
            }

            const validacion =
                validarImagen(
                    file
                );

            if (
                !validacion.ok
            ) {

                alert(
                    validacion.error
                );

                limpiarImagen();
                return;
            }

            mostrarVistaPrevia(
                file
            );
        }
    );
}


/* =====================================================
   IMAGEN - QUITAR
===================================================== */

removeImageButton?.addEventListener(
    "click",
    () => {
        limpiarImagen();
    }
);


/* =====================================================
   VALIDAR IMAGEN
===================================================== */

function validarImagen(
    file
) {

    if (
        !file
    ) {
        return {
            ok: false,
            error:
                "No se seleccionó ninguna imagen."
        };
    }

    if (
        !ALLOWED_IMAGE_TYPES.has(
            file.type
        )
    ) {
        return {
            ok: false,
            error:
                "Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF."
        };
    }

    if (
        file.size >
        MAX_IMAGE_SIZE
    ) {
        return {
            ok: false,
            error:
                "La imagen supera el máximo permitido de 5 MB."
        };
    }

    return {
        ok: true
    };
}


/* =====================================================
   VISTA PREVIA
===================================================== */

function mostrarVistaPrevia(
    file
) {

    if (
        !imagePreviewContainer ||
        !imagePreview
    ) {
        return;
    }

    if (
        imagePreview.src &&
        imagePreview.src.startsWith(
            "blob:"
        )
    ) {

        URL.revokeObjectURL(
            imagePreview.src
        );
    }

    const objectUrl =
        URL.createObjectURL(
            file
        );

    imagePreview.src =
        objectUrl;

    imagePreviewContainer
        .classList
        .add(
            "visible"
        );

    if (
        imageFileInfo
    ) {

        imageFileInfo.textContent =
            `${file.name} · ${formatearBytes(file.size)}`;
    }

    mostrarEstadoImagen(
        "",
        ""
    );
}


/* =====================================================
   LIMPIAR IMAGEN
===================================================== */

function limpiarImagen() {

    if (
        imageInput
    ) {
        imageInput.value =
            "";
    }

    if (
        imagePreview
    ) {

        if (
            imagePreview.src &&
            imagePreview.src.startsWith(
                "blob:"
            )
        ) {

            URL.revokeObjectURL(
                imagePreview.src
            );
        }

        imagePreview.removeAttribute(
            "src"
        );
    }

    if (
        imagePreviewContainer
    ) {

        imagePreviewContainer
            .classList
            .remove(
                "visible"
            );
    }

    if (
        imageFileInfo
    ) {
        imageFileInfo.textContent =
            "";
    }

    mostrarEstadoImagen(
        "",
        ""
    );
}


/* =====================================================
   ESTADO IMAGEN
===================================================== */

function mostrarEstadoImagen(
    mensaje,
    tipo
) {

    if (
        !imageUploadStatus
    ) {
        return;
    }

    imageUploadStatus.textContent =
        mensaje;

    imageUploadStatus.className =
        "image-upload-status";

    if (
        mensaje
    ) {

        imageUploadStatus
            .classList
            .add(
                "visible"
            );
    }

    if (
        tipo
    ) {

        imageUploadStatus
            .classList
            .add(
                tipo
            );
    }
}


/* =====================================================
   SUBIR IMAGEN
===================================================== */

async function subirImagen(
    file,
    eventoId
) {

    if (
        !file
    ) {
        return null;
    }

    const validacion =
        validarImagen(
            file
        );

    if (
        !validacion.ok
    ) {
        throw new Error(
            validacion.error
        );
    }

    if (
        !eventoId
    ) {
        throw new Error(
            "No se pudo determinar el ID del evento."
        );
    }

    mostrarEstadoImagen(
        "Subiendo imagen...",
        "info"
    );

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "eventoId",
        String(
            eventoId
        )
    );

    formData.append(
        "carpeta",
        "eventos"
    );

    console.log(
        "OTIUM - Subiendo imagen:",
        {
            eventoId,
            nombre: file.name,
            tipo: file.type,
            tamaño: file.size
        }
    );

    const response =
        await fetch(
            IMAGE_WORKER_URL +
            "upload",
            {
                method:
                    "POST",
                body:
                    formData
            }
        );

    const responseText =
        await response.text();

    let data =
        null;

    try {

        data =
            JSON.parse(
                responseText
            );

    } catch {

        data = {
            ok: false,
            error:
                responseText ||
                "Respuesta inválida del servidor."
        };
    }

    console.log(
        "OTIUM - Respuesta Worker:",
        data
    );

    if (
        !response.ok ||
        !data.ok
    ) {
        throw new Error(
            data.error ||
            "No fue posible subir la imagen."
        );
    }

    if (
        !data.url
    ) {
        throw new Error(
            "El Worker no devolvió la URL de la imagen."
        );
    }

    mostrarEstadoImagen(
        "✓ Imagen subida correctamente.",
        "success"
    );

    return {
        url:
            data.url,

        fileName:
            data.fileName ||
            "",

        contentType:
            data.contentType ||
            file.type,

        size:
            data.size ||
            file.size
    };
}


/* =====================================================
   EVENTO UBICACIÓN
===================================================== */

locationButton?.addEventListener(
    "click",
    async (event) => {

        event.preventDefault();

        await usarUbicacionActual();
    }
);


/* =====================================================
   USAR UBICACIÓN ACTUAL
===================================================== */

async function usarUbicacionActual() {

    if (
        !navigator.geolocation
    ) {

        alert(
            "Tu navegador no permite obtener la ubicación."
        );

        return;
    }

    const textoOriginal =
        locationButton
            ? locationButton.textContent
            : "";

    if (
        locationButton
    ) {

        locationButton.disabled =
            true;

        locationButton.textContent =
            "Obteniendo ubicación...";
    }

    try {

        const position =
            await obtenerCoordenadas();

        const lat =
            position.coords.latitude;

        const lon =
            position.coords.longitude;

        console.log(
            "OTIUM - Coordenadas obtenidas:",
            {
                lat,
                lon
            }
        );

        const direccion =
            await obtenerDireccion(
                lat,
                lon
            );

        const addressElement =
            document.getElementById(
                "address"
            );

        const cityElement =
            document.getElementById(
                "city"
            );

        const regionElement =
            document.getElementById(
                "region"
            );

        if (
            addressElement
        ) {

            addressElement.value =
                direccion.direccionCompleta ||
                direccion.displayName ||
                "";
        }

        if (
            cityElement &&
            direccion.ciudad
        ) {

            cityElement.value =
                direccion.ciudad;
        }

        if (
            regionElement &&
            direccion.region
        ) {

            regionElement.value =
                direccion.region;
        }

        /* =====================================================
   ACTUALIZAR COORDENADAS Y MAPA
===================================================== */

sincronizarCoordenadas(
    lat,
    lon
);

        mostrarMensajeUbicacion(
            "Ubicación obtenida correctamente.",
            "success"
        );

    } catch (
        error
    ) {

        console.error(
            "Error obteniendo ubicación:",
            error
        );

        let mensaje =
            "No se pudo obtener la ubicación.";

        if (
            error &&
            error.code === 1
        ) {

            mensaje =
                "Debes permitir el acceso a la ubicación en el navegador.";

        } else if (
            error &&
            error.code === 2
        ) {

            mensaje =
                "No fue posible determinar tu ubicación.";

        } else if (
            error &&
            error.code === 3
        ) {

            mensaje =
                "La solicitud de ubicación tardó demasiado.";

        } else if (
            error &&
            error.message &&
            !error.code
        ) {

            mensaje =
                "Se obtuvo tu ubicación, pero no fue posible convertirla en una dirección completa.";
        }

        mostrarMensajeUbicacion(
            mensaje,
            "error"
        );

    } finally {

        if (
            locationButton
        ) {

            locationButton.disabled =
                false;

            locationButton.textContent =
                textoOriginal ||
                "📍 Usar mi ubicación actual";
        }
    }
}


/* =====================================================
   COORDENADAS
===================================================== */

function obtenerCoordenadas() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy:
                        true,

                    timeout:
                        15000,

                    maximumAge:
                        0
                }
            );
        }
    );
}

/* =====================================================
   GEOCODIFICACIÓN INVERSA - GEOAPIFY
===================================================== */

async function obtenerDireccion(
    latitude,
    longitude
) {

    if (
        !GEOAPIFY_API_KEY
    ) {

        throw new Error(
            "No está configurada la clave de Geoapify."
        );
    }

    const url =
        "https://api.geoapify.com/v1/geocode/reverse" +
        "?lat=" +
        encodeURIComponent(
            latitude
        ) +
        "&lon=" +
        encodeURIComponent(
            longitude
        ) +
        "&lang=es" +
        "&apiKey=" +
        encodeURIComponent(
            GEOAPIFY_API_KEY
        );

    const response =
        await fetch(
            url,
            {
                method:
                    "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );

    if (
        !response.ok
    ) {

        throw new Error(
            "No se pudo obtener la dirección mediante Geoapify."
        );
    }

    const data =
        await response.json();

    const properties =
        data.features &&
        data.features.length > 0
            ? data.features[0].properties
            : {};

    if (
        !properties ||
        (
            properties.lat === undefined &&
            properties.lon === undefined
        )
    ) {

        throw new Error(
            "Geoapify no encontró información para estas coordenadas."
        );
    }

    const ciudad =
        properties.city ||
        properties.town ||
        properties.municipality ||
        properties.village ||
        properties.suburb ||
        "";

    const region =
        properties.state ||
        properties.region ||
        "";

    let direccionCompleta =
        properties.formatted ||
        "";

    if (
        !direccionCompleta
    ) {

        const partes = [];

        const calle =
            properties.street ||
            properties.road ||
            "";

        const numero =
            properties.housenumber ||
            properties.house_number ||
            "";

        if (
            calle
        ) {

            let calleCompleta =
                calle;

            if (
                numero
            ) {

                calleCompleta +=
                    " " +
                    numero;
            }

            partes.push(
                calleCompleta
            );
        }

        if (
            properties.neighbourhood
        ) {

            partes.push(
                properties.neighbourhood
            );
        }

        if (
            properties.suburb &&
            properties.suburb !== ciudad
        ) {

            partes.push(
                properties.suburb
            );
        }

        if (
            ciudad
        ) {

            partes.push(
                ciudad
            );
        }

        if (
            region
        ) {

            partes.push(
                region
            );
        }

        if (
            properties.country
        ) {

            partes.push(
                properties.country
            );
        }

        direccionCompleta =
            partes.join(
                ", "
            );
    }

    return {

        direccionCompleta:
            direccionCompleta,

        displayName:
            properties.formatted ||
            direccionCompleta,

        ciudad:
            ciudad,

        region:
            region,

        latitude:
            latitude,

        longitude:
            longitude,

        raw:
            data
    };
}
/* =====================================================
   MENSAJE UBICACIÓN
===================================================== */

function mostrarMensajeUbicacion(
    mensaje,
    tipo
) {

    const mensajeElement =
        document.getElementById(
            "locationMessage"
        );

    if (
        !mensajeElement
    ) {
        return;
    }

    mensajeElement.textContent =
        mensaje;

    mensajeElement.className =
        "location-message";

    if (
        mensaje
    ) {

        mensajeElement.classList.add(
            tipo === "success"
                ? "success"
                : tipo === "error"
                    ? "error"
                    : "info"
        );
    }
}


/* =====================================================
   FORMULARIO
===================================================== */

if (
    form
) {

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            /* ==========================================
               LOGIN
            ========================================== */

            const user =
                auth.currentUser ||
                currentUser;

            if (
                !user
            ) {

                alert(
                    "Debes iniciar sesión para publicar un evento."
                );

                return;
            }


            /* ==========================================
               CAMPOS
            ========================================== */

            const nombre =
                getValue(
                    "title"
                );

            const categoria =
                getValue(
                    "category"
                );

            const subcategoria =
                getValue(
                    "subcategory"
                );

            const fecha =
                getValue(
                    "date"
                );

            const hora =
                getValue(
                    "time"
                );

            const fechaTerminoInput =
                getValue(
                    "endDate"
                );

            const horaTermino =
                getValue(
                    "endTime"
                );

            const mismoDia =
                sameDayCheckbox?.checked ??
                true;

            const fechaTermino =
                mismoDia
                    ? fecha
                    : fechaTerminoInput;

            const ciudad =
                getValue(
                    "city"
                );

            const ubicacion =
                getValue(
                    "address"
                );

            const descripcion =
                getValue(
                    "description"
                );

            const precio =
                freeEntry?.checked
                    ? ""
                    : getValue(
                        "price"
                    );

            const ticketsValue =
                getValue(
                    "tickets"
                );

            const eventLink =
                getValue(
                    "eventLink"
                );

            const instagram =
                getValue(
                    "instagram"
                );

            const facebook =
                getValue(
                    "facebook"
                );

            const region =
                getValue(
                    "region"
                );

            const latitude =
                getValue(
                    "latitude"
                ) ||
                form.dataset.latitude ||
                "";

            const longitude =
                getValue(
                    "longitude"
                ) ||
                form.dataset.longitude ||
                "";

            const tipoEvento =
                obtenerTipoEvento();

            const entradaGratuita =
                Boolean(
                    freeEntry?.checked
                );

            const confirmacionAsistencia =
                tipoEvento ===
                    "particular" &&
                Boolean(
                    requiresAttendance?.checked
                );

            const enlaceConfirmacion =
                confirmacionAsistencia
                    ? getValue(
                        "attendanceLink"
                    )
                    : "";


            /* ==========================================
               EDAD
            ========================================== */

            const tipoEdad =
                obtenerTipoEdad();

            let tieneRangoEdad =
                false;

            let edadMinima =
                null;

            let edadMaxima =
                null;

            if (
                tipoEdad ===
                "rango"
            ) {

                const edadMinimaNumero =
                    Number(
                        getValue(
                            "ageMin"
                        )
                    );

                const edadMaximaNumero =
                    Number(
                        getValue(
                            "ageMax"
                        )
                    );

                if (
                    !Number.isInteger(
                        edadMinimaNumero
                    ) ||
                    !Number.isInteger(
                        edadMaximaNumero
                    )
                ) {

                    alert(
                        "Debes ingresar una edad mínima y una edad máxima válidas."
                    );

                    return;
                }

                if (
                    edadMinimaNumero < 0 ||
                    edadMinimaNumero > 120
                ) {

                    alert(
                        "La edad mínima debe estar entre 0 y 120 años."
                    );

                    return;
                }

                if (
                    edadMaximaNumero < 0 ||
                    edadMaximaNumero > 120
                ) {

                    alert(
                        "La edad máxima debe estar entre 0 y 120 años."
                    );

                    return;
                }

                if (
                    edadMinimaNumero >
                    edadMaximaNumero
                ) {

                    alert(
                        "La edad mínima no puede ser mayor que la edad máxima."
                    );

                    return;
                }

                tieneRangoEdad =
                    true;

                edadMinima =
                    edadMinimaNumero;

                edadMaxima =
                    edadMaximaNumero;
            }


            /* ==========================================
               VALIDACIÓN GENERAL
            ========================================== */

            if (
                !nombre ||
                !categoria ||
                !fecha ||
                !ciudad
            ) {

                alert(
                    "Completa los campos obligatorios."
                );

                return;
            }


            /* ==========================================
               VALIDAR FECHA Y HORA DE TÉRMINO
            ========================================== */

            if (
                !fechaTermino
            ) {

                alert(
                    "Debes indicar la fecha de término del evento."
                );

                return;
            }

            if (
                fechaTermino <
                fecha
            ) {

                alert(
                    "La fecha de término no puede ser anterior a la fecha de inicio."
                );

                return;
            }

            if (
                fechaTermino === fecha &&
                hora &&
                horaTermino &&
                horaTermino < hora
            ) {

                alert(
                    "La hora de término no puede ser anterior a la hora de inicio cuando el evento termina el mismo día."
                );

                return;
            }


            /* ==========================================
               VALIDAR ASISTENCIA
            ========================================== */

            if (
                confirmacionAsistencia &&
                !enlaceConfirmacion
            ) {

                alert(
                    "Ingresa el enlace para confirmar la asistencia."
                );

                return;
            }

            if (
                confirmacionAsistencia &&
                enlaceConfirmacion &&
                !esUrlValida(
                    enlaceConfirmacion
                )
            ) {

                alert(
                    "El enlace de confirmación de asistencia no es válido."
                );

                return;
            }


            /* ==========================================
               VALIDAR ENLACE EVENTO
            ========================================== */

            if (
                eventLink &&
                !esUrlValida(
                    eventLink
                )
            ) {

                alert(
                    "El enlace del evento / entradas no es válido."
                );

                return;
            }
            /* ==========================================
                VALIDAR REDES SOCIALES
                ========================================== */

            if (
                instagram &&
                !esUrlValida(
                    instagram
                )
                ) {

    alert(
        "El enlace de Instagram no es válido."
    );

    return;
}

if (
    facebook &&
    !esUrlValida(
        facebook
    )
) {

    alert(
        "El enlace de Facebook no es válido."
    );

    return;
}
            /* ==========================================
               VALIDAR PRECIO
            ========================================== */

            if (
                !entradaGratuita &&
                !precio
            ) {

                alert(
                    "Ingresa el precio del evento."
                );

                return;
            }


            /* ==========================================
               IMAGEN
            ========================================== */

            const selectedImage =
                imageInput?.files?.[0] ||
                null;

            if (
                selectedImage
            ) {

                const validacion =
                    validarImagen(
                        selectedImage
                    );

                if (
                    !validacion.ok
                ) {

                    alert(
                        validacion.error
                    );

                    return;
                }
            }


            /* ==========================================
               BOTÓN
            ========================================== */

            if (
                publishButton
            ) {

                publishButton.disabled =
                    true;

                publishButton.textContent =
                    selectedImage
                        ? "Publicando y subiendo imagen..."
                        : "Publicando evento...";
            }

            mostrarMensajeGeneral(
                selectedImage
                    ? "Creando el evento y preparando la imagen..."
                    : "Publicando evento...",
                "info"
            );


            /* ==========================================
               ENTRADAS
            ========================================== */

            let entradasDisponibles =
                null;

            if (
                ticketsValue !== ""
            ) {

                const numeroEntradas =
                    Number(
                        ticketsValue
                    );

                if (
                    Number.isFinite(
                        numeroEntradas
                    ) &&
                    numeroEntradas >= 0
                ) {

                    entradasDisponibles =
                        numeroEntradas;

                } else {

                    mostrarMensajeGeneral(
                        "La cantidad de entradas no es válida.",
                        "error"
                    );

                    restaurarBotonPublicar();

                    return;
                }
            }


            /* ==========================================
               TICKETING
            ========================================== */

            let modalidadTicketing =
                "sin_entradas";

            if (
                entradaGratuita
            ) {

                modalidadTicketing =
                    "gratuita";

            } else if (
                eventLink
            ) {

                modalidadTicketing =
                    "externa";
            }


            /* ==========================================
               DATOS FIRESTORE
            ========================================== */

            const eventData = {

                nombre:
                    nombre,

                categoria:
                    categoria,

                subcategoria:
                    subcategoria,

                tipoEvento:
                    tipoEvento,


                /* ======================================
                   FECHA Y HORARIO
                ====================================== */

                fecha:
                    fecha,

                hora:
                    hora,

                fechaInicio:
                    fecha,

                fechaTermino:
                    fechaTermino,

                horaInicio:
                    hora,

                horaTermino:
                    horaTermino,


                ciudad:
                    ciudad,

                ubicacion:
                    ubicacion,

                direccion:
                    ubicacion,

                region:
                    region,

                descripcion:
                    descripcion,


                /* ======================================
                   EDAD
                ====================================== */

                edad: {

                    tieneRango:
                        tieneRangoEdad,

                    edadMinima:
                        edadMinima,

                    edadMaxima:
                        edadMaxima
                },


                /* ======================================
                   ACCESO
                ====================================== */

                entradaGratuita:
                    entradaGratuita,

                precio:
                    precio,

                entradas:
                    entradasDisponibles,


                /* ======================================
   ENLACE
====================================== */

enlaceEvento:
    eventLink,

instagram:
    instagram,

facebook:
    facebook,

                /* ======================================
                   TICKETING
                ====================================== */

                ticketing: {

                    modalidad:
                        modalidadTicketing,

                    urlExterna:
                        eventLink,

                    ventaOTIUM:
                        false,

                    precio:
                        precio,

                    moneda:
                        "CLP",

                    stock:
                        entradasDisponibles
                },


                /* ======================================
                   ASISTENCIA
                ====================================== */

                asistencia: {

                    requiereConfirmacion:
                        confirmacionAsistencia,

                    modalidad:
                        confirmacionAsistencia
                            ? (
                                enlaceConfirmacion
                                    ? "externa"
                                    : "OTIUM"
                            )
                            : "ninguna",

                    urlConfirmacion:
                        enlaceConfirmacion,

                    totalConfirmados:
                        0
                },


                /* ======================================
                   PROPIETARIO
                ====================================== */

                usuarioId:
                    user.uid,


                /* ======================================
                   PUBLICIDAD
                ====================================== */

                publicidad: {

                    carrusel:
                        false,

                    destacado:
                        false,

                    sponsor:
                        false
                },


                /* ======================================
                   COMPATIBILIDAD
                ====================================== */

                destacado:
                    false,

                estadoPromocion:
                    "inactivo"
            };


            /* ==========================================
               COORDENADAS
            ========================================== */

            if (
                latitude !== ""
            ) {

                const numeroLat =
                    Number(
                        latitude
                    );

                if (
                    Number.isFinite(
                        numeroLat
                    )
                ) {

                    eventData.latitude =
                        numeroLat;
                }
            }

            if (
                longitude !== ""
            ) {

                const numeroLon =
                    Number(
                        longitude
                    );

                if (
                    Number.isFinite(
                        numeroLon
                    )
                ) {

                    eventData.longitude =
                        numeroLon;
                }
            }


            console.log(
                "OTIUM - Evento que se guardará:",
                eventData
            );


            /* ==========================================
               CREAR EVENTO
            ========================================== */

            let firestoreId =
                null;

            try {

                firestoreId =
                    await saveEvent(
                        eventData
                    );

                console.log(
                    "OTIUM - Evento creado:",
                    firestoreId
                );

            } catch (
                error
            ) {

                console.error(
                    "OTIUM - Error guardando evento:",
                    error
                );

                mostrarMensajeGeneral(
                    "No se pudo publicar el evento.",
                    "error"
                );

                restaurarBotonPublicar();

                return;
            }


            /* ==========================================
               SUBIR IMAGEN
            ========================================== */

            if (
                selectedImage
            ) {

                try {

                    const imageData =
                        await subirImagen(
                            selectedImage,
                            firestoreId
                        );

                    console.log(
                        "OTIUM - Imagen subida:",
                        imageData
                    );

                    await updateEvent(
                        firestoreId,
                        {

                            imagen:
                                imageData.url,

                            imagenUrl:
                                imageData.url,

                            imageUrl:
                                imageData.url,

                            fotoUrl:
                                imageData.url,

                            imagenNombre:
                                selectedImage.name,

                            imagenKey:
                                imageData.fileName,

                            imagenTipo:
                                imageData.contentType,

                            imagenTamaño:
                                imageData.size,

                            imagenEstado:
                                "ok"
                        }
                    );

                    console.log(
                        "OTIUM - Evento actualizado con imagen:",
                        firestoreId
                    );

                } catch (
                    error
                ) {

                    console.error(
                        "OTIUM - Error subiendo imagen:",
                        error
                    );

                    try {

                        await updateEvent(
                            firestoreId,
                            {

                                imagenEstado:
                                    "error",

                                imagenError:
                                    error?.message ||
                                    String(
                                        error
                                    )
                            }
                        );

                    } catch (
                        updateError
                    ) {

                        console.error(
                            "OTIUM - No se pudo registrar el error de imagen:",
                            updateError
                        );
                    }

                    mostrarMensajeGeneral(
                        "El evento fue publicado, pero la imagen no pudo subirse.",
                        "error"
                    );

                    alert(
                        "El evento fue publicado correctamente, pero la imagen no pudo subirse."
                    );

                    restaurarBotonPublicar();

                    return;
                }
            }


            /* ==========================================
               FINAL
            ========================================== */

            mostrarMensajeGeneral(
                "✓ Evento publicado correctamente.",
                "success"
            );

            alert(
                selectedImage
                    ? "Evento e imagen publicados correctamente."
                    : "Evento publicado correctamente."
            );

            form.reset();

            limpiarImagen();

            actualizarTipoEvento();

            actualizarAcceso();

            actualizarEdad();

            actualizarFechaTermino();

            window.location.href =
                "my-events.html";
        }
    );
}


/* =====================================================
   VALIDAR URL
===================================================== */

function esUrlValida(
    valor
) {

    try {

        const url =
            new URL(
                valor
            );

        return (
            url.protocol ===
                "http:" ||
            url.protocol ===
                "https:"
        );

    } catch {

        return false;
    }
}


/* =====================================================
   MENSAJE GENERAL
===================================================== */

function mostrarMensajeGeneral(
    mensaje,
    tipo
) {

    if (
        !createEventMessage
    ) {
        return;
    }

    createEventMessage.textContent =
        mensaje;

    createEventMessage.className =
        "create-event-message";

    if (
        tipo
    ) {

        createEventMessage.classList.add(
            tipo
        );
    }
}


/* =====================================================
   RESTAURAR BOTÓN
===================================================== */

function restaurarBotonPublicar() {

    if (
        !publishButton
    ) {
        return;
    }

    publishButton.disabled =
        false;

    publishButton.textContent =
        "Publicar evento";
}


/* =====================================================
   OBTENER VALOR
===================================================== */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );

    if (
        !element
    ) {
        return "";
    }

    return String(
        element.value ||
        ""
    ).trim();
}


/* =====================================================
   FORMATEAR BYTES
===================================================== */

function formatearBytes(
    bytes
) {

    if (
        !Number.isFinite(
            bytes
        )
    ) {
        return "";
    }

    if (
        bytes < 1024
    ) {
        return `${bytes} B`;
    }

    if (
        bytes <
        1024 * 1024
    ) {
        return `${(
            bytes /
            1024
        ).toFixed(1)} KB`;
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(2)} MB`;
}
