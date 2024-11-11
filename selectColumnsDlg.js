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

function ShowTableSelectColumnsDialog(div_id, parentNode, node, selectDef, fevent) {
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


		function GetSelectColumns(event) {
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogSelectColumns").close();

			//if (currentNode.image == "SelectColumnsSTA.png")
			//{
				var previousSTAURL=null;
				var parentNode=GetFirstParentNode(currentNode);
				if (parentNode) {
					if (parentNode.STAURL)
					{
						previousSTAURL=currentNode.STAURL;
						currentNode.STAURL = parentNode.STAURL;
					}
					if (parentNode.STAdata)
						currentNode.STAdata = deapCopy(parentNode.STAdata);
					if (parentNode.STAdataAttributes)
						currentNode.STAdataAttributes = deapCopy(parentNode.STAdataAttributes);
				}
			//}
			currentNode.STASelectedColumns=[];
			var dataAttributes = currentNode.STAdataAttributes ? currentNode.STAdataAttributes : getDataAttributes(currentNode.STAdata);
			const dataAttributesArray = Object.keys(dataAttributes);
			for (var a = 0; a < dataAttributesArray.length; a++) {
				if (!document.getElementById("SelectColumns_" + a).checked)
					break;
			}
			if (a < dataAttributesArray.length) //A checked attribute has been found ("for" breaks before ending).
			{
				if (currentNode.image == "SelectColumnsSTA.png" && parentNode.STAURL)
				{
					var s;
					currentNode.STAURL=AddQueryParamsToURL(currentNode.STAURL, "$select=");
					for (var a = 0; a < dataAttributesArray.length; a++) {
						if (document.getElementById("SelectColumns_" + a).checked) {
							if (dataAttributesArray[a]=="@iot.selfLink")
								s = dataAttributesArray[a];
							else if (dataAttributesArray[a].startsWith("@iot."))
								s = dataAttributesArray[a].substring(5);
							else
								s = dataAttributesArray[a].replace("@iot.", "/");  //Changes Datastreams@iot.navigationLink to Datastreams/navigationLink

							currentNode.STAURL += s + ",";
							currentNode.STASelectedColumns[a]=true;
						}
						else
							currentNode.STASelectedColumns[a]=false;
					}
					currentNode.STAURL = currentNode.STAURL.slice(0, -1); //remove the last coma.
					currentNode.STAExpectedLength = parentNode.STAExpectedLength;
					networkNodes.update(currentNode);
					showInfoMessage("Selecting STA columns...");
					UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
					LoadJSONNodeSTAData(currentNode);
				}
				else
				{
					//If there is no STA to query, the selection is done manually (table mode).
					//currentNode.STAdata = deapCopy(currentNode.STAdata);
					for (var a = 0; a < dataAttributesArray.length; a++) {
						if (document.getElementById("SelectColumns_" + a).checked)
							currentNode.STASelectedColumns[a]=true;
						else
							currentNode.STASelectedColumns[a]=false;
					}

					var data=currentNode.STAdata, record;
					for (var i = 0; i < data.length; i++) {
						record=data[i];
						for (var a = 0; a < dataAttributesArray.length; a++) {
							if (!currentNode.STASelectedColumns[a]) {
								delete record[dataAttributesArray[a]];
							}
						}
					}
					for (var a = 0; a < dataAttributesArray.length; a++) {
						if (!currentNode.STASelectedColumns[a])
							delete dataAttributes[dataAttributesArray[a]];
					}
					networkNodes.update(currentNode);
				}
			}
			else   //If no selected column has been found, no filter is done and all columns are selected
			{
				for (var a = 0; a < dataAttributesArray.length; a++) {
					currentNode.STASelectedColumns[a]=true;
				}
			}
		}
