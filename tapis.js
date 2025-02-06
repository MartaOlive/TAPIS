"use strict"

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

var config;

const ServicesAndAPIs = {sta: {name: "STA plus", description: "STA service", startNode: true, help: "Connects to a SensorThings API or a STAplus instance and returns a table with the list of entities suported"},
			ogcAPICols: {name: "OGC API cols", description: "OGC API collections", startNode: true, help: "Connects to the collections page of a OGC Web API instance and returns a table with the list collections available"},
			ogcAPIItems: {name: "OGC API items", description: "OGC API items", startNode: true, help: "Connects to a collection page on an OGC Web API Features or derivatives and returns a table with the items available. One of the columns contains the geometry JSON object"},
			csw: {name: "Catalogue", description: "OGC CSW", startNode: true, help: "Connects to a OGC CSW cataloge service. The result is a table with a list of records in the catalogue that have data associated with them"},
			s3Service: {name: "S3 Service", description: "S3 Service", startNode: true, help: "Connects to a Amazon S3 compatible service (e.g. MinIO) and return the list of buckets available as a table"},
			s3Bucket: {name: "S3 Bucket", description: "S3 Bucket", startNode: true, help: "Connects to a Amazon S3 backet (e.g. MinIO) and return the list of files available (in the root folder and all subfolders as a table"},
			edc: {name: "DataSpace cat.", description: "DataSpace cat.", startNode: true, help: "Connects an Eclipse Data Connector (EDC) Catalogue and returns the list of assets available as a table"},
			edcAsset: {name: "DataSpace asset", description: "DataSpace asset", help: "Prepares an Eclipse Data Connector (EDC) Asset"},
			ImportCSV: {name: "CSV", description: "CSV", startNode: true, help: "Imports data from a CSV file and returns a table"},
			ImportDBF: {name: "DBF", description: "DBF", startNode: true, help: "Imports data from a DBASE III+ or IV file and returns a table"},
			ImportJSONLD: {name: "JSON-LD", description: "JSON-LD", startNode: true, help: "Imports data from a JSON-LD file and returns a table"},
			ImportJSON: {name: "JSON", description: "JSON", startNode: true, help: "Imports data from a JSON file and returns a table"},
			ImportGeoJSON: {name: "GeoJSON", description: "GeoJSON", startNode: true, help: "Imports the features of a GeoJSON and returns a table where each feature is a record. One of the columns contains the geometry JSON object"},
			staRoot: {name: "STA root", description: "STA root", help:"Returns to the root of the SensorThings API or STSTAplus service in use. In other words, removes the path and query parameters of the previous node"}};
const ServicesAndAPIsArray = Object.keys(ServicesAndAPIs);
const STAEntities = {
	ObservedProperties: { singular: "ObservedProperty", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "definition", dataType: "URI", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help:"Visualize through a table the ObservedProperties of this STAPlus service" },
	Observations: { singular: "Observation", entities: [{ name: "Datastream", required: "true" }, { name: "MultiDatastream", required: "true" }, { name: "FeatureOfInterest", required: "false" }, { name: "ObservationGroups", required: "false" }, { name: "Subjects", required: "false" }, { name: "Objects", required: "false" }], properties: [{ name: "phenomenonTime", dataType: "object", required: "true" }, { name: "resultTime", dataType: "isodatetime", required: "true" }, { name: "result", dataType: "", required: "true" }, { name: "resultQuality", dataType: "object", required: "false" }, { name: "validTime", dataType: "data_isoperiod", required: "false" }, { name: "parameters", dataType: "JSON", required: "false" }], entityRelations: ["Object", "Subject"], help:"Visualize through a table the Observations of this STAPlus service" },
	FeaturesOfInterest: { singular: "FeatureOfInterest", entities: [{ name: "Observations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "encodingType", dataType: "string", required: "true" }, { name: "feature", dataType: "", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }],help:"Visualize through a table the FeaturesOfInterest of this STAPlus service" },
	Sensors: { singular: "Sensor", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "encodingType", dataType: "string", required: "true" }, { name: "metadata", dataType: "", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help:"Visualize through a table the Sensors of this STAPlus service" },
	Things: { singular: "Thing", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Party", required: "true" }, { name: "Locations", required: "false" }, { name: "HistoricalLocations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help:"Visualize through a table the Things of this STAPlus service"},
	Locations: { singular: "Location", entities: [{ name: "Things", required: "false" }, { name: "HistoricalLocations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "encodingType", dataType: "string", required: "true" }, { name: "location", dataType: "", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help:"Visualize through a table the Locations of this STAPlus service"},
	HistoricalLocations: { singular: "HistoricalLocation", entities: [{ name: "Things", required: "true" }, { name: "Location", required: "true" }], properties: [{ name: "time", dataType: "isodatetime", required: "true" }], help:"Visualize through a table the HistoricalLocations of this STAPlus service" },
	Datastreams: { singular: "Datastream", entities: [{ name: "Party", required: "true" }, { name: "Sensor", required: "true" }, { name: "ObservedProperty", required: "true" }, { name: "Campaigns", required: "false" }, { name: "License", required: "false" }, { name: "Observations", required: "false" }, { name: "Thing", required: "true" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "observationType", dataType: "string", required: "true" }, { name: "unitOfMeasurement", dataType: "JSON", required: "true" }, { name: "observedArea", dataType: "object", required: "false" }, { name: "phenomenonTime", dataType: "data_isoperiod", required: "false" }, { name: "resultTime", dataType: "data_isoperiod", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }], help:"Visualize through a table the Datastreams of this STAPlus service" },
	MultiDatastreams: { singular: "MultiDatastream", entities: [{ name: "Party", required: "true" }, { name: "Sensor", required: "true" }, { name: "ObservedProperty", required: "true" }, { name: "Campaigns", required: "false" }, { name: "License", required: "false" }, { name: "Observations", required: "false" }, { name: "Thing", required: "true" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "observationType", dataType: "string", required: "true" }, { name: "unitOfMeasurement", dataType: "JSON", required: "true" }, { name: " observedArea", dataType: "object", required: "false" }, { name: "phenomenonTime", dataType: "data_isoperiod", required: "false" }, { name: "resultTime", dataType: "data_isoperiod", required: "false" }, { name: "multiObservationDataType", dataType: "JSON", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }],help:"Visualize through a table the MultiDatastreams of this STAPlus service"  },
	Parties: { singular: "Party", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Campaigns", required: "false" }, { name: "ObservationGroups", required: "false" }, { name: "Things", required: "false" }], properties: [{ name: "description", dataType: "string", required: "false" }, { name: "authId", dataType: "string", required: "false" }, { name: "role", dataType: "PartyRoleCode", required: "true" }, { name: "displayName", dataType: "string", required: "false" }], help:"Visualize through a table the Parties of this STAPlus service"},
	Campaigns: { singular: "Campaign", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Party", required: "true" }, { name: "License", required: "false" }, {name:"ObservationGroups", required:"false"}], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "classification", dataType: "string", required: "false" }, { name: "termsOfUse", dataType: "string", required: "true" }, { name: "privacyPolicy", dataType: "string", required: "false" }, { name: "creationTime", dataType: "isodatetime", required: "true" }, { name: "url", dataType: "URI", required: "false" }, { name: "startTime", dataType: "isodatetime", required: "false" }, { name: "endTime", dataType: "isodatetime", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }],help:"Visualize through a table the Campaigns of this STAPlus service"},
	Licenses: { singular: "License", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Campaigns", required: "false" }, { name: "ObservationGroups", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "definition", dataType: "URI", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "logo", dataType: "string", required: "false" }, { name: "attributionText", dataType: "JSON", required: "false" }],help:"Visualize through a table the Licenses of this STAPlus service"},
	ObservationGroups: { singular: "ObservationGroup", entities: [{ name: "Party", required: "true" }, { name: "Campaigns", required: "false" }, { name: "License", required: "false" }, { name: "Observations", required: "false" }, { name: "Relations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "purpose", dataType: "string", required: "false" }, { name: "creationTime", dataType: "isodatetime", required: "false" }, { name: "endTime", dataType: "isodatetime", required: "false" }, { name: "termsOfUsed", dataType: "string", required: "false" }, { name: "privacyPolicy", dataType: "string", required: "false" }, { name: "dataQuality", dataType: "JSON", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }],help:"Visualize through a table the ObservationGroups of this STAPlus service" },
	Relations: { singular: "Relation", entities: [{ name: "Object", required: "true" }, { name: "Subject", required: "true" }, { name: "ObservationGroups", required: "false" }], properties: [{ name: "role", dataType: "URI", required: "true" }, { name: "description", dataType: "string", required: "false" }, { name: "externalObject", dataType: "URI", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }], entityRelations: ["Objects", "Subjects"],help:"Visualize through a table the Relations of this STAPlus service" }
};
const STAEntitiesArray = Object.keys(STAEntities);
const STASpecialQueries = {ObsLayer: {description: "Observations Layer", query: "Observations?$orderby=phenomenonTime%20desc&$expand=Datastream($select=unitOfMeasurement),Datastream/ObservedProperty($select=name,description,definition),FeatureOfInterest($select=description,feature)&$select=phenomenonTime,result", help: "Link to STAplus service to add a query to this url to obtain a table with phenomenomTime and results from Observations, unitsOfMeasurements and ObservedProperty from Datastreams and a description from the featureOfInterest related "}};
const STASpecialQueriesArray = Object.keys(STASpecialQueries);
const STAOperations = {SelectColumnsSTA: {description: "Select Columns", callSTALoad: true, help:"Obtains a table only with columns selected. Requeres to be connected to another SensorThings API or a STAplus entity"},
			ExpandColumnsSTA: {description: "Expand Columns", callSTALoad: true, help: "Adds columns coming from properties from related entities. Requeres to be connected to another SensorThings API or a STAplus entity"},
			SelectRowSTA: {description: "Select Row", callSTALoad: true, help: "Obtains a table only with the selected record. Requeres to be connected to another SensorThings API or a STAplus entity. A single record is required to related entities to this one and navegate the SensorThings API or a STAplus data model"},
			FilterRowsSTA: {description: "Filter Rows", callSTALoad: true, help: "Obtains a table with the records that match your conditions. Requeres to be connected to another SensorThings API or a STAplus entity"},
			FilterRowsByTime: {description: "Filter Rows by time", help: "Obtains a table with records that match with a time interval. It is possible to group them by time periods. Requeres to be connected to another SensorThings API or a STAplus entity"},
			GeoFilterPolSTA: {description: "Filter Rows by Polygon", callSTALoad: true, help: "Obtains a table with the records within a polygon. Requeres to be connected to another SensorThings API or a STAplus entity and to a table with a record that has a geometry (polygon)"},
			GeoFilterPntSTA: {description: "Filter Rows by Distance", callSTALoad: true, help: "Obtains a table with the records that are closer that a given distance of a point. Requeres to be connected to another SensorThings API or a STAplus entity"},
			SortBySTA: {description: "Sort by", callSTALoad: true, help: "Obtains a table with data sorted by a given criteria. Requeres to be connected to another SensorThings API or a STAplus entity"},
			UploadObservations: {description: "Upload in STA", leafNode: true, help: "Saves some observations to a SensorThings API or a STAplus server"},
			//UploadTimeAverages: {description: "Upload time averages", leafNode: true},
			OneValueSTA: {description: "One Value", leafNode: true, help: "Shows the last posted value. This value is updated according to the time period you set. Requeres to be connected to another SensorThings API or a STAplus entity. Do not requre to connect to previous sort by time. This node can not be connected to other dependend nodes" },
			CountResultsSTA: { description: "Count results", leafNode: true, help: "Returns the total number of records returned by the API query without loading them in a table. Only with STA data. Requeres to be connected to another SensorThings API or a STAplus entity. This node can not be connected to other dependend nodes"}};
const STAOperationsArray = Object.keys(STAOperations);

const TableOperations = {Table: {description: "View Table", leafNode: true, help: "Shows a table of the dependent node in a dialog box. Since the table behind the active node is represented in the table area, the use of this operation is no longer recommended"},
			ViewQuerySTA: {description: "View Query", leafNode: true, help: "Shows the completed URL that is used to make the query to obtain the data from a service or an API of the depended node in a dialog box. Since the URL behind the active node is always represented in the query and table area, the use of this operation is no longer recommended"},
			EditRecord: {description: "Edit record", help: "Shows and allows editing a record in the table of the related node. NOTE: If you are using data from a web service and you ask for data again, this change will be lost"},
			Meaning: {description: "Column meaning", help: "Shows and allows editing the semantics (definition and units of measure) of the table columns"},
			SelectColumnsTable: {description: "Select Columns", help: "Obtains a table only with the selected columns. Not recommended for SensorThings API or a STAplus entities as it removes the STA URL"},
			SelectRowTable: {description: "Select Row", help: "Obtains a table only with the selected record. Not recommended for SensorThings API or a STAplus entities as it removes the STA URL" },
			FilterRowsTable: {description: "Filter Rows", help: "Obtain a table with the records that match the contitions. Not recommended for SensorThings API or a STAplus entities as it removes the STA URL"},
			JoinTables: {description: "Join Tables", help:"Creates a single table that is the result of joining two tables using some selected column values in both tables to defined the merge criteria"},
			ConcatenateTables: {description: "Concatenate Columns", help: "Create a single table by adding the records of the second table to the first one. The columns with the same name in both tables are merged in a sigle column" },
			GroupBy: {description: "GroupBy", help: "Creates a table will the columns containng selected statistics of the aggregation of some records that have the same values other selected columns"},
			AggregateColumns: {description: "Aggregate Columns", help: "Adds a new column to a table with the aggregation of other previous selected columns"},
			CreateColumns: {description: "Create Columns", help: "Adds a new column to your table. This column can be left empty, filled with a constant value or filled with an autoincremental value"},
			ColumnsCalculator: {description: "Columns calculator", help: "Adds a new column to your table where for each record the new column contains the result of an operation involving other column values of that record"},
			ColumnStatistics: {description:"Columns statistics", help: "Create a table where, for each column the main statistics for the column values of all records are recorded"},
			SeparateColumns: {description: "Separate Columns", help: "Splits a column containing a JSON object into separated new columns and removes the original column." },
			ScatterPlot: {description: "Scatter Plot", leafNode: true, help: "Creates a scatter plot with a the values of the collumn of a table"},
			BarPlot: {description: "Bar Plot", leafNode: true, help: "Create a bar or pie chart with a the values of the collumn of a table"},
			ImageViewer: {description: "Image Viewer", leafNode: true, help: "Shows the pictures referenced by a column. Assumes that the content of the column are url to images supported by the browser (commonly in JPEG or PNG format)"},
			SaveTable: {description: "Save Table", leafNode: true, help: "Saves the table contained in the node as a CSV (and CSVW if the collumn definition is semantically enriched; see 'meaning')."},
			SaveLayer: {description: "Save Layer", leafNode: true, help: "Saves the table as a GeoJSON. It requires two columns with a latitude and longitude values"},
			OpenMap: {description: "Open Map", leafNode: true, help: "Opens a table as a map in a map browser interface. It requires two columns with a latitude and longitude values"},
			guf: {description: "Feedback", help: "Retreives the geospatial user feedback related to the single row present in the table (e.g. a record forma CSW catalogue). It also allows for adding or editing feedback. It uses the NiMMbus repository and interface"}};
const TableOperationsArray = Object.keys(TableOperations);

//If the two nodes cannot connect it returns null. It transforms a plural to singular if needed.
function transformToSingularIfNeededSTAEntity(parentEntity, entityName) {
	//Determinino si ha de ser singular o plural
	for (var i=0; i<parentEntity.entities.length; i++)
	{			
		if (parentEntity.entities[i].name==entityName)
			return entityName;
		else if (parentEntity.entities[i].name==STAEntities[entityName].singular)
			return STAEntities[entityName].singular;
	}
	return null;
}

//considerEntityRelations means that in some paths you can find "Subject, Object..." that are relations to "Observations" Entity 
function getSTAEntityPlural(entityName, considerEntityRelations) {
	for (var i=0; i<STAEntitiesArray.length; i++) {
		if (STAEntities[STAEntitiesArray[i]].singular==entityName)
			return STAEntitiesArray[i];
	}
	if (considerEntityRelations) {
		for (var i=0; i<STAEntitiesArray.length; i++) {
			if ( STAEntities[STAEntitiesArray[i]].entityRelations) {
				for (var j=0; j<STAEntities[STAEntitiesArray[i]].entityRelations.length; j++) {
					if (STAEntities[STAEntitiesArray[i]].entityRelations[j]==entityName)
						return STAEntitiesArray[i];
				}
			}
		}
	}
	return entityName;
}

function getConnectionSTAEntity(parentNode, node) {
	var parentPlural, parentEntity;
	var idNode=IdOfSTAEntity(node);
	if (idNode<0)
		return {error: "Node is not a STA entity"};
	var parentLastEntity=getSTAURLLastEntity(parentNode.STAURL);
	if (STAEntities[parentLastEntity]){
		parentPlural=true;
		parentEntity=STAEntities[parentLastEntity];
	} else {
		for (var i=0; i<STAEntitiesArray.length; i++)
		{
			if (STAEntities[STAEntitiesArray[i]].singular==parentLastEntity)
			{
				parentPlural=false;
				parentEntity=STAEntities[STAEntitiesArray[i]];
				break;
			}
		}
		if (i==STAEntitiesArray.length)
			return {error: "Parent node is not a STA entity"};
	}

	var nextEntity=removeExtension(node.image);

	if (!STAEntities[nextEntity])
		return {error: "Child node is not a STA entity"};

	if (parentPlural)
	{
		if (null!=getSTAURLSelectingARow(parentNode.STAURL))
		{
			//Determinino si ha de ser singular o plural
			var entityName=transformToSingularIfNeededSTAEntity(parentEntity, nextEntity)
			if (entityName)
				return {entity: entityName};
			else{
				var n=parentEntity.entities.length, s= n ? parentEntity.entities[0].name : "";
				for (var t=1; t<n; t++)
					s+=", " + parentEntity.entities[t].name;
				return {error: "The node connection does not match the STA data model. Connect '" + parentLastEntity + "' to one of the following: " + s};
			}
		}
		else
		{
			//Is parentNode plural? Everything is incompatible
			return {error: "A plural parent node requires selecting a row before being connectable to another STA entity"};
		}
	}
	//else
	//Is parentNode singular?
	var entityName=transformToSingularIfNeededSTAEntity(parentEntity, nextEntity);
	if (entityName)
		return {entity: entityName};
	else{
		var n=parentEntity.entities.length, s= n ? parentEntity.entities[0].name : "";
		for (var t=1; t<n; t++)
			s+=", " + parentEntity.entities[t].name;
		return {error: "The node connection does not match the STA data model. Connect '"+ parentLastEntity +"' to one of the following: " + s};
	}
}

//Return null if there is no reason (and there is a "fit").
function reasonNodeDoesNotFitWithPrevious(node, parentNode) {
	if (parentNode.image == "sta.png" && (node.image == "FilterRowsSTA.png" || node.image == "SelectRowSTA.png" || node.image == "GeoFilterPolSTA.png" || node.image == "SelectColumnsSTA.png" || node.image == "ExpandColumnsSTA.png" || node.image == "SortBySTA.png" || node.image == "OneValueSTA.png" || node.image == "CountResultsSTA.png" ) )
		return "The operation cannot be applied to the root of an STA. (Suggestion: connect a STA Entity first)";
	if (parentNode.image=="sta.png" || parentNode.image=="ogcAPICols.png" || parentNode.image=="csw.png")
		return null;
	if ((STAOperations[removeExtension(parentNode.image)] && STAOperations[removeExtension(parentNode.image)].leafNode==true) ||
		(TableOperations[removeExtension(parentNode.image)] && TableOperations[removeExtension(parentNode.image)].leafNode==true))
		return "Parent node is a leaf node and cannot be connected with any other node";
	if (node.image=="OneValueSTA.png" && parentNode.image!="Observations.png")
		return "'One value' node is designed be connected to an 'Observations' node only.";
	var idNode=IdOfSTAEntity(node);
	if (idNode<0)
		return null;
	if (!parentNode.STAURL)
		return null;
	var getCon=getConnectionSTAEntity(parentNode, node)
	if (getCon.error)
		return getCon.error;
	return null;
}


window.onbeforeunload = function () { return "Your work will be lost."; }

function showInfoMessage(msg){
	var elem=document.getElementById("clarification");
	elem.innerHTML += (msg + "<br>");
	elem.scrollTop=elem.scrollHeight;  //https://stackoverflow.com/questions/11715646/scroll-automatically-to-the-bottom-of-the-page
}

function getURLWithoutQueryParams(s)
{
	var i=s.indexOf('?')
	if (i==-1)
		return s;
	return s.substring(0, i);
}

function getURLQueryParams(s)
{
	var i=s.indexOf('?')
	if (i==-1)
		return "";
	return s.substring(i+1);
}

//https://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
function transformStringIntoLocation(href) {
	var location = document.createElement("a");
	location.href = href;
	// IE doesn't populate all link properties when setting .href with a relative URL,
	// however .href will return an absolute URL which then can be used on itself
	// to populate these additional fields.
	if (location.host == "") {
		location.href = location.href;
	}
	return location;
}

//Returns the id of the selected resource in the last part of the path. So extracts in the "entities(id)" extracts the id
function getSTAURLSelectingARow(url)
{
	var s=getURLWithoutQueryParams(url);
	var i=(s.charAt(s.length-1)=='/')? s.length-2 : s.length-1

	if (s.charAt(i)!=')')
		return null;
	var ii=s.lastIndexOf('(');
	if (ii==-1)
		return null;
	if (ii>s.lastIndexOf('/')+2)
	{
		var id=s.substring(ii+1, i);
		if (id.charAt(0)=='\'' && id.charAt(id.length-1)=='\'')
			return id.substring(1, id.length-1);
		return id;
	}
	return null;
}

//Get the last entity of the path (without the filter, selection, expantion... or selection of a single entity by using (id))
function getSTAURLLastEntity(url)
{
	var s=getURLWithoutQueryParams(url);
	var i=(s.charAt(s.length-1)=='/')? s.length-2 : s.length-1;

	if (s.charAt(i)!=')')
	{
		i=s.lastIndexOf('/')
		if (-1!=s)
			return s.substring(i+1);
		return s;
	}
	i=s.lastIndexOf('(');
	if (i==-1)
		return s;
	var ii=s.lastIndexOf('/');
	if (i>ii+2)
		return s.substring(ii+1, i);
	return s.substring(ii+1);
}

function removeSTAURLNoQueryLastEntity(s)
{
	var entity;
	var i=(s.charAt(s.length-1)=='/')? s.length-2 : s.length-1;

	if (s.charAt(i)!=')')
	{
		i=s.lastIndexOf('/')
		if (-1==s)
			return null;
		entity=s.substring(i+1);
		return STAEntities[getSTAEntityPlural(entity, false)] ? s.substring(0, i) : null;
	}
	i=s.lastIndexOf('(');
	if (i==-1)
		return null;
	var ii=s.lastIndexOf('/');
	if (i>ii+2) {
		entity=s.substring(ii+1, i);
		return STAEntities[getSTAEntityPlural(entity, false)] ? s.substring(0, ii) : null;
	}
	entity=s.substring(ii+1);
	return STAEntities[getSTAEntityPlural(entity, false)] ? s.substring(0, ii) : null;
}

function getSTAURLRoot(url) {
	var s, urlRoot=getURLWithoutQueryParams(url);
	while (null!=(s=removeSTAURLNoQueryLastEntity(urlRoot))) {
		urlRoot=s;
	}
	return urlRoot;
}

//From the MiraMon Map Browser TreuAdreca()
function getFileName(s)
{
	var i=s.lastIndexOf('/');
	if (i==-1)
		i=s.lastIndexOf('\\');
	if (i==-1)
		return s;
	return s.substring(i+1);
}

//From the MiraMon Map Browser DonaAdreca()
function getAddressPath(s)
{
	if (s.charAt(s.length-1)=='/')
		return s;
	var i=s.lastIndexOf('/');
	if (i==-1)
		return "";
	return s.substring(0, i);
}

//from the MiraMon Map Browser DonaAdrecaAbsoluta()
function getAbsoluteURL(url)
{
	if (url.length>8 && (url.substring(0, 7)=="http://" || url.substring(0, 8)=="https://"))
		return url;
	if (url.charAt(0)=="/")
		return location.protocol+"//"+location.host+url;
	return location.protocol+"//"+location.host+getAddressPath(location.pathname)+url;
}

function removeExtension(name){
	var i=name.lastIndexOf(".");
	if (i==-1)
		return name;
	return name.substring(0, i);
}


function getLang() {
	if (navigator.languages != undefined)
		return navigator.languages[0];
	return navigator.language;
}

function removeExtraAmpersand(queryparams) {
	if (!queryparams)
		return queryparams;
	var s;
	if (queryparams.charAt(0)=='&') {
		s=queryparams.substring(1);
		if (!s)
			return s;
	}
	else
		s=queryparams;
	if (queryparams.charAt(s.length-1)=='&')
		return s.substring(0, queryparams.length-1);
	return s;
}

//Before it was called AddKVPToURL
function AddQueryParamsToURL(url, kvp) {
	kvp=removeExtraAmpersand(kvp);
	if (!kvp)
		return url;
	if (url.indexOf('?')==-1)
		return url + "?" + kvp;
	return url + "&" + kvp;
}

function GetQueryParamFromURL(url, queryparam) {
	var queryparams=getURLQueryParams(url);
	var kvp=queryparams.split("&");
	for(var i=0; i<kvp.length; i++) {
		var j = kvp[i].indexOf("=");  // Gets the first index where a space occours
		if (j==-1)
			continue;
		if (kvp[i].substring(0, j)==queryparam)
			return kvp[i].substring(j+1);
	}
	return null;
}


function RemoveQueryParamFromURL(url, queryparam) {
	var queryparams=getURLQueryParams(url);
	if (!queryparams)
		return url;
	var kvp=queryparams.split("&");
	for(var i=0; i<kvp.length; i++) {
		var j = kvp[i].indexOf("=");  // Gets the first index where a space occours
		if (j==-1)
			continue;
		if (kvp[i].substring(0, j)==queryparam){
			kvp.splice(i, 1);
			if (kvp.length)
				return getURLWithoutQueryParams(url)+'?'+kvp.join('&');
			return getURLWithoutQueryParams(url)
		}
	}
	return url;
}

//https://stackoverflow.com/questions/50036922/change-a-css-stylesheets-selectors-properties/50036923#50036923
function changeCSSStyle(selector, cssProp, cssVal) {
	var ssMain = 0;  //The first stylesheet
	var cssRules = (document.all) ? 'rules': 'cssRules';

	for (var i=0, len=document.styleSheets[ssMain][cssRules].length; i<len; i++) {
		if (document.styleSheets[ssMain][cssRules][i].selectorText === selector) {
			document.styleSheets[ssMain][cssRules][i].style[cssProp] = cssVal;
			return;
		}
	}
}

//Returns the protocol of a URL without the double slash
function getProtocol(s){
	var pos_barrabarra;
	if (-1!=(pos_barrabarra=s.indexOf("://")))
		return s.substring(0, pos_barrabarra+1);
	return "";
}

var IdGPSPosition=0;
function InitGPSPosition() {
	if (navigator.geolocation)
		IdGPSPosition=navigator.geolocation.watchPosition(UpdateGPSPosition, ErrorGPSPosition, {enableHighAccuracy: true, maximumAge: 8000});
	else
	{
		showInfoMessage("Geolocation not supported by the web browser");
		CancelGPSPosition();
	}
}

var PreviousGPSPoint=null;

function CancelGPSPosition() {
	if (IdGPSPosition) {
		navigator.geolocation.clearWatch(IdGPSPosition);
		IdGPSPosition=0;
	}
	PreviousGPSPoint=null;
}

var GPSPositionReported=false;
function UpdateGPSPosition(position) {
	PreviousGPSPoint={long: position.coords.longitude, lat: position.coords.latitude};
	if (!GPSPositionReported)
	{
		showInfoMessage("Geolocation is long: " + PreviousGPSPoint.long + " lat: " + PreviousGPSPoint.lat);
		GPSPositionReported=true;
	}
}

function ErrorGPSPosition(error) {
	switch(error.code) {
		case error.PERMISSION_DENIED:
			showInfoMessage("User denied request location.");
			CancelGPSPosition();
			break;
		case error.POSITION_UNAVAILABLE:
			showInfoMessage("Location information is unavailable.");
			CancelGPSPosition();
			break;
		case error.TIMEOUT:
			showInfoMessage("Request location timeOut.");
			CancelGPSPosition();
			break;
		case error.UNKNOWN_ERROR:
		default:
			showInfoMessage("Unknown error obtaining Location (" + error.code + ").");
			break;
	}
}

var currentNode=null, connectionInProcess=false, startingNodeContextId=null, startingEdgeContextId=null;

function StartSTAPage() {

	var s_protocol=getProtocol(location.href);

	if (s_protocol && s_protocol.toLowerCase()!="https:")
		location.replace("https:" + location.href.substring(s_protocol.length));

	//document.getElementById("UserInfoText").innerHTML="";
	network=new vis.Network(document.getElementById("mynetwork"), {
		nodes: networkNodes,
		edges: networkEdges
	}, networkOptions);
	setEventFunctionsNetwork();
	PrepareTextAreaCalculator();

	hello.init({"authenix": "662eb5eb-e706-40a4-baf8-51016fec5a05"}, {redirect_uri: ((location.pathname.charAt(location.pathname.length-1)=='/') ? location.pathname.substring(0, location.pathname.length-1) : location.pathname)});

	UpdateConfiguration();

	InitSTAPage();  //promise
}

function PlaceButtonsSTAEntities() {
	var s = "";
	if (!document.getElementById("DialogConfigurationOnlyStartNodeButtons").checked) {
		for (var i = 0; i < ServicesAndAPIsArray.length; i++)
			s += textOperationButton(null, "", ServicesAndAPIsArray[i], ServicesAndAPIs[ServicesAndAPIsArray[i]].name, ServicesAndAPIs[ServicesAndAPIsArray[i]].description, ServicesAndAPIs[ServicesAndAPIsArray[i]].help);
		s += "<br>";
		for (var i = 0; i < STAEntitiesArray.length; i++)
			s += textOperationButton(null, "", STAEntitiesArray[i], STAEntitiesArray[i], STAEntitiesArray[i], STAEntities[STAEntitiesArray[i]].help);
		s += "<br>";
		/*for (var i = 0; i < STAEntitiesArray.length; i++)
			s += textOperationButton(null, "", STAEntities[STAEntitiesArray[i]].singular, STAEntities[STAEntitiesArray[i]].singular, STAEntities[STAEntitiesArray[i]].singular, STAEntities[STAEntitiesArray[i]].helpEdit);
		s += "<br>";*/
		for (var i = 0; i < STASpecialQueriesArray.length; i++)
			s += textOperationButton(null, "", STASpecialQueriesArray[i], STASpecialQueriesArray[i], STASpecialQueries[STASpecialQueriesArray[i]].description, STASpecialQueries[STASpecialQueriesArray[i]].help);
		s += "<br>";
	}

	for (var i = 0; i < STAOperationsArray.length; i++) {
		if (!document.getElementById("DialogConfigurationOnlyStartNodeButtons").checked || STAOperations[STAOperationsArray[i]].startNode)
			s += textOperationButton(null, "", STAOperationsArray[i], STAOperations[STAOperationsArray[i]].description, STAOperations[STAOperationsArray[i]].description, STAOperations[STAOperationsArray[i]].help);
	}
	s += "<br>";
	for (var i = 0; i < TableOperationsArray.length; i++) {
		if (!document.getElementById("DialogConfigurationOnlyStartNodeButtons").checked || TableOperations[TableOperationsArray[i]].startNode)
			s += textOperationButton(null, "", TableOperationsArray[i], TableOperations[TableOperationsArray[i]].description, TableOperations[TableOperationsArray[i]].description, TableOperations[TableOperationsArray[i]].help);
	}
	if (!document.getElementById("DialogConfigurationOnlyStartNodeButtons").checked)
		s += "<br>";

	document.getElementById("ButtonsSTAEntities").innerHTML = s;
}

var timeoutHelpToolTip=null;

function timeoutShowHelpToolTip(div) {
	div.style.display="block";
	timeoutHelpToolTip=null;
}

function showHelpToolTip(event, prefix, text) {
	var div=document.getElementById(prefix+"HelpToolTip");
	div.innerHTML=text;
	moveHelpToolTip(event, prefix);
	timeoutHelpToolTip=setTimeout(timeoutShowHelpToolTip, 1000, div);
	return false;
}

function moveHelpToolTip(event, prefix) {
	var div=document.getElementById(prefix+"HelpToolTip");
	div.style.left=(event.clientX+2) + "px";
	div.style.top=(event.clientY-div.offsetHeight+2) + "px";
	return false;
}

function hideHelpToolTip(event, prefix) {
	document.getElementById(prefix+"HelpToolTip").style.display="none";
	if (timeoutHelpToolTip) {
		clearTimeout(timeoutHelpToolTip);
		timeoutHelpToolTip=null;
	}
	return false;
}

function textOperationButton(parentDivId, prefixDivId, operation, name, description, help) {
	var s = "<button ";
	if (help)
		s+="onmouseover='showHelpToolTip(event, \"" + (prefixDivId ? prefixDivId : "") +"\", \"" + help +"\")' onmousemove='moveHelpToolTip(event, \"" + (prefixDivId ? prefixDivId : "") +"\")' onmouseout='hideHelpToolTip(event, \"" + (prefixDivId ? prefixDivId : "") +"\")' "
	return s + "onclick='addCircularImage(" + (parentDivId ? "event" : "null") + ", "+ (parentDivId ? ("\""+parentDivId+"\"") : "null") +", \"" + name + "\", \"" + operation + ".png\");'><img src='" + operation + ".png' height='20' valign='middle'> " + description + "</button> ";
}

async function InitSTAPage() {
	var response=await HTTPJSONData("config.json");
	const nCol=4;
	config=(response && response.obj) ? response.obj : null;
	if (!config)
	{
		showInfoMessage("Error loading \'config.json\'");
		return;
	}
	
	PlaceButtonsSTAEntities();
	var s = "Data Inputs:<br>";
	for (var i = 0; i < ServicesAndAPIsArray.length; i++) {
		s += textOperationButton("DialogContextMenu", "ContextMenu", ServicesAndAPIsArray[i], ServicesAndAPIs[ServicesAndAPIsArray[i]].name, ServicesAndAPIs[ServicesAndAPIsArray[i]].description, ServicesAndAPIs[ServicesAndAPIsArray[i]].help);
		s += (i+1)%nCol==0 || i == ServicesAndAPIsArray.length-1 ? "<br>" : " ";
	}
	s += "<small><br></small>Read STA entities:<br>";
	for (var i = 0; i < STAEntitiesArray.length; i++) {
		s += textOperationButton("DialogContextMenu", "ContextMenu", STAEntitiesArray[i], STAEntitiesArray[i], STAEntitiesArray[i], STAEntities[STAEntitiesArray[i]].help);
		s += (i+1)%nCol==0 || i == STAEntitiesArray.length-1 ? "<br>" : " ";
	}
	s += "<small><br></small>Create, edit or delete STA entities:<br>";
	for (var i = 0; i < STAEntitiesArray.length; i++)
	{
		s += textOperationButton("DialogContextMenu", "ContextMenu", STAEntities[STAEntitiesArray[i]].singular, STAEntities[STAEntitiesArray[i]].singular, STAEntities[STAEntitiesArray[i]].singular, STAEntities[STAEntitiesArray[i]].helpEdit);
		s += (i+1)%nCol==0 || i == STAEntitiesArray.length-1 ? "<br>" : " ";
	}
	s += "<small><br></small>Complex queries:<br>";
	for (var i = 0; i < STASpecialQueriesArray.length; i++)
	{
		s += textOperationButton("DialogContextMenu", "ContextMenu", STASpecialQueriesArray[i], STASpecialQueriesArray[i], STASpecialQueries[STASpecialQueriesArray[i]].description, STASpecialQueries[STASpecialQueriesArray[i]].help);
		s += (i+1)%nCol==0 || i == STASpecialQueriesArray.length-1 ? "<br>" : " ";
	}
	s += "<small><br></small>STA tools:<br>";
	for (var i = 0; i < STAOperationsArray.length; i++)
	{
		s += textOperationButton("DialogContextMenu", "ContextMenu", STAOperationsArray[i], STAOperations[STAOperationsArray[i]].description, STAOperations[STAOperationsArray[i]].description, STAOperations[STAOperationsArray[i]].help);
		s += (i+1)%nCol==0 || i == STAOperationsArray.length-1 ? "<br>" : " ";
	}
	s += "<small><br></small>Table tools:<br>";
	for (var i = 0; i < TableOperationsArray.length; i++)
	{
		s += textOperationButton("DialogContextMenu", "ContextMenu", TableOperationsArray[i], TableOperations[TableOperationsArray[i]].description, TableOperations[TableOperationsArray[i]].description, TableOperations[TableOperationsArray[i]].help);
		s += (i+1)%nCol==0 || i == TableOperationsArray.length-1 ? "<br>" : " ";
	}

	document.getElementById("ButtonsContextMenuObjects").innerHTML = s;

	window.addEventListener("message", ProcessMessageFromMiraMonMapBrowser);
	if (window.opener)
		window.opener.postMessage(JSON.stringify({msg: "Tapis is listening"}), "*");
}

function removeParamContentType(contentType) {
	if (!contentType)
		return contentType;
	var i=contentType.indexOf(';')
	if (i<0)
		return contentType;
	else
		return contentType.substring(0, i);
}

var CriptoName=null, DisplayName="";
function AddHeadersIfNeeded(options) {
	if (CriptoName &&
		hello("authenix").getAuthResponse() &&
		hello("authenix").getAuthResponse().access_token) {
		if (!options.headers)
			options.headers={};
		options.headers['Authorization']='Bearer ' + hello("authenix").getAuthResponse().access_token;
	}
	if (PreviousGPSPoint)
	{
		if (!options.headers)
			options.headers={};
		options.headers['Geolocation']='geo:' + PreviousGPSPoint.lat + ',' + PreviousGPSPoint.long;
	}
}

//'type' is optional
function getLinkRelInLinks(links, rel, type) {
	if (!links)
		return null;
	for (var i=0; i<links.length; i++) {
		var link=links[i];
		if (link?.rel==rel){
			if (!link.type || !type || link.type==type)
				return link.href;
		}
	}
	return null;
}

function simplifyOGCAPICollections(collections){
	var simpleCollecs=[], len=collections.length ? collections.length : 1;
	for (var i=0; i<len; i++) {
		var collection=collections.length ? collections[i] : collections;
		simpleCollecs.push({id: collection?.id,
				title: collection?.title,
				link: getLinkRelInLinks(collection?.links, "self", "application/json"),
				extent: collection?.extent,
				itemType: collection?.itemType,
					storageCrs: collection?.storageCrs,
				defaultStyle: collection?.defaultStyle});
	}
	return simpleCollecs;
}

function addOnlinesDigitalTransferOption(simpleUrlRecords, digitalTransfer, id, title, schema, bbox) {
	if (!digitalTransfer || !digitalTransfer['gmd:onLine'])
		return;
	var ol_len=(typeof digitalTransfer['gmd:onLine'].length==="undefined") ? 1 : digitalTransfer['gmd:onLine'].length;
	for (var ol=0; ol<ol_len; ol++) {
		var online=(typeof digitalTransfer['gmd:onLine'].length==="undefined") ? digitalTransfer['gmd:onLine']['gmd:CI_OnlineResource'] : digitalTransfer['gmd:onLine'][ol]['gmd:CI_OnlineResource'];
		if (!online['gmd:linkage'] || !online['gmd:linkage']['gmd:URL'])
			continue;
		simpleUrlRecords.push({
			id: id,
			title: title,
			dataURL: online['gmd:linkage']['gmd:URL'],
			schemaURL: schema});
		if (online['gmd:name'] && online['gmd:name']['gco:CharacterString'])
			simpleUrlRecords[simpleUrlRecords.length-1].distribution=online['gmd:name']['gco:CharacterString'];
		if (bbox.length)
			simpleUrlRecords[simpleUrlRecords.length-1].extent=bbox;
	}
}

function getSimplifyOGCCSWRecord(metadatas){
	var simpleUrlRecords=[], id, title, bbox, schema;
	for (var i=0; i<metadatas.length; i++)
	{
		var metadata=metadatas[i];
		if (!metadata || !metadata['gmd:distributionInfo'])
			continue;
		id=""
		if (metadata['gmd:fileIdentifier'] && metadata['gmd:fileIdentifier']['gco:CharacterString'])
			id=metadata['gmd:fileIdentifier']['gco:CharacterString'];
		title="";
		schema="";
		bbox=[];
		if (metadata['gmd:identificationInfo']) {
			var identification=(typeof metadata['gmd:identificationInfo'].length==="undefined") ? (metadata['gmd:identificationInfo']['gmd:MD_DataIdentification'] ? metadata['gmd:identificationInfo']['gmd:MD_DataIdentification'] : metadata['gmd:identificationInfo']['srv:SV_ServiceIdentification']) : (metadata['gmd:identificationInfo'][0]['gmd:MD_DataIdentification'] ? metadata['gmd:identificationInfo'][0]['gmd:MD_DataIdentification'] : metadata['gmd:identificationInfo'][0]['srv:SV_ServiceIdentification']);
			if (identification && identification['gmd:citation']) {	
				var citation=identification['gmd:citation']['gmd:CI_Citation'];
				if (citation && citation['gmd:title']['gco:CharacterString'])
					title=citation['gmd:title']['gco:CharacterString'];
			}
			//Detemine the extent
			if (identification && (identification['srv:extent'] || identification['gmd:extent'])) {
				var extents=identification['srv:extent'] ? identification['srv:extent'] : identification['gmd:extent'];
				var ex_len=(typeof extents.length==="undefined") ? 1 : extents.length; 
				for (var ex=0; ex<ex_len; ex++) {
					var extent=(typeof extents.length==="undefined") ? extents['gmd:EX_Extent'] : extents[ex]['gmd:EX_Extent'];
					if (extent && extent['gmd:geographicElement']) {
						var ge_len=(typeof extent['gmd:geographicElement'].length==="undefined") ? 1 : extent['gmd:geographicElement'].length; 
						for (var ge=0; ge<ge_len; ge++) {
							var gbb=(typeof extent['gmd:geographicElement'].length==="undefined") ? extent['gmd:geographicElement']['gmd:EX_GeographicBoundingBox'] : extent['gmd:geographicElement'][ge]['gmd:EX_GeographicBoundingBox'];
							if (gbb) {
								var n=0;
								if (gbb['gmd:westBoundLongitude'] && gbb['gmd:westBoundLongitude']['gco:Decimal']) {
									bbox.push(parseFloat(gbb['gmd:westBoundLongitude']['gco:Decimal']));
									n++;
								}
								if (gbb['gmd:southBoundLatitude'] && gbb['gmd:southBoundLatitude']['gco:Decimal']) {
									bbox.push(parseFloat(gbb['gmd:southBoundLatitude']['gco:Decimal']));
									n++;
								}
								if (gbb['gmd:eastBoundLongitude'] && gbb['gmd:eastBoundLongitude']['gco:Decimal']) {
									bbox.push(parseFloat(gbb['gmd:eastBoundLongitude']['gco:Decimal']));
									n++;
								}
								if (gbb['gmd:northBoundLatitude'] && gbb['gmd:northBoundLatitude']['gco:Decimal']) {
									bbox.push(parseFloat(gbb['gmd:northBoundLatitude']['gco:Decimal']));
									n++;
								}
								if (n!=4)
									bbox=[];
							}
						}
					}
				}
			}
		}
		if (metadata['gmd:applicationSchemaInfo']) {
			var asi_len=(typeof metadata['gmd:applicationSchemaInfo'].length==="undefined") ? 1 : metadata['gmd:applicationSchemaInfo'].length;
			for (var asi=0; asi<asi_len; asi++) {
				var appSchemaInfo=(typeof metadata['gmd:applicationSchemaInfo'].length==="undefined") ? metadata['gmd:applicationSchemaInfo']['gmd:MD_ApplicationSchemaInformation'] : metadata['gmd:applicationSchemaInfo'][asi]['gmd:MD_ApplicationSchemaInformation'];
				if (appSchemaInfo['gmd:schemaLanguage'] && appSchemaInfo['gmd:schemaLanguage']['gco:CharacterString'].toLowerCase()=="json" && 
					appSchemaInfo['gmd:constraintLanguage'] && appSchemaInfo['gmd:constraintLanguage']['gco:CharacterString'].toLowerCase()=="csvw")
				{
					if (appSchemaInfo['gmd:name']['gmd:CI_Citation']['gmd:title'] && appSchemaInfo['gmd:name']['gmd:CI_Citation']['gmd:title']['gmx:Anchor'] && appSchemaInfo['gmd:name']['gmd:CI_Citation']['gmd:title']['gmx:Anchor']['@xlink:href']) {
						schema=appSchemaInfo['gmd:name']['gmd:CI_Citation']['gmd:title']['gmx:Anchor']['@xlink:href'];
						break;
					}
				}
			}
		}

		//There can be many online resources. For each online resource, a record is create.
		var d_len=(typeof metadata['gmd:distributionInfo'].length==="undefined") ? 1 : metadata['gmd:distributionInfo'].length
		for (var d=0; d<d_len; d++) {
			var distribution=(typeof metadata['gmd:distributionInfo'].length==="undefined") ? metadata['gmd:distributionInfo']['gmd:MD_Distribution'] : metadata['gmd:distributionInfo'][d]['gmd:MD_Distribution'];
			if (!distribution)
				continue;
			if (distribution['gmd:transferOptions']) {
				var dt_len=(typeof distribution['gmd:transferOptions'].length==="undefined") ? 1 : distribution['gmd:transferOptions'].length; 
			for (var dt=0; dt<dt_len; dt++) {
					addOnlinesDigitalTransferOption(simpleUrlRecords, 
							(typeof distribution['gmd:transferOptions'].length==="undefined") ? distribution['gmd:transferOptions']['gmd:MD_DigitalTransferOptions'] : distribution['gmd:transferOptions'][dt]['gmd:MD_DigitalTransferOptions'], 
							id, title, schema, bbox);
				}
			}
			if (distribution['gmd:distributor']) {
				var dtor_len=(typeof distribution['gmd:distributor'].length==="undefined") ? 1 : distribution['gmd:distributor'].length;
				for (var dtor=0; dtor<dtor_len; dtor++) {
					var distributor=(typeof distribution['gmd:distributor'].length==="undefined") ? distribution['gmd:distributor']['gmd:MD_Distributor'] : distribution['gmd:distributor'][dtor]['gmd:MD_Distributor'];
					if (!distributor)
						continue;
					if (distributor['gmd:distributorTransferOptions']) {
						var dt_len=(typeof distributor['gmd:distributorTransferOptions'].length==="undefined") ? 1 : distributor['gmd:distributorTransferOptions'].length; 
						for (var dt=0; dt<dt_len; dt++) {
							addOnlinesDigitalTransferOption(simpleUrlRecords, 
									(typeof distributor['gmd:distributorTransferOptions'].length==="undefined") ? distributor['gmd:distributorTransferOptions']['gmd:MD_DigitalTransferOptions'] : distributor['gmd:distributorTransferOptions'][dt]['gmd:MD_DigitalTransferOptions'], 
									id, title, schema, bbox);
						}
					}
				}
			}
		}
	}
	return simpleUrlRecords; 
}

async function getSimplifyGUFRecord(metadata){
	var simpleUrlRecord={
			id: metadata['id'],
			title: metadata['title'],
			updated: metadata['updated']};
	var response=await HTTPJSONData(metadata['link']['@href']);
	var wpsexecute=(response && response.text) ? response.text : null;
	if (!wpsexecute) {
		showInfoMessage("Error retrieving "+metadata['link']['@href']);
		return simpleUrlRecord;
	}
	var wpsex=JSON.parse(xml2json(parseXml(wpsexecute), false, null));
	if (!wpsex || !wpsex['wps:ExecuteResponse'] || !wpsex['wps:ExecuteResponse']['wps:ProcessOutputs'] || !wpsex['wps:ExecuteResponse']['wps:ProcessOutputs']['wps:Output'] || !wpsex['wps:ExecuteResponse']['wps:ProcessOutputs']['wps:Output'].length) {
		showInfoMessage("Error retrieving "+metadata['link']['@href']);
		return simpleUrlRecord;
	}
	var outp=wpsex['wps:ExecuteResponse']['wps:ProcessOutputs']['wps:Output'][wpsex['wps:ExecuteResponse']['wps:ProcessOutputs']['wps:Output'].length-1]
	if (!outp || !outp['wps:Data'] || !outp['wps:Data']['wps:ComplexData'] || !outp['wps:Data']['wps:ComplexData']['guf:GUF_FeedbackItem']) {
		showInfoMessage("Error retrieving "+metadata['link']['@href']);
		return simpleUrlRecord;
	}
	var feedbackItem=outp['wps:Data']['wps:ComplexData']['guf:GUF_FeedbackItem'];
	if (feedbackItem['guf:abstract'] && feedbackItem['guf:abstract']['gco:CharacterString'])
		simpleUrlRecord.abstract=feedbackItem['guf:abstract']['gco:CharacterString'];
	if (feedbackItem['guf:contact'] && 
		feedbackItem['guf:contact']['guf:GUF_UserInformation'] && 
		feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails'] && 
		feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails']['cit:CI_Individual'] && 
		feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails']['cit:CI_Individual']['cit:partyIdentifier'] && 
		feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails']['cit:CI_Individual']['cit:partyIdentifier']['mcc:MD_Identifier'] &&
		feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails']['cit:CI_Individual']['cit:partyIdentifier']['mcc:MD_Identifier']['mcc:description'] &&
		feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails']['cit:CI_Individual']['cit:partyIdentifier']['mcc:MD_Identifier']['mcc:description']['gco:CharacterString'])
		simpleUrlRecord.owner=feedbackItem['guf:contact']['guf:GUF_UserInformation']['guf:userDetails']['cit:CI_Individual']['cit:partyIdentifier']['mcc:MD_Identifier']['mcc:description']['gco:CharacterString']
	if (feedbackItem['guf:rating'] && 
		feedbackItem['guf:rating']['guf:GUF_Rating'] && 
		feedbackItem['guf:rating']['guf:GUF_Rating']['guf:rating'] && 
		feedbackItem['guf:rating']['guf:GUF_Rating']['guf:rating']['guf:GUF_RatingCode'] && 
		feedbackItem['guf:rating']['guf:GUF_Rating']['guf:rating']['guf:GUF_RatingCode']['@codeListValue'])
		simpleUrlRecord.rating=feedbackItem['guf:rating']['guf:GUF_Rating']['guf:rating']['guf:GUF_RatingCode']['@codeListValue'];
	if (feedbackItem['guf:userComment'] && 
		feedbackItem['guf:userComment']['guf:GUF_UserComment'] && 
		feedbackItem['guf:userComment']['guf:GUF_UserComment']['guf:comment'] && 
		feedbackItem['guf:userComment']['guf:GUF_UserComment']['guf:comment']['gco:CharacterString']) 
		simpleUrlRecord.comment=feedbackItem['guf:userComment']['guf:GUF_UserComment']['guf:comment']['gco:CharacterString'];
	return simpleUrlRecord;
}

async function getSimplifyGUFRecords(metadatas){
	var simpleUrlRecords=[], id, title;
	if (!metadatas)
		return null;
	if (metadatas.length) {
		for (var i=0; i<metadatas.length; i++) {
			var metadata=metadatas[i];
			if (!metadata)
				continue;
			simpleUrlRecords.push(await getSimplifyGUFRecord(metadata));
		}
	} else 
		simpleUrlRecords.push(await getSimplifyGUFRecord(metadatas));
	return simpleUrlRecords;
}

function standardStatusText(status){
	switch (status){
		case 400:
			return "Bad Request. The request cannot be fulfilled due to bad syntax.";
		case 401: 
			return "Unauthorized. The request was a legal request, but the server is refusing to respond to it. Please authenticate using the Login button and try again.";
		case 403:
			return "Forbidden. The request was a legal request, but the server is refusing to respond to it.";
		case 404: 
			return "Not Found. The requested page could not be found but may be available again in the future.";
		case 405: 
			return "Method Not Allowed. A request was made of a page using a request method not supported by that page.";
		case 406: 
			return "Not Acceptable. The server can only generate a response that is not accepted by the client.";
		case 407: 
			return "Proxy Authentication Required. The client must first authenticate itself with the proxy.";
		case 408: 
			return "Request Timeout. The server timed out waiting for the request.";
		case 409: 
			return "Conflict. The request could not be completed because of a conflict in the request.";
		case 410: 
			return "Gone. The requested page is no longer available.";
		case 411: 
			return "Length Required. The \"Content-Length\" is not defined. The server will not accept the request without it.";
		case 412: 
			return "Precondition Failed. The precondition given in the request evaluated to false by the server.";
		case 413: 
			return "Request Too Large. The server will not accept the request, because the request entity is too large.";
		case 414: 
			return "Request-URI Too Long. The server will not accept the request, because the URI is too long. Occurs when you convert a POST request to a GET request with a long query information.";
		case 415: 
			return "Unsupported Media Type	The server will not accept the request, because the media type is not supported."; 
		case 416: 
			return "Range Not Satisfiable. The client has asked for a portion of the file, but the server cannot supply that portion.";
		case 417: 
			return "Expectation Failed.";
		default:
			return "";
	}
}

//https://web.dev/fetch-api-error-handling/
//Despite the name of the function, it can also be used for retrieving non-json files.
//In fact, the response is an object with the following members: obj (only if the response is application/json), text: (only if the response is not application/json), responseHeaders: (only the ones listed in headersToGet), ok (always true);
//To do GET it can be used with the first parameter only or with method=null.
//It requests JSON content in 'Accept' by default. If you use headersToSend to specify headers then there is no default 'Accept' and you may specify it. headersToSend is an object like this: {'Accept': '*/*', 'Authorization': "XXX"}
//objToSend is a JavaScript object that will be stringify into JSON text and send as the body of the HTTP request.
//headersToGet is an array of header names that will be part of the response.
async function HTTPJSONData(url, headersToGet, method, objToSend, headersToSend) {
	var response, jsonData, options={};
	try {
		if (method)
			options.method=method;
		
		if (headersToSend)
			options.headers=headersToSend;
		else
			options.headers={'Accept': 'application/json, */*;q=0.8'};

		AddHeadersIfNeeded(options);
		if (objToSend)
		{
			options.headers['Content-Type']='application/json';
			options.body=JSON.stringify(objToSend);
		}
		response = await fetch(url, options);
	}
	catch (error) {
		showInfoMessage('There was an error with ' + url + ": " + error.message);
		console.log('There was an error', error);
		return;
	}
	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		var body;
		if ((removeParamContentType(response.headers.get('Content-Type'))=="application/json" || removeParamContentType(response.headers.get('Content-Type'))=="application/ld+json") &&
			(response.headers.get('Content-Length')==null || parseInt(response.headers.get('Content-Length'))>0)) {
			body=await response.json();
			body=JSON.stringify(body);
		}
		else
			body=await response.text();
		showInfoMessage("Error: HTTP " + (method ? method : "GET") + " URL: " + url + ", HTTP code: " + response?.status + ", Description: "+ (response.statusText ? response.statusText : standardStatusText(response.status)) + (body ? ", " + body : ""));
		console.log("HTTP Response Code: " + response?.status + ": " + response?.statusText + (body ? JSON.stringify(body) : ""));
		return response;
	}
	try {
		var headersObj={};
		if (headersToGet)
		{
			for (var i=0; i<headersToGet.length; i++)
				headersObj[headersToGet[i]]=response.headers.get(headersToGet[i]);
			//Enumetates all headers: for(let entry of response.headers.entries()) console.log(entry) })
		}
		if ((removeParamContentType(response.headers.get('Content-Type'))=="application/json" || removeParamContentType(response.headers.get('Content-Type'))=="application/ld+json") &&
		(response.headers.get('Content-Length')==null || parseInt(response.headers.get('Content-Length'))>0))
			return {obj: await response.json(), text: null, responseHeaders: headersObj, ok: true};
		else
			return {obj: null, text: await response.text(), responseHeaders: headersObj, ok: true};
	} catch (error) {
		if (error instanceof SyntaxError) {
			showInfoMessage('Syntax error reading ' + url + ": " + error.message);
			console.log('There was a SyntaxError', error);
			return;
		}
		else {
			showInfoMessage('Error interpreting ' + url + ": " + error.message);
			console.log('There was an error', error);
			return;
		}
	}
}

async function HTTPBinaryData(url) {
	var response, jsonData, options={};
	try {
		response = await fetch(url, options);
	}
	catch (error) {
		showInfoMessage('There was an error with ' + url + ": " + error.message);
		console.log('There was an error', error);
		return;
	}
	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		var body;
		if ((removeParamContentType(response.headers.get('Content-Type'))=="application/json" || removeParamContentType(response.headers.get('Content-Type'))=="application/ld+json") &&
			(response.headers.get('Content-Length')==null || parseInt(response.headers.get('Content-Length'))>0)) {
			body=await response.json();
			body=JSON.stringify(body);
		}
		else
			body=await response.text();
		showInfoMessage("Error: HTTP " + (method ? method : "GET") + " URL: " + url + ", HTTP code: " + response?.status + ", Description: "+ (response.statusText ? response.statusText : standardStatusText(response.status)) + (body ? ", " + body : ""));
		console.log("HTTP Response Code: " + response?.status + ": " + response?.statusText + (body ? JSON.stringify(body) : ""));
		return response;
	}
	try {
		return await response.arrayBuffer();
	} catch (error) {
		if (error instanceof SyntaxError) {
			showInfoMessage('Syntax error reading ' + url + ": " + error.message);
			console.log('There was a SyntaxError', error);
			return;
		}
		else {
			showInfoMessage('Error interpreting ' + url + ": " + error.message);
			console.log('There was an error', error);
			return;
		}
	}
}


function updateQueryAndTableArea(node) {
	var nodeId = network.getSelectedNodes();
	for (var i=0; i<nodeId.length; i++) {
		if (nodeId[i]==node.id) {
			ShowQueryNode(node);
			ShowTableNode(node);
		}
	}
}

async function LoadJSONNodeSTAData(node, callback, url) {
	var response, jsonData, options={};
	try {
		var url_fetch;
		if (url)
			url_fetch=url;
		else if (typeof node.STAExpectedLength==="undefined" || node?.OGCType == "OGCAPIcollection")
			url_fetch=node.STAURL;
		else
			url_fetch=AddQueryParamsToURL(node.STAURL, ((node.OGCType == "OGCAPIcollections" || node.OGCType == "OGCAPIitems") ? "limit=" : ((node.OGCType == "GUF") ? "COUNT=" : "$top=")) + node.STAExpectedLength);

		AddHeadersIfNeeded(options);

		if (options.headers)
			response = await fetch(url_fetch, options);
		else
			response = await fetch(url_fetch);
	}
	catch (error) {
		showInfoMessage('There was an error with ' + node.STAURL + ": " + error.message);
		console.log('There was an error', error);
		node.STAdata = null;
		networkNodes.update(node);
		return;
	}
	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		showInfoMessage("HTTP Response Code: " + response?.status + " reading <small>" + node.STAURL + "</small>: " + response?.statusText);
		console.log("HTTP Response Code: " + response?.status + ": " + response?.statusText);
		node.STAdata = null;
		networkNodes.update(node);
		return;
	}
	try {
		if (node.OGCType=="OGCCSW" || node.OGCType=="GUF")
				jsonData = JSON.parse(xml2json(parseXml(await response.text()), false, null));
		else
			jsonData = await response.json();
	} catch (error) {
		if (error instanceof SyntaxError) {
			showInfoMessage('Syntax error reading ' + node.STAURL + ": " + error.message);
			console.log('There was a SyntaxError', error);
			node.STAdata = null;
			networkNodes.update(node);
			return;
		}
		else {
			showInfoMessage('Error interpreting ' + node.STAURL + ": " + error.message);
			console.log('There was an error', error);
			node.STAdata = null;
			networkNodes.update(node);
			return;
		}
	}
	if (url && typeof node.STAExpectedLength!=="undefined") {
		if (node.OGCType=="OGCAPIcollections")
			node.STAdata = node.STAdata.concat(simplifyOGCAPICollections(jsonData.collections));
		if (node.OGCType=="OGCAPIcollection")
			node.STAdata = node.STAdata.concat(simplifyOGCAPICollections(jsonData));
		else if (node.OGCType=="OGCAPIitems")
			node.STAdata = node.STAdata.concat(TransformGeoJSONToTable(jsonData));
		else if (node.OGCType=="OGCCSW")
			node.STAdata = node.STAdata.concat(getSimplifyOGCCSWRecord(jsonData['csw:GetRecordsResponse']['csw:SearchResults']['gmd:MD_Metadata']));
		else if (node.OGCType=="GUF")
			node.STAdata = node.STAdata.concat(await getSimplifyGUFRecords(jsonData['feed']['entry']));
		else
			node.STAdata = node.STAdata.concat(jsonData.value);
			
		if (node.STAdata.length>node.STAExpectedLength)  //too much data. Trucating
			node.STAdata.length=node.STAExpectedLength;
	} else { 
		var nextLink;
		if (node.OGCType=="OGCAPIcollections") {
			node.STAdata = (typeof jsonData.collections!=="undefined") ? simplifyOGCAPICollections(jsonData.collections) : [jsonData];
			nextLink = getLinkRelInLinks(jsonData["links"], "next", "application/json");
		} else if(node.OGCType=="OGCAPIcollection") {
			node.STAdata = simplifyOGCAPICollections(jsonData);
			//nextLink: This should be one object without "next".
		} else if (node.OGCType=="OGCAPIitems") {
			node.STAdata = (jsonData.type=="FeatureCollection") ? TransformGeoJSONToTable(jsonData) : [jsonData];
			nextLink = getLinkRelInLinks(jsonData["links"], "next", "application/geo+json");
		} else if(node.OGCType=="OGCAPIitem") {
			node.STAdata = (jsonData.type=="FeatureCollection") ? TransformGeoJSONToTable(jsonData) : [jsonData];
			//nextLink: This should be one object without "next".
		} else if (node.OGCType=="OGCCSW") {
			node.STAdata = getSimplifyOGCCSWRecord(jsonData['csw:GetRecordsResponse']['csw:SearchResults']['gmd:MD_Metadata']);
		} else if (node.OGCType=="GUF") {
			node.STAdata = await getSimplifyGUFRecords(jsonData['feed']['entry']);
		} else {
			node.STAdata = (typeof jsonData.value!=="undefined") ? jsonData.value : [jsonData];
			nextLink = jsonData["@iot.nextLink"];
		}
	}

	if (jsonData.value && node.STAExpectedLength && node.STAdata.length<node.STAExpectedLength && nextLink)
	{
		networkNodes.update(node);
		await LoadJSONNodeSTAData(node, callback, jsonData["@iot.nextLink"]);
	}
	else
	{
		if (node.image!="sta.png" && !node.OGCType && node.image!="staRoot.png")
		{
			node.STAdataAttributes=getDataAttributes(node.STAdata);
			addSemanticsSTADataAttributes(node.STAdataAttributes, node.STAURL);
		}
		networkNodes.update(node);
		if (currentNode.image!="FilterRowsByTime.png"){
			showInfoMessage("Completed."); 
		}
		updateQueryAndTableArea(node);
		await UpdateChildenLoadJSONCallback(node);
		if (callback)
			callback(node);  //The callback function is never used yet.
	}
}

var savedFile = null;

function MakeHrefData(data, mediatype)
{
	var blobData = new Blob([data], {type: mediatype});

	// If we are replacing a previously generated file we need to
	// manually revoke the object URL to avoid memory leaks.
	if (savedFile !== null)
		window.URL.revokeObjectURL(savedFile);

	savedFile = window.URL.createObjectURL(blobData);
	return savedFile;
}

//type should be "CSV", "DBF", "JSON", "JSONLD" or "GeoJSON"
function SelectImportFileSource(event, type) {
	if (document.getElementById("DialogImport"+type+"SourceFile").checked) {
		document.getElementById("DialogImport"+type+"SourceFileText").disabled=false;
		document.getElementById("DialogImport"+type+"SourceURLInput").disabled=true;
		document.getElementById("DialogImport"+type+"SourceURLButton").disabled=true;
	} else /*if (document.getElementById("DialogImport"+type+"SourceURL").checked)*/ {
		document.getElementById("DialogImport"+type+"SourceFileText").disabled=true;
		document.getElementById("DialogImport"+type+"SourceURLInput").disabled=false;
		document.getElementById("DialogImport"+type+"SourceURLButton").disabled=false;
	}
}

//type should be "CSV", "DBF", "JSON", "JSONLD" or "GeoJSON"
function SelectImportMeaningFileSource(event, type) {
	if (document.getElementById("DialogImportMeaning"+type+"SourceFile").checked) {
		document.getElementById("DialogImportMeaning"+type+"SourceFileText").disabled=false;
		document.getElementById("DialogImportMeaning"+type+"SourceURLInput").disabled=true;
		document.getElementById("DialogImportMeaning"+type+"SourceURLButton").disabled=true;
	} else if (document.getElementById("DialogImportMeaning"+type+"SourceURL").checked) {
		document.getElementById("DialogImportMeaning"+type+"SourceFileText").disabled=true;
		document.getElementById("DialogImportMeaning"+type+"SourceURLInput").disabled=false;
		document.getElementById("DialogImportMeaning"+type+"SourceURLButton").disabled=false;
	} else /*if (document.getElementById("DialogImportMeaning"+type+"SourceAuto").checked)*/ {
		document.getElementById("DialogImportMeaning"+type+"SourceFileText").disabled=true;
		document.getElementById("DialogImportMeaning"+type+"SourceURLInput").disabled=true;
		document.getElementById("DialogImportMeaning"+type+"SourceURLButton").disabled=true;
	}
}

function RetrieveMeaningTableCallback(usage_descr, params_function) {
	if (usage_descr.codeMediaType=="application/json" && usage_descr.schema==urlSchemaMeaning)
		params_function.node.STAdataAttributes=JSON.parse(usage_descr.code);  //The saved format is tha TAPIS internal format
	networkNodes.update(params_function.node);
	showInfoMessage("Meaning retrieved from NiMMbus.");
}

function RetrieveMeaningTable(event, type) {
	event.preventDefault(); // We don't want to submit this form
	if (document.getElementById("DialogImportMeaning"+type+"SourceAuto")?.checked && 
		document.getElementById("DialogImport"+type+"SourceURL").checked &&
		document.getElementById("DialogImport"+type+"SourceURLInput").value) {
		var urlCSV=document.getElementById("DialogImport"+type+"SourceURLInput").value
		GUFLoadLastPreviousReproducibleUsageCode(getFileName(urlCSV),
			getAddressPath(getAbsoluteURL(urlCSV)), 
			{ru_platform: "https://github.com/joanma747/TAPIS", 
			ru_version: 0.9
			//ru_schema: urlSchemaMeaning
		}, "eng", null, RetrieveMeaningTableCallback, {node: currentNode});
	}
	UpdateChildenTable(currentNode);
	if (!currentNode.STAdata) {
		if (confirm("No data has been loaded. Do you want to close this window anyway?"))
			document.getElementById("DialogImport"+type).close();
	}
	else{
		currentNode.STAdataAttributes= getDataAttributes(currentNode.STAdata); //It is necessary when you load new csv, because it remember dataAttributes from old csv
		networkNodes.update(currentNode)
		document.getElementById("DialogImport"+type).close();
	}
		
}

function TransformTextCSVWToDataAttributes(csvwText)
{
	var data_csvw=JSON.parse(csvwText);
	currentNode.STAdataAttributes=getDataAttributesCSVW(data_csvw);
	networkNodes.update(currentNode);
	UpdateChildenTable(currentNode);
	var csvReadParams = getCSVReadParams(data_csvw);
	if (csvReadParams.delimiter) {
		document.getElementById("DialogImportCSVDelimiterAuto").checked=false;
		if ( csvReadParams.delimiter=='\t') {
			document.getElementById("DialogImportCSVDelimiter").value="";
			document.getElementById("DialogImportCSVDelimiterTab").checked=true;
			document.getElementById("DialogImportCSVDelimiterText").checked=false;
		} else {
			document.getElementById("DialogImportCSVDelimiter").value=csvReadParams.delimiter;
			document.getElementById("DialogImportCSVDelimiterTab").checked=false;
			document.getElementById("DialogImportCSVDelimiterText").checked=true;
		}
	} else {
		document.getElementById("DialogImportCSVDelimiterAuto").checked=true; 
		document.getElementById("DialogImportCSVDelimiterText").checked=false;
		document.getElementById("DialogImportCSVDelimiterTab").checked=false;
		document.getElementById("DialogImportCSVDelimiter").value=="";
	}
	if (csvReadParams.header)
		document.getElementById("DialogImportCSVHeader").checked=csvReadParams.header;
	if (csvReadParams.dynamicTyping)
		document.getElementById("DialogImportCSVStringTyping").checked=csvReadParams.dynamicTyping ? false : true;
}

function ReadFileImportCSVW(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		//Transform the JSON text into a STAdataAttributes structure in memory
		try
		{
			TransformTextCSVWToDataAttributes(reader.result);
		}
		catch (e) 
		{
			showInfoMessage("JSON message parse error: " + e + " The file content is:\n" + reader.result);
			currentNode.STAdataAttributes=null;
			networkNodes.update(currentNode);
			return;
		}
	};
	reader.readAsText(input.files[0]);
}

function ReadURLImportCSVW() {
	HTTPJSONData(document.getElementById("DialogImportMeaningCSVSourceURLInput").value).then(
				function(value) { 
					showInfoMessage('Download CSVW completed.'); 
					TransformTextCSVWToDataAttributes(value.text);
				},
				function(error) { 
					showInfoMessage('Error downloading CSVW. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}


function TransformTextGeoJSONSchemaToDataAttributes(jsonText)
{
	return getDataAttributesGeoJSONSchema(JSON.parse(jsonText));
}

function ReadFileImportGeoJSONSchema(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		//Transform the JSON text into a STAdataAttributes structure in memory
		try
		{
			currentNode.STAdataAttributes=TransformTextGeoJSONSchemaToDataAttributes(reader.result);
			networkNodes.update(currentNode);
			UpdateChildenTable(currentNode);
		}
		catch (e) 
		{
			showInfoMessage("JSON message parse error: " + e + " The file content is:\n" + reader.result);
			currentNode.STAdataAttributes=null;
			networkNodes.update(currentNode);
			return;
		}
	};
	reader.readAsText(input.files[0]);
}

function ReadURLImportGeoJSONSchema() {
	HTTPJSONData(document.getElementById("DialogImportMeaningGeoJSONSourceURLInput").value).then(
				function(value) { 
					showInfoMessage('Download GeoJSON schema completed.'); 
					currentNode.STAdataAttributes=TransformTextGeoJSONSchemaToDataAttributes(value.text);
					networkNodes.update(currentNode);
					UpdateChildenTable(currentNode);
				},
				function(error) { 
					showInfoMessage('Error downloading GeoJSON Schema. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function TransformDatesToISO(data) {
	var record, s;
	for (var r=0; r<data.length; r++) {
		record=data[r];
		var keys = Object.keys(data[r]);
		for (var k = 0; k < keys.length; k++) {
			if (record[keys[k]]===null) {
				delete record[keys[k]];
				continue;
			}
			if (record[keys[k]] && record[keys[k]].getMonth && record[keys[k]].toISOString) {
				s=record[keys[k]].toISOString();
				if (s.length==24 && s.endsWith(".000Z"))
					record[keys[k]]=s.substring(0,19)+"Z";
				else
					record[keys[k]]=s;
			}
		}
	}
}

function TransformTextCSVToTable(csvText, url) {
	try
	{
		var result = Papa.parse(csvText, {delimiter: (document.getElementById("DialogImportCSVDelimiterAuto").checked ? null : (document.getElementById("DialogImportCSVDelimiterText").checked ? document.getElementById("DialogImportCSVDelimiter").value : '\t')),
			header: document.getElementById("DialogImportCSVHeader").checked,
			dynamicTyping: document.getElementById("DialogImportCSVStringTyping").checked ? false : true,
			skipEmptyLines: true});
		currentNode.STAdata=result.data;
		//Papa.parse transforms ISO dates to javascript Dates. I revert this to ISO date expressed in text.
		TransformDatesToISO(currentNode.STAdata);
		if (url)
			currentNode.STAfileUrl=url;
		networkNodes.update(currentNode);
		updateQueryAndTableArea(currentNode);
		UpdateChildenTable(currentNode);
	}
	catch (e) 
	{
		showInfoMessage("CSV parse error: " + e + " The file content fragment:\n" + csvText.substring(0, 1000));
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
}

function ReadFileImportCSV(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		TransformTextCSVToTable(reader.result, null);
	};
	reader.readAsText(input.files[0], document.getElementById("DialogImportCSVEncoding").value);
}

function ReadURLImportCSV() {
	var locationSTAURL;
	var parentNode=GetFirstParentNode(currentNode);
	currentNode.STAURL = document.getElementById("DialogImportCSVSourceURLInput").value;
	if (parentNode && parentNode.OGCType=="S3Bucket" && parentNode.STAdata && parentNode.STAdata[0].href==currentNode.STAURL) {
		currentNode.STAAccessKey = parentNode.STAAccessKey;
		currentNode.STASecretKey = parentNode.STASecretKey;
		currentNode.STAS3Service = parentNode.STAS3Service;
		locationSTAURL=transformStringIntoLocation(currentNode.STAURL);
	} else {
		currentNode.STAAccessKey = null;
		currentNode.STASecretKey = null;
		currentNode.STAS3Service = null;
		locationSTAURL=null;
	}
	HTTPJSONData(currentNode.STAURL, null, null, null, locationSTAURL ? getAWSSignedHeaders(locationSTAURL.hostname, locationSTAURL.pathname, currentNode.STAAccessKey, currentNode.STASecretKey, currentNode.STAS3Service, "us-east-1") : null).then(
				function(value) { 
					showInfoMessage('Download CSV completed.'); 
					TransformTextCSVToTable(value.text, document.getElementById("DialogImportCSVSourceURLInput").value);
				},
				function(error) { 
					showInfoMessage('Error downloading CSV. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function TransformBinaryDBFToTable(buffer, url) {
	var dbf=ParseDBF(buffer)
	currentNode.STAdata=dbf.records;
	currentNode.STAdataAttributes=getDataAttributesDBF(dbf);
	if (dbf.records.length==0)
		showInfoMessage("DBF table has no records.");
	else
		showInfoMessage("DBF table has been loaded.");
	if (currentNode.STAdata) {
		if (url)
			currentNode.STAfileUrl=url;
		networkNodes.update(currentNode);
		updateQueryAndTableArea(currentNode);
		UpdateChildenTable(currentNode);
	} else {
		showInfoMessage("DBF parse error: " + e);
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
}

function ReadFileImportDBF(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		TransformBinaryDBFToTable(reader.result, null);
	};
	reader.readAsArrayBuffer(input.files[0]);
}


function ReadURLImportDBF() {
	HTTPBinaryData(document.getElementById("DialogImportDBFSourceURLInput").value).then(
				function(value) { 
					showInfoMessage('Download DBF completed.'); 
					TransformBinaryDBFToTable(value, document.getElementById("DialogImportDBFSourceURLInput").value);
				},
				function(error) { 
					showInfoMessage('Error downloading DBF. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function TransformTextJSONLDToTable(jsonldText, addGeo, addObs, url) {
	try
	{
		var jsonld = JSON.parse(jsonldText);
	}
	catch (e) 
	{
		showInfoMessage("JSONLD parse error: " + e + "\n File content fragment:\n" + jsonldText.substring(0, 1000));
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
	var result=ParseJSONLD(jsonld, addGeo, addObs)
	if (result.error) {
		showInfoMessage("JSONLD parse error: " + result.error + "\n File content fragment:\n" + jsonldText.substring(0,1000));
		return;
	}
	currentNode.STAdata=result.data;
	currentNode.STAdataAttributes=result.dataAttributes;
	if (currentNode.STAdata.length==0)
		showInfoMessage("JSON-LD resulted in no records.");
	else
		showInfoMessage("JSON-LD has been loaded.");
	if (currentNode.STAdata) {
		if (url)
			currentNode.STAfileUrl=url;
		networkNodes.update(currentNode);
		updateQueryAndTableArea(currentNode);
		UpdateChildenTable(currentNode);
	} else {
		showInfoMessage("JSONLD parse error: " + e + "\n File content fragment:\n" + jsonldText.substring(0,1000));
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
}

function ReadFileImportJSONLD(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		TransformTextJSONLDToTable(reader.result, document.getElementById("DialogImportJSONLDAddGeo").checked, document.getElementById("DialogImportJSONLDAddObs").checked, null);
		showInfoMessage("JSON-LD has been loaded.");
	};
	reader.readAsText(input.files[0]);   //By default it assumes "UTF8" as encoding
}

function ReadURLImportJSONLD() {
	var locationSTAURL;
	var parentNode=GetFirstParentNode(currentNode);
	currentNode.STAURL = document.getElementById("DialogImportJSONLDSourceURLInput").value;
	if (parentNode && parentNode.OGCType=="S3Bucket" && parentNode.STAdata && parentNode.STAdata[0].href==currentNode.STAURL) {
		currentNode.STAAccessKey = parentNode.STAAccessKey;
		currentNode.STASecretKey = parentNode.STASecretKey;
		currentNode.STAS3Service = parentNode.STAS3Service;
		locationSTAURL=transformStringIntoLocation(currentNode.STAURL);
	} else {
		currentNode.STAAccessKey = null;
		currentNode.STASecretKey = null;
		currentNode.STAS3Service = null;
		locationSTAURL=null;
	}
	HTTPJSONData(currentNode.STAURL, null, null, null, locationSTAURL ? getAWSSignedHeaders(locationSTAURL.hostname, locationSTAURL.pathname, currentNode.STAAccessKey, currentNode.STASecretKey, currentNode.STAS3Service, "us-east-1") : null).then(
				function(value) { 
					showInfoMessage('Download JSONLD completed.'); 
					TransformTextJSONLDToTable(value.text, document.getElementById("DialogImportJSONLDAddGeo").checked, document.getElementById("DialogImportJSONLDAddObs").checked, document.getElementById("DialogImportJSONLDSourceURLInput").value);
				},
				function(error) { 
					showInfoMessage('Error downloading JSONLD. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function TransformTextJSONToTable(jsonText, url) {
	try
	{
		var json = JSON.parse(jsonText);
	}
	catch (e) 
	{
		showInfoMessage("JSON parse error: " + e + "\n File content fragment:\n" + jsonText.substring(0, 1000));
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
	var result=ParseJSON(json)
	currentNode.STAdata=result;
	if (currentNode.STAdata.length==0)
		showInfoMessage("JSON resulted in no records.");
	else
		showInfoMessage("JSON has been loaded.");
	if (currentNode.STAdata) {
		currentNode.STAdataAttributes=getDataAttributes(currentNode.STAdata);
		if (url)
			currentNode.STAfileUrl=url;
		networkNodes.update(currentNode);
		updateQueryAndTableArea(currentNode);
		UpdateChildenTable(currentNode);
	} else {
		showInfoMessage("JSON parse error: " + e + "\n File content fragment:\n" + jsonText.substring(0,1000));
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
}

function ReadFileImportJSON(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		TransformTextJSONToTable(reader.result, null);
		showInfoMessage("JSON has been loaded.");
	};
	reader.readAsText(input.files[0]);   //By default it assumes "UTF8" as encoding
}

function ReadURLImportJSON() {
	var locationSTAURL;
	var parentNode=GetFirstParentNode(currentNode);
	currentNode.STAURL = document.getElementById("DialogImportJSONSourceURLInput").value;
	if (parentNode && parentNode.OGCType=="S3Bucket" && parentNode.STAdata && parentNode.STAdata[0].href==currentNode.STAURL) {
		currentNode.STAAccessKey = parentNode.STAAccessKey;
		currentNode.STASecretKey = parentNode.STASecretKey;
		currentNode.STAS3Service = parentNode.STAS3Service;
		locationSTAURL=transformStringIntoLocation(currentNode.STAURL);
	} else {
		currentNode.STAAccessKey = null;
		currentNode.STASecretKey = null;
		currentNode.STAS3Service = null;
		locationSTAURL=null;
	}
	HTTPJSONData(currentNode.STAURL, null, null, null, locationSTAURL ? getAWSSignedHeaders(locationSTAURL.hostname, locationSTAURL.pathname, currentNode.STAAccessKey, currentNode.STASecretKey, currentNode.STAS3Service, "us-east-1") : null).then(
				function(value) { 
					showInfoMessage('Download JSON completed.'); 
					TransformTextJSONToTable(value.text, document.getElementById("DialogImportJSONSourceURLInput").value);
				},
				function(error) { 
					showInfoMessage('Error downloading JSON. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}


function TransformGeoJSONToTable(geojson) {
	if (!geojson.type || geojson.type!="FeatureCollection")
		return null;
	var data=[], feature;				
	for (var i=0; i<geojson.features.length; i++)
	{
		feature=geojson.features[i];
		data.push(deapCopy(feature.properties)); //JSON properties are directly copied into STAdata
		data[data.length-1].geometry=deapCopy(feature.geometry);  //JSON geometry are directly copied into STAdata
	}
	return data;
}

function TransformTextGeoJSONToTable(jsonText, url) {
	try
	{
		var geojson = JSON.parse(jsonText);
	}
	catch (e) 
	{
		showInfoMessage("GeoJSON parse error: " + e + " The file content fragment:\n" + jsonText.substring(0, 1000));
		currentNode.STAdata=null;
		networkNodes.update(currentNode);
		return;
	}
	currentNode.STAdata=TransformGeoJSONToTable(geojson);
	if (!currentNode.STAdata)
	{
		showInfoMessage("GeoJSON parse error. The only supported GeoJSONs are the ones containing a root type FeatureCollection.");
		networkNodes.update(currentNode);
		return;
	}
	if (currentNode.STAdataAttributes)
	{
		var retorn=transformTimeSeriesTemplateIntoObservedPropertyTimeValue(currentNode.STAdata, currentNode.STAdataAttributes);
		if (retorn) {
			currentNode.STAdata=retorn.data
			currentNode.STAdataAttributes=retorn.dataAttributes;
			retorn=transformObservedPropertyTimeValueIntoTimeSemanticValues(currentNode.STAdata, currentNode.STAdataAttributes, retorn.dataAttributesValues, "extractedObservedProperty", "extractedPhenomenonTime", "extractedValue");
			if (retorn) {
				currentNode.STAdata=retorn.data
				currentNode.STAdataAttributes=retorn.dataAttributes;
			}
		}
	}
	if (url)
		currentNode.STAfileUrl=url;				
	networkNodes.update(currentNode);
	UpdateChildenTable(currentNode);
}

function ReadFileImportGeoJSON(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		TransformTextGeoJSONToTable(reader.result, null);
	};
	reader.readAsText(input.files[0]);  //By default it assumes "UTF8" as encoding
}


function ReadURLImportGeoJSON() {
	HTTPJSONData(document.getElementById("DialogImportGeoJSONSourceURLInput").value).then(
				function(value) { 
					showInfoMessage('Download GeoJSON completed.'); 
					TransformTextGeoJSONToTable(value.text, document.getElementById("DialogImportGeoJSONSourceURLInput").value);
				},
				function(error) { 
					showInfoMessage('Error downloading GeoJSON. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function SaveLocalDataFile(data, fileName, extension, mediatype)   //Saves a memory data structure to a local file
{
	const link = document.createElement('a');
	if (fileName.substring(fileName.length-extension.length) != extension)
		fileName+=extension;
	link.setAttribute('download', fileName);
	link.setAttribute('href', MakeHrefData(data));
	document.body.appendChild(link);

	// wait for the link to be added to the document
	window.requestAnimationFrame(function () {
		var event = new MouseEvent('click');
		link.dispatchEvent(event);
		document.body.removeChild(link);
	});

	return false;
}

function OpenHelp(event) {
	window.open("help", "TapisHelp");
}

function OpenConfiguration(event) {
	document.getElementById("DialogConfiguration").showModal();
}

// Helper function to parse the JWT token
function parseJwt(token) {
	var payload = token.split(".")[1];
	var base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
	return JSON.parse(atob(base64));
};

function OpenLogin(event) {
	hello("authenix").login({redirect_uri: location.pathname, lang: getLang(), scope: "openid profile idp citiobs.secd.eu%23read citiobs.secd.eu%23create citiobs.secd.eu%23update citiobs.secd.eu%23delete", display: "popup"}).then(
		function(success) {
			document.getElementById("buttonOpenLogin").style.display="none";
			document.getElementById("buttonOpenLogout").style.display="inline-block";
			var jwt_elems=parseJwt(success.authResponse.id_token)
			CriptoName=jwt_elems.sub;
			DisplayName=jwt_elems.preferred_username ? jwt_elems.preferred_username : ""
			if (!CriptoName)
				CriptoName=="Anonymous"
			document.getElementById("UserInfoText").innerHTML=DisplayName +" at "+ jwt_elems.idp_name;
		},
		function(e) 
		{
			alert("Signin error: " + e.error.message);
			document.getElementById("UserInfoText").innerHTML="";
			CriptoName=null;
		}
	);
}

function OpenLogout(event) {
	hello("authenix").logout({force:true}).then(
		function(success) {
			document.getElementById("buttonOpenLogin").style.display="inline-block";
			document.getElementById("buttonOpenLogout").style.display="none";
			alert("Signed out from"+ " " + "authenix" + ". ");
			document.getElementById("UserInfoText").innerHTML="";
			CriptoName=null;
		}, function(e) {
			alert("Signed out error: "  + e.error.message);
			document.getElementById("UserInfoText").innerHTML="";
			CriptoName=null;
		});
}

function UpdateConfiguration()
{
	changeCSSStyle(".tablesmall", 'font-size', document.getElementById("DialogConfigurationFontSize").value/100+"em");

	if (document.getElementById("DialogConfigurationDivSideBySide").checked) {
		document.getElementById("mynetwork").style.float="left";
		document.getElementById("mynetwork").style.width="59.4%";
		document.getElementById("mynetwork").style.height="400px";
		document.getElementById("clarification").style.float="left";
		document.getElementById("clarification").style.width="39.5%";
		document.getElementById("clarification").style.marginLeft="0.2%";
		document.getElementById("clarification").style.height="400px";
	} else {
		document.getElementById("mynetwork").style.float="left";
		document.getElementById("mynetwork").style.width="100%";
		document.getElementById("mynetwork").style.height="700px";
		document.getElementById("clarification").style.float="left";
		document.getElementById("clarification").style.width="100%";
		document.getElementById("clarification").style.marginLeft="0";
		document.getElementById("clarification").style.height="400px";
	}
	if (document.getElementById("DialogConfigurationAddGeolocationHeader").checked)
		InitGPSPosition();
	else
		CancelGPSPosition();
	PlaceButtonsSTAEntities();
}

function ChangeConfiguration(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogConfiguration").close(document.getElementById("DialogConfigurationFontSize").value);
	UpdateConfiguration();
}

function ApplyConfiguration(event) {
	event.preventDefault(); // We don't want to submit this form
	UpdateConfiguration();
}

function GetSTAURLEvent(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSTAURL").close(document.getElementById("DialogSTAURLInput").value);
	
	if ((currentNode.image == "sta.png" && currentNode.STAURL == document.getElementById("DialogSTAURLInput").value) ||
		(currentNode.image == "ogcAPICols.png" && currentNode.STAURL == document.getElementById("DialogSTAURLInput").value+"/collections") ||
		(currentNode.image == "ogcAPIItems.png" && currentNode.STAURL == document.getElementById("DialogSTAURLInput").value) ||
		(currentNode.image == "csw.png" && currentNode.STAURL == document.getElementById("DialogSTAURLInput").value+"?REQUEST=GetRecords&SERVICE=CSW&version=2.0.2&resultType=results&elementSetName=full&typeNames=gmd:MD_Metadata&namespace=xmlns(gmd=http://www.isotc211.org/2005/gmd)&outputSchema=http://www.isotc211.org/2005/gmd&maxRecords=100"))
		return;
	var previousSTAURL = currentNode.STAURL;
	currentNode.STAURL = document.getElementById("DialogSTAURLInput").value;
	if (currentNode.STAURL.charAt(currentNode.STAURL.length - 1) == '/' || 
		currentNode.STAURL.charAt(currentNode.STAURL.length - 1) == '?')
		currentNode.STAURL = currentNode.STAURL.slice(0, -1);  //remove last character

	if (currentNode.image == "ogcAPICols.png") {
		currentNode.STAURL += "/collections";
		currentNode.OGCType = "OGCAPIcollections";
		askForConformanceInOGCAPIFeatures();//OCGAPICconformance
	} else if (currentNode.image == "ogcAPIItems.png") {
		//currentNode.STAURL += "/items";
		currentNode.OGCType = "OGCAPIitems";
		askForConformanceInOGCAPIFeatures();//OCGAPICconformance
	} else if (currentNode.image == "csw.png") {
		currentNode.STAURL += "?REQUEST=GetRecords&SERVICE=CSW&version=2.0.2&resultType=results&elementSetName=full&typeNames=gmd:MD_Metadata&namespace=xmlns(gmd=http://www.isotc211.org/2005/gmd)&outputSchema=http://www.isotc211.org/2005/gmd&maxRecords=100";
		currentNode.OGCType = "OGCCSW";
	}
	

	networkNodes.update(currentNode);	//https://visjs.github.io/vis-data/data/dataset.html#Data_Manipulation
	
	//if childen nodes have also STAURL
	UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
	LoadJSONNodeSTAData(currentNode);
}

function TransformS3ServiceResponseToDataAttributes(node, text) {
	if (node.OGCType == "S3Buckets")
		node.STAdata=ParseS3BucketsList(node.STAURL, text);
	else
		node.STAdata=ParseS3Bucket(node.STAURL, text);
	networkNodes.update(node);
	updateQueryAndTableArea(node);
	UpdateChildenTable(node);
}

function GetDialogS3BucketEvent(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogS3Bucket").close(document.getElementById("DialogS3BucketURL").value);

	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode && parentNode.OGCType=="S3Buckets")
		currentNode.OGCType = "S3Bucket";
	else
		currentNode.OGCType = "S3Buckets";
	
	var previousSTAURL = currentNode.STAURL;
	currentNode.STAURL = document.getElementById("DialogS3BucketURL").value;
	currentNode.STAAccessKey = document.getElementById("DialogS3BucketAccessKey").value;
	currentNode.STASecretKey = document.getElementById("DialogS3BucketSecretKey").value;
	currentNode.STAS3Service = document.getElementById("DialogS3BucketS3Service").value;
	networkNodes.update(currentNode);

	//if childen nodes have also STAURL
	UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
	var locationSTAURL=transformStringIntoLocation(currentNode.STAURL);
	HTTPJSONData(currentNode.STAURL, null, null, null, getAWSSignedHeaders(locationSTAURL.hostname, locationSTAURL.pathname, currentNode.STAAccessKey, currentNode.STASecretKey, currentNode.STAS3Service, "us-east-1")).then(
				function(value) {
					if (currentNode.OGCType == "S3Buckets")
						showInfoMessage('S3 Service bucket list request completed.'); 
					else
						showInfoMessage('S3 Bucket content request completed.'); 
					TransformS3ServiceResponseToDataAttributes(currentNode, value.text);
				},
				function(error) { 
					showInfoMessage('Error in requesting S3 Bucket root folder. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function TransformEDCCatalogResponseToDataAttributes(node, obj) {
	node.STAdata = ParseEDCCatalog(obj);
	node.OGCType = "EDCCatalogue";
	networkNodes.update(node);
	updateQueryAndTableArea(node);
	UpdateChildenTable(node);
}

function GetDialogEDCEvent(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogEDC").close();

	var previousSTAURL = currentNode.STAURL;
	currentNode.STAURL = document.getElementById("DialogEDCCatalogURL").value;
	currentNode.EDCConsumerURL = document.getElementById("DialogEDCConsumerURL").value;
	var version=document.getElementById("DialogEDCCatalogVersion").value
	if (version=="v1alpha") {
		currentNode.STAURL+="/catalog/v1alpha/catalog/query";
		var obj=null;
	} else if (version=="v2") {
		currentNode.STAURL+="/management/v2/catalog/request";
		var obj={
			"@context": {
				"@vocab": "https://w3id.org/edc/v0.0.1/ns/"
			},
			"@type": "CatalogRequest",
			"protocol": "dataspace-protocol-http",
			"counterPartyAddress": "https://connector-pscn.mlops.ari-aidata.eu/protocol",
			"querySpec": {
				"@type": "QuerySpec",
				"offset": 0,
				"limit": 1000
			}
		};
		if (document.getElementById("DialogEDCounterPartyAddress"))
			obj.counterPartyAddress=document.getElementById("DialogEDCounterPartyAddress").value;
	} else {
		alert("Catalog version not supported.")
		return;
	}
	networkNodes.update(currentNode);

	//if childen nodes have also STAURL
	//UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);

	HTTPJSONData(currentNode.STAURL, null, "POST", obj).then(
				function(value) { 
					showInfoMessage('EDC catalog request completed.'); 
					TransformEDCCatalogResponseToDataAttributes(currentNode, value.obj);
				},
				function(error) { 
					showInfoMessage('Error in requesting EDC catalog. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);
}

function EDCNegociateContract(node, EDCConsumerURL, offerId, counterPartyAddress) {
	var obj={
		"@context": {"edc": "https://w3id.org/edc/v0.0.1/ns/"},
		"@type": "ContractRequest",
		"counterPartyAddress": counterPartyAddress,
		"protocol": "dataspace-protocol-http",
		"policy": {
			"@context": "http://www.w3.org/ns/odrl.jsonld",
			"@id": offerId,
			"@type": "Offer",
			"assigner": "provider",
			"target": "assetId",
			"permission": []
		}
	};
	HTTPJSONData(EDCConsumerURL+"/management/v3/contractnegotiations", null, "POST", obj).then(
				function(value) {
					if (value.obj && value.obj["@type"] && value.obj["@type"]=="IdResponse" && value.obj["@id"]) {
						showInfoMessage('EDC contract negociation iniciated...');
						EDCWaitForNegociationCompletition(node, EDCConsumerURL, value.obj["@id"], 0);
					} else {
						showInfoMessage('EDC contract negociation failed: '+ JSON.stringify(value.obj));
					}
				},
				function(error) { 
					showInfoMessage('EDC contract negociation failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);
}

function EDCWaitForNegociationCompletition(node, EDCConsumerURL, id, n) {
	setTimeout(EDCVerifyNegociationCompletition, 1000, node, EDCConsumerURL, id, n);
}

function EDCVerifyNegociationCompletition(node, EDCConsumerURL, id, n) {
	HTTPJSONData(EDCConsumerURL+"/management/v2/contractnegotiations/"+id).then(
				function(value) {
					if (!value.obj || !value.obj["@type"] || value.obj["@type"]!="ContractNegotiation" || !value.obj.state) {
						showInfoMessage('EDC contract negociation failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
						return;
					}
					if (value.obj.state!="FINALIZED") {
						if (n==20) {
							showInfoMessage('EDC contract negociation failed after ' + n + ' iterations');
							return;
						}
						EDCWaitForNegociationCompletition(node, EDCConsumerURL, id, n++);
						return;
					} 	
					if (!value.obj.contractAgreementId) {
						showInfoMessage('EDC contract negociation failed: ' + JSON.stringify(value.obj));
						return;
					}				
					showInfoMessage('EDC contract negociation successful.');
					EDCRequestTransfer(node, EDCConsumerURL, value.obj.contractAgreementId, value.obj.counterPartyAddress)
				},
				function(error) { 
					showInfoMessage('EDC contract negociation failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function EDCRequestTransfer(node, EDCConsumerURL, contractAgreementId, counterPartyAddress) {
	var obj={
		"@context": {
			"@vocab": "https://w3id.org/edc/v0.0.1/ns/"
		},
		"@type": "TransferRequestDto",
		"connectorId": "provider",
		"counterPartyAddress": counterPartyAddress,
		"contractId": contractAgreementId,
		"assetId": "assetId",
		"protocol": "dataspace-protocol-http",
		"transferType": "HttpData-PULL"
	};
	HTTPJSONData(EDCConsumerURL+"/management/v3/transferprocesses", null, "POST", obj).then(
				function(value) { 
					if (value.obj && value.obj["@type"] && value.obj["@type"]=="IdResponse" && value.obj["@id"]) {
						showInfoMessage('EDC transfer requested...');
						EDCWaitForTransferStarted(node, EDCConsumerURL, value.obj["@id"], 0);
					} else {
						showInfoMessage('EDC transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
					}
				},
				function(error) { 
					showInfoMessage('EDC trasnfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function EDCWaitForTransferStarted(node, EDCConsumerURL, id, n) {
	setTimeout(EDCVerifyEDCTransferStarted, 1000, node, EDCConsumerURL, id, n);
}

function EDCVerifyEDCTransferStarted(node, EDCConsumerURL, id, n) {
	HTTPJSONData(EDCConsumerURL+"/management/v3/transferprocesses/"+id).then(
				function(value) {
					if (!value.obj || !value.obj["@type"] || value.obj["@type"]!="TransferProcess" || !value.obj.state) {
						showInfoMessage('EDC transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
						return;
					}
					if (value.obj.state!="STARTED") {
						if (n==20) {
							showInfoMessage('EDC transfer request failed after ' + n + ' iterations');
							return;
						}
						EDCWaitForTransferStarted(node, EDCConsumerURL, id, n++);
						return;
					} 	
					/*if (!value.obj.contractId) {
						showInfoMessage('EDC transfer request failed: ' + JSON.stringify(value.obj));
						return;
					}*/				
					showInfoMessage('EDC transfer request start confirmed.');
					EDCGetAddressToTransfer(node, EDCConsumerURL, id);
				},
				function(error) { 
					showInfoMessage('EDC transfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function EDCGetAddressToTransfer(node, EDCConsumerURL, id) {
	HTTPJSONData(EDCConsumerURL+"/management/v3/edrs/"+id+"/dataaddress").then(
				function(value) {
					if (!value.obj || !value.obj["@type"] || value.obj["@type"]!="DataAddress" || !value.obj.endpoint || !value.obj.authorization) {
						showInfoMessage('EDC getting URL for transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
						return;
					}
					showInfoMessage('EDC URL for transfer obtained.');
					EDCExectuteTransfer(node, value.obj.endpoint, value.obj.authorization);
				},
				function(error) { 
					showInfoMessage('EDC getting URL for transfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function EDCExectuteTransfer(node, url, authorization) {
	HTTPJSONData(url, ["Content-Type", "Content-Length"], null, null, {'Accept': '*/*', 'Authorization': authorization}).then(
				function(value) {
					showInfoMessage('EDC Raw data transfer completed. It it is not automatically transformed into a table, use the relevant "format" tool to do so.');
					node.STAURL=url;
					var mediatype=removeParamContentType(value.responseHeaders["Content-Type"]);
					node.STARawData=value;
					if (mediatype=="application/json")
						node.STAdata=ParseJSON(value.obj);
					else if (mediatype=="application/ld+json")
						node.STAdata=ParseJSONLD(value.obj);
					else if (mediatype=="text/csv" || mediatype=="application/vnd.ms-excel") {
						node.STAdata=Papa.parse(value.text, {header: true, dynamicTyping: true, skipEmptyLines: true}).data;
						//Papa.parse transforms ISO dates to javascript Dates. I revert this to ISO date expressed in text.
						TransformDatesToISO(currentNode.STAdata);
					}
					else
						node.STAdata=[{"Content-Type": value.responseHeaders["Content-Type"], "Content-Length": value.responseHeaders["Content-Length"]}]
					networkNodes.update(node);
					updateQueryAndTableArea(node);
				},
				function(error) { 
					showInfoMessage('EDC contract negociation failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function PopulateInputFromSelect(event, idPrefix) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById(idPrefix+"Input").value=document.getElementById(idPrefix+"Select").value;
	if (document.getElementById(idPrefix))
		document.getElementById(idPrefix).click();
}

function PopulateURLSecurityFromSelect(event, idPrefix) {
	event.preventDefault(); // We don't want to submit this form
	var obj=JSON.parse(document.getElementById(idPrefix+"Select").value);
	document.getElementById(idPrefix+"URL").value=obj.url;
	const objArray = Object.keys(obj);
	for (var i=0; i<objArray.length; i++) {
		if (objArray[i]=="desc" || objArray[i]=="url")
			continue;
		document.getElementById(idPrefix+objArray[i].substring(0,1).toUpperCase()+objArray[i].substring(1)).value=obj[objArray[i]];
	}
	if (document.getElementById(idPrefix))
		document.getElementById(idPrefix).click();
}

function PopulateURLEDCFromSelect(event, idPrefix) {
	event.preventDefault(); // We don't want to submit this form
	var obj=JSON.parse(document.getElementById(idPrefix+"Select").value);
	document.getElementById(idPrefix+"CatalogURL").value=obj.url;
	document.getElementById(idPrefix+"CatalogVersion").value=obj.version;
	document.getElementById(idPrefix+"ConsumerURL").value=obj.consumerUrl;
	if (document.getElementById(idPrefix))
		document.getElementById(idPrefix).click();
}


function GetOptionsSelectDialog(suggestedURLs) {
	var cdns=[], stas;
	if (suggestedURLs)
	{
		cdns.push('<option value="">-- Select one option below --</option>');
		for (var g=0; g<suggestedURLs.length; g++) {
			cdns.push('<optgroup label="', suggestedURLs[g].group, '">');
			stas=suggestedURLs[g].STAs;
			for (var i=0; i<stas.length; i++)
				cdns.push('<option value="', stas[i].url, '">', stas[i].desc, '</option>');
		}
	}
	return cdns.join("");  
}

function GetOptionsObjectSelectDialog(suggestedURLs) {
	var cdns=[], stas;
	if (suggestedURLs)
	{
		cdns.push('<option value="">-- Select one option below --</option>');
		for (var g=0; g<suggestedURLs.length; g++) {
			cdns.push('<optgroup label="', suggestedURLs[g].group, '">');
			stas=suggestedURLs[g].URLs;
			for (var i=0; i<stas.length; i++)
				cdns.push("<option value='", JSON.stringify(stas[i], ""), "'>", stas[i].desc, "</option>");
		}
	}
	return cdns.join("");  
}

function ShowUploadObservationsDialog(node) {
	if (CriptoName &&
		hello("authenix").getAuthResponse() && 
		hello("authenix").getAuthResponse().access_token)
	{
		document.getElementById("DialogUploadObservationsLoginFirst").style.display="none";
		document.getElementById("DialogUploadObservationsForm").style.display="inline-block";
		document.getElementById("DialogSTAUploadURLInput").value = node.STAURL ? node.STAURL : config.STAurl;
		ShowUploadObservationsSelects(node);
	}
	else
	{
		document.getElementById("DialogUploadObservationsLoginFirst").style.display="inline-block";
		document.getElementById("DialogUploadObservationsForm").style.display="none";
	}
}

function GetFirstParentNode(node) {
	var nodeids = network.getConnectedNodes(node.id, "from");
	if (nodeids && nodeids.length && networkNodes.get(nodeids[0]))
		return networkNodes.get(nodeids[0]);
	return null;
}

function GetParentNodes(node) {
	var nodeids = network.getConnectedNodes(node.id, "from");
	if (nodeids && nodeids.length)
	{
		var nodes=[];
		for (var i=0; i<nodeids.length; i++)
			nodes[i]=networkNodes.get(nodeids[i]);
		return nodes;
	}
	return null;
}

function ShowUploadObservationsSelects(node) {
	var parentNode = GetFirstParentNode(node)
	if (parentNode) {
		var data = parentNode.STAdata;
		var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
		PopulateSelectSaveLayerDialog("DialogUploadObservationsPlace", dataAttributes, "place");
		PopulateSelectSaveLayerDialog("DialogUploadObservationsLongitude", dataAttributes, "long");
		PopulateSelectSaveLayerDialog("DialogUploadObservationsLatitude", dataAttributes, "lat");
		PopulateSelectSaveLayerDialog("DialogUploadObservationsTime", dataAttributes, "phenomenonTime");
		PopulateSelectSaveLayerDialog("DialogUploadObservationsSensorName", dataAttributes, "sensor_id");
		PopulateSelectSaveLayerDialog("DialogUploadObservationsSensorType", dataAttributes, "sensor_type");
	}
}

function GetSelectedOptionsUploadObservations(){
	var selectedOptions={};
	selectedOptions.place=document.getElementById("DialogUploadObservationsPlaceSelect").value;
	selectedOptions.longitude=document.getElementById("DialogUploadObservationsLongitudeSelect").value;
	selectedOptions.latitude=document.getElementById("DialogUploadObservationsLatitudeSelect").value;
	selectedOptions.time=document.getElementById("DialogUploadObservationsTimeSelect").value;
	selectedOptions.sensorName=document.getElementById("DialogUploadObservationsSensorNameSelect").value;
	selectedOptions.sensorType=document.getElementById("DialogUploadObservationsSensorTypeSelect").value;

	/*selectedOptions.variable=document.getElementById("DialogSaveLayerVariableSelect").value;
	if (descripUoM){
		selectedOptions.variableDescription=document.getElementById("DialogMeaningVariableDescriptionSelect").value;
		selectedOptions.variableDefinition=document.getElementById("DialogMeaningVariableDefinitionSelect").value;
		selectedOptions.variableUoM=document.getElementById("DialogMeaningVariableUoMSelect").value;
		selectedOptions.variableUoMSymbol=document.getElementById("DialogMeaningVariableUoMSymbolSelect").value;
		selectedOptions.variableUoMDefinition=document.getElementById("DialogMeaningVariableUoMDefinitionSelect").value;
	}
	selectedOptions.value=document.getElementById("DialogSaveLayerValueSelect").value;*/
	return selectedOptions;
}


function UpdateJoinTablesRowMatchingNode(node) {
	node.STAJoinTables.RowMatching=[];
	for (var i=0; true; i++)
	{
		if (!document.getElementById("DialogJoinTablesRowMatching_" + i + "_left") ||
			!document.getElementById("DialogJoinTablesRowMatching_" + i + "_right"))
			break;
		node.STAJoinTables.RowMatching[i]={left: document.getElementById("DialogJoinTablesRowMatching_" + i + "_left").value,
			right: document.getElementById("DialogJoinTablesRowMatching_" + i + "_right").value};
	}
}

function RemoveJoinTablesRowMatchingIds(nodeLeftId, nodeRightId, nodeCurrentId, iRowMatching)
{
	var node=networkNodes.get(nodeCurrentId);
	UpdateJoinTablesRowMatchingNode(node);

	if (!node.STAJoinTables || !node.STAJoinTables.RowMatching || node.STAJoinTables.RowMatching.length<2)
		return;
	node.STAJoinTables.RowMatching.splice(iRowMatching, 1);
	networkNodes.update(node);
	AddJoinTablesRowMatching(networkNodes.get(nodeLeftId), networkNodes.get(nodeRightId), node, false);
}

function AddJoinTablesRowMatchingIds(nodeLeftId, nodeRightId, nodeCurrentId)
{
	var node=networkNodes.get(nodeCurrentId);
	UpdateJoinTablesRowMatchingNode(node);
	AddJoinTablesRowMatching(networkNodes.get(nodeLeftId), networkNodes.get(nodeRightId), node, true);
}

function AddJoinTablesRowMatching(nodeLeft, nodeRight, node, add)
{
	var dataLeft=nodeLeft.STAdata;
	var dataLeftAttributes = dataLeft.STAdataAttributes ? dataLeft.STAdataAttributes : getDataAttributes(dataLeft);
	var dataLeftAttributesArray = Object.keys(dataLeftAttributes);
	var dataRight=nodeRight.STAdata;
	var dataRightAttributes = nodeRight.STAdataAttributes ? nodeRight.STAdataAttributes : getDataAttributes(dataRight);
	var dataRightAttributesArray = Object.keys(dataRightAttributes);
	var updated=false;
	if (!node.STAJoinTables)
		node.STAJoinTables={};
	if (!node.STAJoinTables.RowMatching) {
		node.STAJoinTables.RowMatching=[{left: [dataLeftAttributesArray[0]],
			right: [dataRightAttributesArray[0]]}];
		updated=true;
	}
	if (add) {
		node.STAJoinTables.RowMatching.push({left: [dataLeftAttributesArray[0]],
			right: [dataRightAttributesArray[0]]});
		updated=true;
	}
	if (updated)
		networkNodes.update(node);

	var s="";
	for (var i=0; i<node.STAJoinTables.RowMatching.length; i++)
	{
		s+=GetSelectSaveLayerDialog("DialogJoinTablesRowMatching_" + i + "_left",  dataLeftAttributes,  node.STAJoinTables.RowMatching[i].left) +
			" matches " +
			GetSelectSaveLayerDialog("DialogJoinTablesRowMatching_" + i + "_right", dataRightAttributes, node.STAJoinTables.RowMatching[i].right) +
			" <button onclick='RemoveJoinTablesRowMatchingIds(\"" + nodeLeft.id + "\", \"" + nodeRight.id + "\", \"" + node.id + "\", " + i + ");'" + (i==0 && node.STAJoinTables.RowMatching.length==1? " disabled='disabled'" : "") + ">Remove</button><br>";
	}
	s+="<button onclick='AddJoinTablesRowMatchingIds(\"" + nodeLeft.id + "\", \"" + nodeRight.id + "\", \"" + node.id + "\");'>Add</button>";
	document.getElementById("DialogJoinTablesRowMatching").innerHTML=s;
}

function ShowJoinTablesDialog(parentNodes, node) {
	var dataLeft = parentNodes[0].STAdata;
	if (!dataLeft || !dataLeft.length) {
		document.getElementById("DialogJoinTablesRowMatching").innerHTML = "No data to show.";
		return;
																																																																																																																																																		}
	if (parentNodes.length<2)
	{
		document.getElementById("DialogJoinTablesRowMatching").innerHTML = "Two tables are required.";
		return;
	}
	AddJoinTablesRowMatching(parentNodes[0], parentNodes[1], node, false);
}


function ShowOneValueDialog(currentNode) {
	var parentNode=GetFirstParentNode(currentNode);
	if (!parentNode)
		return;
	var data = parentNode.STAdata;

	if (!data || !data.length) {
		document.getElementById("DialogOneValueTitle").innerHTML = "No data to show.";
		return;
	}
	document.getElementById("DialogOneValueTitle").innerHTML = "Select value to see the last value";

	startingNodeContextId=currentNode.id;
	var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
	PopulateSelectSaveLayerDialog("DialogOneValueVariable", dataAttributes, currentNode.STAvariable ? currentNode.STAvariable : "result");
	PopulateSelectSaveLayerDialog("DialogOneValueTime", dataAttributes, currentNode.STAtimeVariable ? currentNode.STAtimeVariable : "phenomenonTime");
	if (currentNode.STAredrawPeriod)
		document.getElementById("DialogOneValueRefreshPeriod").value=currentNode.STAredrawPeriod;
}

function PrepareRefreshOneValue(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogOneValue").close();

	var node=networkNodes.get(startingNodeContextId);
	if (!node)
		return;
	startingNodeContextId = null;
	if (node.STAtimeOut) {
		clearTimeout(node.STAtimeOut);
		node.STAtimeOut=null;
	}
	node.STAvariable=document.getElementById("DialogOneValueVariableSelect").value;
	node.STAtimeVariable=document.getElementById("DialogOneValueTimeSelect").value;
	node.STAredrawPeriod=document.getElementById("DialogOneValueRefreshPeriod").value;
	networkNodes.update(node);

	RequestLastObservationAndRefreshOneValue(node, node.STAvariable, node.STAtimeVariable, node.STAredrawPeriod);
}

function StopRefreshOneValue(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogOneValue").close();

	var node=networkNodes.get(startingNodeContextId);
	if (!node)
		return;
	if (node.STAtimeOut)
	{
		clearTimeout(node.STAtimeOut);
		showInfoMessage("Refresh cancelled.");
	}
}


function prepareRefreshCountResults(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogCountResults").close();

	var node=networkNodes.get(startingNodeContextId);
	if (!node)
		return;
	startingNodeContextId = null;
	if (node.STACountTimeOut) {
		clearTimeout(node.STACountTimeOut);
		node.STACountTimeOut=null;
	}
	node.STAredrawPeriodCount=document.getElementById("DialogCountResultsRefreshPeriod").value;
	networkNodes.update(node);

	requestAndRefreshCountResults(node, node.STAredrawPeriodCount);

}

function stopRefreshCountResults(event) {
event.preventDefault(); // We don't want to submit this form
document.getElementById("DialogCountResults").close();

if (!currentNode)
return;
if (currentNode.STACountTimeOut) {
clearInterval(currentNode.STACountTimeOut);
showInfoMessage("Refresh cancelled.");
}
}

function closeDialogCountResults(event) {
event.preventDefault(); // We don't want to submit this form
document.getElementById("DialogCountResults").close();
}

function getTimeISOTime(isodatetime) {
	var d=new Date(isodatetime);
	return d.getHours()+":"+(d.getMinutes()<10 ? "0" : "")+d.getMinutes()+":"+(d.getSeconds()<10 ? "0" : "")+d.getSeconds();
}

function GetObservationResultAsString(v) {
	if (typeof v === "number")
		return v.toString();
	if (typeof v === "object")
		return JSON.stringify(v);
	return v;
}

async function RequestLastObservationAndRefreshOneValue(currentNode, variable, timeVariable, period) {
	var parentNode=GetFirstParentNode(currentNode);
	if (!parentNode)
		return;
	currentNode.STAURL = AddQueryParamsToURL(parentNode.STAURL, "$orderby="+timeVariable+" desc");
	if (removeExtension(parentNode.image)=="Observations")
		currentNode.STAURL = AddQueryParamsToURL(currentNode.STAURL, "$expand=Datastream,MultiDatastream")
	currentNode.STAExpectedLength = 1;
	networkNodes.update(currentNode);
	showInfoMessage("Getting the last observation...");
	await LoadJSONNodeSTAData(currentNode);

	//Redraw the label

	var data=currentNode.STAdata;
	if (!data || data.length<1)
		return;

	if (data[0]["MultiDatastream"]) {
		currentNode.label="";
		for (var i=0; i<data[0][variable].length; i++)
		{
			currentNode.label+=GetObservationResultAsString(data[0][variable][i]);
			if (data[0]["MultiDatastream"]?.unitOfMeasurements[i]?.symbol)
				currentNode.label+=data[0]["MultiDatastream"]?.unitOfMeasurements[i]?.symbol;
			if (i+1!=data[0][variable].length)
				currentNode.label+=", ";
		}
	} else {
		currentNode.label=GetObservationResultAsString(data[0][variable]);
		if (data[0]["Datastream"] && data[0]["Datastream"]?.unitOfMeasurement?.symbol)
			currentNode.label+=data[0]["Datastream"].unitOfMeasurement.symbol;
	}
	currentNode.label+=" (" + getTimeISOTime(data[0][timeVariable]) + ")";

	//Redraw
	showInfoMessage(currentNode.label + ". Waiting " + period + " seconds ...");
	currentNode.STAtimeOut=setTimeout(RequestLastObservationAndRefreshOneValue, period*1000, currentNode, variable, timeVariable, period);
	networkNodes.update(currentNode);
}


async function requestAndRefreshCountResults(currentNode, period) {
var parentNode = GetFirstParentNode(currentNode);
if (!parentNode)
return;
currentNode.STAURL = AddQueryParamsToURL(parentNode.STAURL, "$count=true&$top=0");
currentNode.STAExpectedLength = 1;	
networkNodes.update(currentNode);
showInfoMessage("Getting number of items");
var numberOfResults = await loadAPIDataWithReturn(currentNode.STAURL, "CountResults");

//Redraw the label	
currentNode.label = "Items: " + numberOfResults;

//Redraw	
showInfoMessage(currentNode.label + ". Waiting " + period + " seconds ...");
currentNode.STACountTimeOut=setTimeout(requestAndRefreshCountResults, period*1000, currentNode, period);
networkNodes.update(currentNode);
}

function CloseDialogOneValue(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogOneValue").close();
}


//From iNat2STA
function ExtractIdFromURL(url)
{
	var id;
	if (!url && url!==0)
		return;
	if (-1!=url.indexOf("('") && -1!=url.indexOf("')", url.indexOf("('")+2))
	{
		id=url.substring(url.indexOf("('")+2,url.indexOf("')",url.indexOf("('")+2));
		if (id==+id)  //Is it a numerical id?  /inspired in https://stackoverflow.com/questions/20169217/how-to-write-isnumber-in-javascript
			return +id;  //returns a number
		return id;  //returns a string
	}
	if (-1!=url.indexOf("(") && -1!=url.indexOf(")", url.indexOf("(")+1))
	{
		id=url.substring(url.indexOf("(")+1,url.indexOf(")",url.indexOf("(")+1));
		return +id;  //returns a number
	}
	else
		return url;
}

function getUrlToId(url, objsName, id) {
	return url + "/" + objsName + "(" + (typeof id==="number" ? "" :"'") + id + (typeof id==="number" ? "" :"'") + ")";
}


function AddKeysToFilter(url, obj, prefix) {
	var objArray=Object.keys(obj);
	for (var i=0; i<objArray.length; i++)
	{
		var propName=objArray[i];
		var value=obj[propName];
		if (value==null)  //Do not consider null properties in the queries
			continue;
		if (typeof value==="object")
		{
			if (propName=="feature" || propName=="location"){
				var coords;
				if (value.geometry && value.geometry.coordinates)
					coords=value.geometry.coordinates;
				else if (value.coordinates)
					coords=value.coordinates;
				else {
					alert("Wrong format for 'feature' or 'location'. I cannot find the coordinates.");
					continue;
				}
				if (!Array.isArray(coords) || 
					coords.length<2 || 
					Array.isArray(coords[0]) || Array.isArray(coords[1])) {
					alert("The coordinates format for 'feature' or 'location' is not supported. Only a Point structure is supported: Array of two decimal numbers.");
					continue;
				}
				url+=(url=="" ? "" : " and ") + "st_equals(" + propName + ", geography'POINT (" + coords[0] + " " + coords[1] + ")')";
			}
			else if (Array.isArray(value) && value.length==1 && typeof value[0]==="object")
				url=AddKeysToFilter(url, value[0], prefix ? prefix + "/" + propName : propName);
			else
				url=AddKeysToFilter(url, value, prefix ? prefix + "/" + propName : propName);
			continue;
		}
		if (propName=="encodingType")
			continue;  //I'm ignoring this element in the queries.
		url+=(url=="" ? "" : " and ") + (prefix ? prefix + "/" : "")+ propName + " eq ";
		if (typeof value==="number" || propName=="resultTime" || propName=="phenomenonTime" || propName=="validTime" || propName=="creationTime" || propName=="startTime" || propName=="endTime")
			url+=value;
		else
			url+="'" + value + "'";
	}
	return url;
}

async function GetObjectId(url, objsName, obj){
	if (objsName=="Parties")
		var response=await HTTPJSONData(url+"/"+objsName+ "?$filter=authId eq '" + obj.authId + "'");
	else if (objsName=="MultiDatastreams"){
		var observedProperties= obj["ObservedProperties"];
		var observationType= obj["observationType"];
		delete obj["ObservedProperties"]; //To separate manually without AddKeysToFilter function 
		delete obj["observationType"]; //to avoid error: "Illegal operation: No property called observationType for class de.fraunhofer.iosb.ilt.frostserver.plugin.multidatastream.TableImpMultiDatastreams"
		var toAddToFilter="";
		for (var i=0;i<observedProperties.length;i++){
			toAddToFilter+= "and ObservedProperties/@iot.id eq '"+ observedProperties[i]["@iot.id"]+"'";
		}
		var url2=url+"/"+objsName+ "?$filter=" + encodeURIComponent(AddKeysToFilter("", obj)) + toAddToFilter;
		console.log(url2)
		var response=await HTTPJSONData(url2);
		obj["ObservedProperties"]=observedProperties;
		obj["observationType"]=observationType;
	}
	else
		var response=await HTTPJSONData(url+"/"+objsName+ "?$filter=" + encodeURIComponent(AddKeysToFilter("", obj)));

	if (!response || (!response.obj && !response.ok && response.status!=404))
		throw {name: "Error requesting resource existance.", message: "Status: "+ response.status, at: "", text: url+"/"+objsName+ "?$filter=" + AddKeysToFilter("", obj)};
	var data=response.obj;
	if (data && data.value && data.value.length)
		return data.value[0]["@iot.id"];
	else
	{
		//Not found. I'm creating it.
		var response=await HTTPJSONData(url+"/"+objsName, ['Location'], 'POST', obj);
		if (response?.ok)
			return ExtractIdFromURL(response.responseHeaders['Location']);
		else
			null; /*throw {name: "Error creating resource", message: "Status: "+ response.status, at: "", text: url+"/"+objsName+ "?$filter=" + AddKeysToFilter("", obj)};*/
	}
}

async function GetPartyId(url, authId) {
	return await GetObjectId(url, "Parties", {
		"authId": authId,
		//"displayName": authId,  //It might change soon to "description"
		//"description": null,
		"role": "individual"
	});
}

async function GetObservedPropertyId(url, name, description, definition) {
	return await GetObjectId(url, "ObservedProperties", {
		"name": name,
		"description": description,
		"definition": definition
	});
}
async function GetSensorId(url, name, description, metadata) {
	return await GetObjectId(url, "Sensors", {
		"name": "Sensor for measuring " + name.charAt(0).toLowerCase() + name.substring(1),
		"description": "Sensor for measuring " + description.charAt(0).toLowerCase() + description.substring(1),
		"encodingType": "text/html",
		"metadata": metadata
	});
}

async function GetThingId(url, partyId, name, description) {
	return await GetObjectId(url, "Things", {
		"name": "Platform that measures " + name.charAt(0).toLowerCase() + name.substring(1),
		"description": "Platform that measures " + description.charAt(0).toLowerCase() + description.substring(1),
		"Party": { "@iot.id":  partyId }
	});
}


async function GetDatastreamId(url, partyId, obsPropId, sensorId, thingId, name, description, UoM, UoMSymbol, UoMDefinition) {
	return await GetObjectId(url, "Datastreams", {
		"unitOfMeasurement":{
			"name": UoM,
			"symbol": UoMSymbol,
			"definition": UoMDefinition
		},
		"observationType": "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement",
		"name": name,
		"description": description,
		"ObservedProperty": { "@iot.id": obsPropId },
		"Sensor": { "@iot.id":  sensorId },
		"Thing": { "@iot.id": thingId },
		"Party": { "@iot.id":  partyId }
	});
}

async function GetFeatureOfInterestId(url, place, longitude, latitude) {
	return await GetObjectId(url, "FeaturesOfInterest", {
		"name": place,
		"description": place,
		"encodingType": "application/geo+json",
		"feature": {
			"type": "Feature",
			"geometry": {
				"type": "Point",
				"coordinates": [longitude, latitude]
			}
		}
	});
}

async function GetObservationId(url, datastreamId, FoIId, time, result) {
	var d=new Date(time);
	var t=d.toISOString();

	return await GetObjectId(url, "Observations", {
		"result": result,
		"resultTime": t,
		"phenomenonTime": t,
		"FeatureOfInterest": { "@iot.id": FoIId },
		"Datastream": { "@iot.id": datastreamId }
	});
}

async function UploadObservationsSTA(url, data, dataAttributes, selectedOptions) {
	var record, obsPropId, sensorId, partyId, thingId, datastreamIds=[];
	var dataAttributesArray = Object.keys(dataAttributes);

	partyId=await GetPartyId(url, CriptoName);
	if (!partyId && partyId!==0)
		return;
	record=data[0];  //to be able to extract a constant value (the sensor name)
	for (var i = 0; i < dataAttributesArray.length; i++) {
		if (dataAttributesArray[i]==selectedOptions.place ||
			dataAttributesArray[i]==selectedOptions.longitude ||
			dataAttributesArray[i]==selectedOptions.latitude ||
			dataAttributesArray[i]==selectedOptions.time ||
			dataAttributesArray[i]==selectedOptions.sensorName ||
			dataAttributesArray[i]==selectedOptions.sensorType)
			continue;
		if (!dataAttributes[dataAttributesArray[i]].description ||
			!dataAttributes[dataAttributesArray[i]].definition)
		{
			datastreamIds[i]=null;
			continue;
		}
		obsPropId=await GetObservedPropertyId(url, dataAttributesArray[i], dataAttributes[dataAttributesArray[i]].description, dataAttributes[dataAttributesArray[i]].definition);
		if (!obsPropId && obsPropId!==0)
			return;
		sensorId=await GetSensorId(url, dataAttributesArray[i], (selectedOptions.sensorType && record[selectedOptions.sensorType]) ? record[selectedOptions.sensorType] : dataAttributes[dataAttributesArray[i]].description, dataAttributes[dataAttributesArray[i]].definition);
		if (!sensorId && sensorId!==0)
			return;

		thingId=await GetThingId(url, partyId, dataAttributesArray[i], (selectedOptions.sensorName && record[selectedOptions.sensorName]) ? record[selectedOptions.sensorName] : dataAttributes[dataAttributesArray[i]].description);
		if (!thingId && thingId!==0)
			return;

		datastreamIds[i]=await GetDatastreamId(url, partyId, obsPropId, sensorId, thingId, dataAttributesArray[i], dataAttributes[dataAttributesArray[i]].description, dataAttributes[dataAttributesArray[i]].UoM, dataAttributes[dataAttributesArray[i]].UoMSymbol, dataAttributes[dataAttributesArray[i]].UoMDefinition);
		if (!datastreamIds[i] && datastreamIds[i]!==0)
			return;
		showInfoMessage("Datastream <a href='" + getUrlToId(url, "Datastreams", datastreamIds[i]) + "' target='_blank'>" + datastreamIds[i] + "</a> available in STA");
	}
	for (var i = 0; i < data.length; i++) {
		record=data[i];
		var FoIId=await GetFeatureOfInterestId(url, record[selectedOptions.place], record[selectedOptions.longitude], record[selectedOptions.latitude]);
		if (!FoIId && FoIId!==0)
			return;
		var keys = Object.keys(data[i]);
		for (var k = 0; k < keys.length; k++) {
			if (keys[k]==selectedOptions.place ||
				keys[k]==selectedOptions.longitude ||
				keys[k]==selectedOptions.latitude ||
				keys[k]==selectedOptions.time)
				continue;
			if (!datastreamIds[k])
				continue;

			var observationId=await GetObservationId(url, datastreamIds[k], FoIId, record[selectedOptions.time], record[keys[k]]);
			if (!observationId && observationId!==0)
				return;
			showInfoMessage("Observation <a href='" + getUrlToId(url, "Observations", observationId) + "' target='_blank'>" + observationId + "</a> available in STA under Datastream <a href='" + getUrlToId(url, "Datastreams", datastreamIds[k]) + "' target='_blank'>" + datastreamIds[k] + "</a>");
		}
	}
	return;  //value	
}

function UploadObservationsSTAURL(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogUploadObservations").close();
	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		var url=document.getElementById("DialogSTAUploadURLInput").value;
		if (url.charAt(url.length - 1) == '/')
			url = url.slice(0, -1);  //remove last character
		showInfoMessage('Upload observations in STA started...');
		UploadObservationsSTA(url,
			parentNode.STAdata,
			parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(parentNode.STAdata),
			GetSelectedOptionsUploadObservations()).then(
				function(value) { showInfoMessage('Upload observations in STA completed.'); },
				function(error) { showInfoMessage('Error uploading Observations to STA. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;}
			);
	}
}



function GetSelectNRecords(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectNRecords").close();

	var previousSTAURL= currentNode.STAURL;
	
	if (!isNaN(parseInt(document.getElementById("SelectNumberOfRecords").value)))
		currentNode.STAExpectedLength = parseInt(document.getElementById("SelectNumberOfRecords").value);
	networkNodes.update(currentNode);
	showInfoMessage("Loading STA count...");
	UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
	LoadJSONNodeSTAData(currentNode);
}

function GetSelectSortBy(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectSortBy").close();

	var previousSTAURL= currentNode.STAURL;

	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		if (parentNode.STAURL)
			currentNode.STAURL = parentNode.STAURL;
		if (parentNode.STAdata)
			currentNode.STAdata = parentNode.STAdata;
		var dataAttributes = currentNode.STAdataAttributes ? currentNode.STAdataAttributes : getDataAttributes(currentNode.STAdata);
		var dataAttributesArray=Object.keys(dataAttributes)
	}
	else
		return;

	if (document.getElementById("DialogSelectSortByHTML").style.display != "none")
	{
		for (var a = 0; a < dataAttributesArray.length; a++)
		{
			if (!dataAttributesArray[a].endsWith("@iot.navigationLink") && dataAttributesArray[a].charAt(0)!='@')
			{
				if (document.getElementById("SelectSortByEntity_" + a) && document.getElementById("SelectSortByEntity_" + a).checked)
					break;
			}
		}

		if (a < dataAttributesArray.length) //A checked attribute has been found ("for" breaks before ending).
		{
			var s;
			currentNode.STAURL = AddQueryParamsToURL(currentNode.STAURL, "$orderby="+dataAttributesArray[a]+" "+((document.getElementById("SelectSortByDesc") && document.getElementById("SelectSortByDesc").checked) ? "desc" : "asc"));
		}
	}
	if (!isNaN(parseInt(document.getElementById("SelectExpandsNumberOfRecords").value)))
		currentNode.STAExpectedLength = parseInt(document.getElementById("SelectSortByNumberOfRecords").value);
	networkNodes.update(currentNode);
	showInfoMessage("Sorting STA by "+ dataAttributesArray[a] + " ...");
	UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
	LoadJSONNodeSTAData(currentNode);
}

function isNumeric(str) {
	if (typeof str != "string") return false // we only process strings!  	
	return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
		!isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function returnIndexEntityRelatedInSTAEntity(entityName, entityRelated) {
	var n=STAEntities[entityName].entities.length;
	for (var t=0;t<n;t++){
		if (STAEntities[entityName].entities[t].name==entityRelated)
			return t;
	}
	return -1;
}

function openMultiDatastreamDialog(event){
	var number= document.getElementById("DialogOpenMultiDatastream_input").value;
	if (PopulateCreateUpdateDeleteEntityMultiDatastreams("MultiDatastreams", currentNode,number))
	document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").setAttribute("data-stanumber", number);
	document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").showModal();
}

function PopulateCreateUpdateDeleteEntityMultiDatastreams(entityName, currentNode, number) {
	var cdns = [], entitiesParentArray = [], entitiesParentArrayObservedProperties = [];
	var parentNodes = GetParentNodes(currentNode);
	if (parentNodes.length == 0) {
		alert("Parent(s) node(s) are needed to know about the STA root url");
		return false;
	}
	cdns.push('<span id="dlgCreateUpdateDeleteEntityType" style="font-weight:bold">MultiDatastream</span>:<br><br>'); //Title (Entity name) 
	var actionToDo = "";
	for (var i = 0; i < parentNodes.length; i++) {
		var parentNode = parentNodes[i];
		//console.log(parentNode.STAdata[0]["@iot.id"])
		var parentEntityName = getSTAEntityPlural(getSTAURLLastEntity(parentNode.STAURL), false);
		if (!parentNode.STAdata || parentNode.STAdata.length == 0) {
			alert("Parent node has no STA data associated");
			return false;
		}
		if (parentNode.image != "sta.png") {
			if (parentNode.STAdata.length > 1) {
				alert("Parent node has more than a single record. Please select a record first.");
				return false;
			}
			if (parentEntityName != entityName && returnIndexEntityRelatedInSTAEntity(entityName, parentEntityName) == -1 && returnIndexEntityRelatedInSTAEntity(entityName, STAEntities[parentEntityName].singular) == -1) {
				alert("Parent node (" + STAEntities[parentEntityName].singular + ") is not a/an Multidatastream or is directly related to a/an Multidatastream");
				return false;
			}
			if (parentEntityName == entityName) { //Update or delete
				actionToDo = "update_delete";
				if (i > 1) {
					alert("One parent node is the same as the entity Multidatastream. This is for update or delete the entity. In this case, only one parent node is allowed.");
					return false;
				}
				var record = parentNode.STAdata[0]; //Info from parentNode used to complete in update
				if (!record["@iot.id"]) {
					alert("Cannot find @iot.id. Did you removed in a select?");
					return false;
				}
				//Update or delete
				cdns.push('<label style=" font-weight: bold;">Id: </label><input id="dlgCreateUpdateDeleteEntity_id" style="background-color:#D8DFD6" type="text" value="', record["@iot.id"], '" readonly=="readonly"><br>'); //update/delete
			}
			else {
				actionToDo = "create" //CREATE
				var record = parentNode.STAdata[0]; //Info from parentNode used to complete in update
				if (!record["@iot.id"]) {
					alert("Cannot find @iot.id in parent node " + STAEntities[parentEntityName].singular + ". Did you removed in a select?");
					return false;
				}

				//ENTITIES PARENTNODE
				var url = getUrlToId(getSTAURLRoot(parentNodes[0].STAURL), parentEntityName, record["@iot.id"]);
				if (STAEntities[parentEntityName].singular == "ObservedProperty") {
					entitiesParentArrayObservedProperties.push([STAEntities[parentEntityName].singular, record["@iot.id"], url, record["name"]])

				} else {
					entitiesParentArray.push([STAEntities[parentEntityName].singular, record["@iot.id"], url]); //EntityName,id.url
				}

			}
		}
		else if (parentNodes.length == 1 && parentNodes[0].image == "sta.png") {
			alert("You have to connect MultiDatastreams node with a compatible node STA \n Required nodes: Party,Sensor,ObservedProperty,Thing.\n Optional nodes: Campaigns, License,Observations");
			return false;

		} else if (parentNodes.length > 1 && parentNodes[0].image == "sta.png") {
			actionToDo = "create" //CREATE
		}
	}
	if (actionToDo == "create") {
		var currentNodeEntityPlural = getSTAEntityPlural(currentNode.label, false);
		var entitiesLinked = STAEntities[currentNodeEntityPlural].entities;
		var entitiesRequiedNotLinked = [], observedPropertiesArray = [], entitiesRequired = [], entitiesNotRequired = [], entitiesObject={};

		//Creating dialog
		//ENTITIES			
		if (entitiesParentArray.length != 0) {
			var isRequired;
			for (var e = 0; e < entitiesLinked.length; e++) {
				if (entitiesLinked[e].name == "Party" || entitiesLinked[e].name == "Sensor" || entitiesLinked[e].name == "ObservedProperty" || entitiesLinked[e].name == "Thing") { //required
					isRequired=true;
				}
				else{
					isRequired=false;
				}
				for (var u = 0; u < entitiesParentArray.length; u++) {

					if ((getSTAEntityPlural(entitiesLinked[e].name, false) == getSTAEntityPlural(entitiesParentArray[u][0], false)) && entitiesParentArray[u][0] != "ObservedProperty") { //If it is a parentNode 
						entitiesNotRequired.push(`<span style=" font-weight: bold;">${entitiesParentArray[u][0]}`,(isRequired)?'*': '',`: <a href="${entitiesParentArray[u][2]}"> ${entitiesParentArray[u][1]}</a></span><br>`);
						entitiesObject[entitiesParentArray[u][0]]={"@iot.id":entitiesParentArray[u][1]};
						break;
					} else if (getSTAEntityPlural(entitiesLinked[e].name, false) == "ObservedProperties") {
						break;
					}
					else {
						if (u == entitiesParentArray.length - 1) { //If there is not any 
							entitiesRequired.push(`<span style=" font-weight: bold;">${entitiesLinked[e].name} `,(isRequired)?'*: <span style="color: red; font-style: italic" >You need to link one</span></span>':': <span style="color: #897F7F; font-style: italic">none</span></span>','<br>');
							entitiesRequiedNotLinked.push(entitiesLinked[e].name);
						}
					}
				}
			}
		}
		cdns.push('<fieldset id="fieldsetModificateEntities_Entities"><legend>Entities</legend>');
		if (entitiesParentArrayObservedProperties.length != 0) {
			var observedPropertiesArrayofObjects=[];
			cdns.push('<span style=" font-weight: bold;">observedProperties*:');
			for (var e = 0; e < entitiesParentArrayObservedProperties.length; e++) {
				cdns.push(`<a href="${entitiesParentArrayObservedProperties[e][2]}"> ${entitiesParentArrayObservedProperties[e][1]}</a>, `);
				observedPropertiesArrayofObjects.push({"@iot.id":entitiesParentArrayObservedProperties[e][1]})
			}
		} else {
			cdns.push(`<span style=" font-weight: bold;">ObservedProperties*: <span style="color: red; font-style: italic" >You need to link one</span>`);
		}

		cdns.push(`</span><br>`);
		cdns.push(...entitiesRequired, ...entitiesNotRequired, "<br></fieldset>");
		cdns.push('<fieldset id="fieldsetModificateEntities_Properties"><legend>Properties</legend>');
		currentNode.STAEntitiesRequiredNotLinked = entitiesRequiedNotLinked;
		currentNode.STAentitiesObject= entitiesObject;
	}

	//PROPERTIES (create + fill ->update/delete)
	cdns.push('<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_name" data-STArequired="true" style=" font-weight: bold;">name*:</label>',
		'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_name" type="text" style="width:300px" data-STArequired="true"><br>', //name
		'<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_description" data-STArequired="true" style=" font-weight: bold;">description*:</label>',
		'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_description" type="text" style="width:300px" data-STArequired="true"><br>', //description
		'<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_observationType" data-STArequired="true" style=" font-weight: bold;">observationType*:</label>',
		'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_observationType" type="text" style="width:510px" data-STArequired="true" readonly value="http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_ComplexObservation"><br>');//observationType

	for (var a = 0; a < number; a++) { //Parts to be repeated: (ObservedProperties,unitOfmeasurement,multiobservationDataType)

		cdns.push('<div style="background-color:#F0F0F2; padding:10px; margin-top:15px"><span style="margin-top:5px; margin-bottom:5px; font-weight: bold; font-style: italic; ">multidatastream ' + (a + 1) + '</span><br><br>');
		if (actionToDo == "create"){
			cdns.push('<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_observedPropertiesSelect' + a + '">Select the <b>observedProperty </b>corresponding*:</label>',
			'<select id="dlgCreateUpdateDeleteEntity_MultiDatastreams_observedPropertiesSelect' + a + '">');
		}
		for (var e = 0; e < entitiesParentArrayObservedProperties.length; e++) { //ObservedProperties
			if (e == 0) {
				cdns.push(`<option value="${entitiesParentArrayObservedProperties[e][1]}"selected >id: ${entitiesParentArrayObservedProperties[e][1]}, result: ${entitiesParentArrayObservedProperties[e][3]}</option>`)
			} else {
				cdns.push(`<option value="${entitiesParentArrayObservedProperties[e][1]}">id: ${entitiesParentArrayObservedProperties[e][1]}, result: ${entitiesParentArrayObservedProperties[e][3]}</option>`)
			}
		}
		cdns.push('</select><br>');
		cdns.push('<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_multiobservationDataType' + a + '" data-STArequired="true" style="font-weight: bold;">multiobservationDataType*:</label>',
			'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_multiobservationDataType' + a + '" type="text" style="width:300px" data-STArequired="true"><br>'); //multiobservationDataType
		cdns.push('<fieldset>', //unitOfmeasurement
			'<legend> unitOfmeasurement:</legend>',
			'<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_name_' + a + '" style="font-weight: bold;">name:</label>',
			'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_name_' + a + '" type="text"><br>',
			'<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_definition_' + a + '"style="font-weight: bold;">definition:</label>',
			'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_definition_' + a + '" type="text"><br>',
			'<label for="dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_symbol_' + a + '" style="font-weight: bold;">symbol:</label>',
			'<input id="dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_symbol_' + a + '" type="text"><br>',		
			'</fieldset>',
			'<br>');
		cdns.push('</div>');
	}
	cdns.push('</fieldset>')
	document.getElementById("dlgCreateUpdateDeleteEntityProperties_MultiDatastreams").innerHTML = cdns.join("");
	
	//Fill Inputs with information in update/delete
	if (actionToDo!="create"){
		document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").setAttribute("data-stanumber", number);
		var STAdata= parentNodes[0].STAdata[0];
		document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_name").value= STAdata.name;
		document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_description").value= STAdata.description;
		
		for (var i=0;i<number;i++){
			document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_name_"+i).value= (STAdata.unitOfMeasurements[i].name)?STAdata.unitOfMeasurements[i].name:"";
			document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_definition_"+i).value= (STAdata.unitOfMeasurements[i].definition)?STAdata.unitOfMeasurements[i].definition:"";
			document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_symbol_"+i).value= (STAdata.unitOfMeasurements[i].symbol)?STAdata.unitOfMeasurements[i].symbol:"";
			
			document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_multiobservationDataType"+i).value= (STAdata.multiObservationDataTypes[i])?STAdata.multiObservationDataTypes[i]:"";
		}

	}
	//Show/hide buttons 
	if (actionToDo == "create") {
		document.getElementById("dlgCreateUpdateDeleteEntityCreate_MultiDatastreams").style.display = "inline-block";
		document.getElementById("dlgCreateUpdateDeleteEntityUpdate_MultiDatastreams").style.display = "none";
		document.getElementById("dlgCreateUpdateDeleteEntityDelete_MultiDatastreams").style.display = "none";
	}else {
		document.getElementById("dlgCreateUpdateDeleteEntityCreate_MultiDatastreams").style.display = "none";
		document.getElementById("dlgCreateUpdateDeleteEntityUpdate_MultiDatastreams").style.display = "inline-block";
		document.getElementById("dlgCreateUpdateDeleteEntityDelete_MultiDatastreams").style.display = "inline-block";
	}
	return true;
}

function PopulateCreateUpdateDeleteEntity(entityName, currentNode) {
	var cdns=[], entitiesParentArray=[];

	var parentNodes=GetParentNodes(currentNode);
	if (parentNodes.length==0) {
		alert("Parent(s) node(s) are needed to know about the STA root url");
		return false;
	}

	cdns.push('<span id="dlgCreateUpdateDeleteEntityType" style="font-weight:bold">',STAEntities[entityName].singular, "</span>:<br><br>"); //Title (Entity name) 
	var actionToDo="";
	//ENTITIES
	for (var i=0; i<parentNodes.length; i++)
	{
		var parentNode=parentNodes[i];
		var parentEntityName=getSTAEntityPlural(getSTAURLLastEntity(parentNode.STAURL), false);
		if (!parentNode.STAdata || parentNode.STAdata.length==0){
			alert("Parent node has no STA data associated");
			return false;
		}
		if (parentNode.image != "sta.png"){
			if (parentNode.STAdata.length>1){
				alert("Parent node has more than a single record. Please select a record first.");
				return false;
			}				
			if (parentEntityName!=entityName && returnIndexEntityRelatedInSTAEntity(entityName, parentEntityName)==-1 && returnIndexEntityRelatedInSTAEntity(entityName, STAEntities[parentEntityName].singular)==-1) {
				alert("Parent node ("+STAEntities[parentEntityName].singular+") is not a/an " + STAEntities[entityName].singular + " or is directly related to a/an " +  STAEntities[entityName].singular);
				return false;
			}
			if (parentEntityName==entityName) { //Update or delete
				actionToDo="update_delete";
				if (i>1) {
					alert("One parent node is the same as the entity " + STAEntities[entityName].singular + ". This is for update or delete the entity. In this case, only one parent node is allowed.");
					return false;
				}
				var record=parentNode.STAdata[0]; //Info from parentNode used to complete in update
				if (!record["@iot.id"]){
					alert("Cannot find @iot.id. Did you removed in a select?");
					return false;
				}
				//Update or delete
				cdns.push('<label style=" font-weight: bold;">Id: </label><input id="dlgCreateUpdateDeleteEntity_id" style="background-color:#D8DFD6" type="text" value="', record["@iot.id"], '" readonly=="readonly"><br>'); //update/delete
			}
			else {
				actionToDo="create" //CREATE
				var record=parentNode.STAdata[0]; //Info from parentNode used to complete in update
				if (!record["@iot.id"]){
					alert("Cannot find @iot.id in parent node " + STAEntities[parentEntityName].singular + ". Did you removed in a select?");
					return false;
				}
				//Prepare entities linked to be added to Dialog						
				var url=getUrlToId(getSTAURLRoot(parentNodes[0].STAURL),parentEntityName,record["@iot.id"])
				entitiesParentArray.push([STAEntities[parentEntityName].singular,record["@iot.id"],url]); //EntityName,id.url
			
			}
		}
		else if (parentNodes.length==1&& parentNodes[0].image == "sta.png"){
			actionToDo="create" //CREATE
		}		
	}			
	
	if(actionToDo=="create")  { //adding Entities to Dialog
		cdns.push(...createEntitiesInCreateEntity(currentNode,entitiesParentArray)); //only with create, not needed to update
	}

	//PROPERTIES (create + Fill --> Update/delete)
	for (var i=0; i<STAEntities[entityName].properties.length; i++){
		//Properties not added in dialog
		if ((entityName=="Observations" ? STAEntities[entityName].properties[i].name=="parameters" : STAEntities[entityName].properties[i].name=="properties") || 
			((entityName=="Datastreams" || entityName=="MultiDatastreams") && (STAEntities[entityName].properties[i].name=="observedArea" || STAEntities[entityName].properties[i].name=="phenomenonTime" || STAEntities[entityName].properties[i].name=="resultTime")))
			continue;
		//special properties (Locations: location, FeatureOfInterests: feature, Datastreams: unitOfMeasurement)
		if ((entityName=="Locations" && STAEntities[entityName].properties[i].name=="location") || 
			(entityName=="FeaturesOfInterest" && STAEntities[entityName].properties[i].name=="feature"))//Locations/Feature of Interest coordenates
		{
			//For the moment in supporting only a point
			cdns.push('<fieldset>',
				'<legend>', STAEntities[entityName].properties[i].name, ' (point):</legend>',
				'<label for="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_longitude" style=" font-weight: bold;">', 'longitude: </label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_longitude" type="text" data-STArequired="'+STAEntities[entityName].properties[i].required+'"><br>',
				'<label for="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_latitude"style=" font-weight: bold;">', 'latitude: </label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_latitude" type="text" data-STArequired="'+STAEntities[entityName].properties[i].required+'"><br>',
				'</fieldset>',
				'<br>');
			continue;	
		}
		if (entityName=="Datastreams"  && STAEntities[entityName].properties[i].name=="unitOfMeasurement") { //Datastream unitOfMeasurement
			cdns.push('<fieldset>',
				'<legend>', STAEntities[entityName].properties[i].name, ':</legend>', //Quins volem que siguin required? perque al esquema diu que es required el unitOfMeasurement sencer, no desglosa
				'<label for="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_name" style=" font-weight: bold;" data-STArequired="'+STAEntities[entityName].properties[i].required+'">', 'name: </label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_name" type="text"><br>',
				'<label for="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_symbol" style=" font-weight: bold;">', 'symbol: </label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_symbol" type="text" data-STArequired="'+STAEntities[entityName].properties[i].required+'"><br>',
				'<label for="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_definition" style=" font-weight: bold;">', 'definition: </label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_definition" type="text" data-STArequired="'+STAEntities[entityName].properties[i].required+'"><br>',
				'</fieldset>',
				'<br>');
			continue;
		}
		//Properties in general
		cdns.push('<label for="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '" data-STArequired='+STAEntities[entityName].properties[i].required+' style=" font-weight: bold;">', (STAEntities[entityName].properties[i].required=='true')? STAEntities[entityName].properties[i].name+'*':STAEntities[entityName].properties[i].name, ': </label>');


		//Special inputs with calendar
		if (STAEntities[entityName].properties[i].name=="time"||STAEntities[entityName].properties[i].name=="creationTime"||STAEntities[entityName].properties[i].name=="startTime"||STAEntities[entityName].properties[i].name=="endTime"||(STAEntities[entityName].properties[i].name=="resultTime" && entityName=="Observations")){
			cdns.push('<label>Date:</label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name,'" type="text" placeholder="YYYY-MM-DDTHH:MM:SSZ" style="width:300px" onChange="', `addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar')" data-STArequired="${STAEntities[entityName].properties[i].required}">`);
			cdns.push('<label>Generate with this: </label><input type="datetime-local" id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_createEntityInputCalendar" onChange="',`addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}')"><br>`);
		}else if (STAEntities[entityName].properties[i].name=="validTime"||(STAEntities[entityName].properties[i].name=="resultTime" && entityName=="Datastreams")){
			cdns.push('<label>Date:</label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name,'" type="text" placeholder="YYYY-MM-DDTHH:MM:SSZ/YYYY-MM-DDTHH:MM:SSZ" style="width:300px" onChange="', `addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar',2,'input')" data-STArequired="${STAEntities[entityName].properties[i].required}">`);
			cdns.push('<label>Generate with this: </label><input type="datetime-local" id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_createEntityInputCalendar" onChange="',`addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}',2,'calendar')">`);
			cdns.push('<label> and: </label><input type="datetime-local" id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_createEntityInputCalendar2" onChange="',`addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}',2,'calendar')"><br>`);

		}else if(STAEntities[entityName].properties[i].name=="phenomenonTime"){
			cdns.push('<label>Date:</label><input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name,'" type="text" placeholder="YYYY-MM-DDTHH:MM:SSZ or YYYY-MM-DDTHH:MM:SSZ/YYYY-MM-DDTHH:MM:SSZ" style="width:300px" onChange="', `addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar',3,'input')" data-STArequired="${STAEntities[entityName].properties[i].required}">`);
			cdns.push('<label>Generate with this: </label><input type="datetime-local" id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_createEntityInputCalendar" onChange="',`addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}',3,'calendar')">`);
			cdns.push('<label> and: </label ><label style="font-size:15px;font-style: italic">(to create a period)  </label><input type="datetime-local" id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '_createEntityInputCalendar3" onChange="',`addTimeToOtherInputCreateEntities('dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}_createEntityInputCalendar','dlgCreateUpdateDeleteEntity_${STAEntities[entityName].properties[i].name}',3,'calendar')"><br>`);

		}else if (STAEntities[entityName].properties[i].name!="multiObservationDataType"){
			cdns.push('<input id="dlgCreateUpdateDeleteEntity_', STAEntities[entityName].properties[i].name, '" type="text" style="width:300px" data-STArequired="'+STAEntities[entityName].properties[i].required+'"><br>');
		}

		if (entityName=="MultiDatastreams" && STAEntities[entityName].properties[i].name=="multiObservationDataType") { //Multidatastream, multiObservationDataType
			cdns.push(`<span style= "font-style: italic"> (separate them with ; )</span><br><textarea  id= "dlgCreateUpdateDeleteEntity_multiObservationDataType_textAreaList" rows="4" cols="50" style= "font-family: Arial;" data-starequired="${STAEntities[entityName].properties[i].required}"></textarea>`);
		
		}
	}
	cdns.push('</fieldset>')
	document.getElementById("dlgCreateUpdateDeleteEntityProperties").innerHTML=cdns.join("");

	//Fill properties in update and delete
	if (parentNodes[0].image != "sta.png" && parentEntityName==entityName) {
		for (var i=0; i<STAEntities[entityName].properties.length; i++) {
			//properties to avoid
			if (entityName=="Observations" ? STAEntities[entityName].properties[i].name=="parameters" : STAEntities[entityName].properties[i].name=="properties")
				continue;
			if ((entityName=="Datastreams" || entityName=="MultiDatastreams") && (STAEntities[entityName].properties[i].name=="observedArea" || STAEntities[entityName].properties[i].name=="phenomenonTime" || STAEntities[entityName].properties[i].name=="resultTime"))
				continue;

			//special properties (Locations: location, FeatureOfInterests: feature, Datastreams: unitOfMeasurement)
			if ((entityName=="Locations" && STAEntities[entityName].properties[i].name=="location") ||    (entityName=="FeaturesOfInterest" && STAEntities[entityName].properties[i].name=="feature"))//Locations/Feature of Interest coordenates
			 {
				// //For the moment in supporting only a point
				document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_longitude").value= record[STAEntities[entityName].properties[i].name]["coordinates"][0]?record[STAEntities[entityName].properties[i].name]["coordinates"][0]:"";
				document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_latitude").value= record[STAEntities[entityName].properties[i].name]["coordinates"][1]?record[STAEntities[entityName].properties[i].name]["coordinates"][1]:"";
				continue;	
			}
			if (entityName=="Datastreams" && STAEntities[entityName].properties[i].name=="unitOfMeasurement") { //Datastream unitOfMeasurement
		
				document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+ "_name").value= record[STAEntities[entityName].properties[i].name]["name"]? record[STAEntities[entityName].properties[i].name]["name"]:"";
				document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_symbol").value= record[STAEntities[entityName].properties[i].name]["symbol"]?record[STAEntities[entityName].properties[i].name]["symbol"]:"";
				document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_definition").value= record[STAEntities[entityName].properties[i].name]["definition"]?record[STAEntities[entityName].properties[i].name]["definition"]:"";
				continue;
			}
			//Properties in general
			document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name).value=record[STAEntities[entityName].properties[i].name] ? record[STAEntities[entityName].properties[i].name] : ""; //Properties, completed with parentNodeInfo
		}
		//buttons to hide/show
		document.getElementById("dlgCreateUpdateDeleteEntityCreate").style.display="none";
		document.getElementById("dlgCreateUpdateDeleteEntityUpdate").style.display="inline-block";
		document.getElementById("dlgCreateUpdateDeleteEntityDelete").style.display="inline-block";
		return true;
	}
	else {
		//Filling properties with "mandatory" data in CREATE mode
		if (entityName=="Parties") {
			if (CriptoName && CriptoName!="Anonymous")
				document.getElementById("dlgCreateUpdateDeleteEntity_authId").value=CriptoName;
			else {
				alert("To create a STA Party, you should login first.");
				return false;
			}
			document.getElementById("dlgCreateUpdateDeleteEntity_authId").readOnly=true;
			document.getElementById("dlgCreateUpdateDeleteEntity_role").value="individual";
			document.getElementById("dlgCreateUpdateDeleteEntity_displayName").value=DisplayName;
		}
		else if (entityName=="Locations" || entityName=="FeaturesOfInterest")
		{
			document.getElementById("dlgCreateUpdateDeleteEntity_encodingType").value="application/geo+json";
			document.getElementById("dlgCreateUpdateDeleteEntity_encodingType").readOnly=true;	
		}
		else if (entityName=="Datastreams")	
			document.getElementById("dlgCreateUpdateDeleteEntity_observationType").value="http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement"; //suggested

		//butons in create mode
		document.getElementById("dlgCreateUpdateDeleteEntityCreate").style.display="inline-block";
		document.getElementById("dlgCreateUpdateDeleteEntityUpdate").style.display="none";
		document.getElementById("dlgCreateUpdateDeleteEntityDelete").style.display="none";
	}
	return true;
}
function createEntitiesInCreateEntity(currentNode,entitiesParentArray){
	var entitiesRequired=[],entitiesNotRequired=[];
	var currentNodeEntityPlural=getSTAEntityPlural(currentNode.label,false);
	var entitiesLinked=STAEntities[currentNodeEntityPlural].entities;
	var datastream="none"; // linked
	var entitiesRequiedNotLinked=[];
	var entitiesObject={}
	
	if (entitiesParentArray.length!=0) {
		entitiesRequired.push('<fieldset id="fieldsetModificateEntities_Entities"><legend>Entities</legend>');
		for (var e = 0; e < entitiesLinked.length; e++) {
			for (var u = 0; u < entitiesParentArray.length; u++) {

				if (getSTAEntityPlural(entitiesLinked[e].name, false) == getSTAEntityPlural(entitiesParentArray[u][0], false)) { //If it is a parentNode 
					if (getSTAEntityPlural(entitiesParentArray[u][0], false) == "Datastreams" || (getSTAEntityPlural(entitiesParentArray[u][0], false) == "MultiDatastreams" && datastream != "linked")) {
						datastream = "linked";
					}
					entitiesRequired.push(`<span style=" font-weight: bold;">${entitiesParentArray[u][0]}`,(entitiesLinked[e].required == "true")?'* ':'',`: <a href="${entitiesParentArray[u][2]}"> ${entitiesParentArray[u][1]}</a></span><br>`);
					if (entitiesLinked[e].name==getSTAEntityPlural(entitiesLinked[e].name, false)){ //Plural
						entitiesObject[entitiesLinked[e].name]=[{"@iot.id":entitiesParentArray[u][1]}];
					}else{
						entitiesObject[entitiesLinked[e].name]={"@iot.id":entitiesParentArray[u][1]};
					}
					
					break;

				} 
				else {
					if (u == entitiesParentArray.length - 1) { //If there is not any 
						if (getSTAEntityPlural(entitiesLinked[e].name, false) != "MultiDatastreams" && getSTAEntityPlural(entitiesLinked[e].name, false) != "Datastreams") {
							entitiesRequired.push(`<span style=" font-weight: bold;">${entitiesLinked[e].name}`,(entitiesLinked[e].required == "true")? '*: <span style="color: red; font-style: italic" >You need to link one</span>':  `: <span style="color: #897F7F; font-style: italic">none</span>`,'</span><br>');
							if (entitiesLinked[e].required == "true"){
								entitiesRequiedNotLinked.push(entitiesLinked[e].name);
							}

						} else if (getSTAEntityPlural(entitiesLinked[e].name, false) == "MultiDatastreams" && datastream != "linked") {
							entitiesRequired.push(`<span style="font-weight: bold;">Datastreams/MultiDatastreams`, (entitiesLinked[e].required == "true")?'*: <span style="color: red; font-style: italic" >You need to link one</span></span>':': <span style="color: #897F7F; font-style: italic" >none</span>', '</span> <br>');
							if (entitiesLinked[e].required == "true")entitiesRequiedNotLinked.push("Datastream or Multidatastream");
						}
					}
				}
			}
		}
	}

	currentNode.STAentitiesObject= entitiesObject;
	var cdns=[]
	cdns.push(...entitiesRequired,...entitiesNotRequired,"<br></fieldset>"); 
	cdns.push('<fieldset id="fieldsetModificateEntities_Properties"><legend>Properties</legend>');
	currentNode.STAEntitiesRequiredNotLinked=entitiesRequiedNotLinked;

	return cdns;

}

function addTimeToOtherInputCreateEntities (itemWritten, itemToWrite,number,origin){ //Put Date from calendar to input and vice versa 

	if (number =='2'){
		if (origin=="calendar"){
			document.getElementById(itemToWrite).value=document.getElementById(itemWritten).value+"Z" +"/"+document.getElementById(itemWritten+"2").value+"Z" ;
		}else{
			var valueOfInput= document.getElementById(itemWritten).value.split ("/");
			document.getElementById(itemToWrite).value=valueOfInput[0];
			document.getElementById(itemToWrite+"2").value=valueOfInput[1]
		}
	}else if (number=='3'){
		if (origin=="calendar"){
			if (document.getElementById(itemWritten+"3").value ==''){
				document.getElementById(itemToWrite).value=document.getElementById(itemWritten).value+"Z" 
			}else{
				if (document.getElementById(itemWritten+"3").value!=""){
					document.getElementById(itemToWrite).value=document.getElementById(itemWritten).value+"Z"  +"/"+document.getElementById(itemWritten+"3").value+"Z"
				}else{
					document.getElementById(itemToWrite).value=document.getElementById(itemWritten).value+"Z";
				}
			}
		}else{
			var valueOfInput= document.getElementById(itemWritten).value.split ("/");
			document.getElementById(itemToWrite).value=valueOfInput[0];
			document.getElementById(itemToWrite+"3").value=valueOfInput[1];
		}
	}else{
		document.getElementById(itemToWrite).value=document.getElementById(itemWritten).value+"Z" ;
	}
}

function obtainDataInEntitiesCreationAndUpdate(operation,entityName){

	if (operation=="create"){
		var obj= currentNode.STAentitiesObject;
	}else{
		var obj={}
	}

	var prop, allowToSend=true;
	for (var i=0; i<STAEntities[entityName].properties.length; i++) {
		//avoid properties
		if ((entityName=="Observations" ? STAEntities[entityName].properties[i].name=="parameters" : STAEntities[entityName].properties[i].name=="properties") || 
			((entityName=="Datastreams" || entityName=="MultiDatastreams") && (STAEntities[entityName].properties[i].name=="observedArea" || STAEntities[entityName].properties[i].name=="phenomenonTime" || STAEntities[entityName].properties[i].name=="resultTime")))
			continue;
		//special properties (Locations: location, FeatureOfInterests: feature, Datastreams: unitOfMeasurement)
		if ((entityName=="Locations" && STAEntities[entityName].properties[i].name=="location") || 
			(entityName=="FeaturesOfInterest" && STAEntities[entityName].properties[i].name=="feature"))
		{
			//For the moment in supporting only a point
			obj[STAEntities[entityName].properties[i].name]={"type": "Point", "coordinates": []};
				if (document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_longitude").value==""&& document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_longitude").getAttribute("data-starequired")=="true"){
					alert("Longitude parameter is required, please fill in the box before send");
					allowToSend=false;
				}else{
			obj[STAEntities[entityName].properties[i].name].coordinates[0]=parseFloat(document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_longitude").value);
				}

				if (document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_latitude").value==""&& document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_latitude").getAttribute("data-starequired")=="true"){
					alert("Latitude parameter is required, please fill in the box before send");
					allowToSend=false;
				}else{
			obj[STAEntities[entityName].properties[i].name].coordinates[1]=parseFloat(document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name+"_latitude").value);
				}

			continue;	
		}
			if (entityName=="Datastreams" && STAEntities[entityName].properties[i].name=="unitOfMeasurement")
		{
				obj[STAEntities[entityName].properties[i].name]={};
				obj[STAEntities[entityName].properties[i].name].name=document.getElementById("dlgCreateUpdateDeleteEntity_" + STAEntities[entityName].properties[i].name + "_name").value ? document.getElementById("dlgCreateUpdateDeleteEntity_" + STAEntities[entityName].properties[i].name + "_name").value : null;
				obj[STAEntities[entityName].properties[i].name].name=document.getElementById("dlgCreateUpdateDeleteEntity_" + STAEntities[entityName].properties[i].name + "_symbol").value ? document.getElementById("dlgCreateUpdateDeleteEntity_" + STAEntities[entityName].properties[i].name + "_symbol").value : null;					
				obj[STAEntities[entityName].properties[i].name].name=document.getElementById("dlgCreateUpdateDeleteEntity_" + STAEntities[entityName].properties[i].name + "_definition").value ? document.getElementById("dlgCreateUpdateDeleteEntity_" + STAEntities[entityName].properties[i].name + "_definition").value : null;					
			continue;
		}
			if (STAEntities[entityName].properties[i].name=="multiObservationDataType"){
				var textArea=document.getElementById("dlgCreateUpdateDeleteEntity_multiObservationDataType_textAreaList");
				if (textArea.value==""&& textArea.getAttribute("data-starequired")=="true"){
					alert("multiObservationDataType parameter is required, please fill in the box before send");
					allowToSend=false;
				
				}else{
					var valueSplited= textArea.value.split(";")
					obj[STAEntities[entityName].properties[i].name]=valueSplited;
				}
				continue;
			}
			//Properties in general	
			prop=document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name).value;
			if (prop!=="") 	obj[STAEntities[entityName].properties[i].name]=(entityName=="Observations" && STAEntities[entityName].properties[i].name=="result" && !isNaN(prop)) ? parseFloat(prop) : prop;
			else if (prop=="" && document.getElementById("dlgCreateUpdateDeleteEntity_"+STAEntities[entityName].properties[i].name).getAttribute("data-starequired")=="true") {
				alert( STAEntities[entityName].properties[i].name+" parameter is required, please fill in the box before send");
				allowToSend=false;
				break;
			}
		}
		if (allowToSend==true){
				return obj;
			}else{
				return false;
			}
}
function obtainDataInMultidatastreamsCreationAndUpdate(operation){
	if (operation=="create"){
		var obj= currentNode.STAentitiesObject;
	}else{
		var obj={}
	}
	var prop, allowToSend=true;
	if (document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_name").value!=""){
		obj["name"]=document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_name").value;

	}else{
		alert("Name parameter is required, please fill in the box before send")
		allowToSend=false;
	}
	if (document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_description").value!=""){
		obj["description"]=document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_description").value;

	}else{
		alert("Description parameter is required, please fill in the box before send")
		allowToSend=false;
	}
	if (document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_observationType").value!=""){
		obj["observationType"]=document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_observationType").value;

	}else{
		alert("ObservationType parameter is required, please fill in the box before send")
		allowToSend=false;
	}
	
	var multiDatastreamsNumber=document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").getAttribute("data-stanumber");
	var observedProperties=[], multiObservationDataTypes=[],unitOfMeasurements=[];
	var select;
	for (var i=0;i<multiDatastreamsNumber;i++){
		if(operation=="create"){
			select=document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_observedPropertiesSelect"+i);
			observedProperties.push({"@iot.id":select.options[select.selectedIndex].value});
		}
		

		multiObservationDataTypes.push(document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_multiobservationDataType"+i).value)
		
		unitOfMeasurements.push({"name":document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_name_"+i).value,
								"definition":document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_definition_"+i).value,
								"symbol":document.getElementById("dlgCreateUpdateDeleteEntity_MultiDatastreams_unitOfMeasurement_symbol_"+i).value}
		);
		
	}
	obj["ObservedProperties"]=observedProperties;
	obj["multiObservationDataTypes"]=multiObservationDataTypes;
	obj["unitOfMeasurements"]=unitOfMeasurements;	

	if (allowToSend==true){
		return obj;
	}else{
		return false;
	}
}
function GetCreateEntityMultiDatastream(event){

	event.preventDefault(); // We don't want to submit this form
	var node=currentNode;
	var parentNodes=GetParentNodes(node);
	var entityName="MultiDatastreams";
	var url=getSTAURLRoot(parentNodes[0].STAURL);

	if (currentNode.STAEntitiesRequiredNotLinked.length==0){
		for (var i=0; i<parentNodes.length; i++) {
			var parentNode=parentNodes[i];
			if (parentNode.image == "sta.png")
				continue;
			if (i!=0 && getSTAURLRoot(parentNode.STAURL)!=url) {
				alert("Not all parent nodes are from the same root URL: " + getSTAURLRoot(parentNode.STAURL) + ", " + url);
				continue;
			}
	}
	var obj = obtainDataInMultidatastreamsCreationAndUpdate("create");

	if (obj!=false){
		showInfoMessage("Creating a/an "+ STAEntities[entityName].singular +"...");

	GetObjectId(url, entityName, obj).then(
		function(value) {
			if (value)
			{ 
				document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").close();
				showInfoMessage('Available at: <a href="' + getUrlToId(url, entityName, value) + '" target="_blank">' + value + '</a>');
				node.STAURL=getUrlToId(url, entityName, value);
				node.STAdata=[];
				node.STAdata.push(obj);
				node.STAdata[0]["@iot.id"]=isNaN(value) ? value : parseInt(value);
				networkNodes.update(node);
			}
		},
		function(error) { 
			showInfoMessage('Error creating entity. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
			console.log(error) ;
		}
	);	
		}
	
	}else{
		alert("You need to Link entities required to create the new entity") 
	}	
}


function GetCreateEntity(event) {
	event.preventDefault(); // We don't want to submit this form

	var node = currentNode;

	var parentNodes = GetParentNodes(node);
	if (parentNodes.length == 0)
		return;

	var entityName = getSTAEntityPlural(document.getElementById("dlgCreateUpdateDeleteEntityType").innerHTML)
	var url = getSTAURLRoot(parentNodes[0].STAURL);

	//Entities
	if (currentNode.STAEntitiesRequiredNotLinked.length == 0) {
		for (var i = 0; i < parentNodes.length; i++) {
			var parentNode = parentNodes[i];
			if (parentNode.image == "sta.png")
				continue;
			if (i != 0 && getSTAURLRoot(parentNode.STAURL) != url) {
				alert("Not all parent nodes are from the same root URL: " + getSTAURLRoot(parentNode.STAURL) + ", " + url);
				continue;
			}

			var parentEntityName = getSTAEntityPlural(getSTAURLLastEntity(parentNode.STAURL), true);
			var entity;
			if (returnIndexEntityRelatedInSTAEntity(entityName, parentEntityName) != -1)
				entity = parentEntityName;
			else if (returnIndexEntityRelatedInSTAEntity(entityName, STAEntities[parentEntityName].singular) != -1)
				entity = STAEntities[parentEntityName].singular;
			else {
				alert("Parent node (" + STAEntities[parentEntityName].singular + ") is not directly related to a/an " + STAEntities[entityName].singular);
				continue;
			}

			if (!parentNode.STAdata || parentNode.STAdata.length == 0) {
				alert("Parent node has no STA data associated");
				return;
			}
			if (parentNode.STAdata.length > 1) {
				alert("Parent node '" + STAEntities[parentEntityName].singular + "' has more than a single record. Please select a record first.");
				return;
			}
			
		}
		

		//Properties
		var obj = obtainDataInEntitiesCreationAndUpdate("create",entityName); //Entities already added when dialog was created
		
		if (obj != false) {
			document.getElementById("DialogCreateUpdateDeleteEntity").close();
			showInfoMessage("Creating a/an " + STAEntities[entityName].singular + "...");
			GetObjectId(url, entityName, obj).then(
				function (value) {
					if (value) {
						document.getElementById("DialogCreateUpdateDeleteEntity").close();
						showInfoMessage('Available at: <a href="' + getUrlToId(url, entityName, value) + '" target="_blank">' + value + '</a>');
						node.STAURL = getUrlToId(url, entityName, value);
						node.STAdata = [];
						node.STAdata.push(obj);
						node.STAdata[0]["@iot.id"] = isNaN(value) ? value : parseInt(value);
						networkNodes.update(node);
					}
				},
				function (error) {
					showInfoMessage('Error creating entity. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
		}

	} else {
		alert("You need to Link entities required to create the new entity")
	}
}
async function GetUpdateEntity(event){
	event.preventDefault(); 
	
	var parentNodes=GetParentNodes(currentNode);
	
	var id = parseInt(document.getElementById("dlgCreateUpdateDeleteEntity_id").value);
	var parentEntityName=getSTAEntityPlural(getSTAURLLastEntity(parentNodes[0].STAURL), false);
	var url=getUrlToId(getSTAURLRoot(parentNodes[0].STAURL),parentEntityName,id);
	var entityName=getSTAEntityPlural(document.getElementById("dlgCreateUpdateDeleteEntityType").innerHTML)
	
	
	
	var childrenNodes=document.getElementById("fieldsetModificateEntities_Properties").childNodes, childrenNodes2;
	
	var obj={}, obj2={},idSplited, allowToSend=true;
	for (var i=0;i<childrenNodes.length;i++){
		
		if (currentNode.label=="Location"&&  childrenNodes[i].nodeName=="FIELDSET" ){
			childrenNodes2=childrenNodes[i].childNodes;
			console.log(childrenNodes2.length)
			for (var e=0;e<childrenNodes2.length;e++){
				if (childrenNodes2[e].nodeName=="INPUT"){
					idSplited=childrenNodes2[e].id.split("dlgCreateUpdateDeleteEntity_")[1];
					if (idSplited=="location_longitude"){
						if (childrenNodes2[e].value=="" && childrenNodes2[e].dataset.starequired=="true"){
							alert("Longitude parameter is required, please fill in the box before send");
							allowToSend=false;
							break;
						}else{
						obj2["coordinates"]=[childrenNodes2[e].value];
						}
						
						continue;
					}

					if (idSplited=="location_latitude"){
						if (childrenNodes2[e].value=="" && childrenNodes2[e].dataset.starequired=="true"){
							alert("Latitude parameter is required, please fill in the box before send");
							allowToSend=false;
							break;
						}else{
					obj2["coordinates"].push(childrenNodes2[e].value);
					obj["location"]=obj2;
						}
					
				}
				}
				
			}
			continue;
		}

		if (currentNode.label=="Datastream"&&  childrenNodes[i].nodeName=="FIELDSET" ){
			childrenNodes2=childrenNodes[i].childNodes;
			console.log(childrenNodes2.length)

			for (var e=0;e<childrenNodes2.length;e++){
				if (childrenNodes2[e].nodeName=="INPUT"){
					idSplited=childrenNodes2[e].id.split("dlgCreateUpdateDeleteEntity_")[1];
					if (idSplited=="unitOfMeasurement_name"){
						if (childrenNodes2[e].value=="" && childrenNodes2[e].dataset.starequired=="true"){
							alert("Name parameter is required, please fill in the box before send");
							allowToSend=false;
							break;
						}else{
						obj2["name"]=childrenNodes2[e].value;
						continue;
						}

					}
					if (idSplited=="unitOfMeasurement_symbol"){
						if (childrenNodes2[e].value=="" && childrenNodes2[e].dataset.starequired=="true"){
							alert("Symbol parameter is required, please fill in the box before send");
							allowToSend=false;
							break;
						}else{
						obj2["symbol"]=childrenNodes2[e].value;
							continue;						
						}
					continue;
					}
					if (idSplited=="unitOfMeasurement_definition"){
						if (childrenNodes2[e].value=="" && childrenNodes2[e].dataset.starequired=="true"){
							alert("Definition (unitOfMeasurements) parameter is required, please fill in the box before send");
							allowToSend=false;
							break;
						}else{
						obj2["definition"]=childrenNodes2[e].value;
						obj["unitOfMeasurement"]=obj2;
							continue;						
						}
					}
				}
				
			}
			continue;
		}

		if (childrenNodes[i].nodeName=="INPUT"&&childrenNodes[i].type=="text"){
			idSplited=childrenNodes[i].id.split("dlgCreateUpdateDeleteEntity_")[1];
			 if (childrenNodes[i].value=="" && childrenNodes[i].dataset.starequired=="true"){
			 //document.getElementById(childrenNodes[i].id).getAttribute("dataset-starequired")=="true"
				alert(idSplited +" parameter is required, please fill in the box before send");
				allowToSend=false;
				break;
			}else{
			if (childrenNodes[i].value!="")	{
				obj[idSplited]=childrenNodes[i].value;
			}
		}

	}

	}
	if (allowToSend==true){
		showInfoMessage("Updating  "+ STAEntities[entityName].singular +" "+id+" ...");
	 var response= await HTTPJSONData(url,null,"PUT",obj);
		 document.getElementById("DialogCreateUpdateDeleteEntity").close();
	 if (response.ok)
		showInfoMessage(STAEntities[entityName].singular +" "+"<a href='"+url+"'target='_blank'>"+id+"</a> updated.");
	 else{
		showInfoMessage("Error updating "+STAEntities[entityName].singular +" "+"<a href='"+url+"'target='_blank'>"+id+"</a> updated.");

	 }
	}			
}

async function GetUpdateEntityMultiDatastream(event){
	event.preventDefault(); 
	var obj = obtainDataInMultidatastreamsCreationAndUpdate("update");
	var id = parseInt(document.getElementById("dlgCreateUpdateDeleteEntity_id").value);
	var parentNodes=GetParentNodes(currentNode);
	var parentEntityName=getSTAEntityPlural(getSTAURLLastEntity(parentNodes[0].STAURL), false);
	var url=getUrlToId(getSTAURLRoot(parentNodes[0].STAURL),parentEntityName,id);

	if (obj != false) {
		showInfoMessage("Updating MultiDatastream " + id + " ...");
		var response = await HTTPJSONData(url, null, "PUT", obj);
		document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").close();
		if (response.ok)
			showInfoMessage("MultiDatastream <a href='" + url + "'target='_blank'>" + id + "</a> updated.");
		else
			showInfoMessage("Error updating MultiDatastream <a href='" + url + "'target='_blank'>" + id + "</a> updated.");
	}
}

function AskForDeleteEntity(event){
	event.preventDefault(); 
	var parentNodes=GetParentNodes(currentNode);
	var entityName=getSTAEntityPlural(document.getElementById("dlgCreateUpdateDeleteEntityType").innerHTML);
	var entityNameSingular= STAEntities[entityName].singular;
	var id= parentNodes[0].STAURLIdSelected;

	if (true==confirm("Do you want to erase "+entityNameSingular+" "+parentNodes[0].STAURLIdSelected))
		GetDeleteEntity(entityName, id)
}


async function GetDeleteEntity(entityName, id){
	event.preventDefault(); 
	//console.log("borrant")
	if (entityName=="MultiDatastreams"){
		document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").close();
	}else{
		document.getElementById("DialogCreateUpdateDeleteEntity").close();
	}
	
	var parentNodes=GetParentNodes(currentNode);
	var url=parentNodes[0].STAURL;

	showInfoMessage("Deleting  "+ entityName +" "+id+" ...");
	var id = parseInt(document.getElementById("dlgCreateUpdateDeleteEntity_id").value);
	var parentEntityName=getSTAEntityPlural(getSTAURLLastEntity(parentNodes[0].STAURL), false);
	var url=getUrlToId(getSTAURLRoot(parentNodes[0].STAURL),parentEntityName,id);

	var response= await HTTPJSONData(url,null,"DELETE",null);
	console.log(response)
	if (response?.ok)
		showInfoMessage(STAEntities[entityName].singular +" "+id+" has been deleted.");
	else
		showInfoMessage("Error deleting"+ STAEntities[entityName].singular +" "+id);
}

function PopulateCreateUpdateDeleteRecord(currentNode, iRecord, verify) {
	var cdns=[];

	var parentNode=GetFirstParentNode(currentNode);
	if (!parentNode) {
		alert("A parent node is needed to edit records");
		return false;
	}

	if (!parentNode.STAdata || parentNode.STAdata.length==0) {
		alert("Parent node has no STA data associated");
		return false;
	}
	var data=parentNode.STAdata;
	if (iRecord<0 || iRecord>=data.length) {
		alert("Parent node is out of range");
		return false;
	}
	var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
	var dataAttributesArray=Object.keys(dataAttributes)

	if (verify && document.getElementById("dlgCreateUpdateDeleteRecordInitialId"))
	{
		var i=parseInt(document.getElementById("dlgCreateUpdateDeleteRecordInitialId").value);
		var record=data[i];
		for (var a=0; a<dataAttributesArray.length; a++) {
			var cell=record[dataAttributesArray[a]];
			var value=document.getElementById("dlgCreateUpdateDeleteRecord_" + dataAttributesArray[a]).value;
			if (typeof cell ==="undefined" || cell==null) {
				if (value!="")
					break;
			} else if (typeof cell === "object") {
				var str=JSON.stringify(cell)
				if (cell.getDate && str.charAt(0) == '"' && str.charAt(str.length -1) == '"')
					str=str.substr(1,str.length -2);
				if (str!=value)
					break;
			} else if (cell!=value) {
				break;
			} 
		}
		if (a<dataAttributesArray.length) {
			if (false==confirm("Values has been modified but not saved by pressing 'update'. Do you want to continue and loose the modifications?"))
				return false;
		}
	}
	var record=data[iRecord];
	for (var a=0; a<dataAttributesArray.length; a++) {
		var cell=record[dataAttributesArray[a]];
		var value;
		if (typeof cell ==="undefined" || cell==null) 
			value=""
		else if (typeof cell === "object") {
			value=JSON.stringify(cell);
			if (cell.getDate && value.charAt(0) == '"' && value.charAt(value.length -1) == '"')
				value=value.substr(1,value.length -2);
		}
		else
			value=cell;
		cdns.push('<label for="dlgCreateUpdateDeleteRecord_', dataAttributesArray[a], '">', GetHTMLdataAttribute(dataAttributesArray[a], dataAttributes[dataAttributesArray[a]]), ': </label>',
			'<input id="dlgCreateUpdateDeleteRecord_', dataAttributesArray[a], '" type="text" value="', value , '"><br>');
	}
	cdns.push('<input id="dlgCreateUpdateDeleteRecordInitialId" type="hidden" value="', iRecord, '">');
	document.getElementById("dlgCreateUpdateDeleteRecordNumber").value=iRecord+1;
	document.getElementById("dlgCreateUpdateDeleteRecordLength").innerHTML=data.length;
	document.getElementById("dlgCreateUpdateDeleteRecordProperties").innerHTML=cdns.join("");
	document.getElementById("dlgCreateUpdateDeleteRecordFirst").disabled=false;
	document.getElementById("dlgCreateUpdateDeleteRecordPrevious").disabled=false;
	document.getElementById("dlgCreateUpdateDeleteRecordNext").disabled=false;
	document.getElementById("dlgCreateUpdateDeleteRecordLast").disabled=false;

	if (iRecord==0) {
		document.getElementById("dlgCreateUpdateDeleteRecordFirst").disabled=true;
		document.getElementById("dlgCreateUpdateDeleteRecordPrevious").disabled=true;
	}
	else if (iRecord==data.length-1) {			
		document.getElementById("dlgCreateUpdateDeleteRecordNext").disabled=true;
		document.getElementById("dlgCreateUpdateDeleteRecordLast").disabled=true;
	}
	return true;
}

function GetFirstRecord(event) {
	event.preventDefault(); 
	PopulateCreateUpdateDeleteRecord(currentNode, 0, true);
}

function GetPreviousRecord(event) {
	event.preventDefault(); 
	PopulateCreateUpdateDeleteRecord(currentNode, parseInt(document.getElementById("dlgCreateUpdateDeleteRecordNumber").value)-2, true);
}

function GetNumberRecord(event) {
	event.preventDefault(); 
	PopulateCreateUpdateDeleteRecord(currentNode, parseInt(document.getElementById("dlgCreateUpdateDeleteRecordNumber").value)-1, true);
}

function GetNextRecord(event) {
	event.preventDefault(); 
	PopulateCreateUpdateDeleteRecord(currentNode, parseInt(document.getElementById("dlgCreateUpdateDeleteRecordNumber").value), true);
}

function GetLastRecord(event) {
	event.preventDefault(); 
	PopulateCreateUpdateDeleteRecord(currentNode, parseInt(document.getElementById("dlgCreateUpdateDeleteRecordLength").innerHTML)-1, true);
}

function UpdateRecordId(node, iRecord) {
	var data=node.STAdata;
	if (iRecord<0 || iRecord>=data.length) {
		alert("Parent node is out of range");
		return false;
	}
	var dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);
	var dataAttributesArray=Object.keys(dataAttributes)

	var record=data[iRecord];
	var updated=false;
	for (var a=0; a<dataAttributesArray.length; a++) {
		var cell=record[dataAttributesArray[a]];
		var value=document.getElementById("dlgCreateUpdateDeleteRecord_" + dataAttributesArray[a]).value;
		if (typeof cell ==="undefined" || cell==null) {
			if (value!="") {
				record[dataAttributesArray[a]]=value;
				updated=true;
			}
		} else if (typeof cell === "object") {
			var str=JSON.stringify(cell)
			if (cell.getDate && str.charAt(0) == '"' && str.charAt(str.length -1) == '"') {
				str=str.substr(1,str.length -2);
				if (str!=value)
					record[dataAttributesArray[a]]=value;
					updated=true;
			} else if (str!=value) {
				try {
					record[dataAttributesArray[a]]=JSON.parse(value);
				} catch (e) {
					alert("Parse error: " + e + " The field content is:\n" + value);
					return false;
				}
				updated=true;
			}
		} else if (cell!=value) {
			record[dataAttributesArray[a]]=value;
			updated=true;
		}
	}
	if (updated==true)
		networkNodes.update(node);
}

function GetCreateRecord(event) {
	event.preventDefault(); 
	var parentNode=GetFirstParentNode(currentNode);
	if (!parentNode) {
		alert("A parent node is needed to edit records");
		return false;
	}
	if (!parentNode.STAdata || parentNode.STAdata.length==0) {
		alert("Parent node has no STA data associated");
		return false;
	}
	var iRecord=parseInt(document.getElementById("dlgCreateUpdateDeleteRecordNumber").value)-1;
	var data=parentNode.STAdata;
	if (iRecord<0 || iRecord>=data.length) {
		alert("Parent node is out of range");
		return false;
	}
	data.splice(iRecord+1, 0, deapCopy(data[iRecord]));
	UpdateRecordId(parentNode, iRecord+1);
	networkNodes.update(parentNode);
	PopulateCreateUpdateDeleteRecord(currentNode, iRecord+1, false);
}

function GetUpdateRecord(event) {
	event.preventDefault(); 
	var parentNode=GetFirstParentNode(currentNode);
	if (!parentNode) {
		alert("A parent node is needed to edit records");
		return false;
	}

	if (!parentNode.STAdata || parentNode.STAdata.length==0) {
		alert("Parent node has no STA data associated");
		return false;
	}
	var iRecord=parseInt(document.getElementById("dlgCreateUpdateDeleteRecordNumber").value)-1;
	UpdateRecordId(parentNode, iRecord);
	PopulateCreateUpdateDeleteRecord(currentNode, iRecord, true);
}


function AskForDeleteRecord(event) {
	event.preventDefault(); 
	if (false==confirm("Do you want to erase this record?"))
		return
	var parentNode=GetFirstParentNode(currentNode);
	if (!parentNode) {
		alert("A parent node is needed to edit records");
		return false;
	}
	if (!parentNode.STAdata || parentNode.STAdata.length==0) {
		alert("Parent node has no STA data associated");
		return false;
	}
	var iRecord=parseInt(document.getElementById("dlgCreateUpdateDeleteRecordNumber").value)-1;
	var data=parentNode.STAdata;
	if (iRecord<0 || iRecord>=data.length) {
		alert("Parent node is out of range");
		return false;
	}
	data.splice(iRecord, 1);
	networkNodes.update(parentNode);
	PopulateCreateUpdateDeleteRecord(currentNode, iRecord, false);
}

function GetSelectRow(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSelectRow").close();

	if (currentNode.STAURL)
		var previousSTAURL=currentNode.STAURL;

	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		if (parentNode.STAURL)
			currentNode.STAURL = parentNode.STAURL;
		if (parentNode.OGCType=="OGCAPIcollections")
			currentNode.OGCType = "OGCAPIcollection";
		if (parentNode.OGCType=="EDCCatalogue") {
			currentNode.OGCType = "EDCAsset";
			currentNode.EDCConsumerURL = parentNode.EDCConsumerURL;
		}	
		if (parentNode.OGCType=="S3Buckets" || parentNode.OGCType=="S3Bucket") {
			currentNode.OGCType = parentNode.OGCType;
			currentNode.STAAccessKey = parentNode.STAAccessKey;
			currentNode.STASecretKey = parentNode.STASecretKey;
			currentNode.STAS3Service = parentNode.STAS3Service;
		}
	}
	else
		return;

	var elems = document.getElementsByName("SelectRowRadio");
	for (var i = 0; i < elems.length; i++) {
		if (elems[i].checked)
			break;
	}
	var requiresLoadJSON=currentNode.STAURL && (!parentNode || 
				(parentNode.OGCType!="OGCCSW" && parentNode.OGCType!="S3Buckets" && parentNode.OGCType!="S3Bucket"  && parentNode.OGCType!="EDCCatalogue")
			);
	if (i < elems.length) {
		if (requiresLoadJSON) {
			const s = elems[i].id.substring("SelectRow_".length);
			currentNode.STAURLIdSelected=s;

			//if (currentNode?.OGCType=="OGCAPIitems")
			//	currentNode.STAURL = parentNode.STAdata ? (parentNode.STAdata[i].link ? getURLWithoutQueryParams(parentNode.STAdata[i].link) : currentNode.STAURL+"/"+parentNode.STAdata[i].id) + "/items"  : parentNode.STAURL;
			if (parentNode?.OGCType=="OGCAPIcollections"){
				currentNode.STAURL = RemoveQueryParamFromURL(parentNode.STAdata[s].link, "f");
			} else {
				const n = Number(s);
				currentNode.STAURL = AddQueryParamsToURL(getURLWithoutQueryParams(currentNode.STAURL) + (Number.isInteger(n) ? "(" + n + ")" : "('" + s + "')"), getURLQueryParams(currentNode.STAURL));
			}
		}
		else  //This should be a table operation: I'll do it myself here
		{
			if (parentNode.STAdata && i<parentNode.STAdata.length){
				currentNode.STAdata=[];
				currentNode.STAdata.push(deapCopy(parentNode.STAdata[i]));
			}
		}
	}
	if (requiresLoadJSON){
		// currentNode.STAExpectedLength = parentNode.STAExpectedLength;
		currentNode.STAExpectedLength = document.getElementById("SelectNumberOfRecordsSelectRow").value;				
		//if (currentNode.OGCType=="OGCAPIitems")
		//	askForCollectionQueryables();
	}
	else
		currentNode.STAURL = null;
		
	networkNodes.update(currentNode);
	if (requiresLoadJSON)
	{
		showInfoMessage("Selecting OGC row...");
		UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
		LoadJSONNodeSTAData(currentNode);
	}
}

function GetFilterRowsSTA() {
		var previousSTAURL = currentNode.STAURL;
		var parentNode = GetFirstParentNode(currentNode);
		if (parentNode) {
			if (parentNode.STAURL)
				currentNode.STAURL = parentNode.STAURL;
			if (parentNode.STAdata)
				currentNode.STAdata = deapCopy(parentNode.STAdata);
		}
		else
			return;

		currentNode.STAUrlAPICounter = []; // I need to restart it 
		var previousURL = parentNode.STAURL;//put URL ready to add things

		var prevFilter = GetQueryParamFromURL(previousURL, "$filter");
		if (prevFilter) {
			currentNode.STAUrlAPI = RemoveQueryParamFromURL(previousURL, "$filter");
			currentNode.STAUrlAPI = AddQueryParamsToURL(currentNode.STAUrlAPI, "$filter=" + prevFilter + " and ");
		}
		else
			currentNode.STAUrlAPI = AddQueryParamsToURL(previousURL, "$filter=");

		stopreadInformationRowFilterSTA = false;
		var entity=getSTAURLLastEntity(currentNode.STAURL);

		readInformationRowFilterSTA(currentNode.STAelementFilter, entity, "no", "no"); //apply filter
		currentNode.STAURL = currentNode.STAUrlAPI;

		currentNode.STAExpectedLength = document.getElementById("SelectNumberOfRecordsFilterRows").value;
		LoadJSONNodeSTAData(currentNode);
		UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
	}
function GetFilterRowsTable() {
	stopreadInformationRowFilterTable = false;
	currentNode.STAtableCounter = [];
	currentNode.STAtable = "";
	readInformationRowFilterTable(currentNode.STAelementFilter, "no", "no"); //apply filter
	applyEvalAndFilterData();
	UpdateChildenTable(currentNode);
		
}
async function GetFilterRowsOGCAPIFeatures(){
	var previousNode=networkNodes.get(network.getConnectedNodes(currentNode.id, "from"));
	var previousURL = previousNode[0].STAURL;//put URL ready to add things 
	if (currentNode.STAOGCAPIconformance.includes("cql-text")){
		currentNode.STAUrlAPICounter = []; // I need to restart it 
		stopreadInformationRowFilterOGCAPIFeatures = false;
		currentNode.STAURL = previousURL  +"?filter=";
		if (currentNode.STAUrlAPI){
			currentNode.STAUrlAPI="";
		}
		readInformationRowFilterOGCAPIFeatures(currentNode.STAelementFilter, "no", "no"); //apply filter
		currentNode.STAURL = currentNode.STAURL+currentNode.STAUrlAPI+"&f=json";
		currentNode.STAExpectedLength = document.getElementById("SelectNumberOfRecordsFilterRows").value;
		LoadJSONNodeSTAData(currentNode);
		networkNodes.update(currentNode);
		UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousURL);
	}
}

function GetFilterRows(event) {
	event.preventDefault(); // We don't want to submit this form	
	//updateinfoFilter
	takeSelectInformation(currentNode.id);

	//ALERT
	//currentNode.STAinfoFilter
	var close=true;
	for (var i=0;i<currentNode.STAinfoFilter.length;i++){
		if (currentNode.STAinfoFilter[i][2][0]==" "){
			alert ("There is at least one Property field not chosen ");
			close=false;
		}
		else if (currentNode.STAinfoFilter[i][3]=="--- Choose operator ---"){
			alert ("There is at least one operator field not chosen ");
			close=false;
		}
		else if (currentNode.STAinfoFilter[i][4]==""){
			alert ("There is at least one value empty ");
			close=false;
		}
	}

	if (currentNode.image == "FilterRowsTable.png" ) { //import CSV
		GetFilterRowsTable();
	}else if (currentNode.STAOGCAPIconformance){//OGCAPIFeatures
		if (currentNode.STAOGCAPIconformance?.includes("filter")){
			GetFilterRowsOGCAPIFeatures()// we can apply filter from API
		}else{
			GetFilterRowsTable(); //No filter, use table filter
		}
	}else if (currentNode.image == "FilterRowsSTA.png"){ //STA
		GetFilterRowsSTA();
	}
	if (close) document.getElementById("DialogFilterRows").close();
	showInfoMessage("Filtering STA rows...");
	networkNodes.update(currentNode);

}

function getGeospatialFilter(node, parentNode){
	var data=node.STAdata, geometry, coords, cdns=[];
	for (var i=0; i<data.length; i++){
		cdns.push("geo.intersects(");
		var id=IdOfSTAEntity(parentNode);
		if (STAEntitiesArray[id]=="Parties" || STAEntitiesArray[id]=="Sensors" || STAEntitiesArray[id]=="ObservedProperties" || STAEntitiesArray[id]=="Things" || STAEntitiesArray[id]=="Licenses")
			cdns.push("Observations/FeatureOfInterest/");
		else if (STAEntitiesArray[id]=="Datastreams" || STAEntitiesArray[id]=="MultiDatastreams" || STAEntitiesArray[id]=="ObservationGroups")
			cdns.push("Observations/FeatureOfInterest/");
		else if (STAEntitiesArray[id]=="Observations")
			cdns.push("FeatureOfInterest/");
		cdns.push("feature,geography'");
		geometry=data[i]["geometry"];
		coords=geometry["coordinates"];
		if (geometry["type"]=="Polygon") {
			cdns.push("POLYGON (");
			for (var j=0; j<coords.length; j++){
				cdns.push("(");
				for (var k=0; k<coords[j].length; k++){
					cdns.push(coords[j][k][0], " ", coords[j][k][1]);
					if (k<coords[j].length-1)
						cdns.push(", ");
				}
				cdns.push(")");
				if (j<coords.length-1)
					cdns.push(",");
			}
			cdns.push(")')");
		}
		if (i<data.length-1)
			cdns.push(" or ");
	}
	return cdns.join("");
}

function DoGeoFilterRows(node) {
	var previousSTAURL=node.STAURL;
	var nodes=GetParentNodes(node);
	if (nodes && nodes.length>1)
		var parentNode=nodes[0];
	else
		return;				
	
	if (parentNode.STAURL)
		node.STAURL = parentNode.STAURL;
	if (parentNode.STAdata)
		node.STAdata = deapCopy(parentNode.STAdata);

	var previousURL = parentNode.STAURL;

	var geo=getGeospatialFilter(nodes[1], nodes[0]);
	
	if (!geo)
		return;

	var prevFilter=GetQueryParamFromURL(parentNode.STAURL, "$filter");
	if (prevFilter) {
		node.STAURL=RemoveQueryParamFromURL(parentNode.STAURL, "$filter");
		node.STAURL=AddQueryParamsToURL(node.STAURL, "$filter=" + prevFilter + " and " + geo);
	}
	else
		node.STAURL=AddQueryParamsToURL(parentNode.STAURL, "$filter="+geo);

	node.STAExpectedLength = parseInt(document.getElementById("SelectSortByNumberOfRecords").value);
	networkNodes.update(node);
	showInfoMessage("Filtering STA rows by polygon...");
	UpdateChildenSTAURL(node, node.STAURL, previousSTAURL);
	LoadJSONNodeSTAData(node);
}

function GetJoinTables(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogJoinTables").close();
	UpdateJoinTablesRowMatchingNode(currentNode);
	if (document.getElementById("DialogJoinTablesNotMatchRemove").checked)
		currentNode.STAJoinTables.NotMatch="Remove";
	else if (document.getElementById("DialogJoinTablesNotMatchLeftTable").checked)
		currentNode.STAJoinTables.NotMatch="LeftTable";
	else //if (document.getElementById("DialogJoinTablesNotMatchBothTables").checked)
		currentNode.STAJoinTables.NotMatch="BothTables";
	var parentNodes=GetParentNodes(currentNode);
	if (!parentNodes && parentNodes.length<2) {
		return;
	}
	currentNode.STAdataAttributes={};
	currentNode.STAdata=JoinTablesData(parentNodes[0].STAdata, parentNodes[1].STAdata, 
			parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(parentNodes[0].STAdata), 
			parentNodes[1].STAdataAttributes ? parentNodes[1].STAdataAttributes : getDataAttributes(parentNodes[1].STAdata), 
			currentNode.STAdataAttributes, currentNode.STAJoinTables);
	networkNodes.update(currentNode);
}

function IdOfSTAEntity(node) {
	for (var i = 0; i < STAEntitiesArray.length; i++) {
		if (node.image == STAEntitiesArray[i] + ".png")
			return i;
	}
	//Perhaps this node is a filter of a previous node. The URL can help me to find the entity to use
	if (node.STAURL)
		return STAEntitiesArray.indexOf(getSTAURLLastEntity(node.STAURL));
	return -1;
}

function IdOfSTASpecialQueries(node) {
	for (var i = 0; i < STASpecialQueriesArray.length; i++) {
		if (node.image == STASpecialQueriesArray[i] + ".png")
			return i;
	}
	return -1;
}

function UpdateChildenSTAURL(parentNode, currentSTAURLroot, previousSTAURLroot) {
	var nodeIds = network.getConnectedNodes(parentNode.id, 'to');
	for (var i = 0; i < nodeIds.length; i++) {
		var node = networkNodes.get(nodeIds[i])
		if (node.STAURL && currentSTAURLroot && previousSTAURLroot) {
			var previousSTAURLrootWithoutQuery=getURLWithoutQueryParams(previousSTAURLroot);
			if (node.STAURL.substring(0, previousSTAURLrootWithoutQuery.length)==previousSTAURLrootWithoutQuery)
			{
				var previousQueryParams=getURLQueryParams(previousSTAURLroot)
				var currentQueryParams=getURLQueryParams(currentSTAURLroot)
				var queryParam=getURLQueryParams(node.STAURL);
				if (!previousQueryParams && !currentQueryParams)
					;
				else if (!previousQueryParams)
					queryParam=queryParam ? queryParam + '&' + currentQueryParams : currentQueryParams;
				else 
					queryParam=queryParam.replace(previousQueryParams, currentQueryParams);
				
				getURLQueryParams(node.STAURL).replace(previousQueryParams, getURLQueryParams(currentSTAURLroot))
				node.STAURL = AddQueryParamsToURL(getURLWithoutQueryParams(currentSTAURLroot)+getURLWithoutQueryParams(node.STAURL).substring(previousSTAURLrootWithoutQuery.length), 
							queryParam);
				networkNodes.update(node);
			}
		}
		UpdateChildenSTAURL(node, currentSTAURLroot, previousSTAURLroot);
	}
}

/*function UpdateChildTableNode(node, parentNode) {
	node.STAdata = deapCopy(parentNode.STAdata);
	if (parentNode.STAdataAttributes)
		node.STAdataAttributes = deapCopy(parentNode.STAdataAttributes);
	if (parentNode.STAfileUrl)
		node.STAfileUrl = deapCopy(parentNode.STAfileUrl);
	networkNodes.update(node);
}*/

function UpdateChildenTable(parentNode) {
	var nodeIds = network.getConnectedNodes(parentNode.id, 'to');
	for (var i = 0; i < nodeIds.length; i++) {
		var node=networkNodes.get(nodeIds[i]);
		//if (parentNode.STAdata) { 
		//	if (node.image == "SelectColumnsTable.png" || node.image == "Meaning.png"))
		StartCircularImage(node, parentNode, false, false, true);  // Before was UpdateChildTableNode(node, parentNode);
		//}
		UpdateChildenTable(node);
	 }
}

async function UpdateChildenLoadJSONCallback(parentNode) {
	var nodeIds = network.getConnectedNodes(parentNode.id, 'to');
	for (var i = 0; i < nodeIds.length; i++) {
		var node = networkNodes.get(nodeIds[i])
		//if (node.image == "SeparateColumns.png")
			//SeparateColumnsNode(node, parentNode); No se si te sentit perque ara hi ha més possibilitats que quan es va pensar això
		//else 
		if (node.image == "SelectColumnsTable.png")
		{
			//pensar com es podria fer.
			showInfoMessage("Automatic update of SelectColumns not implemented for table nodes.");
		}
		else if (IdOfSTAEntity(node) != -1 || IdOfSTASpecialQueries(node)!=-1 || STAOperations[removeExtension(node.image)].callSTALoad)
		{
			showInfoMessage("Updating "+ removeExtension(node.image) + " ...");
			await LoadJSONNodeSTAData(node);
		}
		else if (node.image == "OneValueSTA.png")
		{
			if (node.STAtimeOut) {
				clearTimeout(node.STAtimeOut);
				node.STAtimeOut=null;
			}
			await RequestLastObservationAndRefreshOneValue(node, node.STAvariable, node.STAtimeVariable, node.STAredrawPeriod);
		}
		else if (node.image == "CountResultsSTA.png")
		{
			if (node.STACountTimeOut) {
				clearTimeout(node.STACountTimeOut);
				node.STACountTimeOut=null;
			}
			await requestAndRefreshCountResults(node, node.STAredrawPeriodCount);
		}
	}
}

function getCSVWTypeFromAttributeType(t)
{
	if (t=="array" || t=="null" || t=="object" || t=="undefined")
		return "json";
	return t;
}

//Taking this into consideration: https://www.w3.org/TR/tabular-data-primer
function getAttributeTypeFromCSVWType(t) {
	if (typeof t==="object" && t.base)
		t=t.base;
	if (t=="json")
		return "object";
	if (t=="decimal" || t=="long" || t=="int" || t=="short" || t=="byte" || t=="nonNegativeInteger"  || t=="positiveInteger" || t=="unsignedLong" || t=="unsignedInt" || t=="unsignedShort" || t=="unsignedByte" || t=="nonPositiveInteger"  || t=="negativeInteger")
		return "number";
	if (t=="double" || t=="float")
		return "number";
	if (t=="date" || t=="time")
		return "isodatetime";
	if (t=="normalizedString" || t=="token" || t=="Name" || t=="NMTOKEN" || t=="xml" || t=="html")
		return "string";
	return t;
}


function getJSONSchemaTypeFromAttributeType(t) {
	if (t=="anyURI" && t=="isodatetime")
		return "string";
	return t;
}

function getJSONTypeOrISODatetime(s) {
	var type=getJSONType(s), numberReturned;
	if (type =="string" && (s.length==19 || s.length==20 || s.length==23 || s.length==25)){ //  If fragmentStartsWithISODate receives something that is not a string it fails
		numberReturned= fragmentStartsWithISODate(s, 0);
		if (numberReturned!=0)return "isodatetime";
	}
		
	return type;
}

function getHTMLCharacterAttributeType(type) {
	var cdns=[];
	cdns.push('<span class="roundCorner" style="background-color: ');
	switch(type) {
		case "boolean":
			cdns.push('DarkGrey');
			break;
		case "array":
			cdns.push('DarkOrange');
			break;
		case "null":
			cdns.push('LightSlateGrey');
			break;
		case "object":
			cdns.push('Fuchsia');
			break;
		case "undefined": 
			cdns.push('LightGrey');
			break;
		case "integer": 
			cdns.push('IndianRed');
			break;
		case "number":
			cdns.push('Red');
			break;
		case "isodatetime":
			cdns.push('BlueViolet');					
			break;
		case "anyURI":
			cdns.push('Coral');
			break;
		case "string":
		default:
			cdns.push('ForestGreen');
	}
	cdns.push('" title="', type,'">');
	switch(type) {
		case "boolean":
			cdns.push('B');
			break;
		case "array":
			cdns.push('A');
			break;
		case "null":
			cdns.push('N');
			break;
		case "object":
			cdns.push('O');
			break;
		case "undefined":
			cdns.push('U'); 
			break;
		case "integer": 
			cdns.push('I');
			break;
		case "number":
			cdns.push('N');
			break;
		case "isodatetime":
			cdns.push('D');
			break;
		case "anyURI":
			cdns.push('L');
			break;
		case "string":
		default:
			cdns.push('C');
	}
	cdns.push('</span>');
	return cdns.join('');
}

//Creates dataAttributes and determines the "type" attribute.
//Possible values are the usual JSON types ("string", "boolean", "array", "null", "object", "undefined", "integer", "number")
// plus "isodatetime" and "anyURI"
function getDataAttributes(data) {
	var dataAttributes = {}, dataAttribute, type;

	for (var i = 0; i < data.length; i++) {
		var record=data[i];
		var keys = Object.keys(record);
		for (var k = 0; k < keys.length; k++) {
			if (dataAttributes[keys[k]]) {
				dataAttribute=dataAttributes[keys[k]];
				if (!isAttributeAnyURI(keys[k]))
				{
					type=getJSONTypeOrISODatetime(record[keys[k]]);
					if (dataAttribute.type=="null" || dataAttribute.type=="undefined")
						dataAttribute.type=type;
					if (type!="null" && type!="undefined")
					{
						if ( (dataAttribute.type=="boolean" && type!="boolean") ||
							((dataAttribute.type=="integer" || dataAttribute.type=="number") && (type=="object" || type=="array" || type=="string")) ||
							(dataAttribute.type=="string" && (type=="object" || type=="array")) ||
							(dataAttribute.type=="array" && type=="object") )
							dataAttribute.type=type;
						else if (dataAttribute.type=="integer" && type=="number")
							dataAttribute.type="number";
						else if (dataAttribute.type=="isodatetime" && (type=="string" || type=="number"))
							dataAttribute.type="string";
					}
					if (dataAttribute.type=="object")
						break;
				}
			}
			else
				dataAttributes[keys[k]]={
					type: isAttributeAnyURI(keys[k]) ? "anyURI" : getJSONTypeOrISODatetime(record[keys[k]])
				};
		}
	}
	return dataAttributes;
}

//Add the definition URL to a preexisting dataAttributes based on the STA Entity requested.
function addSemanticsSTADataAttributes(dataAttributes, url) {
	var dataAttributesArray = Object.keys(dataAttributes);

	var parentLastEntity=getSTAEntityPlural(getSTAURLLastEntity(url), true);
	for (var attr = 0; attr < dataAttributesArray.length; attr++) {
		dataAttributes[dataAttributesArray[attr]].definition="http://www.opengis.net/def/docs/15-078r6/" + STAEntities[parentLastEntity].singular + "/" + dataAttributesArray[attr];
	}
}

function isAttributeAnyURI(s){
	return (s == "url" || s == "definition" || s.endsWith("@iot.selfLink") || s.endsWith("@iot.navigationLink"));
}

function isAttributeSelfNavLink(s){
	return (s.endsWith("@iot.selfLink") || s.endsWith("@iot.navigationLink"));
}

function ShowTableOptionsDiv(node, optionsDiv, fn_showTable) {
	if (node.STAdata && node.STAdata.length)
		document.getElementById(optionsDiv).innerHTML = "<label><input type='checkbox' "+ ((!document.getElementById(optionsDiv + "RowNumber") || document.getElementById(optionsDiv + "RowNumber").checked) ? "checked='checked' " : "") +"id='" + optionsDiv + "RowNumber' onChange='"+fn_showTable+"(networkNodes.get(\"" + node.id + "\"));'/> Show row numbers</label> &ensp;" +
								"<label><input type='checkbox' "+ ((!document.getElementById(optionsDiv + "SelfNavLink") || document.getElementById(optionsDiv + "SelfNavLink").checked) ? "checked='checked' " : "") +"id='" + optionsDiv + "SelfNavLink' onChange='"+fn_showTable+"(networkNodes.get(\"" + node.id + "\"));'/> Show self and navigation links</label>";
	else
		document.getElementById(optionsDiv).innerHTML = "";
}

function ShowTableDialog(node) {
	var data = node.STAdata;

	if (!data || !data.length) {
		document.getElementById("DialogOKHTML").innerHTML = "No data to show.";
		return;
	}

	document.getElementById("DialogOKHTML").innerHTML = GetHTMLTable(data, node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data),
		document.getElementById("DialogOKOptionsRowNumber").checked ? true : false,
		"", null, null, "", isAttributeAnyURI, document.getElementById("DialogOKOptionsSelfNavLink").checked ? null : isAttributeSelfNavLink);
}

function StringifyObjectElements(data, dataAttributesInput) {
	var dataAttributes = dataAttributesInput? dataAttributesInput : getDataAttributes(data);
	var jsonTable=[];
	var dataAttributesArray = Object.keys(dataAttributes);

	for (var i = 0; i < data.length; i++) {
		jsonTable[i]={};
		for (var a = 0; a < dataAttributesArray.length; a++)
			{
			if (typeof data[i][dataAttributesArray[a]] === "object")  //"arrays" are also objects.
				jsonTable[i][dataAttributesArray[a]]=JSON.stringify(data[i][dataAttributesArray[a]]);
			else
				jsonTable[i][dataAttributesArray[a]]=data[i][dataAttributesArray[a]];
		}
	}
	return jsonTable;
}


function GetGeoJSON(data, selectedOptions) {
	var geojson={"type": "FeatureCollection", "features": []};

	if (selectedOptions.time && selectedOptions.value) {
		var dataSorted=deapCopy(data); 

		//Sorted by place, variable and date (older first).
		dataSorted.sort(function (a, b) {
			if (a[selectedOptions.place]<b[selectedOptions.place])
				return -1;
			if (a[selectedOptions.place]>b[selectedOptions.place])
				return 1;
			if (a[selectedOptions.longitude]-b[selectedOptions.longitude]<-0.0000001)
				return -1;
			if (a[selectedOptions.longitude]-b[selectedOptions.longitude]>0.0000001)
				return 1;
			if (a[selectedOptions.latitude]-b[selectedOptions.latitude]<-0.0000001)
				return -1;
			if (a[selectedOptions.latitude]-b[selectedOptions.latitude]>0.0000001)
				return 1;
			if (a[selectedOptions.variable]<b[selectedOptions.variable])
				return -1;
			if (a[selectedOptions.variable]>b[selectedOptions.variable])
				return 1;
			if (a[selectedOptions.time]<b[selectedOptions.time])
				return -1;
			if (a[selectedOptions.time]>b[selectedOptions.time])
				return 1;
			return 0;});
		var a, b;
		for (var i = 0, f=-1; i < dataSorted.length; i++) {
			a=dataSorted[i], b=dataSorted[i==0 ? 0 : i-1];
			if (i==0 || a[selectedOptions.place]!=b[selectedOptions.place] ||
				a[selectedOptions.longitude]>b[selectedOptions.longitude]+0.0000001 ||
				a[selectedOptions.latitude]<b[selectedOptions.latitude]-0.0000001 ||
				a[selectedOptions.latitude]>b[selectedOptions.latitude]+0.0000001)
			{
				f++;
				geojson.features[f]={
					"type": "Feature",
					"geometry": {
						"type": "Point",
						"coordinates": [
							a[selectedOptions.longitude],
							a[selectedOptions.latitude]
						]
					},
					"properties": {
						"Place": a[selectedOptions.place],
					}
				};
			}
			geojson.features[f].properties[a[selectedOptions.variable]+"_"+a[selectedOptions.time]]=a[selectedOptions.value];
		}
	}
	else
	{
		for (var i = 0; i < data.length; i++) {
			var a=data[i];
			geojson.features.push({
					"type": "Feature",
					"geometry": {
						"type": "Point",
						"coordinates": [
							a[selectedOptions.longitude],
							a[selectedOptions.latitude]
						]
					},
					"properties": {
					}
				});
			if (selectedOptions.place) {
				geojson.features[i].properties["Place"]=a[selectedOptions.place];
			}
			var propertiesArray = Object.keys(a);
			for (var j=0; j<propertiesArray.length; j++) {
				if (propertiesArray[j]==selectedOptions?.place || propertiesArray[j]==selectedOptions?.longitude || propertiesArray[j]==selectedOptions?.latitude)
					continue;
				geojson.features[i].properties[propertiesArray[j]]=a[propertiesArray[j]];
			}
		}
	}
	return geojson;
}

function GetGeoJSONSchema(data, selectedOptions) {
	return {
		"$id": "https://meaning.ad4gd.eu/meaning.schema.json",
		"$schema": "https://meaning.ad4gd.eu/json-meta/meaning",
		"type": "object",
		"properties": {
			"features": {
				"type": "array",
				"items": {
					"type": "object",
					"properties": {
						"geometry": {
							"type": "object",
							"properties": {
								"type": {"type": "string"},
								"coordinates": {"type": "array"}
							}
						},
						"properties": {
							"type": "object",
							"properties": GetGeoJSONPropertiesSchema(data, null, selectedOptions)
						}
					}
				}
			}
		}
	};
}

function GetGeoJSONPropertiesSchema(data, dataAttributes, selectedOptions) {

	var attributes={};
	if (selectedOptions.place)
		attributes["Place"]= {"description": "Place name", "mostrar": "si"};

	if (selectedOptions.time && selectedOptions.value) {
		var dataSorted=deapCopy(data);

		//Sorted by variable.
		dataSorted.sort(function (a, b) {
			if (a[selectedOptions.variable]<b[selectedOptions.variable])
				return -1;
			if (a[selectedOptions.variable]>b[selectedOptions.variable])
				return 1;
			return 0;});
		var a, b, UoMSymbol;
		for (var i = 0; i < dataSorted.length; i++) {
			a=dataSorted[i], b=dataSorted[i==0 ? 0 : i-1];
			if (i==0 || a[selectedOptions.variable]!=b[selectedOptions.variable])
			{
				UoMSymbol=a[selectedOptions.variableUoMSymbol];
				if (UoMSymbol=="ug/m3")
					UoMSymbol=="µg/m³";
				attributes[a[selectedOptions.variable] + "_{time?f=ISO}"]={
					"description": a[selectedOptions.variableDescription],
					"definition": a[selectedOptions.variableDefinition],
					"UoM": a[selectedOptions.variableUoM],
					"UoMSymbol": UoMSymbol,
					"UoMDefinition": a[selectedOptions.variableUoMDefinition],
					"mostrar": "si",
					"serieTemporal": {
						"color": "#ff0000"
					}
				};
			}
		}
	} else {
		if (!dataAttributes)
			dataAttributes=getDataAttributes(data);
		var dataAttributesArray = Object.keys(dataAttributes);
		for (i=0; i<dataAttributesArray.length; i++)
		{
			if (dataAttributesArray[i]==selectedOptions?.place || dataAttributesArray[i]==selectedOptions?.longitude || dataAttributesArray[i]==selectedOptions?.latitude)
				continue;
			attributes[dataAttributesArray[i]]={
				"description": dataAttributes[dataAttributesArray[i]].description ? dataAttributes[dataAttributesArray[i]].description : null,
				"definition": dataAttributes[dataAttributesArray[i]].definition ? dataAttributes[dataAttributesArray[i]].definition : null,
				"UoM": dataAttributes[dataAttributesArray[i]].UoM ? dataAttributes[dataAttributesArray[i]].UoM : null,
				"UoMSymbol": dataAttributes[dataAttributesArray[i]].UoMSymbol? dataAttributes[dataAttributesArray[i]].UoMSymbol : null,
				"UoMDefinition": dataAttributes[dataAttributesArray[i]].UoMDefinition ? dataAttributes[dataAttributesArray[i]].UoMDefinition : null,
				"mostrar": "si",
			};
		}
	}
	return attributes;
}

function GetGeoJSONMetaschema() {
	return {
"title": "GeoJSON properties meaning schema",
"$schema": "http://json-schema.org/draft/2019-09/schema#",
"$id": "https://meaning.ad4gd.eu/json-meta/meaning",
"$vocabulary": {
"https://json-schema.org/draft/2019-09/vocab/core": true,
"https://json-schema.org/draft/2019-09/vocab/applicator": true,
"https://json-schema.org/draft/2019-09/vocab/validation": true,
"https://json-schema.org/draft/2019-09/vocab/meta-data": true,
"https://json-schema.org/draft/2019-09/vocab/format": false,
"https://json-schema.org/draft/2019-09/vocab/content": true,
"https://meaning.ad4gd.eu/json-meta/meaning": false
},
"$recursiveAnchor": true,
"allOf": [
{
	"$ref": "https://json-schema.org/draft/2019-09/schema"
},
{
	"$ref": "#/definitions/AttributeDescription"
}
],
"definitions": {
"AttributeDescription": {
	"title": "GeoJSON meaning vocabulary meta-schema",
	"type": "object",
	"$comment": "The name of the property is the name of the attribute. If the server is SOS there are 2 special names can be used __om_time__, __om_sensor__ and the rest match the field names of the table containing the data. The properties that define each attribute can be de ones defined below or properties from JSON schema itself if indicated in this comment. For the moment, only 'description' is implemented. Others from 'string' (https://json-schema.org/understanding-json-schema/reference/string.html) or number can be useful (https://json-schema.org/understanding-json-schema/reference/numeric.html).",
	"properties": {
		"originalName": {
			"description": "Name of the original attribute. Optional. If the attributes are taken from a CSV and are transformed into one or more attributes (because they are associated with time). In this case the nomOri maybe different from the property name.",
			"type": [ "string", "null" ]
		},
		"symbol": {
			"description": "Symbol of the attribute. Note that it is not the units of measurement symbol but the attribute itself. For example, the letter 'σ' (sigma) usually represents the standard deviation. It will be used in the compact display (coordinates box) if defined. Created for statistical attributes, but can be used elsewhere.",
			"type": [ "string", "null" ]
		},
		"descripcio": {
			"description": "Description of the attribute in multiple languages. If you do not need multilanguage support, please use 'description'",
			"$ref": "#/definitions/StringOCadenaLang"
		},
		"definition": {
			"description": "A URI that defines the observedProperty or the variable. You may find the right definitions in https://qudt.org/2.1/vocab/quantitykind, http://vocabs.lter-europe.net/EnvThes or https://www.eea.europa.eu/help/glossary/eea-glossary.",
			"type": [ "string", "null" ],
			"format": "uri"
		},
		"UoM": {
			"description": "Units of measurement of the attribute. Formerly refered as 'unitats'",
			"type": [ "string", "null" ]
		},
		"UoMSymbol": {
			"description": "Symbol of the units of measurement of the atributte.",
			"type": [ "string", "null" ]
		},
		"UoMDefinition": {
			"description": "A URI that defines the units of measurement of the observedProperty or variable. You may find the right definitions in https://qudt.org/2.1/vocab/unit",
			"type": [ "string", "null" ],
			"format": "uri"
		},
		"calcul": {
			"description": "Mathematical formula to transform the values of one or more properties of another vector or raster 'capa'. To point to a raster 'capa', see the explanation in 'component'; to point to a vector 'capa', we should use {'i_capa': 2, 'prop': 'flower_name'} to refer to 'capa' 2 which is of 'model' ='vector'. Can only be used if there are capa.objectes on the given 'capa'. If you do not specify i_capa, this 'capa' is assumed. For each 'objecte' {'i_capa': 2, 'prop': 'flower_name'} (or the equivalent for raster 'capa' for each pixel) is transformed into the value and, once done, the formula is evaluated as JavaScript syntax.",
			"type": "string"
		},
		"FormulaConsulta": {
			"description": "Mathematical formula to transform the values of objectes[].feature[].properties of this 'capa' (or into values[]). To know about v[0] etc see the explanation under 'component'. Use p['name'] to indicate the name of the property inside properties. You can also specify nomPropId to refer to the feature identifier (e.g. the feature id, in case of GeoJSON). Can only be used if there is capa.valors or capa.objectes. If you want to choose a value from another 'capa' use 'calcul' instead. Internally, 'FormulaConsulta' is transformed into 'calcul'.",
			"type": "string"
		},
		"separador": {
			"description": "Separator of the next block of attributes",
			"$ref": "#/definitions/StringOCadenaLang"
		},
		"esLink": {
			"description": "Is the attribute value a link?",
			"type": "boolean"
		},
		"descLink": {
			"description": "Description of the link",
			"$ref": "#/definitions/StringOCadenaLang"
		},
		"esImatge": {
			"description": "Is the attribute value a image URI?. This forces the attribute to appear as an embedded image in the query box",
			"type": "boolean"
		},
		"FormatVideo": {
			"description": "If the attribute is a link to a video, this is the video format. This forces the attribute to appear as an embedded video with a play button in the query box. It should be a MIME type. Example: video/mp4. optional",
			"type": "string",
			"format": "uri"
		},
		"mostrar": {
			"description": "Should it be shown in the query box? Can be 'si' (always), 'no' (never), 'si_ple' (it will only be displayed if the attribute has content).",
			"enum": [ "si", "no", "si_ple" ]
		},
		"mida": {
			"description": "Implementation pending (maxLength should be used instead of 'mida'). Attribute size. Optional. Maximum width the field type can have. In the case of numerical types it is the maximum precision. In the case of strings it is the maximum length in characters. In the case of date-time it is the maximum length in characters of the representation of the date-time as text.",
			"type": "number"
		},
		"pDecimals": {
			"description": "Implementation pending. Number of decimals places of the attribute. It only applies if the attribute is of type 'number'. Optional. (Note: do not confused with NDecimals, which is the number of decimals to display in the screen).",
			"type": "number"
		},
		"presentation": {
			"description": "It is the format in which we receive the value from the server. Currently it is only used for a very specific thing in the interpretation of dates. In the future it could be combined with to the JSON schema 'type' to indicate whether string, date, number, float... and 'format'.",
			"enum": [ "dd/mm/yyyy" ]
		},
		"NDecimals": {
			"description": "Number of decimal places to be displayed in the screen. Optional, when not indicated, precision is not truncated.",
			"type": "number",
			"minimum": 0,
			"maximum": 20,
			"multipleOf": 1
		},
		"serieTemporal": {
			"description": "The values of this attribute form a time series that will be displayed as a graph.",
			"type": "object",
			"required": [ "color" ],
			"properties": {
				"color": {
					"description": "Line color in the graph",
					"type": "string"
				}
			}
		}
	}
},
"StringOCadenaLang": {
	"description": "String or multilanguage object.",
	"oneOf": [
		{
			"type": [ "string", "null" ]
		},
		{
			"type": "object",
			"properties": {
				"cat": {
					"description": "Català",
					"type": [ "string", "null" ]
				},
				"spa": {
					"description": "Español",
					"type": [ "string", "null" ]
				},
				"eng": {
					"description": "English",
					"type": [ "string", "null" ]
				},
				"fre": {
					"description": "Français",
					"type": [ "string", "null" ]
				},
				"cze": {
					"description": "Čeština",
					"type": [ "string", "null" ]
				},
				"ger": {
					"description": "Deutsch",
					"type": [ "string", "null" ]
				}
			}
		}
	]
}
}
};
}

function GetGeoJSONStyles(data, selectedOptions) {
	var estil=[];
	if (selectedOptions.time && selectedOptions.value) {

		var dataSorted=deapCopy(data);

		//Sorted by variable.
		dataSorted.sort(function (a, b) {
			if (a[selectedOptions.variable]<b[selectedOptions.variable])
				return -1;
			if (a[selectedOptions.variable]>b[selectedOptions.variable])
				return 1;
			return 0;});
		var a, b, maximum;
		for (var i = 0, f=-1; i < dataSorted.length; i++) {
			a=dataSorted[i], b=dataSorted[i==0 ? 0 : i-1];
			if (i==0 || a[selectedOptions.variable]!=b[selectedOptions.variable])
			{
				if (f>=0)
					estil[f].simbols[0].simbol[0].icona.r=maximum>0.001 ? 10/maximum: 1; 
				f++;
				maximum=a[selectedOptions.value];
				estil[f]={
					"nom": null,
					"desc": a[selectedOptions.variableDescription],
					"DescItems": a[selectedOptions.variableUoMSymbol],
					"TipusObj": "P",
					"ItemLleg": [
						{
							"color": "#ff0000",
							"DescColor": a[selectedOptions.variableDescription]
						}
					],
					"ncol": 1,
					"simbols": [
						{
							"NomCampFEscala": a[selectedOptions.variable] + "_{time?f=ISO}",
							"simbol": [
								{
									"icona": {
										"type": "circle",
										"r": 1
									}
								}
							]
						}
					],
					"formes": [{
						"vora": {
							"paleta": {
								"colors": [
									"#ff0000"
								]
							}
						},
						"interior": {
							"paleta": {
								"colors": [
									"rgba(255,0,0,0.4)"
								]
							}
						}}],
					"fonts": {
						"NomCampText": a[selectedOptions.variable] + "_{time?f=ISO}",
						"aspecte": [
							{
								"font": {
									"font": "12px Verdana",
									"color": "#B50000",
									"align": "center",
									"i": 0,
									"j": -5
								}
							}
						]
					}
				};
			}
			else
			{
				if (maximum<a[selectedOptions.value])
					maximum=a[selectedOptions.value];
			}
		}
		if (f>=0)
			estil[f].simbols[0].simbol[0].icona.r=maximum>0.001 ? 10/maximum: 1;
	}
	else
	{
		estil.push({
			"nom": null,
			"desc": null,
			"DescItems": null,
			"TipusObj": "P",
			"ItemLleg": [
				{
					"color": "#ff0000",
					"DescColor": ""
				}
			],
			"ncol": 1,
			"simbols": [
				{
					"simbol": [
						{
							"icona": {
								"type": "circle",
								"r": 10
							}
						}
					]
				}
			],
			"formes": [{
				"vora": {
					"paleta": {
						"colors": [
							"#ff0000"
						]
					}
				},
				"interior": {
					"paleta": {
						"colors": [
							"rgba(255,0,0,0.4)"
						]
					}
				}}],
			"fonts": {
				"NomCampText": selectedOptions.place ? "Place" : null,
				"aspecte": [
					{
						"font": {
							"font": "12px Verdana",
							"color": "#B50000",
							"align": "center",
							"i": 0,
							"j": -5
						}
					}
				]
			}
		});
	}
	return estil;
}

function GetGeoJSONDates(data, selectedOptions) {
	if (selectedOptions.time && selectedOptions.value) {
		var dataSorted=deapCopy(data), datetimes=[];

		//Sorted by date (older first).
		dataSorted.sort(function (a, b) {
			if (a[selectedOptions.time]<b[selectedOptions.time])
				return -1;
			if (a[selectedOptions.time]>b[selectedOptions.time])
				return 1;
			return 0;});
		var a, b;
		for (var i = 0; i < dataSorted.length; i++) {
			a=dataSorted[i], b=dataSorted[i==0 ? 0 : i-1];
			if (i==0 || a[selectedOptions.time]!=b[selectedOptions.time])
				datetimes.push(a[selectedOptions.time]);
		}
		return datetimes;
	}
	else
		return null;
}

/*function ShowSaveTableDialog(nodeId) {
	;   //Nothing to do
}*/

function PopulateSelectSaveLayerDialog(id, dataAttributes, selectedOption)
{
	document.getElementById(id).innerHTML=GetSelectSaveLayerDialog(id+"Select", dataAttributes, selectedOption);
}

function GetSelectSaveLayerDialog(id, dataAttributes, selectedOption)
{
	var thereIsSelectionOption=false;
	var dataAttributesArray = Object.keys(dataAttributes);

	var s="<select id=\""+id+"\">";
	for (var a=0; a<dataAttributesArray.length; a++)
	{
		if (dataAttributesArray[a]==selectedOption)
		{
			thereIsSelectionOption=true;
			break;
		}
	}
	s+="<option value=\"\""+ (!thereIsSelectionOption ? "selected=\"selected\"" : "") +"></option>";
	for (var a=0; a<dataAttributesArray.length; a++)
		s+="<option value=\""+dataAttributesArray[a]+"\""+ (dataAttributesArray[a]==selectedOption ? "selected=\"selected\"" : "") +">"+dataAttributesArray[a]+"</option>";
	s+="</select>";
	return s;
}

// params.nameInLegend
// params.showValue
// params.showType
function GetHTMLVariableDefUoM(suffix, params) {
	var cdns=[];
	cdns.push('<fieldset>');
	if (params.nameInLegend)
		cdns.push('	<legend><span id="DialogSaveLayerVariable' + suffix + '"></span>',
			'	</legend>',
			'	<label>Name:',
			'		<span id="DialogSaveLayerName' + suffix + '"></span>',
			'	</label><br>',);
	else	
		cdns.push('	<legend>Observed property:</legend>',
			'	<label>Name:',
			'		<span id="DialogSaveLayerVariable' + suffix + '"></span>',
			'		</label>',
			'	<br>');
	if (params.showPredefOptions)
		cdns.push('	<label>Predefined options:',
			'		<span id="DialogMeaningVariableDropDown' + suffix + '"></span>',
			'		</label>',
			'	<br>');
	if (params.showType)
		cdns.push('	<label>Data type:',
			'		<span id="DialogMeaningVariableType' + suffix + '"></span>',
			'		</label>',
			'	<br>');
	cdns.push('	<span id="DialogMeaningVariableDescriptionUoM' + suffix + '">',
		'		<label>Description:',
		'			<span id="DialogMeaningVariableDescription' + suffix + '"></span>',
		'		</label>',
		'		<br>',
		'		<label>Definition (URI):',
		'			<span id="DialogMeaningVariableDefinition' + suffix + '"></span>',
		'		</label>',
		'		<br>',
		'		<fieldset>',
		'			<legend>Units of measurement:</legend>',
		'			<label>Name:',
		'				<span id="DialogMeaningVariableUoM' + suffix + '"></span>',
		'			</label>',
		'			<br>',
		'			<label>Symbol:',
		'				<span id="DialogMeaningVariableUoMSymbol' + suffix + '"></span>',
		'			</label>',
		'			<br>',
		'			<label>Definition (URI):',
		'				<span id="DialogMeaningVariableUoMDefinition' + suffix + '"></span>',
		'			</label>',
		'		</fieldset>',
		'		<br>',
		'	</span>');
	if (params.showValue)
		cdns.push('	<br>',
			'	<label>Value:',
			'		<span id="DialogSaveLayerValue' + suffix + '"></span>',
			'	</label>');
	cdns.push('</fieldset>');
	return cdns.join("");
}			

function ShowSaveLayerDialogSelects(node, descripUoM) {
	var parentNode=GetFirstParentNode(node);
	if (parentNode) {
		var data = parentNode.STAdata;
		var dataAttributes = parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data);
		var s, elem;
		PopulateSelectSaveLayerDialog("DialogSaveLayerPlace", dataAttributes, "FeatureOfInterest/description");
		PopulateSelectSaveLayerDialog("DialogSaveLayerLongitude", dataAttributes, "FeatureOfInterest/feature/coordinates_0");
		PopulateSelectSaveLayerDialog("DialogSaveLayerLatitude", dataAttributes, "FeatureOfInterest/feature/coordinates_1");
		PopulateSelectSaveLayerDialog("DialogSaveLayerTime", dataAttributes, "phenomenonTime");
		PopulateSelectSaveLayerDialog("DialogSaveLayerVariable", dataAttributes, "Datastream/ObservedProperty/name");
		if (descripUoM){
			document.getElementById("DialogMeaningVariableDescriptionUoM").style.display="inline-block";
			PopulateSelectSaveLayerDialog("DialogMeaningVariableDescription", dataAttributes, "Datastream/ObservedProperty/description");
			PopulateSelectSaveLayerDialog("DialogMeaningVariableDefinition", dataAttributes, "Datastream/ObservedProperty/definition");
			PopulateSelectSaveLayerDialog("DialogMeaningVariableUoM", dataAttributes, "Datastream/unitOfMeasurement/name");
			PopulateSelectSaveLayerDialog("DialogMeaningVariableUoMSymbol", dataAttributes, "Datastream/unitOfMeasurement/symbol");
			PopulateSelectSaveLayerDialog("DialogMeaningVariableUoMDefinition", dataAttributes, "Datastream/unitOfMeasurement/definition");
		}
		else
			document.getElementById("DialogMeaningVariableDescriptionUoM").style.display="none";

		PopulateSelectSaveLayerDialog("DialogSaveLayerValue", dataAttributes, "result");
	}
}

function GetSelectedOptionsSaveLayer(descripUoM){
	var selectedOptions={};
	selectedOptions.place=document.getElementById("DialogSaveLayerPlaceSelect").value;
	selectedOptions.longitude=document.getElementById("DialogSaveLayerLongitudeSelect").value;
	selectedOptions.latitude=document.getElementById("DialogSaveLayerLatitudeSelect").value;
	selectedOptions.time=document.getElementById("DialogSaveLayerTimeSelect").value;
	selectedOptions.variable=document.getElementById("DialogSaveLayerVariableSelect").value;
	if (descripUoM){
		selectedOptions.variableDescription=document.getElementById("DialogMeaningVariableDescriptionSelect").value;
		selectedOptions.variableDefinition=document.getElementById("DialogMeaningVariableDefinitionSelect").value;
		selectedOptions.variableUoM=document.getElementById("DialogMeaningVariableUoMSelect").value;
		selectedOptions.variableUoMSymbol=document.getElementById("DialogMeaningVariableUoMSymbolSelect").value;
		selectedOptions.variableUoMDefinition=document.getElementById("DialogMeaningVariableUoMDefinitionSelect").value;
	}
	selectedOptions.value=document.getElementById("DialogSaveLayerValueSelect").value;
	return selectedOptions;
}

function ShowSaveLayerDialog(node) {
	document.getElementById("DialogSaveLayerVariableDefUoM").innerHTML=GetHTMLVariableDefUoM("", {nameInLegend: false, showValue: true})
	ShowSaveLayerDialogSelects(node, true);
	document.getElementById("DialogSaveLayerTitle").innerHTML="Save table as GeoJSON";
	document.getElementById("DialogSaveLayerSave").innerHTML="<button value=\"default\" onClick=\"SaveLayer(event)\">Save GeoJSON</button> " +
		"<button onClick=\"SaveLayerSchema(event)\">Save JSON Schema</button> " +
		"<button onClick=\"SaveLayerMetaschema(event)\">Save JSON Metaschema</button>";
}

function ShowOpenMapDialog(node) {
	document.getElementById("DialogSaveLayerVariableDefUoM").innerHTML=GetHTMLVariableDefUoM("", {nameInLegend: false, showValue: true});
	ShowSaveLayerDialogSelects(node, true);
	document.getElementById("DialogSaveLayerTitle").innerHTML="Open in the Map Browser";
	document.getElementById("DialogSaveLayerSave").innerHTML="<button value=\"default\" onClick=\"OpenMap(event)\">Open</button>";
}

function PopulateDialogSaveLayerVariableFromDropDownSelect(i) {
	var gi=JSON.parse(document.getElementById("DialogMeaningVariableDropDownSelect_" + i).value);
	if (gi==-1)
		return;
	PopulateDialogSaveLayerVarUoM(i, config.suggestedVarUoMs[gi.g].varUoMs[gi.i]);
}

function PopulateDialogSaveLayerVarUoM(i, varUoM) {
	document.getElementById("DialogMeaningVariableDescriptionInput_"+i).value=varUoM.description ? varUoM.description : "";
	document.getElementById("DialogMeaningVariableDefinitionInput_"+i).value=varUoM.definition ? varUoM.definition : "";
	document.getElementById("DialogMeaningVariableUoMInput_"+i).value=varUoM.UoM ? varUoM.UoM : "";
	document.getElementById("DialogMeaningVariableUoMSymbolInput_"+i).value=varUoM.UoMSymbol ? varUoM.UoMSymbol : "";
	document.getElementById("DialogMeaningVariableUoMDefinitionInput_"+i).value=varUoM.UoMDefinition ? varUoM.UoMDefinition : "";
}

function ShowMeaningTableDialog(node) {
	var data = node.STAdata, cdns, vus;
	var dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);
	var dataAttributesArray = Object.keys(dataAttributes);

	document.getElementById("DialogMeaningFields").innerHTML="";
	for (var i = 0; i < dataAttributesArray.length; i++) {
		document.getElementById("DialogMeaningFields").innerHTML+=GetHTMLVariableDefUoM("_" + i, {nameInLegend: true, showValue: false, showType: true, showPredefOptions:true});
		document.getElementById("DialogSaveLayerVariable_"+i).innerHTML="Field "+(i+1)+ ": " + dataAttributesArray[i];

		cdns=[];
		cdns.push('<select id="DialogMeaningVariableDropDownSelect_' + i + '" onChange="PopulateDialogSaveLayerVariableFromDropDownSelect(' + i + ')">',
			"<option value='{\"g\":-1}'>--Select to populate below--</option>");
		for (var g=0; g<config.suggestedVarUoMs.length; g++) {
			cdns.push('<optgroup label="', config.suggestedVarUoMs[g].group, '">');
			vus=config.suggestedVarUoMs[g].varUoMs;
			for (var j=0; j<vus.length; j++)
				cdns.push("<option value='{\"g\":", g, ",\"i\":", j, "}'>", vus[j].varUoMdesc, "</option>");
		}
		cdns.push('</select>');				
		document.getElementById("DialogMeaningVariableDropDown_"+i).innerHTML=cdns.join("");

		document.getElementById("DialogSaveLayerName_"+i).innerHTML='<input id="DialogSaveLayerNameInput_' + i + '" type="text" size="50" value="'+dataAttributesArray[i]+'">';
		document.getElementById("DialogMeaningVariableType_"+i).innerHTML=getHTMLCharacterAttributeType(dataAttributes[dataAttributesArray[i]].type);
		document.getElementById("DialogMeaningVariableDescription_"+i).innerHTML='<input id="DialogMeaningVariableDescriptionInput_' + i + '" type="text" size="50" value="a">';
		document.getElementById("DialogMeaningVariableDefinition_"+i).innerHTML='<input id="DialogMeaningVariableDefinitionInput_' + i + '" type="text" size="50" value="">';
		document.getElementById("DialogMeaningVariableUoM_"+i).innerHTML='<input id="DialogMeaningVariableUoMInput_' + i + '" type="text" size="30" value="">';
		document.getElementById("DialogMeaningVariableUoMSymbol_"+i).innerHTML='<input id="DialogMeaningVariableUoMSymbolInput_' + i + '" type="text" size="15" value="">';
		document.getElementById("DialogMeaningVariableUoMDefinition_"+i).innerHTML='<input id="DialogMeaningVariableUoMDefinitionInput_' + i + '" type="text" size="50" value="">';
	}
	for (var i = 0; i < dataAttributesArray.length; i++)
		PopulateDialogSaveLayerVarUoM(i, dataAttributes[dataAttributesArray[i]]);
}

function GetMeaningTable() {
	var data = currentNode.STAdata;
	var dataAttributes = currentNode.STAdataAttributes ? currentNode.STAdataAttributes : getDataAttributes(data);
	var dataAttributesArray = Object.keys(dataAttributes);
	var newName=[];
	for (var i = 0; i < dataAttributesArray.length; i++) {
		if (document.getElementById("DialogSaveLayerNameInput_"+i).value!=dataAttributesArray[i])newName.push([dataAttributesArray[i],document.getElementById("DialogSaveLayerNameInput_"+i).value]);
		dataAttributes[dataAttributesArray[i]].description=document.getElementById("DialogMeaningVariableDescriptionInput_"+i).value;
		dataAttributes[dataAttributesArray[i]].definition=document.getElementById("DialogMeaningVariableDefinitionInput_"+i).value;
		dataAttributes[dataAttributesArray[i]].UoM=document.getElementById("DialogMeaningVariableUoMInput_"+i).value;
		dataAttributes[dataAttributesArray[i]].UoMSymbol=document.getElementById("DialogMeaningVariableUoMSymbolInput_"+i).value;
		dataAttributes[dataAttributesArray[i]].UoMDefinition=document.getElementById("DialogMeaningVariableUoMDefinitionInput_"+i).value;
	}
	if (newName.length!=0)	changeAttributeNameAndData(data, newName,dataAttributes);
	return dataAttributes;
}
function changeAttributeNameAndData(data, newName,dataAttributes){ //newName (old att name, new)
	console.log("difeerent")
	var n=data.length, m=newName.length ;
	for (var i=0;i<n;i++){ //change data
		for (var e=0;e<m;e++){
			data[i][newName[e][1]]=data[i][newName[e][0]];
		delete data[i][newName[e][0]];
		}
	}
	for (var i=0;i<m;i++){ //change dataAttributes
		dataAttributes [newName[i][1]]=deapCopy(dataAttributes [newName[i][0]]);
		delete dataAttributes [newName[i][0]];
	}
	console.log(data);
	networkNodes.update(currentNode);
}
function SaveMeaningTable(event) {
	event.preventDefault(); // We don't want to submit this form
	currentNode.STAdataAttributes=GetMeaningTable();
	networkNodes.update(currentNode);
	document.getElementById("DialogMeaningTable").close();
}

const urlSchemaMeaning="https://github.com/grumets/MiraMonMapBrowser/config_attributes_metaschema.json#/definitions/AttributeDescription";

function ShareMeaningTable(event) {
	event.preventDefault(); // We don't want to submit this form
	currentNode.STAdataAttributes=GetMeaningTable();
	networkNodes.update(currentNode);
	var fileName=getFileName(currentNode.STAfileUrl);
	GUFCreateFeedbackWithReproducibleUsage([{title: fileName, code: fileName, codespace: getAddressPath(getAbsoluteURL(currentNode.STAfileUrl))}],
		{abstract: "Meaning of the fields in the "+fileName, specific_usage: "Share meaning of fields in tabular data",
		ru_code: JSON.stringify(currentNode.STAdataAttributes), ru_code_media_type: "application/json",
		ru_platform: "https://github.com/joanma747/TAPIS", ru_version: 0.9, ru_schema: urlSchemaMeaning},
		"eng", "" //access_token_type
	);
	showInfoMessage("Sharing Meaning. Redirected to NiMMbus (please authenticate and save).");
}

function SaveTable(event) {
	event.preventDefault(); // We don't want to submit this form
	var delimiter=document.getElementById("DialogSaveTableDelimiter").value;
	document.getElementById("DialogSaveTable").close();
	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		SaveLocalDataFile(Papa.unparse(StringifyObjectElements(parentNode.STAdata, parentNode.STAdataAttributes), { quotes: false, quoteChar: '"', escapeChar: '"', delimiter: (delimiter ? delimiter : ";"), header: true, newline: "\r\n", skipEmptyLines: "greedy"}), 
				(IdOfSTAEntity(parentNode) == -1) ?  "table" : STAEntitiesArray[IdOfSTAEntity(parentNode)], ".csv", "application/vnd.ms-excel");   //https://stackoverflow.com/questions/7076042/what-mime-type-should-i-use-for-csv
	}
}

//https://csvw.org/
//https://w3c.github.io/csvw/metadata/#dialect-descriptions
function CreateCSVW(data, dataAttributesInput, delimiter) {
	var dataAttributes = dataAttributesInput ? dataAttributesInput : getDataAttributes(data);
	var dataAttributesArray = Object.keys(dataAttributes), dataAttribute, c;

	var csvw={ tableSchema: {
			"columns": []
		},
		"dialect": {
			"header": true,
			"delimiter": delimiter
		}
	};
	for (var a = 0; a < dataAttributesArray.length; a++) {
		dataAttribute=dataAttributes[dataAttributesArray[a]];
		csvw.tableSchema.columns.push({
			"name": dataAttributesArray[a],
			"datatype": getCSVWTypeFromAttributeType(dataAttribute.type),
		});
		c=csvw.tableSchema.columns[a];
		if (dataAttribute.description)
			c.titles=dataAttribute.description;
		if (dataAttribute.definition)
			c.propertyUrl=dataAttribute.definition;
		if (dataAttribute.UoM)
			c.unitMeasureTitles=dataAttribute.UoM;
		if (dataAttribute.UoMSymbol)
			c.unitMeasureSymbol=dataAttribute.UoMSymbol;
		if (dataAttribute.UoMDefinition)
			c.unitMeasureUrl=dataAttribute.UoMDefinition;
	}
	return csvw;
}


function SaveCSVW(event) {
	event.preventDefault(); // We don't want to submit this form
	var delimiter=document.getElementById("DialogSaveTableDelimiter").value;
	document.getElementById("DialogSaveTable").close();
	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		SaveLocalDataFile(JSON.stringify(CreateCSVW(parentNode.STAdata, parentNode.STAdataAttributes, delimiter ? delimiter : ";"), null, "\t"), 
				(IdOfSTAEntity(parentNode) == -1 ?  "table" : STAEntitiesArray[IdOfSTAEntity(parentNode)]) + "_csvw", ".json", "application/json");   //https://stackoverflow.com/questions/7076042/what-mime-type-should-i-use-for-csv
	}
}

function getDataAttributesCSVW(csvw){
	var dataAttributes = {}, c;
	for (var a = 0; a < csvw.tableSchema.columns.length; a++) {
		c=csvw.tableSchema.columns[a];
		dataAttributes[c.name]={
			"type": getAttributeTypeFromCSVWType(c.datatype),
			"description": (c.titles && Array.isArray(c.titles)) ? c.titles[0] : c.titles,
			"definition": c.propertyUrl,
			"UoM": c.unitMeasureTitles && Array.isArray(c.unitMeasureTitles) ? c.unitMeasureTitles[0] : c.unitMeasureTitles,
			"UoMSymbol": c.unitMeasureSymbol,
			"UoMDefinition": c.unitMeasureUrl
		};
	}
	return dataAttributes;
}

function getDataAttributesGeoJSONSchema(jsonschema){
	var dataAttributes;
	dataAttributes=deapCopy(jsonschema.properties.features.items.properties.properties.properties);
	dataAttributes["geometry"]={
		"type": "object",
		"definition": "Datastream/Observations/FeatureOfInterest/feature/geometry"
	};
	return dataAttributes;
}

//Has the string s a ISO data in the position i? It does not 
function fragmentStartsWithISODate(s, i) {
	if (s.charAt(i+0) >= '0' && s.charAt(i+0) <= '9' &&
		s.charAt(i+1) >= '0' && s.charAt(i+1) <= '9' &&
		s.charAt(i+2) >= '0' && s.charAt(i+2) <= '9' &&
		s.charAt(i+3) >= '0' && s.charAt(i+3) <= '9' &&
		s.charAt(i+4) == '-' &&
		s.charAt(i+5) >= '0' && s.charAt(i+5) <= '1' &&
		s.charAt(i+6) >= '0' && s.charAt(i+6) <= '9' &&
		s.charAt(i+7) == '-' &&
		s.charAt(i+8) >= '0' && s.charAt(i+8) <= '3' &&
		s.charAt(i+9) >= '0' && s.charAt(i+9) <= '9' &&
		s.charAt(i+10) == 'T' &&
		s.charAt(i+11) >= '0' && s.charAt(i+11) <= '2' &&
		s.charAt(i+12) >= '0' && s.charAt(i+12) <= '9' &&
		s.charAt(i+13) == ':' &&
		s.charAt(i+14) >= '0' && s.charAt(i+14) <= '5' &&
		s.charAt(i+15) >= '0' && s.charAt(i+15) <= '9' &&
		s.charAt(i+16) == ':' &&
		s.charAt(i+17) >= '0' && s.charAt(i+17) <= '5' &&
		s.charAt(i+18) >= '0' && s.charAt(i+18) <= '9'){ 
		
			if (s.charAt(i+19) == 'Z') 	return 20; //2025-01-31T14:21:37Z
			else if (s.charAt(i+19)=="."&& //2025-01-31T14:21:37.000
			 s.charAt(i+20) >= '0' && s.charAt(i+20) <= '9' &&
			 s.charAt(i+21) >= '0' && s.charAt(i+21) <= '9' &&
			 s.charAt(i+22) >= '0' && s.charAt(i+22) <= '9' 
			) return 23
			else if (s.charAt(i+19) == '+'&&   //2025-01-31T14:21:37+00:00
			s.charAt(i+20) >= '0' && s.charAt(i+20) <= '9' &&
			s.charAt(i+21) == ':' &&
			s.charAt(i+22) >= '0' && s.charAt(i+22) <= '9' &&
			s.charAt(i+23) >= '0' && s.charAt(i+23) <= '9' &&
			s.charAt(i+24) >= '0' && s.charAt(i+24) <= '9'
			) return 25;
		return 19; //2025-01-31T14:21:37
	}
	return 0;
}

//transforms a full ISO data (2024-03-05T01:41:00Z) into a template {time?f=ISO}
function replaceISODateBySISOTemplate(s) {
	var date_length;
	for (var i=0; i<s.length-19; i++) {
		date_length=fragmentStartsWithISODate(s, i);
		if (data_length) {
			s=s.substring(0, i) + "{time?f=ISO}" + s.substring(i+data_length);
			i+=11;
		}
	}
	return s;
}

//returns the first full ISO data (2024-03-05T01:41:00Z) found in the string
function getISODateFromDataAttribute(s) {
	var date_length;
	for (var i=0; i<s.length-19; i++) {
		date_length=fragmentStartsWithISODate(s, i);
		if (date_length) {
			return s.substr(i, date_length);
		}
	}
	return null;
}

function removeTimeISOTemplate(attributeName)
{
	var s=attributeName.replaceAll("{time?f=ISO}", "");
	if (s.length>1 && (s[s.length-1]=="_" || s[s.length-1]=="-" || s[s.length-1]==" "))
		s=s.substr(0, s.length-1);
	return s;
}

function transformTimeSeriesTemplateIntoObservedPropertyTimeValue(data, dataAttributes)
{	
	var dataAttributesArray=Object.keys(dataAttributes);

	var dataAttrFromData=getDataAttributes(data)
	var dataAttrFromDataArray=Object.keys(dataAttrFromData);

	for (var a=0; a<dataAttributesArray.length; a++) {
		if (-1!=dataAttributesArray[a].indexOf("{time?f=ISO}"))
			break;
	}
	if (a==dataAttributesArray.length)
		return null; //nothing to do.

	var resultDataAttributes={}
	var resultDataAttributesValues={};
	for (var a=0; a<dataAttributesArray.length; a++) {
		if (-1!=dataAttributesArray[a].indexOf("{time?f=ISO}"))
			resultDataAttributesValues[removeTimeISOTemplate(dataAttributesArray[a])]=deapCopy(dataAttributes[dataAttributesArray[a]]);
		else
			resultDataAttributes[dataAttributesArray[a]]=deapCopy(dataAttributes[dataAttributesArray[a]]);
	}
	resultDataAttributes["extractedObservedProperty"]={
		"definition": "Datastream/ObservedProperty/name"
	};
	resultDataAttributes["extractedPhenomenonTime"]={
		"definition": "Datastream/Observations/phenomenonTime"
	};
	resultDataAttributes["extractedValue"]={
		"definition": "Datastream/Observations/result"
	};
	var resultData=[], resultRecord, record, first, replaceddataAttrFromDataItem;
	for (var r=0; r<data.length; r++) {  //for each record
		record=data[r];
		resultData.push({});
		resultRecord=resultData[resultData.length-1];
		first=true;
		for (var i=0; i<dataAttrFromDataArray.length; i++) {  //for each attribute found in the data
			if (dataAttributes[dataAttrFromDataArray[i]]) {
				if (typeof record[dataAttrFromDataArray[i]] !== "undefined")
					resultRecord[dataAttrFromDataArray[i]]=record[dataAttrFromDataArray[i]];
			}
		}
		for (var i=0; i<dataAttrFromDataArray.length; i++) {  //for each attribute found in the data
			if (dataAttributes[dataAttrFromDataArray[i]])
				continue;
			replaceddataAttrFromDataItem=replaceISODateBySISOTemplate(dataAttrFromDataArray[i]);
			if (dataAttributes[replaceddataAttrFromDataItem] && replaceddataAttrFromDataItem!=dataAttrFromDataArray[i]) {
				if (!first) {
					resultData.push(deapCopy(resultRecord));
					resultRecord=resultData[resultData.length-1];
				}
				resultRecord["extractedObservedProperty"]=removeTimeISOTemplate(replaceddataAttrFromDataItem);
				resultRecord["extractedPhenomenonTime"]=getISODateFromDataAttribute(dataAttrFromDataArray[i]);
				resultRecord["extractedValue"]=record[dataAttrFromDataArray[i]];
				first=false;
			}
		}
	}
	return {data: resultData, dataAttributes: resultDataAttributes, dataAttributesValues: resultDataAttributesValues};
}

function transformObservedPropertyTimeValueIntoTimeSemanticValues(data, dataAttributes, dataAttributesValues, observedPropertyName, phenomenonTimeName, extractedValueName) {

	function sortObservedPropertyTimeValue(a, b) {
		for (var i=0; i<dataAttributesArray.length; i++) {
			if (dataAttributesArray[i]==observedPropertyName ||
				dataAttributesArray[i]==phenomenonTimeName ||
				dataAttributesArray[i]==extractedValueName)
				continue;	
			if (a[dataAttributesArray[i]]<b[dataAttributesArray[i]])
				return -1;
			if (a[dataAttributesArray[i]]>b[dataAttributesArray[i]])
				return 1;
		}
		if (a[phenomenonTimeName]<b[phenomenonTimeName])
			return -1;
		if (a[phenomenonTimeName]>b[phenomenonTimeName])
			return 1;
		return 0;};

	//Sort by time
	var dataSorted=deapCopy(data);
	var dataAttributesArray=Object.keys(dataAttributes);
	dataSorted.sort(sortObservedPropertyTimeValue);

	var resultDataAttributes={}
	for (var attr=0; attr<dataAttributesArray.length; attr++) {
		if (dataAttributesArray[attr]==observedPropertyName ||
			dataAttributesArray[attr]==extractedValueName)
			continue;	
		resultDataAttributes[dataAttributesArray[attr]]=deapCopy(dataAttributes[dataAttributesArray[attr]]);
	}
	var dataAttributesValuesArray=Object.keys(dataAttributesValues);
	for (var attr=0; attr<dataAttributesValuesArray.length; attr++) {
		resultDataAttributes[dataAttributesValuesArray[attr]]=deapCopy(dataAttributesValues[dataAttributesValuesArray[attr]]);
	}

	var resultData=[], resultRecord, a, b;

	for (var r=0; r<data.length; r++) {
		a=dataSorted[r];
		b=dataSorted[r==0 ? 0 : r-1];
		if (r==0 || 0!=sortObservedPropertyTimeValue(a,b)) {
			resultData.push({});
			resultRecord=resultData[resultData.length-1];
			for (var attr=0; attr<dataAttributesArray.length; attr++) {
				if (dataAttributesArray[attr]==observedPropertyName ||
					dataAttributesArray[attr]==extractedValueName ||
					dataAttributesValues[dataAttributesArray[attr]])
					continue;
				if (a[dataAttributesArray[attr]])
					resultRecord[dataAttributesArray[attr]]=a[dataAttributesArray[attr]];
			}
		}
		if (a[observedPropertyName])
			resultRecord[a[observedPropertyName]]=a[extractedValueName];
	}
	return {data: resultData, dataAttributes: resultDataAttributes};
}

function getCSVReadParams(csvw){
	return csvw.dialect;
}

function SaveLayer(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSaveLayer").close();
	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		SaveLocalDataFile(JSON.stringify(GetGeoJSON(parentNode.STAdata, GetSelectedOptionsSaveLayer(false)), null, "\t"), "GeoJSON", ".geojson", "application/geo+json");
	}
}

function SaveLayerSchema(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSaveLayer").close();
	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		SaveLocalDataFile(JSON.stringify(GetGeoJSONSchema(parentNode.STAdata, GetSelectedOptionsSaveLayer(true)), null, "\t"), "JSON", ".json", "application/json");
	}
}

function SaveLayerMetaschema(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSaveLayer").close();
	SaveLocalDataFile(JSON.stringify(GetGeoJSONMetaschema(), null, "\t"), "JSON", ".json", "application/json");
}

function OpenMap(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSaveLayer").close();
	var parentNode=GetFirstParentNode(currentNode);
	if (parentNode) {
		var selectedOptionsSaveLayer=GetSelectedOptionsSaveLayer(true);
		OpenMapMMN(getAbsoluteURL(config.MMNpath) + (config.MMNpath.indexOf('?')>0 ? "&" : "?") + "reset=1", GetGeoJSON(parentNode.STAdata, selectedOptionsSaveLayer), GetGeoJSONPropertiesSchema(parentNode.STAdata, parentNode.STAdataAttributes, selectedOptionsSaveLayer), GetGeoJSONStyles(parentNode.STAdata, selectedOptionsSaveLayer), GetGeoJSONDates(parentNode.STAdata, selectedOptionsSaveLayer));
	}
}

function makeCodespaceHttp(url) {
	if (url.length>8 && url.substring(0, 8)=="https://")
		return "http://" + url.substring(8);
	return url;
}

function AddGUF(event) {
	event.preventDefault(); // We don't want to submit this form
	GUFAfegirFeedbackCapa(document.getElementById("DialogGUFTitleInput").value, document.getElementById("DialogGUFCodeInput").value, makeCodespaceHttp(document.getElementById("DialogGUFCodespaceInput").value), "eng", "authenix", null)
}

function EditGUF(event) {
	event.preventDefault(); // We don't want to submit this form
	GUFOpenNimmbus("eng", "authenix");
}

function ShowGUF(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogGUF").close();
	
	var previousSTAURL = currentNode.STAURL;

	currentNode.STAURL = ServerGUF+"?SERVICE=WPS&REQUEST=EXECUTE&IDENTIFIER=NB_RESOURCE:ENUMERATE&LANGUAGE=eng&FORMAT=text/xml&TYPE=FEEDBACK";
	currentNode.STAURL +="&TRG_TYPE_1=CITATION&TRG_FLD_1=CODE&TRG_VL_1=" + document.getElementById("DialogGUFCodeInput").value + "&TRG_OPR_1=EQ&TRG_NXS_1=AND&TRG_TYPE_2=CITATION&TRG_FLD_2=NAMESPACE&TRG_VL_2=" + makeCodespaceHttp(document.getElementById("DialogGUFCodespaceInput").value) + "&TRG_OPR_2=EQ";			

	currentNode.OGCType = "GUF";
	
	networkNodes.update(currentNode);

	UpdateChildenSTAURL(currentNode, currentNode.STAURL, previousSTAURL);
	showInfoMessage("Requesting Feedback...");
	LoadJSONNodeSTAData(currentNode);
}

var MiraMonMapBrowserVars={};

function DisplayMapMMN(){
	MiraMonMapBrowserVars.mmn.postMessage("CommandMMNAddGeoJSONLayer('SensorThings API data', "+ JSON.stringify(MiraMonMapBrowserVars.geojson) + ", " + JSON.stringify(MiraMonMapBrowserVars.geojsonSchema) + ", " + JSON.stringify(MiraMonMapBrowserVars.geojsonStyle) + ", " + JSON.stringify(MiraMonMapBrowserVars.geojsonDates) + ")", GetCleanURLMiraMonMapBrowser(MiraMonMapBrowserVars.mmnURL));
}

function OpenMapMMN(url, geojson, geojsonSchema, geojsonStyle, geojsonDates){
	MiraMonMapBrowserVars.geojson=geojson;
	MiraMonMapBrowserVars.geojsonSchema=geojsonSchema;
	MiraMonMapBrowserVars.geojsonStyle=geojsonStyle;
	MiraMonMapBrowserVars.geojsonDates=geojsonDates;
	if (MiraMonMapBrowserVars.mmn)
		DisplayMapMMN();
	else
	{
		//window.addEventListener("message", ProcessMessageFromMiraMonMapBrowser);
		MiraMonMapBrowserVars.mmnURL=url;
		MiraMonMapBrowserVars.mmn=window.open(url, "_blank", "width=1000,height=800");
	}
}

function ProcessMessageFromMiraMonMapBrowser(event)
{
	if (MiraMonMapBrowserVars.mmnURL)  //Tapis has open MMN and is getting feedback
{
	if (!IsTrustedMiraMonMapBrowser(event, MiraMonMapBrowserVars.mmnURL))
		return;

	try
	{
		var data=JSON.parse(event.data);
	}
	catch (e) 
	{
		showInfoMessage("JSON message parse error: " + e + " The response was:\n" + event.data);
		return;
	}

	if (data.msg === MMN_PM_IsListening)
	{
		showInfoMessage("MiraMon Map Browser is open and ready to show layers.");
		DisplayMapMMN();
		return;
	}

	if (data.msg === MMN_PM_Closed)
	{
		showInfoMessage("MiraMon Map Browser has been closed.");
		MiraMonMapBrowserVars.mmn=null;
		MiraMonMapBrowserVars.mmnURL=null;
		return;
	}
		return;
	}
	try
	{
		var data=JSON.parse(event.data);
	}
	catch (e) 
	{
		showInfoMessage("JSON message parse error: " + e + " The response was:\n" + event.data);
		return;
	}

	if (!data.type)
		return;
	if (data.type!=="GeoJSON"){
		alert("The format requets from an external source (" + data.type + ") is not implemented yet")
		return;
	}
	createAndLoadImportGeoJSONNode(JSON.stringify(data.data),data.url)
	return;
	



	/*if (data.msg === MMN_PM_CurrentLocationText)
	{
		MiraMonMapBrowserVars.currentLocText=data.text;
		return;
	}*/
}

function ShowTableSelectSortByDialog(node) {
	var data = node.STAdata;

	if (!data || !data.length) {
		document.getElementById("DialogSelectSortByRadioButtons").innerHTML = "No data to show.";
		return;
	}

	var dataAttributes = node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(data);

	const dataAttributesArray = Object.keys(dataAttributes);

	var s = "";
	var first=true;
	for (var a = 0; a < dataAttributesArray.length; a++)
	{
		if (!dataAttributesArray[a].endsWith("@iot.navigationLink") && dataAttributesArray[a].charAt(0)!='@')
		{
			s += "<label><input type='radio'" + (first ? "checked='checked'" : "") + " id='SelectSortByEntity_" + a + "' name='SelectSortByEntity'/> " + dataAttributesArray[a] + "</label><br>";
			first=false;
		}
	}
	document.getElementById("DialogSelectSortByRadioButtons").innerHTML = s;
	//document.getElementById("DialogSelectSortByHTML").style.display = "inline-block";
	document.getElementById("SelectSortByNumberOfRecords").value=node.STAExpectedLength;
}


function ShowTableSelectRowDialog(parentNode, node) {
	var data = parentNode.STAdata;
	
	if (node.STAURL)
		addTitleInRowFilterDialog("divTitleSelectRow");

	document.getElementById("SelectNumberOfRecordsSelectRowLabel").style.display=(node.image == "SelectRowTable.png") ? "none" : "inline-block";

	if (!data || !data.length) {
		document.getElementById("DialogSelectRowsTable").innerHTML = "No data to show.";
		return;
	}
	document.getElementById("DialogSelectRowsTable").innerHTML = GetHTMLTable(data, parentNode.STAdataAttributes ? parentNode.STAdataAttributes : getDataAttributes(data), false, "SelectRow_", node.STAURLIdSelected ? node.STAURLIdSelected : 0, null, "", isAttributeAnyURI);
}

function ShowTableFilterRowsDialog(parentNode, node) {
	var data = parentNode.STAdata;
	node.STAdata=data; //Put all data from parent in this node 
	networkNodes.update(node);

	if (parentNode.image != "FilterRowsTable.png") {
			addTitleInRowFilterDialog("divTitleSelectRows");
	}

	if (!data || !data.length) {
		document.getElementById("DialogSelectRowsTable").innerHTML = "No data to show.";
		return;
	}

	document.getElementById("DialogSelectRowsFilter").innerHTML = "<div id='selectorRowsContainer'><div id='divSelectorRowsFilter'></div></div>"; 
	var SelectNumberOfRecordsFilterRows=document.getElementById("SelectNumberOfRecordsFilterRows");
	var SelectNumberOfRecordsFilterRowsLabel=document.getElementById("SelectNumberOfRecordsFilterRowsLabel");

	if (node.image=="FilterRowsTable.png"){ //Hide number request
		SelectNumberOfRecordsFilterRows.style.display="none";
		SelectNumberOfRecordsFilterRowsLabel.style.display="none";
	}else{
		SelectNumberOfRecordsFilterRows.style.display="inline-block";
		SelectNumberOfRecordsFilterRowsLabel.style.display="inline-block";
	}
	if (node.STAExpectedLength){ //"write" number of data required previously 
		document.getElementById('SelectNumberOfRecordsFilterRows').value= node.STAExpectedLength
	}
	
	addNecessaryVariablesToFilterRowsSTANode(node);
	
	if (node.image=="FilterRowsSTA.png" && node.STAOGCAPIconformance){
		if (node.STAOGCAPIconformance.includes("filter")){ //Create Filters if the API allows to filter its information
			ShowFilterTable();

		}else{
		showFilterTableWithoutFilters(); //OGCAPIFeatures without filter option		
		}
	}else{
		ShowFilterTable(); //STA and CSV 
	}
}

function SeparateColumns(event) {
	event.preventDefault(); // We don't want to submit this form
	document.getElementById("DialogSeparateColumns").close();
	var options={}, data;
	if (document.getElementById("DialogSeparateColumnsJSON").checked && document.getElementById("DialogSeparateColumnsAs_Records").checked ) //JSON records
		options.arraysAsRecords=true;
	if (document.getElementById("DialogSeparateColumns_RemovePresent").checked)
		options.removeAlreadyPresent=true;
	var parentNode=GetFirstParentNode(currentNode);
	//Fer les funcions per larray
	if (parentNode && document.getElementById("DialogSeparateColumnsJSON").checked) {//JSON columns
		//SeparateColumnsNode(currentNode, parentNode, options);
		data= SeparateColumnsData(currentNode.STAdata, deapCopy(parentNode.STAdataAttributes), currentNode.STAdataAttributes, options);
		currentNode.STAdata=data;
		networkNodes.update(currentNode);
	}
	else{ //ARRAY
		var selectColumnName= document.getElementById("SeparateColumsSelect_column");
		var columnName= selectColumnName.options[selectColumnName.selectedIndex].value;
		var delimiter=document.getElementById("SeparateColumsInput_column").value;
		console.log(columnName+delimiter);
		if (!parentNode.STAdata) {
			showInfoMessage("No data loaded in the parent node.");
			return;
		}
		if (parentNode.STAURL)
			node.STAURL=parentNode.STAURL;
	
		currentNode.STAExpectedLength = parentNode.STAExpectedLength;
		if (document.getElementById("DialogSeparateColumnsAs_Columns").checked && document.getElementById("DialogSeparateColumnsLists").checked ){ //array columns
			SeparateColumnsNodeArrayColumns( columnName, delimiter);

		}else{ //array records
			SeparateColumnsNodeArrayRecords(columnName, delimiter);
		}
	}
}

function populateSelectCoulmnSeparateColumns(){
	var parentNode= GetFirstParentNode(currentNode);
	if (!parentNode.STAdata) {
		showInfoMessage("No data loaded in the parent node.");
		return;
	}
	if (parentNode.STAURL)
		currentNode.STAURL=parentNode.STAURL;
	currentNode.STAExpectedLength =parentNode.STAExpectedLength;
	currentNode.STAdataAttributes = parentNode.STAdataAttributes ? deapCopy(parentNode.STAdataAttributes) : getDataAttributes(parentNode.STAdata);
	currentNode.STAdata=deapCopy(parentNode.STAdata);
	networkNodes.update(currentNode);
	
	var attributes= Object.keys(currentNode.STAdataAttributes);
		var selectColumnName= document.getElementById("SeparateColumsSelect_column");
		selectColumnName.innerHTML="";
		var cdns=[];
		for (var i=0;i< attributes.length;i++){
			cdns.push(`<option value="${attributes[i]}"> ${attributes[i]} (${currentNode.STAdataAttributes[attributes[i]].type})</option>`)
		}
		selectColumnName.innerHTML+=cdns.join("");
		document.getElementById("SeparateColumsInput_column").value=",";
}

function SeparateColumnsNodeArrayColumns(columnName, delimiter){
	var data= currentNode.STAdata;
	var n= data.length, highestNumber=1, newvarColumn;
	console.log(delimiter);
	if (currentNode?.STAdataAttributes[columnName]["type"]!="string"){
		alert("The content of column selected to separate must be string type");
		return;
	}
	for (var i=0; i<n;i++){
		data[i]["temporaryAttribute"]= data[i][columnName].split(delimiter);
		if (highestNumber<data[i]["temporaryAttribute"].length)highestNumber=data[i]["temporaryAttribute"].length;

	}
	for (var e=0;e<n;e++){
		if (highestNumber!=1){
			for (var a=0;a<highestNumber;a++){
				newvarColumn=columnName+(a+1);
				if (data[e]["temporaryAttribute"][a])data[e][newvarColumn]=data[e]["temporaryAttribute"][a].trim();
				else data[e][newvarColumn]="";
			}
		}
		delete data[e][columnName]
		delete data[e]["temporaryAttribute"];
	}
	
	currentNode.STAdata= data;
	uploadDataAttributesAddingNewColumns (currentNode.STAdataAttributes,data); //currentNode.STAdataAttributes upload and networkNodes.update
	UpdateChildenTable(currentNode);

}
function SeparateColumnsNodeArrayRecords(columnName, delimiter){
	var data= currentNode.STAdata;
	var n= data.length, newDataArray=[], separateDataArray,newColumname;
	if (currentNode?.STAdataAttributes[columnName]["type"]!="string"){
		alert("The content of column selected to separate must be string type");
		return;
	}
	for (var i=0;i<n;i++){
		separateDataArray=data[i][columnName].split(delimiter);
		newColumname=columnName+"-new";
		for (var e=0;e<separateDataArray.length;e++){
			delete data[i][columnName];
			data[i][newColumname]=separateDataArray[e].trim();
			newDataArray.push(deapCopy(data[i]))
		}

	}
	currentNode.STAdata= newDataArray;
	uploadDataAttributesAddingNewColumns(currentNode.STAdataAttributes,newDataArray); //currentNode.STAdataAttributes upload and networkNodes.update

	UpdateChildenTable(currentNode);
}

// function SeparateColumnsNode(node, parentNode, options) { //JSON
// 	//var data=parentNode.STAdata;

// 	// if (!data) {
// 	// 	showInfoMessage("No data loaded in the parent node.");
// 	// 	return;
// 	// }
// 	// if (parentNode.STAURL)
// 	// 	node.STAURL=parentNode.STAURL;

// 	// node.STAExpectedLength = parentNode.STAExpectedLength;
// 	// if (parentNode.STAdataAttributes)
// 	// 	node.STAdataAttributes={};
	

// 	//node.STAdata=SeparateColumnsData(data, parentNode.STAdataAttributes, node.STAdataAttributes, options);
// 	//networkNodes.update(node);
// }

function ShowQueryNode(node) {
	if (node.STAURL) {
		document.getElementById("showQueryLink").innerHTML =
					document.getElementById("showQueryLink").href = node.STAURL;
		document.getElementById("showQuery").style.display="inline-block";
	} else {
		document.getElementById("showQueryLink").innerHTML="";
		document.getElementById("showQuery").style.display="none";
	}
}

function ShowTableNode(node)
{
	if (node.STAdata && node.STAdata.length) {
		ShowTableOptionsDiv(node, "showTableOptions", "ShowTableNode");
		document.getElementById("showTable").innerHTML = GetHTMLTable(node.STAdata, node.STAdataAttributes ? node.STAdataAttributes : getDataAttributes(node.STAdata),
			document.getElementById("showTableOptionsRowNumber").checked ? true : false,
			"", null, null, "", isAttributeAnyURI, document.getElementById("showTableOptionsSelfNavLink").checked ? null : isAttributeSelfNavLink);
	} else {
		document.getElementById("showTableOptions").innerHTML="";
		document.getElementById("showTable").innerHTML="";
	}
}

/*return 
	null means connection should not be done.
	true means all done
	false means pending.*/
function StartCircularImage(nodeTo, nodeFrom, addEdge, staNodes, tableNodes)
{
	var errorText=reasonNodeDoesNotFitWithPrevious(nodeTo, nodeFrom);
	/*if (nodeFrom.STALastEntity) { //I will need it to know "where I am" in Row filter (To apply the filter)
		nodeTo.STALastEntity = nodeFrom.STALastEntity;
	}*/
	if (errorText)
	{
		alert("Incompatible node. " + errorText + ". It has not been added.");
		return null;
	}
	if (staNodes && nodeFrom.STAURL && IdOfSTAEntity(nodeTo) != -1) {
		if (nodeFrom.image=="sta.png")
			nodeTo.STAURL = nodeFrom.STAURL + "/" + STAEntitiesArray[IdOfSTAEntity(nodeTo)];
		else 
			nodeTo.STAURL = nodeFrom.STAURL + "/" + getConnectionSTAEntity(nodeFrom, nodeTo).entity;
		nodeTo.STAExpectedLength = nodeFrom.STAExpectedLength;

		networkNodes.update(nodeTo);
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		showInfoMessage("Requesting " + STAEntitiesArray[IdOfSTAEntity(nodeTo)] + " to STA...");
		LoadJSONNodeSTAData(nodeTo);
		//nodeTo.STALastEntity = STAEntitiesArray[IdOfSTAEntity(nodeTo)]; //I will need it to Row Filter
		return true;
	}
	if (staNodes && nodeFrom.STAURL && IdOfSTASpecialQueries(nodeTo) != -1) {
		nodeTo.STAURL = nodeFrom.STAURL + "/" + STASpecialQueries[STASpecialQueriesArray[IdOfSTASpecialQueries(nodeTo)]].query;
		nodeTo.STAExpectedLength = nodeFrom.STAExpectedLength;
		networkNodes.update(nodeTo);
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		showInfoMessage("Requesting " + STASpecialQueriesArray[IdOfSTASpecialQueries(nodeTo)] + " to STA...");
		LoadJSONNodeSTAData(nodeTo);
		return true;
	}
	if (staNodes && nodeFrom.STAURL && (nodeTo.image == "SelectColumnsSTA.png" || nodeTo.image == "ExpandColumnsSTA.png" || nodeTo.image == "SelectRowSTA.png" || nodeTo.image == "FilterRowsSTA.png" || nodeTo.image == "SortBySTA.png")) {
		nodeTo.STAURL = nodeFrom.STAURL;
		nodeTo.STAExpectedLength = nodeFrom.STAExpectedLength;
		if (nodeFrom.STAdata)
			nodeTo.STAdata = deapCopy(nodeFrom.STAdata);
		if (nodeFrom.STAdataAttributes)
			nodeTo.STAdataAttributes = deapCopy(nodeFrom.STAdataAttributes);
		networkNodes.update(nodeTo);
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		return true;
	}
	if (staNodes && nodeTo.image == "GeoFilterPolSTA.png") {
		if (!GetFirstParentNode(nodeTo)){
			nodeTo.STAURL = nodeFrom.STAURL;
			nodeTo.STAExpectedLength = nodeFrom.STAExpectedLength;
			if (nodeFrom.STAdata)
				nodeTo.STAdata = deapCopy(nodeFrom.STAdata);
			if (nodeFrom.STAdataAttributes)
				nodeTo.STAdataAttributes = deapCopy(nodeFrom.STAdataAttributes);		
			networkNodes.update(nodeTo);
		} else if (!nodeTo.STAURL)
			return false;
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		DoGeoFilterRows(nodeTo);
		return true;
	}
	if (staNodes && nodeTo.image == "staRoot.png") {
		if (nodeFrom) {
			var previousSTAURL=nodeTo.STAURL;
			nodeTo.STAURL=getSTAURLRoot(nodeFrom.STAURL);
			nodeTo.STAExpectedLength = nodeFrom.STAExpectedLength;
			networkNodes.update(nodeTo);
		}
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		if (nodeFrom) {
			UpdateChildenSTAURL(nodeTo, nodeTo.STAURL, previousSTAURL);
			LoadJSONNodeSTAData(nodeTo);
		}
		return true;
	}
	if (tableNodes && nodeTo.image == "Meaning.png" || 
					nodeTo.image == "SelectColumnsTable.png" || nodeTo.image == "SelectRowTable.png" || 
		nodeTo.image == "FilterRowsTable.png" || nodeTo.image == "JoinTables.png"){
		if (nodeFrom.STAdata)
			nodeTo.STAdata = deapCopy(nodeFrom.STAdata);  //This copy will be done again in "SelectColumnsTable.png" and "SelectRowTable.png". We do it here to have the full table while the user does not enter any selection
		if (nodeFrom.STAdataAttributes)
			nodeTo.STAdataAttributes = deapCopy(nodeFrom.STAdataAttributes);
		if (nodeFrom.STAfileUrl)
			nodeTo.STAfileUrl = deapCopy(nodeFrom.STAfileUrl);
		networkNodes.update(nodeTo);
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		return true;
	}
	if (tableNodes && nodeTo.image == "SeparateColumns.png") {
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		networkNodes.update(nodeTo);
		//SeparateColumnsNode(nodeTo, nodeFrom);
		return true;
	}
	if (tableNodes && nodeTo.image == "CreateColumns.png") {
		 if (nodeFrom.STAdata){
			nodeTo.STAdata = deapCopy(nodeFrom.STAdata); //necessary first time
			networkNodes.update(nodeTo);
		 }
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		return true;
	}
	if (tableNodes && nodeTo.image == "AggregateColumns.png") {
		if (nodeFrom.STAdata){
			nodeTo.STAdata = deapCopy(nodeFrom.STAdata); //necessary first time
			networkNodes.update(nodeTo);
		}
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		return true;
	}
	if (tableNodes && nodeTo.image == "edcAsset.png") {
		if (nodeFrom && !nodeFrom.STAdata || !(nodeFrom.STAdata.length>0))
			return false;
			networkNodes.update(nodeTo);
		if (addEdge)
			networkEdges.add([{ from: nodeFrom.id, to: nodeTo.id, arrows: "from" }]);
		//nodeFrom.STAdata[0].assetId;
		EDCNegociateContract(nodeTo, nodeFrom.EDCConsumerURL, nodeFrom.STAdata[0].offerId, nodeFrom.STAdata[0].counterPartyAddress);
		return true;
	}
	return false;
}

function KeySTAPage(event) {
	//if (event.keyCode == 113)  //F2
	if (event.code == "F2" || event.code == "Delete"){
		event.preventDefault();
		var nodeId = network.getSelectedNodes();
		if (nodeId && nodeId.length) {
			switch (event.code) {
				case "F2":
					renameNode(nodeId[0]);
					break;
				case "Delete":
					removeNode(nodeId[0]);
					break;
			}
		}
	}
}

// create an array with nodes	
var networkNodes = new vis.DataSet([]);

// create an array with edges	
var networkEdges = new vis.DataSet([]);
var networkOptions = {
		interaction: { hover: true },
		manipulation: {  //https://stackoverflow.com/questions/39701703/add-edge-dynamically-visjs
			enabled: false,
			addEdge: function (data, callback) {
				//console.log('add edge', data);
				if (data.from == data.to)
					showInfoMessage("Connection to the same node is not allowed.");
				else {
					networkEdges.add([{ from: data.to, to: data.from, arrows: "from"}]);
					showInfoMessage("Connected.");
					StartCircularImage(networkNodes.get(data.from), networkNodes.get(data.to), false, true, true);
				}
				connectionInProcess = false;
			}
		}
	};

var network;

/*network.on("click", function (params) {
	params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "Click event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
	console.log("click event, getNodeAt returns: " + this.getNodeAt(params.pointer.DOM));
});*/
function networkDoubleClick(params) {
	/*params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "doubleClick event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);*/

	if (params.nodes && params.nodes.length && !connectionInProcess) {
		currentNode = networkNodes.get(params.nodes[0])
		if (currentNode.image == "sta.png") {
			document.getElementById("divTitleDialogSTAURL").innerHTML = "SensorThings API and STAplus";
			if (currentNode.STAURL)
				document.getElementById("DialogSTAURLInput").value = currentNode.STAURL;
			document.getElementById("DialogSTAURLSelect").innerHTML = GetOptionsSelectDialog(config.suggestedSTAurls);
			//document.getElementById("DialogSTAURLInput").readOnly = false;
			//document.getElementById("DialogSTAURLOk").style.display = "inline-block";
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				// Has de table a dataURL and a schemaURL?, then I add this to the dialogbox.
				var data=parentNode.STAdata;
				if (!data || !data.length) 
					alert("Parent node has no data loaded. It will be ignored.");
				else if (data.length>1)
					alert("Parent node has more than one row. Please select on row first. It will be ignored.");
				else {
					var record=data[0];
					if (!record.dataURL)
						alert("Parent node has no dataURL column. It will be ignored.");
					else 
						document.getElementById("DialogSTAURLInput").value = record.dataURL;
				}
			}
			document.getElementById("DialogSTAURL").showModal();
		}
		else if (currentNode.image == "ogcAPICols.png") {
			document.getElementById("divTitleDialogSTAURL").innerHTML = "OGC API collections";
			if (currentNode.STAURL)
				document.getElementById("DialogSTAURLInput").value = currentNode.STAURL;
			document.getElementById("DialogSTAURLSelect").innerHTML = GetOptionsSelectDialog(config.suggestedOGCAPIurls);
			document.getElementById("DialogSTAURL").showModal();
		}
		else if (currentNode.image == "ogcAPIItems.png") {
			document.getElementById("divTitleDialogSTAURL").innerHTML = "OGC API items";
			if (currentNode.STAURL)
				document.getElementById("DialogSTAURLInput").value = currentNode.STAURL;
			else
			{
				var parentNode=GetFirstParentNode(currentNode);
				if (parentNode) 
					document.getElementById("DialogSTAURLInput").value = AddQueryParamsToURL(getURLWithoutQueryParams(parentNode.STAURL) + "/items", getURLQueryParams(parentNode.STAURL));
			}
			//document.getElementById("DialogSTAURLSelect").innerHTML = GetOptionsSelectDialog(config.suggestedOGCAPIurls);
			document.getElementById("DialogSTAURL").showModal();
		}
		else if (currentNode.image == "csw.png") {
			document.getElementById("divTitleDialogSTAURL").innerHTML = "Catalogues (OGC CSW)";
			if (currentNode.STAURL)
				document.getElementById("DialogSTAURLInput").value = currentNode.STAURL;
			document.getElementById("DialogSTAURLSelect").innerHTML = GetOptionsSelectDialog(config.suggestedCatalogues);
			document.getElementById("DialogSTAURL").showModal();
		}
		else if (currentNode.image == "s3Service.png") {
			document.getElementById("divTitleDialogS3Bucket").innerHTML = "S3 Service";
			if (currentNode.STAURL)
				document.getElementById("DialogS3BucketURL").value = currentNode.STAURL;
			document.getElementById("DialogS3BucketSelect").innerHTML = GetOptionsObjectSelectDialog(config.suggestedS3Buckets);
			document.getElementById("DialogS3Bucket").showModal();
		}
		else if (currentNode.image == "s3Bucket.png") {
			document.getElementById("divTitleDialogS3Bucket").innerHTML = "S3 Bucket";
			if (currentNode.STAURL)
				document.getElementById("DialogS3BucketURL").value = currentNode.STAURL;
			else
			{
				var parentNode=GetFirstParentNode(currentNode);
				if (parentNode && parentNode.OGCType=="S3Buckets" && parentNode.STAdata && parentNode.STAdata[0] && parentNode.STAdata[0].href) {
					document.getElementById("DialogS3BucketURL").value = parentNode.STAdata[0].href;
					document.getElementById("DialogS3BucketAccessKey").value = parentNode.STAAccessKey;
					document.getElementById("DialogS3BucketSecretKey").value = parentNode.STASecretKey
					document.getElementById("DialogS3BucketS3Service").value = parentNode.STAS3Service
				}
			}
			document.getElementById("DialogS3BucketSelect").innerHTML = GetOptionsObjectSelectDialog(config.suggestedS3Buckets);
			document.getElementById("DialogS3Bucket").showModal();
		}
		else if (currentNode.image == "edc.png") {
			document.getElementById("divTitleDialogEDC").innerHTML = "Eclipse DataSpace Connector";
			if (currentNode.STAURL)
				document.getElementById("DialogEDCCatalogURL").value = currentNode.STAURL;
			document.getElementById("DialogEDCSelect").innerHTML = GetOptionsObjectSelectDialog(config.suggestedEDCs);
			document.getElementById("DialogEDC").showModal();
		}
		else if (currentNode.image == "ViewQuerySTA.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode)
				document.getElementById("DialogSTAViewQueryLink").innerHTML =
					document.getElementById("DialogSTAViewQueryLink").href = parentNode.STAURL;
			else
				document.getElementById("DialogSTAViewQueryLink").innerHTML="";
			//document.getElementById("DialogSTAURLInput").readOnly = true;
			//document.getElementById("DialogSTAURLOk").style.display = "none";
			document.getElementById("DialogSTAViewQuery").showModal();
		}
		else if (currentNode.image == "ImportCSV.png") {
			document.getElementById("DialogImportCSVSourceURLSelect").innerHTML = GetOptionsSelectDialog(config.suggestedCSVurls);
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				// Has de table a dataURL and a schemaURL?, then I add this to the dialogbox.
				var data=parentNode.STAdata;
				if (!data || !data.length) 
					alert("Parent node has no data loaded. It will be ignored.");
				else if (data.length>1)
					alert("Parent node has more than one row. Please select on row first. It will be ignored.");
				else {
					var record=data[0];
					var href=record.dataURL ? record.dataURL : record.href;
					if (!href)
						alert("Parent node has no 'dataURL' or 'href' column. It will be ignored.");
					else {
						document.getElementById("DialogImportCSVSourceFile").checked=false;
						document.getElementById("DialogImportCSVSourceURL").checked=true;
						document.getElementById("DialogImportCSVSourceURLInput").value=href;
						document.getElementById("DialogImportCSVSourceURLButton").disabled=false;
						
						if (record.schemaURL)
						{
							document.getElementById("DialogImportMeaningCSVSourceFile").checked=false;
							document.getElementById("DialogImportMeaningCSVSourceURL").checked=true;
							document.getElementById("DialogImportMeaningCSVSourceAuto").checked=false;
							document.getElementById("DialogImportMeaningCSVSourceURLInput").value=record.schemaURL;
							document.getElementById("DialogImportMeaningCSVSourceURLButton").disabled=false;
						}
					}
				}
			}
			document.getElementById("DialogImportCSV").showModal();
		}
		else if (currentNode.image == "ImportJSONLD.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				// Has de table a dataURL and a schemaURL?, then I add this to the dialogbox.
				var data=parentNode.STAdata;
				if (!data || !data.length) 
					alert("Parent node has no data loaded. It will be ignored.");
				else if (data.length>1)
					alert("Parent node has more than one row. Please select on row first. It will be ignored.");
				else {
					var record=data[0];
					var href=record.dataURL ? record.dataURL : record.href;
					if (!href)
						alert("Parent node has no 'dataURL' or 'href' column. It will be ignored.");
					else {
						document.getElementById("DialogImportJSONLDSourceFile").checked=false;
						document.getElementById("DialogImportJSONLDSourceURL").checked=true;
						document.getElementById("DialogImportJSONLDSourceURLInput").value=href;
						document.getElementById("DialogImportJSONLDSourceURLButton").disabled=false;
					}
				}
			}
			document.getElementById("DialogImportJSONLD").showModal();
		}
		else if (currentNode.image == "ImportJSON.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				// Has de table a dataURL and a schemaURL?, then I add this to the dialogbox.
				var data=parentNode.STAdata;
				if (!data || !data.length) 
					alert("Parent node has no data loaded. It will be ignored.");
				else if (data.length>1)
					alert("Parent node has more than one row. Please select on row first. It will be ignored.");
				else {
					var record=data[0];
					var href=record.dataURL ? record.dataURL : record.href;
					if (!href)
						alert("Parent node has no 'dataURL' or 'href' column. It will be ignored.");
					else {
						document.getElementById("DialogImportJSONSourceFile").checked=false;
						document.getElementById("DialogImportJSONSourceURL").checked=true;
						document.getElementById("DialogImportJSONSourceURLInput").value=href;
						document.getElementById("DialogImportJSONSourceURLButton").disabled=false;
					}
				}
			}
			document.getElementById("DialogImportJSON").showModal();
		}
		else if (currentNode.image == "ImportDBF.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				// Has de table a dataURL and a schemaURL?, then I add this to the dialogbox.
				var data=parentNode.STAdata;
				if (!data || !data.length) 
					alert("Parent node has no data loaded. It will be ignored.");
				else if (data.length>1)
					alert("Parent node has more than one row. Please select on row first. It will be ignored.");
				else {
					var record=data[0];
					if (!record.dataURL)
						alert("Parent node has no dataURL column. It will be ignored.");
					else {
						document.getElementById("DialogImportDBFSourceFile").checked=false;
						document.getElementById("DialogImportDBFSourceURL").checked=true;
						document.getElementById("DialogImportDBFSourceURLInput").value=record.dataURL;
						document.getElementById("DialogImportDBFSourceURLButton").disabled=false;
					}
				}
			}
			document.getElementById("DialogImportDBF").showModal();
		}
		else if (currentNode.image == "ImportGeoJSON.png") {
			document.getElementById("DialogImportGeoJSONSourceURLSelect").innerHTML = GetOptionsSelectDialog(config.suggestedGeoJSONurls);
			document.getElementById("DialogImportGeoJSON").showModal();
		}
		else if (currentNode.image == "Table.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				ShowTableOptionsDiv(parentNode, "DialogOKOptions", "ShowTableDialog");
				ShowTableDialog(parentNode);
				document.getElementById("DialogOK").showModal();
			}
		}
		else if (currentNode.image == "UploadObservations.png") {
			ShowUploadObservationsDialog(currentNode);
			document.getElementById("DialogUploadObservations").showModal();
		}
		/*else if (currentNode.image == "UploadTimeAverages.png") {
			ShowUploadTimeAveragesDialog(currentNode.id);
			document.getElementById("UploadTimeAverages").showModal();
		}*/
		else if (currentNode.image == "SaveTable.png") {
			//ShowSaveTableDialog(currentNode.id);
			document.getElementById("DialogSaveTable").showModal();
		}
		else if (currentNode.image == "ScatterPlot.png") {
			var parentNodes=GetParentNodes(currentNode);
			// if (parentNodes && parentNodes[0]) { A mitges de canviar els gràfics
			// 	if (parentNodes[0].STAdata)
					ShowScatterPlotDialog(parentNodes); //This will check if any parentNode hasn't got data. It is possible that some nodes linked has data but some not...
				document.getElementById("DialogScatterPlot").showModal();
			//}
		}
		else if (currentNode.image == "BarPlot.png") {
			var parentNodes=GetParentNodes(currentNode);
			if (parentNodes && parentNodes[0]) {
				if (parentNodes[0].STAdata)
					ShowBarPlotDialog(parentNodes);
				document.getElementById("DialogBarPlot").showModal();
			}
		}
		else if (currentNode.image == "ImageViewer.png") {
			var parentNodes=GetParentNodes(currentNode);
			if (parentNodes && parentNodes[0]) {
				if (parentNodes[0].STAdata)
					ShowImageViewerDialog(parentNodes);
				document.getElementById("DialogImageViewer").showModal();
			}
		}
		else if (currentNode.image == "OneValueSTA.png") {
			ShowOneValueDialog(currentNode);
			document.getElementById("DialogOneValue").showModal();
		}
		else if (currentNode.image == "CountResultsSTA.png") {
			startingNodeContextId=currentNode.id;
			document.getElementById("DialogCountResults").showModal();
		}
		else if (currentNode.image == "SaveLayer.png") {
			ShowSaveLayerDialog(currentNode);
			document.getElementById("DialogSaveLayer").showModal();
		}
		else if (currentNode.image == "OpenMap.png") {
			ShowOpenMapDialog(currentNode);
			document.getElementById("DialogSaveLayer").showModal();
		}
		else if (currentNode.image == "guf.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				var data=parentNode.STAdata;
				if (!data || !data.length) 
					alert("Parent node has no data loaded. It will be ignored.");
				else if (data.length>1)
					alert("Parent node has more than one row. Please select on row first. It will be ignored.");
				else {
					var record=data[0];
					if (!record.dataURL)
						alert("Parent node has no dataURL column. It will be ignored.");
					else {
						document.getElementById("DialogGUFTitleInput").value=record.title;
						document.getElementById("DialogGUFCodeInput").value=record.dataURL;
						document.getElementById("DialogGUFCodespaceInput").value="";
						if (parentNode.STAURL)
							document.getElementById("DialogGUFCodespaceInput").value=parentNode.STAURL;
						else {
							var grandParentNode=GetFirstParentNode(parentNode);
							if (grandParentNode && grandParentNode.STAURL)
								document.getElementById("DialogGUFCodespaceInput").value=(grandParentNode.OGCType=="OGCCSW") ? getURLWithoutQueryParams(grandParentNode.STAURL) : grandParentNode.STAURL;
						}
					}
				}
			}
			document.getElementById("DialogGUF").showModal();
		}
		else if (currentNode.image == "Meaning.png") {
			ShowMeaningTableDialog(currentNode);
			document.getElementById("DialogMeaningTable").showModal();
		}				
		else if (currentNode.image == "SelectColumnsSTA.png" || currentNode.image == "SelectColumnsTable.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				ShowTableSelectColumnsDialog("SelectColumns", parentNode, currentNode, true);
				document.getElementById("DialogSelectColumns").showModal();
			}
		}
		else if (currentNode.image == "SeparateColumns.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				populateSelectCoulmnSeparateColumns();
			}
			document.getElementById("DialogSeparateColumns").showModal();
		}
		else if (currentNode.image == "ExpandColumnsSTA.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				ShowTableSelectExpandsDialog(parentNode, currentNode, true);
				document.getElementById("DialogSelectExpands").showModal();
			}
		}
		else if (currentNode.image == "JoinTables.png") {
			var parentNodes=GetParentNodes(currentNode);
			if (parentNodes && parentNodes.length>1) {
				ShowJoinTablesDialog(parentNodes, currentNode);
				document.getElementById("DialogJoinTables").showModal();
			}
		}
		else if (currentNode.image == "SelectRowSTA.png" || currentNode.image == "SelectRowTable.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				if (parentNode.STAOGCAPIconformance){
					currentNode.STAOGCAPIconformance=parentNode.STAOGCAPIconformance;
				}
				
				if ((currentNode.image == "SelectRowSTA.png" && parentNode.STAURL) ||
					currentNode.image == "SelectRowTable.png") {
					ShowTableSelectRowDialog(parentNode, currentNode);
				}
				document.getElementById("DialogSelectRow").showModal();
			}
		}
		else if (currentNode.image == "FilterRowsSTA.png" || currentNode.image == "FilterRowsTable.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				if (parentNode.STAOGCAPIconformance){
					currentNode.STAOGCAPIconformance=parentNode.STAOGCAPIconformance;
				}
				if (parentNode.STAOGCAPIqueryable){
					currentNode.STAOGCAPIqueryable=parentNode.STAOGCAPIqueryable;
				}
				/*if (parentNode.OGCType){
					currentNode.OGCType="OGCAPIitem";
				}*/
				ShowTableFilterRowsDialog(parentNode, currentNode);
				document.getElementById("DialogFilterRows").showModal();
			}
		}
		else if (currentNode.image == "FilterRowsByTime.png"){
							
			if (PopulateFilterRowsByTimePropertySelect())document.getElementById("DialogFilterRowsByTime").showModal();
			
		}
		else if (currentNode.image == "SortBySTA.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				if (parentNode.STAURL)
					ShowTableSelectSortByDialog(parentNode);
				document.getElementById("DialogSelectSortBy").showModal();
			}
		}
		else if (currentNode.image == "GroupBy.png") {
			var parentNode=GetFirstParentNode(currentNode);
			if (parentNode) {
				ShowGroupByDialog(parentNode, currentNode);
				document.getElementById("DialogGroupBy").showModal();
			}
		}				
		else if (currentNode.image == "CreateColumns.png") {
			var parentNode=GetFirstParentNode(currentNode);
			createColumnListToAddColumns();//create columnsList including columns in the table 
			if (parentNode.STAdata){
				currentNode.STAdataCopy=deapCopy(currentNode.STAdata); //To recovery data if cancel is pressed
				currentNode.STAdata = deapCopy(parentNode.STAdata); //Necessary to reset data taking it from parent	
			}
			 if (parentNode) {
				if (!currentNode.STAnewColumnsToAdd){
					currentNode.STAnewColumnsToAdd=[]; //First time: To create it. Later: To erase old values					
				}
				networkNodes.update(currentNode);
				drawTableInColumnBoxTableInCreateColumns();
				document.getElementById("DialogCreateColumns").showModal();
			 }		
		}

		else if (currentNode.image == "AggregateColumns.png") {
			var parentNode=GetFirstParentNode(currentNode);
			createColumnListToAddColumns();//create columnsList including columns in the table 
			if (parentNode.STAdata){
				currentNode.STAdataCopy=deapCopy(currentNode.STAdata); //To recovery data if cancel is pressed
				currentNode.STAdata = deapCopy(parentNode.STAdata); //Necessary to reset data taking it from parent
			}
			fillAggregateColumVariablesList();
			showCheckRadioOptions("operationsFieldSet", "operationsRadioAggrgatedColumns_", AggregationColumnsOptions, 3, "operationsRadioAggrgatedColumns", "writeColumnNameInAggregatedColumns (event)");
			if (parentNode) {
				if (!currentNode.STAnewColumnsToAdd){
					currentNode.STAnewColumnsToAdd=[]; //First time: To create it. Later: To erase old values					
				}
				networkNodes.update(currentNode);
				drawTableInColumnBoxTableInAggregateColumns()
				document.getElementById("DialogAggregateColumns").showModal();
			}
		}
		else if (currentNode.image == "ColumnsCalculator.png") {
			var parentNode=GetFirstParentNode(currentNode);
			
			if (parentNode.STAdata){
				if (currentNode.STAdata){
					currentNode.STAdataCopy=deapCopy(currentNode.STAdata); //To recovery data if cancel is pressed
					createColumnListToAddColumns();//create columnsList including columns in the table
					currentNode.STAdata = deapCopy(parentNode.STAdata); //Necessary to reset data taking it from parent	
				}else{
					currentNode.STAdata = deapCopy(parentNode.STAdata); //Necessary to reset data taking it from parent	
					createColumnListToAddColumns();//create columnsList including columns in the table
				}						
			}
			
			fillCalculatorColumVariablesList();
			document.getElementById("textAreaFormulaColumnsCalculator").setAttribute("data-mousePosition",0);
			if (parentNode) {
				if (!currentNode.STAnewColumnsToAdd){
					currentNode.STAnewColumnsToAdd=[]; //First time: To create it. Later: To erase old values					
				}
				networkNodes.update(currentNode);
				drawTableInColumnBoxTableInCalculatorColumns();
				document.getElementById("DialogColumnsCalculator").showModal();
			}
		}

		else if (currentNode.image =="ConcatenateTables.png") {
			document.getElementById("DialogConcatenateTables").showModal();
		}
		else if (currentNode.image =="ColumnStatistics.png") {
			document.getElementById("DialogColumnStatistics").showModal();
		}
		
		else if ((currentNode.image == "GeoFilterPolSTA.png" || 
			IdOfSTAEntity(currentNode) != -1 ||
			IdOfSTASpecialQueries(currentNode) != -1)&& currentNode.image != "GeoFilterPntSTA.png") { //It is necessary to exclude GeoFilterPntSTA to allow to entry to next else.
			document.getElementById("DialogSelectNRecords").showModal();
		}
		else if (currentNode.image == "GeoFilterPntSTA.png" &&
			takeParentsInformationInGeoDistance()==true) {
			document.getElementById("DialogGeospatialFilterRowsByDistance").showModal();
		}
		else if (currentNode.image == "ObservedProperty.png" || currentNode.image == "Observation.png" || 
			currentNode.image == "FeatureOfInterest.png" || currentNode.image == "Sensor.png" || 
			currentNode.image == "Thing.png" || currentNode.image == "Location.png" || 
			currentNode.image == "HistoricalLocation.png" || currentNode.image == "Datastream.png" || 
			currentNode.image == "Party.png" || 
			currentNode.image == "Campaign.png" || currentNode.image == "License.png" || 
			currentNode.image == "ObservationGroup.png" || currentNode.image == "Relation.png") {
			startingNodeContextId=currentNode.id;
			if (GetFirstParentNode(currentNode)) {
				if (PopulateCreateUpdateDeleteEntity(getSTAEntityPlural(removeExtension(currentNode.image), true), currentNode))
					document.getElementById("DialogCreateUpdateDeleteEntity").showModal();
			}
		}else if (currentNode.image == "MultiDatastream.png"){
			var firstparentNode=GetFirstParentNode(currentNode);
			if (firstparentNode&& (getSTAURLLastEntity(firstparentNode.STAURL)!="MultiDatastreams")) {
				document.getElementById("DialogCreateUpdateDeleteEntity_numberOfMultiDatastream").showModal();
			}else {
				var number =firstparentNode.STAdata[0].multiObservationDataTypes.length;
				PopulateCreateUpdateDeleteEntityMultiDatastreams("MultiDatastreams", currentNode,number); //S'ha de calcular el numero
				document.getElementById("DialogCreateUpdateDeleteEntity_MultiDatastreams").showModal();
			}
		}
		else if (currentNode.image == "EditRecord.png") {
			startingNodeContextId=currentNode.id;
			if (GetFirstParentNode(currentNode)) {
				if (PopulateCreateUpdateDeleteRecord(currentNode, 0, false))
					document.getElementById("DialogCreateUpdateDeleteRecord").showModal();
			}
		}
	}
}

function networkContext(params) {
	params.event.preventDefault();  //https://stackoverflow.com/questions/38258940/open-an-extension-popup-html-list-on-right-click-of-node-contextmenu-in-visj

	var nodeId = network.getNodeAt(params.pointer.DOM); //params.nodes is not useful here as params.nodes are the selected ones and not the ones rightclicked.
	if (nodeId) {
		startingNodeContextId = nodeId;
		document.getElementById("DialogContextMenu").showModal();
		return;
	}
	var edgeId = network.getEdgeAt(params.pointer.DOM);
	if (edgeId) {
		startingEdgeContextId = edgeId;
		document.getElementById("DialogEdgeContextMenu").showModal();
	}
	/*params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "oncontext (right click) event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);*/
}

function networkSelectNode(params) {
	params.event.preventDefault();  //https://stackoverflow.com/questions/38258940/open-an-extension-popup-html-list-on-right-click-of-node-contextmenu-in-visj

	var nodeId = network.getNodeAt(params.pointer.DOM); //params.nodes is not useful here as params.nodes are the selected ones and not the ones rightclicked.
	if (nodeId) {
		var node=networkNodes.get(nodeId);
		ShowQueryNode(node);
		ShowTableNode(node);
		return;
	}
}

function setEventFunctionsNetwork() {
	network.on("doubleClick", networkDoubleClick);
	network.on("oncontext", networkContext);
	network.on("selectNode", networkSelectNode);
}

/*network.on("dragStart", function (params) {
	// There's no point in displaying this event on screen, it gets immediately overwritten
	params.event = "[original event]";
	console.log("dragStart Event:", params);
	console.log("dragStart event, getNodeAt returns: " + this.getNodeAt(params.pointer.DOM));
});
network.on("dragging", function (params) {
	params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "dragging event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
});
network.on("dragEnd", function (params) {
	params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "dragEnd event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
	console.log("dragEnd Event:", params);
	console.log("dragEnd event, getNodeAt returns: " + this.getNodeAt(params.pointer.DOM));
});
network.on("controlNodeDragging", function (params) {
	params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "control node dragging event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
});
network.on("controlNodeDragEnd", function (params) {
	params.event = "[original event]";
	document.getElementById("eventSpanHeading").innerText = "control node drag end event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
	console.log("controlNodeDragEnd Event:", params);
});
network.on("zoom", function (params) {
	document.getElementById("eventSpanHeading").innerText = "zoom event:";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
});
network.on("showPopup", function (params) {
	document.getElementById("eventSpanHeading").innerText = "showPopup event: ";
	document.getElementById("eventSpanContent").innerText = JSON.stringify(params, null, 4);
});
network.on("hidePopup", function () {
	console.log("hidePopup Event");
});
network.on("select", function (params) {
	console.log("select Event:", params);
});
network.on("selectEdge", function (params) {
	console.log("selectEdge Event:", params);
});
network.on("deselectNode", function (params) {
	console.log("deselectNode Event:", params);
});
network.on("deselectEdge", function (params) {
	console.log("deselectEdge Event:", params);
});
network.on("hoverNode", function (params) {
	console.log("hoverNode Event:", params);
});
network.on("hoverEdge", function (params) {
	console.log("hoverEdge Event:", params);
});
network.on("blurNode", function (params) {
	console.log("blurNode Event:", params);
});
network.on("blurEdge", function (params) {
	console.log("blurEdge Event:", params);
});*/


function addCircularImage(event, dialog, label, image) {
	var returnStart=false;
	if (event)
		event.preventDefault(); // We don't want to submit this form
	if (dialog)
		document.getElementById(dialog).close();
	var newId = (Math.random() * 1e7).toString(32);
	var node = { id: newId, label: label, image: image, shape: "circularImage" };

	if (image == "sta.png" || image == "ogcAPICols.png" || image == "ogcAPIItems.png")
		node.STAExpectedLength = 100;

	if (!startingNodeContextId)
		networkNodes.add(node);
	else
	{
		returnStart=StartCircularImage(node, networkNodes.get(startingNodeContextId), true, true, true);
		if (returnStart==null)
			return;
		if (!returnStart)
		{
			networkNodes.add(node);
			networkEdges.add([{ from: startingNodeContextId, to: newId, arrows: "from" }]);
		}
	}

	if (startingNodeContextId)
		startingNodeContextId = null;

	network.selectNodes([newId]);
}

function removeNode(nodeId)
 {
	var node=networkNodes.get(nodeId);
	if (confirm("Do you want to remove the node '" + node.label + "'?"))
	{
		networkNodes.remove(nodeId);
		return 0;
	}
	return 1;
}

function removeCircularImage(event, dialog) {

	if (event)
		event.preventDefault(); // We don't want to submit this form
	if (dialog)
		document.getElementById(dialog).close();
	if (startingNodeContextId) {
		if (0==removeNode(startingNodeContextId))
			startingNodeContextId = null;
	}
}

function renameNode(nodeId){
	var node=networkNodes.get(nodeId);
	var name=prompt("Change node label to:", node.label);
	if (name!=null)
	{
		node.label=name;
		networkNodes.update(node);
	}
}

function renameCircularImage(event, dialog) {
	if (event)
		event.preventDefault(); // We don't want to submit this form
	if (dialog)
		document.getElementById(dialog).close();
	if (startingNodeContextId) {
		renameNode(startingNodeContextId);
		startingNodeContextId = null;
	}
}

function addEdge() {
	network.addEdgeMode();
	connectionInProcess = true;
	showInfoMessage("Press the mouse botton on the starting node (child node), and drag and drop the mouse on the end node (parent node).");
}

function removeEdge(event, dialog) {
	if (event)
		event.preventDefault(); // We don't want to submit this form
	if (dialog)
		document.getElementById(dialog).close();
	if (startingEdgeContextId) {
		if (confirm("Do you want to remove the edge?"))
		{
			networkEdges.remove(startingEdgeContextId);
			startingEdgeContextId = null;
		}
	}
}

function openNetwork(data) {
	network.destroy();
	networkNodes = new vis.DataSet(data.nodes);
	networkEdges = new vis.DataSet(data.edges);
	network = new vis.Network(document.getElementById("mynetwork"), {
				nodes: networkNodes,
				edges: networkEdges
		}, networkOptions);
	setEventFunctionsNetwork();
}

function openFileNetwork(event) {
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function() {
		//Transform the JSON text in something in memory
		try
		{
			openNetwork(JSON.parse(reader.result));
			document.getElementById("openNetworkFileName").value = null;  //https://stackoverflow.com/questions/3528359/html-input-type-file-file-selection-event
		}
		catch (e) 
		{
			showInfoMessage("JSON message parse error: " + e + " The file content is:\n" + reader.result);
			return;
		}
	};
	reader.readAsText(input.files[0]);
}

function openURLNetwork(event) {
	document.getElementById("DialogOpenURLNetwork").close();
	HTTPJSONData(document.getElementById("DialogOpenURLNetworkInput").value).then(
				function(value) {
					openNetwork(value.obj);
					showInfoMessage('Download network completed.'); 
				},
				function(error) { 
					showInfoMessage('Error downloading network. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function saveNetwork(event){
	var pos=network.getPositions()
	var posArray=Object.keys(pos);
	var data={nodes:[], edges:[]};
	data.nodes.push(...deapCopy(networkNodes.get())); //Hi ha  hagut canvis en el networNodes..per accedir als nodes es fa així, el ._data no conté res
	for (var i=0; i<posArray.length; i++)
	{
		data.nodes[i].x=pos[posArray[i]].x;
		data.nodes[i].y=pos[posArray[i]].y;
	}
	var edgesArray=networkEdges.get();
	for (var i=0; i<edgesArray.length; i++)
	{
		delete edgesArray[i].id;
	}
	data.edges.push(...deapCopy(edgesArray));
	SaveLocalDataFile(JSON.stringify(data, null, "\t"), "network", ".json", "application/json");
}

async function reloadSTA(event) {
	var nodesArray=networkNodes.get();
	for (var i=0; i<nodesArray.length; i++)
	{
		var node=nodesArray[i];
		if (node.image=="sta.png")
		{
			showInfoMessage("Reload STA home page and dependencies...");
			showInfoMessage("Requesting STA page...");
			await LoadJSONNodeSTAData(node, function () {
				showInfoMessage("Reload STA home page and dependencies completed.");
			});
		}
		else if (node.image=="ogcSTAs.png")
		{
			showInfoMessage("Reload OGC API collections page and dependencies...");
			showInfoMessage("Requesting OGC API collections page...");
			await LoadJSONNodeSTAData(node, function () {
				showInfoMessage("Reload OGC API collections page and dependencies completed.");
			});
		}
		else if (node.image=="csw.png")
		{
			showInfoMessage("Reload OGC CSW records and dependencies...");
			showInfoMessage("Requesting OGC CSW collections...");
			await LoadJSONNodeSTAData(node, function () {
				showInfoMessage("Reload OGC CSW records and dependencies completed.");
			});
		}
	}
}
//General to addColumns
function cancelButtonRecoveryOldData(event){
	event.preventDefault();
	currentNode.STAdata=currentNode.STAdataCopy;
	networkNodes.update(currentNode)

	if (currentNode.image=="CreateColumns.png"){
		document.getElementById("DialogCreateColumns").close();
	}else if (currentNode.image=="AggregateColumns.png"){
		document.getElementById("DialogAggregateColumns").close();
	}else{
		document.getElementById("DialogColumnsCalculator").close();
	}
}
function deleteRowInColumnsBoxTable(number){
	event.preventDefault(); 
	var copyWithoutNumber=[],n=currentNode.STAcolumnsList.length, c=currentNode.STAnewColumnsToAdd.length,columsnListNew=[];
	for (var i=0;i<c;i++){
		if (i!=number){
			copyWithoutNumber.push(currentNode.STAnewColumnsToAdd[i])
		}else{
			var columnToErase=currentNode.STAnewColumnsToAdd[i][1];
		}
	}

	//Erase attribute from the column list
	for (var a=0;a<n;a++) {
		if (currentNode.STAcolumnsList[a]!=columnToErase){
			columsnListNew.push(currentNode.STAcolumnsList[a])
		}
	}	

	currentNode.STAnewColumnsToAdd=copyWithoutNumber;
	currentNode.STAcolumnsList=columsnListNew;
	networkNodes.update(currentNode);
	if (currentNode.image=="CreateColumns.png"){ //createColumn
		drawTableInColumnBoxTableInCreateColumns();
	}else if (currentNode.image=="AggregateColumns.png"){ //aggregateTable
		drawTableInColumnBoxTableInAggregateColumns();
	} else{
		drawTableInColumnBoxTableInCalculatorColumns();
	}
	
}
function columnExistInTheTable(columnName){
	var columnList=	currentNode.STAcolumnsList;
	var n= columnList.length, columnNameExist=false;
	
	for (var i=0;i<n;i++){
		if (columnList[i]==columnName){
			columnNameExist=true;
			break;
		}
	}
	if (!columnNameExist){
		columnList.push(columnName); //Add to Column list to avoid duplicates
		currentNode.STAcolumnsList=columnList 
	}

	return columnNameExist;
}
function createColumnListToAddColumns(){
	var dataKeys= Object.keys(currentNode.STAdata[0]);
	currentNode.STAcolumnsList=dataKeys;
	networkNodes.update(currentNode);
}

//Create Columns

function addColumnToListCreateColumn(event){
	event.preventDefault();
	
	var TypeOfValuesRadiobuttons= document.getElementsByName("TypeOfValues");
	var columnName= document.getElementById("columnNameCreateColumns").value;
	var n= TypeOfValuesRadiobuttons.length;
	
	if (columnName.length==0) columnName="noname";
	var columnNameExist=columnExistInTheTable(columnName); //Search if name for column is not repeated

	if(columnNameExist){ //It will not be added because column name already exist
		alert("Chosen column name already exists, change it to add column to the list ");
	}else{
		for (var i = 0; i <n ; i++) {
		if (TypeOfValuesRadiobuttons[i].checked){
			var columnName= document.getElementById("columnNameCreateColumns").value;
			var number= document.getElementById("inputText_"+TypeOfValuesRadiobuttons[i].value)?.value;
			if (number=="") //to avoid undefined in column list and problems afeter
					number="0";
			currentNode.STAnewColumnsToAdd.push([TypeOfValuesRadiobuttons[i].value,columnName,number]);
		}
		} 
		networkNodes.update(currentNode);
		drawTableInColumnBoxTableInCreateColumns();
	}

}

function drawTableInColumnBoxTableInCreateColumns(){
	var spanColumnsListAggregateColumns=document.getElementById("spanColumnsListCreateColumns");
	var cdns=[], tableHTML;

	tableHTML='<table border=1><tr><th>Column type</th><th>Column name</th><th>Value</th><th></th></tr>';
	if (currentNode.STAnewColumnsToAdd.length!=0){ //[columnType, columnName, value]
		var n= currentNode.STAnewColumnsToAdd.length, columnType;
		for (var i=0;i<n;i++){
			switch(currentNode.STAnewColumnsToAdd[i][0]){
				case "constantValue":
					columnType="Constant value"
					break;
				case "autoincrementalValue":
					columnType="Autoincremental value"
					break;
				case "empty":
					columnType="Empty"
					break;
						
			}
				tableHTML+=`<tr><td>${columnType}</td><td>${currentNode.STAnewColumnsToAdd[i][1]}</td>`;
			if (currentNode.STAnewColumnsToAdd[i][2]){ 
				tableHTML+=`<td>${currentNode.STAnewColumnsToAdd[i][2]}</td>`;
		}else{
				tableHTML+=`<td> </td>`;
			}
			tableHTML+=`<td><button onclick='deleteRowInColumnsBoxTable(${i})'><img src="trash.png" alt="Remove" title="Remove"></button> </td>`;
		}
	}
	else{
		tableHTML+=`<tr style="height:20px"><td> </td><td></td><td></td><td></td></tr>`
	}
	tableHTML+=`</table>`;
	cdns=[tableHTML];
	spanColumnsListAggregateColumns.innerHTML=cdns;
}
function addColumnsToTableInCreateColumns(){
	event.preventDefault();
		var n=currentNode.STAnewColumnsToAdd.length;
		for (var i=0;i<n;i++){

		switch(currentNode.STAnewColumnsToAdd[i][0]) {
		case  "constantValue":
				addNewColumnWithUniqueValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1], currentNode.STAnewColumnsToAdd[i][2])
			break;
		case  "autoincrementalValue":
				addNewColumnWithAutoincrementalValues(currentNode.STAdata,currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2])
			break;
		case  "empty":
				addNewEmptyColumn(currentNode.STAdata,currentNode.STAnewColumnsToAdd[i][1]);
			
			break;
		}	
		networkNodes.update(currentNode);	
			
	}
	uploadDataAttributesAddingNewColumns(GetParentNodes(currentNode)[0].STAdataAttributes, currentNode.STAdata);
	document.getElementById("DialogCreateColumns").close();
	showInfoMessage("New columns have been added");
}


//Aggregate columns

function deselectColumnNameRadioButton(radiobutton){
	if (radiobutton=="personalized"){
		document.getElementById("columnNameAggregateColumns").disabled = false;
	}else{
		document.getElementById("columnNameAggregateColumns").disabled = true;
	}
}

function fillAggregateColumVariablesList(){

	var dataKeys= Object.keys(currentNode.STAdata[0]);
 //var n= dataKeys.length;
// var dataKeysObject=[];
// for (var i=0;i<n;i++){
// 	dataKeysObject.push({name:dataKeys[i], desc:dataKeys[i] });
// }
//showCheckRadioOptions("columnsFielset", "attributesRadioAggrgatedColumns_", dataKeysObject, 1, null, "writeColumnNameInAggregatedColumns (event)");
var parentNode=GetFirstParentNode(currentNode);
ShowTableSelectColumnsDialog("columnsFielset", parentNode, currentNode, false,"writeColumnNameInAggregatedColumns (event)" );

//Create list of columns to avoid repetitions
currentNode.STAcolumnsList=dataKeys;

}

function checkRadioButtonColumName(event){
event.preventDefault();
document.getElementById("columnNameRadioAggregateColumns_personalized").setAttribute("checked", true);
document.getElementById("columnNameRadioAggregateColumns_suggested").setAttribute("checked", false);
}
function addColumnToListAggregateColumns(event) {
event.preventDefault();
var TypeOfOperation = document.getElementsByName("operationsRadioAggrgatedColumns"); //operation
var STANewColumnsArray = [], attributesArray = [], attribute;
var dataKeys = Object.keys(currentNode.STAdata[0]);
var chooseNumberDecimalsInputRadio, chooseNumberDecimalsInput, typeOfOperationLenght = TypeOfOperation.length, dataKeysLenght = dataKeys.length;
var columnList = currentNode.STAcolumnsList;
var columnName;

var typeOfOperationExist = false, atLeast2attributesSelected = false;
//Operation
for (var i = 0; i < typeOfOperationLenght; i++) { //Take operation 
	if (TypeOfOperation[i].checked) {
	STANewColumnsArray.push(TypeOfOperation[i].id.split("AggrgatedColumns_")[1]);
	typeOfOperationExist = true;
			}
		}
//attributes
for (var a = 0; a < dataKeysLenght; a++) {
	attribute = document.getElementById("columnsFielset_" + a);
	if (attribute.checked) {
	attributesArray.push(dataKeys[a]);
	}
}
if (attributesArray.length >= 2) {
	atLeast2attributesSelected = true;
}

if (typeOfOperationExist == false || atLeast2attributesSelected == false) {
	alert("At least two attributes and one aggregation method have to be selected");
} else {//All is correct, new column can be added to the list
	//columnName
	if (document.getElementById("columnNameRadioAggregateColumns_personalized").checked) {
	columnName = document.getElementById("columnNameAggregateColumns").value;
	if (columnName.length == 0) columnName = "noname";
	} else {
	columnName = document.getElementById("columnNameAggregateColumns_span").value;
	}
	var columnNameExist = columnExistInTheTable(columnName); //Search if name for column is not repeated
	
	if (columnNameExist) { //It will not be added because column name already exist
	alert("Chosen column name already exists, change it to add column to the list ");
			}
	else { //It can be added
	STANewColumnsArray.push(columnName, attributesArray);
	if (document.getElementById("chooseNumberDecimals_0").checked) {
			STANewColumnsArray.push(document.getElementById("chooseNumberDecimals_0_input").value)
		}	
	currentNode.STAnewColumnsToAdd.push(STANewColumnsArray); //[typeOfOperation,columnName,[attributes]]
		networkNodes.update(currentNode);
		drawTableInColumnBoxTableInAggregateColumns();
	}
}
}
function drawTableInColumnBoxTableInAggregateColumns(){
	var spanColumnsListAggregateColumns=document.getElementById("spanColumnsListAggregateColumns");
	var cdns;
	var tableHTML=`<table border=1><tr><th>Attributes</th><th>Operation</th><th>Column name</th><th>Number of decimals</th><th></th></tr>`;
	if (currentNode.STAnewColumnsToAdd.length!=0){
		var n= currentNode.STAnewColumnsToAdd.length, attributes="";
		for (var i=0;i<n;i++){
			attributes="";//restart
			for (var a =0; a<currentNode.STAnewColumnsToAdd[i][2].length; a++){
				if (a!=0){
					attributes+=", ";
				}
				attributes +=currentNode.STAnewColumnsToAdd[i][2][a];
				
			}
			tableHTML+=`<tr><td>${attributes}</td><td>${currentNode.STAnewColumnsToAdd[i][0]}</td><td>${currentNode.STAnewColumnsToAdd[i][1]}</td>`;
			if (currentNode.STAnewColumnsToAdd[i][3]){ //number of decimals
				tableHTML+=`<td>${currentNode.STAnewColumnsToAdd[i][3]}</td><td><button onclick='deleteRowInColumnsBoxTable(${i})'><img src="trash.png" alt="Remove" title="Remove"></button></td></tr>`;
			}else{
				tableHTML+=`<td> </td><td><button onclick='deleteRowInColumnsBoxTable(${i})'><img src="trash.png" alt="Remove" title="Remove"></button></td></tr>`;
		}
		}
	}else{
		tableHTML+=`<tr style="height:20px"><td></td><td></td><td></td><td></td><td></td></tr>`
	}
	
	tableHTML+=`</table>`;
	cdns=[tableHTML];
	spanColumnsListAggregateColumns.innerHTML=cdns;
}

function addColumnsToTableInAggregateColumns(event) {
	event.preventDefault();
	var decimalNumber, n=currentNode.STAnewColumnsToAdd.length;
	if (n!=0) {
		for (var i=0;i<n;i++){
			decimalNumber=""; //Restart 
			if (currentNode.STAnewColumnsToAdd[i][3]){
				decimalNumber=currentNode.STAnewColumnsToAdd[i][3];
			}
			switch(currentNode.STAnewColumnsToAdd[i][0]) {
				case  "Sum":
				if (decimalNumber!=""){
						addnewColumnSummingColumns(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],decimalNumber, dataAttributes); //data, columnName,columnsToSum, decimalnumber

				}else{
						addnewColumnSummingColumns(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes); //data, columnName,columnsToSum

					}
					break;
				case  "Product": //(s'ha de crear)
					if (decimalNumber!=""){
						addnewColumnMultiplyingColumns(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],decimalNumber, dataAttributes); //data, columnName,columnsToSum, decimalnumber

				}else{
						addnewColumnMultiplyingColumns(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes); //data, columnName,columnsToSum

					}
					break;
				case  "MinValue":
					if (decimalNumber!=""){
					addnewColumnMinimalValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes); 

			}else{
					addnewColumnMinimalValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes); 
					}
					break;
				case  "MaxValue":
					if (decimalNumber!=""){
					addnewColumnMaximalValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber,dataAttributes); 
			}else{
					}
					addnewColumnMaximalValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes); 

					break;
				case  "Mean":
					if (decimalNumber!=""){
					addnewColumnMeanValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);

			}else{
					addnewColumnMeanValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);

					}
					break;
				case  "Variance":
					if (decimalNumber!=""){
						addnewColumnVarianceValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);

			}else{
						addnewColumnVarianceValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);

					}
					break;
				case  "Median":
					if (decimalNumber!=""){
						addnewColumnMedianValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);

				}else{
						addnewColumnMedianValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);

					}
					break;
				case  "Concatenate":
				addnewColumnConcatenatingValues(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2]);
					break;

				case  "Mode":
					if (decimalNumber!=""){
					addnewColumnModeValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
				}else{
					addnewColumnModeValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);
					}
					break;
				case  "FirstValue":
					if (decimalNumber!=""){
					addnewColumnFirstValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
				}else{
					addnewColumnFirstValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);
					}
					break;

				case  "StandardDeviation":
					if (decimalNumber!=""){
					addnewColumnStandardDeviationValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber,"", dataAttributes);
				}else{
					addnewColumnStandardDeviationValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], dataAttributes);
					}
					break;
				case  "LastValue":
					if (decimalNumber!=""){
					addnewColumnLastValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
				}else{
					addnewColumnLastValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);
					}
					break;
				case  "Q1":
					if (decimalNumber!=""){
					addnewColumnQ1Value(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
				}else{
					addnewColumnQ1Value(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);
					}
					break;
				case  "Q3":
					if (decimalNumber!=""){
					addnewColumnQ3Value(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
				}else{
					addnewColumnQ3Value(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2],"", dataAttributes);
					}
					break;
				case  "RandomValue":
					if (decimalNumber!=""){
					addnewColumnRandomValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber,"", dataAttributes);
				}else{
					addnewColumnRandomValue(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], dataAttributes);
					}
					break;
				case  "Count": //TE SENTIT?
					addnewColumnCount(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], dataAttributes);
					break;
				case  "CountDefined": //Falta fer la funció que conta

					break;
				case  "Range": 						
					if (decimalNumber!=""){
						addnewColumnRange(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
					}else{
						addnewColumnRange(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2]),"", dataAttributes;
					}
					break;
				case  "ProportionDefined": //Falta fer la funció que conta
					if (decimalNumber!=""){
					addnewColumnProportionDefined(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2], decimalNumber, dataAttributes);
				}else{
					addnewColumnProportionDefined(currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][2]),"", dataAttributes;
					}

					break;
			}
		}
		uploadDataAttributesAddingNewColumns(GetParentNodes(currentNode)[0].STAdataAttributes,currentNode.STAdata);
		showInfoMessage("New columns have been added");
		document.getElementById("DialogAggregateColumns").close();
	}else{
		alert("There are no columns in the list to add, nothing will be added to the table")
	}


}
function uploadDataAttributesAddingNewColumns(attributes, data,origin){
	var columnNames= Object.keys(data[0]);
	var oldAttributes= Object.keys(attributes);
	var newAttributes={}, n=data.length, dataToAttribute=[], columnName, objToData, keysNewAttributes;

	for (var i=0;i<columnNames.length;i++){
		if (oldAttributes.includes(columnNames[i])){
			keysNewAttributes=Object.keys(newAttributes); //avoid repetitions
			if (!keysNewAttributes.includes(columnNames[i])){
				newAttributes[columnNames[i]]= (attributes[columnNames[i]]);
			}
		}else{ //newColumns
			if (origin!="calculator"){
					for (var e=0;e<n;e++){
						columnName=columnNames[i];
						objToData={}
						objToData[columnNames[i]]=data[e][columnNames[i]]
						dataToAttribute.push(objToData)
					}
					newAttributes={...newAttributes,... getDataAttributes(dataToAttribute)};
			}else{
				newAttributes[columnNames[i]]={type: 'number'} // GetAttributes define type as string, but is number
			}
		
		}
	}
	currentNode.STAdataAttributes=newAttributes;
	networkNodes.update(currentNode);
}

function writeColumnNameInAggregatedColumns(event){
	event.preventDefault();
	var columnName=document.getElementById("columnNameAggregateColumns")
	var columnNameValue=columnName.value;
	var spanSuggested= document.getElementById("columnNameAggregateColumns_span");
		var dataKeys= Object.keys(currentNode.STAdata[0]);
		var dataKeysLenght=dataKeys.length, attribute, columnNameText="";
		for (var a=0;a<dataKeysLenght;a++ ){
				attribute=document.getElementById("columnsFielset_"+a);
				if (attribute.checked){
					if (columnNameText==""){
						columnNameText+=dataKeys[a];
					}else{ //more than one chosen
						columnNameText+="_"+dataKeys[a];
					}
					
				}
		}
		//
		var TypeOfOperation=document.getElementsByName("operationsRadioAggrgatedColumns");
		var typeOfOperationLenght=TypeOfOperation.length
		for (var i=0;i<typeOfOperationLenght;i++){ //Take operation and column name
			if (TypeOfOperation[i].checked){
				columnNameText+="_"+ TypeOfOperation[i].id.split("AggrgatedColumns_")[1];
			}
		}

		spanSuggested.innerHTML= columnNameText;
		spanSuggested.value=columnNameText;
		
	/////
	
}

//Calculator 
function PrepareTextAreaCalculator() {
	var textarea = document.getElementById("textAreaFormulaColumnsCalculator")
	textarea.addEventListener('click', event => { //keep mouse position to add buttons information in that place
	textarea.setAttribute("data-mousePosition", textarea.selectionStart) 
	});
}

function WriteInTheFormulaButtons(character) {
event.preventDefault();
var textAreaFormulaColumnsCalculator = document.getElementById("textAreaFormulaColumnsCalculator");
var text = textAreaFormulaColumnsCalculator.value;
var mousePosition = textAreaFormulaColumnsCalculator.getAttribute("data-mousePosition");
	if (character=="&#40;"){
		character=="("
	}else if (character=="&#41;"){
		character==")"
	}




if (character == "attributeSelected") {
	var selector = document.getElementById("calculator_selectColumns");
	character = selector.options[selector.selectedIndex].value;
}
textAreaFormulaColumnsCalculator.value = [text.slice(0, mousePosition), character, text.slice(mousePosition)].join('');
textAreaFormulaColumnsCalculator.setAttribute("data-mousePosition", parseInt(mousePosition) + character.length); //If there is no click, next button will be written after this.
}

function addColumnToListColumnsCalculator(event){
	event.preventDefault();
	var columnName= document.getElementById("columnNameColumnsCalculator").value;
	var textAreaFormulaColumnsCalculator= document.getElementById("textAreaFormulaColumnsCalculator");
	if (columnName.length==0) columnName="noname";
	var columnNameExist=columnExistInTheTable(columnName); //Search if name for column is not repeated
	if(columnNameExist){ //It will not be added because column name already exist
		alert("Chosen column name already exists, change it to add column to the list ");
	}else{
		var decimalNumber="";
		if (document.getElementById("chooseNumberDecimalsCalculator_0").checked) {
			decimalNumber=document.getElementById("chooseNumberDecimalsCalculator_0_input").value;
		}
		currentNode.STAnewColumnsToAdd.push([textAreaFormulaColumnsCalculator.value,columnName,decimalNumber]);
		drawTableInColumnBoxTableInCalculatorColumns();
	}
	
}
function fillCalculatorColumVariablesList(){ //omplir el desplegable

	// var dataKeys= Object.keys(currentNode.STAdata[0]);
	//var n= dataKeys.length;
	var dataAttributes= currentNode.STAdataAttributes ? currentNode.STAdataAttributes : getDataAttributes(currentNode.STAdata);
	var dataAttributesKeys=Object.keys(dataAttributes)
	var n= dataAttributesKeys.length;
	
	var select = document.getElementById("calculator_selectColumns");
	var cdns=[]

	for (var i=0;i<n;i++){
		//cdns.push(`<option value= ${dataKeys[i]}>${dataKeys[i]}</option>`);
		if (dataAttributes[dataAttributesKeys[i]]['type']=="number"||dataAttributes[dataAttributesKeys[i]]['type']=="integer") cdns.push(`<option value= ${dataAttributesKeys[i]}>${dataAttributesKeys[i]}</option>`);
	}
	select.innerHTML=cdns.join("");

	
}
function drawTableInColumnBoxTableInCalculatorColumns(){
	var spanColumnsListAggregateColumns=document.getElementById("spanColumnsListCalculatorColumns");
	var cdns;
	var tableHTML=`<table border=1><tr><th>Formula</th><th>Column name</th><th>Number of decimals</th><th></th></tr>`;
		if (currentNode.STAnewColumnsToAdd.length!=0){
			var n= currentNode.STAnewColumnsToAdd.length;
			for (var i=0;i<n;i++){
				tableHTML+= `<tr><td>${currentNode.STAnewColumnsToAdd[i][0]}</td><td>${currentNode.STAnewColumnsToAdd[i][1]}</td><td>${currentNode.STAnewColumnsToAdd[i][2]}</td><td><button onclick='deleteRowInColumnsBoxTable(${i})'><img src="trash.png" alt="Remove" title="Remove"></button></td></tr>`

			}
		}else{
			tableHTML+=`<tr style="height:20px"><td></td><td></td><td></td><td></td></tr>`
	}
		tableHTML+=`</table>`;
		cdns=[tableHTML];
		spanColumnsListAggregateColumns.innerHTML=cdns;
}

function addColumnsToTableInColumnsCalculator(){
	event.preventDefault();
	var decimalNumber;//decimalNumber=currentNode.STAnewColumnsToAdd[i][2];
	var n=currentNode.STAnewColumnsToAdd.length;
	for (var i=0;i<n;i++){
		decimalNumber=currentNode.STAnewColumnsToAdd[i][2];
		if (decimalNumber!=""){
			addnewColumnWithFormula (currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][0],decimalNumber);
		}else{
			addnewColumnWithFormula (currentNode.STAdata, currentNode.STAnewColumnsToAdd[i][1],currentNode.STAnewColumnsToAdd[i][0]);
		}
	}

	uploadDataAttributesAddingNewColumns(GetParentNodes(currentNode)[0].STAdataAttributes, currentNode.STAdata, "calculator");
	showInfoMessage("New columns have been added");
	document.getElementById("DialogColumnsCalculator").close();

}
function createColumnStatistics(event){
	event.preventDefault();
	var parentNodes= GetParentNodes(currentNode);
	var staData= parentNodes[0].STAdata;
	var dataAttributes= parentNodes[0].STAdataAttributes ? parentNodes[0].STAdataAttributes : getDataAttributes(staData);
	var keys = Object.keys(staData[0]);
	var collectedData,obj, finallyArray=[],dataType;

	for (var i=0;i<keys.length;i++){
		obj={};
		collectedData=[];
		dataType=dataAttributes[keys[i]]["type"];
		for (var e=0;e<staData.length;e++){
			collectedData.push(staData[e][keys[i]]);
		}

		obj["ColumnName"]= keys[i];
		obj["DataType"]= dataType;
		obj["Mean"]= (dataType=="number")?aggrFuncMean(collectedData):"";
		obj["Median"]= (dataType=="number")?aggrFuncMedian(collectedData):"";
		obj["Q1"]= (dataType=="number")?aggrFuncQ1(collectedData):"";
		obj["Q3"]= (dataType=="number")?aggrFuncQ3(collectedData):"";
		obj["Min.value"]= (dataType=="number")?aggrFuncMinValue(collectedData):"";
		obj["Max.value"]= (dataType=="number")?aggrFuncMaxValue(collectedData):"";
		obj["Mode"]= aggrFuncMode(collectedData); //he triat la funció que només et dóna una moda (tenim la que et dóna totes, com prefereixis)
		obj["StandardDeviation"]= (dataType=="number")?aggrFuncStandardDeviation(collectedData):"";
		obj["Variance"]= (dataType=="number")?aggrFuncVariance(collectedData):"";
		obj["Range"]= (dataType=="number")?aggrFuncRange(collectedData):"";
		obj["FirstValue"]=(dataType=="number")? aggrFuncFirstValue(collectedData):"";
		obj["LastValue"]= (dataType=="number")?aggrFuncLastValue(collectedData):"";
		obj["RandomValue"]= aggrFuncRandomValue(collectedData);
		//obj["CountDefined"]= aggrFuncCountDefined(collectedData);
		obj["Count"]= aggrFuncCount(collectedData);
		//obj["ProportionDefined"]= aggrFuncProportionDefined(collectedData); 

		finallyArray.push(obj);
	}

	currentNode.STAdata=finallyArray;
	networkNodes.update(currentNode);
	document.getElementById("DialogColumnStatistics").close();

	
}


function concatenateTables(){
	event.preventDefault();
	var selected= (document.getElementById("concatenationType_allColumns").checked ==true)?"allColumns":"repeatedColumns";			//agafar les data de tots els pares i juntar
	var parentNodes= GetParentNodes(currentNode);
	var parentNodesArrayData=[], parentNodesArrayKeys=[];

	for(var i=0;i<parentNodes.length;i++){
		parentNodesArrayData.push(...parentNodes[i].STAdata);
		parentNodesArrayKeys.push(Object.keys(parentNodes[i].STAdata[0]));
	}
	//llista de les keys
	var allkeysWithOutRepetitions=parentNodesArrayKeys[0];
	var repitedKeys=[];

	for (var i=1;i<parentNodesArrayKeys.length;i++){
		for (var e=0;e<parentNodesArrayKeys[i].length;e++){
			if (allkeysWithOutRepetitions.indexOf(parentNodesArrayKeys[i][e])==-1){ //All different keys
				allkeysWithOutRepetitions.push(parentNodesArrayKeys[i][e]); 
				
			}else{
				repitedKeys.push(parentNodesArrayKeys[i][e]); //only repeated keys
			}
		}
	}
	var necessaryRepetitions= parentNodes.length-1;// repitedKeys shan de repetir un cop menys q elements hi ha
	repitedKeys=repitedKeys.sort();
	var count=1, lastKey=repitedKeys[0], repitedKeysDefinitive=[];
	for (var i=0;i<repitedKeys.length;i++){

		if (lastKey==repitedKeys[i]){
			count+=1;
			lastKey=repitedKeys[i];
		}else{
			if(count==necessaryRepetitions){repitedKeysDefinitive.push(repitedKeys[i])};
			count=0;
			lastKey=repitedKeys[i];
		}
	}

	var keysToNewTable;
	if (selected=="allColumns"){
		keysToNewTable= allkeysWithOutRepetitions;

	}else{ //repeatedColumns
		keysToNewTable= repitedKeysDefinitive;
	}

	var resultData=[], obj;
	for (var i=0;i<parentNodesArrayData.length;i++){
		obj={}
		for (var e=0;e<keysToNewTable.length;e++){
			if(parentNodesArrayData[i].hasOwnProperty(keysToNewTable[e])){
				obj[keysToNewTable[e]]= parentNodesArrayData[i][keysToNewTable[e]];
			}else{
				obj[keysToNewTable[e]]= "";
			}
		}
		resultData.push(obj);
		
	}
	currentNode.STAdata=resultData;
	var parentNodes= GetParentNodes(currentNode);
	var allAttributes={}
	for (var i=0;i<parentNodes.length;i++){
		if (parentNodes[i].STAdata)	{
			allAttributes={...allAttributes,...getDataAttributes(parentNodes[i].STAdata)}
		}
	}
	uploadDataAttributesAddingNewColumns(allAttributes, currentNode.STAdata);
	networkNodes.update(currentNode);
	document.getElementById("DialogConcatenateTables").close();
}

const RouteToLocation={
Parties: ["Things/Locations/location", "Datastreams/Thing/Locations/location", "MultiDatastreams/Thing/Locations/location" ],
Sensors: ["Datastreams/Thing/Locations/location", "MultiDatastreams/Thing/Locations/location"],
ObservedProperties: ["Datastreams/Thing/Locations/location", "MultiDatastreams/Thing/Locations/location"],
Things: ["Locations/location"], 
Observations:["Datastream/Thing/Locations/location", "MultiDatastream/Thing/Locations/location"],
Locations:["location"],
FeaturesOfInterest:["Observations/Datastream/Thing/Locations/location", "Observations/multiDatastream/Thing/Locations/location"],
HistoricalLocations: ["Location/location", "Things/Locations/location"],
Datastreams:["Thing/Locations/location"],
MultiDatastreams:["Thing/Locations/location"],
Campaigns: ["Datastreams/Thing/Locations/location","MultiDatastreams/Thing/Locations/location", "License/Datastreams/Thing/Locations/location", "License/MultiDatastreams/Thing/Locations/location","ObservationGroups/Observations/Datastream/Thing/Locations/location","ObservationGroups/License/Datastreams/Thing/Locations/location","ObservationGroups/License/MultiDatastreams/Thing/Locations/location", "ObservationGroups/Observations/MultiDatastream/Thing/Locations/location"],
Licenses: [ "Datastreams/Thing/Locations/location", "MultiDatastreams/Thing/Locations/location"],
ObservationGroups: ["Campaigns/Datastreams/Thing/Locations/location","Campaigns/MultiDatastreams/Thing/Locations/location", "Campaigns/License/Datastreams/Thing/Locations/location", "Campaigns/License/MultiDatastreams/Thing/Locations/location", "Observations/Datastream/Thing/Locations/location", "Observations/MultiDatastream/Thing/Locations/location"] 
//Relations: []
}
const RouteToFeature={
	Parties: ["Datastreams/Observations/FeatureOfInterest/feature","MultiDatastreams/Observations/FeatureOfInterest/feature","Things/Datastreams/Observations/FeatureOfInterest/feature","Things/MultiDatastreams/Observations/FeatureOfInterest/feature"],
	Sensors: ["Datastreams/Observations/FeatureOfInterest/feature", "MultiDatastreams/Observations/FeatureOfInterest/feature"], 
	ObservedProperties: ["Datastreams/Observations/FeatureOfInterest/feature", "MultiDatastreams/Observations/FeatureOfInterest/feature"], 
	Things: ["Datastreams/Observations/FeatureOfInterest/feature","MultiDatastreams/Observations/FeatureOfInterest/feature"], 
	Observations:["FeatureOfInterest/feature"],
	Locations:["Things/Datastreams/Observations/FeatureOfInterest/feature", "Things/MultiDatastreams/Observations/FeatureOfInterest/feature"],
	FeaturesOfInterest:["feature"],
	HistoricalLocations: ["Things/Datastreams/Observations/FeatureOfInterest/feature","Things/MultiDatastreams/Observations/FeatureOfInterest/feature"],
	Datastreams: ["Observations/FeatureOfInterest/feature"],
	MultiDatastreams:["Observations/FeatureOfInterest/feature"],
	Campaigns:["License/ObservationGroups/Observations/FeatureOfInterest/feature",	"License/Datastreams/Observations/FeatureOfInterest/feature","License/MultiDatastreams/Observations/FeatureOfInterest/feature","ObservationGroups/Observations/FeatureOfInterest/feature"],
	Licenses:["Datastreams/Observations/FeatureOfInterest/feature","MultiDatastreams/Observations/FeatureOfInterest/feature", "ObservationGroups/Observations/FeatureOfInterest/feature" ], 
	ObservationGroups:[	"Campaigns/License/Datastreams/Observations/FeatureOfInterest/feature","Campaigns/License/MultiDatastreams/Observations/FeatureOfInterest/feature",	"Campaigns/Datastreams/Observations/FeatureOfInterest/feature", "Campaigns/MultiDatastreams/Observations/FeatureOfInterest/feature","License/Datastreams/Observations/FeatureOfInterest/feature", "License/MultiDatastreams/Observations/FeatureOfInterest/feature","Observations/Datastream/Observations/FeatureOfInterest/feature", "Observations/MultiDatastream/Observations/FeatureOfInterest/feature"]
	//Relations: []
}

function takeParentsInformationInGeoDistance(){
	var parentNodes= GetParentNodes(currentNode);
	var nodeWithUniqueRow=false, columns=[], columnsValues={}, parentNodeSTAEntity, nodeSTA=false,parentNode;

	for (var i=0;i<parentNodes.length;i++){
		parentNode=deapCopy(parentNodes[i])
		if (parentNode.STAURL && parentNode.STAdata.length>1){ //STA to apply filter
			var url=parentNode.STAURL, finalURL; 
			nodeSTA=true;
			parentNodeSTAEntity= getSTAURLLastEntity(parentNode.STAURL);
			var prevFilter = GetQueryParamFromURL(url, "$filter"); //Same way that in filterRows
			if  (prevFilter) {
				finalURL = RemoveQueryParamFromURL(url, "$filter");
				finalURL = AddQueryParamsToURL(finalURL, "$filter=" + prevFilter + " and ");
			}
			 else
				finalURL = AddQueryParamsToURL(url, "$filter=");

			currentNode.STAURL= finalURL;	
		}else if (!parentNode.STAURL &&parentNode.STAdata.length>1){
			alert ("There is a node linked not STA with more than one register, if you want to use it, apply a select row to choose your register")
			
			return false;
		}else { //1 register
			if (nodeWithUniqueRow==true){
				alert ("There is more than one node with only one register linked. Link only one node with one register to use to take the coordenates")
				return false;
			}
			nodeWithUniqueRow=true;
			var dataAttributes= getDataAttributes(parentNode.STAdata);
			var dataAttributesKeys=Object.keys(dataAttributes);
			var itIsGeoJSON="no", fatureOrLocation="no";

			for (var a=0;a<dataAttributesKeys.length;a++){
									
					if (dataAttributesKeys[a]!="geometry" || (dataAttributesKeys[a]=="geometry"&& dataAttributesKeys.length>1 )){
						if (dataAttributes[dataAttributesKeys[a]]['type']=="number"||dataAttributes[dataAttributesKeys[a]]['type']=="integer"){
							columnsValues[dataAttributesKeys[a]]=parentNode.STAdata[0][dataAttributesKeys[a]];
							columns.push(dataAttributesKeys[a]);									
						}
					else if (dataAttributesKeys[a]=="feature"){
						columnsValues["feature"]=parentNode.STAdata[0]["feature"]["coordinates"];
						columns.push("feature");
						fatureOrLocation="feature";

					}
					else if (dataAttributesKeys[a]=="location"){
						columnsValues["location"]=parentNode.STAdata[0]["location"]["coordinates"];
						columns.push("location");
						fatureOrLocation="location";

					}
					}else{ //GeoJSON
						columnsValues["geometry-coordinates"]=parentNode.STAdata[0]["geometry"]["coordinates"];
						columns.push("geometry-coordinates");
						(parentNode.STAdata[0]["geometry"]["type"]=="Point"||parentNode.STAdata[0]["geometry"]["type"]=="point")?itIsGeoJSON="Point": itIsGeoJSON="Poligon"; 
						
					
					}
			}			
			
				
			currentNode.STAcolumnsValuesGeoDistance= columnsValues;
			networkNodes.update(currentNode);
			console.log(columns)
		}
	}
	if ((parentNodes.length==1 && nodeSTA) || (itIsGeoJSON=="Point"||itIsGeoJSON=="Poligon")||fatureOrLocation=="location"||fatureOrLocation=="feature"){ 
		document.getElementById("geoDistance_input_coordinate1_select").style.display="none";
		document.getElementById("geoDistance_input_coordinate2_select").style.display="none";
		if (itIsGeoJSON=="Point"){
			document.getElementById("geoDistance_input_coordinate1").value=columnsValues["geometry-coordinates"][0];
			document.getElementById("geoDistance_input_coordinate2").value=columnsValues["geometry-coordinates"][1];
		}else if(fatureOrLocation=="location"){
			document.getElementById("geoDistance_input_coordinate1").value=columnsValues["location"][0];
			document.getElementById("geoDistance_input_coordinate2").value=columnsValues["location"][1];
		}
		else if(fatureOrLocation=="feature"){
			document.getElementById("geoDistance_input_coordinate1").value=columnsValues["feature"][0];
			document.getElementById("geoDistance_input_coordinate2").value=columnsValues["feature"][1];
		}
		else{
			document.getElementById("geoDistance_input_coordinate1").value="";
			document.getElementById("geoDistance_input_coordinate2").value="";
		}
	}else{
		document.getElementById("geoDistance_input_coordinate1_select").style.display="inline-block";
		document.getElementById("geoDistance_input_coordinate2_select").style.display="inline-block";
		var select,cdns=[];
		for (var e=0;e<columns.length;e++){
			cdns.push(`<option value="${columns[e]}">${columns[e]}</option>`);

		}			
		for (var i=1;i<3;i++){
			select=document.getElementById("geoDistance_input_coordinate"+i+"_select");
			select.innerHTML=cdns.join("");
			document.getElementById("geoDistance_input_coordinate"+i).value=columnsValues[Object.keys(columnsValues)[0]];
		}
	}
	
	var entityRouteToLocation=RouteToLocation[parentNodeSTAEntity];
	var entityRouteToFeature=RouteToFeature[parentNodeSTAEntity];
	var entityRouteToLocationSelect= document.getElementById("geoDistance_Location_select");
	var entityRouteToFeatureSelect= document.getElementById("geoDistance_FOI_Feature_select");
	cdns=[];
	for (var i=0;i<entityRouteToLocation.length;i++){
		cdns.push(`<option value="${entityRouteToLocation[i]}">${entityRouteToLocation[i]}</option>`);
	}
	entityRouteToLocationSelect.innerHTML=cdns.join(""); 

	cdns=[];
	for (var i=0;i<entityRouteToFeature.length;i++){
		cdns.push(`<option value="${entityRouteToFeature[i]}">${entityRouteToFeature[i]}</option>`);
	}
	entityRouteToFeatureSelect.innerHTML=cdns.join(""); 


	
	return true;
}
async function GetGeoDistanceFilter(event){
	event.preventDefault(); 
	var distanceValue= document.getElementById("geoDistance_input_value").value;
	var selectOperator= document.getElementById("geoDistance_select_operator");
	var selectedValueOperator= selectOperator.options[selectOperator.selectedIndex].value;
	var coordinatesValues=[];
	var selectRoute, selectedRouteValue;
	//Route to feature or location
	if  (document.getElementById("geoDistance_FOI_Feature").checked){
		selectRoute= document.getElementById("geoDistance_FOI_Feature_select");
		selectedRouteValue= selectRoute.options[selectRoute.selectedIndex].value;
		
	}else{
		selectRoute= document.getElementById("geoDistance_Location_select");
		selectedRouteValue= selectRoute.options[selectRoute.selectedIndex].value;
	}
	
	//Take Coordenates
	coordinatesValues.push(document.getElementById("geoDistance_input_coordinate1").value,document.getElementById("geoDistance_input_coordinate2").value);

	//make url
	var url=currentNode.STAURL;
		
	url+=`geo.distance( ${selectedRouteValue}, geography'POINT (${coordinatesValues[0]} ${coordinatesValues[1]})') ${selectedValueOperator}  ${distanceValue} `
		

	currentNode.STAURL= url;
	currentNode.STAdata= await loadAPIDataWithReturn(url,"EntitiesFilterRow") 
	networkNodes.update(currentNode);
	document.getElementById("DialogGeospatialFilterRowsByDistance").close();
}

function writeValueInInputGeoDistance(value){
	var select=document.getElementById("geoDistance_input_coordinate"+value+"_select");
	var selectValue= select.options[select.selectedIndex].value;
	document.getElementById("geoDistance_input_coordinate"+value).value= currentNode.STAcolumnsValuesGeoDistance[selectValue]
}

function PopulateFilterRowsByTimePropertySelect(){
	var parentNodes= GetParentNodes(currentNode)
	if (parentNodes && parentNodes.length==1){
		var idNode=IdOfSTAEntity(parentNodes[0]);
			if (idNode<0){
				alert("It is necessary to link only one node with data from STA source");
				return false;
			}else{
				if (STAEntitiesArray[idNode]!="Observations"){
					document.getElementById("aggregateDataYes").disabled=true;
					document.getElementById("filterRowsByTimeSelectAggregation").disabled=true;
					document.getElementById("aggregateDataYes_label").style.color="#b6b5b5";
				}
				else{
					 document.getElementById("aggregateDataYes").disabled=false;
					 document.getElementById("filterRowsByTimeSelectAggregation").disabled=false;
					 document.getElementById("aggregateDataYes_label").style.color="#000000";
				}
				document.getElementById("filterRowsByTimeSelectProperty").innerHTML="";
				if (STAEntitiesArray[idNode]=="Datastreams" ||STAEntitiesArray[idNode]=="MultiDatastreams"||STAEntitiesArray[idNode]=="Observations"){
					document.getElementById("filterRowsByTimeSelectProperty").innerHTML='<option value="phenomenonTime">phenomenonTime</option><option value="resultTime">resultTime</option>'
					
					
				}
				else if (STAEntitiesArray[idNode]=="Campaigns"){
					document.getElementById("filterRowsByTimeSelectProperty").innerHTML='<option value="startTime">startTime</option><option value="endTime">endTime</option>'
				}
				else if (STAEntitiesArray[idNode]=="ObservationGroups"){
					document.getElementById("filterRowsByTimeSelectProperty").innerHTML='<option value="creationTime">creationTime</option><option value="endTime">endTime</option>'
				} else{
					alert("It is necessary to link one node with a data property");
					return false;
				}
			}
			return true;			
	}else {
		alert("It is necessary to link only one node with data from STA source");
		return false;
	}

}
async function filterRowsByTimeOkButton(){
	event.preventDefault();
	//agafar la info del select i les dates
	var selectProperty= document.getElementById("filterRowsByTimeSelectProperty");
	var selectedValue= selectProperty.options[selectProperty.selectedIndex].value;
	var dateFromValue= document.getElementById("filterRowsByTimeCalendarFrom").value;
	var dateToValue= document.getElementById("filterRowsByTimeCalendarTo").value;
	if (dateFromValue==""|| dateToValue =="")alert("It is necessary to select a Data");
	else{
		document.getElementById("DialogFilterRowsByTime").close();
		var url= prepareUrlToApplyFilter();
		await applyTemporalFilter(url, dateFromValue+"Z", dateToValue+"Z",selectedValue );
		
		if (document.getElementById("aggregateDataYes").checked){
			var selectAggregation= document.getElementById("filterRowsByTimeSelectAggregation");
			var selectedAggregationValue= selectAggregation.options[selectAggregation.selectedIndex].value;
			showInfoMessage("Applying filter ... It may take a while, please wait")
			await askForAllDataResults(selectedValue);
			var necessaryData= await prepareSTAdataToAggregateDataByChosenPeriodFunction(currentNode.STAdata, [selectedValue, "result"]); //await because can contain a lot of data 
			// console.log(necessaryData)
			var aggregatedData= await AggregateDataByChosenPeriod(necessaryData, selectedAggregationValue, true);
			var statistics= calculateMinMaxMeanDesvest(aggregatedData[0]);
			console.log(statistics);
			
			var data=[], n=statistics.length; //data = array of observations. Every statistic has their observation
			for (var i=0;i<n;i++){ //Put results in every observation
				aggregatedData[1][i].result= statistics[i][1];
			}
			currentNode.STAdata= aggregatedData[1];
			currentNode.STAdataStatistics= statistics;
			//currentNode.STAdataAttributes=getDataAttributes(aggregatedData[1]);
			networkNodes.update(currentNode);
			showInfoMessage("Filter applied");
		} 
		
		
	
	}
	
}
function prepareUrlToApplyFilter(){
	var url;
	//var previousSTAURL = currentNode.STAURL;
	var parentNode = GetFirstParentNode(currentNode);
	var previousURL = parentNode.STAURL;
	var prevFilter = GetQueryParamFromURL(parentNode.STAURL, "$filter"); //Previous parameters filtered
	if (prevFilter) {
			url= RemoveQueryParamFromURL(parentNode.STAURL, "$filter");//treume el q hi ha del filter
			url= AddQueryParamsToURL(url, "$filter=" + prevFilter + " and ");
	}
	else
	url= AddQueryParamsToURL(parentNode.STAURL, "$filter=");

	return url;
}
function applyTemporalFilter(url, dateFrom, dateTo, property){
	currentNode.STAURL=url +" "+ property+ " ge "+dateFrom +" and "+ property+ " le "+dateTo;
	LoadJSONNodeSTAData(currentNode);
	networkNodes.update(currentNode);
}

async function askForAllDataResults(property){
	var numberOfResults = await loadAPIDataWithReturn(currentNode.STAURL+"&$count=true", "CountResults");
	currentNode.STAExpectedLength=numberOfResults;
				
	if (numberOfResults<10000){ //limit
		await LoadJSONNodeSTAData(currentNode);
	}
	else{
		var data=[], newUrl, top=10000, skip=0, stop=false, dataToPush;
		newUrl= currentNode.STAURL+ `&$top=${top} &$orderBy=${property}+asc`;
		dataToPush= await loadAPIDataWithReturn(newUrl,"obtainAllData")
		data.push(...dataToPush);
		
		while (stop==false){ 

			if ((skip+20000)<numberOfResults){
				skip+=10000;

			}else{
				skip+=10000;
				top=numberOfResults-skip;
				stop=true;
			} 

			newUrl= currentNode.STAURL+ `&$skip=${skip} &$top=${top} &$orderBy=${property}+asc`;
			dataToPush= await loadAPIDataWithReturn(newUrl,"obtainAllData")
			data.push(...dataToPush);		
	
		} 
		currentNode.STAdata=data;
		networkNodes.update(currentNode);			
	}
	console.log(numberOfResults);
}

function prepareSTAdataToAggregateDataByChosenPeriodFunction(data, properties){
	var finalDataArray=[], loadArray, n= data.length;
	
	for (var i=0;i<n;i++){
		loadArray=[];
		for (var a=0;a<properties.length;a++){
			loadArray.push(data[i][properties[a]]);	
			
		}
		finalDataArray.push(loadArray)
	}
	return finalDataArray;
}

function AggregateDataByChosenPeriod(necessaryData, period,STA){//year, month, day, hour, minute - Date: YYYY-MM-DDTHH:MM:SSZ (already sorted by date)
	var n= necessaryData.length, aggregedData=[], samePeriodData=[], lastDate="",x; //aggregedData= [date, [values]]
	switch (period){
		case "year": 
			x=4;
		break;
		case "month": 
			x=7;
		break;
		case "day": 
			x=10;
		break;
		case "hour": 
			x=13;
		break;
		case "minute": 
			x=16;
		break;

	}
	var firstDataValue, lastDataValue, observationsArray=[];
	for (var i=0;i<n;i++){
				if (STA && i==0){
					firstDataValue=necessaryData[i][0];
					lastDataValue=necessaryData[i][0];
				}
				if (necessaryData[i][0].substr(0,x)==lastDate){
					samePeriodData.push(necessaryData[i][1]);
					if (STA)lastDataValue= necessaryData[i][0]; 
					if (i== n-1){
						aggregedData.push([lastDate,samePeriodData]);
						if (STA){
							observationsArray.push({
								"phenomenonTime": firstDataValue+"/"+lastDataValue,
								"resultTime": "",
								"result": [],
								"parameters":{
									"resultCount": samePeriodData.length
								}
							})
						}
					}
				}
				else{ //new date
					if (i!=0)aggregedData.push([lastDate,samePeriodData]); //load data from period before
					if (STA &&  i!=0){
						observationsArray.push({
							"phenomenonTime": firstDataValue+"/"+lastDataValue,
							"resultTime": "",
							"result": [],
							"parameters":{
								"resultCount": samePeriodData.length
							}

						})
						lastDataValue= necessaryData[i][0]; 
						firstDataValue= necessaryData[i][0];
					}
					lastDate= necessaryData[i][0].substr(0,x); //new date
					samePeriodData=[]; //restart
					samePeriodData.push(necessaryData[i][1]);
					if (i== n-1){
						aggregedData.push([lastDate,samePeriodData]);
					}
				}
		}
		console.log (aggregedData);
		console.log (observationsArray);
		if (STA) return [aggregedData,observationsArray]
		else return aggregedData;
}

function calculateMinMaxMeanDesvest(aggregatedData){

	var n= aggregatedData.length, statisticsArray=[];

	for (var i=0; i<n; i++){
		statisticsArray.push({"date":aggregatedData[i][0],"Min. value":aggrFuncMinValue(aggregatedData[i][1]),"Max. value":aggrFuncMaxValue(aggregatedData[i][1]),"Mean":aggrFuncMean(aggregatedData[i][1]),"Standard deviation":aggrFuncStandardDeviation(aggregatedData[i][1])});
	}
	return statisticsArray
}




function createAndLoadImportGeoJSONNode(data,url){
	
	addCircularImage(null, null, "GeoJSON", "ImportGeoJSON.png");

	currentNode = networkNodes.get(network.getSelectedNodes()[0]);
	document.getElementById("DialogImportGeoJSONSourceExternalData").disabled= false;
	document.getElementById("DialogImportGeoJSONSourceExternalData").checked= true;
	document.getElementById("DialogImportGeoJSONSourceExternalDataText").value= url;

	
	TransformTextGeoJSONToTable(data);	
}
function giveMeNetworkInformation(event) {
			if (event)
				event.preventDefault(); // We don't want to submit this form
			document.getElementById("DialogContextMenu").close();
			console.log(networkNodes.get());
}
