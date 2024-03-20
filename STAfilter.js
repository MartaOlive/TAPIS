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

const selectConditionContent = [' = ', ' &ne; ', ' &ge; ', ' > ', ' &le; ', ' < ', ' [a,b] ', ' (a,b] ', ' [a,b) ', ' (a,b) ', 'contains', 'no contains', 'starts with', 'ends with', 'year', 'month', 'day', 'hour', 'minute', 'date'];
const selectConditionContentText = [' = ', ' &ne; ', 'contains', 'no contains', 'starts with', 'ends with'];


function addNecessaryVariablesToFilterRowsSTANode(actualNode) {

	//Create node propierties
	if (!actualNode.STAboxNames)
		actualNode.STAboxNames = ["0_0"];
	if (!actualNode.STAconditionsFilter)
		actualNode.STAconditionsFilter = [ //Table values
			{
				property: "<div id='optionsRow_0' style='display: inline-block;'></div>", //class='optionsRow'
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
	if (typeof actualNode.STAUrlAPICounter === "undefined")
		actualNode.STAUrlAPICounter = [];
	if (typeof actualNode.STAUrlAPI === "undefined")
		actualNode.STAUrlAPI = "";
	if (typeof actualNode.STACounter === "undefined")
		actualNode.STACounter = "";
	if (!actualNode.STAFilterRowEntities)
		actualNode.STAFilterRowEntities = {
			optionsRow0: [getSTAURLLastEntity(actualNode.STAURL)]
		};

	networkNodes.update(actualNode);
}


//Is an object?
function isAnObject(nodeId, number) {
	var select = document.getElementById("selectorValue_" + number);
	var selectOption = select.options[select.selectedIndex].value;
	if (selectOption === "[object Object]") {
		
	}

}

//General structure
function changeWriteToSelect(number, selector) {  //To take the text in input
	event.preventDefault();
	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var textInput = document.getElementById("textInput_" + number);
	var displaySelect = document.getElementById("displaySelect_" + number);
	var selectorValue = document.getElementById("selectorValue_" + number);

	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var textInputInterval1 = document.getElementById("textInputInterval1_" + number);
	var textInputInterval2 = document.getElementById("textInputInterval2_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
	var selectorValueInterval1 = document.getElementById("selectorValueInterval1_" + number);
	var selectorValueInterval2 = document.getElementById("selectorValueInterval2_" + number);


	//disconnect arrow buttons
	var buttonUp = document.getElementById("buttonUp_" + number);
	var buttonDown = document.getElementById("buttonDown_" + number);
	buttonDown.setAttribute("disabled", true);
	buttonUp.setAttribute("disabled", true);

	//Wich text is open?
	if (selector == "simple") {
		textInput.style.display = "none";
		displaySelect.style.display = "none";
		divFilterContainer.style.display = "inline-block";
		selectorValue.style.display = "inline-block";


	} else { //interval
		textInputInterval1.style.display = "none";
		textInputInterval2.style.display = "none";
		displaySelectInterval.style.display = "none";
		divFilterContainer2.style.display = "inline-block";
		selectorValueInterval1.style.display = "inline-block";
		selectorValueInterval2.style.display = "inline-block";

	}
}

function showIntervalSelector(number) {
	event.preventDefault();
	var selectorCondition = document.getElementById("selectorCondition_" + number);
	var selectedValue = selectorCondition.options[selectorCondition.selectedIndex].value;

	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var textInput = document.getElementById("textInput_" + number);
	var displaySelect = document.getElementById("displaySelect_" + number);


	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var textInputInterval1 = document.getElementById("textInputInterval1_" + number);
	var textInputInterval2 = document.getElementById("textInputInterval2_" + number);

	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
	var parentLabel = searchParentLabel();


	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + number);
	var inputForEntityFilterRowValue = inputForEntityFilterRow.value;
	var entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(inputForEntityFilterRowValue), true)


	if (selectedValue == " [a,b] " || selectedValue == " (a,b] " || selectedValue == " [a,b) " || selectedValue == " (a,b) ") {
		if (divFilterContainer2.style.display == "none") { //Not shown
			if (textInputInterval1.style.display == "none") { //Not shown (simple is shown)
				if (divFilterContainer.style.display == "none") { //Simple text and display are shown
					//hidden to texts and display
					textInput.style.display = "none"
					displaySelect.style.display = "none";

					//Show textinput and display
					textInputInterval1.style.display = "inline-block";
					textInputInterval2.style.display = "inline-block";
					displaySelect.style.display = "none";

					if (parentLabel == entity) {
						displaySelectInterval.style.display = "inline-block";
					}

				} else { // divContainer is shown
					//hidden to divFilterContainer
					divFilterContainer.style.display = "none";
					//show textInput and display from Interval
					textInputInterval1.style.display = "inline-block";
					textInputInterval2.style.display = "inline-block";
					if (parentLabel == entity)
						displaySelectInterval.style.display = "inline-block";
				}
			} //Simple text  is shown 
			//Nothing
		} //If FilterCOntains is shown, don't touch
	}
	else { //simple
		//comes from itself
		if (divFilterContainer.style.display == "none") { //It is not shown
			if (textInput.style.display == "none") { //It is not shown (interval is shown)
				if (divFilterContainer2.style.display == "none") { // texts and display from interval are shown
					//hidden to texts and diplay
					textInputInterval1.style.display = "none";
					textInputInterval2.style.display = "none";
					displaySelectInterval.style.display = "none";

					//show textInput and display
					textInput.style.display = "inline-block";
					//textInput.classList.add("inblock");
					if (parentLabel == entity) {
						displaySelect.style.display = "inline-block";
					}
				}
				else { //divContainer2 is shown
					//hidden to divFilterContainer2
					divFilterContainer2.style.display = "none";
					//show textInput and display
					textInput.style.display = "inline-block";
					displaySelect.style.display = "inline-block";;

				}
			} //Simple text  is shown 
			//Nothing
		} //If FilterCOntains is shown, don't touch

	}



}
//Build selectors
function createSelectorRowFilters(number) {
	//update STAdata from node
	var divFilterBox = document.getElementById("optionsRow_" + number);

	var selectorInfo = [];
	var infoFilter = currentNode.STAinfoFilter;
	if (infoFilter.length != 0) {

		for (var i = 0; i < infoFilter.length; i++) {
			if (infoFilter[i][0] == number) {
				selectorInfo.push(infoFilter[i]);
			}
		}
	}
	createSelect(1, selectorInfo, number);
	createSelect(2, selectorInfo, number);
	createSelect(3, selectorInfo, number);
	createSelect(4, selectorInfo, number);

	var divIsAnObject = document.createElement("div"); //It will be shown when property selected will be an object
	divIsAnObject.setAttribute("id", "divIsAnObject");
	divIsAnObject.setAttribute("style", "display: none;");
	divFilterBox.appendChild(divIsAnObject);

}

function sortValuesForSelect(arrayValues) {
	var arrayNumbers = [];
	var arrayText = [];

	for (var i = 0; i < arrayValues.length; i++) { //Separate numbers and text
		if (typeof arrayValues[i] !== "undefined") {
			var isNumber = true;
			for (var a = 0; a < arrayValues[i].length; a++) {
				if (isNumber == true) {
					if (isNaN(arrayValues[i][a])) {//is not a number 
						isNumber = false;
					}
				}
			}
			if (isNumber == true) {
				arrayNumbers.push(arrayValues[i]);
			} else {
				arrayText.push(arrayValues[i]);
			}
		}

		var arrayNumbersArranged = arrayNumbers.sort((a, b) => a - b);
		var arrayTextsArranged = arrayText.sort();

		var arrayValuesArranged = arrayNumbersArranged.concat(arrayTextsArranged); //join arrays
	}
	return arrayValuesArranged;
}

function changeSelectValueRowFilter(nodeId, number) {
	isAnObject(nodeId, number);
	//...for more functions

}
function openModalRowFilterEntities(number) { //To open Modat to see and select entities
	event.preventDefault();
	var dialogFilterRowEntities = document.getElementById("DialogFilterRowEntities");
	dialogFilterRowEntities.setAttribute("data-rowNumber", number);
	fillInDialogDialogFilterRowEntities(number, 0, "");
	document.getElementById("DialogFilterRowEntities").showModal();
}

function updateSTAFilterRowEntities(number, counter, entity) { //Modify or erase what is necessary
	var filterRowEntities = currentNode.STAFilterRowEntities;

	if (filterRowEntities["optionsRow" + number].length + 1 == counter) {
		filterRowEntities["optionsRow" + number].push(entity); //If there is no entity in this position, just add it
	} else {
		var elementsToSplice = filterRowEntities["optionsRow" + number].length - counter; //Elements to erase to final. If entity changes, the rest has no sense
		filterRowEntities["optionsRow" + number].splice(counter, elementsToSplice, entity);
	}

}


function fillInDialogDialogFilterRowEntities(number, row, selected) {
	var dialogFilterRowEntitiesCheckBoxes = document.getElementById("DialogFilterRowEntitiesCheckBoxes");
	dialogFilterRowEntitiesCheckBoxes.innerHTML = ""; //Empty DialogFilterRowEntitiesCheckBoxes
	
	if (selected != "") { //avoid first time
		updateSTAFilterRowEntities(number, row, selected);//Update currentNode.STAFilterRowEntities
	}
	AddEntitiesSelectedBelowInFilterRow(number);
}

function takeEntitiesAndFilterThemInFilterRow(filterRowEntities, i) { //avoid duplications
	var entities = STAEntities[getSTAEntityPlural(filterRowEntities[i], true)].entities;
	var entitiesFiltered = entities; //To use the filter (entities not filtered yet);
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
	var filterRowEntities = currentNode.STAFilterRowEntities[optionsRow];
	var nextEntity;
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
			placeToPutChilds = document.getElementById("DialogFilterRowEntitiesCheckBoxes");
		} else {
			placeToPutChilds = document.getElementById("Group" + (i - 1) + "_" + filterRowEntities[i]); //previous entity (previous group)
		}
		for (var e = 0; e < entitiesFiltered.length; e++) {	//Create radiobuttons
			var div = document.createElement("div");
			var input = document.createElement("input");
			var numi = i + 1
			var id = "Group" + i + "_" + entitiesFiltered[e];
			div.setAttribute("id", id);
			input.setAttribute("type", "radio");
			input.setAttribute("name", "entity_" + i);
			input.setAttribute("id", id + "input")
			input.setAttribute("value", entitiesFiltered[e]);
			input.setAttribute("onClick", `fillInDialogDialogFilterRowEntities("${number}","${numi}","${entitiesFiltered[e]}")`);
			if (entitiesFiltered[e] == nextEntity) {
				input.setAttribute("checked", true)
			}
			var label = document.createElement("label");
			label.setAttribute("for", id + "input");
			label.innerHTML = entitiesFiltered[e];
			div.appendChild(input);
			div.appendChild(label);

			if (i != 0) {//position children "visually inside" father. 
				div.style.marginLeft = 20 + "px";
			}
			placeToPutChilds.appendChild(div);
		}
	}
}

function OkButtonInRowFilterEntities(event) { //Ok in DialogFilterRowEntities
	event.preventDefault();
	var dialogFilterRowEntities = document.getElementById("DialogFilterRowEntities");
	var number = dialogFilterRowEntities.getAttribute("data-rowNumber");
	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + number);

	var inputValue;
	var lastEntity;
	for (var i = 0; i < currentNode.STAFilterRowEntities["optionsRow" + number].length; i++) {
		if (i == 0) {
			inputValue = currentNode.STAFilterRowEntities["optionsRow" + number][i];
			lastEntity = currentNode.STAFilterRowEntities["optionsRow" + number][i];
		} else {
			inputValue += "/" + currentNode.STAFilterRowEntities["optionsRow" + number][i];
			lastEntity = currentNode.STAFilterRowEntities["optionsRow" + number][i];
		}
	}
	inputForEntityFilterRow.value = inputValue;
	inputForEntityFilterRow.style.width = inputValue.length * 7 + "px";


	fillPropertySelector(number, lastEntity);//To change properties of select
	document.getElementById("DialogFilterRowEntities").close();
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

function createSelect(number, selectorInfo, count) {

	var placeId = document.getElementById("optionsRow_" + count);
	var select = document.createElement("select");
	var actualNode = networkNodes.get(currentNode.id);

	if (actualNode.image == "SelectRowsTable.png") { //CSV . Update current Node STAdata with info from previous Node !!!!!! (it works?)
		actualNode.STAdata = previousNode[0].STAdata;
		networkNodes.update(actualNode);

	} else { //CSV (It has to be revised)
		var parentNodeid = network.getConnectedNodes(currentNode.id, "from");
		var parentNode = networkNodes.get(parentNodeid);
		var data = parentNode[0].STAdata; //STAdata: All data comes from previous Node (Api or filtered previously)
	}
	var entity;
	var isEntity = false;
	var staEntitiesKeys = Object.keys(STAEntities);
	if (getSTAURLLastEntity(currentNode.STAURL)) {
		entity = getSTAURLLastEntity(currentNode.STAURL);
		for (var i = 0; i < staEntitiesKeys.length; i++) {
			if (staEntitiesKeys[i] == entity) {
				isEntity = true;
				break;
			}
		}

	}
	if (number == 1) {
		//Which Entity is: !!!!! Only works with STA (No csv)

		//INPUT
		var inputForEntityFilterRow = document.createElement("input");
		inputForEntityFilterRow.setAttribute("type", "text");
		inputForEntityFilterRow.setAttribute("READONLY", true);
		inputForEntityFilterRow.setAttribute("id", "inputForEntityFilterRow_" + count);
		inputForEntityFilterRow.style.backgroundColor = "#D8DFD6"; //grey
		inputForEntityFilterRow.style.marginRight="5px";
		var entityToInput;
		if (currentNode.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
			entityToInput = entity;
		} else {
			entityToInput = selectorInfo[0][1];
		}
		inputForEntityFilterRow.value = entityToInput;
		inputForEntityFilterRow.style.width = entityToInput.length * 7 + "px"; //Adjust width of the input to fit all content
		
		var inputForEntityFilterRowButton = document.createElement("button");
		inputForEntityFilterRowButton.innerHTML = "Search the Entity";
		inputForEntityFilterRowButton.setAttribute("onclick", "openModalRowFilterEntities('" + count + "')");
		
		placeId.appendChild(inputForEntityFilterRowButton);
		placeId.appendChild(inputForEntityFilterRow);

	}

	if (number == 2) {
		select.setAttribute("id", "selectorProperty_" + count);
		select.setAttribute("onChange", "fillValueSelector('" + count + "')");
		select.style.marginRight="5px";

		if (currentNode.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
			entity = getSTAEntityPlural(entity, true);
		} else {
			entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(selectorInfo[0][1]), true);
		}

		for (let i = 0; i < STAEntities[entity]["properties"].length; i++) {//To fill property
			var option = document.createElement("option");
			option.setAttribute("value", STAEntities[entity]["properties"][i]);
			option.innerHTML = STAEntities[entity]["properties"][i];
			if (selectorInfo.length != 0) {
				if (STAEntities[entity]["properties"][i] == selectorInfo[0][2]) {
					option.setAttribute("selected", true);
				}
			}
			select.appendChild(option);
		}
		placeId.appendChild(select);
	}


	else if (number == 3) {
		select.setAttribute("id", "selectorCondition_" + count);
		select.style.marginRight="5px";
		var selectConditionContent2;
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


		for (var i = 0; i < selectConditionContent2.length; i++) { //create options in condition Select
			var opcioCondicio = document.createElement("option");
			opcioCondicio.setAttribute("value", selectConditionContent2[i]);
			select.setAttribute("onChange", "showIntervalSelector('" + count + "')");
			opcioCondicio.innerHTML = selectConditionContent2[i];
			if (selectorInfo.length != 0) {
				if (selectConditionContent2[i] == selectorInfo[0][3]) {
					opcioCondicio.setAttribute("selected", true);
				}
			}
			select.appendChild(opcioCondicio);
		}
		placeId.appendChild(select);

	}
	else if (number == 4) { //Select box, ok and change button

		//Select simple
		var divFilterContainer = document.createElement("div");
		divFilterContainer.setAttribute("id", "divFilterContainer_" + count);
		divFilterContainer.setAttribute("style", "display: none;");
		placeId.appendChild(divFilterContainer);

		select.setAttribute("id", "selectorValue_" + count);
		select.setAttribute("onChange", "changeSelectValueRowFilter('" + currentNode.id + "','" + count + "')");

		var valor;
		var arrayValors = [];
		var select2 = document.getElementById("selectorProperty_" + count);
		var select2PropertyValue = select2.options[select2.selectedIndex].value;
		var valueUndefined = true;

		for (let index = 0; index < data.length; index++) {
			valor = data[index][select2PropertyValue];
			if (valueUndefined == true && typeof valor !== "undefined") { //All values are undefined? Don't show select
				valueUndefined = false;
			}
			if (!arrayValors.find(element => element == valor)) { //create array with not arranged values
				arrayValors.push(valor);
			}
		}

		var arrayValuesArranged = sortValuesForSelect(arrayValors); //arrange values 

		for (var i = 0; i < arrayValuesArranged.length; i++) { //create select options
			var option = document.createElement("option");
			option.setAttribute("value", arrayValuesArranged[i]);
			option.innerHTML = arrayValuesArranged[i];
			select.appendChild(option);
		}
		divFilterContainer.appendChild(select);

		var textInput = document.createElement("input");
		textInput.setAttribute("id", "textInput_" + count);
		textInput.setAttribute("type", "text");
		textInput.addEventListener("input", function () {
			changesInInputValueRowFilter("simple", count)
		});
		textInput.addEventListener("keypress", function (event) {
			// If the user presses the "Enter" key on the keyboard
			if (event.key === "Enter") {
				event.preventDefault();
			}
		});

		placeId.appendChild(textInput);

		var okButton = document.createElement("button");
		okButton.setAttribute("onclick", "closeModalSelect('" + count + "','ok')");
		okButton.setAttribute("id", "okButton_" + count);
		okButton.innerHTML = "Ok";

		divFilterContainer.appendChild(select);
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("onclick", "closeModalSelect('" + count + "','cancel')");
		cancelButton.setAttribute("id", "cancelButton_" + count);
		cancelButton.innerHTML = "Cancel";

		var displaySelect = document.createElement("button");
		displaySelect.setAttribute("id", "displaySelect_" + count);
		displaySelect.setAttribute("onclick", "changeWriteToSelect('" + count + "','simple')");
		placeId.appendChild(displaySelect);
		divFilterContainer.appendChild(okButton);
		divFilterContainer.appendChild(cancelButton);

		var buttonImage2 = document.createElement("img"); //Button image
		buttonImage2.setAttribute("src", "arrowSelectButton.png");
		displaySelect.appendChild(buttonImage2);

		//Interval select
		var divFilterContainer2 = document.createElement("div");
		divFilterContainer2.setAttribute("id", "divFilterContainer2_" + count);
		placeId.appendChild(divFilterContainer2);

		var selectorValueInterval1 = select.cloneNode(true); //filled like the other automatically
		selectorValueInterval1.setAttribute("id", "selectorValueInterval1_" + count);
		var selectorValueInterval2 = select.cloneNode(true);
		selectorValueInterval2.setAttribute("id", "selectorValueInterval2_" + count);
		divFilterContainer2.appendChild(selectorValueInterval1);
		divFilterContainer2.appendChild(selectorValueInterval2);

		var textInputInterval1 = textInput.cloneNode(true);
		textInputInterval1.setAttribute("id", "textInputInterval1_" + count);
		var textInputInterval2 = textInput.cloneNode(true);
		textInputInterval2.setAttribute("id", "textInputInterval2_" + count);

		textInputInterval1.addEventListener("input", function () {
			changesInInputValueRowFilter("interval", count)
		});
		textInputInterval2.addEventListener("input", function () {
			changesInInputValueRowFilter("interval", count)
		});
		textInputInterval1.addEventListener("keypress", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
			}
		});
		textInputInterval2.addEventListener("keypress", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
			}
		});

		placeId.appendChild(textInputInterval1);
		placeId.appendChild(textInputInterval2);


		var okButtonInterval = document.createElement("button");
		okButtonInterval.setAttribute("onclick", "closeModalSelect('" + count + "','ok')");
		okButtonInterval.setAttribute("id", "okButtonInterval_" + count);
		okButtonInterval.innerHTML = "Ok";

		var cancelButtonInterval = document.createElement("button");
		cancelButtonInterval.setAttribute("onclick", "closeModalSelect('" + count + "','cancel')");
		cancelButtonInterval.setAttribute("id", "cancelButtonInterval_" + count);
		cancelButtonInterval.innerHTML = "Cancel";

		var displaySelectInterval = document.createElement("button");
		displaySelectInterval.setAttribute("id", "displaySelectInterval_" + count);
		displaySelectInterval.setAttribute("onclick", "changeWriteToSelect('" + count + "','interval')");
		var buttonImage3 = document.createElement("img"); //button image
		buttonImage3.setAttribute("src", "arrowSelectButton.png");
		displaySelectInterval.appendChild(buttonImage3);

		placeId.appendChild(displaySelectInterval);
		divFilterContainer2.appendChild(okButtonInterval);
		divFilterContainer2.appendChild(cancelButtonInterval);

		var entityUrl;
		if (getSTAURLLastEntity(currentNode.STAURL)) {
			entityUrl = getSTAURLLastEntity(currentNode.STAURL);
		} else {
			entityUrl = "No entity";
		}

		var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + count);
		var inputForEntityFilterRowValue = inputForEntityFilterRow.value;
		var entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(inputForEntityFilterRowValue), true)

		var selectedEntityValue;
		if (currentNode.STAFilterRowEntities["optionsRow" + count].length == 1) {//only entity from parent Node
			selectedEntityValue = getSTAEntityPlural(entity, true);
		} else {
			selectedEntityValue = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(selectorInfo[0][1]), true);
		}

		if (selectedEntityValue != entityUrl) {
			displaySelect.style.display = "none";
		}


		if (selectorInfo.length != 0) {
			if (selectorInfo[0].length == 6) {//simple
				divFilterContainer2.style.display = "none";
				textInputInterval1.style.display = "none";
				textInputInterval2.style.display = "none";

				displaySelectInterval.style.display = "none";
				if (valueUndefined == true) { //if it's empty don't show it
					divFilterContainer.style.display = "none";
				}
				textInput.value = selectorInfo[0][4];

			} else if (selectorInfo[0].length == 7) { //interval
				textInput.style.display = "none";
				divFilterContainer.style.display = "none";
				divFilterContainer2.style.display = "none";
				displaySelect.style.display = "none";
				if (selectedEntityValue != entityUrl) {
					displaySelectInterval.style.display = "none";
				}
				textInputInterval1.value = selectorInfo[0][4];
				textInputInterval2.value = selectorInfo[0][5];
			}
		} else { //Last or first
			divFilterContainer2.style.display = "none";
			textInputInterval1.style.display = "none";
			textInputInterval2.style.display = "none";
			displaySelectInterval.style.display = "none";
			if (valueUndefined == true) { //if it's empty don't show it
				divFilterContainer.style.display = "none";
			}

		}
	}
}


var stopSearchparentLabel = false;
function searchParentLabel() {
	var entity = "0";
	var parentNodeId = network.getConnectedNodes(currentNode.id, "from");
	var parentNode = networkNodes.get(parentNodeId);

	for (var i = 0; i < STAEntitiesArray.length; i++) {
		if (parentNode[0].label == STAEntitiesArray[i]) {
			entity = STAEntitiesArray[i];
		}
	}

	return entity;
}

function fillPropertySelector(number, lastEntity) { //lastEntity: Entity obtained in input
	var selectProperty = document.getElementById("selectorProperty_" + number);
	var selectCondition = document.getElementById("selectorCondition_" + number);
	var selectedValueCondition = selectCondition.options[selectCondition.selectedIndex].value;
	selectProperty.innerHTML = "";

	var properties = STAEntities[getSTAEntityPlural(lastEntity, true)]["properties"];
	for (let i = 0; i < properties.length; i++) {// to fill property/property
		var option = document.createElement("option");
		option.setAttribute("value", properties[i]);
		option.innerHTML = properties[i];
		selectProperty.appendChild(option);
	}
	//look who is the father to hide the button show the select
	var displaySelect = document.getElementById("displaySelect_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);

	var parentLabel = searchParentLabel();

	if (parentLabel == getSTAEntityPlural(lastEntity, true)) { //show
		if (selectedValueCondition == " [a,b] " || selectedValueCondition == " (a,b] " || selectedValueCondition == " [a,b) " || selectedValueCondition == " (a,b) ") {
			displaySelectInterval.style.display = "inline-block";
		} else {
			displaySelect.style.display = "inline-block";
		}
	} else {
		if (selectedValueCondition == " [a,b] " || selectedValueCondition == " (a,b] " || selectedValueCondition == " [a,b) " || selectedValueCondition == " (a,b) ") {
			displaySelectInterval.style.display = "none";
		} else {
			displaySelect.style.display = "none";
		}
	}

	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);

	var textInput = document.getElementById("textInput_" + number);
	var textInputInterval1 = document.getElementById("textInputInterval1_" + number);
	var textInputInterval2 = document.getElementById("textInputInterval2_" + number);



	if (divFilterContainer.style.display == "inline-block" || divFilterContainer2.style.display == "inline-block") {
		if (divFilterContainer.style.display == "inline-block") { //simple
			divFilterContainer.style.display = "none";
			textInput.style.display = "inline-block";
			textInput.innerHTML = "";
		} else { //interval
			divFilterContainer2.style.display = "none";
			textInputInterval1.style.display = "inline-block";
			textInputInterval1.innerHTML = "";
			textInputInterval2.style.display = "inline-block";
			textInputInterval2.innerHTML = "";
		}
	}
}

function fillValueSelector(number) { //Onchange first selector, fill second selector
	var parentNodeid = network.getConnectedNodes(currentNode.id, "from");
	var parentNode = networkNodes.get(parentNodeid);
	var data = parentNode[0].STAdata;

	var select = document.getElementById("selectorProperty_" + number);
	var selectedProperty = select.options[select.selectedIndex].value;
	var selectorValue, selectorValueInterval, selectorValueInterval2;
	var displaySelect = document.getElementById("displaySelect_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);

	var inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + number);
	var inputForEntityFilterRowValue = inputForEntityFilterRow.value;
	var entity = getSTAEntityPlural(extractLastEntityFromTextFromInputInFilterRow(inputForEntityFilterRowValue), true)

	var selectCondition = document.getElementById("selectorCondition_" + number);
	var selectedValueCondition = selectCondition.options[selectCondition.selectedIndex].value;
	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var textInput = document.getElementById("textInput_" + number);
	var textInputInterval1 = document.getElementById("textInputInterval1_" + number);
	var textInputInterval2 = document.getElementById("textInputInterval2_" + number);

	var STALastEntity = getSTAURLLastEntity(currentNode.STAURL);


	selectorValue = document.getElementById("selectorValue_" + number);
	selectorValue.innerHTML = "";
	selectorValueInterval = document.getElementById("selectorValueInterval1_" + number);
	selectorValueInterval.innerHTML = "";
	selectorValueInterval2 = document.getElementById("selectorValueInterval2_" + number);
	selectorValueInterval2.innerHTML = "";

	var valor;
	var arrayValors = [];
	var isAnObject;

	//it must be filtered
	for (var index = 0; index < data.length; index++) { //built values array
		valor = data[index][selectedProperty];
		if (typeof valor === "object") isAnObject = "yes";
		if (!arrayValors.find(element => element == valor)) {
			arrayValors.push(valor);
		}
	}
	var arrayValuesArranged = sortValuesForSelect(arrayValors);

	var valueUndefined = true;

	for (var i = 0; i < arrayValuesArranged.length; i++) { //fill selector (there are 3: Simple + 2 Intervals)
		var opcio = document.createElement("option");
		var opcio2 = document.createElement("option");
		var opcio3 = document.createElement("option");
		valor = arrayValuesArranged[i];

		if (valueUndefined == true && typeof valor !== "undefined") { //All values are undefined? Don't show select
			valueUndefined = false;
		}
		opcio.setAttribute("value", valor);
		opcio2.setAttribute("value", valor);
		opcio3.setAttribute("value", valor);
		opcio.innerHTML = valor;
		opcio2.innerHTML = valor;
		opcio3.innerHTML = valor;
		selectorValue.appendChild(opcio);
		selectorValueInterval.appendChild(opcio2);
		selectorValueInterval2.appendChild(opcio3);
	}

	if (valueUndefined == true) { //hidde

		if ((selectedValueCondition == " [a,b] " || selectedValueCondition == " (a,b] " || selectedValueCondition == " [a,b) " || selectedValueCondition == " (a,b) ") && (entity == STALastEntity)) {
			divFilterContainer2.style.display = "none";
			displaySelectInterval.style.display = "none";
			textInputInterval1.style.display = "inline-block";
			textInputInterval2.style.display = "inline-block";
		}
		else {
			divFilterContainer.style.display = "none"; //hidde select if it's open
			displaySelect.style.display = "none"; //hidde button to display select
			textInput.style.display = "inline-block"; //Show text input
		}




	} else { //show
		if ((selectedValueCondition == " [a,b] " || selectedValueCondition == " (a,b] " || selectedValueCondition == " [a,b) " || selectedValueCondition == " (a,b) ") && (entity == STALastEntity)) {
			displaySelectInterval.style.display = "inline-block";
		} else if ((selectedValueCondition != " [a,b] " || selectedValueCondition != " (a,b] " || selectedValueCondition != " [a,b) " || selectedValueCondition != " (a,b) ") && (entity == STALastEntity)) { //simple
			displaySelect.style.display = "inline-block";
		}
	}

	var divIsAnObject = document.getElementById("divIsAnObject");
	if (isAnObject === "yes") { //n//It is not finished!!!!!
		selectorValue.setAttribute("class", "objectInSelect");
		divIsAnObject.style.display = "inline-block";
	} else {
		selectorValue.classList.remove("objectInSelect");
		divIsAnObject.style.display = "none";

	}
}

function closeModalSelect(number, button) { //Ok and Cancel Buttons
	event.preventDefault();
	var divFilterContainer = document.getElementById("divFilterContainer_" + number);
	var textInput = document.getElementById("textInput_" + number);
	var displaySelect = document.getElementById("displaySelect_" + number);

	var divFilterContainer2 = document.getElementById("divFilterContainer2_" + number);
	var textInputInterval1 = document.getElementById("textInputInterval1_" + number);
	var textInputInterval2 = document.getElementById("textInputInterval2_" + number);
	var displaySelectInterval = document.getElementById("displaySelectInterval_" + number);
	var interval;

	var buttonUp = document.getElementById("buttonUp_" + number);
	var buttonDown = document.getElementById("buttonDown_" + number);
	buttonDown.disabled = false;
	buttonUp.disabled = false;

	//If it comes from simple. Hidde container and show text and display
	if (divFilterContainer.style.display != "none") {
		divFilterContainer.style.display = "none";
		textInput.style.display = "inline-block";
		displaySelect.style.display = "inline-block";
		interval = false;
	} else {//if it comes from interval. Hidde container and show texts and display
		divFilterContainer2.style.display = "none";
		textInputInterval1.style.display = "inline-block";
		textInputInterval2.style.display = "inline-block";
		displaySelectInterval.style.display = "inline-block";
		interval = true;
	}

	if (button == "ok") {
		if (interval == false) {
			var selectorValue = document.getElementById("selectorValue_" + number);
			textInput.value = selectorValue.options[selectorValue.selectedIndex].value;
			changesInInputValueRowFilter("simple", number);
		} else {
			var selectorValueInterval1 = document.getElementById("selectorValueInterval1_" + number);
			var selectorValueInterval2 = document.getElementById("selectorValueInterval2_" + number);
			textInputInterval1.value = selectorValueInterval1.options[selectorValueInterval1.selectedIndex].value;
			textInputInterval2.value = selectorValueInterval2.options[selectorValueInterval2.selectedIndex].value;
			changesInInputValueRowFilter("interval", number);

		}
	}
}

function changeSelectConditionValues(number, wichTextInput, value1, valueInput1, valueInput2) {

	var selectCondition = document.getElementById("selectorCondition_" + number);

	if (wichTextInput == "simple") {
		var typeOfValues = typeOfValueFromInput(wichTextInput, value1);

	} else {
		var typeOfValues = typeOfValueFromInput(wichTextInput, valueInput1, valueInput2);
	}
	var actualConditionSelected = selectCondition.options[selectCondition.selectedIndex].value;

	var selectContent;
	selectCondition.innerHTML = ""; //Erase to not acumulate it
	if (wichTextInput == "simple") {
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
function changesInInputValueRowFilter(wichTextInput, number) { //and refill conditionSelect (interval if it is a number or a date)
	var textInput, textIputInterval1, textIputInterval2;
	if (wichTextInput == "simple") { textInput = document.getElementById("textInput_" + number); }
	else {
		textIputInterval1 = document.getElementById("textInputInterval1_" + number);
		textIputInterval2 = document.getElementById("textInputInterval2_" + number);
	}
	var value1, valueInput1, valueInput2;
	var valueLength, valueLengthInterval1, valueLengthInterval2;
	var width, withInterval1, withInterval2;


	if (wichTextInput == "interval") {
		valueInput1 = textIputInterval1.value;
		valueLengthInterval1 = valueInput1.length;
		valueInput2 = textIputInterval2.value;
		valueLengthInterval2 = valueInput2.length;
	} else {
		value1 = textInput.value;
		valueLength = value1.length;
	}

	//Adjusting input length
	if (valueLength > 15) {
		width = valueLength * 8; // 8px per character
		textInput.style.width = width + "px";
		if (wichTextInput == "interval") {
			withInterval1 = valueLengthInterval1 * 8; // 8px per character
			textIputInterval1.style.width = withInterval1 + "px";
			withInterval2 = valueLengthInterval2 * 8; // 8px per character
			textIputInterval2.style.width = withInterval2 + "px";
		}
	} else if (valueLength <= 15) {
		textInput.style.width = "100px";
		if (wichTextInput == "interval") {
			textInput1.style.width = "100px";
			textInput2.style.width = "100px";
		}
	}
	//Change options in selector depending of type of value selector
	changeSelectConditionValues(number, wichTextInput, value1, valueInput1, valueInput2);

}

function typeOfValueFromInput(wichTextInput, value1, value2) {
	var typeOfValues;
	if (wichTextInput == "simple") {
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


	if (wichTextInput == "simple") {

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
			if (value1.includes("/")) {
				if (value1Array.length == 5) {
					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" && value1.endsWith("Z")) {
						inputText1 = "date";

					}
				}
			} else {
				if (value1Array.length == 3) {
					if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2][2] == "T" && value1.endsWith("Z")) {
						inputText1 = "date";

					} else if (value1Array[0].length == 4 && value1Array[1].length == 2 && value1Array[2].length == 2 && !isNaN(parseInt(value1Array[0])) && !isNaN(parseInt(value1Array[1])) && !isNaN(parseInt(value1Array[2]))) { //only date without Time
						typeOfValues = "date";
					}
				}
			}

		}

		if (value2.includes("-") == true) {//inputText1
			var value2Array = value2.split("-");
			if (value2.includes("/")) {
				if (value2Array.length == 5) {
					if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2][2] == "T" && value2.endsWith("Z")) {
						inputText2 = "date";

					}
				}
			} else {
				if (value2Array.length == 3) {
					if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2][2] == "T" && value2.endsWith("Z")) {
						inputText2 = "date";

					} else if (value2Array[0].length == 4 && value2Array[1].length == 2 && value2Array[2].length == 2 && !isNaN(parseInt(value2Array[0])) && !isNaN(parseInt(value2Array[1])) && !isNaN(parseInt(value2Array[2]))) { //only date without Time
						typeOfValues = "date";
					}
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
		s += `<div class="topButtonsFilterRow"><button onclick="biggestLevelButton('${elem.boxName}','${nodeId}')">Add a higher group</button>`;
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
	currentNode.STACounter.push(elem);
	return currentNode.STAconditionsFilter[elem].property + '<div class="buttonsInFilterRow"><button id="buttonDown_' + elem + '" onClick="MoveDownFilterCondition(' + elem + ')"><img src="arrowDown.png" alt="Move down" title="Move down"></button> <button  id="buttonUp_' + elem + '"onClick="MoveUpFilterCondition(' + elem + ')"><img src="arrowUp.png" alt="Move up" title="Move up"></button><button onClick="DeleteElementButton(' + elem + ')"><img src="trash.png" alt="Remove" title="Remove"></button></div>';

}


function ShowFilterTable() //This is who iniciates the table
{
	currentNode.STACounter = []; //To not acumulate
	document.getElementById("divSelectorRowsFilter").innerHTML = GetFilterTable(currentNode.STAelementFilter, currentNode.id, true); //I need to pass currentNode.elemFilter because it is a recursive function an need to start in this point

	for (var i = 0; i < currentNode.STACounter.length; i++) {//Adding Selectors
		createSelectorRowFilters(currentNode.STACounter[i]);
	}
}


//Select Nexus (And, or, not)
function actualizeSelectChoice(boxName) { //When select nexus changes (put selected option in STAelementFilter)

	var select = document.getElementById("selectAndOrNot_" + boxName);
	var option = select.options[select.selectedIndex].value
	searchGrouptoChangeSelectChoice(boxName, currentNode.STAelementFilter, option);

}
function searchGrouptoChangeSelectChoice(boxName, elem, option) {

	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchGrouptoChangeSelectChoice(boxName, elem.elems[i], option);
		}
		if (elem.boxName == boxName) { //to add elems => elems[0,1...]
			elem.nexus = option;
		}
	}
}
function resizeBottomPartSelectAndOrNot() {
	var boxNames = currentNode.STAboxNames;

	for (var i = 0; i < boxNames.length; i++) {
		var tdSelectAndOrNot = document.getElementById("tdSelectAndOrNot_" + boxNames[i]);
		if (tdSelectAndOrNot != null) {
			var tdSelectAndOrNotHeight = tdSelectAndOrNot.clientHeight;
			var bottomPartSelectAndOrNot = document.getElementById("bottomPartSelectAndOrNot_" + boxNames[i]);
			bottomPartSelectAndOrNot.style.height = (tdSelectAndOrNotHeight - 30) + "px";
		}


	}
}

//Down button
var stopMoveDownFilterCondition;
function MoveDownFilterCondition(currentNumber) {
	event.preventDefault();
	var nextElement = GiveNextConditionNextBoxFilterTable(currentNode.STAelementFilter, currentNumber);

	if (nextElement != -1) {
		searchBoxName(currentNode.STAelementFilter, currentNumber, "no", nextElement);
		stopMoveDownFilterCondition = false;
	}
}

function searchBoxName(elem, iCon, fatherElement, nextElement) {
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			searchBoxName(elem.elems[i], iCon, elem, nextElement);
		}
	}
	else {
		if (elem == iCon && stopMoveDownFilterCondition == false) {
			changeElements(fatherElement, nextElement, iCon);
			takeSelectInformation();
			drawTableAgain();
			resizeBottomPartSelectAndOrNot();
			stopMoveDownFilterCondition = true;

		}
	}

}
function changeElements(currentElement, nextElement, iCon) {
	var arrayElements = []
	for (var i = 0; i < currentElement.elems.length; i++) {
		if (currentElement.elems[i] != iCon) {
			arrayElements.push(currentElement.elems[i]);
		}
	}
	var nodeId = currentNode.id;
	currentElement.elems = arrayElements;
	nextElement.elems.push(iCon);
	if (currentElement.elems.length == 0) {
		searchGroupToDelete(currentElement.boxName, currentNode.STAelementFilter, nodeId, "no");
	}
}
function GiveNextConditionNextBoxFilterTable(elem, iCon) {
	LookForNextConditionNextBoxFilterTableFound = 0;
	return LookForNextConditionNextBoxFilterTable(elem, iCon);
}


var LookForNextConditionNextBoxFilterTableFound;
function LookForNextConditionNextBoxFilterTable(elem, iCon) {
	var next;
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			next = LookForNextConditionNextBoxFilterTable(elem.elems[i], iCon);
			if (-1 != next)
				return elem.elems[i];
			if (LookForNextConditionNextBoxFilterTableFound == 1) {
				LookForNextConditionNextBoxFilterTableFound = 2;
				break;
			}
		}
	}
	else {
		if (elem == iCon)
			LookForNextConditionNextBoxFilterTableFound = 1;
		else if (LookForNextConditionNextBoxFilterTableFound != 0)
			return elem; //I need boxName
	}
	return -1;
}

function GiveNextConditionFilterTable(elem, iCon) {
	LookForNextConditionFilterTableFound = false;
	return LookForNextConditionFilterTable(elem, iCon);
}


var LookForNextConditionFilterTableFound;
function LookForNextConditionFilterTable(elem, iCon) {
	var next;
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			next = LookForNextConditionFilterTable(elem.elems[i], iCon);
			if (-1 != next)
				return next;
		}
	}
	else {
		if (elem == iCon)
			LookForNextConditionFilterTableFound = true;
		else if (LookForNextConditionFilterTableFound)
			return elem;
	}
	return -1;
}


//Up button
function MoveUpFilterCondition(iCon) {
	event.preventDefault();
	var previousElement = GivePreviousConditionFilterTable(currentNode.STAelementFilter, iCon);
	if (previousElement != -1) {
		searchBoxName(currentNode.STAelementFilter, iCon, "no", previousElement);
		stopMoveDownFilterCondition = false;
	}
}

function GivePreviousConditionFilterTable(elem, iCon) {
	LookForPreviousConditionFilterTableFound = 0;
	return LookForPreviousConditionFilterTable(elem, iCon);
}

var LookForPreviousConditionFilterTableFound;
function LookForPreviousConditionFilterTable(elem, iCon, parent) {
	var prev;
	if (typeof elem === "object") {
		for (var i = elem.elems.length - 1; i >= 0; i--) {
			prev = LookForPreviousConditionFilterTable(elem.elems[i], iCon, elem);
			if (-1 != prev)
				return prev;
			if (LookForPreviousConditionFilterTableFound == 1) {
				LookForPreviousConditionFilterTableFound = 2;
				break;
			}
		}
	}
	else {
		if (elem == iCon)
			LookForPreviousConditionFilterTableFound = true;
		else if (LookForPreviousConditionFilterTableFound)
			return parent; //I need boxName
	}
	return -1;
}

//Add conditions

function addNewCondition(boxName, fromBiggest) {
	event.preventDefault();
	if (typeof fromBiggest === "undefined") {
		fromBiggest = false;
	}
	searchFilterBoxName(boxName, currentNode.STAelementFilter, currentNode.Id, fromBiggest);

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
	var conditionsFilter = currentNode.STAconditionsFilter;
	var lastNumber = conditionsFilter[conditionsFilter.length - 1].number;
	var nextNumber = parseInt(lastNumber) + 1; //for those who are within the 0_...
	if (elem.boxName.charAt(0) != 0) {//groups other than 0 and must create a group and not an element
		var newBoxName = elem.boxName;
		var firstNumberBoxNameInside = parseInt(elem.boxName.charAt(0)) - 1; //First number: inside group
		//search, split , arrange iand the lastone, plus one i add boxNames
		var boxNames = currentNode.STAboxNames;
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
		currentNode.STAboxNames.push(newBoxName);

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
			addNewCondition(boxNameToPass, currentNode.id);
			boxNameToPass = boxNames[boxNames.length - 1]; //must be the last to be created (the one that was just created)

		}
	}
	//update currentNode.STAFilterRowEntities
	var entity = getSTAURLLastEntity(currentNode.STAURL);
	currentNode.STAFilterRowEntities["optionsRow" + nextNumber] = [entity];

	if (fromBiggest == false) {

		takeSelectInformation();//take selector values and update an external variable
		drawTableAgain();//repaint selects
		resizeBottomPartSelectAndOrNot();//correct size to select(AndOrNot) div
	}
}

function takeSelectInformation() {
	var optionsRow;
	var inputForEntityFilterRow, selectorProperty, selectorCondition, textInput, textInputInterval1, textInputInterval2, selectorValue, selectorValueInterval1, selectorValueInterval2, divFilterContainer, divFilterContainer2;
	var inputForEntityFilterRowValue, selectorPropertyValue, selectorConditionValue, textInputValue, textInputInterval1Value, textInputInterval2Value;
	var arrayInfo;
	var infoFilter = [];
	var counter = currentNode.STACounter;
	for (var i = 0; i < counter.length; i++) {
		optionsRow = document.getElementById("optionsRow_" + counter[i]);
		arrayInfo = [];
		if (optionsRow != null) {
			inputForEntityFilterRow = document.getElementById("inputForEntityFilterRow_" + counter[i]);
			inputForEntityFilterRowValue = inputForEntityFilterRow.value;
			selectorProperty = document.getElementById("selectorProperty_" + counter[i]);
			selectorPropertyValue = selectorProperty.options[selectorProperty.selectedIndex].value;
			selectorCondition = document.getElementById("selectorCondition_" + counter[i]);
			selectorConditionValue = selectorCondition.options[selectorCondition.selectedIndex].value;
			arrayInfo.push(counter[i]); //they are out of order, it is necessary to put each info in its place when painting the select
			arrayInfo.push(inputForEntityFilterRowValue, selectorPropertyValue, selectorConditionValue);

			if (selectorConditionValue == ' [a,b] ' || selectorConditionValue == ' (a,b] ' || selectorConditionValue == ' [a,b) ' || selectorConditionValue == ' (a,b) ') {
				textInputInterval1 = document.getElementById("textInputInterval1_" + counter[i]);
				textInputInterval2 = document.getElementById("textInputInterval2_" + counter[i]);
				selectorValueInterval1 = document.getElementById("selectorValueInterval1_" + counter[i]);
				selectorValueInterval2 = document.getElementById("selectorValueInterval2_" + counter[i]);
				divFilterContainer2 = document.getElementById("divFilterContainer2_" + counter[i]);

				if (divFilterContainer2.style.display == "inline-block") { //Select open
					textInputInterval1Value = selectorValueInterval1.options[selectorValueInterval1.selectedIndex].value;
					textInputInterval2Value = selectorValueInterval2.options[selectorValueInterval2.selectedIndex].value;
				} else {
					textInputInterval1Value = textInputInterval1.value;
					textInputInterval2Value = textInputInterval2.value;
				}

				arrayInfo.push(textInputInterval1Value);
				arrayInfo.push(textInputInterval2Value);
				var typeOfValue = typeOfValueFromInput("interval", textInputInterval1Value, textInputInterval2Value)

			} else {
				textInput = document.getElementById("textInput_" + counter[i]);
				divFilterContainer = document.getElementById("divFilterContainer_" + counter[i]);
				selectorValue = document.getElementById("selectorValue_" + counter[i]);
				if (divFilterContainer.style.display == "inline-block") { //Select open
					textInputValue = selectorValue.options[selectorValue.selectedIndex].value;
				} else {
					textInputValue = textInput.value;
				}

				arrayInfo.push(textInputValue);
				var typeOfValue = typeOfValueFromInput("simple", textInputValue)

			}
		}
		arrayInfo.push(typeOfValue)
		infoFilter.push(arrayInfo);

	}

	currentNode.STAinfoFilter = infoFilter;
}

//Delete element
function DeleteElementButton(numberOfElement) {
	event.preventDefault();
	//Delete elemen from currentNode.STAFilterRowEntities 
	delete currentNode.STAFilterRowEntities["optionsRow" + numberOfElement];
	searchElementToDelete(numberOfElement, currentNode.STAelementFilter, currentNode.id);
}

function searchElementToDelete(numberOfElement, elem, paramsNodeId) { //elem has boxname...
	var element;
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			element = searchElementToDelete(numberOfElement, elem.elems[i], paramsNodeId);
		}
		if (elem.elems.includes(numberOfElement)) { //add a elems => elems[0,1...]
			DeleteElementInElemFilter(elem, paramsNodeId, numberOfElement);
		}
	}
	else {

	}
}
function DeleteElementInElemFilter(elem, nodeId, numberOfElement) {
	//do not delete the conditions filter because it is the position

	var index = elem.elems.indexOf(parseInt(numberOfElement));
	elem.elems.splice(index, 1); //delete from elemFilter	
	if (elem.elems.length == 1) { //if only  remains one, remove nexus
		elem.nexus = null;
	}

	if (elem.elems.length == 0) {
		deleteGroup(elem.boxName, currentNode.id)
	}
	takeSelectInformation();//get selector values and update an external variable 
	drawTableAgain();//repaint selects
	resizeBottomPartSelectAndOrNot();

}
//Delete group (necesary when it is the last condition in the group)
function deleteGroup(numberOfElement, nodeId) {
	event.preventDefault();
	searchGroupToDelete(numberOfElement, currentNode.STAelementFilter, nodeId, "no");
	takeSelectInformation();//get selector values and update an external variable 
	drawTableAgain();//repaint the selects

}

function searchGroupToDelete(numberOfElement, elem, nodeId, fatherElem) { //elem has boxes ...
	var element;
	if (typeof elem === "object") {
		for (var i = 0; i < elem.elems.length; i++) {
			element = searchGroupToDelete(numberOfElement, elem.elems[i], nodeId, elem);
		}
		if (elem.boxName == numberOfElement) { //add to elems => elems[0,1...]
			var parent = DeleteGroupInElemFilter(elem, fatherElem);

		}
	}
}

function DeleteGroupInElemFilter(elem, fatherElem) {
	var newArray = [];
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
			currentNode.STAelementFilter = copyFather[0];
		}
		var boxNames = currentNode.STAboxNames;
		boxNames = actualizeBoxNames(currentNode.STAelementFilter, arrayBoxNumbers);

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

//Add bigger Level
function biggestLevelButton(boxName, nodeId) {
	event.preventDefault();
	var newBoxName = (parseInt(boxName.charAt(0)) + 1) + "_0";
	var newInsert = {
		elems: [],
		nexus: null,
		boxName: newBoxName
	};
	var copy = Object.assign(currentNode.STAelementFilter);
	newInsert.elems.push(copy);
	currentNode.STAboxNames.push(newBoxName);
	currentNode.STAelementFilter = newInsert;

	var boxNameToPass = newBoxName;

	addNewCondition(boxNameToPass, currentNode.id, true); //fromBiggest=true -> To avoid TakeSelect ...etc in addNewElement function
	takeSelectInformation();//take the values ​​of the selectors and update an external variable
	drawTableAgain();
	resizeBottomPartSelectAndOrNot();//correct size to select(AndOrNot) div

}

function addTitleInRowFilterDialog(divName) {
	var divTitleSelectRows = document.getElementById(divName);
	var staEntitiesKeys = Object.keys(STAEntities);
	var entity;
	var isEntity = false;
	divTitleSelectRows.innerHTML = ""; //Erase old title saved
	if (getSTAURLLastEntity(currentNode.STAURL)) {
		entity = getSTAURLLastEntity(currentNode.STAURL);
		for (var i = 0; i < staEntitiesKeys.length; i++) {
			if (staEntitiesKeys[i] == entity) {
				isEntity = true;
				break;
			}
		}

	} else {
		entity = "No entity";
	}

	if (isEntity == false) {
		divTitleSelectRows.innerHTML += `<img src='ogc.png' style='height:30px'> </img> "STAPlus"` + entity;
	} else {
		divTitleSelectRows.innerHTML += `<img src='${entity}.png' style='height:30px'> </img>` + entity;
	}
}


//Applying the filter
var stopReadInformationRowFilter = false;

function readInformationRowFilter(elem, entity, nexus, parent) {
	var infoFilter = currentNode.STAinfoFilter;
	if (stopReadInformationRowFilter == false) {
		if (typeof elem === "object") {
			for (var i = 0; i < elem.elems.length; i++) {
				readInformationRowFilter(elem.elems[i], entity, elem.nexus, elem);
			}
			if (currentNode.STAUrlAPICounter.length != infoFilter.length && currentNode.STAUrlAPICounter.length != 0 && nexus != "no" && parent != "no") {

				currentNode.STAUrlAPI += " " + nexus + " ";
			}
		}
		else { //Build url
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
					if (infoFilter[i][1].includes("/")) {//Erase entity name from current Node. 
						var parentLabel = searchParentLabel();
						var parentLabelLength=parentLabel.length;
						valueOfEntity=valueOfEntity.slice(parentLabelLength+1); //Erase entity and "/"
					} 


					///Apply filter depending on Select Condition
					if (infoFilter[i][3] == ' = ' || infoFilter[i][3] == ' &ne; ' || infoFilter[i][3] == ' &ge; ' || infoFilter[i][3] == ' > ' || infoFilter[i][3] == ' &le; ' || infoFilter[i][3] == ' < ') { //passarho a com STA+
						data += "(";

						if (entity != valueOfEntity) { //If it's not the entity of the node and it is a connected box need "node entity name "
							data += valueOfEntity + "/";
						}
						data += infoFilter[i][2];

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
					currentNode.STAUrlAPI += data
					currentNode.STAUrlAPICounter.push(infoFilter[i][0]);

				}
			}

		}
		if (currentNode.STAUrlAPICounter.length == infoFilter.length) {
			currentNode.STAUrlAPI.slice(0, "(");
			currentNode.STAUrlAPI.slice(currentNode.STAUrlAPI.length + 1, ")");
			stopReadInformationRowFilter = true;
		}
	}
}