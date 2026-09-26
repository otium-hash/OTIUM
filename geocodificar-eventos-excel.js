import { geocodificarEvento } from "./js/modules/geocoding.js";


const fileInput =
    document.getElementById("excelFile");

const processButton =
    document.getElementById("processButton");

const progress =
    document.getElementById("progress");

const status =
    document.getElementById("status");


let archivoSeleccionado = null;


/* =====================================================
   SELECCIÓN DEL EXCEL
   ===================================================== */

fileInput.addEventListener(
    "change",
    () => {

        archivoSeleccionado =
            fileInput.files?.[0] || null;

        processButton.disabled =
            !archivoSeleccionado;

        if (archivoSeleccionado) {

            status.textContent =
                `Archivo seleccionado: ${archivoSeleccionado.name}`;

        }

    }
);


/* =====================================================
   ESPERA ENTRE CONSULTAS
   ===================================================== */

function esperar(ms) {

    return new Promise(
        resolve => {
            setTimeout(resolve, ms);
        }
    );

}


/* =====================================================
   CONVERTIR A TEXTO
   ===================================================== */

function texto(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {

        return "";

    }

    return String(valor).trim();

}


/* =====================================================
   VALIDAR COORDENADA
   ===================================================== */

function numeroCoordenada(valor) {

    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : "";

}


/* =====================================================
   PROCESAR EXCEL
   ===================================================== */

processButton.addEventListener(
    "click",
    async () => {

        if (!archivoSeleccionado) {

            return;

        }


        processButton.disabled = true;

        progress.value = 0;


        try {

            status.textContent =
                "Leyendo Excel...";


            /* -----------------------------------------
               LEER ARCHIVO
               ----------------------------------------- */

            const buffer =
                await archivoSeleccionado.arrayBuffer();


            const workbook =
                XLSX.read(
                    buffer,
                    {
                        type: "array"
                    }
                );


            /* -----------------------------------------
               COMPROBAR HOJA EVENTOS
               ----------------------------------------- */

            if (
                !workbook.SheetNames.includes(
                    "Eventos"
                )
            ) {

                throw new Error(
                    'El archivo no contiene una hoja llamada "Eventos".'
                );

            }


            const hoja =
                workbook.Sheets["Eventos"];


            const filas =
                XLSX.utils.sheet_to_json(
                    hoja,
                    {
                        defval: ""
                    }
                );


            if (!filas.length) {

                throw new Error(
                    "La hoja Eventos no contiene registros."
                );

            }


            /* -----------------------------------------
               CONTADORES
               ----------------------------------------- */

            const resultados = [];

            let encontrados = 0;

            let pendientes = 0;

            let errores = 0;

            let porDireccion = 0;

            let porCiudad = 0;

            let porComuna = 0;

            let existentes = 0;


            /* -----------------------------------------
               PROCESAR CADA EVENTO
               ----------------------------------------- */

            for (
                let i = 0;
                i < filas.length;
                i++
            ) {

                const fila =
                    filas[i];


                const evento = {

                    ...fila,

                    id:
                        texto(
                            fila.id
                        ),

                    nombre:
                        texto(
                            fila.nombre
                        ),

                    region:
                        texto(
                            fila.region
                        ),

                    comuna:
                        texto(
                            fila.comuna
                        ),

                    ciudad:
                        texto(
                            fila.ciudad
                        ),

                    lugar:
                        texto(
                            fila.lugar
                        ),

                    direccion:
                        texto(
                            fila.direccion
                        )

                };


                /* -------------------------------------
                   ESTADO EN PANTALLA
                   ------------------------------------- */

                status.textContent =
                    `Procesando ${i + 1} de ${filas.length}\n\n` +
                    `${evento.nombre || "(sin nombre)"}\n` +
                    `Ciudad: ${evento.ciudad || "-"}\n` +
                    `Comuna: ${evento.comuna || "-"}\n` +
                    `Dirección: ${evento.direccion || "-"}`;


                /* -------------------------------------
                   GEOCODIFICAR
                   ------------------------------------- */

                try {

                    const resultado =
                        await geocodificarEvento(
                            evento
                        );


                    /* ---------------------------------
                       COPIA DEL REGISTRO ORIGINAL
                       --------------------------------- */

                    const filaResultado = {

                        ...fila,

                        latitude: "",

                        longitude: "",

                        geocodificacionOrigen: "",

                        geocodificacionEstado: ""

                    };


                    /* ---------------------------------
                       RESULTADO ENCONTRADO
                       --------------------------------- */

                    if (resultado) {

                        filaResultado.latitude =
                            numeroCoordenada(
                                resultado.latitude
                            );


                        filaResultado.longitude =
                            numeroCoordenada(
                                resultado.longitude
                            );


                        filaResultado.geocodificacionOrigen =
                            resultado.origen || "";


                        /* -----------------------------
                           COORDENADAS VÁLIDAS
                           ----------------------------- */

                        if (

                            filaResultado.latitude !== "" &&

                            filaResultado.longitude !== ""

                        ) {

                            filaResultado.geocodificacionEstado =
                                "OK";


                            encontrados++;


                            /* -------------------------
                               ORIGEN
                               ------------------------- */

                            if (
                                resultado.origen ===
                                "direccion"
                            ) {

                                porDireccion++;

                            }

                            else if (
                                resultado.origen ===
                                "ciudad"
                            ) {

                                porCiudad++;

                            }

                            else if (
                                resultado.origen ===
                                "comuna"
                            ) {

                                porComuna++;

                            }

                            else if (
                                resultado.origen ===
                                "existente"
                            ) {

                                existentes++;

                            }

                        }

                        else {

                            filaResultado.geocodificacionEstado =
                                "PENDIENTE";

                            pendientes++;

                        }

                    }

                    /* ---------------------------------
                       SIN RESULTADO
                       --------------------------------- */

                    else {

                        filaResultado.geocodificacionEstado =
                            "PENDIENTE";

                        pendientes++;

                    }


                    resultados.push(
                        filaResultado
                    );


                }

                catch (error) {

                    console.error(
                        "Error geocodificando evento:",
                        evento.id,
                        error
                    );


                    resultados.push({

                        ...fila,

                        latitude: "",

                        longitude: "",

                        geocodificacionOrigen: "",

                        geocodificacionEstado:
                            "ERROR"

                    });


                    errores++;

                }


                /* -------------------------------------
                   PROGRESO
                   ------------------------------------- */

                progress.value =
                    (
                        (i + 1) /
                        filas.length
                    ) *
                    100;


                /* -------------------------------------
                   PAUSA
                   ------------------------------------- */

                await esperar(
                    600
                );

            }


            /* =================================================
               CREAR NUEVO EXCEL
               ================================================= */

            const nuevoWorkbook =
                XLSX.utils.book_new();


            /* -----------------------------------------
               HOJA EVENTOS
               ----------------------------------------- */

            const nuevaHoja =
                XLSX.utils.json_to_sheet(
                    resultados
                );


            XLSX.utils.book_append_sheet(
                nuevoWorkbook,
                nuevaHoja,
                "Eventos"
            );


            /* -----------------------------------------
               HOJA RESUMEN
               ----------------------------------------- */

            const resumen = [

                {
                    indicador:
                        "Total eventos",

                    valor:
                        filas.length

                },

                {
                    indicador:
                        "Con coordenadas",

                    valor:
                        encontrados

                },

                {
                    indicador:
                        "Pendientes",

                    valor:
                        pendientes

                },

                {
                    indicador:
                        "Errores",

                    valor:
                        errores

                },

                {
                    indicador:
                        "Por dirección",

                    valor:
                        porDireccion

                },

                {
                    indicador:
                        "Por ciudad",

                    valor:
                        porCiudad

                },

                {
                    indicador:
                        "Por comuna",

                    valor:
                        porComuna

                },

                {
                    indicador:
                        "Coordenadas existentes",

                    valor:
                        existentes

                }

            ];


            const hojaResumen =
                XLSX.utils.json_to_sheet(
                    resumen
                );


            XLSX.utils.book_append_sheet(
                nuevoWorkbook,
                hojaResumen,
                "Resumen"
            );


            /* =================================================
               NOMBRE DEL ARCHIVO
               ================================================= */

            const nombreSalida =
                archivoSeleccionado.name
                    .replace(
                        /\.xlsx?$/i,
                        ""
                    ) +
                "_GEO.xlsx";


            /* =================================================
               DESCARGAR
               ================================================= */

            XLSX.writeFile(
                nuevoWorkbook,
                nombreSalida
            );


            /* =================================================
               RESULTADO FINAL
               ================================================= */

            status.innerHTML =

                `<span class="ok">PROCESO TERMINADO</span>\n\n` +

                `Total: ${filas.length}\n` +

                `Con coordenadas: ${encontrados}\n` +

                `Pendientes: ${pendientes}\n` +

                `Errores: ${errores}\n\n` +

                `Por dirección: ${porDireccion}\n` +

                `Por ciudad: ${porCiudad}\n` +

                `Por comuna: ${porComuna}\n` +

                `Coordenadas existentes: ${existentes}\n\n` +

                `Se descargó:\n${nombreSalida}\n\n` +

                `No se modificó Firestore.`;

        }


        catch (error) {

            console.error(
                error
            );


            status.innerHTML =

                `<span class="error">ERROR</span>\n\n` +

                error.message;

        }


        finally {

            processButton.disabled =
                false;

        }

    }
);