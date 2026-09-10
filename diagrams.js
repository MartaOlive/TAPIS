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
		document.getElementById("DialogScatterPlotTitle").innerHTML = "No data to show.";
		return;
	}

	document.getElementById("DialogScatterPlotTitle").innerHTML = "Scatter Plot";
	createDialogWithSelectWithGroupsScatterPlot(node);
	drawScatterPlot(node);
}

function createDialogWithSelectWithGroupsScatterPlot(node) {
	var scatterPlotDiv = document.getElementById("DialogScatterPlotDiv");
	scatterPlotDiv.innerHTML = "";
	var dialogGroups = node.STAattributesToSelect.dataGroupsSelectedToScatterPlot; //Array
	var parentNodesInformation = node.STAattributesToSelect.parentNodesInformation;
	var parentNodesInformationKeys = Object.keys(parentNodesInformation);

	var cdns = `<button onclick="addNewSelectGroupInScatterPlot('${node.id}')">Add new series</button>`

	for (var i = 0; i < dialogGroups.length; i++) { //dialog groups of data
		cdns += `<fieldset><legend>Series ${i + 1}</legend><label  style="margin-right: 10px;margin-bottom:20px">Data from: <select style="margin-bottom:10px" id="DialogScatterPlotAxisNodesSelect_${i}" onchange="updateSelectInformationScatterPlot('${i}','nodeSelected','select','DialogScatterPlotAxisNodesSelect_${i}','${node.id}')"></label>`

		for (var u = 0; u < parentNodesInformationKeys.length; u++) {
			cdns += `<option value="${parentNodesInformationKeys[u]}" ${(dialogGroups[i].nodeSelected == parentNodesInformationKeys[u]) ? "selected=true" : ""} onchange="updateSelectInformationScatterPlot('${i}','nodeSelected','select','DialogScatterPlotAxisNodesSelect_${i}','${node.id}')">${parentNodesInformation[parentNodesInformationKeys[u]].nodeLabel}</option>`
		}
		cdns += `</select><br>
				<label style="margin-right: 10px;margin-bottom:20px">Axis X: <select style="margin-bottom:10px" name="DialogScatterPlotAxisXSelect_${i}" id="DialogScatterPlotAxisXSelect_${i}" style="" onchange="updateSelectInformationScatterPlot('${i}','X','select','DialogScatterPlotAxisXSelect_${i}','${node.id}')">`

		for (var e = 0; e < parentNodesInformation[dialogGroups[i].nodeSelected].attr.length; e++) { //Select X
			cdns += `<option value="${parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]}"`;
			if (node.STAattributesToSelect.dataGroupsSelectedToScatterPlot[i].X == parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]) cdns += " selected=true "; //checked option
			cdns += `>${parentNodesInformation[dialogGroups[i].nodeSelected].attr[e]}</option>`
		}

		cdns += `</select></label><br>
				<label style="margin-right: 10px;margin-bottom:20px">Axis Y: <select style="margin-bottom:10px" name="DialogScatterPlotAxisYSelect_${i}" id="DialogScatterPlotAxisYSelect_${i}" style="" onchange="updateSelectInformationScatterPlot('${i}','Y','select','DialogScatterPlotAxisYSelect_${i}','${node.id}')">`
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
		document.getElementById("DialogBarPlotTitle").innerHTML = "No data to show.";
		return;
	}
	document.getElementById("DialogBarPlotTitle").innerHTML = "Bar and pie plot";

	var dataAttributes = parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(data);
	PopulateSelectSaveLayerDialog("DialogBarPlotAxisX", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.axisX ? node.barPlotOptions.axisX : "phenomenonTime");
	PopulateSelectSaveLayerDialog("DialogBarPlotSeries", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.series ? node.barPlotOptions.series : "");
	PopulateSelectSaveLayerDialog("DialogBarPlotAxisY", dataAttributes, node && node.barPlotOptions && node.barPlotOptions.axisY ? node.barPlotOptions.axisY : "result");

	if (parentNodes.length < 2)
		document.getElementById("DialogBarPlotVariable").innerHTML = '<input id="DialogBarPlotVariableInput" value="' + (node && node.barPlotOptions && node.barPlotOptions.labelY ? node.barPlotOptions.labelY : '') + '">';
	else {
		data = parentNodes[1].STAdata;
		if (!data || data.length != 1) {
			document.getElementById("DialogBarPlotTitle").innerHTML = "Second connection should only have one item. Continuing without title.";
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
		document.getElementById("DialogImageViewerTitle").innerHTML = "No data to show.";
		return;
	}
	saveNodeDialog("DialogImageViewer", node);

	document.getElementById("DialogImageViewerTitle").innerHTML = "Image viewer";

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
				alert("All series in X axis has to have same type of data");
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
		alert("The interval of the data selected is too long to apply to the graphic. Filter interval to make it shorter or choose a bigger interval to X axis");
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
	var preferred = ["ciutat", "city", "name", "label", "municipi", "nom"];
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
		document.getElementById("DialogRadarPlotAxesList").innerHTML = "<em>No numeric columns found.</em>";
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
		toolbar.innerHTML = '<button type="button" onclick="addNewSelectGroupInRadarPlot(\'' + node.id + '\')">Add new series</button>';
	cdns = "";

	for (i = 0; i < groups.length; i++) {
		parentId = getRadarSeriesParentId(groups[i], parentInfo);
		if (parentId && groups[i].nodeSelected != parentId)
			groups[i].nodeSelected = parentId;
		parentNode = parentId ? networkNodes.get(parentId) : null;
		data = parentNode && parentNode.STAdata ? parentNode.STAdata : [];
		numericNames = parentInfo[parentId] ? parentInfo[parentId].numericNames : [];
		items = getRadarUniqueValues(data, seriesLabel);

		cdns += '<fieldset><legend>Series ' + (i + 1) + '</legend>';
		cdns += '<div class="DialogRadarPlotSeriesRow"><label>Data from: <select id="DialogRadarPlotNodeSelect_' + i + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'nodeSelected\',\'select\',\'DialogRadarPlotNodeSelect_' + i + '\',\'' + node.id + '\')">';
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
			cdns += '<div class="DialogRadarPlotSeriesRow"><label>City / item: <select id="DialogRadarPlotItemSelect_' + i + '" onchange="updateSelectInformationRadarPlot(\'' + i + '\',\'item\',\'select\',\'DialogRadarPlotItemSelect_' + i + '\',\'' + node.id + '\')">';
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
		alert("Too many series (20). Remove one before adding another.");
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
			alert("Too many series (" + items.length + "). Showing the first " + maxSeries + " series.");
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
				alert("Add at least one series.");
			return;
		}
		if (seriesGroups.length > maxSeries) {
			if (event)
				alert("Too many series (" + seriesGroups.length + "). Showing the first " + maxSeries + " series.");
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
				alert("Select at least three numeric columns to use as radar axes.");
			return;
		}
		labels = axes;
		if (seriesAll) {
			if (!seriesLabel) {
				if (event)
					alert("Select an item column.");
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
				alert("Select a categories column.");
			return;
		}
		if (seriesAll) {
			labelsFull = getRadarCategoryKeysFromParents(parentNodes, axisX);
			for (i = 0; i < labelsFull.length; i++)
				labels.push(("" + labelsFull[i]).length > 35 ? ("" + labelsFull[i]).substring(0, 32) + "..." : labelsFull[i]);
			if (labels.length < 3) {
				if (event)
					alert("A radar chart needs at least three categories. The selected column has " + labels.length + " unique values.");
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
					alert("A radar chart needs at least three categories. The selected column has " + labels.length + " unique values.");
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
			alert(seriesAll ? "No series could be created from the selected columns." : "Add at least one series with a city or value column.");
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

function DrawImageViewer(event) {
	event.preventDefault(); // We don't want to submit this form
	var node = getNodeDialog("DialogImageViewer");
	var node = GetFirstParentNode(node);
	if (node) {
		var data, dataAttributes, record;
		if (node.STAdata) {
			var urlColumn = document.getElementById("DialogImageViewerURLSelect").value;
			if (!urlColumn) {
				alert("Please, select a column that has urls to images in it");
				return;
			}
			var labelColumn = document.getElementById("DialogImageViewerLabelSelect").value;
			var size = parseInt(document.getElementById("DialogImageViewerSizeInput").value);
			if (isNaN(size)) {
				alert("Size is not an integer number. Using 200 instead");
				size = 200;
			}
			if (size < 2 || size > 2000) {
				alert("Size is out of the [2,2000] range. Using 200 instead");
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