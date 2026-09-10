
/* =====================================================
OTIUM - MENÚ GLOBAL
Versión 20260907 - MENÚ MÓVIL
===================================================== */


/* =====================================================
FIREBASE AUTH
===================================================== */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


/* =====================================================
AUTH OTIUM
===================================================== */

import {
    auth
} from "./modules/auth.js";


/* =====================================================
NOTIFICACIONES PUSH
===================================================== */

import {
    activarNotificacionesPush,
    desactivarNotificacionesPush,
    obtenerEstadoNotificacionesPush
} from "./notificaciones-push.js";


/* =====================================================
CREAR CONTENEDOR DEL MENÚ
===================================================== */

function obtenerMenuContainer() {

    let menuContainer =
        document.getElementById("menuOTIUM");

    if (menuContainer) {

        return menuContainer;

    }

    menuContainer =
        document.createElement("div");

    menuContainer.id =
        "menuOTIUM";

    if (document.body) {

        document.body.insertBefore(
            menuContainer,
            document.body.firstChild
        );

    }

    console.log(
        "[OTIUM Menu] #menuOTIUM creado automáticamente."
    );

    return menuContainer;

}


/* =====================================================
CARGAR MENÚ OTIUM
===================================================== */

function cargarMenuOTIUM() {

    const menuContainer =
        obtenerMenuContainer();

    if (!menuContainer) {

        console.error(
            "[OTIUM Menu] No fue posible crear #menuOTIUM."
        );

        return;

    }


    /* =================================================
       EVITAR CONSTRUIR DOS VECES
    ================================================= */

    if (
        menuContainer.dataset.otiumMenuLoaded === "true"
    ) {

        configurarEventosMenu();
        configurarMenuMovil();

        document.dispatchEvent(
            new Event("menuOTIUMCargado")
        );

        return;

    }


    /* =================================================
       MENÚ HTML GLOBAL
    ================================================= */

    menuContainer.innerHTML = `

        <header class="otium-header">

            <nav class="navbar">


                <!-- =====================================
                     LOGO
                ====================================== -->

                <a
                    href="index.html"
                    class="logo-container"
                    aria-label="OTIUM - Inicio"
                >

                    <img
                        src="assets/icono.png"
                        alt="OTIUM"
                        class="header-icon"
                    >

                </a>


                <!-- =====================================
                     BOTÓN MENÚ MÓVIL
                ====================================== -->

                <button
                    id="otiumMobileMenuButton"
                    class="otium-mobile-menu-button"
                    type="button"
                    aria-label="Abrir menú"
                    aria-expanded="false"
                    aria-controls="otiumMainMenu"
                >

                    <span aria-hidden="true">☰</span>

                </button>


                <!-- =====================================
                     MENÚ PRINCIPAL
                ====================================== -->

                <ul
                    id="otiumMainMenu"
                    class="menu"
                >

                    <li>

                        <a href="eventos.html">

                            Eventos

                        </a>

                    </li>


                    <li>

                        <a href="calendar.html">

                            Calendario

                        </a>

                    </li>


                    <li>

                        <a href="map.html">

                            Mapa

                        </a>

                    </li>


                    <li>

                        <a
                            id="publishEvent"
                            href="create-event.html"
                        >

                            Publicar evento

                        </a>

                    </li>


                    <li>

                        <a
                            href="planes.html"
                            class="ads-menu-link"
                        >

                            ⭐ Planes

                        </a>

                    </li>


                    <li>

                        <a href="about.html">

                            Sobre OTIUM

                        </a>

                    </li>

                </ul>


                <!-- =====================================
                     ÁREA DERECHA
                ====================================== -->

                <div class="otium-header-right">


                    <!-- =================================
                         INTERRUPTOR PUSH
                    ================================== -->

                    <button
                        id="otiumPushButton"
                        class="otium-push-toggle"
                        type="button"
                        aria-label="Activar notificaciones"
                        title="Notificaciones"
                    >

                        <span
                            class="otium-push-icon"
                            aria-hidden="true"
                        >
                            🔔
                        </span>


                        <span
                            id="otiumPushText"
                            class="otium-push-text"
                        >
                            OFF
                        </span>

                    </button>


                    <!-- =================================
                         USUARIO
                    ================================== -->

                    <div
                        id="userPanel"
                        class="user-panel"
                    >


                        <!-- LOGIN -->

                        <button
                            id="googleLogin"
                            class="login-button"
                            type="button"
                            aria-label="Iniciar sesión con Google"
                        >

                            Iniciar sesión

                        </button>


                        <!-- USUARIO LOGUEADO -->

                        <div
                            id="userMenu"
                            class="user-menu"
                            style="display:none;"
                        >

                            <button
                                id="userDropdown"
                                class="user-dropdown"
                                type="button"
                                aria-haspopup="true"
                                aria-expanded="false"
                            >

                                <span id="userName"></span>

                                <span
                                    class="user-arrow"
                                    aria-hidden="true"
                                >
                                    ▼
                                </span>

                            </button>


                            <!-- =========================
                                 DROPDOWN USUARIO
                            ========================== -->

                            <div
                                id="dropdownMenu"
                                class="dropdown-menu"
                                role="menu"
                            >

                                <a
                                    href="profile.html"
                                    role="menuitem"
                                >
                                    👤 Mi perfil
                                </a>


                                <a
                                    href="my-events.html"
                                    role="menuitem"
                                >
                                    🎫 Mis eventos
                                </a>


                                <a
                                    href="mis-avisos.html"
                                    role="menuitem"
                                >
                                    🔔 Mis avisos
                                </a>


                                <a
                                    href="mis-recordatorios.html"
                                    role="menuitem"
                                >
                                    🗓️ Mis recordatorios
                                </a>


                                <a
                                    href="mis-entradas.html"
                                    role="menuitem"
                                >
                                    🎟️ Mis entradas
                                </a>


                                <a
                                    href="favoritos.html"
                                    role="menuitem"
                                >
                                    ❤️ Favoritos
                                </a>


                                <a
                                    href="create-event.html"
                                    role="menuitem"
                                >
                                    📢 Publicar evento
                                </a>


                                <a
                                    href="planes.html"
                                    role="menuitem"
                                >
                                    ⭐ Planes
                                </a>


                                <button
                                    id="logoutButton"
                                    type="button"
                                    role="menuitem"
                                >
                                    🚪 Cerrar sesión
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </nav>

        </header>

    `;


    /* =================================================
       ESTILOS PUSH
    ================================================= */

    agregarEstilosPush();


    /* =================================================
       MARCAR COMO CARGADO
    ================================================= */

    menuContainer.dataset.otiumMenuLoaded =
        "true";


    /* =================================================
       CONFIGURAR MENÚ
    ================================================= */

    configurarEventosMenu();


    /* =================================================
       CONFIGURAR MENÚ MÓVIL
    ================================================= */

    configurarMenuMovil();


    /* =================================================
       MARCAR PÁGINA ACTUAL
    ================================================= */

    marcarPaginaActual();


    /* =================================================
       CONFIGURAR PUSH
    ================================================= */

    configurarInterruptorPush();


    /* =================================================
       EVENTO MENÚ CARGADO
    ================================================= */

    document.dispatchEvent(
        new Event("menuOTIUMCargado")
    );


    console.log(
        "[OTIUM Menu] Menú global cargado correctamente."
    );

}


/* =====================================================
CONFIGURAR MENÚ MÓVIL
===================================================== */

function configurarMenuMovil() {

    const boton =
        document.getElementById(
            "otiumMobileMenuButton"
        );


    const menu =
        document.getElementById(
            "otiumMainMenu"
        );


    if (
        !boton ||
        !menu
    ) {

        return;

    }


    /* =================================================
       EVITAR EVENTOS DUPLICADOS
    ================================================= */

    if (
        boton.dataset.otiumMobileEvents === "true"
    ) {

        return;

    }


    /* =================================================
       FUNCIÓN ABRIR / CERRAR
    ================================================= */

    function alternarMenu() {

        const abierto =
            menu.classList.contains(
                "otium-mobile-open"
            );


        if (abierto) {

            menu.classList.remove(
                "otium-mobile-open"
            );


            boton.classList.remove(
                "otium-mobile-open"
            );


            boton.setAttribute(
                "aria-expanded",
                "false"
            );


            boton.setAttribute(
                "aria-label",
                "Abrir menú"
            );

        }

        else {

            menu.classList.add(
                "otium-mobile-open"
            );


            boton.classList.add(
                "otium-mobile-open"
            );


            boton.setAttribute(
                "aria-expanded",
                "true"
            );


            boton.setAttribute(
                "aria-label",
                "Cerrar menú"
            );

        }

    }


    /* =================================================
       CLICK BOTÓN ☰
    ================================================= */

    boton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            event.stopPropagation();

            alternarMenu();

        }
    );


    /* =================================================
       CERRAR AL SELECCIONAR UNA OPCIÓN
    ================================================= */

    menu.querySelectorAll("a").forEach(
        function(enlace) {

            enlace.addEventListener(
                "click",
                function() {

                    menu.classList.remove(
                        "otium-mobile-open"
                    );


                    boton.classList.remove(
                        "otium-mobile-open"
                    );


                    boton.setAttribute(
                        "aria-expanded",
                        "false"
                    );


                    boton.setAttribute(
                        "aria-label",
                        "Abrir menú"
                    );

                }
            );

        }
    );


    /* =================================================
       CERRAR AL HACER CLICK FUERA
    ================================================= */

    if (
        document.body.dataset.otiumMobileOutside !==
        "true"
    ) {

        document.addEventListener(
            "click",
            function(event) {

                const menuActual =
                    document.getElementById(
                        "otiumMainMenu"
                    );


                const botonActual =
                    document.getElementById(
                        "otiumMobileMenuButton"
                    );


                if (
                    !menuActual ||
                    !botonActual
                ) {

                    return;

                }


                if (
                    !menuActual.classList.contains(
                        "otium-mobile-open"
                    )
                ) {

                    return;

                }


                if (
                    !menuActual.contains(event.target) &&
                    !botonActual.contains(event.target)
                ) {

                    menuActual.classList.remove(
                        "otium-mobile-open"
                    );


                    botonActual.classList.remove(
                        "otium-mobile-open"
                    );


                    botonActual.setAttribute(
                        "aria-expanded",
                        "false"
                    );


                    botonActual.setAttribute(
                        "aria-label",
                        "Abrir menú"
                    );

                }

            }
        );


        document.body.dataset.otiumMobileOutside =
            "true";

    }


    /* =================================================
       CERRAR SI CAMBIA A ESCRITORIO
    ================================================= */

    window.addEventListener(
        "resize",
        function() {

            if (
                window.innerWidth > 768
            ) {

                menu.classList.remove(
                    "otium-mobile-open"
                );


                boton.classList.remove(
                    "otium-mobile-open"
                );


                boton.setAttribute(
                    "aria-expanded",
                    "false"
                );


                boton.setAttribute(
                    "aria-label",
                    "Abrir menú"
                );

            }

        }
    );


    boton.dataset.otiumMobileEvents =
        "true";

}


/* =====================================================
CONFIGURAR EVENTOS DEL MENÚ
===================================================== */

function configurarEventosMenu() {

    const userDropdown =
        document.getElementById(
            "userDropdown"
        );


    const dropdownMenu =
        document.getElementById(
            "dropdownMenu"
        );


    /* =================================================
       ABRIR / CERRAR MENÚ USUARIO
    ================================================= */

    if (
        userDropdown &&
        dropdownMenu
    ) {

        if (
            userDropdown.dataset.otiumEvents !== "true"
        ) {

            userDropdown.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    event.stopPropagation();


                    const abierto =
                        dropdownMenu.classList.contains(
                            "show"
                        );


                    dropdownMenu.classList.toggle(
                        "show"
                    );


                    userDropdown.setAttribute(
                        "aria-expanded",
                        abierto
                            ? "false"
                            : "true"
                    );

                }
            );


            userDropdown.dataset.otiumEvents =
                "true";

        }

    }


    /* =================================================
       CERRAR DROPDOWN USUARIO AL HACER CLICK FUERA
    ================================================= */

    if (
        document.body.dataset.otiumOutsideClick !==
        "true"
    ) {

        document.addEventListener(
            "click",
            function(event) {

                const menu =
                    document.getElementById(
                        "dropdownMenu"
                    );


                const boton =
                    document.getElementById(
                        "userDropdown"
                    );


                if (
                    !menu ||
                    !boton
                ) {

                    return;

                }


                if (
                    !menu.contains(event.target) &&
                    !boton.contains(event.target)
                ) {

                    menu.classList.remove(
                        "show"
                    );


                    boton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );


        document.body.dataset.otiumOutsideClick =
            "true";

    }


    /* =================================================
       LOGOUT
    ================================================= */

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (
        logoutButton &&
        logoutButton.dataset.otiumLogout !== "true"
    ) {

        logoutButton.addEventListener(
            "click",
            async function() {

                try {

                    if (
                        typeof window.logout ===
                        "function"
                    ) {

                        await window.logout();

                    }

                    else if (
                        auth &&
                        typeof auth.signOut ===
                        "function"
                    ) {

                        await auth.signOut();

                    }


                    const menu =
                        document.getElementById(
                            "dropdownMenu"
                        );


                    if (menu) {

                        menu.classList.remove(
                            "show"
                        );

                    }


                    const boton =
                        document.getElementById(
                            "userDropdown"
                        );


                    if (boton) {

                        boton.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }

                }

                catch (error) {

                    console.error(
                        "[OTIUM Menu] Error cerrando sesión:",
                        error
                    );

                }

            }
        );


        logoutButton.dataset.otiumLogout =
            "true";

    }


    /* =================================================
       PUBLICAR EVENTO
    ================================================= */

    const publishEvent =
        document.getElementById(
            "publishEvent"
        );


    if (
        publishEvent &&
        publishEvent.dataset.otiumPublish !== "true"
    ) {

        publishEvent.addEventListener(
            "click",
            function() {

                console.log(
                    "[OTIUM Menu] Publicar evento."
                );

            }
        );


        publishEvent.dataset.otiumPublish =
            "true";

    }

}


/* =====================================================
MARCAR PÁGINA ACTUAL
===================================================== */

function marcarPaginaActual() {

    const menuContainer =
        document.getElementById(
            "menuOTIUM"
        );


    if (!menuContainer) {

        return;

    }


    const paginaActual =
        window.location.pathname
            .split("/")
            .pop() ||
        "index.html";


    const enlaces =
        menuContainer.querySelectorAll(
            ".menu a"
        );


    enlaces.forEach(
        function(enlace) {

            const href =
                (
                    enlace.getAttribute(
                        "href"
                    ) || ""
                )
                .split("#")[0]
                .split("?")[0];


            if (
                href === paginaActual
            ) {

                enlace.classList.add(
                    "active"
                );

            }

            else {

                enlace.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =====================================================
ESTILOS PUSH
===================================================== */

function agregarEstilosPush() {

    if (
        document.getElementById(
            "otiumPushToggleStyles"
        )
    ) {

        return;

    }


    const estilos =
        document.createElement(
            "style"
        );


    estilos.id =
        "otiumPushToggleStyles";


    estilos.textContent = `

        .otium-header-right {

            display: flex;

            align-items: center;

            justify-content: flex-end;

            gap: 10px;

        }


        .otium-push-toggle {

            display: none;

            align-items: center;

            justify-content: center;

            gap: 5px;

            min-width: 58px;

            height: 36px;

            padding: 0 10px;

            border:
                1px solid
                rgba(255,255,255,.18);

            border-radius: 18px;

            background:
                rgba(255,255,255,.08);

            color:
                #ffffff;

            cursor:
                pointer;

            font-family:
                inherit;

            font-size:
                14px;

            font-weight:
                700;

            line-height:
                1;

            transition:
                background .2s ease,
                border-color .2s ease,
                transform .15s ease,
                opacity .2s ease;

        }


        .otium-push-toggle.visible {

            display: flex;

        }


        .otium-push-toggle:hover {

            transform:
                translateY(-1px);

        }


        .otium-push-toggle.enabled {

            background:
                #e8f7ed;

            border-color:
                #8bd0a5;

            color:
                #187a3d;

        }


        .otium-push-toggle.disabled {

            background:
                rgba(255,255,255,.08);

            border-color:
                rgba(255,255,255,.18);

            color:
                #ffffff;

        }


        .otium-push-toggle.denied {

            opacity:
                .55;

        }


        .otium-push-toggle.loading {

            opacity:
                .65;

            cursor:
                wait;

            pointer-events:
                none;

        }


        .otium-push-icon {

            font-size:
                17px;

            line-height:
                1;

        }


        .otium-push-text {

            font-size:
                11px;

            line-height:
                1;

        }


        .otium-push-message {

            position:
                fixed;

            left:
                50%;

            bottom:
                30px;

            transform:
                translate(-50%, 20px);

            padding:
                13px 20px;

            border-radius:
                10px;

            background:
                rgba(20, 30, 40, .95);

            color:
                #ffffff;

            font-family:
                inherit;

            font-size:
                14px;

            font-weight:
                600;

            box-shadow:
                0 8px 30px rgba(0,0,0,.25);

            opacity:
                0;

            pointer-events:
                none;

            z-index:
                99999;

            transition:
                opacity .25s ease,
                transform .25s ease;

        }


        .otium-push-message.show {

            opacity:
                1;

            transform:
                translate(-50%, 0);

        }


        .otium-push-message.success {

            background:
                #187a3d;

        }


        .otium-push-message.disabled {

            background:
                #555555;

        }


        .otium-push-message.error {

            background:
                #b42318;

        }


        @media (max-width: 700px) {

            .otium-header-right {

                gap:
                    6px;

            }


            .otium-push-toggle {

                min-width:
                    38px;

                width:
                    38px;

                height:
                    38px;

                padding:
                    0;

                border-radius:
                    50%;

            }


            .otium-push-text {

                display:
                    none;

            }


            .otium-push-message {

                left:
                    15px;

                right:
                    15px;

                bottom:
                    20px;

                transform:
                    translateY(20px);

                text-align:
                    center;

            }


            .otium-push-message.show {

                transform:
                    translateY(0);

            }

        }

    `;


    document.head.appendChild(
        estilos
    );

}


/* =====================================================
MENSAJE DE CONFIRMACIÓN PUSH
===================================================== */

function mostrarMensajePush(
    mensaje,
    tipo = "success"
) {

    let mensajeExistente =
        document.getElementById(
            "otiumPushMessage"
        );


    if (!mensajeExistente) {

        mensajeExistente =
            document.createElement(
                "div"
            );


        mensajeExistente.id =
            "otiumPushMessage";


        document.body.appendChild(
            mensajeExistente
        );

    }


    mensajeExistente.className =
        "otium-push-message " +
        tipo;


    mensajeExistente.textContent =
        mensaje;


    requestAnimationFrame(
        function() {

            mensajeExistente.classList.add(
                "show"
            );

        }
    );


    clearTimeout(
        mensajeExistente._otiumTimeout
    );


    mensajeExistente._otiumTimeout =
        setTimeout(
            function() {

                mensajeExistente.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* =====================================================
CONFIGURAR INTERRUPTOR PUSH
===================================================== */

function configurarInterruptorPush() {

    const boton =
        document.getElementById(
            "otiumPushButton"
        );


    const texto =
        document.getElementById(
            "otiumPushText"
        );


    if (
        !boton ||
        !texto
    ) {

        console.warn(
            "OTIUM: No se encontró el interruptor Push."
        );

        return;

    }


    function actualizarBoton(
        estado,
        usuario
    ) {

        if (!usuario) {

            boton.classList.remove(
                "visible",
                "enabled",
                "disabled",
                "denied",
                "loading"
            );


            boton.style.display =
                "none";


            boton.setAttribute(
                "aria-label",
                "Activar notificaciones"
            );


            boton.title =
                "Inicia sesión para activar notificaciones";


            texto.textContent =
                "OFF";


            return;

        }


        boton.classList.add(
            "visible"
        );


        boton.style.display =
            "flex";


        boton.classList.remove(
            "enabled",
            "disabled",
            "denied"
        );


        if (
            estado &&
            estado.permiso === "denied"
        ) {

            boton.classList.add(
                "disabled",
                "denied"
            );


            texto.textContent =
                "OFF";


            boton.setAttribute(
                "aria-label",
                "Notificaciones bloqueadas"
            );


            boton.title =
                "Las notificaciones están bloqueadas en este navegador";


            return;

        }


        if (
            estado &&
            estado.activo === true
        ) {

            boton.classList.add(
                "enabled"
            );


            texto.textContent =
                "ON";


            boton.setAttribute(
                "aria-label",
                "Desactivar notificaciones"
            );


            boton.title =
                "Notificaciones activadas — pulsar para desactivar";


            return;

        }


        boton.classList.add(
            "disabled"
        );


        texto.textContent =
            "OFF";


        boton.setAttribute(
            "aria-label",
            "Activar notificaciones"
        );


        boton.title =
            "Notificaciones desactivadas — pulsar para activar";

    }


    async function actualizarEstadoPush(
        usuario
    ) {

        if (!usuario) {

            actualizarBoton(
                null,
                null
            );

            return;

        }


        boton.classList.add(
            "visible"
        );


        boton.style.display =
            "flex";


        boton.classList.add(
            "loading"
        );


        texto.textContent =
            "…";


        try {

            const estado =
                await obtenerEstadoNotificacionesPush();


            actualizarBoton(
                estado,
                usuario
            );

        }

        catch (error) {

            console.warn(
                "[OTIUM Menu] No se pudo consultar estado Push:",
                error
            );


            actualizarBoton(
                {
                    activo: false,
                    permiso: "default"
                },
                usuario
            );

        }


        boton.classList.remove(
            "loading"
        );

    }


    if (
        boton.dataset.otiumPushEvents !== "true"
    ) {

        boton.addEventListener(
            "click",
            async function() {

                const usuario =
                    auth.currentUser;


                if (!usuario) {

                    actualizarBoton(
                        null,
                        null
                    );

                    return;

                }


                if (
                    boton.classList.contains(
                        "loading"
                    )
                ) {

                    return;

                }


                boton.classList.add(
                    "loading"
                );


                texto.textContent =
                    "…";


                try {

                    const estado =
                        await obtenerEstadoNotificacionesPush();


                    if (
                        estado &&
                        estado.activo === true
                    ) {

                        const resultado =
                            await desactivarNotificacionesPush();


                        if (
                            resultado === true
                        ) {

                            mostrarMensajePush(
                                "🔕 Notificaciones OTIUM desactivadas",
                                "disabled"
                            );

                        }

                        else {

                            mostrarMensajePush(
                                "No fue posible desactivar las notificaciones OTIUM.",
                                "error"
                            );

                        }

                    }

                    else {

                        const resultado =
                            await activarNotificacionesPush();


                        if (
                            resultado &&
                            resultado.ok === true
                        ) {

                            mostrarMensajePush(
                                "🔔 Notificaciones OTIUM activadas",
                                "success"
                            );

                        }

                        else if (
                            resultado &&
                            resultado.mensaje
                        ) {

                            mostrarMensajePush(
                                resultado.mensaje,
                                "error"
                            );

                        }

                    }


                    const nuevoEstado =
                        await obtenerEstadoNotificacionesPush();


                    actualizarBoton(
                        nuevoEstado,
                        usuario
                    );

                }

                catch (error) {

                    console.error(
                        "[OTIUM Menu] Error manejando Push:",
                        error
                    );


                    try {

                        const estado =
                            await obtenerEstadoNotificacionesPush();


                        actualizarBoton(
                            estado,
                            usuario
                        );

                    }

                    catch {

                        actualizarBoton(
                            {
                                activo: false,
                                permiso: "default"
                            },
                            usuario
                        );

                    }

                }


                boton.classList.remove(
                    "loading"
                );

            }
        );


        boton.dataset.otiumPushEvents =
            "true";

    }


    onAuthStateChanged(
        auth,
        async function(usuario) {

            console.log(
                "[OTIUM Menu] Estado usuario:",
                usuario
                    ? "autenticado"
                    : "no autenticado"
            );


            if (!usuario) {

                actualizarBoton(
                    null,
                    null
                );

                return;

            }


            await actualizarEstadoPush(
                usuario
            );

        }
    );

}


/* =====================================================
INICIAR MENÚ
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        cargarMenuOTIUM,
        {
            once: true
        }
    );

}

else {

    cargarMenuOTIUM();

}

