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

//Deprecated: This funcion should be replaced by ShowTableSelectColumnsDialogSelect() and removed in the near future.
function ShowTableSelectColumnsDialog(div_id, parentNode, node, selectDef, fevent) {
	saveNodeDialog("DialogSelectColumns", node);

	var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata,
	selectedColumns=node["STA"+div_id];

	if (!data || !data.length) {
		document.getElementById("Dialog"+div_id+"HTML").innerHTML = "No data to show.";
		return;
	}
	var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
	const dataAttributesArray = Object.keys(dataAttributes);

	var cdns=[];
	cdns.push('<table>');
	for (var a = 0; a < dataAttributesArray.length; a++){
		cdns.push('<tr><td><input type="checkbox"', ((!selectedColumns && selectDef) || (selectedColumns && (a>=selectedColumns.length || selectedColumns[a]))  ? 'checked="checked"' : ''), ' value="" id="', div_id, '_', a, '" name="', div_id, '_', a, '"', (fevent ? ' onchange="'+ fevent +'"': ''), ' /> <label id="', div_id, '_label_', a, '" for="', div_id, '_', a, '">', getHTMLCharacterAttributeType(dataAttributes[dataAttributesArray[a]].type), ' ', dataAttributesArray[a], '</label></td></tr>');
	}
	cdns.push('</table>');
	document.getElementById("Dialog"+div_id+"HTML").innerHTML = cdns.join('');
}

/*selected can be 
	null, 
	an array of selected columns names, 
	an object with properties that are column names that are arrays of operation names (Only used by ShowGroupByDialog() for aggregationAttr)
*/
function ShowTableSelectColumnsDialogSelect(div_id, parentNode, node, selected, fevent) {
	saveNodeDialog("DialogSelectColumns", node);

	var data = parentNode.STAdata ? parentNode.STAdata : node.STAdata

	if (!data || !data.length) {
		document.getElementById("Dialog"+div_id+"HTML").innerHTML = "No data to show.";
		return;
	}
	var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
	const dataAttributesArray = Object.keys(dataAttributes);

	var cdns=[];
	cdns.push('<table>');
	for (var a = 0; a < dataAttributesArray.length; a++){
		var s=selected && selected[dataAttributesArray[a]] ? getAttributesAndAgrregationsJSONAsText(selected[dataAttributesArray[a]]) : "";
		cdns.push("<tr><td><input type='checkbox' ", 
			(selected && Array.isArray(selected) && selected.indexOf(dataAttributesArray[a])!=-1 ? "checked='checked'" : "")
			, " value='",
			(selected && selected[dataAttributesArray[a]] ? JSON.stringify(selected[dataAttributesArray[a]]) : "")
			,"' id='", div_id, "_", a, "' name='", div_id, "_", a, "'", (fevent ? " onchange='"+ fevent +"'": ""), " /> <label id='", div_id, "_label_", a, "' for='", div_id, "_", a, "'>", 
			(selected && !Array.isArray(selected) && !selected[dataAttributesArray[a]] ? "<span style='color: grey'>" : ""),
			getHTMLCharacterAttributeType(dataAttributes[dataAttributesArray[a]].type), " ", dataAttributesArray[a], (s=='' ? '' : ', ' + s),
			(selected && !Array.isArray(selected) && !selected[dataAttributesArray[a]] ? "</span>" : ""),
			"</label></td></tr>");
	}
	cdns.push('</table>');
	document.getElementById("Dialog"+div_id+"HTML").innerHTML = cdns.join('');
}

function GetSelectColumns(event) {

	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectColumns").close();

	var node=getNodeDialog("DialogSelectColumns");
	if (!node)
		return;

	var parentNode=GetFirstParentNode(node);

	if (parentNode.STAEntityName && node.image == "SelectColumnsSTA.png" && parentNode.STAURL)
		return GetSelectColumnsSTA(event);


	var dataAttributes = node.STAdataAttributes = parentNode.STAdataAttributes ? deapCopy(parentNode.STAdataAttributes) : getDataAttributes(node.STAdata);
	var dataAttributesArray = Object.keys(dataAttributes);

	for (var a = 0; a < dataAttributesArray.length; a++) {
		if (!document.getElementById("SelectColumns_" + a).checked)
			break;
	}
	if (a == dataAttributesArray.length) //A unchecked attribute has been found ("for" breaks before ending).
		return;

	if (!node.STASelectColumns)
		node.STASelectColumns=[];

	//If there is no STA to query, the selection is done manually (table mode).
	for (var a = 0; a < dataAttributesArray.length; a++) {
		if (document.getElementById("SelectColumns_" + a).checked)
			node.STASelectColumns[a]=true;
		else
			node.STASelectColumns[a]=false;
	}

	var data=node.STAdata, record;
	for (var i = 0; i < data.length; i++) {
		record=data[i];
		for (var a = 0; a < dataAttributesArray.length; a++) {
			if (!node.STASelectColumns[a]) {
				delete record[dataAttributesArray[a]];
			}
		}
	}
	for (var a = 0; a < dataAttributesArray.length; a++) {
		if (!node.STASelectColumns[a])
			delete dataAttributes[dataAttributesArray[a]];
	}
	networkNodes.update(node);
	updateQueryAndTableArea(node);
}
