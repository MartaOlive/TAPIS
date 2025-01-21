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

		function ShowScatterPlotDialog(parentNodes) {
			var data = parentNodes[0].STAdata;
			if (!data || !data.length) {
				document.getElementById("DialogScatterPlotTitle").innerHTML = "No data to show.";
				return;
			}
			document.getElementById("DialogScatterPlotTitle").innerHTML = "Scatter Plot";

			var dataAttributes = parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(data);
			PopulateSelectSaveLayerDialog("DialogScatterPlotAxisX", dataAttributes, "phenomenonTime");
			PopulateSelectSaveLayerDialog("DialogScatterPlotAxisY", dataAttributes, "result");

			if (parentNodes.length<2)
			{
				document.getElementById("DialogScatterPlotVariableUoM").style.display = "none";
				return;
			}
			document.getElementById("DialogScatterPlotVariableUoM").style.display = "inline-block"

			data = parentNodes[1].STAdata;
			if (!data || data.length!=1) {
				document.getElementById("DialogScatterPlotTitle").innerHTML = "Second connection should only have one item. Continuing without title.";
				document.getElementById("DialogScatterPlotVariableUoM").style.display = "none";
				return;
			}
			var dataAttributes = parentNodes[1].STAdataAttributes ? parentNodes[1].STAdataAttributes : getDataAttributes(data);
			PopulateSelectSaveLayerDialog("DialogScatterPlotVariable", dataAttributes, "name");
			PopulateSelectSaveLayerDialog("DialogScatterPlotUoM", dataAttributes, "unitOfMeasurement/symbol");
		}

		function ShowBarPlotDialog(parentNodes) {
			var data = parentNodes[0].STAdata;
			if (!data || !data.length) {
				document.getElementById("DialogBarPlotTitle").innerHTML = "No data to show.";
				return;
			}
			document.getElementById("DialogBarPlotTitle").innerHTML = "Bar and pie plot";

			var dataAttributes = parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(data);
			PopulateSelectSaveLayerDialog("DialogBarPlotAxisX", dataAttributes, "phenomenonTime");
			PopulateSelectSaveLayerDialog("DialogBarPlotAxisY", dataAttributes, "result");


			if (parentNodes.length<2){
				document.getElementById("DialogBarPlotVariable").innerHTML='<input id="DialogBarPlotVariableInput" value="">';
				return;
			}

			data = parentNodes[1].STAdata;
			if (!data || data.length!=1) {
				document.getElementById("DialogBarPlotTitle").innerHTML = "Second connection should only have one item. Continuing without title.";
				return;
			}

			var dataAttributes = parentNodes[1].STAdataAttributes ? parentNodes[1].STAdataAttributes : getDataAttributes(data);
			PopulateSelectSaveLayerDialog("DialogBarPlotVariable", dataAttributes, "name");
		}

		function ShowImageViewerDialog(parentNodes) {
			var data = parentNodes[0].STAdata;
			if (!data || !data.length) {
				document.getElementById("DialogImageViewerTitle").innerHTML = "No data to show.";
				return;
			}
			document.getElementById("DialogImageViewerTitle").innerHTML = "Image viewer";

			var dataAttributes = parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(data);
			PopulateSelectSaveLayerDialog("DialogImageViewerURL", dataAttributes, "imageURL");
			PopulateSelectSaveLayerDialog("DialogImageViewerLabel", dataAttributes, "name");
		}

		function AdaptValueAxisY(value) {
			return ''+value.toPrecision(5);
		}

		var ScatterPlotGraph2d=null;
		function DrawScatterPlot(event){
			event.preventDefault(); // We don't want to submit this form
			var selectedOptions={};
			selectedOptions.AxisX=document.getElementById("DialogScatterPlotAxisXSelect").value;
			selectedOptions.AxisY=document.getElementById("DialogScatterPlotAxisYSelect").value;
			if (document.getElementById("DialogScatterPlotVariableUoM").style.display!="none")
			{
				selectedOptions.Variable=document.getElementById("DialogScatterPlotVariableSelect").value;
				selectedOptions.UoM=document.getElementById("DialogScatterPlotUoMSelect").value;
			}

			var nodes=GetParentNodes(currentNode);
			if (nodes && nodes.length) {
				var node=nodes[0];
				var data, dataAttributes, record;
				if (node.STAdata) {
					var items=[], minx, maxx, miny, maxy;
					data=node.STAdata;
					dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);

					if (ScatterPlotGraph2d)
						ScatterPlotGraph2d.destroy();
					//for (var e=0;e<x;e++){

					
						for (var i = 0; i < data.length; i++) {
							record=data[i];
							if (i==0){
								minx=maxx=record[selectedOptions.AxisX];
								miny=maxy=record[selectedOptions.AxisY];
							} else {
								if (minx>record[selectedOptions.AxisX])
									minx=record[selectedOptions.AxisX];
								if (maxx<record[selectedOptions.AxisX])
									maxx=record[selectedOptions.AxisX];
								if (miny>record[selectedOptions.AxisY])
									miny=record[selectedOptions.AxisY];
								if (maxy<record[selectedOptions.AxisY])
									maxy=record[selectedOptions.AxisY];
								//aixo xo cada linea es un group
							}
							items.push({x: record[selectedOptions.AxisX], y: record[selectedOptions.AxisY], group: 0 /*group:e*/})
						}
					//}
					
					var dataset = new vis.DataSet(items);
					var groups = new vis.DataSet();
					var options = {
						dataAxis: {left: {range: {min:miny-(maxy-miny)*0.025, max:maxy+(maxy-miny)*0.025}, title: {text: "Values"}, format: AdaptValueAxisY}},
						drawPoints: {size: 1},
						legend: {left:{position:"bottom-left"}},
						start: minx,
						end: maxx
					};
					var title="Results";

					if (nodes.length>1 && nodes[1].STAURL) {
						node=nodes[1];
						data=node.STAdata;
						if (data.length)
							record=data[0];
						if (record[selectedOptions.Variable])
							title=record[selectedOptions.Variable];
						if (record[selectedOptions.UoM])
							title+=" (" + record[selectedOptions.UoM] + ")";
					}
					groups.add({
						id: 0,
						content: title,
						interpolation: {
							parametrization: 'chordal'
						}
					});
					ScatterPlotGraph2d = new vis.Graph2d(document.getElementById('DialogScatterPlotVisualization'), dataset, groups, options);
				}
			}
		}

		function CloseDialogScatterPlot(event) {
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogScatterPlot").close();
		}

const ColorsForBarPlot=["#1f77b4","#aec7e8","#ff7f0e","#ffbb78","#2ca02c","#98df8a","#d62728","#ff9896","#9467bd","#c5b0d5","#8c564b","#c49c94","#e377c2","#f7b6d2","#7f7f7f","#c7c7c7","#bcbd22","#dbdb8d","#17becf","#9edae5"];

		var BarPlotGraph2d=null;
		function DrawBarPlot(event){
			event.preventDefault(); // We don't want to submit this form
			var selectedOptions={};
			selectedOptions.AxisX=document.getElementById("DialogBarPlotAxisXSelect").value;
			selectedOptions.AxisY=document.getElementById("DialogBarPlotAxisYSelect").value;

			var nodes=GetParentNodes(currentNode);
			if (nodes && nodes.length) {
				var node=nodes[0];
				var data, dataAttributes, record;
				if (node.STAdata) {
					var labels=[], dataY=[], backgroundColor=[], labelY="Magnitude", plotType, scales, legend, plugins;
					data=node.STAdata;
					dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);

					for (var i = 0; i < data.length; i++) {
						record=data[i];
						labels.push(record[selectedOptions.AxisX]);
						dataY.push(record[selectedOptions.AxisY]);
						backgroundColor.push(ColorsForBarPlot[i%ColorsForBarPlot.length]);
					}
					if (document.getElementById("DialogBarPlotVariableSelect"))
						labelY=document.getElementById("DialogBarPlotVariableSelect").value;
					else if (document.getElementById("DialogBarPlotVariableInput") && document.getElementById("DialogBarPlotVariableInput").value)
						labelY=document.getElementById("DialogBarPlotVariableInput").value;
					else if (dataAttributes[selectedOptions.AxisY].description) {
						labelY=dataAttributes[selectedOptions.AxisY].description;
						if (dataAttributes[selectedOptions.AxisY].UoMSymbol)
							labelY+=" (" + dataAttributes[selectedOptions.AxisY].UoMSymbol + ")";
						else if (dataAttributes[selectedOptions.AxisY].UoM)
							labelY+=" (" + dataAttributes[selectedOptions.AxisY].UoM + ")";
					}
					if (document.getElementById("DialogBarPlotTypePie").checked) {
						plotType="pie";
						scales=null;
						legend={
							position: "right",
							labels: {
								fontSize: 10,
								padding: 3
							}
						};
						plugins={
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
						plotType="bar";
						scales={
							xAxes: [{
								scaleLabel: {display: true, labelString: dataAttributes[selectedOptions.AxisX].description ? dataAttributes[selectedOptions.AxisX].description : selectedOptions.AxisX},
								categoryPercentage: 1,
								barPercentage: 1,
								gridLines: { display: false},
								ticks: { autoSkip: false /*, maxRotation: 0 */}
							}],
							yAxes: [{
								//type: "logarithmic",
								scaleLabel: {display: true, labelString: labelY},
							ticks: { beginAtZero:true }
							}]
						};
						legend={
							display: false
						};
						plugins={
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
					if (BarPlotGraph2d)
						BarPlotGraph2d.destroy();
					BarPlotGraph2d = new Chart(document.getElementById('DialogBarPlotVisualizationCanvas'), {
								type: plotType,
								data: {
									labels: labels,
									datasets: [{
										data: dataY,
										backgroundColor: backgroundColor,
										borderWidth: 0
									}]
								},
								options: {	
									legend: legend,
									scales: scales,
									plugins: plugins,
									maintainAspectRatio: false,
									resizeDelay: 100
								}
							});
				}
			}
		}

		function CloseDialogBarPlot(event) {
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogBarPlot").close();
		}

		function DrawImageViewer(event){
			event.preventDefault(); // We don't want to submit this form

			var node=GetFirstParentNode(currentNode);
			if (node) {
				var data, dataAttributes, record;
				if (node.STAdata) {
					var urlColumn=document.getElementById("DialogImageViewerURLSelect").value;
					if (!urlColumn){
						alert("Please, select a column that has urls to images in it");
						return;
					}
					var labelColumn=document.getElementById("DialogImageViewerLabelSelect").value;
					var size=parseInt(document.getElementById("DialogImageViewerSizeInput").value);
					if (isNaN(size)){
						alert("Size is not an integer number. Using 200 instead");
						size=200;
					}
					if (size<2 || size>2000){
						alert("Size is out of the [2,2000] range. Using 200 instead");
						size=200;
					}
				
					var ncol=Math.floor(900/(size+15));
					var cdns=[];
					data=node.STAdata;
					dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);
					
					cdns.push("<table>");
					for (var i = 0; i < data.length; i++) {
						record=data[i];
						if (i%ncol==0)
							cdns.push("<tr>");
						cdns.push('<td style="text-align: center;">');
						cdns.push('<a href="', record[urlColumn], '" target="_blank"><img src="', record[urlColumn], '" width="', size, '"></a>');
						if (labelColumn)
							cdns.push('<br><small>', record[labelColumn], '</small>');
						cdns.push('<td>');
						if ((i+1)%ncol==0)
							cdns.push("</tr>");
					}
					cdns.push("<table>");
					document.getElementById('DialogImageViewerVisualization').innerHTML=cdns.join("");
				}
			}
		}

		function CloseDialogImageViewer(event) {
			event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogImageViewer").close();
		}

