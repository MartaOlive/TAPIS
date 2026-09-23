/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able 
	to work with STA data as tables.
  
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

	Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at uab cat) 
	dins del grup del MiraMon. MiraMon és un projecte del 
	CREAF que elabora programari de Sistema d'Informació Geogràfica 
	i de Teledetecció per a la visualització, consulta, edició i anàlisi 
	de mapes ràsters i vectorials. Aquest progamari programari inclou
	aplicacions d'escriptori i també servidors i clients per Internet.
	No tots aquests productes són gratuïts o de codi obert. 
    
	En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
	El TAPIS es pot actualitzar des de https://github.com/grumets/tapis.
*/

"use strict"


function addSTAEntityNameAsTitleDialog(div_id, node) {
	var entity;
	if (node.STAEntityName)
		entity = getSTAEntityPlural(node.STAEntityName);
	else if (node.STAURL && getSTAURLLastEntity(node.STAURL)) {
		entity = getSTAURLLastEntity(node.STAURL);
		for (var i = 0; i < STAEntitiesArray.length; i++) {
			if (STAEntitiesArray[i] == entity) {
				break;
			}
		}
	}
	document.getElementById(div_id).innerHTML = entity ? "<img src='" + entity + ".png' style='height:30px;' />" + entity : "";
}


//Ask API data or information 
async function loadAPIDataWithReturn(url, reasonForData) { // Ask API to  "FIllSelectInRowFilter" and CountResults
	var response, options = {}, data; //Data in FIllSelectInRowFilter will be STAData and in CountResults will be the number of results
	try {
		var url_fetch;
		url_fetch = url;
		AddHeadersIfNeeded(options);
		if (options.headers)
			response = await fetch(url_fetch, options);
		else
			response = await fetch(url_fetch);
	}
	catch (error) {
		data = null;
		return data;
	}

	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		data = null;
		return data;
	}

	try {
		data = await response.json();
		if (reasonForData == "EntitiesFilterRow"|| reasonForData=="ImportJSONMultiple") {
			data = (typeof data.value !== "undefined") ? data.value : [data];
		} else if (reasonForData == "OGCAPIConformance") {
			data = (typeof data !== "undefined") ? data["conformsTo"] : [data];
		} else if (reasonForData == "OGCAPIqueryables") {
			data = (typeof data !== "undefined") ? data["properties"] : [data];
		}else if(reasonForData =="obtainAllData"){ //Obtain all data to agregate it
			data = (typeof data.value !== "undefined") ? data.value : [data];
		}
		else {
			data = (typeof data.value !== "undefined") ? data["@iot.count"] : [data];
		}

	}
	catch (error) {
		data = null;
	}
	return data;


}

//JM: I do not like this. It could be better to read it as part of the OGC Colections process instead of doing it apart.
async function askForConformanceInOGCAPIFeatures(node) {
	const filterInConformance = ["filter", "features-filter", "simple-cql", "cql-text", "cql-json"];//What I need for filter
	var url = node.STAURL.endsWith("/collections") ? node.STAURL.substring(0, node.STAURL.length-"/collections".length) : node.STAURL;
	url += "/conformance?f=json";
	var conformanceInformation = await loadAPIDataWithReturn(url, "OGCAPIConformance"); //ask for conformance (what can I do with this API)
	var conformanceArray = [];
	if (!conformanceInformation || !conformanceInformation.length) {
		node = networkNodes.get(node.id);
		node.STAOGCAPIconformance = conformanceArray;
		networkNodes.update(node);
		return;
	}
	for (var i = 0; i < conformanceInformation.length; i++) {
		for (var a = 0; a < filterInConformance.length; a++) {
			if (conformanceInformation[i].includes(filterInConformance[a])) {
				if (!conformanceArray.includes(filterInConformance[a])) {
					conformanceArray.push(filterInConformance[a])
				}
			}
		}
	}
	node=networkNodes.get(node.id);  //Since this is an asyncornous function I cannot be sure that node has not change its content while doing this.
	node.STAOGCAPIconformance = conformanceArray; //Only keeps what I need for filter
	networkNodes.update(node);
}

async function askForCollectionQueryables(node) {
	node = node || getNodeDialog("DialogFilterOGC") || getNodeDialog("DialogFilterRows");
	if (!node || !node.STAURL)
		return;
	var url = node.STAURL;
	var index = url.indexOf("/items");
	if (index === -1)
		return;
	url = url.slice(0, index);
	url += "/queryables?f=json";
	var queryablesInformation = await loadAPIDataWithReturn(url, "OGCAPIqueryables");
	if (queryablesInformation && Object.keys(queryablesInformation).length != 0) {
		node.STAOGCAPIqueryable = queryablesInformation;
	} else {
		node.STAOGCAPIqueryable = "no";
	}


	networkNodes.update(node);

}

/* ===== filterSTADlg.js (moved into STAfilter.js) ===== */

var FilterSTAMaxGroupDepth = 4;
var FilterSTADragId = null;
var FilterSTAIdSeq = 0;
var FilterSTALogicSeq = 0;
var FilterSTADialogBound = false;
var FilterSTATreeSnapshot = null;
var FilterSTAUiGeneration = 0;

var FilterSTAOperators = [
	{ value: "eq", label: "=" },
	{ value: "ne", label: "≠" },
	{ value: "ge", label: "≥" },
	{ value: "gt", label: ">" },
	{ value: "le", label: "≤" },
	{ value: "lt", label: "<" },
	{ value: "interval_cc", label: "[a,b]" },
	{ value: "interval_oc", label: "(a,b]" },
	{ value: "interval_co", label: "[a,b)" },
	{ value: "interval_oo", label: "(a,b)" },
	{ value: "contains", label: "contains" },
	{ value: "not_contains", label: "no contains" },
	{ value: "startswith", label: "starts with" },
	{ value: "endswith", label: "ends with" },
	{ value: "year", label: "year" },
	{ value: "month", label: "month" },
	{ value: "day", label: "day" },
	{ value: "hour", label: "hour" },
	{ value: "minute", label: "minute" },
	{ value: "date", label: "date" }
];

function FilterSTAIsIntervalOperator(op) {
	return op && op.indexOf("interval_") === 0;
}

function FilterSTANextId(prefix) {
	FilterSTAIdSeq++;
	return (prefix || "FilterSTA") + "_" + FilterSTAIdSeq;
}

function FilterSTAThisEntityKey() {
	var node = getNodeDialog("DialogFilterSTA");
	var parentNode = node ? GetFirstParentNode(node) : null;
	var url = (parentNode && parentNode.STAURL) ? parentNode.STAURL : ((node && node.STAURL) || "");
	var last = "";
	if (url && typeof getSTAURLLastEntity === "function")
		last = getSTAURLLastEntity(url) || "";
	if (last) {
		var fromUrl = getSTAEntityPlural(last, true) || last;
		if (STAEntities[fromUrl])
			return fromUrl;
		if (STAEntities[last])
			return last;
	}
	var name = (parentNode && parentNode.STAEntityName) || (node && node.STAEntityName) || "";
	if (name) {
		var fromName = getSTAEntityPlural(name, true) || name;
		if (STAEntities[fromName])
			return fromName;
	}
	return "Datastreams";
}

function FilterSTAEntityDef(entityKey) {
	if (!entityKey)
		return null;
	if (STAEntities[entityKey])
		return STAEntities[entityKey];
	var plural = getSTAEntityPlural(entityKey, true) || entityKey;
	if (STAEntities[plural])
		return STAEntities[plural];
	return null;
}

function FilterSTANavNamesFor(entityKey) {
	var entity = FilterSTAEntityDef(entityKey);
	var names = [];
	if (entity && entity.entities) {
		for (var i = 0; i < entity.entities.length; i++)
			names.push(entity.entities[i].name);
	}
	return names;
}

function FilterSTAPathFromState(state) {
	state = state || {};
	if (state.entityPath && state.entityPath.length)
		return state.entityPath.slice();
	if (state.scope === "related" && state.entity)
		return [state.entity];
	return [];
}

function FilterSTALastEntityKey(path) {
	if (path && path.length)
		return path[path.length - 1];
	return FilterSTAThisEntityKey();
}

function FilterSTARelatedOptionsHtml(fromKey) {
	var names = FilterSTANavNamesFor(fromKey);
	var cdns = ['<option value="">+ related</option>'];
	for (var i = 0; i < names.length; i++)
		cdns.push('<option value="' + names[i] + '">' + names[i] + "</option>");
	return cdns.join("");
}

function FilterSTAPathChipsHtml(path) {
	var root = FilterSTAThisEntityKey();
	var cdns = ['<span class="FilterSTAEntityChip FilterSTAEntityChipRoot">' + root + "</span>"];
	for (var i = 0; i < path.length; i++) {
		cdns.push('<span class="FilterSTAEntitySep">→</span>');
		cdns.push('<span class="FilterSTAEntityChip">' + path[i] +
			' <button type="button" class="FilterSTAChipRemove" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Suprimeix el salt", spa: "Eliminar el salto", eng: "Remove hop"})) + '"  onclick="FilterSTARemovePathHop(this,' + i + ')">×</button></span>');
	}
	return cdns.join("");
}

function FilterSTAEntityPathHtml(path) {
	path = path || [];
	var last = FilterSTALastEntityKey(path);
	var nextNames = FilterSTANavNamesFor(last);
	var relatedStyle = nextNames.length ? "" : ' style="display:none;"';
	return '<div class="FilterSTAEntityRow">' +
		'<span class="FilterSTAEntityLabel">Entity</span> ' +
		'<span class="FilterSTAEntityPath">' + FilterSTAPathChipsHtml(path) + "</span> " +
		'<select class="FilterSTARelatedSelect"' + relatedStyle + ' onchange="FilterSTAOnAddRelated(this)">' +
		FilterSTARelatedOptionsHtml(last) + "</select>" +
		'<input type="hidden" class="FilterSTAEntityPathData" value="' + FilterSTAEscapeAttr(path.join("/")) + '">' +
		"</div>";
}

function FilterSTAGetPath(card) {
	var hidden = card.querySelector(".FilterSTAEntityPathData");
	var raw = hidden ? (hidden.value || "") : "";
	if (!raw)
		return [];
	return raw.split("/").filter(function (p) { return p; });
}

function FilterSTASetPath(card, path) {
	path = path || [];
	var hidden = card.querySelector(".FilterSTAEntityPathData");
	if (hidden)
		hidden.value = path.join("/");
	var pathEl = card.querySelector(".FilterSTAEntityPath");
	if (pathEl)
		pathEl.innerHTML = FilterSTAPathChipsHtml(path);
	var sel = card.querySelector(".FilterSTARelatedSelect");
	var last = FilterSTALastEntityKey(path);
	var nextNames = FilterSTANavNamesFor(last);
	if (sel) {
		sel.innerHTML = FilterSTARelatedOptionsHtml(last);
		sel.style.display = nextNames.length ? "inline-block" : "none";
		sel.value = "";
	}
	var keepProp = FilterSTAGetFullPropertyPath(card);
	if (keepProp)
		card.setAttribute("data-property-path", keepProp);
	var entityInput = card.querySelector(".FilterSTAEntityInput");
	if (entityInput)
		entityInput.value = FilterSTAEntityInputValue(path);
	FilterSTAFillValueSelectors(card);
	FilterSTAUpdatePreview();
}

function FilterSTAEntityInputValue(path) {
	var root = FilterSTAThisEntityKey();
	if (!path || !path.length)
		return root;
	return [root].concat(path).join("/");
}

function FilterSTAOnPropertyChange(sel) {
	var card = sel.closest(".FilterSTAConditionCard");
	if (!card)
		return;
	var depth = parseInt(sel.getAttribute("data-cascade-depth") || "0", 10);
	if (sel.classList.contains("FilterSTAProperty") || sel.classList.contains("FilterSTAPropertyNest")) {
		var hop = sel.closest(".FilterSTAPropertyHop");
		if (hop) {
			var typed = hop.querySelector(".FilterSTAPropertyKeyInput");
			if (typed)
				typed.value = "";
		}
	}
	var parts = FilterSTAReadPropertySegments(card).slice(0, depth + 1);
	card.setAttribute("data-property-path", parts.join("/"));
	FilterSTAFillValueSelectors(card);
}

function FilterSTAOnPropertyKeyType(input) {
	FilterSTAUpdatePreview();
}

function FilterSTAPropertyPathParts(property) {
	if (!property)
		return [];
	return String(property).split("/").filter(function (p) { return p; });
}

function FilterSTAIsMetaKey(name) {
	if (!name)
		return true;
	return name.indexOf("@iot.") !== -1 || name.indexOf("@odata.") !== -1;
}

function FilterSTAIsPlainObject(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return false;
	if (value instanceof Date || Object.prototype.toString.call(value) === "[object Date]")
		return false;
	return true;
}

function FilterSTAIsOpenBagName(name) {
	return name === "properties" || name === "parameters" || name === "dataQuality" || name === "resultQuality";
}

function FilterSTAWalkRecord(record, parts) {
	var cur = record;
	for (var i = 0; i < parts.length; i++) {
		if (cur == null || typeof cur !== "object")
			return undefined;
		cur = cur[parts[i]];
	}
	return cur;
}

function FilterSTACollectSamples(entityHops, propParts) {
	var dataNode = FilterSTAValueDataNode();
	var data = dataNode && dataNode.STAdata;
	var samples = [];
	if (!data || !data.length)
		return samples;
	var parts = (entityHops || []).concat(propParts || []);
	var n = Math.min(data.length, 250);
	for (var i = 0; i < n; i++) {
		var value = parts.length ? FilterSTAWalkRecord(data[i], parts) : data[i];
		if (typeof value !== "undefined")
			samples.push(value);
	}
	return samples;
}

function FilterSTAKeysFromAttributes(entityHops, propParts) {
	var dataNode = FilterSTAValueDataNode();
	var attrs = dataNode && dataNode.STAdataAttributes;
	var keys = {};
	if (!attrs)
		return [];
	var prefix = (entityHops || []).concat(propParts || []).join("/");
	if (prefix)
		prefix += "/";
	for (var k in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, k))
			continue;
		if (prefix && k.indexOf(prefix) !== 0)
			continue;
		var rest = prefix ? k.substring(prefix.length) : k;
		if (!rest)
			continue;
		var next = rest.split("/")[0];
		if (next && !FilterSTAIsMetaKey(next))
			keys[next] = true;
	}
	return Object.keys(keys);
}

function FilterSTAFallbackChildKeys(propParts) {
	if (!propParts || !propParts.length)
		return [];
	var lists = [];
	if (typeof unitOfMeasurementExtension !== "undefined")
		lists = lists.concat(unitOfMeasurementExtension);
	if (typeof featureExtension !== "undefined")
		lists = lists.concat(featureExtension);
	if (typeof locationExtension !== "undefined")
		lists = lists.concat(locationExtension);
	var prefix = propParts.join("/") + "/";
	var children = {};
	for (var i = 0; i < lists.length; i++) {
		var p = lists[i];
		if (!p)
			continue;
		if (p.charAt(p.length - 1) === "/")
			p = p.slice(0, -1);
		if (p.indexOf(prefix) !== 0)
			continue;
		var rest = p.substring(prefix.length);
		if (!rest)
			continue;
		var next = rest.split("/")[0];
		if (next && !FilterSTAIsMetaKey(next))
			children[next] = true;
	}
	return Object.keys(children);
}

function FilterSTAAddKey(keySet, name) {
	if (!name || FilterSTAIsMetaKey(name) || name === "observedArea" || name.indexOf("/") !== -1)
		return;
	keySet[name] = true;
}

function FilterSTACascadeChildInfo(entityHops, propParts) {
	var samples = FilterSTACollectSamples(entityHops, propParts);
	var objectCount = 0;
	var scalarCount = 0;
	var keySet = {};
	for (var i = 0; i < samples.length; i++) {
		var value = samples[i];
		if (value === null || typeof value === "undefined")
			continue;
		if (FilterSTAIsPlainObject(value)) {
			objectCount++;
			var ks = Object.keys(value);
			for (var k = 0; k < ks.length; k++)
				FilterSTAAddKey(keySet, ks[k]);
		} else if (!Array.isArray(value))
			scalarCount++;
	}
	var attrKeys = FilterSTAKeysFromAttributes(entityHops, propParts);
	for (var a = 0; a < attrKeys.length; a++)
		FilterSTAAddKey(keySet, attrKeys[a]);
	var last = propParts.length ? propParts[propParts.length - 1] : "";
	var openBag = FilterSTAIsOpenBagName(last);
	var dataKeys = Object.keys(keySet);
	if (!dataKeys.length) {
		var fallback = FilterSTAFallbackChildKeys(propParts);
		for (var f = 0; f < fallback.length; f++)
			FilterSTAAddKey(keySet, fallback[f]);
	}
	var keys = Object.keys(keySet).sort();
	var typicalObject = objectCount > 0 && objectCount >= scalarCount;
	var needsSelect = typicalObject || openBag || (!samples.length && keys.length > 0);
	if (openBag)
		needsSelect = true;
	return { needsSelect: needsSelect && (keys.length > 0 || openBag), keys: keys, openBag: openBag };
}

function FilterSTAReadPropertySegments(card) {
	var cascade = card.querySelector(".FilterSTAPropertyCascade");
	if (!cascade)
		return [];
	var parts = [];
	var root = cascade.querySelector(".FilterSTAProperty");
	if (!root || !root.value)
		return [];
	parts.push(root.value);
	var hops = cascade.querySelectorAll(".FilterSTAPropertyHop");
	for (var i = 0; i < hops.length; i++) {
		var typed = hops[i].querySelector(".FilterSTAPropertyKeyInput");
		var sel = hops[i].querySelector("select");
		var val = "";
		if (typed && typed.value.trim())
			val = typed.value.trim();
		else if (sel && sel.value)
			val = sel.value;
		if (!val)
			break;
		parts.push(val);
	}
	return parts;
}

function FilterSTAGetFullPropertyPath(card) {
	return FilterSTAReadPropertySegments(card).join("/");
}

function FilterSTAPropertyHopHtml(depth, info, selected) {
	var keys = info.keys || [];
	var selectedInList = false;
	var opts = ['<option value="">+ key</option>'];
	for (var i = 0; i < keys.length; i++) {
		var sel = selected && selected === keys[i] ? ' selected="selected"' : "";
		if (sel)
			selectedInList = true;
		opts.push('<option value="' + FilterSTAEscapeAttr(keys[i]) + '"' + sel + ">" + FilterSTAEscapeAttr(keys[i]) + "</option>");
	}
	if (selected && !selectedInList && !info.openBag)
		opts.push('<option value="' + FilterSTAEscapeAttr(selected) + '" selected="selected">' + FilterSTAEscapeAttr(selected) + "</option>");
	var input = "";
	if (info.openBag) {
		var typedVal = selected && !selectedInList ? selected : "";
		input = ' <input type="text" class="FilterSTAPropertyKeyInput" data-cascade-depth="' + depth + '" value="' + FilterSTAEscapeAttr(typedVal) + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "o escriviu una clau", spa: "o escriba una clave", eng: "or type a key"})) + '"  onchange="FilterSTAOnPropertyChange(this)" oninput="FilterSTAOnPropertyKeyType(this)">';
	}
	return '<span class="FilterSTAPropertyHop" data-cascade-depth="' + depth + '"> / ' +
		'<select class="FilterSTAPropertyNest" data-cascade-depth="' + depth + '" onchange="FilterSTAOnPropertyChange(this)">' +
		opts.join("") + "</select>" + input + "</span>";
}

function FilterSTARebuildPropertyCascade(card, preferredParts) {
	var cascade = card.querySelector(".FilterSTAPropertyCascade");
	if (!cascade)
		return;
	var entityPath = FilterSTAGetPath(card);
	var entityKey = FilterSTALastEntityKey(entityPath);
	preferredParts = preferredParts && preferredParts.length ? preferredParts : FilterSTAReadPropertySegments(card);
	var rootSel = cascade.querySelector(".FilterSTAProperty");
	if (!rootSel)
		return;
	var keepRoot = preferredParts[0] || rootSel.value;
	rootSel.innerHTML = FilterSTAPropertyOptionsHtml(entityKey, keepRoot, entityPath);
	var hops = cascade.querySelectorAll(".FilterSTAPropertyHop");
	for (var h = hops.length - 1; h >= 0; h--)
		hops[h].parentNode.removeChild(hops[h]);
	if (!rootSel.value)
		return;
	var prefix = [rootSel.value];
	var depth = 0;
	while (prefix.length && depth < 12) {
		var info = FilterSTACascadeChildInfo(entityPath, prefix);
		if (!info.needsSelect)
			break;
		var selected = preferredParts[prefix.length] || "";
		cascade.insertAdjacentHTML("beforeend", FilterSTAPropertyHopHtml(depth + 1, info, selected));
		if (!selected)
			break;
		prefix.push(selected);
		depth++;
	}
}

function FilterSTAOnAddRelated(sel) {
	var hop = sel.value;
	if (!hop)
		return;
	var card = sel.closest(".FilterSTAConditionCard");
	var path = FilterSTAGetPath(card);
	path.push(hop);
	FilterSTASetPath(card, path);
}

function FilterSTARemovePathHop(btn, index) {
	var card = btn.closest(".FilterSTAConditionCard");
	var path = FilterSTAGetPath(card);
	path = path.slice(0, index);
	FilterSTASetPath(card, path);
}

function FilterSTATopLevelPropertyNames(entityKey, entityPath) {
	var keySet = {};
	FilterSTAAddKey(keySet, "id");
	var entity = FilterSTAEntityDef(entityKey);
	if (entity && entity.properties) {
		for (var i = 0; i < entity.properties.length; i++)
			FilterSTAAddKey(keySet, entity.properties[i].name);
	}
	var samples = FilterSTACollectSamples(entityPath || [], []);
	for (var s = 0; s < samples.length; s++) {
		if (FilterSTAIsPlainObject(samples[s])) {
			var ks = Object.keys(samples[s]);
			for (var k = 0; k < ks.length; k++)
				FilterSTAAddKey(keySet, ks[k]);
		}
	}
	var attrKeys = FilterSTAKeysFromAttributes(entityPath || [], []);
	for (var a = 0; a < attrKeys.length; a++)
		FilterSTAAddKey(keySet, attrKeys[a]);
	var names = Object.keys(keySet);
	if (!names.length)
		names = ["name", "description", "result", "phenomenonTime"];
	return names;
}

function FilterSTAPropertyOptionsHtml(entityKey, selected, entityPath) {
	var names = FilterSTATopLevelPropertyNames(entityKey, entityPath);
	var selectedInList = false;
	var cdns = [];
	for (var j = 0; j < names.length; j++) {
		var sel = selected && selected === names[j] ? ' selected="selected"' : "";
		if (sel)
			selectedInList = true;
		cdns.push('<option value="' + FilterSTAEscapeAttr(names[j]) + '"' + sel + ">" + FilterSTAEscapeAttr(names[j]) + "</option>");
	}
	if (selected && !selectedInList)
		cdns.push('<option value="' + FilterSTAEscapeAttr(selected) + '" selected="selected">' + FilterSTAEscapeAttr(selected) + "</option>");
	return cdns.join("");
}

function FilterSTAOperatorOptionsHtml(selected) {
	var ops = [];
	for (var i = 0; i < FilterSTAOperators.length; i++) {
		var v = FilterSTAOperators[i].value;
		var sel = selected && selected === v ? ' selected="selected"' : "";
		ops.push('<option value="' + v + '"' + sel + ">" + FilterSTAOperators[i].label + "</option>");
	}
	return ops.join("");
}

function FilterSTAGroupHtml(isRoot, depth, logic) {
	var id = isRoot ? "DialogFilterSTARoot" : FilterSTANextId("FilterSTAGroup");
	FilterSTALogicSeq++;
	var radioName = "FilterSTALogic_" + FilterSTALogicSeq;
	var andChecked = (!logic || logic === "and") ? ' checked="checked"' : "";
	var orChecked = (logic === "or") ? ' checked="checked"' : "";
	var dragHandle = isRoot ? "" : '<span class="FilterSTADragHandle" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Arrossega el grup", spa: "Arrastrar el grupo", eng: "Drag group"})) + '"  draggable="true" ondragstart="FilterSTAOnDragStart(event)" ondragend="FilterSTAOnDragEnd(event)">&#8942;&#8942;</span> ';
	var dupBtn = isRoot ? "" : '<button type="button" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"})) + '" onclick="FilterSTADuplicateItem(this)">' + DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"}) + '</button> ';
	var removeBtn = isRoot ? "" : '<button type="button" onclick="FilterSTARemoveItem(this)">' + DonaCadena({cat: "Suprimeix", spa: "Eliminar", eng: "Remove"}) + '</button>';
	var addGroup = depth >= FilterSTAMaxGroupDepth ? "" : '<button type="button" onclick="FilterSTAAddGroup(this)">' + DonaCadena({cat: "+ grup", spa: "+ grupo", eng: "+ group"}) + '</button> ';
	var depthClass = (depth % 2 === 0) ? "FilterSTAGroupEven" : "FilterSTAGroupOdd";
	return '<fieldset class="FilterSTAGroup ' + depthClass + '" data-depth="' + depth + '" id="' + id + '"' +
		' ondragover="FilterSTAOnDragOver(event)" ondragleave="FilterSTAOnDragLeave(event)" ondrop="FilterSTAOnDrop(event)">' +
		'<legend class="FilterSTAGroupLegend">' +
		'<span class="FilterSTAGroupLegendStart">' + dragHandle + DonaCadena({cat: "Grup ", spa: "Grupo ", eng: "Group "}) + dupBtn + removeBtn + "</span>" +
		"</legend>" +
		'<div class="FilterSTAGroupToolbar">' +
		'<button type="button" onclick="FilterSTAAddCondition(this)">' + DonaCadena({cat: "+ condició", spa: "+ condición", eng: "+ condition"}) + '</button> ' +
		addGroup +
		"</div>" +
		'<div class="FilterSTAGroupBody">' +
		'<div class="FilterSTAGroupChildren"></div>' +
		'<div class="FilterSTAGroupLogic">' +
		'<label><input type="radio" name="' + radioName + '" value="and"' + andChecked + '> ' + DonaCadena({cat: "I", spa: "Y", eng: "AND"}) + '</label>' +
		'<label><input type="radio" name="' + radioName + '" value="or"' + orChecked + '> ' + DonaCadena({cat: "O", spa: "O", eng: "OR"}) + '</label>' +
		"</div></div>" +
		"</fieldset>";
}

function FilterSTAConditionStripeClass(parentDepth) {
	return ((parentDepth + 1) % 2 === 0) ? "FilterSTAConditionEven" : "FilterSTAConditionOdd";
}

function FilterSTASetConditionStripe(card, parentDepth) {
	if (!card)
		return;
	card.classList.remove("FilterSTAConditionOdd", "FilterSTAConditionEven");
	card.classList.add(FilterSTAConditionStripeClass(parentDepth));
}

function FilterSTAConditionCardHtml(state, parentDepth) {
	state = state || {};
	var id = FilterSTANextId("FilterSTACond");
	var count = String(FilterSTAIdSeq);
	var path = FilterSTAPathFromState(state);
	var interval = FilterSTAIsIntervalOperator(state.operator);
	var inputType = "text";
	if (state.operator === "date")
		inputType = "date";
	else if (state.operator === "year" || state.operator === "month" || state.operator === "day" || state.operator === "hour" || state.operator === "minute")
		inputType = "number";
	var propParts = FilterSTAPropertyPathParts(state.property);
	var propAttr = state.property ? ' data-property-path="' + FilterSTAEscapeAttr(state.property) + '"' : "";
	var stripe = FilterSTAConditionStripeClass(parentDepth || 1);
	return '<fieldset class="FilterSTAConditionCard ' + stripe + '" id="' + id + '" data-row-count="' + count + '"' + propAttr + ' style="margin-top:8px;">' +
		'<legend><span class="FilterSTADragHandle" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Arrossega la condició", spa: "Arrastrar la condición", eng: "Drag condition"})) + '"  draggable="true" ondragstart="FilterSTAOnDragStart(event)" ondragend="FilterSTAOnDragEnd(event)">&#8942;&#8942;</span> ' + DonaCadena({cat: "Condició", spa: "Condición", eng: "Condition"}) + ' ' +
		'<button type="button" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"})) + '" onclick="FilterSTADuplicateItem(this)">' + DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"}) + '</button> ' +
		'<button type="button" onclick="FilterSTARemoveItem(this)">' + DonaCadena({cat: "Suprimeix", spa: "Eliminar", eng: "Remove"}) + '</button></legend>' +
		FilterSTAEntityPathHtml(path) +
		'<input type="hidden" class="FilterSTAEntityInput" id="inputForEntityFilterRow_' + count + '" value="' + FilterSTAEscapeAttr(FilterSTAEntityInputValue(path)) + '">' +
		'<div class="FilterSTAPropertyRow">' + DonaCadena({cat: "Propietat: ", spa: "Propiedad: ", eng: "Property: "}) +
		'<span class="FilterSTAPropertyCascade">' +
		'<select class="FilterSTAProperty" id="selectorProperty_' + count + '" data-cascade-depth="0" onchange="FilterSTAOnPropertyChange(this)">' +
		FilterSTAPropertyOptionsHtml(FilterSTALastEntityKey(path), propParts[0], path) + "</select>" +
		"</span></div>" +
		'<div style="margin-top:6px;">' + DonaCadena({cat: "Operador: ", spa: "Operador: ", eng: "Operator: "}) +
		'<select class="FilterSTAOperator" onchange="FilterSTAOnOperatorChange(this)">' + FilterSTAOperatorOptionsHtml(state.operator) + "</select>" +
		"</div>" +
		FilterSTAValuePanelHtml(count, state, interval, inputType) +
		"</fieldset>";
}

function FilterSTAValuePanelHtml(count, state, interval, inputType) {
	var v = FilterSTAEscapeAttr(state.value || "");
	var a = FilterSTAEscapeAttr(state.valueA || "");
	var b = FilterSTAEscapeAttr(state.valueB || "");
	var listId = "FilterSTAValueList_" + count;
	return '<div class="FilterSTAValuePanel" style="margin-top:6px;">' +
		'<datalist id="' + listId + '"></datalist>' +
		'<span class="FilterSTAValueSingle" style="display:' + (interval ? "none" : "inline") + ';">' +
		'<label>' + DonaCadena({cat: "Valor: ", spa: "Valor: ", eng: "Value: "}) +
		'<input type="' + inputType + '" class="FilterSTAValue" id="inputText_' + count + '" list="' + listId + '" value="' + v + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off">' +
		"</label></span>" +
		'<span class="FilterSTAValueInterval" style="display:' + (interval ? "inline" : "none") + ';">' +
		'<label>a: <input type="text" class="FilterSTAValueA" id="inputTextInterval1_' + count + '" list="' + listId + '" value="' + a + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off"></label> ' +
		'<label>b: <input type="text" class="FilterSTAValueB" id="inputTextInterval2_' + count + '" list="' + listId + '" value="' + b + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off"></label>' +
		"</span></div>";
}

function FilterSTAValueDataNode() {
	var node = getNodeDialog("DialogFilterSTA");
	if (!node)
		return null;
	var parentNode = GetFirstParentNode(node);
	if (parentNode && parentNode.STAdata && parentNode.STAdata.length)
		return parentNode;
	if (node.STAdata && node.STAdata.length)
		return node;
	return parentNode || node;
}

function FilterSTAWalkPartsWithIotId(parts) {
	var list = [parts];
	if (parts && parts.length && parts[parts.length - 1] === "id") {
		var alt = parts.slice(0, -1);
		alt.push("@iot.id");
		list.push(alt);
	} else if (parts && parts.length === 1 && parts[0] === "id")
		list.push(["@iot.id"]);
	return list;
}

function FilterSTATableHasProperty(dataNode, path, prop) {
	if (!dataNode || !prop)
		return false;
	var propParts = FilterSTAPropertyPathParts(prop);
	var parts = (path && path.length) ? path.concat(propParts) : propParts;
	var variants = FilterSTAWalkPartsWithIotId(parts);
	var v, flat, r, cur, n;
	if (dataNode.STAdataAttributes) {
		for (v = 0; v < variants.length; v++) {
			flat = variants[v].join("/");
			if (dataNode.STAdataAttributes[flat])
				return true;
			if ((!path || !path.length) && dataNode.STAdataAttributes[variants[v][variants[v].length - 1]])
				return true;
		}
		if (dataNode.STAdataAttributes["@iot.id"] && (prop === "id" || propParts[propParts.length - 1] === "id"))
			return true;
	}
	if (!dataNode.STAdata || !dataNode.STAdata.length)
		return false;
	n = Math.min(dataNode.STAdata.length, 250);
	for (v = 0; v < variants.length; v++) {
		for (r = 0; r < n; r++) {
			cur = FilterSTAWalkRecord(dataNode.STAdata[r], variants[v]);
			if (typeof cur !== "undefined")
				return true;
		}
	}
	return false;
}

function FilterSTANestedUniqueValues(data, column) {
	var valuesArray = [];
	if (!data || !column)
		return valuesArray;
	var parts = String(column).split("/");
	for (var i = 0; i < data.length; i++) {
		var valor = data[i];
		for (var a = 0; a < parts.length && valor != null && typeof valor !== "undefined"; a++)
			valor = valor[parts[a]];
		if (typeof valor === "undefined")
			continue;
		if (!valuesArray.find(function (element) { return element == valor; }))
			valuesArray.push(valor);
	}
	return (typeof sortValuesNumbersOrText === "function") ? sortValuesNumbersOrText(valuesArray) : valuesArray;
}

function FilterSTAApplyOptionsToValueDatalist(count, values) {
	var list = document.getElementById("FilterSTAValueList_" + count);
	if (!list)
		return;
	list.innerHTML = "";
	if (!values)
		return;
	for (var i = 0; i < values.length; i++) {
		if (typeof values[i] === "undefined" || values[i] === null)
			continue;
		var option = document.createElement("option");
		option.value = String(values[i]);
		list.appendChild(option);
	}
}

async function FilterSTALoadUniqueValuesFromAPI(count, prop) {
	if (!prop || typeof loadAPIDataWithReturn !== "function")
		return [];
	var entityInput = document.getElementById("inputForEntityFilterRow_" + count);
	if (!entityInput)
		return [];
	var pathText = entityInput.value || "";
	var lastEntity = pathText;
	if (typeof extractLastEntityFromTextFromInputInFilterRow === "function")
		lastEntity = extractLastEntityFromTextFromInputInFilterRow(pathText, true);
	var entity = typeof getSTAEntityPlural === "function" ? getSTAEntityPlural(lastEntity) : lastEntity;
	var node = typeof getSTAFilterValueSourceNode === "function" ? getSTAFilterValueSourceNode() : FilterSTAValueDataNode();
	if (!node)
		return [];
	var urlNode = (node && node.STAURL) ? node : GetFirstParentNode(node);
	if (!urlNode || !urlNode.STAURL)
		return [];
	var url = getURLWithoutQueryParams(urlNode.STAURL);
	if (typeof removeFirstEntityInURL === "function")
		url = removeFirstEntityInURL(url);
	url += entity;
	var dataToFill = null;
	if (typeof node.STAentityValuesForSelect !== "undefined" && node.STAentityValuesForSelect[0] === entity)
		dataToFill = node.STAentityValuesForSelect[1];
	else {
		dataToFill = await loadAPIDataWithReturn(url, "EntitiesFilterRow");
		node.STAentityValuesForSelect = [entity, dataToFill];
	}
	if (!dataToFill)
		return [];
	if (prop.charAt(prop.length - 1) === "/")
		return [];
	var arrayValors = [];
	for (var index = 0; index < dataToFill.length; index++) {
		var valor = dataToFill[index][prop];
		if (typeof valor === "undefined" && prop.indexOf("/") !== -1) {
			valor = dataToFill[index];
			var parts = prop.split("/");
			for (var a = 0; a < parts.length && valor != null; a++)
				valor = valor[parts[a]];
		}
		if (typeof valor === "undefined")
			continue;
		if (!arrayValors.find(function (element) { return element == valor; }))
			arrayValors.push(valor);
	}
	return (typeof sortValuesNumbersOrText === "function") ? sortValuesNumbersOrText(arrayValors) : arrayValors;
}

async function FilterSTAFillValueSelectors(card) {
	if (!card)
		return;
	var gen = FilterSTAUiGeneration;
	var count = card.getAttribute("data-row-count");
	if (!count)
		return;
	var path = FilterSTAGetPath(card);
	var stored = card.getAttribute("data-property-path");
	var parts = stored ? FilterSTAPropertyPathParts(stored) : FilterSTAReadPropertySegments(card);
	FilterSTARebuildPropertyCascade(card, parts);
	if (stored)
		card.removeAttribute("data-property-path");
	var prop = FilterSTAGetFullPropertyPath(card);
	var entityInput = document.getElementById("inputForEntityFilterRow_" + count);
	if (entityInput)
		entityInput.value = FilterSTAEntityInputValue(path);
	var dataNode = FilterSTAValueDataNode();
	var localValues = null;
	var column, aliases, a, more;
	if (prop && dataNode && FilterSTATableHasProperty(dataNode, path, prop)) {
		column = path.length ? (path.join("/") + "/" + prop) : prop;
		aliases = [column];
		if (prop === "id" || FilterSTAPropertyPathParts(prop).slice(-1)[0] === "id") {
			aliases.push(path.length ? (path.join("/") + "/@iot.id") : "@iot.id");
			if (column !== "id")
				aliases.push(column.replace(/\/id$/, "/@iot.id"));
		}
		localValues = [];
		for (a = 0; a < aliases.length; a++) {
			if (aliases[a].indexOf("/") === -1 && typeof obtainValuesFromSTAdataInCSV === "function")
				more = obtainValuesFromSTAdataInCSV(aliases[a], dataNode);
			else
				more = FilterSTANestedUniqueValues(dataNode.STAdata, aliases[a]);
			if (more && more.length)
				localValues = localValues.concat(more);
		}
	}
	if (localValues && localValues.length)
		localValues = FilterSTAScalarUniqueValues(localValues);
	if (localValues && localValues.length)
		FilterSTAApplyOptionsToValueDatalist(count, localValues);
	else {
		var apiValues = FilterSTAScalarUniqueValues(await FilterSTALoadUniqueValuesFromAPI(count, prop));
		if (gen !== FilterSTAUiGeneration || !card.isConnected)
			return;
		FilterSTAApplyOptionsToValueDatalist(count, apiValues);
	}
	if (gen !== FilterSTAUiGeneration || !card.isConnected)
		return;
	FilterSTAUpdatePreview();
}

function FilterSTAScalarUniqueValues(values) {
	var out = [];
	if (!values)
		return out;
	for (var i = 0; i < values.length; i++) {
		var value = values[i];
		if (typeof value === "undefined" || FilterSTAIsPlainObject(value) || Array.isArray(value))
			continue;
		out.push(value);
	}
	return out;
}

function FilterSTAFillAllValueSelectors() {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg)
		return;
	var cards = dlg.querySelectorAll(".FilterSTAConditionCard");
	for (var i = 0; i < cards.length; i++)
		FilterSTAFillValueSelectors(cards[i]);
}

function FilterSTAEscapeAttr(s) {
	return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function FilterSTAClosestGroup(el) {
	return el && el.closest ? el.closest(".FilterSTAGroup") : null;
}

function FilterSTAGroupChildren(group) {
	for (var i = 0; i < group.children.length; i++) {
		var child = group.children[i];
		if (child.classList && child.classList.contains("FilterSTAGroupChildren"))
			return child;
		if (child.classList && child.classList.contains("FilterSTAGroupBody")) {
			for (var j = 0; j < child.children.length; j++) {
				if (child.children[j].classList && child.children[j].classList.contains("FilterSTAGroupChildren"))
					return child.children[j];
			}
		}
	}
	return null;
}

function FilterSTADirectChildren(group) {
	var host = FilterSTAGroupChildren(group);
	var out = [];
	if (!host)
		return out;
	for (var i = 0; i < host.children.length; i++) {
		var c = host.children[i];
		if (c.classList && (c.classList.contains("FilterSTAConditionCard") || c.classList.contains("FilterSTAGroup")))
			out.push(c);
	}
	return out;
}

function FilterSTAAddEmptyCondition(group) {
	if (!group)
		return null;
	var host = FilterSTAGroupChildren(group);
	if (!host)
		return null;
	host.insertAdjacentHTML("beforeend", FilterSTAConditionCardHtml(null, parseInt(group.getAttribute("data-depth") || "1", 10)));
	var card = host.lastElementChild;
	FilterSTAFillValueSelectors(card);
	return card;
}

function FilterSTAAddCondition(btn) {
	var group = btn ? FilterSTAClosestGroup(btn) : document.getElementById("DialogFilterSTARoot");
	if (!group)
		return;
	var card = FilterSTAAddEmptyCondition(group);
	if (card)
		FilterSTASetSelectedCondition(card);
	FilterSTAUpdatePreview();
}

function FilterSTAAddGroup(btn) {
	var parent = btn ? FilterSTAClosestGroup(btn) : document.getElementById("DialogFilterSTARoot");
	if (!parent)
		return;
	var depth = parseInt(parent.getAttribute("data-depth") || "1", 10) + 1;
	if (depth > FilterSTAMaxGroupDepth)
		return;
	var host = FilterSTAGroupChildren(parent);
	host.insertAdjacentHTML("beforeend", FilterSTAGroupHtml(false, depth, "and"));
	FilterSTAUpdatePreview();
}

function FilterSTARemoveItem(btn) {
	var card = btn.closest(".FilterSTAConditionCard");
	var group = btn.closest(".FilterSTAGroup");
	var root = document.getElementById("DialogFilterSTARoot");
	if (card)
		card.parentNode.removeChild(card);
	else if (group && group !== root)
		group.parentNode.removeChild(group);
	FilterSTAUpdatePreview();
}

function FilterSTADuplicateItem(btn) {
	var card = btn.closest(".FilterSTAConditionCard");
	var group = btn.closest(".FilterSTAGroup");
	var root = document.getElementById("DialogFilterSTARoot");
	if (card) {
		var parent = FilterSTAClosestGroup(card);
		var parentDepth = parent ? parseInt(parent.getAttribute("data-depth") || "1", 10) : 1;
		card.insertAdjacentHTML("afterend", FilterSTAConditionCardHtml(FilterSTAReadCondition(card), parentDepth));
		var clone = card.nextElementSibling;
		FilterSTAFillValueSelectors(clone);
		FilterSTASetSelectedCondition(clone);
		FilterSTAUpdatePreview();
		return;
	}
	if (!group || group === root)
		return;
	var depth = parseInt(group.getAttribute("data-depth") || "1", 10);
	var holder = document.createElement("div");
	FilterSTAMountGroup(holder, FilterSTAReadGroup(group), false, depth);
	var clone = holder.firstElementChild;
	if (!clone)
		return;
	if (group.nextSibling)
		group.parentNode.insertBefore(clone, group.nextSibling);
	else
		group.parentNode.appendChild(clone);
	FilterSTAClearSelectedConditions();
	FilterSTASetSelectedGroup(clone);
	var nestedCards = clone.querySelectorAll(".FilterSTAConditionCard");
	for (var c = 0; c < nestedCards.length; c++)
		FilterSTAFillValueSelectors(nestedCards[c]);
	FilterSTAUpdatePreview();
}

function FilterSTAOnOperatorChange(sel) {
	var card = sel.closest(".FilterSTAConditionCard");
	var op = sel.value;
	var interval = FilterSTAIsIntervalOperator(op);
	card.querySelector(".FilterSTAValueInterval").style.display = interval ? "inline" : "none";
	card.querySelector(".FilterSTAValueSingle").style.display = interval ? "none" : "inline";
	var input = card.querySelector(".FilterSTAValue");
	if (input) {
		if (op === "date")
			input.type = "date";
		else if (op === "year" || op === "month" || op === "day" || op === "hour" || op === "minute")
			input.type = "number";
		else
			input.type = "text";
	}
	FilterSTAUpdatePreview();
}

function FilterSTADraggableItem(el) {
	if (!el)
		return null;
	var cond = el.closest(".FilterSTAConditionCard");
	if (cond)
		return cond;
	var group = el.closest(".FilterSTAGroup");
	if (group && group.id !== "DialogFilterSTARoot")
		return group;
	return null;
}

function FilterSTAOnDragStart(event) {
	var item = FilterSTADraggableItem(event.target);
	if (!item) {
		event.preventDefault();
		return;
	}
	FilterSTADragId = item.id;
	FilterSTAClearDragging();
	item.classList.add("FilterSTADragging");
	event.dataTransfer.effectAllowed = "move";
	try {
		event.dataTransfer.setData("text/plain", item.id);
	} catch (e) { }
	event.stopPropagation();
}

function FilterSTAClearDragging() {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterSTADragging");
	while (els.length)
		els[0].classList.remove("FilterSTADragging");
}

function FilterSTAOnDragEnd(event) {
	FilterSTAClearDragging();
	FilterSTAClearDropTargets(null);
	FilterSTADragId = null;
	if (event)
		event.stopPropagation();
}

function FilterSTAClearDropTargets(exceptGroup) {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterSTAGroup");
	for (var i = 0; i < els.length; i++) {
		if (els[i] !== exceptGroup)
			els[i].classList.remove("FilterSTAGroupDropTarget");
	}
}

function FilterSTASetDropTarget(group) {
	FilterSTAClearDropTargets(group);
	if (group)
		group.classList.add("FilterSTAGroupDropTarget");
}

function FilterSTAOnDragOver(event) {
	var overCard;
	if (!FilterSTADragId)
		return;
	event.preventDefault();
	event.stopPropagation();
	event.dataTransfer.dropEffect = "move";
	overCard = event.target.closest ? event.target.closest(".FilterSTAConditionCard") : null;
	if (overCard)
		FilterSTAClearDropTargets(null);
	else
		FilterSTASetDropTarget(FilterSTAClosestGroup(event.target));
}

function FilterSTAOnDragLeave(event) {
	var group = FilterSTAClosestGroup(event.target);
	if (!group)
		return;
	if (event.relatedTarget && group.contains(event.relatedTarget))
		return;
	group.classList.remove("FilterSTAGroupDropTarget");
}

function FilterSTASubtreeDepth(group) {
	var max = parseInt(group.getAttribute("data-depth") || "1", 10);
	var nested = group.querySelectorAll(".FilterSTAGroup");
	for (var i = 0; i < nested.length; i++) {
		var d = parseInt(nested[i].getAttribute("data-depth") || "1", 10);
		if (d > max)
			max = d;
	}
	return max;
}

function FilterSTASetGroupDepth(group, depth) {
	group.setAttribute("data-depth", String(depth));
	group.classList.remove("FilterSTAGroupOdd", "FilterSTAGroupEven");
	group.classList.add(depth % 2 === 0 ? "FilterSTAGroupEven" : "FilterSTAGroupOdd");
}

function FilterSTARetargetDepths(group, depth) {
	FilterSTASetGroupDepth(group, depth);
	var host = FilterSTAGroupChildren(group);
	if (!host)
		return;
	for (var i = 0; i < host.children.length; i++) {
		var c = host.children[i];
		if (c.classList && c.classList.contains("FilterSTAGroup"))
			FilterSTARetargetDepths(c, depth + 1);
		else if (c.classList && c.classList.contains("FilterSTAConditionCard"))
			FilterSTASetConditionStripe(c, depth);
	}
}

function FilterSTAOnDrop(event) {
	event.preventDefault();
	event.stopPropagation();
	var targetGroup = FilterSTAClosestGroup(event.target);
	FilterSTAClearDropTargets(null);
	var dragId = FilterSTADragId || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
	FilterSTAClearDragging();
	FilterSTADragId = null;
	if (!dragId || !targetGroup)
		return;
	var item = document.getElementById(dragId);
	if (!item)
		return;
	if (item === targetGroup || item.contains(targetGroup))
		return;
	if (item.classList.contains("FilterSTAGroup")) {
		var parentDepth = parseInt(targetGroup.getAttribute("data-depth") || "1", 10);
		var oldDepth = parseInt(item.getAttribute("data-depth") || "1", 10);
		var extra = FilterSTASubtreeDepth(item) - oldDepth;
		if (parentDepth + 1 + extra > FilterSTAMaxGroupDepth)
			return;
	}
	var host = FilterSTAGroupChildren(targetGroup);
	var before = event.target.closest(".FilterSTAConditionCard, .FilterSTAGroup");
	if (before && before !== targetGroup && before.parentNode === host && before !== item)
		host.insertBefore(item, before);
	else
		host.appendChild(item);
	if (item.classList.contains("FilterSTAGroup"))
		FilterSTARetargetDepths(item, parseInt(targetGroup.getAttribute("data-depth") || "1", 10) + 1);
	else if (item.classList.contains("FilterSTAConditionCard"))
		FilterSTASetConditionStripe(item, parseInt(targetGroup.getAttribute("data-depth") || "1", 10));
	FilterSTAUpdatePreview();
}

function FilterSTAQuoteOData(value) {
	if (value === null || typeof value === "undefined")
		return "";
	var s = String(value).trim();
	if (!s)
		return "";
	if (/^(true|false)$/i.test(s))
		return s.toLowerCase();
	if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s))
		return s;
	return "'" + s.replace(/'/g, "''") + "'";
}

/*
function FilterSTAConditionPath(card) {
	var prop = card.querySelector(".FilterSTAProperty").value;
	if (!prop)
		return "";
	var path = FilterSTAGetPath(card);
	if (path.length)
		return path.join("/") + "/" + prop;
	return prop;
}

function FilterSTAConditionToOData(card) {
	var path = FilterSTAConditionPath(card);
	if (!path)
		return "";
	var op = card.querySelector(".FilterSTAOperator").value;
	var val = (card.querySelector(".FilterSTAValue").value || "").trim();
	var a = (card.querySelector(".FilterSTAValueA").value || "").trim();
	var b = (card.querySelector(".FilterSTAValueB").value || "").trim();

	if (op === "eq" || op === "ne" || op === "ge" || op === "gt" || op === "le" || op === "lt") {
		if (!val)
			return "";
		return path + " " + op + " " + FilterSTAQuoteOData(val);
	}
	if (op === "interval_cc" || op === "interval_oc" || op === "interval_co" || op === "interval_oo") {
		if (!a || !b)
			return "";
		var lo = (op === "interval_oc" || op === "interval_oo") ? "gt" : "ge";
		var hi = (op === "interval_co" || op === "interval_oo") ? "lt" : "le";
		return "(" + path + " " + lo + " " + FilterSTAQuoteOData(a) + " and " + path + " " + hi + " " + FilterSTAQuoteOData(b) + ")";
	}
	if (op === "contains") {
		if (!val)
			return "";
		return "substringof(" + FilterSTAQuoteOData(val) + "," + path + ")";
	}
	if (op === "not_contains") {
		if (!val)
			return "";
		return "not substringof(" + FilterSTAQuoteOData(val) + "," + path + ")";
	}
	if (op === "startswith" || op === "endswith") {
		if (!val)
			return "";
		return op + "(" + path + "," + FilterSTAQuoteOData(val) + ")";
	}
	if (op === "year" || op === "month" || op === "day" || op === "hour" || op === "minute") {
		if (!val)
			return "";
		var n = String(val).replace(/^0+(?=\d)/, "");
		return op + "(" + path + ") eq " + n;
	}
	if (op === "date") {
		if (!val)
			return "";
		return "date(" + path + ") eq date(" + FilterSTAQuoteOData(val) + ")";
	}
	return "";
}
*/

var FilterSTAIncompletePlaceholder = "?";

function buildSTAFilterQuotedOrPlaceholder(value) {
	if (value === null || typeof value === "undefined" || String(value).trim() === "")
		return FilterSTAIncompletePlaceholder;
	return FilterSTAQuoteOData(value);
}

function buildSTAFilterPropertyPath(cond) {
	var hops = [];
	if (cond.entityPath && cond.entityPath.length)
		hops = cond.entityPath.slice();
	else if (cond.scope === "related" && cond.entity)
		hops = [cond.entity];
	var prop = (cond.property && String(cond.property).trim()) ? String(cond.property).trim() : FilterSTAIncompletePlaceholder;
	if (hops.length)
		return hops.join("/") + "/" + prop;
	return prop;
}

function buildSTAFilterConditionFromTree(cond) {
	cond = cond || {};
	var path = buildSTAFilterPropertyPath(cond);
	var op = cond.operator || "";
	var val = (cond.value || "").trim();
	var a = (cond.valueA || "").trim();
	var b = (cond.valueB || "").trim();
	var ph = FilterSTAIncompletePlaceholder;

	if (!op)
		return path + " " + ph + " " + (val ? FilterSTAQuoteOData(val) : ph);

	if (op === "eq" || op === "ne" || op === "ge" || op === "gt" || op === "le" || op === "lt")
		return path + " " + op + " " + buildSTAFilterQuotedOrPlaceholder(val);

	if (op === "interval_cc" || op === "interval_oc" || op === "interval_co" || op === "interval_oo") {
		var lo = (op === "interval_oc" || op === "interval_oo") ? "gt" : "ge";
		var hi = (op === "interval_co" || op === "interval_oo") ? "lt" : "le";
		return "(" + path + " " + lo + " " + buildSTAFilterQuotedOrPlaceholder(a) + " and " + path + " " + hi + " " + buildSTAFilterQuotedOrPlaceholder(b) + ")";
	}
	if (op === "contains")
		return "substringof(" + buildSTAFilterQuotedOrPlaceholder(val) + "," + path + ")";
	if (op === "not_contains")
		return "not substringof(" + buildSTAFilterQuotedOrPlaceholder(val) + "," + path + ")";
	if (op === "startswith" || op === "endswith")
		return op + "(" + path + "," + buildSTAFilterQuotedOrPlaceholder(val) + ")";
	if (op === "year" || op === "month" || op === "day" || op === "hour" || op === "minute") {
		var n = val ? String(val).replace(/^0+(?=\d)/, "") : ph;
		return op + "(" + path + ") eq " + n;
	}
	if (op === "date")
		return "date(" + path + ") eq date(" + (val ? FilterSTAQuoteOData(val) : ph) + ")";
	return path + " " + ph + " " + (val ? FilterSTAQuoteOData(val) : ph);
}

function buildSTAFilterGroupFromTree(group) {
	var children = (group && group.children) ? group.children : [];
	if (!children.length)
		return "(" + FilterSTAIncompletePlaceholder + ")";
	var nexus = (group.logic === "or") ? "or" : "and";
	var parts = [];
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		if (!child)
			continue;
		if (child.type === "group")
			parts.push(buildSTAFilterGroupFromTree(child));
		else
			parts.push(buildSTAFilterConditionFromTree(child));
	}
	if (!parts.length)
		return "(" + FilterSTAIncompletePlaceholder + ")";
	if (parts.length === 1)
		return parts[0];
	return "(" + parts.join(" " + nexus + " ") + ")";
}

function buildSTAFilterFromFilterSTATree(tree) {
	if (!tree)
		return "";
	if (tree.type === "group")
		return buildSTAFilterGroupFromTree(tree);
	if (tree.type === "condition")
		return buildSTAFilterConditionFromTree(tree);
	return FilterSTAIncompletePlaceholder;
}

function FilterSTAGroupLogicBox(group) {
	var i, k, child;
	if (!group)
		return null;
	for (i = 0; i < group.children.length; i++) {
		child = group.children[i];
		if (child.classList && child.classList.contains("FilterSTAGroupLogic"))
			return child;
		if (child.classList && child.classList.contains("FilterSTAGroupBody")) {
			for (k = 0; k < child.children.length; k++) {
				if (child.children[k].classList && child.children[k].classList.contains("FilterSTAGroupLogic"))
					return child.children[k];
			}
		}
	}
	return null;
}

function FilterSTASyncGroupLogicVisibility(group) {
	var box = FilterSTAGroupLogicBox(group);
	if (!box)
		return;
	if (FilterSTADirectChildren(group).length > 1)
		box.classList.add("FilterSTAGroupLogicVisible");
	else
		box.classList.remove("FilterSTAGroupLogicVisible");
}

function FilterSTASyncAllGroupLogicVisibility() {
	var dlg = document.getElementById("DialogFilterSTA");
	var groups, i;
	if (!dlg)
		return;
	groups = dlg.getElementsByClassName("FilterSTAGroup");
	for (i = 0; i < groups.length; i++)
		FilterSTASyncGroupLogicVisibility(groups[i]);
}

function FilterSTAGroupLogic(group) {
	var box = FilterSTAGroupLogicBox(group);
	var inputs, j;
	if (!box)
		return "and";
	inputs = box.getElementsByTagName("input");
	for (j = 0; j < inputs.length; j++) {
		if (inputs[j].type === "radio" && inputs[j].checked)
			return inputs[j].value;
	}
	return "and";
}

function FilterSTAClearSelectedConditions() {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterSTAConditionSelected");
	while (els.length)
		els[0].classList.remove("FilterSTAConditionSelected");
}

function FilterSTASetSelectedCondition(card) {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg || !card)
		return;
	FilterSTAClearSelectedConditions();
	card.classList.add("FilterSTAConditionSelected");
	FilterSTAClearSelectedGroups();
}

function FilterSTAClearSelectedGroups() {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterSTAGroupSelected");
	while (els.length)
		els[0].classList.remove("FilterSTAGroupSelected");
}

function FilterSTASetSelectedGroup(group) {
	var dlg = document.getElementById("DialogFilterSTA");
	if (!dlg || !group)
		return;
	var els = dlg.getElementsByClassName("FilterSTAGroup");
	for (var i = 0; i < els.length; i++)
		els[i].classList.remove("FilterSTAGroupSelected");
	group.classList.add("FilterSTAGroupSelected");
	FilterSTAClearSelectedConditions();
}

/*
function FilterSTAGroupToOData(group) {
	var parts = [];
	var kids = FilterSTADirectChildren(group);
	for (var i = 0; i < kids.length; i++) {
		var expr = "";
		if (kids[i].classList.contains("FilterSTAConditionCard"))
			expr = FilterSTAConditionToOData(kids[i]);
		else if (kids[i].classList.contains("FilterSTAGroup"))
			expr = FilterSTAGroupToOData(kids[i]);
		if (expr)
			parts.push(expr);
	}
	if (!parts.length)
		return "";
	var nexus = FilterSTAGroupLogic(group);
	var joined = parts.join(" " + nexus + " ");
	if (parts.length > 1)
		return "(" + joined + ")";
	return joined;
}
*/

function FilterSTAReadCondition(card) {
	var path = FilterSTAGetPath(card);
	var valueEl = card.querySelector(".FilterSTAValue");
	var valueAEl = card.querySelector(".FilterSTAValueA");
	var valueBEl = card.querySelector(".FilterSTAValueB");
	return {
		type: "condition",
		entityPath: path,
		scope: path.length ? "related" : "this",
		entity: path.length ? path[path.length - 1] : "",
		property: FilterSTAGetFullPropertyPath(card),
		operator: card.querySelector(".FilterSTAOperator").value,
		value: valueEl ? (valueEl.value || "") : "",
		valueA: valueAEl ? (valueAEl.value || "") : "",
		valueB: valueBEl ? (valueBEl.value || "") : ""
	};
}

function FilterSTAReadGroup(group) {
	var children = [];
	var kids = FilterSTADirectChildren(group);
	for (var i = 0; i < kids.length; i++) {
		if (kids[i].classList.contains("FilterSTAConditionCard"))
			children.push(FilterSTAReadCondition(kids[i]));
		else if (kids[i].classList.contains("FilterSTAGroup"))
			children.push(FilterSTAReadGroup(kids[i]));
	}
	return { type: "group", logic: FilterSTAGroupLogic(group), children: children };
}

function FilterSTAMountGroup(host, node, isRoot, depth) {
	host.insertAdjacentHTML("beforeend", FilterSTAGroupHtml(isRoot, depth, node && node.logic));
	var groupEl = host.lastElementChild;
	var childHost = FilterSTAGroupChildren(groupEl);
	var children = (node && node.children) ? node.children : [];
	for (var i = 0; i < children.length; i++) {
		if (children[i].type === "group")
			FilterSTAMountGroup(childHost, children[i], false, depth + 1);
		else
			childHost.insertAdjacentHTML("beforeend", FilterSTAConditionCardHtml(children[i], depth));
	}
	return groupEl;
}

function FilterSTABindDialogEvents() {
	if (FilterSTADialogBound)
		return;
	FilterSTADialogBound = true;
	var dlg = document.getElementById("DialogFilterSTA");
	dlg.addEventListener("input", function (e) {
		if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"))
			FilterSTAUpdatePreview();
	});
	dlg.addEventListener("change", function (e) {
		if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"))
			FilterSTAUpdatePreview();
	});
	dlg.addEventListener("click", function (e) {
		var card = e.target.closest ? e.target.closest(".FilterSTAConditionCard") : null;
		var group = FilterSTAClosestGroup(e.target);
		if (e.target.closest && e.target.closest("button"))
			return;
		if (card)
			FilterSTASetSelectedCondition(card);
		else if (group)
			FilterSTASetSelectedGroup(group);
		else {
			FilterSTAClearSelectedConditions();
			FilterSTAClearSelectedGroups();
		}
	});
	dlg.addEventListener("dragend", function () {
		FilterSTAClearDropTargets(null);
	});
}

function FilterSTAStripLegacyFilterFields(node) {
	if (!node)
		return;
	delete node.STAboxNames;
	delete node.STAconditionsFilter;
	delete node.STACounter;
	delete node.STAelementFilter;
	delete node.STAinfoFilter;
	delete node.STAFilterSchema;
	delete node.STAFilterRowEntities;
	delete node.STAUrlAPI;
	delete node.STAUrlAPICounter;
}

function FilterSTAFilterForSelectedExpands(node) {
	return {
		entity: node.STAEntityName,
		filterOData: node.STAFilterOData
	};
}

function FilterSTACloneTree(tree) {
	if (!tree)
		return null;
	try {
		return JSON.parse(JSON.stringify(tree));
	} catch (e) {
		return null;
	}
}

function FilterSTAClearDialogUi() {
	FilterSTADragId = null;
	var host = document.getElementById("DialogFilterSTATree");
	if (host)
		host.innerHTML = "";
	var span = document.getElementById("DialogFilterSTAFilterPreview");
	if (span)
		span.textContent = "";
	var urlEl = document.getElementById("DialogFilterSTAParentURL");
	if (urlEl)
		urlEl.textContent = DonaCadena({cat: "URL pare: (cap)", spa: "URL padre: (ninguna)", eng: "Parent URL: (none)"});
}

function FilterSTARevertUncommittedTree() {
	var node = getNodeDialog("DialogFilterSTA");
	if (!node) {
		FilterSTATreeSnapshot = null;
		return;
	}
	if (FilterSTATreeSnapshot) {
		node.STAFilterTree = JSON.parse(FilterSTATreeSnapshot);
		node.STAFilterOData = buildSTAFilterFromFilterSTATree(node.STAFilterTree);
	} else {
		delete node.STAFilterTree;
		delete node.STAFilterOData;
	}
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	FilterSTATreeSnapshot = null;
}

function FilterSTASaveTreeToNode() {
	var node = getNodeDialog("DialogFilterSTA");
	var root = document.getElementById("DialogFilterSTARoot");
	if (!node || !root)
		return;
	node.STAFilterTree = FilterSTAReadGroup(root);
	node.STAFilterOData = buildSTAFilterFromFilterSTATree(node.STAFilterTree);
	FilterSTAStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

function FilterSTAUpdatePreview() {
	var span = document.getElementById("DialogFilterSTAFilterPreview");
	var root = document.getElementById("DialogFilterSTARoot");
	if (!span || !root)
		return;
	FilterSTASyncAllGroupLogicVisibility();
	span.textContent = buildSTAFilterFromFilterSTATree(FilterSTAReadGroup(root)) || "";
}

function FilterSTAApplyFilterToNode(node) {
	if (!node || !node.STAFilterOData)
		return;
	if (node.STAFilterOData.indexOf(FilterSTAIncompletePlaceholder) !== -1)
		return;
	var parentNode = GetFirstParentNode(node);
	if (!parentNode)
		return;
	if (parentNode.STASelectedExpands)
		node.STASelectedExpands = deapCopy(parentNode.STASelectedExpands);
	if (parentNode.STASelectExpandNextOrigin)
		node.STASelectExpandNextOrigin = deapCopy(parentNode.STASelectExpandNextOrigin);
	if (parentNode.STAEntityName && !node.STAEntityName)
		node.STAEntityName = parentNode.STAEntityName;
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);

	var previousSTAURL = node.STAURL;
	if (typeof GetPropagateNodeSelectedSelectExpands === "function") {
		var propagated = GetPropagateNodeSelectedSelectExpands(node, parentNode);
		previousSTAURL = propagated.previousSTAURL;
	} else if (parentNode.STAURL) {
		previousSTAURL = node.STAURL;
		node.STAURL = parentNode.STAURL;
	}

	var selectedExpands = GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin);
	if (!selectedExpands)
		selectedExpands = node.STASelectedExpands = { selected: [], expanded: {} };
	selectedExpands.filter = FilterSTAFilterForSelectedExpands(node);
	FilterSTAStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	FinalizeSelectedSelectExpands(node, previousSTAURL, {cat: "S'estan filtrant les dades STA amb els criteris seleccionats... ", spa: "Filtrando los datos STA con los criterios seleccionados... ", eng: "Filtering STA by selected criteria... "});
	if (typeof updateQueryAndTableArea === "function")
		updateQueryAndTableArea(node);
}

function FilterSTAOk(event) {
	FilterSTASaveTreeToNode();
	FilterSTAUpdatePreview();
	var node = getNodeDialog("DialogFilterSTA");
	if (node)
		FilterSTAApplyFilterToNode(node);
	FilterSTATreeSnapshot = null;
	hideNodeDialog("DialogFilterSTA", event);
}

function FilterSTACancel(event) {
	FilterSTARevertUncommittedTree();
	var node = getNodeDialog("DialogFilterSTA");
	if (node && typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	hideNodeDialog("DialogFilterSTA", event);
}

function FilterSTADialogClosed(event) {
	if (FilterSTATreeSnapshot)
		FilterSTARevertUncommittedTree();
	FilterSTAClearDialogUi();
	hideNodeDialog("DialogFilterSTA", event);
}

function ShowFilterSTADialog() {
	var node, parentNode, url, host, root, tree;
	saveNodeDialog("DialogFilterSTA", currentNode);
	node = getNodeDialog("DialogFilterSTA") || currentNode;
	if (!node)
		return;
	FilterSTAStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	FilterSTAUiGeneration++;
	FilterSTATreeSnapshot = node.STAFilterTree ? JSON.stringify(node.STAFilterTree) : null;
	FilterSTABindDialogEvents();
	FilterSTAClearDialogUi();
	parentNode = GetFirstParentNode(node);
	url = (parentNode && parentNode.STAURL) ? parentNode.STAURL : (node.STAURL || "");
	document.getElementById("DialogFilterSTAParentURL").textContent = url ? (DonaCadena({cat: "URL pare: ", spa: "URL padre: ", eng: "Parent URL: "}) + url) : DonaCadena({cat: "URL pare: (cap)", spa: "URL padre: (ninguna)", eng: "Parent URL: (none)"});
	host = document.getElementById("DialogFilterSTATree");
	tree = (node.STAFilterTree && node.STAFilterTree.type === "group") ? FilterSTACloneTree(node.STAFilterTree) : null;
	if (tree)
		FilterSTAMountGroup(host, tree, true, 1);
	else
		host.insertAdjacentHTML("beforeend", FilterSTAGroupHtml(true, 1, "and"));
	root = document.getElementById("DialogFilterSTARoot") || host.firstElementChild;
	if (root && !FilterSTADirectChildren(root).length)
		FilterSTAAddEmptyCondition(root);
	FilterSTAFillAllValueSelectors();
	FilterSTAUpdatePreview();
}

/* ===== filterOGCDlg.js (moved into STAfilter.js) ===== */

var FilterOGCMaxGroupDepth = 4;
var FilterOGCDragId = null;
var FilterOGCIdSeq = 0;
var FilterOGCLogicSeq = 0;
var FilterOGCDialogBound = false;
var FilterOGCTreeSnapshot = null;
var FilterOGCUiGeneration = 0;
var FilterOGCApplyInProgress = false;

var FilterOGCOperators = [
	{ value: "eq", label: "=" },
	{ value: "ne", label: "≠" },
	{ value: "ge", label: "≥" },
	{ value: "gt", label: ">" },
	{ value: "le", label: "≤" },
	{ value: "lt", label: "<" },
	{ value: "interval_cc", label: "[a,b]" },
	{ value: "interval_oc", label: "(a,b]" },
	{ value: "interval_co", label: "[a,b)" },
	{ value: "interval_oo", label: "(a,b)" }
];

function FilterOGCIsCollectionsPath(node, parentNode) {
	parentNode = parentNode || (node ? GetFirstParentNode(node) : null);
	if ((parentNode && (parentNode.image === "ogcAPICols.png" || parentNode.image === "ogcAPIItems.png")) ||
			(node && (node.image === "ogcAPICols.png" || node.image === "ogcAPIItems.png")))
		return true;
	var t = (parentNode && parentNode.OGCType) || (node && node.OGCType) || "";
	return t === "OGCAPIcollections" || t === "OGCAPIcollection" || t === "OGCAPIitems" || t === "OGCAPIitem";
}

function FilterOGCAllowsApiFilter(node, parentNode) {
	var conf = (node && node.STAOGCAPIconformance) || (parentNode && parentNode.STAOGCAPIconformance);
	if (!conf)
		return false;
	return conf.indexOf("filter") !== -1;
}

function FilterOGCCopyParentFilterMeta(node, parentNode) {
	if (!node || !parentNode)
		return;
	if (parentNode.STAOGCAPIconformance)
		node.STAOGCAPIconformance = parentNode.STAOGCAPIconformance;
	if (parentNode.STAOGCAPIqueryable)
		node.STAOGCAPIqueryable = parentNode.STAOGCAPIqueryable;
	if (parentNode.OGCType && !node.OGCType)
		node.OGCType = parentNode.OGCType;
}

async function FilterOGCEnsureConformance(node) {
	if (!node)
		return;
	if (node.STAOGCAPIconformance && node.STAOGCAPIconformance.length)
		return;
	var parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : null;
	if (parentNode && parentNode.STAOGCAPIconformance && parentNode.STAOGCAPIconformance.length) {
		node.STAOGCAPIconformance = parentNode.STAOGCAPIconformance;
		if (typeof networkNodes !== "undefined" && networkNodes.update)
			networkNodes.update(node);
		return;
	}
	var confSource = parentNode;
	while (confSource && confSource.image !== "ogcAPICols.png" && confSource.OGCType !== "OGCAPIcollections") {
		if (confSource.STAOGCAPIconformance && confSource.STAOGCAPIconformance.length) {
			node.STAOGCAPIconformance = confSource.STAOGCAPIconformance;
			if (typeof networkNodes !== "undefined" && networkNodes.update)
				networkNodes.update(node);
			return;
		}
		confSource = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(confSource) : null;
	}
	var target = confSource || parentNode || node;
	if (typeof askForConformanceInOGCAPIFeatures !== "function" || !target || !target.STAURL)
		return;
	await askForConformanceInOGCAPIFeatures(target);
	node = (typeof networkNodes !== "undefined" && networkNodes.get) ? (networkNodes.get(node.id) || node) : node;
	target = (typeof networkNodes !== "undefined" && networkNodes.get) ? (networkNodes.get(target.id) || target) : target;
	if (target.STAOGCAPIconformance)
		node.STAOGCAPIconformance = target.STAOGCAPIconformance;
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

async function OpenFilterRowsAfterOgcCollections(node) {
	if (!node)
		return;
	var parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : null;
	FilterOGCCopyParentFilterMeta(node, parentNode);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	if (node.image === "FilterRowsTable.png") {
		if (typeof currentNode !== "undefined")
			currentNode = node;
		await ShowFilterTableDialog();
		showNodeDialog("DialogFilterTable");
		return;
	}
	if (node.image === "FilterRowsSTA.png" && FilterOGCIsCollectionsPath(node, parentNode)) {
		await FilterOGCEnsureConformance(node);
		node = (typeof networkNodes !== "undefined" && networkNodes.get) ? (networkNodes.get(node.id) || node) : node;
		parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : parentNode;
		if (typeof currentNode !== "undefined")
			currentNode = node;
		if (FilterOGCAllowsApiFilter(node, parentNode)) {
			await ShowFilterOGCDialog();
			showNodeDialog("DialogFilterOGC");
		} else {
			await ShowFilterTableDialog();
			showNodeDialog("DialogFilterTable");
		}
		return;
	}
	if (node.image === "FilterRowsSTA.png") {
		ShowFilterSTADialog();
		showNodeDialog("DialogFilterSTA");
	} else if (node.image === "FilterRowsTable.png") {
		if (typeof currentNode !== "undefined")
			currentNode = node;
		await ShowFilterTableDialog();
		showNodeDialog("DialogFilterTable");
	} else if (parentNode) {
		if (typeof currentNode !== "undefined")
			currentNode = node;
		await ShowFilterTableDialog();
		showNodeDialog("DialogFilterTable");
	}
}

function FilterOGCIsIntervalOperator(op) {
	return op && op.indexOf("interval_") === 0;
}

function FilterOGCNextId(prefix) {
	FilterOGCIdSeq++;
	return (prefix || "FilterOGC") + "_" + FilterOGCIdSeq;
}

function FilterOGCOnPropertyChange(sel) {
	var card = sel.closest(".FilterOGCConditionCard");
	if (!card)
		return;
	var depth = parseInt(sel.getAttribute("data-cascade-depth") || "0", 10);
	if (sel.classList.contains("FilterOGCProperty") || sel.classList.contains("FilterOGCPropertyNest")) {
		var hop = sel.closest(".FilterOGCPropertyHop");
		if (hop) {
			var typed = hop.querySelector(".FilterOGCPropertyKeyInput");
			if (typed)
				typed.value = "";
		}
	}
	var parts = FilterOGCReadPropertySegments(card).slice(0, depth + 1);
	card.setAttribute("data-property-path", parts.join("/"));
	FilterOGCFillValueSelectors(card);
}

function FilterOGCOnPropertyKeyType(input) {
	FilterOGCUpdatePreview();
}

function FilterOGCPropertyPathParts(property) {
	if (!property)
		return [];
	return String(property).split("/").filter(function (p) { return p; });
}

function FilterOGCIsMetaKey(name) {
	if (!name)
		return true;
	return name.indexOf("@iot.") !== -1 || name.indexOf("@odata.") !== -1;
}

function FilterOGCIsPlainObject(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return false;
	if (value instanceof Date || Object.prototype.toString.call(value) === "[object Date]")
		return false;
	return true;
}

function FilterOGCIsOpenBagName(name) {
	return name === "properties" || name === "parameters" || name === "dataQuality" || name === "resultQuality";
}

function FilterOGCWalkRecord(record, parts) {
	var cur = record;
	for (var i = 0; i < parts.length; i++) {
		if (cur == null || typeof cur !== "object")
			return undefined;
		cur = cur[parts[i]];
	}
	return cur;
}

function FilterOGCCollectSamples(propParts) {
	var dataNode = FilterOGCValueDataNode();
	var data = dataNode && dataNode.STAdata;
	var samples = [];
	if (!data || !data.length)
		return samples;
	var parts = propParts || [];
	var n = Math.min(data.length, 250);
	for (var i = 0; i < n; i++) {
		var value = parts.length ? FilterOGCWalkRecord(data[i], parts) : data[i];
		if (typeof value !== "undefined")
			samples.push(value);
	}
	return samples;
}

function FilterOGCKeysFromAttributes(propParts) {
	var dataNode = FilterOGCValueDataNode();
	var attrs = dataNode && dataNode.STAdataAttributes;
	var keys = {};
	if (!attrs)
		return [];
	var prefix = (propParts || []).join("/");
	if (prefix)
		prefix += "/";
	for (var k in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, k))
			continue;
		if (prefix && k.indexOf(prefix) !== 0)
			continue;
		var rest = prefix ? k.substring(prefix.length) : k;
		if (!rest)
			continue;
		var next = rest.split("/")[0];
		if (next && !FilterOGCIsMetaKey(next))
			keys[next] = true;
	}
	return Object.keys(keys);
}

function FilterOGCAddKey(keySet, name) {
	if (!name || FilterOGCIsMetaKey(name) || name.indexOf("/") !== -1)
		return;
	keySet[name] = true;
}

function FilterOGCCascadeChildInfo(propParts) {
	var samples = FilterOGCCollectSamples(propParts);
	var objectCount = 0;
	var scalarCount = 0;
	var keySet = {};
	for (var i = 0; i < samples.length; i++) {
		var value = samples[i];
		if (value === null || typeof value === "undefined")
			continue;
		if (FilterOGCIsPlainObject(value)) {
			objectCount++;
			var ks = Object.keys(value);
			for (var k = 0; k < ks.length; k++)
				FilterOGCAddKey(keySet, ks[k]);
		} else if (!Array.isArray(value))
			scalarCount++;
	}
	var attrKeys = FilterOGCKeysFromAttributes(propParts);
	for (var a = 0; a < attrKeys.length; a++)
		FilterOGCAddKey(keySet, attrKeys[a]);
	var last = propParts.length ? propParts[propParts.length - 1] : "";
	var openBag = FilterOGCIsOpenBagName(last);
	var keys = Object.keys(keySet).sort();
	var typicalObject = objectCount > 0 && objectCount >= scalarCount;
	var needsSelect = typicalObject || openBag || (!samples.length && keys.length > 0);
	if (openBag)
		needsSelect = true;
	return { needsSelect: needsSelect && (keys.length > 0 || openBag), keys: keys, openBag: openBag };
}

function FilterOGCReadPropertySegments(card) {
	var cascade = card.querySelector(".FilterOGCPropertyCascade");
	if (!cascade)
		return [];
	var parts = [];
	var root = cascade.querySelector(".FilterOGCProperty");
	if (!root || !root.value)
		return [];
	parts.push(root.value);
	var hops = cascade.querySelectorAll(".FilterOGCPropertyHop");
	for (var i = 0; i < hops.length; i++) {
		var typed = hops[i].querySelector(".FilterOGCPropertyKeyInput");
		var sel = hops[i].querySelector("select");
		var val = "";
		if (typed && typed.value.trim())
			val = typed.value.trim();
		else if (sel && sel.value)
			val = sel.value;
		if (!val)
			break;
		parts.push(val);
	}
	return parts;
}

function FilterOGCGetFullPropertyPath(card) {
	return FilterOGCReadPropertySegments(card).join("/");
}

function FilterOGCPropertyHopHtml(depth, info, selected) {
	var keys = info.keys || [];
	var selectedInList = false;
	var opts = ['<option value="">+ key</option>'];
	for (var i = 0; i < keys.length; i++) {
		var sel = selected && selected === keys[i] ? ' selected="selected"' : "";
		if (sel)
			selectedInList = true;
		opts.push('<option value="' + FilterOGCEscapeAttr(keys[i]) + '"' + sel + ">" + FilterOGCEscapeAttr(keys[i]) + "</option>");
	}
	if (selected && !selectedInList && !info.openBag)
		opts.push('<option value="' + FilterOGCEscapeAttr(selected) + '" selected="selected">' + FilterOGCEscapeAttr(selected) + "</option>");
	var input = "";
	if (info.openBag) {
		var typedVal = selected && !selectedInList ? selected : "";
		input = ' <input type="text" class="FilterOGCPropertyKeyInput" data-cascade-depth="' + depth + '" value="' + FilterOGCEscapeAttr(typedVal) + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "o escriviu una clau", spa: "o escriba una clave", eng: "or type a key"})) + '"  onchange="FilterOGCOnPropertyChange(this)" oninput="FilterOGCOnPropertyKeyType(this)">';
	}
	return '<span class="FilterOGCPropertyHop" data-cascade-depth="' + depth + '"> / ' +
		'<select class="FilterOGCPropertyNest" data-cascade-depth="' + depth + '" onchange="FilterOGCOnPropertyChange(this)">' +
		opts.join("") + "</select>" + input + "</span>";
}

function FilterOGCRebuildPropertyCascade(card, preferredParts) {
	var cascade = card.querySelector(".FilterOGCPropertyCascade");
	if (!cascade)
		return;
	preferredParts = preferredParts && preferredParts.length ? preferredParts : FilterOGCReadPropertySegments(card);
	var rootSel = cascade.querySelector(".FilterOGCProperty");
	if (!rootSel)
		return;
	var keepRoot = preferredParts[0] || rootSel.value;
	rootSel.innerHTML = FilterOGCPropertyOptionsHtml(keepRoot);
	var hops = cascade.querySelectorAll(".FilterOGCPropertyHop");
	for (var h = hops.length - 1; h >= 0; h--)
		hops[h].parentNode.removeChild(hops[h]);
	if (!rootSel.value)
		return;
	var prefix = [rootSel.value];
	var depth = 0;
	while (prefix.length && depth < 12) {
		var info = FilterOGCCascadeChildInfo(prefix);
		if (!info.needsSelect)
			break;
		var selected = preferredParts[prefix.length] || "";
		cascade.insertAdjacentHTML("beforeend", FilterOGCPropertyHopHtml(depth + 1, info, selected));
		if (!selected)
			break;
		prefix.push(selected);
		depth++;
	}
}

function FilterOGCQueryableKeys(node) {
	if (!node || !node.STAOGCAPIqueryable || node.STAOGCAPIqueryable === "no")
		return [];
	try {
		return Object.keys(node.STAOGCAPIqueryable);
	} catch (e) {
		return [];
	}
}

function FilterOGCTopLevelPropertyNames() {
	var node = getNodeDialog("DialogFilterOGC");
	var dataNode = FilterOGCValueDataNode();
	var keySet = {};
	var qKeys = FilterOGCQueryableKeys(node) || FilterOGCQueryableKeys(dataNode);
	var i, samples, s, ks, k, attrKeys, a, names;
	if (qKeys.length) {
		for (i = 0; i < qKeys.length; i++)
			FilterOGCAddKey(keySet, qKeys[i]);
	} else {
		samples = FilterOGCCollectSamples([]);
		for (s = 0; s < samples.length; s++) {
			if (FilterOGCIsPlainObject(samples[s])) {
				ks = Object.keys(samples[s]);
				for (k = 0; k < ks.length; k++)
					FilterOGCAddKey(keySet, ks[k]);
			}
		}
		attrKeys = FilterOGCKeysFromAttributes([]);
		for (a = 0; a < attrKeys.length; a++)
			FilterOGCAddKey(keySet, attrKeys[a]);
	}
	names = Object.keys(keySet);
	if (!names.length)
		names = ["id"];
	return names.sort();
}

function FilterOGCPropertyOptionsHtml(selected) {
	var names = FilterOGCTopLevelPropertyNames();
	var selectedInList = false;
	var cdns = [];
	for (var j = 0; j < names.length; j++) {
		var sel = selected && selected === names[j] ? ' selected="selected"' : "";
		if (sel)
			selectedInList = true;
		cdns.push('<option value="' + FilterOGCEscapeAttr(names[j]) + '"' + sel + ">" + FilterOGCEscapeAttr(names[j]) + "</option>");
	}
	if (selected && !selectedInList)
		cdns.push('<option value="' + FilterOGCEscapeAttr(selected) + '" selected="selected">' + FilterOGCEscapeAttr(selected) + "</option>");
	return cdns.join("");
}

function FilterOGCOperatorOptionsHtml(selected) {
	var ops = [];
	for (var i = 0; i < FilterOGCOperators.length; i++) {
		var v = FilterOGCOperators[i].value;
		var sel = selected && selected === v ? ' selected="selected"' : "";
		ops.push('<option value="' + v + '"' + sel + ">" + FilterOGCOperators[i].label + "</option>");
	}
	return ops.join("");
}

function FilterOGCGroupHtml(isRoot, depth, logic) {
	var id = isRoot ? "DialogFilterOGCRoot" : FilterOGCNextId("FilterOGCGroup");
	FilterOGCLogicSeq++;
	var radioName = "FilterOGCLogic_" + FilterOGCLogicSeq;
	var andChecked = (!logic || logic === "and") ? ' checked="checked"' : "";
	var orChecked = (logic === "or") ? ' checked="checked"' : "";
	var dragHandle = isRoot ? "" : '<span class="FilterOGCDragHandle" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Arrossega el grup", spa: "Arrastrar el grupo", eng: "Drag group"})) + '"  draggable="true" ondragstart="FilterOGCOnDragStart(event)" ondragend="FilterOGCOnDragEnd(event)">&#8942;&#8942;</span> ';
	var dupBtn = isRoot ? "" : '<button type="button" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"})) + '" onclick="FilterOGCDuplicateItem(this)">' + DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"}) + '</button> ';
	var removeBtn = isRoot ? "" : '<button type="button" onclick="FilterOGCRemoveItem(this)">' + DonaCadena({cat: "Suprimeix", spa: "Eliminar", eng: "Remove"}) + '</button>';
	var addGroup = depth >= FilterOGCMaxGroupDepth ? "" : '<button type="button" onclick="FilterOGCAddGroup(this)">' + DonaCadena({cat: "+ grup", spa: "+ grupo", eng: "+ group"}) + '</button> ';
	var depthClass = (depth % 2 === 0) ? "FilterOGCGroupEven" : "FilterOGCGroupOdd";
	return '<fieldset class="FilterOGCGroup ' + depthClass + '" data-depth="' + depth + '" id="' + id + '"' +
		' ondragover="FilterOGCOnDragOver(event)" ondragleave="FilterOGCOnDragLeave(event)" ondrop="FilterOGCOnDrop(event)">' +
		'<legend class="FilterOGCGroupLegend">' +
		'<span class="FilterOGCGroupLegendStart">' + dragHandle + DonaCadena({cat: "Grup ", spa: "Grupo ", eng: "Group "}) + dupBtn + removeBtn + "</span>" +
		"</legend>" +
		'<div class="FilterOGCGroupToolbar">' +
		'<button type="button" onclick="FilterOGCAddCondition(this)">' + DonaCadena({cat: "+ condició", spa: "+ condición", eng: "+ condition"}) + '</button> ' +
		addGroup +
		"</div>" +
		'<div class="FilterOGCGroupBody">' +
		'<div class="FilterOGCGroupChildren"></div>' +
		'<div class="FilterOGCGroupLogic">' +
		'<label><input type="radio" name="' + radioName + '" value="and"' + andChecked + '> ' + DonaCadena({cat: "I", spa: "Y", eng: "AND"}) + '</label>' +
		'<label><input type="radio" name="' + radioName + '" value="or"' + orChecked + '> ' + DonaCadena({cat: "O", spa: "O", eng: "OR"}) + '</label>' +
		"</div></div>" +
		"</fieldset>";
}

function FilterOGCConditionStripeClass(parentDepth) {
	return ((parentDepth + 1) % 2 === 0) ? "FilterOGCConditionEven" : "FilterOGCConditionOdd";
}

function FilterOGCSetConditionStripe(card, parentDepth) {
	if (!card)
		return;
	card.classList.remove("FilterOGCConditionOdd", "FilterOGCConditionEven");
	card.classList.add(FilterOGCConditionStripeClass(parentDepth));
}

function FilterOGCConditionCardHtml(state, parentDepth) {
	state = state || {};
	var id = FilterOGCNextId("FilterOGCCond");
	var count = String(FilterOGCIdSeq);
	var interval = FilterOGCIsIntervalOperator(state.operator);
	var propParts = FilterOGCPropertyPathParts(state.property);
	var propAttr = state.property ? ' data-property-path="' + FilterOGCEscapeAttr(state.property) + '"' : "";
	var stripe = FilterOGCConditionStripeClass(parentDepth || 1);
	return '<fieldset class="FilterOGCConditionCard ' + stripe + '" id="' + id + '" data-row-count="' + count + '"' + propAttr + ' style="margin-top:8px;">' +
		'<legend><span class="FilterOGCDragHandle" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Arrossega la condició", spa: "Arrastrar la condición", eng: "Drag condition"})) + '"  draggable="true" ondragstart="FilterOGCOnDragStart(event)" ondragend="FilterOGCOnDragEnd(event)">&#8942;&#8942;</span> ' + DonaCadena({cat: "Condició", spa: "Condición", eng: "Condition"}) + ' ' +
		'<button type="button" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"})) + '" onclick="FilterOGCDuplicateItem(this)">' + DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"}) + '</button> ' +
		'<button type="button" onclick="FilterOGCRemoveItem(this)">' + DonaCadena({cat: "Suprimeix", spa: "Eliminar", eng: "Remove"}) + '</button></legend>' +
		'<div class="FilterOGCPropertyRow">' + DonaCadena({cat: "Propietat: ", spa: "Propiedad: ", eng: "Property: "}) +
		'<span class="FilterOGCPropertyCascade">' +
		'<select class="FilterOGCProperty" id="selectorColumns_' + count + '" data-cascade-depth="0" onchange="FilterOGCOnPropertyChange(this)">' +
		FilterOGCPropertyOptionsHtml(propParts[0]) + "</select>" +
		"</span></div>" +
		'<div style="margin-top:6px;">' + DonaCadena({cat: "Operador: ", spa: "Operador: ", eng: "Operator: "}) +
		'<select class="FilterOGCOperator" onchange="FilterOGCOnOperatorChange(this)">' + FilterOGCOperatorOptionsHtml(state.operator) + "</select>" +
		"</div>" +
		FilterOGCValuePanelHtml(count, state, interval) +
		"</fieldset>";
}

function FilterOGCValuePanelHtml(count, state, interval) {
	var v = FilterOGCEscapeAttr(state.value || "");
	var a = FilterOGCEscapeAttr(state.valueA || "");
	var b = FilterOGCEscapeAttr(state.valueB || "");
	var listId = "FilterOGCValueList_" + count;
	return '<div class="FilterOGCValuePanel" style="margin-top:6px;">' +
		'<datalist id="' + listId + '"></datalist>' +
		'<span class="FilterOGCValueSingle" style="display:' + (interval ? "none" : "inline") + ';">' +
		'<label>' + DonaCadena({cat: "Valor: ", spa: "Valor: ", eng: "Value: "}) +
		'<input type="text" class="FilterOGCValue" id="inputText_' + count + '" list="' + listId + '" value="' + v + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off">' +
		"</label></span>" +
		'<span class="FilterOGCValueInterval" style="display:' + (interval ? "inline" : "none") + ';">' +
		'<label>a: <input type="text" class="FilterOGCValueA" id="inputTextInterval1_' + count + '" list="' + listId + '" value="' + a + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off"></label> ' +
		'<label>b: <input type="text" class="FilterOGCValueB" id="inputTextInterval2_' + count + '" list="' + listId + '" value="' + b + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off"></label>' +
		"</span></div>";
}

function FilterOGCValueDataNode() {
	var node = getNodeDialog("DialogFilterOGC");
	if (!node)
		return null;
	var parentNode = GetFirstParentNode(node);
	if (parentNode && parentNode.STAdata && parentNode.STAdata.length)
		return parentNode;
	if (node.STAdata && node.STAdata.length)
		return node;
	return parentNode || node;
}

function FilterOGCTableHasProperty(dataNode, prop) {
	if (!dataNode || !prop)
		return false;
	var parts = FilterOGCPropertyPathParts(prop);
	var flat = parts.join("/");
	if (dataNode.STAdataAttributes) {
		if (dataNode.STAdataAttributes[flat] || dataNode.STAdataAttributes[prop])
			return true;
	}
	if (!dataNode.STAdata || !dataNode.STAdata.length)
		return false;
	var n = Math.min(dataNode.STAdata.length, 250);
	for (var r = 0; r < n; r++) {
		if (typeof FilterOGCWalkRecord(dataNode.STAdata[r], parts) !== "undefined")
			return true;
	}
	return false;
}

function FilterOGCNestedUniqueValues(data, column) {
	var valuesArray = [];
	if (!data || !column)
		return valuesArray;
	var parts = String(column).split("/");
	for (var i = 0; i < data.length; i++) {
		var valor = data[i];
		for (var a = 0; a < parts.length && valor != null && typeof valor !== "undefined"; a++)
			valor = valor[parts[a]];
		if (typeof valor === "undefined")
			continue;
		if (!valuesArray.find(function (element) { return element == valor; }))
			valuesArray.push(valor);
	}
	return (typeof sortValuesNumbersOrText === "function") ? sortValuesNumbersOrText(valuesArray) : valuesArray;
}

function FilterOGCApplyOptionsToValueDatalist(count, values) {
	var list = document.getElementById("FilterOGCValueList_" + count);
	if (!list)
		return;
	list.innerHTML = "";
	if (!values)
		return;
	for (var i = 0; i < values.length; i++) {
		if (typeof values[i] === "undefined" || values[i] === null)
			continue;
		var option = document.createElement("option");
		option.value = String(values[i]);
		list.appendChild(option);
	}
}

async function FilterOGCFillValueSelectors(card) {
	if (!card)
		return;
	var gen = FilterOGCUiGeneration;
	var count = card.getAttribute("data-row-count");
	if (!count)
		return;
	var stored = card.getAttribute("data-property-path");
	var parts = stored ? FilterOGCPropertyPathParts(stored) : FilterOGCReadPropertySegments(card);
	FilterOGCRebuildPropertyCascade(card, parts);
	if (stored)
		card.removeAttribute("data-property-path");
	var prop = FilterOGCGetFullPropertyPath(card);
	var dataNode = FilterOGCValueDataNode();
	var localValues = null;
	if (prop && dataNode && FilterOGCTableHasProperty(dataNode, prop)) {
		if (prop.indexOf("/") === -1 && typeof obtainValuesFromSTAdataInCSV === "function")
			localValues = obtainValuesFromSTAdataInCSV(prop, dataNode);
		else
			localValues = FilterOGCNestedUniqueValues(dataNode.STAdata, prop);
	}
	if (localValues && localValues.length)
		localValues = FilterOGCScalarUniqueValues(localValues);
	if (gen !== FilterOGCUiGeneration || !card.isConnected)
		return;
	if (localValues && localValues.length)
		FilterOGCApplyOptionsToValueDatalist(count, localValues);
	else
		FilterOGCApplyOptionsToValueDatalist(count, []);
	FilterOGCUpdatePreview();
}

function FilterOGCScalarUniqueValues(values) {
	var out = [];
	if (!values)
		return out;
	for (var i = 0; i < values.length; i++) {
		var value = values[i];
		if (typeof value === "undefined" || FilterOGCIsPlainObject(value) || Array.isArray(value))
			continue;
		out.push(value);
	}
	return out;
}

async function FilterOGCFillAllValueSelectors() {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg)
		return;
	var cards = dlg.querySelectorAll(".FilterOGCConditionCard");
	for (var i = 0; i < cards.length; i++)
		await FilterOGCFillValueSelectors(cards[i]);
}

function FilterOGCEscapeAttr(s) {
	return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function FilterOGCClosestGroup(el) {
	return el && el.closest ? el.closest(".FilterOGCGroup") : null;
}

function FilterOGCGroupChildren(group) {
	for (var i = 0; i < group.children.length; i++) {
		var child = group.children[i];
		if (child.classList && child.classList.contains("FilterOGCGroupChildren"))
			return child;
		if (child.classList && child.classList.contains("FilterOGCGroupBody")) {
			for (var j = 0; j < child.children.length; j++) {
				if (child.children[j].classList && child.children[j].classList.contains("FilterOGCGroupChildren"))
					return child.children[j];
			}
		}
	}
	return null;
}

function FilterOGCDirectChildren(group) {
	var host = FilterOGCGroupChildren(group);
	var out = [];
	if (!host)
		return out;
	for (var i = 0; i < host.children.length; i++) {
		var c = host.children[i];
		if (c.classList && (c.classList.contains("FilterOGCConditionCard") || c.classList.contains("FilterOGCGroup")))
			out.push(c);
	}
	return out;
}

function FilterOGCAddEmptyCondition(group) {
	if (!group)
		return null;
	var host = FilterOGCGroupChildren(group);
	if (!host)
		return null;
	host.insertAdjacentHTML("beforeend", FilterOGCConditionCardHtml(null, parseInt(group.getAttribute("data-depth") || "1", 10)));
	var card = host.lastElementChild;
	FilterOGCFillValueSelectors(card);
	return card;
}

function FilterOGCAddCondition(btn) {
	var group = btn ? FilterOGCClosestGroup(btn) : document.getElementById("DialogFilterOGCRoot");
	if (!group)
		return;
	var card = FilterOGCAddEmptyCondition(group);
	if (card)
		FilterOGCSetSelectedCondition(card);
	FilterOGCUpdatePreview();
}

function FilterOGCAddGroup(btn) {
	var parent = btn ? FilterOGCClosestGroup(btn) : document.getElementById("DialogFilterOGCRoot");
	if (!parent)
		return;
	var depth = parseInt(parent.getAttribute("data-depth") || "1", 10) + 1;
	if (depth > FilterOGCMaxGroupDepth)
		return;
	var host = FilterOGCGroupChildren(parent);
	host.insertAdjacentHTML("beforeend", FilterOGCGroupHtml(false, depth, "and"));
	FilterOGCUpdatePreview();
}

function FilterOGCRemoveItem(btn) {
	var card = btn.closest(".FilterOGCConditionCard");
	var group = btn.closest(".FilterOGCGroup");
	var root = document.getElementById("DialogFilterOGCRoot");
	if (card)
		card.parentNode.removeChild(card);
	else if (group && group !== root)
		group.parentNode.removeChild(group);
	FilterOGCUpdatePreview();
}

function FilterOGCDuplicateItem(btn) {
	var card = btn.closest(".FilterOGCConditionCard");
	var group = btn.closest(".FilterOGCGroup");
	var root = document.getElementById("DialogFilterOGCRoot");
	if (card) {
		var parent = FilterOGCClosestGroup(card);
		var parentDepth = parent ? parseInt(parent.getAttribute("data-depth") || "1", 10) : 1;
		card.insertAdjacentHTML("afterend", FilterOGCConditionCardHtml(FilterOGCReadCondition(card), parentDepth));
		var clone = card.nextElementSibling;
		FilterOGCFillValueSelectors(clone);
		FilterOGCSetSelectedCondition(clone);
		FilterOGCUpdatePreview();
		return;
	}
	if (!group || group === root)
		return;
	var depth = parseInt(group.getAttribute("data-depth") || "1", 10);
	var holder = document.createElement("div");
	FilterOGCMountGroup(holder, FilterOGCReadGroup(group), false, depth);
	var clone = holder.firstElementChild;
	if (!clone)
		return;
	if (group.nextSibling)
		group.parentNode.insertBefore(clone, group.nextSibling);
	else
		group.parentNode.appendChild(clone);
	FilterOGCClearSelectedConditions();
	FilterOGCSetSelectedGroup(clone);
	var nestedCards = clone.querySelectorAll(".FilterOGCConditionCard");
	for (var c = 0; c < nestedCards.length; c++)
		FilterOGCFillValueSelectors(nestedCards[c]);
	FilterOGCUpdatePreview();
}

function FilterOGCOnOperatorChange(sel) {
	var card = sel.closest(".FilterOGCConditionCard");
	var op = sel.value;
	var interval = FilterOGCIsIntervalOperator(op);
	card.querySelector(".FilterOGCValueInterval").style.display = interval ? "inline" : "none";
	card.querySelector(".FilterOGCValueSingle").style.display = interval ? "none" : "inline";
	FilterOGCUpdatePreview();
}

function FilterOGCDraggableItem(el) {
	if (!el)
		return null;
	var cond = el.closest(".FilterOGCConditionCard");
	if (cond)
		return cond;
	var group = el.closest(".FilterOGCGroup");
	if (group && group.id !== "DialogFilterOGCRoot")
		return group;
	return null;
}

function FilterOGCOnDragStart(event) {
	var item = FilterOGCDraggableItem(event.target);
	if (!item) {
		event.preventDefault();
		return;
	}
	FilterOGCDragId = item.id;
	FilterOGCClearDragging();
	item.classList.add("FilterOGCDragging");
	event.dataTransfer.effectAllowed = "move";
	try {
		event.dataTransfer.setData("text/plain", item.id);
	} catch (e) { }
	event.stopPropagation();
}

function FilterOGCClearDragging() {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterOGCDragging");
	while (els.length)
		els[0].classList.remove("FilterOGCDragging");
}

function FilterOGCOnDragEnd(event) {
	FilterOGCClearDragging();
	FilterOGCClearDropTargets(null);
	FilterOGCDragId = null;
	if (event)
		event.stopPropagation();
}

function FilterOGCClearDropTargets(exceptGroup) {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterOGCGroup");
	for (var i = 0; i < els.length; i++) {
		if (els[i] !== exceptGroup)
			els[i].classList.remove("FilterOGCGroupDropTarget");
	}
}

function FilterOGCSetDropTarget(group) {
	FilterOGCClearDropTargets(group);
	if (group)
		group.classList.add("FilterOGCGroupDropTarget");
}

function FilterOGCOnDragOver(event) {
	var overCard;
	if (!FilterOGCDragId)
		return;
	event.preventDefault();
	event.stopPropagation();
	event.dataTransfer.dropEffect = "move";
	overCard = event.target.closest ? event.target.closest(".FilterOGCConditionCard") : null;
	if (overCard)
		FilterOGCClearDropTargets(null);
	else
		FilterOGCSetDropTarget(FilterOGCClosestGroup(event.target));
}

function FilterOGCOnDragLeave(event) {
	var group = FilterOGCClosestGroup(event.target);
	if (!group)
		return;
	if (event.relatedTarget && group.contains(event.relatedTarget))
		return;
	group.classList.remove("FilterOGCGroupDropTarget");
}

function FilterOGCSubtreeDepth(group) {
	var max = parseInt(group.getAttribute("data-depth") || "1", 10);
	var nested = group.querySelectorAll(".FilterOGCGroup");
	for (var i = 0; i < nested.length; i++) {
		var d = parseInt(nested[i].getAttribute("data-depth") || "1", 10);
		if (d > max)
			max = d;
	}
	return max;
}

function FilterOGCSetGroupDepth(group, depth) {
	group.setAttribute("data-depth", String(depth));
	group.classList.remove("FilterOGCGroupOdd", "FilterOGCGroupEven");
	group.classList.add(depth % 2 === 0 ? "FilterOGCGroupEven" : "FilterOGCGroupOdd");
}

function FilterOGCRetargetDepths(group, depth) {
	FilterOGCSetGroupDepth(group, depth);
	var host = FilterOGCGroupChildren(group);
	if (!host)
		return;
	for (var i = 0; i < host.children.length; i++) {
		var c = host.children[i];
		if (c.classList && c.classList.contains("FilterOGCGroup"))
			FilterOGCRetargetDepths(c, depth + 1);
		else if (c.classList && c.classList.contains("FilterOGCConditionCard"))
			FilterOGCSetConditionStripe(c, depth);
	}
}

function FilterOGCOnDrop(event) {
	event.preventDefault();
	event.stopPropagation();
	var targetGroup = FilterOGCClosestGroup(event.target);
	FilterOGCClearDropTargets(null);
	var dragId = FilterOGCDragId || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
	FilterOGCClearDragging();
	FilterOGCDragId = null;
	if (!dragId || !targetGroup)
		return;
	var item = document.getElementById(dragId);
	if (!item)
		return;
	if (item === targetGroup || item.contains(targetGroup))
		return;
	if (item.classList.contains("FilterOGCGroup")) {
		var parentDepth = parseInt(targetGroup.getAttribute("data-depth") || "1", 10);
		var oldDepth = parseInt(item.getAttribute("data-depth") || "1", 10);
		var extra = FilterOGCSubtreeDepth(item) - oldDepth;
		if (parentDepth + 1 + extra > FilterOGCMaxGroupDepth)
			return;
	}
	var host = FilterOGCGroupChildren(targetGroup);
	var before = event.target.closest(".FilterOGCConditionCard, .FilterOGCGroup");
	if (before && before !== targetGroup && before.parentNode === host && before !== item)
		host.insertBefore(item, before);
	else
		host.appendChild(item);
	if (item.classList.contains("FilterOGCGroup"))
		FilterOGCRetargetDepths(item, parseInt(targetGroup.getAttribute("data-depth") || "1", 10) + 1);
	else if (item.classList.contains("FilterOGCConditionCard"))
		FilterOGCSetConditionStripe(item, parseInt(targetGroup.getAttribute("data-depth") || "1", 10));
	FilterOGCUpdatePreview();
}

function FilterOGCQuoteCQL(value) {
	if (value === null || typeof value === "undefined")
		return "";
	var s = String(value).trim();
	if (!s)
		return "";
	if (/^(true|false)$/i.test(s))
		return s.toLowerCase();
	if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s))
		return s;
	return "'" + s.replace(/'/g, "''") + "'";
}

var FilterOGCIncompletePlaceholder = "?";

function FilterOGCPropertyToCQL(prop) {
	if (!prop || !String(prop).trim())
		return FilterOGCIncompletePlaceholder;
	return String(prop).trim().replace(/\//g, ".");
}

function buildOGCFilterQuotedOrPlaceholder(value) {
	if (value === null || typeof value === "undefined" || String(value).trim() === "")
		return FilterOGCIncompletePlaceholder;
	return FilterOGCQuoteCQL(value);
}

function buildOGCFilterConditionFromTree(cond) {
	cond = cond || {};
	var path = FilterOGCPropertyToCQL(cond.property);
	var op = cond.operator || "";
	var val = (cond.value || "").trim();
	var a = (cond.valueA || "").trim();
	var b = (cond.valueB || "").trim();
	var ph = FilterOGCIncompletePlaceholder;
	var cqlOp = { eq: "=", ne: "!=", ge: ">=", gt: ">", le: "<=", lt: "<" };

	if (!op)
		return path + " " + ph + " " + (val ? FilterOGCQuoteCQL(val) : ph);

	if (cqlOp[op])
		return "(" + path + " " + cqlOp[op] + " " + buildOGCFilterQuotedOrPlaceholder(val) + ")";

	if (op === "interval_cc" || op === "interval_oc" || op === "interval_co" || op === "interval_oo") {
		var lo = (op === "interval_oc" || op === "interval_oo") ? ">" : ">=";
		var hi = (op === "interval_co" || op === "interval_oo") ? "<" : "<=";
		return "(" + path + " " + lo + " " + buildOGCFilterQuotedOrPlaceholder(a) + " AND " + path + " " + hi + " " + buildOGCFilterQuotedOrPlaceholder(b) + ")";
	}
	return path + " " + ph + " " + (val ? FilterOGCQuoteCQL(val) : ph);
}

function buildOGCFilterGroupFromTree(group) {
	var children = (group && group.children) ? group.children : [];
	if (!children.length)
		return "(" + FilterOGCIncompletePlaceholder + ")";
	var nexus = (group.logic === "or") ? "OR" : "AND";
	var parts = [];
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		if (!child)
			continue;
		if (child.type === "group")
			parts.push(buildOGCFilterGroupFromTree(child));
		else
			parts.push(buildOGCFilterConditionFromTree(child));
	}
	if (!parts.length)
		return "(" + FilterOGCIncompletePlaceholder + ")";
	if (parts.length === 1)
		return parts[0];
	return "(" + parts.join(" " + nexus + " ") + ")";
}

function buildOGCFilterFromFilterOGCTree(tree) {
	if (!tree)
		return "";
	if (tree.type === "group")
		return buildOGCFilterGroupFromTree(tree);
	if (tree.type === "condition")
		return buildOGCFilterConditionFromTree(tree);
	return FilterOGCIncompletePlaceholder;
}

function FilterOGCGroupLogicBox(group) {
	var i, k, child;
	if (!group)
		return null;
	for (i = 0; i < group.children.length; i++) {
		child = group.children[i];
		if (child.classList && child.classList.contains("FilterOGCGroupLogic"))
			return child;
		if (child.classList && child.classList.contains("FilterOGCGroupBody")) {
			for (k = 0; k < child.children.length; k++) {
				if (child.children[k].classList && child.children[k].classList.contains("FilterOGCGroupLogic"))
					return child.children[k];
			}
		}
	}
	return null;
}

function FilterOGCSyncGroupLogicVisibility(group) {
	var box = FilterOGCGroupLogicBox(group);
	if (!box)
		return;
	if (FilterOGCDirectChildren(group).length > 1)
		box.classList.add("FilterOGCGroupLogicVisible");
	else
		box.classList.remove("FilterOGCGroupLogicVisible");
}

function FilterOGCSyncAllGroupLogicVisibility() {
	var dlg = document.getElementById("DialogFilterOGC");
	var groups, i;
	if (!dlg)
		return;
	groups = dlg.getElementsByClassName("FilterOGCGroup");
	for (i = 0; i < groups.length; i++)
		FilterOGCSyncGroupLogicVisibility(groups[i]);
}

function FilterOGCGroupLogic(group) {
	var box = FilterOGCGroupLogicBox(group);
	var inputs, j;
	if (!box)
		return "and";
	inputs = box.getElementsByTagName("input");
	for (j = 0; j < inputs.length; j++) {
		if (inputs[j].type === "radio" && inputs[j].checked)
			return inputs[j].value;
	}
	return "and";
}

function FilterOGCClearSelectedConditions() {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterOGCConditionSelected");
	while (els.length)
		els[0].classList.remove("FilterOGCConditionSelected");
}

function FilterOGCSetSelectedCondition(card) {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg || !card)
		return;
	FilterOGCClearSelectedConditions();
	card.classList.add("FilterOGCConditionSelected");
	FilterOGCClearSelectedGroups();
}

function FilterOGCClearSelectedGroups() {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterOGCGroupSelected");
	while (els.length)
		els[0].classList.remove("FilterOGCGroupSelected");
}

function FilterOGCSetSelectedGroup(group) {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg || !group)
		return;
	var els = dlg.getElementsByClassName("FilterOGCGroup");
	for (var i = 0; i < els.length; i++)
		els[i].classList.remove("FilterOGCGroupSelected");
	group.classList.add("FilterOGCGroupSelected");
	FilterOGCClearSelectedConditions();
}

function FilterOGCReadCondition(card) {
	var valueEl = card.querySelector(".FilterOGCValue");
	var valueAEl = card.querySelector(".FilterOGCValueA");
	var valueBEl = card.querySelector(".FilterOGCValueB");
	return {
		type: "condition",
		property: FilterOGCGetFullPropertyPath(card),
		operator: card.querySelector(".FilterOGCOperator").value,
		value: valueEl ? (valueEl.value || "") : "",
		valueA: valueAEl ? (valueAEl.value || "") : "",
		valueB: valueBEl ? (valueBEl.value || "") : ""
	};
}

function FilterOGCReadGroup(group) {
	var children = [];
	var kids = FilterOGCDirectChildren(group);
	for (var i = 0; i < kids.length; i++) {
		if (kids[i].classList.contains("FilterOGCConditionCard"))
			children.push(FilterOGCReadCondition(kids[i]));
		else if (kids[i].classList.contains("FilterOGCGroup"))
			children.push(FilterOGCReadGroup(kids[i]));
	}
	return { type: "group", logic: FilterOGCGroupLogic(group), children: children };
}

function FilterOGCMountGroup(host, node, isRoot, depth) {
	host.insertAdjacentHTML("beforeend", FilterOGCGroupHtml(isRoot, depth, node && node.logic));
	var groupEl = host.lastElementChild;
	var childHost = FilterOGCGroupChildren(groupEl);
	var children = (node && node.children) ? node.children : [];
	for (var i = 0; i < children.length; i++) {
		if (children[i].type === "group")
			FilterOGCMountGroup(childHost, children[i], false, depth + 1);
		else
			childHost.insertAdjacentHTML("beforeend", FilterOGCConditionCardHtml(children[i], depth));
	}
	return groupEl;
}

function FilterOGCBindDialogEvents() {
	if (FilterOGCDialogBound)
		return;
	FilterOGCDialogBound = true;
	var dlg = document.getElementById("DialogFilterOGC");
	dlg.addEventListener("input", function (e) {
		if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"))
			FilterOGCUpdatePreview();
	});
	dlg.addEventListener("change", function (e) {
		if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"))
			FilterOGCUpdatePreview();
	});
	dlg.addEventListener("click", function (e) {
		var card = e.target.closest ? e.target.closest(".FilterOGCConditionCard") : null;
		var group = FilterOGCClosestGroup(e.target);
		if (e.target.closest && e.target.closest("button"))
			return;
		if (card)
			FilterOGCSetSelectedCondition(card);
		else if (group)
			FilterOGCSetSelectedGroup(group);
		else {
			FilterOGCClearSelectedConditions();
			FilterOGCClearSelectedGroups();
		}
	});
	dlg.addEventListener("dragend", function () {
		FilterOGCClearDropTargets(null);
	});
}

function FilterOGCStripLegacyFilterFields(node) {
	if (!node)
		return;
	delete node.STAboxNames;
	delete node.STAconditionsFilter;
	delete node.STACounter;
	delete node.STAelementFilter;
	delete node.STAinfoFilter;
	delete node.STAFilterSchema;
	delete node.STAFilterRowEntities;
	delete node.STAUrlAPI;
	delete node.STAUrlAPICounter;
}

function FilterOGCCloneTree(tree) {
	if (!tree)
		return null;
	try {
		return JSON.parse(JSON.stringify(tree));
	} catch (e) {
		return null;
	}
}

function FilterOGCClearDialogUi() {
	FilterOGCDragId = null;
	var host = document.getElementById("DialogFilterOGCTree");
	if (host)
		host.innerHTML = "";
	var span = document.getElementById("DialogFilterOGCFilterPreview");
	if (span)
		span.textContent = "";
	var urlEl = document.getElementById("DialogFilterOGCParentURL");
	if (urlEl)
		urlEl.textContent = DonaCadena({cat: "URL pare: (cap)", spa: "URL padre: (ninguna)", eng: "Parent URL: (none)"});
}

function FilterOGCRevertUncommittedTree() {
	var node = getNodeDialog("DialogFilterOGC");
	if (!node) {
		FilterOGCTreeSnapshot = null;
		return;
	}
	if (FilterOGCTreeSnapshot) {
		node.STAFilterTreeOGC = JSON.parse(FilterOGCTreeSnapshot);
		node.STAFilterCQL = buildOGCFilterFromFilterOGCTree(node.STAFilterTreeOGC);
	} else {
		delete node.STAFilterTreeOGC;
		delete node.STAFilterCQL;
	}
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	FilterOGCTreeSnapshot = null;
}

function FilterOGCSaveTreeToNode() {
	var node = getNodeDialog("DialogFilterOGC");
	var root = document.getElementById("DialogFilterOGCRoot");
	if (!node || !root)
		return;
	node.STAFilterTreeOGC = FilterOGCReadGroup(root);
	node.STAFilterCQL = buildOGCFilterFromFilterOGCTree(node.STAFilterTreeOGC);
	FilterOGCStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

function FilterOGCUpdatePreview() {
	var span = document.getElementById("DialogFilterOGCFilterPreview");
	var root = document.getElementById("DialogFilterOGCRoot");
	if (!span || !root)
		return;
	FilterOGCSyncAllGroupLogicVisibility();
	span.textContent = buildOGCFilterFromFilterOGCTree(FilterOGCReadGroup(root)) || "";
}

async function FilterOGCApplyFilterToNode(node) {
	var parentNode, previousURL, conf, cql, sep;
	if (!node)
		return;
	cql = node.STAFilterCQL;
	if (!cql || cql.indexOf(FilterOGCIncompletePlaceholder) !== -1)
		return;
	FilterOGCStripLegacyFilterFields(node);
	parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : null;
	previousURL = (parentNode && parentNode.STAURL) ? parentNode.STAURL : "";
	if (!previousURL)
		return;
	conf = node.STAOGCAPIconformance || (parentNode && parentNode.STAOGCAPIconformance);
	if (parentNode && parentNode.OGCType && !node.OGCType)
		node.OGCType = parentNode.OGCType;
	if (parentNode && parentNode.STAsecurity)
		node.STAsecurity = parentNode.STAsecurity;
	if (conf && conf.indexOf("filter") !== -1 && conf.indexOf("cql-text") !== -1) {
		sep = previousURL.indexOf("?") === -1 ? "?" : "&";
		node.STAURL = previousURL + sep + "filter=" + encodeURIComponent(cql) + "&f=json";
		delete node.OGCExpectedLength;
		if (typeof networkNodes !== "undefined" && networkNodes.update)
			networkNodes.update(node);
		if (typeof LoadJSONNodeSTAData === "function")
			await LoadJSONNodeSTAData(node);
		node = (typeof networkNodes !== "undefined" && networkNodes.get) ? (networkNodes.get(node.id) || node) : node;
		if (typeof UpdateChildenSTAURL === "function")
			UpdateChildenSTAURL(node, node.STAURL, previousURL);
	} else if (typeof FilterTableApplyFilterToNode === "function")
		FilterTableApplyFilterToNode(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	if (typeof network !== "undefined" && network.selectNodes)
		network.selectNodes([node.id]);
	if (typeof updateQueryAndTableArea === "function")
		updateQueryAndTableArea(node);
	else {
		if (typeof ShowQueryNode === "function")
			ShowQueryNode(node);
		if (typeof ShowTableNode === "function")
			ShowTableNode(node);
	}
}

async function FilterOGCOk(event) {
	if (event && event.preventDefault)
		event.preventDefault();
	FilterOGCApplyInProgress = true;
	FilterOGCSaveTreeToNode();
	FilterOGCUpdatePreview();
	var node = getNodeDialog("DialogFilterOGC");
	if (node)
		await FilterOGCApplyFilterToNode(node);
	FilterOGCTreeSnapshot = null;
	FilterOGCApplyInProgress = false;
	hideNodeDialog("DialogFilterOGC", event);
}

function FilterOGCCancel(event) {
	if (event && event.preventDefault)
		event.preventDefault();
	FilterOGCRevertUncommittedTree();
	var node = getNodeDialog("DialogFilterOGC");
	if (node && typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	hideNodeDialog("DialogFilterOGC", event);
}

function FilterOGCDialogClosed(event) {
	if (FilterOGCApplyInProgress)
		return;
	if (FilterOGCTreeSnapshot)
		FilterOGCRevertUncommittedTree();
	FilterOGCClearDialogUi();
	hideNodeDialog("DialogFilterOGC", event);
}

async function FilterOGCEnsureQueryables(node) {
	if (!node || node.STAOGCAPIqueryable)
		return;
	if (typeof askForCollectionQueryables === "function")
		await askForCollectionQueryables(node);
}

async function ShowFilterOGCDialog() {
	var node, parentNode, url, host, root, tree;
	saveNodeDialog("DialogFilterOGC", currentNode);
	node = getNodeDialog("DialogFilterOGC") || currentNode;
	if (!node)
		return;
	parentNode = GetFirstParentNode(node);
	if (parentNode) {
		if (parentNode.STAdata)
			node.STAdata = deapCopy(parentNode.STAdata);
		if (!node.STAdataAttributes)
			node.STAdataAttributes = parentNode.STAdataAttributes ? deapCopy(parentNode.STAdataAttributes) : (parentNode.STAdata ? getDataAttributes(parentNode.STAdata) : node.STAdataAttributes);
		if (parentNode.STAURL)
			node.STAURL = deapCopy(parentNode.STAURL);
		if (parentNode.STAOGCAPIconformance)
			node.STAOGCAPIconformance = parentNode.STAOGCAPIconformance;
		if (parentNode.STAOGCAPIqueryable)
			node.STAOGCAPIqueryable = parentNode.STAOGCAPIqueryable;
		if (parentNode.OGCType && !node.OGCType)
			node.OGCType = parentNode.OGCType;
	}
	FilterOGCStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	await FilterOGCEnsureConformance(node);
	await FilterOGCEnsureQueryables(node);
	node = getNodeDialog("DialogFilterOGC") || node;
	if (typeof networkNodes !== "undefined" && networkNodes.get)
		node = networkNodes.get(node.id) || node;
	FilterOGCUiGeneration++;
	FilterOGCTreeSnapshot = node.STAFilterTreeOGC ? JSON.stringify(node.STAFilterTreeOGC) : null;
	FilterOGCBindDialogEvents();
	FilterOGCClearDialogUi();
	url = (parentNode && parentNode.STAURL) ? parentNode.STAURL : (node.STAURL || "");
	document.getElementById("DialogFilterOGCParentURL").textContent = url ? (DonaCadena({cat: "URL pare: ", spa: "URL padre: ", eng: "Parent URL: "}) + url) : DonaCadena({cat: "URL pare: (cap)", spa: "URL padre: (ninguna)", eng: "Parent URL: (none)"});
	host = document.getElementById("DialogFilterOGCTree");
	tree = (node.STAFilterTreeOGC && node.STAFilterTreeOGC.type === "group") ? FilterOGCCloneTree(node.STAFilterTreeOGC) : null;
	if (tree)
		FilterOGCMountGroup(host, tree, true, 1);
	else
		host.insertAdjacentHTML("beforeend", FilterOGCGroupHtml(true, 1, "and"));
	root = document.getElementById("DialogFilterOGCRoot") || host.firstElementChild;
	if (root && !FilterOGCDirectChildren(root).length)
		FilterOGCAddEmptyCondition(root);
	await FilterOGCFillAllValueSelectors();
	FilterOGCUpdatePreview();
}

/* ===== filterTableDlg.js (moved into STAfilter.js) ===== */

var FilterTableMaxGroupDepth = 4;
var FilterTableDragId = null;
var FilterTableIdSeq = 0;
var FilterTableLogicSeq = 0;
var FilterTableDialogBound = false;
var FilterTableTreeSnapshot = null;
var FilterTableUiGeneration = 0;
var FilterTableApplyInProgress = false;

var FilterTableOperators = [
	{ value: "eq", label: "=" },
	{ value: "ne", label: "≠" },
	{ value: "ge", label: "≥" },
	{ value: "gt", label: ">" },
	{ value: "le", label: "≤" },
	{ value: "lt", label: "<" },
	{ value: "interval_cc", label: "[a,b]" },
	{ value: "interval_oc", label: "(a,b]" },
	{ value: "interval_co", label: "[a,b)" },
	{ value: "interval_oo", label: "(a,b)" },
	{ value: "contains", label: "contains" },
	{ value: "not_contains", label: "no contains" },
	{ value: "startswith", label: "starts with" },
	{ value: "endswith", label: "ends with" },
	{ value: "year", label: "year" },
	{ value: "month", label: "month" },
	{ value: "day", label: "day" },
	{ value: "hour", label: "hour" },
	{ value: "minute", label: "minute" },
	{ value: "date", label: "date" }
];

function FilterTableIsIntervalOperator(op) {
	return op && op.indexOf("interval_") === 0;
}

function FilterTableNextId(prefix) {
	FilterTableIdSeq++;
	return (prefix || "FilterTable") + "_" + FilterTableIdSeq;
}

function FilterTableOnPropertyChange(sel) {
	var card = sel.closest(".FilterTableConditionCard");
	if (!card)
		return;
	var depth = parseInt(sel.getAttribute("data-cascade-depth") || "0", 10);
	if (sel.classList.contains("FilterTableProperty") || sel.classList.contains("FilterTablePropertyNest")) {
		var hop = sel.closest(".FilterTablePropertyHop");
		if (hop) {
			var typed = hop.querySelector(".FilterTablePropertyKeyInput");
			if (typed)
				typed.value = "";
		}
	}
	var parts = FilterTableReadPropertySegments(card).slice(0, depth + 1);
	card.setAttribute("data-property-path", parts.join("/"));
	FilterTableFillValueSelectors(card);
}

function FilterTableOnPropertyKeyType(input) {
	FilterTableUpdatePreview();
}

function FilterTablePropertyPathParts(property) {
	if (!property)
		return [];
	return String(property).split("/").filter(function (p) { return p; });
}

function FilterTableIsMetaKey(name) {
	if (!name)
		return true;
	return name.indexOf("@iot.") !== -1 || name.indexOf("@odata.") !== -1;
}

function FilterTableIsPlainObject(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return false;
	if (value instanceof Date || Object.prototype.toString.call(value) === "[object Date]")
		return false;
	return true;
}

function FilterTableIsOpenBagName(name) {
	return name === "properties" || name === "parameters" || name === "dataQuality" || name === "resultQuality";
}

function FilterTableWalkRecord(record, parts) {
	var cur = record;
	for (var i = 0; i < parts.length; i++) {
		if (cur == null || typeof cur !== "object")
			return undefined;
		cur = cur[parts[i]];
	}
	return cur;
}

function FilterTableCollectSamples(propParts) {
	var dataNode = FilterTableValueDataNode();
	var data = dataNode && dataNode.STAdata;
	var samples = [];
	if (!data || !data.length)
		return samples;
	var parts = propParts || [];
	var n = Math.min(data.length, 250);
	for (var i = 0; i < n; i++) {
		var value = parts.length ? FilterTableWalkRecord(data[i], parts) : data[i];
		if (typeof value !== "undefined")
			samples.push(value);
	}
	return samples;
}

function FilterTableKeysFromAttributes(propParts) {
	var dataNode = FilterTableValueDataNode();
	var attrs = dataNode && dataNode.STAdataAttributes;
	var keys = {};
	if (!attrs)
		return [];
	var prefix = (propParts || []).join("/");
	if (prefix)
		prefix += "/";
	for (var k in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, k))
			continue;
		if (prefix && k.indexOf(prefix) !== 0)
			continue;
		var rest = prefix ? k.substring(prefix.length) : k;
		if (!rest)
			continue;
		var next = rest.split("/")[0];
		if (next && !FilterTableIsMetaKey(next))
			keys[next] = true;
	}
	return Object.keys(keys);
}

function FilterTableAddKey(keySet, name) {
	if (!name || FilterTableIsMetaKey(name) || name.indexOf("/") !== -1)
		return;
	keySet[name] = true;
}

function FilterTableCascadeChildInfo(propParts) {
	var samples = FilterTableCollectSamples(propParts);
	var objectCount = 0;
	var scalarCount = 0;
	var keySet = {};
	for (var i = 0; i < samples.length; i++) {
		var value = samples[i];
		if (value === null || typeof value === "undefined")
			continue;
		if (FilterTableIsPlainObject(value)) {
			objectCount++;
			var ks = Object.keys(value);
			for (var k = 0; k < ks.length; k++)
				FilterTableAddKey(keySet, ks[k]);
		} else if (!Array.isArray(value))
			scalarCount++;
	}
	var attrKeys = FilterTableKeysFromAttributes(propParts);
	for (var a = 0; a < attrKeys.length; a++)
		FilterTableAddKey(keySet, attrKeys[a]);
	var last = propParts.length ? propParts[propParts.length - 1] : "";
	var openBag = FilterTableIsOpenBagName(last);
	var keys = Object.keys(keySet).sort();
	var typicalObject = objectCount > 0 && objectCount >= scalarCount;
	var needsSelect = typicalObject || openBag || (!samples.length && keys.length > 0);
	if (openBag)
		needsSelect = true;
	return { needsSelect: needsSelect && (keys.length > 0 || openBag), keys: keys, openBag: openBag };
}

function FilterTableReadPropertySegments(card) {
	var cascade = card.querySelector(".FilterTablePropertyCascade");
	if (!cascade)
		return [];
	var parts = [];
	var root = cascade.querySelector(".FilterTableProperty");
	if (!root || !root.value)
		return [];
	parts.push(root.value);
	var hops = cascade.querySelectorAll(".FilterTablePropertyHop");
	for (var i = 0; i < hops.length; i++) {
		var typed = hops[i].querySelector(".FilterTablePropertyKeyInput");
		var sel = hops[i].querySelector("select");
		var val = "";
		if (typed && typed.value.trim())
			val = typed.value.trim();
		else if (sel && sel.value)
			val = sel.value;
		if (!val)
			break;
		parts.push(val);
	}
	return parts;
}

function FilterTableGetFullPropertyPath(card) {
	return FilterTableReadPropertySegments(card).join("/");
}

function FilterTablePropertyHopHtml(depth, info, selected) {
	var keys = info.keys || [];
	var selectedInList = false;
	var opts = ['<option value="">+ key</option>'];
	for (var i = 0; i < keys.length; i++) {
		var sel = selected && selected === keys[i] ? ' selected="selected"' : "";
		if (sel)
			selectedInList = true;
		opts.push('<option value="' + FilterTableEscapeAttr(keys[i]) + '"' + sel + ">" + FilterTableEscapeAttr(keys[i]) + "</option>");
	}
	if (selected && !selectedInList && !info.openBag)
		opts.push('<option value="' + FilterTableEscapeAttr(selected) + '" selected="selected">' + FilterTableEscapeAttr(selected) + "</option>");
	var input = "";
	if (info.openBag) {
		var typedVal = selected && !selectedInList ? selected : "";
		input = ' <input type="text" class="FilterTablePropertyKeyInput" data-cascade-depth="' + depth + '" value="' + FilterTableEscapeAttr(typedVal) + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "o escriviu una clau", spa: "o escriba una clave", eng: "or type a key"})) + '"  onchange="FilterTableOnPropertyChange(this)" oninput="FilterTableOnPropertyKeyType(this)">';
	}
	return '<span class="FilterTablePropertyHop" data-cascade-depth="' + depth + '"> / ' +
		'<select class="FilterTablePropertyNest" data-cascade-depth="' + depth + '" onchange="FilterTableOnPropertyChange(this)">' +
		opts.join("") + "</select>" + input + "</span>";
}

function FilterTableRebuildPropertyCascade(card, preferredParts) {
	var cascade = card.querySelector(".FilterTablePropertyCascade");
	if (!cascade)
		return;
	preferredParts = preferredParts && preferredParts.length ? preferredParts : FilterTableReadPropertySegments(card);
	var rootSel = cascade.querySelector(".FilterTableProperty");
	if (!rootSel)
		return;
	var keepRoot = preferredParts[0] || rootSel.value;
	rootSel.innerHTML = FilterTablePropertyOptionsHtml(keepRoot);
	var hops = cascade.querySelectorAll(".FilterTablePropertyHop");
	for (var h = hops.length - 1; h >= 0; h--)
		hops[h].parentNode.removeChild(hops[h]);
	if (!rootSel.value)
		return;
	var prefix = [rootSel.value];
	var depth = 0;
	while (prefix.length && depth < 12) {
		var info = FilterTableCascadeChildInfo(prefix);
		if (!info.needsSelect)
			break;
		var selected = preferredParts[prefix.length] || "";
		cascade.insertAdjacentHTML("beforeend", FilterTablePropertyHopHtml(depth + 1, info, selected));
		if (!selected)
			break;
		prefix.push(selected);
		depth++;
	}
}

function FilterTableTopLevelPropertyNames() {
	var node = getNodeDialog("DialogFilterTable");
	var dataNode = FilterTableValueDataNode();
	var keySet = {};
	var samples, s, ks, k, attrKeys, a, names;
	samples = FilterTableCollectSamples([]);
	for (s = 0; s < samples.length; s++) {
		if (FilterTableIsPlainObject(samples[s])) {
			ks = Object.keys(samples[s]);
			for (k = 0; k < ks.length; k++)
				FilterTableAddKey(keySet, ks[k]);
		}
	}
	attrKeys = FilterTableKeysFromAttributes([]);
	for (a = 0; a < attrKeys.length; a++)
		FilterTableAddKey(keySet, attrKeys[a]);
	names = Object.keys(keySet);
	if (!names.length)
		names = ["id"];
	return names.sort();
}

function FilterTablePropertyOptionsHtml(selected) {
	var names = FilterTableTopLevelPropertyNames();
	var selectedInList = false;
	var cdns = [];
	for (var j = 0; j < names.length; j++) {
		var sel = selected && selected === names[j] ? ' selected="selected"' : "";
		if (sel)
			selectedInList = true;
		cdns.push('<option value="' + FilterTableEscapeAttr(names[j]) + '"' + sel + ">" + FilterTableEscapeAttr(names[j]) + "</option>");
	}
	if (selected && !selectedInList)
		cdns.push('<option value="' + FilterTableEscapeAttr(selected) + '" selected="selected">' + FilterTableEscapeAttr(selected) + "</option>");
	return cdns.join("");
}

function FilterTableOperatorOptionsHtml(selected) {
	var ops = [];
	for (var i = 0; i < FilterTableOperators.length; i++) {
		var v = FilterTableOperators[i].value;
		var sel = selected && selected === v ? ' selected="selected"' : "";
		ops.push('<option value="' + v + '"' + sel + ">" + FilterTableOperators[i].label + "</option>");
	}
	return ops.join("");
}

function FilterTableGroupHtml(isRoot, depth, logic) {
	var id = isRoot ? "DialogFilterTableRoot" : FilterTableNextId("FilterTableGroup");
	FilterTableLogicSeq++;
	var radioName = "FilterTableLogic_" + FilterTableLogicSeq;
	var andChecked = (!logic || logic === "and") ? ' checked="checked"' : "";
	var orChecked = (logic === "or") ? ' checked="checked"' : "";
	var dragHandle = isRoot ? "" : '<span class="FilterTableDragHandle" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Arrossega el grup", spa: "Arrastrar el grupo", eng: "Drag group"})) + '"  draggable="true" ondragstart="FilterTableOnDragStart(event)" ondragend="FilterTableOnDragEnd(event)">&#8942;&#8942;</span> ';
	var dupBtn = isRoot ? "" : '<button type="button" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"})) + '" onclick="FilterTableDuplicateItem(this)">' + DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"}) + '</button> ';
	var removeBtn = isRoot ? "" : '<button type="button" onclick="FilterTableRemoveItem(this)">' + DonaCadena({cat: "Suprimeix", spa: "Eliminar", eng: "Remove"}) + '</button>';
	var addGroup = depth >= FilterTableMaxGroupDepth ? "" : '<button type="button" onclick="FilterTableAddGroup(this)">' + DonaCadena({cat: "+ grup", spa: "+ grupo", eng: "+ group"}) + '</button> ';
	var depthClass = (depth % 2 === 0) ? "FilterTableGroupEven" : "FilterTableGroupOdd";
	return '<fieldset class="FilterTableGroup ' + depthClass + '" data-depth="' + depth + '" id="' + id + '"' +
		' ondragover="FilterTableOnDragOver(event)" ondragleave="FilterTableOnDragLeave(event)" ondrop="FilterTableOnDrop(event)">' +
		'<legend class="FilterTableGroupLegend">' +
		'<span class="FilterTableGroupLegendStart">' + dragHandle + DonaCadena({cat: "Grup ", spa: "Grupo ", eng: "Group "}) + dupBtn + removeBtn + "</span>" +
		"</legend>" +
		'<div class="FilterTableGroupToolbar">' +
		'<button type="button" onclick="FilterTableAddCondition(this)">' + DonaCadena({cat: "+ condició", spa: "+ condición", eng: "+ condition"}) + '</button> ' +
		addGroup +
		"</div>" +
		'<div class="FilterTableGroupBody">' +
		'<div class="FilterTableGroupChildren"></div>' +
		'<div class="FilterTableGroupLogic">' +
		'<label><input type="radio" name="' + radioName + '" value="and"' + andChecked + '> ' + DonaCadena({cat: "I", spa: "Y", eng: "AND"}) + '</label>' +
		'<label><input type="radio" name="' + radioName + '" value="or"' + orChecked + '> ' + DonaCadena({cat: "O", spa: "O", eng: "OR"}) + '</label>' +
		"</div></div>" +
		"</fieldset>";
}

function FilterTableConditionStripeClass(parentDepth) {
	return ((parentDepth + 1) % 2 === 0) ? "FilterTableConditionEven" : "FilterTableConditionOdd";
}

function FilterTableSetConditionStripe(card, parentDepth) {
	if (!card)
		return;
	card.classList.remove("FilterTableConditionOdd", "FilterTableConditionEven");
	card.classList.add(FilterTableConditionStripeClass(parentDepth));
}

function FilterTableConditionCardHtml(state, parentDepth) {
	state = state || {};
	var id = FilterTableNextId("FilterTableCond");
	var count = String(FilterTableIdSeq);
	var interval = FilterTableIsIntervalOperator(state.operator);
	var inputType = "text";
	if (state.operator === "date")
		inputType = "date";
	else if (state.operator === "year" || state.operator === "month" || state.operator === "day" || state.operator === "hour" || state.operator === "minute")
		inputType = "number";
	var propParts = FilterTablePropertyPathParts(state.property);
	var propAttr = state.property ? ' data-property-path="' + FilterTableEscapeAttr(state.property) + '"' : "";
	var stripe = FilterTableConditionStripeClass(parentDepth || 1);
	return '<fieldset class="FilterTableConditionCard ' + stripe + '" id="' + id + '" data-row-count="' + count + '"' + propAttr + ' style="margin-top:8px;">' +
		'<legend><span class="FilterTableDragHandle" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Arrossega la condició", spa: "Arrastrar la condición", eng: "Drag condition"})) + '"  draggable="true" ondragstart="FilterTableOnDragStart(event)" ondragend="FilterTableOnDragEnd(event)">&#8942;&#8942;</span> ' + DonaCadena({cat: "Condició", spa: "Condición", eng: "Condition"}) + ' ' +
		'<button type="button" title="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"})) + '" onclick="FilterTableDuplicateItem(this)">' + DonaCadena({cat: "Duplica", spa: "Duplicar", eng: "Duplicate"}) + '</button> ' +
		'<button type="button" onclick="FilterTableRemoveItem(this)">' + DonaCadena({cat: "Suprimeix", spa: "Eliminar", eng: "Remove"}) + '</button></legend>' +
		'<div class="FilterTablePropertyRow">' + DonaCadena({cat: "Propietat: ", spa: "Propiedad: ", eng: "Property: "}) +
		'<span class="FilterTablePropertyCascade">' +
		'<select class="FilterTableProperty" id="selectorColumns_' + count + '" data-cascade-depth="0" onchange="FilterTableOnPropertyChange(this)">' +
		FilterTablePropertyOptionsHtml(propParts[0]) + "</select>" +
		"</span></div>" +
		'<div style="margin-top:6px;">' + DonaCadena({cat: "Operador: ", spa: "Operador: ", eng: "Operator: "}) +
		'<select class="FilterTableOperator" onchange="FilterTableOnOperatorChange(this)">' + FilterTableOperatorOptionsHtml(state.operator) + "</select>" +
		"</div>" +
		FilterTableValuePanelHtml(count, state, interval, inputType) +
		"</fieldset>";
}

function FilterTableValuePanelHtml(count, state, interval, inputType) {
	var v = FilterTableEscapeAttr(state.value || "");
	var a = FilterTableEscapeAttr(state.valueA || "");
	var b = FilterTableEscapeAttr(state.valueB || "");
	var listId = "FilterTableValueList_" + count;
	inputType = inputType || "text";
	return '<div class="FilterTableValuePanel" style="margin-top:6px;">' +
		'<datalist id="' + listId + '"></datalist>' +
		'<span class="FilterTableValueSingle" style="display:' + (interval ? "none" : "inline") + ';">' +
		'<label>' + DonaCadena({cat: "Valor: ", spa: "Valor: ", eng: "Value: "}) +
		'<input type="' + inputType + '" class="FilterTableValue" id="inputText_' + count + '" list="' + listId + '" value="' + v + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off">' +
		"</label></span>" +
		'<span class="FilterTableValueInterval" style="display:' + (interval ? "inline" : "none") + ';">' +
		'<label>a: <input type="text" class="FilterTableValueA" id="inputTextInterval1_' + count + '" list="' + listId + '" value="' + a + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off"></label> ' +
		'<label>b: <input type="text" class="FilterTableValueB" id="inputTextInterval2_' + count + '" list="' + listId + '" value="' + b + '" placeholder="' + EscapeForJsHtmlAttr(DonaCadena({cat: "Introduïu un valor", spa: "Introduzca un valor", eng: "Enter a value"})) + '"  autocomplete="off"></label>' +
		"</span></div>";
}

function FilterTableValueDataNode() {
	var node = getNodeDialog("DialogFilterTable");
	if (!node)
		return null;
	var parentNode = GetFirstParentNode(node);
	if (parentNode && parentNode.STAdata && parentNode.STAdata.length)
		return parentNode;
	if (node.STAdata && node.STAdata.length)
		return node;
	return parentNode || node;
}

function FilterTableTableHasProperty(dataNode, prop) {
	if (!dataNode || !prop)
		return false;
	var parts = FilterTablePropertyPathParts(prop);
	var flat = parts.join("/");
	if (dataNode.STAdataAttributes) {
		if (dataNode.STAdataAttributes[flat] || dataNode.STAdataAttributes[prop])
			return true;
	}
	if (!dataNode.STAdata || !dataNode.STAdata.length)
		return false;
	var n = Math.min(dataNode.STAdata.length, 250);
	for (var r = 0; r < n; r++) {
		if (typeof FilterTableWalkRecord(dataNode.STAdata[r], parts) !== "undefined")
			return true;
	}
	return false;
}

function FilterTableNestedUniqueValues(data, column) {
	var valuesArray = [];
	if (!data || !column)
		return valuesArray;
	var parts = String(column).split("/");
	for (var i = 0; i < data.length; i++) {
		var valor = data[i];
		for (var a = 0; a < parts.length && valor != null && typeof valor !== "undefined"; a++)
			valor = valor[parts[a]];
		if (typeof valor === "undefined")
			continue;
		if (!valuesArray.find(function (element) { return element == valor; }))
			valuesArray.push(valor);
	}
	return (typeof sortValuesNumbersOrText === "function") ? sortValuesNumbersOrText(valuesArray) : valuesArray;
}

function FilterTableApplyOptionsToValueDatalist(count, values) {
	var list = document.getElementById("FilterTableValueList_" + count);
	if (!list)
		return;
	list.innerHTML = "";
	if (!values)
		return;
	for (var i = 0; i < values.length; i++) {
		if (typeof values[i] === "undefined" || values[i] === null)
			continue;
		var option = document.createElement("option");
		option.value = String(values[i]);
		list.appendChild(option);
	}
}

async function FilterTableFillValueSelectors(card) {
	if (!card)
		return;
	var gen = FilterTableUiGeneration;
	var count = card.getAttribute("data-row-count");
	if (!count)
		return;
	var stored = card.getAttribute("data-property-path");
	var parts = stored ? FilterTablePropertyPathParts(stored) : FilterTableReadPropertySegments(card);
	FilterTableRebuildPropertyCascade(card, parts);
	if (stored)
		card.removeAttribute("data-property-path");
	var prop = FilterTableGetFullPropertyPath(card);
	var dataNode = FilterTableValueDataNode();
	var localValues = null;
	if (prop && dataNode && FilterTableTableHasProperty(dataNode, prop)) {
		if (prop.indexOf("/") === -1 && typeof obtainValuesFromSTAdataInCSV === "function")
			localValues = obtainValuesFromSTAdataInCSV(prop, dataNode);
		else
			localValues = FilterTableNestedUniqueValues(dataNode.STAdata, prop);
	}
	if (localValues && localValues.length)
		localValues = FilterTableScalarUniqueValues(localValues);
	if (gen !== FilterTableUiGeneration || !card.isConnected)
		return;
	if (localValues && localValues.length)
		FilterTableApplyOptionsToValueDatalist(count, localValues);
	else
		FilterTableApplyOptionsToValueDatalist(count, []);
	FilterTableUpdatePreview();
}

function FilterTableScalarUniqueValues(values) {
	var out = [];
	if (!values)
		return out;
	for (var i = 0; i < values.length; i++) {
		var value = values[i];
		if (typeof value === "undefined" || FilterTableIsPlainObject(value) || Array.isArray(value))
			continue;
		out.push(value);
	}
	return out;
}

async function FilterTableFillAllValueSelectors() {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg)
		return;
	var cards = dlg.querySelectorAll(".FilterTableConditionCard");
	for (var i = 0; i < cards.length; i++)
		await FilterTableFillValueSelectors(cards[i]);
}

function FilterTableEscapeAttr(s) {
	return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function FilterTableClosestGroup(el) {
	return el && el.closest ? el.closest(".FilterTableGroup") : null;
}

function FilterTableGroupChildren(group) {
	for (var i = 0; i < group.children.length; i++) {
		var child = group.children[i];
		if (child.classList && child.classList.contains("FilterTableGroupChildren"))
			return child;
		if (child.classList && child.classList.contains("FilterTableGroupBody")) {
			for (var j = 0; j < child.children.length; j++) {
				if (child.children[j].classList && child.children[j].classList.contains("FilterTableGroupChildren"))
					return child.children[j];
			}
		}
	}
	return null;
}

function FilterTableDirectChildren(group) {
	var host = FilterTableGroupChildren(group);
	var out = [];
	if (!host)
		return out;
	for (var i = 0; i < host.children.length; i++) {
		var c = host.children[i];
		if (c.classList && (c.classList.contains("FilterTableConditionCard") || c.classList.contains("FilterTableGroup")))
			out.push(c);
	}
	return out;
}

function FilterTableAddEmptyCondition(group) {
	if (!group)
		return null;
	var host = FilterTableGroupChildren(group);
	if (!host)
		return null;
	host.insertAdjacentHTML("beforeend", FilterTableConditionCardHtml(null, parseInt(group.getAttribute("data-depth") || "1", 10)));
	var card = host.lastElementChild;
	FilterTableFillValueSelectors(card);
	return card;
}

function FilterTableAddCondition(btn) {
	var group = btn ? FilterTableClosestGroup(btn) : document.getElementById("DialogFilterTableRoot");
	if (!group)
		return;
	var card = FilterTableAddEmptyCondition(group);
	if (card)
		FilterTableSetSelectedCondition(card);
	FilterTableUpdatePreview();
}

function FilterTableAddGroup(btn) {
	var parent = btn ? FilterTableClosestGroup(btn) : document.getElementById("DialogFilterTableRoot");
	if (!parent)
		return;
	var depth = parseInt(parent.getAttribute("data-depth") || "1", 10) + 1;
	if (depth > FilterTableMaxGroupDepth)
		return;
	var host = FilterTableGroupChildren(parent);
	host.insertAdjacentHTML("beforeend", FilterTableGroupHtml(false, depth, "and"));
	FilterTableUpdatePreview();
}

function FilterTableRemoveItem(btn) {
	var card = btn.closest(".FilterTableConditionCard");
	var group = btn.closest(".FilterTableGroup");
	var root = document.getElementById("DialogFilterTableRoot");
	if (card)
		card.parentNode.removeChild(card);
	else if (group && group !== root)
		group.parentNode.removeChild(group);
	FilterTableUpdatePreview();
}

function FilterTableDuplicateItem(btn) {
	var card = btn.closest(".FilterTableConditionCard");
	var group = btn.closest(".FilterTableGroup");
	var root = document.getElementById("DialogFilterTableRoot");
	if (card) {
		var parent = FilterTableClosestGroup(card);
		var parentDepth = parent ? parseInt(parent.getAttribute("data-depth") || "1", 10) : 1;
		card.insertAdjacentHTML("afterend", FilterTableConditionCardHtml(FilterTableReadCondition(card), parentDepth));
		var clone = card.nextElementSibling;
		FilterTableFillValueSelectors(clone);
		FilterTableSetSelectedCondition(clone);
		FilterTableUpdatePreview();
		return;
	}
	if (!group || group === root)
		return;
	var depth = parseInt(group.getAttribute("data-depth") || "1", 10);
	var holder = document.createElement("div");
	FilterTableMountGroup(holder, FilterTableReadGroup(group), false, depth);
	var clone = holder.firstElementChild;
	if (!clone)
		return;
	if (group.nextSibling)
		group.parentNode.insertBefore(clone, group.nextSibling);
	else
		group.parentNode.appendChild(clone);
	FilterTableClearSelectedConditions();
	FilterTableSetSelectedGroup(clone);
	var nestedCards = clone.querySelectorAll(".FilterTableConditionCard");
	for (var c = 0; c < nestedCards.length; c++)
		FilterTableFillValueSelectors(nestedCards[c]);
	FilterTableUpdatePreview();
}

function FilterTableOnOperatorChange(sel) {
	var card = sel.closest(".FilterTableConditionCard");
	var op = sel.value;
	var interval = FilterTableIsIntervalOperator(op);
	card.querySelector(".FilterTableValueInterval").style.display = interval ? "inline" : "none";
	card.querySelector(".FilterTableValueSingle").style.display = interval ? "none" : "inline";
	var input = card.querySelector(".FilterTableValue");
	if (input) {
		if (op === "date")
			input.type = "date";
		else if (op === "year" || op === "month" || op === "day" || op === "hour" || op === "minute")
			input.type = "number";
		else
			input.type = "text";
	}
	FilterTableUpdatePreview();
}

function FilterTableDraggableItem(el) {
	if (!el)
		return null;
	var cond = el.closest(".FilterTableConditionCard");
	if (cond)
		return cond;
	var group = el.closest(".FilterTableGroup");
	if (group && group.id !== "DialogFilterTableRoot")
		return group;
	return null;
}

function FilterTableOnDragStart(event) {
	var item = FilterTableDraggableItem(event.target);
	if (!item) {
		event.preventDefault();
		return;
	}
	FilterTableDragId = item.id;
	FilterTableClearDragging();
	item.classList.add("FilterTableDragging");
	event.dataTransfer.effectAllowed = "move";
	try {
		event.dataTransfer.setData("text/plain", item.id);
	} catch (e) { }
	event.stopPropagation();
}

function FilterTableClearDragging() {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterTableDragging");
	while (els.length)
		els[0].classList.remove("FilterTableDragging");
}

function FilterTableOnDragEnd(event) {
	FilterTableClearDragging();
	FilterTableClearDropTargets(null);
	FilterTableDragId = null;
	if (event)
		event.stopPropagation();
}

function FilterTableClearDropTargets(exceptGroup) {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterTableGroup");
	for (var i = 0; i < els.length; i++) {
		if (els[i] !== exceptGroup)
			els[i].classList.remove("FilterTableGroupDropTarget");
	}
}

function FilterTableSetDropTarget(group) {
	FilterTableClearDropTargets(group);
	if (group)
		group.classList.add("FilterTableGroupDropTarget");
}

function FilterTableOnDragOver(event) {
	var overCard;
	if (!FilterTableDragId)
		return;
	event.preventDefault();
	event.stopPropagation();
	event.dataTransfer.dropEffect = "move";
	overCard = event.target.closest ? event.target.closest(".FilterTableConditionCard") : null;
	if (overCard)
		FilterTableClearDropTargets(null);
	else
		FilterTableSetDropTarget(FilterTableClosestGroup(event.target));
}

function FilterTableOnDragLeave(event) {
	var group = FilterTableClosestGroup(event.target);
	if (!group)
		return;
	if (event.relatedTarget && group.contains(event.relatedTarget))
		return;
	group.classList.remove("FilterTableGroupDropTarget");
}

function FilterTableSubtreeDepth(group) {
	var max = parseInt(group.getAttribute("data-depth") || "1", 10);
	var nested = group.querySelectorAll(".FilterTableGroup");
	for (var i = 0; i < nested.length; i++) {
		var d = parseInt(nested[i].getAttribute("data-depth") || "1", 10);
		if (d > max)
			max = d;
	}
	return max;
}

function FilterTableSetGroupDepth(group, depth) {
	group.setAttribute("data-depth", String(depth));
	group.classList.remove("FilterTableGroupOdd", "FilterTableGroupEven");
	group.classList.add(depth % 2 === 0 ? "FilterTableGroupEven" : "FilterTableGroupOdd");
}

function FilterTableRetargetDepths(group, depth) {
	FilterTableSetGroupDepth(group, depth);
	var host = FilterTableGroupChildren(group);
	if (!host)
		return;
	for (var i = 0; i < host.children.length; i++) {
		var c = host.children[i];
		if (c.classList && c.classList.contains("FilterTableGroup"))
			FilterTableRetargetDepths(c, depth + 1);
		else if (c.classList && c.classList.contains("FilterTableConditionCard"))
			FilterTableSetConditionStripe(c, depth);
	}
}

function FilterTableOnDrop(event) {
	event.preventDefault();
	event.stopPropagation();
	var targetGroup = FilterTableClosestGroup(event.target);
	FilterTableClearDropTargets(null);
	var dragId = FilterTableDragId || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
	FilterTableClearDragging();
	FilterTableDragId = null;
	if (!dragId || !targetGroup)
		return;
	var item = document.getElementById(dragId);
	if (!item)
		return;
	if (item === targetGroup || item.contains(targetGroup))
		return;
	if (item.classList.contains("FilterTableGroup")) {
		var parentDepth = parseInt(targetGroup.getAttribute("data-depth") || "1", 10);
		var oldDepth = parseInt(item.getAttribute("data-depth") || "1", 10);
		var extra = FilterTableSubtreeDepth(item) - oldDepth;
		if (parentDepth + 1 + extra > FilterTableMaxGroupDepth)
			return;
	}
	var host = FilterTableGroupChildren(targetGroup);
	var before = event.target.closest(".FilterTableConditionCard, .FilterTableGroup");
	if (before && before !== targetGroup && before.parentNode === host && before !== item)
		host.insertBefore(item, before);
	else
		host.appendChild(item);
	if (item.classList.contains("FilterTableGroup"))
		FilterTableRetargetDepths(item, parseInt(targetGroup.getAttribute("data-depth") || "1", 10) + 1);
	else if (item.classList.contains("FilterTableConditionCard"))
		FilterTableSetConditionStripe(item, parseInt(targetGroup.getAttribute("data-depth") || "1", 10));
	FilterTableUpdatePreview();
}

function FilterTableQuoteValue(value) {
	if (value === null || typeof value === "undefined")
		return "";
	var s = String(value).trim();
	if (!s)
		return "";
	if (/^(true|false)$/i.test(s))
		return s.toLowerCase();
	if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s))
		return s;
	return "'" + s.replace(/'/g, "''") + "'";
}

var FilterTableIncompletePlaceholder = "?";

function FilterTablePropertyLabel(prop) {
	if (!prop || !String(prop).trim())
		return FilterTableIncompletePlaceholder;
	return String(prop).trim();
}

function buildTableFilterQuotedOrPlaceholder(value) {
	if (value === null || typeof value === "undefined" || String(value).trim() === "")
		return FilterTableIncompletePlaceholder;
	return FilterTableQuoteValue(value);
}

function buildTableFilterConditionFromTree(cond) {
	cond = cond || {};
	var path = FilterTablePropertyLabel(cond.property);
	var op = cond.operator || "";
	var val = (cond.value || "").trim();
	var a = (cond.valueA || "").trim();
	var b = (cond.valueB || "").trim();
	var ph = FilterTableIncompletePlaceholder;
	var cmp = { eq: "=", ne: "≠", ge: "≥", gt: ">", le: "≤", lt: "<" };

	if (!op)
		return path + " " + ph + " " + (val ? FilterTableQuoteValue(val) : ph);

	if (cmp[op])
		return "(" + path + " " + cmp[op] + " " + buildTableFilterQuotedOrPlaceholder(val) + ")";

	if (op === "interval_cc" || op === "interval_oc" || op === "interval_co" || op === "interval_oo") {
		var lo = (op === "interval_oc" || op === "interval_oo") ? ">" : "≥";
		var hi = (op === "interval_co" || op === "interval_oo") ? "<" : "≤";
		return "(" + path + " " + lo + " " + buildTableFilterQuotedOrPlaceholder(a) + " AND " + path + " " + hi + " " + buildTableFilterQuotedOrPlaceholder(b) + ")";
	}
	if (op === "contains")
		return "(" + path + " contains " + buildTableFilterQuotedOrPlaceholder(val) + ")";
	if (op === "not_contains")
		return "(" + path + " no contains " + buildTableFilterQuotedOrPlaceholder(val) + ")";
	if (op === "startswith")
		return "(" + path + " starts with " + buildTableFilterQuotedOrPlaceholder(val) + ")";
	if (op === "endswith")
		return "(" + path + " ends with " + buildTableFilterQuotedOrPlaceholder(val) + ")";
	if (op === "year" || op === "month" || op === "day" || op === "hour" || op === "minute" || op === "date")
		return "(" + op + "(" + path + ") = " + (val ? val : ph) + ")";
	return path + " " + ph + " " + (val ? FilterTableQuoteValue(val) : ph);
}

function buildTableFilterGroupFromTree(group) {
	var children = (group && group.children) ? group.children : [];
	if (!children.length)
		return "(" + FilterTableIncompletePlaceholder + ")";
	var nexus = (group.logic === "or") ? "OR" : "AND";
	var parts = [];
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		if (!child)
			continue;
		if (child.type === "group")
			parts.push(buildTableFilterGroupFromTree(child));
		else
			parts.push(buildTableFilterConditionFromTree(child));
	}
	if (!parts.length)
		return "(" + FilterTableIncompletePlaceholder + ")";
	if (parts.length === 1)
		return parts[0];
	return "(" + parts.join(" " + nexus + " ") + ")";
}

function buildTableFilterFromFilterTableTree(tree) {
	if (!tree)
		return "";
	if (tree.type === "group")
		return buildTableFilterGroupFromTree(tree);
	if (tree.type === "condition")
		return buildTableFilterConditionFromTree(tree);
	return FilterTableIncompletePlaceholder;
}

function FilterTableGroupLogicBox(group) {
	var i, k, child;
	if (!group)
		return null;
	for (i = 0; i < group.children.length; i++) {
		child = group.children[i];
		if (child.classList && child.classList.contains("FilterTableGroupLogic"))
			return child;
		if (child.classList && child.classList.contains("FilterTableGroupBody")) {
			for (k = 0; k < child.children.length; k++) {
				if (child.children[k].classList && child.children[k].classList.contains("FilterTableGroupLogic"))
					return child.children[k];
			}
		}
	}
	return null;
}

function FilterTableSyncGroupLogicVisibility(group) {
	var box = FilterTableGroupLogicBox(group);
	if (!box)
		return;
	if (FilterTableDirectChildren(group).length > 1)
		box.classList.add("FilterTableGroupLogicVisible");
	else
		box.classList.remove("FilterTableGroupLogicVisible");
}

function FilterTableSyncAllGroupLogicVisibility() {
	var dlg = document.getElementById("DialogFilterTable");
	var groups, i;
	if (!dlg)
		return;
	groups = dlg.getElementsByClassName("FilterTableGroup");
	for (i = 0; i < groups.length; i++)
		FilterTableSyncGroupLogicVisibility(groups[i]);
}

function FilterTableGroupLogic(group) {
	var box = FilterTableGroupLogicBox(group);
	var inputs, j;
	if (!box)
		return "and";
	inputs = box.getElementsByTagName("input");
	for (j = 0; j < inputs.length; j++) {
		if (inputs[j].type === "radio" && inputs[j].checked)
			return inputs[j].value;
	}
	return "and";
}

function FilterTableClearSelectedConditions() {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterTableConditionSelected");
	while (els.length)
		els[0].classList.remove("FilterTableConditionSelected");
}

function FilterTableSetSelectedCondition(card) {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg || !card)
		return;
	FilterTableClearSelectedConditions();
	card.classList.add("FilterTableConditionSelected");
	FilterTableClearSelectedGroups();
}

function FilterTableClearSelectedGroups() {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg)
		return;
	var els = dlg.getElementsByClassName("FilterTableGroupSelected");
	while (els.length)
		els[0].classList.remove("FilterTableGroupSelected");
}

function FilterTableSetSelectedGroup(group) {
	var dlg = document.getElementById("DialogFilterTable");
	if (!dlg || !group)
		return;
	var els = dlg.getElementsByClassName("FilterTableGroup");
	for (var i = 0; i < els.length; i++)
		els[i].classList.remove("FilterTableGroupSelected");
	group.classList.add("FilterTableGroupSelected");
	FilterTableClearSelectedConditions();
}

function FilterTableReadCondition(card) {
	var valueEl = card.querySelector(".FilterTableValue");
	var valueAEl = card.querySelector(".FilterTableValueA");
	var valueBEl = card.querySelector(".FilterTableValueB");
	return {
		type: "condition",
		property: FilterTableGetFullPropertyPath(card),
		operator: card.querySelector(".FilterTableOperator").value,
		value: valueEl ? (valueEl.value || "") : "",
		valueA: valueAEl ? (valueAEl.value || "") : "",
		valueB: valueBEl ? (valueBEl.value || "") : ""
	};
}

function FilterTableReadGroup(group) {
	var children = [];
	var kids = FilterTableDirectChildren(group);
	for (var i = 0; i < kids.length; i++) {
		if (kids[i].classList.contains("FilterTableConditionCard"))
			children.push(FilterTableReadCondition(kids[i]));
		else if (kids[i].classList.contains("FilterTableGroup"))
			children.push(FilterTableReadGroup(kids[i]));
	}
	return { type: "group", logic: FilterTableGroupLogic(group), children: children };
}

function FilterTableMountGroup(host, node, isRoot, depth) {
	host.insertAdjacentHTML("beforeend", FilterTableGroupHtml(isRoot, depth, node && node.logic));
	var groupEl = host.lastElementChild;
	var childHost = FilterTableGroupChildren(groupEl);
	var children = (node && node.children) ? node.children : [];
	for (var i = 0; i < children.length; i++) {
		if (children[i].type === "group")
			FilterTableMountGroup(childHost, children[i], false, depth + 1);
		else
			childHost.insertAdjacentHTML("beforeend", FilterTableConditionCardHtml(children[i], depth));
	}
	return groupEl;
}

function FilterTableBindDialogEvents() {
	if (FilterTableDialogBound)
		return;
	FilterTableDialogBound = true;
	var dlg = document.getElementById("DialogFilterTable");
	dlg.addEventListener("input", function (e) {
		if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"))
			FilterTableUpdatePreview();
	});
	dlg.addEventListener("change", function (e) {
		if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"))
			FilterTableUpdatePreview();
	});
	dlg.addEventListener("click", function (e) {
		var card = e.target.closest ? e.target.closest(".FilterTableConditionCard") : null;
		var group = FilterTableClosestGroup(e.target);
		if (e.target.closest && e.target.closest("button"))
			return;
		if (card)
			FilterTableSetSelectedCondition(card);
		else if (group)
			FilterTableSetSelectedGroup(group);
		else {
			FilterTableClearSelectedConditions();
			FilterTableClearSelectedGroups();
		}
	});
	dlg.addEventListener("dragend", function () {
		FilterTableClearDropTargets(null);
	});
}

function FilterTableStripLegacyFilterFields(node) {
	if (!node)
		return;
	delete node.STAboxNames;
	delete node.STAconditionsFilter;
	delete node.STACounter;
	delete node.STAelementFilter;
	delete node.STAinfoFilter;
	delete node.STAFilterSchema;
	delete node.STAFilterRowEntities;
	delete node.STAUrlAPI;
	delete node.STAUrlAPICounter;
	delete node.STAtable;
	delete node.STAtableCounter;
}

function FilterTableCloneTree(tree) {
	if (!tree)
		return null;
	try {
		return JSON.parse(JSON.stringify(tree));
	} catch (e) {
		return null;
	}
}

function FilterTableClearDialogUi() {
	FilterTableDragId = null;
	var host = document.getElementById("DialogFilterTableTree");
	if (host)
		host.innerHTML = "";
	var span = document.getElementById("DialogFilterTableFilterPreview");
	if (span)
		span.textContent = "";
}

function FilterTableRevertUncommittedTree() {
	var node = getNodeDialog("DialogFilterTable");
	if (!node) {
		FilterTableTreeSnapshot = null;
		return;
	}
	if (FilterTableTreeSnapshot) {
		node.STAFilterTreeTable = JSON.parse(FilterTableTreeSnapshot);
		node.STAFilterExpr = buildTableFilterFromFilterTableTree(node.STAFilterTreeTable);
	} else {
		delete node.STAFilterTreeTable;
		delete node.STAFilterExpr;
	}
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	FilterTableTreeSnapshot = null;
}

function FilterTableSaveTreeToNode() {
	var node = getNodeDialog("DialogFilterTable");
	var root = document.getElementById("DialogFilterTableRoot");
	if (!node || !root)
		return;
	node.STAFilterTreeTable = FilterTableReadGroup(root);
	node.STAFilterExpr = buildTableFilterFromFilterTableTree(node.STAFilterTreeTable);
	FilterTableStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
}

function FilterTableUpdatePreview() {
	var span = document.getElementById("DialogFilterTableFilterPreview");
	var root = document.getElementById("DialogFilterTableRoot");
	if (!span || !root)
		return;
	FilterTableSyncAllGroupLogicVisibility();
	span.textContent = buildTableFilterFromFilterTableTree(FilterTableReadGroup(root)) || "";
}

function FilterTableGetRecordValue(record, prop) {
	var parts = FilterTablePropertyPathParts(prop);
	var value = FilterTableWalkRecord(record, parts);
	if (typeof value === "undefined" && parts.length && parts[parts.length - 1] === "id") {
		var alt = parts.slice(0, -1);
		alt.push("@iot.id");
		value = FilterTableWalkRecord(record, alt);
	}
	return value;
}

function FilterTableAsNumber(value) {
	if (typeof value === "number")
		return value;
	var n = parseFloat(value);
	return isNaN(n) ? value : n;
}

function FilterTableAsString(value) {
	if (value === null || typeof value === "undefined")
		return "";
	return String(value);
}

function FilterTableAsDate(value) {
	if (value instanceof Date)
		return value;
	var s = FilterTableAsString(value);
	if (s && s.charAt(s.length - 1) === "Z")
		s = s.slice(0, -1);
	var d = new Date(s);
	return isNaN(d.getTime()) ? null : d;
}

function FilterTableIsConditionComplete(cond) {
	if (!cond || cond.type !== "condition" || !cond.property || !cond.operator)
		return false;
	if (FilterTableIsIntervalOperator(cond.operator))
		return !!(cond.valueA && String(cond.valueA).trim() && cond.valueB && String(cond.valueB).trim());
	return !!(cond.value && String(cond.value).trim());
}

function FilterTablePruneTreeForApply(tree) {
	var i, child, children, kept;
	if (!tree)
		return null;
	if (tree.type === "condition")
		return FilterTableIsConditionComplete(tree) ? tree : null;
	children = tree.children || [];
	kept = [];
	for (i = 0; i < children.length; i++) {
		child = FilterTablePruneTreeForApply(children[i]);
		if (child)
			kept.push(child);
	}
	if (!kept.length)
		return null;
	return { type: "group", logic: tree.logic === "or" ? "or" : "and", children: kept };
}

function FilterTableConditionMatches(cond, record) {
	var cell = FilterTableGetRecordValue(record, cond.property);
	var op = cond.operator;
	var val = (cond.value || "").trim();
	var a = (cond.valueA || "").trim();
	var b = (cond.valueB || "").trim();
	var left, right, lo, hi, d;
	if (!op || !cond.property)
		return false;
	if (op === "eq")
		return FilterTableAsString(cell) == val || FilterTableAsNumber(cell) == FilterTableAsNumber(val);
	if (op === "ne")
		return FilterTableAsString(cell) != val && FilterTableAsNumber(cell) != FilterTableAsNumber(val);
	if (op === "ge" || op === "gt" || op === "le" || op === "lt") {
		left = FilterTableAsNumber(cell);
		right = FilterTableAsNumber(val);
		if (op === "ge")
			return left >= right;
		if (op === "gt")
			return left > right;
		if (op === "le")
			return left <= right;
		return left < right;
	}
	if (op === "interval_cc" || op === "interval_oc" || op === "interval_co" || op === "interval_oo") {
		left = FilterTableAsNumber(cell);
		lo = FilterTableAsNumber(a);
		hi = FilterTableAsNumber(b);
		if (op === "interval_cc")
			return left >= lo && left <= hi;
		if (op === "interval_oc")
			return left > lo && left <= hi;
		if (op === "interval_co")
			return left >= lo && left < hi;
		return left > lo && left < hi;
	}
	if (op === "contains")
		return FilterTableAsString(cell).includes(val);
	if (op === "not_contains")
		return !FilterTableAsString(cell).includes(val);
	if (op === "startswith")
		return FilterTableAsString(cell).startsWith(val);
	if (op === "endswith")
		return FilterTableAsString(cell).endsWith(val);
	d = FilterTableAsDate(cell);
	if (!d)
		return false;
	if (op === "year")
		return d.getFullYear() == parseInt(val, 10);
	if (op === "month")
		return (d.getMonth() + 1) == parseInt(val, 10);
	if (op === "day")
		return d.getDate() == parseInt(val, 10);
	if (op === "hour")
		return d.getHours() == parseInt(val, 10);
	if (op === "minute")
		return d.getMinutes() == parseInt(val, 10);
	if (op === "date") {
		right = FilterTableAsDate(val);
		return right && d.getFullYear() === right.getFullYear() && d.getMonth() === right.getMonth() && d.getDate() === right.getDate();
	}
	return false;
}

function FilterTableTreeMatches(tree, record) {
	var i, childOk, any, all, children;
	if (!tree)
		return true;
	if (tree.type === "condition")
		return FilterTableConditionMatches(tree, record);
	children = tree.children || [];
	if (!children.length)
		return true;
	if (tree.logic === "or") {
		any = false;
		for (i = 0; i < children.length; i++) {
			childOk = FilterTableTreeMatches(children[i], record);
			if (childOk)
				any = true;
		}
		return any;
	}
	all = true;
	for (i = 0; i < children.length; i++) {
		if (!FilterTableTreeMatches(children[i], record))
			all = false;
	}
	return all;
}

function FilterTableApplyFilterToNode(node) {
	var parentNode, source, filtered, i, tree;
	if (!node)
		return;
	FilterTableStripLegacyFilterFields(node);
	parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : null;
	source = (parentNode && parentNode.STAdata) ? parentNode.STAdata : null;
	if (!source) {
		if (typeof networkNodes !== "undefined" && networkNodes.update)
			networkNodes.update(node);
		return;
	}
	if (typeof deapCopy === "function")
		source = deapCopy(source);
	tree = FilterTablePruneTreeForApply(node.STAFilterTreeTable);
	if (!tree) {
		delete node.STAFilterTreeTable;
		delete node.STAFilterExpr;
		node.STAdata = source;
	} else {
		node.STAFilterTreeTable = tree;
		node.STAFilterExpr = buildTableFilterFromFilterTableTree(tree);
		filtered = [];
		for (i = 0; i < source.length; i++) {
			if (FilterTableTreeMatches(tree, source[i]))
				filtered.push(source[i]);
		}
		node.STAdata = filtered;
	}
	if (parentNode && parentNode.STAdataAttributes)
		node.STAdataAttributes = typeof deapCopy === "function" ? deapCopy(parentNode.STAdataAttributes) : parentNode.STAdataAttributes;
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	if (typeof UpdateChildenTable === "function")
		UpdateChildenTable(node);
	if (typeof network !== "undefined" && network.selectNodes)
		network.selectNodes([node.id]);
	if (typeof updateQueryAndTableArea === "function")
		updateQueryAndTableArea(node);
	else {
		if (typeof ShowQueryNode === "function")
			ShowQueryNode(node);
		if (typeof ShowTableNode === "function")
			ShowTableNode(node);
	}
}

async function FilterTableOk(event) {
	if (event && event.preventDefault)
		event.preventDefault();
	FilterTableApplyInProgress = true;
	FilterTableSaveTreeToNode();
	FilterTableUpdatePreview();
	var node = getNodeDialog("DialogFilterTable");
	if (node)
		await FilterTableApplyFilterToNode(node);
	FilterTableTreeSnapshot = null;
	FilterTableApplyInProgress = false;
	hideNodeDialog("DialogFilterTable", event);
}

function FilterTableCancel(event) {
	if (event && event.preventDefault)
		event.preventDefault();
	FilterTableRevertUncommittedTree();
	var node = getNodeDialog("DialogFilterTable");
	if (node && typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	hideNodeDialog("DialogFilterTable", event);
}

function FilterTableDialogClosed(event) {
	if (FilterTableApplyInProgress)
		return;
	if (FilterTableTreeSnapshot)
		FilterTableRevertUncommittedTree();
	FilterTableClearDialogUi();
	hideNodeDialog("DialogFilterTable", event);
}

async function ShowFilterTableDialog() {
	var node, parentNode, host, root, tree;
	saveNodeDialog("DialogFilterTable", currentNode);
	node = getNodeDialog("DialogFilterTable") || currentNode;
	if (!node)
		return;
	parentNode = GetFirstParentNode(node);
	if (parentNode) {
		if (!node.STAdataAttributes)
			node.STAdataAttributes = parentNode.STAdataAttributes ? deapCopy(parentNode.STAdataAttributes) : (parentNode.STAdata ? getDataAttributes(parentNode.STAdata) : node.STAdataAttributes);
	}
	FilterTableStripLegacyFilterFields(node);
	if (typeof networkNodes !== "undefined" && networkNodes.update)
		networkNodes.update(node);
	node = getNodeDialog("DialogFilterTable") || node;
	if (typeof networkNodes !== "undefined" && networkNodes.get)
		node = networkNodes.get(node.id) || node;
	FilterTableUiGeneration++;
	FilterTableTreeSnapshot = node.STAFilterTreeTable ? JSON.stringify(node.STAFilterTreeTable) : null;
	FilterTableBindDialogEvents();
	FilterTableClearDialogUi();
	host = document.getElementById("DialogFilterTableTree");
	tree = (node.STAFilterTreeTable && node.STAFilterTreeTable.type === "group") ? FilterTableCloneTree(node.STAFilterTreeTable) : null;
	if (tree)
		FilterTableMountGroup(host, tree, true, 1);
	else
		host.insertAdjacentHTML("beforeend", FilterTableGroupHtml(true, 1, "and"));
	root = document.getElementById("DialogFilterTableRoot") || host.firstElementChild;
	if (root && !FilterTableDirectChildren(root).length)
		FilterTableAddEmptyCondition(root);
	await FilterTableFillAllValueSelectors();
	FilterTableUpdatePreview();
}

// ===== Unused old filter functions (kept for reference) =====
//const selectConditionContent = ['--- Choose operator ---', ' = ', ' &ne; ', ' &ge; ', ' > ', ' &le; ', ' < ', ' [a,b] ', ' (a,b] ', ' [a,b) ', ' (a,b) ', 'contains', 'no contains', 'starts with', 'ends with', 'year', 'month', 'day', 'hour', 'minute', 'date'];
//const selectConditionContentText = ['--- Choose operator ---', ' = ', ' &ne; ', 'contains', 'no contains', 'starts with', 'ends with'];
//const selectConditionContentOGCAPIFeatures = ['--- Choose operator ---', ' = ', ' &ne; ', ' &ge; ', ' > ', ' &le; ', ' < ', ' [a,b] ', ' (a,b] ', ' [a,b) ', ' (a,b) '];


//function addNecessaryVariablesToFilterRowsSTANode(actualNode) {
//	var actualNodeLabel = actualNode.image;
//	//Create node propierties
//	if (!actualNode.STAboxNames)
//		actualNode.STAboxNames = ["0_0"];
//	if (!actualNode.STAconditionsFilter)
//		actualNode.STAconditionsFilter = [ //Table values
//			{
//				property: "<div id='optionsRow_0' style='display: inline-block;'></div>",
//				number: "0"
//			}
//		];
//	if (typeof actualNode.STAinfoFilter === "undefined")
//		actualNode.STAinfoFilter = [];
//	if (!actualNode.STAelementFilter)
//		actualNode.STAelementFilter = {
//			elems: [0],
//			nexus: null,
//			boxName: "0_0"
//		};

//	if (typeof actualNode.STACounter === "undefined")
//		actualNode.STACounter = [];

//	/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js. Still used by Table/OGC/CSV for shared node fields above.
//	if (actualNodeLabel == "FilterRowsSTA.png") { //Only necessary in STA Filter, not in CSV
//		if (typeof actualNode.STAUrlAPI === "undefined")
//			actualNode.STAUrlAPI = "";
//		if (typeof actualNode.STAUrlAPICounter === "undefined")
//			actualNode.STAUrlAPICounter = [];
//		if (!actualNode.STAFilterRowEntities)
//			actualNode.STAFilterRowEntities = {
//				optionsRow0: [getSTAEntityPlural(actualNode.STAEntityName)]
//			};

//	}
//	*/

//	networkNodes.update(actualNode);
//Build selectors
//function createSelectorRowFilters(number) {
//	var selectorInfo = [];
//	var node= getNodeDialog("DialogFilterRows");
//	var infoFilter = node.STAinfoFilter;
//	var nodeLabel = node.image;
//	if (infoFilter.length != 0) {

//		for (var i = 0; i < infoFilter.length; i++) {
//			if (infoFilter[i][0] == number) {
//				selectorInfo.push(infoFilter[i]);
//			}
//		}
//	}
//	var parentNode = GetFirstParentNode(node);
//	var dialogType;

//	if (nodeLabel == "FilterRowsSTA.png") {
//		if (parentNode.OGCType) { //OGCAPIFeatures (FilterRowsTable / OGC still use this dialog)
//			if (parentNode.OGCType == "OGCAPIitems") {
//				dialogType = "withoutEntities_3selectors"; //columns, condition, values
//			}
//		}
//		/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js.
//		else { //FilterRowSTA from STA API
//			dialogType = "withEntities_4selectors"; //entities, properties,condition,values
//		}
//		*/
//	} else { //CSV
//		dialogType = "withoutEntities_3selectors"; //columns, condition, values
//	}
//	/* Old FilterRowsSTA 4-selector UI. Replaced by filterSTADlg.js.
//	if (dialogType == "withEntities_4selectors") {
//		createEntitySelectorInFilterRows(selectorInfo, number);
//		createPropertySelectInFilterRows(selectorInfo, number);
//	} else { //withoutEntities_3selectors
//	*/
//		createColumsSelectorFilterRows(selectorInfo, number);
//	/* } */
//	//In both cases 
//	createConditionSelectInFilterRows(selectorInfo, number);
//	createValueSelectInFilterRows(selectorInfo, number);

//}

//function createColumsSelectorFilterRows(selectorInfo, count) {
//	var optionsRow = document.getElementById("optionsRow_" + count);

//	var selectColumns = document.createElement("select");
//	selectColumns.setAttribute("id", "selectorColumns_" + count);
//	selectColumns.setAttribute("onchange", "fillValueSelectorFilterRow('" + count + "')");

//	optionsRow.appendChild(selectColumns);
//	fillColumsSelectorFilterRows(selectorInfo, count);

//}

//function fillColumsSelectorFilterRows(selectorInfo, count) { //withoutEntities_3selectors

//	var selectorColumns = document.getElementById("selectorColumns_" + count);
//	var option = document.createElement("option"); //First option
//	option.setAttribute("value", "--- Choose a field ---");
//	option.innerHTML = "--- Choose a field ---";
//	selectorColumns.appendChild(option);
//	//Real options 
//	//Which is the origin of the information to fill the selector
//	var queryableOrDataAlreadyCharged;
//	var node= getNodeDialog("DialogFilterRows");
//	if (node.STAOGCAPIqueryable) {
//		if (node.STAOGCAPIqueryable == "no") {
//			queryableOrDataAlreadyCharged = "dataCharged"; //OGCAPIFeatures not queryable
//		} else {
//			queryableOrDataAlreadyCharged = "queryableData"; // OGCAPIFeatures queryable
//		}
//	} else {
//		queryableOrDataAlreadyCharged = "dataCharged"; //CSV
//	}

//	if (queryableOrDataAlreadyCharged == "queryableData") {
//		if (node.STAOGCAPIqueryable.length != 0) {
//			var queryables = Object.keys(node.STAOGCAPIqueryable);
//			for (var i = 0; i < queryables.length; i++) {
//				var option = document.createElement("option");
//				option.setAttribute("value", queryables[i]);
//				option.innerHTML = queryables[i];
//				if (selectorInfo.length != 0) {
//					if (selectorInfo[0][1] == queryables[i]) {
//						option.setAttribute("selected", true);
//					}
//				}
//				selectorColumns.appendChild(option);
//			}
//		}

//	} else { //data charged (node.STAdata)
//		var columns = Object.keys(node.STAdataAttributes);
//		for (var i = 0; i < columns.length; i++) {
//			option = document.createElement("option"); //First option
//			option.setAttribute("value", columns[i]);
//			option.innerHTML = columns[i];

//			if (selectorInfo.length != 0) {
//				if (selectorInfo[0][1] == columns[i]) {
//					option.setAttribute("selected", true);
//				}
//			}
//			selectorColumns.appendChild(option);
//		}
//	}
//}

//function obtainValuesFromSTAdataInCSV(column, dataNode) {
//	var node= dataNode || getNodeDialog("DialogFilterRows");
//	var data = node.STAdata;
//	var valuesArray = []
//	for (var i = 0; i < data.length; i++) {
//		if (i != 0) {
//			if (!valuesArray.find(element => element == data[i][column])) { //create array with not arranged values
//				valuesArray.push(data[i][column]);
//			}
//		}
//	}
//	var valuesSorted = sortValuesNumbersOrText(valuesArray);
//	return valuesSorted;
//}

///* Old FilterRowsSTA dialog UI (entity picker). Replaced by filterSTADlg.js. Kept for reference.
//function createEntitySelectorInFilterRows(selectorInfo, count) {
//	var optionsRow = document.getElementById("optionsRow_" + count);

//	//Label
//	optionsRow.innerHTML += "<label style='font-size: 15px;'>Choose the Entity:</label>";
//	optionsRow.innerHTML += `<input type="text" READONLY id="inputForEntityFilterRow_${count}" onclick="openModalRowFilterEntities('${count}')" style="background-color:#D8DFD6; margin-left:5px"></input>`;
//	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + count);

//	inputForEntityFilterRow.addEventListener('mouseover', () => {
//		inputForEntityFilterRow.style.cursor = "pointer";
//		inputForEntityFilterRow.style.background = "#bdc2ba";//Darker grey
//	});
//	inputForEntityFilterRow.addEventListener('mouseout', () => {
//		inputForEntityFilterRow.style.cursor = "auto";
//		inputForEntityFilterRow.style.background = "#d8dfd6";
//	});
//	var entityToInput ;
//	var node= getNodeDialog("DialogFilterRows");
//	if (node.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
//		entityToInput = getSTAEntityPlural(node.STAEntityName);
//	} else {
//		entityToInput = selectorInfo.length ? selectorInfo[0][1] : "";
//	}
//	inputForEntityFilterRow.value = entityToInput;
//	inputForEntityFilterRow.style.width = (entityToInput.length<3 ? 3 : entityToInput.length) * 7 + "px"; //Adjust width of the input to fit all content

//}
//function openModalRowFilterEntities(number) { //To open Modat to see and select entities
//	event.preventDefault();
//	var dialogFilterRowEntities = document.getElementById("DialogFilterRowEntities");
//	dialogFilterRowEntities.setAttribute("data-rowNumber", number);
//	fillDialogFilterRowEntities(number, 0, "");
//	showNodeDialog("DialogFilterRowEntities");
//}

//function updateSTAFilterRowEntities(number, counter, entitySelected) { //Modify or erase what is necessary
//	var node= getNodeDialog("DialogFilterRows");
//	var filterRowEntities = node.STAFilterRowEntities;

//	if (filterRowEntities["optionsRow" + number].length + 1 == counter) {
//		filterRowEntities["optionsRow" + number].push(entitySelected); //If there is no entity in this position, just add it
//	} else {

//		var index = filterRowEntities["optionsRow" + number].indexOf(entitySelected);
//		if (index == (-1)) { //it doesnt exists yet
//			var elementsToSplice = filterRowEntities["optionsRow" + number].length - (counter-1); //Elements to erase to final. If entity changes, the rest has no sense
//			filterRowEntities["optionsRow" + number].splice((counter-1), elementsToSplice, entitySelected);
//		} else { //it exist previously
//			var newArray = [];
//			for (var a = 0; a < (index + 1); a++) {
//				newArray.push(filterRowEntities["optionsRow" + number][a]);
//			}
//			filterRowEntities["optionsRow" + number] = newArray;
//		}
//	}

//}


//function takeEntitiesAndFilterThemInFilterRow(filterRowEntities, i) { //avoid duplications
//	//var entities = STAEntities[getSTAEntityPlural(filterRowEntities[i], true)].entities;
//	var node= getNodeDialog("DialogFilterRows");
//	var entityInPlural=getSTAEntityPlural(filterRowEntities[i], true);
//	var n= STAEntities[entityInPlural].entities.length, entitiesConnectedArray=[];
//	for (var t=0;t<n;t++){
//		entitiesConnectedArray.push(STAEntities[entityInPlural].entities[t].name);
//	}


//	var entitiesFiltered = entitiesConnectedArray; //To use the filter (entities not filtered yet);
//	if (i != 0) {
//		for (var a = 0; a < i; a++) { //I need entities before this entity in the array 
//			entitiesFiltered = entitiesFiltered.filter(entity => {
//				return getSTAEntityPlural(entity, true) != getSTAEntityPlural(filterRowEntities[a], true)
//			});
//		}
//	}

//	return entitiesFiltered;
//}
//function AddEntitiesSelectedBelowInFilterRow(number) {
//	var entitiesFiltered;
//	var optionsRow = "optionsRow" + number;
//	var node= getNodeDialog("DialogFilterRows");
//	var filterRowEntities = node.STAFilterRowEntities[optionsRow];
//	var nextEntity;

//	//first Entity (node)
//	var entity= node.STAEntityName;
//	var DialogFilterRowEntitiesCheckBoxes = document.getElementById("DialogFilterRowEntitiesCheckBoxes");
//	var div = document.createElement("div");
//	var input = document.createElement("input");
//	var id = "Group" + 0 + "_" + entity;
//	div.setAttribute("id", id);
//	input.setAttribute("type", "radio");
//	input.setAttribute("name", "entity_" + 0);
//	input.setAttribute("id", id + "input")
//	input.setAttribute("value", entity);
//	input.setAttribute("onClick", `fillDialogFilterRowEntities("${number}","1","${entity}")`);
//	input.setAttribute("checked", true)
//	var label = document.createElement("label");
//	label.setAttribute("for", id + "input");
//	label.innerHTML = entity;
//	DialogFilterRowEntitiesCheckBoxes.appendChild(div);
//	div.appendChild(input);
//	div.appendChild(label);

//	//Next entities.
//	for (var i = 0; i < filterRowEntities.length; i++) {
//		entitiesFiltered = takeEntitiesAndFilterThemInFilterRow(filterRowEntities, i);

//		//There is next?
//		if (filterRowEntities[i + 1]) { //take next entity to put it checked when radiobutton will be created (0 is entity from the node)
//			nextEntity = filterRowEntities[i + 1];
//		} else {
//			nextEntity = "";
//		}
//		var placeToPutChilds;

//		if (i == 0) {
//			placeToPutChilds = document.getElementById("Group" + i + "_" + entity);
//		} else {
//			placeToPutChilds = document.getElementById("Group" + i + "_" + filterRowEntities[i]); //previous entity (previous group)

//		}

//		for (var e = 0; e < entitiesFiltered.length; e++) {	//Create radiobuttons
//			var div2 = document.createElement("div");
//			var input2 = document.createElement("input");
//			var numToGroup = i + 1;
//			var numi = i + 2
//			var id = "Group" + numToGroup + "_" + entitiesFiltered[e];
//			div2.setAttribute("id", id);
//			input2.setAttribute("type", "radio");
//			input2.setAttribute("name", "entity_" + numToGroup);
//			input2.setAttribute("id", id + "input")
//			input2.setAttribute("value", entitiesFiltered[e]);
//			input2.setAttribute("onClick", `fillDialogFilterRowEntities("${number}","${numi}","${entitiesFiltered[e]}")`);
//			if (entitiesFiltered[e] == nextEntity) {
//				input2.setAttribute("checked", true)
//			}
//			var label = document.createElement("label");
//			label.setAttribute("for", id + "input");
//			label.innerHTML = entitiesFiltered[e];
//			div2.appendChild(input2);
//			div2.appendChild(label);

//			div2.style.marginLeft = 20 + "px"; //position children "visually inside" father. 

//			placeToPutChilds.appendChild(div2);
//		}
//	}
//}

//function fillDialogFilterRowEntities(number, row, selected) { //Ok in DialogFilterRowEntities
//	var dialogFilterRowEntitiesCheckBoxes = document.getElementById("DialogFilterRowEntitiesCheckBoxes");

//	dialogFilterRowEntitiesCheckBoxes.innerHTML = ""; //Empty DialogFilterRowEntitiesCheckBoxes

//	if (selected != "") { //avoid first time
//		updateSTAFilterRowEntities(number, row, selected);//Update node.STAFilterRowEntities
//	}
//	AddEntitiesSelectedBelowInFilterRow(number);
//}
//function OkButtonInRowFilterEntities(event) { //Ok in DialogFilterRowEntities
//	event.preventDefault();
//	var dialogFilterRowEntities = document.getElementById("DialogFilterRowEntities");
//	var number = dialogFilterRowEntities.getAttribute("data-rowNumber");
//	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + number);
//	var inputValue;
//	var lastEntity;
//	var node= getNodeDialog("DialogFilterRows");
//	for (var i = 0; i < node.STAFilterRowEntities["optionsRow" + number].length; i++) {
//		if (i == 0) {
//			inputValue = node.STAFilterRowEntities["optionsRow" + number][i];
//			lastEntity = node.STAFilterRowEntities["optionsRow" + number][i];
//		} else {
//			var entity = searchParentLabel();

//			if (entity != node.STAFilterRowEntities["optionsRow" + number][i]) {
//				inputValue += "/" + node.STAFilterRowEntities["optionsRow" + number][i];

//			} else {
//				inputValue = node.STAFilterRowEntities["optionsRow" + number][i];
//			}
//			lastEntity = node.STAFilterRowEntities["optionsRow" + number][i];
//		}
//	}
//	inputForEntityFilterRow.value = inputValue;
//	inputForEntityFilterRow.style.width = inputValue.length * 7 + "px";
//	fillPropertySelector(number, lastEntity);//To change properties of select
//	fillValueSelectorFilterRow(number);
//	showAndHiddeSelectorAndInputsFilterRow(number);
//	showInputProperty(number);
//	hideNodeDialog("DialogFilterRowEntities");
//}
//PropertySelect
//function createPropertySelectInFilterRows(selectorInfo, count) {
//	var optionsRow = document.getElementById("optionsRow_" + count);
//	var select = document.createElement("select");
//	select.setAttribute("id", "selectorProperty_" + count);
//	select.setAttribute("onChange", "onchangePropertySelect('" + count + "')");
//	select.style.marginLeft = "10px";
//	//Input for properties/parameters
//	var inputForProperty = document.createElement("input");
//	inputForProperty.setAttribute("type", "text");
//	inputForProperty.setAttribute("id", "inputForProperty_" + count);
//	inputForProperty.setAttribute("placeholder", "Example: type");
//	inputForProperty.style.display = "none";
//	inputForProperty.style.marginLeft = "5px";
//	optionsRow.appendChild(select);
//	optionsRow.appendChild(inputForProperty);

//	var node= getNodeDialog("DialogFilterRows");
//	if (node.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
//		var entity = getSTAEntityPlural(getNodeDialog("DialogFilterRows").STAEntityName);
//	} else {
//		var entity = selectorInfo.length==0 ? null : getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(selectorInfo[0][1]), true);
//	}
//	if (entity)
//		fillPropertySelector(count, entity, selectorInfo);
//}
//function onchangePropertySelect(count) {
//	fillValueSelectorFilterRow(count);
//	showInputProperty(count);
//}
//function showInputProperty(count) {
//	var selectorProperty = document.getElementById("selectorProperty_" + count);
//	var selectorPropertyValue = selectorProperty.options[selectorProperty.selectedIndex].value;
//	var inputForProperty = document.getElementById("inputForProperty_" + count)
//	if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
//		inputForProperty.style.display = "inline-block";
//	} else {
//		inputForProperty.style.display = "none";
//	}
//}
//*/
//function extractLastEntityFromTextFromInputInFilterRow(textFromInput) {
//	var arrayFromText, lastEntity;
//	if (textFromInput.includes("/")) { //only first entity
//		arrayFromText = textFromInput.split("/");
//		lastEntity = arrayFromText[arrayFromText.length - 1];
//	} else {
//		lastEntity = textFromInput
//	}
//	return lastEntity;

//}
///* Old FilterRowsSTA property list UI. Replaced by filterSTADlg.js. Kept for reference.
//const unitOfMeasurementExtension = ["unitOfMeasurement/name", "unitOfMeasurement/symbol", "unitOfMeasurement/definition"]; //Datastream
//const featureExtension = ["feature/", "feature/type", "feature/coordinates/0", "feature/coordinates/1", "feature/type", "feature/geometry/type", "feature/geometry/coordinates/0", "feature/geometry/coordinates/1", "feature/properties/"] //featureOfInterest
//const locationExtension = ["location/", "location/type", "location/properties/", "location/geometry/type", "location/geometry/coordinates", "location/coordinates"]


//function fillPropertySelector(number, lastEntity, selectorInfo) { //lastEntity: Entity obtained in input
//	var selectProperty = document.getElementById("selectorProperty_" + number);
//	selectProperty.innerHTML = "";

//	var entity= getSTAEntityPlural(lastEntity, true);
//	var properties = [], n= STAEntities[entity].properties.length;
	
//	for (var p = 0; p < n; p++) {
//		properties.push(STAEntities[entity].properties[p].name);
//	}
//	var option = document.createElement("option"); //First option
//	option.setAttribute("value", " ");
//	option.innerHTML = "--- Choose Property ---";
//	selectProperty.appendChild(option);

//	var option2 = document.createElement("option"); //First option FALTA POSAR EL SELECTEDDDDDD
//	option2.setAttribute("value", "id");
//	option2.innerHTML = "id";
//	if (selectorInfo){
//		if(selectorInfo.length!=0){
//			if(selectorInfo[0][2][0]=="id"){
//				option2.setAttribute("selected", true);
//			}
//		}
//	}
//	selectProperty.appendChild(option2);

//	for (var i = 0; i < properties.length; i++) {// to fill property/property
//		if (properties[i] == "unitOfMeasurement") {
//			for (var u = 0; u < unitOfMeasurementExtension.length; u++) {
//				var option = document.createElement("option");
//				option.setAttribute("value", unitOfMeasurementExtension[u]);
//				option.innerHTML = unitOfMeasurementExtension[u];
//				selectProperty.appendChild(option);
//				if (selectorInfo && selectorInfo.length != 0) {
//					if (unitOfMeasurementExtension[u] == selectorInfo[0][2][0]) {  //selectorInfo[0][2] : If inputForPropery is open, the element 0 in the array is the select and the second is the input
//						option.setAttribute("selected", true);
//					}
//				}
//			}
//		} else if (properties[i] == "feature") {
//			for (var a = 0; a < featureExtension.length; a++) {
//				var option = document.createElement("option");
//				option.setAttribute("value", featureExtension[a]);
//				option.innerHTML = featureExtension[a];
//				selectProperty.appendChild(option);
//				if (selectorInfo && selectorInfo.length != 0) {
//					if (featureExtension[a] == selectorInfo[0][2][0]) {
//						option.setAttribute("selected", true);
//					}
//				}
//			}
//		}
//		else if (properties[i] == "location") {
//			for (var a = 0; a < locationExtension.length; a++) {
//				var option = document.createElement("option");
//				option.setAttribute("value", locationExtension[a]);
//				option.innerHTML = locationExtension[a];
//				selectProperty.appendChild(option);
//				if (selectorInfo && selectorInfo.length != 0) {
//					if (locationExtension[a] == selectorInfo[0][2][0]) {
//						option.setAttribute("selected", true);
//					}
//				}
//			}
//		}

//		else if (properties[i] == "observedArea") {
//			//nothing. Avoid that appear in the list. It is a poligon and it can't be filtered. 
//		}
//		else {
//			var option = document.createElement("option");
//			var property;
//			if (properties[i] == "properties" || properties[i] == "dataQuality" || properties[i] == "parameters" || properties[i] == "resultQuality") {
//				property = properties[i] + "/";
//				option.setAttribute("value", property);
//				option.innerHTML = property;
//			} else {
//				option.setAttribute("value", properties[i]);
//				property = properties[i]
//				option.innerHTML = property;
//			}
//			if (selectorInfo && selectorInfo.length != 0) {
//				if (property == selectorInfo[0][2][0]) { //!!!!!!!!!!!!!!!!!!!
//					option.setAttribute("selected", true);
//				}
//			}
//		}
//		selectProperty.appendChild(option);
//	}
//	if (selectorInfo && selectorInfo.length != 0 && selectorInfo[0][2].length == 2) {//selectorInfo[0][2] : If inputForPropery is open, the element 0 in the array is the select and the second is the input
//		document.getElementById("inputForProperty_" + number).value = selectorInfo[0][2][1];
//	}
//}
//*/

//condition select
//function createConditionSelectInFilterRows(selectorInfo, count) {
//	var optionsRow = document.getElementById("optionsRow_" + count);
//	var select = document.createElement("select");
//	select.setAttribute("id", "selectorCondition_" + count);
//	select.style.marginLeft = "10px";
//	var selectConditionContent2;
//	var node= getNodeDialog("DialogFilterRows");
//	if (selectorInfo.length != 0) {
//		var typeOfValues = typeOfValueFromInput("simple", selectorInfo[0][4]);
//		if (typeOfValues == "text") {
//			selectConditionContent2 = selectConditionContentText;
//		} else { //data,empty,number
//			selectConditionContent2 = selectConditionContent;
//		}
//	} else {
//		selectConditionContent2 = selectConditionContent;
//	}
//	if (node.OGCType == "OGCAPIitem") {
//		selectConditionContent2 = selectConditionContentOGCAPIFeatures;
//	}
	
//	for (var i = 0; i < selectConditionContent2.length; i++) { //create options in condition Select
//		var opcioCondicio = document.createElement("option");
//		opcioCondicio.setAttribute("value", selectConditionContent2[i]);
//		select.setAttribute("onChange", "showAndHiddeSelectorAndInputsFilterRow('" + count + "')");
//		opcioCondicio.innerHTML = selectConditionContent2[i];
//		if (selectorInfo.length != 0) {
//			if (selectConditionContent2[i] == selectorInfo[0][3]) {
//				opcioCondicio.setAttribute("selected", true);
//			}
//		}
//		select.appendChild(opcioCondicio);
//	}
//	optionsRow.appendChild(select);
//}
//function changeSelectConditionValues(number, wichinputText, value1, valueInput1, valueInput2) {
//	var selectCondition = document.getElementById("selectorCondition_" + number);
//	if (wichinputText == "simple") {
//		var typeOfValues = typeOfValueFromInput(wichinputText, value1);
//	} else {
//		var typeOfValues = typeOfValueFromInput(wichinputText, valueInput1, valueInput2);
//	}
//	var actualConditionSelected = selectCondition.options[selectCondition.selectedIndex].value;
//	var selectContent;
//	selectCondition.innerHTML = ""; //Erase to not acumulate it
//	if (wichinputText == "simple") {
//		if (typeOfValues == "text") { selectContent = selectConditionContentText; } //text
//		else { selectContent = selectConditionContent; }//data, empty, number
//	} else {
//		selectContent = selectConditionContent; //Has no sense to have an interval with text
//	}
//	for (var i = 0; i < selectContent.length; i++) { //Create options to select condition
//		var opcioCondicio = document.createElement("option");
//		opcioCondicio.setAttribute("value", selectContent[i]);
//		opcioCondicio.innerHTML = selectContent[i];
//		if (selectContent[i] == actualConditionSelected) {
//			opcioCondicio.setAttribute("selected", true);
//		}
//		selectCondition.appendChild(opcioCondicio);
//	}
//}
//function typeOfValueFromInput(wichinputText, value1, value2) {
//	var typeOfValues;
//	if (wichinputText == "simple") {
//		if (value1 == null) {
//			value1 = "";
//		}
//	} else {
//		if (value1 == null) {
//			value1 = "";
//		} else if (value2 == null) {
//			value2 = "";
//		}
//	}
//	//eval function doesn't work to knowif it is a date, because a number for the function is a date.
//	if (wichinputText == "simple") {
//		if (value1.includes("-") == true) {//inputText1
//			var value1Array = value1.split("-");
//			if (value1.includes("/")) {
//				if (value1Array.length == 5) {
//					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" ) {
//						typeOfValues = "date";
//					}
//				}
//			} else {
//				if (value1Array.length == 3) {
//					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" ) {
//						typeOfValues = "date";
//					} else if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2].length == 2 && !isNaN(parseInt(value1Array[0])) && !isNaN(parseInt(value1Array[1])) && !isNaN(parseInt(value1Array[2]))) { //only date without Time
//						typeOfValues = "date";
//					}
//				}
//			}
//		}
//		if (typeOfValues != "date") {
//			if (Number.isNaN(parseInt(value1)) != true) {
//				var newValue = "";
//				for (var a = 0; a < value1.length; a++) {//erase 0 if starts with 0. 
//					if (value1.charAt(a) != 0) {
//						newValue += value1.charAt(a)
//					}
//				}
//				value1 = newValue;
//				if (value1.length != parseInt(value1).toString().length && value1.length != parseFloat(value1).toString().length) {
//					typeOfValues = "text";
//				} else {
//					typeOfValues = "number";
//				}
//			} else {
//				typeOfValues = "text";
//			}
//		}
//		if (value1.length == 0) {
//			typeOfValues = "empty";
//		}
//	}
//	else {//interval
//		var inputText1 = "no";
//		var inputText2 = "no";
//		//is date
//		if (value1.includes("-") == true) {//inputText1
//			var value1Array = value1.split("-");
//				if (value1Array.length == 3) {
//					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" && value1.endsWith("Z")) {
//						inputText1 = "date";
//					} else if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2].length == 2 && !isNaN(parseInt(value1Array[0])) && !isNaN(parseInt(value1Array[1])) && !isNaN(parseInt(value1Array[2]))) { //only date without Time
//						typeOfValues = "date";
//					}
//				}
			
//		}
//		if (value2.includes("-") == true) {//inputText1
//			var value2Array = value2.split("-");

//				if (value2Array.length == 3) {
//					if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2][2] == "T" && value2.endsWith("Z")) {
//						inputText2 = "date";
//					} else if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2].length == 2 && !isNaN(parseInt(value2Array[0])) && !isNaN(parseInt(value2Array[1])) && !isNaN(parseInt(value2Array[2]))) { //only date without Time
//						typeOfValues = "date";
//					}
//				}
			
//		}
//		if (inputText1 != "date") {
//			if (Number.isNaN(parseInt(value1)) != true) { //numero
//				var newValue = "";
//				for (var a = 0; a < value1.length; a++) {//erase 0 if starts with 0. 
//					if (value1.charAt(a) != 0) {
//						newValue += value1.charAt(a)
//					}
//				}
//				value1 = newValue;
//				if (value1.length != parseInt(value1).toString().length && value1.length != parseFloat(value1).toString().length) {
//					inputText1 = "text";
//				} else { //number in value1
//					inputText1 = "number";
//				}
//			} else if (value1.length == 0) { //If it's empty
//				inputText1 = "empty";
//			} else { inputText1 = "text"; }
//		}
//		if (inputText2 != "date") {
//			if (Number.isNaN(parseInt(value2)) != true) { //If first is not a number, let's see second
//				var newValue2 = "";
//				for (var a = 0; a < value1.length; a++) {//erase 0 if starts with 0. 
//					if (value1.charAt(a) != 0) {
//						newValue2 += value1.charAt(a)
//					}
//				}
//				value1 = newValue2;
//				if (value2.length != parseInt(value2).toString().length && value2.length != parseFloat(value2).toString().length) {
//					inputText2 = "text";
//				} else {
//					inputText2 = "number";
//				}
//			} else if (value2.length == 0) {
//				inputText2 = "empty";
//			} else { inputText2 = "text"; }
//		}
//		if (inputText1 == "text" || inputText2 == "text") {
//			typeOfValues = "text";
//		} else if ((inputText1 == "date" && inputText2 == "empty") || (inputText1 == "empty" && inputText2 == "date") || (inputText1 == "date" && inputText2 == "date")) {
//			typeOfValues = "date";
//		} else if (inputText1 == "empty" && inputText2 == "empty") {
//			typeOfValues = "empty";
//		}
//		else {
//			typeOfValues = "number";
//		}
//	}
//	return typeOfValues;
//}
//Values select
//function createValueSelectInFilterRows(selectorInfo, count) {
//	var optionsRow = document.getElementById("optionsRow_" + count);

//	//Selects
//	var divFilterContainer = document.createElement("div");
//	divFilterContainer.setAttribute("id", "divFilterContainer_" + count);
//	divFilterContainer.setAttribute("style", "display: none;");
//	optionsRow.appendChild(divFilterContainer);
//	var select = document.createElement("select");
//	select.setAttribute("id", "selectorValue" + "_" + count);
//	select.style.marginLeft = "10px";
//	divFilterContainer.appendChild(select);
//	//Simple: inputText, buttons and displaySelects
//	var inputText = document.createElement("input");
//	inputText.setAttribute("id", "inputText" + "_" + count);
//	inputText.setAttribute("type", "text");
//	inputText.setAttribute("placeholder", "introduce a value");
//	inputText.style.marginLeft = "10px";
//	inputText.addEventListener("input", function () {
//		changesInInputValueRowFilter("simple", count)
//	});
//	inputText.addEventListener("keypress", function (event) {
//		// If the user presses the "Enter" key on the keyboard
//		if (event.key === "Enter") {
//			event.preventDefault();
//		}
//	});
//	optionsRow.appendChild(inputText);
//	var okButton = document.createElement("button");
//	okButton.setAttribute("onclick", "closeModalSelectInValue('" + count + "','ok')");
//	okButton.setAttribute("id", "okButton_" + count);
//	okButton.innerHTML = "Ok";
//	divFilterContainer.appendChild(select);
//	var cancelButton = document.createElement("button");
//	cancelButton.setAttribute("onclick", "closeModalSelectInValue('" + count + "','cancel')");
//	cancelButton.setAttribute("id", "cancelButton_" + count);
//	cancelButton.innerHTML = "Cancel";
//	var displaySelect = document.createElement("button");
//	displaySelect.setAttribute("id", "displaySelect_" + count);
//	displaySelect.setAttribute("onclick", "changeWriteToSelect('" + count + "','simple')");
//	optionsRow.appendChild(displaySelect);
//	divFilterContainer.appendChild(okButton);
//	divFilterContainer.appendChild(cancelButton);
//	var buttonImage2 = document.createElement("img"); //Button image
//	buttonImage2.setAttribute("src", "arrowSelectButton.png");
//	displaySelect.appendChild(buttonImage2);
//	//Interval: inputText, buttons and displaySelects
//	var divFilterContainer2 = document.createElement("div");
//	divFilterContainer2.setAttribute("id", "divFilterContainer2_" + count);
//	optionsRow.appendChild(divFilterContainer2);
//	var selectorValueInterval1 = document.createElement("select");
//	selectorValueInterval1.setAttribute("id", "selectorValueInterval1" + "_" + count);
//	selectorValueInterval1.style.marginLeft = "10px";
//	var selectorValueInterval2 = document.createElement("select");
//	selectorValueInterval2.setAttribute("id", "selectorValueInterval2" + "_" + count);
//	selectorValueInterval2.style.marginLeft = "5px";
//	divFilterContainer2.appendChild(selectorValueInterval1);
//	divFilterContainer2.appendChild(selectorValueInterval2);
//	var inputTextInterval1 = inputText.cloneNode(true);
//	inputTextInterval1.setAttribute("id", "inputTextInterval1" + "_" + count);
//	inputTextInterval1.style.marginLeft = "10px";
//	var inputTextInterval2 = inputText.cloneNode(true);
//	inputTextInterval2.setAttribute("id", "inputTextInterval2" + "_" + count);
//	inputTextInterval2.style.marginLeft = "5px";
//	inputTextInterval1.addEventListener("input", function () {
//		changesInInputValueRowFilter("interval", count)
//	});
//	inputTextInterval2.addEventListener("input", function () {
//		changesInInputValueRowFilter("interval", count)
//	});
//	inputTextInterval1.addEventListener("keypress", function (event) {
//		if (event.key === "Enter") {
//			event.preventDefault();
//		}
//	});
//	inputTextInterval2.addEventListener("keypress", function (event) {
//		if (event.key === "Enter") {
//			event.preventDefault();
//		}
//	});
//	optionsRow.appendChild(inputTextInterval1);
//	optionsRow.appendChild(inputTextInterval2);
//	var okButtonInterval = document.createElement("button");
//	okButtonInterval.setAttribute("onclick", "closeModalSelectInValue('" + count + "','ok')");
//	okButtonInterval.setAttribute("id", "okButtonInterval_" + count);
//	okButtonInterval.innerHTML = "Ok";
//	var cancelButtonInterval = document.createElement("button");
//	cancelButtonInterval.setAttribute("onclick", "closeModalSelectInValue('" + count + "','cancel')");
//	cancelButtonInterval.setAttribute("id", "cancelButtonInterval_" + count);
//	cancelButtonInterval.innerHTML = "Cancel";
//	var displaySelectInterval = document.createElement("button");
//	displaySelectInterval.setAttribute("id", "displaySelectInterval_" + count);
//	displaySelectInterval.setAttribute("onclick", "changeWriteToSelect('" + count + "','interval')");
//	var buttonImage3 = document.createElement("img"); //button image
//	buttonImage3.setAttribute("src", "arrowSelectButton.png");
//	displaySelectInterval.appendChild(buttonImage3);
//	optionsRow.appendChild(displaySelectInterval);
//	divFilterContainer2.appendChild(okButtonInterval);
//	divFilterContainer2.appendChild(cancelButtonInterval);
//	//Put previous values in input Text( 
//	if (selectorInfo.length != 0) {
//		if (selectorInfo[0][3] == ' [a,b] ' || selectorInfo[0][3] == ' (a,b] ' || selectorInfo[0][3] == ' [a,b) ' || selectorInfo[0][3] == ' (a,b) ') {
//			inputTextInterval1.value = selectorInfo[0][4];
//			inputTextInterval2.value = selectorInfo[0][5];
//		} else { //simple
//			inputText.value = selectorInfo[0][4];
//		}
//	}
//	fillValueSelectorFilterRow(count);
//}

//async function fillValueSelectorFilterRow(count) {
//	var valor, valueToinput, dataToFillSelect, arrayValors = [], valueUndefined;

//	//Fill Select
//	//Simple
//	var selectorValue = document.getElementById("selectorValue" + "_" + count);
//	//Interval
//	var selectorValueInterval1 = document.getElementById("selectorValueInterval1" + "_" + count);
//	var selectorValueInterval2 = document.getElementById("selectorValueInterval2" + "_" + count);
//	var selectProperty = document.getElementById("selectorProperty_" + count); //To know if it is STA or OGCAPI (OGCAPI doesn't have it)
//	selectorValue.innerHTML = "";
//	selectorValueInterval1.innerHTML = "";
//	selectorValueInterval2.innerHTML = "";
//	var arrayValuesArranged;

//	/* Old FilterRowsSTA 4-selector value fill. Replaced by FilterSTALoadUniqueValuesFromAPI in filterSTADlg.js.
//	if (selectProperty) { //It is STA data? (4selectors)
//		var inputForEntityFilterRowValue = document.getElementById("inputForEntityFilterRow_" + count).value;
//		var entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(inputForEntityFilterRowValue, true));
//		var node= getSTAFilterValueSourceNode();
//		var urlNode = (node && node.STAURL) ? node : GetFirstParentNode(node);
//		var url = getURLWithoutQueryParams(urlNode.STAURL); //Erase first entitie ex: https://citiobs.demo.secure-dimensions.de/staplustest/v1.1/observations. Erase observations
//		url= removeFirstEntityInURL(url);
//		url+=entity;
//		if (typeof node.STAentityValuesForSelect !== "undefined") {
//			if (entity != node.STAentityValuesForSelect[0]) { //avoid to call to API for same entity
//				dataToFillSelect = await loadAPIDataWithReturn(url, "EntitiesFilterRow");
//				node.STAentityValuesForSelect = [entity, dataToFillSelect];
//				dataToFillSelect = node.STAentityValuesForSelect[1];
//			} else {
//				dataToFillSelect = node.STAentityValuesForSelect[1];
//			}
//		} else {
//			dataToFillSelect = await loadAPIDataWithReturn(url, "EntitiesFilterRow");
//			node.STAentityValuesForSelect = [entity, dataToFillSelect];
//			dataToFillSelect = node.STAentityValuesForSelect[1];
//		}
//		if (!dataToFillSelect)
//			dataToFillSelect = [];
//		var selectProperty = document.getElementById("selectorProperty_" + count);
//		var selectPropertyValue = selectProperty.options[selectProperty.selectedIndex].value;
//		valueUndefined = true;
//		if (selectPropertyValue.charAt(selectPropertyValue.length - 1) != "/") { //If property values can be charged. 
//			for (let index = 0; index < dataToFillSelect.length; index++) {
//				valor = dataToFillSelect[index][selectPropertyValue];
//				if (valueUndefined == true && typeof valor !== "undefined") { //All values are undefined? Don't show select
//					valueUndefined = false;
//				}
//				if (typeof valor === "undefined" && selectPropertyValue.includes("/")) { //!!!!!!!!!!!no necessari en csv  gestionar
//					valor = dataToFillSelect[index];
//					var selectPropertyValueArray = selectPropertyValue.split("/");
//					for (var a = 0; a < selectPropertyValueArray.length; a++) {
//						valor = valor[selectPropertyValueArray[a]];
//					}
//				}
//				if (!arrayValors.find(element => element == valor)) { //create array with not arranged values
//					arrayValors.push(valor);
//				}
//			}
//			arrayValuesArranged = sortValuesNumbersOrText(arrayValors); //arrange values 
//		}
//	} else { //CSV, OGCAPIFeature (3selectors)
//	*/
//		var selectorColumns = document.getElementById("selectorColumns_" + count);
//		var selectorColumnsValue = selectorColumns.options[selectorColumns.selectedIndex].value;
//		arrayValuesArranged = obtainValuesFromSTAdataInCSV(selectorColumnsValue);

//		if (arrayValuesArranged.length != 0) {
//			valueUndefined = false;
//		} else {
//			valueUndefined = true;
//		}
//	/* } */

//	if (typeof arrayValuesArranged !== "undefined") {
//		for (var i = 0; i < arrayValuesArranged.length; i++) { //create select options and fill selector
//			valueToinput = arrayValuesArranged[i];
//			var option = document.createElement("option");
//			option.setAttribute("value", valueToinput);
//			option.innerHTML = valueToinput;
//			var option2 = document.createElement("option");
//			option2.setAttribute("value", valueToinput);
//			option2.innerHTML = valueToinput;
//			var option3 = document.createElement("option");
//			option3.setAttribute("value", valueToinput);
//			option3.innerHTML = valueToinput;
//			selectorValue.appendChild(option);
//			selectorValueInterval1.appendChild(option2);
//			selectorValueInterval2.appendChild(option3);
//		}
//	}

//	showAndHiddeSelectorAndInputsFilterRow(count);
//}
//function removeFirstEntityInURL(url){ //To use with api url/entity 
// for (var i=0;i<STAEntitiesArray.length;i++){
//	if (url.includes("/"+STAEntitiesArray[i])){
//		url=url.replace("/"+STAEntitiesArray[i], "/");
//		break;
//	}
// }
// return url;
//}
//function changeWriteToSelect(number, selector) {  //To take the text in input
//	event.preventDefault();

//	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
//	var inputText = document.getElementById("inputText" + "_" + number);
//	var displaySelect = document.getElementById("displaySelect_" + number);
//	var selectorValueSTA = document.getElementById("selectorValue" + "_" + number);
//	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
//	var inputTextInterval1STA = document.getElementById("inputTextInterval1" + "_" + number);
//	var inputTextInterval2STA = document.getElementById("inputTextInterval2" + "_" + number);
//	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
//	var selectorValueInterval1STA = document.getElementById("selectorValueInterval1" + "_" + number);
//	var selectorValueInterval2STA = document.getElementById("selectorValueInterval2" + "_" + number);
//	//Wich text is open?
//	if (selector == "simple") {
//		inputText.style.display = "none";
//		displaySelect.style.display = "none";
//		divFilterContainer.style.display = "inline-block";
//		selectorValueSTA.style.display = "inline-block";
//	} else { //interval
//		inputTextInterval1STA.style.display = "none";
//		inputTextInterval2STA.style.display = "none";
//		displaySelectInterval.style.display = "none";
//		divFilterContainer2.style.display = "inline-block";
//		selectorValueInterval1STA.style.display = "inline-block";
//		selectorValueInterval2STA.style.display = "inline-block";
//	}
//}

//function closeModalSelectInValue(number, button) { //Ok and Cancel Buttons
//	event.preventDefault();

//	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
//	var inputText = document.getElementById("inputText" + "_" + number);
//	var displaySelect = document.getElementById("displaySelect_" + number);
//	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
//	var inputTextInterval1STA = document.getElementById("inputTextInterval1" + "_" + number);
//	var inputTextInterval2STA = document.getElementById("inputTextInterval2" + "_" + number);
//	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
//	var interval;

//	//If it comes from simple. Hidde container and show text and display
//	if (divFilterContainer.style.display != "none") {
//		divFilterContainer.style.display = "none";
//		inputText.style.display = "inline-block";
//		displaySelect.style.display = "inline-block";
//		interval = false;
//	} else {//if it comes from interval. Hidde container and show texts and display
//		divFilterContainer2.style.display = "none";
//		inputTextInterval1STA.style.display = "inline-block";
//		inputTextInterval2STA.style.display = "inline-block";
//		displaySelectInterval.style.display = "inline-block";
//		interval = true;
//	}
//	if (button == "ok") {
//		if (interval == false) {
//			var selectorValueSTA = document.getElementById("selectorValue" + "_" + number);
//			inputText.value = selectorValueSTA.options[selectorValueSTA.selectedIndex].value;
//			changesInInputValueRowFilter("simple", number);
//		} else {
//			var selectorValueInterval1STA = document.getElementById("selectorValueInterval1" + "_" + number);
//			var selectorValueInterval2STA = document.getElementById("selectorValueInterval2" + "_" + number);
//			inputTextInterval1STA.value = selectorValueInterval1STA.options[selectorValueInterval1STA.selectedIndex].value;
//			inputTextInterval2STA.value = selectorValueInterval2STA.options[selectorValueInterval2STA.selectedIndex].value;
//			changesInInputValueRowFilter("interval", number);
//		}
//	}
//}
//function changesInInputValueRowFilter(wichinputText, number) { //and refill conditionSelect (interval if it is a number or a date)
//	var inputText, textIputInterval1, textIputInterval2;

//	if (wichinputText == "simple") { inputText = document.getElementById("inputText" + "_" + number); }
//	else {
//		textIputInterval1 = document.getElementById("inputTextInterval1" + "_" + number);
//		textIputInterval2 = document.getElementById("inputTextInterval2" + "_" + number);
//	}
//	var value1, valueInput1, valueInput2;
//	var valueLength, valueLengthInterval1, valueLengthInterval2;
//	var width, withInterval1, withInterval2;
//	if (wichinputText == "interval") {
//		valueInput1 = textIputInterval1.value;
//		valueLengthInterval1 = valueInput1.length;
//		valueInput2 = textIputInterval2.value;
//		valueLengthInterval2 = valueInput2.length;
//	} else {
//		value1 = inputText.value;
//		valueLength = value1.length;
//	}
//	//Adjusting input length
//	if (valueLength > 15) {
//		width = valueLength * 8; // 8px per character
//		inputText.style.width = width + "px";
//		if (wichinputText == "interval") {
//			withInterval1 = valueLengthInterval1 * 8; // 8px per character
//			textIputInterval1.style.width = withInterval1 + "px";
//			withInterval2 = valueLengthInterval2 * 8; // 8px per character
//			textIputInterval2.style.width = withInterval2 + "px";
//		}
//	} else if (valueLength <= 15) {
//		inputText.style.width = "100px";
//		if (wichinputText == "interval") {
//			textIputInterval1.style.width = "100px";
//			textIputInterval2.style.width = "100px";
//		}
//	}
//	//Change options in selector depending of type of value selector
//	changeSelectConditionValues(number, wichinputText, value1, valueInput1, valueInput2);
//}
//General selects in FilterRow
//function getSTAFilterValueSourceNode() {
//	var staDlg = document.getElementById("DialogFilterSTA");
//	if (staDlg && staDlg.open)
//		return getNodeDialog("DialogFilterSTA");
//	var ogcDlg = document.getElementById("DialogFilterOGC");
//	if (ogcDlg && ogcDlg.open)
//		return getNodeDialog("DialogFilterOGC");
//	return getNodeDialog("DialogFilterRows");
//}

//function showAndHiddeSelectorAndInputsFilterRow(number) {

//	var selectorConditionEl = document.getElementById("selectorCondition_" + number);
//	if (!selectorConditionEl)
//		return;

//	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
//	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
//	var inputText = document.getElementById("inputText" + "_" + number);
//	var inputTextInterval1STA = document.getElementById("inputTextInterval1" + "_" + number);
//	var inputTextInterval2STA = document.getElementById("inputTextInterval2" + "_" + number);
//	var displaySelect = document.getElementById("displaySelect_" + number);
//	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
//	var selectorConditionValue = document.getElementById("selectorCondition_" + number).value;
//	var selectorValue = document.getElementById("selectorValue" + "_" + number);
//	var selectorValueInterval1 = document.getElementById("selectorValueInterval1" + "_" + number);
//	var selectorValueInterval2 = document.getElementById("selectorValueInterval2" + "_" + number);
//	var selectorProperty = document.getElementById("selectorProperty_" + number);
//	var inputForProperty = document.getElementById("inputForProperty_" + number);
//	var selectorValueHasChildren;
//	if (selectorValue.hasChildNodes()) {
//		selectorValueHasChildren = true;
//	} else {
//		selectorValueHasChildren = false;
//	}
//	var node= getNodeDialog("DialogFilterRows");
//	/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js.
//	if (node.image == "FilterRowsSTA.png") {
//		if (selectorProperty) { //!OGCAPI
//			var selectorPropertyValue = selectorProperty.options[selectorProperty.selectedIndex].value;
//			if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
//				inputForProperty.style.display = "inline-block";
//			} else {
//				inputForProperty.style.display = "none";
//			}
//		}
//	}
//	*/


//	if (selectorConditionValue == " [a,b] " || selectorConditionValue == " (a,b] " || selectorConditionValue == " [a,b) " || selectorConditionValue == " (a,b) ") {
//		if (inputTextInterval1STA.style.display == "none" && inputText.style.display == "none") { //selectors are shown
//			if (selectorValueHasChildren) { //show display button, hidde inputTexts
//				divFilterContainer2.style.display = "inline-block";
//				inputTextInterval1STA.style.display = "none";
//				inputTextInterval2STA.style.display = "none";
//			} else { // hidde selector things and show inputText
//				divFilterContainer2.style.display = "none";
//				displaySelectInterval.style.display = "none";
//				inputTextInterval1STA.style.display = "inline-block";
//				inputTextInterval2STA.style.display = "inline-block";
//			}
//			//PropertySelect finals with "/" . Selector for value has to be hidden
//			/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js.
//			if (node.image == "FilterRowsSTA.png") {
//				if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
//					inputTextInterval1STA.style.display = "inline-block";
//					inputTextInterval2STA.style.display = "inline-block";
//					selectorValueInterval1.style.display = "none";
//					selectorValueInterval2.style.display = "none";
//				}
//			}
//			*/
//		} else { //inputs are shown
//			if (selectorValueHasChildren) { //show display button
//				displaySelectInterval.style.display = "inline-block";
//			} else {
//				displaySelectInterval.style.display = "none";
//			}
//			inputTextInterval1STA.style.display = "inline-block";
//			inputTextInterval2STA.style.display = "inline-block";
//			divFilterContainer2.style.display = "none";
//		}
//		//simple : hide all
//		inputText.style.display = "none";
//		divFilterContainer.style.display = "none";
//		displaySelect.style.display = "none";

//	} else { //simple
//		if (inputText.style.display == "none" && inputTextInterval1STA.style.display == "none") { //selectors are shown
//			if (selectorValueHasChildren) { //show display button, hidde inputTexts
//				divFilterContainer.style.display = "inline-block";
//				inputText.style.display = "none";
//				inputText.style.display = "none";
//			} else { // hidde selector things and show inputText
//				divFilterContainer.style.display = "none";
//				displaySelect.style.display = "none";
//				inputText.style.display = "inline-block";
//				inputText.style.display = "inline-block";

//			}
//			//PropertySelect finals with "/" . Selector for value has to be hidden

//			/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js.
//			if (node.image == "FilterRowsSTA.png") {
//				if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
//					inputText.style.display = "inline-block";
//					selectorValue.style.display = "none"
//				}
//			}
//			*/
//		} else { //inputs are shown
//			if (selectorValueHasChildren) { //show display button
//				displaySelect.style.display = "inline-block";
//			} else {
//				displaySelect.style.display = "none";
//			}
//			inputText.style.display = "inline-block";
//			inputText.style.display = "inline-block";
//			divFilterContainer.style.display = "none";
//		}
//		//Interval : hide all
//		inputTextInterval1STA.style.display = "none";
//		inputTextInterval2STA.style.display = "none";
//		divFilterContainer2.style.display = "none";
//		displaySelectInterval.style.display = "none";
//	}
//}
//var stopSearchparentLabel = false;
///* Old FilterRowsSTA entity dialog. Replaced by filterSTADlg.js.
//function searchParentLabel() {
//	var entity = "0";
//	var node= getNodeDialog("DialogFilterRows");
//	var parentNode=GetFirstParentNode(node);
//	for (var i = 0; i < STAEntitiesArray.length; i++) {
//		if (parentNode.label == STAEntitiesArray[i]) {
//			entity = STAEntitiesArray[i];
//		}
//	}
//	return entity;
//}
//*/
////////////////New Table////////////////////
//function GetFilterTable(elem, nodeId, first) //Built table //The second will be called by showFilter
//{
//	//when the element that comes to you is the elemFilter, add a button to add one more level
//	if (elem.boxName) {
//		var s = '<table style="margin-top: 10px;"><tr class="trBoxName"><td style="position: relative;border: 2px solid #34383aef; " id="boxName_' + elem.boxName + '">'; //class="tableFilter
//	} else {
//		var s = '<table><tr class="trLineBoxName"><td>';
//	}
//	if (first) {
//		s += `<div class="topButtonsFilterRow"><button onclick="biggestLevelButton('${elem.boxName}')">Add a higher group</button>`;
//	}
//	if (elem.boxName) {
//		s += '<button onclick="addNewCondition(\'' + elem.boxName + '\')">Add a new condition below</button></div>';
//	}
//	if (typeof elem === "object") {
//		for (var i = 0; i < elem.elems.length; i++) {
//			s += GetFilterTable(elem.elems[i], nodeId);
//		}
//		if (elem.nexus) {
//			s += `</td><td valign="middle" class="tdSelectAndOrNot" id='tdSelectAndOrNot_${elem.boxName}'><div class="topPartSelectAndOrNot" ></div><div class="bottomPartSelectAndOrNot" id= "bottomPartSelectAndOrNot_${elem.boxName}"><select class="selectAndOrNot" name="selectAndOrNot"  onchange= "actualizeSelectChoice('${elem.boxName}')" id="selectAndOrNot_${elem.boxName}">`;
//			if (elem.nexus == " and ") {
//				s += '<option value=" and " selected>And</option>';
//			} else {
//				s += '<option value=" and ">And</option>';
//			}
//			if (elem.nexus == " or ") {
//				s += '<option value=" or " selected>Or</option>';
//			} else {
//				s += '<option value=" or ">Or</option>';
//			}
//			if (elem.nexus == " not ") {
//				s += '<option value=" not " selected>Not</option>';
//			} else {
//				s += '<option value=" not ">Not</option>';
//			}
//			s += '</select></div>';
//		}
//	}
//	else {
//		s += GetFilterCondition(elem);
//	}
//	s += '</td></tr></table>';
//	return s;
//}
//function GetFilterCondition(elem) {
//	var node= getNodeDialog("DialogFilterRows");
//	node.STACounter.push(elem);
//	return node.STAconditionsFilter[elem].property + '<div class="buttonsInFilterRow"><button onClick="DeleteElementButton(' + elem + ')"><img src="trash.png" alt="Remove" title="Remove"></button></div>';
//}
//function ShowFilterTable() //This is who iniciates the table
//{
//	var node= getNodeDialog("DialogFilterRows");
//	node.STACounter = []; //To not acumulate
//	networkNodes.update(node);
//	document.getElementById("divSelectorRowsFilter").innerHTML = GetFilterTable(node.STAelementFilter, node.id, true); //I need to pass node.elemFilter because it is a recursive function an need to start in this point
//	for (var i = 0; i < node.STACounter.length; i++) {//Adding Selectors
//		createSelectorRowFilters(node.STACounter[i]);
//	}

//}
//function showFilterTableWithoutFilters() {
//	document.getElementById("divSelectorRowsFilter").innerHTML = "<div>This collection doesn't allow to filter its data. You can filter the data preloaded by clickng the button below. Choose how many registers you want to filter in the box below. </div><button onclick='ShowFilterTable()'>See filtering box</button>";
//}

//Select Nexus (And, or, not)
//function actualizeSelectChoice(boxName) { //When select nexus changes (put selected option in STAelementFilter)
//	var select = document.getElementById("selectAndOrNot_" + boxName);
//	var option = select.options[select.selectedIndex].value;
//	var node= getNodeDialog("DialogFilterRows");
//	searchGroupToChangeSelectChoice(boxName, node.STAelementFilter, option);
//}
//function searchGroupToChangeSelectChoice(boxName, elem, option) {
//	if (typeof elem === "object") {
//		for (var i = 0; i < elem.elems.length; i++) {
//			searchGroupToChangeSelectChoice(boxName, elem.elems[i], option);
//		}
//		if (elem.boxName == boxName) { //to add elems => elems[0,1...]
//			elem.nexus = option;
//		}
//	}
//}
//function resizeBottomPartSelectAndOrNot() {
//	var node= getNodeDialog("DialogFilterRows");
//	var boxNames = node.STAboxNames;
//	for (var i = 0; i < boxNames.length; i++) {
//		var tdSelectAndOrNot = document.getElementById("tdSelectAndOrNot_" + boxNames[i]);
//		if (tdSelectAndOrNot != null) {
//			var tdSelectAndOrNotHeight = tdSelectAndOrNot.clientHeight;
//			var bottomPartSelectAndOrNot = document.getElementById("bottomPartSelectAndOrNot_" + boxNames[i]);
//			bottomPartSelectAndOrNot.style.height = (tdSelectAndOrNotHeight - 30) + "px";
//		}
//	}
//}


//Add conditions
//function addNewCondition(boxName, fromBiggest) {
//	event.preventDefault();
//	if (typeof fromBiggest === "undefined") {
//		fromBiggest = false;
//	}
//	var node= getNodeDialog("DialogFilterRows");
//	searchFilterBoxName(boxName, node.STAelementFilter, node.Id, fromBiggest);
//}
//function searchFilterBoxName(boxNamee, elem, paramsNodeId, fromBiggest) { //the elem has  boxName ...
//	if (typeof elem === "object") {
//		for (var i = 0; i < elem.elems.length; i++) {
//			searchFilterBoxName(boxNamee, elem.elems[i], paramsNodeId, fromBiggest);
//		}
//		if (elem.boxName == boxNamee) {  //Add elems => elems[0,1...]
//			addNewElement(elem, fromBiggest);
//		}
//	}
//}
//function addNewElement(elem, fromBiggest) {
//	var elements = elem.elems;
//	var node= getNodeDialog("DialogFilterRows");
//	var conditionsFilter = node.STAconditionsFilter;
//	var lastNumber = conditionsFilter[conditionsFilter.length - 1].number;
//	var nextNumber = parseInt(lastNumber) + 1; //for those who are within the 0_...
//	if (elem.boxName.charAt(0) != 0) {//groups other than 0 and must create a group and not an element
//		var newBoxName = elem.boxName;
//		var firstNumberBoxNameInside = parseInt(elem.boxName.charAt(0)) - 1; //First number: inside group
//		//search, split , arrange iand the lastone, plus one i add boxNames
//		var boxNames = node.STAboxNames;
//		var boxNamesFiltered = boxNames.filter(element => element.charAt(0) == firstNumberBoxNameInside); //filter those that already exist in the group that will be created
//		var nextBoxNumber;
//		if (boxNamesFiltered.length != 0) {
//			nextBoxNumber = parseInt(boxNamesFiltered[boxNamesFiltered.length - 1].charAt(2)) + 1; //you take the last one and add one to make the next one
//		} else {
//			nextBoxNumber = "0";
//		}
//		var newBoxName = firstNumberBoxNameInside + "_" + nextBoxNumber;
//		if (elem.boxName.charAt(0) != 1) {
//			elements.push( //I have to put it at the same height
//				{
//					elems: [],
//					nexus: null,
//					boxName: newBoxName,
//				}
//			);
//		} else { //1 will make a 0 and therefore can create a new one
//			elements.push( //I have to put it at the same height
//				{
//					elems: [nextNumber], //level 1
//					nexus: null,
//					boxName: newBoxName,
//				})
//		}
//		node.STAboxNames.push(newBoxName);
//		//If it's the second one, you must create a higher level and change the nexus so that it will be not null
//	}
//	else { //inside group 0_...
//		elements.push(nextNumber); //add to elem array
//	}
//	if (elements.length == 2) { //change nexus if pass from one to two
//		elem.nexus = "and"
//	}
//	conditionsFilter.push({ //add to conditionsFilter
//		property: "<div id='optionsRow_" + nextNumber + "' style='display: inline-block'></div>", //class='optionsRow
//		number: nextNumber
//	});
//	if (newBoxName) {
//		var levelBox = newBoxName.charAt(0);
//		var boxNameToPass = newBoxName;
//		for (var i = levelBox; i > 0; i--) {
//			addNewCondition(boxNameToPass, node.id);
//			boxNameToPass = boxNames[boxNames.length - 1]; //must be the last to be created (the one that was just created)
//		}
//	}

//	/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js.
//	if (node.image == "FilterRowsSTA.png") {
//		var entity = getSTAEntityPlural(getNodeDialog("DialogFilterRows").STAEntityName);
//		node.STAFilterRowEntities["optionsRow" + nextNumber] = [entity];

//	}
//	*/

//	if (fromBiggest == false) {
//		takeSelectInformation();//take selector values and update an external variable
//		drawTableAgain();//repaint selects
//		resizeBottomPartSelectAndOrNot();//correct size to select(AndOrNot) div
//	}
//}
//Delete element
//function DeleteElementButton(numberOfElement) {
//	event.preventDefault();
//	//Delete elemen from node.STAFilterRowEntities 
//	var node= getNodeDialog("DialogFilterRows");
//	var nodeLabel = node.image;
//	/* Old FilterRowsSTA dialog UI. Replaced by filterSTADlg.js.
//	if (nodeLabel == "FilterRowsSTA.png") {
//		delete node.STAFilterRowEntities["optionsRow" + numberOfElement];
//	}
//	*/

//	searchElementToDelete(numberOfElement, node.STAelementFilter, node.id);
//}
//function searchElementToDelete(numberOfElement, elem, paramsNodeId) { //elem has boxname...
//	if (typeof elem === "object") {
//		for (var i = 0; i < elem.elems.length; i++) {
//			searchElementToDelete(numberOfElement, elem.elems[i], paramsNodeId);
//		}
//		if (elem.elems.includes(numberOfElement)) { //add a elems => elems[0,1...]
//			DeleteElementInElemFilter(elem, numberOfElement);
//		}
//	}
//}
//function DeleteElementInElemFilter(elem, numberOfElement) {
//	//do not delete the conditions filter because it is the position
//	var index = elem.elems.indexOf(parseInt(numberOfElement));
//	elem.elems.splice(index, 1); //delete from elemFilter	
//	if (elem.elems.length == 1) { //if only  remains one, remove nexus
//		elem.nexus = null;
//	}
//	if (elem.elems.length == 0) {
//		deleteGroup(elem.boxName)
//	}
//	takeSelectInformation();//get selector values and update an external variable 
//	drawTableAgain();//repaint selects
//	resizeBottomPartSelectAndOrNot();
//}
//Delete group (necesary when it is the last condition in the group)
//function deleteGroup(numberOfElement) {
//	event.preventDefault();
//	var node= getNodeDialog("DialogFilterRows");
//	searchBoxNameGroup(numberOfElement, node.STAelementFilter, "no", "fromDeleteGrup",node);
//	takeSelectInformation();//get selector values and update an external variable 
//	drawTableAgain();//repaint the selects
//}

//function searchBoxNameGroup(numberOfElement, elem, fatherElem, originFunction,node) { //elem has boxes ...

//	if (typeof elem === "object") {
//		for (var i = 0; i < elem.elems.length; i++) {
//			searchBoxNameGroup(numberOfElement, elem.elems[i], elem, originFunction,node);
//		}
//		if (elem.boxName == numberOfElement) { //add to elems => elems[0,1...]
//			if (originFunction == "fromDeleteGrup") {
//				DeleteGroupInElemFilter(elem, fatherElem,node);
//			} else if (originFunction == "getFilterRowsTable") {

//				return elem;


//			}
//		}
//	}
//}

//function DeleteGroupInElemFilter(elem, fatherElem,node) {
//	var newArray = [];
//	if (fatherElem != "no") { //is not the lastone
//		for (var i = 0; i < fatherElem.elems.length; i++) {
//			if (fatherElem.elems[i].boxName != elem.boxName) {
//				newArray.push(fatherElem.elems[i])
//			}
//		}
//		fatherElem.elems = newArray;
//		//delete boxNames (If there are groups inside tmb they must be deleted)
//		var arrayBoxNumbers = [];
//		if (newArray.length == 1) { //if it is the last one, delete the nexus and the parent
//			fatherElem.nexus = null;
//			var copyFather = Object.assign(fatherElem.elems);
//			fatherElem.elems=[copyFather[0]];
			
//		}else if (newArray.length ==0){
//		}
//		var boxNames = updateBoxNames(node.STAelementFilter, arrayBoxNumbers);  //It is necesary?
//		eraseEmptyGroupsInFilterRowsSTA(node.STAelementFilter,"no",node);
//	}
//}
//function updateBoxNames(elem, arrayBoxNumbers) {
//	if (typeof elem === "object") {
//		arrayBoxNumbers.push(elem.boxName)
//		for (var i = 0; i < elem.elems.length; i++) {
//			updateBoxNames(elem.elems[i], arrayBoxNumbers);
//		}
//	}
//	return arrayBoxNumbers;
//}
//function eraseEmptyGroupsInFilterRowsSTA(elem,fatherElem,node){
//	if (typeof elem === "object") {
//		if(elem.elems.length ==0){	
//			DeleteGroupInElemFilter(elem, fatherElem,node);
//		}else{
//			for (var i = 0; i < elem.elems.length; i++) {
//				eraseEmptyGroupsInFilterRowsSTA(elem.elems[i], elem,node);
//			}	
			
//		}
//	}
	
	
//}
//DrawTable
//function drawTableAgain() {
//	document.getElementById("divSelectorRowsFilter").innerHTML = "";
//	ShowFilterTable()
//}

//function takeSelectInformation() {
//	var optionsRow;
//	var inputForEntityFilterRow, selectorProperty, inputProperty, selectorCondition, inputText, inputTextInterval1, inputTextInterval2, selectorValue, selectorValueInterval1, selectorValueInterval2, divFilterContainer, divFilterContainer2;
//	var inputForEntityFilterRowValue, selectorPropertyValue = [], selectorConditionValue, inputTextValue, inputTextInterval1Value, inputTextInterval2Value;
//	var arrayInfo;
//	var infoFilter = [];
//	var node= getNodeDialog("DialogFilterRows");
//	var counter = node.STACounter;


//	for (var i = 0; i < counter.length; i++) {
//		optionsRow = document.getElementById("optionsRow_" + counter[i]);
//		arrayInfo = [];
//		arrayInfo.push(counter[i]); //they are out of order, it is necessary to put each info in its place when painting the select

//		if (optionsRow != null) {
//			/* Old FilterRowsSTA 4-selector capture. Replaced by filterSTADlg.js. Table/OGC/CSV still use the column branch.
//			if (node.image == "FilterRowsSTA.png" && !node.STAOGCAPIconformance) {

//				inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + counter[i]);
//				inputForEntityFilterRowValue = inputForEntityFilterRow.value;
//				selectorProperty = document.getElementById("selectorProperty_" + counter[i]);
//				inputProperty = document.getElementById("inputForProperty_" + counter[i]);
//				selectorPropertyValue = [];
//				selectorPropertyValue.push(selectorProperty.options[selectorProperty.selectedIndex].value);
//				if (inputProperty.style.display == "inline-block") {
//					selectorPropertyValue.push(inputProperty.value);
//				}
//				arrayInfo.push(inputForEntityFilterRowValue, selectorPropertyValue);
//			} else { //CSV
//			*/
//				var selectorColumns = document.getElementById("selectorColumns_" + counter[i]);
//				var selectorColumnsSelected = selectorColumns.options[selectorColumns.selectedIndex].value;
//				arrayInfo.push(selectorColumnsSelected, "no");

//			/* } */
//			selectorCondition = document.getElementById("selectorCondition_" + counter[i]);
//			selectorConditionValue = selectorCondition.options[selectorCondition.selectedIndex].value;
//			arrayInfo.push(selectorConditionValue);


//			if (selectorConditionValue == ' [a,b] ' || selectorConditionValue == ' (a,b] ' || selectorConditionValue == ' [a,b) ' || selectorConditionValue == ' (a,b) ') {
//				inputTextInterval1 = document.getElementById("inputTextInterval1" + "_" + counter[i]);
//				inputTextInterval2 = document.getElementById("inputTextInterval2" + "_" + counter[i]);
//				selectorValueInterval1 = document.getElementById("selectorValueInterval1" + "_" + counter[i]);
//				selectorValueInterval2 = document.getElementById("selectorValueInterval2" + "_" + counter[i]);
//				divFilterContainer2 = document.getElementById("divFilterContainer2_" + counter[i]);
//				if (divFilterContainer2.style.display == "inline-block") { //Select open
//					inputTextInterval1Value = selectorValueInterval1.options[selectorValueInterval1.selectedIndex].value;
//					inputTextInterval2Value = selectorValueInterval2.options[selectorValueInterval2.selectedIndex].value;
//				} else {
//					inputTextInterval1Value = inputTextInterval1.value;
//					inputTextInterval2Value = inputTextInterval2.value;
//				}
//				arrayInfo.push(inputTextInterval1Value);
//				arrayInfo.push(inputTextInterval2Value);
//				var typeOfValue = typeOfValueFromInput("interval", inputTextInterval1Value, inputTextInterval2Value)
//			} else {
//				inputText = document.getElementById("inputText" + "_" + counter[i]);
//				divFilterContainer = document.getElementById("divFilterContainer_" + counter[i]);
//				selectorValue = document.getElementById("selectorValue" + "_" + counter[i]);
//				if (divFilterContainer.style.display == "inline-block") { //Select open
//					inputTextValue = selectorValue.options[selectorValue.selectedIndex].value;
//				} else {
//					inputTextValue = inputText.value;
//				}
//				arrayInfo.push(inputTextValue);
//				var typeOfValue = typeOfValueFromInput("simple", inputTextValue)
//			}
//		}
//		arrayInfo.push(typeOfValue)
//		infoFilter.push(arrayInfo);
//	}
//	node.STAinfoFilter = infoFilter;
//	networkNodes.update(node);
//}

//function biggestLevelButton(boxName) {
//	event.preventDefault();
//	var node= getNodeDialog("DialogFilterRows");
//	var newBoxName = (parseInt(boxName.charAt(0)) + 1) + "_0";
//	var newInsert = {
//		elems: [],
//		nexus: null,
//		boxName: newBoxName
//	};
	
//	newInsert.elems.push(Object.assign(node.STAelementFilter));
//	node.STAboxNames.push(newBoxName);
//	node.STAelementFilter = newInsert;
//	networkNodes.update(node);
//	addNewCondition(newBoxName, node.id, true); //fromBiggest=true -> To avoid TakeSelect ...etc in addNewElement function
//	takeSelectInformation();//take the values ​​of the selectors and update an external variable
//	drawTableAgain();
//	resizeBottomPartSelectAndOrNot();//correct size to select(AndOrNot) div
//}


//function createObjectToKeepForFilter(node, objectToExplore, objectToBuild) {

//	var boxNamesArrays = [];
//	for (var i = 0; i < objectToExplore.elems.length; i++) {
//		 (objectToExplore.elems[i].boxName)?boxNamesArrays.push(objectToExplore.elems[i].boxName):boxNamesArrays.push(objectToExplore.elems[i]) ;
//	}

//	objectToBuild[objectToExplore.boxName] = {
//		["items"]: boxNamesArrays,
//		["nexus"]: objectToExplore.nexus
//	}
//	if (typeof objectToExplore.elems[0] === "object") {
//		for (var i = 0; i < objectToExplore.elems.length; i++) {
//			createObjectToKeepForFilter(node, objectToExplore.elems[i], objectToBuild);
//		}
//	}else{
//		node.STAFilterSchema= objectToBuild;
//		networkNodes.update(node);
//	}		
//}

//var stopreadInformationRowFilterTable = false;

//function readInformationRowFilterTable(elem, nexus, parent,node) {  //Table (not STA)
//	var infoFilter = node.STAinfoFilter;

//	switch (nexus) {
//		case "and":
//			nexus = "&&"
//			break;
//		case " or ":
//			nexus = "||"
//			break;
//		case " not ":
//			nexus = "!="
//			break;
//	}

//	if (stopreadInformationRowFilterTable == false) {
//		if (typeof elem === "object") {
//			for (var i = 0; i < elem.elems.length; i++) {
//				readInformationRowFilterTable(elem.elems[i], elem.nexus, elem,node);
//			}
//			if (node.STAtableCounter.length != infoFilter.length && node.STAtableCounter.length != 0 && nexus != "no" && parent != "no") {
//				node.STAtable += " " + nexus + " ";
//			}
//		}
//		else { //Build URL

//			//Last Array, which contains the filters 
//			var data = "", condition;

//			for (var i = 0; i < infoFilter.length; i++) {
//				switch (infoFilter[i][3]) {
//					case ' = ':
//						condition = " == ";
//						break;
//					case ' &ne; ':
//						condition = " != ";
//						break;
//					case ' &ge; ':
//						condition = " >= ";
//						break;
//					case ' > ':
//						condition = " > ";
//						break;
//					case ' &le; ':
//						condition = " <= ";
//						break;
//					case ' < ':
//						condition = " < ";
//						break;
//				}
//				if (infoFilter[i][0] == elem) { //To search the array that contains the info that we want
//					var parentLenght = parent.elems.length;
//					var indexOf = parent.elems.indexOf(elem);
//					var typeOfValue = infoFilter[i][5];
//					var apostropheOrSpace;
//					apostropheOrSpace = (typeOfValue == "number") ?  "" : "'";
//					if (indexOf == 0) {
//						data += "(";
//					}

//					///Apply filter depending on Select Condition
//					if (infoFilter[i][3] == ' = ' || infoFilter[i][3] == ' &ne; ' || infoFilter[i][3] == ' &ge; ' || infoFilter[i][3] == ' > ' || infoFilter[i][3] == ' &le; ' || infoFilter[i][3] == ' < ') { //passarho a com Table+

//						data += "(" + apostropheOrSpace + infoFilter[i][1] + apostropheOrSpace + condition + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";

//					}
//					else if (infoFilter[i][3] == ' [a,b] ' || infoFilter[i][3] == ' (a,b] ' || infoFilter[i][3] == ' [a,b) ' || infoFilter[i][3] == ' (a,b) ') {

//						switch (infoFilter[i][3]) {
//							case ' [a,b] ':
//								data += "( " + infoFilter[i][1] + " >= " + infoFilter[i][4] + " && " + infoFilter[i][1] + " <= " + infoFilter[i][5] + ")";
//								break;
//							case ' (a,b] ':
//								data += "( " + infoFilter[i][1] + " > " + infoFilter[i][4] + " && " + infoFilter[i][1] + " <= " + infoFilter[i][5] + ")";
//								break;
//							case ' [a,b) ':
//								data += "( " + infoFilter[i][1] + " >= " + infoFilter[i][4] + " && " + infoFilter[i][1] + " < " + infoFilter[i][5] + ")";
//								break;
//							case ' (a,b) ':
//								data += "( " + infoFilter[i][1] + " > " + infoFilter[i][4] + " && " + infoFilter[i][1] + " < " + infoFilter[i][5] + ")";
//								break;
//							default:
//						}
//					}
//					else if (infoFilter[i][3] == 'contains' || infoFilter[i][3] == 'no contains' || infoFilter[i][3] == 'starts with' || infoFilter[i][3] == 'ends with') {

//						switch (infoFilter[i][3]) {
//							case 'contains': //includes()
//								data += "('" + infoFilter[i][1] + "'.includes('" + infoFilter[i][4] + "'))";
//								break;
//							case 'no contains': //no includes()
//								data += "(!'" + infoFilter[i][1] + "'.includes('" + infoFilter[i][4] + "'))";
//								break;
//							case 'starts with': //.startsWith()
//								data += "('" + infoFilter[i][1] + "'.startsWith('" + infoFilter[i][4] + "'))";
//								break;
//							case 'ends with': //endsWith()
//								data += "('" + infoFilter[i][1] + "'.endsWith('" + infoFilter[i][4] + "'))";
//								break;
//							default:
//						}
//					}
//					else if (infoFilter[i][3] == 'year' || infoFilter[i][3] == 'month' || infoFilter[i][3] == 'day' || infoFilter[i][3] == 'hour' || infoFilter[i][3] == 'minute' || infoFilter[i][3] == 'date') {
//						switch (infoFilter[i][3]) {
//							case 'year':
//								data += "(" + "new Date('" + infoFilter[i][1] + "').getFullYear()==" + infoFilter[i][4] + ")";

//								break;
//							case 'month':
//								var value = infoFilter[i][4];
//								if (value.length == 2 && value[0] == "0") {
//									value = value.slice(1);
//								}
//								data += "(" + "new Date('" + infoFilter[i][1] + "').getMonth()==" + ((parseInt(value)) - 1) + ")"; //month function give you one number less
//								break;
//							case 'day':
//								data += "(" + "new Date('" + infoFilter[i][1] + "').getDate()==" + infoFilter[i][4] + ")"; //getDay returns de day of the week
//								break;
//							case 'hour':
//								data += "(" + "new Date('" + infoFilter[i][1] + "').getHours()==" + infoFilter[i][4] + ")"; //Problems if date ends with Z () (give hour +2)
//								break;
//							case 'minute':
//								data += "(" + "new Date('" + infoFilter[i][1] + "').getMinutes()==" + infoFilter[i][4] + ")";
//								break;
//						}
//					}
//					if ((indexOf + 1) != parentLenght) {
//						data += nexus
//					}
//					if ((indexOf + 1) == parentLenght) {
//						data += ")";
//					}
//					node.STAtable += data
//					node.STAtableCounter.push(infoFilter[i][0]);
//				}
				
//			}
//		}
//		if (node.STAtableCounter.length == infoFilter.length) {
//			stopreadInformationRowFilterTable = true;
//			networkNodes.update(node);
//		}
//	}
//}

//var stopreadInformationRowFilterOGCAPIFeatures = false;
//function readInformationRowFilterOGCAPIFeatures(elem, entity, nexus, parent, node) { //OGCAPIFeatures
//	node = node || getNodeDialog("DialogFilterOGC") || getNodeDialog("DialogFilterRows");
//	var infoFilter = node.STAinfoFilter;
//	if (stopreadInformationRowFilterOGCAPIFeatures == false) {
//		if (typeof elem === "object") {
//			for (var i = 0; i < elem.elems.length; i++) {
//				readInformationRowFilterOGCAPIFeatures(elem.elems[i], entity, elem.nexus, elem, node);
//			}
//			if (node.STAUrlAPICounter.length != infoFilter.length && node.STAUrlAPICounter.length != 0 && nexus != "no" && parent != "no") {
//				node.STAUrlAPI += " " + nexus + " ";
//			}
//		}
//		else { //Build URL
//			//Last Array, which contains the filters 
//			var data = "", condition = "";
//			for (var i = 0; i < infoFilter.length; i++) {
//				condition = "";
//				switch (infoFilter[i][3]) {
//					case ' = ':
//						condition = " = ";
//						break;
//					case ' &ne; ':
//						condition = " != ";
//						break;
//					case ' &ge; ':
//						condition = " >= ";
//						break;
//					case ' > ':
//						condition = " > ";
//						break;
//					case ' &le; ':
//						condition = " <= ";
//						break;
//					case ' < ':
//						condition = " < ";
//						break;
//				}
//				if (infoFilter[i][0] == elem) { //To search the array that contains the info that we want
//					var parentLenght = parent.elems.length;
//					var indexOf = parent.elems.indexOf(elem);
//					var apostropheOrSpace;
//					var typeOfValue = (infoFilter[i][3] == ' [a,b] ' || infoFilter[i][3] == ' (a,b] ' || infoFilter[i][3] == ' [a,b) ' || infoFilter[i][3] == ' (a,b) ') ? infoFilter[i][6] : infoFilter[i][5];
//					(typeOfValue == "number") ? apostropheOrSpace = "" : apostropheOrSpace = "'"; //Canviar segons el tipus que posi a la queryable

//					// if (indexOf == 0) {
//					// 	data += "(";
//					// }
//					if (condition == ' = ' || condition == ' != ' || condition == ' >= ' || condition == ' > ' || condition == ' <= ' || condition == ' < ') {

//						data += "(" + infoFilter[i][1] + condition + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";

//					}
//					else if (infoFilter[i][3] == ' [a,b] ' || infoFilter[i][3] == ' (a,b] ' || infoFilter[i][3] == ' [a,b) ' || infoFilter[i][3] == ' (a,b) ') {
//						var lo = (infoFilter[i][3] == ' (a,b] ' || infoFilter[i][3] == ' (a,b) ') ? " > " : " >= ";
//						var hi = (infoFilter[i][3] == ' [a,b) ' || infoFilter[i][3] == ' (a,b) ') ? " < " : " <= ";
//						data += "(" + infoFilter[i][1] + lo + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + " AND " + infoFilter[i][1] + hi + apostropheOrSpace + infoFilter[i][5] + apostropheOrSpace + ")";
//					}
//					//by the moment, only this can be filtered
//					if ((indexOf + 1) != parentLenght) {
//						data += nexus
//					}
//					// if ((indexOf + 1) == parentLenght) {
//					// 	data += ")";
//					// }
//					node.STAUrlAPI += data
//					node.STAUrlAPICounter.push(infoFilter[i][0]);
//				}
//			}
//		}
//		if (node.STAUrlAPICounter.length == infoFilter.length) {
//			node.STAUrlAPI.slice(0, "(");
//			node.STAUrlAPI.slice(node.STAUrlAPI.length + 1, ")");
//			stopreadInformationRowFilterSTA = true;
//		}
//	}
//}

//function applyEvalAndFilterData(node) {
//	var infoFilter = node.STAinfoFilter;
//	var data = node.STAdata;
//	var sentenceToEvalInSTAtable = node.STAtable;
//	var columnsUsedArray = [], resultsFiltered = [];

//	for (var i = 0; i < infoFilter.length; i++) {
//		//Array of columns used to replace in eval sentence
//		if (!columnsUsedArray.find(element => element == infoFilter[i][1])) {
//			columnsUsedArray.push(infoFilter[i][1]);
//		}

//	}
//	var sentence = node.STAtable;
//	var dataValue, dataValueWithoutZ;
//	for (var e = 0; e < data.length; e++) {

//		for (var i = 0; i < columnsUsedArray.length; i++) {
//			sentenceToEvalInSTAtable = sentenceToEvalInSTAtable.replaceAll(columnsUsedArray[i], data[e][columnsUsedArray[i]]);
//			dataValue = data[e][columnsUsedArray[i]];

//		}

//		if (dataValue)
//		{
//			//it is a date?
//			var ItIsADate = new Date(dataValue);
//			if (ItIsADate) {
//				if (dataValue[dataValue.length - 1] == "Z" && sentenceToEvalInSTAtable.includes("getHours")) { //Erase Z in date to obtain the correct hour
//					dataValueWithoutZ = dataValue.slice(0, -1);
//					sentenceToEvalInSTAtable = sentenceToEvalInSTAtable.replaceAll(dataValue, dataValueWithoutZ.toString());
//				}
//			}
//		}

//		if (eval(sentenceToEvalInSTAtable)) {
//			resultsFiltered.push(data[e]);
//		}
//		sentenceToEvalInSTAtable = sentence; //restart sentence to replace colums for values
//	}

//	//update STAdata
//	node.STAdata = resultsFiltered;
//	networkNodes.update(node);
//}

//async function askForCollectionQueryables(node) {
//	node = node || getNodeDialog("DialogFilterOGC") || getNodeDialog("DialogFilterRows");
//	if (!node || !node.STAURL)
//		return;
//	var url = node.STAURL;
//	var index = url.indexOf("/items");
//	if (index === -1)
//		return;
//	url = url.slice(0, index);
//	url += "/queryables?f=json";
//	var queryablesInformation = await loadAPIDataWithReturn(url, "OGCAPIqueryables");
//	if (queryablesInformation && Object.keys(queryablesInformation).length != 0) {
//		node.STAOGCAPIqueryable = queryablesInformation;
//	} else {
//		node.STAOGCAPIqueryable = "no";
//	}
//	networkNodes.update(node);
//}
//function ShowTableFilterRowsDialog(parentNode, node) {

//	saveNodeDialog("DialogFilterRows", node);

//	var data = parentNode.STAdata;
//	node.STAdata=deapCopy(data); //Put all data from parent in this node 
//	if (!node.STAdataAttributes)
//		node.STAdataAttributes=parentNode.STAdataAttributes ? deapCopy(parentNode.STAdataAttributes) : getDataAttributes(data);
//	if (node.image != "FilterRowsTable.png") {
//		node.STAURL=deapCopy(parentNode.STAURL); //Put all data from parent in this node 
//	}
//	networkNodes.update(node);

//	//if (parentNode.image != "FilterRowsTable.png") {
//		addSTAEntityNameAsTitleDialog("divTitleSelectRows",node);
//	//}

//	if (!data || !data.length) {
//		document.getElementById("DialogSelectRowsTable").innerHTML = "No data to show.";
//		return;
//	}

//	document.getElementById("DialogSelectRowsFilter").innerHTML = "<div id='selectorRowsContainer'><div id='divSelectorRowsFilter'></div></div>"; 

//	addNecessaryVariablesToFilterRowsSTANode(node);
	
//	/* Old FilterRowsSTA dialog open. Replaced by filterSTADlg.js. OGC without FilterRowsSTA still uses ShowFilterTable via FilterRowsTable.
//	if (node.image=="FilterRowsSTA.png" && node.STAOGCAPIconformance){
//		if (node.STAOGCAPIconformance.includes("filter")){ //Create Filters if the API allows to filter its information	
//			ShowFilterTable();
//		}else{			
//		showFilterTableWithoutFilters(); //OGCAPIFeatures without filter option		
//		}
//	}else{
//	*/
//		ShowFilterTable(); // Table / CSV. OGC collections with filter use DialogFilterOGC.
//	/* } */
//}

//function GetFilterRows(event) {
//	event.preventDefault(); // We don't want to submit this form
//		//updateinfoFilter

//	var node=getNodeDialog("DialogFilterRows");
//	if (!node)
//		return;

//	takeSelectInformation(node.id);

//		for (var i=0;i<node.STAinfoFilter.length;i++){
//		if (node.STAinfoFilter[i][2][0]==" "){
//			alert ("There is at least one Property field not chosen ");
//			return;
//		}
//		else if (node.STAinfoFilter[i][3]=="--- Choose operator ---"){
//			alert ("There is at least one operator field not chosen ");
//			return;
//		}
//		else if (node.STAinfoFilter[i][4]==""){
//			alert ("There is at least one value empty ");
//			return;
//		}
//	}

//	if (node.image == "FilterRowsTable.png") { //import CSV
//		GetFilterRowsTable(node);
//	} else if (node.STAOGCAPIconformance) {//OGCAPIFeatures
//		if (node.STAOGCAPIconformance?.includes("filter")){
//			GetFilterRowsOGCAPIFeatures(node)// we can apply filter from API
//		}else{
//			GetFilterRowsTable(node); //No filter, use table filter
//		}
//	}
//	/* Old FilterRowsSTA apply. Replaced by FilterSTAApplyFilterToNode in filterSTADlg.js.
//	else if (node.image == "FilterRowsSTA.png") { //STA
//		GetFilterRowsSTA(node);
//		showInfoMessage({cat: "S'estan filtrant les files STA...", spa: "Filtrando las filas STA...", eng: "Filtering STA rows..."});
//	}
//	*/
//	hideNodeDialog("DialogFilterRows");
//	networkNodes.update(node);
//}

///* Old DialogFilterRows apply. FilterRowsTable.png now uses FilterTableApplyFilterToNode in filterTableDlg.js. */
//function GetFilterRowsTable(node) {
//	stopreadInformationRowFilterTable = false;
//	node.STAtableCounter = [];
//	node.STAtable = "";
//	networkNodes.update(node);
//	readInformationRowFilterTable(node.STAelementFilter, "no", "no", node); //apply filter
//	applyEvalAndFilterData(node);
//	UpdateChildenTable(node);		
//}

///* Old FilterRowsSTA apply from DialogFilterRows. Replaced by FilterSTAApplyFilterToNode in filterSTADlg.js.
//   createObjectToKeepForFilter and FinalizeSelectedSelectExpands are still used by the new apply path.
//function GetFilterRowsSTA(node) {
//	var previousSTAURL = node.STAURL;

//	node.STAUrlAPICounter = []; // I need to restart it 

//	createObjectToKeepForFilter(node, node.STAelementFilter, {}); //object to store in .STASelectedExpand

//	var parentNode=GetFirstParentNode(node);
//	if (!parentNode)
//		return;
//	if(parentNode.STASelectedExpand)node.STASelectedExpands= deapCopy(parentNode.STASelectedExpands);
//	if (parentNode.STASelectExpandNextOrigin)node.STASelectExpandNextOrigin= deapCopy(parentNode.STASelectExpandNextOrigin);
//	networkNodes.update(node);

//	var {dataAttributesArray, previousSTAURL}=GetPropagateNodeSelectedSelectExpands(node, parentNode);
//	var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin);
//	if (!selectedExpands)
//		selectedExpands=node.STASelectedExpands={selected: [], expanded: {}};
//	selectedExpands.filter={
//		entity:node.STAEntityName,
//		filterSchema:node.STAFilterSchema,
//		filterData: node.STAinfoFilter,
//	};
//	hideNodeDialog("DialogFilterRows");
//	FinalizeSelectedSelectExpands(node, previousSTAURL, "Filtering STA by selected criteria... ");	
//	}
//*/
//	/* Old OGC API apply from DialogFilterRows (STAelementFilter → STAUrlAPI).
//	   DialogFilterOGC applies CQL on the parent URL in FilterOGCApplyFilterToNode. */
//	async function GetFilterRowsOGCAPIFeatures(node){
//		var previousNode=networkNodes.get(network.getConnectedNodes(node.id, "from"));
//		var previousURL = previousNode[0].STAURL;//put URL ready to add things 
//		if (node.STAOGCAPIconformance.includes("cql-text")){
//			node.STAUrlAPICounter = []; // I need to restart it 
//			stopreadInformationRowFilterOGCAPIFeatures = false;
//			node.STAURL = previousURL  +"?filter=";
//			node.STAUrlAPI="";
//			readInformationRowFilterOGCAPIFeatures(node.STAelementFilter, "no", "no", undefined, node); //apply filter
//			node.STAURL = node.STAURL+node.STAUrlAPI+"&f=json";
//			node.OGCExpectedLength = 100;
//			LoadJSONNodeSTAData(node);
//			networkNodes.update(node);
//			UpdateChildenSTAURL(node, node.STAURL, previousURL);
//		}
//	}
