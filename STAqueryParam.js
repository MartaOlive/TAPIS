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

//Supposts that selectedExpands or selectExpandNextOrigin are undefined
function GetSTASelectExpandNextOrigin(selectedExpands, selectExpandNextOrigin)
{
	if (!selectExpandNextOrigin || !selectedExpands)
		return selectedExpands; 
	var r=selectedExpands;
	for (var i=0; i<selectExpandNextOrigin.length; i++)		
		r=r.expanded[selectExpandNextOrigin[i]];
	return r;
}

function RemoveQueryParamSelectExpands(url) {
	return RemoveQueryParamFromURL(RemoveQueryParamFromURL(RemoveQueryParamFromURL(RemoveQueryParamFromURL(RemoveQueryParamFromURL(RemoveQueryParamFromURL(url, "$select"), "$expand"), "$top"), "$skip"), "$orderby"),"$filter") ;
}

function GetQueryParamSelectedSelectExpands(selectedExpands, recursive) {
	var s, cdns=[];

	if (!recursive)
		recursive=0;
	if (!selectedExpands)
		return "";
	if (selectedExpands.selected) {
		var selectedArray=(typeof selectedExpands.selected.length === "undefined") ? Object.keys(selectedExpands.selected): selectedExpands.selected;
		if (selectedArray.length) {
			for (var i=0; i<selectedArray.length; i++) {
				if (typeof selectedExpands.selected.length === "undefined" && !selectedExpands.selected[selectedArray[i]])
					continue;
		
				if (selectedArray[i]=="@iot.selfLink")
					s = selectedArray[i];
				else if (selectedArray[i].startsWith("@iot."))
					s = selectedArray[i].substring(5);
				else
					s = selectedArray[i].replace("@iot.", "/");  //Changes Datastreams@iot.navigationLink to Datastreams/navigationLink
				cdns.push(s);
				cdns.push(',');
			}
			if (cdns.length)
			{
				cdns.unshift("$select=");
				cdns.pop(); //Treu la ','
			}
		}
	}
	if (selectedExpands.skip) {
		if (cdns.length)
			cdns.push(recursive ? ";" : "&");
		cdns.push("$skip=", selectedExpands.skip);
	}
	if (selectedExpands.top) {
		if (cdns.length)
			cdns.push(recursive ? ";" : "&");
		cdns.push("$top=", selectedExpands.top);
	}
	if (selectedExpands.orderBy && selectedExpands.orderBy.attribute) {
		if (cdns.length)
			cdns.push(recursive ? ";" : "&");
		cdns.push("$orderby=", selectedExpands.orderBy.attribute, " ", (selectedExpands.orderBy.desc ? "desc": "asc"));
	}
	 if (selectedExpands.filter){
	 	var urlFilterPart=builtFilterSTAsentence(selectedExpands.filter);
		 if (cdns.length)cdns.push(recursive ? ";" : "&");
	 	cdns.push("$filter=");
	 	cdns.push(urlFilterPart);
	 }
	var expandedArray=Object.keys(selectedExpands.expanded)
	if (expandedArray.length){
		if (cdns.length)
			cdns.push(recursive ? ";" : "&");
		cdns.push("$expand=");
		for (var i=0; i<expandedArray.length; i++) {
			cdns.push(expandedArray[i]);
			s=GetQueryParamSelectedSelectExpands(selectedExpands.expanded[expandedArray[i]], ++recursive);
			if (s)
				cdns.push("(", s, ")");	
			if (i+1<expandedArray.length)
				cdns.push(",");
		}
	}
	return cdns.join("");
}
function builtFilterSTAsentence(STAFilter){
	var STAFilterSchemaKeys= Object.keys(STAFilter.filterSchema);
	STAFilterSchemaKeys= STAFilterSchemaKeys.sort();
	var url="";
	var node= getNodeDialog("DialogFilterRows");
	var STAFilterCopia=deapCopy(STAFilter.filterSchema);
	var group;

	for (var i=0;i<STAFilterSchemaKeys.length;i++){
		group=STAFilterSchemaKeys[i]
		if (group.charAt(0)=="0"){

			
			url= builtFilterSTAsentenceByparts(STAFilterCopia[group], STAFilter.filterData,STAFilter.entity);
			STAFilterCopia[group] = url;
		}else{
			url="";
			for (var e=0;e<STAFilterCopia[group].items.length;e++){
				if (e!=0 && STAFilterCopia[group].nexus!=null)url+=" "+STAFilterCopia[group].nexus +" "; //avoid nexus at the beginning
				url+=STAFilterCopia[STAFilterCopia[group].items[e]];
				if(e==STAFilterCopia[group].items.length-1){ //last one 
					if(STAFilterCopia[group].items.length>1 && i!=STAFilterSchemaKeys.length-1) url="("+url+")";
					STAFilterCopia[group]=url;
					break;
				}
			}
			
			
		}
	}

	return url;
 }


 function builtFilterSTAsentenceByparts(filterSchemaItems, filterData, entity) {
	var  urlPart="", infoFilter;
	if (filterSchemaItems.items.length > 1) urlPart += "(";

	for (var i = 0; i < filterSchemaItems.items.length; i++) {
		if(i!=0 && !filterSchemaItems.items.length-1)urlPart+=" " + filterSchemaItems.nexus + " " ;
		for (var e= 0;e<filterData.length;e++){
			if (filterData[e][0]==filterSchemaItems.items[i]){
				infoFilter=filterData[e];
				break;
			}
		}

		var valueOfEntity = infoFilter[1];
		var lengthEntity = valueOfEntity.indexOf("/")
		if (-1 != lengthEntity) { //Erase first entity name in the path
			valueOfEntity = valueOfEntity.slice(lengthEntity + 1); //Erase entity and "/"
		}
		///Apply filter depending on Select Condition
		if (infoFilter[3] == ' = ' || infoFilter[3] == ' &ne; ' || infoFilter[3] == ' &ge; ' || infoFilter[3] == ' > ' || infoFilter[3] == ' &le; ' || infoFilter[3] == ' < ') { //passarho a com STA+
			
			if (getSTAEntityPlural(entity) != valueOfEntity) { //If it's not the entity of the node and it is a connected box need "node entity name "
				urlPart += valueOfEntity + "/";
			}
			urlPart += infoFilter[2][0];
			if (infoFilter[2].length == 2) {
				urlPart += infoFilter[2][1];
			}
			var typeOfValue = infoFilter[5];
			var apostropheOrSpace;
			(typeOfValue == "text") ? apostropheOrSpace = "'" : apostropheOrSpace = "";
			switch (infoFilter[3]) {
				case ' = ':
					urlPart += " eq " + apostropheOrSpace + infoFilter[4] + apostropheOrSpace ;
					break;
				case ' &ne; ':
					urlPart += " ne " + apostropheOrSpace + infoFilter[4] + apostropheOrSpace ;
					break;
				case ' &ge; ':
					urlPart += " ge " + apostropheOrSpace + infoFilter[4] + apostropheOrSpace ;
					break;
				case ' > ':
					urlPart += " gt " + apostropheOrSpace + infoFilter[4] + apostropheOrSpace ;
					break;
				case ' &le; ':
					urlPart += " le " + apostropheOrSpace + infoFilter[4] + apostropheOrSpace ;
					break;
				case ' < ':
					urlPart += " lt " + apostropheOrSpace + infoFilter[4] + apostropheOrSpace ;
					break;
				default:
			}
		}
		else if (infoFilter[3] == ' [a,b] ' || infoFilter[3] == ' (a,b] ' || infoFilter[3] == ' [a,b) ' || infoFilter[3] == ' (a,b) ') {
			if (entity != valueOfEntity) {
				valueOfEntity = valueOfEntity + "/" + infoFilter[2];
			} else {
				valueOfEntity = infoFilter[2];
			}
			if (infoFilter[2].length == 2) {
				valueOfEntity += infoFilter[2][1];
			}
			urlPart += "( " + valueOfEntity; //parentesis because is an interval
			switch (infoFilter[3]) {
				case ' [a,b] ':
					urlPart += " ge " + infoFilter[4] + " and " + valueOfEntity + " le " + infoFilter[5] + ")";
					break;
				case ' (a,b] ':
					urlPart += " gt " + infoFilter[4] + " and " + valueOfEntity + " le " + infoFilter[5] + ")";
					break;
				case ' [a,b) ':
					urlPart += " ge " + infoFilter[4] + " and " + valueOfEntity + " lt " + infoFilter[5] + ")";
					break;
				case ' (a,b) ':
					urlPart += " gt " + infoFilter[4] + " and " + valueOfEntity + " lt " + infoFilter[5] + ")";
					break;
				default:
			}
		}
		else if (infoFilter[3] == 'contains' || infoFilter[3] == 'no contains' || infoFilter[3] == 'starts with' || infoFilter[3] == 'ends with') {
			if (entity != valueOfEntity) {
				valueOfEntity = valueOfEntity + "/" + infoFilter[2];
			} else {
				valueOfEntity = infoFilter[2];
			}
			if (infoFilter[2].length == 2) {
				valueOfEntity += infoFilter[2][1];
			}
			switch (infoFilter[3]) {
				case 'contains':
					urlPart += "substringof('" + infoFilter[4] + "'," + valueOfEntity +")";
					break;
				case 'no contains':
					urlPart += "not substringof('" + infoFilter[4] + "'," + valueOfEntity +")";
					break;
				case 'starts with':
					urlPart += "startswith(" + valueOfEntity + ",'" + infoFilter[4] + "')";
					break;
				case 'ends with':
					urlPart += "endswith(" + valueOfEntity + ",'" + infoFilter[4] + "')";
					break;
				default:
			}
		}
		else if (infoFilter[3] == 'year' || infoFilter[3] == 'month' || infoFilter[3] == 'day' || infoFilter[3] == 'hour' || infoFilter[3] == 'minute' || infoFilter[3] == 'date') {
			var newValue = "";
			for (var a = 0; a < infoFilter[4].length; a++) {//erase 0 if starts with 0. 
				if (infoFilter[4].charAt(a) != 0) {
					newValue += infoFilter[4].charAt(a)
				}
			}
			infoFilter[4] = newValue;
			switch (infoFilter[3]) {
				case 'year':
					urlPart += "year(resultTime) eq " + infoFilter[4];
					break;
				case 'month':
					urlPart += "month(resultTime) eq " + infoFilter[4];
					break;
				case 'day':
					urlPart += "day(resultTime) eq " + infoFilter[4];
					break;
				case 'hour':
					urlPart += "hour(resultTime) eq " + infoFilter[4];
					break;
				case 'minute':
					urlPart += "minute(resultTime) eq " + infoFilter[4];
					break;
				case 'date':
					urlPart += "date(resultTime) eq date('" + infoFilter[4] + "')";
					break;
				default:
			}
		}
	}

	if (filterSchemaItems.items.length > 1) urlPart += ")";

	return (urlPart)
		
	
}
function ShowPropagateNodeSelectedSelectExpands(node, parentNode) {

	if (parentNode.STAEntityName && parentNode.STAURL) {
		var dataAttributesArray = getDataAttributeArraySTAEntity(parentNode.STAEntityName);
	} else {
		var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata);		
		var dataAttributesArray = Object.keys(dataAttributes);
	}
	
	if (!node.STASelectedExpands)
	{
		if (parentNode.STASelectedExpands) {
			node.STASelectedExpands=deapCopy(parentNode.STASelectedExpands);
			if (parentNode.STASelectExpandNextOrigin) {
				node.STASelectExpandNextOrigin=deapCopy(parentNode.STASelectExpandNextOrigin);
			} else
				node.STASelectExpandNextOrigin=[];
		} else {
			node.STASelectedExpands={selected: [], expanded: {}};
			node.STASelectExpandNextOrigin=[];
		}
		node.STAEntityName=parentNode.STAEntityName;
		networkNodes.update(node);
	}
	return dataAttributesArray;
}


function FinalizeSelectedSelectExpands(node, previousSTAURL, message) {
	var s=GetQueryParamSelectedSelectExpands(node.STASelectedExpands);
	node.STAURL=RemoveQueryParamSelectExpands(node.STAURL);
	if (s)
		node.STAURL = AddQueryParamsToURL(node.STAURL, s);
	networkNodes.update(node);
	showInfoMessage(message);
	UpdateChildenSTAURL(node, node.STAURL, previousSTAURL);
	LoadJSONNodeSTAData(node);
}

////////////// Recursive select expand dialog

		function GetSelectExpands(event) {
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogSelectExpands").close();

			var node=getNodeDialog("DialogSelectExpands");
			if (!node)
				return;
			
			var previousSTAURL = node.STAURL;
		
			if (document.getElementById("DialogSelectExpandsHTML").style.display != "none") {
				GetSelectedSelectExpandsDialog(node);
				var s=GetQueryParamSelectedSelectExpands(node.STASelectedExpands);
				if (s)
					node.STAURL = AddQueryParamsToURL(node.STAURL, s);
			}
			networkNodes.update(node);
			showInfoMessage("Selecting and Expanding STA columns...");
			UpdateChildenSTAURL(node, node.STAURL, previousSTAURL);
			LoadJSONNodeSTAData(node);
		}

		function GetSelectedSelectExpandsDialog(node)
		{				
			if (!node.STASelectedExpands)
				node.STASelectedExpands={selected: [], expanded: {}};
			else {
				node.STASelectedExpands.selected=[];
				node.STASelectedExpands.expanded=[];
			}

			var dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(node.STAdata);
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
							if (entities[e].name!=da)
								continue;
							if (document.getElementById("SelectExpand_expand_" + prefix + "_" + da)?.checked) {
								selectedExpands.expanded[da]={selected: [], expanded: {}};
								GetSelectedLevelSelectExpandsDialog(null, selectedExpands.expanded[da], da, prefix+da);
							}
							break;
						}
					}
				}
			} else {
				for (var e=0; e < entities.length; e++) {
					if (document.getElementById("SelectExpand_expand_" + prefix + "_" + entities[e].name)?.checked) {
						selectedExpands.expanded[entities[e].name]={selected: [], expanded: {}};
						GetSelectedLevelSelectExpandsDialog(null, selectedExpands.expanded[entities[e].name], entities[e].name, prefix+entities[e].name);
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
							if (entities[e].name==da && staEntityParentNamePlural!=da)
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
					if (staEntityParentNamePlural!=entities[e].name) {  //Evito que ofereixi l'objecte anterior (i vaig endarrera) 
						cdns.push(spaces, "<label><input type='checkbox'", ((selectedExpands&& selectedExpands.expanded[entities[e].name]) ? "checked='checked'" : ""), " id='SelectExpand_expand_", prefix, "_", entities[e].name, "' onClick='RedrawTableSelectExpandsNodeId(\"", node.id, "\")' /> ", entities[e].name, "</label><br>");
						if (selectedExpands && selectedExpands.expanded[entities[e].name])
							cdns.push(GetHTMLLevelSelectExpandsDialog(null, selectedExpands.expanded[entities[e].name], node, entities[e].name, staEntityName, prefix+entities[e].name, spaces+"&emsp;"))
					}
				}
			}
			return cdns.join("");
		}

		function ShowTableSelectExpandsDialog(parentNode, node, expandCheckboxes) 
		{
			var cdns=[];
			saveNodeDialog("DialogSelectExpands", node);

			if (expandCheckboxes)
			{
				document.getElementById("DialogSelectExpandsHTML").style.display = "inline-block";
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
		}


////////////// Expand dialog


function ShowTableExpandColumnDialog(div_id, parentNode, node) {

var data;

	saveNodeDialog("Dialog" + div_id, node);

	data = parentNode.STAdata;
	if (!data) {
		document.getElementById("Dialog"+div_id+"HTML").innerHTML = "No data to show.";
		return;
	}

	var dataAttributesArray=ShowPropagateNodeSelectedSelectExpands(node, parentNode);

	var expandedColumns=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin).expanded;

	var cdns=[];
	cdns.push('<table>');
	for (var a = 0; a < dataAttributesArray.length; a++)
	{
		if (dataAttributesArray[a].endsWith("@iot.navigationLink"))
		{
			var da=dataAttributesArray[a].substring(0, dataAttributesArray[a].length-"@iot.navigationLink".length);
			cdns.push('<tr><td><input type="radio"', ((expandedColumns && expandedColumns[da]) ? 'checked="checked"' : ''), ' value="" id="', div_id, '_', da, '" name="', div_id, '_group', '" /> <label id="', div_id, '_label_', da, '" for="', div_id, '_', da, '">', da, '</label></td></tr>');
		}
	}
	document.getElementById("Dialog"+div_id+"HTML").innerHTML = cdns.join('');
}

function GetPropagateNodeSelectedSelectExpands(node, parentNode) {

	var previousSTAURL=null;
	if (parentNode) {
		if (parentNode.STAURL)
		{
			previousSTAURL=node.STAURL;
			node.STAURL = parentNode.STAURL;
		}
		if (parentNode.STAdata)
			node.STAdata = parentNode.STAdata;
		if (parentNode.STAdataAttributes)
			node.STAdataAttributes = deapCopy(parentNode.STAdataAttributes);
	}

	if (parentNode.STAEntityName && parentNode.STAURL) {
		var dataAttributesArray = getDataAttributeArraySTAEntity(parentNode.STAEntityName);
	} else {
		var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata);		
		var dataAttributesArray = Object.keys(dataAttributes);
	}
	return {dataAttributesArray: dataAttributesArray, previousSTAURL:previousSTAURL}; 
}

function GetExpandColumn(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogExpandColumn").close();

	var node=getNodeDialog("DialogExpandColumn");
	if (!node)
		return;

	var parentNode=GetFirstParentNode(node);
	if (!parentNode)
		return ;

	var {dataAttributesArray, previousSTAURL}=GetPropagateNodeSelectedSelectExpands(node, parentNode);
	var expandedColumns=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin).expanded;

	for (var a = 0; a < dataAttributesArray.length; a++)
	{
		if (dataAttributesArray[a].endsWith("@iot.navigationLink"))
		{
			var da=dataAttributesArray[a].substring(0, dataAttributesArray[a].length-"@iot.navigationLink".length);
			if (document.getElementById('ExpandColumn_' + da).checked) {
				expandedColumns[da]={selected: [], expanded: {}};
				node.label="Expand " + da;
				node.STASelectExpandNextOrigin.push(da);
				node.STAEntityName=da;
			} else
				delete expandedColumns[da];
		}
	}
	FinalizeSelectedSelectExpands(node, previousSTAURL, "Expanding STA column...");
}

////////////// Select dialog
function ShowTableSTASelectColumnsDialog(div_id, parentNode, node) {
var data;

	saveNodeDialog("Dialog" + div_id, node);

	data = parentNode.STAdata;
	if (!data) {
		document.getElementById("Dialog"+div_id+"HTML").innerHTML = "No data to show.";
		return;
	}

	var dataAttributesArray=ShowPropagateNodeSelectedSelectExpands(node, parentNode)

	var selectedColumns=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin).selected;
	
	for (var a = 0; a < dataAttributesArray.length; a++){
		if (selectedColumns[dataAttributesArray[a]])
			break;
	}
	if (a == dataAttributesArray.length) {
		for (var a = 0; a < dataAttributesArray.length; a++)
			selectedColumns[dataAttributesArray[a]]=true;
	}

	var cdns=[];
	cdns.push('<table>');
	for (var a = 0; a < dataAttributesArray.length; a++)
		cdns.push('<tr><td><input type="checkbox"', (selectedColumns[dataAttributesArray[a]]  ? 'checked="checked"' : ''), ' value="" id="', div_id, '_', a, '" name="', div_id, '_', a, '" /> <label id="', div_id, '_label_', a, '" for="', div_id, '_', a, '">', (parentNode.STAEntityName ? '' : (getHTMLCharacterAttributeType(dataAttributes[dataAttributesArray[a]].type) + ' ')), dataAttributesArray[a], '</label></td></tr>');
	cdns.push('</table>');

	document.getElementById("Dialog"+div_id+"HTML").innerHTML = cdns.join('');
}

function GetSelectColumnsSTA(event)
{
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectColumns").close();

	var node=getNodeDialog("DialogSelectColumns");
	if (!node)
		return;

	var parentNode=GetFirstParentNode(node);
	if (!parentNode)
		return ;

	var previousSTAURL=null;

	var {dataAttributesArray, previousSTAURL}=GetPropagateNodeSelectedSelectExpands(node, parentNode);
	var selectedColumns=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin).selected;

	for (var a = 0; a < dataAttributesArray.length; a++) {
		if (!document.getElementById("SelectColumns_" + a).checked)
			break;
	}
	if (a == dataAttributesArray.length) //A unchecked attribute has been found ("for" breaks before ending).
		return;

	for (var a = 0; a < dataAttributesArray.length; a++)
		selectedColumns[dataAttributesArray[a]]=(document.getElementById("SelectColumns_" + a).checked) ? true : false;
	FinalizeSelectedSelectExpands(node, previousSTAURL, "Selecting STA columns...");
}

////////////// Ranges: top and skip

function ShowTableRangeSTADialog(parentNode, node) {

	saveNodeDialog("DialogSelectRangeSTA", node);

	var data = parentNode.STAdata;

	if (!data || !data.length) {
		showInfoMessage("No data to operate on.");
		return;
	}
	ShowPropagateNodeSelectedSelectExpands(node, parentNode);
	var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin);

	document.getElementById("SelectRangeSkipSTA").value=selectedExpands.skip ? selectedExpands.skip : 0;
	document.getElementById("SelectRangeTopSTA").value=typeof selectedExpands.top === "undefined" ? 100 : selectedExpands.top;
}

function GetSelectRangeSTA(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectRangeSTA").close();

	var node=getNodeDialog("DialogSelectRangeSTA");
	if (!node)
		return;

	var parentNode=GetFirstParentNode(node);
	if (!parentNode)
		return;

	var {dataAttributesArray, previousSTAURL}=GetPropagateNodeSelectedSelectExpands(node, parentNode);
	var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin);
	if (!selectedExpands)
		selectedExpands=node.STASelectedExpands={selected: [], expanded: {}};

	if (!isNaN(parseInt(document.getElementById("SelectRangeSkipSTA").value)))
		selectedExpands.skip = parseInt(document.getElementById("SelectRangeSkipSTA").value);
	if (!isNaN(parseInt(document.getElementById("SelectRangeTopSTA").value)))
		selectedExpands.top = parseInt(document.getElementById("SelectRangeTopSTA").value);

	FinalizeSelectedSelectExpands(node, previousSTAURL, "Limiting the request to " + selectedExpands.top + " records " + (selectedExpands.skip ? "and skipping the first " + selectedExpands.skip : "" ) +  "...");
}

////////////// SortBy (orderBy)

function ShowTableSelectSortByDialog(parentNode, node) {

	saveNodeDialog("DialogSelectSortBy", node);

	var data = parentNode.STAdata;

	if (!data || !data.length) {
		document.getElementById("DialogSelectSortByRadioButtons").innerHTML = "No data to show.";
		return;
	}

	var dataAttributesArray=ShowPropagateNodeSelectedSelectExpands(node, parentNode)
	var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin);

	var s = "";
	var first=true;
	for (var a = 0; a < dataAttributesArray.length; a++)
	{
		if (dataAttributesArray[a].endsWith("@iot.navigationLink") || dataAttributesArray[a].charAt(0)=='@')
			continue;
		s += "<label><input type='radio'" + (selectedExpands && selectedExpands.orderBy ? 
				(selectedExpands.orderBy.attribute=dataAttributesArray[a] ? 'checked="checked"' : '') : 
				(first ? 'checked="checked"' : '')) + " id='SelectSortByEntity_" + a + "' name='SelectSortByEntity'/> " + dataAttributesArray[a] + "</label><br>";
		first=false;
	}
	document.getElementById("DialogSelectSortByRadioButtons").innerHTML = s;
	if (selectedExpands && selectedExpands.orderBy && selectedExpands.orderBy.desc) {
		document.getElementById("SelectSortByDesc").checked=true;
		document.getElementById("SelectSortByAsc").checked=false;
	} else {
		document.getElementById("SelectSortByDesc").checked=false;
		document.getElementById("SelectSortByAsc").checked=true;
	}
}

function GetSelectSortBy(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectSortBy").close();

	var node=getNodeDialog("DialogSelectSortBy");
	if (!node)
		return;

	var parentNode=GetFirstParentNode(node);
	if (!parentNode)
		return;

	var {dataAttributesArray, previousSTAURL}=GetPropagateNodeSelectedSelectExpands(node, parentNode);
	var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, node.STASelectExpandNextOrigin);
	if (!selectedExpands)
		selectedExpands=node.STASelectedExpands={selected: [], expanded: {}};

	if (document.getElementById("DialogSelectSortByHTML").style.display != "none")
	{
		selectedExpands.orderBy={};
		for (var a = 0; a < dataAttributesArray.length; a++){
			if (dataAttributesArray[a].endsWith("@iot.navigationLink") || dataAttributesArray[a].charAt(0)=='@')
				continue;
			if (document.getElementById("SelectSortByEntity_" + a).checked) {
				selectedExpands.orderBy.attribute=dataAttributesArray[a];
				break;
			}
		}
		if (document.getElementById("SelectSortByDesc") && document.getElementById("SelectSortByDesc").checked)
			selectedExpands.orderBy.desc=true;	
	}
	FinalizeSelectedSelectExpands(node, previousSTAURL, "Sorting STA by "+ selectedExpands.orderBy.attribute + " (" + (selectedExpands.orderBy.desc ? "descending" : "ascending") + ")...");
}

////////////// Merge expands circle
//Return the common items in two arrays. It respects the order of the first array. The list can contain repetitions that are also respected.
function findCommonElementsArray(a, b) {
    const res = [];
    
    // Store the frequency of elements in b[]
    const bm = {};
    for (let x of b) {
        bm[x] = (bm[x] || 0) + 1;
    }

    // Traverse a[] and consider an
    // item as common only if its 
    // frequency is more than 0 in bm.
    for (let x of a) {
        if (bm[x] > 0) {
            res.push(x);
            bm[x]--;  // Decrease frequency
        }
    }

    return res;
}

function DoMergeExpandSTA(node) {
	var previousSTAURL=node.STAURL;
	var parentNodes=GetParentNodes(node);
	if (parentNodes.length==0) {
		alert("Parent(s) node(s) are needed to merge expands");
		return false;
	}
	var parentNode=parentNodes[0]
	if (!parentNode.STASelectedExpands || !parentNode.STASelectExpandNextOrigin.length)
		return false;
	node.STASelectedExpands=deapCopy(parentNode.STASelectedExpands);
	var commonElements=[...parentNode.STASelectExpandNextOrigin];
	if (parentNodes.length>1)
	{
		if (commonElements.length)
		{
			for (var i=1; i<parentNodes.length; i++) {
				if (!parentNode.STASelectExpandNextOrigin.length) {
					commonElements=[];
					break;
				}
				commonElements=findCommonElementsArray(commonElements, parentNodes[i].STASelectExpandNextOrigin);
			}
		}
		var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, commonElements);
		for (var i=1; i<parentNodes.length; i++) {
			var selectedExpands2=GetSTASelectExpandNextOrigin(parentNodes[i].STASelectedExpands, commonElements);
			var expandedArray2=Object.keys(selectedExpands2.expanded);
			for (var e=0; e<expandedArray2.length; e++)
				selectedExpands.expanded[expandedArray2[e]]=deapCopy(selectedExpands2.expanded[expandedArray2[e]]);
		}
		
		/*for (var i=1; i<parentNodes.length; i++) {
			var parentNode=parentNodes[i];
			if (!parentNode.STASelectedExpands || !parentNode.STASelectExpandNextOrigin.length)
				continue;
			var SelectExpandNextParentOrigin2=deapCopy(node.STASelectExpandNextOrigin).pop();
			var selectedExpands=GetSTASelectExpandNextOrigin(node.STASelectedExpands, SelectExpandNextParentOrigin2);
			var expandsArray=Object.keys(selectedExpands.expanded);
			for (var e=0; e<expandArray.length; e++)
				SelectExpandNextParentOrigin.expanded[expandArray[e]]=deapCopy(selectedExpands.expanded[expandArray[e]]);
		}*/
		node.STAEntityName=commonElements.length ? commonElements[commonElements.length-1] : getSTAEntityPlural(getSTAURLLastEntity(node.STAURL));
	}
	else
		node.STAEntityName=parentNode.STAEntityName;
	node.STASelectExpandNextOrigin=commonElements;
	FinalizeSelectedSelectExpands(node, previousSTAURL, parentNodes.length==1 ? "Please connect other nodes to merge STA expands..." : "Merging STA " + parentNodes.length + " expands in a column...");
}

