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
		return true;
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
	if (FilterOGCIsCollectionsPath(node, parentNode)) {
		await FilterOGCEnsureConformance(node);
		node = (typeof networkNodes !== "undefined" && networkNodes.get) ? (networkNodes.get(node.id) || node) : node;
		parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : parentNode;
		if (typeof FilterOGCAllowsApiFilter !== "function" || FilterOGCAllowsApiFilter(node, parentNode)) {
			if (typeof currentNode !== "undefined")
				currentNode = node;
			await ShowFilterOGCDialog();
			showNodeDialog("DialogFilterOGC");
			return;
		}
	}
	if (node.image === "FilterRowsSTA.png") {
		ShowFilterSTADialog();
		showNodeDialog("DialogFilterSTA");
	} else if (parentNode) {
		ShowTableFilterRowsDialog(parentNode, node);
		showNodeDialog("DialogFilterRows");
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
		input = ' <input type="text" class="FilterOGCPropertyKeyInput" data-cascade-depth="' + depth + '" value="' + FilterOGCEscapeAttr(typedVal) + '" placeholder="or type a key" onchange="FilterOGCOnPropertyChange(this)" oninput="FilterOGCOnPropertyKeyType(this)">';
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
	var dragHandle = isRoot ? "" : '<span class="FilterOGCDragHandle" title="Drag group" draggable="true" ondragstart="FilterOGCOnDragStart(event)" ondragend="FilterOGCOnDragEnd(event)">&#8942;&#8942;</span> ';
	var dupBtn = isRoot ? "" : '<button type="button" title="Duplicate" onclick="FilterOGCDuplicateItem(this)">Duplicate</button> ';
	var removeBtn = isRoot ? "" : '<button type="button" onclick="FilterOGCRemoveItem(this)">Remove</button>';
	var addGroup = depth >= FilterOGCMaxGroupDepth ? "" : '<button type="button" onclick="FilterOGCAddGroup(this)">+ group</button> ';
	var depthClass = (depth % 2 === 0) ? "FilterOGCGroupEven" : "FilterOGCGroupOdd";
	return '<fieldset class="FilterOGCGroup ' + depthClass + '" data-depth="' + depth + '" id="' + id + '"' +
		' ondragover="FilterOGCOnDragOver(event)" ondragleave="FilterOGCOnDragLeave(event)" ondrop="FilterOGCOnDrop(event)">' +
		'<legend class="FilterOGCGroupLegend">' +
		'<span class="FilterOGCGroupLegendStart">' + dragHandle + "Group " + dupBtn + removeBtn + "</span>" +
		"</legend>" +
		'<div class="FilterOGCGroupToolbar">' +
		'<button type="button" onclick="FilterOGCAddCondition(this)">+ condition</button> ' +
		addGroup +
		"</div>" +
		'<div class="FilterOGCGroupBody">' +
		'<div class="FilterOGCGroupChildren"></div>' +
		'<div class="FilterOGCGroupLogic">' +
		'<label><input type="radio" name="' + radioName + '" value="and"' + andChecked + "> AND</label>" +
		'<label><input type="radio" name="' + radioName + '" value="or"' + orChecked + "> OR</label>" +
		"</div></div>" +
		"</fieldset>";
}

function FilterOGCConditionCardHtml(state) {
	state = state || {};
	var id = FilterOGCNextId("FilterOGCCond");
	var count = String(FilterOGCIdSeq);
	var interval = FilterOGCIsIntervalOperator(state.operator);
	var propParts = FilterOGCPropertyPathParts(state.property);
	var propAttr = state.property ? ' data-property-path="' + FilterOGCEscapeAttr(state.property) + '"' : "";
	return '<fieldset class="FilterOGCConditionCard" id="' + id + '" data-row-count="' + count + '"' + propAttr + ' style="margin-top:8px;">' +
		'<legend><span class="FilterOGCDragHandle" title="Drag condition" draggable="true" ondragstart="FilterOGCOnDragStart(event)" ondragend="FilterOGCOnDragEnd(event)">&#8942;&#8942;</span> Condition ' +
		'<button type="button" title="Duplicate" onclick="FilterOGCDuplicateItem(this)">Duplicate</button> ' +
		'<button type="button" onclick="FilterOGCRemoveItem(this)">Remove</button></legend>' +
		'<div class="FilterOGCPropertyRow">Property: ' +
		'<span class="FilterOGCPropertyCascade">' +
		'<select class="FilterOGCProperty" id="selectorColumns_' + count + '" data-cascade-depth="0" onchange="FilterOGCOnPropertyChange(this)">' +
		FilterOGCPropertyOptionsHtml(propParts[0]) + "</select>" +
		"</span></div>" +
		'<div style="margin-top:6px;">Operator: ' +
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
		'<label>Value: ' +
		'<input type="text" class="FilterOGCValue" id="inputText_' + count + '" list="' + listId + '" value="' + v + '" placeholder="Enter a value" autocomplete="off">' +
		"</label></span>" +
		'<span class="FilterOGCValueInterval" style="display:' + (interval ? "inline" : "none") + ';">' +
		'<label>a: <input type="text" class="FilterOGCValueA" id="inputTextInterval1_' + count + '" list="' + listId + '" value="' + a + '" placeholder="Enter a value" autocomplete="off"></label> ' +
		'<label>b: <input type="text" class="FilterOGCValueB" id="inputTextInterval2_' + count + '" list="' + listId + '" value="' + b + '" placeholder="Enter a value" autocomplete="off"></label>' +
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
	host.insertAdjacentHTML("beforeend", FilterOGCConditionCardHtml());
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
		card.insertAdjacentHTML("afterend", FilterOGCConditionCardHtml(FilterOGCReadCondition(card)));
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
	if (!FilterOGCDragId)
		return;
	event.preventDefault();
	event.stopPropagation();
	event.dataTransfer.dropEffect = "move";
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
	var group = FilterOGCClosestGroup(card);
	if (group)
		FilterOGCSetSelectedGroup(group);
}

function FilterOGCSetSelectedGroup(group) {
	var dlg = document.getElementById("DialogFilterOGC");
	if (!dlg || !group)
		return;
	var els = dlg.getElementsByClassName("FilterOGCGroup");
	for (var i = 0; i < els.length; i++)
		els[i].classList.remove("FilterOGCGroupSelected");
	group.classList.add("FilterOGCGroupSelected");
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
			childHost.insertAdjacentHTML("beforeend", FilterOGCConditionCardHtml(children[i]));
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
		if (card)
			FilterOGCSetSelectedCondition(card);
		else {
			FilterOGCClearSelectedConditions();
			if (group)
				FilterOGCSetSelectedGroup(group);
		}
	});
	dlg.addEventListener("focusin", function (e) {
		var card = e.target.closest ? e.target.closest(".FilterOGCConditionCard") : null;
		if (card)
			FilterOGCSetSelectedCondition(card);
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
		urlEl.textContent = "Parent URL: (none)";
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
	} else if (typeof GetFilterRowsTable === "function")
		GetFilterRowsTable(node);
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
	var node, parentNode, url, host, root, tree, card;
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
	document.getElementById("DialogFilterOGCParentURL").textContent = url ? ("Parent URL: " + url) : "Parent URL: (none)";
	host = document.getElementById("DialogFilterOGCTree");
	tree = (node.STAFilterTreeOGC && node.STAFilterTreeOGC.type === "group") ? FilterOGCCloneTree(node.STAFilterTreeOGC) : null;
	if (tree)
		FilterOGCMountGroup(host, tree, true, 1);
	else
		host.insertAdjacentHTML("beforeend", FilterOGCGroupHtml(true, 1, "and"));
	root = document.getElementById("DialogFilterOGCRoot") || host.firstElementChild;
	if (root) {
		if (!FilterOGCDirectChildren(root).length) {
			card = FilterOGCAddEmptyCondition(root);
			if (card)
				FilterOGCSetSelectedCondition(card);
		}
		FilterOGCSetSelectedGroup(root);
	}
	await FilterOGCFillAllValueSelectors();
	FilterOGCUpdatePreview();
}
