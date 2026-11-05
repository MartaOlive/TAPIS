/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023-2024 Joan Masó

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
    
    The TAPIS can be updated from https://github.com/joanma747/tapis.

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at ieee org) 
    dins del grup del MiraMon. MiraMon és un projecte del 
    CREAF que elabora programari de Sistema d'Informació Geogràfica 
    i de Teledetecció per a la visualització, consulta, edició i anàlisi 
    de mapes ràsters i vectorials. Aquest progamari programari inclou
    aplicacions d'escriptori i també servidors i clients per Internet.
    No tots aquests productes són gratuïts o de codi obert. 
    
    En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
    El TAPIS es pot actualitzar des de https://github.com/joanma747/tapis.
*/

"use strict"

		function ShowTableAttributesAndAgrregationsDialog(div_id, parentNode, node) {
			var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata,
				selectedColumns=node["STA"+div_id], s;
			
			if (!selectedColumns)
				return;

			if (!data || !data.length) {
				return;
			}
			var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
			const dataAttributesArray = Object.keys(dataAttributes);

			for (var a = 0; a < dataAttributesArray.length; a++) {
				s=getAttributesAndAgrregationsJSONAsText(selectedColumns[a]);
				document.getElementById(div_id+"_label_	" + a).innerHTML=dataAttributesArray[a] + (s=="" ? "" : ", " + s);
				document.getElementById(div_id+"_" + a).value=JSON.stringify(selectedColumns[a]);
			}
		}
		function AddSelectedOptionsToAggrGroupBy(event, nodeId) {
			var node = networkNodes.get(nodeId), parentNode=GetFirstParentNode(node), selectedColumn=[];

			for(var i=0; i<AggregationsOptions.length; i++) {
				if (document.getElementById("DialogGroupByAggr"+AggregationsOptions[i].name).checked)
					selectedColumn.push(AggregationsOptions[i].name);
			}
			var s=getAttributesAndAgrregationsJSONAsText(selectedColumn);
			var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata;
			
			if (!data || !data.length) {
				return;
			}
			var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
			const dataAttributesArray = Object.keys(dataAttributes);

			for (var a = 0; a < dataAttributesArray.length; a++) {
				if (document.getElementById("GroupByAttributesAggr"+"_" + a).checked)
				{
					document.getElementById("GroupByAttributesAggr"+"_label_" + a).innerHTML=getHTMLCharacterAttributeType(dataAttributes[dataAttributesArray[a]].type) +' ' + dataAttributesArray[a] + (s=="" ? "" : ", " + s);
					document.getElementById("GroupByAttributesAggr"+"_" + a).value=JSON.stringify(selectedColumn);
				}
			}
		}
		
		function CheckSelectedAggrGroupBy(event, nodeId) {
			var node = networkNodes.get(nodeId), parentNode=GetFirstParentNode(node), selectedColumn, s;

			var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata;
			
			if (!data || !data.length) {
				return;
			}
			var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
			const dataAttributesArray = Object.keys(dataAttributes);

			var somethingSelected=false,somethingCheck=false;
			for (var a = 0; a < dataAttributesArray.length; a++) {
				if (document.getElementById("GroupByAttributesAggr"+"_" + a).checked) {
					somethingCheck=true;
					s=document.getElementById("GroupByAttributesAggr"+"_" + a).value;
					if (s) {
						selectedColumn=JSON.parse(s);
						for(var i=0; i<AggregationsOptions.length; i++) {
							document.getElementById("DialogGroupByAggr"+AggregationsOptions[i].name).checked=selectedColumn.indexOf(AggregationsOptions[i].name)==-1 ? false : true;
							if (selectedColumn.indexOf(AggregationsOptions[i].name)!=-1)
								somethingSelected=true;
						}
						if (somethingSelected)
							break;
					}
				}
			}
			for(var i=0; i<AggregationsOptions.length; i++)
			{
				document.getElementById("DialogGroupByAggr"+AggregationsOptions[i].name).disabled=!somethingCheck;
				if (!somethingCheck)
					document.getElementById("DialogGroupByAggr"+AggregationsOptions[i].name).checked=false;
			}
		}

		function showCheckRadioOptions(div_name, div_option_prefix, options, nCols, radio_name, fEvent) {
			var cdns=[];
			
			cdns.push('<table border="0">');
			for(var j=0; j<options.length/nCols; j++) {
				cdns.push('<tr>');
				for(i=0; i<nCols; i++)
					cdns.push('<td><label><input type="', (radio_name ? 'radio" name="'+radio_name : 'checkbox'), '" id="',div_option_prefix,options[j*nCols+i].name,'"', (fEvent ? ' onChange="'+fEvent+'"' : ''),'></input>',options[j*nCols+i].desc,'</label></td>');
				cdns.push('</tr>');
			}
			if (options.length%nCols) {
				cdns.push('<tr>');
				for(var i=0; i<options.length%nCols; i++)
					cdns.push('<td><label><input type="', (radio_name ? 'radio" name="'+radio_name : 'checkbox'), '" id="',div_option_prefix,options[j*nCols+i].name,'"', (fEvent ? ' onChange="'+fEvent+'"' : ''),'></input>',options[j*nCols+i].desc,'</label></td>');
				cdns.push('</tr>');
			}
			cdns.push('</table>');
			document.getElementById(div_name).innerHTML=cdns.join("");
		}

		function getAttributesAndAgrregationsJSONAsText(selectedColumn) {
			var s="";
			for (var i = 0; i < AggregationsOptions.length; i++) {
				if (selectedColumn.indexOf(AggregationsOptions[i].name)!=-1)
					s+=AggregationsOptions[i].desc + ", ";
			}
			if (s=="")
				return "";
			return s.slice(0,-2);
		}


		/* Columns to tick in "GroupBy:" — includes the date column stored in groupByDate[1]. */
		function groupByColumnsForDialog(params) {
			var cols, dateCol;
			if (!params)
				return null;
			cols = (params.groupByAttr && params.groupByAttr.length) ? params.groupByAttr.slice() : [];
			dateCol = params.groupByDate && params.groupByDate.length > 1 ? params.groupByDate[1] : "";
			if (dateCol && cols.indexOf(dateCol) === -1)
				cols.push(dateCol);
			return cols.length ? cols : null;
		}

		/* Like charts / FilterRowsTable: restore only if already applied for this parent; else blank. */
		function groupByParamsForDialog(parentNode, node) {
			var params = node.groupByParams, parentId;
			if (!params)
				return null;
			parentId = parentNode && parentNode.id != null ? parentNode.id : null;
			if (params.sourceParentId != null && parentId != null && params.sourceParentId !== parentId) {
				delete node.groupByParams;
				node.STAdata = null;
				node.STAdataAttributes = null;
				if (typeof networkNodes !== "undefined")
					networkNodes.update(node);
				return null;
			}
			return params;
		}

		function onGroupByDateRoundingEnableChange() {
			var enableEl = document.getElementById("DialogGroupByDateRoundingEnable");
			var enabled = !!(enableEl && enableEl.checked);
			var i, el;
			for (i = 0; i < GroupByDateTimeOptions.length; i++) {
				el = document.getElementById("DialogGroupByDateTime" + GroupByDateTimeOptions[i].name);
				if (el)
					el.disabled = !enabled;
			}
		}

		function ShowGroupByDialog(parentNode, node) {
			var params, groupCols, aggr, dateRounding, el, enableEl;
			saveNodeDialog("DialogGroupBy", node);
			params = groupByParamsForDialog(parentNode, node);
			groupCols = groupByColumnsForDialog(params);
			aggr = params && params.aggregationAttr ? params.aggregationAttr : null;
			ShowTableSelectColumnsDialogSelect("GroupBySelects", parentNode, node, groupCols, null);
			ShowTableSelectColumnsDialogSelect("GroupByAttributesAggr", parentNode, node, aggr, "CheckSelectedAggrGroupBy(event, \""+node.id+"\")");
			showCheckRadioOptions("DialogGroupByDateTimeOptionsHTML", "DialogGroupByDateTime", GroupByDateTimeOptions, 1, "DialogGroupByDateTimeOption");
			showCheckRadioOptions("DialogGroupByAggregationOptionsHTML", "DialogGroupByAggr", AggregationsOptions, 3, null, "AddSelectedOptionsToAggrGroupBy(event, '"+node.id+"')");
			enableEl = document.getElementById("DialogGroupByDateRoundingEnable");
			dateRounding = params && params.groupByDate && params.groupByDate.length ? params.groupByDate[0] : "";
			if (enableEl)
				enableEl.checked = !!dateRounding;
			if (dateRounding) {
				el = document.getElementById("DialogGroupByDateTime" + dateRounding);
				if (el)
					el.checked = true;
			}
			onGroupByDateRoundingEnableChange();
			CheckSelectedAggrGroupBy(null, node.id);
			return;
		}

		/** Date column for GroupBy: declared isodatetime or detected via statistics.js itIsADate(). */
		function groupByIsDateColumn(data, dataAttributes, columnName) {
			if (dataAttributes && dataAttributes[columnName] && dataAttributes[columnName].type == "isodatetime")
				return true;
			if (typeof itIsADate === "function" && data && data.length)
				return itIsADate(data, columnName);
			return false;
		}

		function GetGroupBy(event) {
			hideNodeDialog("DialogGroupBy", event);
			
			var node= getNodeDialog("DialogGroupBy");
			node.groupByParams={groupByAttr: [], groupByDate:[], aggregationAttr:{}};
			var parentNode=GetFirstParentNode(node);

			var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata;

			if (!data || !data.length) {
				return;
			}
			var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
			const dataAttributesArray = Object.keys(dataAttributes);
			var dateTypeAttr=[], s, d;

			for (var a = 0; a < dataAttributesArray.length; a++) {
				if (document.getElementById("GroupBySelects_" + a).checked) { //groupBy
					if (groupByIsDateColumn(data, dataAttributes, dataAttributesArray[a])) {
						dateTypeAttr.push(dataAttributesArray[a]);
						if (dataAttributes[dataAttributesArray[a]] && dataAttributes[dataAttributesArray[a]].type != "isodatetime")
							dataAttributes[dataAttributesArray[a]].type = "isodatetime";
					} else {
						node.groupByParams.groupByAttr.push(dataAttributesArray[a]);
					}
				}
				s=document.getElementById("GroupByAttributesAggr"+"_" + a).value; //Attributes
				if (s)
					node.groupByParams.aggregationAttr[dataAttributesArray[a]]=JSON.parse(s);
				
			}

			var roundingEnabled = !!(document.getElementById("DialogGroupByDateRoundingEnable") &&
				document.getElementById("DialogGroupByDateRoundingEnable").checked);
			if (roundingEnabled) {
				for (var i = 0; i < GroupByDateTimeOptions.length; i++) { // radio: rounding unit
					if (document.getElementById("DialogGroupByDateTime" + GroupByDateTimeOptions[i].name).checked) {
						node.groupByParams.groupByDate.push(GroupByDateTimeOptions[i].name);
						break;
					}
				}
				if (!node.groupByParams.groupByDate.length) {
					alert(DonaCadena({cat: "Seleccioneu la unitat d'arrodoniment de la data (any, mes, dia…).", spa: "Seleccione la unidad de redondeo de la fecha (año, mes, día…).", eng: "Select the date rounding unit (year, month, day…)."}));
					return;
				}
			}

			if (roundingEnabled && node.groupByParams.groupByDate.length==1 && dateTypeAttr.length>1) {
				alert(DonaCadena({cat: "Per aplicar l'arrodoniment de dates, només es permet seleccionar un atribut de tipus data", spa: "Para aplicar el redondeo de fechas, solo se permite seleccionar un atributo de tipo fecha", eng: "To apply date rounding only one date type attribute is allowed to be selected"}));
				return;
			} else if (roundingEnabled && node.groupByParams.groupByDate.length==1 && dateTypeAttr.length==1) {
				node.groupByParams.groupByDate.push(...dateTypeAttr);
			} else if (roundingEnabled && node.groupByParams.groupByDate.length==1 && dateTypeAttr.length==0) {
				alert(DonaCadena({cat: "Per aplicar l'arrodoniment de dates, cal seleccionar un atribut de tipus data", spa: "Para aplicar el redondeo de fechas, debe seleccionar un atributo de tipo fecha", eng: "To apply date rounding one date type attribute is has to be selected"}));
				return;
			} else {
				/* No date rounding: still group by date columns as normal keys. */
				for (d = 0; d < dateTypeAttr.length; d++)
					node.groupByParams.groupByAttr.push(dateTypeAttr[d]);
				node.groupByParams.groupByDate = [];
			}

			if (parentNode && parentNode.id != null)
				node.groupByParams.sourceParentId = parentNode.id;

			var dataCurrentAttributes={};
			node.STAdata=GroupByTableData(data, dataAttributes, dataCurrentAttributes, node.groupByParams);
			node.STAdataAttributes=dataCurrentAttributes;
			networkNodes.update(node);
			updateQueryAndTableArea(node);
			UpdateChildenTable(node);
		}
		function UpdateGroupBy(node) {
			var parentNode=GetFirstParentNode(node);
			var data, dataAttributes, dataCurrentAttributes, params;
			if (!parentNode)
				return;
			params = groupByParamsForDialog(parentNode, node);
			if (!params)
				return;
			data = parentNode.STAdata ? parentNode.STAdata : node.STAdata;
			if (!data || !data.length) {
				return;
			}
			dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
			dataCurrentAttributes={};
			node.STAdata=GroupByTableData(data, dataAttributes, dataCurrentAttributes, params);
			node.STAdataAttributes=dataCurrentAttributes;
			networkNodes.update(node);
		}
