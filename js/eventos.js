/* =====================================================
   OTIUM - EVENTOS
   Cargar, buscar, filtrar y abrir detalles

   ESTRUCTURA NUEVA:

   Tipo de evento
      Público / Privado

   Categoría
      Categoría principal

   Subcategoría
      Según categoría

   Acceso
      Gratis / Con costo

   FECHAS:
      fechaInicio
      fechaTermino

   Compatibilidad:
      Campos nuevos + campos antiguos.

   VERSIÓN:
      2026-09-13
===================================================== */

import {
    getEvents
} from "./modules/database.js";


/* =====================================================
   IMAGEN POR DEFECTO
===================================================== */

const DEFAULT_EVENT_IMAGE =
    "data/otium-default-event.png";


/* =====================================================
   ELEMENTOS
===================================================== */

const container =
    document.getElementById("eventosContainer");

const searchInput =
    document.getElementById("search");

const categoryFilter =
    document.getElementById("categoryFilter");

const subcategoryFilter =
    document.getElementById("subcategoryFilter");

const dateFilter =
    document.getElementById("dateFilter");

const cityFilter =
    document.getElementById("cityFilter");

const priceFilter =
    document.getElementById("priceFilter");

const sortFilter =
    document.getElementById("sortFilter");

const ticketsFilter =
    document.getElementById("ticketsFilter");

const featuredFilter =
    document.getElementById("featuredFilter");

const publicFilter =
    document.getElementById("publicFilter");

const privateFilter =
    document.getElementById("privateFilter");

const clearFiltersButton =
    document.getElementById("clearFilters");

const resultadoInfo =
    document.getElementById("eventosResultadoInfo");


/* =====================================================
   VARIABLES
===================================================== */

let eventos = [];


/* =====================================================
   PARÁMETROS URL
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const categoriaURL =
    params.get("categoria");

const subcategoriaURL =
    params.get("subcategoria");

const busquedaURL =
    params.get("buscar");


/* =====================================================
   CATEGORÍAS Y SUBCATEGORÍAS
===================================================== */

const SUBCATEGORIAS = {

    "Música": [
        "Concierto",
        "Festival musical",
        "Recital",
        "Tributo",
        "DJ",
        "Música en vivo",
        "Orquesta",
        "Banda",
        "Solista",
        "Otro"
    ],

    "Teatro": [
        "Obra de teatro",
        "Musical",
        "Comedia",
        "Drama",
        "Infantil",
        "Teatro experimental",
        "Otro"
    ],

    "Danza": [
        "Ballet",
        "Danza contemporánea",
        "Danza urbana",
        "Danza folclórica",
        "Danza moderna",
        "Otro"
    ],

    "Cine": [
        "Película",
        "Estreno",
        "Festival de cine",
        "Cine al aire libre",
        "Cine familiar",
        "Documental",
        "Otro"
    ],

    "Arte": [
        "Exposición",
        "Galería",
        "Pintura",
        "Escultura",
        "Fotografía",
        "Arte digital",
        "Instalación",
        "Otro"
    ],

    "Cultura": [
        "Charla",
        "Encuentro cultural",
        "Patrimonio",
        "Literatura",
        "Folclore",
        "Historia",
        "Tradiciones",
        "Otro"
    ],

    "Deportes": [
        "Competencia",
        "Torneo",
        "Partido",
        "Carrera",
        "Maratón",
        "Ciclismo",
        "Entrenamiento",
        "Actividad deportiva",
        "Otro"
    ],

    "Fiestas y celebraciones": [
        "Cumpleaños",
        "Aniversario",
        "Celebración",
        "Fiesta",
        "Fiesta familiar",
        "Fiesta privada",
        "Matrimonio",
        "Bautizo",
        "Graduación",
        "Baby shower",
        "Despedida",
        "Reunión familiar",
        "Otro"
    ],

    "Vida nocturna": [
        "Fiesta",
        "Club",
        "DJ",
        "Bar",
        "Pub",
        "Show nocturno",
        "Noche temática",
        "Otro"
    ],

    "Gastronomía": [
        "Festival gastronómico",
        "Feria gastronómica",
        "Cata",
        "Degustación",
        "Cena",
        "Almuerzo",
        "Clase de cocina",
        "Experiencia gastronómica",
        "Otro"
    ],

    "Familiar": [
        "Actividad infantil",
        "Panorama familiar",
        "Parque",
        "Juegos",
        "Celebración familiar",
        "Actividad recreativa",
        "Otro"
    ],

    "Ferias y mercados": [
        "Feria artesanal",
        "Feria comercial",
        "Feria gastronómica",
        "Feria de emprendimiento",
        "Mercado",
        "Feria de productos",
        "Otro"
    ],

    "Negocios y empresas": [
        "Congreso",
        "Convención",
        "Seminario",
        "Simposio",
        "Foro",
        "Conferencia",
        "Networking",
        "Lanzamiento",
        "Reunión",
        "Evento empresarial",
        "Otro"
    ],

    "Educación y formación": [
        "Curso",
        "Taller",
        "Capacitación",
        "Seminario",
        "Conferencia",
        "Charla",
        "Diplomado",
        "Clase",
        "Otro"
    ],

    "Comunidad": [
        "Encuentro comunitario",
        "Actividad social",
        "Actividad vecinal",
        "Reunión",
        "Celebración",
        "Voluntariado",
        "Actividad comunitaria",
        "Otro"
    ],

    "Institucional": [
        "Ceremonia",
        "Celebración",
        "Conferencia",
        "Acto oficial",
        "Evento institucional",
        "Aniversario institucional",
        "Otro"
    ],

    "Otros": [
        "Actividad",
        "Celebración",
        "Reunión",
        "Evento especial",
        "Otro"
    ]

};


/* =====================================================
   COMPATIBILIDAD CON CATEGORÍAS ANTIGUAS
===================================================== */

const CATEGORIAS_ANTIGUAS = {

    "Fiestas":
        "Fiestas y celebraciones",

    "Familia":
        "Familiar",

    "Ferias":
        "Ferias y mercados",

    "Evento empresarial":
        "Negocios y empresas",

    "Evento institucional":
        "Institucional",

    "Evento comunitario":
        "Comunidad",

    "Congreso":
        "Negocios y empresas",

    "Convención":
        "Negocios y empresas",

    "Seminario":
        "Educación y formación",

    "Simposio":
        "Negocios y empresas",

    "Foro":
        "Negocios y empresas",

    "Taller":
        "Educación y formación",

    "Conferencia":
        "Educación y formación",

    "Curso":
        "Educación y formación",

    "Capacitación":
        "Educación y formación",

    "Charla":
        "Educación y formación",

    "Networking":
        "Negocios y empresas",

    "Lanzamiento":
        "Negocios y empresas",

    "Exposición":
        "Arte",

    "Encuentro":
        "Comunidad",

    "Festival":
        "Música",

    "Concierto":
        "Música",

    "Competencia":
        "Deportes",

    "Evento particular":
        "Fiestas y celebraciones"

};


/* =====================================================
   OBTENER TÍTULO
===================================================== */

function obtenerTitulo(evento) {

    return (
        evento.title ||
        evento.nombre ||
        evento.nombreEvento ||
        ""
    );

}


/* =====================================================
   OBTENER CATEGORÍA
===================================================== */

function obtenerCategoriaOriginal(evento) {

    return (
        evento.category ||
        evento.categoria ||
        ""
    );

}


function normalizarCategoria(categoria) {

    const texto =
        String(categoria || "")
            .trim();

    return (
        CATEGORIAS_ANTIGUAS[texto] ||
        texto
    );

}


function obtenerCategoria(evento) {

    return normalizarCategoria(
        obtenerCategoriaOriginal(evento)
    );

}


/* =====================================================
   OBTENER SUBCATEGORÍA
===================================================== */

function obtenerSubcategoria(evento) {

    return (
        evento.subcategory ||
        evento.subcategoria ||
        evento.tipoActividad ||
        evento.tipoEventoDetalle ||
        evento.subTipoEvento ||
        ""
    );

}


/* =====================================================
   OBTENER TIPO EVENTO
===================================================== */

function obtenerTipoEvento(evento) {

    return (
        evento.eventType ||
        evento.tipoEvento ||
        evento.tipo ||
        evento.visibilidad ||
        ""
    );

}


/* =====================================================
   OBTENER FECHA DE INICIO
===================================================== */

function obtenerFechaInicio(evento) {

    return (
        evento.fechaInicio ||
        evento.date ||
        evento.fecha ||
        evento.fechaEvento ||
        ""
    );

}


/* =====================================================
   OBTENER FECHA DE TÉRMINO
===================================================== */

function obtenerFechaTermino(evento) {

    return (
        evento.fechaTermino ||
        evento.fechaFin ||
        evento.endDate ||
        obtenerFechaInicio(evento)
    );

}


/* =====================================================
   OBTENER FECHA PARA MOSTRAR
===================================================== */

function obtenerFecha(evento) {

    return obtenerFechaInicio(evento);

}


/* =====================================================
   OBTENER HORA
===================================================== */

function obtenerHora(evento) {

    return (
        evento.time ||
        evento.hora ||
        evento.horaEvento ||
        evento.horaInicio ||
        ""
    );

}


/* =====================================================
   OBTENER HORA DE TÉRMINO
===================================================== */

function obtenerHoraTermino(evento) {

    return (
        evento.horaTermino ||
        evento.horaFin ||
        evento.endTime ||
        ""
    );

}


/* =====================================================
   OBTENER CIUDAD
===================================================== */

function obtenerCiudad(evento) {

    return (
        evento.city ||
        evento.ciudad ||
        ""
    );

}


/* =====================================================
   OBTENER DIRECCIÓN
===================================================== */

function obtenerDireccion(evento) {

    return (
        evento.address ||
        evento.direccion ||
        evento.ubicacion ||
        ""
    );

}


/* =====================================================
   OBTENER PRECIO
===================================================== */

function obtenerPrecio(evento) {

    return (
        evento.price ??
        evento.precio ??
        ""
    );

}


/* =====================================================
   ENTRADAS
===================================================== */

function tieneEntrada(evento) {

    const tickets =
        evento.tickets ??
        evento.entradasDisponibles ??
        evento.entradas ??
        "";

    const link =
        evento.eventLink ||
        evento.link ||
        evento.url ||
        evento.ticketUrl ||
        evento.linkEntradas ||
        "";

    return (
        tickets !== "" ||
        link !== ""
    );

}


/* =====================================================
   DESTACADO
===================================================== */

function esDestacado(evento) {

    return (
        evento.featured === true ||
        evento.destacado === true ||
        evento.esDestacado === true
    );

}


/* =====================================================
   GRATIS
===================================================== */

function esGratis(evento) {

    if (
        evento.freeEntry === true ||
        evento.gratis === true ||
        evento.entradaGratis === true ||
        evento.esGratis === true
    ) {

        return true;

    }


    const precio =
        obtenerPrecio(evento);


    if (
        precio === null ||
        precio === undefined ||
        precio === ""
    ) {

        return false;

    }


    const texto =
        String(precio)
            .toLowerCase()
            .trim();


    return (
        texto === "gratis" ||
        texto === "gratuito" ||
        texto === "entrada liberada" ||
        texto === "$0" ||
        texto === "0"
    );

}


/* =====================================================
   PÚBLICO
===================================================== */

function esPublico(evento) {

    const tipo =
        obtenerTipoEvento(evento)
            .toLowerCase()
            .trim();


    return (
        tipo === "publico" ||
        tipo === "público" ||
        tipo === "public"
    );

}


/* =====================================================
   PRIVADO
===================================================== */

function esParticular(evento) {

    const tipo =
        obtenerTipoEvento(evento)
            .toLowerCase()
            .trim();


    return (
        tipo === "particular" ||
        tipo === "privado" ||
        tipo === "private"
    );

}


/* =====================================================
   FECHA LOCAL
===================================================== */

/**
 * Convierte YYYY-MM-DD a fecha local sin problemas
 * de zona horaria.
 */
function obtenerFechaLocal(fecha) {

    if (!fecha) {

        return null;

    }


    const texto =
        String(fecha).trim();


    const partes =
        texto.split("-");


    if (partes.length !== 3) {

        return null;

    }


    const anio =
        Number(partes[0]);

    const mes =
        Number(partes[1]);

    const dia =
        Number(partes[2]);


    if (
        !anio ||
        !mes ||
        !dia
    ) {

        return null;

    }


    const fechaLocal =
        new Date(
            anio,
            mes - 1,
            dia
        );


    fechaLocal.setHours(
        0,
        0,
        0,
        0
    );


    return fechaLocal;

}


/* =====================================================
   FECHA PARA ORDENAR
===================================================== */

function obtenerFechaOrden(evento) {

    return (
        obtenerFechaLocal(
            obtenerFechaInicio(evento)
        ) ||
        new Date(9999, 11, 31)
    );

}


/* =====================================================
   EVENTO OCURRE EN RANGO DE FECHAS
===================================================== */

/**
 * Comprueba si un evento está activo en una fecha.
 *
 * Esto permite trabajar correctamente con eventos:
 *
 * fechaInicio: 2026-09-18
 * fechaTermino: 2026-09-20
 *
 * El evento será considerado activo los días:
 *
 * 18, 19 y 20.
 */
function eventoIncluyeFecha(
    evento,
    fechaObjetivo
) {

    const inicio =
        obtenerFechaLocal(
            obtenerFechaInicio(evento)
        );

    const termino =
        obtenerFechaLocal(
            obtenerFechaTermino(evento)
        );


    if (!inicio) {

        return false;

    }


    if (!termino) {

        return (
            inicio.getTime() ===
            fechaObjetivo.getTime()
        );

    }


    return (
        inicio <= fechaObjetivo &&
        termino >= fechaObjetivo
    );

}


/* =====================================================
   FILTRO FECHA
===================================================== */

function cumpleFiltroFecha(evento) {

    if (!dateFilter) {

        return true;

    }


    const filtro =
        dateFilter.value;


    /*
       Si no existe filtro seleccionado,
       no se elimina ningún evento.
    */

    if (!filtro) {

        return true;

    }


    const fechaInicio =
        obtenerFechaLocal(
            obtenerFechaInicio(evento)
        );


    const fechaTermino =
        obtenerFechaLocal(
            obtenerFechaTermino(evento)
        );


    /*
       Si el evento no tiene fecha válida,
       solamente se excluye cuando realmente
       estamos aplicando un filtro de fecha.
    */

    if (!fechaInicio) {

        return false;

    }


    const hoy =
        new Date();


    hoy.setHours(
        0,
        0,
        0,
        0
    );


    const manana =
        new Date(hoy);


    manana.setDate(
        manana.getDate() + 1
    );


    /* =================================================
       HOY
    ================================================= */

    if (filtro === "hoy") {

        return eventoIncluyeFecha(
            evento,
            hoy
        );

    }


    /* =================================================
       MAÑANA
    ================================================= */

    if (filtro === "manana") {

        return eventoIncluyeFecha(
            evento,
            manana
        );

    }


    /* =================================================
       PRÓXIMOS 7 DÍAS
    ================================================= */

    if (
        filtro === "7_dias" ||
        filtro === "proximos_7_dias"
    ) {

        const limite =
            new Date(hoy);


        limite.setDate(
            limite.getDate() + 7
        );


        const terminoReal =
            fechaTermino ||
            fechaInicio;


        return (
            fechaInicio <= limite &&
            terminoReal >= hoy
        );

    }


    /* =================================================
       FIN DE SEMANA
    ================================================= */

    if (filtro === "fin_semana") {

        const diaSemana =
            hoy.getDay();


        const diasHastaSabado =
            (6 - diaSemana + 7) % 7;


        const sabado =
            new Date(hoy);


        sabado.setDate(
            hoy.getDate() +
            diasHastaSabado
        );


        const domingo =
            new Date(sabado);


        domingo.setDate(
            sabado.getDate() + 1
        );


        const terminoReal =
            fechaTermino ||
            fechaInicio;


        return (
            fechaInicio <= domingo &&
            terminoReal >= sabado
        );

    }


    /*
       Compatibilidad con otros valores de
       dateFilter que puedan existir.
    */

    return true;

}


/* =====================================================
   CARGAR EVENTOS
===================================================== */

async function cargarEventos() {

    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="sin-eventos">

            Cargando eventos...

        </div>

    `;


    try {

        eventos =
            await getEvents();


        if (!Array.isArray(eventos)) {

            eventos = [];

        }


        console.log(
            "OTIUM - Eventos cargados desde Firestore:",
            eventos.length
        );


        console.table(
            eventos.map(
                evento => ({
                    id:
                        evento.firestoreId ||
                        evento.id,

                    nombre:
                        obtenerTitulo(evento),

                    fechaInicio:
                        obtenerFechaInicio(evento),

                    fechaTermino:
                        obtenerFechaTermino(evento),

                    ciudad:
                        obtenerCiudad(evento),

                    imagen:
                        evento.imagen || ""

                })
            )
        );


        if (
            categoriaURL &&
            categoryFilter
        ) {

            const categoriaNormalizada =
                normalizarCategoria(
                    categoriaURL
                );


            categoryFilter.value =
                categoriaNormalizada;

        }


        if (
            busquedaURL &&
            searchInput
        ) {

            searchInput.value =
                busquedaURL;

        }


        actualizarSubcategorias();


        if (
            subcategoriaURL &&
            subcategoryFilter
        ) {

            subcategoryFilter.value =
                subcategoriaURL;

        }


        aplicarFiltros();


    } catch (error) {

        console.error(
            "OTIUM - Error cargando eventos:",
            error
        );


        container.innerHTML = `

            <div class="sin-eventos">

                <h3>
                    No fue posible cargar los eventos.
                </h3>

                <p>
                    Revisa la conexión con Firebase.
                </p>

            </div>

        `;

    }

}


/* =====================================================
   ACTUALIZAR SUBCATEGORÍAS
===================================================== */

function actualizarSubcategorias() {

    if (!subcategoryFilter) {

        return;

    }


    const categoria =
        categoryFilter
            ? categoryFilter.value
            : "";


    subcategoryFilter.innerHTML = `

        <option value="">
            Todas las subcategorías
        </option>

    `;


    if (
        !categoria ||
        !SUBCATEGORIAS[categoria]
    ) {

        return;

    }


    SUBCATEGORIAS[categoria]
        .forEach(
            (subcategoria) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    subcategoria;


                option.textContent =
                    subcategoria;


                subcategoryFilter
                    .appendChild(option);

            }
        );

}


/* =====================================================
   APLICAR FILTROS
===================================================== */

function aplicarFiltros() {

    if (!container) {

        return;

    }


    const texto =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const categoria =
        categoryFilter
            ? categoryFilter.value
            : "";


    const subcategoria =
        subcategoryFilter
            ? subcategoryFilter.value
            : "";


    const ciudad =
        cityFilter
            ? cityFilter.value
                .toLowerCase()
                .trim()
            : "";


    const precio =
        priceFilter
            ? priceFilter.value
            : "";


    let filtrados =
        [...eventos];


    /* =================================================
       BÚSQUEDA
    ================================================= */

    if (texto) {

        filtrados =
            filtrados.filter(
                (evento) => {

                    const contenido = [

                        obtenerTitulo(evento),

                        obtenerCategoria(evento),

                        obtenerSubcategoria(evento),

                        obtenerCiudad(evento),

                        obtenerDireccion(evento),

                        evento.description ||
                        evento.descripcion ||
                        "",

                        obtenerPrecio(evento)

                    ]
                        .join(" ")
                        .toLowerCase();


                    return contenido.includes(
                        texto
                    );

                }
            );

    }


    /* =================================================
       CATEGORÍA
    ================================================= */

    if (categoria) {

        filtrados =
            filtrados.filter(
                (evento) => {

                    return (
                        obtenerCategoria(evento)
                            .toLowerCase()
                            .trim()
                        ===
                        categoria
                            .toLowerCase()
                            .trim()
                    );

                }
            );

    }


    /* =================================================
       SUBCATEGORÍA
    ================================================= */

    if (subcategoria) {

        filtrados =
            filtrados.filter(
                (evento) => {

                    return (
                        obtenerSubcategoria(evento)
                            .toLowerCase()
                            .trim()
                        ===
                        subcategoria
                            .toLowerCase()
                            .trim()
                    );

                }
            );

    }


    /* =================================================
       CIUDAD
    ================================================= */

    if (ciudad) {

        filtrados =
            filtrados.filter(
                (evento) => {

                    return obtenerCiudad(evento)
                        .toLowerCase()
                        .includes(ciudad);

                }
            );

    }


    /* =================================================
       FECHA
    ================================================= */

    filtrados =
        filtrados.filter(
            cumpleFiltroFecha
        );


    /* =================================================
       PRECIO
    ================================================= */

    if (precio === "gratis") {

        filtrados =
            filtrados.filter(
                esGratis
            );

    }


    if (precio === "costo") {

        filtrados =
            filtrados.filter(
                (evento) =>
                    !esGratis(evento)
            );

    }


    /* =================================================
       ENTRADAS
    ================================================= */

    if (
        ticketsFilter &&
        ticketsFilter.checked
    ) {

        filtrados =
            filtrados.filter(
                tieneEntrada
            );

    }


    /* =================================================
       DESTACADOS
    ================================================= */

    if (
        featuredFilter &&
        featuredFilter.checked
    ) {

        filtrados =
            filtrados.filter(
                esDestacado
            );

    }


    /* =================================================
       PÚBLICOS
    ================================================= */

    if (
        publicFilter &&
        publicFilter.checked
    ) {

        filtrados =
            filtrados.filter(
                esPublico
            );

    }


    /* =================================================
       PRIVADOS
    ================================================= */

    if (
        privateFilter &&
        privateFilter.checked
    ) {

        filtrados =
            filtrados.filter(
                esParticular
            );

    }


    /* =================================================
       ORDEN
    ================================================= */

    if (
        sortFilter &&
        sortFilter.value === "recientes"
    ) {

        filtrados.sort(
            (a, b) => {

                return (
                    obtenerFechaOrden(b) -
                    obtenerFechaOrden(a)
                );

            }
        );

    } else {

        filtrados.sort(
            (a, b) => {

                return (
                    obtenerFechaOrden(a) -
                    obtenerFechaOrden(b)
                );

            }
        );

    }


    /* =================================================
       CONTADOR
    ================================================= */

    if (resultadoInfo) {

        resultadoInfo.textContent =
            `${filtrados.length} evento${
                filtrados.length === 1
                    ? ""
                    : "s"
            } encontrado${
                filtrados.length === 1
                    ? ""
                    : "s"
            }`;

    }


    console.log(
        "OTIUM - Eventos después de filtros:",
        filtrados.length
    );


    renderizar(
        filtrados
    );

}


/* =====================================================
   VALIDAR URL DE IMAGEN
===================================================== */

/**
 * Evita que textos como:
 *
 * Chile es TUYO / agenda de eventos
 *
 * sean utilizados como src de una imagen.
 *
 * Acepta:
 * - https://
 * - http://
 * - rutas relativas
 * - data:
 *
 * Rechaza texto libre que claramente no corresponde
 * a una dirección de imagen.
 */
function obtenerImagenEvento(evento) {

    const posibles = [

        evento.imagen,

        evento.imagenUrl,

        evento.imageUrl,

        evento.fotoUrl

    ];


    for (
        const valor of posibles
    ) {

        if (
            valor === undefined ||
            valor === null
        ) {

            continue;

        }


        const texto =
            String(valor).trim();


        if (!texto) {

            continue;

        }


        /*
           URL absoluta.
        */

        if (
            texto.startsWith(
                "https://"
            ) ||
            texto.startsWith(
                "http://"
            )
        ) {

            return texto;

        }


        /*
           Data URI.
        */

        if (
            texto.startsWith(
                "data:image/"
            )
        ) {

            return texto;

        }


        /*
           Ruta relativa válida.
           
           Evitamos aceptar frases con espacios,
           como "Chile es TUYO / agenda de eventos".
        */

        if (
            !texto.includes(" ") &&
            (
                texto.startsWith("/") ||
                texto.startsWith("./") ||
                texto.startsWith("../")
            )
        ) {

            return texto;

        }

    }


    return DEFAULT_EVENT_IMAGE;

}


/* =====================================================
   RENDERIZAR
===================================================== */

function renderizar(lista) {

    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (
        !lista ||
        lista.length === 0
    ) {

        container.innerHTML = `

            <div class="sin-eventos">

                <h3>
                    No se encontraron eventos.
                </h3>

                <p>
                    Prueba modificando los filtros.
                </p>

            </div>

        `;

        return;

    }


    lista.forEach(
        (evento) => {

            const firestoreId =
                evento.firestoreId ||
                evento.id ||
                "";


            if (!firestoreId) {

                return;

            }


            const titulo =
                obtenerTitulo(evento) ||
                "Sin título";


            const fechaInicio =
                obtenerFechaInicio(evento) ||
                "Sin fecha";


            const fechaTermino =
                obtenerFechaTermino(evento);


            const hora =
                obtenerHora(evento);


            const horaTermino =
                obtenerHoraTermino(evento);


            const ciudad =
                obtenerCiudad(evento) ||
                "Sin ciudad";


            const categoria =
                obtenerCategoria(evento) ||
                "Sin categoría";


            const subcategoria =
                obtenerSubcategoria(evento);


            const direccion =
                obtenerDireccion(evento);


            const precio =
                obtenerPrecio(evento);


            /* ------------------------------------------------
               IMAGEN
            ------------------------------------------------ */

            const imagenEvento =
                obtenerImagenEvento(
                    evento
                );


            const tieneImagenReal =
                imagenEvento !==
                DEFAULT_EVENT_IMAGE;


            /* ------------------------------------------------
               CARD
            ------------------------------------------------ */

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "evento-card";


            card.dataset.eventId =
                firestoreId;


            /* =================================================
               FECHA A MOSTRAR
            ================================================= */

            let textoFecha =
                fechaInicio;


            if (
                fechaTermino &&
                fechaTermino !== fechaInicio
            ) {

                textoFecha =
                    `${fechaInicio} al ${fechaTermino}`;

            }


            /* =================================================
               HORA A MOSTRAR
            ================================================= */

            let textoHora =
                hora;


            if (
                horaTermino &&
                horaTermino !== hora
            ) {

                textoHora =
                    `${hora} - ${horaTermino}`;

            }


            card.innerHTML = `

                <div class="evento-imagen">

                    <img
                        src="${escapeHTML(
                            imagenEvento
                        )}"
                        alt="${escapeHTML(
                            titulo
                        )}"
                        class="evento-imagen-img${
                            !tieneImagenReal
                                ? " default-event-image"
                                : ""
                        }"
                        loading="lazy">

                </div>


                <h3>
                    ${escapeHTML(
                        titulo
                    )}
                </h3>


                <p>
                    📅 ${escapeHTML(
                        textoFecha
                    )}
                </p>


                ${
                    textoHora
                        ? `
                            <p>
                                🕐 ${escapeHTML(
                                    textoHora
                                )}
                            </p>
                          `
                        : ""
                }


                <p>
                    📍 ${escapeHTML(
                        ciudad
                    )}
                </p>


                <p>
                    🎭 ${escapeHTML(
                        categoria
                    )}
                </p>


                ${
                    subcategoria
                        ? `
                            <p>
                                ▫️ ${escapeHTML(
                                    subcategoria
                                )}
                            </p>
                          `
                        : ""
                }


                ${
                    direccion
                        ? `
                            <p>
                                🏠 ${escapeHTML(
                                    direccion
                                )}
                            </p>
                          `
                        : ""
                }


                <p>
                    ${
                        esGratis(evento)
                            ? "🆓 Gratis"
                            : precio !== ""
                                ? `💲 ${escapeHTML(
                                    String(precio)
                                  )}`
                                : "💲 Consultar precio"
                    }
                </p>


                ${
                    esDestacado(evento)
                        ? `
                            <p>
                                ⭐ Destacado
                            </p>
                          `
                        : ""
                }


                ${
                    esPublico(evento)
                        ? `
                            <p>
                                👥 Público
                            </p>
                          `
                        : ""
                }


                ${
                    esParticular(evento)
                        ? `
                            <p>
                                🔒 Privado
                            </p>
                          `
                        : ""
                }


                <a
                    href="event-details.html?id=${encodeURIComponent(
                        firestoreId
                    )}"
                    class="btn-mostrar-mas"
                    data-event-id="${escapeHTML(
                        firestoreId
                    )}">

                    Ver detalles

                </a>

            `;


            /* =================================================
               FALLBACK DE IMAGEN
               
               Si una URL aparentemente válida responde
               con error, se utiliza la imagen por defecto.
            ================================================= */

            const img =
                card.querySelector(
                    "img.evento-imagen-img"
                );


            if (img) {

                img.addEventListener(
                    "error",
                    () => {

                        img.onerror = null;

                        img.src =
                            DEFAULT_EVENT_IMAGE;

                        img.classList.add(
                            "default-event-image"
                        );

                    }
                );

            }


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   EVENTOS DE FILTROS
===================================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        aplicarFiltros
    );

}


if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        () => {

            actualizarSubcategorias();

            aplicarFiltros();

        }
    );

}


if (subcategoryFilter) {

    subcategoryFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (cityFilter) {

    cityFilter.addEventListener(
        "input",
        aplicarFiltros
    );

}


if (priceFilter) {

    priceFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (ticketsFilter) {

    ticketsFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (featuredFilter) {

    featuredFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (publicFilter) {

    publicFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (privateFilter) {

    privateFilter.addEventListener(
        "change",
        aplicarFiltros
    );

}


/* =====================================================
   LIMPIAR FILTROS
===================================================== */

if (clearFiltersButton) {

    clearFiltersButton.addEventListener(
        "click",
        () => {

            if (searchInput) {

                searchInput.value = "";

            }


            if (categoryFilter) {

                categoryFilter.value = "";

            }


            actualizarSubcategorias();


            if (subcategoryFilter) {

                subcategoryFilter.value = "";

            }


            if (dateFilter) {

                dateFilter.value = "";

            }


            if (cityFilter) {

                cityFilter.value = "";

            }


            if (priceFilter) {

                priceFilter.value = "";

            }


            if (sortFilter) {

                sortFilter.value =
                    "proximos";

            }


            if (ticketsFilter) {

                ticketsFilter.checked =
                    false;

            }


            if (featuredFilter) {

                featuredFilter.checked =
                    false;

            }


            if (publicFilter) {

                publicFilter.checked =
                    false;

            }


            if (privateFilter) {

                privateFilter.checked =
                    false;

            }


            aplicarFiltros();

        }
    );

}


/* =====================================================
   INICIAR
===================================================== */

cargarEventos();