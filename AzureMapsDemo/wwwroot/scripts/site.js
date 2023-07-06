function initializeMapMultipleRoutesWithPopups(mapsKey, data) {
    // Initialize the Azure Maps
    atlas.setSubscriptionKey(mapsKey);

    // Create the map instance
    map = new atlas.Map("myMap", {
        view: "Auto"
    });

    //Wait until the map resources are ready.
    map.events.add('ready', function () {

        //Create a data source and add it to the map.
        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        //Add a layer for rendering the route lines and have it render under the map labels.
        map.layers.add(new atlas.layer.LineLayer(datasource, null, {
            strokeColor: '#2272B9',
            strokeWidth: 5,
            lineJoin: 'round',
            lineCap: 'round'
        }), 'labels');

        var symbolLayer = new atlas.layer.SymbolLayer(datasource, null, {
            iconOptions: {
                image: ['get', 'icon'],
                allowOverlap: true
            },
            textOptions: {
                textField: ['get', 'title'],
                offset: [0, 1.2]
            },
            filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']] //Only render Point or MultiPoints in this layer.
        });

        map.layers.add(symbolLayer);

        //Create a popup but leave it closed so we can update it and display it later.
        popup = new atlas.Popup({
            position: [0, 0],
            pixelOffset: [0, -18]
        });

        //Add a click event to the symbol layer.
        map.events.add('click', symbolLayer, showPopup);

        var initialLoad = true;
        var startMapPoint;
        var endMapPoint;
        data.forEach(function (result, index) {

            //Create the GeoJSON objects which represent the start and end points of the route.
            var startPoint = new atlas.data.Feature(new atlas.data.Point([result.startingLongitude, result.startingLatitude]), {
                title: result.startingTitle,
                icon: result.startingIcon
            });

            if (initialLoad) {
                startMapPoint = startPoint;
            }
            initialLoad = false;

            var endPoint = new atlas.data.Feature(new atlas.data.Point([result.endingLongitude, result.endingLatitude]), {
                title: result.endingTitle,
                icon: result.endingIcon
            });

            if (index === data.length - 1) {
                endMapPoint = endPoint;
            } 

            //Add the data to the data source.
            datasource.add([startPoint, endPoint]);

            //Use MapControlCredential to share authentication between a map control and the service module.
            var pipeline = atlas.service.MapsURL.newPipeline(new atlas.service.MapControlCredential(map));

            //Construct the RouteURL object
            var routeURL = new atlas.service.RouteURL(pipeline);

            //Start and end point input to the routeURL
            var coordinates = [[startPoint.geometry.coordinates[0], startPoint.geometry.coordinates[1]], [endPoint.geometry.coordinates[0], endPoint.geometry.coordinates[1]]];

            //Make a search route request
            routeURL.calculateRouteDirections(atlas.service.Aborter.timeout(10000), coordinates).then((directions) => {
                //Get data features from response
                var data = directions.geojson.getFeatures();
                datasource.add(data);
            });
        });
        map.setCamera({
            bounds: atlas.data.BoundingBox.fromData([startMapPoint, endMapPoint]),
            padding: 80
        });
    });

}

function showPopup(e) {
    //Get the properties and coordinates of the first shape that the event occurred on.

    var p = e.shapes[0].getProperties();
    var position = e.shapes[0].getCoordinates();

    //Create HTML from properties of the selected result.
    var html = `
      <div style="padding:5px">
        <div><b>${p.title}</b></div>
        <div>${p.icon}</div>
        <div> Longitude: ${position[1]}, Latitude: ${position[0]}</div>
      </div>`;

    //Update the content and position of the popup.
    popup.setPopupOptions({
        content: html,
        position: position
    });

    //Open the popup.
    popup.open(map);
}