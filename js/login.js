/* =====================================================
   OTIUM - AUTENTICACIÓN Y MENÚ DE USUARIO
   Versión 20260904 - CORREGIDA

   RESPONSABILIDADES:

   - Login con Google
   - Estado de autenticación Firebase
   - Mostrar / ocultar usuario
   - Mostrar nombre del usuario
   - Logout
   - Compatible con menu.js global

   IMPORTANTE:

   menu.js es el ÚNICO responsable de:
   - Abrir / cerrar dropdown
   - Click fuera
   - ESC
   - Estado visual aria-expanded

   Esto evita que dos archivos controlen
   simultáneamente el mismo menú.
===================================================== */


/* =====================================================
   AUTH OTIUM
===================================================== */

import {
    auth,
    loginWithGoogle,
    logout
} from "./modules/auth.js";


/* =====================================================
   FIREBASE AUTH
===================================================== */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
   VARIABLES
===================================================== */

let menuInitialized = false;

let authObserverInitialized = false;

let currentUser = null;


/* =====================================================
   OBTENER ELEMENTOS
===================================================== */

function getMenuElements() {

    return {

        loginButton:
            document.getElementById("googleLogin"),

        userMenu:
            document.getElementById("userMenu"),

        userDropdown:
            document.getElementById("userDropdown"),

        userName:
            document.getElementById("userName"),

        dropdownMenu:
            document.getElementById("dropdownMenu"),

        logoutButton:
            document.getElementById("logoutButton")

    };

}


/* =====================================================
   NOMBRE DEL USUARIO
===================================================== */

function getUserDisplayName(user) {

    if (!user) {

        return "";

    }


    if (user.displayName) {

        return user.displayName;

    }


    if (user.email) {

        return user.email.split("@")[0];

    }


    return "Usuario";

}


/* =====================================================
   ACTUALIZAR INTERFAZ
===================================================== */

function updateUserInterface(user) {

    const {

        loginButton,

        userMenu,

        userDropdown,

        userName,

        dropdownMenu

    } = getMenuElements();


    if (!loginButton || !userMenu) {

        return;

    }


    currentUser =
        user || null;


    /* =================================================
       USUARIO AUTENTICADO
    ================================================= */

    if (user) {

        loginButton.style.display =
            "none";


        userMenu.style.display =
            "block";


        if (userName) {

            userName.textContent =
                getUserDisplayName(user);

        }


        /*
         * El estado del dropdown lo controla menu.js.
         *
         * Solamente nos aseguramos de comenzar
         * cerrado cuando cambia la sesión.
         */

        if (userDropdown) {

            userDropdown.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        if (dropdownMenu) {

            dropdownMenu.classList.remove(
                "show"
            );

        }

    }


    /* =================================================
       SIN USUARIO
    ================================================= */

    else {

        loginButton.style.display =
            "inline-flex";


        loginButton.textContent =
            "Iniciar sesión";


        userMenu.style.display =
            "none";


        if (dropdownMenu) {

            dropdownMenu.classList.remove(
                "show"
            );

        }


        if (userDropdown) {

            userDropdown.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }

}


/* =====================================================
   INICIAR CONTROLES
===================================================== */

function initializeUserMenu() {

    const {

        loginButton,

        userDropdown,

        dropdownMenu,

        logoutButton

    } = getMenuElements();


    /*
     * El dropdown es creado por menu.js.
     *
     * Si todavía no existe, esperamos al evento
     * menuOTIUMCargado.
     */

    if (
        !loginButton ||
        !userDropdown ||
        !dropdownMenu ||
        !logoutButton
    ) {

        console.warn(
            "[OTIUM Login] Elementos del menú todavía no disponibles."
        );

        return;

    }


    /* =================================================
       EVITAR DUPLICAR EVENTOS
    ================================================= */

    if (menuInitialized) {

        updateUserInterface(
            currentUser
        );

        return;

    }


    menuInitialized = true;


    /* =================================================
       LOGIN GOOGLE
    ================================================= */

    loginButton.addEventListener(
        "click",
        async function() {

            if (loginButton.disabled) {

                return;

            }


            try {

                loginButton.disabled =
                    true;


                loginButton.textContent =
                    "Iniciando sesión...";


                await loginWithGoogle();

            }


            catch (error) {

                console.error(
                    "[OTIUM Login] Error iniciando sesión:",
                    error
                );


                alert(
                    "No fue posible iniciar sesión. Inténtalo nuevamente."
                );

            }


            finally {

                loginButton.disabled =
                    false;


                if (!currentUser) {

                    loginButton.textContent =
                        "Iniciar sesión";

                }

            }

        }
    );


    /* =================================================
       IMPORTANTE
       NO AGREGAR AQUÍ:

       userDropdown click

       document click

       document keydown

       Esas funciones pertenecen exclusivamente
       a menu.js.
    ================================================= */


    /* =================================================
       LOGOUT
    ================================================= */

    logoutButton.addEventListener(
        "click",
        async function(event) {

            event.preventDefault();

            event.stopPropagation();


            try {

                logoutButton.disabled =
                    true;


                logoutButton.textContent =
                    "Cerrando sesión...";


                /*
                 * Cerramos visualmente el dropdown.
                 */

                if (dropdownMenu) {

                    dropdownMenu.classList.remove(
                        "show"
                    );

                }


                if (userDropdown) {

                    userDropdown.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }


                await logout();


                /*
                 * Firebase actualizará el estado
                 * mediante onAuthStateChanged.
                 */

            }


            catch (error) {

                console.error(
                    "[OTIUM Login] Error cerrando sesión:",
                    error
                );


                alert(
                    "No fue posible cerrar sesión. Inténtalo nuevamente."
                );


                logoutButton.disabled =
                    false;


                logoutButton.textContent =
                    "🚪 Cerrar sesión";

            }

        }
    );


    /* =================================================
       ACTUALIZAR INTERFAZ INICIAL
    ================================================= */

    updateUserInterface(
        currentUser
    );

}


/* =====================================================
   ESPERAR A menu.js
===================================================== */

document.addEventListener(
    "menuOTIUMCargado",
    function() {

        console.log(
            "[OTIUM Login] Menú global detectado."
        );


        initializeUserMenu();

    }
);


/* =====================================================
   AUTENTICACIÓN FIREBASE
===================================================== */

if (!authObserverInitialized) {

    authObserverInitialized = true;


    onAuthStateChanged(
        auth,
        function(user) {

            currentUser =
                user || null;


            console.log(
                "[OTIUM Login] Estado de autenticación:",
                user
                    ? user.uid
                    : "sin sesión"
            );


            /*
             * Si menu.js ya creó el menú,
             * inicializamos inmediatamente.
             */

            if (
                document.getElementById(
                    "googleLogin"
                )
            ) {

                initializeUserMenu();

            }


            updateUserInterface(
                user
            );

        }
    );

}


/* =====================================================
   FALLBACK
===================================================== */

if (
    document.getElementById(
        "googleLogin"
    )
) {

    initializeUserMenu();

}