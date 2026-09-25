import {
    auth
} from "./modules/auth.js";

import {
    saveEvent,
    updateEvent
} from "./modules/database.js";

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

        const latitudeElement =
            document.getElementById(
                "latitude"
            );

        const longitudeElement =
            document.getElementById(
                "longitude"
            );

        if (
            latitudeElement
        ) {

            latitudeElement.value =
                lat;
        }

        if (
            longitudeElement
        ) {

            longitudeElement.value =
                lon;
        }

        if (
            form
        ) {

            form.dataset.latitude =
                lat;

            form.dataset.longitude =
                lon;
        }

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
   GEOCODIFICACIÓN INVERSA
===================================================== */

async function obtenerDireccion(
    latitude,
    longitude
) {

    const url =
        "https://nominatim.openstreetmap.org/reverse" +
        "?format=jsonv2" +
        "&lat=" +
        encodeURIComponent(
            latitude
        ) +
        "&lon=" +
        encodeURIComponent(
            longitude
        ) +
        "&addressdetails=1" +
        "&accept-language=es";

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
            "No se pudo obtener la dirección."
        );
    }

    const data =
        await response.json();

    const address =
        data.address ||
        {};

    const ciudad =
        address.city ||
        address.town ||
        address.municipality ||
        address.village ||
        address.suburb ||
        "";

    const region =
        address.state ||
        address.region ||
        "";

    let direccionCompleta =
        data.display_name ||
        "";

    if (
        !direccionCompleta
    ) {

        const partes = [];

        if (
            address.road
        ) {

            let calle =
                address.road;

            if (
                address.house_number
            ) {

                calle +=
                    " " +
                    address.house_number;
            }

            partes.push(
                calle
            );
        }

        if (
            address.neighbourhood
        ) {

            partes.push(
                address.neighbourhood
            );
        }

        if (
            address.suburb &&
            address.suburb !== ciudad
        ) {

            partes.push(
                address.suburb
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
            address.country
        ) {

            partes.push(
                address.country
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
            data.display_name ||
            "",

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