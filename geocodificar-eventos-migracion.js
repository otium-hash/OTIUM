import { db } from "./js/modules/firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


async function diagnosticarEventos() {

    console.log("");
    console.log("==============================================");
    console.log("OTIUM - DIAGNÓSTICO DE EVENTOS IMPORTADOS");
    console.log("==============================================");
    console.log("");

    const snapshot = await getDocs(
        collection(db, "eventos")
    );

    let total = 0;
    let sinUsuario = 0;
    let conCoordenadas = 0;
    let sinCoordenadas = 0;

    snapshot.forEach((docSnap) => {

        const evento = docSnap.data();

        total++;

        const usuarioId =
            evento.usuarioId ??
            evento.userId ??
            evento.ownerId ??
            "";

        const latitude =
            evento.latitude ??
            evento.latitud ??
            null;

        const longitude =
            evento.longitude ??
            evento.longitud ??
            null;

        const tieneCoordenadas =
            latitude !== null &&
            latitude !== "" &&
            longitude !== null &&
            longitude !== "" &&
            Number.isFinite(Number(latitude)) &&
            Number.isFinite(Number(longitude));

        if (!usuarioId) {
            sinUsuario++;
        }

        if (tieneCoordenadas) {
            conCoordenadas++;
        } else {
            sinCoordenadas++;
        }

        if (!usuarioId) {

            console.log("----------------------------------------------");

            console.log(
                "ID:",
                docSnap.id
            );

            console.log(
                "Nombre:",
                evento.nombre || "(sin nombre)"
            );

            console.log(
                "UsuarioId:",
                "(SIN USUARIO)"
            );

            console.log(
                "Ciudad:",
                evento.ciudad || "(sin ciudad)"
            );

            console.log(
                "Comuna:",
                evento.comuna || "(sin comuna)"
            );

            console.log(
                "Región:",
                evento.region || "(sin región)"
            );

            console.log(
                "Dirección:",
                evento.direccion ||
                evento.ubicacion ||
                "(sin dirección)"
            );

            console.log(
                "Latitude:",
                latitude ?? "(sin latitude)"
            );

            console.log(
                "Longitude:",
                longitude ?? "(sin longitude)"
            );

            console.log(
                "Coordenadas:",
                tieneCoordenadas
                    ? "SÍ"
                    : "NO"
            );
        }
    });

    console.log("");
    console.log("==============================================");
    console.log("RESUMEN");
    console.log("==============================================");

    console.log(
        "Total eventos:",
        total
    );

    console.log(
        "Eventos sin usuario:",
        sinUsuario
    );

    console.log(
        "Eventos con coordenadas:",
        conCoordenadas
    );

    console.log(
        "Eventos sin coordenadas:",
        sinCoordenadas
    );

    console.log("");
    console.log("DIAGNÓSTICO FINALIZADO");
    console.log("NO SE MODIFICÓ FIRESTORE");
    console.log("");
}


diagnosticarEventos().catch((error) => {

    console.error("");
    console.error(
        "ERROR EN DIAGNÓSTICO:"
    );

    console.error(error);

});
