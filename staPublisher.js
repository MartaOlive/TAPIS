"use strict"

/*
	STA Publisher — publishes staEntityPackage (v2) + long STAdata from STA Entity Builder.

	Pipeline: normalize/dedupe unique entities → resolve/create sequentially (GetObjectId)
	→ create Observations → store pending failures for retry.
*/

/* Creation order (dependencies first). */
var SPA_ORDER = ["Parties", "Licenses", "Sensors", "ObservedProperties", "Locations", "Things", "FeaturesOfInterest",
	"Campaigns", "ObservationGroups", "HistoricalLocations", "Datastreams", "MultiDatastreams", "Cells", "Relations"];
/* [body key, related entity plural, many, optional?]
   optional=true: related entity in batch may be missing/failed without blocking create;
   spaAttachRelations still links it when id is ready.
   License is optional for Datastreams/MultiDatastreams/Campaigns/ObservationGroups. */
var SPA_RELATIONS = {
	Things: [["Party", "Parties", false], ["Locations", "Locations", true]],
	Datastreams: [["Party", "Parties", false], ["Sensor", "Sensors", false], ["Thing", "Things", false],
		["ObservedProperty", "ObservedProperties", false], ["License", "Licenses", false, true]],
	MultiDatastreams: [["Party", "Parties", false], ["Sensor", "Sensors", false], ["Thing", "Things", false],
		["ObservedProperties", "ObservedProperties", true], ["License", "Licenses", false, true]],
	Campaigns: [["Party", "Parties", false], ["License", "Licenses", false, true]],
	ObservationGroups: [["Party", "Parties", false], ["License", "Licenses", false, true]],
	HistoricalLocations: [["Thing", "Things", false], ["Locations", "Locations", true]]
};

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

function spaBuildBody(plural, ent, rec) {
	var body = {}, props = ent.properties || {}, name, v, lon, lat, sub;
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
		else
			body[name] = v;
	}
	if (plural === "Locations" || plural === "FeaturesOfInterest") {
		if (!body.encodingType)
			body.encodingType = "application/geo+json";
		if (lon !== undefined || lat !== undefined) {
			if (plural === "Locations")
				body.location = { type: "Point", coordinates: [lon, lat] };
			else
				body.feature = { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] } };
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

/* Stable identity key for dedupe (not body JSON). Prefer distinctive roles (e.g. Datastreams:temp). */
function spaEntityStableKey(plural, ent, rec) {
	var def, name, lon, lat, auth, uom, role;
	if (!ent)
		return plural + "|unknown";
	role = ent.role ? String(ent.role) : "";
	/* Distinctive role from Builder (plural:measurementKey) — use as cache key */
	if (role && role !== plural && role.indexOf(":") !== -1)
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
			return "Sensors|" + (ent.measurementKey || name || role || "sensor");
		case "Things":
			name = spaPropVal(ent, "name", rec);
			return "Things|" + (name != null ? name : "thing");
		case "Locations":
		case "FeaturesOfInterest":
			lon = spaPropVal(ent, "longitude", rec);
			lat = spaPropVal(ent, "latitude", rec);
			if (lon != null && lat != null && isFinite(Number(lon)) && isFinite(Number(lat)))
				return plural + "|" + Number(lon) + "," + Number(lat);
			name = spaPropVal(ent, "name", rec);
			return plural + "|" + (name != null ? name : "place");
		case "Datastreams":
			if (ent.measurementKey)
				return "Datastreams:" + ent.measurementKey;
			uom = spaPropVal(ent, "unitOfMeasurement.definition", rec);
			name = spaPropVal(ent, "name", rec);
			return "Datastreams|" + (name || "ds") + (uom != null ? "|" + uom : "");
		default:
			return plural + "|" + (ent.measurementKey || spaPropVal(ent, "name", rec) || role || "x");
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

/*
	Normalize long STAdata + package → unique entities + observation list.
*/
function spaNormalizeBatch(pkg, obsRows, sourceData) {
	var entities = {}, observations = [], plural, arr, i, ent, key, rec, o, foiEnt;
	var nEnt = 0;

	if (!pkg)
		return { entities: {}, observations: [], entityCount: 0 };

	for (plural in (pkg.entities || {})) {
		if (!Object.prototype.hasOwnProperty.call(pkg.entities, plural))
			continue;
		arr = pkg.entities[plural] || [];
		for (i = 0; i < arr.length; i++) {
			ent = arr[i];
			if (!ent)
				continue;
			rec = spaSampleRecForEntity(ent, obsRows, sourceData);
			key = spaEntityStableKey(plural, ent, rec);
			if (entities[key])
				continue;
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
			nEnt++;
		}
	}

	/* Ensure Party entry */
	key = "Parties|" + (typeof CriptoName !== "undefined" ? CriptoName : "party");
	if (!entities[key]) {
		entities[key] = {
			key: key,
			plural: "Parties",
			singular: "Party",
			role: "Parties",
			measurementKey: undefined,
			ent: { plural: "Parties", singular: "Party", role: "Parties", properties: { authId: { source: "manual", value: typeof CriptoName !== "undefined" ? CriptoName : "" } } },
			rec: {},
			status: "pending",
			id: null,
			error: null
		};
		nEnt++;
	}

	for (i = 0; i < (obsRows || []).length; i++) {
		o = obsRows[i];
		if (!o)
			continue;
		foiEnt = spaFindRelated(pkg, "FeaturesOfInterest", o.measurementKey || undefined);
		observations.push({
			index: i,
			phenomenonTime: o.phenomenonTime,
			resultTime: o.resultTime != null ? o.resultTime : o.phenomenonTime,
			result: o.result,
			measurementKey: o.measurementKey || "",
			datastreamRole: o.datastreamRole || ("Datastreams:" + (o.measurementKey || "")),
			foiRole: foiEnt ? foiEnt.role : "FeaturesOfInterest",
			_sourceIndex: o._sourceIndex,
			status: "pending",
			observationId: null,
			error: null
		});
	}

	return { entities: entities, observations: observations, entityCount: nEnt };
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

function spaAttachRelations(body, plural, item, entities, partyId) {
	var rels = SPA_RELATIONS[plural] || [], i, rel, related, relId;
	for (i = 0; i < rels.length; i++) {
		rel = rels[i];
		if (rel[1] === "Parties") {
			relId = partyId;
			if (!spaIsEmpty(relId))
				body[rel[0]] = { "@iot.id": relId };
			continue;
		}
		related = spaFindEntityByPlural(entities, rel[1], item.measurementKey);
		if (!related || spaIsEmpty(related.id))
			continue;
		relId = related.id;
		body[rel[0]] = rel[2] ? [{ "@iot.id": relId }] : { "@iot.id": relId };
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
	var plural = item.plural, cached, id, body, patch, response, found, status, hint;

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
	spaAttachRelations(body, plural, item, ctx.entities, ctx.partyId);

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
		id = await GetObjectId(ctx.url, plural, body);
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
	spaAppendLog(item.singular + (body.name ? " " + body.name : "") + " @" + id);
	return id;
}

function spaEntityReady(item) {
	return item && item.status === "done" && !spaIsEmpty(item.id);
}

function spaCanResolveEntity(item, entities, partyId) {
	var rels = SPA_RELATIONS[item.plural] || [], i, rel, related, optional;
	for (i = 0; i < rels.length; i++) {
		rel = rels[i];
		optional = !!rel[3];
		if (rel[1] === "Parties") {
			if (spaIsEmpty(partyId))
				return false;
			continue;
		}
		related = spaFindEntityByPlural(entities, rel[1], item.measurementKey);
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
	var oi, plural, list, i, item, progressed, guard = 0, pendingDeps;

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
		for (oi = 0; oi < SPA_ORDER.length; oi++) {
			plural = SPA_ORDER[oi];
			if (plural === "Parties")
				continue;
			for (i in ctx.entities) {
				if (!Object.prototype.hasOwnProperty.call(ctx.entities, i))
					continue;
				item = ctx.entities[i];
				if (item.plural !== plural || item.status !== "pending")
					continue;
				if (!spaCanResolveEntity(item, ctx.entities, ctx.partyId)) {
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

async function spaCreateObservations(ctx) {
	var nOk = 0, nFail = 0, results = [], i, o, ds, foi, dsId, foiId, body, obsId, pt, rt;

	for (i = 0; i < ctx.observations.length; i++) {
		o = ctx.observations[i];
		/* Skip already-ok from a prior run (retry); do not re-POST */
		if (o.status === "done")
			continue;
		ds = spaFindEntityByRole(ctx.entities, o.datastreamRole) ||
			spaFindEntityByPlural(ctx.entities, "Datastreams", o.measurementKey || undefined);
		foi = spaFindEntityByRole(ctx.entities, o.foiRole) ||
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
			obsId = await GetObjectId(ctx.url, "Observations", body);
			if (spaIsEmpty(obsId)) {
				o.status = "error";
				o.error = "Observation create returned no id.";
				nFail++;
				spaAppendLog("Observation[" + o.index + "] ERROR: " + o.error);
				continue;
			}
			o.status = "done";
			o.observationId = obsId;
			o.datastreamId = dsId;
			spaUpdatePreviewObservationId(o.index, obsId);
			nOk++;
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

function spaBuildPending(ctx) {
	var pending = { entities: [], observations: [], updatedAt: new Date().toISOString() }, k, item, o;
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
				_sourceIndex: o._sourceIndex,
				status: o.status,
				error: o.error
			});
		}
	}
	return pending;
}

function spaComputeBatchFingerprint(pkg, obsRows) {
	var parts = [], plural, arr, i, o;
	if (!pkg)
		return "";
	parts.push("v" + (pkg.version || ""));
	parts.push("m" + (pkg.mode || ""));
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

function spaCountByPlural(batch) {
	var counts = {}, k, item, oi, order = SPA_ORDER.slice(), out = [];
	if (!batch || !batch.entities)
		return out;
	for (k in batch.entities) {
		if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
			continue;
		item = batch.entities[k];
		counts[item.plural] = (counts[item.plural] || 0) + 1;
	}
	for (oi = 0; oi < order.length; oi++) {
		if (counts[order[oi]])
			out.push({ plural: order[oi], n: counts[order[oi]] });
	}
	for (k in counts) {
		if (!Object.prototype.hasOwnProperty.call(counts, k))
			continue;
		if (order.indexOf(k) === -1)
			out.push({ plural: k, n: counts[k] });
	}
	out.push({ plural: "Observations", n: (batch.observations && batch.observations.length) || 0 });
	return out;
}

function spaRenderCounts(batch) {
	var el = document.getElementById("DialogSTAPublisherCounts"), html = "", list, i;
	if (!el)
		return;
	if (!batch) {
		el.innerHTML = "";
		return;
	}
	list = spaCountByPlural(batch);
	html = "<div class=\"spaCountRow\" role=\"list\">";
	for (i = 0; i < list.length; i++) {
		html += "<span class=\"spaCountChip\" role=\"listitem\"><span class=\"spaCountLbl\">" +
			spaEsc(list[i].plural) + "</span><span class=\"spaCountN\">" + list[i].n + "</span></span>";
	}
	html += "</div>";
	el.innerHTML = html;
}

function spaGroupObservations(observations) {
	var groups = {}, order = [], i, o, mk;
	for (i = 0; i < (observations || []).length; i++) {
		o = observations[i];
		mk = o.measurementKey || "(none)";
		if (!groups[mk]) {
			groups[mk] = { measurementKey: mk, count: 0, rows: [] };
			order.push(mk);
		}
		groups[mk].count++;
		groups[mk].rows.push(o);
	}
	return order.map(function (mk) { return groups[mk]; });
}

function spaEntitiesByPlural(batch) {
	var byPlural = {}, k, item, oi, plural, list = [];
	if (!batch || !batch.entities)
		return list;
	for (k in batch.entities) {
		if (!Object.prototype.hasOwnProperty.call(batch.entities, k))
			continue;
		item = batch.entities[k];
		if (!byPlural[item.plural])
			byPlural[item.plural] = [];
		byPlural[item.plural].push(item);
	}
	for (oi = 0; oi < SPA_ORDER.length; oi++) {
		plural = SPA_ORDER[oi];
		if (byPlural[plural] && byPlural[plural].length)
			list.push({ plural: plural, items: byPlural[plural] });
	}
	for (plural in byPlural) {
		if (!Object.prototype.hasOwnProperty.call(byPlural, plural))
			continue;
		if (SPA_ORDER.indexOf(plural) === -1 && byPlural[plural].length)
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
		html += "<p class=\"spaObsSummary\">" + spaEsc(g.measurementKey) + ": " + g.count + "</p>";
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

function spaPreparePublishBatch(node, pkg, obsRows, sourceData, retryOnly) {
	var fp = spaComputeBatchFingerprint(pkg, obsRows), batch, k, item, o, pendKeys, pendObs;

	if (node.staPublishBatch && node.staPublishBatch.fingerprint === fp &&
			node.staPublishBatch.entities && node.staPublishBatch.observations) {
		batch = node.staPublishBatch;
	} else {
		batch = spaNormalizeBatch(pkg, obsRows, sourceData);
		batch.fingerprint = fp;
		node.staPublishBatch = batch;
	}

	spaApplyCacheToBatch(batch, node.staPublishCache);

	if (retryOnly && node.staPublishPending) {
		pendKeys = {};
		pendObs = {};
		(node.staPublishPending.entities || []).forEach(function (e) { pendKeys[e.key] = true; });
		(node.staPublishPending.observations || []).forEach(function (e) { pendObs[e.index] = true; });
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
	spaApplyCacheToBatch(batch, node.staPublishCache);
	spaRenderCounts(batch);
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

function spaDownloadPlanPNG(event) {
	var node = getSTAPublisherNodeSafe(), batch, canvas, ctx, y, pad, lineH, maxW, sections, si, items, cols, ci, ii, item, body, groups, gi, g, row, text, counts;
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

		pad = 16;
		lineH = 16;
		maxW = 1100;
		sections = spaEntitiesByPlural(batch);
		groups = spaGroupObservations(batch.observations);
		counts = spaCountByPlural(batch);

		/* Measure height */
		y = pad + lineH * 3;
		for (si = 0; si < sections.length; si++) {
			items = sections[si].items;
			cols = spaCollectBodyColumns(items);
			y += lineH * 2; /* title + header */
			y += items.length * lineH;
			y += lineH;
		}
		y += lineH * 2;
		y += groups.length * lineH;
		y += pad;

		canvas = document.createElement("canvas");
		canvas.width = maxW;
		canvas.height = Math.max(y, 120);
		ctx = canvas.getContext("2d");
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#222222";
		ctx.font = "bold 14px Segoe UI, Arial, sans-serif";
		y = pad + 14;
		ctx.fillText("STA Publisher plan", pad, y);
		y += lineH;
		ctx.font = "12px Segoe UI, Arial, sans-serif";
		ctx.fillStyle = "#444444";
		text = counts.map(function (c) { return c.plural + ":" + c.n; }).join(" · ");
		ctx.fillText(text, pad, y);
		y += lineH + 4;

		function drawClipped(str, x, yy, maxWidth) {
			var s = String(str == null ? "" : str), w;
			if (!s)
				return;
			w = ctx.measureText(s).width;
			if (w <= maxWidth) {
				ctx.fillText(s, x, yy);
				return;
			}
			while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth)
				s = s.slice(0, -1);
			ctx.fillText(s + "…", x, yy);
		}

		for (si = 0; si < sections.length; si++) {
			items = sections[si].items;
			cols = spaCollectBodyColumns(items);
			ctx.fillStyle = "#222222";
			ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
			y += lineH;
			ctx.fillText(sections[si].plural + " (" + items.length + ")", pad, y);
			y += lineH;
			ctx.font = "11px Consolas, Courier New, monospace";
			ctx.fillStyle = "#555555";
			row = cols.slice(0, 5).concat(["@iot.id"]);
			text = row.join(" | ");
			drawClipped(text, pad, y, maxW - pad * 2);
			y += lineH;
			ctx.fillStyle = "#333333";
			for (ii = 0; ii < items.length; ii++) {
				item = items[ii];
				body = item._previewBody || spaBuildBody(item.plural, item.ent, item.rec);
				item._previewBody = body;
				row = [];
				for (ci = 0; ci < Math.min(cols.length, 5); ci++)
					row.push(spaFormatPreviewCell(body[cols[ci]]));
				row.push(item.id != null ? String(item.id) : "");
				drawClipped(row.join(" | "), pad, y, maxW - pad * 2);
				y += lineH;
				if (y > canvas.height - pad)
					break;
			}
			y += 4;
		}

		ctx.fillStyle = "#222222";
		ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
		y += lineH;
		ctx.fillText("Observations (" + ((batch.observations && batch.observations.length) || 0) + ") — summary", pad, y);
		y += lineH;
		ctx.font = "11px Segoe UI, Arial, sans-serif";
		ctx.fillStyle = "#333333";
		for (gi = 0; gi < groups.length; gi++) {
			g = groups[gi];
			drawClipped(g.measurementKey + ": " + g.count, pad, y, maxW - pad * 2);
			y += lineH;
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

function spaCollectObsRows(node, parent, pkg) {
	if (pkg && pkg.observationTable === "long" && node.STAdata && node.STAdata.length &&
			node.STAdata[0] && (node.STAdata[0].measurementKey !== undefined || node.STAdata[0].datastreamRole))
		return node.STAdata;
	if (parent && parent.STAdata && parent.staEntityPackage && parent.staEntityPackage.observationTable === "long" &&
			parent.STAdata.length && parent.STAdata[0] &&
			(parent.STAdata[0].datastreamRole || parent.STAdata[0].measurementKey !== undefined))
		return parent.STAdata;
	return null;
}

function spaCollectSourceData(node, parent) {
	var gp;
	if (node.STAdataSource)
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
	var pending, nPendE = 0, nPendO = 0, url, ents, nObs, html;
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
	if (nPendE > 0 || nPendO > 0) {
		html += "<div class=\"spaSummaryPending\"><span class=\"spaSummaryLbl\">" + DonaCadena({
			cat: "Pendents", spa: "Pendientes", eng: "Pending"
		}) + "</span> <span class=\"spaSummaryVal\">" +
			DonaCadenaFmt({
				cat: "{0} entitats, {1} observacions",
				spa: "{0} entidades, {1} observaciones",
				eng: "{0} entities, {1} observations"
			}, nPendE, nPendO) + "</span></div>";
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
		if (parent.STAdataSource && typeof deapCopy === "function")
			node.STAdataSource = deapCopy(parent.STAdataSource);
		else if (parent.image === "staEntityBuilder.png") {
			var gp = typeof getSTAEntityBuilderParent === "function" ? getSTAEntityBuilderParent(parent) : null;
			if (gp && gp.STAdata && typeof deapCopy === "function")
				node.STAdataSource = deapCopy(gp.STAdata);
		}
		/* Long table from Builder "Crea la taula" */
		if (parent.STAdata && typeof deapCopy === "function" &&
				parent.staEntityPackage && parent.staEntityPackage.observationTable === "long")
			node.STAdata = deapCopy(parent.STAdata);
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
	var parent, pkg, url, sourceData, obsRows, batch, ctx, obsResult, pending;
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
	spaAppendLog("Unique entities: " + batch.entityCount + ", observations: " + batch.observations.length);

	await spaResolveAllEntities(ctx);
	obsResult = await spaCreateObservations(ctx);

	pending = spaBuildPending(ctx);
	node.staPublishCache = ctx.cache;
	node.staPublishBatch = batch;
	node.staPublishPending = (pending.entities.length || pending.observations.length) ? pending : null;
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
	node.STAdata = node.staPublishOkObservations.slice();
	node.STAdataAttributes = {
		phenomenonTime: { type: "isodatetime" },
		result: { type: "number" },
		datastreamId: { type: "string" },
		observationId: { type: "string" },
		measurementKey: { type: "string" }
	};
	node.staPublishResult = {
		ok: obsResult.nFail === 0 && !pending.entities.length && !pending.observations.length,
		createdObservations: node.STAdata.length,
		failed: obsResult.nFail,
		pendingEntities: pending.entities.length,
		pendingObservations: pending.observations.length
	};
	console.log("STA Publisher — result", node.staPublishResult);
	console.log("STA Publisher — STAdata", node.STAdata);
	console.log("STA Publisher — pending", node.staPublishPending);
	if (typeof networkNodes !== "undefined")
		networkNodes.update(node);
	spaUpdateSummary(node, pkg);
	spaRenderCounts(batch);
	return obsResult;
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
		spaAppendLog("Done. Observations created: " + result.nOk + ", failed: " + result.nFail);
		spaSetStatus(DonaCadenaFmt({
			cat: "Publicació finalitzada: {0} Observations, {1} errors.",
			spa: "Publicación finalizada: {0} Observations, {1} errores.",
			eng: "Publish finished: {0} Observations, {1} failures."
		}, result.nOk, result.nFail), result.nFail > 0);
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
			 (!node.staPublishPending.observations || !node.staPublishPending.observations.length))) {
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
		spaAppendLog("Retry done. Observations ok: " + result.nOk + ", failed: " + result.nFail);
		spaSetStatus(DonaCadenaFmt({
			cat: "Reintent finalitzat: {0} Observations, {1} errors.",
			spa: "Reintento finalizado: {0} Observations, {1} errores.",
			eng: "Retry finished: {0} Observations, {1} failures."
		}, result.nOk, result.nFail), result.nFail > 0);
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
