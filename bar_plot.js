/* Bar plot (vertical / horizontal / floating / stacked) + error whiskers */
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
	if (te) te.value = options.titleFontSize || 16;
	if (tv) tv.textContent = "" + (options.titleFontSize || 16);
	if (le) le.value = options.labelFontSize || 12;
	if (lv) lv.textContent = "" + (options.labelFontSize || 12);
}

function onBarPlotStyleChange(redraw) {
	var node = getNodeDialog("DialogBarPlot");
	var ts = parseInt(document.getElementById("DialogBarPlotTitleSize").value, 10) || 16;
	var ls = parseInt(document.getElementById("DialogBarPlotLabelSize").value, 10) || 12;
	syncBarPlotStyleControls({ titleFontSize: ts, labelFontSize: ls });
	if (node) {
		if (!node.barPlotOptions) node.barPlotOptions = {};
		node.barPlotOptions.titleFontSize = ts;
		node.barPlotOptions.labelFontSize = ls;
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
	for (i = 0; i < keys.length; i++) {
		hidden = options.hiddenSeries.indexOf(keys[i]) != -1;
		hiddenFlags.push(hidden);
		eyeTitle = hidden ? DonaCadena({cat: "Mostra", spa: "Mostrar", eng: "Show"}) : DonaCadena({cat: "Amaga", spa: "Ocultar", eng: "Hide"});
		cdns += '<div class="DialogBarPlotLegendItem' + (hidden ? " is-hidden" : "") + '">';
		cdns += '<button type="button" class="DialogBarPlotLegendSwatch" style="background-color:' + barPlotEscapeAttr(colors[i]) +
			';" onclick="onBarLegendColorClick(\'' + barPlotEscapeJs(keys[i]) + '\',event)"></button>';
		cdns += '<button type="button" class="DialogBarPlotLegendEye" title="' + barPlotEscapeAttr(eyeTitle) +
			'" onclick="onBarLegendEyeClick(\'' + barPlotEscapeJs(keys[i]) + '\')">' + (hidden ? "&#10005;" : "&#128065;") + "</button>";
		cdns += '<span class="DialogBarPlotLegendLabel">' + barPlotEscapeAttr(labels[i]) + "</span></div>";
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
	var options, barType, title, beginAtZero, titleFontSize, labelFontSize;
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
			title: { display: true, text: horiz ? valueAxisTitle : (options.axisX || "") },
			ticks: { autoSkip: horiz, font: { size: labelFontSize } },
			grid: { display: horiz }
		},
		y: {
			stacked: stacked,
			beginAtZero: horiz ? false : beginAtZero,
			title: { display: true, text: horiz ? (options.axisX || "") : valueAxisTitle },
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
	var canvas, exportCanvas, useWhite, legend, gap = 24, legendWidth = 220, rowH = 22, padTop = 12, swatch = 14, margin, out, ctx, i, y, x0, n, chartW, chartH, contentH, legendBlockH, legendOffsetY, chartY, tw;
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
	ctx.font = "12px sans-serif";
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
