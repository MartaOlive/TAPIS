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
	if (chart)ScatterPlotChart.destroy();
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

