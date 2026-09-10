console.log('OTIUM 6.2 Enterprise Fusion');
import { getEvents } from "./modules/database.js";

async function loadEvents() {

    const events = await getEvents();

    const container =
        document.getElementById("eventsContainer");

    container.innerHTML = "";

    events.forEach((event) => {

        container.innerHTML += `

            <div class="event-card">

                <h3>${event.title}</h3>

                <p>${event.category}</p>

                <p>${event.city}</p>

                <p>${event.date}</p>

            </div>
        `;
    });
}

loadEvents();