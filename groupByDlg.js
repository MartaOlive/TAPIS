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


		function ShowGroupByDialog(parentNode, node) {
			saveNodeDialog("DialogGroupBy", node);
			ShowTableSelectColumnsDialog("GroupBySelects", parentNode, node, false, null);
			ShowTableSelectColumnsDialog("GroupByAttributesAggr", parentNode, node, false, "CheckSelectedAggrGroupBy(event, '"+node.id+"')");
			ShowTableAttributesAndAgrregationsDialog("GroupByAttributesAggr", parentNode, node);
			showCheckRadioOptions("DialogGroupByDateTimeOptionsHTML", "DialogGroupByDateTime", GroupByDateTimeOptions, 1, "DialogGroupByDateTimeOption");
			showCheckRadioOptions("DialogGroupByAggregationOptionsHTML", "DialogGroupByAggr", AggregationsOptions, 3, null, "AddSelectedOptionsToAggrGroupBy(event, '"+node.id+"')");
			CheckSelectedAggrGroupBy(null, node.id);
			return;
		}

		function GetGroupBy(event) {
			var groupByParams={groupByAttr: [], groupByDate:[], aggregationAttr:{}};
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogGroupBy").close();
			
			var node= getNodeDialog("DialogGroupBy");
			var parentNode=GetFirstParentNode(node);

			var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata;

			if (!data || !data.length) {
				return;
			}
			var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
			const dataAttributesArray = Object.keys(dataAttributes);
			var dateTypeAttr=[],s;

			for (var a = 0; a < dataAttributesArray.length; a++) {
				if (document.getElementById("GroupBySelects_" + a).checked) //groupBy
					
					if(dataAttributes[dataAttributesArray[a]]["type"]=="isodatetime"){
						dateTypeAttr.push(dataAttributesArray[a]);
					} else{
						groupByParams.groupByAttr.push(dataAttributesArray[a]);
					}
				s=document.getElementById("GroupByAttributesAggr"+"_" + a).value; //Attributes
				if (s)
					groupByParams.aggregationAttr[dataAttributesArray[a]]=JSON.parse(s);
				
			}

			for (var i = 0; i < GroupByDateTimeOptions.length; i++) { //radioButtons (time period to groupBy)
				if (document.getElementById("DialogGroupByDateTime" + GroupByDateTimeOptions[i].name).checked) {
					groupByParams.groupByDate.push(GroupByDateTimeOptions[i].name);
					break;
				}
			}


			if (groupByParams.groupByDate.length==1 && dateTypeAttr.length>1) alert("To apply date rounding only one date type attribute is allowed to be selected");
			else if  (groupByParams.groupByDate.length==1 && dateTypeAttr.length==1)groupByParams.groupByDate.push(...dateTypeAttr);
			else if(groupByParams.groupByDate.length==1 && dateTypeAttr.length==0)alert ("To apply date rounding one date type attribute is has to be selected");

			var dataCurrentAttributes={};
			node.STAdata=GroupByTableData(data, dataAttributes, dataCurrentAttributes, groupByParams);
			node.STAdataAttributes=dataCurrentAttributes;
			networkNodes.update(node);
		}
