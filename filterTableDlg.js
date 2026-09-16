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
		input = ' <input type="text" class="FilterTablePropertyKeyInput" data-cascade-depth="' + depth + '" value="' + FilterTableEscapeAttr(typedVal) + '" placeholder="or type a key" onchange="FilterTableOnPropertyChange(this)" oninput="FilterTableOnPropertyKeyType(this)">';
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
	var dragHandle = isRoot ? "" : '<span class="FilterTableDragHandle" title="Drag group" draggable="true" ondragstart="FilterTableOnDragStart(event)" ondragend="FilterTableOnDragEnd(event)">&#8942;&#8942;</span> ';
	var dupBtn = isRoot ? "" : '<button type="button" title="Duplicate" onclick="FilterTableDuplicateItem(this)">Duplicate</button> ';
	var removeBtn = isRoot ? "" : '<button type="button" onclick="FilterTableRemoveItem(this)">Remove</button>';
	var addGroup = depth >= FilterTableMaxGroupDepth ? "" : '<button type="button" onclick="FilterTableAddGroup(this)">+ group</button> ';
	var depthClass = (depth % 2 === 0) ? "FilterTableGroupEven" : "FilterTableGroupOdd";
	return '<fieldset class="FilterTableGroup ' + depthClass + '" data-depth="' + depth + '" id="' + id + '"' +
		' ondragover="FilterTableOnDragOver(event)" ondragleave="FilterTableOnDragLeave(event)" ondrop="FilterTableOnDrop(event)">' +
		'<legend class="FilterTableGroupLegend">' +
		'<span class="FilterTableGroupLegendStart">' + dragHandle + "Group " + dupBtn + removeBtn + "</span>" +
		"</legend>" +
		'<div class="FilterTableGroupToolbar">' +
		'<button type="button" onclick="FilterTableAddCondition(this)">+ condition</button> ' +
		addGroup +
		"</div>" +
		'<div class="FilterTableGroupBody">' +
		'<div class="FilterTableGroupChildren"></div>' +
		'<div class="FilterTableGroupLogic">' +
		'<label><input type="radio" name="' + radioName + '" value="and"' + andChecked + "> AND</label>" +
		'<label><input type="radio" name="' + radioName + '" value="or"' + orChecked + "> OR</label>" +
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
		'<legend><span class="FilterTableDragHandle" title="Drag condition" draggable="true" ondragstart="FilterTableOnDragStart(event)" ondragend="FilterTableOnDragEnd(event)">&#8942;&#8942;</span> Condition ' +
		'<button type="button" title="Duplicate" onclick="FilterTableDuplicateItem(this)">Duplicate</button> ' +
		'<button type="button" onclick="FilterTableRemoveItem(this)">Remove</button></legend>' +
		'<div class="FilterTablePropertyRow">Property: ' +
		'<span class="FilterTablePropertyCascade">' +
		'<select class="FilterTableProperty" id="selectorColumns_' + count + '" data-cascade-depth="0" onchange="FilterTableOnPropertyChange(this)">' +
		FilterTablePropertyOptionsHtml(propParts[0]) + "</select>" +
		"</span></div>" +
		'<div style="margin-top:6px;">Operator: ' +
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
		'<label>Value: ' +
		'<input type="' + inputType + '" class="FilterTableValue" id="inputText_' + count + '" list="' + listId + '" value="' + v + '" placeholder="Enter a value" autocomplete="off">' +
		"</label></span>" +
		'<span class="FilterTableValueInterval" style="display:' + (interval ? "inline" : "none") + ';">' +
		'<label>a: <input type="text" class="FilterTableValueA" id="inputTextInterval1_' + count + '" list="' + listId + '" value="' + a + '" placeholder="Enter a value" autocomplete="off"></label> ' +
		'<label>b: <input type="text" class="FilterTableValueB" id="inputTextInterval2_' + count + '" list="' + listId + '" value="' + b + '" placeholder="Enter a value" autocomplete="off"></label>' +
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
	var parentNode, source, filtered, i;
	if (!node)
		return;
	if (!node.STAFilterExpr || node.STAFilterExpr.indexOf(FilterTableIncompletePlaceholder) !== -1)
		return;
	FilterTableStripLegacyFilterFields(node);
	parentNode = (typeof GetFirstParentNode === "function") ? GetFirstParentNode(node) : null;
	source = (parentNode && parentNode.STAdata) ? parentNode.STAdata : null;
	if (!source || !source.length)
		return;
	if (typeof deapCopy === "function")
		source = deapCopy(source);
	filtered = [];
	for (i = 0; i < source.length; i++) {
		if (FilterTableTreeMatches(node.STAFilterTreeTable, source[i]))
			filtered.push(source[i]);
	}
	node.STAdata = filtered;
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
		if (parentNode.STAdata)
			node.STAdata = deapCopy(parentNode.STAdata);
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
