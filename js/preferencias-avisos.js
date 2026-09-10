/* =====================================================
   OTIUM
   PREFERENCIAS DE AVISOS
   preferencias-avisos.js

   Compatible con:
   preferencias-avisos.html
   Firebase 12.17.1
===================================================== */

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    db
} from "./modules/database.js";

import {
    auth
} from "./modules/auth.js";


/* =====================================================
   ESTADO
===================================================== */

let currentUser = null;

let preferenciasActuales = null;


/* =====================================================
   ELEMENTOS DEL HTML ACTUAL
===================================================== */

const loading =
    document.getElementById(
        "alertsLoading"
    );


const form =
    document.getElementById(
        "alertsForm"
    );


const message =
    document.getElementById(
        "alertsMessage"
    );


const saveButton =
    document.getElementById(
        "saveAlertsButton"
    );


const cancelButton =
    document.getElementById(
        "cancelAlertsButton"
    );


const alertsActive =
    document.getElementById(
        "alertsActive"
    );


/* =====================================================
   VALORES POR DEFECTO
===================================================== */

const PREFERENCIAS_POR_DEFECTO = {

    avisosActivos:
        true,

    categorias:
        [],

    edades:
        [],

    regiones:
        [],

    ciudades:
        [],

    avisarFavoritos:
        true,

    avisarDestacados:
        true,

    avisarEventosNuevos:
        true,

    avisarEventosInfantiles:
        true

};


/* =====================================================
   UTILIDAD
===================================================== */

function limpiarValor(
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
   MENSAJE
===================================================== */

function mostrarMensaje(
    texto,
    tipo = "warning"
) {

    if (
        !message
    ) {

        return;

    }


    message.textContent =
        texto;


    message.className =
        "alerts-message show " +
        tipo;


}


/* =====================================================
   OCULTAR MENSAJE
===================================================== */

function ocultarMensaje() {

    if (
        !message
    ) {

        return;

    }


    message.textContent =
        "";


    message.className =
        "alerts-message";


}


/* =====================================================
   MOSTRAR CARGANDO
===================================================== */

function mostrarLoading() {

    if (
        loading
    ) {

        loading.style.display =
            "block";

    }


    if (
        form
    ) {

        form.style.display =
            "none";

    }

}


/* =====================================================
   MOSTRAR FORMULARIO
===================================================== */

function mostrarFormulario() {

    if (
        loading
    ) {

        loading.style.display =
            "none";

    }


    if (
        form
    ) {

        form.style.display =
            "";

    }

}


/* =====================================================
   CHECKBOX SIMPLE
===================================================== */

function obtenerCheckbox(
    id,
    valorDefecto = false
) {

    const elemento =
        document.getElementById(
            id
        );


    if (
        !elemento
    ) {

        return valorDefecto;

    }


    return elemento.checked;

}


/* =====================================================
   ASIGNAR CHECKBOX SIMPLE
===================================================== */

function asignarCheckbox(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (
        !elemento
    ) {

        return;

    }


    elemento.checked =
        valor === true;

}


/* =====================================================
   OBTENER CHECKBOXES POR CONTENEDOR
===================================================== */

function obtenerCheckboxes(
    containerId
) {

    const container =
        document.getElementById(
            containerId
        );


    if (
        !container
    ) {

        return [];

    }


    const elementos =
        container.querySelectorAll(
            'input[type="checkbox"]'
        );


    return Array.from(
        elementos
    )
        .filter(
            elemento =>
                elemento.checked
        )
        .map(
            elemento =>
                limpiarValor(
                    elemento.value
                )
        )
        .filter(
            valor =>
                valor !== ""
        );

}


/* =====================================================
   ASIGNAR CHECKBOXES POR CONTENEDOR
===================================================== */

function asignarCheckboxes(
    containerId,
    valores
) {

    const container =
        document.getElementById(
            containerId
        );


    if (
        !container
    ) {

        return;

    }


    const lista =
        Array.isArray(
            valores
        )
            ? valores.map(
                valor =>
                    limpiarValor(
                        valor
                    )
            )
            : [];


    const elementos =
        container.querySelectorAll(
            'input[type="checkbox"]'
        );


    elementos.forEach(
        elemento => {

            elemento.checked =
                lista.includes(
                    limpiarValor(
                        elemento.value
                    )
                );

        }
    );

}


/* =====================================================
   NORMALIZAR LISTA
===================================================== */

function normalizarLista(
    valores
) {

    if (
        !Array.isArray(
            valores
        )
    ) {

        return [];

    }


    return valores
        .map(
            valor =>
                limpiarValor(
                    valor
                )
        )
        .filter(
            valor =>
                valor !== ""
        );

}


/* =====================================================
   NORMALIZAR PREFERENCIAS
===================================================== */

function normalizarPreferencias(
    data = {}
) {

    return {

        avisosActivos:
            data.avisosActivos !== undefined
                ? data.avisosActivos === true
                : PREFERENCIAS_POR_DEFECTO.avisosActivos,


        categorias:
            normalizarLista(
                data.categorias
            ),


        edades:
            normalizarLista(
                data.edades
            ),


        regiones:
            normalizarLista(
                data.regiones
            ),


        ciudades:
            normalizarLista(
                data.ciudades
            ),


        avisarFavoritos:
            data.avisarFavoritos !== undefined
                ? data.avisarFavoritos === true
                : PREFERENCIAS_POR_DEFECTO.avisarFavoritos,


        avisarDestacados:
            data.avisarDestacados !== undefined
                ? data.avisarDestacados === true
                : PREFERENCIAS_POR_DEFECTO.avisarDestacados,


        avisarEventosNuevos:
            data.avisarEventosNuevos !== undefined
                ? data.avisarEventosNuevos === true
                : PREFERENCIAS_POR_DEFECTO.avisarEventosNuevos,


        avisarEventosInfantiles:
            data.avisarEventosInfantiles !== undefined
                ? data.avisarEventosInfantiles === true
                : PREFERENCIAS_POR_DEFECTO.avisarEventosInfantiles

    };

}


/* =====================================================
   APLICAR PREFERENCIAS
===================================================== */

function aplicarPreferencias(
    data
) {

    const preferencias =
        normalizarPreferencias(
            data
        );


    /* =============================================
       AVISOS ACTIVOS
    ============================================= */

    asignarCheckbox(
        "alertsActive",
        preferencias.avisosActivos
    );


    /* =============================================
       CATEGORÍAS
    ============================================= */

    asignarCheckboxes(
        "categoriesOptions",
        preferencias.categorias
    );


    /* =============================================
       EDADES
    ============================================= */

    /*
     * Las edades no tienen un ID de contenedor
     * específico en el HTML.
     *
     * Buscamos el segundo .options-grid
     * correspondiente a la sección de edades.
     */

    const secciones =
        document.querySelectorAll(
            ".preference-section"
        );


    if (
        secciones.length >= 3
    ) {

        const edadContainer =
            secciones[2].querySelector(
                ".options-grid"
            );


        if (
            edadContainer
        ) {

            asignarCheckboxesDesdeElemento(
                edadContainer,
                preferencias.edades
            );

        }

    }


    /* =============================================
       REGIONES
    ============================================= */

    if (
        secciones.length >= 4
    ) {

        const regionContainer =
            secciones[3].querySelector(
                ".options-grid"
            );


        if (
            regionContainer
        ) {

            asignarCheckboxesDesdeElemento(
                regionContainer,
                preferencias.regiones
            );

        }

    }


    /* =============================================
       CIUDADES
    ============================================= */

    if (
        secciones.length >= 5
    ) {

        const ciudadContainer =
            secciones[4].querySelector(
                ".options-grid"
            );


        if (
            ciudadContainer
        ) {

            asignarCheckboxesDesdeElemento(
                ciudadContainer,
                preferencias.ciudades
            );

        }

    }


    /* =============================================
       TIPOS DE AVISOS
    ============================================= */

    /*
     * El HTML actual solamente contiene
     * el interruptor general.
     *
     * Estos valores quedan preparados para
     * futuras opciones sin generar errores.
     */

    asignarCheckbox(
        "avisarFavoritos",
        preferencias.avisarFavoritos
    );


    asignarCheckbox(
        "avisarDestacados",
        preferencias.avisarDestacados
    );


    asignarCheckbox(
        "avisarEventosNuevos",
        preferencias.avisarEventosNuevos
    );


    asignarCheckbox(
        "avisarEventosInfantiles",
        preferencias.avisarEventosInfantiles
    );


    preferenciasActuales =
        preferencias;


    actualizarEstadoVisual();

}


/* =====================================================
   ASIGNAR CHECKBOXES DESDE ELEMENTO
===================================================== */

function asignarCheckboxesDesdeElemento(
    container,
    valores
) {

    const lista =
        Array.isArray(
            valores
        )
            ? valores.map(
                valor =>
                    limpiarValor(
                        valor
                    )
            )
            : [];


    const elementos =
        container.querySelectorAll(
            'input[type="checkbox"]'
        );


    elementos.forEach(
        elemento => {

            elemento.checked =
                lista.includes(
                    limpiarValor(
                        elemento.value
                    )
                );

        }
    );

}


/* =====================================================
   ACTUALIZAR ESTADO VISUAL
===================================================== */

function actualizarEstadoVisual() {

    const activo =
        obtenerCheckbox(
            "alertsActive",
            true
        );


    document.body.classList.toggle(
        "avisos-desactivados",
        !activo
    );


    const secciones =
        document.querySelectorAll(
            ".preference-section"
        );


    secciones.forEach(
        (
            seccion,
            index
        ) => {

            /*
             * La primera sección contiene
             * el interruptor general.
             *
             * Las siguientes secciones se
             * deshabilitan visualmente cuando
             * los avisos están apagados.
             */

            if (
                index > 0
            ) {

                seccion.classList.toggle(
                    "disabled",
                    !activo
                );

            }

        }
    );

}


/* =====================================================
   OBTENER CHECKBOXES DESDE SECCIÓN
===================================================== */

function obtenerCheckboxesDesdeSeccion(
    seccion
) {

    if (
        !seccion
    ) {

        return [];

    }


    const elementos =
        seccion.querySelectorAll(
            'input[type="checkbox"]'
        );


    return Array.from(
        elementos
    )
        .filter(
            elemento =>
                elemento.checked
        )
        .map(
            elemento =>
                limpiarValor(
                    elemento.value
                )
        )
        .filter(
            valor =>
                valor !== ""
        );

}


/* =====================================================
   RECOPILAR PREFERENCIAS
===================================================== */

function recopilarPreferencias() {

    const secciones =
        document.querySelectorAll(
            ".preference-section"
        );


    let edades = [];

    let regiones = [];

    let ciudades = [];


    /* =============================================
       EDADES
    ============================================= */

    if (
        secciones.length >= 3
    ) {

        edades =
            obtenerCheckboxesDesdeSeccion(
                secciones[2]
            );

    }


    /* =============================================
       REGIONES
    ============================================= */

    if (
        secciones.length >= 4
    ) {

        regiones =
            obtenerCheckboxesDesdeSeccion(
                secciones[3]
            );

    }


    /* =============================================
       CIUDADES
    ============================================= */

    if (
        secciones.length >= 5
    ) {

        ciudades =
            obtenerCheckboxesDesdeSeccion(
                secciones[4]
            );

    }


    return {

        avisosActivos:
            obtenerCheckbox(
                "alertsActive",
                true
            ),


        categorias:
            obtenerCheckboxes(
                "categoriesOptions"
            ),


        edades:
            edades,


        regiones:
            regiones,


        ciudades:
            ciudades,


        avisarFavoritos:
            obtenerCheckbox(
                "avisarFavoritos",
                true
            ),


        avisarDestacados:
            obtenerCheckbox(
                "avisarDestacados",
                true
            ),


        avisarEventosNuevos:
            obtenerCheckbox(
                "avisarEventosNuevos",
                true
            ),


        avisarEventosInfantiles:
            obtenerCheckbox(
                "avisarEventosInfantiles",
                true
            )

    };

}


/* =====================================================
   CARGAR DESDE FIRESTORE
===================================================== */

async function cargarPreferencias() {

    if (
        !currentUser
    ) {

        mostrarMensaje(
            "Debes iniciar sesión para administrar tus preferencias de avisos.",
            "warning"
        );


        mostrarFormulario();

        return;

    }


    mostrarLoading();

    ocultarMensaje();


    try {

        console.log(
            "OTIUM - Cargando preferencias de avisos:",
            currentUser.uid
        );


        const preferenciasRef =
            doc(
                db,
                "preferencias_avisos",
                currentUser.uid
            );


        const snapshot =
            await getDoc(
                preferenciasRef
            );


        if (
            snapshot.exists()
        ) {

            console.log(
                "OTIUM - Preferencias encontradas:",
                snapshot.data()
            );


            aplicarPreferencias(
                snapshot.data()
            );

        } else {

            console.log(
                "OTIUM - No existen preferencias."
            );


            aplicarPreferencias(
                PREFERENCIAS_POR_DEFECTO
            );

        }


        mostrarFormulario();


    } catch (
        error
    ) {

        console.error(
            "OTIUM - Error cargando preferencias:",
            error
        );


        aplicarPreferencias(
            PREFERENCIAS_POR_DEFECTO
        );


        mostrarMensaje(
            "No fue posible cargar tus preferencias. Se mostrarán los valores predeterminados.",
            "error"
        );


        mostrarFormulario();

    }

}


/* =====================================================
   GUARDAR
===================================================== */

async function guardarPreferencias(
    event
) {

    if (
        event
    ) {

        event.preventDefault();

    }


    if (
        !currentUser
    ) {

        mostrarMensaje(
            "Debes iniciar sesión para guardar tus preferencias.",
            "warning"
        );

        return;

    }


    ocultarMensaje();


    const preferencias =
        recopilarPreferencias();


    try {

        if (
            saveButton
        ) {

            saveButton.disabled =
                true;


            saveButton.dataset.originalText =
                saveButton.textContent;


            saveButton.textContent =
                "Guardando...";

        }


        const preferenciasRef =
            doc(
                db,
                "preferencias_avisos",
                currentUser.uid
            );


        const datosGuardar = {

            userId:
                currentUser.uid,

            ...preferencias,

            actualizadoEn:
                serverTimestamp()

        };


        /*
         * creadoEn solamente se establece
         * cuando el documento es creado.
         *
         * Al usar merge, no se elimina
         * información existente.
         */

        if (
            !preferenciasActuales
        ) {

            datosGuardar.creadoEn =
                serverTimestamp();

        }


        await setDoc(
            preferenciasRef,
            datosGuardar,
            {
                merge: true
            }
        );


        preferenciasActuales =
            preferencias;


        actualizarEstadoVisual();


        mostrarMensaje(
            "Tus preferencias fueron guardadas correctamente.",
            "success"
        );


        console.log(
            "OTIUM - Preferencias guardadas:",
            preferencias
        );


    } catch (
        error
    ) {

        console.error(
            "OTIUM - Error guardando preferencias:",
            error
        );


        mostrarMensaje(
            "No fue posible guardar tus preferencias. Verifica tu conexión e inténtalo nuevamente.",
            "error"
        );


    } finally {

        if (
            saveButton
        ) {

            saveButton.disabled =
                false;


            saveButton.textContent =
                saveButton.dataset.originalText ||
                "Guardar preferencias";

        }

    }

}


/* =====================================================
   CANCELAR
===================================================== */

function cancelarCambios(
    event
) {

    if (
        event
    ) {

        event.preventDefault();

    }


    if (
        preferenciasActuales
    ) {

        aplicarPreferencias(
            preferenciasActuales
        );


        mostrarMensaje(
            "Los cambios no guardados fueron cancelados.",
            "info"
        );

    } else {

        aplicarPreferencias(
            PREFERENCIAS_POR_DEFECTO
        );

    }

}


/* =====================================================
   EVENTO FORMULARIO
===================================================== */

if (
    form
) {

    form.addEventListener(
        "submit",
        guardarPreferencias
    );

}


/* =====================================================
   BOTÓN CANCELAR
===================================================== */

if (
    cancelButton
) {

    cancelButton.addEventListener(
        "click",
        cancelarCambios
    );

}


/* =====================================================
   CAMBIO DEL INTERRUPTOR
===================================================== */

if (
    alertsActive
) {

    alertsActive.addEventListener(
        "change",
        actualizarEstadoVisual
    );

}


/* =====================================================
   AUTENTICACIÓN
===================================================== */

onAuthStateChanged(
    auth,
    async function (
        user
    ) {

        currentUser =
            user ||
            null;


        console.log(
            "OTIUM - Estado autenticación preferencias:",
            currentUser
                ? currentUser.uid
                : "sin usuario"
        );


        if (
            currentUser
        ) {

            await cargarPreferencias();

        } else {

            mostrarLoading();


            mostrarMensaje(
                "Inicia sesión para configurar tus preferencias de avisos.",
                "warning"
            );


            mostrarFormulario();

        }

    }
);


/* =====================================================
   API GLOBAL OTIUM
===================================================== */

window.OTIUMPreferenciasAvisos = {

    cargar:
        cargarPreferencias,

    guardar:
        guardarPreferencias,

    obtener:
        recopilarPreferencias,

    cancelar:
        cancelarCambios

};