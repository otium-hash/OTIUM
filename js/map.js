import {
    getEvents
} from "./modules/database.js";

const map =
    L.map("map");

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            "© OpenStreetMap"
    }
).addTo(map);

navigator.geolocation.getCurrentPosition(

    async (position) => {

        const userLatitude =
            position.coords.latitude;

        const userLongitude =
            position.coords.longitude;

        map.setView(
            [
                userLatitude,
                userLongitude
            ],
            12
        );

        L.marker(
            [
                userLatitude,
                userLongitude
            ]
        )
            .addTo(map)
            .bindPopup(
                "Tu ubicación"
            );

        const events =
            await getEvents();

        events.forEach(
            (event) => {

                if (
                    !event.latitude ||
                    !event.longitude
                ) {

                    return;

                }

                L.marker(
                    [
                        parseFloat(
                            event.latitude
                        ),
                        parseFloat(
                            event.longitude
                        )
                    ]
                )
                    .addTo(map)
                    .bindPopup(
                        `
                        <strong>
                            ${event.title}
                        </strong>
                        <br>
                        ${event.city}
                        <br>
                        ${event.date}
                        `
                    );

            }
        );

    },

    async () => {

        map.setView(
            [
                -33.4489,
                -70.6693
            ],
            10
        );

        const events =
            await getEvents();

        events.forEach(
            (event) => {

                if (
                    !event.latitude ||
                    !event.longitude
                ) {

                    return;

                }

                L.marker(
                    [
                        parseFloat(
                            event.latitude
                        ),
                        parseFloat(
                            event.longitude
                        )
                    ]
                )
                    .addTo(map)
                    .bindPopup(
                        `
                        <strong>
                            ${event.title}
                        </strong>
                        <br>
                        ${event.city}
                        `
                    );

            }
        );

    }

);