import { getEvents } from "./modules/database.js";

let eventos = [];

async function cargarEventos() {

    try {

        eventos = await getEvents();

    } catch (error) {

        console.error(
            "Error al cargar los eventos:",
            error
        );

    }

}

function buscarEventos() {

    const texto =
        document
            .getElementById(
                "searchInput"
            )
            ?.value
            .trim();

    if (!texto) {

        return;

    }

    window.location.href =
        "eventos.html?buscar=" +
        encodeURIComponent(
            texto
        );

}

function seleccionarCategoria(
    categoria
) {

    window.location.href =
        "eventos.html?categoria=" +
        encodeURIComponent(
            categoria
        );

}

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await cargarEventos();

        const searchButton =
            document.getElementById(
                "searchButton"
            );

        if (searchButton) {

            searchButton.addEventListener(
                "click",
                buscarEventos
            );

        }

        const searchInput =
            document.getElementById(
                "searchInput"
            );

        if (searchInput) {

            searchInput.addEventListener(
                "keypress",
                (event) => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        buscarEventos();

                    }

                }
            );

        }

        document
            .querySelectorAll(
                ".category-card"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            seleccionarCategoria(
                                button.dataset
                                    .category
                            );

                        }
                    );

                }
            );

    }
);