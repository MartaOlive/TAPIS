/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able 
	to work with STA data as tables.
  
	The TAPIS client is free software under the terms of the MIT License

	Copyright (c) 2023-2026 Joan Masó

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

	Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at uab cat) 
	dins del grup del MiraMon. MiraMon és un projecte del 
	CREAF que elabora programari de Sistema d'Informació Geogràfica 
	i de Teledetecció per a la visualització, consulta, edició i anàlisi 
	de mapes ràsters i vectorials. Aquest progamari programari inclou
	aplicacions d'escriptori i també servidors i clients per Internet.
	No tots aquests productes són gratuïts o de codi obert. 
    
	En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
	El TAPIS es pot actualitzar des de https://github.com/grumets/tapis.
*/

"use strict"
var ScatterPlotChart = null;
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

	
	var noData = true, attributesArray = [], allAttributes, allAttributesKeys, objectWithParentNodesInfo = {};

	for (var i = 0; i < parentNodes.length; i++) {
		attributesArray = [];
		if (parentNodes[i].STAdata) {
			noData = false;
			allAttributes = parentNodes[i].STAdataAttributes ? parentNodes[i].STAdataAttributes : getDataAttributes(parentNodes[i].STAdata);
			allAttributesKeys = Object.keys(allAttributes);
			for (var c = 0; c < allAttributesKeys.length; c++) {
				if (allAttributes[allAttributesKeys[c]].type == "number" || allAttributes[allAttributesKeys[c]].type == "isodatetime" || allAttributes[allAttributesKeys[c]].type == "integer") {
					attributesArray.push(allAttributesKeys[c])
				}

			}
			objectWithParentNodesInfo[parentNodes[i].id] = { attr: attributesArray, nodeLabel: parentNodes[i].label }

		}
	}
	if (!node.STAattributesToSelect){
		node.STAattributesToSelect = {};
		node.STAattributesToSelect.parentNodesInformation = objectWithParentNodesInfo;
		node.STAattributesToSelect.dataGroupsSelectedToScatterPlot =
		[{ "nodeSelected": parentNodes[0].id, "X": objectWithParentNodesInfo[parentNodes[0].id].attr[0], "Y": objectWithParentNodesInfo[parentNodes[0].id].attr[0], selectedYaxis: "left", color: "#f79646", legendText: "",graphicType: "line"}]
		node.STAattributesToSelect.sorted= true;
		networkNodes.update(node);
	}
	var options = [["second","Seconds"],["minute","Minutes"],["hour","Hours"],["day","Days"],["week","Weeks"],["month","Month"],["year","Years"]];
	if (node.STAattributesToSelect.config){
		if (node.STAattributesToSelect.config.options.scales.x.time){
			var unitValue = node.STAattributesToSelect.config.options.scales.x.time.unit;
		} else{
			var unitValue="minute";
		}		
	}else{
		var unitValue="minute";
	}	
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

	if (node.STAattributesToSelect.config){
	
		(Object.keys(node.STAattributesToSelect.config.options.plugins).length!=0)?document.getElementById("DialogScatterPlotAxisTitle").value=node.STAattributesToSelect.config.options.plugins.title.text: document.getElementById("DialogScatterPlotAxisTitle").value="" ;
		if (node.STAattributesToSelect.config.options.scales.x.title.text)document.getElementById("DialogScatterPlotAxisXLabel").value=node.STAattributesToSelect.config.options.scales.x.title.text;
		(node.STAattributesToSelect.config.options.scales.yAxisleft)?document.getElementById("DialogScatterPlotAxisYLabelLeft").value=node.STAattributesToSelect.config.options.scales.yAxisleft.title.text:document.getElementById("DialogScatterPlotAxisYLabelLeft").value="";
		(node.STAattributesToSelect.config.options.scales.yAxisright)?document.getElementById("DialogScatterPlotAxisYLabelRight").value=node.STAattributesToSelect.config.options.scales.yAxisright.title.text:document.getElementById("DialogScatterPlotAxisYLabelRight").value="";
	}else{
		document.getElementById("DialogScatterPlotAxisTitle").value="";
		document.getElementById("DialogScatterPlotAxisXLabel").value="";
		document.getElementById("DialogScatterPlotAxisYLabelLeft").value="";
		document.getElementById("DialogScatterPlotAxisYLabelRight").value="";
	
	}
		
	if (noData) {
		document.getElementById("DialogScatterPlotTitle").innerHTML = DonaCadena({cat: "No hi ha dades per mostrar.", spa: "No hay datos que mostrar.", eng: "No data to show."});
		return;
	}

	document.getElementById("DialogScatterPlotTitle").innerHTML = DonaCadena({cat: "Gràfic de dispersió", spa: "Gráfico de dispersión", eng: "Scatter Plot"});
	createDialogWithSelectWithGroupsScatterPlot(node);
	drawScatterPlot(node);
}

function createDialogWithSelectWithGroupsScatterPlot(node) {
	var scatterPlotDiv = document.getElementById("DialogScatterPlotDiv");
	scatterPlotDiv.innerHTML = "";
	var dialogGroups = node.STAattributesToSelect.dataGroupsSelectedToScatterPlot; //Array
	var parentNodesInformation = node.STAattributesToSelect.parentNodesInformation;
	var parentNodesInformationKeys = Object.keys(parentNodesInformation);

	var cdns = `<button onclick="addNewSelectGroupInScatterPlot('${node.id}')">` + DonaCadena({cat: "Afegeix una sèrie nova", spa: "Añadir una serie nueva", eng: "Add new series"}) + `</button>`

	for (var i = 0; i < dialogGroups.length; i++) { //dialog groups of data
		cdns += `<fieldset><legend>` + DonaCadenaFmt({cat: "Sèrie {0}", spa: "Serie {0}", eng: "Series {0}"}, (i + 1)) + `</legend><label  style="margin-right: 10px;margin-bottom:20px">` + DonaCadena({cat: "Dades de:", spa: "Datos de:", eng: "Data from:"}) + ` <select style="margin-bottom:10px" id="DialogScatterPlotAxisNodesSelect_${i}" onchange="updateSelectInformationScatterPlot('${i}','nodeSelected','select','DialogScatterPlotAxisNodesSelect_${i}','${node.id}')"></label>`

		for (var u = 0; u < parentNodesInformationKeys.length; u++) {
			cdns += `<option value="${parentNodesInformationKeys[u]}" ${(dialogGroups[i].nodeSelected == parentNodesInformationKeys[u]) ? "selected=true" : ""} onchange="updateSelectInformationScatterPlot('${i}','nodeSelected','select','DialogScatterPlotAxisNodesSelect_${i}','${node.id}')">${parentNodesInformation[parentNodesInformationKeys[u]].nodeLabel}</option>`
		}
		cdns += `</select><br>
				<label style="margin-right: 10px;margin-bottom:20px">` + DonaCadena({cat: "Eix X:", spa: "Eje X:", eng: "Axis X:"}) + ` <select style="margin-bottom:10px" name="DialogScatterPlotAxisXSelect_${i}" id="DialogScatterPlotAxisXSelect_${i}" style="" onchange="updateSelectInformationScatterPlot('${i}','X','select','DialogScatterPlotAxisXSelect_${i}','${node.id}')">`

		for (var e = 0; e < parentNodesInformation[dialogGroups[i].nodeSelected].attr.length; e++) { //Select X
			cdns += `<option value="${parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]}"`;
			if (node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].X == parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]) cdns += " selected=true "; //checked option
			cdns += `>${parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]}</option>`
		}

		cdns += `</select></label><br>
				<label style="margin-right: 10px;margin-bottom:20px">` + DonaCadena({cat: "Eix Y:", spa: "Eje Y:", eng: "Axis Y:"}) + ` <select style="margin-bottom:10px" name="DialogScatterPlotAxisYSelect_${i}" id="DialogScatterPlotAxisYSelect_${i}" style="" onchange="updateSelectInformationScatterPlot('${i}','Y','select','DialogScatterPlotAxisYSelect_${i}','${node.id}')">`
		for (var e = 0; e < parentNodesInformation[dialogGroups[i].nodeSelected].attr.length; e++) { //Select Y
			cdns += `<option value="${parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]}"`;
			if (node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].Y == parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]) cdns += " selected=true "; //checked option
			cdns += `>${parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]}</option>`
		}

		cdns += `</label></select><br>
					<table style="width: 100%;margin-bottom: 10px">
						<tr>
							<td>
								<fieldset><legend>Assign to Y axis</legend>
								<label><input type='radio' id="DialogScatterPlotAxisYRadioButton_Left_${i}" name="DialogScatterPlotAxisYRadioButton_${i}" ${(node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].selectedYaxis == "left") ? "checked" : ""} onclick="updateSelectInformationScatterPlot('${i}','selectedYaxis','radio','DialogScatterPlotAxisYRadioButton_Left_${i}','${node.id}')" value="left">
								Left</label><br>
								<label><input type='radio' id="DialogScatterPlotAxisYRadioButton_Right_${i}" name="DialogScatterPlotAxisYRadioButton_${i}" ${(node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].selectedYaxis == "right") ? "checked" : ""} onclick="updateSelectInformationScatterPlot('${i}','selectedYaxis','radio','DialogScatterPlotAxisYRadioButton_Right_${i}','${node.id}')" value="right">
								Right</label>
								</fieldset>	
							</td>							
							<td> 
								<fieldset><legend>Style</legend>
								<label><input type="radio" name="DialogCharType_${i}" id="DialogCharTypeLine_${i}"  ${(node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].graphicType == "line") ? "checked" : ""} onclick="updateSelectInformationScatterPlot('${i}','graphicType','radio','DialogCharTypeLine_${i}','${node.id}')" value="line">Line</label><br>
								<label><input type="radio" name="DialogCharType_${i}" id="DialogCharTypeScatter_${i}" ${(node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].graphicType == "scatter") ? "checked" : ""} onclick="updateSelectInformationScatterPlot('${i}','graphicType','radio','DialogCharTypeScatter_${i}','${node.id}')" value="scatter">Dots</label>
								</fieldset>	
							</td>
						</tr>
					</table>
					<label>Color: <input type="color" id="selectColorScatterPlot_${i}" value="${node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].color}" style="width:20px; height:22px" onchange="updateSelectInformationScatterPlot('${i}','color','radio','selectColorScatterPlot_${i}','${node.id}')"></label><br>
					<label>Legend title: <input type="text" id="legendTextScatterPlot_${i}" value="${node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].legendText} " onchange="updateSelectInformationScatterPlot('${i}','legendText','radio','legendTextScatterPlot_${i}','${node.id}')"></label><br>
					<label><input type="checkbox" id="regressionLineScatterPlot_${i}" value="regressionLine" ${(node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].regressionLine) ? "checked" : ""} onchange="updateSelectInformationScatterPlot('${i}','regressionLine','checkbox','regressionLineScatterPlot_${i}','${node.id}')"/> Show regression line</label><br>
					<button onclick="deleteSelectGroupInScatterPlot('${node.id}', '${i}')"style="background-color:white; border-color:white"><img src="trash.png" alt="Remove" title="Remove"></button>
					</fieldset>`
	}
	scatterPlotDiv.innerHTML = cdns;

	if (!node.STAattributesToSelect.config){
		var config = {
			type: 'line', // 'bar', 'pie', etc.
			data: {
				labels: [], 
				datasets: [{
					label: '',
					data: [], 
					borderWidth: 2,
					fill: false
				}]
			},
			options: {
				responsive: true,
				scales: {
					x: {
						beginAtZero: true
					},
					y: {
						beginAtZero: true
					}
				}
			}
		}
		node.STAattributesToSelect.config=config;
		networkNodes.update(node);

	}
	
}

function addNewSelectGroupInScatterPlot(nodeId) { //Add button
	event.preventDefault();
	var node = networkNodes.get(nodeId);
	var dataGroupsSelected = node.STAattributesToSelect;
	node.STAattributesToSelect.dataGroupsSelectedToScatterPlot.push({ "nodeSelected": Object.keys(dataGroupsSelected.parentNodesInformation)[0], "X": dataGroupsSelected.parentNodesInformation[dataGroupsSelected.dataGroupsSelectedToScatterPlot[0].nodeSelected].attr[0], "Y": dataGroupsSelected.parentNodesInformation[dataGroupsSelected.dataGroupsSelectedToScatterPlot[0].nodeSelected].attr[0], selectedYaxis: "left", color: "#f79646", legendText: "", graphicType:"line" });
	networkNodes.update(node);
	createDialogWithSelectWithGroupsScatterPlot(node);
}
function deleteSelectGroupInScatterPlot(nodeId, groupToDelete) {
	event.preventDefault();
	var node = networkNodes.get(nodeId);
	node.STAattributesToSelect.dataGroupsSelectedToScatterPlot.splice(parseInt(groupToDelete), 1);
	networkNodes.update(node);
	createDialogWithSelectWithGroupsScatterPlot(node);
}

function updateSelectInformationScatterPlot(numberDialog, keyToChange, typeOfSelector, elementName, nodeId) {
	var node = networkNodes.get(nodeId), value;
	var element = document.getElementById(elementName)
	if (typeOfSelector == "select")
		value = element.options[element.selectedIndex].value;
	else if (typeOfSelector == "checkbox")
		value = element.checked;
	else
		value = element.value;

	node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[numberDialog][keyToChange] = value;
	networkNodes.update(node);
	createDialogWithSelectWithGroupsScatterPlot(node);
}

function drawScatterPlot(node){
	var chart= Chart.getChart(document.getElementById('DialogScatterPlotVisualization'))
	if (chart)
		ScatterPlotChart.destroy();
	ScatterPlotChart = new Chart(document.getElementById('DialogScatterPlotVisualization'), node.STAattributesToSelect.config);
}

function ShowBarPlotDialog(parentNodes, node) {
	saveNodeDialog("DialogBarPlot", node);
	var data = parentNodes[0].STAdata;
	if (!data || !data.length) {
		document.getElementById("DialogBarPlotTitle").innerHTML = DonaCadena({cat: "No hi ha dades per mostrar.", spa: "No hay datos que mostrar.", eng: "No data to show."});
		return;
	}
	document.getElementById("DialogBarPlotTitle").innerHTML = DonaCadena({cat: "Gràfic de barres i sectors", spa: "Gráfico de barras y sectores", eng: "Bar and pie plot"});

	var dataAttributes = parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(data);
	PopulateSelectSaveLayerDialog("DialogBarPlotAxisX", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.axisX ? node.barPlotOptions.axisX : "phenomenonTime");
	PopulateSelectSaveLayerDialog("DialogBarPlotSeries", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.series ? node.barPlotOptions.series : "");
	PopulateSelectSaveLayerDialog("DialogBarPlotAxisY", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.axisY ? node.barPlotOptions.axisY : "result");

	if (parentNodes.length < 2)
		document.getElementById("DialogBarPlotVariable").innerHTML = '<input id="DialogBarPlotVariableInput" value="' + (node && node.barPlotOptions && node.barPlotOptions.labelY ? node.barPlotOptions.labelY : '') + '">';
	else {
		data = parentNodes[1].STAdata;
		if (!data || data.length != 1) {
			document.getElementById("DialogBarPlotTitle").innerHTML = DonaCadena({cat: "La segona connexió només hauria de tenir un element. Es continua sense títol.", spa: "La segunda conexión solo debería tener un elemento. Se continúa sin título.", eng: "Second connection should only have one item. Continuing without title."});
			return;
		}

		var dataAttributes = parentNodes[1].STAdataAttributes ? parentNodes[1].STAdataAttributes : getDataAttributes(data);
		PopulateSelectSaveLayerDialog("DialogBarPlotVariable", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.labelY ? node.barPlotOptions.labelY : "name");
	}
	if (node.barPlotOptions && node.barPlotOptions.plotType == "pie") {
		document.getElementById("DialogBarPlotTypePie").checked = true;
		document.getElementById("DialogBarPlotTypeBar").checked = false;
	} else {
		document.getElementById("DialogBarPlotTypePie").checked = false;
		document.getElementById("DialogBarPlotTypeBar").checked = true;
	}

	if (document.getElementById("DialogBarPlotAxisXSelect").value &&
		document.getElementById("DialogBarPlotAxisYSelect").value)
		DrawBarPlot();
}

function ShowImageViewerDialog(node, parentNodes) {
	var data = parentNodes[0].STAdata;
	if (!data || !data.length) {
		document.getElementById("DialogImageViewerTitle").innerHTML = DonaCadena({cat: "No hi ha dades per mostrar.", spa: "No hay datos que mostrar.", eng: "No data to show."});
		return;
	}
	saveNodeDialog("DialogImageViewer", node);

	document.getElementById("DialogImageViewerTitle").innerHTML = DonaCadena({cat: "Visor d'imatges", spa: "Visor de imágenes", eng: "Image viewer"});

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
	var dataGroups = node.STAattributesToSelect.dataGroupsSelectedToScatterPlot; //Options selected
	var nodeId, node, nodeData, selectedOptions = {}, record, items, minx, maxx, minyRight, maxyRight, minyLeft, maxyLeft, leftOrRight, dataRecord;
	var yAxisTodisplay={left:false, right:false}, axisXType="", currentAttributeType, label, type, pointRadius;
	var data = {datasets:[]};

	//x axis in sorted?
	var sortXaxis=(document.getElementById("DialogScatterPlotAxisXSort").checked)?true:false;
	if (sortXaxis){
		node.STAattributesToSelect.sorted= true;
		document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display = "none";
	}else{
		node.STAattributesToSelect.sorted= false;
		document.getElementById("DialogScatterPlotVisualizationTextNotSorted").style.display = "inline-block";
	}
	
	for (var e = 0; e < dataGroups.length; e++) {
		nodeId = dataGroups[e].nodeSelected;
		selectedOptions.AxisX = dataGroups[e].X;
		currentAttributeType=networkNodes.get(nodeId).STAdataAttributes[dataGroups[e].X].type;
		if (currentAttributeType=="integer")
			currentAttributeType="number"; //coded as sameAxis

		if (e==0)
			axisXType=currentAttributeType;
		else{
			if (axisXType!=currentAttributeType){ //avoid different types of X axis
				alert(DonaCadena({cat: "Totes les sèries de l'eix X han de contenir el mateix tipus de dades", spa: "Todas las series del eje X deben contener el mismo tipo de datos", eng: "All series in X axis has to have same type of data"}));
				return;
			}
		}
		selectedOptions.AxisY = dataGroups[e].Y;
		nodeData = (sortXaxis) ? SortTableByColumns (deapCopy(networkNodes.get(nodeId).STAdata),[dataGroups[e].X], "asc"): networkNodes.get(nodeId).STAdata;
		leftOrRight = dataGroups[e].selectedYaxis;
		items = [];
		for (var i = 0; i < nodeData.length; i++) {
			record = nodeData[i];

			dataRecord= (axisXType=="isodatetime") ? moment( new Date(record[selectedOptions.AxisX])).format() : dataRecord=record[selectedOptions.AxisX];

			if (i == 0 && e == 0) {
				minx = maxx = dataRecord;
				if (leftOrRight == "left") 
					minyLeft = maxyLeft = record[selectedOptions.AxisY];
				else 
					minyRight = maxyRight = record[selectedOptions.AxisY];
			} else {
				if (leftOrRight == "left" && minyLeft == undefined) {
					minyLeft = maxyLeft = record[selectedOptions.AxisY];
				} else if (leftOrRight == "right" && minyRight == undefined) {
					minyRight = maxyRight = record[selectedOptions.AxisY];
				}
				if (minx > dataRecord)
					minx = dataRecord;
				if (maxx < dataRecord)
					maxx = dataRecord;
				if (leftOrRight == "left") {
					if (minyLeft > record[selectedOptions.AxisY])
						minyLeft = record[selectedOptions.AxisY];
					if (maxyLeft < record[selectedOptions.AxisY])
						maxyLeft = record[selectedOptions.AxisY];
				} else {
					if (minyRight > record[selectedOptions.AxisY])
						minyRight = record[selectedOptions.AxisY];
					if (maxyRight < record[selectedOptions.AxisY])
						maxyRight = record[selectedOptions.AxisY];
				}

			}
			
			items.push({ x: dataRecord, y:record[selectedOptions.AxisY], group: e });
		}
		type=dataGroups[e].graphicType;
		pointRadius=(type=="line") ? 0 : 2;
		label=(dataGroups[e].legendText=="") ? node.STAattributesToSelect.parentNodesInformation[nodeId].nodeLabel+"_"+dataGroups[e].Y : dataGroups[e].legendText;
			
		data.datasets.push(
			{
				label: label,
				backgroundColor: dataGroups[e].color,
				borderColor: dataGroups[e].color,
				fill: false,
				data: items,
				yAxisID: "yAxis" + dataGroups[e].selectedYaxis,
				pointRadius: pointRadius,
				type: type
			}
		);
		yAxisTodisplay[dataGroups[e].selectedYaxis]=true;

		if (dataGroups[e].regressionLine && nodeData.length>1)
		{
			var itemsReg=[];
			var linReg=linearRegressionFunc(items);
			itemsReg.push({ x: items[0].x, y: linReg.a*items[0].x+linReg.b, group: e });
			itemsReg.push({ x: items[nodeData.length-1].x, y: linReg.a*items[nodeData.length-1].x+linReg.b, group: e });
			data.datasets.push(
				{
					label: label+" r="+linReg.r.toFixed(5),
					backgroundColor: dataGroups[e].color,
					borderColor: dataGroups[e].color,
					fill: false,
					data: itemsReg,
					yAxisID: "yAxis" + dataGroups[e].selectedYaxis,
					pointRadius: 0,
					type: "line"
				}
			);
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
		var unit=selectAxisX.options[selectAxisX.selectedIndex].value ; //minute, hour, day ...
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
		alert(DonaCadena({cat: "L'interval de les dades seleccionades és massa llarg per aplicar-lo al gràfic. Filtreu l'interval per fer-lo més curt o trieu un interval més gran per a l'eix X", spa: "El intervalo de los datos seleccionados es demasiado largo para aplicarlo al gráfico. Filtre el intervalo para acortarlo o elija un intervalo mayor para el eje X", eng: "The interval of the data selected is too long to apply to the graphic. Filter interval to make it shorter or choose a bigger interval to X axis"}));
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
				display: (document.getElementById("DialogScatterPlotAxisXLabel").value != "") ? true : false				
			},
			min: minx,
			max:maxx
		}
	}
	else{
		axisX={type: "linear",
				title: {
				text: document.getElementById("DialogScatterPlotAxisXLabel").value,
				display: (document.getElementById("DialogScatterPlotAxisXLabel").value != "") ? true : false				
			},
			min: minx,
			max:maxx
		}
	}
		
		
	var config = {
		//type: type, //general diagram. If it have different types it is specified in the datasets
		data: data,
		options: {
			plugins: {
				title: {
					text: document.getElementById("DialogScatterPlotAxisTitle").value,
					display: (document.getElementById("DialogScatterPlotAxisTitle").value != "") ? true : false
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
				text: axisYLabelRight
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
				text: axisYLabelLeft
			},
			max:finalMaxYLeft,
			min:finalMinYLeft,
			// ticks: {
			// 	maxTicksLimit: 30 // 
			//   }
		}
	}
	node.STAattributesToSelect.config=config;
	networkNodes.update(node);
	drawScatterPlot(node);
}
	
function CloseDialogScatterPlot(event) {
	hideNodeDialog("DialogScatterPlot", event);
}

const ColorsForBarPlot = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];

var BarPlotGraph2d = null;
function DrawBarPlot(event) {
	if (event)
		event.preventDefault(); // We don't want to submit this form
	var node = getNodeDialog("DialogBarPlot");
	if (!node)
		return;
	node.barPlotOptions = {};
	node.barPlotOptions.axisX = document.getElementById("DialogBarPlotAxisXSelect").value;
	node.barPlotOptions.series = document.getElementById("DialogBarPlotSeriesSelect").value;
	node.barPlotOptions.axisY = document.getElementById("DialogBarPlotAxisYSelect").value;
	var nodes = GetParentNodes(node);
	if (!nodes || !nodes.length)
		return;
	var parentNode = nodes[0];
	var data, dataAttributes, record;
	if (parentNode.STAdata) {
		var labels = [], dataY = [], backgroundColor = [], labelY = "Magnitude", scales, legend, plugins, data;
		data = parentNode.STAdata;
		dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);

		if (node.barPlotOptions.series) {
			var series = [], seriesFull = [], labelsFull = [];
			for (var i = 0; i < data.length; i++) {
				record = data[i];
				if (-1 == labelsFull.indexOf(record[node.barPlotOptions.axisX])) {
					labelsFull.push(record[node.barPlotOptions.axisX]);
					labels.push(record[node.barPlotOptions.axisX].length > 35 ? record[node.barPlotOptions.axisX].substring(0, 32) + "..." : record[node.barPlotOptions.axisX]);
				}
			}
			for (var i = 0; i < data.length; i++) {
				record = data[i];
				var c = series.indexOf(record[node.barPlotOptions.series]);
				if (c == -1) {
					seriesFull.push(record[node.barPlotOptions.series]);
					c = seriesFull.length - 1;
					series.push(seriesFull[c].length > 35 ? seriesFull[c].substring(0, 32) + "..." : seriesFull[c]);
					dataY.push(new Array(labelsFull.length).fill(0));
				}
				dataY[c][labelsFull.indexOf(record[node.barPlotOptions.axisX])] += record[node.barPlotOptions.axisY];
			}
		} else {
			for (var i = 0; i < data.length; i++) {
				record = data[i];
				labels.push(record[node.barPlotOptions.axisX].length > 35 ? record[node.barPlotOptions.axisX].substring(0, 32) + "..." : record[node.barPlotOptions.axisX]);
				dataY.push(record[node.barPlotOptions.axisY]);
				backgroundColor.push(ColorsForBarPlot[i % ColorsForBarPlot.length]);
			}
		}
		if (document.getElementById("DialogBarPlotVariableSelect"))
			labelY = node.barPlotOptions.labelY = document.getElementById("DialogBarPlotVariableSelect").value;
		else if (document.getElementById("DialogBarPlotVariableInput") && document.getElementById("DialogBarPlotVariableInput").value)
			labelY = node.barPlotOptions.labelY = document.getElementById("DialogBarPlotVariableInput").value;
		else if (dataAttributes[node.barPlotOptions.axisY].description) {
			labelY = dataAttributes[node.barPlotOptions.axisY].description;
			if (dataAttributes[node.barPlotOptions.axisY].UoMSymbol)
				labelY += " (" + dataAttributes[node.barPlotOptions.axisY].UoMSymbol + ")";
			else if (dataAttributes[node.barPlotOptions.axisY].UoM)
				labelY += " (" + dataAttributes[node.barPlotOptions.axisY].UoM + ")";
		}
		if (document.getElementById("DialogBarPlotTypePie").checked) {
			node.barPlotOptions.plotType = "pie";
			scales = null;
			legend = {
				position: "right",
				labels: {
					fontSize: 10,
					padding: 3
				}
			};
			plugins = {
				legend: legend,
				labels: {
					render: 'value',
					precision: 0,
					showZero: true,
					fontSize: 12,
					fontColor: '#fff',
					fontStyle: 'normal',
					fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
					textShadow: true,
					shadowOffsetX: -5,
					shadowOffsetY: 5,
					shadowColor: 'rgba(255,0,0,0.75)',
					arc: true,
					position: 'default',
					overlap: true,
					showActualPercentages: true,
					images: [{
						src: 'image.png',
						width: 16,
						height: 16
					}],
					outsidePadding: 4,
					textMargin: 4
				}
			};
		} else {
			node.barPlotOptions.plotType = "bar";
			scales = {
				x: {
					title: {
						display: true,
						text: dataAttributes[node.barPlotOptions.axisX].description ? dataAttributes[node.barPlotOptions.axisX].description : node.barPlotOptions.axisX
					},
					grid: { display: false },
					ticks: { autoSkip: false /*, maxRotation: 0 */ }
				},
				y: {
					//type: "logarithmic",
					title: {
						display: true,
						text: labelY
					},
					beginAtZero: true
				}
			};
			legend = {
				display: node.barPlotOptions.series ? true : false
			};
			plugins = {
				legend: legend,
				labels: {
					render: 'value',
					precision: 0,
					showZero: true,
					fontSize: 12,
					fontStyle: 'normal',
					fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
					position: 'default',
					overlap: true,
					showActualPercentages: false,
					outsidePadding: 4,
					textMargin: 4
				}
			};
		}
		data = {
			labels: labels
		}

		if (node.barPlotOptions.series) {
			data.datasets = [];
			for (var c = 0; c < seriesFull.length; c++) {
				data.datasets.push({
					label: series[c],
					data: dataY[c],
					backgroundColor: ColorsForBarPlot[c % ColorsForBarPlot.length],
					borderWidth: 0
				});
				if (node.barPlotOptions.plotType == "bar") {
					data.datasets[c].categoryPercentage = 0.9;
					data.datasets[c].barPercentage = 0.9;
				}
			}
			if (node.barPlotOptions.plotType == "bar") {
				scales.x.stacked = true;
				scales.y.stacked = true;
				plugins.labels.outsidePadding = -14;
				plugins.labels.textMargin = -14;
			}
		} else {
			data.datasets = [{
				data: dataY,
				backgroundColor: backgroundColor,
				borderWidth: 0
			}];
			if (node.barPlotOptions.plotType == "bar") {
				data.datasets[0].categoryPercentage = 1;
				data.datasets[0].barPercentage = 1;
			}
		};

		if (BarPlotGraph2d)
			BarPlotGraph2d.destroy();
		BarPlotGraph2d = new Chart(document.getElementById('DialogBarPlotVisualizationCanvas'), {
			type: node.barPlotOptions.plotType,
			data: data,
			options: {
				scales: scales,
				plugins: plugins,
				maintainAspectRatio: false,
				resizeDelay: 100
			}
		});
		networkNodes.update(node);
	}
}

function CloseDialogBarPlot(event) {
	hideNodeDialog("DialogBarPlot", event);
}

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
		document.getElementById("DialogRadarPlotAxesList").innerHTML = "<em>" + DonaCadena({cat: "No s'han trobat columnes numèriques.", spa: "No se han encontrado columnas numéricas.", eng: "No numeric columns found."}) + "</em>";
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

function meanOrZero(sum, count) {
	if (!count)
		return 0;
	return sum / count;
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
		valueColumn: valueColumn,
		color: ColorsForBarPlot[seriesGroups.length % ColorsForBarPlot.length],
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
	var seriesLabelSelect, axisXSelect, groups, i, parentNode, data, items;
	if (!node)
		return;
	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	axisXSelect = document.getElementById("DialogRadarPlotAxisXSelect");
	if (seriesLabelSelect)
		node.radarPlotOptions.seriesLabel = seriesLabelSelect.value;
	if (axisXSelect)
		node.radarPlotOptions.axisX = axisXSelect.value;
	groups = node.radarPlotOptions.seriesGroups || [];
	for (i = 0; i < groups.length; i++) {
		parentNode = networkNodes.get(groups[i].nodeSelected);
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		items = getRadarUniqueValues(data, node.radarPlotOptions.seriesLabel);
		if (items.indexOf(groups[i].item) == -1)
			groups[i].item = items.length ? items[0] : "";
	}
	networkNodes.update(node);
	createDialogWithSelectWithGroupsRadarPlot(node);
}

function createDialogWithSelectWithGroupsRadarPlot(node) {
	var container = document.getElementById("DialogRadarPlotSeriesDiv");
	var toolbar = document.getElementById("DialogRadarPlotSeriesToolbar");
	var groups, parentInfo, parentIds, layout, seriesLabelSelect, seriesLabel;
	var cdns, i, p, parentId, parentNode, data, items, numericNames;
	if (!container)
		return;
	groups = node.radarPlotOptions && node.radarPlotOptions.seriesGroups ? node.radarPlotOptions.seriesGroups : [];
	parentInfo = node.radarPlotParentNodes || {};
	parentIds = Object.keys(parentInfo);
	layout = document.getElementById("DialogRadarPlotLayoutWide") && document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
	seriesLabel = seriesLabelSelect ? seriesLabelSelect.value : (node.radarPlotOptions ? node.radarPlotOptions.seriesLabel : "");
	if (toolbar)
		toolbar.innerHTML = '<button type="button" onclick="addNewSelectGroupInRadarPlot(\'' + node.id + '\')">' + DonaCadena({cat: "Afegeix una sèrie nova", spa: "Añadir una serie nueva", eng: "Add new series"}) + '</button>';
	cdns = "";

	for (i = 0; i < groups.length; i++) {
		parentId = getRadarSeriesParentId(groups[i], parentInfo);
		if (parentId && groups[i].nodeSelected != parentId)
			groups[i].nodeSelected = parentId;
		parentNode = parentId ? networkNodes.get(parentId) : null;
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		numericNames = parentInfo[parentId] ? parentInfo[parentId].numericNames : [];
		items = getRadarUniqueValues(data, seriesLabel);

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

		cdns += '<div class="DialogRadarPlotSeriesRow"><label>Color: <input type="color" id="DialogRadarPlotColor_' + i + '" value="' + (groups[i].color || ColorsForBarPlot[i % ColorsForBarPlot.length]) + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'color\',\'radio\',\'DialogRadarPlotColor_' + i + '\',\'' + node.id + '\')"></label></div>';
		cdns += '<div class="DialogRadarPlotSeriesRow"><label>Legend title: <input type="text" id="DialogRadarPlotLegend_' + i + '" value="' + ("" + (groups[i].legendText || "")).replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'legendText\',\'radio\',\'DialogRadarPlotLegend_' + i + '\',\'' + node.id + '\')"></label></div>';
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
		alert(DonaCadena({cat: "Massa sèries (20). Suprimiu-ne una abans d'afegir-ne una altra.", spa: "Demasiadas series (20). Elimine una antes de añadir otra.", eng: "Too many series (20). Remove one before adding another."}));
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

	if (keyToChange == "nodeSelected") {
		parentNode = networkNodes.get(value);
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		attrs = parentNode ? (parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data)) : null;
		seriesLabel = document.getElementById("DialogRadarPlotSeriesLabelSelect") ? document.getElementById("DialogRadarPlotSeriesLabelSelect").value : node.radarPlotOptions.seriesLabel;
		items = getRadarUniqueValues(data, seriesLabel);
		numericNames = attrs ? getNumericAttributeNames(attrs) : [];
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

function scaleRadarValue(value, minVal, range) {
	if (isMissingRadarValue(value))
		return 0;
	return ((value - minVal) / range) * 100;
}

function normalizeRadarSeries(datasets) {
	var nAxes, a, s, extent, range, column;
	if (!datasets.length)
		return;
	nAxes = datasets[0].data.length;

	// One series: scale across all axes of that series so each vertex keeps its magnitude.
	if (datasets.length == 1) {
		extent = radarExtent(datasets[0].data);
		if (extent.min === null)
			return;
		range = extent.max - extent.min;
		if (range == 0)
			return;
		for (a = 0; a < nAxes; a++)
			datasets[0].data[a] = scaleRadarValue(datasets[0].data[a], extent.min, range);
		return;
	}

	// Several series: scale each axis from the min/max of that axis across series.
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
			datasets[s].data[a] = scaleRadarValue(datasets[s].data[a], extent.min, range);
	}
}

function buildRadarRadialScale(normalize, beginAtZero, seriesData) {
	var scale = { beginAtZero: beginAtZero }, s, a, extent, values = [];
	if (normalize) {
		scale.min = 0;
		scale.max = 100;
		return scale;
	}
	for (s = 0; s < seriesData.length; s++) {
		for (a = 0; a < seriesData[s].length; a++)
			values.push(seriesData[s][a]);
	}
	extent = radarExtent(values);
	if (extent.max !== null)
		scale.suggestedMax = extent.max;
	if (!beginAtZero && extent.min !== null)
		scale.suggestedMin = extent.min;
	return scale;
}

function buildRadarDatasets(labels, seriesNames, seriesData, fill, seriesColors) {
	var datasets = [], label, color;
	for (var c = 0; c < seriesNames.length; c++) {
		label = ("" + seriesNames[c]);
		if (label.length > 35)
			label = label.substring(0, 32) + "...";
		color = (seriesColors && seriesColors[c]) ? seriesColors[c] : ColorsForBarPlot[c % ColorsForBarPlot.length];
		datasets.push({
			label: label,
			data: seriesData[c],
			backgroundColor: hexColorWithAlpha(color, fill ? 0.2 : 0),
			borderColor: color,
			pointBackgroundColor: color,
			borderWidth: 2,
			fill: fill
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

function buildRadarWideSeriesRow(parentNodes, seriesLabel, item, axes) {
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
	return sums.map(function (sum, a) { return meanOrZero(sum, counts[a]); });
}

function buildRadarLongSeriesRow(parentNodes, axisX, valueColumn, labelsFull) {
	var row = new Array(labelsFull.length).fill(0);
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
			if (!isNaN(value))
				row[c] += value;
		}
	}
	return row;
}

function limitRadarSeriesList(items, maxSeries, event) {
	if (items.length > maxSeries) {
		if (event)
			alert(DonaCadenaFmt({cat: "Massa sèries ({0}). Es mostren les primeres {1} sèries.", spa: "Demasiadas series ({0}). Se muestran las primeras {1} series.", eng: "Too many series ({0}). Showing the first {1} series."}, items.length, maxSeries));
		return items.slice(0, maxSeries);
	}
	return items;
}

var RadarPlotChart = null;
function clearRadarPlotChart() {
	var canvas, existing;
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

	var layout = document.getElementById("DialogRadarPlotLayoutWide").checked ? "wide" : "long";
	var normalize = document.getElementById("DialogRadarPlotNormalize").checked;
	var fill = document.getElementById("DialogRadarPlotFill").checked;
	var beginAtZero = document.getElementById("DialogRadarPlotBeginZero").checked;
	var title = document.getElementById("DialogRadarPlotTitleInput").value;
	var seriesAll = isRadarPlotSeriesModeAll();
	var labels = [], seriesNames = [], seriesData = [], seriesColors = [];
	var record, value, i, c, g, parentNode, data, sums, counts, itemKey, row, labelsFull, items, valueColumns;
	var maxSeries = 20;

	if (!node.radarPlotOptions)
		node.radarPlotOptions = {};
	var seriesGroups = node.radarPlotOptions.seriesGroups || [];
	node.radarPlotOptions.layout = layout;
	node.radarPlotOptions.normalize = normalize;
	node.radarPlotOptions.fill = fill;
	node.radarPlotOptions.beginAtZero = beginAtZero;
	node.radarPlotOptions.title = title;
	node.radarPlotOptions.seriesMode = seriesAll ? "all" : "series";
	node.radarPlotOptions.seriesAll = seriesAll;
	node.radarPlotOptions.seriesGroups = seriesGroups;

	if (!seriesAll) {
		if (!seriesGroups.length) {
			if (event)
				alert(DonaCadena({cat: "Afegiu almenys una sèrie.", spa: "Añada al menos una serie.", eng: "Add at least one series."}));
			return;
		}
		if (seriesGroups.length > maxSeries) {
			if (event)
				alert(DonaCadenaFmt({cat: "Massa sèries ({0}). Es mostren les primeres {1} sèries.", spa: "Demasiadas series ({0}). Se muestran las primeras {1} series.", eng: "Too many series ({0}). Showing the first {1} series."}, seriesGroups.length, maxSeries));
			seriesGroups = seriesGroups.slice(0, maxSeries);
		}
	}

	if (layout == "wide") {
		var axes = getSelectedRadarPlotAxes();
		var seriesLabel = document.getElementById("DialogRadarPlotSeriesLabelSelect").value;
		if (!seriesLabel) {
			parentNode = parentNodes[0];
			seriesLabel = guessRadarSeriesLabel(parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata));
			if (seriesLabel) {
				var seriesLabelSelect = document.getElementById("DialogRadarPlotSeriesLabelSelect");
				if (seriesLabelSelect)
					seriesLabelSelect.value = seriesLabel;
			}
		}
		node.radarPlotOptions.axes = axes;
		node.radarPlotOptions.seriesLabel = seriesLabel;
		if (axes.length < 3) {
			if (event)
				alert(DonaCadena({cat: "Seleccioneu almenys tres columnes numèriques per utilitzar-les com a eixos del radar.", spa: "Seleccione al menos tres columnas numéricas para utilizarlas como ejes del radar.", eng: "Select at least three numeric columns to use as radar axes."}));
			return;
		}
		labels = axes;
		if (seriesAll) {
			if (!seriesLabel) {
				if (event)
					alert(DonaCadena({cat: "Seleccioneu una columna d'elements.", spa: "Seleccione una columna de elementos.", eng: "Select an item column."}));
				return;
			}
			items = limitRadarSeriesList(getRadarUniqueValuesFromParents(parentNodes, seriesLabel), maxSeries, event);
			for (g = 0; g < items.length; g++) {
				seriesNames.push(items[g]);
				seriesData.push(buildRadarWideSeriesRow(parentNodes, seriesLabel, items[g], axes));
				seriesColors.push(ColorsForBarPlot[g % ColorsForBarPlot.length]);
			}
		} else {
			for (g = 0; g < seriesGroups.length; g++) {
				parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
				if (!parentNode || !parentNode.STAdata)
					continue;
				data = parentNode.STAdata;
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
				seriesNames.push(seriesGroups[g].legendText || seriesGroups[g].item || ("Series " + (g + 1)));
				seriesData.push(sums.map(function (sum, a) { return meanOrZero(sum, counts[a]); }));
				seriesColors.push(seriesGroups[g].color || ColorsForBarPlot[g % ColorsForBarPlot.length]);
			}
		}
	} else {
		var axisX = document.getElementById("DialogRadarPlotAxisXSelect").value;
		node.radarPlotOptions.axisX = axisX;
		if (!axisX) {
			if (event)
				alert(DonaCadena({cat: "Seleccioneu una columna de categories.", spa: "Seleccione una columna de categorías.", eng: "Select a categories column."}));
			return;
		}
		if (seriesAll) {
			labelsFull = getRadarCategoryKeysFromParents(parentNodes, axisX);
			for (i = 0; i < labelsFull.length; i++)
				labels.push(("" + labelsFull[i]).length > 35 ? ("" + labelsFull[i]).substring(0, 32) + "..." : labelsFull[i]);
			if (labels.length < 3) {
				if (event)
					alert(DonaCadenaFmt({cat: "Un gràfic de radar necessita almenys tres categories. La columna seleccionada té {0} valors únics.", spa: "Un gráfico de radar necesita al menos tres categorías. La columna seleccionada tiene {0} valores únicos.", eng: "A radar chart needs at least three categories. The selected column has {0} unique values."}, labels.length));
				return;
			}
			valueColumns = limitRadarSeriesList(getRadarAutomaticValueColumns(parentNodes, axisX), maxSeries, event);
			for (g = 0; g < valueColumns.length; g++) {
				seriesNames.push(valueColumns[g]);
				seriesData.push(buildRadarLongSeriesRow(parentNodes, axisX, valueColumns[g], labelsFull));
				seriesColors.push(ColorsForBarPlot[g % ColorsForBarPlot.length]);
			}
		} else {
			labelsFull = [];
			for (g = 0; g < seriesGroups.length; g++) {
				parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
				if (!parentNode || !parentNode.STAdata)
					continue;
				data = parentNode.STAdata;
				for (i = 0; i < data.length; i++) {
					record = data[i];
					itemKey = record[axisX];
					if (labelsFull.indexOf(itemKey) == -1) {
						labelsFull.push(itemKey);
						labels.push(("" + itemKey).length > 35 ? ("" + itemKey).substring(0, 32) + "..." : itemKey);
					}
				}
			}
			if (labels.length < 3) {
				if (event)
					alert(DonaCadenaFmt({cat: "Un gràfic de radar necessita almenys tres categories. La columna seleccionada té {0} valors únics.", spa: "Un gráfico de radar necesita al menos tres categorías. La columna seleccionada tiene {0} valores únicos.", eng: "A radar chart needs at least three categories. The selected column has {0} unique values."}, labels.length));
				return;
			}
			for (g = 0; g < seriesGroups.length; g++) {
				parentNode = networkNodes.get(seriesGroups[g].nodeSelected);
				if (!parentNode || !parentNode.STAdata || !seriesGroups[g].valueColumn)
					continue;
				data = parentNode.STAdata;
				row = new Array(labelsFull.length).fill(0);
				for (i = 0; i < data.length; i++) {
					record = data[i];
					c = labelsFull.indexOf(record[axisX]);
					if (c == -1)
						continue;
					value = parseFloat(record[seriesGroups[g].valueColumn]);
					if (!isNaN(value))
						row[c] += value;
				}
				seriesNames.push(seriesGroups[g].legendText || seriesGroups[g].valueColumn || ("Series " + (g + 1)));
				seriesData.push(row);
				seriesColors.push(seriesGroups[g].color || ColorsForBarPlot[g % ColorsForBarPlot.length]);
			}
		}
	}

	if (!seriesData.length) {
		if (event)
			alert(seriesAll ? DonaCadena({cat: "No s'ha pogut crear cap sèrie a partir de les columnes seleccionades.", spa: "No se ha podido crear ninguna serie a partir de las columnas seleccionadas.", eng: "No series could be created from the selected columns."}) : DonaCadena({cat: "Afegiu almenys una sèrie amb una columna d'elements o de valors.", spa: "Agregue al menos una serie con una columna de elementos o de valores", eng: "Add at least one series with an item or value column"}));
		return;
	}

	if (normalize)
		normalizeRadarSeries(seriesData.map(function (d) { return { data: d }; }));

	var chartData = {
		labels: labels,
		datasets: buildRadarDatasets(labels, seriesNames, seriesData, fill, seriesColors)
	};

	clearRadarPlotChart();
	RadarPlotChart = new Chart(document.getElementById("DialogRadarPlotVisualizationCanvas"), {
		type: "radar",
		data: chartData,
		options: {
			maintainAspectRatio: false,
			resizeDelay: 100,
			plugins: {
				title: {
					display: title != "",
					text: title
				},
				legend: {
					display: seriesNames.length > 0,
					position: "right"
				}
			},
			scales: {
				r: buildRadarRadialScale(normalize, beginAtZero, seriesData)
			}
		}
	});
	node.radarPlotOptions.drawn = true;
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
	link.download = "radar-plot.png";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function saveRadarPlotPngBlob(blob) {
	if (window.showSaveFilePicker) {
		window.showSaveFilePicker({
			suggestedName: "radar-plot.png",
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

function SaveRadarPlot(event) {
	var canvas, dataUrl;
	if (event)
		event.preventDefault();
	canvas = RadarPlotChart && RadarPlotChart.canvas ? RadarPlotChart.canvas : document.getElementById("DialogRadarPlotVisualizationCanvas");
	if (!RadarPlotChart || !canvas) {
		alert(DonaCadena({cat: "Dibuixeu primer el gràfic de radar.", spa: "Dibuje primero el gráfico de radar.", eng: "Draw the radar chart first."}));
		return;
	}
	function onBlob(blob) {
		if (!blob) {
			alert(DonaCadena({cat: "No s'ha pogut desar la imatge del gràfic.", spa: "No se ha podido guardar la imagen del gráfico.", eng: "The chart image could not be saved."}));
			return;
		}
		saveRadarPlotPngBlob(blob);
	}
	try {
		if (canvas.toBlob) {
			canvas.toBlob(function (blob) {
				if (blob) {
					onBlob(blob);
					return;
				}
				try {
					dataUrl = RadarPlotChart.toBase64Image ? RadarPlotChart.toBase64Image("image/png") : canvas.toDataURL("image/png");
					onBlob(radarPlotPngBlobFromDataUrl(dataUrl));
				} catch (e) {
					alert(DonaCadena({cat: "No s'ha pogut desar la imatge del gràfic.", spa: "No se ha podido guardar la imagen del gráfico.", eng: "The chart image could not be saved."}));
				}
			}, "image/png");
			return;
		}
		dataUrl = RadarPlotChart.toBase64Image ? RadarPlotChart.toBase64Image("image/png") : canvas.toDataURL("image/png");
		onBlob(radarPlotPngBlobFromDataUrl(dataUrl));
	} catch (e) {
		alert(DonaCadena({cat: "No s'ha pogut desar la imatge del gràfic.", spa: "No se ha podido guardar la imagen del gráfico.", eng: "The chart image could not be saved."}));
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
		toolbar.innerHTML = '<button type="button" onclick="addNewSelectGroupInCircularChart(\'' + node.id + '\')">' + DonaCadena({cat: "Afegeix una sèrie nova", spa: "Añadir una serie nueva", eng: "Add new series"}) + "</button>";
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

		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "Categories:", spa: "Categorías:", eng: "Categories:"}) + ' <select id="DialogCircularChartAxisXSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'axisX\',\'select\',\'DialogCircularChartAxisXSelect_' + i + '\',\'' + node.id + '\')">';
		for (p = 0; p < attrNames.length; p++)
			cdns += radarHtmlOption(attrNames[p], attrNames[p] == groups[i].axisX);
		cdns += "</select></label></div>";

		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "Valors:", spa: "Valores:", eng: "Values:"}) + ' <select id="DialogCircularChartValueSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'valueColumn\',\'select\',\'DialogCircularChartValueSelect_' + i + '\',\'' + node.id + '\')">';
		for (p = 0; p < attrNames.length; p++)
			cdns += radarHtmlOption(attrNames[p], attrNames[p] == groups[i].valueColumn);
		cdns += "</select></label></div>";

		cdns += '<div class="DialogCircularChartSeriesRow"><label>' + DonaCadena({cat: "Classificació (opcional):", spa: "Clasificación (opcional):", eng: "Classification (optional):"}) + ' <select id="DialogCircularChartClassSelect_' + i + '" onchange="updateSelectInformationCircularChart(\'' + i + '\',\'classificationColumn\',\'select\',\'DialogCircularChartClassSelect_' + i + '\',\'' + node.id + '\')">';
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
		alert(DonaCadena({cat: "Massa sèries (20). Suprimiu-ne una abans d'afegir-ne una altra.", spa: "Demasiadas series (20). Elimine una antes de añadir otra.", eng: "Too many series (20). Remove one before adding another."}));
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

function syncCircularLabelStyleControls(options) {
	var sizeEl = document.getElementById("DialogCircularChartLabelSize");
	var sizeVal = document.getElementById("DialogCircularChartLabelSizeValue");
	var colorEl = document.getElementById("DialogCircularChartLabelColor");
	var titleSizeEl = document.getElementById("DialogCircularChartTitleSize");
	var titleSizeVal = document.getElementById("DialogCircularChartTitleSizeValue");
	var centerSizeEl = document.getElementById("DialogCircularChartCenterTextSize");
	var centerSizeVal = document.getElementById("DialogCircularChartCenterTextSizeValue");
	var size, titleSize, centerSize;
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
		cdns += '<span class="DialogCircularChartLegendLabel">' + circularChartEscapeAttr(label) + "</span>";
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
				alert(DonaCadena({cat: "Seleccioneu les columnes de categories i de valors.", spa: "Seleccione las columnas de categorías y de valores.", eng: "Select the categories and values columns."}));
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
				alert(DonaCadena({cat: "Afegiu almenys una sèrie.", spa: "Añada al menos una serie.", eng: "Add at least one series."}));
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
			alert(DonaCadena({cat: "No s'ha pogut crear el gràfic amb les columnes seleccionades.", spa: "No se ha podido crear el gráfico con las columnas seleccionadas.", eng: "Could not create the chart with the selected columns."}));
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
	var rowH = 22;
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
	ctx.font = "12px sans-serif";
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
		ctx.fillText(DonaCadena({cat: "Corones (fora→dins):", spa: "Coronas (fuera→dentro):", eng: "Rings (outer→inner):"}), x0, y);
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
		alert(DonaCadena({cat: "Dibuixeu primer el gràfic circular.", spa: "Dibuje primero el gráfico circular.", eng: "Draw the circular chart first."}));
		return;
	}
	useWhite = confirm(DonaCadena({
		cat: "Voleu fons blanc al PNG?\n\nD'acord = fons blanc\nCancel·la = fons transparent",
		spa: "¿Quiere fondo blanco en el PNG?\n\nAceptar = fondo blanco\nCancelar = fondo transparente",
		eng: "White background for the PNG?\n\nOK = white background\nCancel = transparent background"
	}));
	function onBlob(blob) {
		if (!blob) {
			alert(DonaCadena({cat: "No s'ha pogut desar la imatge del gràfic.", spa: "No se ha podido guardar la imagen del gráfico.", eng: "The chart image could not be saved."}));
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
					alert(DonaCadena({cat: "No s'ha pogut desar la imatge del gràfic.", spa: "No se ha podido guardar la imagen del gráfico.", eng: "The chart image could not be saved."}));
				}
			}, "image/png");
			return;
		}
		onBlob(circularChartPngBlobFromDataUrl(exportCanvas.toDataURL("image/png")));
	} catch (e) {
		alert(DonaCadena({cat: "No s'ha pogut desar la imatge del gràfic.", spa: "No se ha podido guardar la imagen del gráfico.", eng: "The chart image could not be saved."}));
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
				alert(DonaCadena({cat: "Seleccioneu una columna que contingui URL d'imatges", spa: "Seleccione una columna que contenga URL de imágenes", eng: "Please, select a column that has urls to images in it"}));
				return;
			}
			var labelColumn = document.getElementById("DialogImageViewerLabelSelect").value;
			var size = parseInt(document.getElementById("DialogImageViewerSizeInput").value);
			if (isNaN(size)) {
				alert(DonaCadena({cat: "La mida no és un nombre enter. En el seu lloc, s'utilitzarà 200", spa: "El tamaño no es un número entero. En su lugar, se utilizará 200", eng: "Size is not an integer number. Using 200 instead"}));
				size = 200;
			}
			if (size < 2 || size > 2000) {
				alert(DonaCadena({cat: "La mida és fora de l'interval [2,2000]. En el seu lloc, s'utilitzarà 200", spa: "El tamaño está fuera del intervalo [2,2000]. En su lugar, se utilizará 200", eng: "Size is out of the [2,2000] range. Using 200 instead"}));
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