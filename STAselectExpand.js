/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023 Joan Masó

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

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at uab cat) 
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

		function GetKVPSelectedSelectExpands(selectedExpands, first) {
			var s, cdns=[];
			if (!selectedExpands)
				return "";
			var selectedArray=Object.keys(selectedExpands.selected);
			if (selectedArray.length) {
				cdns.push("$select=");
				for (var i=0; i<selectedArray.length; i++) {
					cdns.push(selectedArray[i]);
					if (i+1<selectedArray.length)
						cdns.push(",");
				}
			}
			var expandedArray=Object.keys(selectedExpands.expanded)
			if (expandedArray.length){
				if (selectedArray.length)
					cdns.push(first ? "&" : ";");
				cdns.push("$expand=");
				for (var i=0; i<expandedArray.length; i++) {
					cdns.push(expandedArray[i]);
					s=GetKVPSelectedSelectExpands(selectedExpands.expanded[expandedArray[i]], false);
					if (s)
						cdns.push("(", s, ")");	
					if (i+1<expandedArray.length)
						cdns.push(",");
				}
			}
			return cdns.join("");
		}

		function GetSelectExpands(event) {
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogSelectExpands").close();
			
			var previousSTAURL = currentNode.STAURL;
			//var dataAttributes = currentNode.STAdataAttributes ? currentNode.STAdataAttributes : getDataAttributes(currentNode.STAdata);
			/*if (!currentNode.STASelectedExpands)
				currentNode.STASelectedExpands={STAURLUnexpanded: currentNode.STAURL, dataAttributesUnexpanded: deapCopy(dataAttributes), selected: []};
			else
				currentNode.STAURL = currentNode.STASelectedExpands.STAURLUnexpanded;
			
			if (document.getElementById("DialogSelectExpandsHTML").style.display != "none")
			{
				var dataAttr=currentNode.STASelectedExpands.dataAttributesUnexpanded;
				var dataAttrArray=Object.keys(dataAttr)
				for (var a = 0; a < dataAttrArray.length; a++) {
					if (document.getElementById("SelectExpand_" + a) && document.getElementById("SelectExpand_" + a).checked)
						break;
				}
				if (a < dataAttrArray.length) //A checked attribute has been found ("for" breaks before ending).
				{
					var s;
					currentNode.STAURL = AddQueryParamsToURL(currentNode.STAURL, "$expand=");
					for (var a = 0; a < dataAttrArray.length; a++) {
						if (document.getElementById("SelectExpand_" + a) && 
							document.getElementById("SelectExpand_" + a).checked && 
							dataAttrArray[a].endsWith("@iot.navigationLink")){
							s = dataAttrArray[a].substring(0, dataAttrArray[a].length-"@iot.navigationLink".length);
							currentNode.STAURL += s + ",";
							currentNode.STASelectedExpands.selected[a]=true;
						}
						else
							currentNode.STASelectedExpands.selected[a]=false;
					}
					currentNode.STAURL = currentNode.STAURL.slice(0, -1); //remove the last coma.
				}
				else   //If no selected collumn has been found, no expand is needed and the previous request is fine
				{					
					for (var a = 0; a < dataAttrArray.length; a++)
						currentNode.STASelectedExpands.selected[a]=false;
				}
			}*/
			if (document.getElementById("DialogSelectExpandsHTML").style.display != "none") {
				GetSelectedSelectExpandsDialog(currentNode);
				var s=GetKVPSelectedSelectExpands(currentNode.STASelectedExpands, true);
				if (s)
					currentNode.STAURL = AddQueryParamsToURL(currentNode.STAURL, s);
			}
			if (!isNaN(parseInt(document.getElementById("SelectExpandsNumberOfRecords").value)))
				currentNode.STAExpectedLength = parseInt(document.getElementById("SelectExpandsNumberOfRecords").value);
			networkNodes.update(currentNode);
			showInfoMessage("Selecting and Expanding STA columns...");
			UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
			LoadJSONNodeSTAData(currentNode);
		}

		function GetSelectedSelectExpandsDialog(node)
		{
			var data = node.STAdata; 
				
			if (!node.STASelectedExpands)
				node.STASelectedExpands={selected: [], expanded: []};
			else {
				node.STASelectedExpands.selected=[];
				node.STASelectedExpands.expanded=[];
			}

			var dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);
			const dataAttributesArray = Object.keys(dataAttributes);
			
			GetSelectedLevelSelectExpandsDialog(dataAttributesArray, node.STASelectedExpands, STAEntitiesArray[IdOfSTAEntity(GetFirstParentNode(node))], "");
			networkNodes.update(node);
		}

		function GetSelectedLevelSelectExpandsDialog(dataAttributesArray, selectedExpands, staEntityName, prefix)
		{
			var entity= getSTAEntityPlural(staEntityName, true);
			var entities=STAEntities[entity].entities;

			var properties = [], n= STAEntities[entity].properties.length;
			for (var p = 0; p < n; p++) {
				properties.push(STAEntities[entity].properties[p].name)
			}


			if (dataAttributesArray) {
				for (var a = 0; a < dataAttributesArray.length; a++)
				{
					var da=dataAttributesArray[a]
					for (var e=0; e < properties.length; e++)
					{
						if (properties[e]==da)
						{
							if (document.getElementById("SelectExpand_select_" + prefix + "_" + da)?.checked)
								selectedExpands.selected[da]=true;
						}
					}
				}
			} else {
				for (var e=0; e < properties.length; e++) {
					if (document.getElementById("SelectExpand_select_" + prefix + "_" + properties[e])?.checked)
						selectedExpands.selected[properties[e]]=true;
				}
			}

			if (dataAttributesArray) {
				for (var a = 0; a < dataAttributesArray.length; a++)
				{
					if (dataAttributesArray[a].endsWith("@iot.navigationLink"))
					{
						var da=dataAttributesArray[a].substring(0, dataAttributesArray[a].length-"@iot.navigationLink".length);
						for (var e=0; e < entities.length; e++)
						{
							if (entities[e]==da)
							{
								if (document.getElementById("SelectExpand_expand_" + prefix + "_" + da)?.checked) {
									selectedExpands.expanded[da]={selected: [], expanded: []};
									GetSelectedLevelSelectExpandsDialog(null, selectedExpands.expanded[da], da, prefix+da);
								}
								break;
							}
						}
					}
				}
			} else {
				for (var e=0; e < entities.length; e++) {
					if (document.getElementById("SelectExpand_expand_" + prefix + "_" + entities[e])?.checked) {
						selectedExpands.expanded[entities[e]]={selected: [], expanded: []};
						GetSelectedLevelSelectExpandsDialog(null, selectedExpands.expanded[entities[e]], entities[e], prefix+entities[e]);
					}
				}
			}
		}

		function RedrawTableSelectExpandsNodeId(nodeId)
		{	
			var node = networkNodes.get(nodeId);
			GetSelectedSelectExpandsDialog(node);
			ShowTableSelectExpandsDialog(GetFirstParentNode(node), node, true);
		}

		function GetHTMLLevelSelectExpandsDialog(dataAttributesArray, selectedExpands, node, staEntityName, staEntityParentName, prefix, spaces)
		{
			var cdns=[];

			var entity= getSTAEntityPlural(staEntityName, true);
			var entities=STAEntities[entity].entities;

			var properties = [], n= STAEntities[entity].properties.length;
			for (var p = 0; p < n; p++) {
				properties.push(STAEntities[entity].properties[p].name)
			}

			cdns.push(spaces, "Properties (to select):<br>");
			if (dataAttributesArray) {
				for (var a = 0; a < dataAttributesArray.length; a++)
				{
					var da=dataAttributesArray[a]
					for (var e=0; e < properties.length; e++)
					{
						if (properties[e]==da)
						{
							cdns.push(spaces, "<label><input type='checkbox'", ((selectedExpands && selectedExpands.selected[da]) ? "checked='checked'" : ""), " id='SelectExpand_select_", prefix, "_", da, "'/> ", da, "</label><br>");
							break;
						}
					}
				}
			} else {
				for (var e=0; e < properties.length; e++)
					cdns.push(spaces, "<label><input type='checkbox'", ((selectedExpands && selectedExpands.selected[properties[e]]) ? "checked='checked'" : ""), " id='SelectExpand_select_", prefix, "_", properties[e], "' /> ", properties[e], "</label><br>");
			}

			var staEntityParentNamePlural=getSTAEntityPlural(staEntityParentName, true)
			cdns.push(spaces, "Entities (to expand):<br>");
			if (dataAttributesArray) {
				for (var a = 0; a < dataAttributesArray.length; a++)
				{
					if (dataAttributesArray[a].endsWith("@iot.navigationLink"))
					{
						var da=dataAttributesArray[a].substring(0, dataAttributesArray[a].length-"@iot.navigationLink".length);
						for (var e=0; e < entities.length; e++)
						{
							if (entities[e]==da && staEntityParentNamePlural!=da)
							{
								cdns.push(spaces, "<label><input type='checkbox'", ((selectedExpands && selectedExpands.expanded[da]) ? "checked='checked'" : ""), " id='SelectExpand_expand_", prefix, "_", da, "' onClick='RedrawTableSelectExpandsNodeId(\"", node.id, "\")' /> ", da, "</label><br>");
								if (selectedExpands && selectedExpands.expanded[da])
									cdns.push(GetHTMLLevelSelectExpandsDialog(null, selectedExpands.expanded[da], node, da, staEntityName, prefix+da, spaces+"&emsp;"));
								break;
							}
						}
					}
				}
			} else {
				for (var e=0; e < entities.length; e++)
				{
					if (staEntityParentNamePlural!=entities[e]) {  //Evito que ofereixi l'objecte anterior (i vaig endarrera) 
						cdns.push(spaces, "<label><input type='checkbox'", ((selectedExpands&& selectedExpands.expanded[entities[e]]) ? "checked='checked'" : ""), " id='SelectExpand_expand_", prefix, "_", entities[e], "' onClick='RedrawTableSelectExpandsNodeId(\"", node.id, "\")' /> ", entities[e], "</label><br>");
						if (selectedExpands && selectedExpands.expanded[entities[e]])
							cdns.push(GetHTMLLevelSelectExpandsDialog(null, selectedExpands.expanded[entities[e]], node, entities[e], staEntityName, prefix+entities[e], spaces+"&emsp;"))
					}
				}
			}
			return cdns.join("");
		}

		function ShowTableSelectExpandsDialog(parentNode, node, expandCheckboxes) 
		{
			var cdns=[];
			if (expandCheckboxes)
			{
				if (parentNode.STAURL)
					node.STAURL = parentNode.STAURL;
				if (parentNode.STAdata)
					node.STAdata = deapCopy(parentNode.STAdata);
				if (parentNode.STAdataAttributes)
					node.STAdataAttributes = deapCopy(parentNode.STAdataAttributes);
				networkNodes.update(node);
				var data = node.STAdata, selectedExpands=node.STASelectedExpands;
		
				if (!data || !data.length) {
					document.getElementById("DialogSelectExpandsCheckBoxes").innerHTML = "No data to show.";
					return;
				}
	
				var dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);
				const dataAttributesArray = Object.keys(dataAttributes);
				cdns.push(GetHTMLLevelSelectExpandsDialog(dataAttributesArray, selectedExpands, node, STAEntitiesArray[IdOfSTAEntity(parentNode)], null, "", ""));
				document.getElementById("DialogSelectExpandsCheckBoxes").innerHTML = cdns.join("");
				document.getElementById("DialogSelectExpandsHTML").style.display = "inline-block";
			}
			else
				document.getElementById("DialogSelectExpandsHTML").style.display = "none";
			document.getElementById("SelectExpandsNumberOfRecords").value=node.STAExpectedLength;	
		}
