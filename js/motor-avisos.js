/* =========================================================
   OTIUM
   MOTOR DE AVISOS
   Versión 20260901 - Persistencia
   ========================================================= */

import {
    auth
} from "./modules/auth.js";

import {
    db
} from "./modules/firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const COLECCION_EVENTOS =
    "eventos";

const COLECCION_USUARIOS =
    "usuarios";

const COLECCION_PREFERENCIAS =
    "preferencias";

const DOCUMENTO_PREFERENCIAS =
    "avisos";

const COLECCION_AVISOS =
    "avisos";


/* =========================================================
   ESTADO INTERNO
========================================================= */

let usuarioActual = null;

let preferenciasActuales =
    null;

let eventosActuales =
    [];

let avisosActuales =
    [];


/* =========================================================
   PREFERENCIAS POR DEFECTO
========================================================= */

const PREFERENCIAS_POR_DEFECTO = {

    activo: false,

    ciudad: "",

    region: "",

    categorias: [],

    subcategorias: [],

    edad: {

        tieneRango: false,

        edadMinima: null,

        edadMaxima: null

    },

    acceso: "ambos",

    version: 1

};


/* =========================================================
   UTILIDAD
   LIMPIAR TEXTO
========================================================= */

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


/* =========================================================
   NORMALIZAR TEXTO
========================================================= */

function normalizarTexto(
    valor
) {

    return limpiarTexto(
        valor
    )
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );

}


/* =========================================================
   NORMALIZAR ARRAY
========================================================= */

function normalizarArray(
    valor
) {

    if (
        !Array.isArray(
            valor
        )
    ) {

        return [];

    }

    return valor
        .map(
            item =>
                limpiarTexto(
                    item
                )
        )
        .filter(
            Boolean
        );

}


/* =========================================================
   COMPARACIÓN DE TEXTOS
========================================================= */

function textosCoinciden(
    valorA,
    valorB
) {

    const a =
        normalizarTexto(
            valorA
        );

    const b =
        normalizarTexto(
            valorB
        );

    if (
        !a ||
        !b
    ) {

        return false;

    }

    return a === b;

}


/* =========================================================
   CONTIENE TEXTO
========================================================= */

function textoContiene(
    valor,
    texto
) {

    const a =
        normalizarTexto(
            valor
        );

    const b =
        normalizarTexto(
            texto
        );

    if (
        !a ||
        !b
    ) {

        return false;

    }

    return a.includes(
        b
    );

}


/* =========================================================
   CONVERTIR NÚMERO
========================================================= */

function convertirNumero(
    valor
) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return null;

    }

    const numero =
        Number(
            valor
        );

    if (
        Number.isNaN(
            numero
        )
    ) {

        return null;

    }

    return numero;

}


/* =========================================================
   NORMALIZAR PREFERENCIAS
========================================================= */

function normalizarPreferencias(
    preferencias
) {

    const origen =
        preferencias ||
        {};

    const edadOrigen =
        origen.edad ||
        {};

    return {

        activo:
            origen.activo === true,

        ciudad:
            limpiarTexto(
                origen.ciudad
            ),

        region:
            limpiarTexto(
                origen.region
            ),

        categorias:
            normalizarArray(
                origen.categorias
            ),

        subcategorias:
            normalizarArray(
                origen.subcategorias
            ),

        edad: {

            tieneRango:
                edadOrigen.tieneRango === true,

            edadMinima:
                convertirNumero(
                    edadOrigen.edadMinima
                ),

            edadMaxima:
                convertirNumero(
                    edadOrigen.edadMaxima
                )

        },

        acceso:
            limpiarTexto(
                origen.acceso
            ) ||
            "ambos",

        version:
            convertirNumero(
                origen.version
            ) ||
            1

    };

}


/* =========================================================
   RUTA DE PREFERENCIAS
========================================================= */

function obtenerReferenciaPreferencias(
    uid
) {

    return doc(
        db,
        COLECCION_USUARIOS,
        uid,
        COLECCION_PREFERENCIAS,
        DOCUMENTO_PREFERENCIAS
    );

}


/* =========================================================
   CREAR ID SEGURO PARA AVISO
========================================================= */

function crearIdAviso(
    eventId
) {

    const texto =
        limpiarTexto(
            eventId
        );

    if (
        !texto
    ) {

        return null;

    }

    /*
       El ID se basa en el ID del evento.

       De esta forma:

       Evento A
          ↓
       mismo ID
          ↓
       mismo aviso

       Si el motor vuelve a ejecutarse,
       no crea otro aviso para el mismo evento.
    */

    return (
        "evento_" +
        encodeURIComponent(
            texto
        )
            .replace(
                /%/g,
                "_"
            )
            .replace(
                /\//g,
                "_"
            )
    );

}


/* =========================================================
   RUTA DE AVISO
========================================================= */

function obtenerReferenciaAviso(
    uid,
    eventId
) {

    const avisoId =
        crearIdAviso(
            eventId
        );

    if (
        !avisoId
    ) {

        throw new Error(
            "No se pudo generar un ID válido para el aviso."
        );

    }

    return doc(
        db,
        COLECCION_USUARIOS,
        uid,
        COLECCION_AVISOS,
        avisoId
    );

}


/* =========================================================
   CARGAR PREFERENCIAS
========================================================= */

async function cargarPreferenciasAvisos(
    uid
) {

    if (
        !uid
    ) {

        throw new Error(
            "No se recibió un UID válido para cargar las preferencias."
        );

    }


    const referencia =
        obtenerReferenciaPreferencias(
            uid
        );


    const snapshot =
        await getDoc(
            referencia
        );


    if (
        !snapshot.exists()
    ) {

        preferenciasActuales =
            normalizarPreferencias(
                PREFERENCIAS_POR_DEFECTO
            );

        return preferenciasActuales;

    }


    preferenciasActuales =
        normalizarPreferencias(
            snapshot.data()
        );


    return preferenciasActuales;

}


/* =========================================================
   OBTENER EVENTOS
========================================================= */

async function obtenerEventos() {

    const referencia =
        collection(
            db,
            COLECCION_EVENTOS
        );


    const snapshot =
        await getDocs(
            referencia
        );


    eventosActuales =
        snapshot.docs.map(
            documento => {

                const datos =
                    documento.data();


                return {

                    ...datos,

                    firestoreId:
                        documento.id,

                    id:
                        datos.id ||
                        documento.id

                };

            }
        );


    return eventosActuales;

}


/* =========================================================
   COINCIDENCIA DE UBICACIÓN
========================================================= */

function coincideUbicacion(
    evento,
    preferencias
) {

    const ciudadPreferida =
        limpiarTexto(
            preferencias?.ciudad
        );

    const regionPreferida =
        limpiarTexto(
            preferencias?.region
        );


    if (
        !ciudadPreferida &&
        !regionPreferida
    ) {

        return true;

    }


    const ciudadEvento =
        evento?.city ||
        evento?.ciudad ||
        evento?.ubicacion ||
        "";


    const regionEvento =
        evento?.region ||
        "";


    if (
        ciudadPreferida
    ) {

        if (
            !textosCoinciden(
                ciudadEvento,
                ciudadPreferida
            )
        ) {

            return false;

        }

    }


    if (
        regionPreferida
    ) {

        if (
            !textosCoinciden(
                regionEvento,
                regionPreferida
            )
        ) {

            return false;

        }

    }


    return true;

}


/* =========================================================
   COINCIDENCIA DE CATEGORÍA
========================================================= */

function coincideCategoria(
    evento,
    preferencias
) {

    const categorias =
        normalizarArray(
            preferencias?.categorias
        );


    if (
        categorias.length === 0
    ) {

        return true;

    }


    const categoriaEvento =
        evento?.category ||
        evento?.categoria ||
        "";


    return categorias.some(
        categoria =>
            textosCoinciden(
                categoriaEvento,
                categoria
            )
    );

}


/* =========================================================
   COINCIDENCIA DE SUBCATEGORÍA
========================================================= */

function coincideSubcategoria(
    evento,
    preferencias
) {

    const subcategorias =
        normalizarArray(
            preferencias?.subcategorias
        );


    if (
        subcategorias.length === 0
    ) {

        return true;

    }


    const valoresEvento = [

        evento?.subcategoria,

        evento?.subCategoria,

        evento?.subcategoriaEvento,

        evento?.tipoEvento,

        evento?.tipo,

        evento?.subcategory,

        evento?.sub_category

    ]
        .filter(
            Boolean
        )
        .map(
            limpiarTexto
        );


    if (
        valoresEvento.length === 0
    ) {

        /*
           Si el evento no tiene subcategoría,
           no se descarta automáticamente.
        */

        return true;

    }


    return subcategorias.some(
        subcategoria =>

            valoresEvento.some(
                valor =>
                    textosCoinciden(
                        valor,
                        subcategoria
                    )
            )

    );

}


/* =========================================================
   OBTENER RANGO DE EDAD DEL EVENTO
========================================================= */

function obtenerRangoEdadEvento(
    evento
) {

    const edadObjeto =
        evento?.edad;


    let edadMinima =
        null;

    let edadMaxima =
        null;


    if (
        edadObjeto &&
        typeof edadObjeto === "object"
    ) {

        edadMinima =
            convertirNumero(
                edadObjeto.edadMinima
            );

        edadMaxima =
            convertirNumero(
                edadObjeto.edadMaxima
            );

    }


    if (
        edadMinima === null
    ) {

        edadMinima =
            convertirNumero(
                evento?.edadMinima
            );

    }


    if (
        edadMinima === null
    ) {

        edadMinima =
            convertirNumero(
                evento?.edadMin
            );

    }


    if (
        edadMinima === null
    ) {

        edadMinima =
            convertirNumero(
                evento?.edad_desde
            );

    }


    if (
        edadMinima === null
    ) {

        edadMinima =
            convertirNumero(
                evento?.edadDesde
            );

    }


    if (
        edadMaxima === null
    ) {

        edadMaxima =
            convertirNumero(
                evento?.edadMaxima
            );

    }


    if (
        edadMaxima === null
    ) {

        edadMaxima =
            convertirNumero(
                evento?.edadMax
            );

    }


    if (
        edadMaxima === null
    ) {

        edadMaxima =
            convertirNumero(
                evento?.edad_hasta
            );

    }


    if (
        edadMaxima === null
    ) {

        edadMaxima =
            convertirNumero(
                evento?.edadHasta
            );

    }


    const edadUnica =
        convertirNumero(
            evento?.edadRecomendada ??
            evento?.edad_recomendada ??
            evento?.edadSugerida
        );


    if (
        edadUnica !== null
    ) {

        if (
            edadMinima === null
        ) {

            edadMinima =
                edadUnica;

        }

        if (
            edadMaxima === null
        ) {

            edadMaxima =
                edadUnica;

        }

    }


    return {

        edadMinima,

        edadMaxima

    };

}


/* =========================================================
   COINCIDENCIA DE EDAD
========================================================= */

function coincideEdad(
    evento,
    preferencias
) {

    const edad =
        preferencias?.edad;


    if (
        !edad ||
        edad.tieneRango !== true
    ) {

        return true;

    }


    const edadMinimaUsuario =
        convertirNumero(
            edad.edadMinima
        );


    const edadMaximaUsuario =
        convertirNumero(
            edad.edadMaxima
        );


    if (
        edadMinimaUsuario === null &&
        edadMaximaUsuario === null
    ) {

        return true;

    }


    const rangoEvento =
        obtenerRangoEdadEvento(
            evento
        );


    /*
       Si el evento no tiene información
       de edad, se mantiene compatible.
    */

    if (
        rangoEvento.edadMinima === null &&
        rangoEvento.edadMaxima === null
    ) {

        return true;

    }


    const eventoMin =
        rangoEvento.edadMinima ??
        rangoEvento.edadMax;


    const eventoMax =
        rangoEvento.edadMaxima ??
        rangoEvento.edadMin;


    if (
        edadMinimaUsuario !== null &&
        eventoMax !== null &&
        eventoMax < edadMinimaUsuario
    ) {

        return false;

    }


    if (
        edadMaximaUsuario !== null &&
        eventoMin !== null &&
        eventoMin > edadMaximaUsuario
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   DETERMINAR ACCESO GRATUITO
========================================================= */

function eventoEsGratis(
    evento
) {

    const accesoTexto =
        normalizarTexto(
            evento?.acceso ||
            evento?.tipoAcceso ||
            evento?.tipo_acceso ||
            ""
        );


    if (
        accesoTexto === "gratis" ||
        accesoTexto === "gratuito" ||
        accesoTexto === "gratuita" ||
        accesoTexto === "free"
    ) {

        return true;

    }


    const precio =
        evento?.price ??
        evento?.precio ??
        evento?.valor;


    if (
        precio === null ||
        precio === undefined ||
        precio === ""
    ) {

        return null;

    }


    const precioNumero =
        Number(
            String(
                precio
            )
                .replace(
                    /\$/g,
                    ""
                )
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    /,/g,
                    "."
                )
                .trim()
        );


    if (
        Number.isNaN(
            precioNumero
        )
    ) {

        return null;

    }


    return precioNumero <= 0;

}


/* =========================================================
   COINCIDENCIA DE ACCESO
========================================================= */

function coincideAcceso(
    evento,
    preferencias
) {

    const acceso =
        normalizarTexto(
            preferencias?.acceso
        ) ||
        "ambos";


    if (
        acceso === "ambos" ||
        acceso === "todos"
    ) {

        return true;

    }


    const esGratis =
        eventoEsGratis(
            evento
        );


    if (
        acceso === "gratis"
    ) {

        return (
            esGratis === true ||
            esGratis === null
        );

    }


    if (
        acceso === "pagado"
    ) {

        return (
            esGratis === false ||
            esGratis === null
        );

    }


    return true;

}


/* =========================================================
   EVENTO COINCIDE CON PREFERENCIAS
========================================================= */

function eventoCoincideConPreferencias(
    evento,
    preferencias
) {

    const prefs =
        normalizarPreferencias(
            preferencias
        );


    if (
        prefs.activo !== true
    ) {

        return false;

    }


    if (
        !coincideUbicacion(
            evento,
            prefs
        )
    ) {

        return false;

    }


    if (
        !coincideCategoria(
            evento,
            prefs
        )
    ) {

        return false;

    }


    if (
        !coincideSubcategoria(
            evento,
            prefs
        )
    ) {

        return false;

    }


    if (
        !coincideEdad(
            evento,
            prefs
        )
    ) {

        return false;

    }


    if (
        !coincideAcceso(
            evento,
            prefs
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   CREAR AVISO EN MEMORIA
========================================================= */

function crearAviso(
    evento,
    preferencias
) {

    const eventId =
        evento?.firestoreId ||
        evento?.id;


    if (
        !eventId
    ) {

        return null;

    }


    const titulo =
        evento?.title ||
        evento?.nombre ||
        evento?.nombreEvento ||
        "Evento";


    const categoria =
        evento?.category ||
        evento?.categoria ||
        "";


    const ciudad =
        evento?.city ||
        evento?.ciudad ||
        evento?.ubicacion ||
        "";


    const region =
        evento?.region ||
        "";


    const fecha =
        evento?.date ||
        evento?.fecha ||
        evento?.fechaEvento ||
        "";


    const hora =
        evento?.time ||
        evento?.hora ||
        evento?.horaEvento ||
        "";


    const descripcion =
        evento?.description ||
        evento?.descripcion ||
        "";


    const motivos = [];


    if (
        preferencias?.ciudad &&
        textosCoinciden(
            ciudad,
            preferencias.ciudad
        )
    ) {

        motivos.push(
            `Coincide con tu ciudad: ${ciudad}.`
        );

    }


    if (
        preferencias?.region &&
        textosCoinciden(
            region,
            preferencias.region
        )
    ) {

        motivos.push(
            `Coincide con tu región: ${region}.`
        );

    }


    if (
        Array.isArray(
            preferencias?.categorias
        ) &&
        preferencias.categorias.length > 0
    ) {

        motivos.push(
            "Coincide con una categoría que te interesa."
        );

    }


    if (
        preferencias?.edad?.tieneRango === true
    ) {

        const min =
            preferencias.edad.edadMinima;

        const max =
            preferencias.edad.edadMaxima;


        if (
            min !== null &&
            max !== null
        ) {

            motivos.push(
                `Es compatible con el rango de edad ${min} a ${max} años.`
            );

        }

    }


    if (
        motivos.length === 0
    ) {

        motivos.push(
            "El evento coincide con tus preferencias."
        );

    }


    return {

        eventId:
            String(
                eventId
            ),

        firestoreEventId:
            String(
                evento.firestoreId ||
                eventId
            ),

        titulo,

        categoria,

        ciudad,

        region,

        fecha,

        hora,

        descripcion,

        motivo:
            motivos.join(
                " "
            )

    };

}


/* =========================================================
   GUARDAR AVISO EN FIRESTORE
========================================================= */

async function guardarAviso(
    uid,
    aviso
) {

    if (
        !uid
    ) {

        throw new Error(
            "No se puede guardar el aviso sin usuario."
        );

    }


    if (
        !aviso?.eventId
    ) {

        throw new Error(
            "No se puede guardar el aviso sin eventId."
        );

    }


    const referencia =
        obtenerReferenciaAviso(
            uid,
            aviso.eventId
        );


    const existente =
        await getDoc(
            referencia
        );


    /* =====================================================
       SI YA EXISTE
    ===================================================== */

    if (
        existente.exists()
    ) {

        const datosExistentes =
            existente.data();


        /*
           Actualizamos únicamente la información
           del evento.

           IMPORTANTE:
           NO modificamos "leido".

           Si el usuario ya leyó el aviso,
           seguirá leído.
        */

        const datosActualizados = {

            eventId:
                aviso.eventId,

            firestoreEventId:
                aviso.firestoreEventId,

            titulo:
                aviso.titulo,

            categoria:
                aviso.categoria,

            ciudad:
                aviso.ciudad,

            region:
                aviso.region,

            fecha:
                aviso.fecha,

            hora:
                aviso.hora,

            descripcion:
                aviso.descripcion,

            motivo:
                aviso.motivo,

            actualizadoEn:
                serverTimestamp()

        };


        await setDoc(
            referencia,
            datosActualizados,
            {
                merge: true
            }
        );


        console.log(
            "OTIUM: aviso existente actualizado sin duplicar:",
            aviso.eventId
        );


        return {

            ...datosExistentes,

            ...aviso,

            avisoId:
                referencia.id,

            leido:
                datosExistentes.leido === true,

            yaExistia:
                true

        };

    }


    /* =====================================================
       CREAR NUEVO AVISO
    ===================================================== */

    const datosAviso = {

        usuarioId:
            uid,

        eventId:
            aviso.eventId,

        firestoreEventId:
            aviso.firestoreEventId,

        titulo:
            aviso.titulo,

        categoria:
            aviso.categoria,

        ciudad:
            aviso.ciudad,

        region:
            aviso.region,

        fecha:
            aviso.fecha,

        hora:
            aviso.hora,

        descripcion:
            aviso.descripcion,

        motivo:
            aviso.motivo,

        leido:
            false,

        creadoEn:
            serverTimestamp(),

        version:
            1

    };


    await setDoc(
        referencia,
        datosAviso
    );


    console.log(
        "OTIUM: nuevo aviso guardado correctamente:",
        aviso.eventId
    );


    return {

        ...datosAviso,

        avisoId:
            referencia.id,

        yaExistia:
            false

    };

}


/* =========================================================
   GUARDAR AVISOS ENCONTRADOS
========================================================= */

async function guardarAvisos(
    uid,
    avisos
) {

    if (
        !uid
    ) {

        throw new Error(
            "No se puede guardar avisos sin usuario."
        );

    }


    if (
        !Array.isArray(
            avisos
        ) ||
        avisos.length === 0
    ) {

        return [];

    }


    const resultados = [];


    for (
        const aviso of avisos
    ) {

        try {

            const resultado =
                await guardarAviso(
                    uid,
                    aviso
                );


            if (
                resultado
            ) {

                resultados.push(
                    resultado
                );

            }

        } catch (
            error
        ) {

            console.error(
                "OTIUM: error guardando aviso:",
                aviso,
                error
            );

        }

    }


    return resultados;

}


/* =========================================================
   GENERAR AVISOS
========================================================= */

async function generarAvisos(
    opciones = {}
) {

    const {

        uid:
            uidRecibido = null,

        recargarEventos:
            recargarEventos = true,

        guardar:
            guardar = true

    } =
        opciones;


    const uid =
        uidRecibido ||
        usuarioActual?.uid;


    if (
        !uid
    ) {

        throw new Error(
            "Debes iniciar sesión para generar avisos."
        );

    }


    /* =====================================================
       1. CARGAR PREFERENCIAS
    ===================================================== */

    const preferencias =
        await cargarPreferenciasAvisos(
            uid
        );


    if (
        !preferencias.activo
    ) {

        avisosActuales =
            [];


        console.log(
            "OTIUM: avisos desactivados."
        );


        return [];

    }


    /* =====================================================
       2. CARGAR EVENTOS
    ===================================================== */

    let eventos =
        eventosActuales;


    if (
        recargarEventos ||
        !Array.isArray(
            eventos
        ) ||
        eventos.length === 0
    ) {

        eventos =
            await obtenerEventos();

    }


    /* =====================================================
       3. FILTRAR COINCIDENCIAS
    ===================================================== */

    const coincidencias =
        eventos.filter(
            evento =>
                eventoCoincideConPreferencias(
                    evento,
                    preferencias
                )
        );


    /* =====================================================
       4. CREAR AVISOS EN MEMORIA
    ===================================================== */

    const avisosMap =
        new Map();


    coincidencias.forEach(
        evento => {

            const aviso =
                crearAviso(
                    evento,
                    preferencias
                );


            if (
                !aviso
            ) {

                return;

            }


            if (
                !avisosMap.has(
                    aviso.eventId
                )
            ) {

                avisosMap.set(
                    aviso.eventId,
                    aviso
                );

            }

        }
    );


    avisosActuales =
        Array.from(
            avisosMap.values()
        );


    console.log(
        `OTIUM: ${avisosActuales.length} evento(s) coinciden con tus preferencias.`
    );


    /* =====================================================
       5. PERSISTIR AVISOS
    ===================================================== */

    if (
        guardar &&
        avisosActuales.length > 0
    ) {

        const guardados =
            await guardarAvisos(
                uid,
                avisosActuales
            );


        /*
           Conservamos los datos útiles
           para mostrar los resultados.
        */

        avisosActuales =
            avisosActuales.map(
                aviso => {

                    const guardado =
                        guardados.find(
                            item =>
                                String(
                                    item.eventId
                                ) ===
                                String(
                                    aviso.eventId
                                )
                        );


                    if (
                        !guardado
                    ) {

                        return aviso;

                    }


                    return {

                        ...aviso,

                        avisoId:
                            guardado.avisoId,

                        leido:
                            guardado.leido ??
                            false,

                        yaExistia:
                            guardado.yaExistia ??
                            false

                    };

                }
            );

    }


    return avisosActuales;

}


/* =========================================================
   BUSCAR AVISOS PARA USUARIO
========================================================= */

async function buscarAvisosParaUsuario(
    uid,
    opciones = {}
) {

    return generarAvisos({

        uid,

        ...opciones

    });

}


/* =========================================================
   OBTENER AVISOS ACTUALES
========================================================= */

function obtenerAvisosActuales() {

    return avisosActuales;

}


/* =========================================================
   OBTENER PREFERENCIAS ACTUALES
========================================================= */

function obtenerPreferenciasActuales() {

    return preferenciasActuales;

}


/* =========================================================
   OBTENER EVENTOS ACTUALES
========================================================= */

function obtenerEventosActuales() {

    return eventosActuales;

}


/* =========================================================
   AUTENTICACIÓN
========================================================= */

onAuthStateChanged(
    auth,
    user => {

        usuarioActual =
            user ||
            null;


        if (
            !user
        ) {

            preferenciasActuales =
                null;

            eventosActuales =
                [];

            avisosActuales =
                [];

            return;

        }


        console.log(
            "OTIUM: usuario autenticado en motor de avisos."
        );

    }
);


/* =========================================================
   API PÚBLICA
========================================================= */

export {

    cargarPreferenciasAvisos,

    obtenerEventos,

    eventoCoincideConPreferencias,

    coincideUbicacion,

    coincideCategoria,

    coincideSubcategoria,

    coincideEdad,

    coincideAcceso,

    generarAvisos,

    buscarAvisosParaUsuario,

    obtenerAvisosActuales,

    obtenerPreferenciasActuales,

    obtenerEventosActuales,

    guardarAviso,

    guardarAvisos

};


/* =========================================================
   INICIALIZACIÓN
========================================================= */

console.log(
    "OTIUM: motor-avisos.js inicializado correctamente."
);