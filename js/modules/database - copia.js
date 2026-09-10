/* =====================================================
   OTIUM - MÓDULO FIRESTORE
   Versión: 20260903
   Compatible con firebase-config.js
   Compatible con firestore.rules
===================================================== */

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


/* =====================================================
   UTILIDADES
===================================================== */

/**
 * Usuario actualmente autenticado
 */
function usuarioActual() {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("Debes iniciar sesión para realizar esta acción.");
    }

    return user;
}


/**
 * Obtiene el primer valor disponible
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
 * Normaliza IDs
 */
function normalizeId(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    return String(value);
}


/**
 * Valida que exista un valor
 */
function requireValue(value, message) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        throw new Error(message);
    }

    return value;
}


/* =====================================================
   EVENTOS
===================================================== */

/**
 * Crear evento
 */
export async function saveEvent(eventData) {

    const user = usuarioActual();

    if (
        !eventData ||
        typeof eventData !== "object"
    ) {
        throw new Error("Los datos del evento no son válidos.");
    }


    /*
       El usuario autenticado queda como propietario
       cuando no se especifica otro propietario válido.
    */

    const usuarioId = firstValue(
        eventData.usuarioId,
        eventData.userId,
        user.uid
    );


    const data = {
        ...eventData,

        usuarioId: usuarioId,

        createdAt:
            eventData.createdAt ||
            serverTimestamp()
    };


    /*
       Evitamos guardar campos duplicados de propietario
       cuando vienen del formulario antiguo.
    */

    delete data.userId;


    return await addDoc(
        collection(db, "eventos"),
        data
    );
}


/**
 * Obtener todos los eventos
 *
 * Los eventos son públicos según firestore.rules.
 */
export async function getEvents() {

    const snapshot = await getDocs(
        collection(db, "eventos")
    );

    return snapshot.docs.map(docSnap => ({

        id: docSnap.id,

        firestoreId: docSnap.id,

        ...docSnap.data()

    }));
}


/**
 * Obtener eventos del usuario actual
 */
export async function getUserEvents() {

    const user = usuarioActual();

    const resultados = [];

    /*
       Compatibilidad con diferentes versiones
       históricas de OTIUM.
    */

    const consultas = [

        query(
            collection(db, "eventos"),
            where("usuarioId", "==", user.uid)
        ),

        query(
            collection(db, "eventos"),
            where("userId", "==", user.uid)
        ),

        query(
            collection(db, "eventos"),
            where("ownerId", "==", user.uid)
        )

    ];


    for (const consulta of consultas) {

        const snapshot = await getDocs(consulta);

        snapshot.forEach(docSnap => {

            const existe = resultados.some(
                evento =>
                    evento.firestoreId === docSnap.id
            );

            if (!existe) {

                resultados.push({

                    id: docSnap.id,

                    firestoreId: docSnap.id,

                    ...docSnap.data()

                });
            }
        });
    }


    return resultados;
}


/**
 * Obtener evento por ID
 */
export async function getEventById(eventId) {

    const id = normalizeId(eventId);

    requireValue(
        id,
        "No se especificó el ID del evento."
    );


    const ref = doc(
        db,
        "eventos",
        id
    );


    const snapshot = await getDoc(ref);


    if (!snapshot.exists()) {
        return null;
    }


    return {

        id: snapshot.id,

        firestoreId: snapshot.id,

        ...snapshot.data()

    };
}


/**
 * Actualizar evento
 */
export async function updateEvent(
    eventId,
    eventData
) {

    const user = usuarioActual();

    const id = normalizeId(eventId);

    requireValue(
        id,
        "No se especificó el ID del evento."
    );


    if (
        !eventData ||
        typeof eventData !== "object"
    ) {
        throw new Error("Los datos del evento no son válidos.");
    }


    const ref = doc(
        db,
        "eventos",
        id
    );


    const snapshot = await getDoc(ref);


    if (!snapshot.exists()) {

        throw new Error(
            "El evento no existe."
        );
    }


    const existente = snapshot.data();


    /*
       Comprobación adicional en cliente.
       Las firestore.rules siguen siendo la
       protección definitiva.
    */

    const propietario = firstValue(
        existente.usuarioId,
        existente.userId,
        existente.ownerId,
        existente.organizadorId,
        existente.uid
    );


    /*
       Si el evento pertenece a otro usuario,
       solamente un administrador podrá modificarlo
       según las reglas de Firestore.
    */

    if (
        propietario &&
        propietario !== user.uid
    ) {

        /*
           No bloqueamos aquí a los administradores,
           porque la regla de Firestore determinará
           si el usuario tiene permisos.
        */
    }


    const data = {
        ...eventData
    };


    /*
       No permitimos cambiar accidentalmente
       el propietario desde el formulario.
    */

    delete data.usuarioId;
    delete data.userId;
    delete data.ownerId;
    delete data.organizadorId;
    delete data.uid;


    await updateDoc(
        ref,
        data
    );


    return true;
}


/**
 * Eliminar evento
 */
export async function deleteEvent(eventId) {

    usuarioActual();

    const id = normalizeId(eventId);

    requireValue(
        id,
        "No se especificó el ID del evento."
    );


    const ref = doc(
        db,
        "eventos",
        id
    );


    await deleteDoc(ref);

    return true;
}


/* =====================================================
   FAVORITOS
===================================================== */

/**
 * Agregar favorito
 */
export async function addFavorite(
    userId,
    eventId
) {

    const user = usuarioActual();

    const uid = normalizeId(userId);

    const eid = normalizeId(eventId);


    if (uid !== user.uid) {

        throw new Error(
            "No puedes modificar los favoritos de otro usuario."
        );
    }


    requireValue(
        eid,
        "No se especificó el evento."
    );


    /*
       Evita favoritos duplicados.
    */

    const q = query(

        collection(db, "favoritos"),

        where(
            "userId",
            "==",
            user.uid
        ),

        where(
            "eventId",
            "==",
            eid
        )
    );


    const existente = await getDocs(q);


    if (!existente.empty) {

        return existente.docs[0].id;
    }


    const ref = await addDoc(

        collection(db, "favoritos"),

        {

            userId: user.uid,

            eventId: eid,

            createdAt: serverTimestamp()

        }
    );


    return ref.id;
}


/**
 * Verificar si un evento es favorito
 */
export async function isFavorite(
    userId,
    eventId
) {

    const user = usuarioActual();

    const uid = normalizeId(userId);

    const eid = normalizeId(eventId);


    if (uid !== user.uid) {
        return false;
    }


    if (!eid) {
        return false;
    }


    const q = query(

        collection(db, "favoritos"),

        where(
            "userId",
            "==",
            user.uid
        ),

        where(
            "eventId",
            "==",
            eid
        )
    );


    const snapshot = await getDocs(q);


    return !snapshot.empty;
}


/**
 * Eliminar favorito
 */
export async function removeFavorite(
    userId,
    eventId
) {

    const user = usuarioActual();

    const uid = normalizeId(userId);

    const eid = normalizeId(eventId);


    if (uid !== user.uid) {

        throw new Error(
            "No puedes modificar los favoritos de otro usuario."
        );
    }


    const q = query(

        collection(db, "favoritos"),

        where(
            "userId",
            "==",
            user.uid
        ),

        where(
            "eventId",
            "==",
            eid
        )
    );


    const snapshot = await getDocs(q);


    for (const docSnap of snapshot.docs) {

        await deleteDoc(docSnap.ref);
    }


    return true;
}


/**
 * Obtener favoritos del usuario
 */
export async function getUserFavorites() {

    const user = usuarioActual();


    const q = query(

        collection(db, "favoritos"),

        where(
            "userId",
            "==",
            user.uid
        )
    );


    const snapshot = await getDocs(q);


    return snapshot.docs.map(docSnap => ({

        id: docSnap.id,

        firestoreId: docSnap.id,

        ...docSnap.data()

    }));
}


/* =====================================================
   RECORDATORIOS
===================================================== */

/**
 * Agregar recordatorio
 */
export async function addReminder(
    userId,
    eventId
) {

    const user = usuarioActual();

    const uid = normalizeId(userId);

    const eid = normalizeId(eventId);


    if (uid !== user.uid) {

        throw new Error(
            "No puedes modificar recordatorios de otro usuario."
        );
    }


    requireValue(
        eid,
        "No se especificó el evento."
    );


    const q = query(

        collection(db, "recordatorios"),

        where(
            "userId",
            "==",
            user.uid
        ),

        where(
            "eventId",
            "==",
            eid
        )
    );


    const existente = await getDocs(q);


    if (!existente.empty) {

        return existente.docs[0].id;
    }


    const ref = await addDoc(

        collection(db, "recordatorios"),

        {

            userId: user.uid,

            eventId: eid,

            createdAt: serverTimestamp()

        }
    );


    return ref.id;
}


/**
 * Verificar recordatorio
 */
export async function isReminder(
    userId,
    eventId
) {

    const user = usuarioActual();

    const uid = normalizeId(userId);

    const eid = normalizeId(eventId);


    if (uid !== user.uid) {
        return false;
    }


    if (!eid) {
        return false;
    }


    const q = query(

        collection(db, "recordatorios"),

        where(
            "userId",
            "==",
            user.uid
        ),

        where(
            "eventId",
            "==",
            eid
        )
    );


    const snapshot = await getDocs(q);


    return !snapshot.empty;
}


/**
 * Eliminar recordatorio
 */
export async function removeReminder(
    userId,
    eventId
) {

    const user = usuarioActual();

    const uid = normalizeId(userId);

    const eid = normalizeId(eventId);


    if (uid !== user.uid) {

        throw new Error(
            "No puedes modificar recordatorios de otro usuario."
        );
    }


    const q = query(

        collection(db, "recordatorios"),

        where(
            "userId",
            "==",
            user.uid
        ),

        where(
            "eventId",
            "==",
            eid
        )
    );


    const snapshot = await getDocs(q);


    for (const docSnap of snapshot.docs) {

        await deleteDoc(docSnap.ref);
    }


    return true;
}


/**
 * Obtener recordatorios del usuario
 */
export async function getUserReminders() {

    const user = usuarioActual();


    const q = query(

        collection(db, "recordatorios"),

        where(
            "userId",
            "==",
            user.uid
        )
    );


    const snapshot = await getDocs(q);


    return snapshot.docs.map(docSnap => ({

        id: docSnap.id,

        firestoreId: docSnap.id,

        ...docSnap.data()

    }));
}


/* =====================================================
   INVITACIONES
===================================================== */

/**
 * Crear invitación
 */
export async function createInvitation(
    invitationData
) {

    const user = usuarioActual();


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


    /*
       Compatibilidad:

       usuarioId = estructura actual
       userId    = estructura antigua
    */

    const usuarioId = firstValue(
        data.usuarioId,
        data.userId
    );


    const organizadorId = firstValue(
        data.organizadorId
    );


    /*
       La invitación debe tener al menos
       un propietario.
    */

    if (
        !usuarioId &&
        !organizadorId
    ) {

        throw new Error(
            "La invitación no tiene propietario."
        );
    }


    /*
       Si usuarioId corresponde a un usuario,
       debe ser el usuario autenticado.
    */

    if (
        usuarioId &&
        usuarioId !== user.uid &&
        !organizadorId
    ) {

        throw new Error(
            "No puedes crear una invitación para otro usuario."
        );
    }


    /*
       Canonizamos userId → usuarioId
    */

    if (usuarioId) {

        data.usuarioId = usuarioId;
    }


    delete data.userId;


    /*
       Fecha de creación
    */

    if (!data.createdAt) {

        data.createdAt =
            serverTimestamp();
    }


    const ref = await addDoc(

        collection(db, "invitaciones"),

        data
    );


    return ref.id;
}


/**
 * Obtener invitación por ID
 */
export async function getInvitationById(
    invitationId
) {

    const user = usuarioActual();

    const id = normalizeId(invitationId);


    requireValue(
        id,
        "No se especificó el ID de la invitación."
    );


    const ref = doc(
        db,
        "invitaciones",
        id
    );


    const snapshot = await getDoc(ref);


    if (!snapshot.exists()) {
        return null;
    }


    const data = snapshot.data();


    /*
       Comprobación adicional en cliente.
    */

    const propietarioUsuario =
        firstValue(
            data.usuarioId,
            data.userId
        );


    const propietarioOrganizador =
        data.organizadorId || null;


    if (
        propietarioUsuario !== user.uid &&
        propietarioOrganizador !== user.uid
    ) {

        /*
           El administrador puede acceder
           según firestore.rules.
           No hacemos aquí una consulta adicional
           al documento administradores.
        */

        return null;
    }


    return {

        id: snapshot.id,

        firestoreId: snapshot.id,

        ...data

    };
}


/**
 * Obtener invitaciones del usuario
 */
export async function getUserInvitations() {

    const user = usuarioActual();

    const resultados = [];


    /*
       Invitaciones como usuario
    */

    const qUsuario = query(

        collection(db, "invitaciones"),

        where(
            "usuarioId",
            "==",
            user.uid
        )
    );


    const snapshotUsuario =
        await getDocs(qUsuario);


    snapshotUsuario.forEach(docSnap => {

        resultados.push({

            id: docSnap.id,

            firestoreId: docSnap.id,

            ...docSnap.data()

        });

    });


    /*
       Invitaciones como organizador
    */

    const qOrganizador = query(

        collection(db, "invitaciones"),

        where(
            "organizadorId",
            "==",
            user.uid
        )
    );


    const snapshotOrganizador =
        await getDocs(qOrganizador);


    snapshotOrganizador.forEach(docSnap => {

        const existe = resultados.some(
            item =>
                item.firestoreId === docSnap.id
        );


        if (!existe) {

            resultados.push({

                id: docSnap.id,

                firestoreId: docSnap.id,

                ...docSnap.data()

            });
        }

    });


    return resultados;
}


/**
 * Obtener invitación asociada a un evento
 *
 * IMPORTANTE:
 * Las consultas incluyen propietario porque
 * Firestore Rules NO funcionan como filtros.
 */
export async function getInvitationByEventId(
    eventId
) {

    const user = usuarioActual();

    const eid = normalizeId(eventId);


    requireValue(
        eid,
        "No se especificó el ID del evento."
    );


    /*
       ---------------------------------------------
       EVENTO + usuarioId
       ---------------------------------------------
    */

    const consultas = [

        query(
            collection(db, "invitaciones"),
            where("eventId", "==", eid),
            where("usuarioId", "==", user.uid)
        ),

        query(
            collection(db, "invitaciones"),
            where("eventoId", "==", eid),
            where("usuarioId", "==", user.uid)
        ),

        /*
           -----------------------------------------
           EVENTO + organizadorId
           -----------------------------------------
        */

        query(
            collection(db, "invitaciones"),
            where("eventId", "==", eid),
            where("organizadorId", "==", user.uid)
        ),

        query(
            collection(db, "invitaciones"),
            where("eventoId", "==", eid),
            where("organizadorId", "==", user.uid)
        )

    ];


    for (const consulta of consultas) {

        const snapshot =
            await getDocs(consulta);


        if (!snapshot.empty) {

            const docSnap =
                snapshot.docs[0];


            return {

                id: docSnap.id,

                firestoreId: docSnap.id,

                ...docSnap.data()

            };
        }
    }


    return null;
}


/**
 * Actualizar invitación
 */
export async function updateInvitation(
    invitationId,
    invitationData
) {

    const user = usuarioActual();

    const id = normalizeId(invitationId);


    requireValue(
        id,
        "No se especificó el ID de la invitación."
    );


    if (
        !invitationData ||
        typeof invitationData !== "object"
    ) {

        throw new Error(
            "Los datos de la invitación no son válidos."
        );
    }


    const ref = doc(
        db,
        "invitaciones",
        id
    );


    const snapshot = await getDoc(ref);


    if (!snapshot.exists()) {

        throw new Error(
            "La invitación no existe."
        );
    }


    const existente = snapshot.data();


    const propietarioUsuario =
        firstValue(
            existente.usuarioId,
            existente.userId
        );


    const propietarioOrganizador =
        existente.organizadorId || null;


    if (
        propietarioUsuario !== user.uid &&
        propietarioOrganizador !== user.uid
    ) {

        throw new Error(
            "No tienes permiso para modificar esta invitación."
        );
    }


    const data = {
        ...invitationData
    };


    /*
       Los propietarios no se modifican
       desde esta función.
    */

    delete data.usuarioId;
    delete data.userId;
    delete data.organizadorId;


    await updateDoc(
        ref,
        data
    );


    return true;
}


/**
 * Eliminar invitación
 */
export async function deleteInvitation(
    invitationId
) {

    const user = usuarioActual();

    const id = normalizeId(invitationId);


    requireValue(
        id,
        "No se especificó el ID de la invitación."
    );


    const ref = doc(
        db,
        "invitaciones",
        id
    );


    const snapshot = await getDoc(ref);


    if (!snapshot.exists()) {

        throw new Error(
            "La invitación no existe."
        );
    }


    const data = snapshot.data();


    const propietarioUsuario =
        firstValue(
            data.usuarioId,
            data.userId
        );


    const propietarioOrganizador =
        data.organizadorId || null;


    if (
        propietarioUsuario !== user.uid &&
        propietarioOrganizador !== user.uid
    ) {

        throw new Error(
            "No tienes permiso para eliminar esta invitación."
        );
    }


    await deleteDoc(ref);


    return true;
}


/* =====================================================
   EXPORTACIÓN
===================================================== */

export {
    db
};