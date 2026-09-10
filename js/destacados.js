import { db } from "./modules/firebase-config.js";

import {
    collection,
    getDocs,
    limit,
    query
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

let categoriaSeleccionada = "Música";

async function cargarDestacados() {

    const q = query(
        collection(db, "eventos"),
        limit(6)
    );

    const snapshot = await getDocs(q);

    let eventos = snapshot.docs.map((doc) => doc.data());

    eventos = eventos.filter(
        (evento) =>
            evento.categoria === categoriaSeleccionada
    );

    const container =
        document.getElementById(
            "destacadosContainer"
        );

    if (!container) {

        return;

    }

    container.innerHTML = "";

    eventos.forEach((evento) => {

        container.innerHTML += `

            <div class="evento-card">

                <h3>

                    ${evento.nombre}

                </h3>

                <p>

                    📅 ${evento.fecha}

                </p>

                <p>

                    📍 ${evento.ciudad}

                </p>

            </div>

        `;

    });

    actualizarBoton();

}

function actualizarBoton() {

    const boton =
        document.getElementById(
            "mostrarMas"
        );

    if (!boton) {

        return;

    }

    boton.href =
        `eventos.html?categoria=${categoriaSeleccionada}`;

    boton.textContent =
        `Ver todos los eventos de ${categoriaSeleccionada} →`;

}

document
    .querySelectorAll(
        ".category-card"
    )
    .forEach((boton) => {

        boton.addEventListener(
            "click",
            () => {

                categoriaSeleccionada =
                    boton.dataset.category;

                cargarDestacados();

            }
        );

    });

cargarDestacados();