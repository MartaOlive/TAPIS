"use strict"

/*
	STA Entity Builder — configures STA entities/observations from sensor or table data.
	Does not publish to the server (see staPublisher.js).

	Config (node.staEntityConfig, version 2):
	{
		version: 2, mode: "connectASensor"|"dataFromTable",
		selected: { <EntityPlural>: true|false, ... },       // CAS: workflow checkboxes; free: derived from groups + Parties
		entities: { <EntityPlural>: { id: <src>, props: { <name>: <src> }, locked: bool } }, // shared (Party always)
		measurements: [ {                                    // CAS: sensor columns; free: observation groups
			key, include, label,                             // free: group name → id_<slug> for Relations
			resultColumn?,                                   // Observation.result column (free mode)
			selected?: { <EntityPlural>: true|false },       // free: per-group entity checkboxes
			Datastreams, ObservedProperties, Sensors?, …
		} ],
		relationStub: {                                      // free mode; Relations per source row
			enabled, role, description,
			subjectGroupKey, objectGroupKey,                 // dropdowns by group name
			idColumns: [ "Group.Observations.@iot.id", … ]
		}
	}
	<src> = { source: "manual"|"column", value: "", column: "" }   (both kept so switching does not lose the other)

	Package (node.staEntityPackage, version 2): see sebBuildPackage().
*/

var SEB_ORDER = ["Parties", "Licenses", "Things", "Locations", "HistoricalLocations", "Sensors", "ObservedProperties",
	"FeaturesOfInterest", "Campaigns", "ObservationGroups", "Datastreams", "MultiDatastreams", "Cells", "Relations", "Observations"];
var SEB_DEFAULT_SELECTED = ["Parties", "Things", "Sensors", "Licenses", "Locations", "FeaturesOfInterest", "ObservedProperties", "Datastreams", "Observations"];
/* ConnectASensor: nested under each measurement column (Temperature, …). Leave CAS as this list. */
var SEB_PER_MEAS = ["ObservedProperties", "Sensors", "FeaturesOfInterest", "Datastreams"];
var SEB_SCOPE_SHARED = "shared";
var SEB_SCOPE_GROUP = "perGroup";
/* Free mode: entity checkboxes inside each observation group (Party is always shared — never here). */
var SEB_GROUP_CHECKABLE = ["Licenses", "Things", "Locations", "HistoricalLocations", "Sensors", "ObservedProperties",
	"FeaturesOfInterest", "Campaigns", "ObservationGroups", "Datastreams", "MultiDatastreams", "Cells", "Observations"];
/* Kept for migration of older configs that had scope radios */
var SEB_SCOPEABLE = SEB_GROUP_CHECKABLE.slice();
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
		/* location / feature stay as one GeoJSON Point property (not split into lon/lat) */
		out.push({ name: name, required: sebPropRequired(plural, name), dataType: p.dataType });
	}
	return out;
}

/* GeoJSON Point string for Location.location / FeatureOfInterest.feature */
function sebGeoJsonPointString(lon, lat) {
	return JSON.stringify({ type: "Point", coordinates: [Number(lon), Number(lat)] });
}

function sebGeoPropName(plural) {
	if (plural === "Locations")
		return "location";
	if (plural === "FeaturesOfInterest")
		return "feature";
	return null;
}

/* Migrate legacy longitude/latitude props on an entity cfg → location/feature Point */
function sebMigrateEntityGeoProps(plural, ent) {
	var geoName, lonSrc, latSrc, lon, lat;
	if (!ent || !ent.props)
		return;
	geoName = sebGeoPropName(plural);
	if (!geoName)
		return;
	lonSrc = ent.props.longitude;
	latSrc = ent.props.latitude;
	if (!lonSrc && !latSrc)
		return;
	if (!ent.props[geoName] || !sebSrcIsSet(ent.props[geoName])) {
		lon = lonSrc && lonSrc.source !== "column" ? lonSrc.value : "";
		lat = latSrc && latSrc.source !== "column" ? latSrc.value : "";
		if (lon !== "" && lat !== "" && isFinite(Number(lon)) && isFinite(Number(lat)))
			ent.props[geoName] = sebSrcObj("manual", sebGeoJsonPointString(lon, lat), "");
		else if (!ent.props[geoName])
			ent.props[geoName] = sebSrcObj("manual", "", "");
	}
	delete ent.props.longitude;
	delete ent.props.latitude;
}

function sebMigrateConfigGeoProps(cfg) {
	var i, m, p;
	if (!cfg)
		return;
	if (cfg.entities) {
		["Locations", "FeaturesOfInterest"].forEach(function (plural) {
			if (cfg.entities[plural])
				sebMigrateEntityGeoProps(plural, cfg.entities[plural]);
		});
	}
	for (i = 0; i < (cfg.measurements || []).length; i++) {
		m = cfg.measurements[i];
		if (!m)
			continue;
		for (p = 0; p < SEB_GROUP_CHECKABLE.length; p++) {
			if (m[SEB_GROUP_CHECKABLE[p]])
				sebMigrateEntityGeoProps(SEB_GROUP_CHECKABLE[p], m[SEB_GROUP_CHECKABLE[p]]);
		}
		["Locations", "FeaturesOfInterest"].forEach(function (plural) {
			if (m[plural])
				sebMigrateEntityGeoProps(plural, m[plural]);
		});
	}
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

function sebDefaultScope(mode) {
	var scope = {}, i, p;
	for (i = 0; i < SEB_SCOPEABLE.length; i++) {
		p = SEB_SCOPEABLE[i];
		scope[p] = (mode === "connectASensor" && SEB_PER_MEAS.indexOf(p) !== -1)
			? SEB_SCOPE_GROUP
			: SEB_SCOPE_SHARED;
	}
	return scope;
}

/* Default per-group entity checkboxes (dataFromTable). Observations always on by default. */
function sebDefaultGroupSelected() {
	var sel = {}, i, p;
	for (i = 0; i < SEB_GROUP_CHECKABLE.length; i++) {
		p = SEB_GROUP_CHECKABLE[i];
		sel[p] = SEB_PER_MEAS.indexOf(p) !== -1 || p === "Things" || p === "Observations";
	}
	return sel;
}

function sebEnsureGroupSelected(m) {
	var i, p;
	if (!m)
		return;
	if (!m.selected || typeof m.selected !== "object")
		m.selected = sebDefaultGroupSelected();
	for (i = 0; i < SEB_GROUP_CHECKABLE.length; i++) {
		p = SEB_GROUP_CHECKABLE[i];
		if (typeof m.selected[p] !== "boolean")
			m.selected[p] = SEB_PER_MEAS.indexOf(p) !== -1 || p === "Things" || p === "Observations";
	}
}

function sebGroupSelectedList(m) {
	var out = [], i, p;
	sebEnsureGroupSelected(m);
	for (i = 0; i < SEB_GROUP_CHECKABLE.length; i++) {
		p = SEB_GROUP_CHECKABLE[i];
		if (m.selected[p])
			out.push(p);
	}
	return out;
}

function sebNewRelationStub() {
	return {
		enabled: false,
		role: "",
		description: "",
		subjectGroupKey: "",
		objectGroupKey: "",
		idColumns: [],
		targetKind: "Observations" /* Observations | ObservationGroups */
	};
}

/* Nesting choices for Campaign↔ObservationGroup and Relation↔ObservationGroup cycles. */
function sebNewNesting() {
	return {
		campaignObservationGroup: "campaignFirst", /* campaignFirst | observationGroupFirst */
		relationObservationGroup: "relationFirst"  /* relationFirst | observationGroupFirst */
	};
}

function sebEnsureNesting(cfg) {
	if (!cfg)
		return;
	if (!cfg.nesting || typeof cfg.nesting !== "object")
		cfg.nesting = sebNewNesting();
	if (cfg.nesting.campaignObservationGroup !== "observationGroupFirst")
		cfg.nesting.campaignObservationGroup = "campaignFirst";
	if (cfg.nesting.relationObservationGroup !== "observationGroupFirst")
		cfg.nesting.relationObservationGroup = "relationFirst";
}

function sebHasEntitySelected(cfg, plural) {
	var i, m;
	if (!cfg)
		return false;
	if (cfg.selected && cfg.selected[plural])
		return true;
	for (i = 0; i < (cfg.measurements || []).length; i++) {
		m = cfg.measurements[i];
		if (m && m.include && m.selected && m.selected[plural])
			return true;
	}
	return false;
}

/* Sanitize user etiqueta → safe slug for id_<slug> column names. */
function sebSlugLabel(label, fallback) {
	var s = String(label == null ? "" : label).trim().toLowerCase();
	s = s.replace(/[àáâãäå]/gi, "a").replace(/[èéêë]/gi, "e").replace(/[ìíîï]/gi, "i")
		.replace(/[òóôõö]/gi, "o").replace(/[ùúûü]/gi, "u").replace(/[ñ]/gi, "n")
		.replace(/[ç]/gi, "c").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
	if (!s)
		s = String(fallback == null ? "grup" : fallback).replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase() || "grup";
	return s;
}

function sebGroupDisplayLabel(m) {
	if (m && m.label && String(m.label).trim())
		return String(m.label).trim();
	return sebMeasLabel(m);
}

/* Column prefix for per-group props on the wide super-table (group etiqueta). */
function sebGroupColumnPrefix(m) {
	var label = sebGroupDisplayLabel(m);
	return label || (m && m.key) || "group";
}

/* Super-table column: [Group.]Plural.property  e.g. Things.name, Photography.Observations.result */
function sebSuperColumn(plural, prop, groupPrefix) {
	var base = String(plural) + "." + String(prop);
	if (groupPrefix != null && groupPrefix !== "")
		return String(groupPrefix) + "." + base;
	return base;
}

function sebIdColumnForGroup(m) {
	return sebSuperColumn("Observations", "@iot.id", sebGroupColumnPrefix(m));
}

function sebEnsureGroupLabels(cfg) {
	var i, m, used = {}, slug, base, n, prefix;
	if (!cfg || !cfg.measurements)
		return;
	for (i = 0; i < cfg.measurements.length; i++) {
		m = cfg.measurements[i];
		if (!m.label || !String(m.label).trim())
			m.label = m.key || ("grup" + (i + 1));
		/* Keep unique display prefixes if two groups share the same label */
		prefix = sebGroupColumnPrefix(m);
		slug = prefix;
		base = prefix;
		n = 2;
		while (used[slug]) {
			slug = base + "_" + n;
			n++;
		}
		used[slug] = true;
		m._columnPrefix = slug;
		m._idColumn = sebSuperColumn("Observations", "@iot.id", slug);
	}
}

function sebRefreshRelationIdColumns(cfg) {
	var cols = [], included, i, m;
	/* Do NOT call sebEnsureScope here — it calls this function (stack overflow). */
	if (!cfg)
		return;
	if (!cfg.relationStub || typeof cfg.relationStub !== "object")
		cfg.relationStub = sebNewRelationStub();
	sebEnsureGroupLabels(cfg);
	included = (cfg.measurements || []).filter(function (g) { return g.include; });
	for (i = 0; i < included.length; i++) {
		m = included[i];
		cols.push(m._idColumn || sebIdColumnForGroup(m));
	}
	cfg.relationStub.idColumns = cols;
	if (cfg.relationStub.subjectGroupKey) {
		if (!included.some(function (g) { return g.key === cfg.relationStub.subjectGroupKey; }))
			cfg.relationStub.subjectGroupKey = included[0] ? included[0].key : "";
	}
	if (cfg.relationStub.objectGroupKey) {
		if (!included.some(function (g) { return g.key === cfg.relationStub.objectGroupKey; }))
			cfg.relationStub.objectGroupKey = included[1] ? included[1].key : (included[0] ? included[0].key : "");
	}
	if (cfg.relationStub.enabled && included.length >= 2) {
		if (!cfg.relationStub.subjectGroupKey)
			cfg.relationStub.subjectGroupKey = included[0].key;
		if (!cfg.relationStub.objectGroupKey || cfg.relationStub.objectGroupKey === cfg.relationStub.subjectGroupKey)
			cfg.relationStub.objectGroupKey = included[1].key;
	}
}

/* Migrate older configs: invent scope from SEB_PER_MEAS when missing. */
function sebEnsureScope(cfg) {
	var i, p, def;
	if (!cfg)
		return;
	if (!cfg.scope || typeof cfg.scope !== "object")
		cfg.scope = sebDefaultScope(cfg.mode || "dataFromTable");
	def = sebDefaultScope(cfg.mode || "dataFromTable");
	for (i = 0; i < SEB_SCOPEABLE.length; i++) {
		p = SEB_SCOPEABLE[i];
		if (cfg.scope[p] !== SEB_SCOPE_SHARED && cfg.scope[p] !== SEB_SCOPE_GROUP)
			cfg.scope[p] = def[p];
	}
	if (!cfg.relationStub || typeof cfg.relationStub !== "object")
		cfg.relationStub = sebNewRelationStub();
	if (!cfg.relationStub.targetKind)
		cfg.relationStub.targetKind = "Observations";
	/* migrate old subjectFrom/objectFrom field names */
	if (cfg.relationStub.subjectFrom && !cfg.relationStub.subjectGroupKey)
		cfg.relationStub.subjectGroupKey = cfg.relationStub.subjectFrom;
	if (cfg.relationStub.objectFrom && !cfg.relationStub.objectGroupKey)
		cfg.relationStub.objectGroupKey = cfg.relationStub.objectFrom;
	sebEnsureNesting(cfg);
	sebEnsureGroupLabels(cfg);
	sebRefreshRelationIdColumns(cfg);
}

function sebIsPerGroup(cfg, plural) {
	var i, m;
	if (!cfg || !plural || plural === "Parties")
		return false;
	if (cfg.mode === "connectASensor")
		return SEB_PER_MEAS.indexOf(plural) !== -1;
	/* Free mode: per-group if any included group has that entity checkbox on */
	for (i = 0; i < (cfg.measurements || []).length; i++) {
		m = cfg.measurements[i];
		if (!m.include)
			continue;
		sebEnsureGroupSelected(m);
		if (m.selected[plural])
			return true;
	}
	return false;
}

/* CAS: fixed SEB_PER_MEAS. Free: union of checked entities across included groups. */
function sebPerGroupList(cfg) {
	var out = [], seen = {}, i, j, m, list, p;
	if (!cfg)
		return out;
	if (cfg.mode === "connectASensor")
		return SEB_PER_MEAS.slice();
	for (i = 0; i < (cfg.measurements || []).length; i++) {
		m = cfg.measurements[i];
		if (!m.include)
			continue;
		list = sebGroupSelectedList(m);
		for (j = 0; j < list.length; j++) {
			p = list[j];
			if (!seen[p]) {
				seen[p] = true;
				out.push(p);
			}
		}
	}
	return out;
}

function sebCandidateGroupColumns(cols) {
	var skip = { timestamp: 1, phenomenonTime: 1, resultTime: 1, sensor_id: 1, "@iot.id": 1 };
	return (cols || []).filter(function (c) {
		return !skip[c];
	});
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

/* Direct parents that can act as data sources for the Builder */
function getSTAEntityBuilderParents(node) {
	var parents, out = [], i, p;
	if (!node || typeof GetParentNodes !== "function")
		return out;
	parents = GetParentNodes(node) || [];
	for (i = 0; i < parents.length; i++) {
		p = parents[i];
		if (!p)
			continue;
		if (p.STAdata && p.STAdata.length)
			out.push(p);
		else if (p.image === "connectASensor.png" || p.image === "readSDFromSensor.png" ||
				p.image === "ImportCSV.png" || p.image === "ImportJSON.png" || p.image === "ImportGeoJSON.png" ||
				p.image === "Table.png")
			out.push(p);
	}
	if (!out.length && parents.length)
		return parents.slice();
	return out;
}

function sebParentDataLen(p) {
	return p && p.STAdata ? p.STAdata.length : 0;
}

/* Primary parent = most rows (tie → first). Drives observation rows / STAdataSource. */
function getSTAEntityBuilderParent(node) {
	var parents = getSTAEntityBuilderParents(node), best, i;
	if (!parents.length)
		return null;
	best = parents[0];
	for (i = 1; i < parents.length; i++) {
		if (sebParentDataLen(parents[i]) > sebParentDataLen(best))
			best = parents[i];
	}
	return best;
}

function sebSourcePrefix(parent) {
	var plural, img;
	if (!parent)
		return "src";
	if (parent.STAURL && typeof getSTAURLLastEntity === "function" && typeof getSTAEntityPlural === "function") {
		plural = getSTAEntityPlural(getSTAURLLastEntity(parent.STAURL), false);
		if (plural)
			return plural;
	}
	img = parent.image ? String(parent.image).replace(/\.png$/i, "") : "";
	if (img && typeof STAEntities !== "undefined" && STAEntities[img])
		return img;
	if (parent.label)
		return String(parent.label);
	return "src" + (parent.id != null ? parent.id : "");
}

/* Visible node label for column optgroups (prefer canvas label). */
function sebNodeLabel(parent) {
	var s, img;
	if (!parent)
		return DonaCadena({cat: "Font", spa: "Fuente", eng: "Source"});
	if (parent.label != null && String(parent.label).trim() !== "")
		return String(parent.label).trim();
	s = sebSourcePrefix(parent);
	if (s && s.indexOf("src") !== 0)
		return s;
	img = parent.image ? String(parent.image).replace(/\.png$/i, "") : "";
	return img || ("node " + (parent.id != null ? parent.id : ""));
}

/*
	Build unified column list from primary (multi-row) + lateral (1-row) parents.
	colMap[exposedName] = { parent, field, lateral }
	colGroups = [{ label, columns: [{ value, text }] }] for optgroup dropdowns
*/
function sebBuildColumnSources(node) {
	var parents = getSTAEntityBuilderParents(node);
	var primary = getSTAEntityBuilderParent(node);
	var laterals = [], colMap = {}, cols = [], colGroups = [], used = {}, i, p, raw, j, field, qname, needPrefix, group;
	function pushGroup(parentNode, isLateral) {
		raw = sebColumnNames(parentNode && parentNode.STAdata, parentNode && parentNode.STAdataAttributes);
		if (!raw.length)
			return;
		needPrefix = false;
		if (isLateral) {
			for (j = 0; j < raw.length; j++) {
				if (used[raw[j]]) {
					needPrefix = true;
					break;
				}
			}
		}
		group = { label: sebNodeLabel(parentNode), columns: [] };
		for (j = 0; j < raw.length; j++) {
			field = raw[j];
			if (isLateral) {
				qname = needPrefix || used[field] ? (sebSourcePrefix(parentNode) + "." + field) : field;
				if (used[qname])
					qname = sebSourcePrefix(parentNode) + "." + field;
				if (used[qname])
					qname = sebSourcePrefix(parentNode) + "_" + (parentNode.id != null ? parentNode.id : i) + "." + field;
			} else
				qname = field;
			cols.push(qname);
			used[qname] = true;
			colMap[qname] = { parent: parentNode, field: field, lateral: !!isLateral };
			group.columns.push({ value: qname, text: field });
		}
		colGroups.push(group);
	}
	for (i = 0; i < parents.length; i++) {
		if (parents[i] !== primary)
			laterals.push(parents[i]);
	}
	if (primary)
		pushGroup(primary, false);
	for (i = 0; i < laterals.length; i++)
		pushGroup(laterals[i], true);
	return {
		primary: primary,
		laterals: laterals,
		cols: cols,
		colGroups: colGroups,
		colMap: colMap,
		data: (primary && primary.STAdata) || []
	};
}

function sebExposedColumnName(sources, parent, field) {
	var k, e;
	if (!sources || !sources.colMap)
		return field;
	for (k in sources.colMap) {
		if (!Object.prototype.hasOwnProperty.call(sources.colMap, k))
			continue;
		e = sources.colMap[k];
		if (e.parent === parent && e.field === field)
			return k;
	}
	return field;
}

function sebIsRealDataColumn(name, sourcesOrParent) {
	var cols;
	if (!name)
		return false;
	if (sourcesOrParent && sourcesOrParent.colMap)
		return !!sourcesOrParent.colMap[name];
	if (sourcesOrParent && sourcesOrParent.cols)
		return sourcesOrParent.cols.indexOf(name) !== -1;
	if (sourcesOrParent && (sourcesOrParent.STAdata || sourcesOrParent.STAdataAttributes)) {
		cols = sebColumnNames(sourcesOrParent.STAdata, sourcesOrParent.STAdataAttributes);
		return cols.indexOf(name) !== -1;
	}
	if (typeof sebCtx !== "undefined" && sebCtx) {
		if (sebCtx.colMap && sebCtx.colMap[name])
			return true;
		if (sebCtx.cols && sebCtx.cols.indexOf(name) !== -1)
			return true;
	}
	return false;
}

/* Copy lateral (1-row) fields onto a primary row under exposed column names */
function sebEnrichRecWithLaterals(rec, sources) {
	var out, k, e, side;
	if (typeof deapCopy === "function")
		out = deapCopy(rec || {});
	else {
		out = {};
		if (rec) {
			for (k in rec) {
				if (Object.prototype.hasOwnProperty.call(rec, k))
					out[k] = rec[k];
			}
		}
	}
	if (!sources || !sources.colMap)
		return out;
	for (k in sources.colMap) {
		if (!Object.prototype.hasOwnProperty.call(sources.colMap, k))
			continue;
		e = sources.colMap[k];
		if (!e.lateral || !e.parent)
			continue;
		side = e.parent.STAdata && e.parent.STAdata[0];
		if (!side)
			continue;
		out[k] = side[e.field];
	}
	return out;
}

function sebEnrichDataWithLaterals(data, sources) {
	var i, out = [];
	if (!data)
		return out;
	for (i = 0; i < data.length; i++)
		out.push(sebEnrichRecWithLaterals(data[i], sources));
	return out;
}

/* STA URL of the node or of the first ancestor that has one, reduced to the service root */
function sebFindStaUrl(node) {
	var queue = [], seen = {}, n, parents, i, hops = 0;
	if (node && node.STAURL)
		return node.STAURL;
	if (typeof GetParentNodes !== "function")
		return "";
	parents = GetParentNodes(node) || [];
	for (i = 0; i < parents.length; i++)
		queue.push(parents[i]);
	while (queue.length && hops < 60) {
		n = queue.shift();
		hops++;
		if (!n || seen[n.id])
			continue;
		seen[n.id] = true;
		if (n.STAURL)
			return n.STAURL;
		parents = GetParentNodes(n) || [];
		for (i = 0; i < parents.length; i++)
			queue.push(parents[i]);
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

/* Like sebSrcIsSet, but column sources pointing at non-real columns (e.g. grup_…) count as empty */
function sebSrcIsMeaningfullySet(s) {
	if (!sebSrcIsSet(s))
		return false;
	if (s.source === "column" && !sebIsRealDataColumn(s.column))
		return false;
	return true;
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
	var entry, side;
	if (!src)
		return undefined;
	if (src.source !== "column")
		return src.value;
	entry = (typeof sebCtx !== "undefined" && sebCtx && sebCtx.colMap) ? sebCtx.colMap[src.column] : null;
	if (entry && entry.lateral) {
		side = entry.parent && entry.parent.STAdata && entry.parent.STAdata[0];
		return side ? side[entry.field] : undefined;
	}
	if (entry && !entry.lateral)
		return rec ? rec[entry.field] : undefined;
	/* Enriched rows already carry exposed lateral names */
	return rec ? rec[src.column] : undefined;
}

/* Keep Observations.result in sync with measurement.resultColumn (never leave grup_ keys). */
function sebSyncGroupResultColumn(m, parentOrSources) {
	var col, probe = parentOrSources;
	if (!m)
		return;
	col = m.resultColumn || "";
	if (!m.Observations)
		return;
	if (!m.Observations.props)
		m.Observations.props = {};
	if (!probe && typeof sebCtx !== "undefined")
		probe = sebCtx;
	if (col && sebIsRealDataColumn(col, probe))
		m.Observations.props.result = sebSrcObj("column", "", col);
	else if (m.Observations.props.result && m.Observations.props.result.source === "column" &&
			!sebIsRealDataColumn(m.Observations.props.result.column, probe))
		m.Observations.props.result = sebSrcObj("manual", "", "");
	else if (!sebSrcIsSet(m.Observations.props.result))
		m.Observations.props.result = sebSrcObj("manual", "", "");
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
 * Optional sources remaps raw field names to exposed names (Things.name, …).
 */
function sebColumnMapsFromParentAttributes(parent, sources) {
	var attrs = parent && parent.STAdataAttributes, maps = {}, col, def, parsed, slot, exposed;
	if (!attrs)
		return maps;
	for (col in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, col) || !attrs[col])
			continue;
		def = attrs[col].definition;
		parsed = sebParseStaAttributeDefinition(def);
		if (!parsed)
			continue;
		exposed = sources ? sebExposedColumnName(sources, parent, col) : col;
		slot = maps[parsed.plural] || (maps[parsed.plural] = { props: {}, idColumn: null });
		if (parsed.propName === "@iot.id")
			slot.idColumn = exposed;
		else
			slot.props[parsed.propName] = exposed;
	}
	return maps;
}

function sebMergeColumnMaps(into, from) {
	var plural, prop;
	for (plural in from) {
		if (!Object.prototype.hasOwnProperty.call(from, plural))
			continue;
		if (!into[plural])
			into[plural] = { props: {}, idColumn: null };
		if (from[plural].idColumn && !into[plural].idColumn)
			into[plural].idColumn = from[plural].idColumn;
		for (prop in from[plural].props) {
			if (!Object.prototype.hasOwnProperty.call(from[plural].props, prop))
				continue;
			if (!into[plural].props[prop])
				into[plural].props[prop] = from[plural].props[prop];
		}
	}
	return into;
}

function sebColumnMapsFromSources(sources) {
	var maps = {}, parents = [], i;
	if (!sources)
		return maps;
	if (sources.primary)
		parents.push(sources.primary);
	for (i = 0; i < (sources.laterals || []).length; i++)
		parents.push(sources.laterals[i]);
	for (i = 0; i < parents.length; i++)
		sebMergeColumnMaps(maps, sebColumnMapsFromParentAttributes(parents[i], sources));
	return maps;
}

function sebApplyColumnMapToEntity(ent, plural, slot, mode, onlyEmpty) {
	var propName, col, known, list, i;
	if (!ent || !slot)
		return;
	if (ent.locked)
		return;
	if (slot.idColumn) {
		if (!onlyEmpty || !sebSrcIsMeaningfullySet(ent.id))
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
		if (onlyEmpty && sebSrcIsMeaningfullySet(ent.props[propName]))
			continue;
		ent.props[propName] = sebSrcObj("column", "", col);
	}
}

/* Auto-wire parent attribute definitions → entity property column sources */
function sebApplyAttributeDefinitionsToConfig(cfg, parent, onlyEmpty, sources) {
	var maps, plural, slot, i, m;
	if (!cfg)
		return;
	if (sources)
		maps = sebColumnMapsFromSources(sources);
	else if (parent)
		maps = sebColumnMapsFromParentAttributes(parent);
	else
		return;
	for (plural in maps) {
		if (!Object.prototype.hasOwnProperty.call(maps, plural))
			continue;
		slot = maps[plural];
		cfg.selected[plural] = true;
		if (sebIsPerGroup(cfg, plural) && cfg.measurements) {
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

function sebNewMeasurement(key, parent, ctx, perGroup) {
	var attrs = (parent && parent.STAdataAttributes) || {};
	var realKey = sebIsRealDataColumn(key, parent) ? key : "";
	var attr = (realKey && attrs[realKey]) || attrs[key] || {};
	var spec = (typeof ConnectASensorObsProps !== "undefined" && ConnectASensorObsProps[key]) || {};
	var obsName = attr.description || spec.name || (realKey || key);
	var desc = attr.description || spec.description || (realKey || key);
	var sensorDefaults = sebEntityDefaults("Sensors", ctx);
	var obsColDefaults;
	var m = {
		key: key,
		include: true,
		label: obsName || key,
		resultColumn: realKey,
		selected: sebDefaultGroupSelected()
	};
	var group = perGroup && perGroup.length ? perGroup : SEB_PER_MEAS.slice();
	group.forEach(function (plural) {
		if (plural === "ObservedProperties") {
			m.ObservedProperties = sebNewEntity("ObservedProperties", ctx.mode, {
				name: obsName,
				description: desc,
				definition: attr.definition || spec.definition || ""
			});
		} else if (plural === "Sensors") {
			m.Sensors = sebNewEntity("Sensors", ctx.mode, {
				name: sensorDefaults.name || obsName,
				description: sensorDefaults.description || desc,
				encodingType: sensorDefaults.encodingType || "application/json",
				metadata: sensorDefaults.metadata || ""
			});
		} else if (plural === "FeaturesOfInterest") {
			m.FeaturesOfInterest = sebNewEntity("FeaturesOfInterest", ctx.mode, sebEntityDefaults("FeaturesOfInterest", ctx));
		} else if (plural === "Datastreams") {
			m.Datastreams = sebNewEntity("Datastreams", ctx.mode, {
				name: obsName,
				description: desc,
				observationType: SEB_OBS_TYPE,
				"unitOfMeasurement.name": attr.UoM || spec.UoM || "",
				"unitOfMeasurement.symbol": attr.UoMSymbol || spec.UoMSymbol || "",
				"unitOfMeasurement.definition": attr.UoMDefinition || spec.UoMDefinition || ""
			});
		} else {
			m[plural] = sebNewEntity(plural, ctx.mode, sebEntityDefaults(plural, ctx));
		}
	});
	/* Always seed OP/DS/Sensors/FoI for CAS + free defaults */
	if (!m.ObservedProperties) {
		m.ObservedProperties = sebNewEntity("ObservedProperties", ctx.mode, {
			name: obsName, description: desc, definition: attr.definition || spec.definition || ""
		});
	}
	if (!m.Sensors) {
		m.Sensors = sebNewEntity("Sensors", ctx.mode, {
			name: sensorDefaults.name || obsName,
			description: sensorDefaults.description || desc,
			encodingType: sensorDefaults.encodingType || "application/json",
			metadata: sensorDefaults.metadata || ""
		});
	}
	if (!m.FeaturesOfInterest)
		m.FeaturesOfInterest = sebNewEntity("FeaturesOfInterest", ctx.mode, sebEntityDefaults("FeaturesOfInterest", ctx));
	if (!m.Datastreams) {
		m.Datastreams = sebNewEntity("Datastreams", ctx.mode, {
			name: obsName, description: desc, observationType: SEB_OBS_TYPE,
			"unitOfMeasurement.name": attr.UoM || spec.UoM || "",
			"unitOfMeasurement.symbol": attr.UoMSymbol || spec.UoMSymbol || "",
			"unitOfMeasurement.definition": attr.UoMDefinition || spec.UoMDefinition || ""
		});
	}
	if (!m.Observations && ctx.mode !== "connectASensor") {
		obsColDefaults = {
			phenomenonTime: ctx.timeCol || "",
			resultTime: ctx.timeCol || ""
		};
		if (m.resultColumn)
			obsColDefaults.result = m.resultColumn;
		m.Observations = sebNewEntity("Observations", ctx.mode, {}, obsColDefaults);
	}
	return m;
}

function sebCloneEntityCfg(ent) {
	if (typeof deapCopy === "function")
		return deapCopy(ent);
	return JSON.parse(JSON.stringify(ent));
}

/* Ensure per-group entity slots exist on each measurement; keep shared copies on cfg.entities. */
function sebEnsureMeasurementEntities(cfg, parent) {
	var ctx, sharedSensor, sharedFoi, i, m, perGroup, plural, neu;
	if (!cfg || !cfg.measurements)
		return;
	sebEnsureScope(cfg);
	ctx = {
		mode: cfg.mode,
		isCas: cfg.mode === "connectASensor",
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
		if (cfg.mode !== "connectASensor")
			sebEnsureGroupSelected(m);
		perGroup = cfg.mode === "connectASensor" ? SEB_PER_MEAS.slice() : sebGroupSelectedList(m);
		if (!m.ObservedProperties || !m.Datastreams) {
			neu = sebNewMeasurement(m.key, parent, ctx, perGroup);
			m.ObservedProperties = m.ObservedProperties || neu.ObservedProperties;
			m.Datastreams = m.Datastreams || neu.Datastreams;
			m.Sensors = m.Sensors || neu.Sensors;
			m.FeaturesOfInterest = m.FeaturesOfInterest || neu.FeaturesOfInterest;
		}
		if (!m.Sensors)
			m.Sensors = idx === 0 && sharedSensor ? sebCloneEntityCfg(sharedSensor) : sebNewEntity("Sensors", cfg.mode, sebEntityDefaults("Sensors", ctx));
		if (!m.FeaturesOfInterest)
			m.FeaturesOfInterest = idx === 0 && sharedFoi ? sebCloneEntityCfg(sharedFoi) : sebNewEntity("FeaturesOfInterest", cfg.mode, sebEntityDefaults("FeaturesOfInterest", ctx));
		if (cfg.mode !== "connectASensor" && !m.Observations) {
			neu = { phenomenonTime: "", resultTime: "" };
			if (m.resultColumn && sebIsRealDataColumn(m.resultColumn, parent))
				neu.result = m.resultColumn;
			m.Observations = sebNewEntity("Observations", cfg.mode, {}, neu);
		}
		for (i = 0; i < perGroup.length; i++) {
			plural = perGroup[i];
			if (!m[plural]) {
				if (plural === "Sensors" && idx === 0 && sharedSensor)
					m[plural] = sebCloneEntityCfg(sharedSensor);
				else if (plural === "FeaturesOfInterest" && idx === 0 && sharedFoi)
					m[plural] = sebCloneEntityCfg(sharedFoi);
				else if (plural === "Observations") {
					neu = { phenomenonTime: "", resultTime: "" };
					if (m.resultColumn && sebIsRealDataColumn(m.resultColumn, parent))
						neu.result = m.resultColumn;
					m[plural] = sebNewEntity("Observations", cfg.mode, {}, neu);
				} else if (cfg.entities[plural] && idx === 0)
					m[plural] = sebCloneEntityCfg(cfg.entities[plural]);
				else
					m[plural] = sebNewEntity(plural, cfg.mode, sebEntityDefaults(plural, ctx));
			}
		}
		sebSyncGroupResultColumn(m, parent);
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

/* Collect STA entity candidates from one node into map (first wins per plural) */
function sebCollectCandidatesFromNode(n, map) {
	var plural, recs, seen, j, rec, id;
	if (!n || !n.STAdata || !n.STAdata.length || !n.STAURL)
		return;
	if (typeof getSTAURLLastEntity !== "function" || typeof getSTAEntityPlural !== "function")
		return;
	plural = getSTAEntityPlural(getSTAURLLastEntity(n.STAURL), false);
	if (!STAEntities[plural] || map[plural])
		return;
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

/* Candidate records from the nearest STA entity ancestors that have a table (by entity type) */
function sebCandidatesFromParent(parent) {
	var map = {}, n = parent, i;
	for (i = 0; n && i < 30; i++) {
		sebCollectCandidatesFromNode(n, map);
		n = typeof GetParentNodes === "function" ? (GetParentNodes(n) || [])[0] : null;
	}
	return map;
}

/* Candidates from all direct parents (and their ancestors); first wins per plural */
function sebCandidatesFromAllParents(node) {
	var map = {}, parents = getSTAEntityBuilderParents(node), i, n, hops, seen;
	for (i = 0; i < parents.length; i++) {
		n = parents[i];
		hops = 0;
		seen = {};
		while (n && hops < 30) {
			if (n.id != null && seen[n.id])
				break;
			if (n.id != null)
				seen[n.id] = true;
			sebCollectCandidatesFromNode(n, map);
			n = typeof GetParentNodes === "function" ? (GetParentNodes(n) || [])[0] : null;
			hops++;
		}
	}
	return map;
}

function sebDefaultConfig(parent, mode, node) {
	var isCas = mode === "connectASensor";
	var meta = (parent && parent.connectASensorMeta) || {};
	var info = meta.sensorInfo || {};
	var sources = node ? sebBuildColumnSources(node) : null;
	var cols = sources && sources.cols.length ? sources.cols :
		sebColumnNames(parent && parent.STAdata, parent && parent.STAdataAttributes);
	var isPmscan = info.sensorType === "pmscan";
	var metaStr = Object.keys(info).length ? JSON.stringify(info) :
		(isPmscan ? "https://skmove.io/tera/pmscan/webapp/" : "https://docs.smartcitizen.me/");
	var timeCol = cols.indexOf("timestamp") !== -1 ? "timestamp" :
		(cols.indexOf("phenomenonTime") !== -1 ? "phenomenonTime" : (cols[0] || ""));
	var valueCols = cols.filter(function (c) {
		return c !== timeCol && c !== "sensor_id" && c !== "@iot.id" && c.indexOf(".") === -1;
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
	var cfg = {
		version: 2,
		mode: mode,
		selected: {},
		scope: sebDefaultScope(mode),
		entities: {},
		measurements: [],
		relationStub: sebNewRelationStub(),
		nesting: sebNewNesting()
	};
	var cands = node ? sebCandidatesFromAllParents(node) : sebCandidatesFromParent(parent);
	var perGroup = sebPerGroupList(cfg);

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
			cfg.measurements.push(sebNewMeasurement(key, parent, ctx, perGroup));
		});
	}
	/* Columns whose STAdataAttributes.definition is .../Entity/property → bind as column source */
	sebApplyAttributeDefinitionsToConfig(cfg, parent, false, sources);
	return cfg;
}

function sebMeasCtxFromParent(cfg, parent) {
	var meta = (parent && parent.connectASensorMeta) || {};
	var info = meta.sensorInfo || {};
	var isPmscan = info.sensorType === "pmscan";
	return {
		mode: cfg.mode,
		isCas: cfg.mode === "connectASensor",
		name: meta.displayName || info.bleName || "Sensor",
		desc: isPmscan ? "PMSCAN / Polluscan (TERA)" : "Smart Citizen Kit",
		metaStr: Object.keys(info).length ? JSON.stringify(info) :
			(isPmscan ? "https://skmove.io/tera/pmscan/webapp/" : "https://docs.smartcitizen.me/")
	};
}

function sebSyncMeasurements(cfg, parent) {
	var keys, ctx, perGroup;
	if (!cfg)
		return;
	sebEnsureScope(cfg);
	if (cfg.mode === "connectASensor")
		keys = sebMeasurementKeysFromParent(parent);
	else {
		/* dataFromTable: keep user-chosen groups already in cfg.measurements */
		keys = (cfg.measurements || []).filter(function (m) { return m.include; }).map(function (m) { return m.key; });
		if (!keys.length)
			return;
	}
	ctx = sebMeasCtxFromParent(cfg, parent);
	perGroup = sebPerGroupList(cfg);
	if (!cfg.measurements)
		cfg.measurements = [];
	keys.forEach(function (key) {
		var i;
		for (i = 0; i < cfg.measurements.length; i++) {
			if (cfg.measurements[i].key === key)
				return;
		}
		cfg.measurements.push(sebNewMeasurement(key, parent, ctx, perGroup));
	});
	sebEnsureMeasurementEntities(cfg, parent);
}

/* Add / toggle a column as a repeating group (dataFromTable freer mode). */
function sebSetMeasurementInclude(cfg, parent, key, include) {
	var i, ctx, perGroup, found = null;
	if (!cfg || !key)
		return;
	sebEnsureScope(cfg);
	if (!cfg.measurements)
		cfg.measurements = [];
	for (i = 0; i < cfg.measurements.length; i++) {
		if (cfg.measurements[i].key === key) {
			found = cfg.measurements[i];
			break;
		}
	}
	if (found) {
		found.include = !!include;
		sebRefreshRelationIdColumns(cfg);
		return;
	}
	if (!include)
		return;
	ctx = sebMeasCtxFromParent(cfg, parent);
	perGroup = sebPerGroupList(cfg);
	cfg.measurements.push(sebNewMeasurement(key, parent, ctx, perGroup));
	sebEnsureMeasurementEntities(cfg, parent);
	sebRefreshRelationIdColumns(cfg);
}

var sebGroupKeySeq = 1;

function sebNewFreeGroupKey() {
	return "grup_" + (Date.now().toString(36)) + "_" + (sebGroupKeySeq++);
}

function sebAddUserGroup(cfg, parent, label) {
	var ctx, perGroup, key, m;
	if (!cfg)
		return null;
	sebEnsureScope(cfg);
	if (!cfg.measurements)
		cfg.measurements = [];
	ctx = sebMeasCtxFromParent(cfg, parent);
	perGroup = sebPerGroupList(cfg);
	key = sebNewFreeGroupKey();
	m = sebNewMeasurement(key, parent, ctx, perGroup);
	m.label = label && String(label).trim() ? String(label).trim() : ("grup" + (cfg.measurements.length + 1));
	m.resultColumn = "";
	m.include = true;
	sebSyncGroupResultColumn(m, parent);
	cfg.measurements.push(m);
	sebEnsureMeasurementEntities(cfg, parent);
	sebRefreshRelationIdColumns(cfg);
	return m;
}

function sebRemoveUserGroup(cfg, key) {
	var i;
	if (!cfg || !cfg.measurements || !key)
		return;
	for (i = cfg.measurements.length - 1; i >= 0; i--) {
		if (cfg.measurements[i].key === key)
			cfg.measurements.splice(i, 1);
	}
	sebRefreshRelationIdColumns(cfg);
}

function sebOnAddGroup(event) {
	var node = getSTAEntityBuilderNodeSafe();
	var parent, cfg;
	if (event)
		event.preventDefault();
	if (!node)
		return;
	cfg = sebCollectConfigFromForm(node);
	parent = getSTAEntityBuilderParent(node);
	sebAddUserGroup(cfg, parent, "");
	node.staEntityConfig = cfg;
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	renderSTAEntityBuilderForm(node);
}

function sebOnRemoveGroup(btn) {
	var node = getSTAEntityBuilderNodeSafe();
	var key, cfg;
	if (!node || !btn)
		return;
	key = btn.getAttribute("data-meas");
	cfg = sebCollectConfigFromForm(node);
	sebRemoveUserGroup(cfg, key);
	node.staEntityConfig = cfg;
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	renderSTAEntityBuilderForm(node);
}

function sebOnScopeChange(radio) {
	var node = getSTAEntityBuilderNodeSafe();
	var plural, cfg, parent;
	if (!node || !radio)
		return;
	plural = radio.getAttribute("data-ent");
	cfg = sebCollectConfigFromForm(node);
	sebEnsureScope(cfg);
	if (plural && (radio.value === SEB_SCOPE_SHARED || radio.value === SEB_SCOPE_GROUP))
		cfg.scope[plural] = radio.value;
	parent = getSTAEntityBuilderParent(node);
	sebEnsureMeasurementEntities(cfg, parent);
	node.staEntityConfig = cfg;
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	renderSTAEntityBuilderForm(node);
}

function sebOnGroupLabelInput(inp) {
	var card, preview, slug;
	if (!inp)
		return;
	card = inp.closest(".sebGroupCard");
	if (!card)
		return;
	preview = card.querySelector(".sebIdColPreview");
	slug = sebSlugLabel(inp.value, card.getAttribute("data-meas"));
	if (preview)
		preview.textContent = "id_" + slug;
	sebScheduleAutoSave();
}

function sebEnsureConfig(node, force) {
	var parent = getSTAEntityBuilderParent(node);
	var preferCas = !!(parent && (parent.image === "connectASensor.png" || parent.image === "readSDFromSensor.png" || parent.connectASensorMeta));
	if (!force && node.staEntityConfig && node.staEntityConfig.version === 2) {
		sebEnsureScope(node.staEntityConfig);
		sebMigrateConfigGeoProps(node.staEntityConfig);
		sebEnsureMeasurementEntities(node.staEntityConfig, parent);
		if (node.staEntityConfig.mode === "connectASensor" && node.staEntityConfig.selected)
			node.staEntityConfig.selected.Observations = true;
		return node.staEntityConfig;
	}
	node.staEntityConfig = sebDefaultConfig(parent, preferCas ? "connectASensor" : "dataFromTable", node);
	sebMigrateConfigGeoProps(node.staEntityConfig);
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
	} else if (name === "location" || name === "feature") {
		v = rec[name];
		if (v === null || v === undefined) {
			/* legacy wide tables with separate lon/lat columns */
			if (rec.longitude != null && rec.latitude != null && isFinite(Number(rec.longitude)) && isFinite(Number(rec.latitude)))
				return sebGeoJsonPointString(rec.longitude, rec.latitude);
			return "";
		}
		geom = sebParseMaybeJson(v);
		if (geom && geom.type === "Feature" && geom.geometry)
			geom = geom.geometry;
		if (geom && geom.type === "Point" && geom.coordinates)
			return JSON.stringify({ type: "Point", coordinates: geom.coordinates });
		return typeof v === "object" ? JSON.stringify(v) : String(v);
	} else if (name === "longitude" || name === "latitude") {
		/* legacy only */
		geom = sebParseMaybeJson(rec.location !== undefined ? rec.location : rec.feature);
		if (geom && geom.geometry)
			geom = geom.geometry;
		coords = geom && geom.coordinates;
		v = coords ? coords[name === "longitude" ? 0 : 1] : rec[name];
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

/* Column <select> options grouped by source node label (optgroup). */
function sebColumnOptionsHtml(columns, selected) {
	var html = "<option value=\"\">—</option>", i, g, j, col, groups, seen = {};
	groups = (typeof sebCtx !== "undefined" && sebCtx && sebCtx.colGroups && sebCtx.colGroups.length)
		? sebCtx.colGroups : null;
	if (groups) {
		for (i = 0; i < groups.length; i++) {
			g = groups[i];
			if (!g || !g.columns || !g.columns.length)
				continue;
			html += "<optgroup label=\"" + sebEsc(g.label) + "\">";
			for (j = 0; j < g.columns.length; j++) {
				col = g.columns[j];
				seen[col.value] = true;
				html += "<option value=\"" + sebEsc(col.value) + "\"" +
					(col.value === selected ? " selected" : "") + ">" + sebEsc(col.text || col.value) + "</option>";
			}
			html += "</optgroup>";
		}
		/* Any leftover names not in groups (e.g. legacy) */
		if (columns) {
			for (i = 0; i < columns.length; i++) {
				if (seen[columns[i]])
					continue;
				html += "<option value=\"" + sebEsc(columns[i]) + "\"" +
					(columns[i] === selected ? " selected" : "") + ">" + sebEsc(columns[i]) + "</option>";
			}
		}
		return html;
	}
	for (i = 0; i < (columns || []).length; i++) {
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
	var plural = entEl ? entEl.getAttribute("data-ent") : "";
	var geoName = sebGeoPropName(plural) || "location";
	function apply(lon, lat) {
		if (!entEl)
			return;
		sebSetPropRowValue(entEl, geoName, sebGeoJsonPointString(lon, lat));
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
	var sources = sebBuildColumnSources(node);
	if (!sources.primary && parent)
		sources.primary = parent;
	if ((!sources.data || !sources.data.length) && parent && parent.STAdata)
		sources.data = parent.STAdata;
	if (!sources.cols.length && parent) {
		sources.cols = sebColumnNames(parent.STAdata, parent.STAdataAttributes);
		if (!sources.colGroups || !sources.colGroups.length) {
			sources.colGroups = [{
				label: sebNodeLabel(parent),
				columns: sources.cols.map(function (c) { return { value: c, text: c }; })
			}];
		}
	}
	sebCtx = {
		sources: sources,
		primary: sources.primary || parent,
		laterals: sources.laterals || [],
		cols: sources.cols,
		colGroups: sources.colGroups || [],
		colMap: sources.colMap || {},
		data: sources.data || [],
		cands: sebCandidatesFromAllParents(node),
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
	if (!m)
		return "";
	if (m.label && String(m.label).trim())
		return String(m.label).trim();
	var n = m.ObservedProperties && m.ObservedProperties.props && m.ObservedProperties.props.name
		? m.ObservedProperties.props.name.value : "";
	if (!n && m.Datastreams && m.Datastreams.props && m.Datastreams.props.name)
		n = m.Datastreams.props.name.value;
	return n || m.key;
}

/* Free-mode observation group card: name + entity checkboxes (like workflow, but per group). */
function sebGroupCardHtml(m, cols, cfg) {
	var idCol = m._idColumn || sebIdColumnForGroup(m);
	var html = [];
	var i, c, groupEnts;
	sebEnsureGroupSelected(m);
	groupEnts = sebGroupSelectedList(m);
	html.push("<div class=\"sebGroupCard sebSection sebMeasSection\" data-section-meas=\"", sebEsc(m.key),
		"\" data-meas=\"", sebEsc(m.key), "\">");
	html.push("<div class=\"sebGroupCardHead\">");
	html.push("<label class=\"sebGroupInc\"><input type=\"checkbox\" class=\"sebMeasInc\" data-meas=\"",
		sebEsc(m.key), "\" onchange=\"sebOnIncludeChange()\"", (m.include ? " checked" : ""), "> ",
		DonaCadena({cat: "Inclou", spa: "Incluir", eng: "Include"}), "</label>");
	html.push("<label class=\"sebGroupLabelWrap\"><span class=\"sebLbl\">",
		DonaCadena({cat: "Nom del grup", spa: "Nombre del grupo", eng: "Group name"}),
		"</span> <input type=\"text\" class=\"sebGroupLabel\" data-meas=\"", sebEsc(m.key),
		"\" value=\"", sebEsc(m.label || m.key),
		"\" oninput=\"sebOnGroupLabelInput(this)\" placeholder=\"foto, identificacio…\"></label>");
	html.push("<span class=\"sebIdColHint\">",
		DonaCadena({cat: "Columna id:", spa: "Columna id:", eng: "Id column:"}),
		" <code class=\"sebIdColPreview\">", sebEsc(idCol), "</code></span>");
	html.push("<button type=\"button\" class=\"DialogConnectASensorAction sebGroupRemove\" data-meas=\"",
		sebEsc(m.key), "\" onclick=\"sebOnRemoveGroup(this)\">",
		DonaCadena({cat: "Elimina grup", spa: "Eliminar grupo", eng: "Remove group"}),
		"</button>");
	html.push("</div>");
	html.push("<div class=\"sebGroupEntChecks\"><span class=\"sebLbl\">",
		DonaCadena({cat: "Entitats d'aquest grup", spa: "Entidades de este grupo", eng: "Entities in this group"}),
		"</span><div class=\"sebIncludeRow\">");
	for (i = 0; i < SEB_GROUP_CHECKABLE.length; i++) {
		c = SEB_GROUP_CHECKABLE[i];
		html.push("<label><input type=\"checkbox\" class=\"sebGroupEntInc\" data-meas=\"", sebEsc(m.key),
			"\" data-ent=\"", sebEsc(c), "\" onchange=\"sebOnGroupEntityChange(this)\"",
			(m.selected[c] ? " checked" : ""), "> ", sebEsc(c), "</label>");
	}
	html.push("</div></div>");
	html.push("<div class=\"sebGroupEnts\">");
	for (i = 0; i < groupEnts.length; i++) {
		c = groupEnts[i];
		if (!m[c])
			continue;
		/* Same fieldset+legend look as shared entities outside the group */
		html.push("<fieldset class=\"sebSection sebMeasEntWrap\" data-meas-ent=\"", c, "\"><legend>",
			sebEsc(c), "</legend>",
			sebEntityBlockHtml(c, m[c], m.key, cols, null, cfg.mode, false),
			"</fieldset>");
	}
	html.push("</div></div>");
	return html.join("");
}

function sebNestingPanelHtml(cfg) {
	var nest, html = [], showCampOg, showRelOg, stub;
	sebEnsureNesting(cfg);
	nest = cfg.nesting;
	stub = cfg.relationStub || sebNewRelationStub();
	showCampOg = sebHasEntitySelected(cfg, "Campaigns") && sebHasEntitySelected(cfg, "ObservationGroups");
	showRelOg = !!stub.enabled && sebHasEntitySelected(cfg, "ObservationGroups");
	/* Always emit; visibility toggled in sebRefreshVisibility when selection changes. */
	html.push("<section class=\"sebPanel sebNestingPanel\" aria-labelledby=\"sebNestTitle\"",
		(!showCampOg && !showRelOg ? " hidden" : ""), ">");
	html.push("<strong id=\"sebNestTitle\" class=\"sebPanelTitle\">",
		DonaCadena({cat: "Ordre / niuatge", spa: "Orden / anidación", eng: "Order / nesting"}),
		"</strong>");
	html.push("<fieldset class=\"sebNestField\" id=\"sebNestCampOgField\"",
		(showCampOg ? "" : " hidden"), "><legend>",
		DonaCadena({
			cat: "Campaign ↔ ObservationGroup — qui es crea primer?",
			spa: "Campaign ↔ ObservationGroup — ¿quién se crea primero?",
			eng: "Campaign ↔ ObservationGroup — which is created first?"
		}), "</legend>");
	html.push("<label><input type=\"radio\" name=\"sebNestCampOg\" value=\"campaignFirst\"",
		(nest.campaignObservationGroup === "campaignFirst" ? " checked" : ""),
		" onchange=\"sebOnIncludeChange()\"> Campaign → ObservationGroup</label> ");
	html.push("<label><input type=\"radio\" name=\"sebNestCampOg\" value=\"observationGroupFirst\"",
		(nest.campaignObservationGroup === "observationGroupFirst" ? " checked" : ""),
		" onchange=\"sebOnIncludeChange()\"> ObservationGroup → Campaign</label>");
	html.push("</fieldset>");
	html.push("<fieldset class=\"sebNestField\" id=\"sebNestRelOgField\"",
		(showRelOg ? "" : " hidden"), "><legend>",
		DonaCadena({
			cat: "Relation ↔ ObservationGroup — qui va dins de què?",
			spa: "Relation ↔ ObservationGroup — ¿quién va dentro de qué?",
			eng: "Relation ↔ ObservationGroup — who nests in whom?"
		}), "</legend>");
	html.push("<label><input type=\"radio\" name=\"sebNestRelOg\" value=\"relationFirst\"",
		(nest.relationObservationGroup === "relationFirst" ? " checked" : ""),
		" onchange=\"sebOnIncludeChange()\"> ",
		DonaCadena({
			cat: "Relation primer; després dins de l'ObservationGroup",
			spa: "Relation primero; luego dentro del ObservationGroup",
			eng: "Relation first; then inside ObservationGroup"
		}), "</label> ");
	html.push("<label><input type=\"radio\" name=\"sebNestRelOg\" value=\"observationGroupFirst\"",
		(nest.relationObservationGroup === "observationGroupFirst" ? " checked" : ""),
		" onchange=\"sebOnIncludeChange()\"> ",
		DonaCadena({
			cat: "ObservationGroup primer; Relation hi enllaça",
			spa: "ObservationGroup primero; Relation enlaza",
			eng: "ObservationGroup first; Relation links to it"
		}), "</label>");
	html.push("</fieldset>");
	html.push("</section>");
	return html.join("");
}

function sebRelationPanelHtml(cfg) {
	var stub = cfg.relationStub || sebNewRelationStub();
	var included = (cfg.measurements || []).filter(function (g) { return g.include; });
	var html = [];
	var i, m, opt, tk;
	sebRefreshRelationIdColumns(cfg);
	tk = stub.targetKind === "ObservationGroups" ? "ObservationGroups" : "Observations";
	html.push("<section class=\"sebPanel sebRelationPanel\" aria-labelledby=\"sebRelTitle\">");
	html.push("<strong id=\"sebRelTitle\" class=\"sebPanelTitle\">",
		DonaCadena({cat: "Relation (per fila)", spa: "Relation (por fila)", eng: "Relation (per row)"}),
		"</strong>");
	html.push("<p class=\"sebHint\">",
		DonaCadena({
			cat: "Trieu el grup subject i el grup object. El Publicador STA crearà una Relation per fila quan hi hagi els @iot.id.",
			spa: "Elija el grupo subject y el grupo object. El Publicador STA creará una Relation por fila cuando haya los @iot.id.",
			eng: "Pick the subject and object groups. The STA Publisher will create one Relation per row once @iot.id values exist."
		}), "</p>");
	html.push("<label class=\"sebRelEnable\"><input type=\"checkbox\" class=\"sebRelEnableCb\" id=\"sebRelEnable\"",
		(stub.enabled ? " checked" : ""), " onchange=\"sebOnIncludeChange()\"> ",
		DonaCadena({
			cat: "Prepara Relation per fila",
			spa: "Preparar Relation por fila",
			eng: "Prepare per-row Relation"
		}), "</label>");
	html.push("<div class=\"sebRow\"><span class=\"sebLbl\">",
		DonaCadena({
			cat: "Subject/Object són",
			spa: "Subject/Object son",
			eng: "Subject/Object are"
		}), "</span>",
		"<select class=\"sebRelTargetKind\" id=\"sebRelTargetKind\" onchange=\"sebOnIncludeChange()\">",
		"<option value=\"Observations\"", (tk === "Observations" ? " selected" : ""), ">Observations</option>",
		"<option value=\"ObservationGroups\"", (tk === "ObservationGroups" ? " selected" : ""), ">ObservationGroups</option>",
		"</select></div>");
	html.push("<div class=\"sebRow\"><span class=\"sebLbl\">role</span>",
		"<input type=\"text\" class=\"sebRelRole\" id=\"sebRelRole\" value=\"", sebEsc(stub.role || ""),
		"\" placeholder=\"https://…/role/…\"></div>");
	html.push("<div class=\"sebRow\"><span class=\"sebLbl\">Subject</span>",
		"<select class=\"sebRelSubject\" id=\"sebRelSubject\">");
	html.push("<option value=\"\">—</option>");
	for (i = 0; i < included.length; i++) {
		m = included[i];
		opt = (stub.subjectGroupKey === m.key) ? " selected" : "";
		html.push("<option value=\"", sebEsc(m.key), "\"", opt, ">",
			sebEsc(sebGroupDisplayLabel(m)), "</option>");
	}
	html.push("</select></div>");
	html.push("<div class=\"sebRow\"><span class=\"sebLbl\">Object</span>",
		"<select class=\"sebRelObject\" id=\"sebRelObject\">");
	html.push("<option value=\"\">—</option>");
	for (i = 0; i < included.length; i++) {
		m = included[i];
		opt = (stub.objectGroupKey === m.key) ? " selected" : "";
		html.push("<option value=\"", sebEsc(m.key), "\"", opt, ">",
			sebEsc(sebGroupDisplayLabel(m)), "</option>");
	}
	html.push("</select></div>");
	html.push("<div class=\"sebRow\"><span class=\"sebLbl\">",
		DonaCadena({cat: "Descripció", spa: "Descripción", eng: "Description"}),
		"</span><input type=\"text\" class=\"sebRelDesc\" id=\"sebRelDesc\" value=\"",
		sebEsc(stub.description || ""), "\"></div>");
	html.push("</section>");
	return html.join("");
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
	sebEnsureScope(cfg);
	sebEnsureGroupLabels(cfg);
	if (!isCas)
		sebRefreshRelationIdColumns(cfg);
	rows = parent && parent.STAdata ? parent.STAdata.length : 0;
	SEB_PER_MEAS.forEach(function (p) { perMeasSet[p] = true; });

	/* —— Mode —— */
	html.push("<div class=\"sebModeRow\"><label>",
		DonaCadena({cat: "Mode d'entrada:", spa: "Modo de entrada:", eng: "Input mode:"}),
		" <select id=\"sebMode\" onchange=\"sebOnModeChange(event)\">",
		"<option value=\"connectASensor\"" + (isCas ? " selected" : "") + ">ConnectASensor</option>",
		"<option value=\"dataFromTable\"" + (!isCas ? " selected" : "") + ">DataFromTable</option>",
		"</select></label>",
		" <span class=\"sebHint\">",
		DonaCadenaFmt({cat: "Files d'entrada: {0}", spa: "Filas de entrada: {0}", eng: "Input rows: {0}"}, rows),
		"</span></div>");

	if (isCas) {
		/* ========== ConnectASensor: keep previous layout ========== */
		html.push("<fieldset><legend>",
			DonaCadena({cat: "Entitats al flux", spa: "Entidades en el flujo", eng: "Entities in workflow"}),
			"</legend><div class=\"sebIncludeRow\">");
		order.forEach(function (plural) {
			html.push("<label><input type=\"checkbox\" class=\"sebInc\" data-ent=\"", plural,
				"\" onchange=\"sebOnIncludeChange()\"",
				(cfg.selected[plural] ? " checked" : ""),
				(plural === "Observations" || plural === "Parties" ? " disabled" : ""),
				"> ", plural, "</label>");
		});
		html.push("</div></fieldset>");

		html.push("<fieldset><legend>",
			DonaCadena({cat: "Columnes de mesura", spa: "Columnas de medida", eng: "Measurement columns"}),
			"</legend><div class=\"sebIncludeRow\">");
		(cfg.measurements || []).forEach(function (m) {
			html.push("<label><input type=\"checkbox\" class=\"sebMeasInc\" data-meas=\"", sebEsc(m.key),
				"\" onchange=\"sebOnIncludeChange()\"", (m.include ? " checked" : ""), "> ",
				sebEsc(sebMeasLabel(m)), " <code>", sebEsc(m.key), "</code></label>");
		});
		if (!(cfg.measurements || []).length)
			html.push("<span class=\"sebHint\">",
				DonaCadena({cat: "No s'han detectat columnes de mesura.", spa: "No se han detectado columnas de medida.", eng: "No measurement columns detected."}),
				"</span>");
		html.push("</div></fieldset>");

		order.forEach(function (plural) {
			if (perMeasSet[plural])
				return;
			html.push("<fieldset class=\"sebSection\" data-section=\"", plural, "\" hidden><legend>", plural,
				" <small class=\"sebReqNote\" hidden>",
				DonaCadena({cat: "(requerit per altres entitats)", spa: "(requerido por otras entidades)", eng: "(required by other entities)"}),
				"</small></legend>");
			if (plural === "Parties")
				html.push("<p id=\"sebPartyMsg\" class=\"sebPartyMsg sebHint\"></p>");
			if (plural === "Observations") {
				html.push("<p class=\"sebHint sebObsSensorNote\">",
					DonaCadena({
						cat: "Les observacions es deriven de les dades recollides amb el sensor (cada valor de mesura × cada registre). No cal mapar columnes aquí.",
						spa: "Las observaciones se derivan de los datos recogidos con el sensor (cada valor de medida × cada registro). No hace falta mapear columnas aquí.",
						eng: "Observations are derived from data collected with the sensor (each measurement value × each record). No column mapping is needed here."
					}), "</p>");
			} else if (cfg.entities[plural]) {
				html.push(sebEntityBlockHtml(plural, cfg.entities[plural], null, cols, sebCtx.cands[plural], cfg.mode, false));
			}
			html.push("</fieldset>");
		});

		(cfg.measurements || []).forEach(function (m) {
			html.push("<fieldset class=\"sebSection sebMeasSection\" data-section-meas=\"", sebEsc(m.key),
				"\" data-meas=\"", sebEsc(m.key), "\" hidden><legend>", sebEsc(sebMeasLabel(m)),
				" <code>", sebEsc(m.key), "</code></legend>");
			html.push("<div class=\"sebGroupEnts\">");
			SEB_PER_MEAS.forEach(function (plural) {
				if (!m[plural])
					return;
				/* Same fieldset+legend look as shared entities / free-mode groups */
				html.push("<fieldset class=\"sebSection sebMeasEntWrap\" data-meas-ent=\"", plural,
					"\" hidden><legend>", sebEsc(plural), "</legend>",
					sebEntityBlockHtml(plural, m[plural], m.key, cols, null, cfg.mode, false),
					"</fieldset>");
			});
			html.push("</div></fieldset>");
		});
		html.push(sebNestingPanelHtml(cfg));
	} else {
		/* ========== DataFromTable: freer groups ========== */
		html.push("<p class=\"sebHint\">",
			DonaCadena({
				cat: "El Party és sempre compartit (login). Creeu grups; dins de cada grup marqueu les entitats (incloent Observations) i ompliu-ne les propietats a mà o amb columna.",
				spa: "El Party es siempre compartido (login). Cree grupos; dentro de cada grupo marque las entidades (incluyendo Observations) y rellene propiedades a mano o con columna.",
				eng: "Party is always shared (login). Create groups; inside each group tick entities (including Observations) and fill properties manually or from a column."
			}), "</p>");

		/* Shared Party only at top level */
		html.push("<fieldset class=\"sebSection\" data-section=\"Parties\"><legend>Parties</legend>");
		html.push("<p id=\"sebPartyMsg\" class=\"sebPartyMsg sebHint\"></p>");
		if (cfg.entities.Parties)
			html.push(sebEntityBlockHtml("Parties", cfg.entities.Parties, null, cols, sebCtx.cands.Parties, cfg.mode, false));
		html.push("</fieldset>");

		html.push("<section class=\"sebPanel sebGroupsPanel\"><strong class=\"sebPanelTitle\">",
			DonaCadena({cat: "Grups d'observacions", spa: "Grupos de observaciones", eng: "Observation groups"}),
			"</strong>");
		html.push("<div class=\"sebGroupActions\"><button type=\"button\" class=\"DialogConnectASensorAction\" onclick=\"sebOnAddGroup(event)\">",
			DonaCadena({
				cat: "Crea un nou grup d'observacions",
				spa: "Crear un nuevo grupo de observaciones",
				eng: "Create new observations group"
			}), "</button></div>");
		html.push("<div class=\"sebGroupList\">");
		(cfg.measurements || []).forEach(function (m) {
			html.push(sebGroupCardHtml(m, cols, cfg));
		});
		if (!(cfg.measurements || []).length) {
			html.push("<p class=\"sebHint\">",
				DonaCadena({
					cat: "Encara no hi ha grups. Creeu-ne un (p. ex. fotos, identificació).",
					spa: "Aún no hay grupos. Cree uno (p. ej. fotos, identificación).",
					eng: "No groups yet. Create one (e.g. photos, identification)."
				}), "</p>");
		}
		html.push("</div></section>");

		html.push(sebRelationPanelHtml(cfg));
		html.push(sebNestingPanelHtml(cfg));
	}

	html.push("<div id=\"DialogSTAEntityBuilderStatus\" class=\"sebStatus\"></div>");
	el.innerHTML = html.join("");

	ids = el.querySelectorAll(".sebIdRow");
	for (i = 0; i < ids.length; i++)
		sebUpdateIdUi(ids[i]);
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
		if (obsInc) {
			obsInc.checked = true;
			obsInc.disabled = true;
			obsInc.title = DonaCadena({
				cat: "Les observacions es deriven de les dades / grups.",
				spa: "Las observaciones se derivan de los datos / grupos.",
				eng: "Observations are derived from data / groups."
			});
		}
	})();
	sebRefreshVisibility();
	sebBindAutoSave(el);
	sebLoadPartyFromLogin(node);
}

function sebOnQuickColToggle(cb) {
	var node = getSTAEntityBuilderNodeSafe();
	var col, cfg, parent, found, m;
	if (!node || !cb)
		return;
	col = cb.getAttribute("data-col");
	cfg = sebCollectConfigFromForm(node);
	parent = getSTAEntityBuilderParent(node);
	if (cb.checked) {
		found = (cfg.measurements || []).some(function (g) { return g.key === col || g.resultColumn === col; });
		if (!found) {
			m = sebAddUserGroup(cfg, parent, col);
			if (m) {
				m.key = col;
				m.resultColumn = col;
				m.label = col;
				sebSyncGroupResultColumn(m, parent);
			}
		} else
			sebSetMeasurementInclude(cfg, parent, col, true);
	} else {
		sebRemoveUserGroup(cfg, col);
		/* also remove groups whose resultColumn matches */
		(cfg.measurements || []).slice().forEach(function (g) {
			if (g.resultColumn === col && g.key !== col)
				sebRemoveUserGroup(cfg, g.key);
		});
	}
	node.staEntityConfig = cfg;
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	renderSTAEntityBuilderForm(node);
}

function sebReadSelectedFromForm() {
	var el = sebBody(), sel = {}, incs, i, modeEl, gincs, isCas;
	if (!el)
		return sel;
	modeEl = document.getElementById("sebMode");
	isCas = !modeEl || modeEl.value === "connectASensor";
	incs = el.querySelectorAll(".sebInc");
	for (i = 0; i < incs.length; i++)
		sel[incs[i].getAttribute("data-ent")] = incs[i].checked;
	/* Party is always required and shared */
	sel.Parties = true;
	if (isCas) {
		sel.Observations = true;
	} else {
		/* Free mode: derive workflow from per-group entity checkboxes */
		sel.Observations = true;
		gincs = el.querySelectorAll(".sebGroupEntInc");
		for (i = 0; i < gincs.length; i++) {
			if (gincs[i].checked)
				sel[gincs[i].getAttribute("data-ent")] = true;
		}
		if (el.querySelector("#sebRelEnable") && el.querySelector("#sebRelEnable").checked)
			sel.Relations = true;
	}
	return sel;
}

/* Shows/hides sections and measurement blocks without redrawing the form */
function sebRefreshVisibility() {
	var el = sebBody(), sel, eff, secs, i, p, note, measChecked = {}, mincs, blocks, m, wraps, j, anyMeasEnt, plural;
	var modeEl, isCas, perMeasNeeded = false, gEnt;
	if (!el)
		return;
	modeEl = document.getElementById("sebMode");
	isCas = !modeEl || modeEl.value === "connectASensor";
	sel = sebReadSelectedFromForm();
	eff = sebEffectiveSet(sel);
	if (isCas) {
		SEB_PER_MEAS.forEach(function (pl) {
			if (eff[pl])
				perMeasNeeded = true;
		});
	}
	secs = el.querySelectorAll(".sebSection");
	for (i = 0; i < secs.length; i++) {
		p = secs[i].getAttribute("data-section");
		m = secs[i].getAttribute("data-section-meas");
		if (m !== null)
			continue;
		if (!p)
			continue;
		if (!isCas && p === "Parties") {
			secs[i].hidden = false;
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
	blocks = el.querySelectorAll(".sebGroupCard, .sebMeasSection");
	for (i = 0; i < blocks.length; i++) {
		m = blocks[i].getAttribute("data-meas");
		if (blocks[i].classList.contains("sebGroupCard")) {
			blocks[i].style.opacity = measChecked[m] === false ? "0.55" : "";
			wraps = blocks[i].querySelectorAll(".sebMeasEntWrap");
			for (j = 0; j < wraps.length; j++) {
				plural = wraps[j].getAttribute("data-meas-ent");
				gEnt = blocks[i].querySelector(".sebGroupEntInc[data-ent=\"" + plural + "\"]");
				wraps[j].hidden = !(gEnt && gEnt.checked);
			}
			continue;
		}
		/* CAS measurement sections */
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
	/* Nesting panel: show Campaign↔OG / Relation↔OG questions when both sides are selected */
	(function () {
		var nestPanel = el.querySelector(".sebNestingPanel");
		var nestCamp = el.querySelector("#sebNestCampOgField");
		var nestRel = el.querySelector("#sebNestRelOgField");
		var showCampOg = !!(sel.Campaigns && sel.ObservationGroups);
		var showRelOg = !!(sel.Relations && sel.ObservationGroups);
		if (nestCamp)
			nestCamp.hidden = !showCampOg;
		if (nestRel)
			nestRel.hidden = !showRelOg;
		if (nestPanel)
			nestPanel.hidden = !showCampOg && !showRelOg;
	})();
}

function sebOnGroupEntityChange(cb) {
	var node = getSTAEntityBuilderNodeSafe();
	var cfg, parent, key, plural, j, found;
	if (!node || !cb)
		return;
	key = cb.getAttribute("data-meas");
	plural = cb.getAttribute("data-ent");
	cfg = sebCollectConfigFromForm(node);
	parent = getSTAEntityBuilderParent(node);
	found = null;
	for (j = 0; j < (cfg.measurements || []).length; j++) {
		if (cfg.measurements[j].key === key)
			found = cfg.measurements[j];
	}
	if (found) {
		sebEnsureGroupSelected(found);
		found.selected[plural] = !!cb.checked;
	}
	sebEnsureMeasurementEntities(cfg, parent);
	node.staEntityConfig = cfg;
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	renderSTAEntityBuilderForm(node);
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
	var labels, resCols, stub, sources;
	sebEnsureScope(cfg);
	if (el) {
		cfg.mode = sebVal("sebMode") || cfg.mode;
		sel = sebReadSelectedFromForm();
		for (k in sel)
			cfg.selected[k] = sel[k];
		/* Group include + labels + result columns + per-group entity checkboxes */
		mincs = el.querySelectorAll(".sebMeasInc");
		for (i = 0; i < mincs.length; i++) {
			for (j = 0; j < cfg.measurements.length; j++) {
				if (cfg.measurements[j].key === mincs[i].getAttribute("data-meas"))
					cfg.measurements[j].include = mincs[i].checked;
			}
		}
		labels = el.querySelectorAll(".sebGroupLabel");
		for (i = 0; i < labels.length; i++) {
			for (j = 0; j < cfg.measurements.length; j++) {
				if (cfg.measurements[j].key === labels[i].getAttribute("data-meas"))
					cfg.measurements[j].label = labels[i].value;
			}
		}
		mincs = el.querySelectorAll(".sebGroupEntInc");
		for (i = 0; i < mincs.length; i++) {
			for (j = 0; j < cfg.measurements.length; j++) {
				if (cfg.measurements[j].key === mincs[i].getAttribute("data-meas")) {
					sebEnsureGroupSelected(cfg.measurements[j]);
					cfg.measurements[j].selected[mincs[i].getAttribute("data-ent")] = mincs[i].checked;
				}
			}
		}
		/* Relation stub (free mode) */
		stub = cfg.relationStub || sebNewRelationStub();
		if (el.querySelector("#sebRelEnable")) {
			stub.enabled = !!el.querySelector("#sebRelEnable").checked;
			if (el.querySelector("#sebRelRole"))
				stub.role = el.querySelector("#sebRelRole").value;
			if (el.querySelector("#sebRelDesc"))
				stub.description = el.querySelector("#sebRelDesc").value;
			if (el.querySelector("#sebRelSubject"))
				stub.subjectGroupKey = el.querySelector("#sebRelSubject").value;
			if (el.querySelector("#sebRelObject"))
				stub.objectGroupKey = el.querySelector("#sebRelObject").value;
			if (el.querySelector("#sebRelTargetKind"))
				stub.targetKind = el.querySelector("#sebRelTargetKind").value === "ObservationGroups"
					? "ObservationGroups" : "Observations";
			cfg.relationStub = stub;
			cfg.selected.Relations = !!stub.enabled;
			sebRefreshRelationIdColumns(cfg);
		}
		/* Nesting (Campaign↔OG / Relation↔OG) */
		sebEnsureNesting(cfg);
		if (el.querySelector("input[name=\"sebNestCampOg\"]:checked"))
			cfg.nesting.campaignObservationGroup =
				el.querySelector("input[name=\"sebNestCampOg\"]:checked").value === "observationGroupFirst"
					? "observationGroupFirst" : "campaignFirst";
		if (el.querySelector("input[name=\"sebNestRelOg\"]:checked"))
			cfg.nesting.relationObservationGroup =
				el.querySelector("input[name=\"sebNestRelOg\"]:checked").value === "observationGroupFirst"
					? "observationGroupFirst" : "relationFirst";
		/* Entity property rows */
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
	/* Free mode: keep cfg.selected aligned with Parties + union of group entity checks */
	if (cfg.mode === "dataFromTable") {
		cfg.selected.Parties = true;
		cfg.selected.Observations = true;
		SEB_GROUP_CHECKABLE.forEach(function (pl) {
			cfg.selected[pl] = (cfg.measurements || []).some(function (gm) {
				return gm.include && gm.selected && gm.selected[pl];
			});
		});
	}
	cfg.selected.Parties = true;
	node.staEntityConfig = cfg;
	/* Source from primary parent (+ lateral columns denormalized) — do not wipe STAdata from "Crea la taula" */
	if (parent && parent.STAdata && typeof deapCopy === "function") {
		sources = (typeof sebCtx !== "undefined" && sebCtx && sebCtx.sources) ? sebCtx.sources : sebBuildColumnSources(node);
		node.STAdataSource = sebEnrichDataWithLaterals(parent.STAdata, sources);
	}
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
	node.staEntityConfig = sebDefaultConfig(parent, mode, node);
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
	sebEnsureScope(cfg);
	included = (cfg.measurements || []).filter(function (m) {
		return m.include;
	});
	if (!parent || !parent.STAdata || !parent.STAdata.length)
		errors.push("No input table data.");
	if ((eff.Datastreams || eff.ObservedProperties || eff.Observations) && !included.length &&
			(isCas || cfg.mode === "dataFromTable"))
		errors.push(isCas ? "Select at least one measurement." : "Create/include at least one observation group.");
	sebEntityOrder().forEach(function (plural) {
		if (!eff[plural])
			return;
		if (plural === "Relations")
			return; /* stub — no full entity validation yet */
		if (isCas && plural === "Observations")
			return; /* CAS: derived from sensor measurements */
		if (isCas && SEB_PER_MEAS.indexOf(plural) !== -1) {
			included.forEach(function (m) {
				sebValidateEntity(plural, m[plural], plural + " (" + (m.label || m.key) + ")", cfg.mode, errors);
			});
		} else if (!isCas && plural !== "Parties") {
			included.forEach(function (m) {
				sebEnsureGroupSelected(m);
				if (m.selected[plural])
					sebValidateEntity(plural, m[plural], plural + " (" + (m.label || m.key) + ")", cfg.mode, errors);
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

function sebAttrDefinition(plural, prop) {
	var singular = (typeof STAEntities !== "undefined" && STAEntities[plural] && STAEntities[plural].singular)
		? STAEntities[plural].singular
		: String(plural).replace(/s$/, "");
	var propPath = (prop === "@iot.id") ? "id" : String(prop).replace(/\./g, "/");
	return SEB_DEF_DOCS_PREFIX + singular + "/" + propPath;
}

function sebAttrTypeForProp(plural, prop, mode) {
	var list, i;
	if (prop === "@iot.id")
		return "string";
	if (prop === "phenomenonTime" || prop === "resultTime")
		return "isodatetime";
	list = sebPropList(plural, mode || "dataFromTable");
	for (i = 0; i < list.length; i++) {
		if (list[i].name === prop)
			return list[i].dataType === "JSON" ? "json" : (list[i].dataType === "number" ? "number" : "string");
	}
	return "string";
}

/* Resolve all configured entity props (+ @iot.id) onto a wide-row column Entity.property / Group.Entity.property */
function sebApplyEntityToWideRow(row, plural, ent, rec, groupPrefix, attrs, mode) {
	var name, src, col, val;
	if (!row || !ent)
		return;
	if (ent.props) {
		for (name in ent.props) {
			if (!Object.prototype.hasOwnProperty.call(ent.props, name))
				continue;
			src = ent.props[name];
			if (!sebSrcIsSet(src))
				continue;
			val = sebResolveSrc(src, rec);
			if (val === undefined)
				continue;
			col = sebSuperColumn(plural, name, groupPrefix);
			row[col] = val;
			if (attrs && !attrs[col]) {
				attrs[col] = {
					type: sebAttrTypeForProp(plural, name, mode),
					description: (groupPrefix ? groupPrefix + " / " : "") + plural + "." + name,
					definition: sebAttrDefinition(plural, name)
				};
			}
		}
	}
	if (ent.id && sebSrcIsSet(ent.id)) {
		val = sebResolveSrc(ent.id, rec);
		if (!sebIsEmpty(val)) {
			col = sebSuperColumn(plural, "@iot.id", groupPrefix);
			row[col] = val;
			if (attrs && !attrs[col]) {
				attrs[col] = {
					type: "string",
					description: (groupPrefix ? groupPrefix + " / " : "") + plural + ".@iot.id",
					definition: sebAttrDefinition(plural, "@iot.id")
				};
			}
		}
	}
}

function sebEnsureWideAttr(attrs, col, plural, prop, groupPrefix, mode) {
	if (!attrs || !col || attrs[col])
		return;
	attrs[col] = {
		type: sebAttrTypeForProp(plural, prop, mode),
		description: (groupPrefix ? groupPrefix + " / " : "") + plural + "." + prop,
		definition: sebAttrDefinition(plural, prop)
	};
}

/* Rewrite packed entity sources to point at wide super-table columns. */
function sebRewritePackedEntityToWide(ent, plural, groupPrefix) {
	var name, col;
	if (!ent)
		return;
	if (ent.properties) {
		for (name in ent.properties) {
			if (!Object.prototype.hasOwnProperty.call(ent.properties, name))
				continue;
			col = sebSuperColumn(plural, name, groupPrefix);
			ent.properties[name] = { source: "column", column: col };
		}
	}
	col = sebSuperColumn(plural, "@iot.id", groupPrefix);
	if (ent.id || ent.existingId != null) {
		/* Keep existingId if already known; still map id column for lookups when empty */
		ent.id = { source: "column", column: col };
	}
}

function sebObsRowAttributes(cfg) {
	/* Built during wide materialization; this is only a fallback stub. */
	return {
		_sourceIndex: { type: "integer", description: "Index of the source / wide row" }
	};
}

function sebBuildPackage(cfg, parent, staUrl) {
	var errors = sebValidateConfig(cfg, parent);
	var eff = sebEffectiveSet(cfg.selected), isCas = cfg.mode === "connectASensor";
	var pkg, bindings = [], preview = [], r, j, rec, obsEnt, included = [], row, pt, rt, resVal, m;
	var useGroups, sources, attrs = {}, nObs = 0, gPrefix, col, pl, list, packed, gi;
	sebEnsureScope(cfg);
	sebEnsureGroupLabels(cfg);
	sources = (typeof sebCtx !== "undefined" && sebCtx && sebCtx.sources) ? sebCtx.sources : null;
	included = (cfg.measurements || []).filter(function (m) {
		return m.include;
	});
	useGroups = included.length > 0;
	sebEnsureNesting(cfg);
	pkg = {
		version: 2,
		mode: cfg.mode,
		STAURL: staUrl || "",
		observationTable: "wide",
		entities: {},
		observations: { id: null, existingId: null, phenomenonTime: null, resultTime: null, bindings: [] },
		relationStub: cfg.relationStub ? (typeof deapCopy === "function" ? deapCopy(cfg.relationStub) : JSON.parse(JSON.stringify(cfg.relationStub))) : null,
		nesting: typeof deapCopy === "function" ? deapCopy(cfg.nesting) : JSON.parse(JSON.stringify(cfg.nesting)),
		validation: { ok: errors.length === 0, errors: errors },
		sourceRowCount: parent && parent.STAdata ? parent.STAdata.length : 0
	};
	attrs._sourceIndex = { type: "integer", description: "Index of the source / wide row" };

	/* Pack entities (templates); sources rewritten to wide columns below */
	sebEntityOrder().forEach(function (plural) {
		if (!eff[plural] || plural === "Relations" || plural === "Observations")
			return;
		if (plural === "Parties" && cfg.entities[plural]) {
			pkg.entities[plural] = [sebPackEntity(plural, cfg.entities[plural], cfg.mode, plural)];
			return;
		}
		if (isCas && SEB_PER_MEAS.indexOf(plural) !== -1 && useGroups) {
			pkg.entities[plural] = included.map(function (gm) {
				return sebPackEntity(plural, gm[plural], cfg.mode, plural + ":" + gm.key, gm.key);
			});
		} else if (!isCas && useGroups) {
			list = included.filter(function (gm) {
				sebEnsureGroupSelected(gm);
				return !!gm.selected[plural] && gm[plural];
			}).map(function (gm) {
				return sebPackEntity(plural, gm[plural], cfg.mode, plural + ":" + gm.key, gm.key);
			});
			if (list.length)
				pkg.entities[plural] = list;
			else if (cfg.entities[plural])
				pkg.entities[plural] = [sebPackEntity(plural, cfg.entities[plural], cfg.mode, plural)];
		} else if (cfg.entities[plural])
			pkg.entities[plural] = [sebPackEntity(plural, cfg.entities[plural], cfg.mode, plural)];
	});

	/* Observation bindings → wide columns Group.Observations.* */
	if (useGroups && isCas) {
		included.forEach(function (gm) {
			gPrefix = gm._columnPrefix || sebGroupColumnPrefix(gm);
			bindings.push({
				measurementKey: gm.key,
				groupLabel: gm.label || gm.key,
				groupPrefix: gPrefix,
				idColumn: sebSuperColumn("Observations", "@iot.id", gPrefix),
				result: { source: "column", column: sebSuperColumn("Observations", "result", gPrefix) },
				phenomenonTime: { source: "column", column: sebSuperColumn("Observations", "phenomenonTime", gPrefix) },
				resultTime: { source: "column", column: sebSuperColumn("Observations", "resultTime", gPrefix) },
				datastreamRole: "Datastreams:" + gm.key
			});
		});
		pkg.observations.bindings = bindings;
	} else if (useGroups && !isCas) {
		included.forEach(function (gm) {
			sebEnsureGroupSelected(gm);
			if (!gm.selected.Observations || !gm.Observations)
				return;
			gPrefix = gm._columnPrefix || sebGroupColumnPrefix(gm);
			bindings.push({
				measurementKey: gm.key,
				groupLabel: gm.label || gm.key,
				groupPrefix: gPrefix,
				idColumn: sebSuperColumn("Observations", "@iot.id", gPrefix),
				result: { source: "column", column: sebSuperColumn("Observations", "result", gPrefix) },
				phenomenonTime: { source: "column", column: sebSuperColumn("Observations", "phenomenonTime", gPrefix) },
				resultTime: { source: "column", column: sebSuperColumn("Observations", "resultTime", gPrefix) },
				datastreamRole: "Datastreams:" + gm.key
			});
		});
		pkg.observations.bindings = bindings;
	} else if (eff.Observations && cfg.entities.Observations) {
		bindings.push({
			measurementKey: undefined,
			groupLabel: "",
			groupPrefix: "",
			idColumn: sebSuperColumn("Observations", "@iot.id", null),
			result: { source: "column", column: sebSuperColumn("Observations", "result", null) },
			phenomenonTime: { source: "column", column: sebSuperColumn("Observations", "phenomenonTime", null) },
			resultTime: { source: "column", column: sebSuperColumn("Observations", "resultTime", null) },
			datastreamRole: "Datastreams"
		});
		pkg.observations.bindings = bindings;
	}

	/* Sync relationStub idColumns to wide Observation @iot.id columns */
	if (pkg.relationStub) {
		sebRefreshRelationIdColumns(cfg);
		pkg.relationStub.idColumns = (cfg.relationStub && cfg.relationStub.idColumns)
			? cfg.relationStub.idColumns.slice()
			: included.map(function (gm) { return gm._idColumn || sebIdColumnForGroup(gm); });
		pkg.relationStub.subjectGroupKey = cfg.relationStub ? cfg.relationStub.subjectGroupKey : "";
		pkg.relationStub.objectGroupKey = cfg.relationStub ? cfg.relationStub.objectGroupKey : "";
	}

	/*
	 * Materialize wide super-table: 1 row = 1 source record.
	 * Columns = [Group.]Entity.property (resolved values).
	 */
	if (parent && parent.STAdata && (useGroups ? included.length : bindings.length)) {
		for (r = 0; r < parent.STAdata.length; r++) {
			rec = sebEnrichRecWithLaterals(parent.STAdata[r], sources);
			if (!rec)
				continue;
			row = { _sourceIndex: r };

			/* Shared entities (Party always; CAS non-per-meas; free: only Parties at top) */
			sebEntityOrder().forEach(function (plural) {
				if (plural === "Observations" || plural === "Relations")
					return;
				if (!eff[plural] || !cfg.entities[plural])
					return;
				if (isCas && SEB_PER_MEAS.indexOf(plural) !== -1)
					return;
				if (!isCas && plural !== "Parties")
					return;
				sebApplyEntityToWideRow(row, plural, cfg.entities[plural], rec, null, attrs, cfg.mode);
			});

			if (useGroups) {
				for (j = 0; j < included.length; j++) {
					m = included[j];
					gPrefix = m._columnPrefix || sebGroupColumnPrefix(m);
					sebEnsureGroupSelected(m);

					/* Per-group entities (not Observations) */
					(isCas ? SEB_PER_MEAS : sebGroupSelectedList(m)).forEach(function (plural) {
						if (plural === "Observations" || !m[plural])
							return;
						if (!isCas && !m.selected[plural])
							return;
						sebApplyEntityToWideRow(row, plural, m[plural], rec, gPrefix, attrs, cfg.mode);
					});

					/* Observation columns for this group */
					if (isCas) {
						resVal = rec[m.key];
						pt = rec.timestamp || rec.phenomenonTime;
						rt = pt;
					} else if (m.selected.Observations && m.Observations) {
						obsEnt = m.Observations;
						resVal = sebResolveSrc(obsEnt.props && obsEnt.props.result, rec);
						pt = sebResolveSrc(obsEnt.props && obsEnt.props.phenomenonTime, rec);
						rt = obsEnt.props && obsEnt.props.resultTime
							? sebResolveSrc(obsEnt.props.resultTime, rec) : undefined;
						if (rt === undefined || rt === null || rt === "")
							rt = pt;
					} else {
						resVal = undefined;
						pt = undefined;
						rt = undefined;
					}

					col = sebSuperColumn("Observations", "result", gPrefix);
					row[col] = sebIsEmpty(resVal) ? "" : resVal;
					sebEnsureWideAttr(attrs, col, "Observations", "result", gPrefix, cfg.mode);
					col = sebSuperColumn("Observations", "phenomenonTime", gPrefix);
					row[col] = pt != null ? pt : "";
					sebEnsureWideAttr(attrs, col, "Observations", "phenomenonTime", gPrefix, cfg.mode);
					col = sebSuperColumn("Observations", "resultTime", gPrefix);
					row[col] = rt != null ? rt : "";
					sebEnsureWideAttr(attrs, col, "Observations", "resultTime", gPrefix, cfg.mode);
					col = sebSuperColumn("Observations", "@iot.id", gPrefix);
					if (row[col] === undefined)
						row[col] = "";
					sebEnsureWideAttr(attrs, col, "Observations", "@iot.id", gPrefix, cfg.mode);

					if (!sebIsEmpty(resVal))
						nObs++;
				}
			} else {
				obsEnt = cfg.entities.Observations;
				resVal = sebResolveSrc(obsEnt.props && obsEnt.props.result, rec);
				pt = sebResolveSrc(obsEnt.props && obsEnt.props.phenomenonTime, rec);
				rt = obsEnt.props && obsEnt.props.resultTime
					? sebResolveSrc(obsEnt.props.resultTime, rec) : undefined;
				if (rt === undefined || rt === null || rt === "")
					rt = pt;
				col = sebSuperColumn("Observations", "result", null);
				row[col] = sebIsEmpty(resVal) ? "" : resVal;
				sebEnsureWideAttr(attrs, col, "Observations", "result", null, cfg.mode);
				col = sebSuperColumn("Observations", "phenomenonTime", null);
				row[col] = pt != null ? pt : "";
				sebEnsureWideAttr(attrs, col, "Observations", "phenomenonTime", null, cfg.mode);
				col = sebSuperColumn("Observations", "resultTime", null);
				row[col] = rt != null ? rt : "";
				sebEnsureWideAttr(attrs, col, "Observations", "resultTime", null, cfg.mode);
				col = sebSuperColumn("Observations", "@iot.id", null);
				if (row[col] === undefined)
					row[col] = "";
				sebEnsureWideAttr(attrs, col, "Observations", "@iot.id", null, cfg.mode);
				if (!sebIsEmpty(resVal))
					nObs++;
			}

			if (pkg.relationStub && pkg.relationStub.enabled) {
				row._relationSubjectCol = "";
				row._relationObjectCol = "";
				included.forEach(function (g) {
					col = g._idColumn || sebIdColumnForGroup(g);
					if (g.key === pkg.relationStub.subjectGroupKey)
						row._relationSubjectCol = col;
					if (g.key === pkg.relationStub.objectGroupKey)
						row._relationObjectCol = col;
				});
			}

			preview.push(row);
		}
	}

	/* Point package entity/obs sources at wide columns so Publisher uses the super-table */
	for (pl in pkg.entities) {
		if (!Object.prototype.hasOwnProperty.call(pkg.entities, pl))
			continue;
		list = pkg.entities[pl] || [];
		for (gi = 0; gi < list.length; gi++) {
			packed = list[gi];
			if (!packed)
				continue;
			gPrefix = null;
			if (packed.measurementKey != null && packed.measurementKey !== "") {
				for (j = 0; j < included.length; j++) {
					if (included[j].key === packed.measurementKey) {
						gPrefix = included[j]._columnPrefix || sebGroupColumnPrefix(included[j]);
						break;
					}
				}
			}
			sebRewritePackedEntityToWide(packed, pl, gPrefix);
		}
	}

	pkg.observationPreviewCount = nObs;
	return { package: pkg, preview: preview, attributes: attrs };
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
	var parent, cfg, sources, i, m;
	if (!node)
		node = getSTAEntityBuilderNodeSafe();
	if (!node)
		return;
	parent = getSTAEntityBuilderParent(node);
	sources = sebBuildColumnSources(node);
	/*
		Keep previous STAdata (from "Crea la taula") so the user can reopen,
		tweak entities and recreate. Only refresh STAdataSource from the primary parent
		(+ denormalized lateral columns).
	*/
	if (parent && parent.STAdata && typeof deapCopy === "function") {
		node.STAdataSource = sebEnrichDataWithLaterals(parent.STAdata, sources);
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
	/* Clear leftover grup_ column bindings before meaning fill */
	for (i = 0; i < (cfg.measurements || []).length; i++) {
		m = cfg.measurements[i];
		if (m && m.resultColumn && !sebIsRealDataColumn(m.resultColumn, sources))
			m.resultColumn = "";
		sebSyncGroupResultColumn(m, sources);
	}
	/* Fill empty props from all sources' attribute definitions (does not overwrite set values) */
	sebApplyAttributeDefinitionsToConfig(cfg, parent, true, sources);
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
	/* Same array: Publisher writes Observation @iot.id back onto the visible super-table */
	node.STAdata = built.preview;
	node.STAdataSource = built.preview;
	node.STAdataAttributes = built.attributes || { _sourceIndex: { type: "integer" } };
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
