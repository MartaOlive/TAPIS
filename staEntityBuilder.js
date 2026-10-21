"use strict"

/*
	STA Entity Builder — configures STA entities/observations from sensor or table data.
	Does not publish to the server (see staPublisher.js).

	Config (node.staEntityConfig, version 2):
	{
		version: 2, mode: "connectASensor"|"dataFromTable",
		selected: { <EntityPlural>: true|false, ... },       // checkboxes "Entities in workflow"
		entities: { <EntityPlural>: { id: <src>, props: { <name>: <src> }, locked: bool } },
		measurements: [ { key, include, Datastreams: <entity>, ObservedProperties: <entity> } ]   // connectASensor only
	}
	<src> = { source: "manual"|"column", value: "", column: "" }   (both kept so switching does not lose the other)

	Package (node.staEntityPackage, version 2): see sebBuildPackage().
*/

var SEB_ORDER = ["Parties", "Licenses", "Things", "Locations", "HistoricalLocations", "Sensors", "ObservedProperties",
	"FeaturesOfInterest", "Campaigns", "ObservationGroups", "Datastreams", "MultiDatastreams", "Cells", "Relations", "Observations"];
var SEB_DEFAULT_SELECTED = ["Parties", "Things", "Sensors", "Licenses", "Locations", "FeaturesOfInterest", "ObservedProperties", "Datastreams", "Observations"];
/* In connectASensor mode these are nested under each measurement (Temperature, …).
   FeaturesOfInterest is shared (same place/site for all measurements), like Locations. */
var SEB_PER_MEAS = ["ObservedProperties", "Sensors", "Datastreams"];
/* Entities that must exist in the package when the key entity is used */
var SEB_DEPS = {
	Observations: ["Datastreams"],
	Datastreams: ["Things", "Sensors", "ObservedProperties"],
	MultiDatastreams: ["Things", "Sensors", "ObservedProperties"],
	HistoricalLocations: ["Things", "Locations"]
};
/* Server computed or not supported by the publisher yet */
var SEB_HIDDEN_PROPS = {
	Datastreams: ["observedArea", "phenomenonTime", "resultTime"],
	MultiDatastreams: ["observedArea", "phenomenonTime", "resultTime"],
	Observations: ["resultQuality", "validTime", "parameters"]
};
var SEB_REQUIRED_OVERRIDE = { "Licenses.attributionText": true };
var SEB_OBS_TYPE = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement";
var SEB_MAX_LIST = 500;

/* Runtime context of the open dialog (not persisted) */
var sebCtx = { cols: [], data: [], cands: {}, distinct: {}, staUrl: "" };
var sebAutoSaveTimer = null;

function sebEsc(s) {
	return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function sebEntityOrder() {
	var out = [];
	if (typeof STAEntities === "undefined")
		return out;
	SEB_ORDER.forEach(function (p) {
		if (STAEntities[p])
			out.push(p);
	});
	Object.keys(STAEntities).forEach(function (p) {
		if (out.indexOf(p) === -1)
			out.push(p);
	});
	return out;
}

function sebPropRequired(plural, propName) {
	var props, i;
	if (SEB_REQUIRED_OVERRIDE[plural + "." + propName])
		return true;
	if (typeof STAEntities === "undefined" || !STAEntities[plural] || !STAEntities[plural].properties)
		return false;
	props = STAEntities[plural].properties;
	for (i = 0; i < props.length; i++) {
		if (String(props[i].name).trim() == propName)
			return props[i].required === true;
	}
	return false;
}

/* Configurable properties of an entity (STAEntities + pseudo-properties for geometry and unitOfMeasurement) */
function sebPropList(plural, mode) {
	var def = typeof STAEntities !== "undefined" ? STAEntities[plural] : null;
	var out = [], hidden = SEB_HIDDEN_PROPS[plural] || [], i, p, name;
	if (!def)
		return out;
	for (i = 0; i < def.properties.length; i++) {
		p = def.properties[i];
		name = String(p.name).trim();
		if (hidden.indexOf(name) !== -1)
			continue;
		if (plural === "Observations" && name === "result" && mode === "connectASensor")
			continue;
		if (plural === "Datastreams" && name === "unitOfMeasurement") {
			["name", "symbol", "definition"].forEach(function (sub) {
				out.push({ name: "unitOfMeasurement." + sub, required: true, dataType: "string" });
			});
			continue;
		}
		if ((plural === "Locations" && name === "location") || (plural === "FeaturesOfInterest" && name === "feature")) {
			out.push({ name: "longitude", required: true, dataType: "number" });
			out.push({ name: "latitude", required: true, dataType: "number" });
			continue;
		}
		out.push({ name: name, required: sebPropRequired(plural, name), dataType: p.dataType });
	}
	return out;
}

function sebEffectiveSet(selected) {
	var eff = {}, k;
	function add(p) {
		if (eff[p])
			return;
		eff[p] = true;
		(SEB_DEPS[p] || []).forEach(add);
	}
	for (k in selected) {
		if (Object.prototype.hasOwnProperty.call(selected, k) && selected[k])
			add(k);
	}
	return eff;
}

function getSTAEntityBuilderNodeSafe() {
	if (typeof getNodeDialog !== "function")
		return null;
	try {
		return getNodeDialog("DialogSTAEntityBuilder");
	} catch (err) {
		return null;
	}
}

function getSTAEntityBuilderParent(node) {
	var parents;
	if (!node || typeof GetParentNodes !== "function")
		return null;
	parents = GetParentNodes(node);
	return parents && parents[0] ? parents[0] : null;
}

/* STA URL of the node or of the first ancestor that has one, reduced to the service root */
function sebFindStaUrl(node) {
	var n = node, i;
	for (i = 0; n && i < 30; i++) {
		if (n.STAURL)
			return n.STAURL;
		n = getSTAEntityBuilderParent(n);
	}
	return "";
}

function sebServiceRoot(url) {
	if (!url)
		return "";
	if (typeof getSTAURLRoot === "function")
		url = getSTAURLRoot(url);
	return String(url).replace(/\/+$/, "");
}

function sebColumnNames(data, attrs) {
	var names = [], key, i, rec;
	if (attrs) {
		for (key in attrs) {
			if (Object.prototype.hasOwnProperty.call(attrs, key) && names.indexOf(key) === -1)
				names.push(key);
		}
	}
	if (data) {
		for (i = 0; i < data.length; i++) {
			rec = data[i];
			if (!rec)
				continue;
			for (key in rec) {
				if (Object.prototype.hasOwnProperty.call(rec, key) && names.indexOf(key) === -1)
					names.push(key);
			}
		}
	}
	return names;
}

function sebMeasurementKeysFromParent(parent) {
	var keys = [], key, i, rec, meta;
	if (!parent)
		return keys;
	meta = parent.connectASensorMeta;
	if (meta && meta.measurementKeys && meta.measurementKeys.length)
		return meta.measurementKeys.slice();
	if (typeof ConnectASensorObsProps !== "undefined" && parent.STAdata) {
		for (i = 0; i < parent.STAdata.length; i++) {
			rec = parent.STAdata[i];
			if (!rec)
				continue;
			for (key in ConnectASensorObsProps) {
				if (rec[key] !== null && rec[key] !== undefined && rec[key] !== "" && keys.indexOf(key) === -1)
					keys.push(key);
			}
		}
	}
	return keys;
}

/* ---------- property sources ---------- */

function sebSrcObj(source, value, column) {
	return { source: source || "manual", value: value == null ? "" : String(value), column: column || "" };
}

function sebIsEmpty(v) {
	return v === null || v === undefined || String(v).trim() === "";
}

function sebSrcIsSet(s) {
	return !!s && (s.source === "column" ? !!s.column : !sebIsEmpty(s.value));
}

function sebPackSrc(s, dataType) {
	var o;
	if (!sebSrcIsSet(s))
		return null;
	o = s.source === "column" ? { source: "column", column: s.column } : { source: "manual", value: s.value };
	if (dataType === "JSON")
		o.dataType = "JSON";
	return o;
}

function sebResolveSrc(src, rec) {
	if (!src)
		return undefined;
	return src.source === "column" ? (rec ? rec[src.column] : undefined) : src.value;
}

function sebNewEntity(plural, mode, defaults, columnDefaults) {
	var ent = { id: sebSrcObj("manual", "", ""), props: {}, locked: false };
	defaults = defaults || {};
	columnDefaults = columnDefaults || {};
	sebPropList(plural, mode).forEach(function (p) {
		ent.props[p.name] = columnDefaults[p.name]
			? sebSrcObj("column", "", columnDefaults[p.name])
			: sebSrcObj("manual", defaults[p.name], "");
	});
	return ent;
}

/* ---------- defaults ---------- */

function sebEntityDefaults(plural, ctx) {
	switch (plural) {
		case "Things":
			return ctx.isCas ? { name: ctx.name, description: ctx.desc } : {};
		case "Sensors":
			return ctx.isCas
				? { name: ctx.name, description: ctx.desc, encodingType: "application/json", metadata: ctx.metaStr }
				: { encodingType: "application/json" };
		case "Licenses":
			return {
				name: "CC BY 4.0",
				definition: "https://creativecommons.org/licenses/by/4.0/",
				description: "Creative Commons Attribution 4.0 International",
				logo: ctx.isCas ? "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by.png" : ""
			};
		case "Locations":
		case "FeaturesOfInterest":
			return { encodingType: "application/geo+json" };
		case "Datastreams":
			return { observationType: SEB_OBS_TYPE };
	}
	return {};
}

function sebEntityColumnDefaults(plural, ctx) {
	if (plural !== "Observations")
		return {};
	var d = { phenomenonTime: ctx.timeCol, resultTime: ctx.timeCol };
	if (!ctx.isCas)
		d.result = ctx.valueCol;
	return d;
}

var SEB_DEF_DOCS_PREFIX = "http://www.opengis.net/def/docs/15-078r6/";

/* Parse .../15-078r6/{Singular}/{property[/sub...]} → { plural, propName } */
function sebParseStaAttributeDefinition(definition) {
	var path, parts, singular, propParts, propName, plural, p;
	if (!definition || typeof definition !== "string")
		return null;
	if (definition.indexOf(SEB_DEF_DOCS_PREFIX) !== 0)
		return null;
	path = definition.substring(SEB_DEF_DOCS_PREFIX.length).replace(/^\/+|\/+$/g, "");
	parts = path.split("/").filter(function (s) { return s; });
	if (parts.length < 2)
		return null;
	singular = parts[0];
	propParts = parts.slice(1);
	propName = propParts.join(".");
	if (propName === "id" || propName === "@iot.id")
		propName = "@iot.id";
	plural = null;
	if (typeof STAEntities !== "undefined") {
		for (p in STAEntities) {
			if (Object.prototype.hasOwnProperty.call(STAEntities, p) && STAEntities[p].singular === singular) {
				plural = p;
				break;
			}
		}
	}
	if (!plural)
		return null;
	return { plural: plural, singular: singular, propName: propName };
}

/*
 * From parent.STAdataAttributes[].definition, build maps:
 *   maps[plural].props[propName] = columnName
 *   maps[plural].idColumn = columnName  (for @iot.id)
 */
function sebColumnMapsFromParentAttributes(parent) {
	var attrs = parent && parent.STAdataAttributes, maps = {}, col, def, parsed, slot;
	if (!attrs)
		return maps;
	for (col in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, col) || !attrs[col])
			continue;
		def = attrs[col].definition;
		parsed = sebParseStaAttributeDefinition(def);
		if (!parsed)
			continue;
		slot = maps[parsed.plural] || (maps[parsed.plural] = { props: {}, idColumn: null });
		if (parsed.propName === "@iot.id")
			slot.idColumn = col;
		else
			slot.props[parsed.propName] = col;
	}
	return maps;
}

function sebApplyColumnMapToEntity(ent, plural, slot, mode, onlyEmpty) {
	var propName, col, known, list, i;
	if (!ent || !slot)
		return;
	if (ent.locked)
		return;
	if (slot.idColumn) {
		if (!onlyEmpty || !sebSrcIsSet(ent.id))
			ent.id = sebSrcObj("column", "", slot.idColumn);
	}
	known = {};
	list = sebPropList(plural, mode);
	for (i = 0; i < list.length; i++)
		known[list[i].name] = true;
	for (propName in slot.props) {
		if (!Object.prototype.hasOwnProperty.call(slot.props, propName))
			continue;
		if (!known[propName])
			continue;
		col = slot.props[propName];
		if (!ent.props[propName])
			ent.props[propName] = sebSrcObj("manual", "", "");
		if (onlyEmpty && sebSrcIsSet(ent.props[propName]))
			continue;
		ent.props[propName] = sebSrcObj("column", "", col);
	}
}

/* Auto-wire parent attribute definitions → entity property column sources */
function sebApplyAttributeDefinitionsToConfig(cfg, parent, onlyEmpty) {
	var maps, plural, slot, i, m;
	if (!cfg || !parent)
		return;
	maps = sebColumnMapsFromParentAttributes(parent);
	for (plural in maps) {
		if (!Object.prototype.hasOwnProperty.call(maps, plural))
			continue;
		slot = maps[plural];
		cfg.selected[plural] = true;
		if (cfg.mode === "connectASensor" && SEB_PER_MEAS.indexOf(plural) !== -1 && cfg.measurements) {
			for (i = 0; i < cfg.measurements.length; i++) {
				m = cfg.measurements[i];
				if (m[plural])
					sebApplyColumnMapToEntity(m[plural], plural, slot, cfg.mode, onlyEmpty);
			}
		} else if (cfg.entities[plural]) {
			sebApplyColumnMapToEntity(cfg.entities[plural], plural, slot, cfg.mode, onlyEmpty);
		}
	}
}

function sebNewMeasurement(key, parent, ctx) {
	var attrs = (parent && parent.STAdataAttributes) || {};
	var attr = attrs[key] || {};
	var spec = (typeof ConnectASensorObsProps !== "undefined" && ConnectASensorObsProps[key]) || {};
	var obsName = attr.description || spec.name || key;
	var desc = attr.description || spec.description || key;
	var sensorDefaults = sebEntityDefaults("Sensors", ctx);
	return {
		key: key,
		include: true,
		ObservedProperties: sebNewEntity("ObservedProperties", ctx.mode, {
			name: obsName,
			description: desc,
			definition: attr.definition || spec.definition || ""
		}),
		Sensors: sebNewEntity("Sensors", ctx.mode, {
			name: sensorDefaults.name || obsName,
			description: sensorDefaults.description || desc,
			encodingType: sensorDefaults.encodingType || "application/json",
			metadata: sensorDefaults.metadata || ""
		}),
		Datastreams: sebNewEntity("Datastreams", ctx.mode, {
			name: obsName,
			description: desc,
			observationType: SEB_OBS_TYPE,
			"unitOfMeasurement.name": attr.UoM || spec.UoM || "",
			"unitOfMeasurement.symbol": attr.UoMSymbol || spec.UoMSymbol || "",
			"unitOfMeasurement.definition": attr.UoMDefinition || spec.UoMDefinition || ""
		})
	};
}

function sebCloneEntityCfg(ent) {
	if (typeof deapCopy === "function")
		return deapCopy(ent);
	return JSON.parse(JSON.stringify(ent));
}

/* Older configs: fill Sensors per measurement; migrate FoI to shared (one place for all). */
function sebEnsureMeasurementEntities(cfg, parent) {
	var ctx, sharedSensor, sharedFoi, i, m;
	if (!cfg || cfg.mode !== "connectASensor" || !cfg.measurements)
		return;
	ctx = {
		mode: cfg.mode,
		isCas: true,
		name: "Sensor",
		desc: "Sensor",
		metaStr: ""
	};
	if (parent && parent.connectASensorMeta) {
		ctx.name = parent.connectASensorMeta.displayName || ctx.name;
		if (parent.connectASensorMeta.sensorInfo)
			ctx.metaStr = JSON.stringify(parent.connectASensorMeta.sensorInfo);
	}
	if (!cfg.entities)
		cfg.entities = {};
	sharedSensor = cfg.entities.Sensors;
	sharedFoi = cfg.entities.FeaturesOfInterest;
	/* Promote first per-measurement FoI into the shared entity if shared is empty */
	if (!sharedFoi || !sebEntityHasAnyValue(sharedFoi)) {
		for (i = 0; i < cfg.measurements.length; i++) {
			if (cfg.measurements[i].FeaturesOfInterest) {
				cfg.entities.FeaturesOfInterest = sebCloneEntityCfg(cfg.measurements[i].FeaturesOfInterest);
				sharedFoi = cfg.entities.FeaturesOfInterest;
				break;
			}
		}
	}
	if (!cfg.entities.FeaturesOfInterest)
		cfg.entities.FeaturesOfInterest = sebNewEntity("FeaturesOfInterest", cfg.mode, sebEntityDefaults("FeaturesOfInterest", ctx));
	cfg.measurements.forEach(function (meas, idx) {
		m = meas;
		if (!m.ObservedProperties || !m.Datastreams) {
			var neu = sebNewMeasurement(m.key, parent, ctx);
			m.ObservedProperties = m.ObservedProperties || neu.ObservedProperties;
			m.Datastreams = m.Datastreams || neu.Datastreams;
			m.Sensors = m.Sensors || neu.Sensors;
		}
		if (!m.Sensors)
			m.Sensors = idx === 0 && sharedSensor ? sebCloneEntityCfg(sharedSensor) : sebNewEntity("Sensors", cfg.mode, sebEntityDefaults("Sensors", ctx));
		/* FoI is shared only — drop obsolete per-measurement copies */
		delete m.FeaturesOfInterest;
	});
}

function sebEntityHasAnyValue(ent) {
	var k, src;
	if (!ent)
		return false;
	if (ent.id && sebSrcIsSet(ent.id))
		return true;
	if (!ent.props)
		return false;
	for (k in ent.props) {
		if (!Object.prototype.hasOwnProperty.call(ent.props, k))
			continue;
		src = ent.props[k];
		if (sebSrcIsSet(src))
			return true;
	}
	return false;
}

/* Candidate records from the nearest STA entity ancestors that have a table (by entity type) */
function sebCandidatesFromParent(parent) {
	var map = {}, n = parent, i, plural, recs, seen, j, rec, id;
	for (i = 0; n && i < 30; i++) {
		if (n.STAdata && n.STAdata.length && n.STAURL && typeof getSTAURLLastEntity === "function" &&
				typeof getSTAEntityPlural === "function") {
			plural = getSTAEntityPlural(getSTAURLLastEntity(n.STAURL), false);
			if (STAEntities[plural] && !map[plural]) {
				recs = [];
				seen = {};
				for (j = 0; j < n.STAdata.length; j++) {
					rec = n.STAdata[j];
					id = rec ? rec["@iot.id"] : undefined;
					if (sebIsEmpty(id) || seen[id])
						continue;
					seen[id] = true;
					recs.push(rec);
				}
				if (recs.length)
					map[plural] = recs;
			}
		}
		n = getSTAEntityBuilderParent(n);
	}
	return map;
}

function sebDefaultConfig(parent, mode) {
	var isCas = mode === "connectASensor";
	var meta = (parent && parent.connectASensorMeta) || {};
	var info = meta.sensorInfo || {};
	var cols = sebColumnNames(parent && parent.STAdata, parent && parent.STAdataAttributes);
	var isPmscan = info.sensorType === "pmscan";
	var metaStr = Object.keys(info).length ? JSON.stringify(info) :
		(isPmscan ? "https://skmove.io/tera/pmscan/webapp/" : "https://docs.smartcitizen.me/");
	var timeCol = cols.indexOf("timestamp") !== -1 ? "timestamp" :
		(cols.indexOf("phenomenonTime") !== -1 ? "phenomenonTime" : (cols[0] || ""));
	var valueCols = cols.filter(function (c) {
		return c !== timeCol && c !== "sensor_id" && c !== "@iot.id";
	});
	var ctx = {
		mode: mode,
		isCas: isCas,
		name: meta.displayName || info.bleName || "Sensor",
		desc: isPmscan ? "PMSCAN / Polluscan (TERA)" : "Smart Citizen Kit",
		metaStr: metaStr,
		timeCol: isCas ? "timestamp" : timeCol,
		valueCol: valueCols[0] || ""
	};
	var cfg = { version: 2, mode: mode, selected: {}, entities: {}, measurements: [] };
	var cands = sebCandidatesFromParent(parent);

	sebEntityOrder().forEach(function (plural) {
		var ent, recs;
		cfg.selected[plural] = SEB_DEFAULT_SELECTED.indexOf(plural) !== -1;
		ent = sebNewEntity(plural, mode, sebEntityDefaults(plural, ctx), sebEntityColumnDefaults(plural, ctx));
		recs = cands[plural];
		if (recs && recs.length === 1) {   /* one record coming from the workflow: preselect it (read-only) */
			sebApplyRecordToEntityCfg(plural, ent, recs[0], mode);
			cfg.selected[plural] = true;
		}
		cfg.entities[plural] = ent;
	});
	if (isCas) {
		cfg.selected.Observations = true;
		sebMeasurementKeysFromParent(parent).forEach(function (key) {
			cfg.measurements.push(sebNewMeasurement(key, parent, ctx));
		});
	}
	/* Columns whose STAdataAttributes.definition is .../Entity/property → bind as column source */
	sebApplyAttributeDefinitionsToConfig(cfg, parent, false);
	return cfg;
}

function sebSyncMeasurements(cfg, parent) {
	var keys, ctx, meta, info, isPmscan;
	if (cfg.mode !== "connectASensor")
		return;
	keys = sebMeasurementKeysFromParent(parent);
	meta = (parent && parent.connectASensorMeta) || {};
	info = meta.sensorInfo || {};
	isPmscan = info.sensorType === "pmscan";
	ctx = {
		mode: cfg.mode,
		isCas: true,
		name: meta.displayName || info.bleName || "Sensor",
		desc: isPmscan ? "PMSCAN / Polluscan (TERA)" : "Smart Citizen Kit",
		metaStr: Object.keys(info).length ? JSON.stringify(info) :
			(isPmscan ? "https://skmove.io/tera/pmscan/webapp/" : "https://docs.smartcitizen.me/")
	};
	keys.forEach(function (key) {
		var i;
		for (i = 0; i < cfg.measurements.length; i++) {
			if (cfg.measurements[i].key === key)
				return;
		}
		cfg.measurements.push(sebNewMeasurement(key, parent, ctx));
	});
	sebEnsureMeasurementEntities(cfg, parent);
}

function sebEnsureConfig(node, force) {
	var parent = getSTAEntityBuilderParent(node);
	var preferCas = !!(parent && (parent.image === "connectASensor.png" || parent.image === "readSDFromSensor.png" || parent.connectASensorMeta));
	if (!force && node.staEntityConfig && node.staEntityConfig.version === 2) {
		sebEnsureMeasurementEntities(node.staEntityConfig, parent);
		if (node.staEntityConfig.mode === "connectASensor" && node.staEntityConfig.selected)
			node.staEntityConfig.selected.Observations = true;
		return node.staEntityConfig;
	}
	node.staEntityConfig = sebDefaultConfig(parent, preferCas ? "connectASensor" : "dataFromTable");
	return node.staEntityConfig;
}

/* ---------- record <-> property values ---------- */

function sebParseMaybeJson(v) {
	if (typeof v === "string") {
		try {
			return JSON.parse(v);
		} catch (e) {
			return v;
		}
	}
	return v;
}

function sebPropValueFromRecord(name, rec) {
	var v, geom, coords;
	if (!rec)
		return "";
	if (name.indexOf("unitOfMeasurement.") === 0) {
		v = sebParseMaybeJson(rec.unitOfMeasurement);
		v = v && typeof v === "object" ? v[name.substring(name.indexOf(".") + 1)] : undefined;
	} else if (name === "longitude" || name === "latitude") {
		geom = sebParseMaybeJson(rec.location !== undefined ? rec.location : rec.feature);
		if (geom && geom.geometry)
			geom = geom.geometry;
		coords = geom && geom.coordinates;
		v = coords ? coords[name === "longitude" ? 0 : 1] : undefined;
	} else
		v = rec[name];
	if (v === null || v === undefined)
		return "";
	return typeof v === "object" ? JSON.stringify(v) : String(v);
}

function sebApplyRecordToEntityCfg(plural, ent, rec, mode) {
	ent.id = sebSrcObj("manual", rec["@iot.id"], "");
	sebPropList(plural, mode).forEach(function (p) {
		ent.props[p.name] = sebSrcObj("manual", sebPropValueFromRecord(p.name, rec), "");
	});
	ent.locked = true;
}

/* ---------- form helpers ---------- */

function sebVal(id) {
	var el = document.getElementById(id);
	return el ? el.value : "";
}

function sebBody() {
	return document.getElementById("DialogSTAEntityBuilderBody");
}

function sebColumnOptionsHtml(columns, selected) {
	var html = "<option value=\"\">—</option>", i;
	for (i = 0; i < columns.length; i++) {
		html += "<option value=\"" + sebEsc(columns[i]) + "\"" +
			(columns[i] === selected ? " selected" : "") + ">" + sebEsc(columns[i]) + "</option>";
	}
	return html;
}

function sebSourceSelectHtml(source, disabled, onchange) {
	return "<select class=\"sebSrc\" onchange=\"" + onchange + "\"" + (disabled ? " disabled" : "") + ">" +
		"<option value=\"manual\"" + (source !== "column" ? " selected" : "") + ">" +
		DonaCadena({cat: "Manual", spa: "Manual", eng: "Manual"}) + "</option>" +
		"<option value=\"column\"" + (source === "column" ? " selected" : "") + ">" +
		DonaCadena({cat: "Columna", spa: "Columna", eng: "Column"}) + "</option></select>";
}

function sebPropRowHtml(p, src, cols, locked) {
	var isCol = src.source === "column";
	return "<div class=\"sebRow\" data-prop=\"" + sebEsc(p.name) + "\">" +
		"<span class=\"sebLbl" + (p.required ? " sebRequired" : "") + "\">" + sebEsc(p.name) + (p.required ? "*" : "") + "</span>" +
		sebSourceSelectHtml(src.source, locked, "sebOnSrcChange(this)") +
		"<input type=\"text\" class=\"sebVal\" value=\"" + sebEsc(src.value) + "\"" + (locked ? " readonly" : "") + (isCol ? " hidden" : "") + ">" +
		"<select class=\"sebCol\"" + (locked ? " disabled" : "") + (isCol ? "" : " hidden") + ">" +
		sebColumnOptionsHtml(cols, src.column) + "</select></div>";
}

/* Party: only label + read-only value (no Manual/Column selects) */
function sebPartyPropRowHtml(p, src) {
	return "<div class=\"sebRow\" data-prop=\"" + sebEsc(p.name) + "\">" +
		"<span class=\"sebLbl\">" + sebEsc(p.name) + "</span>" +
		"<input type=\"text\" class=\"sebVal\" value=\"" + sebEsc(src && src.value ? src.value : "") + "\" readonly tabindex=\"-1\">" +
		"</div>";
}

function sebPartyIdRowHtml(ent) {
	var v = ent && ent.id && ent.id.value != null ? ent.id.value : "";
	return "<div class=\"sebRow sebIdRow\" data-prop=\"@iot.id\">" +
		"<span class=\"sebLbl\">@iot.id</span>" +
		"<input type=\"text\" class=\"sebVal\" value=\"" + sebEsc(v) + "\" readonly tabindex=\"-1\">" +
		"</div>";
}

function sebCandidateLabel(rec) {
	var label = String(rec["@iot.id"]), extra = rec.name || rec.description || "";
	if (extra)
		label += " — " + String(extra).substring(0, 60);
	return label;
}

function sebIdRowHtml(plural, ent, cols, cands) {
	var s = ent.id, isCol = s.source === "column", html, i, sel;
	html = "<div class=\"sebRow sebIdRow\" data-prop=\"@iot.id\"><span class=\"sebLbl\">@iot.id</span>";
	if (cands && cands.length > 1) {
		html += "<select class=\"sebCand\" onchange=\"sebOnCandidate(this)\"><option value=\"\">" +
			DonaCadena({cat: "— tria un registre —", spa: "— elige un registro —", eng: "— choose a record —"}) + "</option>";
		for (i = 0; i < cands.length && i < SEB_MAX_LIST; i++) {
			sel = !isCol && s.value !== "" && String(cands[i]["@iot.id"]) === String(s.value);
			html += "<option value=\"" + i + "\"" + (sel ? " selected" : "") + ">" + sebEsc(sebCandidateLabel(cands[i])) + "</option>";
		}
		html += "</select>";
	}
	html += sebSourceSelectHtml(s.source, false, "sebOnSrcChange(this)") +
		"<input type=\"text\" class=\"sebVal\" value=\"" + sebEsc(s.value) + "\" oninput=\"sebOnIdChange(this)\"" + (isCol ? " hidden" : "") + ">" +
		"<select class=\"sebCol\" onchange=\"sebOnIdChange(this)\"" + (isCol ? "" : " hidden") + ">" + sebColumnOptionsHtml(cols, s.column) + "</select>" +
		"<select class=\"sebIdPick\" onchange=\"sebOnIdChange(this)\" hidden></select>" +
		"<button type=\"button\" class=\"sebSearchBtn\" onclick=\"sebSearchEntity(this)\" disabled" + (isCol ? " hidden" : "") + ">" +
		DonaCadena({cat: "Cerca", spa: "Buscar", eng: "Search"}) + "</button>" +
		"<span class=\"sebSearchMsg\"" + (isCol ? " hidden" : "") + "></span></div>";
	return html;
}

function sebEntityBlockHtml(plural, ent, meas, cols, cands, mode, showTitle) {
	var partyFixed = plural === "Parties";
	var locked = !!(ent.locked || partyFixed);
	var html = "<div class=\"sebEnt" + (locked ? " sebLocked" : "") + (partyFixed ? " sebPartyFixed" : "") +
		"\" data-ent=\"" + plural + "\"" +
		(meas !== null ? " data-meas=\"" + sebEsc(meas) + "\"" : "") +
		(partyFixed ? " data-party-fixed=\"1\"" : "") + ">";
	if (showTitle)
		html += "<div class=\"sebMeasEntTitle\">" + sebEsc(plural) + "</div>";
	if (partyFixed) {
		html += sebPartyIdRowHtml(ent);
		sebPropList(plural, mode).forEach(function (p) {
			html += sebPartyPropRowHtml(p, ent.props[p.name] || sebSrcObj("manual", "", ""));
		});
	} else {
		html += sebIdRowHtml(plural, ent, cols, cands);
		sebPropList(plural, mode).forEach(function (p) {
			html += sebPropRowHtml(p, ent.props[p.name] || sebSrcObj("manual", "", ""), cols, locked);
		});
	}
	if (plural === "Locations" || plural === "FeaturesOfInterest") {
		html += "<button type=\"button\" class=\"sebGeoBtn\" onclick=\"sebUseGeolocation(this)\">" +
			DonaCadena({cat: "Usa la meva ubicació", spa: "Usar mi ubicación", eng: "Use my location"}) +
			"</button>";
	}
	return html + "</div>";
}

function sebIsLoggedIn() {
	if (typeof spaIsLoggedIn === "function")
		return spaIsLoggedIn();
	try {
		return !!(typeof CriptoName !== "undefined" && CriptoName && CriptoName !== "Anonymous" &&
			typeof hello === "function" &&
			hello("authenix").getAuthResponse() &&
			hello("authenix").getAuthResponse().access_token);
	} catch (err) {
		return false;
	}
}

function sebSetPropRowValue(entEl, propName, value) {
	var rows = entEl.querySelectorAll(".sebRow"), i, row, srcEl, valEl;
	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		if (row.getAttribute("data-prop") !== propName)
			continue;
		srcEl = row.querySelector(".sebSrc");
		valEl = row.querySelector(".sebVal");
		if (srcEl)
			srcEl.value = "manual";
		if (valEl)
			valEl.value = value == null ? "" : String(value);
		if (srcEl)
			sebApplySrcVisibility(row);
		return;
	}
}

function sebUseGeolocation(btn) {
	var entEl = btn.closest(".sebEnt");
	function apply(lon, lat) {
		if (!entEl)
			return;
		sebSetPropRowValue(entEl, "longitude", lon);
		sebSetPropRowValue(entEl, "latitude", lat);
		sebScheduleAutoSave();
	}
	if (typeof PreviousGPSPoint !== "undefined" && PreviousGPSPoint && PreviousGPSPoint.long != null && PreviousGPSPoint.lat != null) {
		apply(PreviousGPSPoint.long, PreviousGPSPoint.lat);
		return;
	}
	if (!navigator.geolocation) {
		showInfoMessage({cat: "El navegador no admet geolocalització.", spa: "El navegador no admite geolocalización.", eng: "Geolocation is not supported by this browser."});
		return;
	}
	btn.disabled = true;
	navigator.geolocation.getCurrentPosition(function (pos) {
		btn.disabled = false;
		apply(pos.coords.longitude, pos.coords.latitude);
	}, function (err) {
		btn.disabled = false;
		showInfoMessage({cat: "No s'ha pogut obtenir la ubicació: {0}", spa: "No se ha podido obtener la ubicación: {0}", eng: "Could not get location: {0}"},
			err && err.message ? err.message : String(err));
	}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}

function sebInitCtx(node, parent) {
	sebCtx = {
		cols: sebColumnNames(parent && parent.STAdata, parent && parent.STAdataAttributes),
		data: (parent && parent.STAdata) || [],
		cands: sebCandidatesFromParent(parent),
		distinct: {},
		staUrl: sebServiceRoot(sebFindStaUrl(node))
	};
}

function sebDistinctValues(col) {
	var out, seen, i, v;
	if (sebCtx.distinct[col])
		return sebCtx.distinct[col];
	out = [];
	seen = {};
	for (i = 0; i < sebCtx.data.length; i++) {
		v = sebCtx.data[i] ? sebCtx.data[i][col] : undefined;
		if (sebIsEmpty(v))
			continue;
		v = String(v).trim();
		if (!seen[v]) {
			seen[v] = true;
			out.push(v);
		}
	}
	sebCtx.distinct[col] = out;
	return out;
}

function sebShowStaUrl() {
	var el = document.getElementById("DialogSTAEntityBuilderStaUrlText");
	if (!el)
		return;
	el.textContent = sebCtx.staUrl || DonaCadena({cat: "(sense URL)", spa: "(sin URL)", eng: "(no URL)"});
	el.title = sebCtx.staUrl || "";
}

/* ---------- render ---------- */

function sebMeasLabel(m) {
	var n = m.ObservedProperties && m.ObservedProperties.props && m.ObservedProperties.props.name
		? m.ObservedProperties.props.name.value : "";
	if (!n && m.Datastreams && m.Datastreams.props && m.Datastreams.props.name)
		n = m.Datastreams.props.name.value;
	return n || m.key;
}

function renderSTAEntityBuilderForm(node) {
	var el = sebBody();
	var parent = getSTAEntityBuilderParent(node);
	var cfg = sebEnsureConfig(node, false);
	var cols = sebCtx.cols;
	var html = [], order = sebEntityOrder(), isCas = cfg.mode === "connectASensor", rows, ids, i;
	var perMeasSet = {};
	if (!el)
		return;
	SEB_PER_MEAS.forEach(function (p) { perMeasSet[p] = true; });
	rows = parent && parent.STAdata ? parent.STAdata.length : 0;

	html.push("<div class=\"sebModeRow\"><label>",
		DonaCadena({cat: "Mode d'entrada:", spa: "Modo de entrada:", eng: "Input mode:"}),
		" <select id=\"sebMode\" onchange=\"sebOnModeChange(event)\">",
		"<option value=\"connectASensor\"" + (isCas ? " selected" : "") + ">ConnectASensor</option>",
		"<option value=\"dataFromTable\"" + (!isCas ? " selected" : "") + ">DataFromTable</option>",
		"</select></label>",
		" <span class=\"sebHint\">",
		DonaCadenaFmt({cat: "Files d'entrada: {0}", spa: "Filas de entrada: {0}", eng: "Input rows: {0}"}, rows),
		"</span></div>");

	html.push("<fieldset><legend>",
		DonaCadena({cat: "Entitats al flux", spa: "Entidades en el flujo", eng: "Entities in workflow"}),
		"</legend><div class=\"sebIncludeRow\">");
	order.forEach(function (plural) {
		html.push("<label><input type=\"checkbox\" class=\"sebInc\" data-ent=\"" + plural + "\" onchange=\"sebOnIncludeChange()\"" +
			(cfg.selected[plural] ? " checked" : "") +
			(isCas && plural === "Observations" ? " disabled" : "") +
			"> " + plural + "</label>");
	});
	html.push("</div></fieldset>");

	if (isCas) {
		html.push("<fieldset><legend>",
			DonaCadena({cat: "Columnes de mesura", spa: "Columnas de medida", eng: "Measurement columns"}),
			"</legend><div class=\"sebIncludeRow\">");
		cfg.measurements.forEach(function (m) {
			html.push("<label><input type=\"checkbox\" class=\"sebMeasInc\" data-meas=\"" + sebEsc(m.key) + "\" onchange=\"sebOnIncludeChange()\"" +
				(m.include ? " checked" : "") + "> " + sebEsc(sebMeasLabel(m)) +
				" <code>" + sebEsc(m.key) + "</code></label>");
		});
		if (!cfg.measurements.length)
			html.push("<span class=\"sebHint\">",
				DonaCadena({cat: "No s'han detectat columnes de mesura.", spa: "No se han detectado columnas de medida.", eng: "No measurement columns detected."}),
				"</span>");
		html.push("</div></fieldset>");
	}

	/* Shared entity sections (in CAS mode, per-measurement ones are nested under each measurement) */
	order.forEach(function (plural) {
		if (isCas && perMeasSet[plural])
			return;
		html.push("<fieldset class=\"sebSection\" data-section=\"" + plural + "\" hidden><legend>" + plural +
			" <small class=\"sebReqNote\" hidden>" +
			DonaCadena({cat: "(requerit per altres entitats)", spa: "(requerido por otras entidades)", eng: "(required by other entities)"}) +
			"</small></legend>");
		if (plural === "Parties")
			html.push("<p id=\"sebPartyMsg\" class=\"sebPartyMsg sebHint\"></p>");
		if (isCas && plural === "Observations") {
			html.push("<p class=\"sebHint sebObsSensorNote\">",
				DonaCadena({
					cat: "Les observacions es deriven de les dades recollides amb el sensor (cada valor de mesura × cada registre). No cal mapar columnes aquí.",
					spa: "Las observaciones se derivan de los datos recogidos con el sensor (cada valor de medida × cada registro). No hace falta mapear columnas aquí.",
					eng: "Observations are derived from data collected with the sensor (each measurement value × each record). No column mapping is needed here."
				}),
				"</p>");
		} else {
			html.push(sebEntityBlockHtml(plural, cfg.entities[plural], null, cols, sebCtx.cands[plural], cfg.mode, false));
		}
		html.push("</fieldset>");
	});

	/* Measurement sections: Temperature → ObservedProperty, Sensor, Datastream (FoI is shared above) */
	if (isCas) {
		cfg.measurements.forEach(function (m) {
			html.push("<fieldset class=\"sebSection sebMeasSection\" data-section-meas=\"" + sebEsc(m.key) + "\" data-meas=\"" +
				sebEsc(m.key) + "\" hidden><legend>" + sebEsc(sebMeasLabel(m)) +
				" <code>" + sebEsc(m.key) + "</code></legend>");
			SEB_PER_MEAS.forEach(function (plural) {
				html.push("<div class=\"sebMeasEntWrap\" data-meas-ent=\"" + plural + "\" hidden>",
					sebEntityBlockHtml(plural, m[plural], m.key, cols, null, cfg.mode, true),
					"</div>");
			});
			html.push("</fieldset>");
		});
	}

	html.push("<div id=\"DialogSTAEntityBuilderStatus\" class=\"sebStatus\"></div>");
	el.innerHTML = html.join("");

	ids = el.querySelectorAll(".sebIdRow");
	for (i = 0; i < ids.length; i++)
		sebUpdateIdUi(ids[i]);
	/* Party is always fixed (login); lock UI before the async lookup finishes */
	(function () {
		var partyEnt = el.querySelector(".sebEnt[data-ent=\"Parties\"]");
		var partyInc = el.querySelector(".sebInc[data-ent=\"Parties\"]");
		var obsInc = el.querySelector(".sebInc[data-ent=\"Observations\"]");
		if (partyEnt)
			sebLockPartyEntity(partyEnt);
		if (partyInc) {
			partyInc.checked = true;
			partyInc.disabled = true;
			partyInc.title = DonaCadena({
				cat: "El Party és obligatori i ve del login; no es pot desactivar.",
				spa: "El Party es obligatorio y viene del login; no se puede desactivar.",
				eng: "Party is required and comes from login; it cannot be turned off."
			});
		}
		if (isCas && obsInc) {
			obsInc.checked = true;
			obsInc.disabled = true;
			obsInc.title = DonaCadena({
				cat: "Les observacions es deriven de les dades del sensor.",
				spa: "Las observaciones se derivan de los datos del sensor.",
				eng: "Observations are derived from the sensor data."
			});
		}
	})();
	sebRefreshVisibility();
	sebBindAutoSave(el);
	sebLoadPartyFromLogin(node);
}

function sebReadSelectedFromForm() {
	var el = sebBody(), sel = {}, incs, i, modeEl;
	if (!el)
		return sel;
	incs = el.querySelectorAll(".sebInc");
	for (i = 0; i < incs.length; i++)
		sel[incs[i].getAttribute("data-ent")] = incs[i].checked;
	/* Party is always required for registration */
	sel.Parties = true;
	modeEl = document.getElementById("sebMode");
	/* Sensor mode: Observations stay in the workflow (derived from sensor data) */
	if (modeEl && modeEl.value === "connectASensor")
		sel.Observations = true;
	return sel;
}

/* Shows/hides sections and measurement blocks without redrawing the form */
function sebRefreshVisibility() {
	var el = sebBody(), sel, eff, secs, i, p, note, measChecked = {}, mincs, blocks, m, wraps, j, anyMeasEnt, plural;
	var perMeasNeeded = false;
	if (!el)
		return;
	sel = sebReadSelectedFromForm();
	eff = sebEffectiveSet(sel);
	SEB_PER_MEAS.forEach(function (pl) {
		if (eff[pl])
			perMeasNeeded = true;
	});
	secs = el.querySelectorAll(".sebSection");
	for (i = 0; i < secs.length; i++) {
		p = secs[i].getAttribute("data-section");
		m = secs[i].getAttribute("data-section-meas");
		if (m !== null) {
			/* measurement section: visible if any per-meas entity is effective and measurement included */
			continue;
		}
		secs[i].hidden = !eff[p];
		note = secs[i].querySelector(".sebReqNote");
		if (note)
			note.hidden = !(eff[p] && !sel[p]);
	}
	mincs = el.querySelectorAll(".sebMeasInc");
	for (i = 0; i < mincs.length; i++)
		measChecked[mincs[i].getAttribute("data-meas")] = mincs[i].checked;
	blocks = el.querySelectorAll(".sebMeasSection");
	for (i = 0; i < blocks.length; i++) {
		m = blocks[i].getAttribute("data-meas");
		blocks[i].hidden = !perMeasNeeded || measChecked[m] === false;
		wraps = blocks[i].querySelectorAll(".sebMeasEntWrap");
		anyMeasEnt = false;
		for (j = 0; j < wraps.length; j++) {
			plural = wraps[j].getAttribute("data-meas-ent");
			wraps[j].hidden = !eff[plural];
			if (eff[plural])
				anyMeasEnt = true;
		}
		if (!anyMeasEnt)
			blocks[i].hidden = true;
	}
}

function sebOnIncludeChange() {
	sebRefreshVisibility();
	sebScheduleAutoSave();
}

function sebScheduleAutoSave() {
	if (sebAutoSaveTimer)
		clearTimeout(sebAutoSaveTimer);
	sebAutoSaveTimer = setTimeout(function () {
		sebAutoSaveTimer = null;
		sebAutoSave(true);
	}, 400);
}

function sebAutoSave(quiet) {
	var node = getSTAEntityBuilderNodeSafe();
	if (!node)
		return;
	sebCollectConfigFromForm(node);
	if (!quiet)
		sebSetStatus(DonaCadena({cat: "Configuració desada al node.", spa: "Configuración guardada en el nodo.", eng: "Configuration saved on the node."}), false);
}

function sebBindAutoSave(el) {
	if (!el || el.getAttribute("data-seb-autosave") === "1")
		return;
	el.setAttribute("data-seb-autosave", "1");
	el.addEventListener("input", function (ev) {
		if (ev.target && (ev.target.matches("input, textarea, select") || ev.target.closest(".sebRow")))
			sebScheduleAutoSave();
	});
	el.addEventListener("change", function (ev) {
		if (ev.target && ev.target.matches("input, textarea, select"))
			sebScheduleAutoSave();
	});
}

/* Locks every Party control (ID included): Party comes from login and must not be edited */
function sebLockPartyEntity(entEl) {
	var rows, i, row, inp, sels, j, btn, cand;
	if (!entEl)
		return;
	entEl.classList.add("sebLocked", "sebPartyFixed");
	entEl.setAttribute("data-party-fixed", "1");
	rows = entEl.querySelectorAll(".sebRow");
	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		inp = row.querySelector(".sebVal");
		if (inp) {
			inp.readOnly = true;
			inp.tabIndex = -1;
		}
		sels = row.querySelectorAll("select");
		for (j = 0; j < sels.length; j++)
			sels[j].disabled = true;
		btn = row.querySelector(".sebSearchBtn");
		if (btn)
			btn.disabled = true;
		cand = row.querySelector(".sebCand");
		if (cand)
			cand.disabled = true;
	}
}

function sebApplyPartyRecord(partyEnt, rec) {
	var idRow, valEl;
	if (!partyEnt || !rec)
		return;
	idRow = partyEnt.querySelector(".sebIdRow");
	if (idRow) {
		valEl = idRow.querySelector(".sebVal");
		if (valEl)
			valEl.value = rec["@iot.id"] != null ? String(rec["@iot.id"]) : "";
	}
	sebFillEntFromRecord(partyEnt, rec);
	sebLockPartyEntity(partyEnt);
}

async function sebFetchPartyByAuthId(authId) {
	var url, response, value, safeAuth;
	if (!sebCtx.staUrl || !authId)
		return null;
	/* OData string literal: escape embedded single quotes */
	safeAuth = String(authId).replace(/'/g, "''");
	url = sebCtx.staUrl + "/Parties?$filter=" + encodeURIComponent("authId eq '" + safeAuth + "'");
	try {
		response = await HTTPJSONData(url, null, "GET", null, null);
	} catch (err) {
		response = null;
	}
	value = response && response.obj && response.obj.value;
	return value && value.length ? value[0] : null;
}

async function sebLoadPartyFromLogin(node) {
	var msg = document.getElementById("sebPartyMsg");
	var partyEnt, rec, authId;
	if (!msg)
		return;
	partyEnt = document.querySelector(".sebSection[data-section=\"Parties\"] .sebEnt");
	if (!sebIsLoggedIn() || typeof CriptoName === "undefined" || !CriptoName || CriptoName === "Anonymous") {
		msg.className = "sebPartyMsg sebPartyNeedLogin";
		msg.textContent = DonaCadena({
			cat: "Cal iniciar la sessió per omplir el Party.",
			spa: "Hay que iniciar sesión para rellenar el Party.",
			eng: "Please log in to fill in the Party."
		});
		if (partyEnt)
			sebLockPartyEntity(partyEnt);
		return;
	}
	authId = CriptoName;
	msg.className = "sebPartyMsg sebHint";
	msg.textContent = DonaCadena({
		cat: "Consultant el Party (authId)…",
		spa: "Consultando el Party (authId)…",
		eng: "Looking up Party (authId)…"
	});
	if (!sebCtx.staUrl) {
		msg.className = "sebPartyMsg sebPartyNeedLogin";
		msg.textContent = DonaCadena({
			cat: "Falta la URL del servei STA per consultar el Party.",
			spa: "Falta la URL del servicio STA para consultar el Party.",
			eng: "STA service URL is missing; cannot look up the Party."
		});
		if (partyEnt)
			sebLockPartyEntity(partyEnt);
		return;
	}
	rec = await sebFetchPartyByAuthId(authId);
	if (!document.getElementById("sebPartyMsg"))
		return;
	if (rec) {
		if (partyEnt) {
			sebApplyPartyRecord(partyEnt, rec);
			sebScheduleAutoSave();
		}
		msg.className = "sebPartyMsg sebHint";
		msg.textContent = DonaCadenaFmt({
			cat: "Party de l'usuari (authId): ID {0}. Camps només de lectura.",
			spa: "Party del usuario (authId): ID {0}. Campos solo lectura.",
			eng: "User Party (authId): ID {0}. Read-only fields."
		}, rec["@iot.id"]);
		return;
	}
	/* No Party on the service yet: fill what we know from login; still read-only */
	if (partyEnt) {
		sebSetPropRowValue(partyEnt, "authId", authId);
		sebSetPropRowValue(partyEnt, "role", "individual");
		if (typeof DisplayName !== "undefined" && DisplayName)
			sebSetPropRowValue(partyEnt, "displayName", DisplayName);
		sebLockPartyEntity(partyEnt);
		sebScheduleAutoSave();
	}
	msg.className = "sebPartyMsg sebHint";
	msg.textContent = DonaCadena({
		cat: "No s'ha trobat Party amb aquest authId; es crearà en publicar. Camps només de lectura.",
		spa: "No se encontró Party con este authId; se creará al publicar. Campos solo lectura.",
		eng: "No Party found for this authId; it will be created on publish. Read-only fields."
	});
}

/* ---------- row / ID behaviour ---------- */

function sebApplySrcVisibility(row) {
	var isCol = row.querySelector(".sebSrc").value === "column";
	row.querySelector(".sebVal").hidden = isCol;
	row.querySelector(".sebCol").hidden = !isCol;
}

function sebSetEntLocked(entEl, locked) {
	var rows = entEl.querySelectorAll(".sebRow"), i, inp, sels, j;
	entEl.classList.toggle("sebLocked", !!locked);
	for (i = 0; i < rows.length; i++) {
		if (rows[i].classList.contains("sebIdRow"))
			continue;
		inp = rows[i].querySelector(".sebVal");
		inp.readOnly = !!locked;
		sels = rows[i].querySelectorAll("select");
		for (j = 0; j < sels.length; j++)
			sels[j].disabled = !!locked;
	}
}

function sebFillEntFromRecord(entEl, rec) {
	var rows = entEl.querySelectorAll(".sebRow"), i, row, srcEl, valEl;
	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		if (row.classList.contains("sebIdRow"))
			continue;
		srcEl = row.querySelector(".sebSrc");
		valEl = row.querySelector(".sebVal");
		if (srcEl)
			srcEl.value = "manual";
		if (valEl)
			valEl.value = sebPropValueFromRecord(row.getAttribute("data-prop"), rec);
		if (srcEl)
			sebApplySrcVisibility(row);
	}
	sebSetEntLocked(entEl, true);
}

function sebSetSearchMsg(row, kind, text) {
	var msg = row.querySelector(".sebSearchMsg");
	if (!msg)
		return;
	msg.className = "sebSearchMsg" + (kind ? " " + kind : "");
	msg.textContent = text || "";
}

function sebResolveIdFromRow(row) {
	var srcEl = row.querySelector(".sebSrc"), col, vals, valEl;
	valEl = row.querySelector(".sebVal");
	if (!srcEl)
		return valEl ? valEl.value.trim() : "";
	if (srcEl.value === "manual")
		return valEl ? valEl.value.trim() : "";
	col = row.querySelector(".sebCol");
	if (!col || !col.value)
		return "";
	vals = sebDistinctValues(col.value);
	if (vals.length === 1)
		return vals[0];
	if (vals.length > 1)
		return row.querySelector(".sebIdPick").value;
	return "";
}

/* Updates the visible controls of an ID row; Search only for manual IDs (not column) */
function sebUpdateIdUi(row) {
	var srcEl = row.querySelector(".sebSrc"), col = row.querySelector(".sebCol"), pick = row.querySelector(".sebIdPick");
	var btn = row.querySelector(".sebSearchBtn"), msg = row.querySelector(".sebSearchMsg"), vals, html, i, isCol;
	if (!srcEl || !col || !pick || !btn)
		return; /* Party simplified ID row */
	sebApplySrcVisibility(row);
	isCol = srcEl.value === "column";
	pick.hidden = true;
	if (isCol && col.value) {
		vals = sebDistinctValues(col.value);
		if (vals.length > 1) {
			if (row.getAttribute("data-pick-col") !== col.value) {
				html = "<option value=\"\">" + DonaCadena({cat: "— tria un ID —", spa: "— elige un ID —", eng: "— select an ID —"}) + "</option>";
				for (i = 0; i < vals.length && i < SEB_MAX_LIST; i++)
					html += "<option value=\"" + sebEsc(vals[i]) + "\">" + sebEsc(vals[i]) + "</option>";
				pick.innerHTML = html;
				row.setAttribute("data-pick-col", col.value);
			}
			pick.hidden = false;
		}
	}
	/* Search only makes sense for a single manual ID */
	btn.hidden = isCol;
	btn.disabled = isCol || sebResolveIdFromRow(row) === "";
	if (msg) {
		msg.hidden = isCol;
		if (isCol)
			sebSetSearchMsg(row, "", "");
	}
}

function sebOnSrcChange(sel) {
	var row = sel.closest(".sebRow"), entEl;
	if (!row)
		return;
	entEl = sel.closest(".sebEnt");
	if (entEl && (entEl.getAttribute("data-party-fixed") === "1" || entEl.getAttribute("data-ent") === "Parties")) {
		sebLockPartyEntity(entEl);
		return;
	}
	if (row.classList.contains("sebIdRow"))
		sebOnIdChange(sel);
	else
		sebApplySrcVisibility(row);
}

/* Any manual change of the ID (typing, source, column, pick) discards the read-only record and the last search result */
function sebOnIdChange(el) {
	var row = el.closest(".sebIdRow"), entEl = el.closest(".sebEnt"), cand;
	if (!row || !entEl)
		return;
	/* Party from login is never editable */
	if (entEl.getAttribute("data-party-fixed") === "1" || entEl.getAttribute("data-ent") === "Parties") {
		sebLockPartyEntity(entEl);
		return;
	}
	sebSetSearchMsg(row, "", "");
	if (el.classList.contains("sebVal") || el.classList.contains("sebSrc") || el.classList.contains("sebCol")) {
		sebSetEntLocked(entEl, false);
		cand = row.querySelector(".sebCand");
		if (cand)
			cand.value = "";
	}
	sebUpdateIdUi(row);
}

function sebOnCandidate(sel) {
	var row = sel.closest(".sebIdRow"), entEl = sel.closest(".sebEnt"), plural, rec;
	if (!row || !entEl)
		return;
	plural = entEl.getAttribute("data-ent");
	sebSetSearchMsg(row, "", "");
	if (sel.value === "") {
		sebSetEntLocked(entEl, false);
		return;
	}
	rec = (sebCtx.cands[plural] || [])[Number(sel.value)];
	if (!rec)
		return;
	row.querySelector(".sebSrc").value = "manual";
	row.querySelector(".sebVal").value = String(rec["@iot.id"]);
	sebFillEntFromRecord(entEl, rec);
	sebUpdateIdUi(row);
}

function sebIdForUrl(id) {
	return /^-?\d+$/.test(id) && String(Number(id)) === id ? Number(id) : id;
}

async function sebSearchEntity(btn) {
	var row = btn.closest(".sebIdRow"), entEl = btn.closest(".sebEnt"), node = getSTAEntityBuilderNodeSafe();
	var plural, id, url, headers, response, detail = "";
	if (!row || !entEl)
		return;
	plural = entEl.getAttribute("data-ent");
	id = sebResolveIdFromRow(row);
	if (id === "")
		return;
	if (!sebCtx.staUrl) {
		sebSetSearchMsg(row, "sebSearchErr", DonaCadena({cat: "No s'ha pogut comprovar l'ID: falta la URL del servei STA.", spa: "No se ha podido comprobar el ID: falta la URL del servicio STA.", eng: "Could not check the ID: the STA service URL is missing."}));
		return;
	}
	url = sebCtx.staUrl + "/" + plural + getParentesisODataFromId(sebIdForUrl(id));
	if (node && node.STAsecurity && typeof getHeadersFromSecurity === "function") {
		headers = getHeadersFromSecurity(node.STAsecurity, url);
		if (headers)
			headers = Object.assign({ "Accept": "application/json" }, headers);
	}
	btn.disabled = true;
	sebSetSearchMsg(row, "sebSearchInfo", DonaCadena({cat: "Cercant…", spa: "Buscando…", eng: "Searching…"}));
	try {
		response = await HTTPJSONData(url, null, "GET", null, headers || null);
	} catch (err) {
		response = null;
		detail = err && err.message ? err.message : String(err);
	}
	if (!document.body.contains(row) || sebResolveIdFromRow(row) !== id)
		return;   // dialog redrawn or ID changed while waiting
	sebUpdateIdUi(row);
	if (response && response.ok && response.obj) {
		sebFillEntFromRecord(entEl, response.obj);
		sebSetSearchMsg(row, "sebSearchOk", DonaCadena({cat: "Trobat. Camps carregats (només lectura).", spa: "Encontrado. Campos cargados (solo lectura).", eng: "Found. Fields loaded (read-only)."}));
	} else if (response && response.ok === false && response.status === 404) {
		sebSetSearchMsg(row, "sebNotFound", DonaCadena({cat: "Aquest ID no existeix al servei STA connectat.", spa: "Este ID no existe en el servicio STA conectado.", eng: "This ID does not exist in the connected STA service."}));
	} else {
		if (response && response.ok === false)
			detail = "HTTP " + response.status;
		else if (response && response.ok)
			detail = "empty response";
		else if (!detail)
			detail = "network error";
		sebSetSearchMsg(row, "sebSearchErr", DonaCadenaFmt({cat: "No s'ha pogut comprovar l'ID ({0}).", spa: "No se ha podido comprobar el ID ({0}).", eng: "Could not check the ID ({0})."}, detail));
	}
}

/* ---------- collect form -> config ---------- */

function sebReadRow(row) {
	var srcEl = row.querySelector(".sebSrc");
	var colEl = row.querySelector(".sebCol");
	var valEl = row.querySelector(".sebVal");
	/* Party (and similar) rows have no Manual/Column selects */
	if (!srcEl)
		return sebSrcObj("manual", valEl ? valEl.value : "", "");
	return sebSrcObj(srcEl.value, valEl ? valEl.value : "", colEl ? colEl.value : "");
}

function sebCollectConfigFromForm(node) {
	var cfg = sebEnsureConfig(node, false);
	var parent = getSTAEntityBuilderParent(node);
	var el = sebBody(), ents, mincs, i, j, k, entEl, plural, meas, target, rows, prop, found, sel;
	if (el && el.querySelector(".sebEnt")) {
		cfg.mode = sebVal("sebMode") || cfg.mode;
		sel = sebReadSelectedFromForm();
		for (k in sel)
			cfg.selected[k] = sel[k];
		mincs = el.querySelectorAll(".sebMeasInc");
		for (i = 0; i < mincs.length; i++) {
			for (j = 0; j < cfg.measurements.length; j++) {
				if (cfg.measurements[j].key === mincs[i].getAttribute("data-meas"))
					cfg.measurements[j].include = mincs[i].checked;
			}
		}
		ents = el.querySelectorAll(".sebEnt");
		for (i = 0; i < ents.length; i++) {
			entEl = ents[i];
			plural = entEl.getAttribute("data-ent");
			meas = entEl.getAttribute("data-meas");
			target = null;
			if (meas !== null) {
				found = null;
				for (j = 0; j < cfg.measurements.length; j++) {
					if (cfg.measurements[j].key === meas)
						found = cfg.measurements[j];
				}
				target = found ? found[plural] : null;
			} else
				target = cfg.entities[plural];
			if (!target)
				continue;
			target.locked = entEl.classList.contains("sebLocked");
			rows = entEl.querySelectorAll(".sebRow");
			for (j = 0; j < rows.length; j++) {
				prop = rows[j].getAttribute("data-prop");
				if (prop === "@iot.id")
					target.id = sebReadRow(rows[j]);
				else
					target.props[prop] = sebReadRow(rows[j]);
			}
		}
	}
	node.staEntityConfig = cfg;
	/* Source from parent only — do not wipe STAdata created by "Crea la taula" */
	if (parent && parent.STAdata && typeof deapCopy === "function")
		node.STAdataSource = deapCopy(parent.STAdata);
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	return cfg;
}

function sebOnModeChange(event) {
	var node = getSTAEntityBuilderNodeSafe();
	var parent, mode, prevSel, k;
	if (event)
		event.preventDefault();
	if (!node)
		return;
	mode = sebVal("sebMode");
	prevSel = sebReadSelectedFromForm();
	parent = getSTAEntityBuilderParent(node);
	node.staEntityConfig = sebDefaultConfig(parent, mode);
	for (k in prevSel)
		node.staEntityConfig.selected[k] = prevSel[k];
	renderSTAEntityBuilderForm(node);
}

/* ---------- validation / package ---------- */

function sebValidateEntity(plural, ent, label, mode, errors) {
	var id;
	if (!ent || plural === "Parties")
		return;
	id = ent.id;
	if (id && ((id.source === "manual" && !sebIsEmpty(id.value)) || (id.source === "column" && id.column)))
		return;   // reused by ID: properties are not needed
	sebPropList(plural, mode).forEach(function (p) {
		if (p.required && !sebSrcIsSet(ent.props[p.name]))
			errors.push(label + ": " + p.name + " is required.");
	});
}

function sebValidateConfig(cfg, parent) {
	var errors = [], eff = sebEffectiveSet(cfg.selected), isCas = cfg.mode === "connectASensor", included;
	if (!parent || !parent.STAdata || !parent.STAdata.length)
		errors.push("No input table data.");
	if (isCas) {
		included = cfg.measurements.filter(function (m) {
			return m.include;
		});
		if ((eff.Datastreams || eff.ObservedProperties || eff.Observations) && !included.length)
			errors.push("Select at least one measurement column.");
	}
	sebEntityOrder().forEach(function (plural) {
		if (!eff[plural])
			return;
		if (isCas && plural === "Observations")
			return; /* derived from sensor measurements; no property form to validate */
		if (isCas && SEB_PER_MEAS.indexOf(plural) !== -1) {
			included.forEach(function (m) {
				sebValidateEntity(plural, m[plural], plural + " (" + m.key + ")", cfg.mode, errors);
			});
		} else
			sebValidateEntity(plural, cfg.entities[plural], plural, cfg.mode, errors);
	});
	return errors;
}

function sebPackId(ent) {
	var id = ent.id;
	if (id && id.source === "manual" && !sebIsEmpty(id.value))
		return { id: { source: "manual", value: String(id.value).trim() }, existingId: String(id.value).trim() };
	if (id && id.source === "column" && id.column)
		return { id: { source: "column", column: id.column }, existingId: null };
	return { id: null, existingId: null };
}

function sebPackEntity(plural, ent, mode, role, measurementKey) {
	var out = sebPackId(ent), props = {}, dataTypes = {};
	sebPropList(plural, mode).forEach(function (p) {
		dataTypes[p.name] = p.dataType;
	});
	Object.keys(ent.props).forEach(function (name) {
		var s = sebPackSrc(ent.props[name], dataTypes[name]);
		if (s)
			props[name] = s;
	});
	out.role = role;
	out.plural = plural;
	out.singular = STAEntities[plural].singular;
	out.properties = props;
	if (measurementKey !== undefined)
		out.measurementKey = measurementKey;
	return out;
}

/* Copy manual (constant) property values from an entity config onto an observation row */
function sebApplyManualPropsToRow(row, ent, prefix) {
	var name, src, key;
	if (!ent || !ent.props)
		return;
	for (name in ent.props) {
		if (!Object.prototype.hasOwnProperty.call(ent.props, name))
			continue;
		src = ent.props[name];
		if (!src || src.source !== "manual" || sebIsEmpty(src.value))
			continue;
		key = prefix ? prefix + "." + name : name;
		row[key] = src.value;
	}
	if (ent.id && ent.id.source === "manual" && !sebIsEmpty(ent.id.value))
		row[(prefix ? prefix + "." : "") + "@iot.id"] = ent.id.value;
}

function sebObsRowAttributes() {
	return {
		phenomenonTime: { type: "isodatetime", description: "phenomenonTime", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/phenomenonTime" },
		resultTime: { type: "isodatetime", description: "resultTime" },
		result: { type: "number", description: "Observation result", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/result" },
		measurementKey: { type: "string", description: "Measurement column key" },
		datastreamRole: { type: "string", description: "Target Datastream role in package" },
		_sourceIndex: { type: "integer", description: "Index of the wide source row" }
	};
}

function sebBuildPackage(cfg, parent, staUrl) {
	var errors = sebValidateConfig(cfg, parent);
	var eff = sebEffectiveSet(cfg.selected), isCas = cfg.mode === "connectASensor";
	var pkg, bindings = [], preview = [], r, j, rec, obsEnt, included = [], b, row, pt, rt, resVal, m;
	pkg = {
		version: 2,
		mode: cfg.mode,
		STAURL: staUrl || "",
		observationTable: "long",
		entities: {},
		observations: { id: null, existingId: null, phenomenonTime: null, resultTime: null, bindings: [] },
		validation: { ok: errors.length === 0, errors: errors },
		sourceRowCount: parent && parent.STAdata ? parent.STAdata.length : 0
	};
	if (isCas)
		included = cfg.measurements.filter(function (m) {
			return m.include;
		});

	sebEntityOrder().forEach(function (plural) {
		if (!eff[plural] || plural === "Observations")
			return;
		if (isCas && SEB_PER_MEAS.indexOf(plural) !== -1) {
			pkg.entities[plural] = included.map(function (m) {
				return sebPackEntity(plural, m[plural], cfg.mode, plural + ":" + m.key, m.key);
			});
		} else
			pkg.entities[plural] = [sebPackEntity(plural, cfg.entities[plural], cfg.mode, plural)];
	});

	/*
	 * Observations:
	 * - connectASensor: always in workflow; derived from included measurements + timestamp
	 * - dataFromTable: form mapping when Observations is selected
	 */
	if (isCas && (eff.Observations || included.length)) {
		pkg.observations.phenomenonTime = { source: "column", column: "phenomenonTime" };
		pkg.observations.resultTime = { source: "column", column: "resultTime" };
		included.forEach(function (m) {
			bindings.push({
				measurementKey: m.key,
				result: { source: "column", column: "result" },
				datastreamRole: "Datastreams:" + m.key
			});
		});
		pkg.observations.bindings = bindings;
	} else if (eff.Observations) {
		obsEnt = cfg.entities.Observations;
		b = sebPackId(obsEnt);
		pkg.observations.id = b.id;
		pkg.observations.existingId = b.existingId;
		pkg.observations.phenomenonTime = { source: "column", column: "phenomenonTime" };
		pkg.observations.resultTime = { source: "column", column: "resultTime" };
		bindings.push({
			result: { source: "column", column: "result" },
			datastreamRole: "Datastreams",
			measurementKey: undefined
		});
		pkg.observations.bindings = bindings;
	}

	/* Materialize long table: 1 row = 1 observation (+ manual constants) */
	if (parent && parent.STAdata && (isCas ? included.length : bindings.length)) {
		for (r = 0; r < parent.STAdata.length; r++) {
			rec = parent.STAdata[r];
			if (!rec)
				continue;
			if (isCas) {
				for (j = 0; j < included.length; j++) {
					m = included[j];
					resVal = rec[m.key];
					if (sebIsEmpty(resVal))
						continue;
					pt = rec.timestamp;
					rt = pt;
					row = {
						phenomenonTime: pt,
						resultTime: rt,
						result: resVal,
						measurementKey: m.key,
						datastreamRole: "Datastreams:" + m.key,
						_sourceIndex: r
					};
					/* Shared entity manuals (Things, Locations, …) */
					sebEntityOrder().forEach(function (pl) {
						if (SEB_PER_MEAS.indexOf(pl) !== -1 || pl === "Observations")
							return;
						if (!eff[pl] || !cfg.entities[pl])
							return;
						sebApplyManualPropsToRow(row, cfg.entities[pl], pl);
					});
					/* Per-measurement entity manuals */
					SEB_PER_MEAS.forEach(function (pl) {
						if (!eff[pl] || !m[pl])
							return;
						sebApplyManualPropsToRow(row, m[pl], m.key + "." + pl);
					});
					preview.push(row);
				}
			} else {
				resVal = sebResolveSrc(obsEnt.props.result, rec);
				if (sebIsEmpty(resVal))
					continue;
				pt = sebResolveSrc(obsEnt.props.phenomenonTime, rec);
				rt = obsEnt.props.resultTime ? sebResolveSrc(obsEnt.props.resultTime, rec) : undefined;
				if (rt === undefined || rt === null || rt === "")
					rt = pt;
				row = {
					phenomenonTime: pt,
					resultTime: rt,
					result: resVal,
					measurementKey: "",
					datastreamRole: "Datastreams",
					_sourceIndex: r
				};
				sebEntityOrder().forEach(function (pl) {
					if (pl === "Observations" || !eff[pl] || !cfg.entities[pl])
						return;
					sebApplyManualPropsToRow(row, cfg.entities[pl], pl);
				});
				preview.push(row);
			}
		}
	}
	pkg.observationPreviewCount = preview.length;
	return { package: pkg, preview: preview, attributes: sebObsRowAttributes() };
}

/* ---------- dialog ---------- */

function sebSetStatus(msg, isError) {
	var el = document.getElementById("DialogSTAEntityBuilderStatus");
	if (!el)
		return;
	el.className = "sebStatus" + (isError ? " sebError" : " sebOk");
	el.textContent = msg;
}

function openSTAEntityBuilderDialog(node) {
	var parent, cfg;
	if (!node)
		node = getSTAEntityBuilderNodeSafe();
	if (!node)
		return;
	parent = getSTAEntityBuilderParent(node);
	/*
		Keep previous STAdata (from "Crea la taula") so the user can reopen,
		tweak entities and recreate. Only refresh STAdataSource from the parent.
	*/
	if (parent && parent.STAdata && typeof deapCopy === "function") {
		node.STAdataSource = deapCopy(parent.STAdata);
		if (parent.connectASensorMeta)
			node.connectASensorMeta = deapCopy(parent.connectASensorMeta);
		if (parent.STAURL)
			node.STAURL = parent.STAURL;
		/* Seed table from parent only the first time (no created table yet) */
		if ((!node.STAdata || !node.STAdata.length) && !node.staEntityPackage) {
			node.STAdata = deapCopy(parent.STAdata);
			if (parent.STAdataAttributes)
				node.STAdataAttributes = deapCopy(parent.STAdataAttributes);
		}
	}
	sebInitCtx(node, parent);
	if (!node.STAURL && sebCtx.staUrl)
		node.STAURL = sebCtx.staUrl;
	cfg = sebEnsureConfig(node, !node.staEntityConfig);
	sebSyncMeasurements(cfg, parent);
	/* Fill empty props from parent attribute definitions (does not overwrite set values) */
	sebApplyAttributeDefinitionsToConfig(cfg, parent, true);
	sebShowStaUrl();
	renderSTAEntityBuilderForm(node);
}

var SEB_EXPORT_FILE_VERSION = 1;

function sebDownloadJsonFile(obj, filename) {
	var blob, url, a;
	blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
	url = (typeof MakeHrefData === "function") ? MakeHrefData(JSON.stringify(obj, null, 2), "application/json") : URL.createObjectURL(blob);
	a = document.createElement("a");
	a.href = url;
	a.download = filename || "sta-entity-config.json";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	if (typeof MakeHrefData !== "function")
		setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function saveSTAEntityBuilderConfig(event) {
	var node = getSTAEntityBuilderNodeSafe();
	var cfg, payload;
	if (event)
		event.preventDefault();
	if (!node)
		return;
	cfg = sebCollectConfigFromForm(node);
	payload = {
		version: SEB_EXPORT_FILE_VERSION,
		mode: cfg.mode,
		exportedAt: new Date().toISOString(),
		STAURL: node.STAURL || sebCtx.staUrl || "",
		staEntityConfig: typeof deapCopy === "function" ? deapCopy(cfg) : JSON.parse(JSON.stringify(cfg))
	};
	sebDownloadJsonFile(payload, "sta-entity-config.json");
	sebSetStatus(DonaCadena({
		cat: "Configuració descarregada (JSON).",
		spa: "Configuración descargada (JSON).",
		eng: "Configuration downloaded (JSON)."
	}), false);
}

function loadSTAEntityBuilderConfig(event) {
	var node = getSTAEntityBuilderNodeSafe();
	var file, reader;
	if (event)
		event.preventDefault();
	if (!node)
		return;
	file = event.target && event.target.files && event.target.files[0];
	if (!file)
		return;
	reader = new FileReader();
	reader.onload = function () {
		var parsed, cfg, parent;
		try {
			parsed = JSON.parse(reader.result);
		} catch (err) {
			sebSetStatus(DonaCadena({
				cat: "El fitxer JSON no és vàlid.",
				spa: "El archivo JSON no es válido.",
				eng: "The JSON file is not valid."
			}), true);
			event.target.value = "";
			return;
		}
		cfg = parsed && parsed.staEntityConfig ? parsed.staEntityConfig : parsed;
		if (!cfg || cfg.version !== 2 || !cfg.entities || !cfg.selected) {
			sebSetStatus(DonaCadena({
				cat: "El JSON no conté una configuració STA Entity Builder vàlida (version 2).",
				spa: "El JSON no contiene una configuración STA Entity Builder válida (version 2).",
				eng: "JSON does not contain a valid STA Entity Builder configuration (version 2)."
			}), true);
			event.target.value = "";
			return;
		}
		parent = getSTAEntityBuilderParent(node);
		node.staEntityConfig = typeof deapCopy === "function" ? deapCopy(cfg) : JSON.parse(JSON.stringify(cfg));
		if (parsed.STAURL && !node.STAURL)
			node.STAURL = parsed.STAURL;
		sebEnsureMeasurementEntities(node.staEntityConfig, parent);
		sebSyncMeasurements(node.staEntityConfig, parent);
		sebInitCtx(node, parent);
		sebShowStaUrl();
		renderSTAEntityBuilderForm(node);
		if (typeof networkNodes !== "undefined")
			networkNodes.update(node);
		sebSetStatus(DonaCadena({
			cat: "Configuració carregada des del fitxer.",
			spa: "Configuración cargada desde el archivo.",
			eng: "Configuration loaded from file."
		}), false);
		event.target.value = "";
	};
	reader.onerror = function () {
		sebSetStatus(DonaCadena({
			cat: "No s'ha pogut llegir el fitxer.",
			spa: "No se ha podido leer el archivo.",
			eng: "Could not read the file."
		}), true);
		event.target.value = "";
	};
	reader.readAsText(file);
}

/*
	Collect form → build package → assign node.STAdata / attributes / staEntityPackage.
	Returns { ok, built, node } or null if no node.
*/
function sebCommitPackageToNode(node) {
	var parent, cfg, built;
	if (!node)
		return null;
	parent = getSTAEntityBuilderParent(node);
	cfg = sebCollectConfigFromForm(node);
	built = sebBuildPackage(cfg, parent, sebCtx.staUrl);
	node.staEntityPackage = built.package;
	if (parent && parent.STAdata && typeof deapCopy === "function")
		node.STAdataSource = deapCopy(parent.STAdata);
	node.STAdata = built.preview;
	node.STAdataAttributes = built.attributes || {
		phenomenonTime: { type: "isodatetime", description: "phenomenonTime", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/phenomenonTime" },
		result: { type: "number", description: "Observation result", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/result" },
		measurementKey: { type: "string", description: "Measurement column key" },
		datastreamRole: { type: "string", description: "Target Datastream role in package" }
	};
	console.log("STA Entity Builder — STAdata (create table)", node.STAdata);
	console.log("STA Entity Builder — STAdataAttributes", node.STAdataAttributes);
	console.log("STA Entity Builder — staEntityPackage", node.staEntityPackage);
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	return {
		ok: !!(built.package && built.package.validation && built.package.validation.ok),
		built: built,
		node: node
	};
}

function sebRefreshBuilderTableUi(node) {
	if (!node)
		return;
	if (typeof network !== "undefined" && network.selectNodes)
		network.selectNodes([node.id]);
	if (typeof updateQueryAndTableArea === "function")
		updateQueryAndTableArea(node);
	if (typeof ShowQueryNode === "function")
		ShowQueryNode(node);
	if (typeof ShowTableNode === "function")
		ShowTableNode(node);
}

function okSTAEntityBuilderCreateTable(event) {
	var result;
	if (event)
		event.preventDefault();
	result = sebCommitPackageToNode(getSTAEntityBuilderNodeSafe());
	if (!result)
		return;
	if (!result.ok) {
		sebSetStatus(result.built.package.validation.errors.join("; "), true);
		return;
	}
	sebSetStatus(DonaCadenaFmt({
		cat: "Taula creada: {0} files a STAdata.",
		spa: "Tabla creada: {0} filas en STAdata.",
		eng: "Table created: {0} rows in STAdata."
	}, result.built.preview.length), false);
	closeSTAEntityBuilderDialog(event);
	sebRefreshBuilderTableUi(result.node);
}

function sebOnBuilderDialogClose(event) {
	/* Dialog already closing (onClose); only persist, do not call .close() again */
	sebAutoSave(true);
	aDialogIsOpen = false;
}

function closeSTAEntityBuilderDialog(event) {
	if (event)
		event.preventDefault();
	sebAutoSave(true);
	if (typeof hideNodeDialog === "function")
		hideNodeDialog("DialogSTAEntityBuilder", event);
}
