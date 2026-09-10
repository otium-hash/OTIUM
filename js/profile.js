import {
    auth
} from "./modules/auth.js";

import {
    getUserEvents
} from "./modules/database.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* ==========================================
   ELEMENTOS
========================================== */

const profilePhoto =
    document.getElementById(
        "profilePhoto"
    );

const profileName =
    document.getElementById(
        "profileName"
    );

const profileEmail =
    document.getElementById(
        "profileEmail"
    );

const profileNameInfo =
    document.getElementById(
        "profileNameInfo"
    );

const profileEmailInfo =
    document.getElementById(
        "profileEmailInfo"
    );

const profileUserId =
    document.getElementById(
        "profileUserId"
    );

const eventsCount =
    document.getElementById(
        "eventsCount"
    );

const favoritesCount =
    document.getElementById(
        "favoritesCount"
    );

const logoutProfile =
    document.getElementById(
        "logoutProfile"
    );


/* ==========================================
   USUARIO AUTENTICADO
========================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            alert(
                "Debes iniciar sesión para ver tu perfil."
            );

            window.location.href =
                "index.html";

            return;

        }


        /* ======================================
           DATOS DEL USUARIO
        ====================================== */

        const name =
            user.displayName ||
            "Usuario OTIUM";

        const email =
            user.email ||
            "Sin correo";


        profileName.textContent =
            name;

        profileEmail.textContent =
            email;

        profileNameInfo.textContent =
            name;

        profileEmailInfo.textContent =
            email;

        profileUserId.textContent =
            user.uid;


        /* ======================================
           FOTO
        ====================================== */

        if (user.photoURL) {

            profilePhoto.src =
                user.photoURL;

        }


        /* ======================================
           MIS EVENTOS
        ====================================== */

        try {

            const events =
                await getUserEvents(
                    user.uid
                );

            eventsCount.textContent =
                events.length;

        } catch (error) {

            console.error(
                "Error obteniendo eventos:",
                error
            );

            eventsCount.textContent =
                "0";

        }


        /* ======================================
           FAVORITOS

           Se cuentan utilizando la colección
           existente "favoritos".
        ====================================== */

        try {

            /*
             * No modificamos auth.js ni database.js.
             *
             * Primero intentamos utilizar la
             * función global existente de favoritos.
             */

            const favoritosModule =
                await import(
                    "./modules/database.js"
                );


            if (
                typeof favoritosModule.getUserFavorites ===
                "function"
            ) {

                const favorites =
                    await favoritosModule.getUserFavorites(
                        user.uid
                    );

                favoritesCount.textContent =
                    favorites.length;

            } else {

                /*
                 * Si database.js todavía no tiene
                 * getUserFavorites(), dejamos el
                 * contador en 0 sin romper el perfil.
                 */

                favoritesCount.textContent =
                    "0";

            }

        } catch (error) {

            console.error(
                "Error obteniendo favoritos:",
                error
            );

            favoritesCount.textContent =
                "0";

        }

    }
);


/* ==========================================
   CERRAR SESIÓN
========================================== */

if (logoutProfile) {

    logoutProfile.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );

                window.location.href =
                    "index.html";

            } catch (error) {

                console.error(
                    "Error cerrando sesión:",
                    error
                );

                alert(
                    "No fue posible cerrar la sesión."
                );

            }

        }
    );

}