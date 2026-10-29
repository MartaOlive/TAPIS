"use strict"

/*
	STA Publisher — publishes staEntityPackage (v2) + long STAdata from STA Entity Builder.

	Pipeline: normalize/dedupe unique entities → resolve/create sequentially (GetObjectId)
	→ create Observations → store pending failures for retry.
*/

/*
	Creation order (dependencies first).
	Campaigns / ObservationGroups order can swap via pkg.nesting.campaignObservationGroup.
	Observations and Relations are created after unique entities (separate pipeline steps).
*/
var SPA_ORDER = ["Parties", "Licenses", "Sensors", "ObservedProperties", "Locations", "FeaturesOfInterest",
	"Things", "Datastreams", "MultiDatastreams", "HistoricalLocations", "Cells", "Campaigns", "ObservationGroups"];
/* [body key, related entity plural, many, optional?, attachAll?]
   optional=true: related entity in batch may be missing/failed without blocking create;
   spaAttachRelations still links it when id is ready.
   attachAll=true: link every ready entity of that plural (e.g. Campaign→Datastreams).
   License is optional for Datastreams/MultiDatastreams/Campaigns/ObservationGroups.
   Location on Thing is optional. Observation requires Datastream (+ FoI when FoIs exist). */
var SPA_RELATIONS = {
	Things: [["Party", "Parties", false], ["Locations", "Locations", true, true]],
	Datastreams: [["Party", "Parties", false], ["Sensor", "Sensors", false], ["Thing", "Things", false],
		["ObservedProperty", "ObservedProperties", false], ["License", "Licenses", false, true]],
	MultiDatastreams: [["Party", "Parties", false], ["Sensor", "Sensors", false], ["Thing", "Things", false],
		["ObservedProperties", "ObservedProperties", true], ["License", "Licenses", false, true]],
	Campaigns: [["Party", "Parties", false], ["License", "Licenses", false, true],
		["Datastreams", "Datastreams", true, true, true],
		["ObservationGroups", "ObservationGroups", true, true, true]],
	ObservationGroups: [["Party", "Parties", false], ["License", "Licenses", false, true],
		["Campaigns", "Campaigns", true, true, true]],
	HistoricalLocations: [["Thing", "Things", false], ["Locations", "Locations", true]]
};

function spaGetNesting(pkg) {
	var n = (pkg && pkg.nesting && typeof pkg.nesting === "object") ? pkg.nesting : {};
	return {
		campaignObservationGroup: n.campaignObservationGroup === "observationGroupFirst"
			? "observationGroupFirst" : "campaignFirst",
		relationObservationGroup: n.relationObservationGroup === "observationGroupFirst"
			? "observationGroupFirst" : "relationFirst"
	};
}

/* Entity resolve order — Campaigns/ObservationGroups swap per nesting. */
function spaEffectiveEntityOrder(pkg) {
	var base = ["Parties", "Licenses", "Sensors", "ObservedProperties", "Locations", "FeaturesOfInterest",
		"Things", "Datastreams", "MultiDatastreams", "HistoricalLocations", "Cells"];
	var nest = spaGetNesting(pkg);
	if (nest.campaignObservationGroup === "observationGroupFirst")
		return base.concat(["ObservationGroups", "Campaigns"]);
	return base.concat(["Campaigns", "ObservationGroups"]);
}

/* Display / preview order including Observations + Relations after entities. */
function spaPublishDisplayOrder(pkg) {
	return spaEffectiveEntityOrder(pkg).concat(["Observations", "Relations"]);
}

function spaEsc(s) {
	return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function getSTAPublisherNodeSafe() {
	if (typeof getNodeDialog !== "function")
		return null;
	try {
		return getNodeDialog("DialogSTAPublisher");
	} catch (err) {
		return null;
	}
}

function getSTAPublisherParent(node) {
	var parents;
	if (!node || typeof GetParentNodes !== "function")
		return null;
	parents = GetParentNodes(node);
	return parents && parents[0] ? parents[0] : null;
}

function spaIsEmpty(v) {
	return v === null || v === undefined || String(v).trim() === "";
}

function spaResolveSrc(src, rec) {
	var v, t;
	if (!src)
		return undefined;
	v = src.source === "column" ? (rec ? rec[src.column] : undefined) : src.value;
	if (spaIsEmpty(v))
		return undefined;
	if (typeof v === "string" && src.dataType === "JSON") {
		t = v.trim();
		if ((t.charAt(0) === "{" && t.charAt(t.length - 1) === "}") || (t.charAt(0) === "[" && t.charAt(t.length - 1) === "]")) {
			try {
				return JSON.parse(t);
			} catch (e) {
				return v;
			}
		}
	}
	return v;
}

function spaNormalizeId(v) {
	var s;
	if (spaIsEmpty(v))
		return null;
	s = String(v).trim();
	return /^-?\d+$/.test(s) && String(Number(s)) === s ? Number(s) : s;
}

function spaResolveId(ent, rec) {
	var id;
	if (!ent)
		return null;
	if (ent.id) {
		id = spaNormalizeId(spaResolveSrc(ent.id, rec));
		if (!spaIsEmpty(id))
			return id;
	}
	/* Package from Builder may expose existingId without a resolvable id source */
	if (!spaIsEmpty(ent.existingId))
		return spaNormalizeId(ent.existingId);
	return null;
}

function spaSetStatus(html, isError) {
	var el = document.getElementById("DialogSTAPublisherStatus");
	if (!el)
		return;
	el.className = "spaStatus" + (isError ? " spaError" : " spaOk");
	el.innerHTML = html;
}

function spaAppendLog(line) {
	var el = document.getElementById("DialogSTAPublisherLog");
	if (!el)
		return;
	el.textContent += line + "\n";
	el.scrollTop = el.scrollHeight;
}

function spaServiceUrl(url) {
	if (url && typeof getSTAURLRoot === "function")
		url = getSTAURLRoot(url);
	return url ? String(url).replace(/\/+$/, "") : url;
}

function spaIsLoggedIn() {
	try {
		return !!(typeof CriptoName !== "undefined" && CriptoName &&
			typeof hello === "function" &&
			hello("authenix").getAuthResponse() &&
			hello("authenix").getAuthResponse().access_token);
	} catch (err) {
		return false;
	}
}

/* Normalize location/feature to GeoJSON Point { type:"Point", coordinates:[lon,lat] }. */
function spaParseGeoPoint(v) {
	var geom, t;
	if (v === undefined || v === null || v === "")
		return null;
	if (typeof v === "string") {
		t = v.trim();
		if ((t.charAt(0) === "{" && t.charAt(t.length - 1) === "}") || (t.charAt(0) === "[" && t.charAt(t.length - 1) === "]")) {
			try {
				v = JSON.parse(t);
			} catch (e) {
				return null;
			}
		} else
			return null;
	}
	if (typeof v !== "object")
		return null;
	geom = v;
	if (geom.type === "Feature" && geom.geometry)
		geom = geom.geometry;
	if (geom.type === "Point" && geom.coordinates && geom.coordinates.length >= 2)
		return { type: "Point", coordinates: [Number(geom.coordinates[0]), Number(geom.coordinates[1])] };
	return null;
}

function spaBuildBody(plural, ent, rec) {
	var body = {}, props = ent.properties || {}, name, v, lon, lat, sub, geoName, point;
	for (name in props) {
		if (!Object.prototype.hasOwnProperty.call(props, name))
			continue;
		v = spaResolveSrc(props[name], rec);
		if (v === undefined)
			continue;
		if (name.indexOf("unitOfMeasurement.") === 0) {
			sub = name.substring(name.indexOf(".") + 1);
			body.unitOfMeasurement = body.unitOfMeasurement || {};
			body.unitOfMeasurement[sub] = v;
		} else if (name === "longitude")
			lon = Number(v);
		else if (name === "latitude")
			lat = Number(v);
		else if (name === "location" || name === "feature") {
			point = spaParseGeoPoint(v);
			body[name] = point || v;
		} else
			body[name] = v;
	}
	if (plural === "Locations" || plural === "FeaturesOfInterest") {
		if (!body.encodingType)
			body.encodingType = "application/geo+json";
		geoName = plural === "Locations" ? "location" : "feature";
		/* Prefer explicit location/feature; else legacy lon/lat → Point for both */
		if (!spaParseGeoPoint(body[geoName]) && (lon !== undefined || lat !== undefined) &&
				isFinite(lon) && isFinite(lat)) {
			body[geoName] = { type: "Point", coordinates: [lon, lat] };
		} else if (body[geoName]) {
			point = spaParseGeoPoint(body[geoName]);
			if (point)
				body[geoName] = point;
		}
	}
	return body;
}

function spaFindRelated(pkg, plural, measurementKey) {
	var arr = pkg.entities ? pkg.entities[plural] : null, i;
	if (!arr || !arr.length)
		return null;
	for (i = 0; i < arr.length; i++) {
		if (measurementKey !== undefined && arr[i].measurementKey === measurementKey)
			return arr[i];
	}
	for (i = 0; i < arr.length; i++) {
		if (arr[i].measurementKey === undefined)
			return arr[i];
	}
	return arr[0];
}

function spaPropVal(ent, propName, rec) {
	if (!ent || !ent.properties || !ent.properties[propName])
		return undefined;
	return spaResolveSrc(ent.properties[propName], rec);
}

/*
	Plurals that expand over source rows (unique by content).
	Others stay 1-per-template (role / measurementKey).
*/
/* Datastreams / OP stay 1-per-group (template), not per Thing/row */
var SPA_EXPAND_BY_ROW = {
	Locations: true,
	FeaturesOfInterest: true,
	Things: true,
	Sensors: true
};

function spaExpandByRow(plural) {
	return !!(SPA_EXPAND_BY_ROW[plural]);
}

/* Stable identity key for dedupe (not body JSON). */
function spaEntityStableKey(plural, ent, rec, pkg) {
	var def, name, lon, lat, auth, uom, role, point;
	if (!ent)
		return plural + "|unknown";
	role = ent.role ? String(ent.role) : "";
	/*
		Role short-circuit only for non-expand plurals (OP, License, …).
		Expand-by-row must key by content so 3 cameras / 3 places become 3 entities.
	*/
	if (!spaExpandByRow(plural) && role && role !== plural && role.indexOf(":") !== -1)
		return role;
	switch (plural) {
		case "Parties":
			auth = spaPropVal(ent, "authId", rec);
			return "Parties|" + (auth != null ? auth : (typeof CriptoName !== "undefined" ? CriptoName : "party"));
		case "Licenses":
			def = spaPropVal(ent, "definition", rec);
			return "Licenses|" + (def != null ? def : spaPropVal(ent, "name", rec) || "license");
		case "ObservedProperties":
			def = spaPropVal(ent, "definition", rec);
			return "ObservedProperties|" + (def != null ? def : (ent.measurementKey || spaPropVal(ent, "name", rec) || "op"));
		case "Sensors":
			name = spaPropVal(ent, "name", rec);
			return "Sensors|" + (name != null && String(name) !== "" ? name : (role || "sensor"));
		case "Things":
			name = spaPropVal(ent, "name", rec);
			return "Things|" + (name != null && String(name) !== "" ? name : "thing");
		case "Locations":
		case "FeaturesOfInterest":
			lon = spaPropVal(ent, "longitude", rec);
			lat = spaPropVal(ent, "latitude", rec);
			if (lon == null || lat == null || !isFinite(Number(lon)) || !isFinite(Number(lat))) {
				point = spaParseGeoPoint(spaPropVal(ent, plural === "Locations" ? "location" : "feature", rec));
				if (point && point.coordinates) {
					lon = point.coordinates[0];
					lat = point.coordinates[1];
				}
			}
			if (lon != null && lat != null && isFinite(Number(lon)) && isFinite(Number(lat)))
				return plural + "|" + Number(lon) + "," + Number(lat);
			name = spaPropVal(ent, "name", rec);
			return plural + "|" + (name != null && String(name) !== "" ? name : "place");
		case "Datastreams":
			/* One Datastream per observation group (template), not per Thing/row */
			if (ent.measurementKey)
				return "Datastreams:" + ent.measurementKey;
			if (role && role !== plural && role.indexOf(":") !== -1)
				return role;
			uom = spaPropVal(ent, "unitOfMeasurement.definition", rec);
			name = spaPropVal(ent, "name", rec);
			return "Datastreams|" + (name || "ds") + (uom != null ? "|" + uom : "");
		default:
			if (role && role !== plural && role.indexOf(":") !== -1)
				return role;
			uom = spaPropVal(ent, "unitOfMeasurement.definition", rec);
			name = spaPropVal(ent, "name", rec);
			return plural + "|" + (ent.measurementKey || name || role || "x") + (uom != null ? "|" + uom : "");
	}
}

function spaSampleRecForEntity(ent, obsRows, sourceData) {
	var i, row, idx;
	if (!obsRows || !obsRows.length)
		return (sourceData && sourceData[0]) || {};
	if (ent.measurementKey) {
		for (i = 0; i < obsRows.length; i++) {
			row = obsRows[i];
			if (row && row.measurementKey === ent.measurementKey) {
				idx = row._sourceIndex;
				if (sourceData && idx != null && sourceData[idx])
					return sourceData[idx];
				return row;
			}
		}
	}
	row = obsRows[0];
	idx = row && row._sourceIndex;
	if (sourceData && idx != null && sourceData[idx])
		return sourceData[idx];
	return row || {};
}

/* Source rows to expand a template over (group-filtered when measurementKey set). */
function spaCollectSourceRecs(ent, plural, obsRows, sourceData) {
	var out = [], seenIdx = {}, i, row, idx;
	if (!spaExpandByRow(plural)) {
		out.push(spaSampleRecForEntity(ent, obsRows, sourceData) || {});
		return out;
	}
	if (!sourceData || !sourceData.length) {
		out.push(spaSampleRecForEntity(ent, obsRows, sourceData) || {});
		return out;
	}
	for (i = 0; i < (obsRows || []).length; i++) {
		row = obsRows[i];
		if (!row)
			continue;
		if (ent.measurementKey != null && ent.measurementKey !== "" && row.measurementKey !== ent.measurementKey)
			continue;
		idx = row._sourceIndex;
		if (idx == null || seenIdx[idx])
			continue;
		seenIdx[idx] = true;
		if (sourceData[idx])
			out.push(sourceData[idx]);
	}
	if (out.length)
		return out;
	for (i = 0; i < sourceData.length; i++) {
		if (sourceData[i])
			out.push(sourceData[i]);
	}
	if (!out.length)
		out.push({});
	return out;
}

function spaAddEntityInstance(entities, plural, ent, rec, pkg) {
	var key = spaEntityStableKey(plural, ent, rec, pkg);
	if (entities[key])
		return entities[key];
	entities[key] = {
		key: key,
		plural: plural,
		singular: ent.singular || (typeof STAEntities !== "undefined" && STAEntities[plural] ? STAEntities[plural].singular : plural),
		role: ent.role || plural,
		measurementKey: ent.measurementKey,
		ent: ent,
		rec: rec,
		status: "pending",
		id: null,
		error: null
	};
	return entities[key];
}

/*
	Normalize long STAdata + package → unique entities + observation list.
	Expand-by-row templates yield one instance per distinct content key.
*/
function spaNormalizeBatch(pkg, obsRows, sourceData) {
	var entities = {}, observations = [], plural, arr, i, j, ent, key, rec, o, foiEnt, dsEnt, recs, nEnt;

	if (!pkg)
		return { entities: {}, observations: [], entityCount: 0 };

	for (plural in (pkg.entities || {})) {
		if (!Object.prototype.hasOwnProperty.call(pkg.entities, plural))
			continue;
		/* Long-table Observations only — ignore legacy packed Observation entities */
		if (plural === "Observations")
			continue;
		arr = pkg.entities[plural] || [];
		for (i = 0; i < arr.length; i++) {
			ent = arr[i];
			if (!ent)
				continue;
			recs = spaCollectSourceRecs(ent, plural, obsRows, sourceData);
			for (j = 0; j < recs.length; j++)
				spaAddEntityInstance(entities, plural, ent, recs[j], pkg);
		}
	}

	/* Ensure a single Party (login). Do not add a second if the package already has one. */
	(function () {
		var hasParty = false, k2, keep = null, auth;
		for (k2 in entities) {
			if (!Object.prototype.hasOwnProperty.call(entities, k2))
				continue;
			if (entities[k2].plural !== "Parties")
				continue;
			hasParty = true;
			if (!keep)
				keep = k2;
			else {
				/* Collapse duplicates — keep the first, drop the rest */
				delete entities[k2];
			}
		}
		if (hasParty)
			return;
		auth = typeof CriptoName !== "undefined" ? CriptoName : "party";
		key = "Parties|" + auth;
		entities[key] = {
			key: key,
			plural: "Parties",
			singular: "Party",
			role: "Parties",
			measurementKey: undefined,
			ent: { plural: "Parties", singular: "Party", role: "Parties", properties: { authId: { source: "manual", value: auth === "party" ? "" : auth } } },
			rec: {},
			status: "pending",
			id: null,
			error: null
		};
	})();

	for (i = 0; i < (obsRows || []).length; i++) {
		o = obsRows[i];
		if (!o)
			continue;
		rec = (sourceData && o._sourceIndex != null && sourceData[o._sourceIndex])
			? sourceData[o._sourceIndex]
			: (o || {});
		foiEnt = spaFindRelated(pkg, "FeaturesOfInterest", o.measurementKey || undefined);
		dsEnt = spaFindRelated(pkg, "Datastreams", o.measurementKey || undefined);
		/* Preserve id columns from long table so spaObsIdFromTable can reuse them */
		(function () {
			var col = spaObsIdColumn(pkg, o.measurementKey), row = {
				index: i,
				phenomenonTime: o.phenomenonTime,
				resultTime: o.resultTime != null ? o.resultTime : o.phenomenonTime,
				result: o.result,
				measurementKey: o.measurementKey || "",
				groupLabel: o.groupLabel || spaGroupLabelFromPkg(pkg, o.measurementKey) || "",
				datastreamRole: o.datastreamRole || ("Datastreams:" + (o.measurementKey || "")),
				foiRole: foiEnt ? foiEnt.role : "FeaturesOfInterest",
				datastreamKey: dsEnt ? spaEntityStableKey("Datastreams", dsEnt, rec, pkg) : null,
				foiKey: foiEnt ? spaEntityStableKey("FeaturesOfInterest", foiEnt, rec, pkg) : null,
				_sourceIndex: o._sourceIndex,
				status: "pending",
				observationId: null,
				error: null
			};
			if (col && o[col] !== undefined)
				row[col] = o[col];
			if (o["@iot.id"] !== undefined)
				row["@iot.id"] = o["@iot.id"];
			if (o.observationId !== undefined)
				row.observationId = o.observationId;
			observations.push(row);
		})();
	}

	nEnt = 0;
	for (key in entities) {
		if (Object.prototype.hasOwnProperty.call(entities, key))
			nEnt++;
	}
	return {
		entities: entities,
		observations: observations,
		relations: spaBuildRelationPlans(pkg, observations),
		entityCount: nEnt,
		pkg: pkg
	};
}

/*
	One Relation per source row: Subject = obs of subjectGroup, Object = obs of objectGroup.
	Created after Observations have @iot.id.
*/
function spaBuildRelationPlans(pkg, observations) {
	var stub = pkg && pkg.relationStub, plans = [], bySrc = {}, i, o, idx, pair, sk, ok, labelSubj, labelObj;
	if (!stub || !stub.enabled)
		return plans;
	sk = stub.subjectGroupKey;
	ok = stub.objectGroupKey;
	if (!sk || !ok || sk === ok)
		return plans;
	labelSubj = spaGroupLabelFromPkg(pkg, sk) || sk;
	labelObj = spaGroupLabelFromPkg(pkg, ok) || ok;
	for (i = 0; i < (observations || []).length; i++) {
		o = observations[i];
		if (!o || o._sourceIndex == null)
			continue;
		idx = o._sourceIndex;
		if (!bySrc[idx])
			bySrc[idx] = {};
		if (o.measurementKey === sk)
			bySrc[idx].subject = o;
		if (o.measurementKey === ok)
			bySrc[idx].object = o;
	}
	for (idx in bySrc) {
		if (!Object.prototype.hasOwnProperty.call(bySrc, idx))
			continue;
		pair = bySrc[idx];
		if (!pair.subject || !pair.object)
			continue;
		plans.push({
			index: plans.length,
			sourceIndex: Number(idx),
			role: stub.role || "",
			description: stub.description || "",
			subjectObsIndex: pair.subject.index,
			objectObsIndex: pair.object.index,
			subjectGroupKey: sk,
			objectGroupKey: ok,
			subjectLabel: spaIsSyntheticGroupKey(labelSubj) ? "" : labelSubj,
			objectLabel: spaIsSyntheticGroupKey(labelObj) ? "" : labelObj,
			status: "pending",
			relationId: null,
			error: null
		});
	}
	return plans;
}

function spaRegistryGet(cache, key) {
	if (!cache || !key)
		return null;
	return cache[key] != null ? cache[key] : null;
}

function spaRegistrySet(cache, key, id) {
	if (!cache || !key || spaIsEmpty(id))
		return;
	cache[key] = id;
}

function spaFindEntityByRole(entities, role) {
	var k;
	for (k in entities) {
		if (Object.prototype.hasOwnProperty.call(entities, k) && entities[k].role === role)
			return entities[k];
	}
	return null;
}

function spaFindEntityByPlural(entities, plural, measurementKey) {
	var k, e, shared = null;
	for (k in entities) {
		if (!Object.prototype.hasOwnProperty.call(entities, k))
			continue;
		e = entities[k];
		if (e.plural !== plural)
			continue;
		if (measurementKey !== undefined && e.measurementKey === measurementKey)
			return e;
		if (e.measurementKey === undefined)
			shared = e;
	}
	return shared;
}

/*
	Related instance for the same source row as item (expand-by-row),
	falling back to first match by measurementKey.
*/
function spaFindRelatedForItem(entities, relatedPlural, item, pkg) {
	var template, key;
	if (!entities || !item)
		return null;
	if (pkg) {
		template = spaFindRelated(pkg, relatedPlural, item.measurementKey);
		if (template) {
			key = spaEntityStableKey(relatedPlural, template, item.rec, pkg);
			if (entities[key])
				return entities[key];
		}
	}
	return spaFindEntityByPlural(entities, relatedPlural, item.measurementKey);
}

/* All ready entities of relatedPlural (optionally same measurementKey). */
function spaFindAllRelatedForItem(entities, relatedPlural, item, pkg, attachAll) {
	var out = [], k, e, one;
	if (!entities)
		return out;
	if (attachAll) {
		for (k in entities) {
			if (!Object.prototype.hasOwnProperty.call(entities, k))
				continue;
			e = entities[k];
			if (e.plural === relatedPlural && spaEntityReady(e))
				out.push(e);
		}
		return out;
	}
	one = spaFindRelatedForItem(entities, relatedPlural, item, pkg);
	if (one && spaEntityReady(one))
		out.push(one);
	return out;
}

function spaAttachRelations(body, plural, item, entities, partyId, pkg) {
	var rels = SPA_RELATIONS[plural] || [], i, rel, related, list, relId, j, refs;
	for (i = 0; i < rels.length; i++) {
		rel = rels[i];
		if (rel[1] === "Parties") {
			relId = partyId;
			if (!spaIsEmpty(relId))
				body[rel[0]] = { "@iot.id": relId };
			continue;
		}
		if (rel[2]) {
			/* many: attachAll → every ready entity of that plural; else one match */
			list = spaFindAllRelatedForItem(entities, rel[1], item, pkg, !!rel[4]);
			if (!list.length)
				continue;
			refs = [];
			for (j = 0; j < list.length; j++)
				refs.push({ "@iot.id": list[j].id });
			body[rel[0]] = refs;
			continue;
		}
		related = spaFindRelatedForItem(entities, rel[1], item, pkg);
		if (!related || spaIsEmpty(related.id))
			continue;
		body[rel[0]] = { "@iot.id": related.id };
	}
	return body;
}

/* OData string literal escape (single quotes doubled). */
function spaODataStr(s) {
	return String(s == null ? "" : s).replace(/'/g, "''");
}

function spaIsCreateForbiddenStatus(status) {
	return status === 401 || status === 403 || status === 405 || status === 501;
}

/*
	Lookup an existing License by definition (preferred) or name.
	Many STA services expose Licenses but forbid POST create.
*/
async function spaLookupLicense(url, definition, name) {
	var filter, response, id;

	if (!spaIsEmpty(definition)) {
		filter = "definition eq '" + spaODataStr(definition) + "'";
		response = await HTTPJSONData(url + "/Licenses?$top=1&$filter=" + encodeURIComponent(filter));
		if (response && response.ok && response.obj && response.obj.value && response.obj.value.length) {
			id = response.obj.value[0]["@iot.id"];
			if (!spaIsEmpty(id))
				return { id: id, match: "definition" };
		}
	}
	if (!spaIsEmpty(name)) {
		filter = "name eq '" + spaODataStr(name) + "'";
		response = await HTTPJSONData(url + "/Licenses?$top=1&$filter=" + encodeURIComponent(filter));
		if (response && response.ok && response.obj && response.obj.value && response.obj.value.length) {
			id = response.obj.value[0]["@iot.id"];
			if (!spaIsEmpty(id))
				return { id: id, match: "name" };
		}
	}
	return null;
}

async function spaFinishLicenseResolve(ctx, item, id, body, patch, logSuffix) {
	var response;
	if (patch && Object.keys(patch).length) {
		response = await HTTPJSONData(ctx.url + "/Licenses" + getParentesisODataFromId(id), null, "PATCH", patch);
		if (response && !response.ok)
			spaAppendLog("WARN License @" + id + ": could not PATCH logo (License id kept).");
	}
	item.id = id;
	item.status = "done";
	spaRegistrySet(ctx.cache, item.key, id);
	spaUpdatePreviewEntityId(item.key, id);
	spaAppendLog("License" + (body && body.name ? " " + body.name : "") + " @" + id + (logSuffix || ""));
	return id;
}

/*
	Resolve one unique entity: cache → reuse id → GetObjectId/GetPartyId.
	Licenses: lookup-by-definition/name first (create often forbidden on STA services).
*/
async function spaResolveUniqueEntity(ctx, item) {
	var plural = item.plural, cached, id, body, patch, response, found, status, hint, got;

	item.status = "checking";
	/* Already confirmed on this item — no network */
	if (!spaIsEmpty(item.id)) {
		item.status = "done";
		spaRegistrySet(ctx.cache, item.key, item.id);
		if (plural === "Parties")
			ctx.partyId = item.id;
		spaUpdatePreviewEntityId(item.key, item.id);
		spaAppendLog(item.singular + " reuse @" + item.id);
		return item.id;
	}

	cached = spaRegistryGet(ctx.cache, item.key);
	if (!spaIsEmpty(cached)) {
		item.id = cached;
		item.status = "done";
		if (plural === "Parties")
			ctx.partyId = cached;
		spaUpdatePreviewEntityId(item.key, cached);
		spaAppendLog(item.singular + " cache @" + cached + " (" + item.key + ")");
		return item.id;
	}

	id = spaResolveId(item.ent, item.rec);
	if (!spaIsEmpty(id)) {
		item.id = id;
		item.status = "done";
		spaRegistrySet(ctx.cache, item.key, id);
		if (plural === "Parties")
			ctx.partyId = id;
		spaUpdatePreviewEntityId(item.key, id);
		spaAppendLog(item.singular + " reuse @" + id);
		return id;
	}

	if (plural === "Parties") {
		item.status = "creating";
		id = await GetPartyId(ctx.url, typeof CriptoName !== "undefined" ? CriptoName : "");
		if (spaIsEmpty(id)) {
			item.status = "error";
			item.error = "Could not get or create Party.";
			return null;
		}
		item.id = id;
		item.status = "done";
		spaRegistrySet(ctx.cache, item.key, id);
		ctx.partyId = id;
		spaUpdatePreviewEntityId(item.key, id);
		spaAppendLog("Party @" + id);
		return id;
	}

	item.status = "creating";
	body = spaBuildBody(plural, item.ent, item.rec);
	spaAttachRelations(body, plural, item, ctx.entities, ctx.partyId, ctx.pkg);

	if (plural === "Licenses") {
		/* logo often breaks $filter / create; set via PATCH after id is known.
		   Keep attributionText on create — STA+ commonly requires it. */
		patch = {};
		if (body.logo !== undefined) {
			patch.logo = body.logo;
			delete body.logo;
		}

		/* 1) Query existing License (definition, then name) — prefer reuse over POST */
		try {
			found = await spaLookupLicense(ctx.url, body.definition, body.name);
		} catch (err) {
			spaAppendLog("WARN License lookup failed: " + (err && err.message ? err.message : String(err)));
			found = null;
		}
		if (found && !spaIsEmpty(found.id))
			return await spaFinishLicenseResolve(ctx, item, found.id, body, patch,
				" (existing, matched by " + found.match + ")");

		/* 2) No match — try create (may be forbidden on this service) */
		response = await HTTPJSONData(ctx.url + "/Licenses", ["Location"], "POST", body);
		if (response && response.ok) {
			id = typeof ExtractIdFromURL === "function"
				? ExtractIdFromURL(response.responseHeaders && response.responseHeaders["Location"])
				: null;
			if (!spaIsEmpty(id))
				return await spaFinishLicenseResolve(ctx, item, id, body, patch, " (created)");
		}

		status = response ? response.status : 0;
		hint = body.definition
			? " Ensure a License with definition '" + body.definition + "' exists on the service, or set @iot.id on the License entity."
			: " Ensure the License exists on the service, or set @iot.id on the License entity.";
		item.status = "error";
		if (spaIsCreateForbiddenStatus(status)) {
			item.error = "License create not allowed on this service (HTTP " + status + ")." + hint;
		} else if (status) {
			item.error = "Could not create License (HTTP " + status + ")." + hint;
		} else {
			item.error = "Could not create License." + hint;
		}
		spaAppendLog("ERROR " + item.error);
		return null;
	}

	try {
		/* MultiDatastreams need special ObservedProperties filter — keep GetObjectId */
		if (plural === "MultiDatastreams") {
			id = await GetObjectId(ctx.url, plural, body);
			if (spaIsEmpty(id)) {
				item.status = "error";
				item.error = "Could not get or create " + item.singular + (body.name ? " " + body.name : "") + ".";
				spaAppendLog("ERROR " + item.error);
				return null;
			}
			item.id = id;
			item.status = "done";
			spaRegistrySet(ctx.cache, item.key, id);
			spaUpdatePreviewEntityId(item.key, id);
			spaAppendLog(item.singular + (body.name ? " " + body.name : "") + " @" + id);
			return id;
		}
		/* Filter by all characteristics; POST only if missing. Table @iot.id already handled above. */
		got = await spaGetOrCreate(ctx.url, plural, body);
		id = got && got.id;
	} catch (err) {
		item.status = "error";
		item.error = err && err.message ? err.message : String(err);
		spaAppendLog("ERROR " + item.singular + ": " + item.error);
		return null;
	}

	if (spaIsEmpty(id)) {
		item.status = "error";
		item.error = "Could not get or create " + item.singular + (body.name ? " " + body.name : "") + ".";
		spaAppendLog("ERROR " + item.error);
		return null;
	}

	item.id = id;
	item.status = "done";
	spaRegistrySet(ctx.cache, item.key, id);
	spaUpdatePreviewEntityId(item.key, id);
	spaAppendLog(item.singular + (body.name ? " " + body.name : "") +
		(got && got.existing ? " existing @" : " created @") + id);
	return id;
}

function spaEntityReady(item) {
	return item && item.status === "done" && !spaIsEmpty(item.id);
}

function spaCanResolveEntity(item, entities, partyId, pkg) {
	var rels = SPA_RELATIONS[item.plural] || [], i, rel, related, optional;
	for (i = 0; i < rels.length; i++) {
		rel = rels[i];
		optional = !!rel[3];
		if (rel[1] === "Parties") {
			if (spaIsEmpty(partyId))
				return false;
			continue;
		}
		related = spaFindRelatedForItem(entities, rel[1], item, pkg);
		if (!related)
			continue;
		/* Optional: never block; attach only when ready */
		if (optional)
			continue;
		/* Required: if present in batch but not done → block */
		if (!spaEntityReady(related))
			return false;
	}
	return true;
}

async function spaResolveAllEntities(ctx) {
	var oi, plural, i, item, progressed, guard = 0, pendingDeps;
	var order = spaEffectiveEntityOrder(ctx.pkg);

	/* Parties first */
	for (i in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, i))
			continue;
		if (ctx.entities[i].plural === "Parties" && ctx.entities[i].status === "pending")
			await spaResolveUniqueEntity(ctx, ctx.entities[i]);
	}

	while (guard++ < 500) {
		progressed = false;
		pendingDeps = false;
		for (oi = 0; oi < order.length; oi++) {
			plural = order[oi];
			if (plural === "Parties")
				continue;
			for (i in ctx.entities) {
				if (!Object.prototype.hasOwnProperty.call(ctx.entities, i))
					continue;
				item = ctx.entities[i];
				if (item.plural !== plural || item.status !== "pending")
					continue;
				if (!spaCanResolveEntity(item, ctx.entities, ctx.partyId, ctx.pkg)) {
					pendingDeps = true;
					continue;
				}
				await spaResolveUniqueEntity(ctx, item);
				progressed = true;
			}
		}
		if (!progressed)
			break;
	}

	/* Mark remaining pending as blocked */
	for (i in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, i))
			continue;
		item = ctx.entities[i];
		if (item.status === "pending") {
			item.status = "error";
			item.error = "Blocked: unresolved dependency.";
			spaAppendLog("SKIP " + item.singular + " (" + item.key + "): " + item.error);
		}
	}
}

function spaBatchHasPlural(entities, plural) {
	var k;
	for (k in entities) {
		if (Object.prototype.hasOwnProperty.call(entities, k) && entities[k].plural === plural)
			return true;
	}
	return false;
}

function spaObsIdColumn(pkg, measurementKey) {
	var bindings = pkg && pkg.observations && pkg.observations.bindings, i, b;
	if (!bindings)
		return null;
	for (i = 0; i < bindings.length; i++) {
		b = bindings[i];
		if (!b || !b.idColumn)
			continue;
		if (measurementKey === undefined || measurementKey === "" || b.measurementKey === measurementKey)
			return b.idColumn;
	}
	return null;
}

/*
	Id already present on the observation / wide-table column → reuse, no STA lookup.
	Checks observationId, @iot.id, and the group's Observations.@iot.id column.
*/
function spaObsIdFromTable(o, pkg) {
	var col, id;
	if (!o)
		return null;
	if (!spaIsEmpty(o.observationId) && o.observationId !== "(previous)")
		return spaNormalizeId(o.observationId);
	if (!spaIsEmpty(o["@iot.id"]))
		return spaNormalizeId(o["@iot.id"]);
	col = spaObsIdColumn(pkg, o.measurementKey);
	if (col && !spaIsEmpty(o[col]))
		return spaNormalizeId(o[col]);
	return null;
}

function spaWriteObsIdToRow(o, pkg, id, sourceData) {
	var col, wideRow;
	if (!o || spaIsEmpty(id))
		return;
	o.observationId = id;
	o["@iot.id"] = id;
	col = spaObsIdColumn(pkg, o.measurementKey);
	if (col)
		o[col] = id;
	/* Mirror onto wide super-table row so Relations / republish see the id */
	if (col && sourceData && o._sourceIndex != null && sourceData[o._sourceIndex]) {
		wideRow = sourceData[o._sourceIndex];
		wideRow[col] = id;
	}
}

/*
	Lookup by $filter on all body properties (AddKeysToFilter), then POST if missing.
	If body already has @iot.id → return it without any request.
*/
async function spaFilterFindId(url, plural, body) {
	var filter, response, data, id;
	if (!url || !plural || !body)
		return null;
	if (!spaIsEmpty(body["@iot.id"]))
		return spaNormalizeId(body["@iot.id"]);
	if (typeof AddKeysToFilter !== "function")
		return null;
	filter = AddKeysToFilter("", body);
	if (!filter)
		return null;
	response = await HTTPJSONData(url + "/" + plural + "?$top=1&$filter=" + encodeURIComponent(filter));
	if (!(response && response.ok && response.obj))
		return null;
	data = response.obj;
	if (data.value && data.value.length) {
		id = data.value[0]["@iot.id"];
		return spaIsEmpty(id) ? null : id;
	}
	return null;
}

async function spaPostEntity(url, plural, body) {
	var response, id, loc;
	response = await HTTPJSONData(url + "/" + plural, ["Location"], "POST", body);
	if (response && response.ok) {
		loc = response.responseHeaders && (response.responseHeaders.Location || response.responseHeaders.location);
		if (typeof ExtractIdFromURL === "function" && !spaIsEmpty(loc))
			id = ExtractIdFromURL(loc);
		if (spaIsEmpty(id) && response.obj && response.obj["@iot.id"] != null)
			id = response.obj["@iot.id"];
		return id;
	}
	throw {
		name: "STA",
		message: (response && response.status ? ("HTTP " + response.status) : (plural + " POST failed")) +
			(response && response.obj && response.obj.message ? (": " + response.obj.message) : "")
	};
}

/* Returns { id, existing, fromTable }. existing=true → no POST. */
async function spaGetOrCreate(url, plural, body) {
	var id;
	if (!body)
		return { id: null, existing: false, fromTable: false };
	if (!spaIsEmpty(body["@iot.id"]))
		return { id: spaNormalizeId(body["@iot.id"]), existing: true, fromTable: true };
	try {
		id = await spaFilterFindId(url, plural, body);
	} catch (err) {
		spaAppendLog("WARN " + plural + " filter: " + (err && err.message ? err.message : String(err)));
		id = null;
	}
	if (!spaIsEmpty(id))
		return { id: id, existing: true, fromTable: false };
	id = await spaPostEntity(url, plural, body);
	return { id: id, existing: false, fromTable: false };
}

async function spaCreateObservations(ctx) {
	var nOk = 0, nFail = 0, results = [], i, o, ds, foi, dsId, foiId, body, obsId, pt, rt, got, fromTable;
	var requireFoi = spaBatchHasPlural(ctx.entities, "FeaturesOfInterest");

	for (i = 0; i < ctx.observations.length; i++) {
		o = ctx.observations[i];
		/* Skip already-ok from a prior run (retry); do not re-POST */
		if (o.status === "done")
			continue;

		/* Id already on the table → reuse, no filter / POST */
		fromTable = spaObsIdFromTable(o, ctx.pkg);
		if (!spaIsEmpty(fromTable)) {
			o.status = "done";
			spaWriteObsIdToRow(o, ctx.pkg, fromTable, ctx.sourceData);
			spaUpdatePreviewObservationId(o.index, fromTable);
			nOk++;
			spaAppendLog("Observation[" + o.index + "] reuse @" + fromTable + " (from table)");
			continue;
		}

		/* Prefer per-row keys (expand-by-row); fall back to role / measurementKey */
		ds = (o.datastreamKey && ctx.entities[o.datastreamKey]) ||
			spaFindEntityByRole(ctx.entities, o.datastreamRole) ||
			spaFindEntityByPlural(ctx.entities, "Datastreams", o.measurementKey || undefined);
		foi = (o.foiKey && ctx.entities[o.foiKey]) ||
			spaFindEntityByRole(ctx.entities, o.foiRole) ||
			spaFindEntityByPlural(ctx.entities, "FeaturesOfInterest", o.measurementKey || undefined);
		dsId = ds && spaEntityReady(ds) ? ds.id : null;
		foiId = foi && spaEntityReady(foi) ? foi.id : null;
		pt = o.phenomenonTime;
		rt = o.resultTime != null ? o.resultTime : pt;

		if (spaIsEmpty(dsId) || spaIsEmpty(pt) || o.result === undefined || o.result === null || o.result === "") {
			o.status = "error";
			o.error = spaIsEmpty(dsId) ? "Datastream not resolved." : "Missing phenomenonTime/result.";
			nFail++;
			spaAppendLog("Observation[" + o.index + "] SKIP: " + o.error);
			continue;
		}
		if (requireFoi && spaIsEmpty(foiId)) {
			o.status = "error";
			o.error = "FeatureOfInterest not resolved.";
			nFail++;
			spaAppendLog("Observation[" + o.index + "] SKIP: " + o.error);
			continue;
		}

		o.status = "creating";
		try {
			body = {
				result: o.result,
				resultTime: new Date(rt).toISOString(),
				phenomenonTime: new Date(pt).toISOString(),
				Datastream: { "@iot.id": dsId }
			};
			if (!spaIsEmpty(foiId))
				body.FeatureOfInterest = { "@iot.id": foiId };
			got = await spaGetOrCreate(ctx.url, "Observations", body);
			obsId = got && got.id;
			if (spaIsEmpty(obsId)) {
				o.status = "error";
				o.error = "Observation create returned no id.";
				nFail++;
				spaAppendLog("Observation[" + o.index + "] ERROR: " + o.error);
				continue;
			}
			o.status = "done";
			spaWriteObsIdToRow(o, ctx.pkg, obsId, ctx.sourceData);
			o.datastreamId = dsId;
			spaUpdatePreviewObservationId(o.index, obsId);
			nOk++;
			spaAppendLog("Observation[" + o.index + "] " + (got.existing ? "existing" : "created") +
				" @" + obsId);
			results.push({
				phenomenonTime: pt,
				result: o.result,
				datastreamId: dsId,
				observationId: obsId,
				measurementKey: o.measurementKey || ""
			});
		} catch (err) {
			o.status = "error";
			o.error = err && err.message ? err.message : String(err);
			nFail++;
			spaAppendLog("Observation[" + o.index + "] ERROR: " + o.error);
		}
	}
	return { nOk: nOk, nFail: nFail, results: results };
}

/* Lookup Relation by role + Subject + Object (+ description). */
async function spaLookupRelation(url, role, sid, oid, description) {
	var filter, response, id;
	if (spaIsEmpty(role) || spaIsEmpty(sid) || spaIsEmpty(oid))
		return null;
	filter = "role eq '" + spaODataStr(role) + "' and Subject/@iot.id eq " +
		getQueryIdODataFromId(sid) + " and Object/@iot.id eq " + getQueryIdODataFromId(oid);
	if (!spaIsEmpty(description))
		filter += " and description eq '" + spaODataStr(description) + "'";
	response = await HTTPJSONData(url + "/Relations?$top=1&$filter=" + encodeURIComponent(filter));
	if (response && response.ok && response.obj && response.obj.value && response.obj.value.length) {
		id = response.obj.value[0]["@iot.id"];
		return spaIsEmpty(id) ? null : id;
	}
	return null;
}

/* POST Relation (STAplus). Must request Location (same as GetObjectId). */
async function spaPostRelation(url, body) {
	return await spaPostEntity(url, "Relations", body);
}

function spaFindOgIdForGroup(ctx, groupKey) {
	var k, e;
	if (!ctx || !ctx.entities)
		return null;
	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		e = ctx.entities[k];
		if (e.plural !== "ObservationGroups" || !spaEntityReady(e))
			continue;
		if (!groupKey || e.measurementKey === groupKey || e.role === ("ObservationGroups:" + groupKey))
			return e.id;
	}
	/* Shared OG (no measurementKey): first ready */
	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		e = ctx.entities[k];
		if (e.plural === "ObservationGroups" && spaEntityReady(e))
			return e.id;
	}
	return null;
}

function spaCollectReadyOgIds(ctx) {
	var ids = [], k, e;
	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		e = ctx.entities[k];
		if (e.plural === "ObservationGroups" && spaEntityReady(e))
			ids.push(e.id);
	}
	return ids;
}

async function spaPatchEntityNav(url, plural, id, navName, idRefs) {
	var body = {}, response;
	if (spaIsEmpty(id) || !idRefs || !idRefs.length)
		return false;
	body[navName] = idRefs.map(function (rid) { return { "@iot.id": rid }; });
	response = await HTTPJSONData(url + "/" + plural + getParentesisODataFromId(id), null, "PATCH", body);
	return !!(response && response.ok);
}

/*
	After Observations exist: attach them to ObservationGroups (by measurementKey when possible).
*/
async function spaLinkObservationsToGroups(ctx) {
	var byMk = {}, i, o, k, e, refs, n = 0, mk;

	for (i = 0; i < (ctx.observations || []).length; i++) {
		o = ctx.observations[i];
		if (o.status !== "done" || spaIsEmpty(o.observationId) || o.observationId === "(previous)")
			continue;
		mk = o.measurementKey || "";
		if (!byMk[mk])
			byMk[mk] = [];
		byMk[mk].push(o.observationId);
	}
	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		e = ctx.entities[k];
		if (e.plural !== "ObservationGroups" || !spaEntityReady(e))
			continue;
		refs = [];
		if (e.measurementKey && byMk[e.measurementKey])
			refs = byMk[e.measurementKey].slice();
		else {
			/* Shared OG: all observations */
			for (mk in byMk) {
				if (Object.prototype.hasOwnProperty.call(byMk, mk))
					refs = refs.concat(byMk[mk]);
			}
		}
		if (!refs.length)
			continue;
		try {
			if (await spaPatchEntityNav(ctx.url, "ObservationGroups", e.id, "Observations", refs)) {
				n++;
				spaAppendLog("ObservationGroup @" + e.id + ": linked " + refs.length + " Observation(s)");
			} else
				spaAppendLog("WARN ObservationGroup @" + e.id + ": could not link Observations");
		} catch (err) {
			spaAppendLog("WARN ObservationGroup @" + e.id + ": " + (err && err.message ? err.message : String(err)));
		}
	}
	return n;
}

/*
	After Relations: link Relation↔ObservationGroup per nesting.relationObservationGroup.
	relationFirst → PATCH OG with Relations; observationGroupFirst → already on Relation POST.
*/
async function spaLinkRelationsToGroups(ctx) {
	var nest = spaGetNesting(ctx.pkg), relIds = [], i, r, k, e, n = 0;
	if (nest.relationObservationGroup !== "relationFirst")
		return 0;
	if (!spaBatchHasPlural(ctx.entities, "ObservationGroups"))
		return 0;
	for (i = 0; i < (ctx.relations || []).length; i++) {
		r = ctx.relations[i];
		if (r.status === "done" && !spaIsEmpty(r.relationId))
			relIds.push(r.relationId);
	}
	if (!relIds.length)
		return 0;
	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		e = ctx.entities[k];
		if (e.plural !== "ObservationGroups" || !spaEntityReady(e))
			continue;
		try {
			if (await spaPatchEntityNav(ctx.url, "ObservationGroups", e.id, "Relations", relIds)) {
				n++;
				spaAppendLog("ObservationGroup @" + e.id + ": linked " + relIds.length + " Relation(s)");
			} else
				spaAppendLog("WARN ObservationGroup @" + e.id + ": could not link Relations");
		} catch (err) {
			spaAppendLog("WARN ObservationGroup @" + e.id + ": " + (err && err.message ? err.message : String(err)));
		}
	}
	return n;
}

async function spaCreateRelations(ctx) {
	var nOk = 0, nFail = 0, i, r, subj, obj, body, relId, sid, oid;
	var stub = (ctx.pkg && ctx.pkg.relationStub) || {};
	var targetKind = stub.targetKind === "ObservationGroups" ? "ObservationGroups" : "Observations";
	var nest = spaGetNesting(ctx.pkg);
	var ogIds, includeOgOnPost;

	includeOgOnPost = targetKind === "Observations" &&
		spaBatchHasPlural(ctx.entities, "ObservationGroups") &&
		nest.relationObservationGroup === "observationGroupFirst";
	ogIds = includeOgOnPost ? spaCollectReadyOgIds(ctx) : [];

	for (i = 0; i < (ctx.relations || []).length; i++) {
		r = ctx.relations[i];
		if (r.status === "done")
			continue;
		/* Id already on the plan / table → reuse, no filter / POST */
		if (!spaIsEmpty(r.relationId) && r.relationId !== "(previous)") {
			r.status = "done";
			spaUpdatePreviewRelationId(r.index, r.relationId);
			nOk++;
			spaAppendLog("Relation[" + r.index + "] reuse @" + r.relationId + " (from table)");
			continue;
		}
		if (targetKind === "ObservationGroups") {
			sid = spaFindOgIdForGroup(ctx, r.subjectGroupKey);
			oid = spaFindOgIdForGroup(ctx, r.objectGroupKey);
			if (spaIsEmpty(sid) || spaIsEmpty(oid)) {
				r.status = "error";
				r.error = "Subject/Object ObservationGroup ids missing.";
				nFail++;
				spaAppendLog("Relation[" + r.index + "] SKIP: " + r.error);
				continue;
			}
		} else {
			subj = ctx.observations[r.subjectObsIndex];
			obj = ctx.observations[r.objectObsIndex];
			sid = subj && subj.status === "done" ? subj.observationId : null;
			oid = obj && obj.status === "done" ? obj.observationId : null;
			if (spaIsEmpty(sid) || sid === "(previous)" || spaIsEmpty(oid) || oid === "(previous)") {
				r.status = "error";
				r.error = "Subject/Object Observation ids missing.";
				nFail++;
				spaAppendLog("Relation[" + r.index + "] SKIP: " + r.error);
				continue;
			}
		}
		if (spaIsEmpty(r.role)) {
			r.status = "error";
			r.error = "Relation role (URI) is required.";
			nFail++;
			spaAppendLog("Relation[" + r.index + "] SKIP: " + r.error);
			continue;
		}

		r.status = "creating";
		try {
			body = {
				role: r.role,
				Subject: { "@iot.id": sid },
				Object: { "@iot.id": oid }
			};
			if (!spaIsEmpty(r.description))
				body.description = r.description;
			if (includeOgOnPost && ogIds.length) {
				body.ObservationGroups = ogIds.map(function (id) { return { "@iot.id": id }; });
			}

			/* Prefer existing Relation on the service (filter by characteristics) */
			try {
				relId = await spaLookupRelation(ctx.url, r.role, sid, oid, r.description);
			} catch (lookupErr) {
				spaAppendLog("WARN Relation[" + r.index + "] filter: " +
					(lookupErr && lookupErr.message ? lookupErr.message : String(lookupErr)));
				relId = null;
			}
			if (!spaIsEmpty(relId)) {
				r.status = "done";
				r.relationId = relId;
				r.targetKind = targetKind;
				spaUpdatePreviewRelationId(r.index, relId);
				nOk++;
				spaAppendLog("Relation[" + r.index + "] existing @" + relId +
					" (" + targetKind + " Subject " + sid + " → Object " + oid + ")");
				continue;
			}

			relId = await spaPostRelation(ctx.url, body);
			if (spaIsEmpty(relId)) {
				r.status = "error";
				r.error = "Relation create returned no id.";
				nFail++;
				spaAppendLog("Relation[" + r.index + "] ERROR: " + r.error);
				continue;
			}
			r.status = "done";
			r.relationId = relId;
			r.targetKind = targetKind;
			spaUpdatePreviewRelationId(r.index, relId);
			nOk++;
			spaAppendLog("Relation[" + r.index + "] created @" + relId +
				" (" + targetKind + " Subject " + sid + " → Object " + oid + ")");
		} catch (err) {
			r.status = "error";
			r.error = err && err.message ? err.message : String(err);
			nFail++;
			spaAppendLog("Relation[" + r.index + "] ERROR: " + r.error);
		}
	}
	return { nOk: nOk, nFail: nFail };
}

function spaBuildPending(ctx) {
	var pending = { entities: [], observations: [], relations: [], updatedAt: new Date().toISOString() }, k, item, o, r;
	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		item = ctx.entities[k];
		if (item.status === "error" || item.status === "pending") {
			pending.entities.push({
				key: item.key,
				plural: item.plural,
				role: item.role,
				measurementKey: item.measurementKey,
				ent: item.ent,
				rec: item.rec,
				status: item.status,
				error: item.error
			});
		}
	}
	for (k = 0; k < ctx.observations.length; k++) {
		o = ctx.observations[k];
		if (o.status === "error" || o.status === "pending") {
			pending.observations.push({
				index: o.index,
				phenomenonTime: o.phenomenonTime,
				resultTime: o.resultTime,
				result: o.result,
				measurementKey: o.measurementKey,
				datastreamRole: o.datastreamRole,
				foiRole: o.foiRole,
				datastreamKey: o.datastreamKey,
				foiKey: o.foiKey,
				_sourceIndex: o._sourceIndex,
				status: o.status,
				error: o.error
			});
		}
	}
	for (k = 0; k < (ctx.relations || []).length; k++) {
		r = ctx.relations[k];
		if (r.status === "error" || r.status === "pending") {
			pending.relations.push({
				index: r.index,
				sourceIndex: r.sourceIndex,
				role: r.role,
				description: r.description,
				subjectObsIndex: r.subjectObsIndex,
				objectObsIndex: r.objectObsIndex,
				subjectGroupKey: r.subjectGroupKey,
				objectGroupKey: r.objectGroupKey,
				status: r.status,
				error: r.error
			});
		}
	}
	return pending;
}

/* Bump when normalize/expand rules change so cached preview batches invalidate */
var SPA_NORMALIZE_REV = 7;

function spaComputeBatchFingerprint(pkg, obsRows) {
	var parts = [], plural, arr, i, o, nest;
	if (!pkg)
		return "";
	parts.push("v" + (pkg.version || ""));
	parts.push("nr" + SPA_NORMALIZE_REV);
	parts.push("m" + (pkg.mode || ""));
	nest = spaGetNesting(pkg);
	parts.push("nest:" + nest.campaignObservationGroup + "|" + nest.relationObservationGroup);
	if (pkg.relationStub && pkg.relationStub.enabled)
		parts.push("rel:" + (pkg.relationStub.subjectGroupKey || "") + ">" + (pkg.relationStub.objectGroupKey || "") +
			"|" + (pkg.relationStub.role || "") + "|" + (pkg.relationStub.targetKind || "Observations"));
	for (plural in (pkg.entities || {})) {
		if (!Object.prototype.hasOwnProperty.call(pkg.entities, plural))
			continue;
		arr = pkg.entities[plural] || [];
		for (i = 0; i < arr.length; i++) {
			if (!arr[i])
				continue;
			parts.push(plural + ":" + (arr[i].role || "") + ":" + (arr[i].measurementKey || ""));
		}
	}
	parts.push("nObs:" + (obsRows ? obsRows.length : 0));
	if (obsRows && obsRows.length) {
		o = obsRows[0];
		parts.push("first:" + (o.measurementKey || "") + "|" + (o.phenomenonTime || "") + "|" + (o.result != null ? o.result : ""));
		o = obsRows[obsRows.length - 1];
		parts.push("last:" + (o.measurementKey || "") + "|" + (o.phenomenonTime || "") + "|" + (o.result != null ? o.result : ""));
	}
	return parts.join("\n");
}

function spaApplyCacheToBatch(batch, cache) {
	var k, item, id;
	if (!batch || !batch.entities || !cache)
		return;
	for (k in batch.entities) {
		if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
			continue;
		item = batch.entities[k];
		id = spaRegistryGet(cache, item.key);
		if (!spaIsEmpty(id)) {
			item.id = id;
			item.status = "done";
			item.error = null;
		}
	}
}

function spaFormatPreviewCell(v) {
	if (v === null || v === undefined)
		return "";
	if (typeof v === "object") {
		try {
			return JSON.stringify(v);
		} catch (e) {
			return String(v);
		}
	}
	return String(v);
}

function spaDomIdFromKey(prefix, key) {
	return prefix + String(key).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function spaCountByPlural(batch, pkg) {
	var counts = {}, k, item, oi, order, out = [];
	if (!batch || !batch.entities)
		return out;
	order = spaPublishDisplayOrder(pkg || (batch && batch._pkg) || null);
	for (k in batch.entities) {
		if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
			continue;
		item = batch.entities[k];
		counts[item.plural] = (counts[item.plural] || 0) + 1;
	}
	for (oi = 0; oi < order.length; oi++) {
		if (order[oi] === "Observations") {
			out.push({ plural: "Observations", n: (batch.observations && batch.observations.length) || 0 });
			continue;
		}
		if (order[oi] === "Relations") {
			if (batch.relations && batch.relations.length)
				out.push({ plural: "Relations", n: batch.relations.length });
			continue;
		}
		if (counts[order[oi]])
			out.push({ plural: order[oi], n: counts[order[oi]] });
	}
	for (k in counts) {
		if (!Object.prototype.hasOwnProperty.call(counts, k))
			continue;
		if (order.indexOf(k) === -1)
			out.push({ plural: k, n: counts[k] });
	}
	return out;
}

function spaRenderCounts(batch, pkg) {
	var el = document.getElementById("DialogSTAPublisherCounts"), html = "", list, i;
	if (!el)
		return;
	if (!batch) {
		el.innerHTML = "";
		return;
	}
	list = spaCountByPlural(batch, pkg || batch._pkg);
	html = "<div class=\"spaCountRow\" role=\"list\">";
	for (i = 0; i < list.length; i++) {
		html += "<span class=\"spaCountChip\" role=\"listitem\"><span class=\"spaCountLbl\">" +
			spaEsc(list[i].plural) + "</span><span class=\"spaCountN\">" + list[i].n + "</span></span>";
	}
	html += "</div>";
	el.innerHTML = html;
}

/* Human-readable group title; keep measurementKey internal only */
function spaGroupLabelFromPkg(pkg, measurementKey) {
	var bindings, i, b, arr, plural;
	if (!pkg || measurementKey == null || measurementKey === "")
		return "";
	bindings = pkg.observations && pkg.observations.bindings;
	if (bindings) {
		for (i = 0; i < bindings.length; i++) {
			b = bindings[i];
			if (b && b.measurementKey === measurementKey && b.groupLabel)
				return String(b.groupLabel);
		}
	}
	for (plural in (pkg.entities || {})) {
		if (!Object.prototype.hasOwnProperty.call(pkg.entities, plural))
			continue;
		arr = pkg.entities[plural] || [];
		for (i = 0; i < arr.length; i++) {
			if (arr[i] && arr[i].measurementKey === measurementKey && arr[i].groupLabel)
				return String(arr[i].groupLabel);
		}
	}
	return "";
}

function spaIsSyntheticGroupKey(s) {
	return !!s && /^grup_[a-z0-9]+_\d+$/i.test(String(s));
}

function spaObsGroupDisplayLabel(g, index) {
	var label;
	if (!g)
		return "";
	label = g.groupLabel || g.label;
	if (label && String(label).trim() !== "" && !spaIsSyntheticGroupKey(label))
		return String(label).trim();
	/* Never show synthetic keys (grup_…) — use etiqueta or "Grup N" */
	if (typeof index === "number" && index >= 0)
		return DonaCadena({cat: "Grup", spa: "Grupo", eng: "Group"}) + " " + (index + 1);
	if (g.measurementKey && !spaIsSyntheticGroupKey(g.measurementKey))
		return String(g.measurementKey);
	return DonaCadena({cat: "Grup", spa: "Grupo", eng: "Group"});
}

function spaGroupObservations(observations) {
	var groups = {}, order = [], i, o, mk;
	for (i = 0; i < (observations || []).length; i++) {
		o = observations[i];
		mk = o.measurementKey || "(none)";
		if (!groups[mk]) {
			groups[mk] = {
				measurementKey: mk,
				groupLabel: o.groupLabel || "",
				count: 0,
				rows: []
			};
			order.push(mk);
		}
		if (!groups[mk].groupLabel && o.groupLabel)
			groups[mk].groupLabel = o.groupLabel;
		groups[mk].count++;
		groups[mk].rows.push(o);
	}
	return order.map(function (mk) { return groups[mk]; });
}

function spaEntitiesByPlural(batch, pkg) {
	var byPlural = {}, k, item, oi, plural, list = [], order;
	if (!batch || !batch.entities)
		return list;
	order = spaEffectiveEntityOrder(pkg || batch._pkg || null);
	for (k in batch.entities) {
		if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
			continue;
		item = batch.entities[k];
		if (item.plural === "Observations")
			continue;
		if (!byPlural[item.plural])
			byPlural[item.plural] = [];
		byPlural[item.plural].push(item);
	}
	for (oi = 0; oi < order.length; oi++) {
		plural = order[oi];
		if (byPlural[plural] && byPlural[plural].length)
			list.push({ plural: plural, items: byPlural[plural] });
	}
	for (plural in byPlural) {
		if (!Object.prototype.hasOwnProperty.call(byPlural, plural))
			continue;
		if (order.indexOf(plural) === -1 && byPlural[plural].length)
			list.push({ plural: plural, items: byPlural[plural] });
	}
	return list;
}

function spaCollectBodyColumns(items) {
	var cols = {}, ordered = [], i, body, name, prefer = ["name", "description", "definition", "authId", "encodingType", "metadata"];
	for (i = 0; i < items.length; i++) {
		body = items[i]._previewBody || spaBuildBody(items[i].plural, items[i].ent, items[i].rec);
		items[i]._previewBody = body;
		for (name in body) {
			if (Object.prototype.hasOwnProperty.call(body, name))
				cols[name] = true;
		}
	}
	/* measurementKey stays on batch items for publish matching — not shown in preview columns */
	delete cols.measurementKey;
	for (i = 0; i < prefer.length; i++) {
		if (cols[prefer[i]]) {
			ordered.push(prefer[i]);
			delete cols[prefer[i]];
		}
	}
	for (name in cols) {
		if (Object.prototype.hasOwnProperty.call(cols, name))
			ordered.push(name);
	}
	return ordered;
}

function spaPreviewCellClass(colName, text) {
	var shortCols = { authId: 1, encodingType: 1, "#": 1, result: 1 };
	var s = text == null ? "" : String(text);
	if (colName === "@iot.id")
		return "spaIotId spaCellShort";
	if (shortCols[colName] || (s.length > 0 && s.length <= 24 && s.indexOf(" ") === -1 && s.indexOf("{") === -1))
		return "spaCellShort";
	return "spaCellWrap";
}

function spaRenderPreview(batch) {
	var el = document.getElementById("DialogSTAPublisherPreview"), html = "", sections, si, items, cols, ci, ii, item, body, groups, gi, g, si2, o, cell, colName;
	if (!el)
		return;
	if (!batch) {
		el.innerHTML = "";
		return;
	}
	sections = spaEntitiesByPlural(batch);
	for (si = 0; si < sections.length; si++) {
		items = sections[si].items;
		cols = spaCollectBodyColumns(items);
		html += "<div class=\"spaPreviewSection\" data-spa-plural=\"" + spaEsc(sections[si].plural) + "\">";
		html += "<h4>" + spaEsc(sections[si].plural) + " (" + items.length + ")</h4>";
		html += "<div class=\"spaPreviewTableWrap\"><table class=\"tablesmall spaPreviewTable\"><thead><tr>";
		for (ci = 0; ci < cols.length; ci++)
			html += "<th class=\"spaCellShort\">" + spaEsc(cols[ci]) + "</th>";
		html += "<th class=\"spaCellShort\">@iot.id</th></tr></thead><tbody>";
		for (ii = 0; ii < items.length; ii++) {
			item = items[ii];
			body = item._previewBody || spaBuildBody(item.plural, item.ent, item.rec);
			item._previewBody = body;
			html += "<tr data-spa-entity-key=\"" + spaEsc(item.key) + "\">";
			for (ci = 0; ci < cols.length; ci++) {
				colName = cols[ci];
				cell = spaFormatPreviewCell(body[colName]);
				html += "<td class=\"" + spaPreviewCellClass(colName, cell) + "\">" + spaEsc(cell) + "</td>";
			}
			html += "<td class=\"spaIotId spaCellShort\" id=\"" + spaEsc(spaDomIdFromKey("spaEntId_", item.key)) + "\">" +
				spaEsc(item.id != null ? item.id : "") + "</td>";
			html += "</tr>";
		}
		html += "</tbody></table></div></div>";
	}

	groups = spaGroupObservations(batch.observations);
	html += "<div class=\"spaPreviewSection\" data-spa-plural=\"Observations\">";
	html += "<h4>Observations (" + ((batch.observations && batch.observations.length) || 0) + ")</h4>";
	for (gi = 0; gi < groups.length; gi++) {
		g = groups[gi];
		html += "<p class=\"spaObsSummary\">" + spaEsc(spaObsGroupDisplayLabel(g, gi)) + ": " + g.count + "</p>";
		if (!g.rows.length)
			continue;
		html += "<div class=\"spaPreviewTableWrap\"><table class=\"tablesmall spaPreviewTable\"><thead><tr>";
		html += "<th class=\"spaCellShort\">#</th>";
		html += "<th class=\"spaCellShort\">phenomenonTime</th><th class=\"spaCellShort\">result</th>";
		html += "<th class=\"spaCellShort\">@iot.id</th></tr></thead><tbody>";
		for (si2 = 0; si2 < g.rows.length; si2++) {
			o = g.rows[si2];
			html += "<tr data-spa-obs-index=\"" + o.index + "\">";
			html += "<td class=\"spaCellShort\">" + o.index + "</td>";
			html += "<td class=\"spaCellShort\">" + spaEsc(o.phenomenonTime != null ? o.phenomenonTime : "") + "</td>";
			html += "<td class=\"spaCellShort\">" + spaEsc(o.result != null ? o.result : "") + "</td>";
			html += "<td class=\"spaIotId spaCellShort\" id=\"" + spaEsc(spaDomIdFromKey("spaObsId_", o.index)) + "\">" +
				spaEsc(o.observationId != null && o.observationId !== "(previous)" ? o.observationId : "") + "</td>";
			html += "</tr>";
		}
		html += "</tbody></table></div>";
	}
	html += "</div>";

	/* Relations (after Observations — need their ids at publish time) */
	if (batch.relations && batch.relations.length) {
		html += "<div class=\"spaPreviewSection\" data-spa-plural=\"Relations\">";
		html += "<h4>Relations (" + batch.relations.length + ")</h4>";
		html += "<div class=\"spaPreviewTableWrap\"><table class=\"tablesmall spaPreviewTable\"><thead><tr>";
		html += "<th class=\"spaCellShort\">#</th>";
		html += "<th class=\"spaCellShort\">role</th>";
		html += "<th class=\"spaCellShort\">Subject</th>";
		html += "<th class=\"spaCellShort\">Object</th>";
		html += "<th class=\"spaCellShort\">description</th>";
		html += "<th class=\"spaCellShort\">@iot.id</th></tr></thead><tbody>";
		for (si2 = 0; si2 < batch.relations.length; si2++) {
			o = batch.relations[si2];
			html += "<tr data-spa-rel-index=\"" + o.index + "\">";
			html += "<td class=\"spaCellShort\">" + o.index + "</td>";
			html += "<td class=\"spaCellShort\">" + spaEsc(o.role || "") + "</td>";
			html += "<td class=\"spaCellShort\">" + spaEsc((o.subjectLabel || "Subject") + " #" + o.subjectObsIndex) + "</td>";
			html += "<td class=\"spaCellShort\">" + spaEsc((o.objectLabel || "Object") + " #" + o.objectObsIndex) + "</td>";
			html += "<td class=\"" + spaPreviewCellClass("description", o.description) + "\">" + spaEsc(o.description || "") + "</td>";
			html += "<td class=\"spaIotId spaCellShort\" id=\"" + spaEsc(spaDomIdFromKey("spaRelId_", o.index)) + "\">" +
				spaEsc(o.relationId != null ? o.relationId : "") + "</td>";
			html += "</tr>";
		}
		html += "</tbody></table></div></div>";
	}

	el.innerHTML = html;
}

function spaUpdatePreviewEntityId(key, id) {
	var cell;
	if (spaIsEmpty(key))
		return;
	cell = document.getElementById(spaDomIdFromKey("spaEntId_", key));
	if (cell)
		cell.textContent = spaIsEmpty(id) ? "" : String(id);
}

function spaUpdatePreviewObservationId(index, id) {
	var cell = document.getElementById(spaDomIdFromKey("spaObsId_", index));
	if (cell)
		cell.textContent = spaIsEmpty(id) || id === "(previous)" ? "" : String(id);
}

function spaUpdatePreviewRelationId(index, id) {
	var cell = document.getElementById(spaDomIdFromKey("spaRelId_", index));
	if (cell)
		cell.textContent = spaIsEmpty(id) ? "" : String(id);
}

function spaPreparePublishBatch(node, pkg, obsRows, sourceData, retryOnly) {
	var fp = spaComputeBatchFingerprint(pkg, obsRows), batch, k, item, o, r, pendKeys, pendObs, pendRel;

	if (node.staPublishBatch && node.staPublishBatch.fingerprint === fp &&
			node.staPublishBatch.entities && node.staPublishBatch.observations) {
		batch = node.staPublishBatch;
		if (!batch.relations)
			batch.relations = spaBuildRelationPlans(pkg, batch.observations);
	} else {
		batch = spaNormalizeBatch(pkg, obsRows, sourceData);
		batch.fingerprint = fp;
		node.staPublishBatch = batch;
	}
	batch._pkg = pkg;

	spaApplyCacheToBatch(batch, node.staPublishCache);

	if (retryOnly && node.staPublishPending) {
		pendKeys = {};
		pendObs = {};
		pendRel = {};
		(node.staPublishPending.entities || []).forEach(function (e) { pendKeys[e.key] = true; });
		(node.staPublishPending.observations || []).forEach(function (e) { pendObs[e.index] = true; });
		(node.staPublishPending.relations || []).forEach(function (e) { pendRel[e.index] = true; });
		for (k in batch.entities) {
			if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
				continue;
			item = batch.entities[k];
			if (item.status === "done" && !spaIsEmpty(item.id))
				continue;
			if (pendKeys[item.key]) {
				item.status = "pending";
				item.error = null;
				item.id = null;
			} else if (item.status !== "done") {
				item.status = "done";
			}
		}
		for (k = 0; k < batch.observations.length; k++) {
			o = batch.observations[k];
			if (pendObs[o.index]) {
				o.status = "pending";
				o.error = null;
				o.observationId = null;
			} else if (o.status !== "done") {
				o.status = "done";
				o.observationId = o.observationId || "(previous)";
			}
		}
		for (k = 0; k < (batch.relations || []).length; k++) {
			r = batch.relations[k];
			if (pendRel[r.index]) {
				r.status = "pending";
				r.error = null;
				r.relationId = null;
			} else if (r.status !== "done") {
				r.status = "done";
			}
		}
	} else {
		/* Full publish: keep confirmed IDs; re-queue the rest */
		for (k in batch.entities) {
			if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
				continue;
			item = batch.entities[k];
			if (item.status === "done" && !spaIsEmpty(item.id))
				continue;
			item.status = "pending";
			item.error = null;
			item.id = null;
		}
		for (k = 0; k < batch.observations.length; k++) {
			o = batch.observations[k];
			if (o.status === "done" && !spaIsEmpty(o.observationId) && o.observationId !== "(previous)")
				continue;
			o.status = "pending";
			o.error = null;
			o.observationId = null;
		}
		for (k = 0; k < (batch.relations || []).length; k++) {
			r = batch.relations[k];
			if (r.status === "done" && !spaIsEmpty(r.relationId))
				continue;
			r.status = "pending";
			r.error = null;
			r.relationId = null;
		}
	}
	return batch;
}

function spaAnalyzeAndRenderPreview(node) {
	var parent, pkg, sourceData, obsRows, fp, batch, previewEl, countsEl;
	parent = getSTAPublisherParent(node);
	pkg = node.staEntityPackage;
	previewEl = document.getElementById("DialogSTAPublisherPreview");
	countsEl = document.getElementById("DialogSTAPublisherCounts");
	if (!pkg) {
		if (previewEl)
			previewEl.innerHTML = "";
		if (countsEl)
			countsEl.textContent = "";
		node.staPublishBatch = null;
		return null;
	}
	sourceData = spaCollectSourceData(node, parent);
	obsRows = spaCollectObsRows(node, parent, pkg);
	if (!obsRows || !obsRows.length) {
		if (countsEl)
			countsEl.textContent = "";
		if (previewEl) {
			previewEl.innerHTML = "<p>" + DonaCadena({
				cat: "No hi ha taula d'observacions. Useu «Crea la taula» al Constructor.",
				spa: "No hay tabla de observaciones. Use «Crear la tabla» en el Constructor.",
				eng: "No observation table. Use «Create table» in the Builder."
			}) + "</p>";
		}
		node.staPublishBatch = null;
		return null;
	}
	fp = spaComputeBatchFingerprint(pkg, obsRows);
	if (node.staPublishBatch && node.staPublishBatch.fingerprint === fp &&
			node.staPublishBatch.entities && node.staPublishBatch.observations) {
		batch = node.staPublishBatch;
	} else {
		batch = spaNormalizeBatch(pkg, obsRows, sourceData);
		batch.fingerprint = fp;
		node.staPublishBatch = batch;
	}
	batch._pkg = pkg;
	spaApplyCacheToBatch(batch, node.staPublishCache);
	spaRenderCounts(batch, pkg);
	spaRenderPreview(batch);
	console.log("STA Publisher — preview batch", batch);
	return batch;
}

function spaBuildPlanExportObject(node) {
	var batch = node && node.staPublishBatch, sections, si, items, ii, item, body, entitiesByPlural = {}, observations = [], i, o;
	if (!batch)
		return null;
	sections = spaEntitiesByPlural(batch);
	for (si = 0; si < sections.length; si++) {
		items = sections[si].items;
		entitiesByPlural[sections[si].plural] = [];
		for (ii = 0; ii < items.length; ii++) {
			item = items[ii];
			body = item._previewBody || spaBuildBody(item.plural, item.ent, item.rec);
			item._previewBody = body;
			entitiesByPlural[sections[si].plural].push({
				key: item.key,
				role: item.role,
				measurementKey: item.measurementKey,
				status: item.status,
				body: body,
				"@iot.id": item.id != null ? item.id : null
			});
		}
	}
	for (i = 0; i < (batch.observations || []).length; i++) {
		o = batch.observations[i];
		observations.push({
			index: o.index,
			measurementKey: o.measurementKey,
			phenomenonTime: o.phenomenonTime,
			resultTime: o.resultTime,
			result: o.result,
			status: o.status,
			"@iot.id": o.observationId != null && o.observationId !== "(previous)" ? o.observationId : null
		});
	}
	return {
		meta: {
			exportedAt: new Date().toISOString(),
			STAURL: spaServiceUrl(node.STAURL || (node.staEntityPackage && node.staEntityPackage.STAURL) || ""),
			mode: node.staEntityPackage ? node.staEntityPackage.mode : undefined,
			fingerprint: batch.fingerprint || null,
			entityCount: batch.entityCount,
			observationCount: (batch.observations && batch.observations.length) || 0
		},
		entitiesByPlural: entitiesByPlural,
		observations: observations,
		pending: node.staPublishPending || null
	};
}

function spaDownloadPlanJSON(event) {
	var node = getSTAPublisherNodeSafe(), plan;
	if (event)
		event.preventDefault();
	if (!node) {
		spaSetStatus(DonaCadena({cat: "No hi ha node.", spa: "No hay nodo.", eng: "No node."}), true);
		return;
	}
	if (!node.staPublishBatch)
		spaAnalyzeAndRenderPreview(node);
	plan = spaBuildPlanExportObject(node);
	if (!plan) {
		spaSetStatus(DonaCadena({
			cat: "No hi ha pla per desar.",
			spa: "No hay plan para guardar.",
			eng: "No plan to save."
		}), true);
		return;
	}
	if (typeof SaveLocalDataFile === "function")
		SaveLocalDataFile(JSON.stringify(plan, null, "\t"), "sta-publish-plan", ".json", "application/json");
	else {
		var a = document.createElement("a");
		a.href = (typeof MakeHrefData === "function")
			? MakeHrefData(JSON.stringify(plan, null, "\t"), "application/json")
			: URL.createObjectURL(new Blob([JSON.stringify(plan, null, "\t")], { type: "application/json" }));
		a.download = "sta-publish-plan.json";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
	spaSetStatus(DonaCadena({
		cat: "JSON del pla desat.",
		spa: "JSON del plan guardado.",
		eng: "Plan JSON saved."
	}), false);
}

function spaTriggerPngDownload(blobOrDataUrl, isDataUrl) {
	var url, a;
	a = document.createElement("a");
	a.download = "sta-publish-plan.png";
	if (isDataUrl) {
		a.href = blobOrDataUrl;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	} else {
		url = URL.createObjectURL(blobOrDataUrl);
		a.href = url;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
	}
	spaSetStatus(DonaCadena({
		cat: "PNG del pla desat.",
		spa: "PNG del plan guardado.",
		eng: "Plan PNG saved."
	}), false);
}

/* —— PNG plan export: real tables, all columns, wrap (no clipping) —— */

function spaPngWrapLines(ctx, text, maxWidth) {
	var s = String(text == null ? "" : text), words, lines = [], line = "", i, test, rest;
	if (!s)
		return [""];
	/* Prefer wrapping on spaces; fall back to hard wrap for long tokens / JSON */
	words = s.split(/(\s+)/);
	for (i = 0; i < words.length; i++) {
		test = line + words[i];
		if (line && ctx.measureText(test).width > maxWidth) {
			lines.push(line);
			line = words[i].replace(/^\s+/, "");
			while (line && ctx.measureText(line).width > maxWidth) {
				rest = "";
				while (line.length > 1 && ctx.measureText(line).width > maxWidth) {
					rest = line.slice(-1) + rest;
					line = line.slice(0, -1);
				}
				if (line)
					lines.push(line);
				line = rest;
			}
		} else
			line = test;
	}
	if (line !== "")
		lines.push(line);
	if (!lines.length)
		lines.push("");
	return lines;
}

function spaPngLayoutTable(ctx, headers, rows, opts) {
	var font = (opts && opts.font) || "11px Segoe UI, Arial, sans-serif";
	var headerFont = (opts && opts.headerFont) || "bold 11px Segoe UI, Arial, sans-serif";
	var padX = (opts && opts.padX != null) ? opts.padX : 6;
	var padY = (opts && opts.padY != null) ? opts.padY : 4;
	var lineH = (opts && opts.lineH != null) ? opts.lineH : 14;
	var minCol = (opts && opts.minCol != null) ? opts.minCol : 48;
	/* No max width: columns grow to fit full cell text (long URLs, JSON, …). */
	var maxCol = (opts && opts.maxCol != null) ? opts.maxCol : Infinity;
	var colWidths = [], i, j, w, cell, lines, rowLines = [], headerLines = [], h, totalW, totalH, cw;

	ctx.font = headerFont;
	for (i = 0; i < headers.length; i++) {
		w = Math.ceil(ctx.measureText(String(headers[i] == null ? "" : headers[i])).width) + padX * 2;
		colWidths[i] = Math.max(minCol, w);
	}
	ctx.font = font;
	for (i = 0; i < rows.length; i++) {
		for (j = 0; j < headers.length; j++) {
			cell = rows[i][j] == null ? "" : String(rows[i][j]);
			w = Math.ceil(ctx.measureText(cell).width) + padX * 2;
			if (w > colWidths[j])
				colWidths[j] = w;
		}
	}
	if (isFinite(maxCol)) {
		for (i = 0; i < colWidths.length; i++)
			colWidths[i] = Math.min(maxCol, colWidths[i]);
	}

	/* Single-line cells when unrestricted; wrap only if a maxCol was set */
	ctx.font = headerFont;
	for (i = 0; i < headers.length; i++) {
		cw = colWidths[i] - padX * 2;
		if (isFinite(maxCol) && ctx.measureText(String(headers[i] == null ? "" : headers[i])).width > cw)
			headerLines[i] = spaPngWrapLines(ctx, headers[i], cw);
		else
			headerLines[i] = [String(headers[i] == null ? "" : headers[i])];
	}
	h = 0;
	for (i = 0; i < headerLines.length; i++)
		h = Math.max(h, headerLines[i].length);
	headerLines._rowH = Math.max(lineH, h * lineH) + padY * 2;

	ctx.font = font;
	for (i = 0; i < rows.length; i++) {
		rowLines[i] = [];
		h = 1;
		for (j = 0; j < headers.length; j++) {
			cell = rows[i][j] == null ? "" : String(rows[i][j]);
			cw = colWidths[j] - padX * 2;
			if (isFinite(maxCol) && ctx.measureText(cell).width > cw)
				lines = spaPngWrapLines(ctx, cell, cw);
			else
				lines = [cell];
			rowLines[i][j] = lines;
			h = Math.max(h, lines.length);
		}
		rowLines[i]._rowH = Math.max(lineH, h * lineH) + padY * 2;
	}

	totalW = 0;
	for (i = 0; i < colWidths.length; i++)
		totalW += colWidths[i];
	totalH = headerLines._rowH;
	for (i = 0; i < rowLines.length; i++)
		totalH += rowLines[i]._rowH;

	return {
		headers: headers,
		rows: rows,
		colWidths: colWidths,
		headerLines: headerLines,
		rowLines: rowLines,
		width: totalW,
		height: totalH,
		padX: padX,
		padY: padY,
		lineH: lineH,
		font: font,
		headerFont: headerFont
	};
}

function spaPngDrawTable(ctx, x, y, layout) {
	var xi, yi, i, j, lines, li, rowH;
	if (!layout || !layout.headers || !layout.headers.length)
		return y;

	/* Header */
	rowH = layout.headerLines._rowH;
	xi = x;
	for (j = 0; j < layout.colWidths.length; j++) {
		ctx.fillStyle = "#e8eef5";
		ctx.fillRect(xi, y, layout.colWidths[j], rowH);
		ctx.strokeStyle = "#9aa7b5";
		ctx.strokeRect(xi + 0.5, y + 0.5, layout.colWidths[j] - 1, rowH - 1);
		ctx.fillStyle = "#1a1a1a";
		ctx.font = layout.headerFont;
		lines = layout.headerLines[j];
		for (li = 0; li < lines.length; li++)
			ctx.fillText(lines[li], xi + layout.padX, y + layout.padY + (li + 1) * layout.lineH - 3);
		xi += layout.colWidths[j];
	}
	yi = y + rowH;

	/* Body */
	ctx.font = layout.font;
	for (i = 0; i < layout.rowLines.length; i++) {
		rowH = layout.rowLines[i]._rowH;
		xi = x;
		for (j = 0; j < layout.colWidths.length; j++) {
			ctx.fillStyle = (i % 2) ? "#f7f9fb" : "#ffffff";
			ctx.fillRect(xi, yi, layout.colWidths[j], rowH);
			ctx.strokeStyle = "#c5ced6";
			ctx.strokeRect(xi + 0.5, yi + 0.5, layout.colWidths[j] - 1, rowH - 1);
			ctx.fillStyle = "#222222";
			lines = layout.rowLines[i][j] || [""];
			for (li = 0; li < lines.length; li++)
				ctx.fillText(lines[li], xi + layout.padX, yi + layout.padY + (li + 1) * layout.lineH - 3);
			xi += layout.colWidths[j];
		}
		yi += rowH;
	}
	return yi;
}

function spaPngBuildEntityTable(batch, section) {
	var items = section.items, cols = spaCollectBodyColumns(items), headers, rows = [], i, j, item, body;
	headers = cols.slice();
	headers.push("@iot.id");
	for (i = 0; i < items.length; i++) {
		item = items[i];
		body = item._previewBody || spaBuildBody(item.plural, item.ent, item.rec);
		item._previewBody = body;
		rows.push(cols.map(function (c) { return spaFormatPreviewCell(body[c]); }).concat([
			item.id != null ? String(item.id) : ""
		]));
	}
	return { title: section.plural + " (" + items.length + ")", headers: headers, rows: rows };
}

function spaPngBuildObsTables(batch) {
	var groups = spaGroupObservations(batch.observations), out = [], gi, g, si2, o, rows;
	out.push({
		title: "Observations (" + ((batch.observations && batch.observations.length) || 0) + ")",
		headers: null,
		rows: null
	});
	for (gi = 0; gi < groups.length; gi++) {
		g = groups[gi];
		rows = [];
		for (si2 = 0; si2 < g.rows.length; si2++) {
			o = g.rows[si2];
			rows.push([
				String(o.index),
				o.phenomenonTime != null ? String(o.phenomenonTime) : "",
				o.result != null ? String(o.result) : "",
				o.observationId != null && o.observationId !== "(previous)" ? String(o.observationId) : ""
			]);
		}
		out.push({
			title: spaObsGroupDisplayLabel(g, gi) + " (" + g.count + ")",
			headers: ["#", "phenomenonTime", "result", "@iot.id"],
			rows: rows
		});
	}
	return out;
}

function spaPngBuildRelationTable(batch) {
	var rows = [], i, r;
	if (!batch.relations || !batch.relations.length)
		return null;
	for (i = 0; i < batch.relations.length; i++) {
		r = batch.relations[i];
		rows.push([
			String(r.index),
			r.role || "",
			(r.subjectLabel || "Subject") + " #" + r.subjectObsIndex,
			(r.objectLabel || "Object") + " #" + r.objectObsIndex,
			r.description || "",
			r.relationId != null ? String(r.relationId) : ""
		]);
	}
	return {
		title: "Relations (" + batch.relations.length + ")",
		headers: ["#", "role", "Subject", "Object", "description", "@iot.id"],
		rows: rows
	};
}

function spaDownloadPlanPNG(event) {
	var node = getSTAPublisherNodeSafe(), batch, canvas, ctx, y, pad, sections, si, counts;
	var blocks = [], bi, block, layout, layouts = [], maxTableW = 0, totalH, titleH = 22, gap = 14;
	var measureCtx, i, text;
	if (event)
		event.preventDefault();
	if (!node) {
		spaSetStatus(DonaCadena({cat: "No hi ha node.", spa: "No hay nodo.", eng: "No node."}), true);
		return;
	}
	try {
		if (!node.staPublishBatch)
			spaAnalyzeAndRenderPreview(node);
		batch = node.staPublishBatch;
		if (!batch) {
			spaSetStatus(DonaCadena({
				cat: "No hi ha pla per desar.",
				spa: "No hay plan para guardar.",
				eng: "No plan to save."
			}), true);
			return;
		}

		spaSetStatus(DonaCadena({
			cat: "Generant PNG…",
			spa: "Generando PNG…",
			eng: "Generating PNG…"
		}), false);

		pad = 20;
		sections = spaEntitiesByPlural(batch);
		counts = spaCountByPlural(batch, batch._pkg);

		for (si = 0; si < sections.length; si++)
			blocks.push(spaPngBuildEntityTable(batch, sections[si]));
		blocks = blocks.concat(spaPngBuildObsTables(batch));
		block = spaPngBuildRelationTable(batch);
		if (block)
			blocks.push(block);

		measureCtx = document.createElement("canvas").getContext("2d");
		text = counts.map(function (c) { return c.plural + ": " + c.n; }).join("  ·  ");
		for (bi = 0; bi < blocks.length; bi++) {
			block = blocks[bi];
			if (block.headers && block.rows) {
				layout = spaPngLayoutTable(measureCtx, block.headers, block.rows, null);
				layouts[bi] = layout;
				maxTableW = Math.max(maxTableW, layout.width);
			} else
				layouts[bi] = null;
		}
		canvas = document.createElement("canvas");
		canvas.width = Math.max(640, Math.ceil(maxTableW + pad * 2));
		measureCtx.font = "12px Segoe UI, Arial, sans-serif";
		totalH = pad + titleH;
		totalH += spaPngWrapLines(measureCtx, text, canvas.width - pad * 2).length * 16 + 6;
		for (bi = 0; bi < blocks.length; bi++) {
			totalH += titleH;
			if (layouts[bi])
				totalH += layouts[bi].height + gap;
			else
				totalH += gap;
		}
		totalH += pad;
		canvas.height = Math.max(160, Math.ceil(totalH));
		ctx = canvas.getContext("2d");
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		y = pad;
		ctx.fillStyle = "#111111";
		ctx.font = "bold 16px Segoe UI, Arial, sans-serif";
		ctx.fillText("STA Publisher plan", pad, y + 14);
		y += titleH;
		ctx.font = "12px Segoe UI, Arial, sans-serif";
		ctx.fillStyle = "#444444";
		(function () {
			var lines = spaPngWrapLines(ctx, text, canvas.width - pad * 2), li;
			for (li = 0; li < lines.length; li++) {
				ctx.fillText(lines[li], pad, y + 12);
				y += 16;
			}
		})();
		y += 6;

		for (bi = 0; bi < blocks.length; bi++) {
			block = blocks[bi];
			ctx.fillStyle = "#111111";
			ctx.font = "bold 13px Segoe UI, Arial, sans-serif";
			ctx.fillText(block.title, pad, y + 14);
			y += titleH;
			if (layouts[bi])
				y = spaPngDrawTable(ctx, pad, y, layouts[bi]) + gap;
			else
				y += 4;
		}

		if (canvas.toBlob) {
			canvas.toBlob(function (blob) {
				if (!blob) {
					spaSetStatus(DonaCadena({
						cat: "No s'ha pogut generar el PNG.",
						spa: "No se ha podido generar el PNG.",
						eng: "Could not generate PNG."
					}), true);
					return;
				}
				if (typeof SaveLocalDataFile === "function") {
					SaveLocalDataFile(blob, "sta-publish-plan", ".png", "image/png");
					spaSetStatus(DonaCadena({
						cat: "PNG del pla desat.",
						spa: "PNG del plan guardado.",
						eng: "Plan PNG saved."
					}), false);
				} else
					spaTriggerPngDownload(blob, false);
			}, "image/png");
			return;
		}
		spaTriggerPngDownload(canvas.toDataURL("image/png"), true);
	} catch (err) {
		spaSetStatus(DonaCadenaFmt({
			cat: "No s'ha pogut desar el PNG: {0}",
			spa: "No se ha podido guardar el PNG: {0}",
			eng: "Could not save PNG: {0}"
		}, err && err.message ? err.message : String(err)), true);
	}
}

/* Resolve a packed binding src {source,column|value} against a wide row. */
function spaResolveBindingSrc(src, row) {
	if (!src)
		return undefined;
	if (src.source === "column")
		return row ? row[src.column] : undefined;
	return src.value;
}

/*
	Melt wide super-table → internal observation list (1 obs per group with result).
	Wide columns: [Group.]Observations.result / phenomenonTime / @iot.id
*/
function spaMeltWideObsRows(wideData, pkg) {
	var bindings = (pkg && pkg.observations && pkg.observations.bindings) || [];
	var out = [], r, i, row, b, res, pt, rt, idCol, idVal, o;
	if (!wideData || !wideData.length || !bindings.length)
		return out;
	for (r = 0; r < wideData.length; r++) {
		row = wideData[r];
		if (!row)
			continue;
		for (i = 0; i < bindings.length; i++) {
			b = bindings[i];
			if (!b)
				continue;
			res = spaResolveBindingSrc(b.result, row);
			if (spaIsEmpty(res))
				continue;
			pt = spaResolveBindingSrc(b.phenomenonTime, row);
			rt = spaResolveBindingSrc(b.resultTime, row);
			if (spaIsEmpty(pt) && pkg.observations)
				pt = spaResolveBindingSrc(pkg.observations.phenomenonTime, row);
			if (spaIsEmpty(rt))
				rt = pt;
			idCol = b.idColumn || null;
			idVal = idCol && !spaIsEmpty(row[idCol]) ? row[idCol] : null;
			o = {
				phenomenonTime: pt,
				resultTime: rt,
				result: res,
				measurementKey: b.measurementKey || "",
				groupLabel: b.groupLabel || "",
				datastreamRole: b.datastreamRole || ("Datastreams:" + (b.measurementKey || "")),
				_sourceIndex: row._sourceIndex != null ? row._sourceIndex : r,
				observationId: idVal,
				"@iot.id": idVal
			};
			if (idCol)
				o[idCol] = idVal != null ? idVal : "";
			out.push(o);
		}
	}
	return out;
}

function spaLooksLikeWideTable(data, pkg) {
	var b, col;
	if (!data || !data.length || !data[0] || !pkg)
		return false;
	b = pkg.observations && pkg.observations.bindings && pkg.observations.bindings[0];
	if (b && b.result && b.result.column) {
		col = b.result.column;
		return data[0][col] !== undefined || data[0]._sourceIndex !== undefined;
	}
	/* Heuristic: published obs list has measurementKey + result, not Entity.property cols */
	return data[0]._sourceIndex !== undefined && data[0].datastreamRole === undefined;
}

function spaWideTableFromNode(node, parent, pkg) {
	var p = pkg || (node && node.staEntityPackage) || (parent && parent.staEntityPackage);
	if (!p || p.observationTable !== "wide")
		return null;
	/* Prefer STAdataSource: after publish, STAdata may be the created-observations list */
	if (node && node.STAdataSource && node.STAdataSource.length && spaLooksLikeWideTable(node.STAdataSource, p))
		return node.STAdataSource;
	if (parent && parent.STAdataSource && parent.STAdataSource.length && spaLooksLikeWideTable(parent.STAdataSource, p))
		return parent.STAdataSource;
	if (node && node.STAdata && node.STAdata.length && spaLooksLikeWideTable(node.STAdata, p))
		return node.STAdata;
	if (parent && parent.STAdata && parent.STAdata.length && spaLooksLikeWideTable(parent.STAdata, p))
		return parent.STAdata;
	return null;
}

/* Copy Observation @iot.id columns from published wide rows onto another wide table (Builder parent). */
function spaSyncWideObsIds(destWide, srcWide, pkg) {
	var bindings = (pkg && pkg.observations && pkg.observations.bindings) || [];
	var r, i, col, n, name;
	if (!destWide || !srcWide)
		return;
	n = Math.min(destWide.length, srcWide.length);
	for (r = 0; r < n; r++) {
		if (!destWide[r] || !srcWide[r])
			continue;
		for (i = 0; i < bindings.length; i++) {
			col = bindings[i] && bindings[i].idColumn;
			if (col && srcWide[r][col] !== undefined && srcWide[r][col] !== "")
				destWide[r][col] = srcWide[r][col];
		}
		/* Also sync any Entity.@iot.id / Group.Entity.@iot.id columns */
		for (name in srcWide[r]) {
			if (!Object.prototype.hasOwnProperty.call(srcWide[r], name))
				continue;
			if (name.indexOf(".@iot.id") === -1 && name !== "@iot.id")
				continue;
			if (srcWide[r][name] !== undefined && srcWide[r][name] !== "")
				destWide[r][name] = srcWide[r][name];
		}
	}
}

function spaGroupPrefixForEntity(item, pkg) {
	var bindings, i, b;
	if (!item || item.measurementKey == null || item.measurementKey === "")
		return null;
	bindings = (pkg && pkg.observations && pkg.observations.bindings) || [];
	for (i = 0; i < bindings.length; i++) {
		b = bindings[i];
		if (b && b.measurementKey === item.measurementKey)
			return b.groupPrefix || b.groupLabel || null;
	}
	return null;
}

function spaEntityIdColumn(item, pkg) {
	var prefix, plural;
	if (!item)
		return null;
	plural = item.plural;
	prefix = spaGroupPrefixForEntity(item, pkg);
	return (prefix ? prefix + "." : "") + plural + ".@iot.id";
}

/*
	Write resolved entity @iot.id values onto the wide super-table columns
	(Things.@iot.id, Photography.Sensors.@iot.id, …).
*/
function spaWriteEntityIdsToWide(sourceData, entities, pkg) {
	var k, item, col, r, row, matched;
	if (!sourceData || !entities)
		return;
	for (k in entities) {
		if (!Object.prototype.hasOwnProperty.call(entities, k))
			continue;
		item = entities[k];
		if (!item || item.status !== "done" || spaIsEmpty(item.id))
			continue;
		col = spaEntityIdColumn(item, pkg);
		if (!col)
			continue;
		/* Expand-by-row: write only onto the matching source row */
		if (spaExpandByRow(item.plural) && item.rec) {
			matched = false;
			for (r = 0; r < sourceData.length; r++) {
				row = sourceData[r];
				if (!row)
					continue;
				if (row === item.rec ||
						(item.rec._sourceIndex != null && row._sourceIndex === item.rec._sourceIndex) ||
						(row._sourceIndex != null && item.rec === sourceData[row._sourceIndex])) {
					row[col] = item.id;
					matched = true;
					break;
				}
			}
			if (!matched && item.rec._sourceIndex != null && sourceData[item.rec._sourceIndex])
				sourceData[item.rec._sourceIndex][col] = item.id;
			continue;
		}
		/* Shared / per-group template: same id on every wide row */
		for (r = 0; r < sourceData.length; r++) {
			row = sourceData[r];
			if (row)
				row[col] = item.id;
		}
	}
}

/* Write Relation @iot.id onto wide rows (Relations.@iot.id). */
function spaWriteRelationIdsToWide(sourceData, relations, pkg) {
	var i, r, row, col = "Relations.@iot.id";
	if (!sourceData || !relations || !relations.length)
		return;
	for (i = 0; i < relations.length; i++) {
		r = relations[i];
		if (!r || r.status !== "done" || spaIsEmpty(r.relationId))
			continue;
		if (r.sourceIndex == null)
			continue;
		row = sourceData[r.sourceIndex];
		if (row)
			row[col] = r.relationId;
	}
}

/* Attributes for the published wide result table (Builder attrs + id columns). */
function spaWideResultAttributes(pkg, wideData, baseAttrs) {
	var attrs = {}, name, r, bindings, i, col, plural;
	if (baseAttrs && typeof baseAttrs === "object") {
		for (name in baseAttrs) {
			if (Object.prototype.hasOwnProperty.call(baseAttrs, name))
				attrs[name] = baseAttrs[name];
		}
	}
	if (wideData && wideData.length) {
		for (r = 0; r < wideData.length; r++) {
			if (!wideData[r])
				continue;
			for (name in wideData[r]) {
				if (!Object.prototype.hasOwnProperty.call(wideData[r], name) || attrs[name])
					continue;
				attrs[name] = {
					type: (name.indexOf("Time") !== -1 ? "isodatetime" : "string"),
					description: name
				};
			}
			break; /* schema from first row + any id cols added later */
		}
		for (r = 0; r < wideData.length; r++) {
			if (!wideData[r])
				continue;
			for (name in wideData[r]) {
				if (!Object.prototype.hasOwnProperty.call(wideData[r], name) || attrs[name])
					continue;
				attrs[name] = { type: "string", description: name };
			}
		}
	}
	bindings = (pkg && pkg.observations && pkg.observations.bindings) || [];
	for (i = 0; i < bindings.length; i++) {
		col = bindings[i] && bindings[i].idColumn;
		if (col && !attrs[col])
			attrs[col] = { type: "string", description: col, definition: "http://www.opengis.net/def/docs/15-078r6/Observation/id" };
	}
	if (!attrs["Relations.@iot.id"] && pkg && pkg.relationStub && pkg.relationStub.enabled)
		attrs["Relations.@iot.id"] = { type: "string", description: "Relations.@iot.id" };
	/* Ensure @iot.id attribute entries for packed entities */
	for (plural in (pkg && pkg.entities) || {}) {
		if (!Object.prototype.hasOwnProperty.call(pkg.entities, plural))
			continue;
		col = plural + ".@iot.id";
		if (!attrs[col])
			attrs[col] = { type: "string", description: col };
	}
	return attrs;
}

function spaCollectObsRows(node, parent, pkg) {
	var wide, melted;
	/* Wide super-table from Builder → melt to observations */
	if (pkg && pkg.observationTable === "wide") {
		wide = spaWideTableFromNode(node, parent, pkg);
		if (!wide)
			return null;
		melted = spaMeltWideObsRows(wide, pkg);
		return melted.length ? melted : null;
	}
	/* Legacy long table */
	if (pkg && pkg.observationTable === "long" && node.STAdata && node.STAdata.length &&
			node.STAdata[0] && (node.STAdata[0].measurementKey !== undefined || node.STAdata[0].datastreamRole))
		return node.STAdata;
	if (parent && parent.STAdata && parent.staEntityPackage && parent.staEntityPackage.observationTable === "long" &&
			parent.STAdata.length && parent.STAdata[0] &&
			(parent.STAdata[0].datastreamRole || parent.STAdata[0].measurementKey !== undefined))
		return parent.STAdata;
	/* Fallback: treat node/parent STAdata as wide if package says wide was omitted but columns look wide */
	if (pkg && (!pkg.observationTable || pkg.observationTable === "wide")) {
		wide = spaWideTableFromNode(node, parent, pkg) || (node && node.STAdata) || (parent && parent.STAdata);
		if (wide && wide.length && pkg.observations && pkg.observations.bindings && pkg.observations.bindings.length) {
			melted = spaMeltWideObsRows(wide, pkg);
			if (melted.length)
				return melted;
		}
	}
	return null;
}

function spaCollectSourceData(node, parent) {
	var gp, pkg = (node && node.staEntityPackage) || (parent && parent.staEntityPackage);
	/* Wide package: the super-table itself is the entity source */
	if (pkg && pkg.observationTable === "wide") {
		if (node && node.STAdataSource && node.STAdataSource.length)
			return node.STAdataSource;
		if (node && node.STAdata && node.STAdata.length)
			return node.STAdata;
		if (parent && parent.STAdataSource && parent.STAdataSource.length)
			return parent.STAdataSource;
		if (parent && parent.STAdata && parent.STAdata.length)
			return parent.STAdata;
	}
	if (node && node.STAdataSource)
		return node.STAdataSource;
	if (parent && parent.STAdataSource)
		return parent.STAdataSource;
	if (parent && parent.image === "staEntityBuilder.png" && typeof getSTAEntityBuilderParent === "function") {
		gp = getSTAEntityBuilderParent(parent);
		if (gp && gp.STAdata)
			return gp.STAdata;
	}
	return null;
}

function spaUpdateSummary(node, pkg) {
	var summary = document.getElementById("DialogSTAPublisherSummary");
	var pending, nPendE = 0, nPendO = 0, nPendR = 0, url, ents, nObs, html;
	if (!summary)
		return;
	if (!pkg) {
		summary.innerHTML = "<p class=\"spaSummaryEmpty\">" + DonaCadena({
			cat: "No hi ha paquet. Creeu la taula al Constructor d'entitats STA.",
			spa: "No hay paquete. Cree la tabla en el Constructor de entidades STA.",
			eng: "No package. Create the table in the STA Entity Builder."
		}) + "</p>";
		return;
	}
	pending = node.staPublishPending;
	if (pending) {
		nPendE = (pending.entities && pending.entities.length) || 0;
		nPendO = (pending.observations && pending.observations.length) || 0;
		nPendR = (pending.relations && pending.relations.length) || 0;
	}
	url = spaServiceUrl(node.STAURL || pkg.STAURL || "");
	ents = Object.keys(pkg.entities || {});
	nObs = pkg.observationPreviewCount || (node.STAdata ? node.STAdata.length : 0);
	html = "<div class=\"spaSummaryCard\">";
	html += "<div class=\"spaSummaryRow\"><span class=\"spaSummaryLbl\">" + DonaCadena({
		cat: "Mode", spa: "Modo", eng: "Mode"
	}) + "</span><span class=\"spaSummaryVal\">" + spaEsc(pkg.mode || "") + "</span></div>";
	html += "<div class=\"spaSummaryRow\"><span class=\"spaSummaryLbl\">" + DonaCadena({
		cat: "Entitats", spa: "Entidades", eng: "Entities"
	}) + "</span><span class=\"spaSummaryVal\">" + spaEsc(ents.join(", ")) + "</span></div>";
	html += "<div class=\"spaSummaryMeta\">";
	html += "<span class=\"spaSummaryMetaItem\"><span class=\"spaSummaryLbl\">" + DonaCadena({
		cat: "Files origen", spa: "Filas origen", eng: "Source rows"
	}) + "</span> <span class=\"spaSummaryVal\">" + (pkg.sourceRowCount || 0) + "</span></span>";
	html += "<span class=\"spaSummaryMetaItem\"><span class=\"spaSummaryLbl\">" + DonaCadena({
		cat: "Observacions previstes", spa: "Observaciones previstas", eng: "Planned observations"
	}) + "</span> <span class=\"spaSummaryVal\">" + nObs + "</span></span>";
	html += "</div>";
	if (nPendE > 0 || nPendO > 0 || nPendR > 0) {
		html += "<div class=\"spaSummaryPending\"><span class=\"spaSummaryLbl\">" + DonaCadena({
			cat: "Pendents", spa: "Pendientes", eng: "Pending"
		}) + "</span> <span class=\"spaSummaryVal\">" +
			DonaCadenaFmt({
				cat: "{0} entitats, {1} observacions, {2} relations",
				spa: "{0} entidades, {1} observaciones, {2} relations",
				eng: "{0} entities, {1} observations, {2} relations"
			}, nPendE, nPendO, nPendR) + "</span></div>";
	}
	html += "<div class=\"spaSummaryRow spaSummaryUrl\"><span class=\"spaSummaryLbl\">" + DonaCadena({
		cat: "URL STA", spa: "URL STA", eng: "STA URL"
	}) + "</span>";
	if (url) {
		html += "<a class=\"spaSummaryVal spaSummaryLink\" href=\"" + spaEsc(url) +
			"\" target=\"_blank\" rel=\"noopener noreferrer\">" + spaEsc(url) + "</a>";
	} else {
		html += "<span class=\"spaSummaryVal\">—</span>";
	}
	html += "</div></div>";
	summary.innerHTML = html;
}

function openSTAPublisherDialog(node) {
	var parent, pkg, logEl;
	if (!node)
		node = getSTAPublisherNodeSafe();
	if (!node)
		return;
	parent = getSTAPublisherParent(node);
	if (parent) {
		if (parent.staEntityPackage && typeof deapCopy === "function")
			node.staEntityPackage = deapCopy(parent.staEntityPackage);
		if (parent.staEntityConfig && typeof deapCopy === "function")
			node.staEntityConfig = deapCopy(parent.staEntityConfig);
		/* Super-table (wide) or legacy long table from Builder "Crea la taula" */
		if (parent.STAdata && typeof deapCopy === "function" && parent.staEntityPackage &&
				(parent.staEntityPackage.observationTable === "wide" ||
					parent.staEntityPackage.observationTable === "long")) {
			node.STAdata = deapCopy(parent.STAdata);
			/* Wide: same reference so Observation @iot.id writes update the table */
			if (parent.staEntityPackage.observationTable === "wide")
				node.STAdataSource = node.STAdata;
		}
		if (!node.STAdataSource) {
			if (parent.STAdataSource && typeof deapCopy === "function")
				node.STAdataSource = deapCopy(parent.STAdataSource);
			else if (parent.image === "staEntityBuilder.png") {
				var gp = typeof getSTAEntityBuilderParent === "function" ? getSTAEntityBuilderParent(parent) : null;
				if (gp && gp.STAdata && typeof deapCopy === "function")
					node.STAdataSource = deapCopy(gp.STAdata);
			}
		}
		if (parent.STAURL)
			node.STAURL = parent.STAURL;
		if (parent.STAsecurity && typeof deapCopy === "function")
			node.STAsecurity = deapCopy(parent.STAsecurity);
	}
	pkg = node.staEntityPackage;
	spaUpdateSummary(node, pkg);
	spaSetStatus("", false);
	logEl = document.getElementById("DialogSTAPublisherLog");
	if (logEl)
		logEl.textContent = "";
	/* Local analyze only — no GetObjectId on open */
	spaAnalyzeAndRenderPreview(node);
}

function closeSTAPublisherDialog(event) {
	if (event)
		event.preventDefault();
	if (typeof hideNodeDialog === "function")
		hideNodeDialog("DialogSTAPublisher", event);
}

async function spaRunPublishPipeline(node, options) {
	var parent, pkg, url, sourceData, obsRows, batch, ctx, obsResult, relResult, pending;
	var retryOnly = options && options.retryOnly;
	var k, item;

	parent = getSTAPublisherParent(node);
	pkg = node.staEntityPackage || (parent && parent.staEntityPackage);
	if (!pkg)
		throw { name: "STA", message: DonaCadena({cat: "No hi ha paquet per publicar.", spa: "No hay paquete para publicar.", eng: "No package to publish."}) };
	if (pkg.version !== 2)
		throw { name: "STA", message: DonaCadena({
			cat: "El paquet és d'una versió antiga. Torneu a crear la taula al Constructor.",
			spa: "El paquete es de una versión antigua. Vuelva a crear la tabla en el Constructor.",
			eng: "The package is from an older version. Create the table again in the Builder."
		}) };
	if (!spaIsLoggedIn()) {
		if (typeof OpenLogin === "function")
			OpenLogin();
		throw { name: "STA", message: DonaCadena({cat: "Cal iniciar sessió.", spa: "Hay que iniciar sesión.", eng: "Please log in."}) };
	}
	url = spaServiceUrl(node.STAURL || (parent && parent.STAURL) || pkg.STAURL);
	if (!url)
		throw { name: "STA", message: DonaCadena({cat: "Falta la URL del servei STA.", spa: "Falta la URL del servicio STA.", eng: "STA service URL is missing."}) };

	sourceData = spaCollectSourceData(node, parent);
	obsRows = spaCollectObsRows(node, parent, pkg);
	if (!obsRows || !obsRows.length)
		throw { name: "STA", message: DonaCadena({
			cat: "No hi ha taula d'observacions. Useu «Crea la taula» al Constructor.",
			spa: "No hay tabla de observaciones. Use «Crear la tabla» en el Constructor.",
			eng: "No observation table. Use «Create table» in the Builder."
		}) };

	/* Reuse preview batch when fingerprint still matches */
	batch = spaPreparePublishBatch(node, pkg, obsRows, sourceData, retryOnly);
	console.log("STA Publisher — publish batch", batch);
	spaRenderCounts(batch);
	spaRenderPreview(batch);

	ctx = {
		url: url,
		pkg: pkg,
		entities: batch.entities,
		observations: batch.observations,
		relations: batch.relations || [],
		sourceData: sourceData,
		cache: (node.staPublishCache && typeof node.staPublishCache === "object") ? node.staPublishCache : {},
		partyId: null
	};

	for (k in ctx.entities) {
		if (!Object.prototype.hasOwnProperty.call(ctx.entities, k))
			continue;
		item = ctx.entities[k];
		if (item.plural === "Parties" && item.status === "done" && !spaIsEmpty(item.id))
			ctx.partyId = item.id;
	}

	if (retryOnly)
		spaAppendLog("Retry pending only.");

	spaAppendLog("STA URL: " + url);
	spaAppendLog("Publish order: " + spaPublishDisplayOrder(pkg).join(" → "));
	spaAppendLog("Unique entities: " + batch.entityCount + ", observations: " + batch.observations.length +
		", relations: " + ((batch.relations && batch.relations.length) || 0));

	await spaResolveAllEntities(ctx);
	obsResult = await spaCreateObservations(ctx);
	await spaLinkObservationsToGroups(ctx);
	relResult = await spaCreateRelations(ctx);
	await spaLinkRelationsToGroups(ctx);

	pending = spaBuildPending(ctx);
	node.staPublishCache = ctx.cache;
	node.staPublishBatch = batch;
	node.staPublishPending = (pending.entities.length || pending.observations.length ||
		(pending.relations && pending.relations.length)) ? pending : null;
	/* Collect successful observations from the live batch (includes prior done + this run) */
	node.staPublishOkObservations = [];
	for (k = 0; k < batch.observations.length; k++) {
		item = batch.observations[k];
		if (item.status === "done" && !spaIsEmpty(item.observationId) && item.observationId !== "(previous)") {
			node.staPublishOkObservations.push({
				phenomenonTime: item.phenomenonTime,
				result: item.result,
				datastreamId: item.datastreamId,
				observationId: item.observationId,
				measurementKey: item.measurementKey || ""
			});
		}
	}
	/*
		Wide package: result STAdata = same super-table as Builder, with Entity/Observation/Relation @iot.id filled.
		Legacy long: keep published observations list.
	*/
	if (pkg.observationTable === "wide" && ctx.sourceData) {
		spaWriteEntityIdsToWide(ctx.sourceData, ctx.entities, pkg);
		spaWriteRelationIdsToWide(ctx.sourceData, ctx.relations, pkg);
		node.STAdataSource = ctx.sourceData;
		node.STAdata = typeof deapCopy === "function" ? deapCopy(ctx.sourceData) : ctx.sourceData.slice();
		node.STAdataAttributes = spaWideResultAttributes(pkg, node.STAdata,
			(parent && parent.STAdataAttributes) || node.STAdataAttributes || null);
		if (parent && parent.STAdata && spaLooksLikeWideTable(parent.STAdata, pkg)) {
			spaSyncWideObsIds(parent.STAdata, ctx.sourceData, pkg);
			parent.STAdataSource = parent.STAdata;
			if (parent.STAdataAttributes && node.STAdataAttributes) {
				/* merge new id attribute keys onto parent */
				for (k in node.STAdataAttributes) {
					if (Object.prototype.hasOwnProperty.call(node.STAdataAttributes, k) && !parent.STAdataAttributes[k])
						parent.STAdataAttributes[k] = node.STAdataAttributes[k];
				}
			}
			if (typeof networkNodes !== "undefined")
				networkNodes.update(parent);
		}
	} else {
		node.STAdata = node.staPublishOkObservations.slice();
		node.STAdataAttributes = {
			phenomenonTime: { type: "isodatetime" },
			result: { type: "number" },
			datastreamId: { type: "string" },
			observationId: { type: "string" },
			measurementKey: { type: "string" }
		};
	}
	node.staPublishResult = {
		ok: obsResult.nFail === 0 && relResult.nFail === 0 && !pending.entities.length &&
			!pending.observations.length && !(pending.relations && pending.relations.length),
		createdObservations: node.staPublishOkObservations.length,
		createdRelations: relResult.nOk,
		failed: obsResult.nFail + relResult.nFail,
		pendingEntities: pending.entities.length,
		pendingObservations: pending.observations.length,
		pendingRelations: (pending.relations && pending.relations.length) || 0
	};
	console.log("STA Publisher — result", node.staPublishResult);
	console.log("STA Publisher — STAdata", node.STAdata);
	console.log("STA Publisher — pending", node.staPublishPending);
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	spaUpdateSummary(node, pkg);
	spaRenderCounts(batch, pkg);
	spaRenderPreview(batch);
	return {
		nOk: obsResult.nOk,
		nFail: obsResult.nFail + relResult.nFail,
		nRelOk: relResult.nOk,
		nRelFail: relResult.nFail
	};
}

async function publishSTAEntityPackage(event) {
	var node = getSTAPublisherNodeSafe();
	var logEl, result;
	if (event)
		event.preventDefault();
	if (!node)
		return;
	logEl = document.getElementById("DialogSTAPublisherLog");
	if (logEl)
		logEl.textContent = "";
	spaSetStatus(DonaCadena({cat: "Publicant…", spa: "Publicando…", eng: "Publishing…"}), false);
	try {
		result = await spaRunPublishPipeline(node, { retryOnly: false });
		spaAppendLog("Done. Observations: " + result.nOk + ", Relations: " + (result.nRelOk || 0) +
			", failed: " + result.nFail);
		spaSetStatus(DonaCadenaFmt({
			cat: "Publicació finalitzada: {0} Observations, {1} Relations, {2} errors.",
			spa: "Publicación finalizada: {0} Observations, {1} Relations, {2} errores.",
			eng: "Publish finished: {0} Observations, {1} Relations, {2} failures."
		}, result.nOk, result.nRelOk || 0, result.nFail), result.nFail > 0);
		if (typeof updateQueryAndTableArea === "function")
			updateQueryAndTableArea(node);
	} catch (error) {
		spaAppendLog("ERROR: " + (error && error.message ? error.message : String(error)));
		spaSetStatus(DonaCadenaFmt({
			cat: "Error de publicació: {0}",
			spa: "Error de publicación: {0}",
			eng: "Publish error: {0}"
		}, error && error.message ? error.message : String(error)), true);
	}
}

async function retrySTAPublisherPending(event) {
	var node = getSTAPublisherNodeSafe();
	var result;
	if (event)
		event.preventDefault();
	if (!node)
		return;
	if (!node.staPublishPending ||
			((!node.staPublishPending.entities || !node.staPublishPending.entities.length) &&
			 (!node.staPublishPending.observations || !node.staPublishPending.observations.length) &&
			 (!node.staPublishPending.relations || !node.staPublishPending.relations.length))) {
		spaSetStatus(DonaCadena({
			cat: "No hi ha operacions pendents.",
			spa: "No hay operaciones pendientes.",
			eng: "No pending operations."
		}), true);
		return;
	}
	spaSetStatus(DonaCadena({cat: "Reintentant pendents…", spa: "Reintentando pendientes…", eng: "Retrying pending…"}), false);
	spaAppendLog("--- Retry pending ---");
	try {
		result = await spaRunPublishPipeline(node, { retryOnly: true });
		spaAppendLog("Retry done. Observations: " + result.nOk + ", Relations: " + (result.nRelOk || 0) +
			", failed: " + result.nFail);
		spaSetStatus(DonaCadenaFmt({
			cat: "Reintent finalitzat: {0} Observations, {1} Relations, {2} errors.",
			spa: "Reintento finalizado: {0} Observations, {1} Relations, {2} errores.",
			eng: "Retry finished: {0} Observations, {1} Relations, {2} failures."
		}, result.nOk, result.nRelOk || 0, result.nFail), result.nFail > 0);
		if (typeof updateQueryAndTableArea === "function")
			updateQueryAndTableArea(node);
	} catch (error) {
		spaAppendLog("ERROR: " + (error && error.message ? error.message : String(error)));
		spaSetStatus(DonaCadenaFmt({
			cat: "Error en el reintent: {0}",
			spa: "Error en el reintento: {0}",
			eng: "Retry error: {0}"
		}, error && error.message ? error.message : String(error)), true);
	}
}
