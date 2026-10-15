"use strict"

/*
	STA Publisher — publishes staEntityPackage (version 2) from STAEntityBuilder via existing GetObjectId helpers.

	For every source row each entity of the package is resolved:
	  - if an ID is present (manual or from a column) the entity is reused (nothing is created);
	  - otherwise GetObjectId looks for a match with the resolved property values and creates it when missing.
	Resolved entities are cached, so constant (manual) configurations produce a single instance.
*/

/* Creation order (dependencies first). Parties are never created: an ID or the logged-in Party is used. */
var SPA_ORDER = ["Parties", "Licenses", "Sensors", "ObservedProperties", "Locations", "Things", "FeaturesOfInterest",
	"Campaigns", "ObservationGroups", "HistoricalLocations", "Datastreams", "MultiDatastreams", "Cells", "Relations"];
/* [body key, related entity plural, many] */
var SPA_RELATIONS = {
	Things: [["Party", "Parties", false], ["Locations", "Locations", true]],
	Datastreams: [["Party", "Parties", false], ["Sensor", "Sensors", false], ["Thing", "Things", false],
		["ObservedProperty", "ObservedProperties", false], ["License", "Licenses", false]],
	MultiDatastreams: [["Party", "Parties", false], ["Sensor", "Sensors", false], ["Thing", "Things", false],
		["ObservedProperties", "ObservedProperties", true], ["License", "Licenses", false]],
	Campaigns: [["Party", "Parties", false], ["License", "Licenses", false]],
	ObservationGroups: [["Party", "Parties", false], ["License", "Licenses", false]],
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

/* Value of a property source {source:"manual"|"column", value|column} for a row; undefined when empty */
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

/* ID (reuse) of an entity for a row, or null */
function spaResolveId(ent, rec) {
	if (!ent || !ent.id)
		return null;
	return spaNormalizeId(spaResolveSrc(ent.id, rec));
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

function openSTAPublisherDialog(node) {
	var parent, pkg, summary;
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
			var gp = getSTAEntityBuilderParent(parent);
			if (gp && gp.STAdata && typeof deapCopy === "function")
				node.STAdataSource = deapCopy(gp.STAdata);
		}
		/* Long observation table produced by Builder "Valida i prepara" */
		if (parent.STAdata && typeof deapCopy === "function" &&
				parent.staEntityPackage && parent.staEntityPackage.observationTable === "long")
			node.STAdata = deapCopy(parent.STAdata);
		if (parent.STAURL)
			node.STAURL = parent.STAURL;
		if (parent.STAsecurity && typeof deapCopy === "function")
			node.STAsecurity = deapCopy(parent.STAsecurity);
	}
	pkg = node.staEntityPackage;
	summary = document.getElementById("DialogSTAPublisherSummary");
	if (summary) {
		if (!pkg) {
			summary.innerHTML = "<p>" + DonaCadena({
				cat: "No hi ha paquet. Prepareu-lo al Constructor d'entitats STA.",
				spa: "No hay paquete. Prepárelo en el Constructor de entidades STA.",
				eng: "No package. Prepare it in the STA Entity Builder."
			}) + "</p>";
		} else {
			summary.innerHTML = "<ul>" +
				"<li>mode: " + spaEsc(pkg.mode) + "</li>" +
				"<li>entities: " + spaEsc(Object.keys(pkg.entities || {}).join(", ")) + "</li>" +
				"<li>source rows: " + (pkg.sourceRowCount || 0) + "</li>" +
				"<li>planned observations: " + (pkg.observationPreviewCount || 0) + "</li>" +
				"<li>validation: " + (pkg.validation && pkg.validation.ok ? "ok" : "errors") + "</li>" +
				"<li>STA URL: " + spaEsc(spaServiceUrl(node.STAURL || pkg.STAURL || "")) + "</li>" +
				"</ul>";
		}
	}
	spaSetStatus("", false);
	var logEl = document.getElementById("DialogSTAPublisherLog");
	if (logEl)
		logEl.textContent = "";
}

function closeSTAPublisherDialog(event) {
	if (event)
		event.preventDefault();
	if (typeof hideNodeDialog === "function")
		hideNodeDialog("DialogSTAPublisher", event);
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

/* Request body of an entity from its resolved properties (without relations) */
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

/* Reuses (ID present) or matches/creates one entity for the row. Returns its @iot.id. */
async function spaResolveEntity(ctx, ent, rec, rowIds) {
	var plural = ent.plural, id = spaResolveId(ent, rec), body, rels, i, rel, related, relId, ids, cacheKey, license, patch, response;

	if (plural === "Parties") {
		if (id !== null && !ctx.cache["Parties|id|" + id]) {
			ctx.cache["Parties|id|" + id] = { id: id };
			ctx.log("Party reuse @" + id);
		}
		return id !== null ? id : ctx.partyId;
	}
	if (id !== null) {
		cacheKey = ent.role + "|id|" + id;
		if (!ctx.cache[cacheKey]) {
			ctx.cache[cacheKey] = { id: id };
			spaAppendLog(ent.singular + " reuse @" + id);
		}
		return id;
	}

	body = spaBuildBody(plural, ent, rec);
	rels = SPA_RELATIONS[plural] || [];
	for (i = 0; i < rels.length; i++) {
		rel = rels[i];
		if (rel[1] === "Parties") {
			relId = rowIds.Parties;
			if (relId !== null && relId !== undefined)
				body[rel[0]] = { "@iot.id": relId };
			continue;
		}
		related = spaFindRelated(ctx.pkg, rel[1], ent.measurementKey);
		relId = related ? rowIds[related.role] : null;
		if (relId === null || relId === undefined)
			continue;
		body[rel[0]] = rel[2] ? [{ "@iot.id": relId }] : { "@iot.id": relId };
	}

	cacheKey = ent.role + "|" + JSON.stringify(body);
	if (ctx.cache[cacheKey])
		return ctx.cache[cacheKey].id;

	if (plural === "Licenses") {
		/* logo and attributionText are not part of the lookup; they are patched afterwards */
		patch = {};
		if (body.logo !== undefined) {
			patch.logo = body.logo;
			delete body.logo;
		}
		if (body.attributionText !== undefined) {
			patch.attributionText = body.attributionText;
			delete body.attributionText;
		}
	}
	ids = await GetObjectId(ctx.url, plural, body);
	if (spaIsEmpty(ids))
		throw { name: "STA", message: "Could not get or create " + ent.singular + (body.name ? " " + body.name : "") + "." };
	if (plural === "Licenses" && Object.keys(patch).length) {
		response = await HTTPJSONData(ctx.url + "/Licenses" + getParentesisODataFromId(ids), null, "PATCH", patch);
		if (response && !response.ok)
			throw { name: "STA", message: "Could not update License (attributionText)." };
	}
	ctx.cache[cacheKey] = { id: ids };
	spaAppendLog(ent.singular + (body.name ? " " + body.name : "") + " @" + ids);
	return ids;
}

async function publishSTAEntityPackage(event) {
	var node = getSTAPublisherNodeSafe();
	var parent, pkg, url, sourceData, obsRows, obsRow, ctx, measKey;
	var nObs = 0, nFail = 0, r, rec, b, i, j, k, ents, ent, rowIds, results = [];
	var obs, dsId, foiId, foiEnt, resVal, pt, rt, body, obsId, obsReuse, obsError;

	if (event)
		event.preventDefault();
	if (!node)
		return;
	parent = getSTAPublisherParent(node);
	pkg = node.staEntityPackage || (parent && parent.staEntityPackage);
	if (!pkg) {
		spaSetStatus(DonaCadena({cat: "No hi ha paquet per publicar.", spa: "No hay paquete para publicar.", eng: "No package to publish."}), true);
		return;
	}
	if (pkg.version !== 2) {
		spaSetStatus(DonaCadena({
			cat: "El paquet és d'una versió antiga. Torneu-lo a preparar al Constructor d'entitats STA.",
			spa: "El paquete es de una versión antigua. Vuelva a prepararlo en el Constructor de entidades STA.",
			eng: "The package is from an older version. Prepare it again in the STA Entity Builder."
		}), true);
		return;
	}
	if (pkg.validation && !pkg.validation.ok) {
		spaSetStatus(pkg.validation.errors.join("; "), true);
		return;
	}
	if (!spaIsLoggedIn()) {
		spaSetStatus(DonaCadena({cat: "Cal iniciar sessió.", spa: "Hay que iniciar sesión.", eng: "Please log in."}), true);
		if (typeof OpenLogin === "function")
			OpenLogin();
		return;
	}
	url = spaServiceUrl(node.STAURL || (parent && parent.STAURL) || pkg.STAURL);
	if (!url) {
		spaSetStatus(DonaCadena({cat: "Falta la URL del servei STA.", spa: "Falta la URL del servicio STA.", eng: "STA service URL is missing."}), true);
		return;
	}

	/* Wide source (for entity column props); long observation rows from Builder Build */
	sourceData = node.STAdataSource;
	if (!sourceData && parent) {
		if (parent.STAdataSource)
			sourceData = parent.STAdataSource;
		else {
			var gp = typeof getSTAEntityBuilderParent === "function" ? getSTAEntityBuilderParent(parent) : null;
			if (gp && gp.STAdata)
				sourceData = gp.STAdata;
		}
	}
	obsRows = null;
	if (pkg.observationTable === "long" && node.STAdata && node.STAdata.length &&
			node.STAdata[0] && (node.STAdata[0].measurementKey !== undefined || node.STAdata[0].datastreamRole))
		obsRows = node.STAdata;
	else if (parent && parent.STAdata && parent.staEntityPackage && parent.staEntityPackage.observationTable === "long" &&
			parent.STAdata.length && parent.STAdata[0] && parent.STAdata[0].datastreamRole)
		obsRows = parent.STAdata;

	if ((!obsRows || !obsRows.length) && (!sourceData || !sourceData.length)) {
		spaSetStatus(DonaCadena({cat: "No hi ha files d'origen.", spa: "No hay filas de origen.", eng: "No source rows."}), true);
		return;
	}

	document.getElementById("DialogSTAPublisherLog").textContent = "";
	spaSetStatus(DonaCadena({cat: "Publicant…", spa: "Publicando…", eng: "Publishing…"}), false);
	spaAppendLog("STA URL: " + url);
	if (obsRows)
		spaAppendLog("Observation table: long (" + obsRows.length + " rows)");

	try {
		ctx = { url: url, pkg: pkg, cache: {}, partyId: null, log: spaAppendLog };
		ctx.partyId = await GetPartyId(url, CriptoName);
		if (spaIsEmpty(ctx.partyId))
			throw { name: "STA", message: "Could not get or create Party." };
		spaAppendLog("Party @" + ctx.partyId);

		obs = pkg.observations || { bindings: [] };

		if (obsRows && obsRows.length) {
			/* One materialized observation row → one Observation POST */
			for (r = 0; r < obsRows.length; r++) {
				obsRow = obsRows[r];
				if (!obsRow)
					continue;
				rec = (sourceData && obsRow._sourceIndex != null && sourceData[obsRow._sourceIndex])
					? sourceData[obsRow._sourceIndex] : obsRow;
				rowIds = { Parties: ctx.partyId };
				measKey = obsRow.measurementKey;

				for (k = 0; k < SPA_ORDER.length; k++) {
					ents = pkg.entities[SPA_ORDER[k]];
					if (!ents)
						continue;
					for (i = 0; i < ents.length; i++) {
						ent = ents[i];
						if (ent.measurementKey !== undefined && measKey && ent.measurementKey !== measKey)
							continue;
						rowIds[ent.role] = await spaResolveEntity(ctx, ent, rec, rowIds);
						if (ent.plural === "Parties")
							rowIds.Parties = rowIds[ent.role];
					}
				}

				pt = obsRow.phenomenonTime;
				rt = obsRow.resultTime != null ? obsRow.resultTime : pt;
				resVal = obsRow.result;
				dsId = rowIds[obsRow.datastreamRole];
				foiEnt = spaFindRelated(pkg, "FeaturesOfInterest", measKey || undefined);
				foiId = foiEnt ? rowIds[foiEnt.role] : null;
				if (spaIsEmpty(dsId) || spaIsEmpty(pt) || resVal === undefined || resVal === null || resVal === "") {
					nFail++;
					continue;
				}
				try {
					body = {
						result: resVal,
						resultTime: new Date(rt).toISOString(),
						phenomenonTime: new Date(pt).toISOString(),
						Datastream: { "@iot.id": dsId }
					};
					if (!spaIsEmpty(foiId))
						body.FeatureOfInterest = { "@iot.id": foiId };
					obsId = await GetObjectId(url, "Observations", body);
					if (spaIsEmpty(obsId))
						nFail++;
					else {
						nObs++;
						results.push({
							phenomenonTime: pt,
							result: resVal,
							datastreamId: dsId,
							observationId: obsId,
							measurementKey: measKey || ""
						});
					}
				} catch (obsErr) {
					nFail++;
					obsError = obsErr && obsErr.message ? obsErr.message : obsErr;
					spaAppendLog("Observation error: " + obsError);
				}
			}
		} else {
			/* Legacy: wide source rows × bindings */
			for (r = 0; r < sourceData.length; r++) {
				rec = sourceData[r];
				if (!rec)
					continue;
				rowIds = { Parties: ctx.partyId };

				for (k = 0; k < SPA_ORDER.length; k++) {
					ents = pkg.entities[SPA_ORDER[k]];
					if (!ents)
						continue;
					for (i = 0; i < ents.length; i++) {
						ent = ents[i];
						if (ent.measurementKey !== undefined && spaIsEmpty(rec[ent.measurementKey]))
							continue;
						rowIds[ent.role] = await spaResolveEntity(ctx, ent, rec, rowIds);
						if (ent.plural === "Parties")
							rowIds.Parties = rowIds[ent.role];
					}
				}

				pt = spaResolveSrc(obs.phenomenonTime, rec);
				rt = obs.resultTime ? spaResolveSrc(obs.resultTime, rec) : pt;
				if (rt === undefined)
					rt = pt;
				obsReuse = obs.id ? spaNormalizeId(spaResolveSrc(obs.id, rec)) : null;

				for (j = 0; j < (obs.bindings || []).length; j++) {
					b = obs.bindings[j];
					resVal = spaResolveSrc(b.result, rec);
					if (resVal === undefined)
						continue;
					dsId = rowIds[b.datastreamRole];
					foiEnt = spaFindRelated(pkg, "FeaturesOfInterest", b.measurementKey);
					foiId = foiEnt ? rowIds[foiEnt.role] : null;
					if (spaIsEmpty(dsId) || spaIsEmpty(pt)) {
						nFail++;
						continue;
					}
					try {
						if (obsReuse !== null)
							obsId = obsReuse;
						else {
							body = {
								result: resVal,
								resultTime: new Date(rt).toISOString(),
								phenomenonTime: new Date(pt).toISOString(),
								Datastream: { "@iot.id": dsId }
							};
							if (!spaIsEmpty(foiId))
								body.FeatureOfInterest = { "@iot.id": foiId };
							obsId = await GetObjectId(url, "Observations", body);
						}
						if (spaIsEmpty(obsId))
							nFail++;
						else {
							nObs++;
							results.push({
								phenomenonTime: pt,
								result: resVal,
								datastreamId: dsId,
								observationId: obsId
							});
						}
					} catch (obsErr) {
						nFail++;
						obsError = obsErr && obsErr.message ? obsErr.message : obsErr;
						spaAppendLog("Observation error: " + obsError);
					}
				}
			}
		}

		node.STAdata = results;
		node.STAdataAttributes = {
			phenomenonTime: { type: "isodatetime" },
			result: { type: "number" },
			datastreamId: { type: "string" },
			observationId: { type: "string" }
		};
		node.staPublishResult = { ok: nFail === 0, createdObservations: nObs, failed: nFail };
		if (typeof networkNodes !== "undefined")
			networkNodes.update(node);

		spaAppendLog("Done. Observations created: " + nObs + ", failed: " + nFail);
		spaSetStatus(DonaCadenaFmt({
			cat: "Publicació finalitzada: {0} Observations, {1} errors.",
			spa: "Publicación finalizada: {0} Observations, {1} errores.",
			eng: "Publish finished: {0} Observations, {1} failures."
		}, nObs, nFail), nFail > 0);
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
