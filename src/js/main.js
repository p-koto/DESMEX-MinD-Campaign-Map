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

// Gruppentitel (EM Transmitters, Flights, Infrastructure) wie die <summary>-Reiter darstellen
(function () {
    const st = document.createElement('style');
    st.id = 'panel-group-style';
    st.textContent =
        '.leaflet-panel-layers-group > .leaflet-panel-layers-title,' +
        '.leaflet-panel-layers-group .leaflet-panel-layers-title {' +
        '  font-size: inherit !important; font-weight: bold !important;' +
        '  padding: 4px 6px !important; margin: 0 !important;' +
        '  background: none !important; border: none !important;' +
        '  border-bottom: 1px solid #ccc !important; cursor: pointer;' +
        '}';
    document.head.appendChild(st);
})();



// ---------- TFE-Menü (Flug -> Komponente -> Frequenz -> Anzeige) ----------
const TFE_DIR = DATA_DIR + 'TFEs/';

// Dateinamen-Schema: Flug_Komponente_Frequenz_Anzeige.kml
const TFE_FLIGHTS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
const TFE_COMPS   = ['BN', 'BE', 'BD'];
const TFE_FREQS   = [24, 64, 128, 256, 512, 1024, 2048, 4096];   // in Hz
const TFE_DISPS   = ['abs', 'phase'];

const tfeFiles = TFE_FLIGHTS.flatMap(flight =>
    TFE_FREQS.flatMap(freq =>
        TFE_DISPS.flatMap(disp =>
            TFE_COMPS.map(comp => `${flight}_${comp}_${freq}Hz_${disp}.kml`)
        )
    )
);

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
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';

    const l = document.createElement('label');
    l.style.flex = '1';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => toggleTfe(file, cb.checked));
    l.append(cb, ' ' + label);

    const dl = document.createElement('a');
    dl.href = TFE_DIR + file;
    dl.download = file;
    dl.title = file + ' herunterladen';
    dl.innerHTML = '<i class="fa fa-download"></i>';
    dl.style.cssText = 'color:#555;text-decoration:none;font-size:12px;';

    row.append(l, dl);
    return row;
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
function downloadUrl(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Mehrere Dateien nacheinander laden (kleine Pause, damit der Browser nicht blockt)
async function downloadMany(urls) {
    for (const url of urls) {
        downloadUrl(url);
        await sleep(500);
    }
}

// Optional: als ZIP (nur wenn JSZip eingebunden ist)
async function downloadAsZip(urls, zipName) {
    const zip = new JSZip();
    await Promise.all(urls.map(async url => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status + ' ' + url);
        zip.file(url.split('/').pop(), await r.blob());
    }));
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Gruppe im Dialog: <details> mit "alle auswählen"-Checkbox in der Summary
function makeDlGroup(title, childEls, open) {
    const d = document.createElement('details');
    d.open = !!open;
    const s = document.createElement('summary');
    s.style.cssText = 'cursor:pointer;padding:3px 0;';
    const all = document.createElement('input');
    all.type = 'checkbox';
    all.style.marginRight = '6px';
    all.addEventListener('click', e => e.stopPropagation());
    all.addEventListener('change', () => {
        d.querySelectorAll('input.kml-dl-cb').forEach(cb => cb.checked = all.checked);
        d.dispatchEvent(new Event('change', { bubbles: true }));
    });
    s.append(all, title);
    d.appendChild(s);
    const inner = document.createElement('div');
    inner.style.marginLeft = '18px';
    childEls.forEach(el => inner.appendChild(el));
    d.appendChild(inner);
    return d;
}

function makeDlItem(label, url) {
    const l = document.createElement('label');
    l.style.display = 'block';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'kml-dl-cb';
    cb.dataset.url = url;
    cb.style.marginRight = '6px';
    l.append(cb, label);
    return l;
}

function buildDownloadList() {
    const wrap = document.createElement('div');

    // Normale Gruppen (EM Transmitters, Flights, Infrastructure)
    overLayers.forEach(g => {
        wrap.appendChild(makeDlGroup(
            g.group,
            g.layers.map(l => makeDlItem(l.short_name, l.url)),
            false
        ));
    });

    // TFEs: Flug -> Komponente -> Frequenz -> Anzeige
    const tree = buildTfeTree(tfeFiles);
    const keys = o => Object.keys(o).sort(natSort);
    const flights = keys(tree).map(flight =>
        makeDlGroup(flight, keys(tree[flight]).map(comp =>
            makeDlGroup(comp, keys(tree[flight][comp]).map(freq =>
                makeDlGroup(freq, keys(tree[flight][comp][freq]).map(disp =>
                    makeDlItem(disp, TFE_DIR + tree[flight][comp][freq][disp])
                ), false)
            ), false)
        ), false)
    );
    wrap.appendChild(makeDlGroup('TFEs', flights, false));
    return wrap;
}

function openKmlDownloadDialog() {
    if (document.getElementById('kml-dl-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'kml-dl-overlay';
    overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;' +
        'display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText =
        'background:#fff;border-radius:6px;width:min(520px,92vw);max-height:80vh;' +
        'display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,.3);font:13px/1.4 sans-serif;';

    // Kopf
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #ccc;';
    head.innerHTML = '<strong style="font-size:15px;">KML-Download</strong>';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'border:none;background:none;font-size:16px;cursor:pointer;';
    head.appendChild(closeBtn);

    // Liste
    const body = document.createElement('div');
    body.style.cssText = 'overflow:auto;padding:10px 14px;';
    body.appendChild(buildDownloadList());

    // Fuß
    const foot = document.createElement('div');
    foot.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #ccc;';
    const btnAll  = document.createElement('button');
    const btnNone = document.createElement('button');
    const btnGo   = document.createElement('button');
    [btnAll, btnNone, btnGo].forEach(b => b.type = 'button');
    btnAll.textContent  = 'Alle';
    btnNone.textContent = 'Keine';
    btnGo.style.cssText = 'margin-left:auto;font-weight:bold;';
    foot.append(btnAll, btnNone);

    let zipCb = null;
    if (typeof JSZip !== 'undefined') {
        const zl = document.createElement('label');
        zipCb = document.createElement('input');
        zipCb.type = 'checkbox';
        zipCb.checked = true;
        zl.append(zipCb, ' als ZIP');
        foot.appendChild(zl);
    }
    foot.appendChild(btnGo);

    const selected = () => [...body.querySelectorAll('input.kml-dl-cb:checked')].map(cb => cb.dataset.url);
    const refresh = () => {
        const n = selected().length;
        btnGo.textContent = `Herunterladen (${n})`;
        btnGo.disabled = n === 0;
    };
    refresh();

    body.addEventListener('change', refresh);
    const setAll = v => {
        body.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = v);
        refresh();
    };
    btnAll.onclick  = () => setAll(true);
    btnNone.onclick = () => setAll(false);

    btnGo.onclick = async () => {
        const urls = selected();
        if (!urls.length) return;
        btnGo.disabled = true;
        try {
            if (zipCb && zipCb.checked && urls.length > 1) {
                await downloadAsZip(urls, 'KMLs.zip');
            } else {
                await downloadMany(urls);
            }
        } catch (err) {
            console.warn('Download fehlgeschlagen:', err);
            notification.alert('Error', 'Download fehlgeschlagen');
        }
        refresh();
    };

    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    closeBtn.onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    box.append(head, body, foot);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// Leaflet-Control: ein Button, der den Download-Dialog öffnet
L.Control.KmlDownload = L.Control.extend({
    options: { position: 'topright' },

    onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar kml-download');
        div.style.cssText = 'background:#fff;padding:6px;';

        const btn = L.DomUtil.create('button', '', div);
        btn.type = 'button';
        btn.title = 'KMLs herunterladen';
        btn.innerHTML = '<i class="fa fa-download"></i> KML-Download';
        btn.onclick = openKmlDownloadDialog;

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