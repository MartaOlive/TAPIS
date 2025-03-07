/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able 
	to work with STA data as tables.
  
	The TAPIS client is free software under the terms of the MIT License

	Copyright (c) 2024 Joan Masó

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

const selectConditionContent = ['---Choose operator ---', ' = ', ' &ne; ', ' &ge; ', ' > ', ' &le; ', ' < ', ' [a,b] ', ' (a,b] ', ' [a,b) ', ' (a,b) ', 'contains', 'no contains', 'starts with', 'ends with', 'year', 'month', 'day', 'hour', 'minute', 'date'];
const selectConditionContentText = ['---Choose operator ---', ' = ', ' &ne; ', 'contains', 'no contains', 'starts with', 'ends with'];
const selectConditionContentOGCAPIFeatures = ['---Choose operator ---', ' = ', ' &ne; ', ' &ge; ', ' > ', ' &le; ', ' < ', ' [a,b] ', ' (a,b] ', ' [a,b) ', ' (a,b) '];


function addNecessaryVariablesToFilterRowsSTANode(actualNode) {
	var actualNodeLabel = actualNode.image;
	//Create node propierties
	if (!actualNode.STAboxNames)
		actualNode.STAboxNames = ["0_0"];
	if (!actualNode.STAconditionsFilter)
		actualNode.STAconditionsFilter = [ //Table values
			{
				property: "<div id='optionsRow_0' style='display: inline-block;'></div>",
				number: "0"
			}
		];
	if (typeof actualNode.STAinfoFilter === "undefined")
		actualNode.STAinfoFilter = [];
	if (!actualNode.STAelementFilter)
		actualNode.STAelementFilter = {
			elems: [0],
			nexus: null,
			boxName: "0_0"
		};

	if (typeof actualNode.STACounter === "undefined")
		actualNode.STACounter = [];

	if (actualNodeLabel == "FilterRowsSTA.png") { //Only necessary in STA Filter, not in CSV
		if (typeof actualNode.STAUrlAPI === "undefined")
			actualNode.STAUrlAPI = "";
		if (typeof actualNode.STAUrlAPICounter === "undefined")
			actualNode.STAUrlAPICounter = [];
		if (!actualNode.STAFilterRowEntities)
			actualNode.STAFilterRowEntities = {
				optionsRow0: [getSTAEntityPlural(actualNode.STAEntityName)]
			};

	}

	networkNodes.update(actualNode);
}
function addTitleInRowFilterDialog(divName) {
	var divTitleSelectRows = document.getElementById(divName);
	divTitleSelectRows.innerHTML = ""; //Erase old title saved
	var entityName= getSTAEntityPlural(getNodeDialog("DialogFilterRows").STAEntityName);
	divTitleSelectRows.innerHTML = entityName ? "<img src='" + entityName + ".png' style='height:30px' />" + entityName : "";
}



//Build selectors
function createSelectorRowFilters(number) {
	var selectorInfo = [];
	var node= getNodeDialog("DialogFilterRows");
	var infoFilter = node.STAinfoFilter;
	var nodeLabel = node.image;
	if (infoFilter.length != 0) {

		for (var i = 0; i < infoFilter.length; i++) {
			if (infoFilter[i][0] == number) {
				selectorInfo.push(infoFilter[i]);
			}
		}
	}
	var parentNode = GetFirstParentNode(node);
	var dialogType;

	if (nodeLabel == "FilterRowsSTA.png") {
		if (parentNode.OGCType) { //OGCAPIFeatures
			if (parentNode.OGCType == "OGCAPIitems") {
				dialogType = "withoutEntities_3selectors"; //columns, condition, values
			}
		} else { //FilterRowSTA from STA API
			dialogType = "withEntities_4selectors"; //entities, properties,condition,values
		}
	} else { //CSV
		dialogType = "withoutEntities_3selectors"; //columns, condition, values
	}
	if (dialogType == "withEntities_4selectors") {
		createEntitySelectorInFilterRows(selectorInfo, number);
		createPropertySelectInFilterRows(selectorInfo, number);
	} else { //withoutEntities_3selectors
		createColumsSelectorFilterRows(selectorInfo, number);
	}
	//In both cases 
	createConditionSelectInFilterRows(selectorInfo, number);
	createValueSelectInFilterRows(selectorInfo, number);

}

function createColumsSelectorFilterRows(selectorInfo, count) {
	var optionsRow = document.getElementById("optionsRow_" + count);

	var selectColumns = document.createElement("select");
	selectColumns.setAttribute("id", "selectorColumns_" + count);
	selectColumns.setAttribute("onchange", "fillValueSelectorFilterRow('" + count + "')");

	optionsRow.appendChild(selectColumns);
	fillColumsSelectorFilterRows(selectorInfo, count);

}

function fillColumsSelectorFilterRows(selectorInfo, count) { //withoutEntities_3selectors

	var selectorColumns = document.getElementById("selectorColumns_" + count);
	var option = document.createElement("option"); //First option
	option.setAttribute("value", "-- choose a field--");
	option.innerHTML = "-- choose a field--";
	selectorColumns.appendChild(option);
	//Real options 
	//Which is the origin of the information to fill the selector
	var queryableOrDataAlreadyCharged;
	var node= getNodeDialog("DialogFilterRows");
	if (node.STAOGCAPIqueryable) {
		if (node.STAOGCAPIqueryable == "no") {
			queryableOrDataAlreadyCharged = "dataCharged"; //OGCAPIFeatures not queryable
		} else {
			queryableOrDataAlreadyCharged = "queryableData"; // OGCAPIFeatures queryable
		}
	} else {
		queryableOrDataAlreadyCharged = "dataCharged"; //CSV
	}

	if (queryableOrDataAlreadyCharged == "queryableData") {
		if (node.STAOGCAPIqueryable.length != 0) {
			var queryables = Object.keys(node.STAOGCAPIqueryable);
			for (var i = 0; i < queryables.length; i++) {
				var option = document.createElement("option");
				option.setAttribute("value", queryables[i]);
				option.innerHTML = queryables[i];
				if (selectorInfo.length != 0) {
					if (selectorInfo[0][1] == queryables[i]) {
						option.setAttribute("selected", true);
					}
				}
				selectorColumns.appendChild(option);
			}
		}

	} else { //data charged (node.STAdata)
		var columns = Object.keys(node.STAdata[0]);
		for (var i = 0; i < columns.length; i++) {
			option = document.createElement("option"); //First option
			option.setAttribute("value", columns[i]);
			option.innerHTML = columns[i];

			if (selectorInfo.length != 0) {
				if (selectorInfo[0][1] == columns[i]) {
					option.setAttribute("selected", true);
				}
			}
			selectorColumns.appendChild(option);
		}
	}
}

function obtainValuesFromSTAdataInCSV(column) {
	var node= getNodeDialog("DialogFilterRows");
	var data = node.STAdata;
	var valuesArray = []
	for (var i = 0; i < data.length; i++) {
		if (i != 0) {
			if (!valuesArray.find(element => element == data[i][column])) { //create array with not arranged values
				valuesArray.push(data[i][column]);
			}
		}
	}
	var valuesSorted = sortValuesNumbersOrText(valuesArray);
	return valuesSorted;
}

//Ask API data or information 
async function loadAPIDataWithReturn(url, reasonForData) { // Ask API to  "FIllSelectInRowFilter" and CountResults
	var response, options = {}, data; //Data in FIllSelectInRowFilter will be STAData and in CountResults will be the number of results
	try {
		var url_fetch;
		url_fetch = url;
		AddHeadersIfNeeded(options);
		if (options.headers)
			response = await fetch(url_fetch, options);
		else
			response = await fetch(url_fetch);
	}
	catch (error) {
		data = null;
		return data;
	}

	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		data = null;
		return data;
	}

	try {
		data = await response.json();
		if (reasonForData == "EntitiesFilterRow") {
			data = (typeof data.value !== "undefined") ? data.value : [data];
		} else if (reasonForData == "OGCAPIConformance") {
			data = (typeof data !== "undefined") ? data["conformsTo"] : [data];
		} else if (reasonForData == "OGCAPIqueryables") {
			data = (typeof data !== "undefined") ? data["properties"] : [data];
		}else if(reasonForData =="obtainAllData"){ //Obtain all data to agregate it
			data = (typeof data.value !== "undefined") ? data.value : [data];
		}
		else {
			data = (typeof data.value !== "undefined") ? data["@iot.count"] : [data];
		}

	}
	catch (error) {
		data = null;
	}
	return data;


}
async function askForConformanceInOGCAPIFeatures() {
	const filterInConformance = ["filter", "features-filter", "simple-cql", "cql-text", "cql-json"];//What I need for filter
	var node= getNodeDialog("DialogFilterRows");
	var url = node.STAURL;
	var index = url.indexOf("/collection");
	url = url.slice(0, index);
	url += "/conformance?f=json";
	var conformanceInformation = await loadAPIDataWithReturn(url, "OGCAPIConformance"); //ask for conformance (what can I do with this API)
	var conformanceArray = []
	for (var i = 0; i < conformanceInformation.length; i++) {
		for (var a = 0; a < filterInConformance.length; a++) {
			if (conformanceInformation[i].includes(filterInConformance[a])) {
				if (!conformanceArray.includes(filterInConformance[a])) {
					conformanceArray.push(filterInConformance[a])
				}

			}
		}

	}
	node.STAOGCAPIconformance = conformanceArray; //Only keeps what I need for filter
	networkNodes.update(node);
}
async function askForCollectionQueryables() {
	var node= getNodeDialog("DialogFilterRows");
	var url = node.STAURL;
	var index = url.indexOf("/items");
	url = url.slice(0, index);
	url += "/queryables?f=json";
	var queryablesInformation = await loadAPIDataWithReturn(url, "OGCAPIqueryables");
	if (Object.keys(queryablesInformation).length != 0) {
		node.STAOGCAPIqueryable = queryablesInformation;
	} else {
		node.STAOGCAPIqueryable = "no";
	}


	networkNodes.update(node);
}



//Entiy input, dialog...
function createEntitySelectorInFilterRows(selectorInfo, count) {
	var optionsRow = document.getElementById("optionsRow_" + count);

	//Label
	optionsRow.innerHTML += "<label style='font-size: 15px;'>Choose the Entity:</label>";
	optionsRow.innerHTML += `<input type="text" READONLY id="inputForEntityFilterRow_${count}" onclick="openModalRowFilterEntities('${count}')" style="background-color:#D8DFD6; margin-left:5px"></input>`;
	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + count);

	inputForEntityFilterRow.addEventListener('mouseover', () => {
		inputForEntityFilterRow.style.cursor = "pointer";
		inputForEntityFilterRow.style.background = "#bdc2ba";//Darker grey
	});
	inputForEntityFilterRow.addEventListener('mouseout', () => {
		inputForEntityFilterRow.style.cursor = "auto";
		inputForEntityFilterRow.style.background = "#d8dfd6";
	});
	var entityToInput ;
	var node= getNodeDialog("DialogFilterRows");
	if (node.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
		entityToInput = getSTAEntityPlural(node.STAEntityName);
	} else {
		entityToInput = selectorInfo[0][1];
	}
	inputForEntityFilterRow.value = entityToInput;
	inputForEntityFilterRow.style.width = entityToInput.length * 7 + "px"; //Adjust width of the input to fit all content

}
function openModalRowFilterEntities(number) { //To open Modat to see and select entities
	event.preventDefault();
	var dialogFilterRowEntities = document.getElementById("DialogFilterRowEntities");
	dialogFilterRowEntities.setAttribute("data-rowNumber", number);
	fillDialogFilterRowEntities(number, 0, "");
	document.getElementById("DialogFilterRowEntities").showModal();
}

function updateSTAFilterRowEntities(number, counter, entitySelected) { //Modify or erase what is necessary
	var node= getNodeDialog("DialogFilterRows");
	var filterRowEntities = node.STAFilterRowEntities;

	if (filterRowEntities["optionsRow" + number].length + 1 == counter) {
		filterRowEntities["optionsRow" + number].push(entitySelected); //If there is no entity in this position, just add it
	} else {

		var index = filterRowEntities["optionsRow" + number].indexOf(entitySelected);
		if (index == (-1)) { //it doesnt exists yet
			var elementsToSplice = filterRowEntities["optionsRow" + number].length - counter; //Elements to erase to final. If entity changes, the rest has no sense
			filterRowEntities["optionsRow" + number].splice(counter, elementsToSplice, entitySelected);
		} else { //it exist previously
			var newArray = [];
			for (var a = 0; a < (index + 1); a++) {
				newArray.push(filterRowEntities["optionsRow" + number][a]);
			}
			filterRowEntities["optionsRow" + number] = newArray;
		}
	}

}


function takeEntitiesAndFilterThemInFilterRow(filterRowEntities, i) { //avoid duplications
	//var entities = STAEntities[getSTAEntityPlural(filterRowEntities[i], true)].entities;
	var node= getNodeDialog("DialogFilterRows");
	var entityInPlural=getSTAEntityPlural(node.STAEntityName);
	var n= STAEntities[entityInPlural].entities.length, entitiesConnectedArray=[];
	for (var t=0;t<n;t++){
		entitiesConnectedArray.push(STAEntities[entityInPlural].entities[t].name);
	}


	var entitiesFiltered = entitiesConnectedArray; //To use the filter (entities not filtered yet);
	if (i != 0) {
		for (var a = 0; a < i; a++) { //I need entities before this entity in the array 
			entitiesFiltered = entitiesFiltered.filter(entity => {
				return getSTAEntityPlural(entity, true) != getSTAEntityPlural(filterRowEntities[a], true)
			});
		}
	}

	return entitiesFiltered;
}
function AddEntitiesSelectedBelowInFilterRow(number) {
	var entitiesFiltered;
	var optionsRow = "optionsRow" + number;
	var node= getNodeDialog("DialogFilterRows");
	var filterRowEntities = node.STAFilterRowEntities[optionsRow];
	var nextEntity;

	//first Entity (node)
	var entity = node.STAEntityName;
	var DialogFilterRowEntitiesCheckBoxes = document.getElementById("DialogFilterRowEntitiesCheckBoxes");
	var div = document.createElement("div");
	var input = document.createElement("input");
	var id = "Group" + 0 + "_" + entity;
	div.setAttribute("id", id);
	input.setAttribute("type", "radio");
	input.setAttribute("name", "entity_" + 0);
	input.setAttribute("id", id + "input")
	input.setAttribute("value", entity);
	input.setAttribute("onClick", `fillDialogFilterRowEntities("${number}","1","${entity}")`);
	input.setAttribute("checked", true)
	var label = document.createElement("label");
	label.setAttribute("for", id + "input");
	label.innerHTML = entity;
	DialogFilterRowEntitiesCheckBoxes.appendChild(div);
	div.appendChild(input);
	div.appendChild(label);


	for (var i = 0; i < filterRowEntities.length; i++) {
		entitiesFiltered = takeEntitiesAndFilterThemInFilterRow(filterRowEntities, i);

		//There is next?
		if (filterRowEntities[i + 1]) { //take next entity to put it checked when radiobutton will be created (0 is entity from the node)
			nextEntity = filterRowEntities[i + 1];
		} else {
			nextEntity = "";
		}
		var placeToPutChilds;

		if (i == 0) {
			placeToPutChilds = document.getElementById("Group" + i + "_" + entity);
		} else {
			placeToPutChilds = document.getElementById("Group" + i + "_" + filterRowEntities[i]); //previous entity (previous group)

		}

		for (var e = 0; e < entitiesFiltered.length; e++) {	//Create radiobuttons
			var div2 = document.createElement("div");
			var input2 = document.createElement("input");
			var numToGroup = i + 1;
			var numi = i + 2
			var id = "Group" + numToGroup + "_" + entitiesFiltered[e];
			div2.setAttribute("id", id);
			input2.setAttribute("type", "radio");
			input2.setAttribute("name", "entity_" + numToGroup);
			input2.setAttribute("id", id + "input")
			input2.setAttribute("value", entitiesFiltered[e]);
			input2.setAttribute("onClick", `fillDialogFilterRowEntities("${number}","${numi}","${entitiesFiltered[e]}")`);
			if (entitiesFiltered[e] == nextEntity) {
				input2.setAttribute("checked", true)
			}
			var label = document.createElement("label");
			label.setAttribute("for", id + "input");
			label.innerHTML = entitiesFiltered[e];
			div2.appendChild(input2);
			div2.appendChild(label);

			div2.style.marginLeft = 20 + "px"; //position children "visually inside" father. 

			placeToPutChilds.appendChild(div2);
		}
	}
}

function fillDialogFilterRowEntities(number, row, selected) { //Ok in DialogFilterRowEntities
	var dialogFilterRowEntitiesCheckBoxes = document.getElementById("DialogFilterRowEntitiesCheckBoxes");

	dialogFilterRowEntitiesCheckBoxes.innerHTML = ""; //Empty DialogFilterRowEntitiesCheckBoxes

	if (selected != "") { //avoid first time
		updateSTAFilterRowEntities(number, row, selected);//Update node.STAFilterRowEntities
	}
	AddEntitiesSelectedBelowInFilterRow(number);
}
function OkButtonInRowFilterEntities(event) { //Ok in DialogFilterRowEntities
	event.preventDefault();
	var dialogFilterRowEntities = document.getElementById("DialogFilterRowEntities");
	var number = dialogFilterRowEntities.getAttribute("data-rowNumber");
	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + number);
	var inputValue;
	var lastEntity;
	var node= getNodeDialog("DialogFilterRows");
	for (var i = 0; i < node.STAFilterRowEntities["optionsRow" + number].length; i++) {
		if (i == 0) {
			inputValue = node.STAFilterRowEntities["optionsRow" + number][i];
			lastEntity = node.STAFilterRowEntities["optionsRow" + number][i];
		} else {
			var entity = searchParentLabel();

			if (entity != node.STAFilterRowEntities["optionsRow" + number][i]) {
				inputValue += "/" + node.STAFilterRowEntities["optionsRow" + number][i];

			} else {
				inputValue = node.STAFilterRowEntities["optionsRow" + number][i];
			}
			lastEntity = node.STAFilterRowEntities["optionsRow" + number][i];
		}
	}
	inputForEntityFilterRow.value = inputValue;
	inputForEntityFilterRow.style.width = inputValue.length * 7 + "px";
	fillPropertySelector(number, lastEntity);//To change properties of select
	fillValueSelectorFilterRow(number);
	showAndHiddeSelectorAndInputsFilterRow(number);
	showInputProperty(number);
	document.getElementById("DialogFilterRowEntities").close();
}
//PropertySelect
function createPropertySelectInFilterRows(selectorInfo, count) {
	var optionsRow = document.getElementById("optionsRow_" + count);
	var select = document.createElement("select");
	select.setAttribute("id", "selectorProperty_" + count);
	select.setAttribute("onChange", "onchangePropertySelect('" + count + "')");
	select.style.marginLeft = "10px";
	var node= getNodeDialog("DialogFilterRows");
	if (node.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
		var entity = getSTAEntityPlural(getNodeDialog("DialogFilterRows").STAEntityName);
	} else {
		var entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(selectorInfo[0][1]), true);
	}
	//Input for properties/parameters
	var inputForProperty = document.createElement("input");
	inputForProperty.setAttribute("type", "text");
	inputForProperty.setAttribute("id", "inputForProperty_" + count);
	inputForProperty.setAttribute("placeholder", "Example: type");
	inputForProperty.style.display = "none";
	inputForProperty.style.marginLeft = "5px";
	optionsRow.appendChild(select);
	optionsRow.appendChild(inputForProperty);
	fillPropertySelector(count, entity, selectorInfo);
}
function onchangePropertySelect(count) {
	fillValueSelectorFilterRow(count);
	showInputProperty(count);
}
function showInputProperty(count) {
	var selectorProperty = document.getElementById("selectorProperty_" + count);
	var selectorPropertyValue = selectorProperty.options[selectorProperty.selectedIndex].value;
	var inputForProperty = document.getElementById("inputForProperty_" + count)
	if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
		inputForProperty.style.display = "inline-block";
	} else {
		inputForProperty.style.display = "none";
	}
}
function extractLastEntityFromTextFromInputInFilterRow(textFromInput) {
	var arrayFromText, lastEntity;
	if (textFromInput.includes("/")) { //only first entity
		arrayFromText = textFromInput.split("/");
		lastEntity = arrayFromText[arrayFromText.length - 1];
	} else {
		lastEntity = textFromInput
	}
	return lastEntity;

}
const unitOfMeasurementExtension = ["unitOfMeasurement/name", "unitOfMeasurement/symbol", "unitOfMeasurement/definition"]; //Datastream
const featureExtension = ["feature/", "feature/type", "feature/coordinates/0", "feature/coordinates/1", "feature/type", "feature/geometry/type", "feature/geometry/coordinates/0", "feature/geometry/coordinates/1", "feature/properties/"] //featureOfInterest
const locationExtension = ["location/", "location/type", "location/properties/", "location/geometry/type", "location/geometry/coordinates", "location/coordinates"]


function fillPropertySelector(number, lastEntity, selectorInfo) { //lastEntity: Entity obtained in input
	var selectProperty = document.getElementById("selectorProperty_" + number);
	selectProperty.innerHTML = "";

	var entity= getSTAEntityPlural(lastEntity, true);
	var properties = [], n= STAEntities[entity].properties.length;
	for (var p = 0; p < n; p++) {
		properties.push(STAEntities[entity].properties[p].name)
	}





	var option = document.createElement("option"); //First option
	option.setAttribute("value", " ");
	option.innerHTML = "--- choose Property ---";
	selectProperty.appendChild(option);

	var option2 = document.createElement("option"); //First option
	option2.setAttribute("value", "id");
	option2.innerHTML = "id";
	selectProperty.appendChild(option2);

	for (var i = 0; i < properties.length; i++) {// to fill property/property
		if (properties[i] == "unitOfMeasurement") {
			for (var u = 0; u < unitOfMeasurementExtension.length; u++) {
				var option = document.createElement("option");
				option.setAttribute("value", unitOfMeasurementExtension[u]);
				option.innerHTML = unitOfMeasurementExtension[u];
				selectProperty.appendChild(option);
				if (selectorInfo && selectorInfo.length != 0) {
					if (unitOfMeasurementExtension[u] == selectorInfo[0][2][0]) {  //selectorInfo[0][2] : If inputForPropery is open, the element 0 in the array is the select and the second is the input
						option.setAttribute("selected", true);
					}
				}
			}
		} else if (properties[i] == "feature") {
			for (var a = 0; a < featureExtension.length; a++) {
				var option = document.createElement("option");
				option.setAttribute("value", featureExtension[a]);
				option.innerHTML = featureExtension[a];
				selectProperty.appendChild(option);
				if (selectorInfo && selectorInfo.length != 0) {
					if (featureExtension[a] == selectorInfo[0][2][0]) {
						option.setAttribute("selected", true);
					}
				}
			}
		}
		else if (properties[i] == "location") {
			for (var a = 0; a < locationExtension.length; a++) {
				var option = document.createElement("option");
				option.setAttribute("value", locationExtension[a]);
				option.innerHTML = locationExtension[a];
				selectProperty.appendChild(option);
				if (selectorInfo && selectorInfo.length != 0) {
					if (locationExtension[a] == selectorInfo[0][2][0]) {
						option.setAttribute("selected", true);
					}
				}
			}
		}

		else if (properties[i] == "observedArea") {
			//nothing. Avoid that appear in the list. It is a poligon and it can't be filtered. 
		}
		else {
			var option = document.createElement("option");
			var property;
			if (properties[i] == "properties" || properties[i] == "dataQuality" || properties[i] == "parameters" || properties[i] == "resultQuality") {
				property = properties[i] + "/";
				option.setAttribute("value", property);
				option.innerHTML = property;
			} else {
				option.setAttribute("value", properties[i]);
				property = properties[i]
				option.innerHTML = property;
			}
			if (selectorInfo && selectorInfo.length != 0) {
				if (property == selectorInfo[0][2][0]) { //!!!!!!!!!!!!!!!!!!!
					option.setAttribute("selected", true);
				}
			}
		}
		selectProperty.appendChild(option);
	}
	if (selectorInfo && selectorInfo.length != 0 && selectorInfo[0][2].length == 2) {//selectorInfo[0][2] : If inputForPropery is open, the element 0 in the array is the select and the second is the input
		document.getElementById("inputForProperty_" + number).value = selectorInfo[0][2][1];
	}
}

//condition select
function createConditionSelectInFilterRows(selectorInfo, count) {
	var optionsRow = document.getElementById("optionsRow_" + count);
	var select = document.createElement("select");
	select.setAttribute("id", "selectorCondition_" + count);
	select.style.marginLeft = "10px";
	var selectConditionContent2;
	var node= getNodeDialog("DialogFilterRows");
	if (selectorInfo.length != 0) {
		var typeOfValues = typeOfValueFromInput("simple", selectorInfo[0][4]);
		if (typeOfValues == "text") {
			selectConditionContent2 = selectConditionContentText;
		} else { //data,empty,number
			selectConditionContent2 = selectConditionContent;
		}
	} else {
		selectConditionContent2 = selectConditionContent;
	}
	if (node.OGCType == "OGCAPIitem") {
		selectConditionContent2 = selectConditionContentOGCAPIFeatures;
	}
	
	for (var i = 0; i < selectConditionContent2.length; i++) { //create options in condition Select
		var opcioCondicio = document.createElement("option");
		opcioCondicio.setAttribute("value", selectConditionContent2[i]);
		select.setAttribute("onChange", "showAndHiddeSelectorAndInputsFilterRow('" + count + "')");
		opcioCondicio.innerHTML = selectConditionContent2[i];
		if (selectorInfo.length != 0) {
			if (selectConditionContent2[i] == selectorInfo[0][3]) {
				opcioCondicio.setAttribute("selected", true);
			}
		}
		select.appendChild(opcioCondicio);
	}
	optionsRow.appendChild(select);
}
function changeSelectConditionValues(number, wichinputText, value1, valueInput1, valueInput2) {
	var selectCondition = document.getElementById("selectorCondition_" + number);
	if (wichinputText == "simple") {
		var typeOfValues = typeOfValueFromInput(wichinputText, value1);
	} else {
		var typeOfValues = typeOfValueFromInput(wichinputText, valueInput1, valueInput2);
	}
	var actualConditionSelected = selectCondition.options[selectCondition.selectedIndex].value;
	var selectContent;
	selectCondition.innerHTML = ""; //Erase to not acumulate it
	if (wichinputText == "simple") {
		if (typeOfValues == "text") { selectContent = selectConditionContentText; } //text
		else { selectContent = selectConditionContent; }//data, empty, number
	} else {
		selectContent = selectConditionContent; //Has no sense to have an interval with text
	}
	for (var i = 0; i < selectContent.length; i++) { //Create options to select condition
		var opcioCondicio = document.createElement("option");
		opcioCondicio.setAttribute("value", selectContent[i]);
		opcioCondicio.innerHTML = selectContent[i];
		if (selectContent[i] == actualConditionSelected) {
			opcioCondicio.setAttribute("selected", true);
		}
		selectCondition.appendChild(opcioCondicio);
	}
}
function typeOfValueFromInput(wichinputText, value1, value2) {
	var typeOfValues;
	if (wichinputText == "simple") {
		if (value1 == null) {
			value1 = "";
		}
	} else {
		if (value1 == null) {
			value1 = "";
		} else if (value2 == null) {
			value2 = "";
		}
	}
	//eval function doesn't work to knowif it is a date, because a number for the function is a date.
	if (wichinputText == "simple") {
		if (value1.includes("-") == true) {//inputText1
			var value1Array = value1.split("-");
			if (value1.includes("/")) {
				if (value1Array.length == 5) {
					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" && value1.endsWith("Z")) {
						typeOfValues = "date";
					}
				}
			} else {
				if (value1Array.length == 3) {
					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" && value1.endsWith("Z")) {
						typeOfValues = "date";
					} else if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2].length == 2 && !isNaN(parseInt(value1Array[0])) && !isNaN(parseInt(value1Array[1])) && !isNaN(parseInt(value1Array[2]))) { //only date without Time
						typeOfValues = "date";
					}
				}
			}
		}
		if (typeOfValues != "date") {
			if (Number.isNaN(parseInt(value1)) != true) {
				var newValue = "";
				for (var a = 0; a < value1.length; a++) {//erase 0 if starts with 0. 
					if (value1.charAt(a) != 0) {
						newValue += value1.charAt(a)
					}
				}
				value1 = newValue;
				if (value1.length != parseInt(value1).toString().length && value1.length != parseFloat(value1).toString().length) {
					typeOfValues = "text";
				} else {
					typeOfValues = "number";
				}
			} else {
				typeOfValues = "text";
			}
		}
		if (value1.length == 0) {
			typeOfValues = "empty";
		}
	}
	else {//interval
		var inputText1 = "no";
		var inputText2 = "no";
		//is date
		if (value1.includes("-") == true) {//inputText1
			var value1Array = value1.split("-");
				if (value1Array.length == 3) {
					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" && value1.endsWith("Z")) {
						inputText1 = "date";
					} else if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2].length == 2 && !isNaN(parseInt(value1Array[0])) && !isNaN(parseInt(value1Array[1])) && !isNaN(parseInt(value1Array[2]))) { //only date without Time
						typeOfValues = "date";
					}
				}
			
		}
		if (value2.includes("-") == true) {//inputText1
			var value2Array = value2.split("-");

				if (value2Array.length == 3) {
					if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2][2] == "T" && value2.endsWith("Z")) {
						inputText2 = "date";
					} else if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2].length == 2 && !isNaN(parseInt(value2Array[0])) && !isNaN(parseInt(value2Array[1])) && !isNaN(parseInt(value2Array[2]))) { //only date without Time
						typeOfValues = "date";
					}
				}
			
		}
		if (inputText1 != "date") {
			if (Number.isNaN(parseInt(value1)) != true) { //numero
				var newValue = "";
				for (var a = 0; a < value1.length; a++) {//erase 0 if starts with 0. 
					if (value1.charAt(a) != 0) {
						newValue += value1.charAt(a)
					}
				}
				value1 = newValue;
				if (value1.length != parseInt(value1).toString().length && value1.length != parseFloat(value1).toString().length) {
					inputText1 = "text";
				} else { //number in value1
					inputText1 = "number";
				}
			} else if (value1.length == 0) { //If it's empty
				inputText1 = "empty";
			} else { inputText1 = "text"; }
		}
		if (inputText2 != "date") {
			if (Number.isNaN(parseInt(value2)) != true) { //If first is not a number, let's see second
				var newValue2 = "";
				for (var a = 0; a < value1.length; a++) {//erase 0 if starts with 0. 
					if (value1.charAt(a) != 0) {
						newValue2 += value1.charAt(a)
					}
				}
				value1 = newValue2;
				if (value2.length != parseInt(value2).toString().length && value2.length != parseFloat(value2).toString().length) {
					inputText2 = "text";
				} else {
					inputText2 = "number";
				}
			} else if (value2.length == 0) {
				inputText2 = "empty";
			} else { inputText2 = "text"; }
		}
		if (inputText1 == "text" || inputText2 == "text") {
			typeOfValues = "text";
		} else if ((inputText1 == "date" && inputText2 == "empty") || (inputText1 == "empty" && inputText2 == "date") || (inputText1 == "date" && inputText2 == "date")) {
			typeOfValues = "date";
		} else if (inputText1 == "empty" && inputText2 == "empty") {
			typeOfValues = "empty";
		}
		else {
			typeOfValues = "number";
		}
	}
	return typeOfValues;
}
//Values select
function createValueSelectInFilterRows(selectorInfo, count) {
	var optionsRow = document.getElementById("optionsRow_" + count);

	//Selects
	var divFilterContainer = document.createElement("div");
	divFilterContainer.setAttribute("id", "divFilterContainer_" + count);
	divFilterContainer.setAttribute("style", "display: none;");
	optionsRow.appendChild(divFilterContainer);
	var select = document.createElement("select");
	select.setAttribute("id", "selectorValue" + "_" + count);
	select.style.marginLeft = "10px";
	divFilterContainer.appendChild(select);
	//Simple: inputText, buttons and displaySelects
	var inputText = document.createElement("input");
	inputText.setAttribute("id", "inputText" + "_" + count);
	inputText.setAttribute("type", "text");
	inputText.setAttribute("placeholder", "introduce a value");
	inputText.style.marginLeft = "10px";
	inputText.addEventListener("input", function () {
		changesInInputValueRowFilter("simple", count)
	});
	inputText.addEventListener("keypress", function (event) {
		// If the user presses the "Enter" key on the keyboard
		if (event.key === "Enter") {
			event.preventDefault();
		}
	});
	optionsRow.appendChild(inputText);
	var okButton = document.createElement("button");
	okButton.setAttribute("onclick", "closeModalSelectInValue('" + count + "','ok')");
	okButton.setAttribute("id", "okButton_" + count);
	okButton.innerHTML = "Ok";
	divFilterContainer.appendChild(select);
	var cancelButton = document.createElement("button");
	cancelButton.setAttribute("onclick", "closeModalSelectInValue('" + count + "','cancel')");
	cancelButton.setAttribute("id", "cancelButton_" + count);
	cancelButton.innerHTML = "Cancel";
	var displaySelect = document.createElement("button");
	displaySelect.setAttribute("id", "displaySelect_" + count);
	displaySelect.setAttribute("onclick", "changeWriteToSelect('" + count + "','simple')");
	optionsRow.appendChild(displaySelect);
	divFilterContainer.appendChild(okButton);
	divFilterContainer.appendChild(cancelButton);
	var buttonImage2 = document.createElement("img"); //Button image
	buttonImage2.setAttribute("src", "arrowSelectButton.png");
	displaySelect.appendChild(buttonImage2);
	//Interval: inputText, buttons and displaySelects
	var divFilterContainer2 = document.createElement("div");
	divFilterContainer2.setAttribute("id", "divFilterContainer2_" + count);
	optionsRow.appendChild(divFilterContainer2);
	var selectorValueInterval1 = document.createElement("select");
	selectorValueInterval1.setAttribute("id", "selectorValueInterval1" + "_" + count);
	selectorValueInterval1.style.marginLeft = "10px";
	var selectorValueInterval2 = document.createElement("select");
	selectorValueInterval2.setAttribute("id", "selectorValueInterval2" + "_" + count);
	selectorValueInterval2.style.marginLeft = "5px";
	divFilterContainer2.appendChild(selectorValueInterval1);
	divFilterContainer2.appendChild(selectorValueInterval2);
	var inputTextInterval1 = inputText.cloneNode(true);
	inputTextInterval1.setAttribute("id", "inputTextInterval1" + "_" + count);
	inputTextInterval1.style.marginLeft = "10px";
	var inputTextInterval2 = inputText.cloneNode(true);
	inputTextInterval2.setAttribute("id", "inputTextInterval2" + "_" + count);
	inputTextInterval2.style.marginLeft = "5px";
	inputTextInterval1.addEventListener("input", function () {
		changesInInputValueRowFilter("interval", count)
	});
	inputTextInterval2.addEventListener("input", function () {
		changesInInputValueRowFilter("interval", count)
	});
	inputTextInterval1.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			event.preventDefault();
		}
	});
	inputTextInterval2.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			event.preventDefault();
		}
	});
	optionsRow.appendChild(inputTextInterval1);
	optionsRow.appendChild(inputTextInterval2);
	var okButtonInterval = document.createElement("button");
	okButtonInterval.setAttribute("onclick", "closeModalSelectInValue('" + count + "','ok')");
	okButtonInterval.setAttribute("id", "okButtonInterval_" + count);
	okButtonInterval.innerHTML = "Ok";
	var cancelButtonInterval = document.createElement("button");
	cancelButtonInterval.setAttribute("onclick", "closeModalSelectInValue('" + count + "','cancel')");
	cancelButtonInterval.setAttribute("id", "cancelButtonInterval_" + count);
	cancelButtonInterval.innerHTML = "Cancel";
	var displaySelectInterval = document.createElement("button");
	displaySelectInterval.setAttribute("id", "displaySelectInterval_" + count);
	displaySelectInterval.setAttribute("onclick", "changeWriteToSelect('" + count + "','interval')");
	var buttonImage3 = document.createElement("img"); //button image
	buttonImage3.setAttribute("src", "arrowSelectButton.png");
	displaySelectInterval.appendChild(buttonImage3);
	optionsRow.appendChild(displaySelectInterval);
	divFilterContainer2.appendChild(okButtonInterval);
	divFilterContainer2.appendChild(cancelButtonInterval);
	//Put previous values in input Text( 
	if (selectorInfo.length != 0) {
		if (selectorInfo[0][3] == ' [a,b] ' || selectorInfo[0][3] == ' (a,b] ' || selectorInfo[0][3] == ' [a,b) ' || selectorInfo[0][3] == ' (a,b) ') {
			inputTextInterval1.value = selectorInfo[0][4];
			inputTextInterval2.value = selectorInfo[0][5];
		} else { //simple
			inputText.value = selectorInfo[0][4];
		}
	}
	fillValueSelectorFilterRow(count);
}

async function fillValueSelectorFilterRow(count) {
	var valor, valueToinput, dataToFillSelect, arrayValors = [], valueUndefined;

	//Fill Select
	//Simple
	var selectorValue = document.getElementById("selectorValue" + "_" + count);
	//Interval
	var selectorValueInterval1 = document.getElementById("selectorValueInterval1" + "_" + count);
	var selectorValueInterval2 = document.getElementById("selectorValueInterval2" + "_" + count);
	var selectProperty = document.getElementById("selectorProperty_" + count); //To know if it is STA or OGCAPI (OGCAPI doesn't have it)
	selectorValue.innerHTML = "";
	selectorValueInterval1.innerHTML = "";
	selectorValueInterval2.innerHTML = "";
	var arrayValuesArranged;

	if (selectProperty) { //It is STA data? (4selectors)
		var inputForEntityFilterRowValue = document.getElementById("inputForEntityFilterRow_" + count).value;
		var entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(inputForEntityFilterRowValue, true));
		var node= getNodeDialog("DialogFilterRows");
		var url = getURLWithoutQueryParams(node.STAURL);
		//Find the entity to search values
		var parentLabel = searchParentLabel();
		if (parentLabel != entity) {
			url = url.replace(parentLabel, entity);
		}
		if (typeof node.STAentityValuesForSelect !== "undefined") {
			if (entity != node.STAentityValuesForSelect[0]) { //avoid to call to API for same entity
				dataToFillSelect = await loadAPIDataWithReturn(url, "EntitiesFilterRow");
				node.STAentityValuesForSelect = [entity, dataToFillSelect];
				dataToFillSelect = node.STAentityValuesForSelect[1];
			} else {
				dataToFillSelect = node.STAentityValuesForSelect[1];
			}
		} else {
			dataToFillSelect = await loadAPIDataWithReturn(url, "EntitiesFilterRow");
			node.STAentityValuesForSelect = [entity, dataToFillSelect];
			dataToFillSelect = node.STAentityValuesForSelect[1];
		}
		var selectProperty = document.getElementById("selectorProperty_" + count);
		var selectPropertyValue = selectProperty.options[selectProperty.selectedIndex].value;
		valueUndefined = true;
		if (selectPropertyValue.charAt(selectPropertyValue.length - 1) != "/") { //If property values can be charged. 
			for (let index = 0; index < dataToFillSelect.length; index++) {
				valor = dataToFillSelect[index][selectPropertyValue];
				if (valueUndefined == true && typeof valor !== "undefined") { //All values are undefined? Don't show select
					valueUndefined = false;
				}
				if (typeof valor === "undefined" && selectPropertyValue.includes("/")) { //!!!!!!!!!!!no necessari en csv  gestionar
					valor = dataToFillSelect[index];
					var selectPropertyValueArray = selectPropertyValue.split("/");
					for (var a = 0; a < selectPropertyValueArray.length; a++) {
						valor = valor[selectPropertyValueArray[a]];
					}
				}
				if (!arrayValors.find(element => element == valor)) { //create array with not arranged values
					arrayValors.push(valor);
				}
			}
			arrayValuesArranged = sortValuesNumbersOrText(arrayValors); //arrange values 
		}
	} else { //CSV, OGCAPIFeature (3selectors)
		var selectorColumns = document.getElementById("selectorColumns_" + count);
		var selectorColumnsValue = selectorColumns.options[selectorColumns.selectedIndex].value;
		arrayValuesArranged = obtainValuesFromSTAdataInCSV(selectorColumnsValue);

		if (arrayValuesArranged.length != 0) {
			valueUndefined = false;
		} else {
			valueUndefined = true;
		}
	}

	if (typeof arrayValuesArranged !== "undefined") {
		for (var i = 0; i < arrayValuesArranged.length; i++) { //create select options and fill selector
			valueToinput = arrayValuesArranged[i];
			var option = document.createElement("option");
			option.setAttribute("value", valueToinput);
			option.innerHTML = valueToinput;
			var option2 = document.createElement("option");
			option2.setAttribute("value", valueToinput);
			option2.innerHTML = valueToinput;
			var option3 = document.createElement("option");
			option3.setAttribute("value", valueToinput);
			option3.innerHTML = valueToinput;
			selectorValue.appendChild(option);
			selectorValueInterval1.appendChild(option2);
			selectorValueInterval2.appendChild(option3);
		}
	}

	showAndHiddeSelectorAndInputsFilterRow(count);
}

function changeWriteToSelect(number, selector) {  //To take the text in input
	event.preventDefault();

	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var inputText = document.getElementById("inputText" + "_" + number);
	var displaySelect = document.getElementById("displaySelect_" + number);
	var selectorValueSTA = document.getElementById("selectorValue" + "_" + number);
	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var inputTextInterval1STA = document.getElementById("inputTextInterval1" + "_" + number);
	var inputTextInterval2STA = document.getElementById("inputTextInterval2" + "_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
	var selectorValueInterval1STA = document.getElementById("selectorValueInterval1" + "_" + number);
	var selectorValueInterval2STA = document.getElementById("selectorValueInterval2" + "_" + number);
	//Wich text is open?
	if (selector == "simple") {
		inputText.style.display = "none";
		displaySelect.style.display = "none";
		divFilterContainer.style.display = "inline-block";
		selectorValueSTA.style.display = "inline-block";
	} else { //interval
		inputTextInterval1STA.style.display = "none";
		inputTextInterval2STA.style.display = "none";
		displaySelectInterval.style.display = "none";
		divFilterContainer2.style.display = "inline-block";
		selectorValueInterval1STA.style.display = "inline-block";
		selectorValueInterval2STA.style.display = "inline-block";
	}
}

function closeModalSelectInValue(number, button) { //Ok and Cancel Buttons
	event.preventDefault();

	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var inputText = document.getElementById("inputText" + "_" + number);
	var displaySelect = document.getElementById("displaySelect_" + number);
	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var inputTextInterval1STA = document.getElementById("inputTextInterval1" + "_" + number);
	var inputTextInterval2STA = document.getElementById("inputTextInterval2" + "_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
	var interval;

	//If it comes from simple. Hidde container and show text and display
	if (divFilterContainer.style.display != "none") {
		divFilterContainer.style.display = "none";
		inputText.style.display = "inline-block";
		displaySelect.style.display = "inline-block";
		interval = false;
	} else {//if it comes from interval. Hidde container and show texts and display
		divFilterContainer2.style.display = "none";
		inputTextInterval1STA.style.display = "inline-block";
		inputTextInterval2STA.style.display = "inline-block";
		displaySelectInterval.style.display = "inline-block";
		interval = true;
	}
	if (button == "ok") {
		if (interval == false) {
			var selectorValueSTA = document.getElementById("selectorValue" + "_" + number);
			inputText.value = selectorValueSTA.options[selectorValueSTA.selectedIndex].value;
			changesInInputValueRowFilter("simple", number);
		} else {
			var selectorValueInterval1STA = document.getElementById("selectorValueInterval1" + "_" + number);
			var selectorValueInterval2STA = document.getElementById("selectorValueInterval2" + "_" + number);
			inputTextInterval1STA.value = selectorValueInterval1STA.options[selectorValueInterval1STA.selectedIndex].value;
			inputTextInterval2STA.value = selectorValueInterval2STA.options[selectorValueInterval2STA.selectedIndex].value;
			changesInInputValueRowFilter("interval", number);
		}
	}
}
function changesInInputValueRowFilter(wichinputText, number) { //and refill conditionSelect (interval if it is a number or a date)
	var inputText, textIputInterval1, textIputInterval2;

	if (wichinputText == "simple") { inputText = document.getElementById("inputText" + "_" + number); }
	else {
		textIputInterval1 = document.getElementById("inputTextInterval1" + "_" + number);
		textIputInterval2 = document.getElementById("inputTextInterval2" + "_" + number);
	}
	var value1, valueInput1, valueInput2;
	var valueLength, valueLengthInterval1, valueLengthInterval2;
	var width, withInterval1, withInterval2;
	if (wichinputText == "interval") {
		valueInput1 = textIputInterval1.value;
		valueLengthInterval1 = valueInput1.length;
		valueInput2 = textIputInterval2.value;
		valueLengthInterval2 = valueInput2.length;
	} else {
		value1 = inputText.value;
		valueLength = value1.length;
	}
	//Adjusting input length
	if (valueLength > 15) {
		width = valueLength * 8; // 8px per character
		inputText.style.width = width + "px";
		if (wichinputText == "interval") {
			withInterval1 = valueLengthInterval1 * 8; // 8px per character
			textIputInterval1.style.width = withInterval1 + "px";
			withInterval2 = valueLengthInterval2 * 8; // 8px per character
			textIputInterval2.style.width = withInterval2 + "px";
		}
	} else if (valueLength <= 15) {
		inputText.style.width = "100px";
		if (wichinputText == "interval") {
			textIputInterval1.style.width = "100px";
			textIputInterval2.style.width = "100px";
		}
	}
	//Change options in selector depending of type of value selector
	changeSelectConditionValues(number, wichinputText, value1, valueInput1, valueInput2);
}
//General selects in FilterRow
function showAndHiddeSelectorAndInputsFilterRow(number) {

	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var inputText = document.getElementById("inputText" + "_" + number);
	var inputTextInterval1STA = document.getElementById("inputTextInterval1" + "_" + number);
	var inputTextInterval2STA = document.getElementById("inputTextInterval2" + "_" + number);
	var displaySelect = document.getElementById("displaySelect_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
	var selectorConditionValue = document.getElementById("selectorCondition_" + number).value;
	var selectorValue = document.getElementById("selectorValue" + "_" + number);
	var selectorValueInterval1 = document.getElementById("selectorValueInterval1" + "_" + number);
	var selectorValueInterval2 = document.getElementById("selectorValueInterval2" + "_" + number);
	var selectorProperty = document.getElementById("selectorProperty_" + number);
	var inputForProperty = document.getElementById("inputForProperty_" + number);
	var selectorValueHasChildren;
	if (selectorValue.hasChildNodes()) {
		selectorValueHasChildren = true;
	} else {
		selectorValueHasChildren = false;
	}
	var node= getNodeDialog("DialogFilterRows");
	if (node.image == "FilterRowsSTA.png") {
		if (selectorProperty) { //!OGCAPI
			var selectorPropertyValue = selectorProperty.options[selectorProperty.selectedIndex].value;
			if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
				inputForProperty.style.display = "inline-block";
			} else {
				inputForProperty.style.display = "none";
			}
		}
	}


	if (selectorConditionValue == " [a,b] " || selectorConditionValue == " (a,b] " || selectorConditionValue == " [a,b) " || selectorConditionValue == " (a,b) ") {
		if (inputTextInterval1STA.style.display == "none" && inputText.style.display == "none") { //selectors are shown
			if (selectorValueHasChildren) { //show display button, hidde inputTexts
				divFilterContainer2.style.display = "inline-block";
				inputTextInterval1STA.style.display = "none";
				inputTextInterval2STA.style.display = "none";
			} else { // hidde selector things and show inputText
				divFilterContainer2.style.display = "none";
				displaySelectInterval.style.display = "none";
				inputTextInterval1STA.style.display = "inline-block";
				inputTextInterval2STA.style.display = "inline-block";
			}
			//PropertySelect finals with "/" . Selector for value has to be hidden
			if (node.image == "FilterRowsSTA.png") {
				if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
					inputTextInterval1STA.style.display = "inline-block";
					inputTextInterval2STA.style.display = "inline-block";
					selectorValueInterval1.style.display = "none";
					selectorValueInterval2.style.display = "none";
				}
			}
		} else { //inputs are shown
			if (selectorValueHasChildren) { //show display button
				displaySelectInterval.style.display = "inline-block";
			} else {
				displaySelectInterval.style.display = "none";
			}
			inputTextInterval1STA.style.display = "inline-block";
			inputTextInterval2STA.style.display = "inline-block";
			divFilterContainer2.style.display = "none";
		}
		//simple : hide all
		inputText.style.display = "none";
		divFilterContainer.style.display = "none";
		displaySelect.style.display = "none";

	} else { //simple
		if (inputText.style.display == "none" && inputTextInterval1STA.style.display == "none") { //selectors are shown
			if (selectorValueHasChildren) { //show display button, hidde inputTexts
				divFilterContainer.style.display = "inline-block";
				inputText.style.display = "none";
				inputText.style.display = "none";
			} else { // hidde selector things and show inputText
				divFilterContainer.style.display = "none";
				displaySelect.style.display = "none";
				inputText.style.display = "inline-block";
				inputText.style.display = "inline-block";

			}
			//PropertySelect finals with "/" . Selector for value has to be hidden

			if (node.image == "FilterRowsSTA.png") {
				if (selectorPropertyValue.charAt(selectorPropertyValue.length - 1) == "/") {
					inputText.style.display = "inline-block";
					selectorValue.style.display = "none"
				}
			}
		} else { //inputs are shown
			if (selectorValueHasChildren) { //show display button
				displaySelect.style.display = "inline-block";
			} else {
				displaySelect.style.display = "none";
			}
			inputText.style.display = "inline-block";
			inputText.style.display = "inline-block";
			divFilterContainer.style.display = "none";
		}
		//Interval : hide all
		inputTextInterval1STA.style.display = "none";
		inputTextInterval2STA.style.display = "none";
		divFilterContainer2.style.display = "none";
		displaySelectInterval.style.display = "none";
	}
}
var stopSearchparentLabel = false;
function searchParentLabel() {
	var entity = "0";
	var node= getNodeDialog("DialogFilterRows");
	var parentNode=GetFirstParentNode(node);
	for (var i = 0; i < STAEntitiesArray.length; i++) {
		if (parentNode.label == STAEntitiesArray[i]) {
			entity = STAEntitiesArray[i];
		}
	}
	return entity;
}
////////////////New Table////////////////////
function GetFilterTable(elem, nodeId, first) //Built table //The second will be called by showFilter
{
	//when the element that comes to you is the elemFilter, add a button to add one more level
	if (elem.boxName) {
		var s = '<table style="margin-top: 10px;"><tr class="trBoxName"><td style="position: relative;border: 2px solid #34383aef; " id="boxName_' + elem.boxName + '">'; //class="tableFilter
	} else {
		var s = '<table><tr class="trLineBoxName"><td>';
	}
	if (first) {
		s += `<div class="topButtonsFilterRow"><button onclick="biggestLevelButton('${elem.boxName}')">Add a higher group</button>`;
	}
	if (elem.boxName) {
		s += '<button onclick="addNewCondition(\'' + elem.boxName + '\')">Add a new condition below</button></div>';
	}
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			s += GetFilterTable(elem.elems[i], nodeId);
		}
		if (elem.nexus) {
			s += `</td><td valign="middle" class="tdSelectAndOrNot" id='tdSelectAndOrNot_${elem.boxName}'><div class="topPartSelectAndOrNot" ></div><div class="bottomPartSelectAndOrNot" id= "bottomPartSelectAndOrNot_${elem.boxName}"><select class="selectAndOrNot" name="selectAndOrNot"  onchange= "actualizeSelectChoice('${elem.boxName}')" id="selectAndOrNot_${elem.boxName}">`;
			if (elem.nexus == " and ") {
				s += '<option value=" and " selected>And</option>';
			} else {
				s += '<option value=" and ">And</option>';
			}
			if (elem.nexus == " or ") {
				s += '<option value=" or " selected>Or</option>';
			} else {
				s += '<option value=" or ">Or</option>';
			}
			if (elem.nexus == " not ") {
				s += '<option value=" not " selected>Not</option>';
			} else {
				s += '<option value=" not ">Not</option>';
			}
			s += '</select></div>';
		}
	}
	else {
		s += GetFilterCondition(elem);
	}
	s += '</td></tr></table>';
	return s;
}
function GetFilterCondition(elem) {
	var node= getNodeDialog("DialogFilterRows");
	node.STACounter.push(elem);
	return node.STAconditionsFilter[elem].property + '<div class="buttonsInFilterRow"><button onClick="DeleteElementButton(' + elem + ')"><img src="trash.png" alt="Remove" title="Remove"></button></div>';
}
function ShowFilterTable() //This is who iniciates the table
{
	var node= getNodeDialog("DialogFilterRows");
	node.STACounter = []; //To not acumulate
	networkNodes.update(node);
	document.getElementById("divSelectorRowsFilter").innerHTML = GetFilterTable(node.STAelementFilter, node.id, true); //I need to pass node.elemFilter because it is a recursive function an need to start in this point
	for (var i = 0; i < node.STACounter.length; i++) {//Adding Selectors
		createSelectorRowFilters(node.STACounter[i]);
	}

}
function showFilterTableWithoutFilters() {
	document.getElementById("divSelectorRowsFilter").innerHTML = "<div>This collection doesn't allow to filter its data. You can filter the data preloaded by clickng the button below. Choose how many registers you want to filter in the box below. </div><button onclick='ShowFilterTable()'>See filtering box</button>";
}

//Select Nexus (And, or, not)
function actualizeSelectChoice(boxName) { //When select nexus changes (put selected option in STAelementFilter)
	var select = document.getElementById("selectAndOrNot_" + boxName);
	var option = select.options[select.selectedIndex].value;
	var node= getNodeDialog("DialogFilterRows");
	searchGroupToChangeSelectChoice(boxName, node.STAelementFilter, option);
}
function searchGroupToChangeSelectChoice(boxName, elem, option) {
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchGroupToChangeSelectChoice(boxName, elem.elems[i], option);
		}
		if (elem.boxName == boxName) { //to add elems => elems[0,1...]
			elem.nexus = option;
		}
	}
}
function resizeBottomPartSelectAndOrNot() {
	var node= getNodeDialog("DialogFilterRows");
	var boxNames = node.STAboxNames;
	for (var i = 0; i < boxNames.length; i++) {
		var tdSelectAndOrNot = document.getElementById("tdSelectAndOrNot_" + boxNames[i]);
		if (tdSelectAndOrNot != null) {
			var tdSelectAndOrNotHeight = tdSelectAndOrNot.clientHeight;
			var bottomPartSelectAndOrNot = document.getElementById("bottomPartSelectAndOrNot_" + boxNames[i]);
			bottomPartSelectAndOrNot.style.height = (tdSelectAndOrNotHeight - 30) + "px";
		}
	}
}


//Add conditions
function addNewCondition(boxName, fromBiggest) {
	event.preventDefault();
	if (typeof fromBiggest === "undefined") {
		fromBiggest = false;
	}
	var node= getNodeDialog("DialogFilterRows");
	searchFilterBoxName(boxName, node.STAelementFilter, node.Id, fromBiggest);
}
function searchFilterBoxName(boxNamee, elem, paramsNodeId, fromBiggest) { //the elem has  boxName ...
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchFilterBoxName(boxNamee, elem.elems[i], paramsNodeId, fromBiggest);
		}
		if (elem.boxName == boxNamee) {  //Add elems => elems[0,1...]
			addNewElement(elem, fromBiggest);
		}
	}
}
function addNewElement(elem, fromBiggest) {
	var elements = elem.elems;
	var node= getNodeDialog("DialogFilterRows");
	var conditionsFilter = node.STAconditionsFilter;
	var lastNumber = conditionsFilter[conditionsFilter.length - 1].number;
	var nextNumber = parseInt(lastNumber) + 1; //for those who are within the 0_...
	if (elem.boxName.charAt(0) != 0) {//groups other than 0 and must create a group and not an element
		var newBoxName = elem.boxName;
		var firstNumberBoxNameInside = parseInt(elem.boxName.charAt(0)) - 1; //First number: inside group
		//search, split , arrange iand the lastone, plus one i add boxNames
		var boxNames = node.STAboxNames;
		var boxNamesFiltered = boxNames.filter(element => element.charAt(0) == firstNumberBoxNameInside); //filter those that already exist in the group that will be created
		var nextBoxNumber;
		if (boxNamesFiltered.length != 0) {
			nextBoxNumber = parseInt(boxNamesFiltered[boxNamesFiltered.length - 1].charAt(2)) + 1; //you take the last one and add one to make the next one
		} else {
			nextBoxNumber = "0";
		}
		var newBoxName = firstNumberBoxNameInside + "_" + nextBoxNumber;
		if (elem.boxName.charAt(0) != 1) {
			elements.push( //I have to put it at the same height
				{
					elems: [],
					nexus: null,
					boxName: newBoxName,
				}
			);
		} else { //1 will make a 0 and therefore can create a new one
			elements.push( //I have to put it at the same height
				{
					elems: [nextNumber], //level 1
					nexus: null,
					boxName: newBoxName,
				})
		}
		node.STAboxNames.push(newBoxName);
		//If it's the second one, you must create a higher level and change the nexus so that it will be not null
	}
	else { //inside group 0_...
		elements.push(nextNumber); //add to elem array
	}
	if (elements.length == 2) { //change nexus if pass from one to two
		elem.nexus = "and"
	}
	conditionsFilter.push({ //add to conditionsFilter
		property: "<div id='optionsRow_" + nextNumber + "' style='display: inline-block'></div>", //class='optionsRow
		number: nextNumber
	});
	if (newBoxName) {
		var levelBox = newBoxName.charAt(0);
		var boxNameToPass = newBoxName;
		for (var i = levelBox; i > 0; i--) {
			addNewCondition(boxNameToPass, node.id);
			boxNameToPass = boxNames[boxNames.length - 1]; //must be the last to be created (the one that was just created)
		}
	}

	if (node.image == "FilterRowsSTA.png") {
		var entity = getSTAEntityPlural(getNodeDialog("DialogFilterRows").STAEntityName);
		node.STAFilterRowEntities["optionsRow" + nextNumber] = [entity];

	}

	if (fromBiggest == false) {
		takeSelectInformation();//take selector values and update an external variable
		drawTableAgain();//repaint selects
		resizeBottomPartSelectAndOrNot();//correct size to select(AndOrNot) div
	}
}
//Delete element
function DeleteElementButton(numberOfElement) {
	event.preventDefault();
	//Delete elemen from node.STAFilterRowEntities 
	var node= getNodeDialog("DialogFilterRows");
	var nodeLabel = node.image;
	if (nodeLabel == "FilterRowsSTA.png") {
		delete node.STAFilterRowEntities["optionsRow" + numberOfElement];
	}

	searchElementToDelete(numberOfElement, node.STAelementFilter, node.id);
}
function searchElementToDelete(numberOfElement, elem, paramsNodeId) { //elem has boxname...
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchElementToDelete(numberOfElement, elem.elems[i], paramsNodeId);
		}
		if (elem.elems.includes(numberOfElement)) { //add a elems => elems[0,1...]
			DeleteElementInElemFilter(elem, numberOfElement);
		}
	}
}
function DeleteElementInElemFilter(elem, numberOfElement) {
	//do not delete the conditions filter because it is the position
	var index = elem.elems.indexOf(parseInt(numberOfElement));
	elem.elems.splice(index, 1); //delete from elemFilter	
	if (elem.elems.length == 1) { //if only  remains one, remove nexus
		elem.nexus = null;
	}
	if (elem.elems.length == 0) {
		deleteGroup(elem.boxName)
	}
	takeSelectInformation();//get selector values and update an external variable 
	drawTableAgain();//repaint selects
	resizeBottomPartSelectAndOrNot();
}
//Delete group (necesary when it is the last condition in the group)
function deleteGroup(numberOfElement) {
	event.preventDefault();
	var node= getNodeDialog("DialogFilterRows");
	searchBoxNameGroup(numberOfElement, node.STAelementFilter, "no", "fromDeleteGrup");
	var newSTAboxNames=[];
	for (var i = 0; i< node.STAboxNames.length;i++){
		if (node.STAboxNames[i]!=numberOfElement) newSTAboxNames.push(node.STAboxNames[i])
		

	}
	node.STAboxNames= newSTAboxNames;
	networkNodes.update(node);
	takeSelectInformation();//get selector values and update an external variable 
	drawTableAgain();//repaint the selects
}

function searchBoxNameGroupForGetFilterRowsTable(numberOfElement, elem, originFunction) { //elem has boxes ...
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchBoxNameGroupForGetFilterRowsTable(numberOfElement, elem.elems[i], originFunction);
		}
		if (elem.boxName == numberOfElement) { //add to elems => elems[0,1...]
			builtSummaryToFilterTable(elem);

		}
	}
}
function searchBoxNameGroup(numberOfElement, elem, fatherElem, originFunction) { //elem has boxes ...

	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchBoxNameGroup(numberOfElement, elem.elems[i], elem, originFunction);
		}
		if (elem.boxName == numberOfElement) { //add to elems => elems[0,1...]
			if (originFunction == "fromDeleteGrup") {
				DeleteGroupInElemFilter(elem, fatherElem);
			} else if (originFunction == "getFilterRowsTable") {

				return elem;


			}
		}
	}
}

function DeleteGroupInElemFilter(elem, fatherElem) {
	var newArray = [];
	var node= getNodeDialog("DialogFilterRows");
	if (fatherElem != "no") {
		for (var i = 0; i < fatherElem.elems.length; i++) {
			if (fatherElem.elems[i].boxName != elem.boxName) {
				newArray.push(fatherElem.elems[i])
			}
		}
		fatherElem.elems = newArray;
		//delete boxNames (If there are groups inside tmb they must be deleted)
		var arrayBoxNumbers = [];
		if (newArray.length == 1) { //if it is the last one, delete the nexus and the parent
			fatherElem.nexus = null;
			var copyFather = Object.assign(fatherElem.elems);
			node.STAelementFilter = copyFather[0];
		}
		//var boxNames = node.STAboxNames;
		var boxNames = actualizeBoxNames(node.STAelementFilter, arrayBoxNumbers);  //It is necesary?
	}
}
function actualizeBoxNames(elem, arrayBoxNumbers) {
	if (typeof elem === "object") {
		arrayBoxNumbers.push(elem.boxName)
		for (var i = 0; i < elem.elems.length; i++) {
			actualizeBoxNames(elem.elems[i], arrayBoxNumbers);
		}
	}
	return arrayBoxNumbers;
}
//DrawTable
function drawTableAgain() {
	document.getElementById("divSelectorRowsFilter").innerHTML = "";
	ShowFilterTable()
}



function takeSelectInformation() {
	var optionsRow;
	var inputForEntityFilterRow, selectorProperty, inputProperty, selectorCondition, inputText, inputTextInterval1, inputTextInterval2, selectorValue, selectorValueInterval1, selectorValueInterval2, divFilterContainer, divFilterContainer2;
	var inputForEntityFilterRowValue, selectorPropertyValue = [], selectorConditionValue, inputTextValue, inputTextInterval1Value, inputTextInterval2Value;
	var arrayInfo;
	var infoFilter = [];
	var node= getNodeDialog("DialogFilterRows");
	var counter = node.STACounter;


	for (var i = 0; i < counter.length; i++) {
		optionsRow = document.getElementById("optionsRow_" + counter[i]);
		arrayInfo = [];
		arrayInfo.push(counter[i]); //they are out of order, it is necessary to put each info in its place when painting the select

		if (optionsRow != null) {
			if (node.image == "FilterRowsSTA.png" && !node.STAOGCAPIconformance) {

				inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + counter[i]);
				inputForEntityFilterRowValue = inputForEntityFilterRow.value;
				selectorProperty = document.getElementById("selectorProperty_" + counter[i]);
				inputProperty = document.getElementById("inputForProperty_" + counter[i]);
				selectorPropertyValue = [];
				selectorPropertyValue.push(selectorProperty.options[selectorProperty.selectedIndex].value);
				if (inputProperty.style.display == "inline-block") {
					selectorPropertyValue.push(inputProperty.value);
				}
				arrayInfo.push(inputForEntityFilterRowValue, selectorPropertyValue);
			} else { //CSV
				var selectorColumns = document.getElementById("selectorColumns_" + counter[i]);
				var selectorColumnsSelected = selectorColumns.options[selectorColumns.selectedIndex].value;
				arrayInfo.push(selectorColumnsSelected, "no");

			}
			selectorCondition = document.getElementById("selectorCondition_" + counter[i]);
			selectorConditionValue = selectorCondition.options[selectorCondition.selectedIndex].value;
			arrayInfo.push(selectorConditionValue);


			if (selectorConditionValue == ' [a,b] ' || selectorConditionValue == ' (a,b] ' || selectorConditionValue == ' [a,b) ' || selectorConditionValue == ' (a,b) ') {
				inputTextInterval1 = document.getElementById("inputTextInterval1" + "_" + counter[i]);
				inputTextInterval2 = document.getElementById("inputTextInterval2" + "_" + counter[i]);
				selectorValueInterval1 = document.getElementById("selectorValueInterval1" + "_" + counter[i]);
				selectorValueInterval2 = document.getElementById("selectorValueInterval2" + "_" + counter[i]);
				divFilterContainer2 = document.getElementById("divFilterContainer2_" + counter[i]);
				if (divFilterContainer2.style.display == "inline-block") { //Select open
					inputTextInterval1Value = selectorValueInterval1.options[selectorValueInterval1.selectedIndex].value;
					inputTextInterval2Value = selectorValueInterval2.options[selectorValueInterval2.selectedIndex].value;
				} else {
					inputTextInterval1Value = inputTextInterval1.value;
					inputTextInterval2Value = inputTextInterval2.value;
				}
				arrayInfo.push(inputTextInterval1Value);
				arrayInfo.push(inputTextInterval2Value);
				var typeOfValue = typeOfValueFromInput("interval", inputTextInterval1Value, inputTextInterval2Value)
			} else {
				inputText = document.getElementById("inputText" + "_" + counter[i]);
				divFilterContainer = document.getElementById("divFilterContainer_" + counter[i]);
				selectorValue = document.getElementById("selectorValue" + "_" + counter[i]);
				if (divFilterContainer.style.display == "inline-block") { //Select open
					inputTextValue = selectorValue.options[selectorValue.selectedIndex].value;
				} else {
					inputTextValue = inputText.value;
				}
				arrayInfo.push(inputTextValue);
				var typeOfValue = typeOfValueFromInput("simple", inputTextValue)
			}
		}
		arrayInfo.push(typeOfValue)
		infoFilter.push(arrayInfo);
	}
	node.STAinfoFilter = infoFilter;
	networkNodes.update(node);
}

function biggestLevelButton(boxName) {
	event.preventDefault();
	var node= getNodeDialog("DialogFilterRows");
	var newBoxName = (parseInt(boxName.charAt(0)) + 1) + "_0";
	var newInsert = {
		elems: [],
		nexus: null,
		boxName: newBoxName
	};
	
	newInsert.elems.push(Object.assign(node.STAelementFilter));
	node.STAboxNames.push(newBoxName);
	node.STAelementFilter = newInsert;
	networkNodes.update(node);
	addNewCondition(newBoxName, node.id, true); //fromBiggest=true -> To avoid TakeSelect ...etc in addNewElement function
	takeSelectInformation();//take the values ​​of the selectors and update an external variable
	drawTableAgain();
	resizeBottomPartSelectAndOrNot();//correct size to select(AndOrNot) div
}
//Applying the filter
//var stopreadInformationRowFilterSTA = false;

//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
function readInformationRowFilterSTA(elem, entity, nexus, parent) {  //STA
	var node= getNodeDialog("DialogFilterRows");
	var infoFilter = node.STAinfoFilter;
	if (stopreadInformationRowFilterSTA == false) {
		if (typeof elem === "object") {
			for (var i = 0; i < elem.elems.length; i++) {
				readInformationRowFilterSTA(elem.elems[i], entity, elem.nexus, elem);
			}
			if (node.STAUrlAPICounter.length != infoFilter.length && node.STAUrlAPICounter.length != 0 && nexus != "no" && parent != "no") {
				node.STAUrlAPI += " " + nexus + " ";
			}
		}
		else { //Build URL
			//Last Array, which contains the filters 
			var data = "";
			for (var i = 0; i < infoFilter.length; i++) {
				if (infoFilter[i][0] == elem) { //To search the array that contains the info that we want
					var parentLenght = parent.elems.length;
					var indexOf = parent.elems.indexOf(elem);
					if (indexOf == 0) {
						data += "(";
					}
					var valueOfEntity = infoFilter[i][1];
					var lengthEntity = valueOfEntity.indexOf("/")
					if (-1 != lengthEntity) { //Erase first entity name in the path
						valueOfEntity = valueOfEntity.slice(lengthEntity + 1); //Erase entity and "/"
					}
					///Apply filter depending on Select Condition
					if (infoFilter[i][3] == ' = ' || infoFilter[i][3] == ' &ne; ' || infoFilter[i][3] == ' &ge; ' || infoFilter[i][3] == ' > ' || infoFilter[i][3] == ' &le; ' || infoFilter[i][3] == ' < ') { //passarho a com STA+
						data += "(";
						if (entity != valueOfEntity) { //If it's not the entity of the node and it is a connected box need "node entity name "
							data += valueOfEntity + "/";
						}
						data += infoFilter[i][2][0];
						if (infoFilter[i][2].length == 2) {
							data += infoFilter[i][2][1];
						}
						var typeOfValue = infoFilter[i][5];
						var apostropheOrSpace;
						(typeOfValue == "text") ? apostropheOrSpace = "'" : apostropheOrSpace = "";
						switch (infoFilter[i][3]) {
							case ' = ':
								data += " eq " + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";
								break;
							case ' &ne; ':
								data += " ne " + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";
								break;
							case ' &ge; ':
								data += " ge " + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";
								break;
							case ' > ':
								data += " gt " + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";
								break;
							case ' &le; ':
								data += " le " + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";
								break;
							case ' < ':
								data += " lt " + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";
								break;
							default:
						}
					}
					else if (infoFilter[i][3] == ' [a,b] ' || infoFilter[i][3] == ' (a,b] ' || infoFilter[i][3] == ' [a,b) ' || infoFilter[i][3] == ' (a,b) ') {
						if (entity != valueOfEntity) {
							valueOfEntity = valueOfEntity + "/" + infoFilter[i][2];
						} else {
							valueOfEntity = infoFilter[i][2];
						}
						if (infoFilter[i][2].length == 2) {
							valueOfEntity += infoFilter[i][2][1];
						}
						data += "( " + valueOfEntity;
						switch (infoFilter[i][3]) {
							case ' [a,b] ':
								data += " ge " + infoFilter[i][4] + " and " + valueOfEntity + " le " + infoFilter[i][5] + ")";
								break;
							case ' (a,b] ':
								data += " gt " + infoFilter[i][4] + " and " + valueOfEntity + " le " + infoFilter[i][5] + ")";
								break;
							case ' [a,b) ':
								data += " ge " + infoFilter[i][4] + " and " + valueOfEntity + " lt " + infoFilter[i][5] + ")";
								break;
							case ' (a,b) ':
								data += " gt " + infoFilter[i][4] + " and " + valueOfEntity + " lt " + infoFilter[i][5] + ")";
								break;
							default:
						}
					}
					else if (infoFilter[i][3] == 'contains' || infoFilter[i][3] == 'no contains' || infoFilter[i][3] == 'starts with' || infoFilter[i][3] == 'ends with') {
						if (entity != valueOfEntity) {
							valueOfEntity = valueOfEntity + "/" + infoFilter[i][2];
						} else {
							valueOfEntity = infoFilter[i][2];
						}
						if (infoFilter[i][2].length == 2) {
							valueOfEntity += infoFilter[i][2][1];
						}
						switch (infoFilter[i][3]) {
							case 'contains':
								data += "substringof('" + infoFilter[i][4] + "'," + valueOfEntity + ")";
								break;
							case 'no contains':
								data += "not substringof('" + infoFilter[i][4] + "'," + valueOfEntity + ")";
								break;
							case 'starts with':
								data += "startswith(" + valueOfEntity + ",'" + infoFilter[i][4] + "')";
								break;
							case 'ends with':
								data += "endswith(" + valueOfEntity + ",'" + infoFilter[i][4] + "')";
								break;
							default:
						}
					}
					else if (infoFilter[i][3] == 'year' || infoFilter[i][3] == 'month' || infoFilter[i][3] == 'day' || infoFilter[i][3] == 'hour' || infoFilter[i][3] == 'minute' || infoFilter[i][3] == 'date') {
						var newValue = "";
						for (var a = 0; a < infoFilter[i][4].length; a++) {//erase 0 if starts with 0. 
							if (infoFilter[i][4].charAt(a) != 0) {
								newValue += infoFilter[i][4].charAt(a)
							}
						}
						infoFilter[i][4] = newValue;
						switch (infoFilter[i][3]) {
							case 'year':
								data += "year(resultTime) eq " + infoFilter[i][4];
								break;
							case 'month':
								data += "month(resultTime) eq " + infoFilter[i][4];
								break;
							case 'day':
								data += "day(resultTime) eq " + infoFilter[i][4];
								break;
							case 'hour':
								data += "hour(resultTime) eq " + infoFilter[i][4];
								break;
							case 'minute':
								data += "minute(resultTime) eq " + infoFilter[i][4];
								break;
							case 'date':
								data += "date(resultTime) eq date('" + infoFilter[i][4] + "')";
								break;
							default:
						}
					}
					if ((indexOf + 1) != parentLenght) {
						data += nexus
					}
					if ((indexOf + 1) == parentLenght) {
						data += ")";
					}
					node.STAUrlAPI += data
					node.STAUrlAPICounter.push(infoFilter[i][0]);
				}
			}
		}
		if (node.STAUrlAPICounter.length == infoFilter.length) {
			node.STAUrlAPI.slice(0, "(");
			node.STAUrlAPI.slice(node.STAUrlAPI.length + 1, ")");
			stopreadInformationRowFilterSTA = true;
		}
	}
}

//

function createObjectToKeepForFilter(node, objectToExplore, objectToBuild) {

	var boxNamesArrays = [];
	for (var i = 0; i < objectToExplore.elems.length; i++) {
		 (objectToExplore.elems[i].boxName)?boxNamesArrays.push(objectToExplore.elems[i].boxName):boxNamesArrays.push(objectToExplore.elems[i]) ;
	}

	objectToBuild[objectToExplore.boxName] = {
		["items"]: boxNamesArrays,
		["nexus"]: objectToExplore.nexus
	}
	if (typeof objectToExplore.elems[0] === "object") {
		for (var i = 0; i < objectToExplore.elems.length; i++) {
			createObjectToKeepForFilter(node, objectToExplore.elems[i], objectToBuild);
		}
	}else{
		node.STAFilterSchema= objectToBuild;
		networkNodes.update(node);
	}		
}






//
var stopreadInformationRowFilterTable = false;

function readInformationRowFilterTable(elem, nexus, parent) {  //Table
	var node= getNodeDialog("DialogFilterRows");
	var infoFilter = node.STAinfoFilter;

	switch (nexus) {
		case "and":
			nexus = "&&"
			break;
		case " or ":
			nexus = "||"
			break;
		case " not ":
			nexus = "!="
			break;
	}

	if (stopreadInformationRowFilterTable == false) {
		if (typeof elem === "object") {
			for (var i = 0; i < elem.elems.length; i++) {
				readInformationRowFilterTable(elem.elems[i], elem.nexus, elem);
			}
			if (node.STAtableCounter.length != infoFilter.length && node.STAtableCounter.length != 0 && nexus != "no" && parent != "no") {
				node.STAtable += " " + nexus + " ";
			}
		}
		else { //Build URL

			//Last Array, which contains the filters 
			var data = "", condition;

			for (var i = 0; i < infoFilter.length; i++) {
				switch (infoFilter[i][3]) {
					case ' = ':
						condition = " == ";
						break;
					case ' &ne; ':
						condition = " != ";
						break;
					case ' &ge; ':
						condition = " >= ";
						break;
					case ' > ':
						condition = " > ";
						break;
					case ' &le; ':
						condition = " <= ";
						break;
					case ' < ':
						condition = " < ";
						break;
				}
				if (infoFilter[i][0] == elem) { //To search the array that contains the info that we want
					var parentLenght = parent.elems.length;
					var indexOf = parent.elems.indexOf(elem);
					var typeOfValue = infoFilter[i][5];
					var apostropheOrSpace;
					(typeOfValue == "number") ? apostropheOrSpace = "" : apostropheOrSpace = "'";
					if (indexOf == 0) {
						data += "(";
					}

					///Apply filter depending on Select Condition
					if (infoFilter[i][3] == ' = ' || infoFilter[i][3] == ' &ne; ' || infoFilter[i][3] == ' &ge; ' || infoFilter[i][3] == ' > ' || infoFilter[i][3] == ' &le; ' || infoFilter[i][3] == ' < ') { //passarho a com Table+

						data += "(" + apostropheOrSpace + infoFilter[i][1] + apostropheOrSpace + condition + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";

					}
					else if (infoFilter[i][3] == ' [a,b] ' || infoFilter[i][3] == ' (a,b] ' || infoFilter[i][3] == ' [a,b) ' || infoFilter[i][3] == ' (a,b) ') {

						switch (infoFilter[i][3]) {
							case ' [a,b] ':
								data += "( " + infoFilter[i][1] + " >= " + infoFilter[i][4] + " && " + infoFilter[i][1] + " <= " + infoFilter[i][5] + ")";
								break;
							case ' (a,b] ':
								data += "( " + infoFilter[i][1] + " > " + infoFilter[i][4] + " && " + infoFilter[i][1] + " <= " + infoFilter[i][5] + ")";
								break;
							case ' [a,b) ':
								data += "( " + infoFilter[i][1] + " >= " + infoFilter[i][4] + " && " + infoFilter[i][1] + " < " + infoFilter[i][5] + ")";
								break;
							case ' (a,b) ':
								data += "( " + infoFilter[i][1] + " > " + infoFilter[i][4] + " && " + infoFilter[i][1] + " < " + infoFilter[i][5] + ")";
								break;
							default:
						}
					}
					else if (infoFilter[i][3] == 'contains' || infoFilter[i][3] == 'no contains' || infoFilter[i][3] == 'starts with' || infoFilter[i][3] == 'ends with') {

						switch (infoFilter[i][3]) {
							case 'contains': //includes()
								data += "('" + infoFilter[i][1] + "'.includes('" + infoFilter[i][4] + "'))";
								break;
							case 'no contains': //no includes()
								data += "(!'" + infoFilter[i][1] + "'.includes('" + infoFilter[i][4] + "'))";
								break;
							case 'starts with': //.startsWith()
								data += "('" + infoFilter[i][1] + "'.startsWith('" + infoFilter[i][4] + "'))";
								break;
							case 'ends with': //endsWith()
								data += "('" + infoFilter[i][1] + "'.endsWith('" + infoFilter[i][4] + "'))";
								break;
							default:
						}
					}
					else if (infoFilter[i][3] == 'year' || infoFilter[i][3] == 'month' || infoFilter[i][3] == 'day' || infoFilter[i][3] == 'hour' || infoFilter[i][3] == 'minute' || infoFilter[i][3] == 'date') {
						switch (infoFilter[i][3]) {
							case 'year':
								data += "(" + "new Date('" + infoFilter[i][1] + "').getFullYear()==" + infoFilter[i][4] + ")";

								break;
							case 'month':
								var value = infoFilter[i][4];
								if (value.length == 2 && value[0] == "0") {
									value = value.slice(1);
								}
								data += "(" + "new Date('" + infoFilter[i][1] + "').getMonth()==" + ((parseInt(value)) - 1) + ")"; //month function give you one number less
								break;
							case 'day':
								data += "(" + "new Date('" + infoFilter[i][1] + "').getDate()==" + infoFilter[i][4] + ")"; //getDay returns de day of the week
								break;
							case 'hour':
								data += "(" + "new Date('" + infoFilter[i][1] + "').getHours()==" + infoFilter[i][4] + ")"; //Problems if date ends with Z () (give hour +2)
								break;
							case 'minute':
								data += "(" + "new Date('" + infoFilter[i][1] + "').getMinutes()==" + infoFilter[i][4] + ")";
								break;
						}
					}
					if ((indexOf + 1) != parentLenght) {
						data += nexus
					}
					if ((indexOf + 1) == parentLenght) {
						data += ")";
					}
					node.STAtable += data
					node.STAtableCounter.push(infoFilter[i][0]);
				}
			}
		}
		if (node.STAtableCounter.length == infoFilter.length) {
			stopreadInformationRowFilterTable = true;
		}
	}
}

var stopreadInformationRowFilterOGCAPIFeatures = false;
function readInformationRowFilterOGCAPIFeatures(elem, entity, nexus, parent) { //OGCAPIFeatures
	var node= getNodeDialog("DialogFilterRows");
	var infoFilter = node.STAinfoFilter;
	if (stopreadInformationRowFilterOGCAPIFeatures == false) {
		if (typeof elem === "object") {
			for (var i = 0; i < elem.elems.length; i++) {
				readInformationRowFilterOGCAPIFeatures(elem.elems[i], entity, elem.nexus, elem);
			}
			if (node.STAUrlAPICounter.length != infoFilter.length && node.STAUrlAPICounter.length != 0 && nexus != "no" && parent != "no") {
				node.STAUrlAPI += " " + nexus + " ";
			}
		}
		else { //Build URL
			//Last Array, which contains the filters 
			var data = "", condition;;
			for (var i = 0; i < infoFilter.length; i++) {
				switch (infoFilter[i][3]) {
					case ' = ':
						condition = " = ";
						break;
					case ' &ne; ':
						condition = " != ";
						break;
					case ' &ge; ':
						condition = " >= ";
						break;
					case ' > ':
						condition = " > ";
						break;
					case ' &le; ':
						condition = " <= ";
						break;
					case ' < ':
						condition = " < ";
						break;
				}
				if (infoFilter[i][0] == elem) { //To search the array that contains the info that we want
					var parentLenght = parent.elems.length;
					var indexOf = parent.elems.indexOf(elem);
					var apostropheOrSpace;
					var typeOfValue = infoFilter[i][5];//it is not posible to take the information of data type because every API calls it diferent (type, data type...)		
					(typeOfValue == "number") ? apostropheOrSpace = "" : apostropheOrSpace = "'"; //Canviar segons el tipus que posi a la queryable

					// if (indexOf == 0) {
					// 	data += "(";
					// }
					if (condition == ' = ' || condition == ' &ne; ' || condition == ' &ge; ' || condition == ' > ' || condition == ' &le; ' || condition == ' < ') { //passarho a com Table+

						data += "(" + infoFilter[i][1] + condition + apostropheOrSpace + infoFilter[i][4] + apostropheOrSpace + ")";

					}
					//by the moment, only this can be filtered
					if ((indexOf + 1) != parentLenght) {
						data += nexus
					}
					// if ((indexOf + 1) == parentLenght) {
					// 	data += ")";
					// }
					node.STAUrlAPI += data
					node.STAUrlAPICounter.push(infoFilter[i][0]);
				}
			}
		}
		if (node.STAUrlAPICounter.length == infoFilter.length) {
			node.STAUrlAPI.slice(0, "(");
			node.STAUrlAPI.slice(node.STAUrlAPI.length + 1, ")");
			stopreadInformationRowFilterSTA = true;
		}
	}
}

function applyEvalAndFilterData() {
	var node= getNodeDialog("DialogFilterRows");
	var infoFilter = node.STAinfoFilter;
	var data = node.STAdata;
	var sentenceToEvalInSTAtable = node.STAtable;
	var columnsUsedArray = [], resultsFiltered = [];

	for (var i = 0; i < infoFilter.length; i++) {
		//Array of columns used to replace in eval sentence
		if (!columnsUsedArray.find(element => element == infoFilter[i][1])) {
			columnsUsedArray.push(infoFilter[i][1]);
		}

	}
	var sentence = node.STAtable;
	var dataValue, dataValueWithoutZ;
	for (var e = 0; e < data.length; e++) {

		for (var i = 0; i < columnsUsedArray.length; i++) {
			sentenceToEvalInSTAtable = sentenceToEvalInSTAtable.replaceAll(columnsUsedArray[i], data[e][columnsUsedArray[i]]);
			dataValue = data[e][columnsUsedArray[i]];

		}

		//it is a date?
		var ItIsADate = new Date(dataValue);
		if (eval(ItIsADate)) {
			if (dataValue[dataValue.length - 1] == "Z" && sentenceToEvalInSTAtable.includes("getHours")) { //Erase Z in date to obtain the correct hour
				dataValueWithoutZ = dataValue.slice(0, -1);
				sentenceToEvalInSTAtable = sentenceToEvalInSTAtable.replaceAll(dataValue, dataValueWithoutZ.toString());
			}
		}

		if (eval(sentenceToEvalInSTAtable)) {
			resultsFiltered.push(data[e]);
		}
		sentenceToEvalInSTAtable = sentence; //restart sentence to replace colums for values
	}

	//update STAdata
	node.STAdata = resultsFiltered;
}
async function askForConformanceInOGCAPIFeatures() {
	const filterInConformance = ["filter", "features-filter", "simple-cql", "cql-text", "cql-json"];//What I need for filter
	var node= getNodeDialog("DialogFilterRows");
	var url = node.STAURL;
	var index = url.indexOf("/collection");
	url = url.slice(0, index);
	url += "/conformance?f=json";
	var conformanceInformation = await loadAPIDataWithReturn(url, "OGCAPIConformance"); //ask for conformance (what can I do with this API)
	var conformanceArray = []
	for (var i = 0; i < conformanceInformation.length; i++) {
		for (var a = 0; a < filterInConformance.length; a++) {
			if (conformanceInformation[i].includes(filterInConformance[a])) {
				if (!conformanceArray.includes(filterInConformance[a])) {
					conformanceArray.push(filterInConformance[a])
				}

			}
		}

	}
	node.STAOGCAPIconformance = conformanceArray; //Only keeps what I need for filter
	networkNodes.update(node);
}

async function askForCollectionQueryables() {
	var node= getNodeDialog("DialogFilterRows");
	var url = node.STAURL;
	var index = url.indexOf("/items");
	url = url.slice(0, index);
	url += "/queryables?f=json";
	var queryablesInformation = await loadAPIDataWithReturn(url, "OGCAPIqueryables");
	if (Object.keys(queryablesInformation).length != 0) {
		node.STAOGCAPIqueryable = queryablesInformation;
	} else {
		node.STAOGCAPIqueryable = "no";
	}
}