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

/*This module calculates data quality indicators.*/

//statistics.js is needed (Some functions needed are defined there)

function calculateDataQualityCompletnessOmission(data, attribute,metadata, flag, filter) {
    var rate;
    var count = 0, newData = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i][attribute] != null && data[i][attribute] != undefined && data[i][attribute] != "") {
            count++;
            if (flag) data[i]["Omission Flag"] = "True";
            if (filter) newData.push(data[i]);
        } else if (flag) data[i]["Omission Flag"] = "False";
    }
    rate = (data.length - count) / data.length * 100;
    if (!filter) newData = data;
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_CompletenessOmission",
					"measureIdentification": {
						"measure": {
							"name": "Missing items"
						},
						"domains": [
							{
								"name": "NonConformance",
								"params": [
										{
										"name": "column",
										"value": attribute
											}
										]
							}
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Rate of missing items",
									"params":[
                                        {
                                            "name": "min",
                                            "value":0
                                        },
                                        {
                                            "name": "max",
                                            "value":100
                                        }
                                    ]
								}
							},
							"valueType": "number",
							"values": [ rate.toFixed(2) ]
						}
					]
				}
			]
		});


    return [newData, data.length, count, data.length - count, rate.toFixed(2), 100 - rate.toFixed(2)];//data, Total, true, false, %omission, %completesa
}

function calculateDataQualityLogicalConsistency(dataTarget, dataReference, targets, references, flag, filter) {
    var count = 0;

    //Create an array with all possibilities (without repetitions)
    var referenceArrays = [], temporalArray;
    for (var i = 0; i < dataReference.length; i++) {
        temporalArray = [];
        for (var r = 0; r < references.length; r++) {
            temporalArray.push(dataReference[i][references[r]]);
        }
        if (!referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i]))) referenceArrays.push(temporalArray);
    }

    //check if every combination asked exist in referenceData
    var count = 0, itExist, newData = [];
    for (var a = 0; a < dataTarget.length; a++) {
        temporalArray = [];
        for (var r = 0; r < targets.length; r++) {
            temporalArray.push(dataTarget[a][targets[r]]);
        }
        itExist = (referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i])))
        if (itExist) count++;
        if (flag) dataTarget[a]["logicalConsistenci"] = itExist;
        if (filter && itExist) newData.push(dataTarget[a]);
    }
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_ConceptualConsistency",
					"measureIdentification": {
						"measure": {
							"name": "Value domain"
						},
						"domains": [
							{
								"name": "Conformance" ,
                                 "params": [
										{
									"name": "target columns",
									"value": [targets]
									},
									{
									"name": "reference columns",
									"value": [references]
									}
								]
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Rate of consistant items",
                                    "params":[
                                        {
                                            "name": "min",
                                            "value":0
                                        },
                                        {
                                            "name": "max",
                                            "value":100
                                        }
                                    ]
								}
							},
							"valueType": "number",
							"values": [(count / dataTarget.length) * 100 ]
						}
					]
				}
			]
		});
    newData=dataTarget;
    return [newData, count, (count / dataTarget.length) * 100];
}

function calculateDataQualityTemporalValidity(data, attributeSelected, from, to, metadata, flag, filter) {
    var attributes = getDataAttributes(data); //Està a tapis.js 
    if (attributes[attributeSelected].type != "isodatetime") return null;
    if (!from && !to) return null;
    var count = 0;
    var newData = [];
    var fromDate=new Date(from);
    var toDate=new Date(to);
    var date;
    for (var i = 0; i < data.length; i++) {
        if (from) {
            date= data[i][attributeSelected]
            if (date < fromDate) {
                if (date > toDate) {
                    count++;
                    if (flag) data[i]["temporalValidity"] = true;
                    if (filter) newData.push(data[i]);

                } else {
                    if (flag) data[i]["temporalValidity"] = false;
                }
            } else {
                if (flag) data[i]["temporalValidity"] = false;
            }
        } else { //only to
            if (date > toDate) {
                count++;
                if (flag) data[i]["temporalValidity"] = true;
                if (filter) newData.push(data[i]);

            } else {
                if (flag) data[i]["temporalValidity"] = false;
            }
        }
    }
    if (!filter) newData = data;
	var params= [{"name": "temporal column","value": attributeSelected}]
	if(from) params.push({"name": "date from","value": from});
	if(to) params.push({"name": "date to","value": to});

        if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_TemporalValidity",
					"measureIdentification": {
						"measure": {
							"name": "Value domain"
						},
						"domains": [
							{
								"name": "Conformance",
								"params":params
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Rate of missing items",
									"params":[
                                        {
                                            "name": "min",
                                            "value":0
                                        },
                                        {
                                            "name": "max",
                                            "value":100
                                        }
                                    ]
								}
							},
							"valueType": "number",
							"values": [ (count / dataTarget.length) * 100]
						}
					]
				}
			]
		});
    return ([newData, count, (count / data.length) * 100])

}
function calculateDataQualityTemporalResolution(data, attributeSelected, resolutionRadioValue, metadata, flag, filter) {
    var attributes = getDataAttributes(data); //Està a tapis.js 
    if (attributes[attributeSelected].type != "isodatetime") return null;
    var regex, count = 0, newData = [];
    for (var i = 0; i < data.length; i++) {
        switch (resolutionRadioValue) {
            case "year":
                regex = /^\d{4}(-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2})?)?)?)?)?/;
                break;

            case "month":
                regex = /^\d{4}-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2})?)?)?)?/;
                break;

            case "day":
                regex = /^\d{4}-\d{2}-\d{2}(T\d{2}(:\d{2}(:\d{2})?)?)?/;
                break;

            case "hour":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}(:\d{2}(:\d{2})?)?/;
                break;

            case "minute":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/;
                break;

            case "second":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
                break;

            case "fraction":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/;
                break;

            default:
                return null;
        }
        if (regex.test(data[i][attributeSelected])) {
            count++;
            if (flag) {
                data[i]["temporalResolution"] = true;
                if (filter) newData.push(data[i]);
            }
        } else {
            if (flag) data[i]["temporalResolution"] = false;
        }
    }
	var format;
	switch (resolutionRadioValue){
		    case "year":
				format = "YYYY";               
				break;

            case "month":
				format = "YYYY-MM";               
				break;

            case "day":
				format = "YYYY-MM-DD";               
				break;

            case "hour":
				format = "YYYY-MM-DDTHH";               
				break;

            case "minute":
				format = "YYYY-MM-DDTHH:mm";               
				break;

            case "second":
				format = "	YYYY-MM-DDTHH:mm:ss";               
				break;

            case "fraction":
				format = "YYYY-MM-DDTHH:mm:ss.fff";               
				break;

            default:
                return null;
	}
    if (!filter) newData = data;
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];ññ
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_TemporalResolution",
					"measureIdentification": {
						"measure": {
							"name": "Value domain"
						},
						"domains": [
							{
								"name": "Conformance",
								"params": [
										{
										"name": "temporal column",
										"value": attributeSelected
										},
																				{
										"name": "time resolution",
										"value": resolutionRadioValue
										},
										{
										"name": "format resolution",
										"value": format
										}

										] 
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Rate of missing items",
									"params":[
                                        {
                                            "name": "min",
                                            "value":0
                                        },
                                        {
                                            "name": "max",
                                            "value":100
                                        }
                                    ]
								}
							},
							"valueType": "number",
							"values": [ (count / data.length) * 100]
						}
					]
				}
			]
		});
    return ([newData, count, (count / data.length) * 100])
}

function calculateDataQualityTemporalConsistency(data, attributeSelected, number, consistencyRadioValue, consistencyRadioMethod, tolerance, metadata, flag, filter) {
    var attributes = getDataAttributes(data); //Està a tapis.js 
    if (attributes[attributeSelected].type != "isodatetime") return null;

    var currentDate, previousDate;
    var dateFrom, validRange;
    number = parseInt(number);
    newData = [];
    var datesGlobal = [], count = 0;
    if (consistencyRadioMethod == "global") { //GLOBAL
        for (var i = 0; i < data.length; i++) { //Creating global intervals
            if (i == 0) {
                dateFrom = new Date(data[0][attributeSelected]);
                datesGlobal.push([dateFrom, dateFrom]);
            }
            else dateFrom = new Date(dateFrom);
            switch (consistencyRadioValue) {
                case "years":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 24 * 30.44 * 12 * 1000);
                    break;
                case "months":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 24 * 30.44 * 1000);
                    break;
                case "days":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 24 * 1000);
                    break;
                case "hours":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 1000);
                    break;
                case "minutes":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 1000);
                    break;

                case "seconds":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 1000);

                    break;
                default:
                    return null;
            }
        }
        for (var i = 0; i < data.length; i++) {
            currentDate = new Date(data[i][attributeSelected]);
            if (currentDate >= datesGlobal[i][0] && currentDate <= datesGlobal[i][1]) { //Valid
                count++;
                data[i]["temporalConsistency"] = true;
                if (filter) newData.push(data[i])

            } else { //OutOfRange
                if (flag) data[i]["temporalConsistency"] = false;

            }
        }
    } else { //compared with previous record

        for (var i = 0; i < data.length; i++) {
            if (i == 0) {
                previousDate = new Date(data[i][attributeSelected]);
                count++;
                data[i]["temporalConsistency"] = true;
                if (filter) newData.push(data[i])
            }
            else {
                currentDate = new Date(data[i][attributeSelected]);
                validRange = returnValidRange(previousDate, number, tolerance, consistencyRadioValue);
                if (currentDate >= validRange[0] && currentDate <= validRange[1]) {//valid
                    count++;
                    data[i]["temporalConsistency"] = true;
                    if (filter) newData.push(data[i]);
                } else { //OutOfRange
                    if (flag) data[i]["temporalConsistency"] = false;
                }
                previousDate = new Date(data[i][attributeSelected]);
            }

        }
    }
    if (!filter) newData = data;
	var intervalMetohd= (consistencyRadioMethod="local")?"Distance to the previous data":"Distance from the global interval baseline";
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_TemporalConsistency",
					"measureIdentification": {
						"measure": {
							"name": "Value domain"
						},
						"domains": [
							{
								"name": "Conformance",
								"params": [
										{
										"name": "temporal column",
										"value": attributeSelected
										},
										{
										"name": "number",
										"value": number
										},
										{
										"name": "time unit",
										"value": consistencyRadioValue
										},
										{
										"name": "tolerance ",
										"value": tolerance
										},
										{
										"name": "interval method",
										"value": intervalMetohd
										},


										]
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Rate of missing items",
									"params":[
                                        {
                                            "name": "min",
                                            "value":0
                                        },
                                        {
                                            "name": "max",
                                            "value":100
                                        }
                                    ]
								}
							},
							"valueType": "number",
							"values": [ (count / data.length) * 100]
						}
					]
				}
			]
		});
    return [newData, count, (count / data.length) * 100]
}

function returnValidRange(currentData, number, tolerance, consistencyRadioValue) {
    var start, end, DatePlusNumber, toleranceMSeconds;
    switch (consistencyRadioValue) {
        case "years":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 24 * 30.44 * 12 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 24 * 30.44 * 12 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);

            break;
        case "months":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 24 * 30.44 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 24 * 30.44 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);

            break;
        case "days":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 24 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 24 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);
            break;
        case "hours":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);

            break;
        case "minutes":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);
            break;

        case "seconds":
            start = new Date(currentData.getTime() + (number - number * tolerance / 100) * 1000);
            end = new Date(currentData.getTime() + (number + number * tolerance / 100) * 1000);
            break;
        default:
            return null;
    }

    return [start, end]
}

function accuracyFromUncertaintyInPositions(data, metadata, uncertaintyAttribute) {
	var uncertainties=[];
	for (var i=0; i<data.length; i++)
		uncertainties.push(data[i][uncertaintyAttribute]);

	var accuracyValue=aggrFuncStandardDeviation(uncertainties);
	if (!Number.isInteger(accuracyValue)) 
		accuracyValue= accuracyValue.toFixed(3);

	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_AbsoluteExternalPositionalAccuracy",
					"measureIdentification": {
						"measure": {
							"name": "CircularMapAccuracy"
						},
						"domains": [
							{
								"name": "DifferentialErrors2D",
								"params": [
										{
										"name": "uncertantie column",
										"value": uncertaintyAttribute
											}
										]
							}
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Half-lengthConfidenceInterval",
									"params": [
										{
											"name": "level",
											"value": "0.683"
										}
									]
								}
							},
							"valueType": "number",
							"values": [ accuracyValue ]
						}
					]
				}
			]
		});

	return accuracyValue;
}

function accuracyValuesInMetersWithPoints(data, metadata,  longAttribute, latAttribute, units, grouped, newColumns) {
   // var attributes = getDataAttributes(data);
   // if (attributes[attribute].type!="geometry") return null;
   //Mirar si son numeros.
   //Falta posar si la casella està buida
 

    if (grouped!=false){

        var groupingGroupsObject=  createObjectWithDifferentPossibilitiesInColumns(data, grouped);
        var groupingObjectKeys=Object.keys(groupingGroupsObject);

        for(var i = 0; i<groupingObjectKeys.length;i++){            
            groupingGroupsObject= calculateRMSE (data,groupingGroupsObject, groupingObjectKeys[i],  longAttribute, latAttribute, units)
        }

        for (var g=0;g<data.length;g++){
            data[g]["RMSE"]= groupingGroupsObject[data[g][grouped]]["RMSE"];
            if (newColumns){
                data[g]["MeanLong"]= groupingGroupsObject[data[g][grouped]]["MeanLong"];
                data[g]["MeanLat"]= groupingGroupsObject[data[g][grouped]]["MeanLat"];
            }
        }
        var dataToEvaluateGlobalAccuracy=[];
        for (var p=0;p<groupingObjectKeys.length;p++){
            dataToEvaluateGlobalAccuracy.push({RMSE: groupingGroupsObject[groupingObjectKeys[p]]["RMSE"]})
        }
        var  globalAccuracy = accuracyFromUncertaintyInPositions(dataToEvaluateGlobalAccuracy, metadata, "RMSE")
        if (!newColumns){ //Erase RMSE column. Needed before to calculate global accuracy
            for (var d=0;d<data.length;d++){
                delete data[i]["RMSE"]
            }
        }
    }else{
        var numbersArray=[]
        for(var s=0;s<data.length;s++){
            numbersArray.push(s)
        }
        var groupingGroupsObject={column:{"DataPositions":numbersArray}}
        groupingGroupsObject= calculateRMSE (data,groupingGroupsObject, "column",  longAttribute, latAttribute, units);
        var globalAccuracy = groupingGroupsObject.column["RMSE"];
    }
	var params= [{
					"name": "longitude column",
					"value": longAttribute
					},
					{
					"name": "latitude column",
					"value":latAttribute
					}
					
				]
 	if(grouped)params.push({"name": "groumping mode","value": "grouped"},{"name": "groumping column",	"value": grouped})
	else params.push({"name": "groumping mode",	"value": "global"});

   if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_AbsoluteExternalPositionalAccuracy", 
					"measureIdentification": {
						"measure": {
							"name": "RMSE"
						},
						"domains": [
							{
								"name": "RootMeanSquareError2D",
								"params":params
							}
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Half-lengthConfidenceInterval",
									"params": [
										{
											"name": "level",
											"value": "0.683"
										}
									]
								}
							},
							"valueType": "number",
							"values": [ globalAccuracy ]
						}
					]
				}
			]
		});

    return globalAccuracy;

}

function calculateDataQualityPositionalValidity(data, xmin, xmax, ymin, ymax, longAttribute, latAttribute, metadata, tag, filter) { //AxisOrder XY or YX
   //x-> long, y-> lat
    // var attributes = getDataAttributes(data);
    // if (attributes[attributeSelected].type!="geometry") return null;
    //MIRAR QUE SIGUIN... NUMEROS?(float)
    var valid;
    var count =0;
    var newData=[];
    
    for (var i = 0; i < data.length; i++) {
        valid = true;
        if (xmin != "") {
            if (data[i][longAttribute] < parseFloat(xmin)) valid = false;
        }
        if (xmax != "") {
            if (data[i][longAttribute] > parseFloat(xmax)) valid = false;
        }
        if (ymin != "") {
            if (data[i][latAttribute] < parseFloat(ymin)) valid = false;
        }
        if (ymax != "") {
            if (data[i][latAttribute] > parseFloat(ymax)) valid = false;
        }

        if (valid){
            count++;
        }
        if (tag && valid) data[i]["PositionalValidity"] = "True";
        if (tag && !valid) data[i]["PositionalValidity"] = "False";
        if (filter && valid) newData.push(data[i]);
    }
    if (!filter)
	newData=data;
	var params= [{"name": "longitude column","value": longAttribute	},{	"name": "latitude column","value":latAttribute}]
	if (xmin!="")params.push({"name": "xmin","value": xmin});
	if (ymin!="")params.push({"name": "ymin","value": ymin});
	if (xmax!="")params.push({"name": "xmax","value": xmax});
	if (ymax!="")params.push({"name": "ymax","value": ymax})
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_PositionalValidity",
					"measureIdentification": {
						"measure": {
							"name": "Value domain"
						},
						"domains": [
							{
								"name": "Conformance",
								"params": params
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "Rate of missing items",
										"params":[
                                        {
                                            "name": "min",
                                            "value":0
                                        },
                                        {
                                            "name": "max",
                                            "value":100
                                        }
                                    ]
								}
							},
							"valueType": "number",
							"values": [ (count / data.length) * 100]
						}
					]
				}
			]
		});
    return [newData, count, (count / data.length) * 100]
}

function metadataAsHTML(metadata) {
var cdns=[];
	if (!metadata)
		return "";
	if (metadata.dataQualityInfos && metadata.dataQualityInfos.length) {
		cdns.push("<h2>Data quality</b><h2>");
		for (var q=0; q<metadata.dataQualityInfos.length; q++) {
			for (var r=0; r<metadata.dataQualityInfos[q].reports.length; r++) {
				var report=metadata.dataQualityInfos[q].reports[r];
				cdns.push("<h3>", report.type, "</h3>");
				if (report.measureIdentification) {
					if (report.measureIdentification.measure && report.measureIdentification.measure.name) {
						cdns.push("<b>Measure:</b> ", report.measureIdentification.measure.name, "<br>");
						for (var d=0; d<report.measureIdentification.domains.length; d++) {
							var domain=report.measureIdentification.domains[d];
							cdns.push("<b>Domain:</b> ", domain.name, "<br>");
						}
					}
					for (var rr=0; rr<report.results.length; rr++) {
						var result=report.results[rr];
						cdns.push("<h4>", result.type, "</h4>");
						if (result.errorStatistic && result.errorStatistic.metric && result.errorStatistic.metric.name) {
							var metric=result.errorStatistic.metric;
							cdns.push("<b>Metric:</b> ", metric.name, "<br>");
							for (var p=0; p<metric.params.length; p++)
								cdns.push("<b>", metric.params[p].name, ":</b> ", metric.params[p].value, "<br>");
						}
						cdns.push("<b>Result:</b> ");
						for (var v=0; v<report.results[rr].values.length; v++) {
							cdns.push(report.results[rr].values[v]);
							if (v+1<report.results[rr].values.length)
								cdns.push(", ");
						}
					}
				}
			}
		}
	}
	return cdns.join("");
}


function createObjectWithDifferentPossibilitiesInColumns(data, groupingColumn){
    var groupingGroupsObject={}, groupingKeys;

    for(var i=0; i<data.length;i++){
        groupingKeys= Object.keys(groupingGroupsObject);
        if(groupingKeys.includes(data[i][groupingColumn])){
                groupingGroupsObject[data[i][groupingColumn]]["DataPositions"].push(i);
        }
        else {
            groupingGroupsObject[data[i][groupingColumn]]={}
            groupingGroupsObject[data[i][groupingColumn]]["DataPositions"]=[i]
        }
    }
    return groupingGroupsObject;
}

function calculateRMSE (data, groupingObject, keyToEvaluate, longAttribute, latAttribute, units){
    var RMSE, longitudeValues=[], latitudeValues=[];
    //Mean of Longitudes and latitudes
    
    for (var i = 0; i < groupingObject[keyToEvaluate]["DataPositions"].length; i++) {
        longitudeValues.push(data[groupingObject[keyToEvaluate]["DataPositions"][i]][longAttribute]);
        latitudeValues.push(data[groupingObject[keyToEvaluate]["DataPositions"][i]][latAttribute]);
    }

    var longitudeMean = aggrFuncMean(longitudeValues);
    var latitudeMean = aggrFuncMean(latitudeValues);
    var distances = [], difLong, difLat;

    //Distances 
    if (units == "degree") {
        var latRad = latitudeMean * Math.PI / 180
        var longFactor = 111132 * Math.cos(latRad);
    }
    for (var e = 0; e < groupingObject[keyToEvaluate]["DataPositions"].length; e++) {
        //long
        difLong = data[groupingObject[keyToEvaluate]["DataPositions"][e]][longAttribute] - longitudeMean;
        difLat = data[groupingObject[keyToEvaluate]["DataPositions"][e]][latAttribute] - latitudeMean;
        if (units == "degree") {
            difLong = difLong * longFactor;
            difLat = difLat * 111132;
        }
        distances.push(Math.sqrt(difLong ** 2 + difLat ** 2))
    }

    //RMSE
    var sumSquareDistances = distances.reduce((acc, d) => acc + d ** 2, 0);
    var RMSE = Math.sqrt(sumSquareDistances / groupingObject[keyToEvaluate]["DataPositions"].length);

    groupingObject[keyToEvaluate]["MeanLong"]= longitudeMean;
    groupingObject[keyToEvaluate]["MeanLat"]= latitudeMean;
    groupingObject[keyToEvaluate]["RMSE"]= RMSE;

    return groupingObject;
}
