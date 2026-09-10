/* =====================================================
   OTIUM - AUTENTICACIÓN Y MENÚ DE USUARIO
   Compatible con menu.js global
===================================================== */

import {
    auth,
    loginWithGoogle,
    logout
} from "./modules/auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


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

    currentUser = user || null;

    if (user) {

        /* Usuario autenticado */

        loginButton.style.display = "none";

        userMenu.style.display = "block";

        if (userName) {
            userName.textContent =
                getUserDisplayName(user);
        }

        if (userDropdown) {
            userDropdown.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        if (dropdownMenu) {
            dropdownMenu.classList.remove("show");
        }

    } else {

        /* Usuario no autenticado */

        loginButton.style.display = "inline-flex";

        userMenu.style.display = "none";

        if (dropdownMenu) {
            dropdownMenu.classList.remove("show");
        }
    }
}


/* =====================================================
   INICIAR CONTROLES DEL MENÚ
===================================================== */

function initializeUserMenu() {

    const {
        loginButton,
        userDropdown,
        dropdownMenu,
        logoutButton
    } = getMenuElements();

    if (
        !loginButton ||
        !userDropdown ||
        !dropdownMenu ||
        !logoutButton
    ) {
        console.warn(
            "OTIUM: No se encontraron todos los elementos del menú de usuario."
        );
        return;
    }

    if (menuInitialized) {
        updateUserInterface(currentUser);
        return;
    }

    menuInitialized = true;


    /* =================================================
       LOGIN GOOGLE
    ================================================= */

    loginButton.addEventListener(
        "click",
        async () => {

            if (loginButton.disabled) {
                return;
            }

            try {

                loginButton.disabled = true;

                loginButton.textContent =
                    "Iniciando sesión...";

                await loginWithGoogle();

            } catch (error) {

                console.error(
                    "OTIUM: error iniciando sesión:",
                    error
                );

                alert(
                    "No fue posible iniciar sesión. Inténtalo nuevamente."
                );

            } finally {

                loginButton.disabled = false;

                if (!currentUser) {
                    loginButton.textContent =
                        "Iniciar sesión";
                }
            }
        }
    );


    /* =================================================
       ABRIR / CERRAR DROPDOWN
    ================================================= */

    userDropdown.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            const abierto =
                dropdownMenu.classList.toggle("show");

            userDropdown.setAttribute(
                "aria-expanded",
                abierto ? "true" : "false"
            );
        }
    );


    /* =================================================
       CERRAR AL HACER CLICK FUERA
    ================================================= */

    document.addEventListener(
        "click",
        (event) => {

            const userMenu =
                document.getElementById("userMenu");

            if (
                !userMenu ||
                !userMenu.contains(event.target)
            ) {

                dropdownMenu.classList.remove("show");

                userDropdown.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        }
    );


    /* =================================================
       CERRAR AL ESC PRESIONAR ESC
    ================================================= */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Escape") {
                return;
            }

            dropdownMenu.classList.remove("show");

            userDropdown.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    );


    /* =================================================
       LOGOUT
    ================================================= */

    logoutButton.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();
            event.stopPropagation();

            try {

                logoutButton.disabled = true;

                logoutButton.textContent =
                    "Cerrando sesión...";

                dropdownMenu.classList.remove("show");

                await logout();

                window.location.reload();

            } catch (error) {

                console.error(
                    "OTIUM: error cerrando sesión:",
                    error
                );

                alert(
                    "No fue posible cerrar sesión. Inténtalo nuevamente."
                );

                logoutButton.disabled = false;

                logoutButton.textContent =
                    "Cerrar sesión";
            }
        }
    );

    updateUserInterface(currentUser);
}


/* =====================================================
   ESPERAR A QUE menu.js CARGUE EL MENÚ
===================================================== */

document.addEventListener(
    "menuOTIUMCargado",
    () => {
        initializeUserMenu();
    }
);


/* =====================================================
   AUTENTICACIÓN GLOBAL
===================================================== */

if (!authObserverInitialized) {

    authObserverInitialized = true;

    onAuthStateChanged(
        auth,
        (user) => {

            currentUser = user || null;

            console.log(
                "OTIUM: estado de autenticación:",
                user
                    ? user.uid
                    : "sin sesión"
            );

            /*
             * menu.js puede haber terminado antes
             * o después de Firebase.
             */

            if (
                document.getElementById("googleLogin")
            ) {

                initializeUserMenu();

            }

            updateUserInterface(user);
        }
    );
}


/* =====================================================
   FALLBACK
   Si menu.js ya fue cargado antes que login.js
===================================================== */

if (
    document.getElementById("googleLogin")
) {

    initializeUserMenu();
}
