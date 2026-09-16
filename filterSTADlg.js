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
			' <button type="button" class="FilterSTAChipRemove" title="Remove hop" onclick="FilterSTARemovePathHop(this,' + i + ')">×</button></span>');
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
		input = ' <input type="text" class="FilterSTAPropertyKeyInput" data-cascade-depth="' + depth + '" value="' + FilterSTAEscapeAttr(typedVal) + '" placeholder="or type a key" onchange="FilterSTAOnPropertyChange(this)" oninput="FilterSTAOnPropertyKeyType(this)">';
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
	var dragHandle = isRoot ? "" : '<span class="FilterSTADragHandle" title="Drag group" draggable="true" ondragstart="FilterSTAOnDragStart(event)" ondragend="FilterSTAOnDragEnd(event)">&#8942;&#8942;</span> ';
	var dupBtn = isRoot ? "" : '<button type="button" title="Duplicate" onclick="FilterSTADuplicateItem(this)">Duplicate</button> ';
	var removeBtn = isRoot ? "" : '<button type="button" onclick="FilterSTARemoveItem(this)">Remove</button>';
	var addGroup = depth >= FilterSTAMaxGroupDepth ? "" : '<button type="button" onclick="FilterSTAAddGroup(this)">+ group</button> ';
	var depthClass = (depth % 2 === 0) ? "FilterSTAGroupEven" : "FilterSTAGroupOdd";
	return '<fieldset class="FilterSTAGroup ' + depthClass + '" data-depth="' + depth + '" id="' + id + '"' +
		' ondragover="FilterSTAOnDragOver(event)" ondragleave="FilterSTAOnDragLeave(event)" ondrop="FilterSTAOnDrop(event)">' +
		'<legend class="FilterSTAGroupLegend">' +
		'<span class="FilterSTAGroupLegendStart">' + dragHandle + "Group " + dupBtn + removeBtn + "</span>" +
		"</legend>" +
		'<div class="FilterSTAGroupToolbar">' +
		'<button type="button" onclick="FilterSTAAddCondition(this)">+ condition</button> ' +
		addGroup +
		"</div>" +
		'<div class="FilterSTAGroupBody">' +
		'<div class="FilterSTAGroupChildren"></div>' +
		'<div class="FilterSTAGroupLogic">' +
		'<label><input type="radio" name="' + radioName + '" value="and"' + andChecked + "> AND</label>" +
		'<label><input type="radio" name="' + radioName + '" value="or"' + orChecked + "> OR</label>" +
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
		'<legend><span class="FilterSTADragHandle" title="Drag condition" draggable="true" ondragstart="FilterSTAOnDragStart(event)" ondragend="FilterSTAOnDragEnd(event)">&#8942;&#8942;</span> Condition ' +
		'<button type="button" title="Duplicate" onclick="FilterSTADuplicateItem(this)">Duplicate</button> ' +
		'<button type="button" onclick="FilterSTARemoveItem(this)">Remove</button></legend>' +
		FilterSTAEntityPathHtml(path) +
		'<input type="hidden" class="FilterSTAEntityInput" id="inputForEntityFilterRow_' + count + '" value="' + FilterSTAEscapeAttr(FilterSTAEntityInputValue(path)) + '">' +
		'<div class="FilterSTAPropertyRow">Property: ' +
		'<span class="FilterSTAPropertyCascade">' +
		'<select class="FilterSTAProperty" id="selectorProperty_' + count + '" data-cascade-depth="0" onchange="FilterSTAOnPropertyChange(this)">' +
		FilterSTAPropertyOptionsHtml(FilterSTALastEntityKey(path), propParts[0], path) + "</select>" +
		"</span></div>" +
		'<div style="margin-top:6px;">Operator: ' +
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
		'<label>Value: ' +
		'<input type="' + inputType + '" class="FilterSTAValue" id="inputText_' + count + '" list="' + listId + '" value="' + v + '" placeholder="Enter a value" autocomplete="off">' +
		"</label></span>" +
		'<span class="FilterSTAValueInterval" style="display:' + (interval ? "inline" : "none") + ';">' +
		'<label>a: <input type="text" class="FilterSTAValueA" id="inputTextInterval1_' + count + '" list="' + listId + '" value="' + a + '" placeholder="Enter a value" autocomplete="off"></label> ' +
		'<label>b: <input type="text" class="FilterSTAValueB" id="inputTextInterval2_' + count + '" list="' + listId + '" value="' + b + '" placeholder="Enter a value" autocomplete="off"></label>' +
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
		urlEl.textContent = "Parent URL: (none)";
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
	FinalizeSelectedSelectExpands(node, previousSTAURL, "Filtering STA by selected criteria... ");
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
	document.getElementById("DialogFilterSTAParentURL").textContent = url ? ("Parent URL: " + url) : "Parent URL: (none)";
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
