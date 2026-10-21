"use strict"

/*
	ReadSDFromSensor — read CSV files from a Smart Citizen Kit SD card over USB (Web Serial).
	Protocol: file -ls, file -less <name>, file -rm <name>.
	After the header row, the next 3 records are discarded (sensor metadata junk).
	Opened CSVs are cached per node (like chart options); reconnect resets the node.
*/

var rsdPort = null;
var rsdReader = null;
var rsdWriter = null;
var rsdReadTask = null;
var rsdBuffer = "";
var rsdCommandOutput = "";
var rsdBusy = false;
var rsdLastDataAt = 0;
var rsdConnected = false;
/* Sensor identity gathered over USB (same shape as ConnectASensor sensorInfo). */
var rsdSensorInfo = {};

/*
	SD CSV headers → ConnectASensorObsProps / timestamp keys so Entity Builder
	can reuse connectASensor mode without a separate code path.
*/
var RSD_CSV_COLUMN_MAP = {
	TIME: "timestamp",
	TEMP: "temperature",
	HUM: "humidity",
	LIGHT: "light",
	NOISE_A: "noiseDBA",
	MPL_PRESS: "barometricPressure",
	PMS_PM_1: "pm1",
	PMS_PM_25: "pm25",
	PMS_PM_10: "pm10"
};

function getReadSDFromSensorNodeSafe() {
	if (typeof getNodeDialog !== "function")
		return null;
	try {
		return getNodeDialog("DialogReadSDFromSensor");
	} catch (err) {
		return null;
	}
}

function rsdEnsureState(node) {
	if (!node)
		return { fileList: [], cache: {}, openedFileName: "" };
	if (!node.readSDState)
		node.readSDState = { fileList: [], cache: {}, openedFileName: "" };
	if (!node.readSDState.cache)
		node.readSDState.cache = {};
	if (!Array.isArray(node.readSDState.fileList))
		node.readSDState.fileList = [];
	if (typeof node.readSDState.openedFileName !== "string")
		node.readSDState.openedFileName = "";
	return node.readSDState;
}

function rsdResetNodeData(node) {
	if (!node)
		return;
	node.readSDState = { fileList: [], cache: {}, openedFileName: "" };
	delete node.STAdata;
	delete node.STAdataAttributes;
	delete node.readSDFromSensorMeta;
	delete node.connectASensorMeta;
	delete node.readSDDisplayName;
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
}

function rsdIsEmptyCsvValue(v) {
	if (v === null || v === undefined)
		return true;
	if (typeof v === "string") {
		var s = v.trim();
		return !s || /^null$/i.test(s) || s === "-";
	}
	return false;
}

function rsdMapCsvColumnName(raw) {
	var key = String(raw || "").trim();
	var upper = key.toUpperCase();
	if (RSD_CSV_COLUMN_MAP[upper])
		return RSD_CSV_COLUMN_MAP[upper];
	if (RSD_CSV_COLUMN_MAP[key])
		return RSD_CSV_COLUMN_MAP[key];
	return key;
}

/* Map raw SD rows to ConnectASensor-compatible flat records. */
function rsdMapRowsToConnectASensorShape(rows, displayName) {
	var out = [], i, rec, mapped, key, dest, v;
	if (!rows || !rows.length)
		return out;
	for (i = 0; i < rows.length; i++) {
		rec = rows[i];
		if (!rec)
			continue;
		mapped = {};
		for (key in rec) {
			if (!Object.prototype.hasOwnProperty.call(rec, key))
				continue;
			v = rec[key];
			if (rsdIsEmptyCsvValue(v))
				continue;
			dest = rsdMapCsvColumnName(key);
			mapped[dest] = v;
		}
		if (displayName && !mapped.sensor_id)
			mapped.sensor_id = displayName;
		if (Object.keys(mapped).length)
			out.push(mapped);
	}
	return out;
}

function rsdMeasurementKeysFromData(data) {
	var keys = [], key, i, rec, props;
	props = (typeof ConnectASensorObsProps !== "undefined") ? ConnectASensorObsProps : null;
	if (!props || !data)
		return keys;
	for (i = 0; i < data.length; i++) {
		rec = data[i];
		if (!rec)
			continue;
		for (key in props) {
			if (!Object.prototype.hasOwnProperty.call(props, key))
				continue;
			if (rec[key] !== null && rec[key] !== undefined && rec[key] !== "" && keys.indexOf(key) === -1)
				keys.push(key);
		}
	}
	return keys;
}

function rsdGetDisplayName(info) {
	var ver, name;
	info = info || rsdSensorInfo || {};
	ver = info.hardwareVersion ? String(info.hardwareVersion).trim() : "";
	if (ver) {
		if (/smartcitizen/i.test(ver) || /^pmscan$/i.test(ver))
			return ver;
		return "Smartcitizen Kit " + ver;
	}
	if (info.portName)
		return String(info.portName).trim();
	if (info.hostname)
		return String(info.hostname).trim();
	if (info.usbId === "2341:804D")
		return "Smartcitizen Kit 2.1";
	return "";
}

function rsdDefaultNodeLabel() {
	if (typeof STAOperations !== "undefined" && STAOperations.readSDFromSensor && STAOperations.readSDFromSensor.description)
		return DonaCadena(STAOperations.readSDFromSensor.description);
	return DonaCadena({
		cat: "Llegeix SD del sensor",
		spa: "Lee SD del sensor",
		eng: "Read SD from sensor"
	});
}

function rsdUpdateNodeLabel(node, name) {
	var label;
	if (!node)
		return;
	if (name) {
		node.readSDDisplayName = name;
		label = DonaCadenaFmt({
			cat: "SD: {0}",
			spa: "SD: {0}",
			eng: "SD: {0}"
		}, name);
	} else {
		delete node.readSDDisplayName;
		label = rsdDefaultNodeLabel();
	}
	node.label = label;
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

function rsdMergeSensorInfoFromText(target, text) {
	var lines, i, line, colon, key, value, mapped, extra = [];
	if (!target || !text)
		return;
	lines = String(text).split("\n");
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || line === "SCK >")
			continue;
		colon = line.indexOf(":");
		if (colon < 1) {
			extra.push(line);
			continue;
		}
		key = line.substring(0, colon).trim();
		value = line.substring(colon + 1).trim();
		mapped = (typeof mapSensorInfoKey === "function") ? mapSensorInfoKey(key) : false;
		if (mapped === null)
			continue;
		if (mapped)
			target[mapped] = value;
		else
			extra.push(line);
	}
	if (extra.length)
		target.sensors = (target.sensors ? target.sensors + "\n" : "") + extra.join("\n");
}

function rsdApplySerialPortIdentity(serialPort, target) {
	var ident, key;
	if (!target)
		return;
	if (typeof readSerialPortIdentity === "function")
		ident = readSerialPortIdentity(serialPort);
	else
		ident = {};
	for (key in ident) {
		if (Object.prototype.hasOwnProperty.call(ident, key) && ident[key])
			target[key] = ident[key];
	}
}

async function rsdFetchSensorInfo() {
	var info = {}, commands, i, text;
	rsdApplySerialPortIdentity(rsdPort, info);
	info.connectionType = "USB";
	info.mode = info.mode || "sdcard";
	commands = ["version", "config", "sensor", "netinfo"];
	for (i = 0; i < commands.length; i++) {
		try {
			text = await rsdSendCommand(commands[i], 12000);
			rsdMergeSensorInfoFromText(info, text);
		} catch (err) {}
	}
	rsdSensorInfo = info;
	return info;
}

function rsdHasSensorInfo() {
	var key;
	for (key in rsdSensorInfo) {
		if (Object.prototype.hasOwnProperty.call(rsdSensorInfo, key) && rsdSensorInfo[key])
			return true;
	}
	return false;
}

function rsdFieldLabel(key) {
	if (typeof sensorInfoFieldLabel === "function")
		return sensorInfoFieldLabel(key);
	return key;
}

function rsdEffectiveSensorInfo() {
	var node, info;
	if (rsdHasSensorInfo())
		return rsdSensorInfo;
	node = getReadSDFromSensorNodeSafe();
	info = node && node.connectASensorMeta && node.connectASensorMeta.sensorInfo;
	return info || {};
}

function renderReadSDSensorInfo() {
	var el = document.getElementById("resultsFromSensor");
	var info = rsdEffectiveSensorInfo();
	var order = [
		"connectionType", "portName", "usbId", "hostname",
		"hardwareVersion", "firmwareVersion", "samHardwareId", "samVersion", "samBuildDate",
		"espVersion", "espBuildDate", "macAddress", "mode", "battery", "charging",
		"publishInterval", "readingInterval", "intervalCode", "ipAddress", "sensors"
	];
	var i, key, html, found = false;
	if (!el)
		return;
	html = "<div class=\"DialogConnectASensorInfo\"><dl>";
	for (i = 0; i < order.length; i++) {
		key = order[i];
		if (!info[key])
			continue;
		found = true;
		html += "<dt>" + rsdFieldLabel(key) + "</dt><dd>" +
			String(info[key]).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>") +
			"</dd>";
	}
	html += "</dl></div>";
	if (!found)
		html = "<p>" + DonaCadena({
			cat: "Encara no hi ha informació del sensor.",
			spa: "Todavía no hay información del sensor.",
			eng: "No sensor information yet."
		}) + "</p>";
	el.innerHTML = html;
}

function showReadSDSensorInfo(event) {
	var dlg;
	if (event)
		event.preventDefault();
	renderReadSDSensorInfo();
	dlg = document.getElementById("DialogConnectASensorInfo");
	if (dlg && !dlg.open)
		dlg.showModal();
}

/*
	Attach connectASensorMeta (same shape as ConnectASensor) so STA Entity Builder
	can prefill Sensors / Things / measurements from this SD lineage.
*/
function syncReadSDConnectASensorMeta(node, fileName) {
	var keys, displayName, infoCopy;
	if (!node)
		return;
	keys = rsdMeasurementKeysFromData(node.STAdata);
	displayName = rsdGetDisplayName(rsdSensorInfo) || node.readSDDisplayName || "";
	try {
		infoCopy = rsdSensorInfo ? JSON.parse(JSON.stringify(rsdSensorInfo)) : {};
	} catch (err) {
		infoCopy = {};
	}
	if (!infoCopy.connectionType)
		infoCopy.connectionType = "USB";
	if (!infoCopy.mode)
		infoCopy.mode = "sdcard";
	node.connectASensorMeta = {
		sensorInfo: infoCopy,
		connectionMode: "usb",
		displayName: displayName,
		intervalCode: null,
		intervalSec: null,
		pmEveryNIntervals: null,
		pmIntervalSec: null,
		measurementKeys: keys,
		collecting: false,
		usbMode: "sdcard",
		usbReadIntSec: null,
		usbPubIntSec: null,
		usbSensors: [],
		source: "readSDFromSensor",
		fileName: fileName || ""
	};
	node.readSDFromSensorMeta = {
		source: "usb-sd",
		fileName: fileName || "",
		rowCount: node.STAdata ? node.STAdata.length : 0,
		loadedAt: new Date().toISOString(),
		measurementKeys: keys.slice(),
		displayName: displayName
	};
}

function rsdGetCacheKey(fileName) {
	return String(fileName || "").toLowerCase();
}

function rsdGetCachedFile(node, fileName) {
	var state = rsdEnsureState(node);
	return state.cache[rsdGetCacheKey(fileName)] || null;
}

function rsdSetCachedFile(node, fileName, data, attributes) {
	var state = rsdEnsureState(node);
	state.cache[rsdGetCacheKey(fileName)] = {
		fileName: fileName,
		data: data,
		attributes: attributes
	};
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
}

function rsdRemoveCachedFile(node, fileName) {
	var state = rsdEnsureState(node);
	var key = rsdGetCacheKey(fileName);
	delete state.cache[key];
	if (state.openedFileName && rsdGetCacheKey(state.openedFileName) === key)
		state.openedFileName = "";
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
}

function rsdSetStatus(msg, isError) {
	var el = document.getElementById("DialogReadSDFromSensorStatus");
	if (!el)
		return;
	el.className = "rsdStatus" + (isError ? " rsdError" : "");
	el.textContent = msg || "";
}

function rsdUpdateButtons() {
	var node = getReadSDFromSensorNodeSafe();
	var state = rsdEnsureState(node);
	var connectBtn = document.getElementById("DialogReadSDFromSensorConnect");
	var disconnectBtn = document.getElementById("DialogReadSDFromSensorDisconnect");
	var infoBtn = document.getElementById("DialogReadSDFromSensorInfoBtn");
	var saveBtn = document.getElementById("DialogReadSDFromSensorSaveCsv");
	var useBtn = document.getElementById("DialogReadSDFromSensorUseInTapis");
	var connected = !!rsdPort && rsdConnected;
	var opened = state.openedFileName ? rsdGetCachedFile(node, state.openedFileName) : null;
	var hasPreview = !!(opened && opened.data && opened.data.length);
	var rows, i, btn, name, cached;
	if (connectBtn)
		connectBtn.disabled = connected || rsdBusy;
	if (disconnectBtn)
		disconnectBtn.disabled = !connected;
	if (infoBtn)
		infoBtn.disabled = !rsdHasSensorInfo() && !(node && node.connectASensorMeta && node.connectASensorMeta.sensorInfo);
	if (saveBtn)
		saveBtn.disabled = !hasPreview;
	if (useBtn)
		useBtn.disabled = !hasPreview;
	rows = document.querySelectorAll("#DialogReadSDFromSensorFileList [data-rsd-file]");
	for (i = 0; i < rows.length; i++) {
		name = rows[i].getAttribute("data-rsd-file");
		cached = !!rsdGetCachedFile(node, name);
		btn = rows[i].querySelector(".rsdOpenBtn");
		if (btn)
			btn.disabled = rsdBusy || (!connected && !cached);
		btn = rows[i].querySelector(".rsdDeleteBtn");
		if (btn)
			btn.disabled = !connected || rsdBusy;
	}
}

function rsdSetBusy(value) {
	rsdBusy = !!value;
	rsdUpdateButtons();
}

function rsdSleep(ms) {
	return new Promise(function (resolve) {
		setTimeout(resolve, ms);
	});
}

function rsdCleanOutput(text) {
	var lines = String(text || "").replace(/\r/g, "").split("\n");
	lines = lines.filter(function (line) {
		return !line.trim().startsWith("SCK > file -");
	});
	return lines.join("\n").trim();
}

function rsdShowFileList(files) {
	var listEl = document.getElementById("DialogReadSDFromSensorFileList");
	var node = getReadSDFromSensorNodeSafe();
	var state = rsdEnsureState(node);
	var html = [], i, name, esc, cached;
	if (!listEl)
		return;
	state.fileList = files || [];
	if (node && typeof networkNodes !== "undefined")
		networkNodes.update(node);
	if (!state.fileList.length) {
		listEl.innerHTML = "<p class=\"rsdHint\">" + DonaCadena({
			cat: "No s'han trobat fitxers a la SD.",
			spa: "No se han encontrado archivos en la SD.",
			eng: "No files found on the SD."
		}) + "</p>";
		rsdUpdateButtons();
		return;
	}
	html.push("<ul class=\"rsdFileList\">");
	for (i = 0; i < state.fileList.length; i++) {
		name = state.fileList[i];
		esc = String(name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
		cached = !!rsdGetCachedFile(node, name);
		html.push("<li data-rsd-file=\"", esc, "\">",
			"<span class=\"rsdFileName\">", esc,
			cached ? " <span class=\"rsdCachedMark\" title=\"" + DonaCadena({
				cat: "Ja carregat al node",
				spa: "Ya cargado en el nodo",
				eng: "Already loaded in the node"
			}) + "\">●</span>" : "",
			"</span>",
			"<span class=\"rsdFileActions\">",
			"<button type=\"button\" class=\"DialogReadSDFromSensorAction rsdOpenBtn\" data-rsd-file=\"", esc,
			"\" onclick=\"ReadSDFromSensorOpenFile(this.getAttribute('data-rsd-file'))\">",
			DonaCadena({ cat: "Obre", spa: "Abrir", eng: "Open" }),
			"</button>",
			"<button type=\"button\" class=\"DialogReadSDFromSensorAction rsdDeleteBtn\" data-rsd-file=\"", esc,
			"\" onclick=\"ReadSDFromSensorDeleteFile(this.getAttribute('data-rsd-file'))\">",
			DonaCadena({ cat: "Esborra", spa: "Borrar", eng: "Delete" }),
			"</button>",
			"</span></li>");
	}
	html.push("</ul>");
	listEl.innerHTML = html.join("");
	rsdUpdateButtons();
}

function rsdShowPreviewFromNode(node) {
	var state = rsdEnsureState(node);
	var tableEl = document.getElementById("DialogReadSDFromSensorTable");
	var titleEl = document.getElementById("DialogReadSDFromSensorTableTitle");
	var cached, data, attrs;
	if (!tableEl)
		return;
	cached = state.openedFileName ? rsdGetCachedFile(node, state.openedFileName) : null;
	if (titleEl) {
		titleEl.textContent = (cached && state.openedFileName)
			? DonaCadenaFmt({
				cat: "Contingut: {0}",
				spa: "Contenido: {0}",
				eng: "Content: {0}"
			}, state.openedFileName)
			: DonaCadena({
				cat: "Contingut del fitxer",
				spa: "Contenido del archivo",
				eng: "File content"
			});
	}
	if (!cached || !cached.data || !cached.data.length) {
		tableEl.innerHTML = "<p class=\"rsdHint\">" + DonaCadena({
			cat: "Obre un fitxer per veure'n el contingut.",
			spa: "Abre un archivo para ver su contenido.",
			eng: "Open a file to see its content."
		}) + "</p>";
		rsdUpdateButtons();
		return;
	}
	data = cached.data;
	attrs = cached.attributes || (typeof getDataAttributes === "function" ? getDataAttributes(data) : getDataAttributesSimple(data));
	if (typeof getHTMLTable === "function")
		tableEl.innerHTML = getHTMLTable(data, attrs, true, "", null, null, "", null, null, null, null, null, null);
	else
		tableEl.innerHTML = "<p>" + data.length + " rows</p>";
	rsdUpdateButtons();
}

function rsdClearOpenedPreview(node) {
	var state = rsdEnsureState(node);
	state.openedFileName = "";
	if (node && typeof networkNodes !== "undefined")
		networkNodes.update(node);
	rsdShowPreviewFromNode(node);
}

function rsdIsCsvFileName(fileName) {
	return /\.csv$/i.test(String(fileName || ""));
}

function rsdParseFileList(text) {
	var lines = String(text || "").replace(/\r/g, "").split("\n");
	var files = [], seen = {}, i, line, m, name;
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || /^SCK\s*>/i.test(line))
			continue;
		if (/^files found/i.test(line) || /^deleting\b/i.test(line))
			continue;
		/* List every SD file (CSV, TXT, …), e.g. "24-11-19.CSV" or "INFO.TXT". */
		m = line.match(/([A-Za-z0-9_.-]+\.[A-Za-z0-9]+)\b/);
		if (!m)
			continue;
		name = m[1];
		if (seen[name.toLowerCase()])
			continue;
		seen[name.toLowerCase()] = true;
		files.push(name);
	}
	files.sort(function (a, b) {
		return a.localeCompare(b, undefined, { sensitivity: "base" });
	});
	return files;
}

function rsdExtractFileContentFromOutput(text, preferCsv) {
	var lines, i, start, out, line;
	lines = String(text || "").replace(/\r/g, "").split("\n");
	start = -1;
	for (i = 0; i < lines.length; i++) {
		line = lines[i];
		if (/^SCK\s*>/i.test(line.trim()))
			continue;
		if (preferCsv) {
			if (line.indexOf(",") !== -1) {
				start = i;
				break;
			}
		} else if (line.trim()) {
			start = i;
			break;
		}
	}
	if (start < 0)
		return "";
	out = [];
	for (i = start; i < lines.length; i++) {
		if (/^SCK\s*>/i.test(lines[i].trim()))
			break;
		out.push(lines[i]);
	}
	return out.join("\n").trim();
}

/* CSV: header + drop next 3 junk rows. Other text: one row per line. */
function rsdParseFileForPreview(fileName, fileText) {
	var parsed, rows, lines, i, line;
	if (rsdIsCsvFileName(fileName)) {
		if (typeof Papa === "undefined" || !Papa.parse)
			return null;
		parsed = Papa.parse(fileText, {
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true
		});
		if (!parsed || !parsed.data)
			return null;
		return parsed.data.slice(3);
	}
	lines = String(fileText || "").replace(/\r/g, "").split("\n");
	rows = [];
	for (i = 0; i < lines.length; i++) {
		line = lines[i];
		if (line === "")
			continue;
		rows.push({ text: line });
	}
	return rows;
}

async function rsdReadLoop() {
	try {
		while (rsdReader) {
			var chunk = await rsdReader.read();
			if (chunk.done)
				break;
			if (!chunk.value)
				continue;
			rsdBuffer += chunk.value;
			rsdCommandOutput += chunk.value;
			rsdLastDataAt = Date.now();
		}
	} catch (err) {
		rsdSetStatus(DonaCadena({
			cat: "Error de lectura: ",
			spa: "Error de lectura: ",
			eng: "Read error: "
		}) + (err && err.message ? err.message : String(err)), true);
	}
}

async function rsdSendCommand(command, timeout) {
	var start, sawData, cleaned;
	if (!rsdPort || !rsdWriter || rsdBusy)
		return "";
	if (timeout == null)
		timeout = 10000;
	rsdSetBusy(true);
	rsdCommandOutput = "";
	rsdLastDataAt = Date.now();
	try {
		rsdSetStatus(DonaCadenaFmt({
			cat: "Executant: {0}",
			spa: "Ejecutando: {0}",
			eng: "Running: {0}"
		}, command), false);
		await rsdWriter.write(new TextEncoder().encode(command + "\r"));
		start = Date.now();
		sawData = false;
		while (Date.now() - start < timeout) {
			await rsdSleep(200);
			if (rsdCommandOutput.length > 0)
				sawData = true;
			if (sawData && Date.now() - rsdLastDataAt > 1200 && rsdCommandOutput.indexOf("SCK") !== -1)
				break;
		}
		cleaned = rsdCleanOutput(rsdCommandOutput);
		if (Date.now() - start >= timeout)
			rsdSetStatus(DonaCadena({
				cat: "Temps d'espera esgotat; el resultat pot ser parcial.",
				spa: "Tiempo de espera agotado; el resultado puede ser parcial.",
				eng: "Timeout; result may be partial."
			}), true);
		return cleaned;
	} catch (err) {
		rsdSetStatus(DonaCadena({
			cat: "Error enviant l'ordre.",
			spa: "Error enviando la orden.",
			eng: "Error sending the command."
		}), true);
		return "";
	} finally {
		rsdSetBusy(false);
		rsdUpdateButtons();
	}
}

async function ReadSDFromSensorConnect(event) {
	var node;
	if (event)
		event.preventDefault();
	if (!("serial" in navigator)) {
		rsdSetStatus(DonaCadena({
			cat: "Aquest navegador no admet Web Serial (cal Chrome/Edge).",
			spa: "Este navegador no admite Web Serial (hace falta Chrome/Edge).",
			eng: "This browser does not support Web Serial (Chrome/Edge required)."
		}), true);
		return;
	}
	node = getReadSDFromSensorNodeSafe();
	try {
		if (rsdPort)
			await ReadSDFromSensorDisconnect(true);
		/* New connection = new sensor session: wipe this node's previous SD data. */
		rsdSensorInfo = {};
		rsdResetNodeData(node);
		rsdShowFileList([]);
		rsdShowPreviewFromNode(node);
		rsdPort = await navigator.serial.requestPort();
		await rsdPort.open({ baudRate: 115200 });
		var decoder = new TextDecoderStream();
		rsdPort.readable.pipeTo(decoder.writable);
		rsdReader = decoder.readable.getReader();
		rsdWriter = rsdPort.writable.getWriter();
		rsdBuffer = "";
		rsdCommandOutput = "";
		rsdConnected = true;
		rsdReadTask = rsdReadLoop();
		rsdSetStatus(DonaCadena({
			cat: "USB connectat. Obtenint informació del sensor…",
			spa: "USB conectado. Obteniendo información del sensor…",
			eng: "USB connected. Fetching sensor information…"
		}), false);
		rsdUpdateButtons();
		await rsdSleep(600);
		await rsdFetchSensorInfo();
		if (node) {
			rsdUpdateNodeLabel(node, rsdGetDisplayName(rsdSensorInfo));
			/* Persist identity early so Entity Builder works even before Select. */
			syncReadSDConnectASensorMeta(node, "");
			if (typeof networkNodes !== "undefined")
				networkNodes.update(node);
		}
		rsdSetStatus(DonaCadena({
			cat: "USB connectat. Obtenint la llista de fitxers…",
			spa: "USB conectado. Obteniendo la lista de archivos…",
			eng: "USB connected. Fetching the file list…"
		}), false);
		await ReadSDFromSensorRefreshFileList();
	} catch (err) {
		rsdSetStatus(DonaCadenaFmt({
			cat: "Error de connexió: {0}",
			spa: "Error de conexión: {0}",
			eng: "Connection error: {0}"
		}, err && err.message ? err.message : String(err)), true);
		try {
			await ReadSDFromSensorDisconnect(true);
		} catch (e) {}
		rsdUpdateButtons();
	}
}

async function ReadSDFromSensorDisconnect(quiet) {
	var node;
	try {
		if (rsdReader) {
			try {
				await rsdReader.cancel();
			} catch (e) {}
			try {
				rsdReader.releaseLock();
			} catch (e) {}
			rsdReader = null;
		}
		if (rsdWriter) {
			try {
				rsdWriter.releaseLock();
			} catch (e) {}
			rsdWriter = null;
		}
		if (rsdPort) {
			try {
				await rsdPort.close();
			} catch (e) {}
		}
	} catch (err) {}
	rsdPort = null;
	rsdConnected = false;
	rsdBusy = false;
	/* Keep per-node cache; only drop the USB link. */
	node = getReadSDFromSensorNodeSafe();
	if (node) {
		rsdShowFileList(rsdEnsureState(node).fileList);
		rsdShowPreviewFromNode(node);
	}
	if (!quiet)
		rsdSetStatus(DonaCadena({
			cat: "Sensor desconnectat.",
			spa: "Sensor desconectado.",
			eng: "Sensor disconnected."
		}), false);
	rsdUpdateButtons();
}

async function ReadSDFromSensorRefreshFileList() {
	var text, files, node;
	if (!rsdConnected)
		return;
	node = getReadSDFromSensorNodeSafe();
	text = await rsdSendCommand("file -ls", 15000);
	files = rsdParseFileList(text);
	rsdShowFileList(files);
	rsdSetStatus(DonaCadenaFmt({
		cat: "{0} fitxer(s) a la SD.",
		spa: "{0} archivo(s) en la SD.",
		eng: "{0} file(s) on the SD."
	}, files.length), false);
	if (node && typeof networkNodes !== "undefined")
		networkNodes.update(node);
}

async function ReadSDFromSensorOpenFile(fileName) {
	var text, fileText, rows, node, state, cached, attrs, isCsv;
	node = getReadSDFromSensorNodeSafe();
	state = rsdEnsureState(node);
	if (!fileName || !/^[a-zA-Z0-9_.-]+$/.test(fileName)) {
		rsdSetStatus(DonaCadena({
			cat: "Nom de fitxer no vàlid.",
			spa: "Nombre de archivo no válido.",
			eng: "Invalid file name."
		}), true);
		return;
	}
	if (rsdBusy)
		return;
	cached = rsdGetCachedFile(node, fileName);
	if (cached && cached.data && cached.data.length) {
		state.openedFileName = fileName;
		if (node && typeof networkNodes !== "undefined")
			networkNodes.update(node);
		rsdShowPreviewFromNode(node);
		rsdSetStatus(DonaCadenaFmt({
			cat: "{0}: {1} files (des de la memòria del node).",
			spa: "{0}: {1} filas (desde la memoria del nodo).",
			eng: "{0}: {1} rows (from node memory)."
		}, fileName, cached.data.length), false);
		return;
	}
	if (!rsdConnected) {
		rsdSetStatus(DonaCadena({
			cat: "Connecta el sensor per obrir un fitxer encara no carregat.",
			spa: "Conecta el sensor para abrir un archivo aún no cargado.",
			eng: "Connect the sensor to open a file not yet loaded."
		}), true);
		return;
	}
	isCsv = rsdIsCsvFileName(fileName);
	rsdSetStatus(DonaCadenaFmt({
		cat: "Obrint {0}…",
		spa: "Abriendo {0}…",
		eng: "Opening {0}…"
	}, fileName), false);
	text = await rsdSendCommand("file -less " + fileName, 60000);
	fileText = rsdExtractFileContentFromOutput(text, isCsv);
	if (!fileText) {
		rsdSetStatus(DonaCadena({
			cat: "No s'ha pogut llegir el fitxer del sensor.",
			spa: "No se ha podido leer el archivo del sensor.",
			eng: "Could not read the file from the sensor."
		}), true);
		return;
	}
	rows = rsdParseFileForPreview(fileName, fileText);
	if (!rows || !rows.length) {
		rsdSetStatus(isCsv
			? DonaCadena({
				cat: "El CSV no té files de dades (després d'eliminar les 3 primeres).",
				spa: "El CSV no tiene filas de datos (tras eliminar las 3 primeras).",
				eng: "The CSV has no data rows (after removing the first 3)."
			})
			: DonaCadena({
				cat: "El fitxer no té contingut per mostrar.",
				spa: "El archivo no tiene contenido para mostrar.",
				eng: "The file has no content to show."
			}), true);
		return;
	}
	if (isCsv && typeof TransformDatesToISO === "function" && node)
		TransformDatesToISO(rows, node);
	attrs = typeof getDataAttributes === "function"
		? getDataAttributes(rows)
		: (typeof getDataAttributesSimple === "function" ? getDataAttributesSimple(rows) : {});
	rsdSetCachedFile(node, fileName, rows, attrs);
	state.openedFileName = fileName;
	if (node && typeof networkNodes !== "undefined")
		networkNodes.update(node);
	rsdShowFileList(state.fileList);
	rsdShowPreviewFromNode(node);
	rsdSetStatus(isCsv
		? DonaCadenaFmt({
			cat: "{0}: {1} files (s'han eliminat 3 registres després de la capçalera).",
			spa: "{0}: {1} filas (se han eliminado 3 registros después de la cabecera).",
			eng: "{0}: {1} rows (removed 3 records after the header)."
		}, fileName, rows.length)
		: DonaCadenaFmt({
			cat: "{0}: {1} línies.",
			spa: "{0}: {1} líneas.",
			eng: "{0}: {1} lines."
		}, fileName, rows.length), false);
}

async function ReadSDFromSensorDeleteFile(fileName) {
	var node, state, i;
	node = getReadSDFromSensorNodeSafe();
	state = rsdEnsureState(node);
	if (!fileName || !/^[a-zA-Z0-9_.-]+$/.test(fileName)) {
		rsdSetStatus(DonaCadena({
			cat: "Nom de fitxer no vàlid.",
			spa: "Nombre de archivo no válido.",
			eng: "Invalid file name."
		}), true);
		return;
	}
	if (!rsdConnected || rsdBusy)
		return;
	if (!confirm(DonaCadenaFmt({
		cat: "Esteu segur que voleu esborrar «{0}» de la SD? Aquesta acció no es pot desfer.",
		spa: "¿Está seguro de que quiere borrar «{0}» de la SD? Esta acción no se puede deshacer.",
		eng: "Are you sure you want to delete “{0}” from the SD? This cannot be undone."
	}, fileName)))
		return;
	rsdSetStatus(DonaCadenaFmt({
		cat: "Esborrant {0}…",
		spa: "Borrando {0}…",
		eng: "Deleting {0}…"
	}, fileName), false);
	await rsdSendCommand("file -rm " + fileName, 15000);
	rsdRemoveCachedFile(node, fileName);
	for (i = state.fileList.length - 1; i >= 0; i--) {
		if (rsdGetCacheKey(state.fileList[i]) === rsdGetCacheKey(fileName))
			state.fileList.splice(i, 1);
	}
	if (node && typeof networkNodes !== "undefined")
		networkNodes.update(node);
	rsdShowFileList(state.fileList);
	rsdShowPreviewFromNode(node);
	rsdSetStatus(DonaCadenaFmt({
		cat: "S'ha esborrat {0}.",
		spa: "Se ha borrado {0}.",
		eng: "Deleted {0}."
	}, fileName), false);
}

function ReadSDFromSensorSaveAsCsv(event) {
	var node, state, cached, delimiter, baseName;
	if (event)
		event.preventDefault();
	node = getReadSDFromSensorNodeSafe();
	state = rsdEnsureState(node);
	cached = state.openedFileName ? rsdGetCachedFile(node, state.openedFileName) : null;
	if (!cached || !cached.data || !cached.data.length) {
		rsdSetStatus(DonaCadena({
			cat: "No hi ha dades per desar.",
			spa: "No hay datos para guardar.",
			eng: "No data to save."
		}), true);
		return;
	}
	delimiter = ";";
	baseName = state.openedFileName ? state.openedFileName.replace(/\.[^.]+$/i, "") : "table";
	if (typeof SaveLocalDataFile !== "function" || typeof Papa === "undefined" || !Papa.unparse) {
		rsdSetStatus(DonaCadena({
			cat: "No es pot desar el CSV (funcions SaveAs no disponibles).",
			spa: "No se puede guardar el CSV (funciones SaveAs no disponibles).",
			eng: "Cannot save CSV (SaveAs functions not available)."
		}), true);
		return;
	}
	SaveLocalDataFile(
		Papa.unparse(
			typeof StringifyObjectElements === "function"
				? StringifyObjectElements(cached.data, cached.attributes)
				: cached.data,
			{ quotes: false, quoteChar: '"', escapeChar: '"', delimiter: delimiter, header: true, newline: "\r\n", skipEmptyLines: "greedy" }
		),
		baseName,
		".csv",
		"application/vnd.ms-excel"
	);
	rsdSetStatus(DonaCadena({
		cat: "CSV descarregat.",
		spa: "CSV descargado.",
		eng: "CSV downloaded."
	}), false);
}

function ReadSDFromSensorSelectForTapis(event) {
	var node = getReadSDFromSensorNodeSafe();
	var state = rsdEnsureState(node);
	var cached, mapped, displayName, attrs;
	if (event)
		event.preventDefault();
	if (!node) {
		rsdSetStatus(DonaCadena({
			cat: "No s'ha trobat el node.",
			spa: "No se ha encontrado el nodo.",
			eng: "Node not found."
		}), true);
		return;
	}
	cached = state.openedFileName ? rsdGetCachedFile(node, state.openedFileName) : null;
	if (!cached || !cached.data || !cached.data.length) {
		rsdSetStatus(DonaCadena({
			cat: "Obre un fitxer abans de seleccionar-lo per a TAPIS.",
			spa: "Abre un archivo antes de seleccionarlo para TAPIS.",
			eng: "Open a file before selecting it for TAPIS."
		}), true);
		return;
	}
	if (!rsdHasSensorInfo() && node.connectASensorMeta && node.connectASensorMeta.sensorInfo) {
		try {
			rsdSensorInfo = JSON.parse(JSON.stringify(node.connectASensorMeta.sensorInfo)) || {};
		} catch (err) {}
	}
	displayName = rsdGetDisplayName(rsdSensorInfo) || node.readSDDisplayName ||
		(node.connectASensorMeta && node.connectASensorMeta.displayName) || "";
	/* Map SD headers (TEMP, HUM, …) → ConnectASensor keys (temperature, …). */
	mapped = rsdMapRowsToConnectASensorShape(cached.data, displayName);
	if (!mapped.length) {
		rsdSetStatus(DonaCadena({
			cat: "No hi ha files amb dades vàlides després del mapeig.",
			spa: "No hay filas con datos válidos tras el mapeo.",
			eng: "No rows with valid data after mapping."
		}), true);
		return;
	}
	node.STAdata = mapped;
	attrs = (typeof buildConnectASensorDataAttributes === "function")
		? buildConnectASensorDataAttributes(mapped)
		: (typeof getDataAttributes === "function" ? getDataAttributes(mapped) : {});
	node.STAdataAttributes = attrs;
	syncReadSDConnectASensorMeta(node, state.openedFileName || "");
	if (displayName)
		rsdUpdateNodeLabel(node, displayName);
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	if (typeof updateQueryAndTableArea === "function")
		updateQueryAndTableArea(node);
	if (typeof ShowTableNode === "function")
		ShowTableNode(node);
	rsdSetStatus(DonaCadenaFmt({
		cat: "Seleccionat per a TAPIS: {0} files de {1}.",
		spa: "Seleccionado para TAPIS: {0} filas de {1}.",
		eng: "Selected for TAPIS: {0} rows from {1}."
	}, mapped.length, state.openedFileName || ""), false);
	closeReadSDFromSensorDialog(event);
}

function openReadSDFromSensorDialog(node) {
	var state, metaInfo;
	if (!node)
		node = getReadSDFromSensorNodeSafe();
	if (!node)
		return;
	state = rsdEnsureState(node);
	/* Restore sensorInfo from node meta when reopening without a live USB session. */
	if (!rsdHasSensorInfo() && node.connectASensorMeta && node.connectASensorMeta.sensorInfo) {
		try {
			metaInfo = JSON.parse(JSON.stringify(node.connectASensorMeta.sensorInfo));
			rsdSensorInfo = metaInfo || {};
		} catch (err) {}
	}
	rsdShowFileList(state.fileList.slice());
	rsdShowPreviewFromNode(node);
	rsdUpdateButtons();
	if (rsdConnected) {
		rsdSetStatus(DonaCadenaFmt({
			cat: "USB connectat. {0} fitxer(s) a la llista.",
			spa: "USB conectado. {0} archivo(s) en la lista.",
			eng: "USB connected. {0} file(s) in the list."
		}, state.fileList.length), false);
	} else if (state.fileList.length || Object.keys(state.cache).length) {
		rsdSetStatus(DonaCadena({
			cat: "Sensor desconnectat. Pots reobrir fitxers ja carregats al node.",
			spa: "Sensor desconectado. Puedes reabrir archivos ya cargados en el nodo.",
			eng: "Sensor disconnected. You can reopen files already loaded in the node."
		}), false);
	} else {
		rsdSetStatus(DonaCadena({
			cat: "Connecta el sensor per començar.",
			spa: "Conecta el sensor para empezar.",
			eng: "Connect the sensor to start."
		}), false);
	}
}

function closeReadSDFromSensorDialog(event) {
	if (event)
		event.preventDefault();
	ReadSDFromSensorDisconnect(true);
	if (typeof hideNodeDialog === "function")
		hideNodeDialog("DialogReadSDFromSensor", event);
}

function ReadSDFromSensorOnDialogClose(event) {
	ReadSDFromSensorDisconnect(true);
	if (typeof hideNodeDialog === "function")
		hideNodeDialog("DialogReadSDFromSensor", event);
}
