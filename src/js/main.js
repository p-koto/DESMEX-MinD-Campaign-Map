
var map = L.map('map', {
    zoom: 12,
    center: L.latLng([50.4365, 12.5223]),
    attributionControl: true,
    fullscreenControl: true,
    fullscreenControlOptions: {
        position: 'topleft',
    },

    contextmenu: true,
    contextmenuWidth: 140,
    contextmenuItems: [{
        text: 'Show coordinates',
        callback: showCoordinates
    }, {
        text: 'Center map here',
        callback: centerMap
    }, '-', {
        text: 'Zoom in',
        icon: './src/assets/zoom-in.png',
        callback: zoomIn
    }, {
        text: 'Zoom out',
        icon: './src/assets/zoom-out.png',
        callback: zoomOut
    }]
});


map.addControl(new L.Control.LinearMeasurement({
    unitSystem: 'metric',
    color: '#FF0080',
    type: 'line'
}));

var hash = new L.Hash(map);
L.control.locate().addTo(map);
var notification = L.control
    .notifications({
        className: 'pastel',
        timeout: 5000,
        position: 'topleft',
        closable: true,
        dismissable: true,
    })
    .addTo(map);

L.Control.geocoder({ position: "topleft", showResultIcons: true }).addTo(map);

// notification.success('Success', 'Data loaded');

L.Control.betterFileLayer({
    fileSizeLimit: 60240, // File size limit in kb (10 MB))
}).addTo(map);


function showCoordinates(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);

    const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(
            `<b>Coordinates</b><br>
             Latitude: ${lat}°<br>
             Longitude: ${lng}°`
        )
        .openOn(map);
}


function centerMap(e) {
    map.panTo(e.latlng);
}

function zoomIn(e) {
    map.zoomIn();
}

function zoomOut(e) {
    map.zoomOut();
}

L.control.scale(
    {
        imperial: false,
    }).addTo(map);


L.geoJson(germanBoundary, {
    // Add invert: true to invert the geometries in the GeoJSON file
    invert: true,
    renderer: L.svg({ padding: 1 }),
    color: 'gray', fillOpacity: 0.7, weight: 0
}).addTo(map);


map.on("bfl:layerloaded", function () { notification.success('Success', 'Data loaded successfully'); })
map.on("bfl:layerloaderror", function () { notification.alert('Error', 'Unable to load file'); })
map.on("bfl:filenotsupported", function () { notification.alert('Error', 'File type not supported'); })
map.on("bfl:layerisempty", function () { notification.warning('Error', 'No features in file'); })
map.on("bfl:filesizelimit", function () { notification.alert('Error', 'Maximun file size allowed is 50 MB'); })




osmLayer = new L.TileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',

});


googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { //lyrs: Hybrid: s,h;Satellite: s;Streets: m;Terrain: p;
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '',
});
var layers = [];
for (var providerId in providers) {
    layers.push(providers[providerId]);
}
var ctrl = L.control.iconLayers(layers).addTo(map);

// var layerControl = L.control.layers({ "osmLayer": osmLayer }, []).addTo(map);
// layerControl.addBaseLayer(osmLayer, "osmLayer");

var baseLayers = [
    //     {
    //         group: "Base Layers",
    //         collapsed: true,
    //         icon: '<span class="fa fa-solid fa-bars"></span>',
    //         layers: [
    //             {
    //                 name: getfullName("Open Street Map", "", osmLayer.getAttribution()),
    //                 layer: osmLayer,
    //                 active: true,
    //                 zIndex: 0,
    //             },
    //             {
    //                 name: getfullName("Open Topo Map", " ", OpenTopoMap.getAttribution()),
    //                 layer: OpenTopoMap,
    //                 zIndex: 0,

    //             },
    //             {
    //                 name: getfullName("Google Hybrid", " ", googleHybrid.getAttribution()),
    //                 layer: googleHybrid,
    //                 zIndex: 0,
    //             },
    //             {
    //                 name: getfullName("Esri World Imagery", " ", Esri_WorldImagery.getAttribution()),
    //                 layer: Esri_WorldImagery,
    //                 zIndex: 0,
    //             },

    //         ],
    //     },
]


const windTurbineIcon = L.icon({
    iconUrl: './src/assets/wind-turbine.svg',
    iconSize: [30, 30],           // adjust size as needed
    iconAnchor: [15, 30],         // point of the icon which will correspond to marker's location
    popupAnchor: [0, -30]         // where the popup opens relative to the iconAnchor
});
map.createPane('topLayerPane');
map.getPane('topLayerPane').style.zIndex = 999;


function makeTxLayer(id) {
    return {
        active: true,
        short_name: "Tx" + id,
        legend: "",
        name: getfullName("Tx" + id, ''),
        layer: L.geoJSON(transmitters, {
            pane: 'topLayerPane',
            filter: f => f.properties.id === id,
            style: {
                className: 'heli-shadow',
                color: '#000000',
                weight: id === 1 ? 5 : 4,
                opacity: 0.8
            },
            onEachFeature: bindFilteredPopup
        })
    };
}

function makeFlightLayer(id) {
    return {
        active: true,
        short_name: "F" + id,
        legend: "",
        name: getfullName("F" + id, ''),
        layer: L.geoJSON(flights, {
            filter: f => f.properties.id === id,
            style: {
                color: 'black',
                weight: 1.5,
                fillColor: id === 1 ? '#ff0000' : '#000000',
                fillOpacity: 0.2
            },
            onEachFeature: bindFilteredPopup
        })
    };
}

function makeWaterPipelineLayer() {
    return {
        active: false,
        short_name: "Water pipeline",
        legend: "",
        name: getfullName("Water pipeline", ''),
        layer: L.geoJSON(water, {
            style: {
                color: '#0077cc',
                weight: 3,
                opacity: 0.9
            },
            onEachFeature: bindFilteredPopup
        })
    };
}


function makeTelekomCableLayer() {
    return {
        active: false,
        short_name: "Telekom cable",
        legend: "",
        name: getfullName("Telekom cable", ''),
        layer: L.geoJSON(telekom, {
            style: {
                color: '#e6007e',
                weight: 3,
                opacity: 0.9
            },
            onEachFeature: bindFilteredPopup
        })
    };
}

function makeGasPipelineLayer() {
    return {
        active: false,
        short_name: "Gas pipeline",
        legend: "",
        name: getfullName("Gas pipeline", ''),
        layer: L.geoJSON(gas, {
            style: {
                color: '#d10c0c',
                weight: 3,
                opacity: 0.9
            },
            onEachFeature: bindFilteredPopup
        })
    };
}

var overLayers = [
    {
        group: "SAEM Transmitters",
        collapsed: false,
        layers: [1, 2, 3, 4, 5, 6].map(id => makeTxLayer(id))
    },
    {
        group: "SAEM Flights",
        collapsed: false,
        layers: [1, 2, 3, 4, 5, 6].map(id => makeFlightLayer(id))
    },
    {
        group: "Infrastructure",
        collapsed: false,
        layers: [
            makeWaterPipelineLayer(),
            makeTelekomCableLayer(),
            makeGasPipelineLayer()
        ]
    }
];


var panelLayersBase = new L.Control.PanelLayers(baseLayers, null, {
    // selectorGroup: true,
    collapsibleGroups: true,
    compact: true,
    position: 'bottomright',
    compact: true,
    autoZIndex: false,

}).addTo(map);

var panelLayers = new L.Control.PanelLayers(null, overLayers, {
    selectorGroup: true,
    collapsibleGroups: true,
    compact: true,
    // title: 'All layers',
    //collapsed: true,
    // title: "Layers",
    position: 'topright',
}).addTo(map);

nestGroupsUnder(panelLayers, "Erzgebirge: Gottesberg", false);



// ---------- KML-Export ----------
function escXml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// GeoJSON-Koordinaten [lon, lat] -> KML "lon,lat,0"
function coordsToKml(coords) {
    return coords.map(c => `${c[0]},${c[1]},${c[2] || 0}`).join(' ');
}

function geometryToKml(g) {
    switch (g.type) {
        case 'Point':
            return `<Point><coordinates>${coordsToKml([g.coordinates])}</coordinates></Point>`;
        case 'LineString':
            return `<LineString><tessellate>1</tessellate><coordinates>${coordsToKml(g.coordinates)}</coordinates></LineString>`;
        case 'Polygon':
            return g.coordinates.map((ring, i) => {
                const tag = i === 0 ? 'outerBoundaryIs' : 'innerBoundaryIs';
                return `<${tag}><LinearRing><coordinates>${coordsToKml(ring)}</coordinates></LinearRing></${tag}>`;
            }).reduce((acc, s) => acc + s, '<Polygon><tessellate>1</tessellate>') + '</Polygon>';
        case 'MultiPoint':
        case 'MultiLineString':
        case 'MultiPolygon': {
            const single = g.type.replace('Multi', '');
            return '<MultiGeometry>' +
                g.coordinates.map(c => geometryToKml({ type: single, coordinates: c })).join('') +
                '</MultiGeometry>';
        }
        case 'GeometryCollection':
            return '<MultiGeometry>' + g.geometries.map(geometryToKml).join('') + '</MultiGeometry>';
        default:
            return '';
    }
}

function geojsonToKml(geojson, docName) {
    const placemarks = geojson.features.map((f, i) => {
        const p = f.properties || {};
        const name = p.Name || p.name || `${docName}_${i + 1}`;
        const extData = Object.entries(p)
            .filter(([_, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `<Data name="${escXml(k)}"><value>${escXml(v)}</value></Data>`)
            .join('');
        return `<Placemark><name>${escXml(name)}</name>` +
            `<ExtendedData>${extData}</ExtendedData>` +
            `${geometryToKml(f.geometry)}</Placemark>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n` +
        `<name>${escXml(docName)}</name>\n${placemarks}\n</Document>\n</kml>`;
}

function downloadKml(layerEntry) {
    const fileName = 'Erzgebirge_Gottesberg_' + layerEntry.short_name.replace(/\s+/g, '');
    const kml = geojsonToKml(layerEntry.layer.toGeoJSON(), fileName);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName + '.kml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Leaflet-Control: Dropdown (nach Rubrik gruppiert) + Download-Button
L.Control.KmlDownload = L.Control.extend({
    options: { position: 'topright' },

    onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar kml-download');
        div.style.cssText = 'background:#fff;padding:6px;display:flex;gap:4px;align-items:center;';

        const select = L.DomUtil.create('select', '', div);
        overLayers.forEach((group, gi) => {
            const og = document.createElement('optgroup');
            og.label = group.group;
            group.layers.forEach((l, li) => {
                const opt = document.createElement('option');
                opt.value = gi + ':' + li;
                opt.textContent = l.short_name;
                og.appendChild(opt);
            });
            select.appendChild(og);
        });

        const btn = L.DomUtil.create('button', '', div);
        btn.type = 'button';
        btn.title = 'Als KML herunterladen';
        btn.innerHTML = '<i class="fa fa-download"></i> KML';

        btn.onclick = () => {
            const [gi, li] = select.value.split(':').map(Number);
            downloadKml(overLayers[gi].layers[li]);
        };

        L.DomEvent.disableClickPropagation(div);
        return div;
    }
});

map.addControl(new L.Control.KmlDownload());


// map.addControl(panelLayers);



function bindFilteredPopup(feature, layer) {
    if (feature.properties) {
        let filteredProps = Object.entries(feature.properties)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `<strong>${key}</strong>: ${value}`)
            .join("<br>");

        if (filteredProps) {
            layer.bindPopup(filteredProps);
        }
    }
}



function nestGroupsUnder(control, title, startCollapsed) {
    var container = control.getContainer();
    var groups = container.querySelectorAll('.leaflet-panel-layers-group');
 
    if (!groups.length) {
        console.warn('nestGroupsUnder: keine .leaflet-panel-layers-group gefunden');
        return;
    }
 
    // Styles einmalig einfügen
    if (!document.getElementById('nested-group-style')) {
        var style = document.createElement('style');
        style.id = 'nested-group-style';
        style.textContent =
            '.nested-group > summary {' +
            '  cursor: pointer; font-weight: bold; padding: 4px 6px;' +
            '  border-bottom: 1px solid #ccc; list-style-position: inside;' +
            '}' +
            '.nested-group-body { margin-left: 12px; }';
        document.head.appendChild(style);
    }
 
    var details = document.createElement('details');
    details.className = 'nested-group';
    details.open = !startCollapsed;
 
    var summary = document.createElement('summary');
    summary.textContent = title;
    details.appendChild(summary);
 
    var body = document.createElement('div');
    body.className = 'nested-group-body';
    details.appendChild(body);
 
    // Obergruppe an die Stelle der ersten Untergruppe setzen,
    // dann alle Untergruppen hineinverschieben
    groups[0].parentNode.insertBefore(details, groups[0]);
    groups.forEach(function (g) { body.appendChild(g); });
}


document.querySelectorAll('.leaflet-panel-layers-item label').forEach(label => {
    label.addEventListener('click', function (e) {
        const checkbox = this.querySelector('input[type="checkbox"]');

        // Prevent double toggle if clicking the checkbox directly
        if (checkbox && e.target !== checkbox) {
            checkbox.click(); // use .click() instead of changing checked state
        }
    });
});

// swipeMenuInnerHTML = '<select class="form-select" multiple  size="5"  aria-label="form-select" id="LeftLayerSelector"></select><div><button type="button" class="btn btn-success" id="confirm">Add swipe</button>   <button type="button" class="btn btn-secondary" id="closeSide">Remove all</button></div>'


// L.control.slideMenu(swipeMenuInnerHTML, { position: bottomright, menuposition: bottomright }).addTo(map);

// L.control.slideMenu(swipeMenuInnerHTML, { position: bottomright }).addTo(map);

// // var slideMenu = L.control.slideMenu("", {

// //     width: "25%",
// //     height: "100%",
// //     delay: 10,
// //     icon: "fa fa-solid fa-bars",
// // })
// //     .addTo(map);

// // slideMenu.setContents(swipeMenuInnerHTML);

// // document.getElementById("confirm").addEventListener("click", addSideBySide);
// // document.getElementById("closeSide").addEventListener("click", removeSideBySide);
// // document.getElementById("ZoomTo").addEventListener("click", ZoomToLayer);

// var isSideBySideOn = null

// function addSideBySide() {
//     if (isSideBySideOn == null) {
//         isSideBySideOn = L.control.sideBySide([], [], { thumbSize: 25, padding: 70 }).addTo(map);
//         isSideBySideOn.setLeftLayers(overLayers[2].layers[0].layer)
//         // isSideBySideOn.setLeftLayers(overLayers[2].layers[0].layer)
//         // isSideBySideOn.setRightLayers(osmLayer)

//     }
// }

// function removeSideBySide() {
//     if (isSideBySideOn) {
//         isSideBySideOn.remove()
//         isSideBySideOn = null
//     }
// }


// function ZoomToLayer(name) {

//     console.log(name)
//     for (let i = 0; i < overLayers.length; i++) {
//         for (let L = 0; L < overLayers[i].layers.length; L++) {
//             if (overLayers[i].layers[L].short_name == name) {
//                 overLayers[i].layers[L].layer.addTo(map);                   // make sure layer is active
//                 map.fitBounds(overLayers[i].layers[L].layer.getBounds()) // zoom to layer
//                 break
//             }
//         }
//     }
// }

// var layersList = []
// updateLayersList()

// swipeButton = document.getElementById('swipeMenu');
// swipeButton.onclick = updateLayersListInSwipePanel()


var browserControl = L.control.browserPrint({ position: 'topleft', title: 'Print Map' }).addTo(map);




// function updateLayersList() {

//     for (let i = 0; i < overLayers.length; i++) {
//         for (let L = 0; L < overLayers[i].layers.length; L++) {
//             layersList.push(overLayers[i].layers[L].short_name)
//         }
//     }
//     console.log('Updated')
// }

// function updateLayersListInSwipePanel() {
//     let leftPanel = document.getElementById("LeftLayerSelector");
//     for (let i = 0; i < layersList.length; i++) {
//         let option = document.createElement('option');
//         option.text = layersList[i];
//         leftPanel.appendChild(option)

//     }

// }



function getfullName(short_name, legend, attribution) {

    let container = L.DomUtil.create('div');
    let details = L.DomUtil.create('details', '', container);
    let summary = L.DomUtil.create('summary', '', details);

    // Summary styling
    let div = L.DomUtil.create('div', '', summary);
    div.setAttribute('id', short_name);
    summary.innerHTML += short_name;

    // Legend Image (if available)
    if (legend) {
        summary.innerHTML += ` ${short_name} &#x25B6;`; // ▶ black right-pointing triangle

        let legendHolder = L.DomUtil.create("img", "", details);
        legendHolder.setAttribute('src', legend);
        legendHolder.setAttribute('alt', 'Legend');
        legendHolder.setAttribute('style', 'margin-top: 4px; max-height: 500px; display: block;');
    }



    // let infoIcon = L.DomUtil.create("img", "layer-info-img", details);
    // infoIcon.alt = "\u{1F6C8}";
    // infoIcon.title = "Attribution";
    // // infoIcon.setAttribute("data-target", "#exampleModalCenter")
    // // infoIcon.setAttribute('onclick', "alert('" + short_name + "')");
    // infoIcon.setAttribute('onclick', "ShowAttribution('" + short_name + "," + attribution + "')");


    // let legendHolder = L.DomUtil.create("img", "", details);
    // legendHolder.setAttribute('src', legend);

    // let ZoomToBtn = L.DomUtil.create("button", "Zoombtn", details);
    // ZoomToBtn.setAttribute('type', "button");
    // let ZoomToBtnIcon = L.DomUtil.create("img", "", ZoomToBtn);
    // ZoomToBtnIcon.setAttribute('src', "./src/assets/magnifying-glass-location-solid.svg");
    // ZoomToBtnIcon.setAttribute('title', "zoom to layer");
    // // ZoomToBtn.innerText += 'onclick=ZoomToLayer("Geology")'
    // ZoomToBtn.setAttribute('onclick', "ZoomToLayer('" + short_name + "')");

    return container.innerHTML
}


function ShowAttribution(short_name, attribution) {

    let modalTitle = document.getElementById("myModalTitle")
    modalTitle.innerHTML = short_name

    let modalBody = document.getElementById("myModalBody")
    modalBody.innerHTML = attribution

    // let modalContainer = document.getElementById(myModal)
    // modalBody.modal('toggle');

    $('#myModal').modal('show')


    console.log(short_name)
    console.log(attribution)
    // let modal = L.DomUtil.create("div")

    // modal.innerHTML =
    // '<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">  <div class="modal-dialog modal-dialog-centered" role="document">    <div class="modal-content">      <div class="modal-header">        <h5 class="modal-title" id="exampleModalLongTitle"></h5>        <button type="button" class="close" data-dismiss="modal" aria-label="Close">          <span aria-hidden="true">&times;</span>        </button>      </div>      <div class="modal-body"> </div>      <div class="modal-footer">        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>      </div>    </div>  </div></div>'

    // return modal
}