/* =====================================================
   OTIUM - MIS AVISOS
   Archivo: js/mis-avisos.js
   Versión: 20260903

   Funciones:
   - Detectar usuario autenticado
   - Cargar preferencias desde Firestore
   - Guardar preferencias
   - Restablecer preferencias
   - Gestionar categorías
   - Gestionar subcategorías
   - Gestionar rango de edad
   - Gestionar tipo de acceso
   - Mostrar resumen
   - Gestionar notificaciones Push ON / OFF
===================================================== */


/* =====================================================
   AUTH
===================================================== */

import {
    auth
} from "./modules/auth.js";


/* =====================================================
   FIRESTORE
===================================================== */

import {
    db
} from "./modules/firebase-config.js";


/* =====================================================
   FIREBASE AUTH
===================================================== */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   FIRESTORE
===================================================== */

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* =====================================================
   NOTIFICACIONES PUSH
===================================================== */

import {
    activarNotificacionesPush,
    desactivarNotificacionesPush,
    obtenerEstadoNotificacionesPush
} from "./notificaciones-push.js";



/* =====================================================
   ELEMENTOS
===================================================== */

const alertsMessage =
    document.getElementById(
        "alertsMessage"
    );


const loginRequired =
    document.getElementById(
        "loginRequired"
    );


const alertsContent =
    document.getElementById(
        "alertsContent"
    );


const alertsEnabled =
    document.getElementById(
        "alertsEnabled"
    );


const alertsStatusIndicator =
    document.getElementById(
        "alertsStatusIndicator"
    );


const alertCity =
    document.getElementById(
        "alertCity"
    );


const alertRegion =
    document.getElementById(
        "alertRegion"
    );


const alertSubcategory =
    document.getElementById(
        "alertSubcategory"
    );


const alertAgeMin =
    document.getElementById(
        "alertAgeMin"
    );


const alertAgeMax =
    document.getElementById(
        "alertAgeMax"
    );


const preferencesSummary =
    document.getElementById(
        "preferencesSummary"
    );


const saveAlertsButton =
    document.getElementById(
        "saveAlertsButton"
    );


const resetAlertsButton =
    document.getElementById(
        "resetAlertsButton"
    );


/* =====================================================
   ELEMENTOS PUSH
===================================================== */

const pushNotificationTitle =
    document.getElementById(
        "pushNotificationTitle"
    );


const pushNotificationStatus =
    document.getElementById(
        "pushNotificationStatus"
    );


const enablePushNotificationsButton =
    document.getElementById(
        "enablePushNotificationsButton"
    );


/* =====================================================
   ESTADO
===================================================== */

let currentUser = null;

let loadingPreferences = false;

let savingPreferences = false;

let changingPushState = false;


/* =====================================================
   CATEGORÍAS
===================================================== */

const categorias = [
    "Música",
    "Teatro",
    "Danza",
    "Cine",
    "Arte y cultura",
    "Deportes",
    "Gastronomía",
    "Ferias y mercados",
    "Vida nocturna",
    "Fiestas",
    "Familiar",
    "Congresos y conferencias",
    "Educación y formación",
    "Negocios y networking",
    "Exposiciones",
    "Comunidad",
    "Eventos particulares",
    "Otros"
];


/* =====================================================
   SUBCATEGORÍAS
===================================================== */

const subcategorias = {

    "Música": [
        "Concierto",
        "Festival musical",
        "Recital",
        "Tributo",
        "DJ / Electrónica",
        "Música clásica",
        "Jazz",
        "Rock",
        "Pop",
        "Folclore",
        "Otros"
    ],

    "Teatro": [
        "Obra teatral",
        "Comedia",
        "Drama",
        "Musical",
        "Teatro infantil",
        "Teatro familiar",
        "Stand up",
        "Otros"
    ],

    "Danza": [
        "Ballet",
        "Danza contemporánea",
        "Danza urbana",
        "Folclórica",
        "Danza clásica",
        "Otros"
    ],

    "Cine": [
        "Película",
        "Festival de cine",
        "Cine arte",
        "Documental",
        "Estreno",
        "Otros"
    ],

    "Arte y cultura": [
        "Arte",
        "Cultura",
        "Literatura",
        "Poesía",
        "Patrimonio",
        "Museos",
        "Otros"
    ],

    "Deportes": [
        "Fútbol",
        "Running",
        "Ciclismo",
        "Tenis",
        "Artes marciales",
        "Fitness",
        "Torneos",
        "Competencias",
        "Otros"
    ],

    "Gastronomía": [
        "Festival gastronómico",
        "Feria gastronómica",
        "Cata",
        "Degustación",
        "Cena",
        "Clase de cocina",
        "Otros"
    ],

    "Ferias y mercados": [
        "Feria artesanal",
        "Feria comercial",
        "Feria libre",
        "Mercado",
        "Feria de emprendedores",
        "Feria temática",
        "Otros"
    ],

    "Vida nocturna": [
        "Club",
        "Bar",
        "Pub",
        "After office",
        "Noche temática",
        "Otros"
    ],

    "Fiestas": [
        "Fiesta temática",
        "Fiesta electrónica",
        "Fiesta familiar",
        "Fiesta tradicional",
        "Celebración",
        "Otros"
    ],

    "Familiar": [
        "Actividad infantil",
        "Actividad familiar",
        "Parque",
        "Juegos",
        "Animación",
        "Otros"
    ],

    "Congresos y conferencias": [
        "Congreso",
        "Convención",
        "Seminario",
        "Simposio",
        "Foro",
        "Conferencia",
        "Otros"
    ],

    "Educación y formación": [
        "Taller",
        "Curso",
        "Capacitación",
        "Charla",
        "Diplomado",
        "Clase",
        "Otros"
    ],

    "Negocios y networking": [
        "Networking",
        "Rueda de negocios",
        "Lanzamiento",
        "Evento empresarial",
        "Evento corporativo",
        "Otros"
    ],

    "Exposiciones": [
        "Exposición",
        "Muestra",
        "Galería",
        "Feria de arte",
        "Instalación",
        "Otros"
    ],

    "Comunidad": [
        "Actividad comunitaria",
        "Voluntariado",
        "Organización social",
        "Encuentro vecinal",
        "Actividad municipal",
        "Otros"
    ],

    "Eventos particulares": [
        "Cumpleaños",
        "Aniversario",
        "Matrimonio",
        "Bautizo",
        "Baby shower",
        "Despedida",
        "Celebración familiar",
        "Reunión",
        "Fiesta privada",
        "Otro evento particular"
    ],

    "Otros": [
        "Otro"
    ]
};


/* =====================================================
   PREFERENCIAS POR DEFECTO
===================================================== */

const preferenciasPorDefecto = {

    activo: false,

    ciudad: "",

    region: "",

    categorias: [],

    subcategorias: [],

    edad: {

        tieneRango:
            false,

        edadMinima:
            null,

        edadMaxima:
            null

    },

    acceso:
        "ambos",

    version:
        1

};


/* =====================================================
   MENSAJES
===================================================== */

function mostrarMensaje(
    texto,
    tipo = "info"
) {

    if (
        !alertsMessage
    ) {

        return;

    }


    alertsMessage.textContent =
        texto;


    alertsMessage.className =
        `alerts-message ${tipo}`;

}


function ocultarMensaje() {

    if (
        !alertsMessage
    ) {

        return;

    }


    alertsMessage.textContent =
        "";


    alertsMessage.className =
        "alerts-message";

}


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function limpiarTexto(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(
        valor
    ).trim();

}


/* =====================================================
   NORMALIZAR ARRAY
===================================================== */

function normalizarArray(
    valor
) {

    if (
        !Array.isArray(valor)
    ) {

        return [];

    }


    return valor
        .map(
            item =>
                limpiarTexto(item)
        )
        .filter(
            Boolean
        );

}


/* =====================================================
   REFERENCIA PREFERENCIAS
===================================================== */

function obtenerReferenciaPreferencias(
    uid
) {

    return doc(
        db,
        "usuarios",
        uid,
        "preferencias",
        "avisos"
    );

}


/* =====================================================
   SUBCATEGORÍAS
===================================================== */

function actualizarSubcategorias(
    categoriasSeleccionadas = []
) {

    if (
        !alertSubcategory
    ) {

        return;

    }


    const seleccionadas =
        new Set(
            normalizarArray(
                categoriasSeleccionadas
            )
        );


    const opciones = [];


    seleccionadas.forEach(
        categoria => {

            const lista =
                subcategorias[
                    categoria
                ] || [];


            lista.forEach(
                subcategoria => {

                    if (
                        !opciones.includes(
                            subcategoria
                        )
                    ) {

                        opciones.push(
                            subcategoria
                        );

                    }

                }
            );

        }
    );


    alertSubcategory.innerHTML =
        "";


    opciones.forEach(
        subcategoria => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                subcategoria;


            option.textContent =
                subcategoria;


            alertSubcategory.appendChild(
                option
            );

        }
    );

}


/* =====================================================
   CATEGORÍAS SELECCIONADAS
===================================================== */

function obtenerCategoriasSeleccionadas() {

    return Array.from(
        document.querySelectorAll(
            'input[name="alertCategory"]:checked'
        )
    ).map(
        input =>
            input.value
    );

}


/* =====================================================
   SUBCATEGORÍAS SELECCIONADAS
===================================================== */

function obtenerSubcategoriasSeleccionadas() {

    if (
        !alertSubcategory
    ) {

        return [];

    }


    return Array.from(
        alertSubcategory.selectedOptions
    ).map(
        option =>
            option.value
    );

}


/* =====================================================
   TIPO DE ACCESO
===================================================== */

function obtenerAcceso() {

    const seleccionado =
        document.querySelector(
            'input[name="alertAccess"]:checked'
        );


    return seleccionado
        ? seleccionado.value
        : "ambos";

}


/* =====================================================
   ESTADO VISUAL DE AVISOS
===================================================== */

function actualizarEstadoVisual() {

    if (
        !alertsEnabled ||
        !alertsStatusIndicator
    ) {

        return;

    }


    if (
        alertsEnabled.checked
    ) {

        alertsStatusIndicator.textContent =
            "Activados";


        alertsStatusIndicator.className =
            "status-indicator active";

    } else {

        alertsStatusIndicator.textContent =
            "Desactivados";


        alertsStatusIndicator.className =
            "status-indicator inactive";

    }

}


/* =====================================================
   OBTENER PREFERENCIAS DEL FORMULARIO
===================================================== */

function obtenerPreferenciasFormulario() {

    let edadMinima =
        null;

    let edadMaxima =
        null;


    if (
        alertAgeMin &&
        limpiarTexto(
            alertAgeMin.value
        ) !== ""
    ) {

        edadMinima =
            Number(
                alertAgeMin.value
            );

    }


    if (
        alertAgeMax &&
        limpiarTexto(
            alertAgeMax.value
        ) !== ""
    ) {

        edadMaxima =
            Number(
                alertAgeMax.value
            );

    }


    return {

        activo:
            Boolean(
                alertsEnabled?.checked
            ),

        ciudad:
            limpiarTexto(
                alertCity?.value
            ),

        region:
            limpiarTexto(
                alertRegion?.value
            ),

        categorias:
            obtenerCategoriasSeleccionadas(),

        subcategorias:
            obtenerSubcategoriasSeleccionadas(),

        edad: {

            tieneRango:
                edadMinima !== null ||
                edadMaxima !== null,

            edadMinima:
                Number.isFinite(
                    edadMinima
                )
                    ? edadMinima
                    : null,

            edadMaxima:
                Number.isFinite(
                    edadMaxima
                )
                    ? edadMaxima
                    : null

        },

        acceso:
            obtenerAcceso(),

        version:
            1

    };

}


/* =====================================================
   VALIDAR PREFERENCIAS
===================================================== */

function validarPreferencias(
    preferencias
) {

    const min =
        preferencias
            ?.edad
            ?.edadMinima;


    const max =
        preferencias
            ?.edad
            ?.edadMaxima;


    if (
        min !== null &&
        min !== undefined
    ) {

        if (
            !Number.isFinite(min) ||
            min < 0 ||
            min > 120
        ) {

            return "La edad mínima debe estar entre 0 y 120 años.";

        }

    }


    if (
        max !== null &&
        max !== undefined
    ) {

        if (
            !Number.isFinite(max) ||
            max < 0 ||
            max > 120
        ) {

            return "La edad máxima debe estar entre 0 y 120 años.";

        }

    }


    if (
        min !== null &&
        max !== null &&
        min !== undefined &&
        max !== undefined &&
        min > max
    ) {

        return "La edad mínima no puede ser mayor que la edad máxima.";

    }


    const accesos = [
        "ambos",
        "gratis",
        "pagado"
    ];


    if (
        !accesos.includes(
            preferencias.acceso
        )
    ) {

        return "El tipo de acceso seleccionado no es válido.";

    }


    return null;

}


/* =====================================================
   APLICAR PREFERENCIAS
===================================================== */

function aplicarPreferencias(
    preferencias
) {

    const datos =
        preferencias ||
        preferenciasPorDefecto;


    if (
        alertsEnabled
    ) {

        alertsEnabled.checked =
            datos.activo === true;

    }


    if (
        alertCity
    ) {

        alertCity.value =
            limpiarTexto(
                datos.ciudad
            );

    }


    if (
        alertRegion
    ) {

        alertRegion.value =
            limpiarTexto(
                datos.region
            );

    }


    /* =============================================
       CATEGORÍAS
    ============================================= */

    const categoriasSeleccionadas =
        new Set(
            normalizarArray(
                datos.categorias
            )
        );


    document
        .querySelectorAll(
            'input[name="alertCategory"]'
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    categoriasSeleccionadas.has(
                        checkbox.value
                    );

            }
        );


    /* =============================================
       SUBCATEGORÍAS
    ============================================= */

    actualizarSubcategorias(
        datos.categorias
    );


    const subcategoriasSeleccionadas =
        new Set(
            normalizarArray(
                datos.subcategorias
            )
        );


    if (
        alertSubcategory
    ) {

        Array.from(
            alertSubcategory.options
        ).forEach(
            option => {

                option.selected =
                    subcategoriasSeleccionadas.has(
                        option.value
                    );

            }
        );

    }


    /* =============================================
       EDAD
    ============================================= */

    const edad =
        datos.edad || {};


    if (
        alertAgeMin
    ) {

        alertAgeMin.value =
            edad.edadMinima !== null &&
            edad.edadMinima !== undefined
                ? edad.edadMinima
                : "";

    }


    if (
        alertAgeMax
    ) {

        alertAgeMax.value =
            edad.edadMaxima !== null &&
            edad.edadMaxima !== undefined
                ? edad.edadMaxima
                : "";

    }


    /* =============================================
       ACCESO
    ============================================= */

    const acceso =
        datos.acceso ||
        "ambos";


    const radio =
        document.querySelector(
            `input[name="alertAccess"][value="${CSS.escape(acceso)}"]`
        );


    if (
        radio
    ) {

        radio.checked =
            true;

    } else {

        const defaultRadio =
            document.getElementById(
                "accessBoth"
            );


        if (
            defaultRadio
        ) {

            defaultRadio.checked =
                true;

        }

    }


    actualizarEstadoVisual();

    actualizarResumen();

}


/* =====================================================
   CARGAR PREFERENCIAS
===================================================== */

async function cargarPreferencias() {

    if (
        !currentUser
    ) {

        return;

    }


    if (
        loadingPreferences
    ) {

        return;

    }


    loadingPreferences =
        true;


    try {

        mostrarMensaje(
            "Cargando tus preferencias...",
            "info"
        );


        const referencia =
            obtenerReferenciaPreferencias(
                currentUser.uid
            );


        const snapshot =
            await getDoc(
                referencia
            );


        if (
            snapshot.exists()
        ) {

            const datos =
                snapshot.data();


            aplicarPreferencias(
                datos
            );


            ocultarMensaje();


            console.log(
                "OTIUM: preferencias de avisos cargadas.",
                datos
            );

        } else {

            aplicarPreferencias(
                preferenciasPorDefecto
            );


            ocultarMensaje();


            console.log(
                "OTIUM: no existen preferencias de avisos. Se utilizaron valores iniciales."
            );

        }

    } catch (
        error
    ) {

        console.error(
            "OTIUM: error cargando preferencias de avisos:",
            error
        );


        mostrarMensaje(
            "No fue posible cargar tus preferencias. Revisa la configuración de Firebase y vuelve a intentarlo.",
            "error"
        );

    } finally {

        loadingPreferences =
            false;

    }

}


/* =====================================================
   GUARDAR PREFERENCIAS
===================================================== */

async function guardarPreferencias() {

    if (
        !currentUser
    ) {

        mostrarMensaje(
            "Debes iniciar sesión para guardar tus preferencias.",
            "warning"
        );

        return;

    }


    if (
        savingPreferences
    ) {

        return;

    }


    const preferencias =
        obtenerPreferenciasFormulario();


    const errorValidacion =
        validarPreferencias(
            preferencias
        );


    if (
        errorValidacion
    ) {

        mostrarMensaje(
            errorValidacion,
            "warning"
        );

        return;

    }


    savingPreferences =
        true;


    if (
        saveAlertsButton
    ) {

        saveAlertsButton.disabled =
            true;


        saveAlertsButton.textContent =
            "Guardando...";

    }


    try {

        const referencia =
            obtenerReferenciaPreferencias(
                currentUser.uid
            );


        const datosGuardar = {

            ...preferencias,

            usuarioId:
                currentUser.uid,

            actualizadoEn:
                serverTimestamp()

        };


        await setDoc(
            referencia,
            datosGuardar,
            {
                merge:
                    true
            }
        );


        mostrarMensaje(
            "Tus preferencias de avisos fueron guardadas correctamente.",
            "success"
        );


        actualizarEstadoVisual();

        actualizarResumen();


        console.log(
            "OTIUM: preferencias de avisos guardadas.",
            datosGuardar
        );

    } catch (
        error
    ) {

        console.error(
            "OTIUM: error guardando preferencias de avisos:",
            error
        );


        mostrarMensaje(
            "No fue posible guardar las preferencias. Verifica las reglas de Firestore.",
            "error"
        );

    } finally {

        savingPreferences =
            false;


        if (
            saveAlertsButton
        ) {

            saveAlertsButton.disabled =
                false;


            saveAlertsButton.textContent =
                "Guardar preferencias";

        }

    }

}


/* =====================================================
   RESTABLECER
===================================================== */

function restablecerPreferencias() {

    aplicarPreferencias(
        preferenciasPorDefecto
    );


    mostrarMensaje(
        "Las preferencias fueron restablecidas. Presiona «Guardar preferencias» para confirmar el cambio.",
        "info"
    );

}


/* =====================================================
   RESUMEN
===================================================== */

function actualizarResumen() {

    if (
        !preferencesSummary
    ) {

        return;

    }


    const preferencias =
        obtenerPreferenciasFormulario();


    const partes = [];


    partes.push(
        preferencias.activo
            ? "Avisos activados"
            : "Avisos desactivados"
    );


    if (
        preferencias.ciudad
    ) {

        partes.push(
            `Ciudad: ${preferencias.ciudad}`
        );

    }


    if (
        preferencias.region
    ) {

        partes.push(
            `Región: ${preferencias.region}`
        );

    }


    if (
        preferencias.categorias.length
    ) {

        partes.push(
            `Categorías: ${preferencias.categorias.join(", ")}`
        );

    } else {

        partes.push(
            "Categorías: todas"
        );

    }


    if (
        preferencias.subcategorias.length
    ) {

        partes.push(
            `Subcategorías: ${preferencias.subcategorias.join(", ")}`
        );

    }


    const min =
        preferencias
            .edad
            .edadMinima;


    const max =
        preferencias
            .edad
            .edadMaxima;


    if (
        min !== null &&
        max !== null
    ) {

        if (
            min === max
        ) {

            partes.push(
                `Edad: ${min} años`
            );

        } else {

            partes.push(
                `Edad: ${min} a ${max} años`
            );

        }

    } else if (
        min !== null
    ) {

        partes.push(
            `Edad: desde ${min} años`
        );

    } else if (
        max !== null
    ) {

        partes.push(
            `Edad: hasta ${max} años`
        );

    } else {

        partes.push(
            "Edad: todas"
        );

    }


    const textosAcceso = {

        ambos:
            "Acceso: todos",

        gratis:
            "Acceso: solo gratuitos",

        pagado:
            "Acceso: solo pagados"

    };


    partes.push(
        textosAcceso[
            preferencias.acceso
        ] ||
        textosAcceso.ambos
    );


    preferencesSummary.textContent =
        partes.join(
            " · "
        );

}


/* =====================================================
   PUSH - ESTADO VISUAL
===================================================== */

function actualizarEstadoVisualPush(
    estado
) {

    if (
        !pushNotificationTitle ||
        !pushNotificationStatus ||
        !enablePushNotificationsButton
    ) {

        return;

    }


    /*
       Navegador no compatible
    */

    if (
        !estado ||
        estado.disponible === false
    ) {

        pushNotificationTitle.textContent =
            "Notificaciones no disponibles";


        pushNotificationStatus.textContent =
            "Este navegador no admite las notificaciones Push de OTIUM.";


        enablePushNotificationsButton.textContent =
            "No disponibles";


        enablePushNotificationsButton.disabled =
            true;


        enablePushNotificationsButton.classList.remove(
            "enabled"
        );


        enablePushNotificationsButton.classList.add(
            "denied"
        );


        return;

    }


    /*
       Usuario no autenticado
    */

    if (
        estado.autenticado === false
    ) {

        pushNotificationTitle.textContent =
            "Inicia sesión";


        pushNotificationStatus.textContent =
            "Debes iniciar sesión para activar las notificaciones de OTIUM.";


        enablePushNotificationsButton.textContent =
            "🔔 Activar notificaciones";


        enablePushNotificationsButton.disabled =
            false;


        enablePushNotificationsButton.classList.remove(
            "enabled",
            "denied"
        );


        return;

    }


    /*
       Permiso bloqueado
    */

    if (
        estado.permiso ===
        "denied"
    ) {

        pushNotificationTitle.textContent =
            "Notificaciones bloqueadas";


        pushNotificationStatus.textContent =
            "Las notificaciones están bloqueadas en el navegador. Debes habilitarlas desde la configuración del sitio.";


        enablePushNotificationsButton.textContent =
            "🔕 Bloqueadas";


        enablePushNotificationsButton.disabled =
            true;


        enablePushNotificationsButton.classList.remove(
            "enabled"
        );


        enablePushNotificationsButton.classList.add(
            "denied"
        );


        return;

    }


    /*
       PUSH ACTIVADO
    */

    if (
        estado.activo === true
    ) {

        pushNotificationTitle.textContent =
            "Notificaciones activadas";


        pushNotificationStatus.textContent =
            "Recibirás avisos de OTIUM en este dispositivo cuando haya nuevos eventos de interés.";


        enablePushNotificationsButton.textContent =
            "🔕 Desactivar notificaciones";


        enablePushNotificationsButton.disabled =
            false;


        enablePushNotificationsButton.classList.remove(
            "denied"
        );


        enablePushNotificationsButton.classList.add(
            "enabled"
        );


        return;

    }


    /*
       PUSH DESACTIVADO
    */

    pushNotificationTitle.textContent =
        "Notificaciones desactivadas";


    pushNotificationStatus.textContent =
        "Activa las notificaciones para recibir avisos de OTIUM en este dispositivo.";


    enablePushNotificationsButton.textContent =
        "🔔 Activar notificaciones";


    enablePushNotificationsButton.disabled =
        false;


    enablePushNotificationsButton.classList.remove(
        "enabled",
        "denied"
    );

}


/* =====================================================
   PUSH - CARGAR ESTADO
===================================================== */

async function cargarEstadoPush() {

    if (
        !enablePushNotificationsButton
    ) {

        return;

    }


    /*
       Mientras se comprueba el estado.
    */

    enablePushNotificationsButton.disabled =
        true;


    enablePushNotificationsButton.textContent =
        "Comprobando...";


    try {

        const estado =
            await obtenerEstadoNotificacionesPush();


        actualizarEstadoVisualPush(
            estado
        );


        console.log(
            "OTIUM: estado Push:",
            estado
        );


    } catch (
        error
    ) {

        console.error(
            "OTIUM: error cargando estado Push:",
            error
        );


        if (
            pushNotificationTitle
        ) {

            pushNotificationTitle.textContent =
                "No fue posible comprobar el estado";

        }


        if (
            pushNotificationStatus
        ) {

            pushNotificationStatus.textContent =
                "Intenta nuevamente en unos segundos.";

        }


        if (
            enablePushNotificationsButton
        ) {

            enablePushNotificationsButton.disabled =
                false;


            enablePushNotificationsButton.textContent =
                "🔔 Activar notificaciones";

        }

    }

}


/* =====================================================
   PUSH - ACTIVAR / DESACTIVAR
===================================================== */

async function cambiarEstadoPush() {

    if (
        !currentUser
    ) {

        mostrarMensaje(
            "Debes iniciar sesión para gestionar las notificaciones.",
            "warning"
        );


        return;

    }


    if (
        changingPushState
    ) {

        return;

    }


    changingPushState =
        true;


    if (
        enablePushNotificationsButton
    ) {

        enablePushNotificationsButton.disabled =
            true;


        enablePushNotificationsButton.textContent =
            "Procesando...";

    }


    try {

        /*
           Consultar primero el estado real.
        */

        const estadoActual =
            await obtenerEstadoNotificacionesPush();


        let resultado;


        /* =============================================
           DESACTIVAR
        ============================================= */

        if (
            estadoActual.activo === true
        ) {

            resultado =
                await desactivarNotificacionesPush();


            if (
                resultado
            ) {

                mostrarMensaje(
                    "Las notificaciones fueron desactivadas en este dispositivo. Tus preferencias y recordatorios se mantienen.",
                    "success"
                );

            } else {

                mostrarMensaje(
                    "No fue posible desactivar las notificaciones.",
                    "error"
                );

            }


        /*
           ACTIVAR
        */

        } else {

            resultado =
                await activarNotificacionesPush();


            if (
                resultado?.ok
            ) {

                mostrarMensaje(
                    "Las notificaciones fueron activadas correctamente en este dispositivo.",
                    "success"
                );

            } else {

                mostrarMensaje(
                    resultado?.mensaje ||
                    "No fue posible activar las notificaciones.",
                    "warning"
                );

            }

        }


        /*
           Volver a consultar el estado real.
        */

        await cargarEstadoPush();


    } catch (
        error
    ) {

        console.error(
            "OTIUM: error cambiando estado Push:",
            error
        );


        mostrarMensaje(
            "No fue posible cambiar el estado de las notificaciones.",
            "error"
        );


        await cargarEstadoPush();


    } finally {

        changingPushState =
            false;

    }

}


/* =====================================================
   EVENTOS DE CATEGORÍAS
===================================================== */

document
    .querySelectorAll(
        'input[name="alertCategory"]'
    )
    .forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    const categoriasActuales =
                        obtenerCategoriasSeleccionadas();


                    const subcategoriasActuales =
                        obtenerSubcategoriasSeleccionadas();


                    actualizarSubcategorias(
                        categoriasActuales
                    );


                    if (
                        alertSubcategory
                    ) {

                        const validas =
                            new Set(
                                subcategoriasActuales
                            );


                        Array.from(
                            alertSubcategory.options
                        ).forEach(
                            option => {

                                option.selected =
                                    validas.has(
                                        option.value
                                    );

                            }
                        );

                    }


                    actualizarResumen();

                }
            );

        }
    );


/* =====================================================
   EVENTOS DE FORMULARIO
===================================================== */

if (
    alertsEnabled
) {

    alertsEnabled.addEventListener(
        "change",
        () => {

            actualizarEstadoVisual();

            actualizarResumen();

        }
    );

}


if (
    alertSubcategory
) {

    alertSubcategory.addEventListener(
        "change",
        actualizarResumen
    );

}


if (
    alertAgeMin
) {

    alertAgeMin.addEventListener(
        "input",
        actualizarResumen
    );

}


if (
    alertAgeMax
) {

    alertAgeMax.addEventListener(
        "input",
        actualizarResumen
    );

}


if (
    alertCity
) {

    alertCity.addEventListener(
        "input",
        actualizarResumen
    );

}


if (
    alertRegion
) {

    alertRegion.addEventListener(
        "input",
        actualizarResumen
    );

}


document
    .querySelectorAll(
        'input[name="alertAccess"]'
    )
    .forEach(
        radio => {

            radio.addEventListener(
                "change",
                actualizarResumen
            );

        }
    );


/* =====================================================
   BOTÓN GUARDAR
===================================================== */

if (
    saveAlertsButton
) {

    saveAlertsButton.addEventListener(
        "click",
        guardarPreferencias
    );

}


/* =====================================================
   BOTÓN RESTABLECER
===================================================== */

if (
    resetAlertsButton
) {

    resetAlertsButton.addEventListener(
        "click",
        restablecerPreferencias
    );

}


/* =====================================================
   BOTÓN PUSH
===================================================== */

if (
    enablePushNotificationsButton
) {

    enablePushNotificationsButton.addEventListener(
        "click",
        cambiarEstadoPush
    );

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async user => {

        currentUser =
            user || null;


        console.log(
            "OTIUM: estado de autenticación en Mis avisos:",
            currentUser
                ? currentUser.uid
                : "sin usuario"
        );


        if (
            currentUser
        ) {

            loginRequired
                ?.classList
                .remove(
                    "visible"
                );


            alertsContent
                ?.classList
                .add(
                    "visible"
                );


            await cargarPreferencias();

            await cargarEstadoPush();

        } else {

            alertsContent
                ?.classList
                .remove(
                    "visible"
                );


            loginRequired
                ?.classList
                .add(
                    "visible"
                );


            ocultarMensaje();


            actualizarEstadoVisualPush({

                disponible:
                    true,

                permiso:
                    "default",

                activo:
                    false,

                autenticado:
                    false

            });

        }

    }
);


/* =====================================================
   INICIALIZACIÓN VISUAL
===================================================== */

actualizarSubcategorias(
    []
);


actualizarEstadoVisual();


actualizarResumen();


console.log(
    "OTIUM: mis-avisos.js inicializado correctamente."
);