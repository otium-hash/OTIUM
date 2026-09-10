/* =====================================================
   OTIUM - AUTENTICACIÓN FIREBASE
   Versión: 20260907 - CORREGIDA

   FUNCIONES:

   - Login con Google
   - Popup en computador
   - Redirect en smartphone
   - Recuperación del resultado del redirect
   - Logout
   - Utiliza la instancia Firebase existente

   IMPORTANTE:
   firebase-config.js es el único archivo que
   inicializa Firebase.
===================================================== */


/* =====================================================
   FIREBASE AUTH
===================================================== */

import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   AUTH OTIUM
===================================================== */

import {
    auth
} from "./firebase-config.js";


/* =====================================================
   GOOGLE PROVIDER
===================================================== */

const provider =
    new GoogleAuthProvider();


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
        "[OTIUM Auth] Iniciando login con Google..."
    );


    /* =================================================
       SMARTPHONE
    ================================================= */

    if (esDispositivoMovil()) {

        console.log(
            "[OTIUM Auth] Móvil → signInWithRedirect()"
        );


        await signInWithRedirect(
            auth,
            provider
        );


        return;

    }


    /* =================================================
       PC
    ================================================= */

    console.log(
        "[OTIUM Auth] PC → signInWithPopup()"
    );


    return await signInWithPopup(
        auth,
        provider
    );

}


/* =====================================================
   PROCESAR RESULTADO DEL REDIRECT
===================================================== */

export async function procesarLoginRedirect() {

    try {

        const result =
            await getRedirectResult(auth);


        if (
            result &&
            result.user
        ) {

            console.log(
                "[OTIUM Auth] Login móvil completado:",
                result.user.displayName ||
                result.user.email
            );


            return result.user;

        }


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
   PROCESAR REDIRECT
===================================================== */

procesarLoginRedirect()

    .then(function(user) {

        if (user) {

            console.log(
                "[OTIUM Auth] Usuario autenticado:",
                user.displayName ||
                user.email
            );

        }

    })

    .catch(function(error) {

        console.error(
            "[OTIUM Auth] Error en login redirect:",
            error
        );

    });


/* =====================================================
   EXPORTAR AUTH
===================================================== */

export {
    auth
};