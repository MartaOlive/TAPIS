"use strict"

/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able to 
	work with STA data as tables.
  
	The TAPIS client is free software under the terms of the MIT License

	Copyright (c) 2023-2026 Joan Masó

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
	
	The TAPIS can be updated from https://github.com/grumets/tapis.
*/

var port = null;
var reader = null;
var writer = null;

/* "usb" (Smartcitizen Kit sèrie) | "ble" (PMSCAN) | null */
var connectionMode = null;

var sensorValues = {};
var sensorInfo = {};

// Últims PM vàlids (només s'omplen quan n'hi ha una lectura real)
var lastPmValues = null;
var ConnectASensorPmKeys = ["pm1", "pm25", "pm10"];

// Històric de lectures
var sensorRecords = [];

// Indica quina resposta estem esperant
var waitingFor = null;

// Promise que es resol quan arriba la resposta
var responseResolve = null;

// Timeout de seguretat
var responseTimeout = null;

// Buffer per acumular fragments de dades sèrie
var responseBuffer = "";

// Resposta multilínia fins al prompt SCK >
var waitingForPrompt = false;
var promptLines = [];
var promptResolve = null;
var promptTimeout = null;

// Comptador dels intervals de 60 segons
var monitoringInterval = 0;

/*
 * PMSCAN / Polluscan (TERA) — UUIDs de https://skmove.io/tera/pmscan/webapp/
 */
var PMSCAN_SERVICE = "f3641900-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_RT_DATA = "f3641901-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_IM_DATA = "f3641902-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_OTH = "f3641903-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_BATTERY = "f3641904-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_CHARGING = "f3641905-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_TIME = "f3641906-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_INTERVAL = "f3641907-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_MODE = "f3641908-00b0-4240-ba50-05ca45bf8abc";
var PMSCAN_EPOCH_2000 = 946684800;
var PMSCAN_BLE_OPTIONAL_SERVICES = [
	PMSCAN_SERVICE,
	"battery_service",
	"device_information",
	"generic_access"
];
var ConnectASensorPmscanObsKeys = {
	temperature: true,
	humidity: true,
	pm1: true,
	pm25: true,
	pm10: true
};

var bleDevice = null;
var bleServer = null;
var bleService = null;
var bleHasPmscan = false;
var pmscanRtChar = null;
var pmscanImChar = null;
var pmscanBatteryChar = null;
var pmscanChargingChar = null;
var pmscanIntervalChar = null;
var pmscanBattery = null;
var pmscanCharging = null;
var casTableRefreshTimer = null;
var lastPmscanSavedTimestamp = null;

/* Fallback si el select no és al DOM: codi TERA 1 = 1 min */
var CONNECT_A_SENSOR_DEFAULT_INTERVAL_CODE = 1;
var CONNECT_A_SENSOR_INTERVAL_SEC_BY_CODE = {
	"5": 1,
	"4": 5,
	"3": 10,
	"2": 30,
	"1": 60,
	"0": 300
};

function hasConnectASensorInfo() {
	var key;
	for (key in sensorInfo) {
		if (sensorInfo.hasOwnProperty(key) && sensorInfo[key])
			return true;
	}
	return false;
}

var collectingData = false;
var monitoringRunning = false;
var monitoringWaitTimeout = null;
var monitoringWaitResolve = null;

/* Configuració USB SCK (panell DialogConnectASensorUsbConfig) */
var usbConfigBusy = false;
var usbReadIntSec = null;
var usbPubIntSec = null;
var usbKitMode = null;
var usbClockEpochMs = null;
var usbClockSyncedAt = null;
var usbClockTimer = null;
var usbSensorRows = [];
var lastConnectASensorSaveAt = null;
var forceImmediateConnectASensorRead = false;
var USB_INTERVAL_MIN = 30;
var USB_INTERVAL_MAX = 3600;
var USB_SENSOR_GROUPS = [
	{ id: "temperature", label: {cat: "Temperatura", spa: "Temperatura", eng: "Temperature"}, match: [/^Temperature$/i], cmd: "Temperature" },
	{ id: "humidity", label: {cat: "Humitat", spa: "Humedad", eng: "Humidity"}, match: [/^Humidity$/i], cmd: "Humidity" },
	{ id: "noise", label: {cat: "Soroll", spa: "Ruido", eng: "Noise"}, match: [/^Noise dBA$/i], cmd: "Noise" },
	{ id: "light", label: {cat: "Llum", spa: "Luz", eng: "Light"}, match: [/^Light$/i], cmd: "Light" },
	{ id: "pressure", label: {cat: "Pressió", spa: "Presión", eng: "Pressure"}, match: [/^Barometric pressure$/i], cmd: "Barometric pressure" },
	{ id: "gases", label: {cat: "Gasos (VOC + eCO2)", spa: "Gases (VOC + eCO2)", eng: "Gases (VOC + eCO2)"}, match: [/^VOC Gas CCS811$/i, /^eCO2 Gas CCS811$/i], cmd: "VOC Gas CCS811" },
	{ id: "pm", label: {cat: "PM (1.0 / 2.5 / 10.0)", spa: "PM (1.0 / 2.5 / 10.0)", eng: "PM (1.0 / 2.5 / 10.0)"}, match: [/^PM 1\.0$/i, /^PM 2\.5$/i, /^PM 10\.0$/i], cmd: "PM" },
	{ id: "battery", label: {cat: "Bateria", spa: "Batería", eng: "Battery"}, match: [/^Battery$/i, /^Battery\b/i], cmd: "Battery" }
];

function getConnectASensorNodeSafe() {
	if (typeof getNodeDialog !== "function")
		return null;
	try {
		return getNodeDialog("DialogConnectASensor");
	} catch (err) {
		return null;
	}
}

function connectASensorHasCollectedData() {
	var node = getConnectASensorNodeSafe();
	if (node && node.STAdata && node.STAdata.length)
		return true;
	return sensorRecords && sensorRecords.length > 0;
}

function getConnectASensorIntervalCode() {
	var sel = document.getElementById("DialogConnectASensorInterval");
	var code;
	if (sel && sel.value !== "" && sel.value !== undefined)
		code = Number(sel.value);
	else
		code = CONNECT_A_SENSOR_DEFAULT_INTERVAL_CODE;
	if (!isFinite(code) || code < 0 || code > 5)
		code = CONNECT_A_SENSOR_DEFAULT_INTERVAL_CODE;
	return code;
}

function getConnectASensorIntervalSeconds() {
	var code, sec;
	if (connectionMode === "usb" && usbReadIntSec != null && isFinite(usbReadIntSec) && usbReadIntSec > 0)
		return usbReadIntSec;
	code = getConnectASensorIntervalCode();
	sec = CONNECT_A_SENSOR_INTERVAL_SEC_BY_CODE[String(code)];
	return sec != null ? sec : 60;
}

function formatConnectASensorIntervalLabel(sec) {
	if (sec >= 60 && sec % 60 === 0)
		return (sec / 60) + " min";
	return sec + " s";
}

async function onConnectASensorIntervalChange(event) {
	var code, sec, node;
	if (event)
		event.preventDefault();
	code = getConnectASensorIntervalCode();
	sec = getConnectASensorIntervalSeconds();
	sensorInfo.readingInterval = formatConnectASensorIntervalLabel(sec);
	sensorInfo.intervalCode = String(code);
	if (connectionMode === "ble" && bleHasPmscan && isConnectASensorBleLive()) {
		try {
			await writePmscanInterval(code);
		} catch (err) {
			showInfoMessage(
				{cat: "Error canviant l'interval: {0}", spa: "Error al cambiar el intervalo: {0}", eng: "Error changing interval: {0}"},
				err && err.message ? err.message : String(err)
			);
		}
	}
	renderConnectASensorInfo();
	node = getConnectASensorNodeSafe();
	if (node)
		syncConnectASensorMeta(node);
}

function interruptConnectASensorWait() {
	if (monitoringWaitTimeout) {
		clearTimeout(monitoringWaitTimeout);
		monitoringWaitTimeout = null;
	}
	if (monitoringWaitResolve) {
		monitoringWaitResolve();
		monitoringWaitResolve = null;
	}
}

/*
	Espera fins a un instant absolut (inici de cicle + Mesura/readint).
	Així l'interval del kit marca el ritme de files a la taula:
	si les lectures triguen menys que l'interval, s'espera la resta;
	si triguen més, el cicle següent comença de seguida.
*/
function waitConnectASensorUntil(deadlineMs) {
	var remainingMs;
	if (forceImmediateConnectASensorRead) {
		forceImmediateConnectASensorRead = false;
		return Promise.resolve();
	}
	remainingMs = (deadlineMs != null && isFinite(deadlineMs)) ? (deadlineMs - Date.now()) : 0;
	if (!isFinite(remainingMs) || remainingMs < 50)
		return Promise.resolve();
	return new Promise(function (resolve) {
		monitoringWaitResolve = resolve;
		monitoringWaitTimeout = setTimeout(function () {
			monitoringWaitTimeout = null;
			monitoringWaitResolve = null;
			resolve();
		}, remainingMs);
	});
}

function waitConnectASensorInterval() {
	var sec = getConnectASensorIntervalSeconds();
	var base = lastConnectASensorSaveAt != null ? lastConnectASensorSaveAt : Date.now();
	return waitConnectASensorUntil(base + sec * 1000);
}

async function stopConnectASensorMonitoringLoop() {
	var n = 0;
	collectingData = false;
	interruptConnectASensorWait();
	while (monitoringRunning && n < 150) {
		await casSleep(100);
		n++;
	}
}

function isConnectASensorBleLive() {
	return !!(bleDevice && bleDevice.gatt && bleDevice.gatt.connected);
}

function isConnectASensorConnected() {
	if (connectionMode === "usb")
		return !!port;
	if (connectionMode === "ble")
		return !!(isConnectASensorBleLive() && bleHasPmscan);
	return false;
}

function shouldCollectConnectASensor() {
	return !!(isConnectASensorConnected() && collectingData);
}

function stopConnectASensorCollecting(event) {
	if (event)
		event.preventDefault();
	collectingData = false;
	interruptConnectASensorWait();
	updateConnectASensorConnectionButtons();
	showInfoMessage({cat: "S'ha aturat la recollida de dades.", spa: "Se ha detenido la recogida de datos.", eng: "Data collection stopped."});
}

function resumeConnectASensorCollecting(event) {
	if (event)
		event.preventDefault();
	if (!isConnectASensorConnected())
		return;
	collectingData = true;
	updateConnectASensorConnectionButtons();
	if (connectionMode === "usb" && !monitoringRunning)
		startMonitoring();
}

var ConnectASensorObsProps = {
	temperature: {
		name: "Temperature",
		description: "Air temperature",
		definition: "http://www.opengis.net/def/property/OGC/0/Temperature",
		UoM: "degree Celsius",
		UoMSymbol: "°C",
		UoMDefinition: "http://www.qudt.org/vocab/unit/DEG_C"
	},
	humidity: {
		name: "Humidity",
		description: "Relative humidity",
		definition: "http://www.opengis.net/def/property/OGC/0/RelativeHumidity",
		UoM: "percent",
		UoMSymbol: "%",
		UoMDefinition: "http://www.qudt.org/vocab/unit/PERCENT"
	},
	light: {
		name: "Light",
		description: "Ambient light",
		definition: "http://www.opengis.net/def/property/OGC/0/Illuminance",
		UoM: "lux",
		UoMSymbol: "lx",
		UoMDefinition: "http://www.qudt.org/vocab/unit/LUX"
	},
	noiseDBA: {
		name: "Noise dBA",
		description: "Ambient noise level",
		definition: "http://www.opengis.net/def/property/OGC/0/SoundPressureLevel",
		UoM: "A-weighted decibel",
		UoMSymbol: "dBA",
		UoMDefinition: "http://www.qudt.org/vocab/unit/DecibelA"
	},
	barometricPressure: {
		name: "Barometric pressure",
		description: "Barometric pressure",
		definition: "http://www.opengis.net/def/property/OGC/0/AtmosphericPressure",
		UoM: "pascal",
		UoMSymbol: "Pa",
		UoMDefinition: "http://www.qudt.org/vocab/unit/PA"
	},
	vocGasCCS811: {
		name: "VOC Gas CCS811",
		description: "Total volatile organic compounds (CCS811)",
		definition: "http://www.opengis.net/def/property/OGC/0/Concentration",
		UoM: "part per billion",
		UoMSymbol: "ppb",
		UoMDefinition: "http://www.qudt.org/vocab/unit/PPB"
	},
	eco2GasCCS811: {
		name: "eCO2 Gas CCS811",
		description: "Equivalent CO2 (CCS811)",
		definition: "http://www.opengis.net/def/property/OGC/0/CO2",
		UoM: "part per million",
		UoMSymbol: "ppm",
		UoMDefinition: "http://www.qudt.org/vocab/unit/PPM"
	},
	pm1: {
		name: "PM 1.0",
		description: "Particulate matter PM1.0",
		definition: "http://www.opengis.net/def/property/OGC/0/PM1",
		UoM: "microgram per cubic metre",
		UoMSymbol: "µg/m³",
		UoMDefinition: "http://www.qudt.org/vocab/unit/MicroGM-PER-M3"
	},
	pm25: {
		name: "PM 2.5",
		description: "Particulate matter PM2.5",
		definition: "http://www.opengis.net/def/property/OGC/0/PM2.5",
		UoM: "microgram per cubic metre",
		UoMSymbol: "µg/m³",
		UoMDefinition: "http://www.qudt.org/vocab/unit/MicroGM-PER-M3"
	},
	pm10: {
		name: "PM 10.0",
		description: "Particulate matter PM10",
		definition: "http://www.opengis.net/def/property/OGC/0/PM10",
		UoM: "microgram per cubic metre",
		UoMSymbol: "µg/m³",
		UoMDefinition: "http://www.qudt.org/vocab/unit/MicroGM-PER-M3"
	}
};

function buildConnectASensorDataAttributes(data) {
	var attrs = (typeof getDataAttributes === "function") ? getDataAttributes(data || []) : {};
	var key, spec;
	attrs.timestamp = attrs.timestamp || {};
	attrs.timestamp.type = "isodatetime";
	attrs.timestamp.description = "Measurement timestamp";
	attrs.timestamp.definition = "http://www.opengis.net/def/docs/15-078r6/Observation/phenomenonTime";
	attrs.sensor_id = attrs.sensor_id || {};
	attrs.sensor_id.type = "string";
	attrs.sensor_id.description = "Sensor / device identifier";
	for (key in ConnectASensorObsProps) {
		if (!Object.prototype.hasOwnProperty.call(ConnectASensorObsProps, key))
			continue;
		if (!attrs[key]) {
			var found = false, di;
			if (data) {
				for (di = 0; di < data.length; di++) {
					if (data[di] && data[di][key] !== undefined && data[di][key] !== null && data[di][key] !== "") {
						found = true;
						break;
					}
				}
			}
			if (!found)
				continue;
		}
		spec = ConnectASensorObsProps[key];
		attrs[key] = attrs[key] || {};
		attrs[key].type = attrs[key].type || "number";
		attrs[key].description = spec.description;
		attrs[key].definition = spec.definition;
		attrs[key].UoM = spec.UoM;
		attrs[key].UoMSymbol = spec.UoMSymbol;
		attrs[key].UoMDefinition = spec.UoMDefinition;
	}
	return attrs;
}

function syncConnectASensorMeta(node) {
	var keys = [], key, i, rec;
	if (!node)
		return;
	if (node.STAdata) {
		for (i = 0; i < node.STAdata.length; i++) {
			rec = node.STAdata[i];
			if (!rec)
				continue;
			for (key in ConnectASensorObsProps) {
				if (rec[key] !== null && rec[key] !== undefined && rec[key] !== "" && keys.indexOf(key) === -1)
					keys.push(key);
			}
		}
	}
	node.connectASensorMeta = {
		sensorInfo: sensorInfo ? JSON.parse(JSON.stringify(sensorInfo)) : {},
		connectionMode: connectionMode,
		displayName: getConnectASensorDisplayName() || "",
		intervalCode: getConnectASensorIntervalCode(),
		intervalSec: getConnectASensorIntervalSeconds(),
		pmEveryNIntervals: 5,
		pmIntervalSec: getConnectASensorIntervalSeconds() * 5,
		measurementKeys: keys,
		collecting: !!collectingData,
		usbMode: usbKitMode,
		usbReadIntSec: usbReadIntSec,
		usbPubIntSec: usbPubIntSec,
		usbSensors: usbSensorRows.map(function (r) {
			return { id: r.id, enabled: !!r.enabled, intervalSec: r.intervalSec, names: r.names.slice() };
		})
	};
	node.STAdataAttributes = buildConnectASensorDataAttributes(node.STAdata || []);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

function updateConnectASensorConnectionButtons() {
	var connectUsbBtn = document.getElementById("DialogConnectASensorConnectUsb");
	var connectBleBtn = document.getElementById("DialogConnectASensorConnectBle");
	var disconnectBtn = document.getElementById("DialogConnectASensorDisconnect");
	var infoBtn = document.getElementById("DialogConnectASensorInfoBtn");
	var stopBtn = document.getElementById("DialogConnectASensorStop");
	var resumeBtn = document.getElementById("DialogConnectASensorResume");
	var clearBtn = document.getElementById("DialogConnectASensorClearData");
	var intervalRow = document.querySelector("#DialogConnectASensor .DialogConnectASensorIntervalRow");
	var connected = isConnectASensorConnected();
	if (clearBtn)
		clearBtn.disabled = !connectASensorHasCollectedData();
	if (connectUsbBtn)
		connectUsbBtn.disabled = connected;
	if (connectBleBtn)
		connectBleBtn.disabled = connected;
	if (disconnectBtn)
		disconnectBtn.disabled = !connected;
	if (infoBtn)
		infoBtn.disabled = !hasConnectASensorInfo();
	if (stopBtn)
		stopBtn.disabled = !connected || !collectingData;
	if (resumeBtn)
		resumeBtn.disabled = !connected || collectingData;
	if (intervalRow)
		intervalRow.hidden = connectionMode === "usb";
	updateConnectASensorUsbConfigVisibility();
}

function showConnectASensorDeviceInfo(event) {
	var dlg;
	if (event)
		event.preventDefault();
	renderConnectASensorInfo();
	dlg = document.getElementById("DialogConnectASensorInfo");
	if (dlg && !dlg.open)
		dlg.showModal();
}

/*
	Esborra només les mesures recollides (node.STAdata, historial i últims valors).
	No desconnecta el sensor ni toca sensorInfo/connectionMode.
*/
function wipeConnectASensorCollectedData(node) {
	sensorValues = {};
	lastPmValues = null;
	sensorRecords = [];
	lastPmscanSavedTimestamp = null;
	if (node) {
		node.STAdata = [];
		syncConnectASensorMeta(node);
	}
}

function clearConnectASensorData(event) {
	var node;
	if (event)
		event.preventDefault();
	node = getConnectASensorNodeSafe();
	if (casTableRefreshTimer) {
		clearTimeout(casTableRefreshTimer);
		casTableRefreshTimer = null;
	}
	wipeConnectASensorCollectedData(node);
	ShowConnectASensorTableInDialog(node);
	updateConnectASensorConnectionButtons();
	if (node && !isConnectASensorDialogOpen())
		scheduleConnectASensorTableRefresh(node.id);
}

function resetConnectASensorSessionState() {
	/* Nova sessió USB/BLE: les dades d'una sessió anterior no es barregen amb les noves */
	wipeConnectASensorCollectedData(getConnectASensorNodeSafe());
	sensorInfo = {};
	responseBuffer = "";
	monitoringInterval = 0;
	collectingData = false;
	lastPmscanSavedTimestamp = null;
	lastConnectASensorSaveAt = null;
	forceImmediateConnectASensorRead = false;
	interruptConnectASensorWait();
	ConnectASensorResetUsbConfigState();
}

async function ConnectASensorConnectUsb(event) {
	var chosenPort;

	if (event)
		event.preventDefault();

	try {
		if (!navigator.serial)
			throw new Error(DonaCadena({cat: "Aquest navegador no admet Web Serial.", spa: "Este navegador no admite Web Serial.", eng: "This browser does not support Web Serial."}));

		/* requestPort immediatament (cal gest d'usuari) */
		chosenPort = await navigator.serial.requestPort();

		if (isConnectASensorConnected() || bleDevice || port)
			await disconnectSensor(true);

		port = chosenPort;
		await port.open({
			baudRate: 115200
		});

		writer = port.writable.getWriter();
		reader = port.readable.getReader();
		connectionMode = "usb";

		showInfoMessage({cat: "Sensor connectat per USB.", spa: "Sensor conectado por USB.", eng: "Sensor connected via USB."});
		updateConnectASensorConnectionButtons();

		resetConnectASensorSessionState();
		clearConnectASensorInfoPanel();

		readLoop();

		await getSensorInfo();
		sensorInfo.connectionType = "USB";
		sensorInfo.readingInterval = formatConnectASensorIntervalLabel(getConnectASensorIntervalSeconds());
		sensorInfo.intervalCode = String(getConnectASensorIntervalCode());
		renderConnectASensorInfo();
		syncConnectASensorMeta(getConnectASensorNodeSafe());
		ShowConnectASensorTableInDialog(getConnectASensorNodeSafe());
		updateConnectASensorConnectionButtons();

		try {
			await ConnectASensorLoadUsbConfig();
		} catch (cfgErr) {
			showInfoMessage(
				{cat: "No s'ha pogut carregar la configuració USB: {0}", spa: "No se ha podido cargar la configuración USB: {0}", eng: "Could not load USB configuration: {0}"},
				cfgErr && cfgErr.message ? cfgErr.message : String(cfgErr)
			);
		}

		collectingData = true;
		startMonitoring();

	} catch (error) {
		try {
			await disconnectSensor(true);
		} catch (e) {}
		connectionMode = null;
		showInfoMessage(
			{cat: "Error en connectar el sensor: {0}", spa: "Error al conectar el sensor: {0}", eng: "Error connecting sensor: {0}"},
			error && error.message ? error.message : String(error)
		);
		updateConnectASensorConnectionButtons();
	}
}

/* Compatibilitat amb crides antigues */
async function ConnectASensorSearchSensor(event) {
	return ConnectASensorConnectUsb(event);
}

function parsePmscanDataPayload(charValue) {
	var rawData, ts2000;
	if (!charValue)
		return null;
	rawData = new Uint8Array(
		charValue.buffer,
		charValue.byteOffset || 0,
		charValue.byteLength || charValue.buffer.byteLength
	);
	if (rawData.length < 18)
		return null;

	ts2000 = ((rawData[3] & 0xFF) << 24) |
		((rawData[2] & 0xFF) << 16) |
		((rawData[1] & 0xFF) << 8) |
		(rawData[0] & 0xFF);

	return {
		measuredAt: new Date((ts2000 + PMSCAN_EPOCH_2000) * 1000),
		timestamp: ts2000 + PMSCAN_EPOCH_2000,
		state: rawData[4],
		cmd: rawData[5],
		pm10pl: ((rawData[7] & 0xFF) << 8) | (rawData[6] & 0xFF),
		pm1gm: ((rawData[9] & 0xFF) << 8) | (rawData[8] & 0xFF),
		pm25gm: ((rawData[11] & 0xFF) << 8) | (rawData[10] & 0xFF),
		pm10gm: ((rawData[13] & 0xFF) << 8) | (rawData[12] & 0xFF),
		temp: ((rawData[15] & 0xFF) << 8) | (rawData[14] & 0xFF),
		hum: ((rawData[17] & 0xFF) << 8) | (rawData[16] & 0xFF),
		battery: pmscanBattery,
		charging: pmscanCharging
	};
}

function savePmscanSensorRecord(data) {
	if (!data || !collectingData)
		return;
	/* RT i IM poden arribar amb el mateix timestamp; evita files duplicades */
	if (data.timestamp != null && data.timestamp === lastPmscanSavedTimestamp)
		return;
	lastPmscanSavedTimestamp = data.timestamp;

	sensorValues = {
		temperature: data.temp / 10,
		humidity: data.hum / 10,
		pm1: data.pm1gm / 10,
		pm25: data.pm25gm / 10,
		pm10: data.pm10gm / 10
	};
	lastPmValues = {
		pm1: sensorValues.pm1,
		pm25: sensorValues.pm25,
		pm10: sensorValues.pm10
	};

	if (pmscanBattery != null)
		sensorInfo.battery = String(pmscanBattery) + "%";
	if (pmscanCharging != null)
		sensorInfo.charging = String(pmscanCharging);

	saveSensorRecord(data.measuredAt);
}

function onPmscanRtData(event) {
	savePmscanSensorRecord(parsePmscanDataPayload(event.target.value));
}

function onPmscanImData(event) {
	/* Alguns firmware envien mesures per IM; RT pot no arribar */
	savePmscanSensorRecord(parsePmscanDataPayload(event.target.value));
}

function onPmscanBattery(event) {
	pmscanBattery = event.target.value.getUint8(0);
	sensorInfo.battery = String(pmscanBattery) + "%";
}

function onPmscanCharging(event) {
	pmscanCharging = event.target.value.getUint8(0);
	sensorInfo.charging = String(pmscanCharging);
}

function onBleDisconnected() {
	bleHasPmscan = false;
	if (connectionMode === "ble") {
		collectingData = false;
		interruptConnectASensorWait();
		connectionMode = null;
		showInfoMessage({cat: "Bluetooth desconnectat pel dispositiu.", spa: "Bluetooth desconectado por el dispositivo.", eng: "Bluetooth disconnected by the device."});
		updateConnectASensorConnectionButtons();
	}
}

function resetBleState(clearDevice) {
	bleHasPmscan = false;
	bleService = null;
	bleServer = null;
	pmscanRtChar = null;
	pmscanImChar = null;
	pmscanBatteryChar = null;
	pmscanChargingChar = null;
	pmscanIntervalChar = null;
	pmscanBattery = null;
	pmscanCharging = null;
	if (clearDevice)
		bleDevice = null;
}

async function syncPmscanTime(service) {
	var timeChar, value, current, timeDt2000, time;
	timeChar = await service.getCharacteristic(PMSCAN_TIME);
	value = await timeChar.readValue();
	current = value.getUint32(0, true);
	if (current !== 0)
		return;
	timeDt2000 = Math.floor((Date.now() / 1000) - PMSCAN_EPOCH_2000);
	time = new Uint8Array(4);
	time[0] = timeDt2000 & 0xFF;
	time[1] = (timeDt2000 >> 8) & 0xFF;
	time[2] = (timeDt2000 >> 16) & 0xFF;
	time[3] = (timeDt2000 >> 24) & 0xFF;
	await timeChar.writeValueWithResponse(time);
}

async function writePmscanInterval(code) {
	var buf, sec, written;
	if (!bleService || !isConnectASensorBleLive())
		throw new Error("PMSCAN not connected");
	if (!pmscanIntervalChar)
		pmscanIntervalChar = await bleService.getCharacteristic(PMSCAN_INTERVAL);
	buf = new Uint8Array(1);
	buf[0] = Number(code) & 0xFF;
	try {
		await pmscanIntervalChar.writeValueWithResponse(buf);
	} catch (err) {
		if (typeof pmscanIntervalChar.writeValueWithoutResponse === "function")
			await pmscanIntervalChar.writeValueWithoutResponse(buf);
		else
			throw err;
	}
	try {
		written = await pmscanIntervalChar.readValue();
		if (written && written.getUint8(0) !== buf[0])
			throw new Error("interval code mismatch after write");
	} catch (err) {
		/* alguns dispositius no permeten read-back; l'escriptura ja s'ha intentat */
		if (err && err.message === "interval code mismatch after write")
			throw err;
	}
	sec = CONNECT_A_SENSOR_INTERVAL_SEC_BY_CODE[String(code)];
	if (sec == null)
		sec = getConnectASensorIntervalSeconds();
	sensorInfo.readingInterval = formatConnectASensorIntervalLabel(sec);
	sensorInfo.intervalCode = String(code);
}

async function setupPmscan(server) {
	var service, bat, ch, ov, mv;

	bleHasPmscan = false;
	service = await server.getPrimaryService(PMSCAN_SERVICE);
	bleService = service;

	pmscanBatteryChar = await service.getCharacteristic(PMSCAN_BATTERY);
	bat = await pmscanBatteryChar.readValue();
	pmscanBattery = bat.getUint8(0);
	sensorInfo.battery = String(pmscanBattery) + "%";

	try {
		await syncPmscanTime(service);
	} catch (e) {}

	try {
		ov = await (await service.getCharacteristic(PMSCAN_OTH)).readValue();
		sensorInfo.firmwareVersion = String(ov.getUint8(0) >> 2);
	} catch (e) {}

	try {
		mv = await (await service.getCharacteristic(PMSCAN_MODE)).readValue();
		sensorInfo.mode = String(mv.getUint8(0));
	} catch (e) {}

	/* Interval abans de les notificacions (com a proba.htm, però abans de RT/IM) */
	try {
		pmscanIntervalChar = await service.getCharacteristic(PMSCAN_INTERVAL);
		await writePmscanInterval(getConnectASensorIntervalCode());
	} catch (e) {
		showInfoMessage(
			{cat: "Interval BLE no aplicat: {0}", spa: "Intervalo BLE no aplicado: {0}", eng: "BLE interval not applied: {0}"},
			e && e.message ? e.message : String(e)
		);
	}

	pmscanRtChar = await service.getCharacteristic(PMSCAN_RT_DATA);
	await pmscanRtChar.startNotifications();
	pmscanRtChar.addEventListener("characteristicvaluechanged", onPmscanRtData);

	try {
		pmscanImChar = await service.getCharacteristic(PMSCAN_IM_DATA);
		await pmscanImChar.startNotifications();
		pmscanImChar.addEventListener("characteristicvaluechanged", onPmscanImData);
	} catch (e) {}

	await pmscanBatteryChar.startNotifications();
	pmscanBatteryChar.addEventListener("characteristicvaluechanged", onPmscanBattery);

	try {
		pmscanChargingChar = await service.getCharacteristic(PMSCAN_CHARGING);
		await pmscanChargingChar.startNotifications();
		pmscanChargingChar.addEventListener("characteristicvaluechanged", onPmscanCharging);
		ch = await pmscanChargingChar.readValue();
		pmscanCharging = ch.getUint8(0);
		sensorInfo.charging = String(pmscanCharging);
	} catch (e) {}

	bleHasPmscan = true;
}

async function disconnectBleQuiet() {
	var pairs, i, ch, handler;
	pairs = [
		[pmscanRtChar, onPmscanRtData],
		[pmscanImChar, onPmscanImData],
		[pmscanBatteryChar, onPmscanBattery],
		[pmscanChargingChar, onPmscanCharging]
	];
	for (i = 0; i < pairs.length; i++) {
		ch = pairs[i][0];
		handler = pairs[i][1];
		if (!ch)
			continue;
		try {
			ch.removeEventListener("characteristicvaluechanged", handler);
			if (ch.properties && ch.properties.notify)
				await ch.stopNotifications();
		} catch (e) {}
	}
	if (bleDevice) {
		try {
			bleDevice.removeEventListener("gattserverdisconnected", onBleDisconnected);
		} catch (e) {}
		try {
			if (bleDevice.gatt && bleDevice.gatt.connected)
				bleDevice.gatt.disconnect();
		} catch (e) {}
	}
	resetBleState(true);
	if (connectionMode === "ble")
		connectionMode = null;
}

async function ConnectASensorConnectBluetooth(event) {
	var options, name, device;

	if (event)
		event.preventDefault();

	try {
		if (!navigator.bluetooth)
			throw new Error(DonaCadena({
				cat: "Aquest navegador no admet Web Bluetooth (cal Chrome/Edge amb HTTPS o localhost).",
				spa: "Este navegador no admite Web Bluetooth (hace falta Chrome/Edge con HTTPS o localhost).",
				eng: "This browser does not support Web Bluetooth (Chrome/Edge with HTTPS or localhost required)."
			}));

		/* requestDevice immediatament (cal gest d'usuari; no fer await abans) */
		options = {
			filters: [
				{ namePrefix: "PMScan" },
				{ services: [PMSCAN_SERVICE] },
				{ namePrefix: "PMScan", services: [PMSCAN_SERVICE] }
			],
			optionalServices: PMSCAN_BLE_OPTIONAL_SERVICES
		};
		device = await navigator.bluetooth.requestDevice(options);

		if (isConnectASensorConnected() || bleDevice || port)
			await disconnectSensor(true);

		bleDevice = device;
		bleDevice.addEventListener("gattserverdisconnected", onBleDisconnected);

		bleServer = await bleDevice.gatt.connect();
		connectionMode = "ble";
		bleHasPmscan = false;

		resetConnectASensorSessionState();
		clearConnectASensorInfoPanel();

		name = bleDevice.name || "PMSCAN";
		sensorInfo = {
			sensorType: "pmscan",
			connectionType: "Bluetooth",
			bleName: name,
			hardwareVersion: "PMSCAN",
			readingInterval: formatConnectASensorIntervalLabel(getConnectASensorIntervalSeconds()),
			intervalCode: String(getConnectASensorIntervalCode())
		};

		/* Activa recollida abans de les notificacions per no perdre la 1a mesura */
		collectingData = true;
		await setupPmscan(bleServer);

		showInfoMessage({
			cat: "PMSCAN connectat. Primera mesura en ~{0} (o el que indiqui l'interval).",
			spa: "PMSCAN conectado. Primera medida en ~{0} (o lo que indique el intervalo).",
			eng: "PMSCAN connected. First measure in ~{0} (or as set by the interval)."
		}, formatConnectASensorIntervalLabel(getConnectASensorIntervalSeconds()));
		renderConnectASensorInfo();
		syncConnectASensorMeta(getConnectASensorNodeSafe());
		ShowConnectASensorTableInDialog(getConnectASensorNodeSafe());
		updateConnectASensorConnectionButtons();

	} catch (error) {
		try {
			await disconnectBleQuiet();
		} catch (e) {}
		connectionMode = null;
		collectingData = false;
		showInfoMessage(
			{cat: "Error en connectar Bluetooth: {0}", spa: "Error al conectar Bluetooth: {0}", eng: "Error connecting Bluetooth: {0}"},
			error && error.message ? error.message : String(error)
		);
		updateConnectASensorConnectionButtons();
	}
}


/*
	Escolta contínuament les dades del sensor.

	IMPORTANT:
	reader.read() no garanteix que arribi una línia completa.
	Per això acumulem les dades en responseBuffer.
*/
async function readLoop() {

	const decoder = new TextDecoder();

	try {

		while (true) {

			const { value, done } = await reader.read();

			if (done) {
				break;
			}

			if (value) {

				// Afegim els nous bytes al buffer
				const text = decoder.decode(value);

				responseBuffer += text;

				/*
					Dividim per salts de línia.

					L'últim element pot estar incomplet,
					per tant el tornem a guardar al buffer.
				*/
				const lines = responseBuffer.split("\n");

				responseBuffer = lines.pop();


				/*
					Processem només línies completes.
				*/
				for (const line of lines) {

					const completeLine = line.trim();

					if (!completeLine) {
						continue;
					}

					if (waitingForPrompt) {
						if (completeLine === "SCK >") {
							finishPromptWait();
							continue;
						}
						promptLines.push(completeLine);
						continue;
					}

					if (completeLine === "SCK >") {
						continue;
					}

					processSensorResponse(completeLine);

					if (
						waitingFor &&
						lineMatchesSensorResponse(completeLine, waitingFor)
					) {

						waitingFor = null;

						if (responseTimeout) {

							clearTimeout(responseTimeout);

							responseTimeout = null;
						}

						if (responseResolve) {

							responseResolve();

							responseResolve = null;
						}
					}
				}
			}
		}

	} catch (error) {

		showInfoMessage(
			{cat: "Error en llegir el sensor: {0}", spa: "Error al leer el sensor: {0}", eng: "Error reading sensor: {0}"},
			error.message
		);
		updateConnectASensorConnectionButtons();
	}
}


/*
	Analitza una línia completa de resposta
	i afegeix la propietat corresponent a sensorValues.
*/
function lineMatchesSensorResponse(text, expected) {
	var t, e, pmExpected, pmGot;
	if (!text || !expected)
		return false;
	t = String(text).trim();
	e = String(expected).trim();
	if (/^read\b/i.test(t))
		return false;
	pmExpected = parsePmSensorLabel(e);
	if (pmExpected) {
		pmGot = parsePmSensorLabel(t);
		return pmGot === pmExpected && extractValue(t) !== null;
	}
	return t.indexOf(e) != -1;
}

function parsePmSensorLabel(text) {
	var t = String(text);
	/* Només massa PM, no recompte PN. PM 10 abans que PM 1. */
	if (/\bPM\s*10(?:\.0)?\b/i.test(t))
		return "pm10";
	if (/\bPM\s*2\.5\b/i.test(t))
		return "pm25";
	if (/\bPM\s*1(?:\.0)?\b/i.test(t))
		return "pm1";
	return "";
}

function casSleep(ms) {
	return new Promise(function (resolve) {
		setTimeout(resolve, ms);
	});
}

function casParsePmReadingFromText(text, valueKey) {
	var lines, i, line, lower, value, waitSec, m;
	if (!text)
		return { value: null, retryMs: 0 };
	lines = String(text).split(/\r?\n/);
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || /^read\b/i.test(line) || line === "SCK >")
			continue;
		lower = line.toLowerCase();
		if (lower.indexOf("disabled") != -1)
			continue;
		if (lower.indexOf("will be ready") != -1 || lower.indexOf("try again") != -1) {
			m = lower.match(/(\d+)\s*second/);
			waitSec = m ? Number(m[1]) : 5;
			if (!isFinite(waitSec) || waitSec < 1)
				waitSec = 5;
			if (waitSec > 30)
				waitSec = 30;
			return { value: null, retryMs: waitSec * 1000 };
		}
		if (lower.indexOf("error") != -1)
			continue;
		if (parsePmSensorLabel(line) !== valueKey)
			continue;
		value = extractValue(line);
		if (value !== null && value !== undefined)
			return { value: value, retryMs: 0 };
	}
	return { value: null, retryMs: 0 };
}

/*
	Llegeix un PM amb els títols oficials del firmware SCK
	(PMS PM 10.0, etc.) i alternatives curtes.
*/
async function readPmSensor(valueKey, titles) {
	var attempt, i, text, parsed;
	for (attempt = 0; attempt < 4; attempt++) {
		for (i = 0; i < titles.length; i++) {
			try {
				text = await sendCommandUntilPrompt("read " + titles[i]);
			} catch (err) {
				continue;
			}
			parsed = casParsePmReadingFromText(text, valueKey);
			if (parsed.value !== null && parsed.value !== undefined) {
				sensorValues[valueKey] = parsed.value;
				return true;
			}
			if (parsed.retryMs > 0)
				await casSleep(parsed.retryMs);
		}
	}
	return false;
}

function processSensorResponse(text) {
	var value, pm;

	if (/^read\b/i.test(text))
		return;

	value = extractValue(text);
	pm = parsePmSensorLabel(text);
	if (pm) {
		if (value !== null)
			sensorValues[pm] = value;
		return;
	}

	if (text.includes("Temperature")) {
		if (value !== null)
			sensorValues.temperature = value;
		return;
	}

	if (text.includes("Humidity")) {
		if (value !== null)
			sensorValues.humidity = value;
		return;
	}

	if (text.includes("Light") && text.indexOf("VOC") == -1) {
		if (value !== null)
			sensorValues.light = value;
		return;
	}

	if (text.includes("Noise dBA")) {
		if (value !== null)
			sensorValues.noiseDBA = value;
		return;
	}

	if (text.includes("Barometric pressure")) {
		if (value !== null)
			sensorValues.barometricPressure = value;
		return;
	}

	if (text.includes("VOC Gas CCS811")) {
		if (value !== null)
			sensorValues.vocGasCCS811 = value;
		return;
	}

	if (text.includes("eCO2 Gas CCS811")) {
		if (value !== null)
			sensorValues.eco2GasCCS811 = value;
		return;
	}
}


/*
	Extreu el valor que hi ha després dels dos punts.

	Exemples:

	Temperature: 25.81 C
		-> 25.81

	PM 10.0: 0 ug/m3
		-> 0
*/
function extractValue(text) {

	const valueText = text.split(":")[1];

	if (!valueText) {

		return null;
	}


	const match =
		valueText.match(/[-+]?\d*\.?\d+/);


	if (match) {

		return Number(match[0]);
	}


	return null;
}


/*
	Envia una comanda i espera fins que arriba
	la resposta corresponent.

	Si no arriba en 5 segons, continua per evitar
	que el programa quedi bloquejat.
*/
async function sendCommand(command, responseText, timeoutMs) {
	var waitMs = (timeoutMs && timeoutMs > 0) ? timeoutMs : 5000;

	// Indiquem quina resposta esperem
	waitingFor = responseText;


	const promise = new Promise(resolve => {

		responseResolve = resolve;


		responseTimeout = setTimeout(() => {

			console.warn(
				"Timeout waiting for: " +
				responseText
			);


			waitingFor = null;

			responseResolve = null;

			responseTimeout = null;


			resolve();

		}, waitMs);
	});


	// Enviem la comanda
	await writer.write(
		new TextEncoder().encode(command)
	);


	// Esperem la resposta
	await promise;
}

function finishPromptWait() {
	var text = promptLines.join("\n");
	waitingForPrompt = false;
	promptLines = [];
	if (promptTimeout) {
		clearTimeout(promptTimeout);
		promptTimeout = null;
	}
	if (promptResolve) {
		var resolve = promptResolve;
		promptResolve = null;
		resolve(text);
	}
}

async function sendCommandUntilPrompt(command, timeoutMs) {
	var waitMs = (timeoutMs && timeoutMs > 0) ? timeoutMs : 20000;
	waitingForPrompt = true;
	promptLines = [];
	var promise = new Promise(function (resolve) {
		promptResolve = resolve;
		promptTimeout = setTimeout(function () {
			waitingForPrompt = false;
			promptTimeout = null;
			promptResolve = null;
			resolve(promptLines.join("\n"));
			promptLines = [];
		}, waitMs);
	});
	await writer.write(new TextEncoder().encode(command + "\r\n"));
	return await promise;
}

function formatUsbId(id) {
	var n = Number(id);
	if (!isFinite(n))
		return "";
	return ("0000" + n.toString(16).toUpperCase()).slice(-4);
}

function nameFromUsbIds(vid, pid) {
	vid = Number(vid);
	pid = Number(pid);
	if (vid === 0x2341 && pid === 0x804D)
		return "Smartcitizen Kit 2.1";
	return "";
}

function readSerialPortIdentity(serialPort) {
	var info = {}, out = {}, key, value, nameKey;
	if (!serialPort || typeof serialPort.getInfo !== "function")
		return out;
	try {
		info = serialPort.getInfo() || {};
	} catch (err) {
		return out;
	}
	for (key in info) {
		if (!info.hasOwnProperty(key))
			continue;
		value = info[key];
		nameKey = String(key).toLowerCase();
		if (typeof value === "string" && value.trim() &&
				(nameKey.indexOf("name") != -1 || nameKey.indexOf("desc") != -1 ||
				nameKey.indexOf("product") != -1 || nameKey.indexOf("manufacturer") != -1))
			out.portName = value.trim();
	}
	if (info.usbVendorId != null && info.usbVendorId !== undefined)
		out.usbVendorId = formatUsbId(info.usbVendorId);
	if (info.usbProductId != null && info.usbProductId !== undefined)
		out.usbProductId = formatUsbId(info.usbProductId);
	if (!out.portName)
		out.portName = nameFromUsbIds(info.usbVendorId, info.usbProductId);
	if (out.usbVendorId && out.usbProductId)
		out.usbId = out.usbVendorId + ":" + out.usbProductId;
	return out;
}

function applySerialPortIdentity(serialPort) {
	var ident = readSerialPortIdentity(serialPort), key;
	for (key in ident) {
		if (ident.hasOwnProperty(key) && ident[key])
			sensorInfo[key] = ident[key];
	}
}

function mapSensorInfoKey(rawKey) {
	var k = (rawKey || "").toLowerCase();
	if (k.indexOf("wifi") != -1 || k.indexOf("pass") != -1)
		return null;
	if (k == "token")
		return null;
	if (k == "hardware version")
		return "hardwareVersion";
	if (k == "sam hardware id")
		return "samHardwareId";
	if (k == "sam version")
		return "samVersion";
	if (k == "sam build date")
		return "samBuildDate";
	if (k == "esp version")
		return "espVersion";
	if (k == "esp build date")
		return "espBuildDate";
	if (k == "esp mac address" || k == "mac address")
		return "macAddress";
	if (k == "mode")
		return "mode";
	if (k == "publish interval")
		return "publishInterval";
	if (k == "reading interval")
		return "readingInterval";
	if (k == "hostname")
		return "hostname";
	if (k == "ip address")
		return "ipAddress";
	return false;
}

function mergeSensorInfoFromText(text) {
	var lines, i, line, colon, key, value, mapped, extra = [];
	if (!text)
		return;
	lines = ("" + text).split("\n");
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || line == "SCK >")
			continue;
		colon = line.indexOf(":");
		if (colon < 1) {
			extra.push(line);
			continue;
		}
		key = line.substring(0, colon).trim();
		value = line.substring(colon + 1).trim();
		mapped = mapSensorInfoKey(key);
		if (mapped === null)
			continue;
		if (mapped)
			sensorInfo[mapped] = value;
		else
			extra.push(line);
	}
	if (extra.length) {
		sensorInfo.sensors = (sensorInfo.sensors ? sensorInfo.sensors + "\n" : "") + extra.join("\n");
	}
}

function clearConnectASensorInfoPanel() {
	var el = document.getElementById("resultsFromSensor");
	var dlg = document.getElementById("DialogConnectASensorInfo");
	if (el)
		el.innerHTML = "";
	if (dlg && dlg.open)
		dlg.close();
	if (!isConnectASensorConnected())
		restoreConnectASensorNodeLabel();
	updateConnectASensorConnectionButtons();
}

function sensorInfoFieldLabel(key) {
	var labels = {
		portName: {cat: "Nom del dispositiu USB", spa: "Nombre del dispositivo USB", eng: "USB device name"},
		usbId: {cat: "USB VID:PID", spa: "USB VID:PID", eng: "USB VID:PID"},
		connectionType: {cat: "Connexió", spa: "Conexión", eng: "Connection"},
		bleName: {cat: "Nom Bluetooth", spa: "Nombre Bluetooth", eng: "Bluetooth name"},
		sensorType: {cat: "Tipus de sensor", spa: "Tipo de sensor", eng: "Sensor type"},
		hostname: {cat: "Hostname", spa: "Hostname", eng: "Hostname"},
		hardwareVersion: {cat: "Versió de hardware", spa: "Versión de hardware", eng: "Hardware version"},
		firmwareVersion: {cat: "Firmware", spa: "Firmware", eng: "Firmware"},
		samHardwareId: {cat: "ID de hardware SAM", spa: "ID de hardware SAM", eng: "SAM hardware ID"},
		samVersion: {cat: "Firmware SAM", spa: "Firmware SAM", eng: "SAM firmware"},
		samBuildDate: {cat: "Data de compilació SAM", spa: "Fecha de compilación SAM", eng: "SAM build date"},
		espVersion: {cat: "Firmware ESP", spa: "Firmware ESP", eng: "ESP firmware"},
		espBuildDate: {cat: "Data de compilació ESP", spa: "Fecha de compilación ESP", eng: "ESP build date"},
		macAddress: {cat: "MAC", spa: "MAC", eng: "MAC"},
		mode: {cat: "Mode", spa: "Modo", eng: "Mode"},
		battery: {cat: "Bateria", spa: "Batería", eng: "Battery"},
		charging: {cat: "Carregant", spa: "Cargando", eng: "Charging"},
		publishInterval: {cat: "Interval de publicació", spa: "Intervalo de publicación", eng: "Publish interval"},
		readingInterval: {cat: "Interval de lectura", spa: "Intervalo de lectura", eng: "Reading interval"},
		intervalCode: {cat: "Codi d'interval", spa: "Código de intervalo", eng: "Interval code"},
		ipAddress: {cat: "Adreça IP", spa: "Dirección IP", eng: "IP address"},
		sensors: {cat: "Sensors", spa: "Sensores", eng: "Sensors"}
	};
	return DonaCadena(labels[key] || {cat: key, spa: key, eng: key});
}

function renderConnectASensorInfo() {
	var el = document.getElementById("resultsFromSensor");
	var order = [
		"connectionType", "bleName", "sensorType", "portName", "usbId", "hostname",
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
		if (!sensorInfo[key])
			continue;
		found = true;
		html += "<dt>" + sensorInfoFieldLabel(key) + "</dt><dd>" +
			String(sensorInfo[key]).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>") +
			"</dd>";
	}
	html += "</dl></div>";
	if (!found)
		html = "<p>" + DonaCadena({cat: "Encara no hi ha informació del sensor.", spa: "Todavía no hay información del sensor.", eng: "No sensor information yet."}) + "</p>";
	el.innerHTML = html;
	updateConnectASensorConnectionButtons();
	updateConnectASensorNodeLabelFromInfo();
}

async function getSensorInfo() {
	var commands = ["version", "config", "sensor", "netinfo"], i, text;
	sensorInfo = {};
	applySerialPortIdentity(port);
	for (i = 0; i < commands.length; i++) {
		try {
			text = await sendCommandUntilPrompt(commands[i]);
			mergeSensorInfoFromText(text);
		} catch (err) {
		}
	}
	renderConnectASensorInfo();
}

function updateConnectASensorUsbConfigVisibility() {
	var panel = document.getElementById("DialogConnectASensorUsbConfig");
	/* TODO: reactivar panell USB config (mode / intervals / hora / cal / bateria) */
	var show = false; /* temporal: amagar perquè es vegin les dades com abans */
	/* var show = connectionMode === "usb" && !!port; */
	if (!panel)
		return;
	panel.hidden = !show;
	if (!show)
		ConnectASensorStopUsbClockTick();
}

function ConnectASensorResetUsbConfigState() {
	var host = document.getElementById("casUsbSensorList");
	usbReadIntSec = null;
	usbPubIntSec = null;
	usbKitMode = null;
	usbSensorRows = [];
	ConnectASensorStopUsbClockTick();
	usbClockEpochMs = null;
	usbClockSyncedAt = null;
	fillUsbConfigModeUi(null);
	fillUsbConfigIntervalsUi(null, null);
	setUsbCalCurrentUi("temp", null);
	setUsbCalCurrentUi("hum", null);
	setUsbBatteryUi("—");
	if (host)
		host.innerHTML = "";
	var clockEl = document.getElementById("casUsbClockDisplay");
	if (clockEl)
		clockEl.textContent = "—";
	updateConnectASensorUsbConfigVisibility();
}

function ConnectASensorStopUsbClockTick() {
	if (usbClockTimer) {
		clearInterval(usbClockTimer);
		usbClockTimer = null;
	}
}

function ConnectASensorStartUsbClockTick() {
	ConnectASensorStopUsbClockTick();
	ConnectASensorTickUsbClock();
	usbClockTimer = setInterval(ConnectASensorTickUsbClock, 1000);
}

function ConnectASensorTickUsbClock() {
	var el = document.getElementById("casUsbClockDisplay");
	var nowMs, d;
	if (!el)
		return;
	if (usbClockEpochMs == null || usbClockSyncedAt == null) {
		el.textContent = "—";
		return;
	}
	nowMs = usbClockEpochMs + (Date.now() - usbClockSyncedAt);
	d = new Date(nowMs);
	el.textContent = d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

async function withUsbSerialExclusive(fn) {
	var wasCollecting = collectingData;
	var n = 0;
	if (usbConfigBusy)
		throw new Error(DonaCadena({cat: "Ja s'està configurant el kit.", spa: "Ya se está configurando el kit.", eng: "Kit configuration already in progress."}));
	usbConfigBusy = true;
	collectingData = false;
	interruptConnectASensorWait();
	while ((waitingFor || waitingForPrompt || monitoringRunning) && n < 120) {
		await casSleep(100);
		n++;
	}
	try {
		return await fn();
	} finally {
		usbConfigBusy = false;
		if (wasCollecting && connectionMode === "usb" && port) {
			collectingData = true;
			updateConnectASensorConnectionButtons();
			if (!monitoringRunning)
				startMonitoring();
		} else {
			updateConnectASensorConnectionButtons();
		}
	}
}

function parseUsbConfigText(text) {
	var out = { mode: null, readint: null, pubint: null };
	var lines, i, line, m;
	if (!text)
		return out;
	lines = String(text).split(/\r?\n/);
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (/^Mode\s*:/i.test(line)) {
			m = line.match(/Mode\s*:\s*(\S+)/i);
			if (m)
				out.mode = m[1].toLowerCase();
		} else if (/Reading interval/i.test(line)) {
			m = line.match(/:\s*(\d+)/);
			if (m)
				out.readint = Number(m[1]);
		} else if (/Publish interval/i.test(line)) {
			m = line.match(/:\s*(\d+)/);
			if (m)
				out.pubint = Number(m[1]);
		}
	}
	return out;
}

function parseUsbSensorList(text) {
	var sensors = [];
	var lines, i, line, section = null, m, name, intervalSec;
	if (!text)
		return sensors;
	lines = String(text).split(/\r?\n/);
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || line === "SCK >" || /^-+$/.test(line))
			continue;
		if (/^Disabled\b/i.test(line)) {
			section = "disabled";
			continue;
		}
		if (/^Enabled\b/i.test(line)) {
			section = "enabled";
			continue;
		}
		if (!section)
			continue;
		m = line.match(/^(.+?)\s*\((\d+)\s*sec(?:onds?)?\)\s*$/i);
		if (m) {
			name = m[1].trim();
			intervalSec = Number(m[2]);
		} else {
			name = line.replace(/\s*\(\d+\s*sec(?:onds?)?\)\s*$/i, "").trim();
			intervalSec = null;
			m = line.match(/\((\d+)\s*sec(?:onds?)?\)/i);
			if (m)
				intervalSec = Number(m[1]);
		}
		if (!name || /^(Disabled|Enabled)$/i.test(name))
			continue;
		sensors.push({
			name: name,
			enabled: section === "enabled",
			intervalSec: isFinite(intervalSec) ? intervalSec : null
		});
	}
	return sensors;
}

function parseUsbTimeText(text) {
	var lines, i, line, m, epoch, iso;
	if (!text)
		return null;
	lines = String(text).split(/\r?\n/);
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || line === "SCK >")
			continue;
		m = line.match(/\b(\d{9,12})\b/);
		if (m) {
			epoch = Number(m[1]);
			if (isFinite(epoch) && epoch > 1000000000)
				return { epochSec: epoch, epochMs: epoch * 1000 };
		}
		m = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
		if (m) {
			iso = m[1].replace(" ", "T");
			if (!/[zZ]|[+-]\d{2}/.test(iso))
				iso += "Z";
			epoch = Date.parse(iso);
			if (isFinite(epoch))
				return { epochSec: Math.floor(epoch / 1000), epochMs: epoch };
		}
	}
	return null;
}

function parseUsbCalOffset(text) {
	var m;
	if (!text)
		return null;
	m = String(text).match(/offset\s*:\s*([-+]?\d*\.?\d+)/i);
	if (m)
		return Number(m[1]);
	m = String(text).match(/Set default offset\s*:\s*([-+]?\d*\.?\d+)/i);
	if (m)
		return Number(m[1]);
	return null;
}

function parseUsbBatteryPercent(text) {
	var lines, i, line, m;
	if (!text)
		return null;
	lines = String(text).split(/\r?\n/);
	for (i = 0; i < lines.length; i++) {
		line = lines[i].trim();
		if (!line || line === "SCK >" || /^read\b/i.test(line) || /^power\b/i.test(line))
			continue;
		m = line.match(/(\d{1,3})\s*%/);
		if (m)
			return Number(m[1]);
		if (/battery/i.test(line)) {
			m = line.match(/:\s*([-+]?\d*\.?\d+)/);
			if (m) {
				var n = Number(m[1]);
				if (isFinite(n) && n >= 0 && n <= 100)
					return Math.round(n);
			}
		}
	}
	m = String(text).match(/(\d{1,3})\s*%/);
	return m ? Number(m[1]) : null;
}

function formatUsbBatteryPercent(pct) {
	if (pct == null || !isFinite(pct))
		return "—";
	return Math.round(pct) + "%";
}

function findUsbSensorGroup(sensorName) {
	var g, j;
	for (g = 0; g < USB_SENSOR_GROUPS.length; g++) {
		for (j = 0; j < USB_SENSOR_GROUPS[g].match.length; j++) {
			if (USB_SENSOR_GROUPS[g].match[j].test(sensorName))
				return USB_SENSOR_GROUPS[g];
		}
	}
	return null;
}

function buildUsbSensorUiRows(sensors) {
	var byGroup = {}, rows = [], i, s, grp, key;
	/*
		Només els grups urbans coneguts (Temperature, Humidity, …).
		La secció Disabled del firmware és el catàleg sencer (Atlas, etc.):
		no el mostrem — només sensors que encaixen amb USB_SENSOR_GROUPS.
	*/
	for (i = 0; i < sensors.length; i++) {
		s = sensors[i];
		grp = findUsbSensorGroup(s.name);
		if (!grp)
			continue;
		if (!byGroup[grp.id]) {
			byGroup[grp.id] = {
				id: grp.id,
				label: grp.label,
				cmd: grp.cmd,
				names: [],
				enabled: false,
				intervalSec: null
			};
		}
		byGroup[grp.id].names.push(s.name);
		if (s.enabled)
			byGroup[grp.id].enabled = true;
		if (s.intervalSec != null && byGroup[grp.id].intervalSec == null)
			byGroup[grp.id].intervalSec = s.intervalSec;
	}
	for (i = 0; i < USB_SENSOR_GROUPS.length; i++) {
		key = USB_SENSOR_GROUPS[i].id;
		if (byGroup[key])
			rows.push(byGroup[key]);
	}
	return rows;
}

function fillUsbConfigModeUi(mode) {
	var sd = document.getElementById("casUsbModeSdcard");
	var net = document.getElementById("casUsbModeNetwork");
	var pub = document.getElementById("casUsbPubInt");
	usbKitMode = mode || null;
	if (sd)
		sd.checked = mode === "sdcard";
	if (net)
		net.checked = mode === "network";
	if (pub)
		pub.disabled = mode === "sdcard";
}

function ConnectASensorOnUsbModeRadioChange(event) {
	var net = document.getElementById("casUsbModeNetwork");
	var pub = document.getElementById("casUsbPubInt");
	var selectedNetwork = !!(net && net.checked);
	if (event)
		event.preventDefault();
	if (pub)
		pub.disabled = !selectedNetwork;
}

function fillUsbConfigIntervalsUi(readint, pubint) {
	var readEl = document.getElementById("casUsbReadInt");
	var pubEl = document.getElementById("casUsbPubInt");
	usbReadIntSec = (readint != null && isFinite(readint)) ? readint : null;
	usbPubIntSec = (pubint != null && isFinite(pubint)) ? pubint : null;
	if (readEl)
		readEl.value = usbReadIntSec != null ? String(usbReadIntSec) : "";
	if (pubEl)
		pubEl.value = usbPubIntSec != null ? String(usbPubIntSec) : "";
}

function renderUsbSensorListUi() {
	var host = document.getElementById("casUsbSensorList");
	var i, row, html, label, intervalVal, safeId;
	if (!host)
		return;
	if (!usbSensorRows.length) {
		host.innerHTML = "<p class=\"casUsbHint\">" +
			DonaCadena({
				cat: "No s'han pogut carregar els sensors del kit.",
				spa: "No se han podido cargar los sensores del kit.",
				eng: "Could not load kit sensors."
			}) +
			"</p>" +
			"<button type=\"button\" class=\"DialogConnectASensorAction\" onclick=\"ConnectASensorReloadUsbSensors(event)\">" +
			"<span data-lang=\"{&quot;cat&quot;:&quot;Torna a carregar sensors&quot;,&quot;spa&quot;:&quot;Volver a cargar sensores&quot;,&quot;eng&quot;:&quot;Reload sensors&quot;}\">Reload sensors</span>" +
			"</button>";
		if (typeof applyDialogI18n === "function")
			applyDialogI18n();
		return;
	}
	html = "";
	for (i = 0; i < usbSensorRows.length; i++) {
		row = usbSensorRows[i];
		label = DonaCadena(row.label);
		safeId = String(row.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
		intervalVal = row.intervalSec != null ? String(row.intervalSec) : "";
		html += "<div class=\"casUsbSensorRow\" data-cas-group=\"" + String(row.id).replace(/"/g, "&quot;") + "\">" +
			"<span class=\"casUsbSensorName\">" + label.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>" +
			"<label class=\"casUsbSwitch\" title=\"" + label.replace(/"/g, "&quot;") + "\">" +
			"<input type=\"checkbox\" " + (row.enabled ? "checked " : "") +
			"onchange=\"ConnectASensorToggleUsbSensor(event, '" + safeId + "')\">" +
			"<span class=\"casUsbSwitchSlider\"></span></label>" +
			"<label><span data-lang=\"{&quot;cat&quot;:&quot;Interval (s)&quot;,&quot;spa&quot;:&quot;Intervalo (s)&quot;,&quot;eng&quot;:&quot;Interval (s)&quot;}\">Interval (s)</span> " +
			"<input type=\"number\" class=\"casUsbSensorInterval\" min=\"30\" max=\"3600\" step=\"1\" value=\"" + intervalVal + "\" " +
			"onchange=\"ConnectASensorApplyUsbSensorInterval(event, '" + safeId + "')\"></label>" +
			"</div>";
	}
	host.innerHTML = html;
	if (typeof applyDialogI18n === "function")
		applyDialogI18n();
}

function setUsbCalCurrentUi(kind, value) {
	var el = document.getElementById(kind === "hum" ? "casUsbHumCalCurrent" : "casUsbTempCalCurrent");
	if (!el)
		return;
	el.textContent = (value != null && isFinite(value)) ? String(value) : "—";
}

function setUsbBatteryUi(pctOrText) {
	var b = document.getElementById("casUsbBatteryInfo");
	if (!b)
		return;
	if (typeof pctOrText === "number")
		b.textContent = formatUsbBatteryPercent(pctOrText);
	else
		b.textContent = pctOrText || "—";
}

async function loadUsbBatteryPercentExclusive() {
	var text, pct;
	try {
		text = await sendCommandUntilPrompt("read Battery");
		pct = parseUsbBatteryPercent(text);
		if (pct != null)
			return pct;
	} catch (err) {}
	try {
		text = await sendCommandUntilPrompt("power -info");
		pct = parseUsbBatteryPercent(text);
		if (pct != null)
			return pct;
	} catch (err) {}
	return null;
}

function applyUsbTimeToUi(parsed) {
	var input = document.getElementById("casUsbClockInput");
	var local;
	if (!parsed)
		return;
	usbClockEpochMs = parsed.epochMs;
	usbClockSyncedAt = Date.now();
	ConnectASensorStartUsbClockTick();
	if (input) {
		local = new Date(parsed.epochMs);
		input.value = formatDatetimeLocalValue(local);
	}
}

function formatDatetimeLocalValue(d) {
	var pad = function (n) { return (n < 10 ? "0" : "") + n; };
	if (!(d instanceof Date) || isNaN(d.getTime()))
		return "";
	return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
		"T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

function clampUsbInterval(sec) {
	if (!isFinite(sec))
		return null;
	sec = Math.round(sec);
	if (sec < USB_INTERVAL_MIN)
		sec = USB_INTERVAL_MIN;
	if (sec > USB_INTERVAL_MAX)
		sec = USB_INTERVAL_MAX;
	return sec;
}

function resolveUsbIntervalPair(readRaw, pubRaw) {
	var readVal = readRaw === "" || readRaw == null ? null : Number(readRaw);
	var pubVal = pubRaw === "" || pubRaw == null ? null : Number(pubRaw);
	if ((readVal == null || !isFinite(readVal)) && (pubVal == null || !isFinite(pubVal)))
		return null;
	if (readVal == null || !isFinite(readVal))
		readVal = pubVal;
	if (pubVal == null || !isFinite(pubVal))
		pubVal = readVal;
	return {
		readint: clampUsbInterval(readVal),
		pubint: clampUsbInterval(pubVal)
	};
}

async function ConnectASensorLoadUsbConfig() {
	if (connectionMode !== "usb" || !port || !writer)
		return;
	await withUsbSerialExclusive(async function () {
		var cfgText, sensorText, timeText, tempCal, humCal;
		var cfg, sensors, timeParsed, tempOff, humOff;
		try {
			await sendCommandUntilPrompt("shell -on");
		} catch (err) {}
		try {
			cfgText = await sendCommandUntilPrompt("config");
			cfg = parseUsbConfigText(cfgText);
			fillUsbConfigModeUi(cfg.mode);
			fillUsbConfigIntervalsUi(cfg.readint, cfg.pubint);
			if (cfg.mode)
				sensorInfo.mode = cfg.mode;
			if (cfg.readint != null)
				sensorInfo.readingInterval = formatConnectASensorIntervalLabel(cfg.readint);
			if (cfg.pubint != null)
				sensorInfo.publishInterval = formatConnectASensorIntervalLabel(cfg.pubint);
		} catch (err) {}
		try {
			sensorText = await sendCommandUntilPrompt("sensor");
			sensors = parseUsbSensorList(sensorText);
			usbSensorRows = buildUsbSensorUiRows(sensors);
			renderUsbSensorListUi();
		} catch (err) {
			usbSensorRows = [];
			renderUsbSensorListUi();
		}
		try {
			timeText = await sendCommandUntilPrompt("time");
			timeParsed = parseUsbTimeText(timeText);
			applyUsbTimeToUi(timeParsed);
		} catch (err) {}
		try {
			tempCal = await sendCommandUntilPrompt("control temp cal");
			tempOff = parseUsbCalOffset(tempCal);
			setUsbCalCurrentUi("temp", tempOff);
		} catch (err) {
			setUsbCalCurrentUi("temp", null);
		}
		try {
			humCal = await sendCommandUntilPrompt("control hum cal");
			humOff = parseUsbCalOffset(humCal);
			setUsbCalCurrentUi("hum", humOff);
		} catch (err) {
			setUsbCalCurrentUi("hum", null);
		}
		try {
			setUsbBatteryUi(await loadUsbBatteryPercentExclusive());
		} catch (err) {
			setUsbBatteryUi("—");
		}
		updateConnectASensorUsbConfigVisibility();
		renderConnectASensorInfo();
		syncConnectASensorMeta(getConnectASensorNodeSafe());
	});
}

async function ConnectASensorApplyUsbMode(event) {
	var mode, sd, net;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	sd = document.getElementById("casUsbModeSdcard");
	net = document.getElementById("casUsbModeNetwork");
	mode = (net && net.checked) ? "network" : "sdcard";
	try {
		await withUsbSerialExclusive(async function () {
			await sendCommandUntilPrompt("config -mode " + mode);
			fillUsbConfigModeUi(mode);
			sensorInfo.mode = mode;
		});
		showInfoMessage({
			cat: "Mode canviat a {0}.",
			spa: "Modo cambiado a {0}.",
			eng: "Mode changed to {0}."
		}, mode);
		renderConnectASensorInfo();
		syncConnectASensorMeta(getConnectASensorNodeSafe());
	} catch (err) {
		showInfoMessage(
			{cat: "Error canviant el mode: {0}", spa: "Error al cambiar el modo: {0}", eng: "Error changing mode: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorApplyUsbIntervals(event) {
	var readEl, pubEl, pair, rawRead, rawPub, clampedWarn, resumeCollecting;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	readEl = document.getElementById("casUsbReadInt");
	pubEl = document.getElementById("casUsbPubInt");
	rawRead = readEl && readEl.value !== "" ? Number(readEl.value) : null;
	rawPub = pubEl && pubEl.value !== "" ? Number(pubEl.value) : null;
	pair = resolveUsbIntervalPair(readEl ? readEl.value : "", pubEl ? pubEl.value : "");
	if (!pair) {
		showInfoMessage({cat: "Indiqueu almenys un interval vàlid.", spa: "Indique al menos un intervalo válido.", eng: "Enter at least one valid interval."});
		return;
	}
	clampedWarn = (isFinite(rawRead) && rawRead < USB_INTERVAL_MIN) || (isFinite(rawPub) && rawPub < USB_INTERVAL_MIN);
	resumeCollecting = collectingData || monitoringRunning;
	try {
		/* Atura el bucle, aplica al kit i reinicia amb el nou ritme de taula */
		await stopConnectASensorMonitoringLoop();
		await withUsbSerialExclusive(async function () {
			await sendCommandUntilPrompt("config -readint " + pair.readint);
			if (usbKitMode !== "sdcard")
				await sendCommandUntilPrompt("config -pubint " + pair.pubint);
			fillUsbConfigIntervalsUi(pair.readint, pair.pubint);
			sensorInfo.readingInterval = formatConnectASensorIntervalLabel(pair.readint);
			sensorInfo.publishInterval = formatConnectASensorIntervalLabel(pair.pubint);
		});
		lastConnectASensorSaveAt = null;
		forceImmediateConnectASensorRead = false;
		if (resumeCollecting && connectionMode === "usb" && port) {
			collectingData = true;
			if (!monitoringRunning)
				startMonitoring();
		}
		if (clampedWarn) {
			showInfoMessage({
				cat: "Intervals aplicats (mesura cada {0} s a la taula). Mínim firmware 30 s. Recollida reiniciada.",
				spa: "Intervalos aplicados (medida cada {0} s en la tabla). Mínimo firmware 30 s. Recogida reiniciada.",
				eng: "Intervals applied (reading every {0} s in the table). Firmware min 30 s. Collection restarted."
			}, pair.readint);
		} else {
			showInfoMessage({
				cat: "Intervals aplicats: la taula es refresca cada {0} s (com el kit).",
				spa: "Intervalos aplicados: la tabla se refresca cada {0} s (como el kit).",
				eng: "Intervals applied: the table refreshes every {0} s (same as the kit)."
			}, pair.readint);
		}
		renderConnectASensorInfo();
		syncConnectASensorMeta(getConnectASensorNodeSafe());
	} catch (err) {
		if (resumeCollecting && connectionMode === "usb" && port && !monitoringRunning) {
			collectingData = true;
			startMonitoring();
		}
		showInfoMessage(
			{cat: "Error aplicant intervals: {0}", spa: "Error al aplicar intervalos: {0}", eng: "Error applying intervals: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorReloadUsbSensors(event) {
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	try {
		await withUsbSerialExclusive(async function () {
			var sensorText = await sendCommandUntilPrompt("sensor");
			var sensors = parseUsbSensorList(sensorText);
			usbSensorRows = buildUsbSensorUiRows(sensors);
			renderUsbSensorListUi();
			syncConnectASensorMeta(getConnectASensorNodeSafe());
		});
		if (!usbSensorRows.length) {
			showInfoMessage({
				cat: "Encara no hi ha sensors a la llista.",
				spa: "Todavía no hay sensores en la lista.",
				eng: "Still no sensors in the list."
			});
		}
	} catch (err) {
		showInfoMessage(
			{cat: "Error carregant sensors: {0}", spa: "Error al cargar sensores: {0}", eng: "Error loading sensors: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

function getUsbSensorRowById(groupId) {
	var i;
	for (i = 0; i < usbSensorRows.length; i++) {
		if (usbSensorRows[i].id === groupId)
			return usbSensorRows[i];
	}
	return null;
}

async function ConnectASensorToggleUsbSensor(event, groupId) {
	var row, enable, names, i, cmd;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	row = getUsbSensorRowById(groupId);
	if (!row)
		return;
	enable = !!(event && event.target && event.target.checked);
	names = row.names && row.names.length ? row.names : [row.cmd];
	try {
		await withUsbSerialExclusive(async function () {
			for (i = 0; i < names.length; i++) {
				cmd = "sensor " + names[i] + (enable ? " -enable" : " -disable");
				await sendCommandUntilPrompt(cmd);
			}
			row.enabled = enable;
		});
	} catch (err) {
		if (event && event.target)
			event.target.checked = !enable;
		showInfoMessage(
			{cat: "Error canviant el sensor: {0}", spa: "Error al cambiar el sensor: {0}", eng: "Error changing sensor: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorApplyUsbSensorInterval(event, groupId) {
	var row, val, names, i;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	row = getUsbSensorRowById(groupId);
	if (!row || !event || !event.target)
		return;
	val = clampUsbInterval(Number(event.target.value));
	if (val == null) {
		showInfoMessage({cat: "Interval de sensor no vàlid.", spa: "Intervalo de sensor no válido.", eng: "Invalid sensor interval."});
		return;
	}
	names = row.names && row.names.length ? row.names : [row.cmd];
	try {
		await withUsbSerialExclusive(async function () {
			for (i = 0; i < names.length; i++) {
				await sendCommandUntilPrompt("sensor " + names[i] + " -interval " + val);
			}
			row.intervalSec = val;
			event.target.value = String(val);
		});
	} catch (err) {
		showInfoMessage(
			{cat: "Error canviant l'interval del sensor: {0}", spa: "Error al cambiar el intervalo del sensor: {0}", eng: "Error changing sensor interval: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorApplyUsbTime(event) {
	var input, d, epoch;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	input = document.getElementById("casUsbClockInput");
	if (!input || !input.value) {
		showInfoMessage({cat: "Indiqueu data i hora.", spa: "Indique fecha y hora.", eng: "Enter date and time."});
		return;
	}
	d = new Date(input.value);
	if (isNaN(d.getTime())) {
		showInfoMessage({cat: "Data/hora no vàlida.", spa: "Fecha/hora no válida.", eng: "Invalid date/time."});
		return;
	}
	epoch = Math.floor(d.getTime() / 1000);
	try {
		await withUsbSerialExclusive(async function () {
			var timeText, parsed;
			await sendCommandUntilPrompt("time " + epoch);
			timeText = await sendCommandUntilPrompt("time");
			parsed = parseUsbTimeText(timeText) || { epochSec: epoch, epochMs: epoch * 1000 };
			applyUsbTimeToUi(parsed);
		});
		showInfoMessage({cat: "Hora del kit actualitzada.", spa: "Hora del kit actualizada.", eng: "Kit time updated."});
	} catch (err) {
		showInfoMessage(
			{cat: "Error definint l'hora: {0}", spa: "Error al definir la hora: {0}", eng: "Error setting time: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorSyncUsbTime(event) {
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	try {
		await withUsbSerialExclusive(async function () {
			var timeText, parsed;
			await sendCommandUntilPrompt("time -sync");
			timeText = await sendCommandUntilPrompt("time");
			parsed = parseUsbTimeText(timeText);
			applyUsbTimeToUi(parsed);
		});
		showInfoMessage({cat: "Hora sincronitzada (NTP).", spa: "Hora sincronizada (NTP).", eng: "Time synced (NTP)."});
	} catch (err) {
		showInfoMessage(
			{cat: "Error sincronitzant l'hora: {0}", spa: "Error al sincronizar la hora: {0}", eng: "Error syncing time: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorRefreshUsbTime(event) {
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	try {
		await withUsbSerialExclusive(async function () {
			var timeText = await sendCommandUntilPrompt("time");
			applyUsbTimeToUi(parseUsbTimeText(timeText));
		});
	} catch (err) {
		showInfoMessage(
			{cat: "Error consultant l'hora: {0}", spa: "Error al consultar la hora: {0}", eng: "Error querying time: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorApplyUsbCal(event, kind) {
	var input, delta, cmdKind;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	cmdKind = kind === "hum" ? "hum" : "temp";
	input = document.getElementById(cmdKind === "hum" ? "casUsbHumCalDelta" : "casUsbTempCalDelta");
	delta = input ? Number(input.value) : NaN;
	if (!isFinite(delta)) {
		showInfoMessage({cat: "Indiqueu un offset numèric.", spa: "Indique un offset numérico.", eng: "Enter a numeric offset."});
		return;
	}
	try {
		await withUsbSerialExclusive(async function () {
			var resp, off;
			await sendCommandUntilPrompt("control " + cmdKind + " cal " + delta);
			resp = await sendCommandUntilPrompt("control " + cmdKind + " cal");
			off = parseUsbCalOffset(resp);
			setUsbCalCurrentUi(cmdKind, off);
		});
		showInfoMessage({cat: "Calibratge aplicat.", spa: "Calibración aplicada.", eng: "Calibration applied."});
	} catch (err) {
		showInfoMessage(
			{cat: "Error aplicant calibratge: {0}", spa: "Error al aplicar calibración: {0}", eng: "Error applying calibration: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorClearUsbCal(event, kind) {
	var cmdKind;
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	cmdKind = kind === "hum" ? "hum" : "temp";
	try {
		await withUsbSerialExclusive(async function () {
			var resp, off;
			await sendCommandUntilPrompt("control " + cmdKind + " cal clear");
			resp = await sendCommandUntilPrompt("control " + cmdKind + " cal");
			off = parseUsbCalOffset(resp);
			setUsbCalCurrentUi(cmdKind, off);
		});
		showInfoMessage({cat: "Calibratge restablert.", spa: "Calibración restablecida.", eng: "Calibration reset."});
	} catch (err) {
		showInfoMessage(
			{cat: "Error restablint calibratge: {0}", spa: "Error al restablecer calibración: {0}", eng: "Error resetting calibration: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

async function ConnectASensorRefreshUsbStatus(event) {
	if (event)
		event.preventDefault();
	if (connectionMode !== "usb" || !port)
		return;
	try {
		await withUsbSerialExclusive(async function () {
			setUsbBatteryUi(await loadUsbBatteryPercentExclusive());
		});
	} catch (err) {
		showInfoMessage(
			{cat: "Error actualitzant la bateria: {0}", spa: "Error al actualizar la batería: {0}", eng: "Error refreshing battery: {0}"},
			err && err.message ? err.message : String(err)
		);
	}
}

function getConnectASensorDisplayName() {
	var ver, name;
	if (sensorInfo && sensorInfo.sensorType === "pmscan") {
		if (sensorInfo.bleName)
			return String(sensorInfo.bleName).trim();
		return "PMSCAN";
	}
	ver = sensorInfo && sensorInfo.hardwareVersion ? String(sensorInfo.hardwareVersion).trim() : "";
	if (ver) {
		if (/smartcitizen/i.test(ver) || /^pmscan$/i.test(ver))
			return ver;
		return "Smartcitizen Kit " + ver;
	}
	if (sensorInfo && sensorInfo.portName)
		return sensorInfo.portName;
	if (sensorInfo && sensorInfo.hostname)
		return sensorInfo.hostname;
	if (sensorInfo && sensorInfo.usbId === "2341:804D")
		return "Smartcitizen Kit 2.1";
	return "";
}

function connectASensorConnectedLabel(name) {
	return DonaCadenaFmt({
		cat: "Connectat a {0}",
		spa: "Conectado a {0}",
		eng: "Connected to {0}"
	}, name);
}

function connectASensorDefaultLabel() {
	if (typeof STAOperations !== "undefined" && STAOperations.connectASensor && STAOperations.connectASensor.description)
		return DonaCadena(STAOperations.connectASensor.description);
	return "Connect a sensor";
}

function refreshConnectASensorNodeLabel(node) {
	var name, label;
	if (!node)
		return;
	name = node.connectASensorDisplayName;
	label = name ? connectASensorConnectedLabel(name) : connectASensorDefaultLabel();
	if (node.label === label)
		return;
	node.label = label;
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

function updateConnectASensorNodeLabelFromInfo() {
	var node, name;
	if (typeof getNodeDialog !== "function")
		return;
	try {
		node = getNodeDialog("DialogConnectASensor");
	} catch (err) {
		return;
	}
	if (!node)
		return;
	name = getConnectASensorDisplayName();
	if (name)
		node.connectASensorDisplayName = name;
	else
		delete node.connectASensorDisplayName;
	refreshConnectASensorNodeLabel(node);
}

function restoreConnectASensorNodeLabel() {
	var node;
	if (typeof getNodeDialog !== "function")
		return;
	try {
		node = getNodeDialog("DialogConnectASensor");
	} catch (err) {
		return;
	}
	if (!node)
		return;
	delete node.connectASensorDisplayName;
	refreshConnectASensorNodeLabel(node);
}

function refreshAllConnectASensorNodeLabels() {
	var nodes, i;
	if (typeof networkNodes === "undefined" || !networkNodes.get)
		return;
	nodes = networkNodes.get();
	for (i = 0; i < nodes.length; i++) {
		if (nodes[i] && nodes[i].image === "connectASensor.png")
			refreshConnectASensorNodeLabel(nodes[i]);
	}
}

function isConnectASensorPmKey(key) {
	return ConnectASensorPmKeys.indexOf(key) != -1;
}

function captureLastPmValues() {
	var i, key, got = false, snap;
	snap = lastPmValues ? Object.assign({}, lastPmValues) : {};
	for (i = 0; i < ConnectASensorPmKeys.length; i++) {
		key = ConnectASensorPmKeys[i];
		if (sensorValues[key] !== null && sensorValues[key] !== undefined) {
			snap[key] = sensorValues[key];
			got = true;
		}
	}
	if (got)
		lastPmValues = snap;
}

/*
	Guarda una lectura completa amb l'hora.

	Una fila plana: timestamp + cada sensor com a columna.
	Els PM només s'hi posen quan ja n'hi ha hagut una lectura vàlida;
	després s'arrosseguen fins a la següent lectura de PM.
	S'afegeix a STAdata del node i es refresca la taula inferior.
*/
function saveSensorRecord(measuredAt) {
	var when = measuredAt instanceof Date && !isNaN(measuredAt.getTime())
		? measuredAt
		: new Date();
	var record = {
		timestamp: when.toISOString()
	};
	var key, sensorName;

	sensorName = getConnectASensorDisplayName();
	if (sensorName)
		record.sensor_id = sensorName;

	for (key in sensorValues) {
		if (!Object.prototype.hasOwnProperty.call(sensorValues, key))
			continue;
		if (isConnectASensorPmKey(key))
			continue;
		if (sensorValues[key] !== null && sensorValues[key] !== undefined)
			record[key] = sensorValues[key];
	}
	if (lastPmValues) {
		for (key in lastPmValues) {
			if (Object.prototype.hasOwnProperty.call(lastPmValues, key) &&
				lastPmValues[key] !== null && lastPmValues[key] !== undefined)
				record[key] = lastPmValues[key];
		}
	}

	sensorRecords.push(record);
	lastConnectASensorSaveAt = Date.now();
	updateConnectASensorNodeTable(record);
}

function isConnectASensorDialogOpen() {
	var dlg = document.getElementById("DialogConnectASensor");
	return !!(dlg && dlg.open);
}

function getConnectASensorEmptyTableMessage() {
	var sec;
	if (connectionMode === "ble" && isConnectASensorBleLive()) {
		sec = getConnectASensorIntervalSeconds();
		return DonaCadena({
			cat: "Connectat per Bluetooth. Esperant la primera mesura (interval: {0})…",
			spa: "Conectado por Bluetooth. Esperando la primera medida (intervalo: {0})…",
			eng: "Connected via Bluetooth. Waiting for the first measure (interval: {0})…"
		}).replace("{0}", formatConnectASensorIntervalLabel(sec));
	}
	return DonaCadena({cat: "Encara no hi ha dades.", spa: "Todavía no hay datos.", eng: "No data yet."});
}

function ShowConnectASensorTableInDialog(node) {
	var tableEl = document.getElementById("DialogConnectASensorTable");
	var data, attrs;
	if (!tableEl)
		return;
	if (!node) {
		tableEl.innerHTML = "<p>" + getConnectASensorEmptyTableMessage() + "</p>";
		return;
	}
	data = node.STAdata;
	if (!data || !data.length) {
		tableEl.innerHTML = "<p>" + getConnectASensorEmptyTableMessage() + "</p>";
		return;
	}
	attrs = node.STAdataAttributes ? node.STAdataAttributes : buildConnectASensorDataAttributes(data);
	if (typeof getHTMLTable === "function") {
		tableEl.innerHTML = getHTMLTable(data, attrs, true, "", null, null, "",
			typeof isAttributeAnyURI === "function" ? isAttributeAnyURI : null, node.id,
			null, node.id,
			typeof isAttributeAnyURINodeId === "function" ? isAttributeAnyURINodeId : null, node.id,
			typeof isAttributeSelfNavLink === "function" ? isAttributeSelfNavLink : null);
	}
}

function refreshConnectASensorMainTableUi(nodeId) {
	var stored;
	casTableRefreshTimer = null;
	if (typeof networkNodes !== "undefined")
		stored = networkNodes.get(nodeId);
	if (!stored)
		return;
	if (typeof network !== "undefined" && network.selectNodes)
		network.selectNodes([stored.id]);
	if (typeof updateQueryAndTableArea === "function")
		updateQueryAndTableArea(stored);
	if (typeof ShowQueryNode === "function")
		ShowQueryNode(stored);
	if (typeof ShowTableNode === "function")
		ShowTableNode(stored);
	updateConnectASensorConnectionButtons();
}

function scheduleConnectASensorDialogTableRefresh(nodeId) {
	if (casTableRefreshTimer)
		clearTimeout(casTableRefreshTimer);
	casTableRefreshTimer = setTimeout(function () {
		casTableRefreshTimer = null;
		ShowConnectASensorTableInDialog(typeof networkNodes !== "undefined" ? networkNodes.get(nodeId) : getConnectASensorNodeSafe());
	}, 500);
}

function scheduleConnectASensorTableRefresh(nodeId) {
	if (casTableRefreshTimer)
		clearTimeout(casTableRefreshTimer);
	casTableRefreshTimer = setTimeout(function () {
		refreshConnectASensorMainTableUi(nodeId);
	}, 300);
}

function closeConnectASensorDialog(event) {
	var node;
	if (event)
		event.preventDefault();
	if (typeof hideNodeDialog === "function")
		hideNodeDialog("DialogConnectASensor", event);
	else {
		node = document.getElementById("DialogConnectASensor");
		if (node)
			node.close();
	}
	node = getConnectASensorNodeSafe();
	if (node)
		scheduleConnectASensorTableRefresh(node.id);
}

function updateConnectASensorNodeTable(record) {
	var node = typeof getNodeDialog === "function" ? getNodeDialog("DialogConnectASensor") : null;
	if (!node)
		return;
	if (!node.STAdata)
		node.STAdata = [];
	node.STAdata.push(record);
	syncConnectASensorMeta(node);
	updateConnectASensorConnectionButtons();
	if (isConnectASensorDialogOpen()) {
		scheduleConnectASensorDialogTableRefresh(node.id);
		return;
	}
	scheduleConnectASensorTableRefresh(node.id);
}


/*
	Lectura periòdica dels sensors.

	Sensors normals:
		cada 60 segons.

	PM:
		cada 300 segons.
*/
async function startMonitoring() {

	if (monitoringRunning)
		return;
	monitoringRunning = true;
	collectingData = true;
	updateConnectASensorConnectionButtons();

	try {
		while (shouldCollectConnectASensor()) {
			var cycleStart = Date.now();
			var cycleDeadline = cycleStart + getConnectASensorIntervalSeconds() * 1000;

			await readTemperature();
			if (!shouldCollectConnectASensor())
				break;

			await readHumidity();
			if (!shouldCollectConnectASensor())
				break;

			await readLight();
			if (!shouldCollectConnectASensor())
				break;

			await readNoiseDBA();
			if (!shouldCollectConnectASensor())
				break;

			await readBarometricPressure();
			if (!shouldCollectConnectASensor())
				break;

			await readVOCGasCCS811();
			if (!shouldCollectConnectASensor())
				break;

			await readECO2GasCCS811();
			if (!shouldCollectConnectASensor())
				break;

			if (monitoringInterval % 5 === 0) {

				await readPM1();
				if (!shouldCollectConnectASensor())
					break;

				await readPM25();
				if (!shouldCollectConnectASensor())
					break;

				await readPM10();
				if (!shouldCollectConnectASensor())
					break;

				captureLastPmValues();
			}

			if (!shouldCollectConnectASensor())
				break;

			saveSensorRecord();

			monitoringInterval++;

			if (!shouldCollectConnectASensor())
				break;

			/* Ritme = Mesura del kit: proper cicle a cycleStart + readint */
			await waitConnectASensorUntil(cycleDeadline);
		}
	} finally {
		monitoringRunning = false;
		updateConnectASensorConnectionButtons();
	}
}


/*
	Temperature
*/
async function readTemperature() {

	await sendCommand(
		"read Temperature\r\n",
		"Temperature"
	);
}


/*
	Humidity
*/
async function readHumidity() {

	await sendCommand(
		"read Humidity\r\n",
		"Humidity"
	);
}


/*
	Light
*/
async function readLight() {

	await sendCommand(
		"read Light\r\n",
		"Light"
	);
}


/*
	Noise dBA
*/
async function readNoiseDBA() {

	await sendCommand(
		"read Noise dBA\r\n",
		"Noise dBA"
	);
}


/*
	Barometric pressure
*/
async function readBarometricPressure() {

	await sendCommand(
		"read Barometric pressure\r\n",
		"Barometric pressure"
	);
}


/*
	VOC Gas CCS811
*/
async function readVOCGasCCS811() {

	await sendCommand(
		"read VOC Gas CCS811\r\n",
		"VOC Gas CCS811"
	);
}


/*
	eCO2 Gas CCS811
*/
async function readECO2GasCCS811() {

	await sendCommand(
		"read eCO2 Gas CCS811\r\n",
		"eCO2 Gas CCS811"
	);
}


/*
	PM 1.0
*/
async function readPM1() {
	await readPmSensor("pm1", [
		"PMS PM 1.0",
		"PM 1.0",
		"SEN5X PM 1.0",
		"SPS30 PM 1.0"
	]);
}


/*
	PM 2.5
*/
async function readPM25() {
	await readPmSensor("pm25", [
		"PMS PM 2.5",
		"PM 2.5",
		"SEN5X PM 2.5",
		"SPS30 PM 2.5"
	]);
}


/*
	PM 10.0 — títol firmware: "PMS PM 10.0"
*/
async function readPM10() {
	await readPmSensor("pm10", [
		"PMS PM 10.0",
		"PM 10.0",
		"PM 10",
		"SEN5X PM 10.0",
		"SPS30 PM 10.0"
	]);
}


/*
	Desconnecta el sensor (USB i/o Bluetooth).
	Si quiet===true no mostra missatge (canvi de mode).
*/
async function disconnectSensor(quiet) {

	try {

		waitingFor = null;
		collectingData = false;
		interruptConnectASensorWait();
		if (casTableRefreshTimer) {
			clearTimeout(casTableRefreshTimer);
			casTableRefreshTimer = null;
		}

		if (waitingForPrompt)
			finishPromptWait();

		if (responseTimeout) {
			clearTimeout(responseTimeout);
			responseTimeout = null;
		}

		if (responseResolve) {
			responseResolve();
			responseResolve = null;
		}

		if (reader) {
			try {
				await reader.cancel();
			} catch (e) {}
			try {
				reader.releaseLock();
			} catch (e) {}
			reader = null;
		}

		if (writer) {
			try {
				writer.releaseLock();
			} catch (e) {}
			writer = null;
		}

		if (port) {
			try {
				await port.close();
			} catch (e) {}
			port = null;
		}

		await disconnectBleQuiet();

		responseBuffer = "";
		connectionMode = null;
		ConnectASensorResetUsbConfigState();
		clearConnectASensorInfoPanel();

		if (!quiet)
			showInfoMessage({cat: "Sensor desconnectat.", spa: "Sensor desconectado.", eng: "Sensor disconnected."});
		updateConnectASensorConnectionButtons();

	} catch (error) {

		connectionMode = null;
		ConnectASensorResetUsbConfigState();
		if (!quiet) {
			showInfoMessage(
				{cat: "Error: {0}", spa: "Error: {0}", eng: "Error: {0}"},
				error.message
			);
		}
		updateConnectASensorConnectionButtons();
	}
}

