/* =====================================================
   OTIUM - SELECTOR DE UBICACIÓN
   Compatible con create-event.html y edit-event.html
===================================================== */


/* =====================================================
   COMPROBAR LEAFLET
===================================================== */

if (typeof L === "undefined") {

    console.error(
        "Leaflet no está cargado."
    );

} else {


    /* =================================================
       ELEMENTOS
    ================================================= */

    const mapElement =
        document.getElementById(
            "eventMap"
        );

    const latitudeInput =
        document.getElementById(
            "latitude"
        );

    const longitudeInput =
        document.getElementById(
            "longitude"
        );

    const addressInput =
        document.getElementById(
            "address"
        );

    const cityInput =
        document.getElementById(
            "city"
        );

    const searchAddressButton =
        document.getElementById(
            "searchAddress"
        );

    const currentLocationButton =
        document.getElementById(
            "currentLocation"
        );


    /* =================================================
       COMPROBAR MAPA
    ================================================= */

    if (!mapElement) {

        console.warn(
            "No existe #eventMap en esta página."
        );

    } else {


        /* =============================================
           POSICIÓN INICIAL
        ============================================= */

        const defaultLatitude =
            -33.4489;

        const defaultLongitude =
            -70.6693;


        /* =============================================
           CREAR MAPA
        ============================================= */

        const map =
            L.map(
                mapElement
            ).setView(
                [
                    defaultLatitude,
                    defaultLongitude
                ],
                12
            );


        /* =============================================
           OPENSTREETMAP
        ============================================= */

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "© OpenStreetMap contributors"
            }
        ).addTo(
            map
        );


        /* =============================================
           MARCADOR
        ============================================= */

        let marker = null;


        /* =============================================
           ACTUALIZAR UBICACIÓN
        ============================================= */

        window.updateLocation =
            function (
                latitude,
                longitude
            ) {

                latitude =
                    Number(
                        latitude
                    );

                longitude =
                    Number(
                        longitude
                    );


                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {

                    console.error(
                        "Coordenadas inválidas:",
                        latitude,
                        longitude
                    );

                    return;

                }


                /* -------------------------------------
                   GUARDAR COORDENADAS
                ------------------------------------- */

                if (latitudeInput) {

                    latitudeInput.value =
                        latitude;

                }


                if (longitudeInput) {

                    longitudeInput.value =
                        longitude;

                }


                /* -------------------------------------
                   MOVER MAPA
                ------------------------------------- */

                map.setView(
                    [
                        latitude,
                        longitude
                    ],
                    15
                );


                /* -------------------------------------
                   ELIMINAR MARCADOR ANTERIOR
                ------------------------------------- */

                if (marker) {

                    map.removeLayer(
                        marker
                    );

                }


                /* -------------------------------------
                   CREAR NUEVO MARCADOR
                ------------------------------------- */

                marker =
                    L.marker(
                        [
                            latitude,
                            longitude
                        ]
                    ).addTo(
                        map
                    );


                console.log(
                    "Ubicación seleccionada:",
                    latitude,
                    longitude
                );

            };


        /* =============================================
           CLIC EN EL MAPA
        ============================================= */

        map.on(
            "click",
            (
                e
            ) => {

                window.updateLocation(
                    e.latlng.lat,
                    e.latlng.lng
                );

            }
        );


        /* =============================================
           CARGAR UBICACIÓN EXISTENTE
           
           IMPORTANTE PARA EDITAR EVENTO
        ============================================= */

        function cargarUbicacionExistente() {

            if (
                !latitudeInput ||
                !longitudeInput
            ) {

                return;

            }


            const latitude =
                parseFloat(
                    latitudeInput.value
                );

            const longitude =
                parseFloat(
                    longitudeInput.value
                );


            if (
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {

                window.updateLocation(
                    latitude,
                    longitude
                );

            }

        }


        /* =============================================
           BUSCAR DIRECCIÓN
        ============================================= */

        if (searchAddressButton) {

            searchAddressButton.addEventListener(
                "click",
                async () => {

                    const address =
                        addressInput
                            ? addressInput.value.trim()
                            : "";


                    const city =
                        cityInput
                            ? cityInput.value.trim()
                            : "";


                    if (!address && !city) {

                        alert(
                            "Introduce una dirección o ciudad."
                        );

                        return;

                    }


                    const textoBusqueda =
                        [
                            address,
                            city,
                            "Chile"
                        ]
                            .filter(Boolean)
                            .join(", ");


                    try {

                        searchAddressButton.disabled =
                            true;

                        searchAddressButton.textContent =
                            "Buscando...";


                        const response =
                            await fetch(
                                `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(
                                    textoBusqueda
                                )}`,
                                {
                                    headers: {
                                        "Accept":
                                            "application/json"
                                    }
                                }
                            );


                        if (
                            !response.ok
                        ) {

                            throw new Error(
                                "Error HTTP " +
                                response.status
                            );

                        }


                        const data =
                            await response.json();


                        if (
                            !data ||
                            data.length === 0
                        ) {

                            alert(
                                "No se encontró la ubicación."
                            );

                            return;

                        }


                        const resultado =
                            data[0];


                        const latitude =
                            parseFloat(
                                resultado.lat
                            );

                        const longitude =
                            parseFloat(
                                resultado.lon
                            );


                        window.updateLocation(
                            latitude,
                            longitude
                        );


                        /* ---------------------------------
                           ACTUALIZAR DIRECCIÓN
                        --------------------------------- */

                        if (
                            addressInput &&
                            resultado.display_name
                        ) {

                            addressInput.value =
                                resultado.display_name;

                        }


                        /* ---------------------------------
                           ACTUALIZAR CIUDAD
                        --------------------------------- */

                        if (
                            cityInput &&
                            resultado.address
                        ) {

                            const ciudad =
                                resultado.address.city ||
                                resultado.address.town ||
                                resultado.address.village ||
                                resultado.address.municipality ||
                                resultado.address.county ||
                                "";


                            if (ciudad) {

                                cityInput.value =
                                    ciudad;

                            }

                        }


                    } catch (error) {

                        console.error(
                            "Error buscando dirección:",
                            error
                        );

                        alert(
                            "No fue posible buscar la dirección."
                        );


                    } finally {

                        searchAddressButton.disabled =
                            false;

                        searchAddressButton.textContent =
                            "Buscar ubicación";

                    }

                }
            );

        }


        /* =============================================
           USAR UBICACIÓN ACTUAL
        ============================================= */

        if (currentLocationButton) {

            currentLocationButton.addEventListener(
                "click",
                () => {

                    if (
                        !navigator.geolocation
                    ) {

                        alert(
                            "Tu navegador no permite obtener la ubicación."
                        );

                        return;

                    }


                    currentLocationButton.disabled =
                        true;

                    currentLocationButton.textContent =
                        "Obteniendo ubicación...";


                    navigator.geolocation.getCurrentPosition(

                        async (
                            position
                        ) => {

                            const latitude =
                                position.coords.latitude;

                            const longitude =
                                position.coords.longitude;


                            window.updateLocation(
                                latitude,
                                longitude
                            );


                            /* ---------------------------------
                               OBTENER DIRECCIÓN
                            --------------------------------- */

                            try {

                                const response =
                                    await fetch(
                                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                                        {
                                            headers: {
                                                "Accept":
                                                    "application/json"
                                            }
                                        }
                                    );


                                if (
                                    response.ok
                                ) {

                                    const data =
                                        await response.json();


                                    if (
                                        data.address
                                    ) {

                                        const ciudad =
                                            data.address.city ||
                                            data.address.town ||
                                            data.address.village ||
                                            data.address.municipality ||
                                            "";


                                        if (
                                            cityInput &&
                                            ciudad
                                        ) {

                                            cityInput.value =
                                                ciudad;

                                        }


                                        if (
                                            addressInput &&
                                            data.display_name
                                        ) {

                                            addressInput.value =
                                                data.display_name;

                                        }

                                    }

                                }


                            } catch (
                                error
                            ) {

                                console.error(
                                    "Error obteniendo dirección:",
                                    error
                                );

                            }


                            currentLocationButton.disabled =
                                false;

                            currentLocationButton.textContent =
                                "📍 Usar mi ubicación actual";

                        },


                        (
                            error
                        ) => {

                            console.error(
                                "Error de geolocalización:",
                                error
                            );


                            let mensaje =
                                "No se pudo obtener tu ubicación.";


                            if (
                                error.code ===
                                error.PERMISSION_DENIED
                            ) {

                                mensaje =
                                    "Debes permitir el acceso a tu ubicación en el navegador.";

                            }


                            alert(
                                mensaje
                            );


                            currentLocationButton.disabled =
                                false;

                            currentLocationButton.textContent =
                                "📍 Usar mi ubicación actual";

                        },

                        {
                            enableHighAccuracy:
                                true,

                            timeout:
                                10000,

                            maximumAge:
                                0

                        }

                    );

                }
            );

        }


        /* =============================================
           ESPERAR A QUE EDIT-EVENT CARGUE LOS DATOS
           
           Esto es importante:
           edit-event.js carga primero latitude
           y longitude desde Firestore.
        ============================================= */

        setTimeout(
            () => {

                cargarUbicacionExistente();

            },
            300
        );


        /* =============================================
           CORREGIR TAMAÑO DEL MAPA
        ============================================= */

        setTimeout(
            () => {

                map.invalidateSize();

            },
            500
        );


        console.log(
            "OTIUM location-picker iniciado correctamente."
        );

    }

}