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

function calculateDataQualityCompletnessOmission(data, attribute,metadata, flag) {
    var rate;
    var count = 0;
    for (var i = 0; i < data.length; i++) {
        if (data[i][attribute] != null && data[i][attribute] != undefined && data[i][attribute] != "") {
            count++;
            if (flag) data[i]["Omission Flag"] = "True";
        } else if (flag) data[i]["Omission Flag"] = "False";
    }
    rate = (data.length - count) / data.length * 100;
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_CompletenessOmission",
					"measureIdentification": {
						"measure": {
							"name": "MissingItems"
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
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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


    return [count, data.length - count, rate.toFixed(2), 100 - rate.toFixed(2)];//data, Total, true, false, %omission, %completesa
}

function calculateDataQualityLogicalConsistency(dataTarget, dataReference, targets, references,metadata, flag) {
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
    var count = 0, itExist;
    for (var a = 0; a < dataTarget.length; a++) {
        temporalArray = [];
        for (var r = 0; r < targets.length; r++) {
            temporalArray.push(dataTarget[a][targets[r]]);
        }
        itExist = (referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i])))
        if (itExist) count++;
        if (flag) dataTarget[a]["logicalConsistenci"] = itExist;
      
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
							"name": "ValueDomain"
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
									"name": "items",
                                    "params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
    return [count, (count / dataTarget.length) * 100];
}

function calculateDataQualityTemporalValidity(data, attributeSelected, from, to, metadata, flag) {
    var attributes = getDataAttributes(data); //Està a tapis.js 
    if (attributes[attributeSelected].type != "isodatetime") return null;
    if (!from && !to) return null;
    var count = 0;
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

            } else {
                if (flag) data[i]["temporalValidity"] = false;
            }
        }
    }
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
							"name": "ValueDomain"
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
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
    return ([count, (count / data.length) * 100])

}
function calculateDataQualityTemporalResolution(data, attributeSelected, resolutionRadioValue, metadata, flag) {
    var attributes = getDataAttributes(data); //Està a tapis.js 
    if (attributes[attributeSelected].type != "isodatetime") return null;
    var regex, count = 0;
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
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_TemporalResolution",
					"measureIdentification": {
						"measure": {
							"name": "ValueDomain"
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
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
    return ([count, (count / data.length) * 100]);
}

function calculateDataQualityTemporalConsistency(data, attributeSelected, number, consistencyRadioValue, consistencyRadioMethod, tolerance, metadata, flag) {
    var attributes = getDataAttributes(data); //Està a tapis.js 
    if (attributes[attributeSelected].type != "isodatetime") return null;

    var currentDate, previousDate;
    var dateFrom, validRange;
    number = parseInt(number);
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
            }
            else {
                currentDate = new Date(data[i][attributeSelected]);
                validRange = returnValidRange(previousDate, number, tolerance, consistencyRadioValue);
                if (currentDate >= validRange[0] && currentDate <= validRange[1]) {//valid
                    count++;
                    data[i]["temporalConsistency"] = true;
                } else { //OutOfRange
                    if (flag) data[i]["temporalConsistency"] = false;
                }
                previousDate = new Date(data[i][attributeSelected]);
            }

        }
    }
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
							"name": "ValueDomain"
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
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
    return [count, (count / data.length) * 100]
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

	var accuracyValue=aggrFuncMean(uncertainties);
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
										"name": "uncertanty column",
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

function accuracyFromUncertaintyInTemporal(data, metadata, uncertaintyAttribute) {
	var uncertainties=[];
	for (var i=0; i<data.length; i++)
		uncertainties.push(data[i][uncertaintyAttribute]);

	var accuracyValue=aggrFuncMean(uncertainties);
	if (!Number.isInteger(accuracyValue)) 
		accuracyValue= accuracyValue.toFixed(3);

	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "",//"DQ_AbsoluteExternalPositionalAccuracy",
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

function calculateTemporalAccuracyFromTimes(data,timeColumn,metadata,groupColumn,newColumn){

	if(groupColumn)	{
		var objTime=createObjectToGroupTemporalRecords(data,groupColumn, timeColumn);
		var objTimeKeys=Object.keys(objTime);
		var msAdatesInMs, globalStandardDeviationArray=[];
		
		for (var i=0;i<objTimeKeys.length;i++){
			var msAdatesInMs = objTime[objTimeKeys[i]].values.map(s => new Date(s).getTime());
			objTime[objTimeKeys[i]].desvest=msAdatesInMs.length==1?0:aggrFuncStandardDeviation(msAdatesInMs);
		}
		for (var e=0;e<data.length;e++){
			if (newColumn)data[e].temporalAccuracy=objTime[data[e][groupColumn]].desvest/1000;
			globalStandardDeviationArray.push(objTime[data[e][groupColumn]].desvest/1000);
		}
		var accuracyValue= aggrFuncStandardDeviation(globalStandardDeviationArray)
		
	}else{
		var msAdatesInMs = data.map(s => new Date(s[timeColumn]).getTime());
		var desvest=aggrFuncStandardDeviation(msAdatesInMs); 
		console.log(desvest)
		var accuracyValue= desvest /1000
	}	
		if (!metadata.dataQualityInfos)	metadata.dataQualityInfos=[];
		metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "",//"DQ_AbsoluteExternalPositionalAccuracy",
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
										"value": timeColumn
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
		return accuracyValue
}

function createObjectToGroupTemporalRecords(data,groupColumn, timeColumn){
	var obj={}
	for (var i=0;i<data.length;i++){
			if (obj.hasOwnProperty(data[i][groupColumn])){
				obj[data[i][groupColumn]].values.push(data[i][timeColumn])
			}else{
					obj[data[i][groupColumn]]= {}
					obj[data[i][groupColumn]].values=[data[i][timeColumn]]
			}
		
	}
	return obj
}


function accuracyValuesInMetersWithPoints(data, metadata,  longAttribute, latAttribute, units, grouped, newColumns) {

   //Mirar si son numeros.
   //Falta posar si la casella està buida
 

    if (grouped!=false){

        var groupingGroupsObject=  createObjectWithDifferentPossibilitiesInColumnsInQualityPositions(data, grouped);
        var groupingObjectKeys=Object.keys(groupingGroupsObject);

        for(var i = 0; i<groupingObjectKeys.length;i++)
		calculateRMSEGroup(data, groupingGroupsObject[groupingObjectKeys[i]], longAttribute, latAttribute, units)

        for (var g=0;g<data.length;g++){
            data[g]["RMSE"]= groupingGroupsObject[data[g][grouped]]["RMSE"];
            if (newColumns){
                data[g][(units=="deg")?"MeanLog":"MeanX"]= groupingGroupsObject[data[g][grouped]][(units=="deg")?"MeanLog":"MeanX"];
                data[g][(units=="deg")?"MeanLat":"MeanY"]= groupingGroupsObject[data[g][grouped]][(units=="deg")?"MeanLat":"MeanY"];
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
        calculateRMSEGroup(data, groupingGroupsObject["column"],  longAttribute, latAttribute, units);
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
							"name": "RootMeanSquare"
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

function calculateDataQualityPositionalValidity(data, xmin, xmax, ymin, ymax, longAttribute, latAttribute, metadata, tag) {
   //x-> long, y-> lat
    // var attributes = getDataAttributes(data);
    // if (attributes[attributeSelected].type!="geometry") return null;
    //MIRAR QUE SIGUIN... NUMEROS?(float)
    var valid;
    var count =0;
    
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
    }
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
							"name": "ValueDomain"
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
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
    return [count, (count / data.length) * 100]
}

var RootURLQualityML="https://www.qualityml.org/";

function FoldOrUnFoldIFrameInfo(nom)
{
	var iFrame = document.getElementById(nom+"_iframe"), image = document.getElementById(nom+"_img");
	if (iFrame && image !== null && iFrame.tagName == "IFRAME" && image.tagName == "IMG")
		FoldOrUnFoldIInfo(iFrame, image);
}

function FoldOrUnFoldIInfo(elem, image)
{
	if (image !== null && image.tagName == "IMG" && elem !== null) {
		if (elem.style.display=="none") {
			elem.style.display="inline";
			image.src="fold.png";
		} else {
			elem.style.display="none";
			image.src="unfold.png";
		}
	}	
}


// Returns an HTML string for a button to unfold information in an iFrame.
function UnfoldButtonIFrame(id, url)
{
const cdns=[];
	cdns.push(" <img src=\"unfold.png\" id=\"",id,"_img\" alt=\"More information\" title=\"More information\" onClick='FoldOrUnFoldIFrameInfo(\"",id,"\")'\">");
	cdns.push("<iframe src=\"", url, "\" id=\"",id,"_iframe\" style=\"display: none\" width=\"99%\" height=\"180\" scrolling=\"auto\"></iframe>");
	return cdns.join("");
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
						cdns.push("<b>Measure:</b>", report.measureIdentification.measure.name, UnfoldButtonIFrame("ShowQualitat_q"+q+"_r"+r, RootURLQualityML+"1.0/measure/"+report.measureIdentification.measure.name), "<br>");
						for (var d=0; d<report.measureIdentification.domains.length; d++) {
							var domain=report.measureIdentification.domains[d];
							cdns.push("<b>Domain:</b> ", domain.name, UnfoldButtonIFrame("ShowQualitat_q"+q+"_r"+r+"_d"+d, RootURLQualityML+"1.0/domain/"+domain.name), "<br>");
						}
					}
					for (var rr=0; rr<report.results.length; rr++) {
						var result=report.results[rr];
						cdns.push("<h4>", result.type, "</h4>");
						if (result.errorStatistic && result.errorStatistic.metric && result.errorStatistic.metric.name) {
							var metric=result.errorStatistic.metric;
							cdns.push("<b>Metric:</b> ", metric.name, UnfoldButtonIFrame("ShowQualitat_q"+q+"_r"+r+"_rr"+rr, RootURLQualityML+"1.0/metrics/"+metric.name), "<br>");
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


function createObjectWithDifferentPossibilitiesInColumnsInQualityPositions(data, groupingColumn){
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

const factorDegreeToMeters=111319.5;

function calculateRMSEGroup(data, groupingObject, longAttribute, latAttribute, units){
    var RMSE, longitudeValues=[], latitudeValues=[];
    //Mean of Longitudes and latitudes
    
    for (var i = 0; i < groupingObject.DataPositions.length; i++) {
        longitudeValues.push(data[groupingObject.DataPositions[i]][longAttribute]);
        latitudeValues.push(data[groupingObject.DataPositions[i]][latAttribute]);
    }

    var longitudeMean = aggrFuncMean(longitudeValues);
    var latitudeMean = aggrFuncMean(latitudeValues);
    var sumSquareDistances=0, difLong, difLat;

    //Distances 
    if (units == "deg")
        var longFactor = factorDegreeToMeters * Math.cos(latitudeMean * Math.PI / 180);

    for (var e = 0; e < groupingObject.DataPositions.length; e++) {
        //long
        difLong = data[groupingObject.DataPositions[e]][longAttribute] - longitudeMean;
        difLat = data[groupingObject.DataPositions[e]][latAttribute] - latitudeMean;
        if (units == "deg") {
            difLong *= longFactor;
            difLat *= factorDegreeToMeters;
        }
	sumSquareDistances+=Math.sqrt(difLong ** 2 + difLat ** 2)**2;
    }


    var RMSE = Math.sqrt(sumSquareDistances / groupingObject.DataPositions.length);
	//@Marta, please Truncate the RMSE to 3 decimals (mm precision). Ho he posat abaix

    groupingObject.MeanLong=longitudeMean;
    groupingObject.MeanLat= latitudeMean;
    groupingObject.RMSE= RMSE.toFixed(3);
}

function accuracyFromUncertaintyThematicQuality(data, metadata, uncertaintyAttribute) {
	var uncertainties=[];
	for (var i=0; i<data.length; i++){
		uncertainties.push(data[i][uncertaintyAttribute]);
	}

	var accuracyValue=aggrFuncMean(uncertainties);
	if (!Number.isInteger(accuracyValue)) 
		accuracyValue= accuracyValue.toFixed(3);

	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "",//canviar
					"measureIdentification": {
						"measure": {
							"name": "CircularMapAccuracy" //canviar?
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

function accuracyFromAlfaNumValuesInThematicQuality (data, metadata, thematicAttributeSelected, grouped,  newColumns){
	
	var groupingGroupsObject=createObjectWithDifferentPossibilitiesInColumnsInQualityThematicAlfaNum(data, grouped,thematicAttributeSelected);

	if (newColumns){
		 for (var g=0;g<data.length;g++){
            data[g]["percentageIngroup"]= parseFloat(groupingGroupsObject[data[g][grouped]].values[data[g][thematicAttributeSelected]]);
			data[g]["groupMode"]= parseFloat(groupingGroupsObject[data[g][grouped]].mode);        
        }
	}
	var modeValues=[];
	var groupingGroupsObjectKeys= Object.keys(groupingGroupsObject);
	for (var i=0;i<groupingGroupsObjectKeys.length;i++){
		modeValues.push(groupingGroupsObject[groupingGroupsObjectKeys[i]].mode);
	}

	var globalAccuracyValue= aggrFuncMean(modeValues);


	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "",//canviar
					"measureIdentification": {
						"measure": {
							"name": "CircularMapAccuracy" //canviar?
						},
						"domains": [
							{
								"name": "DifferentialErrors2D",
								"params": [
										{
										"name": "uncertantie column",
										"value":""// uncertaintyAttribute
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
							"values":globalAccuracyValue //[ accuracyValue ]
						}
					]
				}
			]
		});
		return globalAccuracyValue;
}

function createObjectWithDifferentPossibilitiesInColumnsInQualityThematicAlfaNum(data,groupingColumn, valuesColumn){
	SortTableByColumns(data, [groupingColumn], "asc");

	var groupingGroupsObject={};
	var currentGroupName;
	
	for (var i=0;i<data.length;i++){	
		if (groupingColumn)currentGroupName= data[i][groupingColumn];
		else currentGroupName= "all"
		//currentGroupName= data[i][groupingColumn];
		if (groupingGroupsObject.hasOwnProperty(currentGroupName)){ //group already created (Without group allways here)
			if (groupingGroupsObject[currentGroupName].values.hasOwnProperty(data[i][valuesColumn])){ //The value in this group exist?
				groupingGroupsObject[currentGroupName].values[data[i][valuesColumn]]=groupingGroupsObject[currentGroupName].values[data[i][valuesColumn]]+1;
			}else{
				groupingGroupsObject[currentGroupName].values[data[i][valuesColumn]]=1; //first time this value added in the group.
			}				
		}else{ //FirtsRound or New group
			//newOne
			groupingGroupsObject[currentGroupName]={values:{}, mode:""}; //create property group-level
			groupingGroupsObject[currentGroupName].values[data[i][valuesColumn]]=1;
		}
	}
	var groupingGroupsObjectKeys=Object.keys(groupingGroupsObject); //Transform To %, return mode
	for (var e=0;e<groupingGroupsObjectKeys.length;e++){
		groupingGroupsObject[groupingGroupsObjectKeys[e]].mode= calculatePercentageInObject(groupingGroupsObject[groupingGroupsObjectKeys[e]].values);
	}
		
	return groupingGroupsObject;
		
}

function accuracyFromNumValuesInThematicQuality (data, metadata,thematicAttributeSelected, grouped,newColumns){
	
	var groupingGroupsObject=createObjectWithDifferentPossibilitiesInColumnsInQualityThematicNum(data, grouped,thematicAttributeSelected)
		if (newColumns){
		 for (var g=0;g<data.length;g++){
            data[g]["groupUncertainty"]= parseFloat(groupingGroupsObject[data[g][grouped]].groupUncertainty);   
        }
	}

	var uncertainties=[];
	var groupingGroupsObjectKeys= Object.keys(groupingGroupsObject)
	for (var i=0; i<groupingGroupsObjectKeys.length; i++){
		uncertainties.push(groupingGroupsObject[groupingGroupsObjectKeys[i]].groupUncertainty);
	}
	var accuracyValue=aggrFuncStandardDeviation(uncertainties); //MITJANAAAAAAAAAAAAAAAAAAAAAAAAAAA

	if (!metadata.dataQualityInfos)metadata.dataQualityInfos=[];

	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "",//canviar
					"measureIdentification": {
						"measure": {
							"name": "CircularMapAccuracy" //canviar?
						},
						"domains": [
							{
								"name": "DifferentialErrors2D",
								"params": [
										{
										"name": "uncertantie column",
										"value":""// uncertaintyAttribute
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

	 //i completar les metadades


	return accuracyValue;
}

function createObjectWithDifferentPossibilitiesInColumnsInQualityThematicNum(data,groupingColumn, valuesColumn){
	SortTableByColumns(data, [groupingColumn], "asc");
	//Mirar que siguin NUMEROS

	var groupingGroupsObject={};
	var currentGroupName;
	
	for (var i=0;i<data.length;i++){	
		if (groupingColumn)currentGroupName= data[i][groupingColumn];
		else currentGroupName= "all";
		if (groupingGroupsObject.hasOwnProperty(currentGroupName)){ //group already created (Without group allways here)
			groupingGroupsObject[currentGroupName].values.push(data[i][valuesColumn]);			
		}else{ //FirtsRound or New group
			//newOne
			groupingGroupsObject[currentGroupName]={values:[data[i][valuesColumn]], groupUncertainty:""}; //create property group-level
		}
	}
	var groupingGroupsObjectKeys=Object.keys(groupingGroupsObject); //Transform To %, return mode
	for (var e=0;e<groupingGroupsObjectKeys.length;e++){
		calculateDesVestInObject(groupingGroupsObject[groupingGroupsObjectKeys[e]]);
	}
	// console.log(groupingGroupsObject)
	return groupingGroupsObject
}



function calculatePercentageInObject(obj){
	var objKeys=Object.keys(obj);
	var sum=0, mode=0;

	for (var i=0;i<objKeys.length;i++){ //total
		sum+=obj[objKeys[i]];	
	}

	for (var a=0;a<objKeys.length;a++){
		if(obj[objKeys[a]]>mode)mode=obj[objKeys[a]];
		obj[objKeys[a]]= (Number.isInteger(obj[objKeys[a]]/sum *100))?obj[objKeys[a]]/sum *100:(obj[objKeys[a]]/sum *100).toFixed(3);
	}

	mode= (Number.isInteger(mode/sum *100))?mode/sum *100:(mode/sum *100).toFixed(3);
	return mode
}


function calculateDesVestInObject(obj){
	//console.log (obj);
	var sum=0, mean, sumSquaredDistances=0; 

	for (var i=0;i<obj.values.length;i++){
		sum+=obj.values[i]
	}
	mean= sum/obj.values.length;

	for (var e=0;e<obj.values.length;e++){
		sumSquaredDistances+= (obj.values[e]-mean)**2;
	}

	obj.groupUncertainty= Math.sqrt(sumSquaredDistances/obj.values.length).toFixed(3);
	
}

function calculateDataQualityThematicValidityWithAList(dataToEvaluate,referenceData, metadata, attributeToEvaluate, referenceAttribute,flag) {
	var referenceList=[]
	for (var i=0; i<referenceData.length;i++){
		if (!referenceList.includes(referenceData[i][referenceAttribute]))referenceList.push(referenceData[i][referenceAttribute])
	}
	var count=0, itsValid;
	for (var a=0;a<dataToEvaluate.length;a++){
		itsValid=referenceList.includes(dataToEvaluate[a][attributeToEvaluate])?true:false;
		if(itsValid)count++;
		if(flag)data[a]["thematicValidity"]=itsValid
	}
	if (!metadata.dataQualityInfos)	metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_PositionalValidity",
					"measureIdentification": {
						"measure": {
							"name": "ValueDomain"
						},
						"domains": [
							{
								"name": "Conformance",
								"params": ""//params
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
							"values": [ (count / dataToEvaluate.length) * 100]
						}
					]
				}
			]
		});
    return [count, (count / dataToEvaluate.length) * 100]
}

function calculateDataQualityThematicValidityWithRange(data,from, to,  metadata, thematicAttributeSelected,flag){
	//Mirar si es numero la clumna e vaors triat
	if (!from && !to)return "It is necessary to indicate a from or to number"; 
	if (from) {
		var fromNumber= Number(from);
		if (isNaN(fromNumber)) return '"From" value is not a number'; 
	}
	if (to) {
		var toNumber= Number(to);
		if (isNaN(toNumber)) return '"To" value is not a number'; 
	}
	var count=0;
	for (var i=0; i<data.length;i++){
		if (from){
			if (data[i][thematicAttributeSelected]>from){
				if (to){
					if (data[i][thematicAttributeSelected]<to){
						count++;
						if(flag)data[a]["thematicValidity"]=true;
					}else{
						if(flag)data[a]["thematicValidity"]=false;
					}
				}
			}
			continue;
		}
		if (to){
			if (data[i][thematicAttributeSelected]<to){
				count++
				if(flag)data[a]["thematicValidity"]=true;
			}else{
				if(flag)data[a]["thematicValidity"]=false;
			}
		}
	}
	if (!metadata.dataQualityInfos)	metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_PositionalValidity",
					"measureIdentification": {
						"measure": {
							"name": "ValueDomain"
						},
						"domains": [
							{
								"name": "Conformance",
								"params": ""//params
                            }
						]
					},
					"results": [
						{
							"type": "DQ_QuantitativeResult",
							"errorStatistic": {
								"metric": {
									"name": "items",
									"params":[
										{
											"name":"subtype",
											"value":"rate"
										},
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
    return [count, (count / data.length) * 100]

}