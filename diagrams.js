/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able 
	to work with STA data as tables.
  
	The TAPIS client is free software under the terms of the MIT License

	Copyright (c) 2023-2026 Joan MasÃ³

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

	Aquest codi JavaScript ha estat idea de Joan MasÃ³ Pau (joan maso at uab cat) 
	dins del grup del MiraMon. MiraMon és un projecte del 
	CREAF que elabora programari de Sistema d'InformaciÃ³ GeogrÃ fica 
	i de TeledetecciÃ³ per a la visualitzaciÃ³, consulta, ediciÃ³ i anÃ lisi 
	de mapes rÃ sters i vectorials. Aquest progamari programari inclou
	aplicacions d'escriptori i també servidors i clients per Internet.
	No tots aquests productes sÃ³n gratuÃ¯ts o de codi obert. 
    
	En particular, el TAPIS es distribueix sota els termes de la llicÃ¨ncia MIT.
    
	El TAPIS es pot actualitzar des de https://github.com/grumets/tapis.
*/

"use strict"
var ScatterPlotChart = null;
var ScatterPlotLastLegend = null;

function ensureScatterPlotStyleState(store) {
	if (!store)
		return;
	if (!store.seriesColors)
		store.seriesColors = {};
	if (!store.hiddenSeries)
		store.hiddenSeries = [];
	if (typeof store.titleFontSize !== "number")
		store.titleFontSize = 16;
	if (typeof store.labelFontSize !== "number")
		store.labelFontSize = 12;
	if (typeof store.legendFontSize !== "number")
		store.legendFontSize = 12;
	if (typeof store.axisLabelFontSize !== "number")
		store.axisLabelFontSize = 12;
	if (!store.lineInterpolation)
		store.lineInterpolation = "linear";
	if (!store.seriesStyles)
		store.seriesStyles = {};
	if (typeof store.spanGaps !== "boolean")
		store.spanGaps = false;
	store.pointRadius = clampScatterPointRadius(store.pointRadius);
}

function syncScatterPlotStyleControls(store) {
	var te = document.getElementById("DialogScatterPlotTitleSize");
	var tv = document.getElementById("DialogScatterPlotTitleSizeValue");
	var le = document.getElementById("DialogScatterPlotLabelSize");
	var lv = document.getElementById("DialogScatterPlotLabelSizeValue");
	var ge = document.getElementById("DialogScatterPlotLegendSize");
	var gv = document.getElementById("DialogScatterPlotLegendSizeValue");
	var ae = document.getElementById("DialogScatterPlotAxisLabelSize");
	var av = document.getElementById("DialogScatterPlotAxisLabelSizeValue");
	var ie = document.getElementById("DialogScatterPlotInterpolation");
	var pr = document.getElementById("DialogScatterPlotPointSize");
	var prv = document.getElementById("DialogScatterPlotPointSizeValue");
	if (te) te.value = store.titleFontSize || 16;
	if (tv) tv.textContent = "" + (store.titleFontSize || 16);
	if (le) le.value = store.labelFontSize || 12;
	if (lv) lv.textContent = "" + (store.labelFontSize || 12);
	if (ge) ge.value = store.legendFontSize || 12;
	if (gv) gv.textContent = "" + (store.legendFontSize || 12);
	if (ae) ae.value = store.axisLabelFontSize || 12;
	if (av) av.textContent = "" + (store.axisLabelFontSize || 12);
	if (ie) ie.value = normalizeScatterLineInterpolation(store.lineInterpolation);
	if (pr) pr.value = clampScatterPointRadius(store.pointRadius);
	if (prv) prv.textContent = "" + clampScatterPointRadius(store.pointRadius);
}

function onScatterPlotStyleChange(redraw) {
	var node = getNodeDialog("DialogScatterPlot");
	var ts = parseInt(document.getElementById("DialogScatterPlotTitleSize").value, 10) || 16;
	var ls = parseInt(document.getElementById("DialogScatterPlotLabelSize").value, 10) || 12;
	var gs = clampChartFontSize(document.getElementById("DialogScatterPlotLegendSize") ? document.getElementById("DialogScatterPlotLegendSize").value : 12, 8, 28, 12);
	var asz = clampChartFontSize(document.getElementById("DialogScatterPlotAxisLabelSize") ? document.getElementById("DialogScatterPlotAxisLabelSize").value : 12, 8, 28, 12);
	var interp = getScatterLineInterpolation();
	var pradius = getScatterPointRadius();
	syncScatterPlotStyleControls({ titleFontSize: ts, labelFontSize: ls, legendFontSize: gs, axisLabelFontSize: asz, lineInterpolation: interp, pointRadius: pradius });
	if (!node || !node.STAattributesToSelect)
		return;
	node.STAattributesToSelect.titleFontSize = ts;
	node.STAattributesToSelect.labelFontSize = ls;
	node.STAattributesToSelect.legendFontSize = gs;
	node.STAattributesToSelect.axisLabelFontSize = asz;
	node.STAattributesToSelect.lineInterpolation = interp;
	node.STAattributesToSelect.pointRadius = pradius;
	applyChartLegendFontSize("DialogScatterPlotLegend", gs);
	node.STAattributesToSelect.title = document.getElementById("DialogScatterPlotAxisTitle").value;
	networkNodes.update(node);
	if (redraw && node.STAattributesToSelect.drawn)
		UpdateScatterPlot();
}

function scatterPlotEscapeAttr(s) {
	return ("" + s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function scatterPlotEscapeJs(s) {
	return ("" + s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizeScatterLineInterpolation(mode) {
	if (mode == "cubic" || mode == "monotone" || mode == "before" || mode == "middle" || mode == "after")
		return mode;
	return "linear";
}

function getScatterLineInterpolation() {
	var el = document.getElementById("DialogScatterPlotInterpolation");
	return normalizeScatterLineInterpolation(el ? el.value : "linear");
}

function normalizeScatterPointStyle(style) {
	if (style == "triangle" || style == "rect" || style == "cross" || style == "star" || style == "rectRot")
		return style;
	return "circle";
}

function normalizeScatterSeriesStyle(style) {
	if (style == "lineDash" || style == "lineGradient" || style == "circle" || style == "triangle" || style == "rect" || style == "cross" || style == "star" || style == "rectRot")
		return style;
	return "line";
}

function isScatterSeriesLineStyle(style) {
	style = normalizeScatterSeriesStyle(style);
	return style == "line" || style == "lineDash" || style == "lineGradient";
}

var ScatterPlotLineGradientStops = [
	{ offset: 0, color: "#1f77b4" },
	{ offset: 0.2, color: "#17becf" },
	{ offset: 0.4, color: "#2ca02c" },
	{ offset: 0.6, color: "#bcbd22" },
	{ offset: 0.8, color: "#ff7f0e" },
	{ offset: 1, color: "#d62728" }
];

function scatterPlotLineGradientCss() {
	var parts = [], i;
	for (i = 0; i < ScatterPlotLineGradientStops.length; i++)
		parts.push(ScatterPlotLineGradientStops[i].color + " " + Math.round(ScatterPlotLineGradientStops[i].offset * 100) + "%");
	return "linear-gradient(90deg, " + parts.join(", ") + ")";
}

function fillScatterPlotLineGradient(ctx, x0, y0, x1, y1) {
	var g = ctx.createLinearGradient(x0, y0, x1, y1), i;
	for (i = 0; i < ScatterPlotLineGradientStops.length; i++)
		g.addColorStop(ScatterPlotLineGradientStops[i].offset, ScatterPlotLineGradientStops[i].color);
	return g;
}

function scatterPlotLineGradientBorderColor(context) {
	var chart = context && context.chart, area = chart && chart.chartArea, ctx = chart && chart.ctx;
	if (!area || !ctx || area.right <= area.left)
		return ScatterPlotLineGradientStops[0].color;
	return fillScatterPlotLineGradient(ctx, area.left, 0, area.right, 0);
}

function clampScatterPointRadius(n) {
	n = parseInt(n, 10);
	if (isNaN(n) || n < 1)
		n = 2;
	if (n > 16)
		n = 16;
	return n;
}

function getScatterPointRadius() {
	var el = document.getElementById("DialogScatterPlotPointSize");
	return clampScatterPointRadius(el ? el.value : 2);
}

function getScatterSeriesStyle(store, seriesKey, groupGraphicType) {
	var style;
	if (store && store.seriesStyles && store.seriesStyles[seriesKey])
		return normalizeScatterSeriesStyle(store.seriesStyles[seriesKey]);
	if (groupGraphicType == "scatter")
		return normalizeScatterPointStyle(store && store.pointStyle);
	return "line";
}

function scatterPlotSeriesStyleOptionsHtml(selected) {
	var lineOpts = [
		{ value: "line", label: DonaCadena({cat: "Continua", spa: "Continua", eng: "Solid"}) },
		{ value: "lineDash", label: DonaCadena({cat: "Discontinua", spa: "Discontinua", eng: "Dashed"}) },
		{ value: "lineGradient", label: DonaCadena({cat: "Gradient", spa: "Degradado", eng: "Gradient"}) }
	];
	var pointOpts = [
		{ value: "circle", label: DonaCadena({cat: "Cercle", spa: "Círculo", eng: "Circle"}) },
		{ value: "triangle", label: DonaCadena({cat: "Triangle", spa: "Triángulo", eng: "Triangle"}) },
		{ value: "rect", label: DonaCadena({cat: "Quadrat", spa: "Cuadrado", eng: "Square"}) },
		{ value: "cross", label: DonaCadena({cat: "Creu", spa: "Cruz", eng: "Cross"}) },
		{ value: "star", label: DonaCadena({cat: "Estrella", spa: "Estrella", eng: "Star"}) },
		{ value: "rectRot", label: DonaCadena({cat: "Rombe", spa: "Rombo", eng: "Diamond"}) }
	];
	var i, cdns = "";
	selected = normalizeScatterSeriesStyle(selected);
	cdns += '<optgroup label="' + scatterPlotEscapeAttr(DonaCadena({cat: "Línia", spa: "Línea", eng: "Line"})) + '">';
	for (i = 0; i < lineOpts.length; i++) {
		cdns += '<option value="' + lineOpts[i].value + '"' + (lineOpts[i].value == selected ? " selected" : "") + ">" +
			scatterPlotEscapeAttr(lineOpts[i].label) + "</option>";
	}
	cdns += "</optgroup>";
	cdns += '<optgroup label="' + scatterPlotEscapeAttr(DonaCadena({cat: "Punt", spa: "Punto", eng: "Point"})) + '">';
	for (i = 0; i < pointOpts.length; i++) {
		cdns += '<option value="' + pointOpts[i].value + '"' + (pointOpts[i].value == selected ? " selected" : "") + ">" +
			scatterPlotEscapeAttr(pointOpts[i].label) + "</option>";
	}
	cdns += "</optgroup>";
	return cdns;
}

function applyScatterLineInterpolation(dataset, mode) {
	mode = normalizeScatterLineInterpolation(mode);
	dataset.tension = 0;
	dataset.stepped = false;
	dataset.cubicInterpolationMode = "default";
	if (mode == "cubic") {
		dataset.tension = 0.4;
	} else if (mode == "monotone") {
		dataset.tension = 0.4;
		dataset.cubicInterpolationMode = "monotone";
	} else if (mode == "before" || mode == "middle" || mode == "after") {
		dataset.stepped = mode;
	}
}

function clampChartFontSize(n, min, max, fallback) {
	n = parseInt(n, 10);
	if (isNaN(n))
		n = fallback;
	if (n < min)
		n = min;
	if (n > max)
		n = max;
	return n;
}

function chartLegendRowHeight(fontSize) {
	return Math.max(22, clampChartFontSize(fontSize, 8, 28, 12) + 10);
}

function wrapChartLegendLabel(ctx, text, maxWidth) {
	var words, lines = [], line = "", i, test, ch, j, piece;
	text = "" + (text == null ? "" : text);
	if (!text)
		return [""];
	words = text.split(/\s+/);
	if (words.length == 1 && ctx.measureText(words[0]).width <= maxWidth)
		return [words[0]];
	for (i = 0; i < words.length; i++) {
		piece = words[i];
		if (ctx.measureText(piece).width > maxWidth) {
			if (line) {
				lines.push(line);
				line = "";
			}
			ch = "";
			for (j = 0; j < piece.length; j++) {
				test = ch + piece.charAt(j);
				if (ch && ctx.measureText(test).width > maxWidth) {
					lines.push(ch);
					ch = piece.charAt(j);
				} else
					ch = test;
			}
			line = ch;
			continue;
		}
		test = line ? (line + " " + piece) : piece;
		if (line && ctx.measureText(test).width > maxWidth) {
			lines.push(line);
			line = piece;
		} else
			line = test;
	}
	if (line)
		lines.push(line);
	return lines.length ? lines : [""];
}

function applyChartLegendFontSize(containerId, size) {
	var el = document.getElementById(containerId), items, i;
	size = clampChartFontSize(size, 8, 28, 12);
	if (!el)
		return size;
	el.style.fontSize = size + "px";
	items = el.querySelectorAll(".DialogScatterPlotLegendItem, .DialogBarPlotLegendItem, .DialogRadarPlotLegendItem, .DialogCircularChartLegendItem, .DialogScatterPlotLegendLabel, .DialogBarPlotLegendLabel, .DialogRadarPlotLegendLabel, .DialogCircularChartLegendLabel, .DialogCircularChartRingItem, .DialogCircularChartRingsTitle");
	for (i = 0; i < items.length; i++)
		items[i].style.fontSize = size + "px";
	return size;
}

function hideScatterPlotColorCard() {
	var card = document.getElementById("DialogScatterPlotColorCard");
	if (card)
		card.style.display = "none";
}

function clearScatterPlotChart() {
	var canvas, existing, legend;
	if (ScatterPlotChart) {
		ScatterPlotChart.destroy();
		ScatterPlotChart = null;
	}
	canvas = document.getElementById("DialogScatterPlotVisualization");
	if (canvas && typeof Chart !== "undefined" && Chart.getChart) {
		existing = Chart.getChart(canvas);
		if (existing)
			existing.destroy();
	}
	legend = document.getElementById("DialogScatterPlotLegend");
	if (legend)
		legend.innerHTML = "";
	ScatterPlotLastLegend = null;
	hideScatterPlotColorCard();
}

function showEmptyScatterPlotChart() {
	showEmptyChartPlaceholder("DialogScatterPlotVisualization", {
		type: "scatter",
		data: { datasets: [{ data: [] }] },
		options: {
			scales: {
				x: { type: "linear", min: 0, max: 10, title: { display: true, text: "X" } },
				y: { type: "linear", min: 0, max: 10, title: { display: true, text: "Y" } }
			}
		}
	});
}

function buildScatterPlotLegendHtml(node, keys, labels, colors, seriesStyleFallbacks) {
	var container = document.getElementById("DialogScatterPlotLegend");
	var store, cdns = "", i, hidden, eyeTitle, hiddenFlags = [], style, isSeries, styles = [], isGradient;
	if (!container)
		return;
	store = node.STAattributesToSelect;
	ensureScatterPlotStyleState(store);
	seriesStyleFallbacks = seriesStyleFallbacks || {};
	container.style.fontSize = (store.legendFontSize || 12) + "px";
	for (i = 0; i < keys.length; i++) {
		hidden = store.hiddenSeries.indexOf(keys[i]) != -1;
		hiddenFlags.push(hidden);
		eyeTitle = hidden ? DonaCadena({cat: "Mostra", spa: "Mostrar", eng: "Show"}) : DonaCadena({cat: "Amaga", spa: "Ocultar", eng: "Hide"});
		isSeries = ("" + keys[i]).charAt(0) == "s";
		style = isSeries ? getScatterSeriesStyle(store, keys[i], seriesStyleFallbacks[keys[i]]) : "line";
		styles.push(style);
		isGradient = style == "lineGradient";
		cdns += '<div class="DialogScatterPlotLegendItem' + (hidden ? " is-hidden" : "") + '">';
		if (isGradient) {
			cdns += '<span class="DialogScatterPlotLegendSwatch is-gradient" style="background:' +
				scatterPlotEscapeAttr(scatterPlotLineGradientCss()) + ';" title="' +
				scatterPlotEscapeAttr(DonaCadena({cat: "Gradient (color fix)", spa: "Degradado (color fijo)", eng: "Gradient (fixed color)"})) +
				'"></span>';
		} else {
			cdns += '<button type="button" class="DialogScatterPlotLegendSwatch" style="background-color:' + scatterPlotEscapeAttr(colors[i]) +
				';" onclick="onScatterLegendColorClick(\'' + scatterPlotEscapeJs(keys[i]) + '\',event)"></button>';
		}
		cdns += '<button type="button" class="DialogScatterPlotLegendEye" title="' + scatterPlotEscapeAttr(eyeTitle) +
			'" onclick="onScatterLegendEyeClick(\'' + scatterPlotEscapeJs(keys[i]) + '\')">' + (hidden ? "&#10005;" : "&#128065;") + "</button>";
		if (isSeries) {
			cdns += '<select class="DialogScatterPlotLegendStyle" title="' +
				scatterPlotEscapeAttr(DonaCadena({cat: "Estil", spa: "Estilo", eng: "Style"})) +
				'" onchange="onScatterLegendStyleChange(\'' + scatterPlotEscapeJs(keys[i]) + '\', this.value)">' +
				scatterPlotSeriesStyleOptionsHtml(style) + "</select>";
		}
		cdns += '<span class="DialogScatterPlotLegendLabel" style="font-size:' + (store.legendFontSize || 12) + 'px;">' + scatterPlotEscapeAttr(labels[i]) + "</span></div>";
	}
	container.innerHTML = cdns;
	ScatterPlotLastLegend = { keys: keys.slice(), labels: labels.slice(), colors: colors.slice(), hidden: hiddenFlags, styles: styles };
}

function onScatterLegendStyleChange(key, value) {
	var node = getNodeDialog("DialogScatterPlot");
	if (!node || !node.STAattributesToSelect)
		return;
	ensureScatterPlotStyleState(node.STAattributesToSelect);
	node.STAattributesToSelect.seriesStyles[key] = normalizeScatterSeriesStyle(value);
	networkNodes.update(node);
	UpdateScatterPlot();
}

function onScatterLegendEyeClick(key) {
	var node = getNodeDialog("DialogScatterPlot"), list, idx;
	if (!node || !node.STAattributesToSelect)
		return;
	ensureScatterPlotStyleState(node.STAattributesToSelect);
	list = node.STAattributesToSelect.hiddenSeries;
	idx = list.indexOf(key);
	if (idx == -1)
		list.push(key);
	else
		list.splice(idx, 1);
	networkNodes.update(node);
	UpdateScatterPlot();
}

function onScatterLegendColorClick(key, evt) {
	var card = document.getElementById("DialogScatterPlotColorCard");
	var dialog = document.getElementById("DialogScatterPlot");
	var cdns = "", i, color, rect, dRect;
	if (!card || !dialog)
		return;
	for (i = 0; i < ColorsForBarPlot.length; i++) {
		color = ColorsForBarPlot[i];
		cdns += '<button type="button" class="DialogScatterPlotColorCardSwatch" style="background-color:' + color +
			';" onclick="applyScatterLegendColor(\'' + scatterPlotEscapeJs(key) + '\',\'' + color + '\')"></button>';
	}
	cdns += '<input type="color" onchange="applyScatterLegendColor(\'' + scatterPlotEscapeJs(key) + '\', this.value)">';
	card.innerHTML = cdns;
	card.style.display = "flex";
	rect = evt && evt.target ? evt.target.getBoundingClientRect() : null;
	dRect = dialog.getBoundingClientRect();
	if (rect) {
		card.style.left = Math.max(8, rect.left - dRect.left) + "px";
		card.style.top = Math.max(8, rect.bottom - dRect.top + 4) + "px";
	}
}

function applyScatterLegendColor(key, color) {
	var node = getNodeDialog("DialogScatterPlot");
	if (!node || !node.STAattributesToSelect)
		return;
	ensureScatterPlotStyleState(node.STAattributesToSelect);
	node.STAattributesToSelect.seriesColors[key] = color;
	networkNodes.update(node);
	hideScatterPlotColorCard();
	UpdateScatterPlot();
}

function collectScatterPlotParentInfo(parentNodes) {
	var info = {}, i, attributesArray, numericArray, allAttributes, allAttributesKeys, c, t;
	for (i = 0; i < (parentNodes || []).length; i++) {
		if (!parentNodes[i] || !parentNodes[i].STAdata)
			continue;
		attributesArray = [];
		numericArray = [];
		allAttributes = parentNodes[i].STAdataAttributes ? parentNodes[i].STAdataAttributes : getDataAttributes(parentNodes[i].STAdata);
		allAttributesKeys = Object.keys(allAttributes);
		for (c = 0; c < allAttributesKeys.length; c++) {
			t = allAttributes[allAttributesKeys[c]].type;
			if (t == "number" || t == "isodatetime" || t == "integer")
				attributesArray.push(allAttributesKeys[c]);
			if (t == "number" || t == "integer")
				numericArray.push(allAttributesKeys[c]);
		}
		info[parentNodes[i].id] = { attr: attributesArray, numericAttr: numericArray, nodeLabel: parentNodes[i].label };
	}
	return info;
}

function scatterPlotDefaultSeriesGroup(parentId, info) {
	var attr = (info && info.attr) ? info.attr : [];
	var numeric = (info && info.numericAttr) ? info.numericAttr : [];
	var x = attr[0] || "";
	var values = [], vi;
	for (vi = 0; vi < numeric.length; vi++) {
		if (numeric[vi] != x)
			values.push(numeric[vi]);
	}
	return {
		nodeSelected: parentId,
		X: x,
		valueColumns: values,
		columnAxes: {},
		graphicType: "line",
		regressionLine: false,
		legendText: (info && info.nodeLabel) || parentId
	};
}

function scatterPlotColumnAxis(group, col) {
	if (group && group.columnAxes && group.columnAxes[col] == "right")
		return "right";
	return "left";
}

function ensureScatterPlotColumnAxes(g) {
	if (!g.columnAxes)
		g.columnAxes = {};
}

function migrateScatterPlotSeriesGroups(old) {
	var byNode = {}, i, g, id, cols, c, out = [], ids;
	if (!old || !old.length)
		return [];
	for (i = 0; i < old.length; i++) {
		g = old[i];
		if (!g || !g.nodeSelected)
			continue;
		id = g.nodeSelected;
		if (!byNode[id]) {
			byNode[id] = {
				nodeSelected: id,
				X: g.X,
				valueColumns: [],
				columnAxes: {},
				graphicType: g.graphicType || "line",
				regressionLine: !!g.regressionLine,
				legendText: g.legendText || ""
			};
		}
		if (g.columnAxes) {
			for (c in g.columnAxes) {
				if (Object.prototype.hasOwnProperty.call(g.columnAxes, c) && !byNode[id].columnAxes[c])
					byNode[id].columnAxes[c] = g.columnAxes[c];
			}
		}
		cols = byNode[id].valueColumns;
		if (g.valueColumns && g.valueColumns.length) {
			for (c = 0; c < g.valueColumns.length; c++) {
				if (g.valueColumns[c] && g.valueColumns[c] != byNode[id].X && cols.indexOf(g.valueColumns[c]) == -1)
					cols.push(g.valueColumns[c]);
			}
		} else if (g.Y && g.Y != byNode[id].X && cols.indexOf(g.Y) == -1)
			cols.push(g.Y);
	}
	ids = Object.keys(byNode);
	for (i = 0; i < ids.length; i++)
		out.push(byNode[ids[i]]);
	return out;
}

function syncScatterPlotSeriesWithParents(node) {
	var info, ids, old, groups = [], i, j, g;
	if (!node.STAattributesToSelect)
		node.STAattributesToSelect = {};
	info = node.STAattributesToSelect.parentNodesInformation || {};
	ids = Object.keys(info);
	old = migrateScatterPlotSeriesGroups(node.STAattributesToSelect.dataGroupsSelectedToScatterPlot || []);
	for (i = 0; i < ids.length; i++) {
		g = null;
		for (j = 0; j < old.length; j++) {
			if (old[j] && old[j].nodeSelected == ids[i]) {
				g = old[j];
				break;
			}
		}
		if (!g)
			g = scatterPlotDefaultSeriesGroup(ids[i], info[ids[i]]);
		else {
			if (!g.valueColumns || !g.valueColumns.length)
				g.valueColumns = g.Y && g.Y != g.X ? [g.Y] : [];
			g.valueColumns = g.valueColumns.filter(function (c) { return c && c != g.X; });
			ensureScatterPlotColumnAxes(g);
			if (!g.legendText)
				g.legendText = (info[ids[i]] && info[ids[i]].nodeLabel) || ids[i];
			if (!g.graphicType)
				g.graphicType = "line";
		}
		groups.push(g);
	}
	node.STAattributesToSelect.dataGroupsSelectedToScatterPlot = groups;
}

function ShowScatterPlotDialog(parentNodes, node) { //doble click scatterplot.png
	saveNodeDialog("DialogScatterPlot", node);
	if ('STAattributesToSelect'in node){
		if ('sorted' in node.STAattributesToSelect) {
			if (node.STAattributesToSelect.sorted==true){
				document.getElementById("DialogScatterPlotAxisXSort").checked=true;	
				document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display="none";	
			}else{
				document.getElementById("DialogScatterPlotAxisXSort").checked=false;
				document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display="inline-block";	
				
			}			
		}
	}else{
		document.getElementById("DialogScatterPlotAxisXSort").checked=true;	
		document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display="none";
	}

	
	var objectWithParentNodesInfo = collectScatterPlotParentInfo(parentNodes);
	var noData = !Object.keys(objectWithParentNodesInfo).length;
	if (!node.STAattributesToSelect){
		node.STAattributesToSelect = {};
		node.STAattributesToSelect.sorted= true;
	}
	node.STAattributesToSelect.parentNodesInformation = objectWithParentNodesInfo;
	syncScatterPlotSeriesWithParents(node);
	networkNodes.update(node);
	var options = [["second","Seconds"],["minute","Minutes"],["hour","Hours"],["day","Days"],["week","Weeks"],["month","Month"],["year","Years"]];
	var unitValue="minute";
	if (node.STAattributesToSelect.config && node.STAattributesToSelect.config.options && node.STAattributesToSelect.config.options.scales && node.STAattributesToSelect.config.options.scales.x && node.STAattributesToSelect.config.options.scales.x.time)
		unitValue = node.STAattributesToSelect.config.options.scales.x.time.unit || "minute";	
	var selectInterval = document.getElementById("DialogScatterPlotAxisXSelectInterval");
	var s ="";
	for (var i = 0; i < options.length; i++) {
			
			s+= "<option value="+options[i][0];

			if (options[i][0] === unitValue) {
				s+=" selected";
			} 
			s+= ">"+options[i][1]+ "</option>"
			
	}
	selectInterval.innerHTML=s;

	if (node.STAattributesToSelect.config && node.STAattributesToSelect.config.options && node.STAattributesToSelect.config.options.scales){
		var scatterCfg = node.STAattributesToSelect.config.options;
		document.getElementById("DialogScatterPlotAxisTitle").value = (scatterCfg.plugins && scatterCfg.plugins.title && scatterCfg.plugins.title.text) ? scatterCfg.plugins.title.text : "";
		document.getElementById("DialogScatterPlotAxisXLabel").value = (scatterCfg.scales.x && scatterCfg.scales.x.title && scatterCfg.scales.x.title.text) ? scatterCfg.scales.x.title.text : "";
		document.getElementById("DialogScatterPlotAxisYLabelLeft").value = (scatterCfg.scales.yAxisleft && scatterCfg.scales.yAxisleft.title) ? (scatterCfg.scales.yAxisleft.title.text || "") : "";
		document.getElementById("DialogScatterPlotAxisYLabelRight").value = (scatterCfg.scales.yAxisright && scatterCfg.scales.yAxisright.title) ? (scatterCfg.scales.yAxisright.title.text || "") : "";
	}else{
		document.getElementById("DialogScatterPlotAxisTitle").value="";
		document.getElementById("DialogScatterPlotAxisXLabel").value="";
		document.getElementById("DialogScatterPlotAxisYLabelLeft").value="";
		document.getElementById("DialogScatterPlotAxisYLabelRight").value="";
	
	}
		
	if (noData) {
		document.getElementById("DialogScatterPlotTitle").innerHTML = DonaCadena({cat: "No hi ha dades per mostrar.", spa: "No hay datos que mostrar.", eng: "No data to show."});
		document.getElementById("DialogScatterPlotDiv").innerHTML = "";
		clearScatterPlotChart();
		showEmptyScatterPlotChart();
		return;
	}

	document.getElementById("DialogScatterPlotTitle").innerHTML = DonaCadena({cat: "Gràfic de dispersió", spa: "Gráfico de dispersión", eng: "Scatter plot"});
	ensureScatterPlotStyleState(node.STAattributesToSelect);
	syncScatterPlotStyleControls(node.STAattributesToSelect);
	document.getElementById("DialogScatterPlotBeginZero").checked = !!node.STAattributesToSelect.beginAtZero;
	if (document.getElementById("DialogScatterPlotSpanGaps"))
		document.getElementById("DialogScatterPlotSpanGaps").checked = !!node.STAattributesToSelect.spanGaps;
	if (document.getElementById("DialogScatterPlotInterpolation"))
		document.getElementById("DialogScatterPlotInterpolation").value = normalizeScatterLineInterpolation(node.STAattributesToSelect.lineInterpolation);
	createDialogWithSelectWithGroupsScatterPlot(node);
	clearScatterPlotChart();
	showEmptyScatterPlotChart();
	if (node.STAattributesToSelect.drawn)
		UpdateScatterPlot();
}

function createDialogWithSelectWithGroupsScatterPlot(node) {
	var scatterPlotDiv = document.getElementById("DialogScatterPlotDiv");
	var dialogGroups, parentInfo, cdns, i, parentId, info, attr, numeric, c, col, checked, selectedCols, nodeLabel, legend, g, axisSide;
	if (!scatterPlotDiv)
		return;
	dialogGroups = node.STAattributesToSelect.dataGroupsSelectedToScatterPlot || [];
	parentInfo = node.STAattributesToSelect.parentNodesInformation || {};
	cdns = "";
	for (i = 0; i < dialogGroups.length; i++) {
		g = dialogGroups[i];
		parentId = g.nodeSelected;
		info = parentInfo[parentId] || { attr: [], numericAttr: [], nodeLabel: parentId };
		attr = info.attr || [];
		numeric = (info.numericAttr || []).slice();
		nodeLabel = info.nodeLabel || parentId;
		legend = g.legendText || nodeLabel;
		g.legendText = legend;
		if (!g.valueColumns || !g.valueColumns.length)
			g.valueColumns = g.Y && g.Y != g.X ? [g.Y] : [];
		ensureScatterPlotColumnAxes(g);
		selectedCols = g.valueColumns;
		cdns += '<fieldset><legend>' + scatterPlotEscapeAttr(nodeLabel) + "</legend>";
		cdns += '<div class="DialogScatterPlotSeriesRow"><label>' + DonaCadena({cat: "Nom a la llegenda:", spa: "Nombre en la leyenda:", eng: "Legend name:"}) +
			' <input type="text" value="' + scatterPlotEscapeAttr(legend) +
			'" onchange="updateScatterPlotSeriesField(' + i + ',\'legendText\',this.value,\'' + node.id + '\')"></label></div>';
		cdns += '<div class="DialogScatterPlotSeriesRow"><label>' + DonaCadena({cat: "Eix X:", spa: "Eje X:", eng: "Axis X:"}) +
			' <select onchange="updateScatterPlotSeriesField(' + i + ',\'X\',this.value,\'' + node.id + '\')">';
		for (c = 0; c < attr.length; c++) {
			col = attr[c];
			cdns += '<option value="' + scatterPlotEscapeAttr(col) + '"' + (col == g.X ? " selected" : "") + ">" + scatterPlotEscapeAttr(col) + "</option>";
		}
		cdns += "</select></label></div>";
		cdns += '<div class="DialogScatterPlotSeriesRow"><span>' + DonaCadena({cat: "Eix Y (columnes):", spa: "Eje Y (columnas):", eng: "Axis Y (columns):"}) + "</span>";
		cdns += '<div class="DialogScatterPlotValueColumns">';
		numeric = numeric.filter(function (name) { return name != g.X; });
		if (!numeric.length)
			cdns += "<em>" + DonaCadena({cat: "No s'han trobat columnes numèriques.", spa: "No se han encontrado columnas numéricas.", eng: "No numeric columns found."}) + "</em>";
		for (c = 0; c < numeric.length; c++) {
			col = numeric[c];
			checked = selectedCols.indexOf(col) != -1 ? " checked" : "";
			axisSide = scatterPlotColumnAxis(g, col);
			cdns += '<div class="DialogScatterPlotValueRow">';
			cdns += '<label><input type="checkbox" class="DialogScatterPlotValueCb" data-series="' + i + '" value="' +
				scatterPlotEscapeAttr(col) + '"' + checked +
				' onchange="onScatterPlotValueColumnsChange(' + i + ',\'' + node.id + '\')"> ' +
				scatterPlotEscapeAttr(col) + "</label>";
			cdns += '<select class="DialogScatterPlotColumnAxis" onchange="onScatterPlotColumnAxisChange(' + i + ',\'' +
				scatterPlotEscapeJs(col) + '\',this.value,\'' + node.id + '\')">';
			cdns += '<option value="left"' + (axisSide != "right" ? " selected" : "") + ">" +
				DonaCadena({cat: "Esquerra", spa: "Izquierda", eng: "Left"}) + "</option>";
			cdns += '<option value="right"' + (axisSide == "right" ? " selected" : "") + ">" +
				DonaCadena({cat: "Dreta", spa: "Derecha", eng: "Right"}) + "</option>";
			cdns += "</select></div>";
		}
		cdns += "</div></div>";
		cdns += '<div class="DialogScatterPlotSeriesRow"><label><input type="checkbox"' + (g.regressionLine ? " checked" : "") +
			' onchange="updateScatterPlotSeriesField(' + i + ',\'regressionLine\',this.checked,\'' + node.id + '\')"> ' +
			DonaCadena({cat: "Mostra la recta de regressió", spa: "Mostrar la recta de regresión", eng: "Show regression line"}) + "</label></div>";
		cdns += "</fieldset>";
	}
	scatterPlotDiv.innerHTML = cdns;
}

function onScatterPlotValueColumnsChange(idx, nodeId) {
	var current = networkNodes.get(nodeId), boxes, selected = [], i;
	if (!current || !current.STAattributesToSelect || !current.STAattributesToSelect.dataGroupsSelectedToScatterPlot[idx])
		return;
	boxes = document.querySelectorAll('.DialogScatterPlotValueCb[data-series="' + idx + '"]');
	for (i = 0; i < boxes.length; i++) {
		if (boxes[i].checked)
			selected.push(boxes[i].value);
	}
	current.STAattributesToSelect.dataGroupsSelectedToScatterPlot[idx].valueColumns = selected;
	networkNodes.update(current);
}

function onScatterPlotColumnAxisChange(idx, col, value, nodeId) {
	var current = networkNodes.get(nodeId), g;
	if (!current || !current.STAattributesToSelect || !current.STAattributesToSelect.dataGroupsSelectedToScatterPlot[idx])
		return;
	g = current.STAattributesToSelect.dataGroupsSelectedToScatterPlot[idx];
	ensureScatterPlotColumnAxes(g);
	g.columnAxes[col] = (value == "right") ? "right" : "left";
	networkNodes.update(current);
}

function updateScatterPlotSeriesField(idx, key, value, nodeId) {
	var current = networkNodes.get(nodeId), g, prev, info, numeric, cols, n;
	if (!current || !current.STAattributesToSelect || !current.STAattributesToSelect.dataGroupsSelectedToScatterPlot[idx])
		return;
	g = current.STAattributesToSelect.dataGroupsSelectedToScatterPlot[idx];
	prev = g[key];
	if (key == "legendText")
		value = ("" + value).trim();
	g[key] = value;
	if (key == "X" && prev != value) {
		info = current.STAattributesToSelect.parentNodesInformation || {};
		numeric = (info[g.nodeSelected] && info[g.nodeSelected].numericAttr) ? info[g.nodeSelected].numericAttr : [];
		cols = (g.valueColumns || []).slice();
		n = cols.indexOf(value);
		if (n != -1)
			cols.splice(n, 1);
		if (numeric.indexOf(prev) != -1 && cols.indexOf(prev) == -1)
			cols.push(prev);
		g.valueColumns = cols;
		networkNodes.update(current);
		createDialogWithSelectWithGroupsScatterPlot(current);
		return;
	}
	networkNodes.update(current);
}

function drawScatterPlot(node){
	var canvas = document.getElementById("DialogScatterPlotVisualization");
	var chart = canvas && Chart.getChart ? Chart.getChart(canvas) : null;
	if (ScatterPlotChart) {
		ScatterPlotChart.destroy();
		ScatterPlotChart = null;
	} else if (chart)
		chart.destroy();
	ScatterPlotChart = new Chart(canvas, node.STAattributesToSelect.config);
}

function ShowImageViewerDialog(node, parentNodes) {
	var data = parentNodes[0].STAdata;
	if (!data || !data.length) {
		document.getElementById("DialogImageViewerTitle").innerHTML = DonaCadena({cat: "No hi ha dades per mostrar.", spa: "No hay datos que mostrar.", eng: "No data to show."});
		return;
	}
	saveNodeDialog("DialogImageViewer", node);

	document.getElementById("DialogImageViewerTitle").innerHTML = DonaCadena({cat: "Visor d'imatges", spa: "Visor de imÃ¡genes", eng: "Image viewer"});

	var dataAttributes = parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(data);
	PopulateSelectSaveLayerDialog("DialogImageViewerURL", dataAttributes, "imageURL");
	PopulateSelectSaveLayerDialog("DialogImageViewerLabel", dataAttributes, "name");
}

function AdaptValueAxisY(value) {
	return '' + value.toPrecision(5);
}


function UpdateScatterPlot(event) {
	if (event)
		event.preventDefault(); // We don't want to submit this form
	var node = getNodeDialog("DialogScatterPlot");
	if (!node)
		return;
	var parentNodes = GetParentNodes(node);
	if (parentNodes && parentNodes.length) {
		node.STAattributesToSelect.parentNodesInformation = collectScatterPlotParentInfo(parentNodes);
		syncScatterPlotSeriesWithParents(node);
	}
	var dataGroups = node.STAattributesToSelect.dataGroupsSelectedToScatterPlot || [];
	var nodeId, parentNode, parentAttrs, nodeData, record, items, minx, maxx, minyRight, maxyRight, minyLeft, maxyLeft, leftOrRight, dataRecord, yVal;
	var yAxisTodisplay={left:false, right:false}, axisXType="", currentAttributeType, label, type, pointRadius, seriesStyle;
	var data = {datasets:[]};
	var legendKeys = [], legendLabels = [], legendColors = [], seriesKey, seriesColor, regKey, titleFontSize, labelFontSize, axisLabelFontSize;
	var e, yc, i, cols, yCol, axisXName, colorIndex = 0, baseLegend, parentInfo, seriesStyleFallbacks = {};
	ensureScatterPlotStyleState(node.STAattributesToSelect);
	titleFontSize = parseInt(document.getElementById("DialogScatterPlotTitleSize").value, 10) || node.STAattributesToSelect.titleFontSize || 16;
	labelFontSize = parseInt(document.getElementById("DialogScatterPlotLabelSize").value, 10) || node.STAattributesToSelect.labelFontSize || 12;
	node.STAattributesToSelect.titleFontSize = titleFontSize;
	node.STAattributesToSelect.labelFontSize = labelFontSize;
	node.STAattributesToSelect.legendFontSize = clampChartFontSize(document.getElementById("DialogScatterPlotLegendSize") ? document.getElementById("DialogScatterPlotLegendSize").value : node.STAattributesToSelect.legendFontSize, 8, 28, 12);
	axisLabelFontSize = clampChartFontSize(document.getElementById("DialogScatterPlotAxisLabelSize") ? document.getElementById("DialogScatterPlotAxisLabelSize").value : node.STAattributesToSelect.axisLabelFontSize, 8, 28, 12);
	node.STAattributesToSelect.axisLabelFontSize = axisLabelFontSize;
	node.STAattributesToSelect.lineInterpolation = getScatterLineInterpolation();
	node.STAattributesToSelect.pointRadius = getScatterPointRadius();
	node.STAattributesToSelect.spanGaps = !!(document.getElementById("DialogScatterPlotSpanGaps") && document.getElementById("DialogScatterPlotSpanGaps").checked);
	parentInfo = node.STAattributesToSelect.parentNodesInformation || {};

	//x axis in sorted?
	var sortXaxis=(document.getElementById("DialogScatterPlotAxisXSort").checked)?true:false;
	if (sortXaxis){
		node.STAattributesToSelect.sorted= true;
		document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display = "none";
	}else{
		node.STAattributesToSelect.sorted= false;
		document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display = "inline-block";
	}

	var seriesList = [];
	for (e = 0; e < dataGroups.length; e++) {
		parentNode = networkNodes.get(dataGroups[e].nodeSelected);
		if (!parentNode || !parentNode.STAdata || !dataGroups[e].X)
			continue;
		cols = (dataGroups[e].valueColumns || []).slice();
		if (!cols.length && dataGroups[e].Y && dataGroups[e].Y != dataGroups[e].X)
			cols = [dataGroups[e].Y];
		cols = cols.filter(function (name) { return name && name != dataGroups[e].X; });
		if (!cols.length)
			continue;
		seriesList.push({ group: dataGroups[e], cols: cols, parentNode: parentNode });
	}
	if (!seriesList.length) {
		if (event)
			alert(DonaCadena({cat: "Seleccioneu eix X i almenys una columna Y.", spa: "Seleccione eje X y al menos una columna Y.", eng: "Select an X axis and at least one Y column."}));
		return;
	}
	
	for (e = 0; e < seriesList.length; e++) {
		nodeId = seriesList[e].group.nodeSelected;
		axisXName = seriesList[e].group.X;
		parentNode = seriesList[e].parentNode;
		parentAttrs = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata);
		currentAttributeType = parentAttrs[axisXName] ? parentAttrs[axisXName].type : "number";
		if (currentAttributeType=="integer")
			currentAttributeType="number"; //coded as sameAxis

		if (e==0)
			axisXType=currentAttributeType;
		else if (axisXType!=currentAttributeType){ //avoid different types of X axis
			alert(DonaCadena({cat: "Totes les Sèries de l'eix X han de contenir el mateix tipus de dades", spa: "Todas las series del eje X deben contener el mismo tipo de datos", eng: "All series in X axis has to have same type of data"}));
			return;
		}
		nodeData = (sortXaxis) ? SortTableByColumns (deapCopy(parentNode.STAdata),[axisXName], "asc"): parentNode.STAdata;
		baseLegend = (seriesList[e].group.legendText || "").trim() ||
			((parentInfo[nodeId] && parentInfo[nodeId].nodeLabel) || nodeId);
		cols = seriesList[e].cols;
		for (yc = 0; yc < cols.length; yc++) {
			yCol = cols[yc];
			seriesKey = "s" + nodeId + "_" + yCol;
			seriesStyleFallbacks[seriesKey] = seriesList[e].group.graphicType || "line";
			seriesStyle = getScatterSeriesStyle(node.STAattributesToSelect, seriesKey, seriesList[e].group.graphicType);
			node.STAattributesToSelect.seriesStyles[seriesKey] = seriesStyle;
			type = isScatterSeriesLineStyle(seriesStyle) ? "line" : "scatter";
			pointRadius = (type == "line") ? 0 : clampScatterPointRadius(node.STAattributesToSelect.pointRadius);
			leftOrRight = scatterPlotColumnAxis(seriesList[e].group, yCol);
			items = [];
			for (i = 0; i < nodeData.length; i++) {
				record = nodeData[i];
				dataRecord = (axisXType=="isodatetime") ? moment( new Date(record[axisXName])).format() : record[axisXName];
				yVal = record[yCol];
				if (yVal === "" || yVal === undefined || yVal === null || (typeof yVal == "number" && isNaN(yVal)))
					yVal = null;

				if (dataRecord !== "" && dataRecord !== undefined && dataRecord !== null && !(typeof dataRecord == "number" && isNaN(dataRecord))) {
					if (minx === undefined || minx > dataRecord)
						minx = dataRecord;
					if (maxx === undefined || maxx < dataRecord)
						maxx = dataRecord;
				}
				if (yVal !== null) {
					if (leftOrRight == "left") {
						if (minyLeft === undefined || minyLeft > yVal)
							minyLeft = yVal;
						if (maxyLeft === undefined || maxyLeft < yVal)
							maxyLeft = yVal;
					} else {
						if (minyRight === undefined || minyRight > yVal)
							minyRight = yVal;
						if (maxyRight === undefined || maxyRight < yVal)
							maxyRight = yVal;
					}
				}
				items.push({ x: dataRecord, y: yVal, group: colorIndex });
			}
			label = (cols.length == 1) ? baseLegend : (baseLegend + " / " + yCol);
			seriesColor = node.STAattributesToSelect.seriesColors[seriesKey] || ColorsForBarPlot[colorIndex % ColorsForBarPlot.length];
			node.STAattributesToSelect.seriesColors[seriesKey] = seriesColor;
			legendKeys.push(seriesKey);
			legendLabels.push(label);
			legendColors.push(seriesColor);

			data.datasets.push(
				{
					label: label,
					backgroundColor: seriesColor,
					borderColor: (seriesStyle == "lineGradient") ? scatterPlotLineGradientBorderColor : seriesColor,
					fill: false,
					data: items,
					yAxisID: "yAxis" + leftOrRight,
					pointRadius: pointRadius,
					pointHoverRadius: pointRadius ? (pointRadius + 2) : 0,
					pointStyle: (type == "line") ? "circle" : seriesStyle,
					borderDash: (seriesStyle == "lineDash") ? [6, 4] : [],
					spanGaps: (type == "line") ? !!node.STAattributesToSelect.spanGaps : false,
					type: type,
					hidden: node.STAattributesToSelect.hiddenSeries.indexOf(seriesKey) != -1
				}
			);
			if (type == "line")
				applyScatterLineInterpolation(data.datasets[data.datasets.length - 1], node.STAattributesToSelect.lineInterpolation);
			yAxisTodisplay[leftOrRight]=true;

			if (seriesList[e].group.regressionLine && items.length>1)
			{
				var itemsReg=[], itemsValid=[], vi, isDateX=(axisXType=="isodatetime"), linReg, xNum, xMinN, xMaxN, iMin=0, iMax=0, yReg0, yReg1;
				for (vi = 0; vi < items.length; vi++) {
					if (items[vi].y !== null && items[vi].y !== undefined && !(typeof items[vi].y == "number" && isNaN(items[vi].y)) &&
						items[vi].x !== null && items[vi].x !== undefined && items[vi].x !== "")
						itemsValid.push(items[vi]);
				}
				if (itemsValid.length > 1) {
					var regInput = [];
					for (vi = 0; vi < itemsValid.length; vi++) {
						xNum = isDateX ? new Date(itemsValid[vi].x).getTime() : Number(itemsValid[vi].x);
						if (isNaN(xNum) || !isFinite(xNum) || isNaN(Number(itemsValid[vi].y)))
							continue;
						regInput.push({ x: isDateX ? itemsValid[vi].x : xNum, y: Number(itemsValid[vi].y), _i: vi, _xn: xNum });
					}
					if (regInput.length > 1) {
					linReg = linearRegressionFunc(regInput, isDateX);
					xMinN = xMaxN = regInput[0]._xn;
					iMin = iMax = 0;
					for (vi = 1; vi < regInput.length; vi++) {
						xNum = regInput[vi]._xn;
						if (xNum < xMinN) { xMinN = xNum; iMin = vi; }
						if (xNum > xMaxN) { xMaxN = xNum; iMax = vi; }
					}
					yReg0 = linReg.a * xMinN + linReg.b;
					yReg1 = linReg.a * xMaxN + linReg.b;
					if (!isNaN(yReg0) && !isNaN(yReg1) && isFinite(yReg0) && isFinite(yReg1)) {
						regKey = "r" + nodeId + "_" + yCol;
						itemsReg.push({ x: itemsValid[regInput[iMin]._i].x, y: yReg0, group: colorIndex });
						itemsReg.push({ x: itemsValid[regInput[iMax]._i].x, y: yReg1, group: colorIndex });
						if (leftOrRight == "left") {
							if (minyLeft === undefined || minyLeft > yReg0) minyLeft = yReg0;
							if (minyLeft > yReg1) minyLeft = yReg1;
							if (maxyLeft === undefined || maxyLeft < yReg0) maxyLeft = yReg0;
							if (maxyLeft < yReg1) maxyLeft = yReg1;
						} else {
							if (minyRight === undefined || minyRight > yReg0) minyRight = yReg0;
							if (minyRight > yReg1) minyRight = yReg1;
							if (maxyRight === undefined || maxyRight < yReg0) maxyRight = yReg0;
							if (maxyRight < yReg1) maxyRight = yReg1;
						}
						var regColor = node.STAattributesToSelect.seriesColors[regKey] || seriesColor;
						node.STAattributesToSelect.seriesColors[regKey] = regColor;
						legendKeys.push(regKey);
						legendLabels.push(label + " r=" + linReg.r.toFixed(5));
						legendColors.push(regColor);
						data.datasets.push(
							{
								label: label+" r="+linReg.r.toFixed(5),
								backgroundColor: regColor,
								borderColor: regColor,
								fill: false,
								data: itemsReg,
								yAxisID: "yAxis" + leftOrRight,
								pointRadius: 0,
								pointHoverRadius: 0,
								showLine: true,
								borderWidth: 2,
								spanGaps: false,
								type: "line",
								hidden: node.STAattributesToSelect.hiddenSeries.indexOf(regKey) != -1
							}
						);
					}
					}
				}
			}
			colorIndex++;
		}
	}
	//Y axis
	var finalMinYLeft = minyLeft - (maxyLeft - minyLeft) * 0.025;
	var finalMinYRight = minyRight - (maxyRight - minyRight) * 0.025;
	var finalMaxYLeft = maxyLeft + (maxyLeft - minyLeft) * 0.025;
	var finalMaxYRight = maxyRight + (maxyRight - minyRight) * 0.025;
	if (finalMinYLeft==finalMaxYLeft){
		finalMinYLeft++;
		finalMaxYLeft--;
	}
	if (finalMinYRight==finalMaxYRight){
		finalMinYRight++;
		finalMaxYRight--;
	}
	var beginAtZero = !!(document.getElementById("DialogScatterPlotBeginZero") && document.getElementById("DialogScatterPlotBeginZero").checked);
	node.STAattributesToSelect.beginAtZero = beginAtZero;
	if (beginAtZero) {
		if (finalMinYLeft > 0) finalMinYLeft = 0;
		if (finalMaxYLeft < 0) finalMaxYLeft = 0;
		if (finalMinYRight > 0) finalMinYRight = 0;
		if (finalMaxYRight < 0) finalMaxYRight = 0;
	}
	
	//X axis
	if (minx==maxx){
		if ((axisXType=="isodatetime")){
			maxx=new Date(maxx);
			minx= new Date(minx);
			maxx.setDate(maxx.getDate() + 1);
			minx.setDate(minx.getDate() - 1);
		}else{
			maxx++;
			minx--;
		}
	}
	var executable=true;
	
	if (axisXType=="isodatetime") {
		var selectAxisX=document.getElementById("DialogScatterPlotAxisXSelectInterval");
		var unit=(selectAxisX && selectAxisX.value) ? selectAxisX.value : "minute"; //second, minute, hour, day ...
		var date1= new Date(minx).getTime();
		var date2 =new Date(maxx).getTime();
		var milisecondsDifference= date2-date1;
		
		switch(unit){
			case "second": 
				if (milisecondsDifference/1000 > 1e5) executable= false;
				break;
			case "minute": 
				if (milisecondsDifference/(1000*60) > 1e5) executable= false;
				break;
			case "hour": 
				if (milisecondsDifference/(1000*60*60) > 1e5) executable= false;
				break;
			case "day": 
				if (milisecondsDifference/(1000*60*60*24) > 1e5) executable= false;
				break;
			case "week": 
			if (milisecondsDifference/ (1000 * 60 * 60 * 24 * 7) > 1e5) executable= false;
				break;
			case "month": 
			if (milisecondsDifference/(1000 * 60 * 60 * 24 * 30.44) > 1e5) executable= false;
				break;
			case "year": 
			if (milisecondsDifference/(1000 * 60 * 60 * 24 * 365.25) > 1e5) executable= false;
				break;
		}

	}

	if (!executable) {
		alert(DonaCadena({cat: "L'interval de les dades seleccionades és massa llarg per aplicar-lo al grÃ fic. Filtreu l'interval per fer-lo més curt o trieu un interval més gran per a l'eix X", spa: "El intervalo de los datos seleccionados es demasiado largo para aplicarlo al grÃ¡fico. Filtre el intervalo para acortarlo o elija un intervalo mayor para el eje X", eng: "The interval of the data selected is too long to apply to the graphic. Filter interval to make it shorter or choose a bigger interval to X axis"}));
		return;
	}

	var axisYLabelRight = document.getElementById("DialogScatterPlotAxisYLabelRight").value;
	var axisYLabelLeft = document.getElementById("DialogScatterPlotAxisYLabelLeft").value;
		
	var axisX;
	if (axisXType=="isodatetime"){
		axisX={
			type: "time",
			time: {
				unit: unit,  //change the interval
				tooltipFormat: 'yyyy-MM-dd HH:mm:ss',  
				displayFormats: {
					second: 'yyyy-MM-dd HH:mm:ss', 
					minute: 'yyyy-MM-dd HH:mm:ss',  
					hour: 'yyyy-MM-dd HH:mm',
					day: 'yyyy-MM-dd',
					week: 'yyyy-MM-dd',
					month: 'yyyy-MM-dd',
					year: 'yyyy-MM-dd'
				}
			},
			title: {
				text: document.getElementById("DialogScatterPlotAxisXLabel").value,
				display: (document.getElementById("DialogScatterPlotAxisXLabel").value != "") ? true : false,
				font: { size: axisLabelFontSize }
			},
			min: minx,
			max:maxx
		}
	}
	else{
		axisX={type: "linear",
				title: {
				text: document.getElementById("DialogScatterPlotAxisXLabel").value,
				display: (document.getElementById("DialogScatterPlotAxisXLabel").value != "") ? true : false,
				font: { size: axisLabelFontSize }
			},
			min: minx,
			max:maxx
		}
	}
		
		
	var config = {
		//type: type, //general diagram. If it have different types it is specified in the datasets
		data: data,
		options: {
			maintainAspectRatio: false,
			resizeDelay: 100,
			plugins: {
				legend: { display: false },
				labels: { render: function () { return ""; } },
				title: {
					text: document.getElementById("DialogScatterPlotAxisTitle").value,
					display: (document.getElementById("DialogScatterPlotAxisTitle").value != "") ? true : false,
					font: { size: titleFontSize }
					},
				zoom: {
					pan: {
						enabled: true,
						mode: 'x',
					},
					zoom: {
						wheel: {
						enabled: true,
						},
						pinch: {
						enabled: true,
						},
						mode: 'x',
					}
				}
			},
			scales: {
				x:axisX
			// 	//  ticks: { //!!!!!!! 
			// 	// 	maxTicksLimit: 30,
			// 	//  	autoSkip: true
				
			}
		}
	};
	if (yAxisTodisplay.right){
		config.options.scales.yAxisright= {
			type: 'linear', //Axys type
			position: 'right',
			title: {
				display: (axisYLabelRight!="")?true:false,
				text: axisYLabelRight,
				font: { size: axisLabelFontSize }
			},
			grid: { //To display lines from left axis only
				drawOnChartArea: false
			},
			max:finalMaxYRight,
			min:finalMinYRight
		} 
	}
	if (yAxisTodisplay.left) {
		config.options.scales.yAxisleft={
			type: 'linear',
			position: 'left',
			title: {
				display: (axisYLabelLeft!="")?true:false,
				text: axisYLabelLeft,
				font: { size: axisLabelFontSize }
			},
			max:finalMaxYLeft,
			min:finalMinYLeft,
			// ticks: {
			// 	maxTicksLimit: 30 // 
			//   }
		}
	}
	axisX.ticks = { font: { size: labelFontSize } };
	if (config.options.scales.yAxisleft)
		config.options.scales.yAxisleft.ticks = { font: { size: labelFontSize } };
	if (config.options.scales.yAxisright)
		config.options.scales.yAxisright.ticks = { font: { size: labelFontSize } };
	node.STAattributesToSelect.config=config;
	node.STAattributesToSelect.drawn = true;
	networkNodes.update(node);
	drawScatterPlot(node);
	buildScatterPlotLegendHtml(getNodeDialog("DialogScatterPlot") || node, legendKeys, legendLabels, legendColors, seriesStyleFallbacks);
}
	
function CloseDialogScatterPlot(event) {
	hideNodeDialog("DialogScatterPlot", event);
}

function SaveScatterPlot(event) {
	var canvas, useWhite, legend, gap = 24, legendWidth, minLegendWidth = 260, maxTextWidth = 320, rowH, lineH, padTop = 12, padBottom = 12, swatch = 14, textPad = 8, margin, out, ctx, i, y, x0, n, chartW, chartH, contentH, legendBlockH, legendOffsetY, chartY, tw, legendSize, scatterNode, items, item, li, labelX, maxLabelW, lines;
	if (event) event.preventDefault();
	canvas = ScatterPlotChart && ScatterPlotChart.canvas ? ScatterPlotChart.canvas : document.getElementById("DialogScatterPlotVisualization");
	if (!ScatterPlotChart || !canvas || !(getNodeDialog("DialogScatterPlot") && getNodeDialog("DialogScatterPlot").STAattributesToSelect && getNodeDialog("DialogScatterPlot").STAattributesToSelect.drawn)) {
		alert(DonaCadena({cat: "Dibuixeu primer el gràfic.", spa: "Dibuje primero el gráfico.", eng: "Draw the chart first."}));
		return;
	}
	useWhite = confirm(DonaCadena({
		cat: "Voleu fons blanc al PNG?\n\nD'acord = fons blanc\nCancel·la = fons transparent",
		spa: "¿Quiere fondo blanco en el PNG?\n\nAceptar = fondo blanco\nCancelar = fondo transparente",
		eng: "White background for the PNG?\n\nOK = white background\nCancel = transparent background"
	}));
	scatterNode = getNodeDialog("DialogScatterPlot");
	legendSize = (scatterNode && scatterNode.STAattributesToSelect && scatterNode.STAattributesToSelect.legendFontSize) ? scatterNode.STAattributesToSelect.legendFontSize : 12;
	rowH = chartLegendRowHeight(legendSize);
	lineH = Math.max(legendSize + 4, Math.round(rowH * 0.85));
	legend = ScatterPlotLastLegend;
	n = legend && legend.labels ? legend.labels.length : 0;
	margin = useWhite ? 24 : 0;
	chartW = canvas.width;
	chartH = canvas.height;

	out = document.createElement("canvas");
	ctx = out.getContext("2d");
	ctx.font = legendSize + "px sans-serif";
	items = [];
	maxLabelW = 0;
	legendBlockH = padTop + padBottom;
	for (i = 0; i < n; i++) {
		lines = wrapChartLegendLabel(ctx, legend.labels[i], maxTextWidth);
		for (li = 0; li < lines.length; li++) {
			tw = ctx.measureText(lines[li]).width;
			if (tw > maxLabelW)
				maxLabelW = tw;
		}
		item = {
			lines: lines,
			height: Math.max(rowH, lines.length * lineH),
			hidden: !!(legend.hidden && legend.hidden[i]),
			color: legend.colors[i] || "#888",
			gradient: !!(legend.styles && legend.styles[i] == "lineGradient")
		};
		items.push(item);
		legendBlockH += item.height;
	}
	if (!n)
		legendBlockH = padTop + rowH + padBottom;
	legendWidth = Math.max(minLegendWidth, Math.ceil(swatch + textPad + maxLabelW + 12));
	contentH = Math.max(chartH, legendBlockH);
	out.width = margin + chartW + gap + legendWidth + margin;
	out.height = margin + contentH + margin;
	ctx = out.getContext("2d");
	if (useWhite) {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, out.width, out.height);
	}
	chartY = margin + Math.max(0, (contentH - chartH) / 2);
	ctx.drawImage(canvas, margin, chartY);
	x0 = margin + chartW + gap;
	labelX = x0 + swatch + textPad;
	legendOffsetY = margin + Math.max(0, (contentH - legendBlockH) / 2);
	ctx.font = legendSize + "px sans-serif";
	ctx.textBaseline = "middle";
	y = legendOffsetY + padTop;
	for (i = 0; i < items.length; i++) {
		item = items[i];
		ctx.globalAlpha = item.hidden ? 0.4 : 1;
		if (item.gradient)
			ctx.fillStyle = fillScatterPlotLineGradient(ctx, x0, 0, x0 + swatch, 0);
		else
			ctx.fillStyle = item.color;
		ctx.fillRect(x0, y + item.height / 2 - swatch / 2, swatch, swatch);
		ctx.strokeStyle = "#666";
		ctx.strokeRect(x0 + 0.5, y + item.height / 2 - swatch / 2 + 0.5, swatch - 1, swatch - 1);
		ctx.fillStyle = "#222";
		for (li = 0; li < item.lines.length; li++) {
			var lineY = y + (item.height - item.lines.length * lineH) / 2 + (li + 0.5) * lineH;
			ctx.fillText(item.lines[li], labelX, lineY);
			if (item.hidden) {
				tw = ctx.measureText(item.lines[li]).width;
				ctx.beginPath();
				ctx.moveTo(labelX, lineY);
				ctx.lineTo(labelX + tw, lineY);
				ctx.strokeStyle = "#222";
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
		y += item.height;
	}
	function onBlob(blob) {
		if (!blob) {
			alert(DonaCadena({cat: "No s'ha pogut desar la imatge.", spa: "No se ha podido guardar la imagen.", eng: "Could not save the image."}));
			return;
		}
		if (window.showSaveFilePicker) {
			window.showSaveFilePicker({ suggestedName: "scatter-plot.png", types: [{ description: "PNG", accept: { "image/png": [".png"] } }] })
				.then(function (h) { return h.createWritable(); })
				.then(function (w) { return w.write(blob).then(function () { return w.close(); }); })
				.catch(function () {
					var a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = "scatter-plot.png";
					a.click();
				});
		} else {
			var a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = "scatter-plot.png";
			a.click();
		}
	}
	if (out.toBlob)
		out.toBlob(onBlob, "image/png");
	else
		onBlob(radarPlotPngBlobFromDataUrl(out.toDataURL("image/png")));
}

const ColorsForBarPlot = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];

function hexColorWithAlpha(hex, alpha) {
	var c = (hex || "#1f77b4").replace("#", "");
	if (c.length === 3)
		c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
	var r = parseInt(c.substring(0, 2), 16);
	var g = parseInt(c.substring(2, 4), 16);
	var b = parseInt(c.substring(4, 6), 16);
	if (isNaN(r) || isNaN(g) || isNaN(b))
		return "rgba(31,119,180," + alpha + ")";
	return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function getNumericAttributeNames(dataAttributes) {
	var names = [], keys = Object.keys(dataAttributes);
	for (var i = 0; i < keys.length; i++) {
		var t = dataAttributes[keys[i]].type;
		if (t == "number" || t == "integer")
			names.push(keys[i]);
	}
	return names;
}

function getNonNumericAttributeNames(dataAttributes) {
	var names = [], keys = Object.keys(dataAttributes);
	for (var i = 0; i < keys.length; i++) {
		var t = dataAttributes[keys[i]].type;
		if (t != "number" && t != "integer")
			names.push(keys[i]);
	}
	return names;
}

function guessRadarSeriesLabel(dataAttributes) {
	var names = getNonNumericAttributeNames(dataAttributes);
	if (!names.length)
		return "";
	var preferred = ["name", "nom", "label", "item"];
	var i, p, lower;
	for (p = 0; p < preferred.length; p++) {
		for (i = 0; i < names.length; i++) {
			if (names[i].toLowerCase() === preferred[p])
				return names[i];
		}
	}
	for (p = 0; p < preferred.length; p++) {
		for (i = 0; i < names.length; i++) {
			lower = names[i].toLowerCase();
			if (lower.indexOf(preferred[p]) != -1)
				return names[i];
		}
	}
	return names[0];
}

function syncRadarSeriesLegendsToLayout(node, layout) {
	var groups = node.radarPlotOptions && node.radarPlotOptions.seriesGroups, i, group;
	if (!groups)
		return;
	for (i = 0; i < groups.length; i++) {
		group = groups[i];
		if (layout == "long") {
			if (!group.legendText || group.legendText == group.item)
				group.legendText = group.valueColumn || group.legendText;
		} else if (!group.legendText || group.legendText == group.valueColumn)
			group.legendText = group.item || group.legendText;
	}
}

function applyRadarPlotLayoutDisplay() {
	var wide = document.getElementById("DialogRadarPlotLayoutWide").checked;
	document.getElementById("DialogRadarPlotWideFieldset").style.display = wide ? "" : "none";
	document.getElementById("DialogRadarPlotLongFieldset").style.display = wide ? "none" : "";
	applyRadarPlotTypeDisplay();
}

function isRadarPlotPolar() {
	var radio = document.getElementById("DialogRadarPlotTypePolar");
	return !!(radio && radio.checked);
}

function applyRadarPlotTypeDisplay() {
	var polar = isRadarPlotPolar();
	var wide = document.getElementById("DialogRadarPlotLayoutWide") && document.getElementById("DialogRadarPlotLayoutWide").checked;
	var seriesModeFs = document.getElementById("DialogRadarPlotSeriesModeFieldset");
	var fillLabel = document.getElementById("DialogRadarPlotFillLabel");
	var skipLabel = document.getElementById("DialogRadarPlotSkipLabel");
	var pointLabelRow = document.getElementById("DialogRadarPlotPointLabelSizeRow");
	var polarItemRow = document.getElementById("DialogRadarPlotPolarItemRow");
	var polarValueRow = document.getElementById("DialogRadarPlotPolarValueRow");
	var seriesLabelRow = document.getElementById("DialogRadarPlotSeriesLabelRow");
	var allNodeWrap = document.getElementById("DialogRadarPlotAllNodeWrap");
	var seriesAll = isRadarPlotSeriesModeAll();
	if (seriesModeFs)
		seriesModeFs.style.display = polar ? "none" : "";
	if (fillLabel)
		fillLabel.style.display = polar ? "none" : "";
	if (skipLabel)
		skipLabel.style.display = polar ? "none" : "";
	if (pointLabelRow)
		pointLabelRow.style.display = polar ? "none" : "";
	if (polarItemRow)
		polarItemRow.style.display = (polar && wide) ? "" : "none";
	if (polarValueRow)
		polarValueRow.style.display = (polar && !wide) ? "" : "none";
	if (seriesLabelRow) {
		if (polar)
			seriesLabelRow.style.display = wide ? "" : "none";
		else
			seriesLabelRow.style.display = (wide && seriesAll) ? "" : "none";
	}
	if (allNodeWrap)
		allNodeWrap.style.display = (polar || seriesAll) ? "" : "none";
}

function toggleRadarPlotType() {
	var node = getNodeDialog("DialogRadarPlot");
	applyRadarPlotTypeDisplay();
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	node.radarPlotOptions.plotType = isRadarPlotPolar() ? "polar" : "radar";
	networkNodes.update(node);
	if (isRadarPlotPolar()) {
		document.getElementById("DialogRadarPlotSeriesModeAll").checked = true;
		applyRadarPlotSeriesModeDisplay("all");
		populateRadarPolarItemSelect(node);
	} else if (!isRadarPlotSeriesModeAll())
		createDialogWithSelectWithGroupsRadarPlot(node);
	if (!RadarPlotChart)
		showEmptyRadarPlotChart();
}

function populateRadarPlotAllNodeSelect(parentInfo, selectedId) {
	var span = document.getElementById("DialogRadarPlotAllNode");
	var parentIds, cdns, i, id;
	if (!span)
		return;
	parentIds = Object.keys(parentInfo || {});
	if (!selectedId || !parentInfo[selectedId])
		selectedId = parentIds.length ? parentIds[0] : "";
	cdns = '<select id="DialogRadarPlotAllNodeSelect" onchange="onRadarPlotAllNodeChange()">';
	for (i = 0; i < parentIds.length; i++) {
		id = parentIds[i];
		cdns += '<option value="' + ("" + id).replace(/"/g, "&quot;") + '"' +
			(id == selectedId ? ' selected="selected"' : "") + ">" +
			("" + (parentInfo[id].nodeLabel || id)).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
			"</option>";
	}
	cdns += "</select>";
	span.innerHTML = cdns;
}

function getRadarPlotSelectedAllNodeId(node) {
	var select = document.getElementById("DialogRadarPlotAllNodeSelect");
	var parentInfo = node && node.radarPlotParentNodes ? node.radarPlotParentNodes : {};
	var ids = Object.keys(parentInfo);
	if (select && select.value && parentInfo[select.value])
		return select.value;
	if (node && node.radarPlotOptions && node.radarPlotOptions.nodeSelected && parentInfo[node.radarPlotOptions.nodeSelected])
		return node.radarPlotOptions.nodeSelected;
	return ids.length ? ids[0] : "";
}

function onRadarPlotAllNodeChange() {
	var node = getNodeDialog("DialogRadarPlot");
	var select = document.getElementById("DialogRadarPlotAllNodeSelect");
	var parentNode, dataAttributes, options;
	if (!node || !select)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	node.radarPlotOptions.nodeSelected = select.value;
	parentNode = networkNodes.get(select.value);
	if (!parentNode || !parentNode.STAdata)
		return;
	dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata);
	options = node.radarPlotOptions;
	PopulateSelectSaveLayerDialog("DialogRadarPlotSeriesLabel", dataAttributes, options.seriesLabel || guessRadarSeriesLabel(dataAttributes), "onRadarPlotSharedColumnChange()");
	PopulateSelectSaveLayerDialog("DialogRadarPlotAxisX", dataAttributes, options.axisX || guessRadarSeriesLabel(dataAttributes), "onRadarPlotSharedColumnChange()");
	populateRadarPlotAxesList(dataAttributes, options.axes);
	PopulateSelectSaveLayerDialog("DialogRadarPlotPolarValue", dataAttributes, options.polarValueColumn || (getNumericAttributeNames(dataAttributes)[0] || ""), "onRadarPlotSharedColumnChange()");
	populateRadarPolarItemSelect(node);
	networkNodes.update(node);
}

function populateRadarPolarItemSelect(node) {
	var select = document.getElementById("DialogRadarPlotPolarItemSelect");
	var seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	var parentId, parentNode, seriesLabel, items, i, selected, cdns;
	if (!select)
		return;
	parentId = getRadarPlotSelectedAllNodeId(node);
	parentNode = parentId ? networkNodes.get(parentId) : null;
	seriesLabel = seriesLabelSelect ? seriesLabelSelect.value : (node.radarPlotOptions && node.radarPlotOptions.seriesLabel);
	if (!seriesLabel && parentNode) {
		var attrs = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata);
		seriesLabel = guessRadarSeriesLabel(attrs);
	}
	items = parentNode && parentNode.STAdata ? getRadarUniqueValues(parentNode.STAdata, seriesLabel) : [];
	selected = (node.radarPlotOptions && node.radarPlotOptions.selectedItem) || (items.length ? items[0] : "");
	if (items.indexOf(selected) == -1)
		selected = items.length ? items[0] : "";
	cdns = "";
	for (i = 0; i < items.length; i++)
		cdns += radarHtmlOption(items[i], items[i] == selected);
	select.innerHTML = cdns;
	select.onchange = function () {
		if (!node.radarPlotOptions)
			node.radarPlotOptions = {};
		node.radarPlotOptions.selectedItem = select.value;
		networkNodes.update(node);
	};
	if (node.radarPlotOptions)
		node.radarPlotOptions.selectedItem = selected;
}

function toggleRadarPlotLayout() {
	var node;
	applyRadarPlotLayoutDisplay();
	node = getNodeDialog("DialogRadarPlot");
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	node.radarPlotOptions.layout = document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	syncRadarSeriesLegendsToLayout(node, node.radarPlotOptions.layout);
	networkNodes.update(node);
	if (node.radarPlotParentNodes && !isRadarPlotSeriesModeAll())
		createDialogWithSelectWithGroupsRadarPlot(node);
}

function populateRadarPlotAxesList(dataAttributes, selectedAxes) {
	var numericNames = getNumericAttributeNames(dataAttributes);
	var cdns = [];
	if (!numericNames.length) {
		document.getElementById("DialogRadarPlotAxesList").innerHTML = "<em>" + DonaCadena({cat: "No s'han trobat columnes numÃ¨riques.", spa: "No se han encontrado columnas numéricas.", eng: "No numeric columns found."}) + "</em>";
		return;
	}
	if (!selectedAxes)
		selectedAxes = numericNames.slice();
	for (var i = 0; i < numericNames.length; i++) {
		var name = numericNames[i];
		var checked = selectedAxes.indexOf(name) != -1 ? " checked" : "";
		cdns.push('<label style="display:block;"><input type="checkbox" class="DialogRadarPlotAxisCheckbox" value="',
			name, '"', checked, '> ', name, '</label>');
	}
	document.getElementById("DialogRadarPlotAxesList").innerHTML = cdns.join("");
}

function getSelectedRadarPlotAxes() {
	var boxes = document.getElementsByClassName("DialogRadarPlotAxisCheckbox");
	var selected = [];
	for (var i = 0; i < boxes.length; i++) {
		if (boxes[i].checked)
			selected.push(boxes[i].value);
	}
	return selected;
}

function meanOrMissing(sum, count, skipMissing) {
	if (!count)
		return skipMissing ? null : 0;
	return sum / count;
}

function meanOrZero(sum, count) {
	return meanOrMissing(sum, count, false);
}

function radarCellText(value) {
	if (value === undefined || value === null || value === "")
		return "(empty)";
	return "" + value;
}

function radarHtmlOption(value, selected) {
	var text = radarCellText(value);
	return '<option value="' + text.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '"' +
		(selected ? ' selected="selected"' : '') + '>' + text.replace(/&/g, "&amp;").replace(/</g, "&lt;") + '</option>';
}

function getRadarUniqueValues(data, column) {
	var values = [], i, text;
	if (!data || !column)
		return values;
	for (i = 0; i < data.length; i++) {
		text = radarCellText(data[i][column]);
		if (values.indexOf(text) == -1)
			values.push(text);
	}
	return values;
}

function collectRadarParentNodesInfo(parentNodes) {
	var info = {}, i, parent, attrs;
	if (!parentNodes)
		return info;
	for (i = 0; i < parentNodes.length; i++) {
		parent = parentNodes[i];
		if (!parent || !parent.STAdata || !parent.STAdata.length)
			continue;
		attrs = parent.STAdataAttributes ? parent.STAdataAttributes : getDataAttributes(parent.STAdata);
		info[parent.id] = {
			nodeLabel: parent.label,
			numericNames: getNumericAttributeNames(attrs),
			nonNumericNames: getNonNumericAttributeNames(attrs)
		};
	}
	return info;
}

function getRadarSharedDataAttributes(parentNodes) {
	var attrs = {}, i, parent, parentAttrs, keys, k;
	if (!parentNodes)
		return attrs;
	for (i = 0; i < parentNodes.length; i++) {
		parent = parentNodes[i];
		if (!parent || !parent.STAdata)
			continue;
		parentAttrs = parent.STAdataAttributes ? parent.STAdataAttributes : getDataAttributes(parent.STAdata);
		keys = Object.keys(parentAttrs);
		for (k = 0; k < keys.length; k++) {
			if (!attrs[keys[k]])
				attrs[keys[k]] = parentAttrs[keys[k]];
		}
	}
	return attrs;
}

function getRadarSeriesParentId(group, parentInfo) {
	var ids = Object.keys(parentInfo || {});
	if (group && group.nodeSelected && parentInfo[group.nodeSelected])
		return group.nodeSelected;
	return ids.length ? ids[0] : "";
}

function nextUnusedRadarChoice(choices, used) {
	var i;
	for (i = 0; i < choices.length; i++) {
		if (used.indexOf(choices[i]) == -1)
			return choices[i];
	}
	return choices.length ? choices[0] : "";
}

function createDefaultRadarSeriesGroup(parentId, layout, seriesLabel, seriesGroups) {
	var parentNode = networkNodes.get(parentId);
	var data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
	var attrs = parentNode ? (parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data)) : null;
	var numericNames = attrs ? getNumericAttributeNames(attrs) : [];
	var usedItems = [], usedColumns = [], i;
	seriesGroups = seriesGroups || [];
	for (i = 0; i < seriesGroups.length; i++) {
		if (seriesGroups[i].item)
			usedItems.push(seriesGroups[i].item);
		if (seriesGroups[i].valueColumn)
			usedColumns.push(seriesGroups[i].valueColumn);
	}
	var item = nextUnusedRadarChoice(getRadarUniqueValues(data, seriesLabel), usedItems);
	var valueColumn = nextUnusedRadarChoice(numericNames, usedColumns);
	return {
		nodeSelected: parentId,
		item: item,
		seriesLabel: seriesLabel || "",
		valueColumn: valueColumn,
		legendText: layout == "long" ? valueColumn : item
	};
}

function getRadarPlotSeriesMode(options) {
	if (!options)
		return "all";
	if (options.seriesMode == "series" || options.seriesMode == "all")
		return options.seriesMode;
	if (options.seriesAll === false)
		return "series";
	if (options.seriesAll === true)
		return "all";
	if (options.seriesGroups && options.seriesGroups.length)
		return "series";
	return "all";
}

function isRadarPlotSeriesModeAll() {
	var allRadio = document.getElementById("DialogRadarPlotSeriesModeAll");
	return !allRadio || allRadio.checked;
}

function radarPlotHasDrawableOptions(options) {
	if (!options)
		return false;
	if (options.drawn)
		return true;
	// Previous versions saved these on Draw without a drawn flag.
	if (options.axes && options.axes.length >= 3)
		return true;
	if (typeof options.title == "string")
		return true;
	return false;
}

function ensureRadarPlotSeriesState(node, parentNodes) {
	var parentInfo = collectRadarParentNodesInfo(parentNodes);
	var parentIds = Object.keys(parentInfo);
	var firstParent, dataAttributes, layout, group;
	node.radarPlotParentNodes = parentInfo;
	if (!parentIds.length || !node.radarPlotOptions)
		return parentInfo;
	firstParent = networkNodes.get(parentIds[0]);
	dataAttributes = firstParent.STAdataAttributes ? firstParent.STAdataAttributes : getDataAttributes(firstParent.STAdata);
	if (!node.radarPlotOptions.seriesLabel)
		node.radarPlotOptions.seriesLabel = guessRadarSeriesLabel(dataAttributes);
	if (!node.radarPlotOptions.axisX)
		node.radarPlotOptions.axisX = guessRadarSeriesLabel(dataAttributes);
	node.radarPlotOptions.seriesMode = getRadarPlotSeriesMode(node.radarPlotOptions);
	node.radarPlotOptions.seriesAll = node.radarPlotOptions.seriesMode == "all";
	if (node.radarPlotOptions.seriesMode == "series" && (!node.radarPlotOptions.seriesGroups || !node.radarPlotOptions.seriesGroups.length)) {
		layout = node.radarPlotOptions.layout == "long" ? "long" : "wide";
		group = createDefaultRadarSeriesGroup(parentIds[0], layout, node.radarPlotOptions.seriesLabel, []);
		if (node.radarPlotOptions.axisY) {
			group.valueColumn = node.radarPlotOptions.axisY;
			if (layout == "long")
				group.legendText = node.radarPlotOptions.axisY;
		}
		node.radarPlotOptions.seriesGroups = [group];
	}
	return parentInfo;
}

function onRadarPlotSharedColumnChange() {
	var node = getNodeDialog("DialogRadarPlot");
	var seriesLabelSelect, axisXSelect, polarValueSelect, groups, i, parentNode, data, items;
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	axisXSelect = document.getElementById("DialogRadarPlotAxisXSelect");
	polarValueSelect = document.getElementById("DialogRadarPlotPolarValueSelect");
	if (seriesLabelSelect)
		node.radarPlotOptions.seriesLabel = seriesLabelSelect.value;
	if (axisXSelect)
		node.radarPlotOptions.axisX = axisXSelect.value;
	if (polarValueSelect)
		node.radarPlotOptions.polarValueColumn = polarValueSelect.value;
	groups = node.radarPlotOptions.seriesGroups || [];
	for (i = 0; i < groups.length; i++) {
		parentNode = networkNodes.get(groups[i].nodeSelected);
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		items = getRadarUniqueValues(data, groups[i].seriesLabel || node.radarPlotOptions.seriesLabel);
		if (items.indexOf(groups[i].item) == -1)
			groups[i].item = items.length ? items[0] : "";
	}
	networkNodes.update(node);
	populateRadarPolarItemSelect(node);
	if (!isRadarPlotSeriesModeAll() && !isRadarPlotPolar())
		createDialogWithSelectWithGroupsRadarPlot(node);
}

function createDialogWithSelectWithGroupsRadarPlot(node) {
	var container = document.getElementById("DialogRadarPlotSeriesDiv");
	var toolbar = document.getElementById("DialogRadarPlotSeriesToolbar");
	var groups, parentInfo, parentIds, layout, seriesLabelSelect, seriesLabel;
	var cdns, i, p, parentId, parentNode, data, items, numericNames, attrs, groupSeriesLabel, nonNumeric;
	if (!container)
		return;
	groups = node.radarPlotOptions && node.radarPlotOptions.seriesGroups ? node.radarPlotOptions.seriesGroups : [];
	parentInfo = node.radarPlotParentNodes || {};
	parentIds = Object.keys(parentInfo);
	layout = document.getElementById("DialogRadarPlotLayoutWide") && document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	seriesLabel = seriesLabelSelect ? seriesLabelSelect.value : (node.radarPlotOptions ? node.radarPlotOptions.seriesLabel : "");
	if (toolbar)
		toolbar.innerHTML = '<button type="button" onclick="addNewSelectGroupInRadarPlot(\'' + node.id + '\')">' + DonaCadena({cat: "Afegeix una Sèrie nova", spa: "AÃ±adir una serie nueva", eng: "Add new series"}) + '</button>';
	cdns = "";

	for (i = 0; i < groups.length; i++) {
		parentId = getRadarSeriesParentId(groups[i], parentInfo);
		if (parentId && groups[i].nodeSelected != parentId)
			groups[i].nodeSelected = parentId;
		parentNode = parentId ? networkNodes.get(parentId) : null;
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		attrs = parentNode ? (parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data)) : null;
		numericNames = parentInfo[parentId] ? parentInfo[parentId].numericNames : [];
		nonNumeric = parentInfo[parentId] ? parentInfo[parentId].nonNumericNames : [];
		groupSeriesLabel = groups[i].seriesLabel || seriesLabel || (nonNumeric.length ? nonNumeric[0] : "");
		if (groupSeriesLabel && nonNumeric.indexOf(groupSeriesLabel) == -1 && nonNumeric.length)
			groupSeriesLabel = nonNumeric[0];
		groups[i].seriesLabel = groupSeriesLabel;
		items = getRadarUniqueValues(data, groupSeriesLabel);

		cdns += '<fieldset><legend>' + DonaCadenaFmt({cat: "Sèrie {0}", spa: "Serie {0}", eng: "Series {0}"}, (i + 1)) + '</legend>';
		cdns += '<div class="DialogRadarPlotSeriesRow"><label>' + DonaCadena({cat: "Dades de:", spa: "Datos de:", eng: "Data from:"}) + ' <select id="DialogRadarPlotNodeSelect_' + i + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'nodeSelected\',\'select\',\'DialogRadarPlotNodeSelect_' + i + '\',\'' + node.id + '\')">';
		for (p = 0; p < parentIds.length; p++) {
			cdns += '<option value="' + ("" + parentIds[p]).replace(/"/g, "&quot;") + '"' +
				(parentIds[p] == parentId ? ' selected="selected"' : '') + '>' +
				("" + (parentInfo[parentIds[p]].nodeLabel || parentIds[p])).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
				'</option>';
		}
		cdns += '</select></label></div>';

		if (layout == "wide") {
			cdns += '<div class="DialogRadarPlotSeriesRow"><label>' + DonaCadena({cat: "Columna d'element:", spa: "Columna de elemento:", eng: "Item column:"}) + ' <select id="DialogRadarPlotSeriesLabelSelect_' + i + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'seriesLabel\',\'select\',\'DialogRadarPlotSeriesLabelSelect_' + i + '\',\'' + node.id + '\')">';
			for (p = 0; p < nonNumeric.length; p++)
				cdns += radarHtmlOption(nonNumeric[p], nonNumeric[p] == groupSeriesLabel);
			cdns += '</select></label></div>';
			if (items.indexOf(groups[i].item) == -1)
				groups[i].item = items.length ? items[0] : "";
			if (!groups[i].legendText)
				groups[i].legendText = groups[i].item;
			cdns += '<div class="DialogRadarPlotSeriesRow"><label>Item: <select id="DialogRadarPlotItemSelect_' + i + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'item\',\'select\',\'DialogRadarPlotItemSelect_' + i + '\',\'' + node.id + '\')">';
			for (p = 0; p < items.length; p++)
				cdns += radarHtmlOption(items[p], items[p] == groups[i].item);
			cdns += '</select></label></div>';
		} else {
			if (numericNames.indexOf(groups[i].valueColumn) == -1)
				groups[i].valueColumn = numericNames.length ? numericNames[0] : "";
			if (!groups[i].legendText)
				groups[i].legendText = groups[i].valueColumn;
			cdns += '<div class="DialogRadarPlotSeriesRow"><label>Values: <select id="DialogRadarPlotValueSelect_' + i + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'valueColumn\',\'select\',\'DialogRadarPlotValueSelect_' + i + '\',\'' + node.id + '\')">';
			for (p = 0; p < numericNames.length; p++)
				cdns += radarHtmlOption(numericNames[p], numericNames[p] == groups[i].valueColumn);
			cdns += '</select></label></div>';
		}

		cdns += '<button type="button" class="DialogRadarPlotSeriesRemove" onclick="deleteSelectGroupInRadarPlot(\'' + node.id + '\', \'' + i + '\')"><img src="trash.png" alt="Remove" title="Remove"></button>';
		cdns += '</fieldset>';
	}
	container.innerHTML = cdns;
}

function addNewSelectGroupInRadarPlot(nodeId) {
	if (typeof event !== "undefined" && event)
		event.preventDefault();
	var node = networkNodes.get(nodeId);
	var parentIds, layout, seriesLabelSelect, seriesLabel;
	if (!node)
		return;
	parentIds = Object.keys(node.radarPlotParentNodes || {});
	if (!parentIds.length)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	if (!node.radarPlotOptions.seriesGroups)
		node.radarPlotOptions.seriesGroups = [];
	if (node.radarPlotOptions.seriesGroups.length >= 20) {
		alert(DonaCadena({cat: "Massa Sèries (20). Suprimiu-ne una abans d'afegir-ne una altra.", spa: "Demasiadas series (20). Elimine una antes de aÃ±adir otra.", eng: "Too many series (20). Remove one before adding another."}));
		return;
	}
	layout = document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	seriesLabel = seriesLabelSelect ? seriesLabelSelect.value : node.radarPlotOptions.seriesLabel;
	node.radarPlotOptions.seriesGroups.push(createDefaultRadarSeriesGroup(parentIds[0], layout, seriesLabel, node.radarPlotOptions.seriesGroups));
	networkNodes.update(node);
	createDialogWithSelectWithGroupsRadarPlot(node);
}

function applyRadarPlotSeriesModeDisplay(seriesMode) {
	var manual = document.getElementById("DialogRadarPlotSeriesManual");
	var hint = document.getElementById("DialogRadarPlotSeriesAllHint");
	var allOn = seriesMode != "series";
	if (manual)
		manual.style.display = allOn ? "none" : "";
	if (hint)
		hint.style.display = allOn ? "" : "none";
}

function ensureRadarManualSeriesGroup(node) {
	var parentIds, layout, seriesLabelSelect, seriesLabel;
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	if (node.radarPlotOptions.seriesGroups && node.radarPlotOptions.seriesGroups.length)
		return;
	parentIds = Object.keys(node.radarPlotParentNodes || {});
	if (!parentIds.length)
		return;
	layout = document.getElementById("DialogRadarPlotLayoutWide") && document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	seriesLabel = seriesLabelSelect ? seriesLabelSelect.value : node.radarPlotOptions.seriesLabel;
	node.radarPlotOptions.seriesGroups = [createDefaultRadarSeriesGroup(parentIds[0], layout, seriesLabel, [])];
}

function toggleRadarPlotSeriesMode() {
	var node = getNodeDialog("DialogRadarPlot");
	var seriesMode = isRadarPlotSeriesModeAll() ? "all" : "series";
	if (node) {
		if (!node.radarPlotOptions)
			node.radarPlotOptions = {};
		node.radarPlotOptions.seriesMode = seriesMode;
		node.radarPlotOptions.seriesAll = seriesMode == "all";
		if (seriesMode == "series")
			ensureRadarManualSeriesGroup(node);
		networkNodes.update(node);
	}
	applyRadarPlotSeriesModeDisplay(seriesMode);
	applyRadarPlotTypeDisplay();
	if (seriesMode == "series" && node)
		createDialogWithSelectWithGroupsRadarPlot(node);
}

function deleteSelectGroupInRadarPlot(nodeId, groupToDelete) {
	if (typeof event !== "undefined" && event)
		event.preventDefault();
	var node = networkNodes.get(nodeId);
	if (!node || !node.radarPlotOptions || !node.radarPlotOptions.seriesGroups)
		return;
	node.radarPlotOptions.seriesGroups.splice(parseInt(groupToDelete), 1);
	networkNodes.update(node);
	createDialogWithSelectWithGroupsRadarPlot(node);
}

function updateSelectInformationRadarPlot(numberDialog, keyToChange, typeOfSelector, elementName, nodeId) {
	var node = networkNodes.get(nodeId), value, element, previous, parentNode, data, attrs, seriesLabel, items, numericNames;
	element = document.getElementById(elementName);
	if (!node || !node.radarPlotOptions || !node.radarPlotOptions.seriesGroups || !element)
		return;
	if (typeOfSelector == "select")
		value = element.options[element.selectedIndex].value;
	else if (typeOfSelector == "checkbox")
		value = element.checked;
	else
		value = element.value;

	previous = node.radarPlotOptions.seriesGroups[numberDialog][keyToChange];
	node.radarPlotOptions.seriesGroups[numberDialog][keyToChange] = value;

	if ((keyToChange == "item" || keyToChange == "valueColumn") && (!node.radarPlotOptions.seriesGroups[numberDialog].legendText || node.radarPlotOptions.seriesGroups[numberDialog].legendText == previous))
		node.radarPlotOptions.seriesGroups[numberDialog].legendText = value;

	if (keyToChange == "seriesLabel") {
		parentNode = networkNodes.get(node.radarPlotOptions.seriesGroups[numberDialog].nodeSelected);
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		items = getRadarUniqueValues(data, value);
		if (items.indexOf(node.radarPlotOptions.seriesGroups[numberDialog].item) == -1)
			node.radarPlotOptions.seriesGroups[numberDialog].item = items.length ? items[0] : "";
		if (!node.radarPlotOptions.seriesGroups[numberDialog].legendText || node.radarPlotOptions.seriesGroups[numberDialog].legendText == previous)
			node.radarPlotOptions.seriesGroups[numberDialog].legendText = node.radarPlotOptions.seriesGroups[numberDialog].item;
	}

	if (keyToChange == "nodeSelected") {
		parentNode = networkNodes.get(value);
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		attrs = parentNode ? (parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data)) : null;
		seriesLabel = node.radarPlotOptions.seriesGroups[numberDialog].seriesLabel ||
			(document.getElementById("DialogRadarPlotSeriesLabelSelect") ? document.getElementById("DialogRadarPlotSeriesLabelSelect").value : node.radarPlotOptions.seriesLabel);
		numericNames = attrs ? getNumericAttributeNames(attrs) : [];
		var nonNumeric = attrs ? getNonNumericAttributeNames(attrs) : [];
		if (seriesLabel && nonNumeric.indexOf(seriesLabel) == -1)
			seriesLabel = nonNumeric.length ? nonNumeric[0] : "";
		node.radarPlotOptions.seriesGroups[numberDialog].seriesLabel = seriesLabel;
		items = getRadarUniqueValues(data, seriesLabel);
		if (items.indexOf(node.radarPlotOptions.seriesGroups[numberDialog].item) == -1)
			node.radarPlotOptions.seriesGroups[numberDialog].item = items.length ? items[0] : "";
		if (numericNames.indexOf(node.radarPlotOptions.seriesGroups[numberDialog].valueColumn) == -1)
			node.radarPlotOptions.seriesGroups[numberDialog].valueColumn = numericNames.length ? numericNames[0] : "";
	}
	networkNodes.update(node);
	createDialogWithSelectWithGroupsRadarPlot(node);
}

function isMissingRadarValue(value) {
	return value === null || value === undefined || isNaN(value);
}

function radarExtent(values) {
	var minVal = null, maxVal = null, i, value;
	for (i = 0; i < values.length; i++) {
		value = values[i];
		if (isMissingRadarValue(value))
			continue;
		if (minVal === null || value < minVal)
			minVal = value;
		if (maxVal === null || value > maxVal)
			maxVal = value;
	}
	return { min: minVal, max: maxVal };
}

function scaleRadarValue(value, minVal, range, skipMissing) {
	if (isMissingRadarValue(value))
		return skipMissing ? null : 0;
	return ((value - minVal) / range) * 100;
}

function normalizeRadarSeries(datasets, skipMissing) {
	var nAxes, a, s, extent, range, column;
	if (!datasets.length)
		return;
	nAxes = datasets[0].data.length;

	if (datasets.length == 1) {
		extent = radarExtent(datasets[0].data);
		if (extent.min === null)
			return;
		range = extent.max - extent.min;
		if (range == 0)
			return;
		for (a = 0; a < nAxes; a++)
			datasets[0].data[a] = scaleRadarValue(datasets[0].data[a], extent.min, range, skipMissing);
		return;
	}

	for (a = 0; a < nAxes; a++) {
		column = [];
		for (s = 0; s < datasets.length; s++)
			column.push(datasets[s].data[a]);
		extent = radarExtent(column);
		if (extent.min === null)
			continue;
		range = extent.max - extent.min;
		if (range == 0)
			continue;
		for (s = 0; s < datasets.length; s++)
			datasets[s].data[a] = scaleRadarValue(datasets[s].data[a], extent.min, range, skipMissing);
	}
}

function buildRadarRadialScale(normalize, beginAtZero, seriesData, tickFontSize, pointLabelFontSize, isPolar) {
	var scale = { beginAtZero: beginAtZero }, s, a, extent, values = [];
	if (normalize) {
		scale.min = 0;
		scale.max = 100;
	} else {
		for (s = 0; s < seriesData.length; s++) {
			for (a = 0; a < seriesData[s].length; a++)
				values.push(seriesData[s][a]);
		}
		extent = radarExtent(values);
		if (extent.max !== null)
			scale.suggestedMax = extent.max;
		if (!beginAtZero && extent.min !== null)
			scale.suggestedMin = extent.min;
	}
	scale.ticks = { font: { size: tickFontSize || 11 } };
	if (!isPolar)
		scale.pointLabels = { font: { size: pointLabelFontSize || 12 } };
	return scale;
}

function ensureRadarPlotStyleState(options) {
	if (!options.seriesColors)
		options.seriesColors = {};
	if (!options.sliceColors)
		options.sliceColors = {};
	if (!options.hiddenSeries)
		options.hiddenSeries = [];
	if (!options.hiddenSlices)
		options.hiddenSlices = [];
	if (typeof options.titleFontSize !== "number" || isNaN(options.titleFontSize))
		options.titleFontSize = 16;
	if (typeof options.tickFontSize !== "number" || isNaN(options.tickFontSize))
		options.tickFontSize = 11;
	if (typeof options.pointLabelFontSize !== "number" || isNaN(options.pointLabelFontSize))
		options.pointLabelFontSize = 12;
	if (typeof options.legendFontSize !== "number" || isNaN(options.legendFontSize))
		options.legendFontSize = 12;
	if (typeof options.skipMissing !== "boolean")
		options.skipMissing = true;
}

function getRadarSeriesColor(options, key, index, fallback) {
	if (options.seriesColors && options.seriesColors[key])
		return options.seriesColors[key];
	if (fallback)
		return fallback;
	return ColorsForBarPlot[index % ColorsForBarPlot.length];
}

function getRadarSliceColor(options, key, index) {
	if (options.sliceColors && options.sliceColors[key])
		return options.sliceColors[key];
	return ColorsForBarPlot[index % ColorsForBarPlot.length];
}

function isRadarLegendHidden(options, mode, key) {
	var list = mode == "slice" ? options.hiddenSlices : options.hiddenSeries;
	return list && list.indexOf(key) != -1;
}

function buildRadarDatasets(seriesNames, seriesKeys, seriesData, fill, seriesColors, options, skipMissing) {
	var datasets = [], label, color, key, i;
	for (i = 0; i < seriesNames.length; i++) {
		label = ("" + seriesNames[i]);
		if (label.length > 35)
			label = label.substring(0, 32) + "...";
		key = seriesKeys[i] || seriesNames[i];
		color = getRadarSeriesColor(options, key, i, seriesColors[i]);
		datasets.push({
			label: label,
			data: seriesData[i],
			backgroundColor: hexColorWithAlpha(color, fill ? 0.2 : 0),
			borderColor: color,
			pointBackgroundColor: color,
			borderWidth: 2,
			fill: fill,
			spanGaps: false,
			hidden: isRadarLegendHidden(options, "series", key)
		});
	}
	return datasets;
}

function getRadarUniqueValuesFromParents(parentNodes, column) {
	var values = [], i, more, j;
	if (!parentNodes || !column)
		return values;
	for (i = 0; i < parentNodes.length; i++) {
		if (!parentNodes[i] || !parentNodes[i].STAdata)
			continue;
		more = getRadarUniqueValues(parentNodes[i].STAdata, column);
		for (j = 0; j < more.length; j++) {
			if (values.indexOf(more[j]) == -1)
				values.push(more[j]);
		}
	}
	return values;
}

function getRadarCategoryKeysFromParents(parentNodes, axisX) {
	var keys = [], i, r, data, itemKey;
	if (!parentNodes || !axisX)
		return keys;
	for (i = 0; i < parentNodes.length; i++) {
		data = parentNodes[i] && parentNodes[i].STAdata;
		if (!data)
			continue;
		for (r = 0; r < data.length; r++) {
			itemKey = data[r][axisX];
			if (keys.indexOf(itemKey) == -1)
				keys.push(itemKey);
		}
	}
	return keys;
}

function getRadarAutomaticValueColumns(parentNodes, axisX) {
	var names = [], i, n, parent, attrs, numeric;
	if (!parentNodes)
		return names;
	for (i = 0; i < parentNodes.length; i++) {
		parent = parentNodes[i];
		if (!parent || !parent.STAdata)
			continue;
		attrs = parent.STAdataAttributes ? parent.STAdataAttributes : getDataAttributes(parent.STAdata);
		numeric = getNumericAttributeNames(attrs);
		for (n = 0; n < numeric.length; n++) {
			if (numeric[n] != axisX && names.indexOf(numeric[n]) == -1)
				names.push(numeric[n]);
		}
	}
	return names;
}

function buildRadarWideSeriesRow(parentNodes, seriesLabel, item, axes, skipMissing) {
	var sums = new Array(axes.length).fill(0);
	var counts = new Array(axes.length).fill(0);
	var p, i, c, data, record, value;
	for (p = 0; p < parentNodes.length; p++) {
		data = parentNodes[p] && parentNodes[p].STAdata;
		if (!data)
			continue;
		for (i = 0; i < data.length; i++) {
			record = data[i];
			if (radarCellText(record[seriesLabel]) != radarCellText(item))
				continue;
			for (c = 0; c < axes.length; c++) {
				value = parseFloat(record[axes[c]]);
				if (!isNaN(value)) {
					sums[c] += value;
					counts[c]++;
				}
			}
		}
	}
	return sums.map(function (sum, a) { return meanOrMissing(sum, counts[a], skipMissing); });
}

function buildRadarLongSeriesRow(parentNodes, axisX, valueColumn, labelsFull, skipMissing) {
	var row = new Array(labelsFull.length).fill(0);
	var counts = new Array(labelsFull.length).fill(0);
	var p, i, c, data, record, value;
	for (p = 0; p < parentNodes.length; p++) {
		data = parentNodes[p] && parentNodes[p].STAdata;
		if (!data)
			continue;
		for (i = 0; i < data.length; i++) {
			record = data[i];
			c = labelsFull.indexOf(record[axisX]);
			if (c == -1)
				continue;
			value = parseFloat(record[valueColumn]);
			if (!isNaN(value)) {
				row[c] += value;
				counts[c]++;
			}
		}
	}
	if (!skipMissing)
		return row;
	for (c = 0; c < row.length; c++) {
		if (!counts[c])
			row[c] = null;
	}
	return row;
}

function limitRadarSeriesList(items, maxSeries, event) {
	if (items.length > maxSeries) {
		if (event)
			alert(DonaCadenaFmt({cat: "Massa Sèries ({0}). Es mostren les primeres {1} Sèries.", spa: "Demasiadas series ({0}). Se muestran las primeras {1} series.", eng: "Too many series ({0}). Showing the first {1} series."}, items.length, maxSeries));
		return items.slice(0, maxSeries);
	}
	return items;
}

var RadarPlotChart = null;
var RadarPlotLastLegend = null;

function clearRadarPlotChart() {
	var canvas, existing, legend;
	if (RadarPlotChart) {
		RadarPlotChart.destroy();
		RadarPlotChart = null;
	}
	canvas = document.getElementById("DialogRadarPlotVisualizationCanvas");
	if (canvas && typeof Chart !== "undefined" && Chart.getChart) {
		existing = Chart.getChart(canvas);
		if (existing)
			existing.destroy();
	}
	legend = document.getElementById("DialogRadarPlotLegend");
	if (legend)
		legend.innerHTML = "";
	RadarPlotLastLegend = null;
	hideRadarColorCard();
}

/** Placeholder chart (axes/grid without data) so the visualization area is not left blank.
 * It is not kept in the dialog's chart variable, so "Save as PNG" still asks to draw first. */
function showEmptyChartPlaceholder(canvasId, config) {
	var canvas = document.getElementById(canvasId), existing;
	if (!canvas || typeof Chart === "undefined")
		return;
	if (Chart.getChart) {
		existing = Chart.getChart(canvas);
		if (existing)
			existing.destroy();
	}
	if (!config.options) config.options = {};
	config.options.maintainAspectRatio = false;
	config.options.animation = false;
	if (!config.options.plugins) config.options.plugins = {};
	config.options.plugins.legend = { display: false };
	config.options.plugins.tooltip = { enabled: false };
	config.options.plugins.labels = { render: function () { return ""; } };
	config.options.events = [];
	new Chart(canvas, config);
}

function showEmptyRadarPlotChart() {
	var polar = isRadarPlotPolar(), labels = ["", "", "", "", ""];
	showEmptyChartPlaceholder("DialogRadarPlotVisualizationCanvas", {
		type: polar ? "polarArea" : "radar",
		data: {
			labels: labels,
			datasets: [{ data: polar ? [0, 0, 0, 0, 0] : [], backgroundColor: "rgba(0,0,0,0)", borderWidth: 0 }]
		},
		options: {
			scales: { r: { min: 0, max: 10, ticks: { display: false, stepSize: 2 }, pointLabels: { display: !polar } } }
		}
	});
}

function radarPlotEscapeAttr(s) {
	return ("" + s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function radarPlotEscapeJs(s) {
	return ("" + s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function hideRadarColorCard() {
	var card = document.getElementById("DialogRadarPlotColorCard");
	if (card)
		card.style.display = "none";
}

function clampRadarFontSize(n, min, max, fallback) {
	n = parseInt(n, 10);
	if (isNaN(n))
		n = fallback;
	if (n < min)
		n = min;
	if (n > max)
		n = max;
	return n;
}

function getRadarTitleFontSize() {
	var el = document.getElementById("DialogRadarPlotTitleSize");
	return clampRadarFontSize(el ? el.value : 16, 10, 36, 16);
}

function getRadarTickFontSize() {
	var el = document.getElementById("DialogRadarPlotTickSize");
	return clampRadarFontSize(el ? el.value : 11, 8, 28, 11);
}

function getRadarPointLabelFontSize() {
	var el = document.getElementById("DialogRadarPlotPointLabelSize");
	return clampRadarFontSize(el ? el.value : 12, 8, 28, 12);
}

function getRadarLegendFontSize() {
	var el = document.getElementById("DialogRadarPlotLegendSize");
	return clampRadarFontSize(el ? el.value : 12, 8, 28, 12);
}

function syncRadarPlotStyleControls(options) {
	var titleEl = document.getElementById("DialogRadarPlotTitleSize");
	var titleVal = document.getElementById("DialogRadarPlotTitleSizeValue");
	var tickEl = document.getElementById("DialogRadarPlotTickSize");
	var tickVal = document.getElementById("DialogRadarPlotTickSizeValue");
	var pointEl = document.getElementById("DialogRadarPlotPointLabelSize");
	var pointVal = document.getElementById("DialogRadarPlotPointLabelSizeValue");
	var legendEl = document.getElementById("DialogRadarPlotLegendSize");
	var legendVal = document.getElementById("DialogRadarPlotLegendSizeValue");
	if (!options)
		options = {};
	if (titleEl)
		titleEl.value = options.titleFontSize || 16;
	if (titleVal)
		titleVal.textContent = "" + (options.titleFontSize || 16);
	if (tickEl)
		tickEl.value = options.tickFontSize || 11;
	if (tickVal)
		tickVal.textContent = "" + (options.tickFontSize || 11);
	if (pointEl)
		pointEl.value = options.pointLabelFontSize || 12;
	if (pointVal)
		pointVal.textContent = "" + (options.pointLabelFontSize || 12);
	if (legendEl)
		legendEl.value = options.legendFontSize || 12;
	if (legendVal)
		legendVal.textContent = "" + (options.legendFontSize || 12);
}

function onRadarPlotStyleChange(redraw) {
	var node = getNodeDialog("DialogRadarPlot");
	var titleSize = getRadarTitleFontSize();
	var tickSize = getRadarTickFontSize();
	var pointSize = getRadarPointLabelFontSize();
	var legendSize = getRadarLegendFontSize();
	syncRadarPlotStyleControls({ titleFontSize: titleSize, tickFontSize: tickSize, pointLabelFontSize: pointSize, legendFontSize: legendSize });
	if (node) {
		if (!node.radarPlotOptions)
			node.radarPlotOptions = {};
		ensureRadarPlotStyleState(node.radarPlotOptions);
		node.radarPlotOptions.titleFontSize = titleSize;
		node.radarPlotOptions.tickFontSize = tickSize;
		node.radarPlotOptions.pointLabelFontSize = pointSize;
		node.radarPlotOptions.legendFontSize = legendSize;
		applyChartLegendFontSize("DialogRadarPlotLegend", legendSize);
		networkNodes.update(node);
	}
	if (redraw && node && node.radarPlotOptions && node.radarPlotOptions.drawn)
		DrawRadarPlot();
}

function onRadarPlotTitleChange() {
	var node = getNodeDialog("DialogRadarPlot");
	var titleEl = document.getElementById("DialogRadarPlotTitleInput");
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	node.radarPlotOptions.title = titleEl ? (titleEl.value || "") : "";
	node.radarPlotOptions.titleFontSize = getRadarTitleFontSize();
	networkNodes.update(node);
	if (node.radarPlotOptions.drawn)
		DrawRadarPlot();
}

function buildRadarPlotLegendHtml(node, mode, itemKeys, itemLabels, itemColors) {
	var container = document.getElementById("DialogRadarPlotLegend");
	var options, cdns, i, key, label, color, hidden, eyeTitle, hiddenFlags = [];
	if (!container)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	ensureRadarPlotStyleState(node.radarPlotOptions);
	options = node.radarPlotOptions;
	container.style.fontSize = (options.legendFontSize || 12) + "px";
	cdns = "";
	for (i = 0; i < itemKeys.length; i++) {
		key = itemKeys[i];
		label = itemLabels[i];
		color = itemColors[i];
		hidden = isRadarLegendHidden(options, mode, key);
		hiddenFlags.push(hidden);
		eyeTitle = hidden
			? DonaCadena({cat: "Mostra", spa: "Mostrar", eng: "Show"})
			: DonaCadena({cat: "Amaga", spa: "Ocultar", eng: "Hide"});
		cdns += '<div class="DialogRadarPlotLegendItem' + (hidden ? " is-hidden" : "") + '">';
		cdns += '<button type="button" class="DialogRadarPlotLegendSwatch" style="background-color:' + radarPlotEscapeAttr(color) + ';" title="' +
			DonaCadena({cat: "Canvia el color", spa: "Cambiar el color", eng: "Change color"}) +
			'" onclick="onRadarLegendColorClick(\'' + radarPlotEscapeJs(mode) + '\',\'' + radarPlotEscapeJs(key) + '\', event)"></button>';
		cdns += '<button type="button" class="DialogRadarPlotLegendEye" title="' + radarPlotEscapeAttr(eyeTitle) +
			'" onclick="onRadarLegendEyeClick(\'' + radarPlotEscapeJs(mode) + '\',\'' + radarPlotEscapeJs(key) + '\')">' +
			(hidden ? "&#10005;" : "&#128065;") + "</button>";
		cdns += '<span class="DialogRadarPlotLegendLabel" style="font-size:' + (options.legendFontSize || 12) + 'px;">' + radarPlotEscapeAttr(label) + "</span>";
		cdns += "</div>";
	}
	container.innerHTML = cdns;
	RadarPlotLastLegend = {
		mode: mode,
		keys: itemKeys.slice(),
		labels: itemLabels.slice(),
		colors: itemColors.slice(),
		hidden: hiddenFlags
	};
}

function onRadarLegendEyeClick(mode, key) {
	var node = getNodeDialog("DialogRadarPlot");
	var list, idx;
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	ensureRadarPlotStyleState(node.radarPlotOptions);
	list = mode == "slice" ? node.radarPlotOptions.hiddenSlices : node.radarPlotOptions.hiddenSeries;
	idx = list.indexOf(key);
	if (idx == -1)
		list.push(key);
	else
		list.splice(idx, 1);
	networkNodes.update(node);
	DrawRadarPlot();
}

function onRadarLegendColorClick(mode, key, evt) {
	var card = document.getElementById("DialogRadarPlotColorCard");
	var dialog = document.getElementById("DialogRadarPlot");
	var cdns = "", i, color, rect, dRect;
	if (!card || !dialog)
		return;
	for (i = 0; i < ColorsForBarPlot.length; i++) {
		color = ColorsForBarPlot[i];
		cdns += '<button type="button" class="DialogRadarPlotColorCardSwatch" style="background-color:' + color + ';" onclick="applyRadarLegendColor(\'' +
			radarPlotEscapeJs(mode) + '\',\'' + radarPlotEscapeJs(key) + '\',\'' + radarPlotEscapeJs(color) + '\')"></button>';
	}
	cdns += '<input type="color" value="#888888" onchange="applyRadarLegendColor(\'' + radarPlotEscapeJs(mode) + '\',\'' + radarPlotEscapeJs(key) + '\', this.value)">';
	card.innerHTML = cdns;
	card.style.display = "flex";
	rect = (evt && evt.target && evt.target.getBoundingClientRect) ? evt.target.getBoundingClientRect() : null;
	dRect = dialog.getBoundingClientRect();
	if (rect) {
		card.style.left = Math.max(8, rect.left - dRect.left) + "px";
		card.style.top = Math.max(8, rect.bottom - dRect.top + 4) + "px";
	}
}

function applyRadarLegendColor(mode, key, color) {
	var node = getNodeDialog("DialogRadarPlot");
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	ensureRadarPlotStyleState(node.radarPlotOptions);
	if (mode == "slice")
		node.radarPlotOptions.sliceColors[key] = color;
	else
		node.radarPlotOptions.seriesColors[key] = color;
	networkNodes.update(node);
	hideRadarColorCard();
	DrawRadarPlot();
}

function DrawRadarPlot(event) {
	if (event)
		event.preventDefault();
	var node = getNodeDialog("DialogRadarPlot");
	if (!node)
		return;
	var parentNodes = GetParentNodes(node);
	if (!parentNodes || !parentNodes.length)
		return;

	var polar = isRadarPlotPolar();
	var layout = document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	var normalize = document.getElementById("DialogRadarPlotNormalize").checked;
	var fill = document.getElementById("DialogRadarPlotFill").checked;
	var beginAtZero = document.getElementById("DialogRadarPlotBeginZero").checked;
	var skipMissing = document.getElementById("DialogRadarPlotSkipMissing") ? document.getElementById("DialogRadarPlotSkipMissing").checked : true;
	var title = document.getElementById("DialogRadarPlotTitleInput").value || "";
	var seriesAll = isRadarPlotSeriesModeAll();
	var labels = [], labelsFull = [], seriesNames = [], seriesKeys = [], seriesData = [], seriesColors = [];
	var record, value, i, c, g, parentNode, data, sums, counts, itemKey, row, items, valueColumns;
	var maxSeries = 20, selectedNodeId, selectedParents, seriesLabel, axes, axisX, chartType, chartPlugins, datasets;
	var legendMode, legendKeys, legendLabels, legendColors, bgColors, polarItem, polarValue, titleFontSize, tickFontSize, pointLabelFontSize;

	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	ensureRadarPlotStyleState(node.radarPlotOptions);
	var options = node.radarPlotOptions;
	var seriesGroups = options.seriesGroups || [];
	titleFontSize = getRadarTitleFontSize();
	tickFontSize = getRadarTickFontSize();
	pointLabelFontSize = getRadarPointLabelFontSize();
	options.plotType = polar ? "polar" : "radar";
	options.layout = layout;
	options.normalize = normalize;
	options.fill = fill;
	options.beginAtZero = beginAtZero;
	options.skipMissing = skipMissing;
	options.title = title;
	options.titleFontSize = titleFontSize;
	options.tickFontSize = tickFontSize;
	options.pointLabelFontSize = pointLabelFontSize;
	options.legendFontSize = getRadarLegendFontSize();
	options.seriesMode = seriesAll ? "all" : "series";
	options.seriesAll = seriesAll;
	options.seriesGroups = seriesGroups;
	selectedNodeId = getRadarPlotSelectedAllNodeId(node);
	options.nodeSelected = selectedNodeId;
	syncRadarPlotStyleControls(options);

	if (polar)
		seriesAll = true;

	if (!seriesAll) {
		if (!seriesGroups.length) {
			if (event)
				alert(DonaCadena({cat: "Afegiu almenys una Sèrie.", spa: "AÃ±ada al menos una serie.", eng: "Add at least one series."}));
			return;
		}
		if (seriesGroups.length > maxSeries) {
			if (event)
				alert(DonaCadenaFmt({cat: "Massa Sèries ({0}). Es mostren les primeres {1} Sèries.", spa: "Demasiadas series ({0}). Se muestran las primeras {1} series.", eng: "Too many series ({0}). Showing the first {1} series."}, seriesGroups.length, maxSeries));
			seriesGroups = seriesGroups.slice(0, maxSeries);
		}
	}

	selectedParents = [];
	if (seriesAll || polar) {
		parentNode = networkNodes.get(selectedNodeId);
		if (!parentNode || !parentNode.STAdata) {
			if (event)
				alert(DonaCadena({cat: "No hi ha dades al node seleccionat.", spa: "No hay datos en el nodo seleccionado.", eng: "No data in the selected node."}));
			return;
		}
		selectedParents = [parentNode];
	}

	if (layout == "wide") {
		axes = getSelectedRadarPlotAxes();
		seriesLabel = document.getElementById("DialogRadarPlotSeriesLabelSelect") ? document.getElementById("DialogRadarPlotSeriesLabelSelect").value : "";
		options.axes = axes;
		options.seriesLabel = seriesLabel;
		if (axes.length < (polar ? 3 : 3)) {
			if (event)
				alert(DonaCadena({cat: "Seleccioneu almenys tres columnes numÃ¨riques.", spa: "Seleccione al menos tres columnas numéricas.", eng: "Select at least three numeric columns."}));
			return;
		}
		labels = axes;
		labelsFull = axes.slice();
		if (polar) {
			polarItem = document.getElementById("DialogRadarPlotPolarItemSelect") ? document.getElementById("DialogRadarPlotPolarItemSelect").value : options.selectedItem;
			if (!seriesLabel) {
				seriesLabel = guessRadarSeriesLabel(parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata));
			}
			if (!polarItem) {
				items = getRadarUniqueValues(parentNode.STAdata, seriesLabel);
				polarItem = items.length ? items[0] : "";
			}
			options.selectedItem = polarItem;
			options.seriesLabel = seriesLabel;
			seriesData.push(buildRadarWideSeriesRow(selectedParents, seriesLabel, polarItem, axes, false));
			seriesNames.push(polarItem || seriesLabel || "Polar");
			seriesKeys.push(polarItem || "polar");
			seriesColors.push(ColorsForBarPlot[0]);
		} else if (seriesAll) {
			if (!seriesLabel) {
				if (event)
					alert(DonaCadena({cat: "Seleccioneu una columna d'elements.", spa: "Seleccione una columna de elementos.", eng: "Select an item column."}));
				return;
			}
			items = limitRadarSeriesList(getRadarUniqueValues(selectedParents[0].STAdata, seriesLabel), maxSeries, event);
			for (g = 0; g < items.length; g++) {
				seriesNames.push(items[g]);
				seriesKeys.push(items[g]);
				seriesData.push(buildRadarWideSeriesRow(selectedParents, seriesLabel, items[g], axes, skipMissing));
				seriesColors.push(getRadarSeriesColor(options, items[g], g));
			}
		} else {
			for (g = 0; g < seriesGroups.length; g++) {
				parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
				if (!parentNode || !parentNode.STAdata)
					continue;
				data = parentNode.STAdata;
				seriesLabel = seriesGroups[g].seriesLabel || options.seriesLabel;
				sums = new Array(axes.length).fill(0);
				counts = new Array(axes.length).fill(0);
				for (i = 0; i < data.length; i++) {
					record = data[i];
					if (radarCellText(record[seriesLabel]) != radarCellText(seriesGroups[g].item))
						continue;
					for (c = 0; c < axes.length; c++) {
						value = parseFloat(record[axes[c]]);
						if (!isNaN(value)) {
							sums[c] += value;
							counts[c]++;
						}
					}
				}
				itemKey = seriesGroups[g].legendText || seriesGroups[g].item || ("Series " + (g + 1));
				seriesNames.push(itemKey);
				seriesKeys.push(itemKey);
				seriesData.push(sums.map(function (sum, a) { return meanOrMissing(sum, counts[a], skipMissing); }));
				seriesColors.push(getRadarSeriesColor(options, itemKey, g, seriesGroups[g].color));
			}
		}
	} else {
		axisX = document.getElementById("DialogRadarPlotAxisXSelect") ? document.getElementById("DialogRadarPlotAxisXSelect").value : "";
		options.axisX = axisX;
		if (!axisX) {
			if (event)
				alert(DonaCadena({cat: "Seleccioneu una columna de categories.", spa: "Seleccione una columna de categorÃ­as.", eng: "Select a categories column."}));
			return;
		}
		if (polar) {
			polarValue = document.getElementById("DialogRadarPlotPolarValueSelect") ? document.getElementById("DialogRadarPlotPolarValueSelect").value : options.polarValueColumn;
			if (!polarValue) {
				if (event)
					alert(DonaCadena({cat: "Seleccioneu una columna de valors.", spa: "Seleccione una columna de valores.", eng: "Select a values column."}));
				return;
			}
			options.polarValueColumn = polarValue;
			labelsFull = getRadarCategoryKeysFromParents(selectedParents, axisX);
			for (i = 0; i < labelsFull.length; i++)
				labels.push(("" + labelsFull[i]).length > 35 ? ("" + labelsFull[i]).substring(0, 32) + "..." : labelsFull[i]);
			if (labels.length < 3) {
				if (event)
					alert(DonaCadenaFmt({cat: "Calen almenys tres categories. N'hi ha {0}.", spa: "Se necesitan al menos tres categorÃ­as. Hay {0}.", eng: "Need at least three categories. Found {0}."}, labels.length));
				return;
			}
			seriesData.push(buildRadarLongSeriesRow(selectedParents, axisX, polarValue, labelsFull, false));
			seriesNames.push(polarValue);
			seriesKeys.push(polarValue);
			seriesColors.push(ColorsForBarPlot[0]);
		} else if (seriesAll) {
			labelsFull = getRadarCategoryKeysFromParents(selectedParents, axisX);
			for (i = 0; i < labelsFull.length; i++)
				labels.push(("" + labelsFull[i]).length > 35 ? ("" + labelsFull[i]).substring(0, 32) + "..." : labelsFull[i]);
			if (labels.length < 3) {
				if (event)
					alert(DonaCadenaFmt({cat: "Un grÃ fic de radar necessita almenys tres categories. La columna seleccionada té {0} valors Ãºnics.", spa: "Un grÃ¡fico de radar necesita al menos tres categorÃ­as. La columna seleccionada tiene {0} valores Ãºnicos.", eng: "A radar chart needs at least three categories. The selected column has {0} unique values."}, labels.length));
				return;
			}
			valueColumns = limitRadarSeriesList(getRadarAutomaticValueColumns(selectedParents, axisX), maxSeries, event);
			for (g = 0; g < valueColumns.length; g++) {
				seriesNames.push(valueColumns[g]);
				seriesKeys.push(valueColumns[g]);
				seriesData.push(buildRadarLongSeriesRow(selectedParents, axisX, valueColumns[g], labelsFull, skipMissing));
				seriesColors.push(getRadarSeriesColor(options, valueColumns[g], g));
			}
		} else {
			labelsFull = [];
			for (g = 0; g < seriesGroups.length; g++) {
				parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
				if (!parentNode || !parentNode.STAdata)
					continue;
				data = parentNode.STAdata;
				for (i = 0; i < data.length; i++) {
					itemKey = data[i][axisX];
					if (labelsFull.indexOf(itemKey) == -1) {
						labelsFull.push(itemKey);
						labels.push(("" + itemKey).length > 35 ? ("" + itemKey).substring(0, 32) + "..." : itemKey);
					}
				}
			}
			if (labels.length < 3) {
				if (event)
					alert(DonaCadenaFmt({cat: "Un grÃ fic de radar necessita almenys tres categories. La columna seleccionada té {0} valors Ãºnics.", spa: "Un grÃ¡fico de radar necesita al menos tres categorÃ­as. La columna seleccionada tiene {0} valores Ãºnicos.", eng: "A radar chart needs at least three categories. The selected column has {0} unique values."}, labels.length));
				return;
			}
			for (g = 0; g < seriesGroups.length; g++) {
				parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
				if (!parentNode || !parentNode.STAdata || !seriesGroups[g].valueColumn)
					continue;
				data = parentNode.STAdata;
				row = new Array(labelsFull.length).fill(0);
				counts = new Array(labelsFull.length).fill(0);
				for (i = 0; i < data.length; i++) {
					record = data[i];
					c = labelsFull.indexOf(record[axisX]);
					if (c == -1)
						continue;
					value = parseFloat(record[seriesGroups[g].valueColumn]);
					if (!isNaN(value)) {
						row[c] += value;
						counts[c]++;
					}
				}
				if (skipMissing) {
					for (c = 0; c < row.length; c++) {
						if (!counts[c])
							row[c] = null;
					}
				}
				itemKey = seriesGroups[g].legendText || seriesGroups[g].valueColumn || ("Series " + (g + 1));
				seriesNames.push(itemKey);
				seriesKeys.push(itemKey);
				seriesData.push(row);
				seriesColors.push(getRadarSeriesColor(options, itemKey, g, seriesGroups[g].color));
			}
		}
	}

	if (!seriesData.length) {
		if (event)
			alert(DonaCadena({cat: "No s'ha pogut crear el grÃ fic amb les columnes seleccionades.", spa: "No se ha podido crear el grÃ¡fico con las columnas seleccionadas.", eng: "Could not create the chart with the selected columns."}));
		return;
	}

	if (normalize)
		normalizeRadarSeries(seriesData.map(function (d) { return { data: d }; }), skipMissing && !polar);

	chartType = polar ? "polarArea" : "radar";
	if (polar) {
		bgColors = [];
		for (i = 0; i < labelsFull.length; i++) {
			bgColors.push(getRadarSliceColor(options, labelsFull[i], i));
			if (isRadarLegendHidden(options, "slice", labelsFull[i]))
				seriesData[0][i] = 0;
		}
		datasets = [{
			label: seriesNames[0],
			data: seriesData[0],
			backgroundColor: bgColors,
			borderWidth: 1
		}];
		legendMode = "slice";
		legendKeys = labelsFull.slice();
		legendLabels = labels.slice();
		legendColors = bgColors.slice();
		chartPlugins = {
			title: { display: title != "", text: title, font: { size: titleFontSize } },
			legend: { display: false },
			labels: {
				render: "value",
				precision: 0,
				showZero: false,
				fontSize: tickFontSize,
				fontColor: "#333333",
				arc: true,
				position: "default",
				overlap: true
			}
		};
	} else {
		datasets = buildRadarDatasets(seriesNames, seriesKeys, seriesData, fill, seriesColors, options, skipMissing);
		legendMode = "series";
		legendKeys = seriesKeys.slice();
		legendLabels = seriesNames.slice();
		legendColors = [];
		for (g = 0; g < seriesKeys.length; g++)
			legendColors.push(getRadarSeriesColor(options, seriesKeys[g], g, seriesColors[g]));
		chartPlugins = {
			title: { display: title != "", text: title, font: { size: titleFontSize } },
			legend: { display: false }
		};
	}

	clearRadarPlotChart();
	RadarPlotChart = new Chart(document.getElementById("DialogRadarPlotVisualizationCanvas"), {
		type: chartType,
		data: { labels: labels, datasets: datasets },
		options: {
			maintainAspectRatio: false,
			resizeDelay: 100,
			plugins: chartPlugins,
			scales: {
				r: buildRadarRadialScale(normalize, beginAtZero, seriesData, tickFontSize, pointLabelFontSize, polar)
			}
		}
	});
	buildRadarPlotLegendHtml(node, legendMode, legendKeys, legendLabels, legendColors);
	options.drawn = true;
	options.legendMode = legendMode;
	networkNodes.update(node);
}

function CloseDialogRadarPlot(event) {
	hideNodeDialog("DialogRadarPlot", event);
}

function radarPlotPngBlobFromDataUrl(dataUrl) {
	var parts, mime, binary, i, bytes;
	if (!dataUrl || dataUrl.indexOf(",") == -1)
		return null;
	parts = dataUrl.split(",");
	mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/png";
	binary = atob(parts[1]);
	bytes = new Uint8Array(binary.length);
	for (i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}

function downloadRadarPlotPngBlob(blob) {
	var url = URL.createObjectURL(blob);
	var link = document.createElement("a");
	link.href = url;
	link.download = "polars-chart.png";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function saveRadarPlotPngBlob(blob) {
	if (window.showSaveFilePicker) {
		window.showSaveFilePicker({
			suggestedName: "polars-chart.png",
			types: [{
				description: "PNG image",
				accept: { "image/png": [".png"] }
			}]
		}).then(function (handle) {
			return handle.createWritable();
		}).then(function (writable) {
			return writable.write(blob).then(function () { return writable.close(); });
		}).catch(function () {
			downloadRadarPlotPngBlob(blob);
		});
		return;
	}
	downloadRadarPlotPngBlob(blob);
}

function buildRadarPlotExportCanvas(chartCanvas, backgroundMode) {
	var legend = RadarPlotLastLegend;
	var gap = 24;
	var legendWidth = 220;
	var radarNode = getNodeDialog("DialogRadarPlot");
	var legendSize = (radarNode && radarNode.radarPlotOptions && radarNode.radarPlotOptions.legendFontSize) ? radarNode.radarPlotOptions.legendFontSize : 12;
	var rowH = chartLegendRowHeight(legendSize);
	var padTop = 12;
	var swatch = 14;
	var margin = (backgroundMode == "transparent") ? 0 : 24;
	var chartW = chartCanvas.width;
	var chartH = chartCanvas.height;
	var n = (legend && legend.labels) ? legend.labels.length : 0;
	var legendBlockH = padTop + Math.max(n, 1) * rowH + 12;
	var contentH = Math.max(chartH, legendBlockH);
	var outW = margin + chartW + gap + legendWidth + margin;
	var outH = margin + contentH + margin;
	var out = document.createElement("canvas");
	var ctx, i, y, x0, label, color, hidden, legendOffsetY, tw, chartY;
	out.width = outW;
	out.height = outH;
	ctx = out.getContext("2d");
	if (backgroundMode != "transparent") {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, outW, outH);
	} else {
		ctx.clearRect(0, 0, outW, outH);
	}
	chartY = margin + Math.max(0, (contentH - chartH) / 2);
	ctx.drawImage(chartCanvas, margin, chartY);
	if (!n)
		return out;
	x0 = margin + chartW + gap;
	legendOffsetY = margin + Math.max(0, (contentH - legendBlockH) / 2);
	ctx.font = legendSize + "px sans-serif";
	ctx.textBaseline = "middle";
	for (i = 0; i < n; i++) {
		y = legendOffsetY + padTop + i * rowH + rowH / 2;
		color = legend.colors[i] || "#888888";
		label = "" + (legend.labels[i] || "");
		hidden = !!(legend.hidden && legend.hidden[i]);
		ctx.globalAlpha = hidden ? 0.4 : 1;
		ctx.fillStyle = color;
		ctx.fillRect(x0, y - swatch / 2, swatch, swatch);
		ctx.strokeStyle = "#666666";
		ctx.strokeRect(x0 + 0.5, y - swatch / 2 + 0.5, swatch - 1, swatch - 1);
		ctx.fillStyle = "#222222";
		ctx.fillText(label, x0 + swatch + 8, y);
		if (hidden) {
			tw = ctx.measureText(label).width;
			ctx.beginPath();
			ctx.strokeStyle = "#222222";
			ctx.moveTo(x0 + swatch + 8, y);
			ctx.lineTo(x0 + swatch + 8 + tw, y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}
	return out;
}

function SaveRadarPlot(event) {
	var canvas, exportCanvas, useWhite;
	if (event)
		event.preventDefault();
	canvas = RadarPlotChart && RadarPlotChart.canvas ? RadarPlotChart.canvas : document.getElementById("DialogRadarPlotVisualizationCanvas");
	if (!RadarPlotChart || !canvas) {
		alert(DonaCadena({cat: "Dibuixeu primer el grÃ fic.", spa: "Dibuje primero el grÃ¡fico.", eng: "Draw the chart first."}));
		return;
	}
	useWhite = confirm(DonaCadena({
		cat: "Voleu fons blanc al PNG?\n\nD'acord = fons blanc\nCancelÂ·la = fons transparent",
		spa: "Â¿Quiere fondo blanco en el PNG?\n\nAceptar = fondo blanco\nCancelar = fondo transparente",
		eng: "White background for the PNG?\n\nOK = white background\nCancel = transparent background"
	}));
	function onBlob(blob) {
		if (!blob) {
			alert(DonaCadena({cat: "No s'ha pogut desar la imatge del grÃ fic.", spa: "No se ha podido guardar la imagen del grÃ¡fico.", eng: "The chart image could not be saved."}));
			return;
		}
		saveRadarPlotPngBlob(blob);
	}
	try {
		exportCanvas = buildRadarPlotExportCanvas(canvas, useWhite ? "white" : "transparent");
		if (exportCanvas.toBlob) {
			exportCanvas.toBlob(function (blob) {
				if (blob) {
					onBlob(blob);
					return;
				}
				try {
					onBlob(radarPlotPngBlobFromDataUrl(exportCanvas.toDataURL("image/png")));
				} catch (e) {
					alert(DonaCadena({cat: "No s'ha pogut desar la imatge del grÃ fic.", spa: "No se ha podido guardar la imagen del grÃ¡fico.", eng: "The chart image could not be saved."}));
				}
			}, "image/png");
			return;
		}
		onBlob(radarPlotPngBlobFromDataUrl(exportCanvas.toDataURL("image/png")));
	} catch (e) {
		alert(DonaCadena({cat: "No s'ha pogut desar la imatge del grÃ fic.", spa: "No se ha podido guardar la imagen del grÃ¡fico.", eng: "The chart image could not be saved."}));
	}
}

/* ---------- Circular Chart (pie / doughnut) ---------- */

var CircularChartInstance = null;
var CircularChartLastLegend = null;

var circularChartCenterTextPlugin = {
	id: "centerText",
	beforeDraw: function (chart) {
		var opts = chart.options && chart.options.plugins && chart.options.plugins.centerText;
		var text, ctx, area;
		if (!opts || !opts.display || !opts.text)
			return;
		text = "" + opts.text;
		if (!text.length)
			return;
		area = chart.chartArea;
		if (!area)
			return;
		ctx = chart.ctx;
		ctx.save();
		ctx.font = opts.font || "bold 16px sans-serif";
		ctx.fillStyle = opts.color || "#333";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, (area.left + area.right) / 2, (area.top + area.bottom) / 2);
		ctx.restore();
	}
};

function clearCircularChart() {
	var canvas, existing, legend;
	if (CircularChartInstance) {
		CircularChartInstance.destroy();
		CircularChartInstance = null;
	}
	canvas = document.getElementById("DialogCircularChartVisualizationCanvas");
	if (canvas && typeof Chart !== "undefined" && Chart.getChart) {
		existing = Chart.getChart(canvas);
		if (existing)
			existing.destroy();
	}
	legend = document.getElementById("DialogCircularChartLegend");
	if (legend)
		legend.innerHTML = "";
	CircularChartLastLegend = null;
	hideCircularColorCard();
}

function showEmptyCircularChart() {
	showEmptyChartPlaceholder("DialogCircularChartVisualizationCanvas", {
		type: isCircularChartDoughnut() ? "doughnut" : "pie",
		data: {
			labels: [""],
			datasets: [{ data: [1], backgroundColor: ["#eeeeee"], borderColor: "#d0d0d0", borderWidth: 1 }]
		}
	});
}

function circularChartTruncateLabel(value) {
	var s = "" + value;
	if (s.length > 35)
		return s.substring(0, 32) + "...";
	return s;
}

function getCircularChartSeriesMode(options) {
	if (!options)
		return "all";
	if (options.seriesMode == "series" || options.seriesMode == "all")
		return options.seriesMode;
	if (options.seriesGroups && options.seriesGroups.length)
		return "series";
	return "all";
}

function isCircularChartSeriesModeAll() {
	var allRadio = document.getElementById("DialogCircularChartSeriesModeAll");
	return !allRadio || allRadio.checked;
}

function isCircularChartDoughnut() {
	var radio = document.getElementById("DialogCircularChartTypeDoughnut");
	return !!(radio && radio.checked);
}

function applyCircularChartTypeDisplay() {
	var label = document.getElementById("DialogCircularChartCenterTextLabel");
	if (label)
		label.style.display = isCircularChartDoughnut() ? "" : "none";
}

function toggleCircularChartType() {
	applyCircularChartTypeDisplay();
	if (!CircularChartInstance)
		showEmptyCircularChart();
}

function applyCircularChartSeriesModeDisplay(seriesMode) {
	var allPanel = document.getElementById("DialogCircularChartAllPanel");
	var manual = document.getElementById("DialogCircularChartSeriesManual");
	var allOn = seriesMode != "series";
	if (allPanel)
		allPanel.style.display = allOn ? "" : "none";
	if (manual)
		manual.style.display = allOn ? "none" : "";
}

function collectCircularParentNodesInfo(parentNodes) {
	return collectRadarParentNodesInfo(parentNodes);
}

function getCircularSharedDataAttributes(parentNodes) {
	return getRadarSharedDataAttributes(parentNodes);
}

function createDefaultCircularSeriesGroup(parentId, seriesGroups) {
	var parentNode = networkNodes.get(parentId);
	var data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
	var attrs = parentNode ? (parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data)) : null;
	var attrKeys = attrs ? Object.keys(attrs) : [];
	var numericNames = attrs ? getNumericAttributeNames(attrs) : [];
	var usedColumns = [], i;
	seriesGroups = seriesGroups || [];
	for (i = 0; i < seriesGroups.length; i++) {
		if (seriesGroups[i].valueColumn)
			usedColumns.push(seriesGroups[i].valueColumn);
	}
	var axisX = guessRadarSeriesLabel(attrs) || (attrKeys.length ? attrKeys[0] : "");
	var valueColumn = nextUnusedRadarChoice(numericNames.length ? numericNames : attrKeys, usedColumns);
	return {
		nodeSelected: parentId,
		axisX: axisX,
		valueColumn: valueColumn,
		classificationColumn: "",
		color: ColorsForBarPlot[seriesGroups.length % ColorsForBarPlot.length],
		legendText: valueColumn || ("Series " + (seriesGroups.length + 1))
	};
}

function ensureCircularChartSeriesState(node, parentNodes) {
	var parentInfo = collectCircularParentNodesInfo(parentNodes);
	var parentIds = Object.keys(parentInfo);
	var firstParent, dataAttributes, group, attrs;
	node.circularChartParentNodes = parentInfo;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	if (!parentIds.length)
		return parentInfo;
	firstParent = networkNodes.get(parentIds[0]);
	dataAttributes = firstParent.STAdataAttributes ? firstParent.STAdataAttributes : getDataAttributes(firstParent.STAdata);
	node.circularChartOptions.seriesMode = getCircularChartSeriesMode(node.circularChartOptions);
	if (!node.circularChartOptions.nodeSelected || !parentInfo[node.circularChartOptions.nodeSelected])
		node.circularChartOptions.nodeSelected = parentIds[0];
	if (!node.circularChartOptions.axisX)
		node.circularChartOptions.axisX = guessRadarSeriesLabel(dataAttributes) || (Object.keys(dataAttributes)[0] || "");
	if (!node.circularChartOptions.valueColumn) {
		attrs = getNumericAttributeNames(dataAttributes);
		node.circularChartOptions.valueColumn = attrs.length ? attrs[0] : (Object.keys(dataAttributes)[0] || "");
	}
	if (typeof node.circularChartOptions.classificationColumn === "undefined")
		node.circularChartOptions.classificationColumn = "";
	if (node.circularChartOptions.seriesMode == "series" && (!node.circularChartOptions.seriesGroups || !node.circularChartOptions.seriesGroups.length)) {
		group = createDefaultCircularSeriesGroup(parentIds[0], []);
		if (node.circularChartOptions.axisX)
			group.axisX = node.circularChartOptions.axisX;
		if (node.circularChartOptions.valueColumn) {
			group.valueColumn = node.circularChartOptions.valueColumn;
			group.legendText = node.circularChartOptions.valueColumn;
		}
		node.circularChartOptions.seriesGroups = [group];
	}
	return parentInfo;
}

function ensureCircularManualSeriesGroup(node) {
	var parentIds;
	if (!node)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	if (node.circularChartOptions.seriesGroups && node.circularChartOptions.seriesGroups.length)
		return;
	parentIds = Object.keys(node.circularChartParentNodes || {});
	if (!parentIds.length)
		return;
	node.circularChartOptions.seriesGroups = [createDefaultCircularSeriesGroup(parentIds[0], [])];
}

function toggleCircularChartSeriesMode() {
	var node = getNodeDialog("DialogCircularChart");
	var seriesMode = isCircularChartSeriesModeAll() ? "all" : "series";
	if (node) {
		if (!node.circularChartOptions)
			node.circularChartOptions = {};
		node.circularChartOptions.seriesMode = seriesMode;
		if (seriesMode == "series")
			ensureCircularManualSeriesGroup(node);
		networkNodes.update(node);
	}
	applyCircularChartSeriesModeDisplay(seriesMode);
	if (seriesMode == "series" && node)
		createDialogWithSelectWithGroupsCircularChart(node);
}

function populateCircularChartAllNodeSelect(parentInfo, selectedId) {
	var span = document.getElementById("DialogCircularChartAllNode");
	var parentIds, cdns, i, id;
	if (!span)
		return;
	parentIds = Object.keys(parentInfo || {});
	cdns = '<select id="DialogCircularChartAllNodeSelect" onchange="onCircularChartAllNodeChange()">';
	for (i = 0; i < parentIds.length; i++) {
		id = parentIds[i];
		cdns += '<option value="' + ("" + id).replace(/"/g, "&quot;") + '"' +
			(id == selectedId ? ' selected="selected"' : "") + ">" +
			("" + (parentInfo[id].nodeLabel || id)).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
			"</option>";
	}
	cdns += "</select>";
	span.innerHTML = cdns;
}

function onCircularChartAllNodeChange() {
	var node = getNodeDialog("DialogCircularChart");
	var select = document.getElementById("DialogCircularChartAllNodeSelect");
	var parentNode, dataAttributes;
	if (!node || !select)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	node.circularChartOptions.nodeSelected = select.value;
	parentNode = networkNodes.get(select.value);
	if (!parentNode || !parentNode.STAdata)
		return;
	dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata);
	PopulateSelectSaveLayerDialog("DialogCircularChartAllAxisX", dataAttributes, node.circularChartOptions.axisX || guessRadarSeriesLabel(dataAttributes));
	PopulateSelectSaveLayerDialog("DialogCircularChartAllValue", dataAttributes, node.circularChartOptions.valueColumn || (getNumericAttributeNames(dataAttributes)[0] || ""));
	PopulateSelectSaveLayerDialog("DialogCircularChartAllClassification", dataAttributes, node.circularChartOptions.classificationColumn || "");
	networkNodes.update(node);
}

function getCircularParentAttrNames(parentId) {
	var parentNode = networkNodes.get(parentId);
	var data, attrs;
	if (!parentNode || !parentNode.STAdata)
		return [];
	data = parentNode.STAdata;
	attrs = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
	return Object.keys(attrs);
}

function createDialogWithSelectWithGroupsCircularChart(node) {
	var container = document.getElementById("DialogCircularChartSeriesDiv");
	var toolbar = document.getElementById("DialogCircularChartSeriesToolbar");
	var groups, parentInfo, parentIds, cdns, i, p, parentId, attrNames;
	if (!container)
		return;
	groups = node.circularChartOptions && node.circularChartOptions.seriesGroups ? node.circularChartOptions.seriesGroups : [];
	parentInfo = node.circularChartParentNodes || {};
	parentIds = Object.keys(parentInfo);
	if (toolbar)
		toolbar.innerHTML = '<button type="button" onclick="addNewSelectGroupInCircularChart(\'' + node.id + '\')">' + DonaCadena({cat: "Afegeix una Sèrie nova", spa: "AÃ±adir una serie nueva", eng: "Add new series"}) + "</button>";
	cdns = "";
	for (i = 0; i < groups.length; i++) {
		parentId = getRadarSeriesParentId(groups[i], parentInfo);
		if (parentId && groups[i].nodeSelected != parentId)
			groups[i].nodeSelected = parentId;
		attrNames = getCircularParentAttrNames(parentId);
		if (attrNames.indexOf(groups[i].axisX) == -1)
			groups[i].axisX = attrNames.length ? attrNames[0] : "";
		if (attrNames.indexOf(groups[i].valueColumn) == -1)
			groups[i].valueColumn = attrNames.length ? attrNames[Math.min(1, attrNames.length - 1)] : "";
		if (typeof groups[i].classificationColumn === "undefined")
			groups[i].classificationColumn = "";
		else if (groups[i].classificationColumn && attrNames.indexOf(groups[i].classificationColumn) == -1)
			groups[i].classificationColumn = "";
		if (!groups[i].legendText)
			groups[i].legendText = groups[i].valueColumn || ("Series " + (i + 1));

		cdns += "<fieldset><legend>" + DonaCadenaFmt({cat: "Font {0}", spa: "Fuente {0}", eng: "Source {0}"}, (i + 1)) + "</legend>";
		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "Dades de:", spa: "Datos de:", eng: "Data from:"}) + ' <select id="DialogCircularChartNodeSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'nodeSelected\',\'select\',\'DialogCircularChartNodeSelect_' + i + '\',\'' + node.id + '\')">';
		for (p = 0; p < parentIds.length; p++) {
			cdns += '<option value="' + ("" + parentIds[p]).replace(/"/g, "&quot;") + '"' +
				(parentIds[p] == parentId ? ' selected="selected"' : "") + ">" +
				("" + (parentInfo[parentIds[p]].nodeLabel || parentIds[p])).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
				"</option>";
		}
		cdns += "</select></label></div>";

		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "Categories:", spa: "CategorÃ­as:", eng: "Categories:"}) + ' <select id="DialogCircularChartAxisXSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'axisX\',\'select\',\'DialogCircularChartAxisXSelect_' + i + '\',\'' + node.id + '\')">';
		for (p = 0; p < attrNames.length; p++)
			cdns += radarHtmlOption(attrNames[p], attrNames[p] == groups[i].axisX);
		cdns += "</select></label></div>";

		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "Valors:", spa: "Valores:", eng: "Values:"}) + ' <select id="DialogCircularChartValueSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'valueColumn\',\'select\',\'DialogCircularChartValueSelect_' + i + '\',\'' + node.id + '\')">';
		for (p = 0; p < attrNames.length; p++)
			cdns += radarHtmlOption(attrNames[p], attrNames[p] == groups[i].valueColumn);
		cdns += "</select></label></div>";

		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "ClassificaciÃ³ (opcional):", spa: "ClasificaciÃ³n (opcional):", eng: "Classification (optional):"}) + ' <select id="DialogCircularChartClassSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'classificationColumn\',\'select\',\'DialogCircularChartClassSelect_' + i + '\',\'' + node.id + '\')">';
		cdns += '<option value=""' + (!groups[i].classificationColumn ? ' selected="selected"' : "") + "></option>";
		for (p = 0; p < attrNames.length; p++)
			cdns += radarHtmlOption(attrNames[p], attrNames[p] == groups[i].classificationColumn);
		cdns += "</select></label></div>";

		cdns += '<button type="button" class="DialogCircularChartSeriesRemove" onclick="deleteSelectGroupInCircularChart(\'' + node.id + '\', \'' + i + '\')"><img src="trash.png" alt="Remove" title="Remove"></button>';
		cdns += "</fieldset>";
	}
	container.innerHTML = cdns;
}

function addNewSelectGroupInCircularChart(nodeId) {
	if (typeof event !== "undefined" && event)
		event.preventDefault();
	var node = networkNodes.get(nodeId);
	var parentIds;
	if (!node)
		return;
	parentIds = Object.keys(node.circularChartParentNodes || {});
	if (!parentIds.length)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	if (!node.circularChartOptions.seriesGroups)
		node.circularChartOptions.seriesGroups = [];
	if (node.circularChartOptions.seriesGroups.length >= 20) {
		alert(DonaCadena({cat: "Massa Sèries (20). Suprimiu-ne una abans d'afegir-ne una altra.", spa: "Demasiadas series (20). Elimine una antes de aÃ±adir otra.", eng: "Too many series (20). Remove one before adding another."}));
		return;
	}
	node.circularChartOptions.seriesGroups.push(createDefaultCircularSeriesGroup(parentIds[0], node.circularChartOptions.seriesGroups));
	networkNodes.update(node);
	createDialogWithSelectWithGroupsCircularChart(node);
}

function deleteSelectGroupInCircularChart(nodeId, groupToDelete) {
	if (typeof event !== "undefined" && event)
		event.preventDefault();
	var node = networkNodes.get(nodeId);
	if (!node || !node.circularChartOptions || !node.circularChartOptions.seriesGroups)
		return;
	node.circularChartOptions.seriesGroups.splice(parseInt(groupToDelete), 1);
	networkNodes.update(node);
	createDialogWithSelectWithGroupsCircularChart(node);
}

function updateSelectInformationCircularChart(numberDialog, keyToChange, typeOfSelector, elementName, nodeId) {
	var node = networkNodes.get(nodeId), value, element, previous, attrNames;
	element = document.getElementById(elementName);
	if (!node || !node.circularChartOptions || !node.circularChartOptions.seriesGroups || !element)
		return;
	if (typeOfSelector == "select")
		value = element.options[element.selectedIndex].value;
	else
		value = element.value;

	previous = node.circularChartOptions.seriesGroups[numberDialog][keyToChange];
	node.circularChartOptions.seriesGroups[numberDialog][keyToChange] = value;

	if ((keyToChange == "valueColumn" || keyToChange == "axisX") && (!node.circularChartOptions.seriesGroups[numberDialog].legendText || node.circularChartOptions.seriesGroups[numberDialog].legendText == previous))
		node.circularChartOptions.seriesGroups[numberDialog].legendText = value;

	if (keyToChange == "nodeSelected") {
		attrNames = getCircularParentAttrNames(value);
		if (attrNames.indexOf(node.circularChartOptions.seriesGroups[numberDialog].axisX) == -1)
			node.circularChartOptions.seriesGroups[numberDialog].axisX = attrNames.length ? attrNames[0] : "";
		if (attrNames.indexOf(node.circularChartOptions.seriesGroups[numberDialog].valueColumn) == -1)
			node.circularChartOptions.seriesGroups[numberDialog].valueColumn = attrNames.length ? attrNames[Math.min(1, attrNames.length - 1)] : "";
		if (node.circularChartOptions.seriesGroups[numberDialog].classificationColumn && attrNames.indexOf(node.circularChartOptions.seriesGroups[numberDialog].classificationColumn) == -1)
			node.circularChartOptions.seriesGroups[numberDialog].classificationColumn = "";
	}
	networkNodes.update(node);
	createDialogWithSelectWithGroupsCircularChart(node);
}

function buildCircularRingSums(data, axisX, valueColumn, labelsFull, classificationColumn, classificationValue) {
	var sums = new Array(labelsFull.length).fill(0);
	var i, record, key, idx, value, classText;
	if (!data || !axisX || !valueColumn)
		return sums;
	for (i = 0; i < data.length; i++) {
		record = data[i];
		if (classificationColumn) {
			classText = radarCellText(record[classificationColumn]);
			if (classText != classificationValue)
				continue;
		}
		key = record[axisX];
		idx = labelsFull.indexOf(key);
		if (idx == -1)
			continue;
		value = parseFloat(record[valueColumn]);
		if (!isNaN(value))
			sums[idx] += value;
	}
	return sums;
}

function collectCircularCategoryKeys(data, axisX, classificationColumn, classificationValue) {
	var keys = [], i, record, key, classText;
	if (!data || !axisX)
		return keys;
	for (i = 0; i < data.length; i++) {
		record = data[i];
		if (classificationColumn) {
			classText = radarCellText(record[classificationColumn]);
			if (classificationValue !== null && classText != classificationValue)
				continue;
		}
		key = record[axisX];
		if (keys.indexOf(key) == -1)
			keys.push(key);
	}
	return keys;
}

function ensureCircularChartStyleState(options) {
	if (!options.sliceColors)
		options.sliceColors = {};
	if (!options.ringColors)
		options.ringColors = {};
	if (!options.hiddenSlices)
		options.hiddenSlices = [];
	if (!options.hiddenRings)
		options.hiddenRings = [];
	if (typeof options.labelFontSize !== "number" || isNaN(options.labelFontSize))
		options.labelFontSize = 11;
	if (!options.labelFontColor)
		options.labelFontColor = "#ffffff";
	if (typeof options.titleFontSize !== "number" || isNaN(options.titleFontSize))
		options.titleFontSize = 16;
	if (typeof options.centerTextFontSize !== "number" || isNaN(options.centerTextFontSize))
		options.centerTextFontSize = 16;
	if (typeof options.legendFontSize !== "number" || isNaN(options.legendFontSize))
		options.legendFontSize = 12;
}

function clampCircularFontSize(n, min, max, fallback) {
	n = parseInt(n, 10);
	if (isNaN(n))
		n = fallback;
	if (n < min)
		n = min;
	if (n > max)
		n = max;
	return n;
}

function getCircularLabelFontSize() {
	var el = document.getElementById("DialogCircularChartLabelSize");
	return clampCircularFontSize(el ? el.value : 11, 8, 28, 11);
}

function getCircularTitleFontSize() {
	var el = document.getElementById("DialogCircularChartTitleSize");
	return clampCircularFontSize(el ? el.value : 16, 10, 36, 16);
}

function getCircularCenterTextFontSize() {
	var el = document.getElementById("DialogCircularChartCenterTextSize");
	return clampCircularFontSize(el ? el.value : 16, 10, 48, 16);
}

function getCircularLabelFontColor() {
	var el = document.getElementById("DialogCircularChartLabelColor");
	return (el && el.value) ? el.value : "#ffffff";
}

function getCircularLegendFontSize() {
	var el = document.getElementById("DialogCircularChartLegendSize");
	return clampCircularFontSize(el ? el.value : 12, 8, 28, 12);
}

function syncCircularLabelStyleControls(options) {
	var sizeEl = document.getElementById("DialogCircularChartLabelSize");
	var sizeVal = document.getElementById("DialogCircularChartLabelSizeValue");
	var colorEl = document.getElementById("DialogCircularChartLabelColor");
	var titleSizeEl = document.getElementById("DialogCircularChartTitleSize");
	var titleSizeVal = document.getElementById("DialogCircularChartTitleSizeValue");
	var centerSizeEl = document.getElementById("DialogCircularChartCenterTextSize");
	var centerSizeVal = document.getElementById("DialogCircularChartCenterTextSizeValue");
	var legendSizeEl = document.getElementById("DialogCircularChartLegendSize");
	var legendSizeVal = document.getElementById("DialogCircularChartLegendSizeValue");
	var size, titleSize, centerSize, legendSize;
	if (!options)
		options = {};
	size = (typeof options.labelFontSize === "number" && !isNaN(options.labelFontSize)) ? options.labelFontSize : 11;
	titleSize = (typeof options.titleFontSize === "number" && !isNaN(options.titleFontSize)) ? options.titleFontSize : 16;
	centerSize = (typeof options.centerTextFontSize === "number" && !isNaN(options.centerTextFontSize)) ? options.centerTextFontSize : 16;
	if (sizeEl)
		sizeEl.value = size;
	if (sizeVal)
		sizeVal.textContent = "" + size;
	if (colorEl)
		colorEl.value = options.labelFontColor || "#ffffff";
	if (titleSizeEl)
		titleSizeEl.value = titleSize;
	if (titleSizeVal)
		titleSizeVal.textContent = "" + titleSize;
	if (centerSizeEl)
		centerSizeEl.value = centerSize;
	if (centerSizeVal)
		centerSizeVal.textContent = "" + centerSize;
	legendSize = (typeof options.legendFontSize === "number" && !isNaN(options.legendFontSize)) ? options.legendFontSize : 12;
	if (legendSizeEl)
		legendSizeEl.value = legendSize;
	if (legendSizeVal)
		legendSizeVal.textContent = "" + legendSize;
}

function onCircularLabelStyleChange(redraw) {
	var node = getNodeDialog("DialogCircularChart");
	var size = getCircularLabelFontSize();
	var color = getCircularLabelFontColor();
	var sizeVal = document.getElementById("DialogCircularChartLabelSizeValue");
	if (sizeVal)
		sizeVal.textContent = "" + size;
	if (node) {
		if (!node.circularChartOptions)
			node.circularChartOptions = {};
		ensureCircularChartStyleState(node.circularChartOptions);
		node.circularChartOptions.labelFontSize = size;
		node.circularChartOptions.labelFontColor = color;
		networkNodes.update(node);
	}
	if (redraw && node && node.circularChartOptions && node.circularChartOptions.drawn)
		DrawCircularChart();
}

function onCircularTitleStyleChange(redraw) {
	var node = getNodeDialog("DialogCircularChart");
	var size = getCircularTitleFontSize();
	var sizeVal = document.getElementById("DialogCircularChartTitleSizeValue");
	if (sizeVal)
		sizeVal.textContent = "" + size;
	if (node) {
		if (!node.circularChartOptions)
			node.circularChartOptions = {};
		ensureCircularChartStyleState(node.circularChartOptions);
		node.circularChartOptions.titleFontSize = size;
		networkNodes.update(node);
	}
	if (redraw && node && node.circularChartOptions && node.circularChartOptions.drawn)
		DrawCircularChart();
}

function onCircularCenterTextStyleChange(redraw) {
	var node = getNodeDialog("DialogCircularChart");
	var size = getCircularCenterTextFontSize();
	var sizeVal = document.getElementById("DialogCircularChartCenterTextSizeValue");
	if (sizeVal)
		sizeVal.textContent = "" + size;
	if (node) {
		if (!node.circularChartOptions)
			node.circularChartOptions = {};
		ensureCircularChartStyleState(node.circularChartOptions);
		node.circularChartOptions.centerTextFontSize = size;
		networkNodes.update(node);
	}
	if (redraw && node && node.circularChartOptions && node.circularChartOptions.drawn)
		DrawCircularChart();
}

function onCircularLegendStyleChange(redraw) {
	var node = getNodeDialog("DialogCircularChart");
	var size = getCircularLegendFontSize();
	var sizeVal = document.getElementById("DialogCircularChartLegendSizeValue");
	if (sizeVal)
		sizeVal.textContent = "" + size;
	if (node) {
		if (!node.circularChartOptions)
			node.circularChartOptions = {};
		ensureCircularChartStyleState(node.circularChartOptions);
		node.circularChartOptions.legendFontSize = size;
		networkNodes.update(node);
		applyChartLegendFontSize("DialogCircularChartLegend", size);
	}
	if (redraw && node && node.circularChartOptions && node.circularChartOptions.drawn)
		DrawCircularChart();
}

function circularChartEscapeAttr(s) {
	return ("" + s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function circularChartEscapeJs(s) {
	return ("" + s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getCircularSliceColor(options, labelKey, index) {
	if (options.sliceColors && options.sliceColors[labelKey])
		return options.sliceColors[labelKey];
	return ColorsForBarPlot[index % ColorsForBarPlot.length];
}

function getCircularRingColor(options, ringKey, index, fallback) {
	if (options.ringColors && options.ringColors[ringKey])
		return options.ringColors[ringKey];
	if (fallback)
		return fallback;
	return ColorsForBarPlot[index % ColorsForBarPlot.length];
}

function isCircularLegendHidden(options, mode, key) {
	var list = mode == "slice" ? options.hiddenSlices : options.hiddenRings;
	return list && list.indexOf(key) != -1;
}

function hideCircularColorCard() {
	var card = document.getElementById("DialogCircularChartColorCard");
	if (card)
		card.style.display = "none";
}

function onCircularChartTitleChange() {
	var node = getNodeDialog("DialogCircularChart");
	var titleEl = document.getElementById("DialogCircularChartTitleInput");
	var title = titleEl ? (titleEl.value || "") : "";
	if (!node)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	node.circularChartOptions.title = title;
	node.circularChartOptions.titleFontSize = getCircularTitleFontSize();
	networkNodes.update(node);
	if (node.circularChartOptions.drawn)
		DrawCircularChart();
}

function onCircularChartCenterTextChange() {
	var node = getNodeDialog("DialogCircularChart");
	var el = document.getElementById("DialogCircularChartCenterText");
	var text = el ? (el.value || "") : "";
	if (!node)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	node.circularChartOptions.centerText = text;
	node.circularChartOptions.centerTextFontSize = getCircularCenterTextFontSize();
	networkNodes.update(node);
	if (node.circularChartOptions.drawn)
		DrawCircularChart();
}

function buildCircularChartLegendHtml(node, mode, itemKeys, itemLabels, itemColors, ringNames) {
	var container = document.getElementById("DialogCircularChartLegend");
	var options, cdns, i, key, label, color, hidden, eyeTitle, hiddenFlags = [];
	if (!container)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	ensureCircularChartStyleState(node.circularChartOptions);
	options = node.circularChartOptions;
	container.style.fontSize = (options.legendFontSize || 12) + "px";
	cdns = "";
	for (i = 0; i < itemKeys.length; i++) {
		key = itemKeys[i];
		label = itemLabels[i];
		color = itemColors[i];
		hidden = isCircularLegendHidden(options, mode, key);
		hiddenFlags.push(hidden);
		eyeTitle = hidden
			? DonaCadena({cat: "Mostra", spa: "Mostrar", eng: "Show"})
			: DonaCadena({cat: "Amaga", spa: "Ocultar", eng: "Hide"});
		cdns += '<div class="DialogCircularChartLegendItem' + (hidden ? " is-hidden" : "") + '">';
		cdns += '<button type="button" class="DialogCircularChartLegendSwatch" style="background-color:' + circularChartEscapeAttr(color) + ';" title="' +
			DonaCadena({cat: "Canvia el color", spa: "Cambiar el color", eng: "Change color"}) +
			'" onclick="onCircularLegendColorClick(\'' + circularChartEscapeJs(mode) + '\',\'' + circularChartEscapeJs(key) + '\', event)"></button>';
		cdns += '<button type="button" class="DialogCircularChartLegendEye" title="' + circularChartEscapeAttr(eyeTitle) +
			'" onclick="onCircularLegendEyeClick(\'' + circularChartEscapeJs(mode) + '\',\'' + circularChartEscapeJs(key) + '\')">' +
			(hidden ? "&#10005;" : "&#128065;") + "</button>";
		cdns += '<span class="DialogCircularChartLegendLabel" style="font-size:' + (options.legendFontSize || 12) + 'px;">' + circularChartEscapeAttr(label) + "</span>";
		cdns += "</div>";
	}
	if (ringNames && ringNames.length > 1) {
		cdns += '<div class="DialogCircularChartRingsTitle">' +
			DonaCadena({cat: "Corones (de fora a dins):", spa: "Coronas (de fuera a dentro):", eng: "Rings (outer to inner):"}) +
			"</div>";
		for (i = 0; i < ringNames.length; i++) {
			cdns += '<div class="DialogCircularChartRingItem"><span class="DialogCircularChartRingIndex">' + (i + 1) + ".</span> " +
				circularChartEscapeAttr(ringNames[i]) + "</div>";
		}
	}
	container.innerHTML = cdns;
	CircularChartLastLegend = {
		mode: mode,
		keys: itemKeys.slice(),
		labels: itemLabels.slice(),
		colors: itemColors.slice(),
		hidden: hiddenFlags,
		ringNames: ringNames && ringNames.length > 1 ? ringNames.slice() : []
	};
}

function onCircularLegendEyeClick(mode, key) {
	var node = getNodeDialog("DialogCircularChart");
	var list, idx;
	if (!node)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	ensureCircularChartStyleState(node.circularChartOptions);
	list = mode == "slice" ? node.circularChartOptions.hiddenSlices : node.circularChartOptions.hiddenRings;
	idx = list.indexOf(key);
	if (idx == -1)
		list.push(key);
	else
		list.splice(idx, 1);
	networkNodes.update(node);
	hideCircularColorCard();
	DrawCircularChart();
}

function onCircularLegendColorClick(mode, key, evt) {
	var card = document.getElementById("DialogCircularChartColorCard");
	var dialog = document.getElementById("DialogCircularChart");
	var cdns, i, rect, dRect, left, top;
	if (!card || !dialog)
		return;
	if (evt) {
		evt.preventDefault();
		evt.stopPropagation();
	}
	cdns = "";
	for (i = 0; i < ColorsForBarPlot.length; i++) {
		cdns += '<button type="button" class="DialogCircularChartColorCardSwatch" style="background-color:' + ColorsForBarPlot[i] +
			';" title="' + ColorsForBarPlot[i] + '" onclick="applyCircularLegendColor(\'' + circularChartEscapeJs(mode) + '\',\'' +
			circularChartEscapeJs(key) + '\',\'' + ColorsForBarPlot[i] + '\')"></button>';
	}
	cdns += '<label class="DialogCircularChartColorCardCustom">' + DonaCadena({cat: "Personalitzat:", spa: "Personalizado:", eng: "Custom:"}) +
		' <input type="color" value="#1f77b4" onchange="applyCircularLegendColor(\'' + circularChartEscapeJs(mode) + '\',\'' +
		circularChartEscapeJs(key) + '\', this.value)"></label>';
	card.innerHTML = cdns;
	card.style.display = "flex";
	rect = (evt && evt.target && evt.target.getBoundingClientRect) ? evt.target.getBoundingClientRect() : null;
	dRect = dialog.getBoundingClientRect();
	if (rect) {
		left = rect.left - dRect.left;
		top = rect.bottom - dRect.top + 4;
		if (left + 176 > dRect.width)
			left = Math.max(8, dRect.width - 184);
		card.style.left = left + "px";
		card.style.top = top + "px";
	}
}

function applyCircularLegendColor(mode, key, color) {
	var node = getNodeDialog("DialogCircularChart");
	if (!node)
		return;
	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	ensureCircularChartStyleState(node.circularChartOptions);
	if (mode == "slice")
		node.circularChartOptions.sliceColors[key] = color;
	else
		node.circularChartOptions.ringColors[key] = color;
	networkNodes.update(node);
	hideCircularColorCard();
	DrawCircularChart();
}

function circularChartRingDisplayName(sourceLabel, valueColumn, classificationValue) {
	var base = sourceLabel || "";
	if (classificationValue != null && classificationValue !== "") {
		if (base)
			return base + ": " + classificationValue;
		return "" + classificationValue;
	}
	if (base && valueColumn && base != valueColumn)
		return base + ": " + valueColumn;
	return base || valueColumn || "Series";
}

function appendCircularRingsFromSource(data, axisX, valueColumn, classificationColumn, sourceLabel, labelsFull, seriesNames, seriesData, seriesColors, seriesKeys, maxSeries, event) {
	var classValues, g, classVal, ringKey, keys, i, remaining;
	if (!data || !axisX || !valueColumn)
		return;
	remaining = maxSeries - seriesNames.length;
	if (remaining <= 0)
		return;
	if (classificationColumn) {
		classValues = limitRadarSeriesList(getRadarUniqueValues(data, classificationColumn), remaining, event);
		for (g = 0; g < classValues.length; g++) {
			classVal = classValues[g];
			keys = collectCircularCategoryKeys(data, axisX, classificationColumn, classVal);
			for (i = 0; i < keys.length; i++) {
				if (labelsFull.indexOf(keys[i]) == -1)
					labelsFull.push(keys[i]);
			}
		}
		for (g = 0; g < classValues.length; g++) {
			classVal = classValues[g];
			ringKey = circularChartRingDisplayName(sourceLabel, valueColumn, classVal);
			seriesKeys.push(ringKey);
			seriesNames.push(ringKey);
			seriesData.push({ data: data, axisX: axisX, valueColumn: valueColumn, classificationColumn: classificationColumn, classificationValue: classVal });
			seriesColors.push(ColorsForBarPlot[seriesColors.length % ColorsForBarPlot.length]);
		}
	} else {
		keys = collectCircularCategoryKeys(data, axisX, null, null);
		for (i = 0; i < keys.length; i++) {
			if (labelsFull.indexOf(keys[i]) == -1)
				labelsFull.push(keys[i]);
		}
		ringKey = circularChartRingDisplayName(sourceLabel, valueColumn, null);
		seriesKeys.push(ringKey);
		seriesNames.push(ringKey);
		seriesData.push({ data: data, axisX: axisX, valueColumn: valueColumn, classificationColumn: null, classificationValue: null });
		seriesColors.push(ColorsForBarPlot[seriesColors.length % ColorsForBarPlot.length]);
	}
}

function finalizeCircularPendingRings(seriesData, labelsFull) {
	var g, spec;
	for (g = 0; g < seriesData.length; g++) {
		spec = seriesData[g];
		if (spec && spec.data)
			seriesData[g] = buildCircularRingSums(spec.data, spec.axisX, spec.valueColumn, labelsFull, spec.classificationColumn, spec.classificationValue);
	}
}

function DrawCircularChart(event) {
	if (event)
		event.preventDefault();
	var node = getNodeDialog("DialogCircularChart");
	if (!node)
		return;
	var parentNodes = GetParentNodes(node);
	if (!parentNodes || !parentNodes.length)
		return;

	var plotType = isCircularChartDoughnut() ? "doughnut" : "pie";
	var seriesAll = isCircularChartSeriesModeAll();
	var title = document.getElementById("DialogCircularChartTitleInput").value || "";
	var centerText = document.getElementById("DialogCircularChartCenterText").value || "";
	var maxSeries = 20;
	var labelsFull = [], labels = [], seriesNames = [], seriesData = [], seriesColors = [], seriesKeys = [];
	var i, g, parentNode, data, axisX, valueColumn, classificationColumn, classValues, classVal;
	var seriesGroups, backgroundColors, datasets, chartPlugins, labelsPlugin, options;
	var legendMode, legendKeys, legendLabels, legendColors;

	if (!node.circularChartOptions)
		node.circularChartOptions = {};
	ensureCircularChartStyleState(node.circularChartOptions);
	options = node.circularChartOptions;
	seriesGroups = options.seriesGroups || [];
	options.plotType = plotType;
	options.seriesMode = seriesAll ? "all" : "series";
	options.title = title;
	options.centerText = centerText;
	options.labelFontSize = getCircularLabelFontSize();
	options.labelFontColor = getCircularLabelFontColor();
	options.titleFontSize = getCircularTitleFontSize();
	options.centerTextFontSize = getCircularCenterTextFontSize();
	options.legendFontSize = getCircularLegendFontSize();
	syncCircularLabelStyleControls(options);

	if (seriesAll) {
		var nodeSelect = document.getElementById("DialogCircularChartAllNodeSelect");
		var axisXSelect = document.getElementById("DialogCircularChartAllAxisXSelect");
		var valueSelect = document.getElementById("DialogCircularChartAllValueSelect");
		var classSelect = document.getElementById("DialogCircularChartAllClassificationSelect");
		options.nodeSelected = nodeSelect ? nodeSelect.value : options.nodeSelected;
		axisX = axisXSelect ? axisXSelect.value : "";
		valueColumn = valueSelect ? valueSelect.value : "";
		classificationColumn = classSelect ? classSelect.value : "";
		options.axisX = axisX;
		options.valueColumn = valueColumn;
		options.classificationColumn = classificationColumn;

		if (!axisX || !valueColumn) {
			if (event)
				alert(DonaCadena({cat: "Seleccioneu les columnes de categories i de valors.", spa: "Seleccione las columnas de categorÃ­as y de valores.", eng: "Select the categories and values columns."}));
			return;
		}
		parentNode = networkNodes.get(options.nodeSelected);
		if (!parentNode || !parentNode.STAdata) {
			if (event)
				alert(DonaCadena({cat: "No hi ha dades al node seleccionat.", spa: "No hay datos en el nodo seleccionado.", eng: "No data in the selected node."}));
			return;
		}
		data = parentNode.STAdata;
		if (classificationColumn) {
			classValues = limitRadarSeriesList(getRadarUniqueValues(data, classificationColumn), maxSeries, event);
			for (g = 0; g < classValues.length; g++) {
				classVal = classValues[g];
				var keys = collectCircularCategoryKeys(data, axisX, classificationColumn, classVal);
				for (i = 0; i < keys.length; i++) {
					if (labelsFull.indexOf(keys[i]) == -1)
						labelsFull.push(keys[i]);
				}
			}
			for (g = 0; g < classValues.length; g++) {
				classVal = classValues[g];
				seriesKeys.push(classVal);
				seriesNames.push(classVal);
				seriesData.push(buildCircularRingSums(data, axisX, valueColumn, labelsFull, classificationColumn, classVal));
				seriesColors.push(ColorsForBarPlot[g % ColorsForBarPlot.length]);
			}
		} else {
			labelsFull = collectCircularCategoryKeys(data, axisX, null, null);
			seriesKeys.push(valueColumn);
			seriesNames.push(valueColumn);
			seriesData.push(buildCircularRingSums(data, axisX, valueColumn, labelsFull, null, null));
			seriesColors.push(ColorsForBarPlot[0]);
		}
	} else {
		if (!seriesGroups.length) {
			if (event)
				alert(DonaCadena({cat: "Afegiu almenys una Sèrie.", spa: "AÃ±ada al menos una serie.", eng: "Add at least one series."}));
			return;
		}
		options.seriesGroups = seriesGroups;
		for (g = 0; g < seriesGroups.length; g++) {
			parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
			if (!parentNode || !parentNode.STAdata || !seriesGroups[g].axisX || !seriesGroups[g].valueColumn)
				continue;
			var sourceLabel = "";
			if (node.circularChartParentNodes && node.circularChartParentNodes[seriesGroups[g].nodeSelected] && node.circularChartParentNodes[seriesGroups[g].nodeSelected].nodeLabel)
				sourceLabel = node.circularChartParentNodes[seriesGroups[g].nodeSelected].nodeLabel;
			else if (parentNode.label)
				sourceLabel = parentNode.label;
			appendCircularRingsFromSource(
				parentNode.STAdata,
				seriesGroups[g].axisX,
				seriesGroups[g].valueColumn,
				seriesGroups[g].classificationColumn || "",
				sourceLabel,
				labelsFull,
				seriesNames,
				seriesData,
				seriesColors,
				seriesKeys,
				maxSeries,
				event
			);
		}
		finalizeCircularPendingRings(seriesData, labelsFull);
	}

	for (i = 0; i < labelsFull.length; i++)
		labels.push(circularChartTruncateLabel(labelsFull[i]));

	if (!labels.length || !seriesData.length) {
		if (event)
			alert(DonaCadena({cat: "No s'ha pogut crear el grÃ fic amb les columnes seleccionades.", spa: "No se ha podido crear el grÃ¡fico con las columnas seleccionadas.", eng: "Could not create the chart with the selected columns."}));
		return;
	}

	/* Always category/slice legend: color and hide apply to that category in every ring. */
	legendMode = "slice";
	datasets = [];
	for (g = 0; g < seriesData.length; g++) {
		backgroundColors = [];
		for (i = 0; i < labelsFull.length; i++)
			backgroundColors.push(getCircularSliceColor(options, labelsFull[i], i));
		datasets.push({
			label: seriesNames[g],
			data: seriesData[g].slice(),
			backgroundColor: backgroundColors,
			borderColor: "#ffffff",
			borderWidth: seriesData.length > 1 ? 2 : 0
		});
		for (i = 0; i < labelsFull.length; i++) {
			if (isCircularLegendHidden(options, "slice", labelsFull[i]))
				datasets[g].data[i] = 0;
		}
	}

	labelsPlugin = {
		render: "value",
		precision: 0,
		showZero: false,
		fontSize: options.labelFontSize,
		fontColor: options.labelFontColor,
		fontStyle: "normal",
		fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
		arc: true,
		position: "default",
		overlap: true,
		showActualPercentages: seriesData.length == 1,
		outsidePadding: 4,
		textMargin: 4
	};

	chartPlugins = {
		title: {
			display: title != "",
			text: title,
			font: {
				size: options.titleFontSize
			}
		},
		legend: {
			display: false
		},
		labels: labelsPlugin,
		centerText: {
			display: plotType == "doughnut" && centerText.length > 0,
			text: centerText,
			font: "bold " + options.centerTextFontSize + "px sans-serif",
			color: "#333"
		}
	};

	clearCircularChart();
	hideCircularColorCard();
	CircularChartInstance = new Chart(document.getElementById("DialogCircularChartVisualizationCanvas"), {
		type: plotType,
		data: { labels: labels, datasets: datasets },
		options: {
			maintainAspectRatio: false,
			resizeDelay: 100,
			plugins: chartPlugins
		},
		plugins: (plotType == "doughnut" && centerText.length > 0) ? [circularChartCenterTextPlugin] : []
	});

	legendKeys = [];
	legendLabels = [];
	legendColors = [];
	for (i = 0; i < labelsFull.length; i++) {
		legendKeys.push(labelsFull[i]);
		legendLabels.push(labels[i]);
		legendColors.push(getCircularSliceColor(options, labelsFull[i], i));
	}
	buildCircularChartLegendHtml(node, legendMode, legendKeys, legendLabels, legendColors, seriesNames);

	options.drawn = true;
	options.legendMode = legendMode;
	networkNodes.update(node);
}

function CloseDialogCircularChart(event) {
	hideNodeDialog("DialogCircularChart", event);
}

function circularChartPngBlobFromDataUrl(dataUrl) {
	return radarPlotPngBlobFromDataUrl(dataUrl);
}

function downloadCircularChartPngBlob(blob) {
	var url = URL.createObjectURL(blob);
	var link = document.createElement("a");
	link.href = url;
	link.download = "circular-chart.png";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function saveCircularChartPngBlob(blob) {
	if (window.showSaveFilePicker) {
		window.showSaveFilePicker({
			suggestedName: "circular-chart.png",
			types: [{
				description: "PNG image",
				accept: { "image/png": [".png"] }
			}]
		}).then(function (handle) {
			return handle.createWritable();
		}).then(function (writable) {
			return writable.write(blob).then(function () { return writable.close(); });
		}).catch(function () {
			downloadCircularChartPngBlob(blob);
		});
		return;
	}
	downloadCircularChartPngBlob(blob);
}

function buildCircularChartExportCanvas(chartCanvas, backgroundMode) {
	var legend = CircularChartLastLegend;
	var gap = 24;
	var legendWidth = 220;
	var circularNode = getNodeDialog("DialogCircularChart");
	var legendSize = (circularNode && circularNode.circularChartOptions && circularNode.circularChartOptions.legendFontSize) ? circularNode.circularChartOptions.legendFontSize : 12;
	var rowH = chartLegendRowHeight(legendSize);
	var padTop = 12;
	var swatch = 14;
	var margin = (backgroundMode == "transparent") ? 0 : 24;
	var chartW = chartCanvas.width;
	var chartH = chartCanvas.height;
	var n = (legend && legend.labels) ? legend.labels.length : 0;
	var rings = (legend && legend.ringNames) ? legend.ringNames : [];
	var ringsExtra = rings.length ? (10 + rowH + rings.length * rowH) : 0;
	var legendBlockH = padTop + Math.max(n, 1) * rowH + 12 + ringsExtra;
	var contentH = Math.max(chartH, legendBlockH);
	var outW = margin + chartW + gap + legendWidth + margin;
	var outH = margin + contentH + margin;
	var out = document.createElement("canvas");
	var ctx, i, y, x0, label, color, hidden, legendOffsetY, tw, chartY;
	out.width = outW;
	out.height = outH;
	ctx = out.getContext("2d");
	if (backgroundMode != "transparent") {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, outW, outH);
	} else {
		ctx.clearRect(0, 0, outW, outH);
	}
	chartY = margin + Math.max(0, (contentH - chartH) / 2);
	ctx.drawImage(chartCanvas, margin, chartY);
	if (!n && !rings.length)
		return out;
	x0 = margin + chartW + gap;
	legendOffsetY = margin + Math.max(0, (contentH - legendBlockH) / 2);
	ctx.font = legendSize + "px sans-serif";
	ctx.textBaseline = "middle";
	for (i = 0; i < n; i++) {
		y = legendOffsetY + padTop + i * rowH + rowH / 2;
		color = legend.colors[i] || "#888888";
		label = "" + (legend.labels[i] || "");
		hidden = !!(legend.hidden && legend.hidden[i]);
		ctx.globalAlpha = hidden ? 0.4 : 1;
		ctx.fillStyle = color;
		ctx.fillRect(x0, y - swatch / 2, swatch, swatch);
		ctx.strokeStyle = "#666666";
		ctx.strokeRect(x0 + 0.5, y - swatch / 2 + 0.5, swatch - 1, swatch - 1);
		ctx.fillStyle = "#222222";
		ctx.fillText(label, x0 + swatch + 8, y);
		if (hidden) {
			tw = ctx.measureText(label).width;
			ctx.beginPath();
			ctx.strokeStyle = "#222222";
			ctx.moveTo(x0 + swatch + 8, y);
			ctx.lineTo(x0 + swatch + 8 + tw, y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}
	if (rings.length) {
		y = legendOffsetY + padTop + n * rowH + 14;
		ctx.font = "bold 11px sans-serif";
		ctx.fillStyle = "#444444";
		ctx.fillText(DonaCadena({cat: "Corones (foraâ†’dins):", spa: "Coronas (fueraâ†’dentro):", eng: "Rings (outerâ†’inner):"}), x0, y);
		ctx.font = "11px sans-serif";
		ctx.fillStyle = "#222222";
		for (i = 0; i < rings.length; i++) {
			y += rowH;
			ctx.fillText((i + 1) + ". " + rings[i], x0, y);
		}
	}
	return out;
}

function SaveCircularChart(event) {
	var canvas, exportCanvas, useWhite;
	if (event)
		event.preventDefault();
	canvas = CircularChartInstance && CircularChartInstance.canvas ? CircularChartInstance.canvas : document.getElementById("DialogCircularChartVisualizationCanvas");
	if (!CircularChartInstance || !canvas) {
		alert(DonaCadena({cat: "Dibuixeu primer el grÃ fic circular.", spa: "Dibuje primero el grÃ¡fico circular.", eng: "Draw the circular chart first."}));
		return;
	}
	useWhite = confirm(DonaCadena({
		cat: "Voleu fons blanc al PNG?\n\nD'acord = fons blanc\nCancelÂ·la = fons transparent",
		spa: "Â¿Quiere fondo blanco en el PNG?\n\nAceptar = fondo blanco\nCancelar = fondo transparente",
		eng: "White background for the PNG?\n\nOK = white background\nCancel = transparent background"
	}));
	function onBlob(blob) {
		if (!blob) {
			alert(DonaCadena({cat: "No s'ha pogut desar la imatge del grÃ fic.", spa: "No se ha podido guardar la imagen del grÃ¡fico.", eng: "The chart image could not be saved."}));
			return;
		}
		saveCircularChartPngBlob(blob);
	}
	try {
		exportCanvas = buildCircularChartExportCanvas(canvas, useWhite ? "white" : "transparent");
		if (exportCanvas.toBlob) {
			exportCanvas.toBlob(function (blob) {
				if (blob) {
					onBlob(blob);
					return;
				}
				try {
					onBlob(circularChartPngBlobFromDataUrl(exportCanvas.toDataURL("image/png")));
				} catch (e) {
					alert(DonaCadena({cat: "No s'ha pogut desar la imatge del grÃ fic.", spa: "No se ha podido guardar la imagen del grÃ¡fico.", eng: "The chart image could not be saved."}));
				}
			}, "image/png");
			return;
		}
		onBlob(circularChartPngBlobFromDataUrl(exportCanvas.toDataURL("image/png")));
	} catch (e) {
		alert(DonaCadena({cat: "No s'ha pogut desar la imatge del grÃ fic.", spa: "No se ha podido guardar la imagen del grÃ¡fico.", eng: "The chart image could not be saved."}));
	}
}

function DrawImageViewer(event) {
	event.preventDefault(); // We don't want to submit this form
	var node = getNodeDialog("DialogImageViewer");
	var node = GetFirstParentNode(node);
	if (node) {
		var data, dataAttributes, record;
		if (node.STAdata) {
			var urlColumn = document.getElementById("DialogImageViewerURLSelect").value;
			if (!urlColumn) {
				alert(DonaCadena({cat: "Seleccioneu una columna que contingui URL d'imatges", spa: "Seleccione una columna que contenga URL de imÃ¡genes", eng: "Please, select a column that has urls to images in it"}));
				return;
			}
			var labelColumn = document.getElementById("DialogImageViewerLabelSelect").value;
			var size = parseInt(document.getElementById("DialogImageViewerSizeInput").value);
			if (isNaN(size)) {
				alert(DonaCadena({cat: "La mida no és un nombre enter. En el seu lloc, s'utilitzarÃ  200", spa: "El tamaÃ±o no es un nÃºmero entero. En su lugar, se utilizarÃ¡ 200", eng: "Size is not an integer number. Using 200 instead"}));
				size = 200;
			}
			if (size < 2 || size > 2000) {
				alert(DonaCadena({cat: "La mida és fora de l'interval [2,2000]. En el seu lloc, s'utilitzarÃ  200", spa: "El tamaÃ±o estÃ¡ fuera del intervalo [2,2000]. En su lugar, se utilizarÃ¡ 200", eng: "Size is out of the [2,2000] range. Using 200 instead"}));
				size = 200;
			}

			var ncol = Math.floor(900 / (size + 15));
			var cdns = [];
			data = node.STAdata;
			dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);

			cdns.push("<table>");
			for (var i = 0; i < data.length; i++) {
				record = data[i];
				if (i % ncol == 0)
					cdns.push("<tr>");
				cdns.push('<td style="text-align: center;">');
				cdns.push('<a href="', record[urlColumn], '" target="_blank"><img src="', record[urlColumn], '" width="', size, '"></a>');
				if (labelColumn)
					cdns.push('<br><small>', record[labelColumn], '</small>');
				cdns.push('<td>');
				if ((i + 1) % ncol == 0)
					cdns.push("</tr>");
			}
			cdns.push("<table>");
			document.getElementById('DialogImageViewerVisualization').innerHTML = cdns.join("");
		}
	}
}

function CloseDialogImageViewer(event) {
	hideNodeDialog("DialogImageViewer", event);
}

/* ============================================================
   Bar plot (vertical / horizontal / floating / stacked) + error whiskers
   ============================================================ */
var BarPlotGraph2d = null;
var BarPlotLastLegend = null;

var barPlotErrorBarsPlugin = {
	id: "barPlotErrorBars",
	afterDatasetsDraw: function (chart) {
		var ctx = chart.ctx, meta, i, j, pt, yMin, yMax, x, y, half = 4, horiz, ds;
		var errOpts = (chart.options && chart.options.barPlotError) || {};
		var color = errOpts.color || "#333333";
		var dir = errOpts.direction || "both";
		var drawPlus = dir == "both" || dir == "plus";
		var drawMinus = dir == "both" || dir == "minus";
		for (i = 0; i < chart.data.datasets.length; i++) {
			ds = chart.data.datasets[i];
			if (!ds || !ds._errorMin || !ds._errorMax || ds.hidden)
				continue;
			meta = chart.getDatasetMeta(i);
			if (!meta || !meta.data)
				continue;
			horiz = chart.options.indexAxis == "y";
			ctx.save();
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.5;
			for (j = 0; j < meta.data.length; j++) {
				pt = meta.data[j];
				if (!pt || ds._errorMin[j] == null || ds._errorMax[j] == null || isNaN(ds._errorMin[j]) || isNaN(ds._errorMax[j]))
					continue;
				if (horiz) {
					y = pt.y;
					x = pt.x;
					yMin = chart.scales.x.getPixelForValue(ds._errorMin[j]);
					yMax = chart.scales.x.getPixelForValue(ds._errorMax[j]);
					ctx.beginPath();
					if (drawMinus) {
						ctx.moveTo(x, y);
						ctx.lineTo(yMin, y);
						ctx.moveTo(yMin, y - half);
						ctx.lineTo(yMin, y + half);
					}
					if (drawPlus) {
						ctx.moveTo(x, y);
						ctx.lineTo(yMax, y);
						ctx.moveTo(yMax, y - half);
						ctx.lineTo(yMax, y + half);
					}
					ctx.stroke();
				} else {
					x = pt.x;
					y = pt.y;
					yMin = chart.scales.y.getPixelForValue(ds._errorMin[j]);
					yMax = chart.scales.y.getPixelForValue(ds._errorMax[j]);
					ctx.beginPath();
					if (drawMinus) {
						ctx.moveTo(x, y);
						ctx.lineTo(x, yMin);
						ctx.moveTo(x - half, yMin);
						ctx.lineTo(x + half, yMin);
					}
					if (drawPlus) {
						ctx.moveTo(x, y);
						ctx.lineTo(x, yMax);
						ctx.moveTo(x - half, yMax);
						ctx.lineTo(x + half, yMax);
					}
					ctx.stroke();
				}
			}
			ctx.restore();
		}
	}
};

function getBarPlotType() {
	if (document.getElementById("DialogBarPlotTypeHorizontal") && document.getElementById("DialogBarPlotTypeHorizontal").checked)
		return "horizontal";
	if (document.getElementById("DialogBarPlotTypeFloating") && document.getElementById("DialogBarPlotTypeFloating").checked)
		return "floating";
	if (document.getElementById("DialogBarPlotTypeStacked") && document.getElementById("DialogBarPlotTypeStacked").checked)
		return "stacked";
	return "vertical";
}

function collectBarPlotUnionAttrs(parentInfo) {
	var union = {}, ids = Object.keys(parentInfo || {}), i, a, attrs;
	for (i = 0; i < ids.length; i++) {
		attrs = parentInfo[ids[i]].attrs || {};
		for (a in attrs) {
			if (Object.prototype.hasOwnProperty.call(attrs, a))
				union[a] = attrs[a];
		}
	}
	return union;
}

function collectBarPlotParentInfo(parentNodes) {
	var info = {}, i, p, attrs;
	for (i = 0; i < (parentNodes || []).length; i++) {
		p = parentNodes[i];
		if (!p || !p.STAdata || !p.STAdata.length)
			continue;
		attrs = p.STAdataAttributes ? p.STAdataAttributes : getDataAttributes(p.STAdata);
		info[p.id] = { nodeLabel: p.label, attrs: attrs, numericNames: getNumericAttributeNames(attrs), nonNumericNames: getNonNumericAttributeNames(attrs) };
	}
	return info;
}

function ensureBarPlotStyleState(options) {
	if (!options)
		return;
	if (!options.seriesColors)
		options.seriesColors = {};
	if (!options.hiddenSeries)
		options.hiddenSeries = [];
	if (typeof options.titleFontSize !== "number")
		options.titleFontSize = 16;
	if (typeof options.labelFontSize !== "number")
		options.labelFontSize = 12;
	if (typeof options.legendFontSize !== "number")
		options.legendFontSize = 12;
	if (typeof options.axisLabelFontSize !== "number")
		options.axisLabelFontSize = 12;
	if (!options.errorMode)
		options.errorMode = "none";
	if (!options.errorColor)
		options.errorColor = "#333333";
	if (!options.errorDirection)
		options.errorDirection = "both";
	options.confidencePct = 95;
}

function populateBarPlotErrorColumnSelects(attrs, options) {
	PopulateSelectSaveLayerDialog("DialogBarPlotErrorSd", attrs, options.errorColumnSd || "");
	PopulateSelectSaveLayerDialog("DialogBarPlotErrorSe", attrs, options.errorColumnSe || "");
}

function toggleBarPlotType() {
	var node = getNodeDialog("DialogBarPlot");
	applyBarPlotTypeDisplay();
	if (node) {
		if (!node.barPlotOptions)
			node.barPlotOptions = {};
		node.barPlotOptions.barType = getBarPlotType();
		networkNodes.update(node);
		syncBarPlotSeriesWithParents(node);
		createDialogWithSelectWithGroupsBarPlot(node);
	}
	if (!BarPlotGraph2d)
		showEmptyBarPlotChart();
}

function applyBarPlotTypeDisplay() {
	var t = getBarPlotType();
	var vh = (t == "vertical" || t == "horizontal");
	var groupBy = document.getElementById("DialogBarPlotGroupByRow");
	var errPanel = document.getElementById("DialogBarPlotErrorPanel");
	if (groupBy)
		groupBy.style.display = vh ? "block" : "none";
	if (errPanel)
		errPanel.style.display = vh ? "" : "none";
}

function getBarPlotErrorMode() {
	if (document.getElementById("DialogBarPlotErrorModeSd") && document.getElementById("DialogBarPlotErrorModeSd").checked)
		return "sd";
	if (document.getElementById("DialogBarPlotErrorModeSe") && document.getElementById("DialogBarPlotErrorModeSe").checked)
		return "se";
	if (document.getElementById("DialogBarPlotErrorModeCi") && document.getElementById("DialogBarPlotErrorModeCi").checked)
		return "ci";
	if (document.getElementById("DialogBarPlotErrorModeCustom") && document.getElementById("DialogBarPlotErrorModeCustom").checked)
		return "custom";
	return "none";
}

function getBarPlotErrorDirection() {
	var el = document.getElementById("DialogBarPlotErrorDir");
	if (!el) return "both";
	if (el.value == "plus" || el.value == "minus")
		return el.value;
	return "both";
}

function setBarPlotErrorMode(mode) {
	var map = {
		none: "DialogBarPlotErrorModeNone",
		sd: "DialogBarPlotErrorModeSd",
		se: "DialogBarPlotErrorModeSe",
		ci: "DialogBarPlotErrorModeCi",
		custom: "DialogBarPlotErrorModeCustom"
	};
	var id = map[mode] || map.none, el = document.getElementById(id);
	if (el) el.checked = true;
}

function setBarPlotErrorDirection(dir) {
	var el = document.getElementById("DialogBarPlotErrorDir");
	if (el)
		el.value = (dir == "plus" || dir == "minus") ? dir : "both";
}

function syncBarPlotStyleControls(options) {
	var te = document.getElementById("DialogBarPlotTitleSize");
	var tv = document.getElementById("DialogBarPlotTitleSizeValue");
	var le = document.getElementById("DialogBarPlotLabelSize");
	var lv = document.getElementById("DialogBarPlotLabelSizeValue");
	var ge = document.getElementById("DialogBarPlotLegendSize");
	var gv = document.getElementById("DialogBarPlotLegendSizeValue");
	var ae = document.getElementById("DialogBarPlotAxisLabelSize");
	var av = document.getElementById("DialogBarPlotAxisLabelSizeValue");
	if (te) te.value = options.titleFontSize || 16;
	if (tv) tv.textContent = "" + (options.titleFontSize || 16);
	if (le) le.value = options.labelFontSize || 12;
	if (lv) lv.textContent = "" + (options.labelFontSize || 12);
	if (ge) ge.value = options.legendFontSize || 12;
	if (gv) gv.textContent = "" + (options.legendFontSize || 12);
	if (ae) ae.value = options.axisLabelFontSize || 12;
	if (av) av.textContent = "" + (options.axisLabelFontSize || 12);
}

function onBarPlotStyleChange(redraw) {
	var node = getNodeDialog("DialogBarPlot");
	var ts = parseInt(document.getElementById("DialogBarPlotTitleSize").value, 10) || 16;
	var ls = parseInt(document.getElementById("DialogBarPlotLabelSize").value, 10) || 12;
	var gs = clampChartFontSize(document.getElementById("DialogBarPlotLegendSize") ? document.getElementById("DialogBarPlotLegendSize").value : 12, 8, 28, 12);
	var asz = clampChartFontSize(document.getElementById("DialogBarPlotAxisLabelSize") ? document.getElementById("DialogBarPlotAxisLabelSize").value : 12, 8, 28, 12);
	syncBarPlotStyleControls({ titleFontSize: ts, labelFontSize: ls, legendFontSize: gs, axisLabelFontSize: asz });
	if (node) {
		if (!node.barPlotOptions) node.barPlotOptions = {};
		node.barPlotOptions.titleFontSize = ts;
		node.barPlotOptions.labelFontSize = ls;
		node.barPlotOptions.legendFontSize = gs;
		node.barPlotOptions.axisLabelFontSize = asz;
		applyChartLegendFontSize("DialogBarPlotLegend", gs);
		networkNodes.update(node);
		if (redraw && node.barPlotOptions.drawn)
			DrawBarPlot();
	}
}

function onBarPlotTitleChange() {
	var node = getNodeDialog("DialogBarPlot");
	var el = document.getElementById("DialogBarPlotTitleInput");
	if (!node) return;
	if (!node.barPlotOptions) node.barPlotOptions = {};
	node.barPlotOptions.title = el ? el.value : "";
	networkNodes.update(node);
	if (node.barPlotOptions.drawn)
		DrawBarPlot();
}

function barPlotDefaultSeriesGroup(parentId, info) {
	var attrs = info && info.attrs ? info.attrs : {};
	var num = getNumericAttributeNames(attrs);
	var guess = guessRadarSeriesLabel(attrs) || Object.keys(attrs)[0] || "";
	var values = [];
	var vi;
	for (vi = 0; vi < num.length; vi++) {
		if (num[vi] != guess)
			values.push(num[vi]);
	}
	return {
		nodeSelected: parentId,
		axisX: guess,
		axisY: values[0] || "",
		valueColumns: values,
		valueMin: num[0] || "",
		valueMax: num[Math.min(1, Math.max(0, num.length - 1))] || num[0] || "",
		legendText: (info && info.nodeLabel) || parentId
	};
}

/** One series per parent node: keep existing selections, add new parents, drop missing ones. */
function syncBarPlotSeriesWithParents(node) {
	var info = node.barPlotParentNodes || {}, ids = Object.keys(info), old, groups = [], i, g, j;
	if (!node.barPlotOptions) node.barPlotOptions = {};
	old = node.barPlotOptions.seriesGroups || [];
	for (i = 0; i < ids.length; i++) {
		g = null;
		for (j = 0; j < old.length; j++) {
			if (old[j] && old[j].nodeSelected == ids[i]) {
				g = old[j];
				break;
			}
		}
		if (!g)
			g = barPlotDefaultSeriesGroup(ids[i], info[ids[i]]);
		else {
			if (!g.valueColumns || !g.valueColumns.length)
				g.valueColumns = g.axisY ? [g.axisY] : [];
			if (!g.legendText)
				g.legendText = info[ids[i]].nodeLabel || ids[i];
		}
		groups.push(g);
	}
	node.barPlotOptions.seriesGroups = groups;
}

function ensureBarPlotManualSeries(node) {
	syncBarPlotSeriesWithParents(node);
}

function createDialogWithSelectWithGroupsBarPlot(node) {
	var container = document.getElementById("DialogBarPlotSeriesDiv");
	var groups, parentInfo, cdns, i, parentId, attrs, t, legend, num, c, col, checked, selectedCols, nodeLabel;
	if (!container) return;
	groups = node.barPlotOptions.seriesGroups || [];
	parentInfo = node.barPlotParentNodes || {};
	t = getBarPlotType();
	cdns = "";
	for (i = 0; i < groups.length; i++) {
		parentId = groups[i].nodeSelected;
		attrs = parentInfo[parentId] ? parentInfo[parentId].attrs : {};
		nodeLabel = parentInfo[parentId] ? (parentInfo[parentId].nodeLabel || parentId) : parentId;
		legend = groups[i].legendText || nodeLabel;
		groups[i].legendText = legend;
		if (!groups[i].valueColumns || !groups[i].valueColumns.length)
			groups[i].valueColumns = groups[i].axisY && groups[i].axisY != groups[i].axisX ? [groups[i].axisY] : [];
		selectedCols = groups[i].valueColumns;
		cdns += '<fieldset><legend>' + ("" + nodeLabel).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</legend>";
		cdns += '<div class="DialogBarPlotSeriesRow"><label>' + DonaCadena({cat: "Nom a la llegenda:", spa: "Nombre en la leyenda:", eng: "Legend name:"}) +
			' <input type="text" value="' + (("" + legend).replace(/&/g, "&amp;").replace(/"/g, "&quot;")) +
			'" onchange="updateBarPlotSeriesField(' + i + ',\'legendText\',this.value,\'' + node.id + '\')"></label></div>';
		cdns += barPlotSeriesSelectRow(i, "axisX", DonaCadena({cat: "Categories:", spa: "Categorías:", eng: "Categories:"}), attrs, groups[i].axisX, node.id);
		if (t == "floating") {
			cdns += barPlotSeriesSelectRow(i, "valueMin", DonaCadena({cat: "Inici:", spa: "Inicio:", eng: "Start:"}), attrs, groups[i].valueMin, node.id);
			cdns += barPlotSeriesSelectRow(i, "valueMax", DonaCadena({cat: "Fi:", spa: "Fin:", eng: "End:"}), attrs, groups[i].valueMax, node.id);
		} else {
			num = getNumericAttributeNames(attrs);
			cdns += '<div class="DialogBarPlotSeriesRow"><span>' + DonaCadena({cat: "Valors (columnes):", spa: "Valores (columnas):", eng: "Values (columns):"}) + "</span>";
			cdns += '<div class="DialogBarPlotValueColumns DialogBarPlotSeriesValueColumns">';
			num = num.filter(function (name) { return name != groups[i].axisX; });
			if (!num.length)
				cdns += "<em>" + DonaCadena({cat: "No s'han trobat columnes numèriques.", spa: "No se han encontrado columnas numéricas.", eng: "No numeric columns found."}) + "</em>";
			for (c = 0; c < num.length; c++) {
				col = num[c];
				checked = selectedCols.indexOf(col) != -1 ? " checked" : "";
				cdns += '<label><input type="checkbox" class="DialogBarPlotSeriesValueCb" data-series="' + i + '" value="' +
					("" + col).replace(/"/g, "&quot;") + '"' + checked +
					' onchange="onBarPlotSeriesValueColumnsChange(' + i + ',\'' + node.id + '\')"> ' +
					("" + col).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</label>";
			}
			cdns += "</div></div>";
		}
		cdns += "</fieldset>";
	}
	container.innerHTML = cdns;
}

function onBarPlotSeriesValueColumnsChange(idx, nodeId) {
	var node = networkNodes.get(nodeId), boxes, selected = [], i;
	if (!node || !node.barPlotOptions || !node.barPlotOptions.seriesGroups[idx]) return;
	boxes = document.querySelectorAll('.DialogBarPlotSeriesValueCb[data-series="' + idx + '"]');
	for (i = 0; i < boxes.length; i++) {
		if (boxes[i].checked)
			selected.push(boxes[i].value);
	}
	node.barPlotOptions.seriesGroups[idx].valueColumns = selected;
	if (selected.length)
		node.barPlotOptions.seriesGroups[idx].axisY = selected[0];
	networkNodes.update(node);
}

function barPlotSeriesSelectRow(i, key, label, attrs, selected, nodeId, allowEmpty) {
	var names = Object.keys(attrs || {}), p, cdns;
	cdns = '<div class="DialogBarPlotSeriesRow"><label>' + label + ' <select onchange="updateBarPlotSeriesField(' + i + ',\'' + key + '\',this.value,\'' + nodeId + '\')">';
	if (allowEmpty)
		cdns += '<option value=""' + (!selected ? " selected" : "") + "></option>";
	for (p = 0; p < names.length; p++)
		cdns += '<option value="' + names[p].replace(/"/g, "&quot;") + '"' + (names[p] == selected ? " selected" : "") + ">" + names[p].replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</option>";
	cdns += "</select></label></div>";
	return cdns;
}

function updateBarPlotSeriesField(idx, key, value, nodeId) {
	var node = networkNodes.get(nodeId), g, prev, info, attrs, num, cols, n;
	if (!node || !node.barPlotOptions || !node.barPlotOptions.seriesGroups[idx]) return;
	g = node.barPlotOptions.seriesGroups[idx];
	prev = g[key];
	g[key] = value;
	if (key == "axisX" && prev != value) {
		info = node.barPlotParentNodes || {};
		attrs = info[g.nodeSelected] ? info[g.nodeSelected].attrs || {} : {};
		num = getNumericAttributeNames(attrs);
		cols = (g.valueColumns || []).slice();
		n = cols.indexOf(value);
		if (n != -1)
			cols.splice(n, 1);
		/* The column that stops being the category becomes a value again. */
		if (num.indexOf(prev) != -1 && cols.indexOf(prev) == -1)
			cols.push(prev);
		g.valueColumns = cols;
		g.axisY = cols[0] || "";
		if (g.valueMin == value)
			g.valueMin = cols[0] || "";
		if (g.valueMax == value)
			g.valueMax = cols[1] || cols[0] || "";
		networkNodes.update(node);
		createDialogWithSelectWithGroupsBarPlot(node);
		return;
	}
	networkNodes.update(node);
}

function barPlotNormZ(ciPct) {
	var p = (ciPct || 95) / 100;
	if (p >= 0.999) return 3.291;
	if (p >= 0.99) return 2.576;
	if (p >= 0.98) return 2.326;
	if (p >= 0.95) return 1.96;
	if (p >= 0.90) return 1.645;
	if (p >= 0.80) return 1.282;
	return 1.96;
}

function barPlotParseNum(v) {
	var n = parseFloat(v);
	return isNaN(n) ? null : n;
}

function barPlotShortLabel(l) {
	var s = "" + (l == null ? "" : l);
	return s.length > 35 ? s.substring(0, 32) + "..." : s;
}

/** Vertical / horizontal: unique categories on axis; each record = a clustered column (#1, #2, …), not summed. */
function barPlotBuildClusteredByCategory(data, axisX, valueCols, options) {
	var labelsFull = [], byCat = {}, i, rec, cat, c, col, k, sk, n, maxN = 0, seriesKeys = [], values = {}, errMap = {}, vy, err, rowRec;
	for (i = 0; i < (data || []).length; i++) {
		rec = data[i];
		cat = rec[axisX];
		if (labelsFull.indexOf(cat) == -1) {
			labelsFull.push(cat);
			byCat[cat] = [];
		}
		if (!byCat[cat])
			byCat[cat] = [];
		byCat[cat].push(rec);
		if (byCat[cat].length > maxN)
			maxN = byCat[cat].length;
	}
	if (maxN < 1)
		maxN = 1;
	for (k = 1; k <= maxN; k++) {
		for (c = 0; c < (valueCols || []).length; c++) {
			col = valueCols[c];
			sk = (valueCols.length == 1) ? ("#" + k) : (col + " #" + k);
			seriesKeys.push(sk);
			values[sk] = { "": {} };
			for (i = 0; i < labelsFull.length; i++) {
				cat = labelsFull[i];
				n = byCat[cat] || [];
				rowRec = (k - 1 < n.length) ? n[k - 1] : null;
				vy = rowRec ? barPlotParseNum(rowRec[col]) : null;
				values[sk][""][cat] = (vy == null) ? 0 : vy;
				if (rowRec && options && options.errorMode && options.errorMode != "none") {
					options.axisY = col;
					err = barPlotErrorForRow(rowRec, options, vy);
					if (err)
						errMap[sk + "\t" + cat] = err;
				}
			}
		}
	}
	return { mode: "cat", labelsFull: labelsFull, seriesKeys: seriesKeys, stackKeys: [""], values: values, errMap: errMap };
}

/** Vertical / horizontal with group-by-category sum (used for multi-node series alignment). */
function barPlotBuildGrouped(data, axisX, valueCols, options) {
	var labelsFull = [], seriesKeys = (valueCols || []).slice(), values = {}, errMap = {}, i, rec, cat, c, col, vy, err;
	for (c = 0; c < seriesKeys.length; c++)
		values[seriesKeys[c]] = { "": {} };
	for (i = 0; i < (data || []).length; i++) {
		rec = data[i];
		cat = rec[axisX];
		if (labelsFull.indexOf(cat) == -1)
			labelsFull.push(cat);
		for (c = 0; c < seriesKeys.length; c++) {
			col = seriesKeys[c];
			vy = barPlotParseNum(rec[col]);
			if (vy == null) continue;
			if (values[col][""][cat] == null)
				values[col][""][cat] = 0;
			values[col][""][cat] += vy;
			if (options && options.errorMode && options.errorMode != "none") {
				options.axisY = col;
				err = barPlotErrorForRow(rec, options, vy);
				if (err && !errMap[col + "\t" + cat])
					errMap[col + "\t" + cat] = err;
			}
		}
	}
	/* For CI/custom, recompute from summed value so whiskers match the bar */
	if (options && (options.errorMode == "ci" || options.errorMode == "custom")) {
		errMap = {};
		for (c = 0; c < seriesKeys.length; c++) {
			col = seriesKeys[c];
			options.axisY = col;
			for (i = 0; i < labelsFull.length; i++) {
				cat = labelsFull[i];
				vy = values[col][""][cat];
				if (vy == null) continue;
				err = barPlotErrorForRow({}, options, vy);
				if (err)
					errMap[col + "\t" + cat] = err;
			}
		}
	}
	return { mode: "cat", labelsFull: labelsFull, seriesKeys: seriesKeys, stackKeys: [""], values: values, errMap: errMap };
}

/** Vertical / horizontal / floating: one category slot per record (labels may repeat). */
function barPlotBuildPerRow(data, axisX, valueCols, floating, valueMinCol, valueMaxCol, options) {
	var labelsFull = [], seriesKeys = [], rowValues = {}, errMap = {}, i, rec, c, col, vy, vmin, vmax, err;
	if (floating) {
		seriesKeys = [""];
		rowValues[""] = [];
	} else {
		for (c = 0; c < valueCols.length; c++) {
			col = valueCols[c];
			seriesKeys.push(col);
			rowValues[col] = [];
		}
	}
	for (i = 0; i < (data || []).length; i++) {
		rec = data[i];
		labelsFull.push(rec[axisX]);
		if (floating) {
			vmin = barPlotParseNum(rec[valueMinCol]);
			vmax = barPlotParseNum(rec[valueMaxCol]);
			rowValues[""].push((vmin != null && vmax != null) ? { min: vmin, max: vmax } : null);
		} else {
			for (c = 0; c < valueCols.length; c++) {
				col = valueCols[c];
				vy = barPlotParseNum(rec[col]);
				rowValues[col].push(vy == null ? 0 : vy);
				if (options && options.errorMode && options.errorMode != "none") {
					options.axisY = col;
					err = barPlotErrorForRow(rec, options, vy);
					if (err)
						errMap[col + "\t" + i] = err;
				}
			}
		}
	}
	return { mode: "row", labelsFull: labelsFull, seriesKeys: seriesKeys, rowValues: rowValues, errMap: errMap };
}

/** Stacked wide: unique categories; each value column is a stack fragment (sums if category repeats). */
function barPlotBuildStackedWide(data, axisX, valueCols) {
	var labelsFull = [], seriesKeys = (valueCols || []).slice(), values = {}, i, rec, cat, c, col, vy;
	for (c = 0; c < seriesKeys.length; c++)
		values[seriesKeys[c]] = { "": {} };
	for (i = 0; i < (data || []).length; i++) {
		rec = data[i];
		cat = rec[axisX];
		if (labelsFull.indexOf(cat) == -1)
			labelsFull.push(cat);
		for (c = 0; c < seriesKeys.length; c++) {
			col = seriesKeys[c];
			vy = barPlotParseNum(rec[col]);
			if (vy == null) continue;
			if (values[col][""][cat] == null)
				values[col][""][cat] = 0;
			values[col][""][cat] += vy;
		}
	}
	return { mode: "cat", labelsFull: labelsFull, seriesKeys: seriesKeys, stackKeys: [""], values: values, errMap: {} };
}

/** Stacked long: one value column; each row of a repeated category becomes stack fragment #1, #2, ... */
function barPlotBuildStackedLong(data, axisX, valueCol) {
	var labelsFull = [], byCat = {}, i, rec, cat, vy, maxN = 0, seriesKeys = [], values = {}, k, sk, n;
	for (i = 0; i < (data || []).length; i++) {
		rec = data[i];
		cat = rec[axisX];
		vy = barPlotParseNum(rec[valueCol]);
		if (labelsFull.indexOf(cat) == -1) {
			labelsFull.push(cat);
			byCat[cat] = [];
		}
		if (!byCat[cat])
			byCat[cat] = [];
		if (vy != null)
			byCat[cat].push(vy);
		if (byCat[cat].length > maxN)
			maxN = byCat[cat].length;
	}
	if (maxN < 1)
		maxN = 1;
	for (k = 1; k <= maxN; k++) {
		sk = "#" + k;
		seriesKeys.push(sk);
		values[sk] = { "": {} };
		for (i = 0; i < labelsFull.length; i++) {
			cat = labelsFull[i];
			n = byCat[cat] || [];
			values[sk][""][cat] = (k - 1 < n.length) ? n[k - 1] : 0;
		}
	}
	return { mode: "cat", labelsFull: labelsFull, seriesKeys: seriesKeys, stackKeys: [""], values: values, errMap: {} };
}

function barPlotRowFloatingHasInterval(pack) {
	var arr, i, cell;
	if (!pack || !pack.rowValues || !pack.rowValues[""])
		return false;
	arr = pack.rowValues[""];
	for (i = 0; i < arr.length; i++) {
		cell = arr[i];
		if (cell && cell.min != null && cell.max != null && cell.min !== cell.max)
			return true;
	}
	return false;
}

function barPlotApplyErrorAxisExtent(scales, datasets, horiz, beginAtZero, errorDirection) {
	var i, j, ds, v, minV = null, maxV = null, axis;
	var usePlus = !errorDirection || errorDirection == "both" || errorDirection == "plus";
	var useMinus = !errorDirection || errorDirection == "both" || errorDirection == "minus";
	for (i = 0; i < (datasets || []).length; i++) {
		ds = datasets[i];
		if (!ds || ds.hidden) continue;
		for (j = 0; j < (ds.data || []).length; j++) {
			v = ds.data[j];
			if (v == null || typeof v === "object") continue;
			if (minV == null || v < minV) minV = v;
			if (maxV == null || v > maxV) maxV = v;
			if (useMinus && ds._errorMin && ds._errorMin[j] != null && !isNaN(ds._errorMin[j])) {
				if (minV == null || ds._errorMin[j] < minV) minV = ds._errorMin[j];
			}
			if (usePlus && ds._errorMax && ds._errorMax[j] != null && !isNaN(ds._errorMax[j])) {
				if (maxV == null || ds._errorMax[j] > maxV) maxV = ds._errorMax[j];
			}
		}
	}
	if (minV == null || maxV == null)
		return;
	if (beginAtZero) {
		if (minV > 0) minV = 0;
		if (maxV < 0) maxV = 0;
	}
	axis = horiz ? scales.x : scales.y;
	axis.min = minV;
	axis.max = maxV;
}

function barPlotAggregateRows(data, axisX, axisY, seriesCol, stackCol, valueMinCol, valueMaxCol, floating) {
	/* returns { labelsFull, seriesKeys, stackKeys, values[series][stack][cat]=sum, errors raw maps } */
	var labelsFull = [], seriesKeys = [""], stackKeys = [""], values = {}, i, rec, cat, ser, stk, key, vy, vmin, vmax;
	values[""] = {};
	values[""][""] = {};
	if (!data) return { labelsFull: labelsFull, seriesKeys: seriesKeys, stackKeys: stackKeys, values: values };
	for (i = 0; i < data.length; i++) {
		rec = data[i];
		cat = rec[axisX];
		if (labelsFull.indexOf(cat) == -1)
			labelsFull.push(cat);
		ser = seriesCol ? ("" + (rec[seriesCol] == null ? "" : rec[seriesCol])) : "";
		stk = stackCol ? ("" + (rec[stackCol] == null ? "" : rec[stackCol])) : "";
		if (seriesKeys.indexOf(ser) == -1) {
			seriesKeys.push(ser);
			values[ser] = {};
		}
		if (!values[ser])
			values[ser] = {};
		if (stackKeys.indexOf(stk) == -1)
			stackKeys.push(stk);
		if (!values[ser][stk])
			values[ser][stk] = {};
		if (floating) {
			vmin = barPlotParseNum(rec[valueMinCol]);
			vmax = barPlotParseNum(rec[valueMaxCol]);
			if (vmin == null || vmax == null) continue;
			if (!values[ser][stk][cat])
				values[ser][stk][cat] = { min: vmin, max: vmax, n: 1 };
			else {
				values[ser][stk][cat].min = Math.min(values[ser][stk][cat].min, vmin);
				values[ser][stk][cat].max = Math.max(values[ser][stk][cat].max, vmax);
				values[ser][stk][cat].n++;
			}
		} else {
			vy = barPlotParseNum(rec[axisY]);
			if (vy == null) continue;
			if (values[ser][stk][cat] == null)
				values[ser][stk][cat] = 0;
			values[ser][stk][cat] += vy;
		}
	}
	if (seriesKeys.length > 1 && seriesKeys[0] === "")
		seriesKeys.shift();
	if (stackKeys.length > 1 && stackKeys[0] === "")
		stackKeys.shift();
	return { labelsFull: labelsFull, seriesKeys: seriesKeys, stackKeys: stackKeys, values: values };
}

function barPlotFloatingHasDistinctInterval(merged) {
	var s, sk, cat, cell, ser, stk;
	if (!merged || !merged.values) return false;
	for (s = 0; s < (merged.seriesKeys || []).length; s++) {
		ser = merged.seriesKeys[s];
		if (!merged.values[ser]) continue;
		for (sk = 0; sk < (merged.stackKeys || []).length; sk++) {
			stk = merged.stackKeys[sk];
			if (!merged.values[ser][stk]) continue;
			for (cat in merged.values[ser][stk]) {
				if (!Object.prototype.hasOwnProperty.call(merged.values[ser][stk], cat)) continue;
				cell = merged.values[ser][stk][cat];
				if (cell && cell.min != null && cell.max != null && cell.min !== cell.max)
					return true;
			}
		}
	}
	return false;
}

function barPlotErrorForRow(rec, options, y) {
	var mode = options.errorMode || "none", e = null, custom;
	if (mode == "none" || y == null || isNaN(y))
		return null;
	if (mode == "sd") {
		e = barPlotParseNum(rec[options.errorColumnSd]);
		return e == null ? null : { min: y - e, max: y + e };
	}
	if (mode == "se") {
		e = barPlotParseNum(rec[options.errorColumnSe]);
		return e == null ? null : { min: y - e, max: y + e };
	}
	if (mode == "ci") {
		/* 95% CI shown as ±5% of the bar value */
		e = Math.abs(y) * 0.05;
		return { min: y - e, max: y + e };
	}
	if (mode == "custom") {
		custom = parseFloat(options.customErrorVal);
		if (isNaN(custom)) return null;
		if (options.customErrorKind == "pct")
			e = Math.abs(y) * (custom / 100);
		else
			e = custom;
		return { min: y - e, max: y + e };
	}
	return null;
}

function barPlotAggregateErrors(data, axisX, seriesCol, options) {
	/* For cooked tables: take first non-null error per category+series (after GroupBy one row per group) */
	var map = {}, i, rec, cat, ser, y, err, key;
	if (!data || options.errorMode == "none") return map;
	for (i = 0; i < data.length; i++) {
		rec = data[i];
		cat = rec[axisX];
		ser = seriesCol ? ("" + (rec[seriesCol] == null ? "" : rec[seriesCol])) : "";
		y = barPlotParseNum(rec[options.axisY]);
		err = barPlotErrorForRow(rec, options, y);
		key = ser + "\t" + cat;
		if (err && !map[key])
			map[key] = err;
	}
	return map;
}

function clearBarPlotChart() {
	var legend, canvas, existing;
	if (BarPlotGraph2d) {
		BarPlotGraph2d.destroy();
		BarPlotGraph2d = null;
	}
	canvas = document.getElementById("DialogBarPlotVisualizationCanvas");
	if (canvas && typeof Chart !== "undefined" && Chart.getChart) {
		existing = Chart.getChart(canvas);
		if (existing) existing.destroy();
	}
	legend = document.getElementById("DialogBarPlotLegend");
	if (legend) legend.innerHTML = "";
	BarPlotLastLegend = null;
	hideBarPlotColorCard();
}

function showEmptyBarPlotChart() {
	var horiz = getBarPlotType() == "horizontal";
	var valueAxis = { min: 0, max: 10, ticks: { stepSize: 2 }, grid: { display: true } };
	var catAxis = { grid: { display: false } };
	showEmptyChartPlaceholder("DialogBarPlotVisualizationCanvas", {
		type: "bar",
		data: { labels: ["", "", "", ""], datasets: [{ data: [] }] },
		options: {
			indexAxis: horiz ? "y" : "x",
			scales: horiz ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis }
		}
	});
}

function hideBarPlotColorCard() {
	var card = document.getElementById("DialogBarPlotColorCard");
	if (card) card.style.display = "none";
}

function barPlotEscapeAttr(s) {
	return ("" + s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function barPlotEscapeJs(s) {
	return ("" + s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildBarPlotLegendHtml(node, keys, labels, colors) {
	var container = document.getElementById("DialogBarPlotLegend");
	var options, cdns = "", i, hidden, eyeTitle, hiddenFlags = [];
	if (!container) return;
	ensureBarPlotStyleState(node.barPlotOptions);
	options = node.barPlotOptions;
	container.style.fontSize = (options.legendFontSize || 12) + "px";
	for (i = 0; i < keys.length; i++) {
		hidden = options.hiddenSeries.indexOf(keys[i]) != -1;
		hiddenFlags.push(hidden);
		eyeTitle = hidden ? DonaCadena({cat: "Mostra", spa: "Mostrar", eng: "Show"}) : DonaCadena({cat: "Amaga", spa: "Ocultar", eng: "Hide"});
		cdns += '<div class="DialogBarPlotLegendItem' + (hidden ? " is-hidden" : "") + '">';
		cdns += '<button type="button" class="DialogBarPlotLegendSwatch" style="background-color:' + barPlotEscapeAttr(colors[i]) +
			';" onclick="onBarLegendColorClick(\'' + barPlotEscapeJs(keys[i]) + '\',event)"></button>';
		cdns += '<button type="button" class="DialogBarPlotLegendEye" title="' + barPlotEscapeAttr(eyeTitle) +
			'" onclick="onBarLegendEyeClick(\'' + barPlotEscapeJs(keys[i]) + '\')">' + (hidden ? "&#10005;" : "&#128065;") + "</button>";
		cdns += '<span class="DialogBarPlotLegendLabel" style="font-size:' + (options.legendFontSize || 12) + 'px;">' + barPlotEscapeAttr(labels[i]) + "</span></div>";
	}
	container.innerHTML = cdns;
	BarPlotLastLegend = { keys: keys.slice(), labels: labels.slice(), colors: colors.slice(), hidden: hiddenFlags };
}

function onBarLegendEyeClick(key) {
	var node = getNodeDialog("DialogBarPlot"), list, idx;
	if (!node) return;
	ensureBarPlotStyleState(node.barPlotOptions);
	list = node.barPlotOptions.hiddenSeries;
	idx = list.indexOf(key);
	if (idx == -1) list.push(key); else list.splice(idx, 1);
	networkNodes.update(node);
	DrawBarPlot();
}

function onBarLegendColorClick(key, evt) {
	var card = document.getElementById("DialogBarPlotColorCard");
	var dialog = document.getElementById("DialogBarPlot");
	var cdns = "", i, color, rect, dRect;
	if (!card || !dialog) return;
	for (i = 0; i < ColorsForBarPlot.length; i++) {
		color = ColorsForBarPlot[i];
		cdns += '<button type="button" class="DialogBarPlotColorCardSwatch" style="background-color:' + color +
			';" onclick="applyBarLegendColor(\'' + barPlotEscapeJs(key) + '\',\'' + color + '\')"></button>';
	}
	cdns += '<input type="color" onchange="applyBarLegendColor(\'' + barPlotEscapeJs(key) + '\', this.value)">';
	card.innerHTML = cdns;
	card.style.display = "flex";
	rect = evt && evt.target ? evt.target.getBoundingClientRect() : null;
	dRect = dialog.getBoundingClientRect();
	if (rect) {
		card.style.left = Math.max(8, rect.left - dRect.left) + "px";
		card.style.top = Math.max(8, rect.bottom - dRect.top + 4) + "px";
	}
}

function applyBarLegendColor(key, color) {
	var node = getNodeDialog("DialogBarPlot");
	if (!node) return;
	ensureBarPlotStyleState(node.barPlotOptions);
	node.barPlotOptions.seriesColors[key] = color;
	networkNodes.update(node);
	hideBarPlotColorCard();
	DrawBarPlot();
}

function ShowBarPlotDialog(parentNodes, node) {
	var parentInfo, parentIds, options, barType;
	saveNodeDialog("DialogBarPlot", node);
	parentInfo = collectBarPlotParentInfo(parentNodes);
	node.barPlotParentNodes = parentInfo;
	parentIds = Object.keys(parentInfo);
	networkNodes.update(node);
	if (!parentIds.length) {
		document.getElementById("DialogBarPlotTitle").innerHTML = DonaCadena({cat: "No hi ha dades per mostrar.", spa: "No hay datos que mostrar.", eng: "No data to show."});
		document.getElementById("DialogBarPlotSeriesDiv").innerHTML = "";
		clearBarPlotChart();
		showEmptyBarPlotChart();
		return;
	}
	document.getElementById("DialogBarPlotTitle").innerHTML = DonaCadena({cat: "Gràfic de barres", spa: "Gráfico de barras", eng: "Bar chart"});
	if (!node.barPlotOptions) node.barPlotOptions = {};
	options = node.barPlotOptions;
	ensureBarPlotStyleState(options);
	barType = options.barType || "vertical";
	document.getElementById("DialogBarPlotTypeVertical").checked = barType == "vertical";
	document.getElementById("DialogBarPlotTypeHorizontal").checked = barType == "horizontal";
	document.getElementById("DialogBarPlotTypeFloating").checked = barType == "floating";
	document.getElementById("DialogBarPlotTypeStacked").checked = barType == "stacked";
	document.getElementById("DialogBarPlotBeginZero").checked = options.beginAtZero === false ? false : true;
	document.getElementById("DialogBarPlotTitleInput").value = options.title || "";
	if (document.getElementById("DialogBarPlotGroupByCategory"))
		document.getElementById("DialogBarPlotGroupByCategory").checked = !!options.groupByCategory;
	setBarPlotErrorMode(options.errorMode || "none");
	setBarPlotErrorDirection(options.errorDirection || "both");
	document.getElementById("DialogBarPlotErrorColor").value = options.errorColor || "#333333";
	document.getElementById("DialogBarPlotErrorCustomKind").value = options.customErrorKind || "abs";
	document.getElementById("DialogBarPlotErrorCustomVal").value = options.customErrorVal != null ? options.customErrorVal : 1;
	syncBarPlotStyleControls(options);
	populateBarPlotErrorColumnSelects(collectBarPlotUnionAttrs(parentInfo), options);
	applyBarPlotTypeDisplay();
	syncBarPlotSeriesWithParents(node);
	createDialogWithSelectWithGroupsBarPlot(node);
	networkNodes.update(node);
	clearBarPlotChart();
	showEmptyBarPlotChart();
	if (options.drawn)
		DrawBarPlot();
}


function barPlotMergeLocalIntoMerged(merged, labelsFull, errMap, localAgg, keyNamePrefix, singleValueCol) {
	var s, sk, cat, ser, err, tab, outKey;
	for (s = 0; s < localAgg.labelsFull.length; s++) {
		if (labelsFull.indexOf(localAgg.labelsFull[s]) == -1)
			labelsFull.push(localAgg.labelsFull[s]);
	}
	if (localAgg.mode == "cat" || localAgg.values) {
		for (s = 0; s < (localAgg.seriesKeys || []).length; s++) {
			ser = localAgg.seriesKeys[s];
			outKey = keyNamePrefix;
			if (localAgg.seriesKeys.length > 1 || (singleValueCol && ser && ser !== singleValueCol))
				outKey = keyNamePrefix + (ser ? " / " + ser : "");
			else if (!outKey)
				outKey = ser || "Values";
			if (merged.seriesKeys.indexOf(outKey) == -1)
				merged.seriesKeys.push(outKey);
			if (!merged.values[outKey]) merged.values[outKey] = {};
			for (sk = 0; sk < (localAgg.stackKeys || [""]).length; sk++) {
				if (merged.stackKeys.indexOf(localAgg.stackKeys[sk]) == -1)
					merged.stackKeys.push(localAgg.stackKeys[sk]);
				if (!localAgg.values[ser] || !localAgg.values[ser][localAgg.stackKeys[sk]])
					continue;
				if (!merged.values[outKey][localAgg.stackKeys[sk]])
					merged.values[outKey][localAgg.stackKeys[sk]] = {};
				for (cat in localAgg.values[ser][localAgg.stackKeys[sk]]) {
					if (!Object.prototype.hasOwnProperty.call(localAgg.values[ser][localAgg.stackKeys[sk]], cat)) continue;
					merged.values[outKey][localAgg.stackKeys[sk]][cat] = localAgg.values[ser][localAgg.stackKeys[sk]][cat];
				}
			}
		}
		if (localAgg.errMap) {
			for (cat in localAgg.errMap) {
				if (!Object.prototype.hasOwnProperty.call(localAgg.errMap, cat)) continue;
				err = localAgg.errMap[cat];
				tab = cat.indexOf("\t");
				if (tab != -1) {
					ser = cat.substring(0, tab);
					outKey = keyNamePrefix;
					if (localAgg.seriesKeys && localAgg.seriesKeys.length > 1)
						outKey = keyNamePrefix + (ser ? " / " + ser : "");
					errMap[outKey + "\t" + cat.substring(tab + 1)] = err;
				} else
					errMap[keyNamePrefix + "\t" + cat] = err;
			}
		}
	}
}

function DrawBarPlot(event) {
	if (event) event.preventDefault();
	var node = getNodeDialog("DialogBarPlot");
	if (!node) return;
	var parentNodes = GetParentNodes(node);
	if (!parentNodes || !parentNodes.length) return;
	var options, barType, title, beginAtZero, titleFontSize, labelFontSize, axisLabelFontSize;
	var parentNode, data, axisX, axisY, valueMin, valueMax;
	var agg, labels, labelsFull, datasets = [], legendKeys = [], legendLabels = [], legendColors = [];
	var s, sk, g, cat, color, keyName, row, errMap, err, floating, stacked, horiz, scales, plugins, chartOpts;
	var seriesGroups, gIdx, localAgg, merged, ser, stk, cell, vy, eMin, eMax;
	var chartPack = null, valueCols, active, act, c, valueAxisTitle;

	if (!node.barPlotOptions) node.barPlotOptions = {};
	options = node.barPlotOptions;
	ensureBarPlotStyleState(options);
	node.barPlotParentNodes = collectBarPlotParentInfo(parentNodes);
	syncBarPlotSeriesWithParents(node);

	barType = getBarPlotType();
	floating = barType == "floating";
	stacked = barType == "stacked";
	horiz = barType == "horizontal";
	title = document.getElementById("DialogBarPlotTitleInput").value || "";
	beginAtZero = document.getElementById("DialogBarPlotBeginZero").checked;
	titleFontSize = parseInt(document.getElementById("DialogBarPlotTitleSize").value, 10) || 16;
	labelFontSize = parseInt(document.getElementById("DialogBarPlotLabelSize").value, 10) || 12;

	options.barType = barType;
	options.title = title;
	options.beginAtZero = beginAtZero;
	options.titleFontSize = titleFontSize;
	options.labelFontSize = labelFontSize;
	options.legendFontSize = clampChartFontSize(document.getElementById("DialogBarPlotLegendSize") ? document.getElementById("DialogBarPlotLegendSize").value : options.legendFontSize, 8, 28, 12);
	options.axisLabelFontSize = clampChartFontSize(document.getElementById("DialogBarPlotAxisLabelSize") ? document.getElementById("DialogBarPlotAxisLabelSize").value : options.axisLabelFontSize, 8, 28, 12);
	axisLabelFontSize = options.axisLabelFontSize;
	options.groupByCategory = document.getElementById("DialogBarPlotGroupByCategory") ? document.getElementById("DialogBarPlotGroupByCategory").checked : false;
	options.errorMode = getBarPlotErrorMode();
	options.errorDirection = getBarPlotErrorDirection();
	options.errorColor = document.getElementById("DialogBarPlotErrorColor") ? document.getElementById("DialogBarPlotErrorColor").value : "#333333";
	options.confidencePct = 95;
	options.customErrorKind = document.getElementById("DialogBarPlotErrorCustomKind") ? document.getElementById("DialogBarPlotErrorCustomKind").value : "abs";
	options.customErrorVal = document.getElementById("DialogBarPlotErrorCustomVal") ? parseFloat(document.getElementById("DialogBarPlotErrorCustomVal").value) : 1;
	if (options.errorMode == "sd" && document.getElementById("DialogBarPlotErrorSdSelect"))
		options.errorColumnSd = document.getElementById("DialogBarPlotErrorSdSelect").value;
	if (options.errorMode == "se" && document.getElementById("DialogBarPlotErrorSeSelect"))
		options.errorColumnSe = document.getElementById("DialogBarPlotErrorSeSelect").value;

	labelsFull = [];
	merged = { values: {}, seriesKeys: [], stackKeys: [""] };
	errMap = {};

	/* Collect the series (one per parent node) that have a complete selection */
	seriesGroups = options.seriesGroups || [];
	active = [];
	for (gIdx = 0; gIdx < seriesGroups.length; gIdx++) {
		parentNode = networkNodes.get(seriesGroups[gIdx].nodeSelected);
		if (!parentNode || !parentNode.STAdata) continue;
		axisX = seriesGroups[gIdx].axisX;
		valueCols = (seriesGroups[gIdx].valueColumns || []).slice();
		if (!valueCols.length && seriesGroups[gIdx].axisY && seriesGroups[gIdx].axisY != axisX)
			valueCols = [seriesGroups[gIdx].axisY];
		valueCols = valueCols.filter(function (name) { return name != axisX; });
		valueMin = seriesGroups[gIdx].valueMin;
		valueMax = seriesGroups[gIdx].valueMax;
		if (!axisX || (floating ? (!valueMin || !valueMax) : !valueCols.length)) continue;
		if (floating && valueMin == valueMax) {
			alert(DonaCadena({
				cat: "Les barres flotants necessiten dues columnes diferents (inici i fi).",
				spa: "Las barras flotantes necesitan dos columnas distintas (inicio y fin).",
				eng: "Floating bars need two different columns (start and end)."
			}));
			return;
		}
		active.push({
			data: parentNode.STAdata,
			axisX: axisX,
			valueCols: valueCols,
			valueMin: valueMin,
			valueMax: valueMax,
			legend: seriesGroups[gIdx].legendText ||
				((node.barPlotParentNodes[seriesGroups[gIdx].nodeSelected] || {}).nodeLabel) ||
				("S" + (gIdx + 1))
		});
	}
	if (!active.length) {
		if (event) alert(DonaCadena({cat: "Seleccioneu categories i valors.", spa: "Seleccione categorías y valores.", eng: "Select categories and values."}));
		return;
	}

	if (active.length == 1) {
		/* Single node: per-row semantics (repeated categories stay separate) */
		act = active[0];
		data = act.data;
		axisX = act.axisX;
		valueCols = act.valueCols;
		valueMin = act.valueMin;
		valueMax = act.valueMax;
		if (floating) {
			chartPack = barPlotBuildPerRow(data, axisX, [], true, valueMin, valueMax, options);
			if (!barPlotRowFloatingHasInterval(chartPack)) {
				alert(DonaCadena({
					cat: "Les barres flotants necessiten dos valors diferents (inici ≠ fi) a les dades.",
					spa: "Las barras flotantes necesitan dos valores distintos (inicio ≠ fin) en los datos.",
					eng: "Floating bars need two different values (start ≠ end) in the data."
				}));
				return;
			}
		} else if (stacked) {
			if (valueCols.length > 1)
				chartPack = barPlotBuildStackedWide(data, axisX, valueCols);
			else
				chartPack = barPlotBuildStackedLong(data, axisX, valueCols[0]);
		} else if (options.groupByCategory) {
			chartPack = barPlotBuildClusteredByCategory(data, axisX, valueCols, options);
		} else {
			chartPack = barPlotBuildPerRow(data, axisX, valueCols, false, "", "", options);
		}
		labelsFull = chartPack.labelsFull;
		errMap = chartPack.errMap || {};
		if (chartPack.mode == "cat") {
			merged = { values: chartPack.values, seriesKeys: chartPack.seriesKeys, stackKeys: chartPack.stackKeys || [""] };
			agg = merged;
		}
	} else {
		/* Several nodes: align by category and merge */
		for (gIdx = 0; gIdx < active.length; gIdx++) {
			act = active[gIdx];
			data = act.data;
			axisX = act.axisX;
			valueCols = act.valueCols;
			axisY = valueCols.length ? valueCols[0] : "";
			keyName = act.legend;
			if (floating) {
				localAgg = barPlotAggregateRows(data, axisX, axisY, "", "", act.valueMin, act.valueMax, true);
				localAgg.mode = "cat";
				barPlotMergeLocalIntoMerged(merged, labelsFull, errMap, localAgg, keyName, "");
			} else if (stacked) {
				if (valueCols.length > 1)
					localAgg = barPlotBuildStackedWide(data, axisX, valueCols);
				else
					localAgg = barPlotBuildGrouped(data, axisX, valueCols, options);
				barPlotMergeLocalIntoMerged(merged, labelsFull, errMap, localAgg, keyName, valueCols.length == 1 ? valueCols[0] : null);
			} else if (options.groupByCategory) {
				localAgg = barPlotBuildClusteredByCategory(data, axisX, valueCols, options);
				barPlotMergeLocalIntoMerged(merged, labelsFull, errMap, localAgg, keyName, valueCols.length == 1 ? valueCols[0] : null);
			} else {
				localAgg = barPlotBuildGrouped(data, axisX, valueCols, options);
				barPlotMergeLocalIntoMerged(merged, labelsFull, errMap, localAgg, keyName, valueCols.length == 1 ? valueCols[0] : null);
			}
		}
		if (!merged.seriesKeys.length) {
			if (event) alert(DonaCadena({cat: "No s'ha pogut crear el gràfic.", spa: "No se ha podido crear el gráfico.", eng: "Could not create the chart."}));
			return;
		}
		agg = merged;
		chartPack = { mode: "cat" };
	}

	/* Axis titles / legend fallbacks from the active selections */
	options.axisX = active[0].axisX;
	if (floating) {
		options.valueColumns = [];
		options.axisY = active.length == 1 ? active[0].legend : "";
		valueAxisTitle = active[0].valueMin + " - " + active[0].valueMax;
	} else {
		valueCols = [];
		for (gIdx = 0; gIdx < active.length; gIdx++) {
			for (c = 0; c < active[gIdx].valueCols.length; c++) {
				if (valueCols.indexOf(active[gIdx].valueCols[c]) == -1)
					valueCols.push(active[gIdx].valueCols[c]);
			}
		}
		options.valueColumns = valueCols;
		options.axisY = valueCols.length == 1 ? valueCols[0] : "";
		valueAxisTitle = valueCols.join(", ");
	}

	if (!labelsFull.length) {
		if (event) alert(DonaCadena({cat: "No s'ha pogut crear el gràfic.", spa: "No se ha podido crear el gráfico.", eng: "Could not create the chart."}));
		return;
	}

	labels = labelsFull.map(barPlotShortLabel);

	if (chartPack && chartPack.mode == "row") {
		for (s = 0; s < chartPack.seriesKeys.length; s++) {
			ser = chartPack.seriesKeys[s];
			keyName = ser || options.axisY || "Values";
			color = options.seriesColors[keyName] || ColorsForBarPlot[legendKeys.length % ColorsForBarPlot.length];
			row = [];
			eMin = [];
			eMax = [];
			for (g = 0; g < chartPack.labelsFull.length; g++) {
				if (floating) {
					cell = chartPack.rowValues[ser][g];
					row.push(cell ? [cell.min, cell.max] : null);
				} else {
					vy = chartPack.rowValues[ser][g];
					if (vy == null) vy = 0;
					row.push(vy);
					err = chartPack.errMap[ser + "\t" + g];
					if (err) {
						eMin.push(err.min);
						eMax.push(err.max);
					} else {
						eMin.push(null);
						eMax.push(null);
					}
				}
			}
			datasets.push({
				label: keyName,
				data: row,
				backgroundColor: color,
				borderColor: color,
				borderWidth: 1,
				hidden: options.hiddenSeries.indexOf(keyName) != -1,
				_errorMin: floating ? null : eMin,
				_errorMax: floating ? null : eMax,
				categoryPercentage: 0.85,
				barPercentage: 0.9
			});
			legendKeys.push(keyName);
			legendLabels.push(keyName);
			legendColors.push(color);
		}
	} else {
		if (agg)
			merged.seriesKeys = agg.seriesKeys;
		if (!merged.seriesKeys.length)
			merged.seriesKeys = [""];
		if (!merged.stackKeys.length)
			merged.stackKeys = [""];

		if (floating && !barPlotFloatingHasDistinctInterval(merged)) {
			alert(DonaCadena({
				cat: "Les barres flotants necessiten dos valors diferents (inici ≠ fi) a les dades.",
				spa: "Las barras flotantes necesitan dos valores distintos (inicio ≠ fin) en los datos.",
				eng: "Floating bars need two different values (start ≠ end) in the data."
			}));
			return;
		}

		for (s = 0; s < merged.seriesKeys.length; s++) {
			for (sk = 0; sk < merged.stackKeys.length; sk++) {
				ser = merged.seriesKeys[s];
				stk = merged.stackKeys[sk];
				if (!merged.values[ser] || !merged.values[ser][stk])
					continue;
				keyName = ser + (stk ? " [" + stk + "]" : "");
				if (!keyName) keyName = options.axisY || "Values";
				color = options.seriesColors[keyName] || ColorsForBarPlot[legendKeys.length % ColorsForBarPlot.length];
				row = [];
				eMin = [];
				eMax = [];
				for (g = 0; g < labelsFull.length; g++) {
					cat = labelsFull[g];
					if (floating) {
						cell = merged.values[ser][stk][cat];
						row.push(cell ? [cell.min, cell.max] : null);
					} else {
						vy = merged.values[ser][stk][cat];
						if (vy == null) vy = 0;
						row.push(vy);
						err = errMap[(ser || "") + "\t" + cat];
						if (err) {
							eMin.push(err.min);
							eMax.push(err.max);
						} else {
							eMin.push(null);
							eMax.push(null);
						}
					}
				}
				datasets.push({
					label: keyName,
					data: row,
					backgroundColor: color,
					borderColor: color,
					borderWidth: 1,
					stack: stacked ? (stk || "stack") : undefined,
					hidden: options.hiddenSeries.indexOf(keyName) != -1,
					_errorMin: floating ? null : eMin,
					_errorMax: floating ? null : eMax,
					categoryPercentage: 0.85,
					barPercentage: 0.9
				});
				legendKeys.push(keyName);
				legendLabels.push(keyName);
				legendColors.push(color);
			}
		}
	}

	scales = {
		x: {
			stacked: stacked,
			beginAtZero: horiz ? beginAtZero : false,
			title: { display: true, text: horiz ? valueAxisTitle : (options.axisX || ""), font: { size: axisLabelFontSize } },
			ticks: { autoSkip: horiz, font: { size: labelFontSize } },
			grid: { display: horiz }
		},
		y: {
			stacked: stacked,
			beginAtZero: horiz ? false : beginAtZero,
			title: { display: true, text: horiz ? (options.axisX || "") : valueAxisTitle, font: { size: axisLabelFontSize } },
			ticks: { autoSkip: !horiz, font: { size: labelFontSize } },
			grid: { display: !horiz }
		}
	};
	/* Room past the tallest bar so the value label is not clipped. */
	if (horiz)
		scales.x.grace = "14%";
	else
		scales.y.grace = "14%";
	if (!floating && !stacked && options.errorMode != "none")
		barPlotApplyErrorAxisExtent(scales, datasets, horiz, beginAtZero, options.errorDirection);

	plugins = {
		title: { display: !!title, text: title, font: { size: titleFontSize } },
		legend: { display: false },
		labels: {
			render: floating ? function () { return ""; } : "value",
			precision: 0,
			showZero: false,
			fontSize: labelFontSize,
			fontColor: "#333",
			position: "default",
			overlap: true
		}
	};
	chartOpts = {
		indexAxis: horiz ? "y" : "x",
		maintainAspectRatio: false,
		resizeDelay: 100,
		scales: scales,
		plugins: plugins,
		barPlotError: {
			color: options.errorColor || "#333333",
			direction: options.errorDirection || "both"
		}
	};

	clearBarPlotChart();
	BarPlotGraph2d = new Chart(document.getElementById("DialogBarPlotVisualizationCanvas"), {
		type: "bar",
		data: { labels: labels, datasets: datasets },
		options: chartOpts,
		plugins: (options.errorMode != "none" && !floating && !stacked) ? [barPlotErrorBarsPlugin] : []
	});
	buildBarPlotLegendHtml(node, legendKeys, legendLabels, legendColors);
	options.drawn = true;
	networkNodes.update(node);
}

function CloseDialogBarPlot(event) {
	hideNodeDialog("DialogBarPlot", event);
}

function SaveBarPlot(event) {
	var canvas, exportCanvas, useWhite, legend, gap = 24, legendWidth = 220, rowH, padTop = 12, swatch = 14, margin, out, ctx, i, y, x0, n, chartW, chartH, contentH, legendBlockH, legendOffsetY, chartY, tw, legendSize, barNode;
	if (event) event.preventDefault();
	canvas = BarPlotGraph2d && BarPlotGraph2d.canvas ? BarPlotGraph2d.canvas : document.getElementById("DialogBarPlotVisualizationCanvas");
	if (!BarPlotGraph2d || !canvas) {
		alert(DonaCadena({cat: "Dibuixeu primer el gràfic.", spa: "Dibuje primero el gráfico.", eng: "Draw the chart first."}));
		return;
	}
	useWhite = confirm(DonaCadena({
		cat: "Voleu fons blanc al PNG?\n\nD'acord = fons blanc\nCancel·la = fons transparent",
		spa: "¿Quiere fondo blanco en el PNG?\n\nAceptar = fondo blanco\nCancelar = fondo transparente",
		eng: "White background for the PNG?\n\nOK = white background\nCancel = transparent background"
	}));
	barNode = getNodeDialog("DialogBarPlot");
	legendSize = (barNode && barNode.barPlotOptions && barNode.barPlotOptions.legendFontSize) ? barNode.barPlotOptions.legendFontSize : 12;
	rowH = chartLegendRowHeight(legendSize);
	legend = BarPlotLastLegend;
	n = legend && legend.labels ? legend.labels.length : 0;
	margin = useWhite ? 24 : 0;
	chartW = canvas.width;
	chartH = canvas.height;
	legendBlockH = padTop + Math.max(n, 1) * rowH + 12;
	contentH = Math.max(chartH, legendBlockH);
	out = document.createElement("canvas");
	out.width = margin + chartW + gap + legendWidth + margin;
	out.height = margin + contentH + margin;
	ctx = out.getContext("2d");
	if (useWhite) {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, out.width, out.height);
	}
	chartY = margin + Math.max(0, (contentH - chartH) / 2);
	ctx.drawImage(canvas, margin, chartY);
	x0 = margin + chartW + gap;
	legendOffsetY = margin + Math.max(0, (contentH - legendBlockH) / 2);
	ctx.font = legendSize + "px sans-serif";
	ctx.textBaseline = "middle";
	for (i = 0; i < n; i++) {
		y = legendOffsetY + padTop + i * rowH + rowH / 2;
		ctx.globalAlpha = legend.hidden[i] ? 0.4 : 1;
		ctx.fillStyle = legend.colors[i] || "#888";
		ctx.fillRect(x0, y - swatch / 2, swatch, swatch);
		ctx.strokeStyle = "#666";
		ctx.strokeRect(x0 + 0.5, y - swatch / 2 + 0.5, swatch - 1, swatch - 1);
		ctx.fillStyle = "#222";
		ctx.fillText("" + legend.labels[i], x0 + swatch + 8, y);
		if (legend.hidden[i]) {
			tw = ctx.measureText("" + legend.labels[i]).width;
			ctx.beginPath();
			ctx.moveTo(x0 + swatch + 8, y);
			ctx.lineTo(x0 + swatch + 8 + tw, y);
			ctx.strokeStyle = "#222";
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}
	function onBlob(blob) {
		if (!blob) {
			alert(DonaCadena({cat: "No s'ha pogut desar la imatge.", spa: "No se ha podido guardar la imagen.", eng: "Could not save the image."}));
			return;
		}
		if (window.showSaveFilePicker) {
			window.showSaveFilePicker({ suggestedName: "bar-chart.png", types: [{ description: "PNG", accept: { "image/png": [".png"] } }] })
				.then(function (h) { return h.createWritable(); })
				.then(function (w) { return w.write(blob).then(function () { return w.close(); }); })
				.catch(function () {
					var a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = "bar-chart.png";
					a.click();
				});
		} else {
			var a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = "bar-chart.png";
			a.click();
		}
	}
	if (out.toBlob)
		out.toBlob(onBlob, "image/png");
	else
		onBlob(radarPlotPngBlobFromDataUrl(out.toDataURL("image/png")));
}

function disableClassificationInBarPlot() {
	/* legacy no-op: pie removed */
}
