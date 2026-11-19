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

L.Control.betterFileLayer({
    fileSizeLimit: 60240, // File size limit in kb
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

var baseLayers = [];


const windTurbineIcon = L.icon({
    iconUrl: './src/assets/wind-turbine.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});
map.createPane('topLayerPane');
map.getPane('topLayerPane').style.zIndex = 999;



function loadKmlInto(layer, url) {
    return fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(r.status + ' ' + url);
            return r.text();
        })
        .then(txt => {
            const xml = new DOMParser().parseFromString(txt, 'text/xml');
            layer.addData(toGeoJSON.kml(xml));
        })
        .catch(err => console.warn('KML konnte nicht geladen werden:', err));
}

const DATA_DIR  = 'data/AP2_Erzgebirge/A_Gottesberg/';
const FILE_BASE = 'Erzgebirge_Gottesberg_';

function makeKmlEntry({ file, label, style, pane, active = true }) {
    const layer = L.geoJSON(null, {
        ...(pane && { pane }),
        style,
        onEachFeature: bindFilteredPopup
    });

    const url = `${DATA_DIR}${FILE_BASE}${file}.kml`;
    loadKmlInto(layer, url);

    return {
        active,
        short_name: label,
        legend: "",
        name: getfullName(label, ''),
        layer,
        url
    };
}

// KML-Farbe (aabbggrr) -> CSS-Farbe + Deckkraft
function kmlColorToCss(kmlColor) {
    const c = (kmlColor || '').trim();
    if (c.length !== 8) return { color: '#3388ff', opacity: 1 };
    return {
        color: '#' + c.slice(6, 8) + c.slice(4, 6) + c.slice(2, 4),
        opacity: parseInt(c.slice(0, 2), 16) / 255
    };
}

// Punkt-KML mit Farben pro Placemark laden
function loadKmlPointsInto(layerGroup, url, radius) {
    return fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(r.status + ' ' + url);
            return r.text();
        })
        .then(txt => {
            const xml = new DOMParser().parseFromString(txt, 'text/xml');
            const placemarks = xml.getElementsByTagName('Placemark');

            for (const pm of placemarks) {
                const coordNode = pm.getElementsByTagName('coordinates')[0];
                if (!coordNode) continue;
                const [lon, lat] = coordNode.textContent.trim().split(',').map(Number);
                if (isNaN(lon) || isNaN(lat)) continue;

                const colorNode = pm.getElementsByTagName('color')[0];
                const { color, opacity } = kmlColorToCss(colorNode && colorNode.textContent);

                const marker = L.circleMarker([lat, lon], {
                    radius: radius,
                    color: color,
                    fillColor: color,
                    fillOpacity: opacity,
                    opacity: opacity,
                    weight: 1
                });

                const descNode = pm.getElementsByTagName('description')[0];
                const desc = descNode && descNode.textContent.trim();
                if (desc) marker.bindPopup(desc);

                layerGroup.addLayer(marker);
            }
        })
        .catch(err => console.warn('KML konnte nicht geladen werden:', err));
}


function makeFlightLayer(id) {
    return makeKmlEntry({
        file: 'F' + id,
        label: 'F' + id,
        style: {
            color: 'black',
            weight: 1.5,
            fillColor: id === 1 ? '#ff0000' : '#000000',
            fillOpacity: 0.2
        }
    });
}

function makeTxLayer(id) {
    return makeKmlEntry({
        file: 'Tx' + id,
        label: 'Tx' + id,
        pane: 'topLayerPane',
        style: {
            className: 'heli-shadow',
            color: '#000000',
            weight: id === 1 ? 5 : 4,
            opacity: 0.8
        }
    });
}


function makeWaterPipelineLayer() {
    return makeKmlEntry({
        file: 'Waterpipeline',
        label: 'Water pipeline',
        active: false,
        style: { color: '#0077cc', weight: 3, opacity: 0.9 }
    });
}

function makeTelekomCableLayer() {
    return makeKmlEntry({
        file: 'Telekomcable',
        label: 'Telekom cable',
        active: false,
        style: { color: '#e6007e', weight: 3, opacity: 0.9 }
    });
}

function makeGasPipelineLayer() {
    return makeKmlEntry({
        file: 'Gaspipeline',
        label: 'Gas pipeline',
        active: false,
        style: { color: '#d10c0c', weight: 3, opacity: 0.9 }
    });
}

var overLayers = [
    {
        group: "EM Transmitters",
        collapsed: false,
        layers: [1, 2, 3, 4, 5, 6].map(id => makeTxLayer(id))
    },
    {
        group: "Flights",
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
    collapsibleGroups: true,
    compact: true,
    position: 'bottomright',
    autoZIndex: false,
}).addTo(map);

var panelLayers = new L.Control.PanelLayers(null, overLayers, {
    selectorGroup: true,
    collapsibleGroups: true,
    compact: true,
    position: 'topright',
}).addTo(map);

nestGroupsUnder(panelLayers, "Erzgebirge: Gottesberg", false);



// ---------- TFE-Menü (Flug -> Komponente -> Frequenz -> Anzeige) ----------
const TFE_DIR = DATA_DIR + 'TFEs/';

// Dateinamen-Schema: Flug_Komponente_Frequenz_Anzeige.kml
const tfeFiles = [
    'F1_BN_8Hz_abs.kml',
    'F1_BE_8Hz_abs.kml',
    'F1_BN_8Hz_phase.kml',
    'F3A_BN_8Hz_abs.kml',
    'F3A_BE_8Hz_abs.kml',
    'F3A_BD_8Hz_abs.kml',
    // ... weitere Dateien
];

const tfeLayers = {};   // Dateiname -> L.layerGroup

function toggleTfe(file, on) {
    let layer = tfeLayers[file];
    if (on) {
        if (!layer) {
            layer = tfeLayers[file] = L.layerGroup();
            loadKmlPointsInto(layer, TFE_DIR + file, 5);   // lädt erst beim ersten Mal
        }
        layer.addTo(map);
    } else if (layer) {
        map.removeLayer(layer);
    }
}

function buildTfeTree(files) {
    const tree = {};
    files.forEach(file => {
        const parts = file.replace(/\.kml$/i, '').split('_');
        if (parts.length !== 4) {
            console.warn('TFE-Dateiname passt nicht zum Schema:', file);
            return;
        }
        const [flight, comp, freq, disp] = parts;
        ((tree[flight] ??= {})[comp] ??= {})[freq] ??= {};
        tree[flight][comp][freq][disp] = file;
    });
    return tree;
}

const natSort = (a, b) => a.localeCompare(b, undefined, { numeric: true });

function makeTfeGroup(title, childEls) {
    const d = document.createElement('details');
    const s = document.createElement('summary');
    s.textContent = title;
    s.style.cursor = 'pointer';
    d.appendChild(s);
    const inner = document.createElement('div');
    inner.style.marginLeft = '12px';
    childEls.forEach(el => inner.appendChild(el));
    d.appendChild(inner);
    return d;
}

function makeTfeToggle(label, file) {
    const l = document.createElement('label');
    l.style.display = 'block';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => toggleTfe(file, cb.checked));
    l.append(cb, ' ' + label);
    return l;
}

function buildTfeMenu(files) {
    const tree = buildTfeTree(files);
    const keys = o => Object.keys(o).sort(natSort);

    const flights = keys(tree).map(flight =>
        makeTfeGroup(flight, keys(tree[flight]).map(comp =>
            makeTfeGroup(comp, keys(tree[flight][comp]).map(freq =>
                makeTfeGroup(freq, keys(tree[flight][comp][freq]).map(disp =>
                    makeTfeToggle(disp, tree[flight][comp][freq][disp])
                ))
            ))
        ))
    );

    const root = makeTfeGroup('TFEs', flights);
    root.className = 'tfe-menu';
    root.querySelector('summary').style.fontWeight = 'bold';
    return root;
}

// TFE-Menü in den verschachtelten Block hängen (mit Fallback)
(function () {
    const tfeMenu = buildTfeMenu(tfeFiles);
    const container = panelLayers.getContainer();
    const target = container.querySelector('.nested-group-body') || container;
    target.appendChild(tfeMenu);
    L.DomEvent.disableClickPropagation(tfeMenu);
})();



// ---------- KML-Download ----------
function downloadKml(layerEntry) {
    const a = document.createElement('a');
    a.href = layerEntry.url;
    a.download = layerEntry.url.split('/').pop();   // z. B. Erzgebirge_Gottesberg_F1.kml
    document.body.appendChild(a);
    a.click();
    a.remove();
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
            checkbox.click();
        }
    });
});


var browserControl = L.control.browserPrint({ position: 'topleft', title: 'Print Map' }).addTo(map);



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
        summary.innerHTML += ` ${short_name} &#x25B6;`; // ▶

        let legendHolder = L.DomUtil.create("img", "", details);
        legendHolder.setAttribute('src', legend);
        legendHolder.setAttribute('alt', 'Legend');
        legendHolder.setAttribute('style', 'margin-top: 4px; max-height: 500px; display: block;');
    }

    return container.innerHTML
}


function ShowAttribution(short_name, attribution) {

    let modalTitle = document.getElementById("myModalTitle")
    modalTitle.innerHTML = short_name

    let modalBody = document.getElementById("myModalBody")
    modalBody.innerHTML = attribution

    $('#myModal').modal('show')
}