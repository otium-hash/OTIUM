/* =====================================================
   OTIUM - SISTEMA DE INVITACIONES
   -----------------------------------------------------
   Invitaciones asociadas a cada evento:

   eventos/{eventoId}/invitaciones/{invitacionId}

   Este módulo NO modifica:
   - database.js
   - create-event.js
   - create-event.html
   - index.html
===================================================== */

import {
    db
} from "./database.js";

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
    limit
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* =====================================================
   GENERAR TOKEN
===================================================== */

function generarToken() {

    const caracteres =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let token = "";

    const longitud = 32;

    const valores =
        new Uint32Array(longitud);

    crypto.getRandomValues(valores);

    for (
        let i = 0;
        i < longitud;
        i++
    ) {

        token +=
            caracteres[
                valores[i] %
                caracteres.length
            ];

    }

    return token;

}


/* =====================================================
   REFERENCIA INVITACIONES
===================================================== */

function obtenerColeccionInvitaciones(
    eventoId
) {

    if (!eventoId) {

        throw new Error(
            "El ID del evento es obligatorio."
        );

    }

    return collection(
        db,
        "eventos",
        eventoId,
        "invitaciones"
    );

}


/* =====================================================
   CREAR INVITACIÓN
===================================================== */

export async function createInvitation(
    eventoId,
    datos = {}
) {

    if (!eventoId) {

        throw new Error(
            "El ID del evento es obligatorio."
        );

    }


    const token =
        generarToken();


    const invitacion = {

        eventoId:
            eventoId,

        nombreInvitado:
            String(
                datos.nombreInvitado ||
                ""
            ).trim(),

        emailInvitado:
            String(
                datos.emailInvitado ||
                ""
            ).trim(),

        token:
            token,

        estado:
            "pendiente",

        fechaCreacion:
            new Date(),

        fechaConfirmacion:
            null,

        ingresoRegistrado:
            false,

        fechaIngreso:
            null

    };


    const invitacionRef =
        await addDoc(
            obtenerColeccionInvitaciones(
                eventoId
            ),
            invitacion
        );


    console.log(
        "OTIUM - Invitación creada:",
        invitacionRef.id
    );


    return {

        id:
            invitacionRef.id,

        ...invitacion

    };

}


/* =====================================================
   OBTENER INVITACIÓN
===================================================== */

export async function getInvitation(
    eventoId,
    invitacionId
) {

    if (
        !eventoId ||
        !invitacionId
    ) {

        return null;

    }


    const invitacionRef =
        doc(
            db,
            "eventos",
            eventoId,
            "invitaciones",
            invitacionId
        );


    const snapshot =
        await getDoc(
            invitacionRef
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


/* =====================================================
   OBTENER INVITACIONES DEL EVENTO
===================================================== */

export async function getEventInvitations(
    eventoId
) {

    if (!eventoId) {

        return [];

    }


    const snapshot =
        await getDocs(
            obtenerColeccionInvitaciones(
                eventoId
            )
        );


    return snapshot.docs.map(
        (invitacionDoc) => {

            return {

                id:
                    invitacionDoc.id,

                ...invitacionDoc.data()

            };

        }
    );

}


/* =====================================================
   BUSCAR INVITACIÓN POR TOKEN
===================================================== */

export async function getInvitationByToken(
    eventoId,
    token
) {

    if (
        !eventoId ||
        !token
    ) {

        return null;

    }


    const invitacionesRef =
        obtenerColeccionInvitaciones(
            eventoId
        );


    const invitacionQuery =
        query(
            invitacionesRef,
            where(
                "token",
                "==",
                token
            ),
            limit(1)
        );


    const snapshot =
        await getDocs(
            invitacionQuery
        );


    if (
        snapshot.empty
    ) {

        return null;

    }


    const invitacionDoc =
        snapshot.docs[0];


    return {

        id:
            invitacionDoc.id,

        ...invitacionDoc.data()

    };

}


/* =====================================================
   ACTUALIZAR INVITACIÓN
===================================================== */

export async function updateInvitation(
    eventoId,
    invitacionId,
    datos
) {

    if (
        !eventoId ||
        !invitacionId
    ) {

        throw new Error(
            "El evento y la invitación son obligatorios."
        );

    }


    if (!datos) {

        throw new Error(
            "Los datos de actualización son obligatorios."
        );

    }


    const invitacionRef =
        doc(
            db,
            "eventos",
            eventoId,
            "invitaciones",
            invitacionId
        );


    await updateDoc(
        invitacionRef,
        datos
    );


    console.log(
        "OTIUM - Invitación actualizada:",
        invitacionId
    );


    return true;

}


/* =====================================================
   CONFIRMAR ASISTENCIA
===================================================== */

export async function confirmInvitation(
    eventoId,
    invitacionId
) {

    if (
        !eventoId ||
        !invitacionId
    ) {

        throw new Error(
            "El evento y la invitación son obligatorios."
        );

    }


    const invitacionRef =
        doc(
            db,
            "eventos",
            eventoId,
            "invitaciones",
            invitacionId
        );


    await updateDoc(
        invitacionRef,
        {

            estado:
                "confirmada",

            fechaConfirmacion:
                new Date()

        }
    );


    console.log(
        "OTIUM - Asistencia confirmada:",
        invitacionId
    );


    return true;

}


/* =====================================================
   RECHAZAR INVITACIÓN
===================================================== */

export async function rejectInvitation(
    eventoId,
    invitacionId
) {

    if (
        !eventoId ||
        !invitacionId
    ) {

        throw new Error(
            "El evento y la invitación son obligatorios."
        );

    }


    const invitacionRef =
        doc(
            db,
            "eventos",
            eventoId,
            "invitaciones",
            invitacionId
        );


    await updateDoc(
        invitacionRef,
        {

            estado:
                "rechazada",

            fechaConfirmacion:
                new Date()

        }
    );


    console.log(
        "OTIUM - Invitación rechazada:",
        invitacionId
    );


    return true;

}


/* =====================================================
   REGISTRAR INGRESO
===================================================== */

export async function registerInvitationEntry(
    eventoId,
    invitacionId
) {

    if (
        !eventoId ||
        !invitacionId
    ) {

        throw new Error(
            "El evento y la invitación son obligatorios."
        );

    }


    const invitacionRef =
        doc(
            db,
            "eventos",
            eventoId,
            "invitaciones",
            invitacionId
        );


    await updateDoc(
        invitacionRef,
        {

            ingresoRegistrado:
                true,

            fechaIngreso:
                new Date()

        }
    );


    console.log(
        "OTIUM - Ingreso registrado:",
        invitacionId
    );


    return true;

}


/* =====================================================
   ELIMINAR INVITACIÓN
===================================================== */

export async function deleteInvitation(
    eventoId,
    invitacionId
) {

    if (
        !eventoId ||
        !invitacionId
    ) {

        throw new Error(
            "El evento y la invitación son obligatorios."
        );

    }


    const invitacionRef =
        doc(
            db,
            "eventos",
            eventoId,
            "invitaciones",
            invitacionId
        );


    await deleteDoc(
        invitacionRef
    );


    console.log(
        "OTIUM - Invitación eliminada:",
        invitacionId
    );


    return true;

}


/* =====================================================
   GENERAR URL DE INVITACIÓN
===================================================== */

export function generateInvitationUrl(
    eventoId,
    token
) {

    if (
        !eventoId ||
        !token
    ) {

        return "";

    }


    const baseUrl =
        window.location.origin;


    return (
        `${baseUrl}/invitation.html` +
        `?evento=${encodeURIComponent(eventoId)}` +
        `&token=${encodeURIComponent(token)}`
    );

}


/* =====================================================
   EXPORTACIÓN
===================================================== */

export default {

    createInvitation,

    getInvitation,

    getEventInvitations,

    getInvitationByToken,

    updateInvitation,

    confirmInvitation,

    rejectInvitation,

    registerInvitationEntry,

    deleteInvitation,

    generateInvitationUrl

};