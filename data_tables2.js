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

/*
This library use two main types of data. In general, table functions expect 
these two objects as inputs and respond these as outputs.

"Data tables" (commonly referenced with the parameter 'data' or derivates) are 
an array of records, each on being an object of key and value pairs.
Normaly, the same keys are present in every record, but this is
not required. values are not restricted being numbers, strings or 
objects. See a json schema and examples in /schemas/data_*.json

"Data attributes" (commonly referenced with the parameter 'dataAttributes' 
or derivates), are an object. Every keys of the main object is an object 
that defines the 'type', 'description', 'definition', 'UoM', 'UoMSymbol' 
and 'UoMDefinition'. See a json schema and examples in /schemas/dataAttributes_*.json
*/



"use strict"

function getJSONType(a) {
	if (typeof a === "string")
		return "string";
	if (typeof a === "boolean")
		return "boolean";
	if (Array.isArray(a))
		return "array";
	if (a===null)
		return "null";
	if (typeof a === "object")
		return "object";
	if (typeof a === "undefined")
		return "undefined";
	if (Number.isInteger(a))
		return "integer";
	else 
		return "number";
}


function getDataAttributesSimple(data) {
	var dataAttributes = {}, dataAttribute, type;

	for (var i = 0; i < data.length; i++) {
		var keys = Object.keys(data[i]);
		for (var k = 0; k < keys.length; k++) {
			if (dataAttributes[keys[k]])
			{
				dataAttribute=dataAttributes[keys[k]];
					type=getJSONType(data[i][keys[k]]);
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
					}
			}
			else
			{
				dataAttributes[keys[k]]={
						type: getJSONType(data[i][keys[k]])
				};
			}
		}
	}
	return dataAttributes;
}

function createEmptyRecordData(dataAttributes) {
	var record={}, dataAttribute;
	var keys = Object.keys(dataAttributes);
	for (var k = 0; k < keys.length; k++) {
		dataAttribute=dataAttributes[keys[k]];
		if (typeof dataAttribute.type === "undefined") {
			record[keys[k]]="";
			continue;
		}
		switch (dataAttribute.type) {
			case "boolean":
				record[keys[k]]=false;
				break;
			case "array":
				record[keys[k]]=[];
				break;
			case "object":
				record[keys[k]]={};
				break;
			case "integer":
			case "number":
				record[keys[k]]=0;
				break;				 
			case "string": 
			case "anyURI":
				record[keys[k]]="";
				break; 
			case "isodatetime":
				record[keys[k]]="1970-01-01T00:00:00Z";
			case "geometry": 
				record[keys[k]]="";
				break; 
			case "null":
				record[keys[k]]=null;
				break; 
			//case "undefined":
		}
	}
	return record;
}

//Return the index on the sorted list array where the value exists. If it does not find ti it returns null.
//If there are repeated hits, it returns the first one
function binarySearch(list, value, fcompare, fparam) {
	var lo = 0, hi = list.length - 1, mid, comp;
	while (lo <= hi) {
		mid = Math.floor((lo+hi)/2);
		comp=fcompare(list[mid], value, fparam);
		if (comp>0)
			hi = mid - 1;
		else if (comp<0)
			lo = mid + 1;
		else
		{
			while (mid>0 && 0==fcompare(list[mid-1], value, fparam))  //looking for the first hit
				mid--;
			return mid;
		}
	}
	return null;
}

function compareRightTable(a, b, options) {
	for (var j=0; j<options.RowMatching.length; j++)
	{
		if (a[options.RowMatching[j].right]<b[options.RowMatching[j].right])
			return -1;
		if (a[options.RowMatching[j].right]>b[options.RowMatching[j].right])
			return 1;
	}
	return 0;
}

function deapCopy(o) {
	return JSON.parse(JSON.stringify(o));
}

//function removeFromArrayIfPresentInRecord(record, items, recordNamesArray, iLastName)
function removeFromArrayIfPresentInRecord(record, items)
{
	if (!record["@iot.selfLink"])
		return;

	for (var j = 0; j<items.length; j++) {
		if (typeof items[j] === "object" && items[j]!==null && !Array.isArray(items[j]) && items[j]["@iot.selfLink"]) {
			if (items[j]["@iot.selfLink"]==record["@iot.selfLink"]) {
				items.splice(j, 1);  //remove
				j--;
			}
		}
	}
}

//It works only with the last record in data
function SeparatePropDuplicateRecordArray(data, i, removeAlreadyPresent) {
	var record=data[i];
	var recordFieldNames = Object.keys(record);
	for (var k = 0; k < recordFieldNames.length; k++) {
		var property=record[recordFieldNames[k]];
		if (typeof property !== "object" || property===null)  //"arrays" and 'null' are also objects. 
			continue;
		if (Array.isArray(property)) {
			//Array: creating new records for the items further than one.
			if (removeAlreadyPresent) 
				removeFromArrayIfPresentInRecord(record, property);
				//removeFromArrayIfPresentInRecord(record, property, recordFieldNames, k);
			for (var j = 1; j<property.length; j++) {
				data.splice(i+j, 0, deapCopy(record));
				data[i+j][recordFieldNames[k]]=deapCopy(property[j]);
			}
			record[recordFieldNames[k]]=deapCopy(property[0]);
		}
		else {
			//Object; lets separate it.
			var subkeys = Object.keys(property);
			for (var kk = 0; kk < subkeys.length; kk++) {
				var name=recordFieldNames[k] + "/" + subkeys[kk];
				record[name] = property[subkeys[kk]];
				recordFieldNames.push(name);
			}
			delete record[recordFieldNames[k]]; 
			recordFieldNames.splice(k, 1);
		}
		k--;
	}
}

function SeparatePropertyIfNeeded(record, property, baseName, removeAlreadyPresent) {
	if (typeof property === "object" && property!==null) { //"arrays" and 'null' are also objects. 
		if (Array.isArray(property)) {
			//Array: creating multifields
			for (var j = 0; j<property.length; j++) {
				if (typeof property[j] === "object") {
					if (Array.isArray(property[j])) {
						if (removeAlreadyPresent) 
							removeFromArrayIfPresentInRecord(record, property[j]);
						for (var jj = 0; jj<property[j].length; jj++)
							SeparatePropertyIfNeeded(record, property[j][jj], baseName + "_" + j + "_" + jj, removeAlreadyPresent);
					} else {
						var subkeys = Object.keys(property[j]);
						for (var kk = 0; kk < subkeys.length; kk++)
							SeparatePropertyIfNeeded(record, property[j][subkeys[kk]], baseName + "/" + subkeys[kk] + "_" + j, removeAlreadyPresent)
					}
				} else
					record[baseName + "_" + j]=property[j];
			}
		}
		else {
			//Object; lets separate it.
			var subkeys = Object.keys(property);
			for (var kk = 0; kk < subkeys.length; kk++)
				SeparatePropertyIfNeeded(record, property[subkeys[kk]], baseName + "/" + subkeys[kk], removeAlreadyPresent)
		}
	}
	else
		record[baseName]=property;
}

function separateObjectColumns(data, dataAttributesNull, options) { //JSON
	var resultData=[], record, iResultData;
	var removeAlreadyPresent=options && options.removeAlreadyPresent ? options.removeAlreadyPresent : false

	for (var i = 0; i < data.length; i++) {
		record=data[i]
		if (options && options.arraysAsRecords) {
			resultData.push(deapCopy(record));
			iResultData=resultData.length-1;
			while(iResultData<resultData.length) {
				SeparatePropDuplicateRecordArray(resultData, iResultData, removeAlreadyPresent);
				iResultData++;
			}
		} else {
			resultData.push({});
			var keys = Object.keys(record);
			for (var k = 0; k < keys.length; k++)
				SeparatePropertyIfNeeded(resultData[resultData.length-1], record[keys[k]], keys[k], removeAlreadyPresent);
		}
	}
	var dataAttributes=getDataAttributes(resultData);
	var dataAttributesArray=Object.keys(dataAttributes);
	var resultDataAttributes={};
	for (var i = 0; i < dataAttributesArray.length; i++)
		resultDataAttributes[dataAttributesArray[i]]=deapCopy( (dataAttributesNull && dataAttributesNull[dataAttributesArray[i]]) ? dataAttributesNull[dataAttributesArray[i]] : dataAttributes[dataAttributesArray[i]]);
	return {data: resultData, dataAttributes: resultDataAttributes};
}

function separateColumnArrayColumns(data, dataAttributes, columnName, delimiter) {
	var n=data.length, separateDataArray, resultData, resultDataAttributes;

	if (dataAttributes[columnName].type!="string"){
		alert("The content of column selected to separate must be 'string' type");
		return;
	}

	resultData=[];
	for (var i=0; i<n; i++) {
		resultData[i]=deapCopy(data[i]);
		if (!data[i][columnName] || typeof data[i][columnName] !== "string") 
			continue;
		delete resultData[i][columnName];
		separateDataArray=data[i][columnName].split(delimiter);
		for (var a=0; a<separateDataArray.length; a++) 
			resultData[i][columnName+(a+1)]=separateDataArray[a].trim();
	}
	resultDataAttributes=uploadDataAttributesAddingNewColumns(dataAttributes, resultData);

	return {data: resultData, dataAttributes: resultDataAttributes};
}

function separateColumnArrayRecords(data, dataAttributes, columnName, delimiter) {
	var n= data.length, resultData=[], separateDataArray;  //, newColumnName;

	if (dataAttributes[columnName].type!="string") {
		alert("The content of column selected to separate must be 'string' type");
		return;
	}
	for (var i=0;i<n;i++) {
		if (!data[i][columnName] || typeof data[i][columnName] !== "string") 
			continue;
		separateDataArray=data[i][columnName].split(delimiter);
		for (var e=0; e<separateDataArray.length; e++) {
			resultData.push(deapCopy(data[i]))
			resultData[resultData.length-1][columnName]=separateDataArray[e].trim();
		}
	}
	var resultDataAttributes=deapCopy(dataAttributes);
	resultDataAttributes[columnName].type=getDataAttributeType(resultData, columnName);
	return {data: resultData, dataAttributes: resultDataAttributes};
}

//options={RowMatching: [{left: "", right: ""}], NotMatch: "LeftTable"}
function JoinTablesData(dataLeft, dataRight, dataLeftAttributesNull, dataRightAttributesNull, dataCurrentAttributes, options) {
	//Define the dataCurrentAttributes based on the dataLeftAttributes, dataRightAttributes
	var dataLeftAttributes=dataLeftAttributesNull ? dataLeftAttributesNull : getDataAttributesSimple(dataLeft);
	var dataRightAttributes=dataRightAttributesNull ? dataRightAttributesNull : getDataAttributesSimple(dataRight);
	var dataLeftAttributesArray = Object.keys(dataLeftAttributes);
	var dataRightAttributesArray = Object.keys(dataRightAttributes);
	var dataRightNameInJoin=[], dataCurrent=[];
	
	for (var i=0; i<dataLeftAttributesArray.length; i++) {
		dataCurrentAttributes[dataLeftAttributesArray[i]]=deapCopy(dataLeftAttributes[dataLeftAttributesArray[i]]);
	}
	for (var i=0; i<dataRightAttributesArray.length; i++) {
		for (var j=0; j<options.RowMatching.length; j++)
			if (dataRightAttributesArray[i]==options.RowMatching[j].right)
				break; 
		if (j<options.RowMatching.length) {
			dataRightNameInJoin[i]==null;
			continue; //This should be not included as it is already there.
		}
		for (var j=0; j<dataLeftAttributesArray.length; j++) {
			if (dataLeftAttributesArray==dataRightAttributesArray) {
				//Change the name
				dataRightNameInJoin[i]=dataRightAttributesArray+"_"+Math.floor(Math.random() * 100000);
				dataCurrentAttributes[dataRightNameInJoin[i]]=deapCopy(dataRightAttributes[dataRightAttributesArray[i]]);
				break;
			}
		}
		if (j<dataLeftAttributesArray.length) //Already done
			continue;
		//Add
		dataRightNameInJoin[i]=dataRightAttributesArray[i];
		dataCurrentAttributes[dataRightNameInJoin[i]]=deapCopy(dataRightAttributes[dataRightAttributesArray[i]]);
	}
			
	var dataCurrentAttributesArray = Object.keys(dataCurrentAttributes);
	
	//Sort a duplicate of the second tabla by the matching criteria.
	var dataRightSorted=deapCopy(dataRight);
	dataRightSorted.sort(function (a, b) {
		for (var j=0; j<options.RowMatching.length; j++) {
			if (a[options.RowMatching[j].right]<b[options.RowMatching[j].right])
				return -1;
			if (a[options.RowMatching[j].right]>b[options.RowMatching[j].right])
				return 1;
		}
		return 0;});

	if (options.NotMatch=="BothTables") {
		//create a list of future matching not-matching records
		var matchRightRecord=[];
		for (var i=0; i<dataRightAttributesArray.length; i++) {
			matchRightRecord.push(false);
		}
	}
	//Based on the left table look in the right table and populate the result
	var recordRight={}, iRight;
	dataCurrent.length=0;
	for (var j=0; j<dataLeft.length; j++) {
		for (var i=0; i<options.RowMatching.length; i++)
			recordRight[options.RowMatching[i].right]=dataLeft[j][options.RowMatching[i].left];
		iRight=binarySearch(dataRightSorted, recordRight, compareRightTable, options);
		
		if (options.NotMatch=="LeftTable" || options.NotMatch=="BothTables" || iRight!=null) {
			dataCurrent.push(deapCopy(dataLeft[j]));
			if (iRight!=null) {
				while (true)
				{
					if (options.NotMatch=="BothTables")
						matchRightRecord[iRight]=true;
					for (var i=0; i<dataRightAttributesArray.length; i++) {
						if (dataRightNameInJoin[i]!=null)
							dataCurrent[dataCurrent.length-1][dataRightNameInJoin[i]]=dataRightSorted[iRight][dataRightAttributesArray[i]];
					}
					if (iRight+1==dataRightSorted.length || 0!=compareRightTable(dataRightSorted[iRight+1], recordRight, options))  //Are more repeated hits not there?
						break;
					dataCurrent.push(deapCopy(dataLeft[j]));
					iRight++;
				}
			}
		}
	}
	if (options.NotMatch=="BothTables") {
		//Add the records on the second table that never matched
		for (var j=0; j<dataRightSorted.length; j++) {
			if (!matchRightRecord[j]) {
				dataCurrent.push({});
				for (var i=0; i<dataRightAttributesArray.length; i++) {
					if (dataRightNameInJoin[i]!=null)
						dataCurrent[dataCurrent.length-1][dataRightNameInJoin[i]]=dataRightSorted[j][dataRightAttributesArray[i]];
				}
			}
		}
	}
	return dataCurrent;
}


function GroupRecordsData(dataSorted, i_ini, i_end, dataAttributesArray, groupByParams) {
	var record={}, recordSorted=dataSorted[i_ini], aggrFuncName, valuesString=null, values=null, r, countDefined=-1;
	//Populate groupByAttr
	//if (date) groupByParams.groupByAttr.push(groupByParams.groupByDate[1]) //Add date attribute
	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.groupByAttr.indexOf(dataAttributesArray[j])!=-1)
			record[dataAttributesArray[j]]=recordSorted[dataAttributesArray[j]];
	}
	
	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.aggregationAttr[dataAttributesArray[j]]) {
			for (var k=0; k<groupByParams.aggregationAttr[dataAttributesArray[j]].length; k++) {
				//Calculate the aggregations
				//Populate the aggregated columns
				aggrFuncName=groupByParams.aggregationAttr[dataAttributesArray[j]][k];
				if (aggrFuncName=="Count")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=i_end-i_ini+1;
				else if (aggrFuncName=="FirstValue")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=dataSorted[i_ini][dataAttributesArray[j]];
				else if (aggrFuncName=="LastValue")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=dataSorted[i_end][dataAttributesArray[j]];
				else if (aggrFuncName=="RandomValue")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=dataSorted[Math.floor(Math.random()*(i_end-i_ini+1)+i_ini)][dataAttributesArray[j]];
				else if (aggrFuncName=="CountDefined" || aggrFuncName=="ProportionDefined") {
					if (countDefined==-1) {
						countDefined=0;
						for (var i=i_ini; i<=i_end; i++){
							if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null || dataSorted[i][dataAttributesArray[j]]==="")
								continue;
							countDefined++;
						}
					}
					if (aggrFuncName=="CountDefined")
						record[dataAttributesArray[j]+"_"+aggrFuncName]=countDefined;
					else if (aggrFuncName=="ProportionDefined")
						record[dataAttributesArray[j]+"_"+aggrFuncName]=countDefined/(i_end-i_ini+1)*100;
				}
				else {
					if (aggrFuncName=="Concatenate") {
						r="";
						for (var i=i_ini; i<=i_end; i++){
							if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null)
								continue;
							r+=dataSorted[i][dataAttributesArray[j]] + " ";
						}
						record[dataAttributesArray[j]+"_"+aggrFuncName]=r.slice(0, -1);  //remove last space;
						continue;
					}
					if  (aggrFuncName=="Mode" || aggrFuncName=="Median" || aggrFuncName=="Q1" || aggrFuncName=="Q3") {
						if (valuesString==null) {
							valuesString=[];
							for (var i=i_ini; i<=i_end; i++){
								if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null)
									continue;
								valuesString.push(dataSorted[i][dataAttributesArray[j]]);
							}
						}
						if (valuesString.length==0 || !window["aggrFunc"+aggrFuncName])
							continue;
						record[dataAttributesArray[j]+"_"+aggrFuncName]=window["aggrFunc"+aggrFuncName](valuesString);
					} else {
						if (values==null) {
							values=[];
							for (var i=i_ini; i<=i_end; i++){
								if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null || dataSorted[i][dataAttributesArray[j]]==="")
									continue;
								else if (typeof dataSorted[i][dataAttributesArray[j]] === 'string'){
									r=parseFloat(dataSorted[i][dataAttributesArray[j]]);
									if (Number.isNaN(r))
										continue;
									values.push(r);
								}
								else
									values.push(dataSorted[i][dataAttributesArray[j]]);
							}
						}
						if (values.length==0 || !window["aggrFunc"+aggrFuncName])
							continue;
						record[dataAttributesArray[j]+"_"+aggrFuncName]=window["aggrFunc"+aggrFuncName](values);
					}
				}
			}
		}
	}
	return record;
}

/*var groupByParams={groupByAttr: [],   //Array of column names that should have the same value to group
		groupByDate:"",         //Rounding for the date fields
		aggregationAttr:{}};    //column names and the aggregation method
*/
function GroupByTableData(data, dataAttributesNull, dataCurrentAttributes, groupByParams) {
	var dataAttributes=dataAttributesNull ? dataAttributesNull : getDataAttributesSimple(data);
	var dataAttributesArray = Object.keys(dataAttributes);
	var s, record;
	
	/*Structure of the table: 
		-the grouping collumns
		-columns the statistics of the first aggregation collumn
		-columns the statistics of the second aggregation collumn
		-...
		-tempory collumn with an order (it will be removed before returning).
		Note: that the collumns order of the definion of groupByParams has no influence the order of the output that is determined by the order or the original table.
	*/

	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.groupByAttr.indexOf(dataAttributesArray[j])!=-1)
			dataCurrentAttributes[dataAttributesArray[j]]=deapCopy(dataAttributes[dataAttributesArray[j]]);  //list of attributes to groupBy 
	}
	if (groupByParams.groupByDate.length!=0)dataCurrentAttributes[groupByParams.groupByDate[1]]=deapCopy(dataAttributes[groupByParams.groupByDate[1]]); //Date attribute

	if(groupByParams.groupByDate.length!=0){
		var x;
		switch (groupByParams.groupByDate[0].toLowerCase()){
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
	}

	for (var j=0; j<dataAttributesArray.length; j++) { //createColumnsNames
		if (groupByParams.aggregationAttr[dataAttributesArray[j]]) {
			for (var k=0; k<groupByParams.aggregationAttr[dataAttributesArray[j]].length; k++) {
				s=dataAttributesArray[j]+"_"+groupByParams.aggregationAttr[dataAttributesArray[j]][k]; //create column Name
				dataCurrentAttributes[s]=deapCopy(dataAttributes[dataAttributesArray[j]]);
				//Modify the Attribute description accordingly. 
			}
		}
	}

	//Duplicate the table. Any field that is not grouping of aggregating is removed at this stage
	var dataSorted=[], recordSorted;
	//Add a data index column to ensure that the order of the groups is not altered
	for (var i=0; i<data.length; i++) { 
		record=data[i];
		recordSorted={};
		for (var j=0; j<dataAttributesArray.length; j++) {
			if (groupByParams.groupByAttr.indexOf(dataAttributesArray[j])!=-1){
				recordSorted[dataAttributesArray[j]]=record[dataAttributesArray[j]];
				continue; // this is necessary to avoid adding this field twice if it is asoo in the aggregationAttr.
			}
			if (groupByParams.aggregationAttr[dataAttributesArray[j]])
				recordSorted[dataAttributesArray[j]]=record[dataAttributesArray[j]];

			if (groupByParams.groupByDate[1]) //Column for date
				recordSorted[groupByParams.groupByDate[1]]=record[groupByParams.groupByDate[1]].substr(0,x); //part of the date to group

		}
		recordSorted["$$order$$"]=i;
		dataSorted.push(recordSorted);
	}

	//Sort the data by groupByAttr 
	var arrayToSort= groupByParams.groupByAttr.concat(groupByParams.groupByDate[1])
	var sortRecords=function (a, b) {  
		for (var j=0; j<arrayToSort.length; j++) {
			
			if (a[arrayToSort[j]]<b[arrayToSort[j]])
				return -1;
			if (a[arrayToSort[j]]>b[arrayToSort[j]])
				return 1;
		}
		return 0;
	}

	dataSorted.sort(function (a, b) { 
		var r=sortRecords(a, b);
		if (r!=0)
			return r;
		if (a["$$order$$"]<b["$$order$$"])
			return -1;
		if (a["$$order$$"]>b["$$order$$"])
			return 1;
		return 0;  //Not posible in this case
	});

	//Populate the output data
	var dataCurrent=[], i_ini=0, iniRecord;
	for (var i=1; i<dataSorted.length; i++) {
		iniRecord=dataSorted[i_ini];
		if (0!=sortRecords(iniRecord, dataSorted[i])){ 
			//records i_ini to i-1 are grouped			
			dataCurrent.push(GroupRecordsData(dataSorted, i_ini, i-1, dataAttributesArray, groupByParams));  //Add the record to the result
			i_ini=i;
		}
	}
	dataCurrent.push(GroupRecordsData(dataSorted, i_ini, i-1, dataAttributesArray, groupByParams,true));  //Add the record to the result
	return dataCurrent;
}

function GetHTMLdataAttribute(dataAttributeName, dataAttribute) {
	var cdns=[];
	if (dataAttribute.definition)
		cdns.push("<a href='", dataAttribute.definition, "' target='_blank'>");
	cdns.push(dataAttributeName);
	if (dataAttribute.definition)
		cdns.push("</a>");
	if (dataAttribute.UoM || dataAttribute.UoMSymbol)
	{
		cdns.push(" (");
		if (dataAttribute.UoMDefinition)
			cdns.push("<a href='", dataAttribute.UoMDefinition, "' target='_blank'>");
		cdns.push(dataAttribute.UoMSymbol ? dataAttribute.UoMSymbol : dataAttribute.UoM);
		if (dataAttribute.UoMDefinition)
			cdns.push("</a>");
		cdns.push(")");
	}
	return cdns.join("");
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
		case "geometry":
			cdns.push('Tan');
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
		case "geometry":
			cdns.push('G');
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

//rowNumbers: Show row numbers as first collumn
//prefix_selectedEntityId, in the radio buttons to select use prefix_selectedEntityId+i as an identifier, 
//selectedEntityId index of the selected radio button, 
//f_onclickselectEntity: on click function for the radio buttons
//onclickselectEntityParam: on click function for the radio buttons parameter (it is an string)
//f_isAttributeAnyURI: function to determine if an attribute is a URI
//isAttributeAnyURIParam; extra param for function to determine if an attribute is a URI
//f_onclickInsteadOfLink: on click function that will govern the reaction to a click on a link
//onclickInsteadOfLinkParam: extra param for the on click function that will govern the reaction to a click on a link
//f_isAttributeClickInsteadOfLink, function to determine if this link should use f_onclickInsteadOfLink
//isAttributeClickInsteadOfLinkParam: extra param function to determine if this link should use f_onclickInsteadOfLink
//f_attributeToHide: function to determine if an attribute should be hidden in the view
function getHTMLTable(data, dataAttributesInput, 
		rowNumbers, 
		prefix_selectedEntityId, selectedEntityId, f_onclickselectEntity, onclickselectEntityParam, 
		f_isAttributeAnyURI, isAttributeAnyURIParam,
		f_onclickInsteadOfLink, onclickInsteadOfLinkParam, f_isAttributeClickInsteadOfLink, isAttributeClickInsteadOfLinkParam,
		f_attributeToHide) {
	var dataAttributes = dataAttributesInput ? dataAttributesInput : getDataAttributesSimple(data); 
	var cdns=[], needhref=[], needOnClick=[], record, cell, dataAttribute;
	var dataAttributesArray = Object.keys(dataAttributes);

	cdns.push("<table class='tablesmall'><tr>");
	if (rowNumbers)
		cdns.push("<th></th>");
	if (selectedEntityId!==null && typeof selectedEntityId!=="undefined")
		cdns.push("<th></th>");
	for (var a = 0; a < dataAttributesArray.length; a++) {
		if (f_attributeToHide && f_attributeToHide(dataAttributesArray[a]))
			continue;
		cdns.push("<th>",
			GetHTMLdataAttribute(dataAttributesArray[a], dataAttributes[dataAttributesArray[a]]),
			" ",
			getHTMLCharacterAttributeType(dataAttributes[dataAttributesArray[a]].type),
			"</th>");
		if (f_isAttributeAnyURI)
			needhref[a]=f_isAttributeAnyURI(dataAttributesArray[a], isAttributeAnyURIParam);
		if (f_isAttributeClickInsteadOfLink)
			needOnClick[a]=f_isAttributeClickInsteadOfLink(dataAttributesArray[a], isAttributeAnyURIParam);
	}

	cdns.push("</tr>");
	for (var i = 0; i < data.length; i++) {
		record=data[i];
		cdns.push("<tr>");
		if (rowNumbers)
			cdns.push("<td align='right'>", i + 1, "</td>");
		if (selectedEntityId!==null && typeof selectedEntityId!=="undefined")
		{
			var s=record["@iot.id"] ? record["@iot.id"] : i;
			cdns.push("<td><input type='radio' name='SelectRowRadio' id='", prefix_selectedEntityId, s, "' ", f_onclickselectEntity ? "onClick='" + f_onclickselectEntity.name + "(\"" + onclickselectEntityParam+ "\");' " : "", s == selectedEntityId ? "checked='checked'" : "", "/></td>");
		}
		for (var a = 0; a < dataAttributesArray.length; a++) {
			if (f_attributeToHide && f_attributeToHide(dataAttributesArray[a]))
				continue;
			cell=record[dataAttributesArray[a]];
			cdns.push((dataAttributes[dataAttributesArray[a]].type=="number" || dataAttributes[dataAttributesArray[a]].type=="integer") ? "<td align='right'>" :  "<td>");
			if (typeof cell !== "undefined" && cell!=null) {
				if ((needhref[a] || (f_onclickInsteadOfLink && needOnClick[a])) && cell.length)
					cdns.push("<a href='", (f_onclickInsteadOfLink && needOnClick[a]) ? "javascript:void();" : cell.replaceAll("'", "%27"), "' target='_blank'", ((f_onclickInsteadOfLink && needOnClick[a]) ? " onClick='return " + f_onclickInsteadOfLink.name + "(\"" + onclickInsteadOfLinkParam + "\", \"" + dataAttributesArray[a] + "\", " + i +");'" : ""), ">", cell, "</a>");
				else if (typeof cell === "object")
					cdns.push(JSON.stringify(cell));
				else
					cdns.push(cell);
			}
			cdns.push("</td>");
		}
		cdns.push("</tr>");
	}
	cdns.push("</table>");
	return cdns.join("");
}

function addNewEmptyColumn(data,columnName){
	for (var i=0;i<data.length;i++){
		data[i][columnName]="";
	}
	//return data;  //No need to return this (data is passed by reference and modified)
}

function addNewColumnWithUniqueValue(data, columnName, uniqueValue){
	for (var i=0;i<data.length;i++){
		data[i][columnName]=uniqueValue;
	}
	//return data;
}
function addNewColumnWithAutoincrementalValues(data,columnName,firstValue){

	for (var i=0;i<data.length;i++){
		data[i][columnName]=parseInt(firstValue)+i;
	}
	//return data;
}

function addnewColumnSummingColumns(data, columnName,columnsToSum, decimalNumber){
	var sum,n=columnsToSum.length; 
	for (var i=0;i<data.length;i++){
		sum=0;
		for (var a=0;a<n;a++){
			if (typeof data[i][columnsToSum[a]] =="string"){
				sum+=parseFloat(data[i][columnsToSum[a]]);
			}else{
				sum+= data[i][columnsToSum[a]]; 
			}
		}
		
		if (decimalNumber){
			data[i][columnName]= sum.toFixed(decimalNumber);
		}else{
			data[i][columnName]= sum;
		}
	}
}

function addnewColumnMultiplyingColumns(data, columnName,columnsToMult, decimalNumber){
	var product,n=data.length, c=columnsToMult.length; 
	//numWithComa, value, product;
	for (var i=0;i<n;i++){
		
		for (var a=0;a<c;a++){
			if (typeof data[i][columnsToMult[a]] =="string"){
				if (a==0){
					product=parseFloat(data[i][columnsToMult[a]]);
				}else{
					product=product*parseFloat(data[i][columnsToMult[a]]);
				}
			 
			}else{
				if (a==0){
					product=data[i][columnsToMult[a]];
				}else{
					product=product* data[i][columnsToMult[a]]; //Tal com agafa el CSV mai passarà per aquí perque sempre és STRING


				}

			}
		}
		
		if (decimalNumber){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(product);
			}
			data[i][columnName]= product.toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= product;
		}
	}
}

function addnewColumnMinimalValue(data, columnName,columnsToEvaluate, decimalNumber){
	var values,min;
	for (var i=0;i<data.length;i++){
		values=[];
		for (var a=0;a<columnsToEvaluate.length;a++){
			values.push(data[i][columnsToEvaluate[a]]);
		}
		min=aggrFuncMinValue(values); //Use function to be able to evaluate many columns
		if (decimalNumber){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(min);
			}
			data[i][columnName]= min.toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= min;
		}
		
	}
}

function addnewColumnMaximalValue(data, columnName,columnsToEvaluate, decimalNumber){
	var values,max;
	for (var i=0;i<data.length;i++){
		values=[];
		for (var a=0;a<columnsToEvaluate.length;a++){
			values.push(data[i][columnsToEvaluate[a]]);
		}
		max=aggrFuncMaxValue(values); //Use function to be able to evaluate many columns
		if (decimalNumber){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(max);
			}
			data[i][columnName]= max.toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= max;
		}

	}
}

function addnewColumnMeanValue(data, columnName,columnsToEvaluate, decimalNumber){
	var values,mean;
	for (var i=0;i<data.length;i++){
		values=[];
		for (var a=0;a<columnsToEvaluate.length;a++){
			values.push(data[i][columnsToEvaluate[a]]);
		}
		mean=aggrFuncMean(values); //Use function to be able to evaluate many columns
		if (decimalNumber){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(mean);
			}
			data[i][columnName]= mean.toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= mean;
		}

	}
}

function addnewColumnVarianceValue(data, columnName,columnsToEvaluate, decimalNumber) {
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncVariance, decimalNumber);
}

function addnewColumnMedianValue(data, columnName,columnsToEvaluate, decimalNumber) {
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncMedian, decimalNumber);
}

function addnewColumnAggr(data, columnName, columnsToEvaluate, aggrFunc, decimalNumber) {
	var values, aggr;
	for (var i=0; i<data.length; i++){
		values=[];
		for (var a=0;a<columnsToEvaluate.length;a++){
			values.push(data[i][columnsToEvaluate[a]]);
		}
		aggr=aggrFunc(values); //Use function to be able to evaluate many columns
		if (decimalNumber && decimalNumber!=""){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(aggr);
			}
			data[i][columnName]= aggr.toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= aggr;
		}
	}
}

function addnewColumnConcatenatingValues (data, columnName,columnsToEvaluate){ //Not numbers
	var values,concatenated;
	for (var i=0; i<data.length; i++){
		values=[];
		for (var a=0; a<columnsToEvaluate.length; a++){
			values.push(data[i][columnsToEvaluate[a]]);
		}
		concatenated=aggrFuncConcatenate(values); //Use function to be able to evaluate many columns

		data[i][columnName]= concatenated;
	}
}

function addnewColumnModeValue(data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncMode, decimalNumber); //aggrFuncMode (one mode), for array aggrFuncModes
}

function addnewColumnFirstValue (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncFirstValue, decimalNumber); 
}
function addnewColumnStandardDeviationValue (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncStandardDeviation, decimalNumber); 
}
function addnewColumnLastValue (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncLastValue, decimalNumber); 
}
function addnewColumnQ1Value (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncQ1, decimalNumber); 
}
function addnewColumnQ3Value (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncQ3, decimalNumber); 
}
function addnewColumnRandomValue (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncRandomValue, decimalNumber); 
}
function addnewColumnCount (data, columnName,columnsToEvaluate){ //TE SENTIT?
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncCount); 
}
function addnewColumnRandomValue (data, columnName,columnsToEvaluate, decimalNumber){
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncRandomValue, decimalNumber); 
}
function addnewColumnCountDefined (data, columnName,columnsToEvaluate){ //No està feta la funció
	//return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncCountDefined); 
}
function addnewColumnRange (data, columnName,columnsToEvaluate){ //No està feta la funció
	return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncRange); 
}
function addnewColumnProportionDefined (data, columnName,columnsToEvaluate){ //No està feta la funció
	//return addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncProportionDefined); 
}
function addnewColumnWithFormula (data, columnName,formula,decimalNumber){ 
	var formulaWithValues;
	var dataKeys= Object.keys(data[0]);
	var n=data.length, m=dataKeys.length;
	for (var i=0; i<n; i++){
		formulaWithValues=formula;//Restore the original formula sentence to be changed with other data 
		for (var a=0;a<m;a++){
			formulaWithValues = formulaWithValues.replaceAll(dataKeys[a], data[i][dataKeys[a]]);
		}
		if (typeof decimalNumber !=="undefined"& decimalNumber!=""){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(eval(formulaWithValues));
			}
			data[i][columnName]= eval(formulaWithValues).toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= eval(formulaWithValues);
		}
		
	}
}

function sortDates(data, columnToSort) { //columnToSort only if is an object. If it is an array without columnToSort
	if (columnToSort) { //object
		data.sort(function (a, b) {
			if (a[columnToSort] > b[columnToSort] ) {
				return 1;
			}
			if (a[columnToSort]  < b[columnToSort] ) {
				return -1;
			}

			return 0;
		})
	} else { //array
		data.sort(function (a, b) {
			if (a > b) {
				return 1;
			}
			if (a < b) {
				return -1;
			}
			return 0;
		})
	}
	return data
}


function sortValuesNumbersOrText(arrayValues) {
	var arrayNumbers = [], n=arrayValues.length;
	var arrayText = [], v;
	
	for (var i=0; i<n; i++) { //Separate numbers and text
		v=arrayValues[i];
		if (typeof v === "undefined" || v==null || v=="")
			continue;
		if (isNaN(Number(v))) 
			arrayText.push(v);
		else		
			arrayNumbers.push(v);
	}
	return arrayNumbers.sort((a, b) => a - b).concat(arrayText.sort());  //join arrays
}

/* 
'data' is the data to be sorted. This input is modified.
'columnsSelected' is a list of column names
'AscOrDesc' can be "asc" or "desc" and applies for all columns (what is questionable and might change in the future.
*/
function SortTableByColumns(data, columnsSelected, AscOrDesc) { 
	var column;	
	if (AscOrDesc && AscOrDesc == "asc") {
			data.sort(function (a, b) {
				for (var i=0;i<columnsSelected.length;i++){
					column= columnsSelected[i];
					if (a[column] > b[column]) {
						return 1;
					}
					if (a[column] < b[column]) {
						return -1;
					}
				}
				return 0;
			})
		} else {
			data.sort(function (a, b) {
				for (var i=0;i<columnsSelected.length;i++){
					column= columnsSelected[i];
					if (a[column] < b[column]) {
						return 1;
					}
					if (a[column] > b[column]) {
						return -1;
					}
				}
				return 0;
			})
		}
	return data;
}

//Marta, please describe the inputs and outputs and what the function does.
function buildPivotTable(data, rows, columns, values, aggregation){
	var allowedKey=false;
	for (var i=0;i<AggregationsOptions.length;i++){ //To check if it is an aggregation type allowed
		if (AggregationsOptions[i].name==aggregation) {
			allowedKey=true;
			break;
		}
	}
	var applyFunction=true;
	for (var i=0;i< rows.length;i++){
 			if (columns.includes(rows[i])){
				applyFunction=false;
				break;
			}
	}
	if (applyFunction==false) return "Error: Attributes betwen columns and rows can't be repited "
	else if (!values || values.length==0) return "Error:It is necessary to send values";
	else if((!columns|| columns.length==0) && (!rows|| rows.length==0 )) return "Error: It is necessary to send columns or rows";
	else if(!aggregation ||allowedKey==false ) return "Error: It is necessary to send an allowed aggfregation type";
 	else{

		var newdataArray=[], newOject, rowName="", rowsValue,columnName, arrayAllColumns=[];
		//rowsName with or withoutrows
		if (rows.length>1){
			for (var r=0;r<rows.length;r++){
				if(r!=0)rowName+="_";
				rowName+=rows[r];
			}
		}else if (rows.length==1){
			rowName=rows[0];
		}else{
			rowName="aggregation"
		}

		//Reorganize data to groupBy and join 
		for (var d=0;d<data.length;d++){
			newOject={};
			rowsValue="";
			columnName="";
			if (rows.length!=0){  //rows with or without columns
				for (var r=0;r<rows.length;r++){
					if(r!=0)rowsValue+="_";
					rowsValue+=data[d][rows[r]];
				}
				newOject[rowName]=rowsValue;

				if (columns.length!=0){ //with columns
					for (var c=0;c<columns.length;c++){
						if(c!=0)columnName+="_";
						columnName+=data[d][columns[c]];
					}
					for (var v=0;v<values.length;v++){
						if (!arrayAllColumns.includes(columnName+"_"+values[v]))arrayAllColumns.push(columnName+"_"+values[v]);
						newOject[columnName+"_"+values[v]]=data[d][values[v]];
					}
					newdataArray.push(newOject);
					
				}else if (values.length!=0 ){ //Without columns (Use values to build columns names)
					var columnsAsValues=[];
					for (var v=0;v<values.length;v++){
						columnsAsValues.push(values[v]);
						newOject[values[v]]=data[d][values[v]];
					}
					newdataArray.push(newOject);
				}
				
			}else{ //Without rows
				if (columns.length!=0){ 
					for (var c=0;c<columns.length;c++){
						if(c!=0)columnName+="_";
						columnName+=data[d][columns[c]];	
					}
					if (!arrayAllColumns.includes(columnName))arrayAllColumns.push(columnName);
					for (var v=0;v<values.length;v++){ //values as rows names
						newOject={}
						newOject.aggregation=values[v];
						newOject[columnName]=data[d][values[v]];
						newdataArray.push(newOject);
					}
				}
			}

		}

		//add all columns to all objects
		if (columns.length!=0){
			for (var n=0;n<newdataArray.length;n++){
				for (var c = 0;c<arrayAllColumns.length;c++){
					if (!newdataArray[n].hasOwnProperty(arrayAllColumns[c])){
						newdataArray[n][arrayAllColumns[c]]=undefined;
					}
				}
			}
		}

		//GroupingBy all columns to unify repetitions 
		var attributes= getDataAttributesSimple(newdataArray);
		var finalArrayObjects;
		if (columns.length==0){ //WithOunt columns
			arrayAllColumns=columnsAsValues;
		}
		var groupByParams, attr, options,newData,aggregationAttr={};
		for (var c = 0;c<arrayAllColumns.length;c++){
			attr=arrayAllColumns[c];
			aggregationAttr={}
			aggregationAttr[attr]=[aggregation];
			groupByParams={};
			groupByParams={
				aggregationAttr: aggregationAttr,
				groupByAttr: [rowName],
				groupByDate:[]
			}
			if (c==0)finalArrayObjects=GroupByTableData(newdataArray, attributes, {}, groupByParams);
			else{
				newData=GroupByTableData(newdataArray, attributes, {}, groupByParams);
				options={NotMatch: "BothTables",RowMatching:[{left: rowName, right: rowName}]};
				finalArrayObjects=JoinTablesData(finalArrayObjects,newData,getDataAttributesSimple(finalArrayObjects),getDataAttributesSimple(newData),{},options)
			}
				
		}

		//add all columns again, because GroupByTableData can "erase" some columns in some objects 
		
		for (var a =0;a<arrayAllColumns.length;a++){ //add new Parameter added by GroupBy
			arrayAllColumns[a]=arrayAllColumns[a]+"_"+aggregation;
		}

		for (var n=0;n<finalArrayObjects.length;n++){
			for (var c = 0;c<arrayAllColumns.length;c++){
				if (!finalArrayObjects[n].hasOwnProperty(arrayAllColumns[c])){
					finalArrayObjects[n][arrayAllColumns[c]]=undefined;
				}
			}
		}

		//console.log(finalArrayObjects);
		return finalArrayObjects;
 	}		
}

function ReplaceTextInTable(data, dataAttributes, searchValue, replaceValue, numbersAsText, datesAsText, column) {
	var dataLenght=data.length;
	var attributes=(dataAttributes)?dataAttributes:getDataAttributesSimple(data);
	var textToCompare;

	if (column) {
			for (var i=0;i<dataLenght;i++){
				if (attributes[column].type=="string" || attributes[column].type== "anyURI" ){
					if (data[i][column].includes(searchValue))data[i][column]=data[i][column].replaceAll(searchValue,replaceValue);
				}else if (attributes[column].type=="number" || attributes[column].type=="integer"){ //integer: ni NaN ni decimal
					if (numbersAsText){
						textToCompare=data[i][column].toString();
						if (textToCompare!= null && textToCompare!=undefined){
							if (textToCompare.includes(searchValue)){
								textToCompare=textToCompare.replaceAll (searchValue, replaceValue);
								if (!isNaN(textToCompare)){ //result number
									if (attributes[column].type=="integer")data[i][column] =parseInt(textToCompare);
									else data[i][column] =parseFloat(textToCompare);
								}else{ //result:string
									data[i][column]=textToCompare;
								}
								
							}
						}
					}else{
						if (attributes[column].type=="number" ){
							if (data[i][column] ==parseFloat(searchValue)) data[i][column] = parseFloat(replaceValue);
						}else{ //integer
							if (data[i][column] ==parseInt(searchValue)) data[i][column] = parseInt(replaceValue);
						}
					}
				}else if (dataAttributes &&  attributes[column].type=="isodatetime"){
					if (datesAsText){ // No validation of the final result will be performed,  since it just returns a text!!
						textToCompare=data[i][column].toString();
						if (textToCompare.includes(searchValue)){	
							data[i][column]=textToCompare.replaceAll (searchValue, replaceValue);
						}
					}else{ //evaluate all result
						var searchalueDate= new Date(searchValue);
						var replaceValueDate=new Date(replaceValue);
						if (!isNaN(searchalueDate.getTime()) && !isNaN(replaceValueDate.getTime())) {
							if (data[i][column] ==searchValue) data[i][column] = replaceValue;
						}else{
							return "The values introduced are not dates; replacement will not be possible."
						}					
					}
					
				}
				
			}
	} else {
		var attributesAsKeys=Object.keys(attributes);
		for (var i=0;i<dataLenght;i++){
			for (var e=0;e<attributesAsKeys.length;e++){
				column=attributesAsKeys[e];
				if (attributes[column].type=="string" || attributes[column].type== "anyURI" ){
					if (data[i][column].includes(searchValue))data[i][column]=data[i][column].replaceAll(searchValue,replaceValue);
				}else if (attributes[column].type=="number" || attributes[column].type=="integer"){ //integer: ni NaN ni decimal
					if (numbersAsText){
						textToCompare=data[i][column].toString();
						if (textToCompare!= null && textToCompare!=undefined){
							if (textToCompare.includes(searchValue)){
								textToCompare=textToCompare.replaceAll (searchValue, replaceValue);
								if (!isNaN(textToCompare)){ //result number
									if (attributes[column].type=="integer")data[i][column] =parseInt(textToCompare);
									else data[i][column] =parseFloat(textToCompare);
								}else{ //result:string
									data[i][column]=textToCompare;
								}
							}
						}
					} else {
						if (attributes[column].type=="number" ){
							if (data[i][column] ==parseFloat(searchValue))data[i][column] = parseFloat(replaceValue);
						}else{ //integer
							if (data[i][column] ==parseInt(searchValue))data[i][column] = parseInt(replaceValue);
						}
					}
				} else if (dataAttributes && attributes[column].type=="isodatetime") {
					if (datesAsText){ // No validation of the final result will be performed,  since it just returns a text!!
						textToCompare=data[i][column].toString();
						if (textToCompare.includes(searchValue)){	
							data[i][column]=textToCompare.replaceAll (searchValue, replaceValue);
						}
					}else{ //evaluate all result
						var searchalueDate= new Date(searchValue);
						var replaceValueDate=new Date(replaceValue);
						if (!isNaN(searchalueDate.getTime()) && !isNaN(replaceValueDate.getTime())) {
							if (data[i][column] ==searchValue) data[i][column] = replaceValue;
						}else{
							return "The values introduced are not dates; replacement will not be possible."
						}
					}
					
				}
								
			}
		}
	}
	return data;
}

function AddColumnGeoFromAnother(data, dataAttributes, selectedOptions) {
var columnCreated=false, record, json, point;

	if (selectedOptions.radioIn=="WKT" || selectedOptions.radioOut=="WKT")
		var wkt = new Wkt.Wkt();
	if (selectedOptions.radioIn=="JSON") {
		for (var i=0; i<data.length; i++)
		{
			record=data[i];
			if (!record[selectedOptions.JSONIn])
				continue;
			json=typeof record[selectedOptions.JSONIn] === "object" ? record[selectedOptions.JSONIn] : JSON.parse(record[selectedOptions.JSONIn]);
			if (selectedOptions.radioOut=="JSON") {
				record[selectedOptions.nameOut]=record[selectedOptions.JSONIn];
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="WKT") {
				wkt.read(JSON.stringify(json));
				record[selectedOptions.nameOut]=wkt.write();
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="Geohash") {
				//JSON-->Geohash
				point=getFirstCoordinateGeoJSONGeometry(json);
				record[selectedOptions.nameOut]=ngeohash_encode(point[1], point[0]);
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="LL") {
				//JSON-->LL (only if points)
				point=getFirstCoordinateGeoJSONGeometry(json);
				record[selectedOptions.nameOut]=point[0];
				record[selectedOptions.latitudeOut]=point[1];
				columnCreated=true;
			}
		}
	}
	else if (selectedOptions.radioIn=="WKT") {
		for (var i=0; i<data.length; i++)
		{
			record=data[i];
			if (!record[selectedOptions.WKTIn])
				continue;
			wkt.read(record[selectedOptions.WKTIn]);
			json=wkt.toJson();
			if (selectedOptions.radioOut=="JSON") {
				record[selectedOptions.nameOut]=json;
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="WKT") {
				record[selectedOptions.nameOut]=record[selectedOptions.WKTIn];
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="Geohash") {
				//JSON-->Geohash
				point=getFirstCoordinateGeoJSONGeometry(json);
				record[selectedOptions.nameOut]=ngeohash_encode(point[1], point[0]);
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="LL") {
				//JSON-->LL (only if points)
				point=getFirstCoordinateGeoJSONGeometry(json);
				record[selectedOptions.nameOut]=point[0];
				record[selectedOptions.latitudeOut]=point[1];
				columnCreated=true;
			}
		}
	}
	else if (selectedOptions.radioIn=="Geohash") {
		for (var i=0; i<data.length; i++)
		{
			record=data[i];
			if (!record[selectedOptions.geohashIn])
				continue;
			point=ngeohash_decode(record[selectedOptions.geohashIn]);
			json={type:"Point", coordinates:[point.longitude, point.latitude]};
			if (selectedOptions.radioOut=="JSON") {
				record[selectedOptions.nameOut]=json;
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="WKT") {
				wkt.read(JSON.stringify(json));
				record[selectedOptions.nameOut]=wkt.write();
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="Geohash") {
				record[selectedOptions.nameOut]=record[selectedOptions.geohashIn];
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="LL") {
				//JSON-->LL (only if points)
				point=getFirstCoordinateGeoJSONGeometry(json);
				record[selectedOptions.nameOut]=point[0];
				record[selectedOptions.latitudeOut]=point[1];
				columnCreated=true;
			}
		}
	}
	else if (selectedOptions.radioIn=="LL") {
		for (var i=0; i<data.length; i++)
		{
			record=data[i];
			if (!record[selectedOptions.longitudeIn] || !record[selectedOptions.latitudeIn])
				continue;
			json={type:"Point", coordinates:[record[selectedOptions.longitudeIn], record[selectedOptions.latitudeIn]]};
			if (selectedOptions.radioOut=="JSON") {
				record[selectedOptions.nameOut]=json;
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="WKT") {
				wkt.read(JSON.stringify(json));
				record[selectedOptions.nameOut]=wkt.write();
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="Geohash") {
				record[selectedOptions.nameOut]=ngeohash_encode(record[selectedOptions.latitudeIn], record[selectedOptions.longitudeIn]);
				columnCreated=true;
			}
			else if (selectedOptions.radioOut=="LL") {
				//JSON-->LL (only if points)
				record[selectedOptions.nameOut]=record[selectedOptions.longitudeIn];
				record[selectedOptions.latitudeOut]=record[selectedOptions.latitudeIn];
				columnCreated=true;
			}
		}
	}
	if (columnCreated==true) {
		dataAttributes[selectedOptions.nameOut]={};
		if (selectedOptions.radioOut=="JSON")
			dataAttributes[selectedOptions.nameOut].type="geometry";
		else if (selectedOptions.radioOut=="WKT")
			dataAttributes[selectedOptions.nameOut].type="geometry";
		else if (selectedOptions.radioOut=="Geohash")
			dataAttributes[selectedOptions.nameOut].type="string";
		else if (selectedOptions.radioOut=="LL") {
			dataAttributes[selectedOptions.nameOut].type="number";
			dataAttributes[selectedOptions.latitudeOut]={}
			dataAttributes[selectedOptions.latitudeOut].type="number";
		}
		return 0;
	}
	return 1;
}

