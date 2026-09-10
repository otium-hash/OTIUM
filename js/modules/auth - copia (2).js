/* =====================================================
   OTIUM - AUTENTICACIÓN FIREBASE
   Versión: 20260907 - LOGIN PC + MÓVIL

   FUNCIONES:

   - Login con Google
   - Popup en computador
   - Redirect en smartphone
   - Recuperación del resultado del redirect
   - Logout
   - Exporta auth para el resto de OTIUM

   Compatible con:
   - login.js
   - menu.js
   - Firebase Authentication
===================================================== */


/* =====================================================
   FIREBASE APP
===================================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";


/* =====================================================
   FIREBASE AUTH
===================================================== */

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   CONFIGURACIÓN FIREBASE
===================================================== */

import {
    firebaseConfig
} from "./firebase-config.js";


/* =====================================================
   INICIALIZAR FIREBASE
===================================================== */

const app =
    initializeApp(firebaseConfig);


/* =====================================================
   AUTENTICACIÓN
===================================================== */

const auth =
    getAuth(app);


/* =====================================================
   GOOGLE PROVIDER
===================================================== */

const provider =
    new GoogleAuthProvider();


/*
 * Fuerza la selección de cuenta cuando corresponde.
 *
 * Esto permite que el usuario pueda elegir
 * qué cuenta Google utilizar.
 */

provider.setCustomParameters({

    prompt: "select_account"

});


/* =====================================================
   DETECTAR DISPOSITIVO MÓVIL
===================================================== */

function esDispositivoMovil() {

    const userAgent =
        navigator.userAgent ||
        navigator.vendor ||
        window.opera;


    return (
        /android/i.test(userAgent) ||
        /iPhone|iPad|iPod/i.test(userAgent) ||
        /webOS/i.test(userAgent) ||
        /BlackBerry/i.test(userAgent) ||
        /IEMobile/i.test(userAgent) ||
        /Opera Mini/i.test(userAgent)
    );

}


/* =====================================================
   LOGIN CON GOOGLE
===================================================== */

export async function loginWithGoogle() {

    console.log(
        "[OTIUM Auth] Iniciando login con Google."
    );


    /* =================================================
       SMARTPHONE
    ================================================= */

    if (esDispositivoMovil()) {

        console.log(
            "[OTIUM Auth] Dispositivo móvil detectado."
        );


        console.log(
            "[OTIUM Auth] Utilizando signInWithRedirect()."
        );


        /*
         * En móvil utilizamos redirect.
         *
         * El navegador abandona temporalmente OTIUM,
         * abre Google y luego vuelve al sitio.
         */

        await signInWithRedirect(
            auth,
            provider
        );


        /*
         * Normalmente esta función no continúa
         * después del redirect porque la página
         * será recargada.
         */

        return;

    }


    /* =================================================
       COMPUTADOR
    ================================================= */

    console.log(
        "[OTIUM Auth] Utilizando signInWithPopup()."
    );


    return await signInWithPopup(
        auth,
        provider
    );

}


/* =====================================================
   RECUPERAR LOGIN POR REDIRECT
===================================================== */

export async function procesarLoginRedirect() {

    try {

        console.log(
            "[OTIUM Auth] Comprobando resultado de redirect..."
        );


        const result =
            await getRedirectResult(auth);


        if (result && result.user) {

            console.log(
                "[OTIUM Auth] Login por redirect completado:",
                result.user.uid
            );

            return result.user;

        }


        console.log(
            "[OTIUM Auth] No existe resultado de redirect."
        );


        return null;

    }


    catch (error) {

        console.error(
            "[OTIUM Auth] Error procesando redirect:",
            error
        );


        throw error;

    }

}


/* =====================================================
   LOGOUT
===================================================== */

export async function logout() {

    console.log(
        "[OTIUM Auth] Cerrando sesión..."
    );


    return await signOut(
        auth
    );

}


/* =====================================================
   PROCESAR REDIRECT AL CARGAR LA PÁGINA
===================================================== */

procesarLoginRedirect()

    .then(function(user) {

        if (user) {

            console.log(
                "[OTIUM Auth] Usuario autenticado después del redirect:",
                user.displayName ||
                user.email ||
                user.uid
            );

        }

    })

    .catch(function(error) {

        console.error(
            "[OTIUM Auth] No fue posible completar el login:",
            error
        );

    });


/* =====================================================
   EXPORTAR AUTH
===================================================== */

export {
    auth
};