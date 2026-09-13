/* =========================================================
   OTIUM - DATABASE MODULE
   Firebase Firestore

   VERSIÓN OPTIMIZADA
   Fecha: 2026-09-13

   OBJETIVOS:
   - Mantener compatibilidad con el sistema actual.
   - Soportar fechaInicio + fechaTermino.
   - Soportar eventos de un solo día.
   - Soportar eventos de varios días.
   - Mantener compatibilidad con campo fecha antiguo.
   - Mantener favoritos, recordatorios e invitaciones.
   - Incorporar funciones para limpieza administrativa.
   - NO elimina datos automáticamente.

   COLECCIONES:
   - eventos
   - favoritos
   - recordatorios
   - invitaciones
========================================================= */

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const EVENTOS_COLLECTION = "eventos";
const FAVORITOS_COLLECTION = "favoritos";
const RECORDATORIOS_COLLECTION = "recordatorios";
const INVITACIONES_COLLECTION = "invitaciones";

const TIMEZONE_CHILE = "America/Santiago";


/* =========================================================
   UTILIDADES GENERALES
========================================================= */

/**
 * Obtiene el usuario autenticado actualmente.
 */
function usuarioActual() {
    return auth.currentUser || null;
}


/**
 * Devuelve el primer valor válido de una lista.
 *
 * Se utiliza principalmente para mantener compatibilidad
 * con versiones antiguas de OTIUM donde algunos campos
 * tenían nombres diferentes.
 */
function firstValue(...values) {
    for (const value of values) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            return value;
        }
    }

    return null;
}


/**
 * Normaliza un ID para evitar problemas de comparación
 * entre números y strings.
 */
function normalizeId(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value);
}


/**
 * Verifica que exista un valor obligatorio.
 */
function requireValue(
    value,
    message
) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        throw new Error(message);
    }

    return value;
}


/* =========================================================
   FECHAS
========================================================= */

/**
 * Devuelve la fecha actual de Chile en formato:
 *
 * YYYY-MM-DD
 *
 * IMPORTANTE:
 * Se utiliza explícitamente America/Santiago para que
 * OTIUM no dependa de la zona horaria configurada en
 * el computador o teléfono del usuario.
 */
function obtenerFechaActualISO() {
    const ahora = new Date();

    const partes = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: TIMEZONE_CHILE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).formatToParts(ahora);

    const valores = {};

    for (const parte of partes) {
        if (parte.type !== "literal") {
            valores[parte.type] = parte.value;
        }
    }

    return `${valores.year}-${valores.month}-${valores.day}`;
}


/**
 * Convierte una fecha Date a YYYY-MM-DD usando
 * explícitamente la zona horaria de Chile.
 */
function dateAISOChile(date) {
    if (!(date instanceof Date)) {
        return null;
    }

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const partes = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: TIMEZONE_CHILE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).formatToParts(date);

    const valores = {};

    for (const parte of partes) {
        if (parte.type !== "literal") {
            valores[parte.type] = parte.value;
        }
    }

    if (
        !valores.year ||
        !valores.month ||
        !valores.day
    ) {
        return null;
    }

    return `${valores.year}-${valores.month}-${valores.day}`;
}


/**
 * Valida que una fecha YYYY-MM-DD sea realmente válida.
 *
 * Evita aceptar fechas imposibles como:
 * 2026-02-31
 */
function validarFechaISO(fechaISO) {
    if (
        typeof fechaISO !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)
    ) {
        return false;
    }

    const partes = fechaISO.split("-").map(Number);

    const año = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    if (
        mes < 1 ||
        mes > 12 ||
        dia < 1 ||
        dia > 31
    ) {
        return false;
    }

    const fecha = new Date(
        Date.UTC(
            año,
            mes - 1,
            dia
        )
    );

    return (
        fecha.getUTCFullYear() === año &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia
    );
}


/**
 * Convierte diferentes formatos de fecha
 * a YYYY-MM-DD cuando es posible.
 *
 * Soporta:
 *
 * - YYYY-MM-DD
 * - YYYY-MM-DDTHH:mm:ss
 * - YYYY/MM/DD
 * - YYYY/MM/DDTHH:mm:ss
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * - Date
 * - Firestore Timestamp
 *
 * IMPORTANTE:
 *
 * - Las fechas escritas como texto se interpretan
 *   como fechas de calendario y no se convierten
 *   mediante new Date(), evitando desplazamientos
 *   por zona horaria.
 *
 * - Los objetos Date y Firestore Timestamp se convierten
 *   usando America/Santiago.
 */
function normalizarFecha(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }


    /* -----------------------------------------------------
       Firestore Timestamp
    ----------------------------------------------------- */

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        return normalizarFecha(
            value.toDate()
        );
    }


    /* -----------------------------------------------------
       Date
    ----------------------------------------------------- */

    if (
        value instanceof Date
    ) {
        return dateAISOChile(value);
    }


    /* -----------------------------------------------------
       String
    ----------------------------------------------------- */

    const texto = String(value).trim();

    if (!texto) {
        return null;
    }


    /* -----------------------------------------------------
       YYYY-MM-DD
       YYYY-MM-DDTHH:mm:ss
       YYYY-MM-DD HH:mm:ss
    ----------------------------------------------------- */

    const isoMatch = texto.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );

    if (isoMatch) {
        const año = isoMatch[1];

        const mes = String(
            isoMatch[2]
        ).padStart(2, "0");

        const dia = String(
            isoMatch[3]
        ).padStart(2, "0");

        const resultado = `${año}-${mes}-${dia}`;

        if (validarFechaISO(resultado)) {
            return resultado;
        }

        return null;
    }


    /* -----------------------------------------------------
       YYYY/MM/DD
       YYYY/MM/DDTHH:mm:ss
       YYYY/MM/DD HH:mm:ss
    ----------------------------------------------------- */

    const yearSlashMatch = texto.match(
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})/
    );

    if (yearSlashMatch) {
        const año = yearSlashMatch[1];

        const mes = String(
            yearSlashMatch[2]
        ).padStart(2, "0");

        const dia = String(
            yearSlashMatch[3]
        ).padStart(2, "0");

        const resultado = `${año}-${mes}-${dia}`;

        if (validarFechaISO(resultado)) {
            return resultado;
        }

        return null;
    }


    /* -----------------------------------------------------
       DD/MM/YYYY
    ----------------------------------------------------- */

    const slashMatch = texto.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
    );

    if (slashMatch) {
        const dia = String(
            slashMatch[1]
        ).padStart(2, "0");

        const mes = String(
            slashMatch[2]
        ).padStart(2, "0");

        const año = slashMatch[3];

        const resultado = `${año}-${mes}-${dia}`;

        if (validarFechaISO(resultado)) {
            return resultado;
        }

        return null;
    }


    /* -----------------------------------------------------
       DD-MM-YYYY
    ----------------------------------------------------- */

    const dashMatch = texto.match(
        /^(\d{1,2})-(\d{1,2})-(\d{4})/
    );

    if (dashMatch) {
        const dia = String(
            dashMatch[1]
        ).padStart(2, "0");

        const mes = String(
            dashMatch[2]
        ).padStart(2, "0");

        const año = dashMatch[3];

        const resultado = `${año}-${mes}-${dia}`;

        if (validarFechaISO(resultado)) {
            return resultado;
        }

        return null;
    }


    /* -----------------------------------------------------
       Último intento:
       fechas que puedan venir como texto completo
       interpretable por JavaScript.
    ----------------------------------------------------- */

    const fechaIntentada = new Date(texto);

    if (
        !Number.isNaN(
            fechaIntentada.getTime()
        )
    ) {
        return dateAISOChile(
            fechaIntentada
        );
    }

    return null;
}


/**
 * Obtiene la fecha inicial de un evento.
 *
 * Prioridad:
 *
 * 1. fechaInicio
 * 2. fecha
 *
 * fechaTermino NO reemplaza a fechaInicio aquí,
 * porque representa el término del evento.
 */
function obtenerFechaInicioEvento(evento) {
    return normalizarFecha(
        firstValue(
            evento.fechaInicio,
            evento.fecha
        )
    );
}


/**
 * Obtiene la fecha final efectiva de un evento.
 *
 * REGLA PRINCIPAL DE OTIUM:
 *
 * 1. Si existe fechaTermino -> fechaTermino MANDA.
 * 2. Si no existe fechaTermino -> usar fechaInicio.
 * 3. Si tampoco existe fechaInicio -> usar fecha antigua.
 *
 * Esto permite manejar:
 *
 * - evento de un día:
 *   fechaInicio = 2026-09-18
 *
 * - evento de varios días:
 *   fechaInicio = 2026-09-18
 *   fechaTermino = 2026-09-20
 *
 * - evento antiguo:
 *   fecha = 2026-09-18
 */
function obtenerFechaTerminoEvento(evento) {
    if (!evento || typeof evento !== "object") {
        return null;
    }


    /* -----------------------------------------------------
       REGLA 1:
       Si existe fechaTermino, esa fecha manda.
    ----------------------------------------------------- */

    const fechaTermino = normalizarFecha(
        evento.fechaTermino
    );

    if (fechaTermino) {
        return fechaTermino;
    }


    /* -----------------------------------------------------
       REGLA 2:
       Si no existe fechaTermino, usamos fechaInicio.
    ----------------------------------------------------- */

    const fechaInicio = normalizarFecha(
        evento.fechaInicio
    );

    if (fechaInicio) {
        return fechaInicio;
    }


    /* -----------------------------------------------------
       REGLA 3:
       Compatibilidad con campo fecha antiguo.
    ----------------------------------------------------- */

    return normalizarFecha(
        evento.fecha
    );
}


/**
 * Determina si un evento es visible.
 *
 * REGLA:
 *
 * Un evento permanece visible mientras su fecha final
 * efectiva sea hoy o posterior.
 *
 * Por lo tanto:
 *
 * - Evento de un día:
 *   termina hoy -> visible.
 *
 * - Evento de varios días:
 *   fechaTermino futura -> visible.
 *
 * - Evento iniciado anteriormente pero todavía vigente:
 *   fechaTermino >= hoy -> visible.
 *
 * - Evento completamente pasado:
 *   fechaTermino < hoy -> no visible.
 */
function eventoEsVisible(
    evento,
    fechaActual
) {
    const fechaTermino =
        obtenerFechaTerminoEvento(
            evento
        );

    if (!fechaTermino) {
        return false;
    }

    return (
        fechaTermino >= fechaActual
    );
}


/**
 * Determina si un evento está vigente exactamente hoy.
 *
 * Para un evento de varios días:
 *
 * fechaInicio <= hoy <= fechaTermino
 *
 * Para un evento de un día:
 *
 * fechaInicio = fechaTermino = hoy
 */
function eventoEstaVigente(
    evento,
    fechaActual
) {
    const fechaInicio =
        obtenerFechaInicioEvento(
            evento
        );

    const fechaTermino =
        obtenerFechaTerminoEvento(
            evento
        );

    if (
        !fechaInicio &&
        !fechaTermino
    ) {
        return false;
    }

    const inicio =
        fechaInicio ||
        fechaTermino;

    const termino =
        fechaTermino ||
        fechaInicio;

    return (
        inicio <= fechaActual &&
        termino >= fechaActual
    );
}


/**
 * Calcula una fecha límite retrocediendo cierta cantidad
 * de días desde hoy en horario de Chile.
 *
 * Por defecto:
 * 90 días.
 */
function obtenerFechaLimiteLimpieza(
    dias = 90
) {
    const diasNumericos = Number(dias);

    if (
        !Number.isFinite(
            diasNumericos
        )
    ) {
        return null;
    }

    /*
     * Obtenemos primero la fecha actual de Chile.
     * Se trabaja con UTC internamente para manipular
     * únicamente el calendario y evitar desplazamientos.
     */
    const fechaActual = obtenerFechaActualISO();

    const partes = fechaActual
        .split("-")
        .map(Number);

    const fecha = new Date(
        Date.UTC(
            partes[0],
            partes[1] - 1,
            partes[2]
        )
    );

    fecha.setUTCDate(
        fecha.getUTCDate() -
        diasNumericos
    );

    const año =
        fecha.getUTCFullYear();

    const mes =
        String(
            fecha.getUTCMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            fecha.getUTCDate()
        ).padStart(2, "0");

    return `${año}-${mes}-${dia}`;
}


/* =========================================================
   CONVERSIÓN DE DOCUMENTOS
========================================================= */

/**
 * Convierte un documento Firestore a objeto de evento.
 *
 * Mantiene:
 * - id
 * - firestoreId
 * - todos los campos almacenados
 */
function mapearEvento(
    docSnap
) {
    return {
        id: docSnap.id,
        firestoreId: docSnap.id,
        ...docSnap.data()
    };
}


/* =========================================================
   EVENTOS
========================================================= */

/**
 * GUARDAR EVENTO
 *
 * Requiere usuario autenticado.
 */
export async function saveEvent(
    eventData
) {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión para publicar un evento."
        );
    }

    if (
        !eventData ||
        typeof eventData !== "object"
    ) {
        throw new Error(
            "Los datos del evento no son válidos."
        );
    }


    /* -----------------------------------------------------
       COPIA DE LOS DATOS
    ----------------------------------------------------- */

    const data = {
        ...eventData
    };


    /* -----------------------------------------------------
       USUARIO PROPIETARIO
       OTIUM utiliza actualmente "usuarioId".
       Se elimina userId para evitar duplicidad.
    ----------------------------------------------------- */

    data.usuarioId =
        user.uid;

    delete data.userId;


    /* -----------------------------------------------------
       FECHA DE CREACIÓN
    ----------------------------------------------------- */

    if (!data.createdAt) {
        data.createdAt =
            serverTimestamp();
    }


    /* -----------------------------------------------------
       GUARDAR
    ----------------------------------------------------- */

    const docRef =
        await addDoc(
            collection(
                db,
                EVENTOS_COLLECTION
            ),
            data
        );

    return docRef.id;
}


/* =========================================================
   OBTENER EVENTOS ACTIVOS
========================================================= */

/**
 * OBTENER EVENTOS
 *
 * Obtiene la colección completa y posteriormente
 * filtra en JavaScript.
 *
 * Esto evita que eventos importados desde Excel queden
 * fuera por diferencias en el formato o estructura
 * de sus campos de fecha.
 *
 * Campos compatibles:
 *
 * - fechaInicio
 * - fechaTermino
 * - fecha
 *
 * Soporta:
 *
 * - eventos de un solo día
 * - eventos de varios días
 * - eventos iniciados anteriormente
 * - eventos futuros
 * - eventos antiguos con campo fecha
 *
 * NO elimina ningún documento.
 */
export async function getEvents() {
    const fechaActual =
        obtenerFechaActualISO();

    const eventosRef =
        collection(
            db,
            EVENTOS_COLLECTION
        );


    /* -----------------------------------------------------
       LEER TODOS LOS EVENTOS
    ----------------------------------------------------- */

    const snapshot =
        await getDocs(
            eventosRef
        );

    console.log(
        "[OTIUM] Fecha actual Chile:",
        fechaActual
    );

    console.log(
        "[OTIUM] Documentos encontrados en Firestore:",
        snapshot.size
    );


    /* -----------------------------------------------------
       CONVERTIR DOCUMENTOS
    ----------------------------------------------------- */

    let eventos =
        snapshot.docs.map(
            mapearEvento
        );


    /* -----------------------------------------------------
       MOSTRAR INFORMACIÓN DE FECHAS EN CONSOLA
    ----------------------------------------------------- */

    console.log(
        "[OTIUM] Fechas de eventos encontrados:",
        eventos.map(
            evento => ({
                id:
                    evento.id,

                nombre:
                    evento.nombre,

                fechaInicio:
                    evento.fechaInicio,

                fechaTermino:
                    evento.fechaTermino,

                fecha:
                    evento.fecha,

                fechaInicioNormalizada:
                    obtenerFechaInicioEvento(
                        evento
                    ),

                fechaTerminoNormalizada:
                    obtenerFechaTerminoEvento(
                        evento
                    ),

                visible:
                    eventoEsVisible(
                        evento,
                        fechaActual
                    )
            })
        )
    );


    /* -----------------------------------------------------
       FILTRAR EVENTOS VISIBLES
    ----------------------------------------------------- */

    eventos =
        eventos.filter(
            evento =>
                eventoEsVisible(
                    evento,
                    fechaActual
                )
        );


    /* -----------------------------------------------------
       ELIMINAR DUPLICADOS
    ----------------------------------------------------- */

    const ids =
        new Set();

    eventos =
        eventos.filter(
            evento => {
                if (
                    ids.has(
                        evento.id
                    )
                ) {
                    return false;
                }

                ids.add(
                    evento.id
                );

                return true;
            }
        );


    /* -----------------------------------------------------
       ORDENAR POR FECHA DE INICIO
       Prioridad:
       1. fechaInicio
       2. fecha
    ----------------------------------------------------- */

    eventos.sort(
        (a, b) => {
            const fechaA =
                obtenerFechaInicioEvento(
                    a
                ) ||
                "9999-12-31";

            const fechaB =
                obtenerFechaInicioEvento(
                    b
                ) ||
                "9999-12-31";

            return fechaA.localeCompare(
                fechaB
            );
        }
    );


    /* -----------------------------------------------------
       RESULTADO
    ----------------------------------------------------- */

    console.log(
        "OTIUM - Eventos cargados desde Firestore:",
        eventos.length
    );

    console.log(
        "[OTIUM] IDs de eventos cargados:",
        eventos.map(
            evento => evento.id
        )
    );

    return eventos;
}


/* =========================================================
   OBTENER TODOS LOS EVENTOS
========================================================= */

/**
 * Obtiene todos los eventos.
 *
 * Pensado principalmente para:
 *
 * - administración
 * - mantenimiento
 * - detectar duplicados
 * - revisar eventos antiguos
 * - limpieza
 */
export async function getAllEvents() {
    const snapshot =
        await getDocs(
            collection(
                db,
                EVENTOS_COLLECTION
            )
        );

    return snapshot.docs.map(
        mapearEvento
    );
}


/* =========================================================
   OBTENER EVENTOS PASADOS
========================================================= */

/**
 * Obtiene eventos cuya fecha de término ya pasó.
 *
 * REGLA:
 *
 * - fechaTermino manda cuando existe.
 * - si no existe, fechaInicio.
 * - si tampoco existe, fecha antigua.
 */
export async function getPastEvents() {
    const fechaActual =
        obtenerFechaActualISO();

    const eventos =
        await getAllEvents();

    return eventos.filter(
        evento => {
            const fechaTermino =
                obtenerFechaTerminoEvento(
                    evento
                );

            if (!fechaTermino) {
                return false;
            }

            return (
                fechaTermino <
                fechaActual
            );
        }
    );
}


/* =========================================================
   OBTENER EVENTOS PARA LIMPIEZA
========================================================= */

/**
 * Obtiene eventos cuya fecha de término es anterior
 * a la fecha límite.
 *
 * Por defecto:
 * 90 días.
 *
 * IMPORTANTE:
 *
 * Esta función SOLO consulta.
 * NO elimina eventos.
 */
export async function getEventsForCleanup(
    dias = 90
) {
    const diasNumericos =
        Number(dias);

    if (
        !Number.isFinite(
            diasNumericos
        ) ||
        diasNumericos < 1
    ) {
        throw new Error(
            "La cantidad de días debe ser un número mayor que 0."
        );
    }

    const fechaLimite =
        obtenerFechaLimiteLimpieza(
            diasNumericos
        );

    const eventos =
        await getAllEvents();

    return eventos.filter(
        evento => {
            const fechaTermino =
                obtenerFechaTerminoEvento(
                    evento
                );

            if (!fechaTermino) {
                return false;
            }

            return (
                fechaTermino <
                fechaLimite
            );
        }
    );
}


/* =========================================================
   OBTENER EVENTO POR ID
========================================================= */

/**
 * Obtiene un evento específico mediante su ID
 * de documento Firestore.
 */
export async function getEventById(
    id
) {
    requireValue(
        id,
        "El ID del evento es obligatorio."
    );

    const docRef =
        doc(
            db,
            EVENTOS_COLLECTION,
            normalizeId(id)
        );

    const snapshot =
        await getDoc(
            docRef
        );

    if (
        !snapshot.exists()
    ) {
        return null;
    }

    return mapearEvento(
        snapshot
    );
}


/* =========================================================
   OBTENER EVENTOS DEL USUARIO
========================================================= */

/**
 * Obtiene los eventos publicados por el usuario actual.
 *
 * Compatibilidad:
 *
 * - usuarioId
 * - userId
 * - ownerId
 */
export async function getUserEvents() {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión para ver tus eventos."
        );
    }

    const eventosRef =
        collection(
            db,
            EVENTOS_COLLECTION
        );

    const resultados = [];

    const ids =
        new Set();


    /* -----------------------------------------------------
       CONSULTA 1
       usuarioId
    ----------------------------------------------------- */

    const qUsuarioId =
        query(
            eventosRef,
            where(
                "usuarioId",
                "==",
                user.uid
            )
        );

    const snapshotUsuarioId =
        await getDocs(
            qUsuarioId
        );

    snapshotUsuarioId.docs.forEach(
        docSnap => {
            if (
                !ids.has(
                    docSnap.id
                )
            ) {
                ids.add(
                    docSnap.id
                );

                resultados.push(
                    mapearEvento(
                        docSnap
                    )
                );
            }
        }
    );


    /* -----------------------------------------------------
       CONSULTA 2
       userId
    ----------------------------------------------------- */

    const qUserId =
        query(
            eventosRef,
            where(
                "userId",
                "==",
                user.uid
            )
        );

    const snapshotUserId =
        await getDocs(
            qUserId
        );

    snapshotUserId.docs.forEach(
        docSnap => {
            if (
                !ids.has(
                    docSnap.id
                )
            ) {
                ids.add(
                    docSnap.id
                );

                resultados.push(
                    mapearEvento(
                        docSnap
                    )
                );
            }
        }
    );


    /* -----------------------------------------------------
       CONSULTA 3
       ownerId
    ----------------------------------------------------- */

    const qOwnerId =
        query(
            eventosRef,
            where(
                "ownerId",
                "==",
                user.uid
            )
        );

    const snapshotOwnerId =
        await getDocs(
            qOwnerId
        );

    snapshotOwnerId.docs.forEach(
        docSnap => {
            if (
                !ids.has(
                    docSnap.id
                )
            ) {
                ids.add(
                    docSnap.id
                );

                resultados.push(
                    mapearEvento(
                        docSnap
                    )
                );
            }
        }
    );

    return resultados;
}


/* =========================================================
   ACTUALIZAR EVENTO
========================================================= */

/**
 * Actualiza un evento existente.
 */
export async function updateEvent(
    id,
    eventData
) {
    requireValue(
        id,
        "El ID del evento es obligatorio."
    );

    if (
        !eventData ||
        typeof eventData !== "object"
    ) {
        throw new Error(
            "Los datos del evento no son válidos."
        );
    }

    const docRef =
        doc(
            db,
            EVENTOS_COLLECTION,
            normalizeId(id)
        );

    await updateDoc(
        docRef,
        eventData
    );

    return true;
}


/* =========================================================
   ELIMINAR EVENTO
========================================================= */

/**
 * Elimina un evento de Firestore.
 *
 * IMPORTANTE:
 *
 * Esta operación NO elimina automáticamente las imágenes
 * alojadas en Cloudflare Worker.
 */
export async function deleteEvent(
    id
) {
    requireValue(
        id,
        "El ID del evento es obligatorio."
    );

    const docRef =
        doc(
            db,
            EVENTOS_COLLECTION,
            normalizeId(id)
        );

    await deleteDoc(
        docRef
    );

    return true;
}


/* =========================================================
   FAVORITOS
========================================================= */

/**
 * Agregar evento a favoritos.
 */
export async function addFavorite(
    eventId
) {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión para guardar favoritos."
        );
    }

    requireValue(
        eventId,
        "El ID del evento es obligatorio."
    );

    const favoritosRef =
        collection(
            db,
            FAVORITOS_COLLECTION
        );

    const q =
        query(
            favoritosRef,
            where(
                "userId",
                "==",
                user.uid
            ),
            where(
                "eventId",
                "==",
                normalizeId(
                    eventId
                )
            )
        );

    const snapshot =
        await getDocs(q);

    if (
        !snapshot.empty
    ) {
        return snapshot.docs[0].id;
    }

    const docRef =
        await addDoc(
            favoritosRef,
            {
                userId:
                    user.uid,

                eventId:
                    normalizeId(
                        eventId
                    ),

                createdAt:
                    serverTimestamp()
            }
        );

    return docRef.id;
}


/**
 * Verificar si un evento está en favoritos.
 */
export async function isFavorite(
    eventId
) {
    const user =
        usuarioActual();

    if (!user) {
        return false;
    }

    if (!eventId) {
        return false;
    }

    const q =
        query(
            collection(
                db,
                FAVORITOS_COLLECTION
            ),
            where(
                "userId",
                "==",
                user.uid
            ),
            where(
                "eventId",
                "==",
                normalizeId(
                    eventId
                )
            )
        );

    const snapshot =
        await getDocs(q);

    return !snapshot.empty;
}


/**
 * Eliminar favorito.
 */
export async function removeFavorite(
    eventId
) {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión."
        );
    }

    if (!eventId) {
        return false;
    }

    const q =
        query(
            collection(
                db,
                FAVORITOS_COLLECTION
            ),
            where(
                "userId",
                "==",
                user.uid
            ),
            where(
                "eventId",
                "==",
                normalizeId(
                    eventId
                )
            )
        );

    const snapshot =
        await getDocs(q);

    for (
        const docSnap of snapshot.docs
    ) {
        await deleteDoc(
            docSnap.ref
        );
    }

    return true;
}


/**
 * Obtener favoritos del usuario.
 */
export async function getUserFavorites() {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión."
        );
    }

    const q =
        query(
            collection(
                db,
                FAVORITOS_COLLECTION
            ),
            where(
                "userId",
                "==",
                user.uid
            )
        );

    const snapshot =
        await getDocs(q);

    return snapshot.docs.map(
        docSnap => ({
            id:
                docSnap.id,

            ...docSnap.data()
        })
    );
}


/* =========================================================
   RECORDATORIOS
========================================================= */

/**
 * Agregar recordatorio.
 */
export async function addReminder(
    eventId
) {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión para crear recordatorios."
        );
    }

    requireValue(
        eventId,
        "El ID del evento es obligatorio."
    );

    const recordatoriosRef =
        collection(
            db,
            RECORDATORIOS_COLLECTION
        );

    const q =
        query(
            recordatoriosRef,
            where(
                "userId",
                "==",
                user.uid
            ),
            where(
                "eventId",
                "==",
                normalizeId(
                    eventId
                )
            )
        );

    const snapshot =
        await getDocs(q);

    if (
        !snapshot.empty
    ) {
        return snapshot.docs[0].id;
    }

    const docRef =
        await addDoc(
            recordatoriosRef,
            {
                userId:
                    user.uid,

                eventId:
                    normalizeId(
                        eventId
                    ),

                createdAt:
                    serverTimestamp()
            }
        );

    return docRef.id;
}


/**
 * Verificar recordatorio.
 */
export async function isReminder(
    eventId
) {
    const user =
        usuarioActual();

    if (
        !user ||
        !eventId
    ) {
        return false;
    }

    const q =
        query(
            collection(
                db,
                RECORDATORIOS_COLLECTION
            ),
            where(
                "userId",
                "==",
                user.uid
            ),
            where(
                "eventId",
                "==",
                normalizeId(
                    eventId
                )
            )
        );

    const snapshot =
        await getDocs(q);

    return !snapshot.empty;
}


/**
 * Eliminar recordatorio.
 */
export async function removeReminder(
    eventId
) {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión."
        );
    }

    if (!eventId) {
        return false;
    }

    const q =
        query(
            collection(
                db,
                RECORDATORIOS_COLLECTION
            ),
            where(
                "userId",
                "==",
                user.uid
            ),
            where(
                "eventId",
                "==",
                normalizeId(
                    eventId
                )
            )
        );

    const snapshot =
        await getDocs(q);

    for (
        const docSnap of snapshot.docs
    ) {
        await deleteDoc(
            docSnap.ref
        );
    }

    return true;
}


/**
 * Obtener recordatorios del usuario.
 */
export async function getUserReminders() {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión."
        );
    }

    const q =
        query(
            collection(
                db,
                RECORDATORIOS_COLLECTION
            ),
            where(
                "userId",
                "==",
                user.uid
            )
        );

    const snapshot =
        await getDocs(q);

    return snapshot.docs.map(
        docSnap => ({
            id:
                docSnap.id,

            ...docSnap.data()
        })
    );
}


/* =========================================================
   INVITACIONES
========================================================= */

/**
 * Crear invitación.
 */
export async function createInvitation(
    invitationData
) {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión para crear una invitación."
        );
    }

    if (
        !invitationData ||
        typeof invitationData !== "object"
    ) {
        throw new Error(
            "Los datos de la invitación no son válidos."
        );
    }

    const data = {
        ...invitationData
    };


    /* -----------------------------------------------------
       Compatibilidad de usuario
    ----------------------------------------------------- */

    if (!data.usuarioId) {
        data.usuarioId =
            user.uid;
    }

    if (!data.userId) {
        data.userId =
            user.uid;
    }


    /* -----------------------------------------------------
       Fecha de creación
    ----------------------------------------------------- */

    if (!data.createdAt) {
        data.createdAt =
            serverTimestamp();
    }


    const docRef =
        await addDoc(
            collection(
                db,
                INVITACIONES_COLLECTION
            ),
            data
        );

    return docRef.id;
}


/**
 * Obtener invitación por ID.
 */
export async function getInvitationById(
    id
) {
    requireValue(
        id,
        "El ID de la invitación es obligatorio."
    );

    const docRef =
        doc(
            db,
            INVITACIONES_COLLECTION,
            normalizeId(id)
        );

    const snapshot =
        await getDoc(
            docRef
        );

    if (
        !snapshot.exists()
    ) {
        return null;
    }

    return {
        id:
            snapshot.id,

        ...snapshot.data()
    };
}


/**
 * Obtener invitaciones del usuario.
 *
 * Se mantienen usuarioId y userId por compatibilidad.
 */
export async function getUserInvitations() {
    const user =
        usuarioActual();

    if (!user) {
        throw new Error(
            "Debes iniciar sesión."
        );
    }

    const invitacionesRef =
        collection(
            db,
            INVITACIONES_COLLECTION
        );

    const resultados = [];

    const ids =
        new Set();


    /* -----------------------------------------------------
       usuarioId
    ----------------------------------------------------- */

    const qUsuarioId =
        query(
            invitacionesRef,
            where(
                "usuarioId",
                "==",
                user.uid
            )
        );

    const snapshotUsuarioId =
        await getDocs(
            qUsuarioId
        );

    snapshotUsuarioId.docs.forEach(
        docSnap => {
            if (
                !ids.has(
                    docSnap.id
                )
            ) {
                ids.add(
                    docSnap.id
                );

                resultados.push({
                    id:
                        docSnap.id,

                    ...docSnap.data()
                });
            }
        }
    );


    /* -----------------------------------------------------
       userId
    ----------------------------------------------------- */

    const qUserId =
        query(
            invitacionesRef,
            where(
                "userId",
                "==",
                user.uid
            )
        );

    const snapshotUserId =
        await getDocs(
            qUserId
        );

    snapshotUserId.docs.forEach(
        docSnap => {
            if (
                !ids.has(
                    docSnap.id
                )
            ) {
                ids.add(
                    docSnap.id
                );

                resultados.push({
                    id:
                        docSnap.id,

                    ...docSnap.data()
                });
            }
        }
    );

    return resultados;
}


/**
 * Obtener invitación relacionada con un evento.
 *
 * Compatible con:
 * - eventId
 * - eventoId
 */
export async function getInvitationByEventId(
    eventId
) {
    requireValue(
        eventId,
        "El ID del evento es obligatorio."
    );

    const invitacionesRef =
        collection(
            db,
            INVITACIONES_COLLECTION
        );

    const idNormalizado =
        normalizeId(
            eventId
        );


    /* -----------------------------------------------------
       eventId
    ----------------------------------------------------- */

    const qEventId =
        query(
            invitacionesRef,
            where(
                "eventId",
                "==",
                idNormalizado
            )
        );

    const snapshotEventId =
        await getDocs(
            qEventId
        );

    if (
        !snapshotEventId.empty
    ) {
        return {
            id:
                snapshotEventId
                    .docs[0]
                    .id,

            ...snapshotEventId
                .docs[0]
                .data()
        };
    }


    /* -----------------------------------------------------
       eventoId
    ----------------------------------------------------- */

    const qEventoId =
        query(
            invitacionesRef,
            where(
                "eventoId",
                "==",
                idNormalizado
            )
        );

    const snapshotEventoId =
        await getDocs(
            qEventoId
        );

    if (
        !snapshotEventoId.empty
    ) {
        return {
            id:
                snapshotEventoId
                    .docs[0]
                    .id,

            ...snapshotEventoId
                .docs[0]
                .data()
        };
    }

    return null;
}


/**
 * Actualizar invitación.
 */
export async function updateInvitation(
    id,
    invitationData
) {
    requireValue(
        id,
        "El ID de la invitación es obligatorio."
    );

    if (
        !invitationData ||
        typeof invitationData !== "object"
    ) {
        throw new Error(
            "Los datos de la invitación no son válidos."
        );
    }

    const docRef =
        doc(
            db,
            INVITACIONES_COLLECTION,
            normalizeId(id)
        );

    await updateDoc(
        docRef,
        invitationData
    );

    return true;
}


/**
 * Eliminar invitación.
 */
export async function deleteInvitation(
    id
) {
    requireValue(
        id,
        "El ID de la invitación es obligatorio."
    );

    const docRef =
        doc(
            db,
            INVITACIONES_COLLECTION,
            normalizeId(id)
        );

    await deleteDoc(
        docRef
    );

    return true;
}


/* =========================================================
   EXPORTACIÓN
========================================================= */

/**
 * Se mantiene la exportación de db para módulos
 * que ya la utilicen directamente.
 */
export {
    db
};

