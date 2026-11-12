"use strict"

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

function calculateDataQualityCompletnessOmission(data, attribute,metadata, flag) {
    var omissionRate;
    var count = 0;
    for (var i = 0; i < data.length; i++) {
        if (data[i][attribute] != null && data[i][attribute] != undefined && data[i][attribute] != "") {
            count++; //not empty
            if (flag) data[i]["Omission Flag"] = false;
        } else if (flag) data[i]["Omission Flag"] = true;
    }
    omissionRate = (data.length - count) / data.length * 100;
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_CompletenessOmission",
					"measureIdentification": {
						"code": "MissingItems",
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
							"values": [ omissionRate.toFixed(2) ]
						}
					]
				}
			]
		});


    return {"notEmpty":count, "empty":data.length - count, "omissionRate":omissionRate, "completnessRate":100-omissionRate }//[count, data.length - count, rate.toFixed(2), 100 - rate.toFixed(2)];//data, Total, true, false, %omission, %completesa
}
function calculateDataQualityCompletnessComission(data, attribute,metadata,lowerUpperCase, flag) {
	var comissionRate;
	var differentValues = new Set();
	var count = 0;

	for (var i = 0; i < data.length; i++) {
		var value = data[i][attribute];

		if (value != null && value != undefined && value != "") {

			// Ignore uppercase/lowercase differences if requested
			if (lowerUpperCase) {
				value = String(value).toLowerCase();
			}

			if (differentValues.has(value)) {
				count++; // Duplicate found
				if (flag) data[i]["Duplicate Flag"] = true;
			} else {
				differentValues.add(value);
				if (flag) data[i]["Duplicate Flag"] = false;
			}
		} else {
			if (flag) data[i]["Duplicate Flag"] = false;
		}
	}
    comissionRate = (count / data.length) * 100;
    if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_CompletenessComission",
					"measureIdentification": {
						"code": "Duplicate",
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
							"values": [ comissionRate.toFixed(2) ]
						}
					]
				}
			]
		});


    return {"duplicated":count,  "comissionRate":comissionRate }
}

function calculateDataQualityCompletnessComissionExcess(data, metadata, expected, attribute) {
	var total = data.length;
	var expectedCount = (typeof expected === "number" && !isNaN(expected)) ? expected : 0;
	if (expectedCount < 0) expectedCount = 0;
	var excess = Math.max(0, total - expectedCount);
	var excessRate = total ? (excess / total) * 100 : 0;
	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	var excessParams = [
		{ "name": "expectedRecords", "value": expectedCount }
	];
	if (attribute) excessParams.push({ "name": "column", "value": attribute });
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_CompletenessComission",
					"measureIdentification": {
						"code": "ExcessItems",
						"domains": [
							{
								"name": "NonConformance",
								"params": excessParams
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
										{ "name":"subtype", "value":"rate" },
										{ "name": "min", "value":0 },
										{ "name": "max", "value":100 }
									]
								}
							},
							"valueType": "number",
							"values": [ excessRate.toFixed(2) ]
						}
					]
				}
			]
		});
	return {"expected": expectedCount, "total": total, "excess": excess, "excessRate": excessRate};
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
						"code": "ValueDomain",
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
    return {"logicalCorrect":count, "logicalConsistencyRate":(count / dataTarget.length) * 100 };
} 	

function calculateDataQualityTemporalValidity(data, attributeSelected, from, to, metadata, flag) {
    var attributes = getDataAttributes(data); 
    if (attributes[attributeSelected].type != "isodatetime") return null;
    if (!from && !to) return null;
    var count = 0;
    var fromDate=new Date(from);
    var toDate=new Date(to);
    var date;
	for (var i = 0; i < data.length; i++) {
		date = new Date(data[i][attributeSelected]); 

		if (from) {
			if (date >= fromDate) {
				if (date <= toDate) {
					count++;
					if (flag) data[i]["temporalValidity"] = true;
				} else {
					if (flag) data[i]["temporalValidity"] = false;
				}
			} else {
				if (flag) data[i]["temporalValidity"] = false;
			}
		} else { // only to
			if (date <= toDate) { 
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
						"code": "ValueDomain",
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
							"values": [ (count / data.length) * 100]
						}
					]
				}
			]
		});
    return  {"trueTemporalValidiy":count, "temporalValidityRate":(count / data.length) * 100 };
}
function calculateDataQualityTemporalResolution(data, attributeSelected, resolutionRadioValue, metadata, flag) {
    var attributes = getDataAttributes(data); 
   //if (attributes[attributeSelected].type != "isodatetime") return null;
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
						"code": "ValueDomain",
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
    return {"trueTemporalResolution":count, "temporalResolutionRate":(count / data.length) * 100 };
}

function calculateDataQualityTemporalConsistency(data, attributeSelected, number, consistencyRadioValue, consistencyRadioMethod, tolerance, metadata, flag) {
    var attributes = getDataAttributes(data); 
   //Without 

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
						"code": "ChronologicalError",
						"domains": [
							{
								"name": "Dates",
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
    return {"trueTemporalConsistency":count, "temporalConsistencyRate":(count / data.length) * 100 };
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

function accuracyFromUncertaintyQuality(data, metadata, uncertaintyAttribute, className, domainName, domainParamName, metricName) {
	var uncertainties=[];
	for (var i=0; i<data.length; i++)
		uncertainties.push(data[i][uncertaintyAttribute]);
	var accuracyValue=parseFloat(aggrFuncMean(uncertainties));
	
	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": className,
					"measureIdentification": {
						"code": "MeanAbsoluteError",
						"domains": [
							{
								"name": domainName,
								"params": [
									{
										"name": domainParamName,
										"value": uncertaintyAttribute
									},
									{
										"name": "Probability",
										"value": "0.5"
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
									"name": metricName
								}
							},
							"valueType": "number",
							"values": [ accuracyValue ]
						}
					]
				}
			]
		});

	return {"accuracyValue":accuracyValue};
}

function accuracyFromUncertaintyInPositions(data, metadata, uncertaintyAttribute) {
	return accuracyFromUncertaintyQuality(data, metadata, uncertaintyAttribute, "DQ_AbsoluteExternalPositionalAccuracy", "DifferentialErrors2D", "Positional uncertanty column", "MeanAbsolute2D");
}

function accuracyFromUncertaintyInTemporal(data, metadata, uncertaintyAttribute) {
	return accuracyFromUncertaintyQuality(data, metadata, uncertaintyAttribute, "DQ_TemporalAccuracy", "DifferentialErrors1D", "Temporal uncertanty column", "MeanAbsolute");
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
		var accuracyValue=aggrFuncStandardDeviation(globalStandardDeviationArray);
	}else{
		var msAdatesInMs = data.map(s => new Date(s[timeColumn]).getTime());
		var desvest=aggrFuncStandardDeviation(msAdatesInMs); 
		console.log(desvest)
		var accuracyValue=desvest/1000;
	}	
		if (!metadata.dataQualityInfos)	metadata.dataQualityInfos=[];
		metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_TemporalAccuracy",
					"measureIdentification": {
						"code": "MeanAbsoluteError",
						"domains": [
							{
								"name": "DifferentialErrors1D",
								"params": [
									{
										"name": "Temporal uncertanty column",
										"value": timeColumn
									},
									{
										"name": "Probability",
										"value": "0.5"
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
									"name": "MeanAbsolute"
								}
							},
							"valueType": "number",
							"values": [ accuracyValue ]
						}
					]
				}
			]
		});
		return {"accuracyValue":accuracyValue};
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
	var attributes = getDataAttributes(data); 
    if (attributes[longAttribute].type != "integer" && attributes[longAttribute].type != "number") return null;
	if (attributes[latAttribute].type != "integer" && attributes[latAttribute].type != "number") return null;
 

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
						"code": "RootMeanSquare",
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
											"value": 0.683
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

    return {"accuracyValue":globalAccuracy};

}

function calculateDataQualityPositionalValidity(data, xmin, xmax, ymin, ymax, longAttribute, latAttribute, metadata, tag) {
   //x-> long, y-> lat
    var attributes = getDataAttributes(data);
  	if (attributes[longAttribute].type != "integer" && attributes[longAttribute].type != "number") return null;
	if (attributes[latAttribute].type != "integer" && attributes[latAttribute].type != "number") return null;
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
						"code": "ValueDomain",
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

    return {"truePositionalValidity":count, "positionalValidityRate":(count / data.length) * 100 };
}

function FormatConsistencyEscapeRegExp(text) {
	return String(text).replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
}

function FormatConsistencyTokenToRegExp(token) {
	var piece, n;
	if (!token)
		return "";
	if (token.type === "anyLetter")
		piece = "[A-Za-z]";
	else if (token.type === "anyDigit")
		piece = "[0-9]";
	else if (token.type === "letterOrDigit")
		piece = "[A-Za-z0-9]";
	else if (token.type === "any")
		piece = ".";
	else if (token.type === "sign")
		piece = "[+\\-]";
	else if (token.type === "hyphen")
		piece = "\\-";
	else if (token.type === "dot")
		piece = "\\.";
	else if (token.type === "letter" || token.type === "digit")
		piece = FormatConsistencyEscapeRegExp(token.value);
	else if (token.type === "interval")
		piece = "[" + FormatConsistencyEscapeRegExp(token.from) + "-" + FormatConsistencyEscapeRegExp(token.to) + "]";
	else
		return "";
	n = token.count != null ? parseInt(token.count, 10) : 1;
	if (!isNaN(n) && n > 1)
		return piece + "{" + n + "}";
	return piece;
}

function FormatConsistencyCustomRegExp(tokens) {
	var i, source;
	source = "^";
	if (!tokens || !tokens.length)
		return null;
	for (i = 0; i < tokens.length; i++)
		source += FormatConsistencyTokenToRegExp(tokens[i]);
	source += "$";
	try {
		return new RegExp(source);
	} catch (e) {
		return null;
	}
}

function FormatConsistencyDateRegExp(pattern) {
	var map = {
		"YYYY": "^\\d{4}$",
		"YYYY-MM": "^\\d{4}-\\d{2}$",
		"YYYY-MM-DD": "^\\d{4}-\\d{2}-\\d{2}$",
		"YYYY-MM-DDTHH:mm": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$",
		"YYYY-MM-DDTHH:mm:ss": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$",
		"YYYY-MM-DDTHH:mm:ss.s": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d$",
		"YYYY-MM-DDTHH:mm:ss.sss": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}$",
		"YYYY-MM-DDTHH:mm:ssZ": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$",
		"YYYY-MM-DDTHH:mm:ss.sssZ": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
		"YYYY-MM-DDTHH:mm:ss±hh:mm": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+\u2212\\-]\\d{2}:\\d{2}$"
	};
	return new RegExp(map[pattern] || map["YYYY-MM-DD"]);
}

function FormatConsistencyValueMatches(raw, options) {
	var value, format, re, compact, prefix, prefixLen, numberLen, digits;
	if (raw === null || raw === undefined)
		return false;
	value = String(raw).trim();
	if (value === "")
		return false;
	format = options.format;
	if (format === "date")
		return FormatConsistencyDateRegExp(options.datePattern).test(value);
	if (format === "time") {
		if (options.timePattern === "HH:mm")
			return /^\d{2}:\d{2}$/.test(value);
		return /^\d{2}:\d{2}:\d{2}$/.test(value);
	}
	if (format === "coordinates" || format === "latLon") {
		if (options.coordPattern === "signed" || options.latLonPattern === "signed")
			return /^[+\u2212\-]\d+(\.\d+)?$/.test(value);
		if (options.coordPattern === "dms")
			return /^\d{1,3}[°º]\s*\d{1,2}['′]\s*\d{1,2}(?:\.\d+)?["″]\s*[NSEWnsew]$/.test(value);
		if (options.coordPattern === "ddm")
			return /^\d{1,3}[°º]\s*\d{1,2}(?:\.\d+)?['′]\s*[NSEWnsew]$/.test(value);
		if (options.coordPattern === "utm")
			return /^(?:[1-9]|[1-5]\d|60)[C-HJ-NP-X]\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?$/.test(value);
		if (options.coordPattern === "cartesian" || options.coordPattern === "geocentric")
			return /^-?\d+(\.\d+)?$/.test(value);
		return /^-?\d+(\.\d+)?$/.test(value);
	}
	if (format === "telephone") {
		compact = value.replace(/\s+/g, "");
		if (options.telPrefixMode === "length") {
			digits = compact.replace(/^\+/, "").replace(/\D/g, "");
			prefixLen = parseInt(options.telPrefixLength, 10);
			numberLen = parseInt(options.telNumberLength, 10);
			if (isNaN(prefixLen) || prefixLen < 0)
				prefixLen = 0;
			if (isNaN(numberLen) || numberLen < 1)
				return false;
			return digits.length === (prefixLen + numberLen);
		}
		prefix = String(options.telPrefix || "").replace(/\s+/g, "");
		numberLen = parseInt(options.telNumberLength, 10);
		if (!prefix || isNaN(numberLen) || numberLen < 1)
			return false;
		if (compact.indexOf(prefix) !== 0)
			return false;
		digits = compact.slice(prefix.length).replace(/\D/g, "");
		return digits.length === numberLen;
	}
	if (format === "email")
		return /^.+@.+\.[^.]+$/.test(value);
	if (format === "uuid") {
		if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value))
			return true;
		return !!(options.uuidAllowNoHyphens && /^[0-9a-fA-F]{32}$/.test(value));
	}
	if (format === "dottedNumbers")
		return /^-?\d+\.\d+$/.test(value) && value.indexOf(",") === -1;
	if (format === "custom") {
		re = FormatConsistencyCustomRegExp(options.patternTokens);
		return !!(re && re.test(value));
	}
	return false;
}

function calculateDataQualityFormatConsistency(data, attribute, metadata, options) {
	var i, invalidItems, totalItems, physicalStructureConflictsRate;
	totalItems = data.length;
	invalidItems = 0;
	for (i = 0; i < totalItems; i++) {
		if (!FormatConsistencyValueMatches(data[i][attribute], options))
			invalidItems++;
	}
	physicalStructureConflictsRate = totalItems ? (invalidItems / totalItems) * 100 : 0;
	if (!metadata.dataQualityInfos)
		metadata.dataQualityInfos = [];
	metadata.dataQualityInfos.push({
		"reports": [
			{
				"type": "DQ_FormatConsistency",
				"measureIdentification": {
					"code": "PhysicalStructureConflicts",
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
								"params": [
									{
										"name": "subtype",
										"value": "rate"
									},
									{
										"name": "min",
										"value": 0
									},
									{
										"name": "max",
										"value": 100
									}
								]
							}
						},
						"valueType": "number",
						"values": [
							physicalStructureConflictsRate.toFixed(2)
						]
					}
				]
			}
		]
	});
	return {
		invalidItems: invalidItems,
		totalItems: totalItems,
		physicalStructureConflictsRate: physicalStructureConflictsRate
	};
}

var RootURLQualityML="https://www.qualityml.org/";
const qualityMLMeasures  = [ //Check whether it exists beforehand to avoid creating an unfold that triggers the alert indicating it does not exist.
  "Excess",
  "Duplicate",
  "Misclassification",
  "MissingItems",
  "MissingClass",
  "NodataAreas",
  "FlagAreas",
  "ConceptualSchema",
  "InvalidOverlapsSurfaces",
  "ValueDomain",
  "PhysicalStructureConflicts",
  "FaultyPoint-curveConnections",
  "MissingConnectionsDueUndershoots",
  "MissingConnectionsDueOvershoots",
  "InvalidSlivers",
  "InvalidSelfIntersects",
  "InvalidSelfOverlaps",
  "MeanAbsoluteError",
  "TimeAccuracy",
  "TemporalDistanceDistribution",
  "TemporalDensity",
  "ChronologicalError",
  "CategoricalCorrespondence",
  "QuantitativeAttributeCorrectness",
  "SubSettingSamplingStability",
  "TotalQualityIndex",
  "ExtrapolatedAreas",
  "LevelOfConfidence",
  "LevelOfLikelihood",
];

const qualityMLDomains = [
  "PredictedValues",
  "ActualValues",
  "PredictedArea",
  "ActualArea",
  "DifferentialErrorsX",
  "DifferentialErrorsY",
  "DifferentialErrors1D",
  "DifferentialErrors2D",
  "DifferentialErrors3D",
  "NonConformance",
  "Conformance",
  "TemporalDistance",
  "Dates",
];

const qualityMLMetrics = [
  "Items",
  "CommissionError",
  "FalsePositiveRate",
  "OmissionError",
  "MeanAbsolutePercentageError",
  "MeanAbsolute",
  "MeanAbsolute2D",
  "Half-lengthConfidenceInterval",
  "StandardDeviation",
  "Reliability",
  "AverageReliability",
  "Accuracy",
  "AverageAccuracy",
  "OverallAccuracy",
  "Sensitivity",
  "Specificity",
  "FBetaScore",
  "AreaUnderROCCurve",
  "PositivePredictiveValue",
  "FalseDiscoveryRate",
  "MatthewsCorrelationCoefficient",
  "CoefficientOfDetermination",
  "CoefficientOfCorrelation",
  "Variance",
  "Purity",
  "ConfusionMatrix",
  "RelativeConfusionMatrix",
  "DiscreteConfusionMatrix",
  "CorrespondenceMatrix",
  "RelativeCorrespondenceMatrix",
  "KappaCoefficient",
  "NumberMajorCategories",
  "Promiscuity",
  "TruePositive",
  "TrueNegative",
  "FalsePositive",
  "FalseNegative",
  "CategoricalLevel5LowHigh",
  "CategoricalLevel7Probability",
];

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

function getUpperCammelCaseAsTitle(type) {
	if (type.substring(0, 3)=="DQ_")
		type=type.substring(3);
	var s=type.charAt(0);
	for (var i=1; i<type.length; i++) {
		if (type.charAt(i)<='Z' && (i+1<type.length || type.charAt(i)!='D' || type.charAt(i-1)<'1' || type.charAt(i-1)>'4'))
			s+=" "+type.charAt(i).toLowerCase()
		else	
			s+=type.charAt(i);
	}
	return s;
}

function editRecordChangesAsHTML(selections) {
	var cdns = [], i, e, esc;
	if (!selections)
		return "";
	esc = function (obj) {
		try {
			return String(JSON.stringify(obj, null, 2)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		} catch (err) {
			return "";
		}
	};
	if (selections.edited && selections.edited.length) {
		cdns.push("<div style='margin-top:0.4em;'><b>", DonaCadena({cat: "Registres editats", spa: "Registros editados", eng: "Edited records"}), "</b><ul style='margin:0.2em 0 0 1.2em;'>");
		for (i = 0; i < selections.edited.length; i++) {
			e = selections.edited[i];
			cdns.push("<li>#", (e.index != null ? e.index + 1 : "?"),
				"<details style='margin-top:0.2em;'><summary>", DonaCadena({cat: "Abans / després", spa: "Antes / después", eng: "Before / after"}), "</summary>",
				"<pre style='white-space:pre-wrap; font-size:11px; background:#f7f7f7; padding:0.4em;'>",
				DonaCadena({cat: "Abans", spa: "Antes", eng: "Before"}), ":\n", esc(e.before), "\n\n",
				DonaCadena({cat: "Després", spa: "Después", eng: "After"}), ":\n", esc(e.after),
				"</pre></details></li>");
		}
		cdns.push("</ul></div>");
	}
	if (selections.created && selections.created.length) {
		cdns.push("<div style='margin-top:0.4em;'><b>", DonaCadena({cat: "Registres creats", spa: "Registros creados", eng: "Created records"}), "</b><ul style='margin:0.2em 0 0 1.2em;'>");
		for (i = 0; i < selections.created.length; i++) {
			e = selections.created[i];
			cdns.push("<li>#", (e.index != null ? e.index + 1 : "?"),
				"<details style='margin-top:0.2em;'><summary>", DonaCadena({cat: "Contingut", spa: "Contenido", eng: "Content"}), "</summary>",
				"<pre style='white-space:pre-wrap; font-size:11px; background:#f7f7f7; padding:0.4em;'>", esc(e.after), "</pre></details></li>");
		}
		cdns.push("</ul></div>");
	}
	if (selections.deleted && selections.deleted.length) {
		cdns.push("<div style='margin-top:0.4em;'><b>", DonaCadena({cat: "Registres esborrats", spa: "Registros borrados", eng: "Deleted records"}), "</b><ul style='margin:0.2em 0 0 1.2em;'>");
		for (i = 0; i < selections.deleted.length; i++) {
			e = selections.deleted[i];
			cdns.push("<li>#", (e.index != null ? e.index + 1 : "?"),
				"<details style='margin-top:0.2em;'><summary>", DonaCadena({cat: "Contingut esborrat", spa: "Contenido borrado", eng: "Deleted content"}), "</summary>",
				"<pre style='white-space:pre-wrap; font-size:11px; background:#f7f7f7; padding:0.4em;'>", esc(e.before), "</pre></details></li>");
		}
		cdns.push("</ul></div>");
	}
	return cdns.join("");
}

function processStepPayloadForDisplay(step) {
	var payload = {}, key, skip = { tool: 1, label: 1, description: 1, selections: 1, at: 1, date: 1, branchSteps: 1 };
	if (!step || typeof step !== "object")
		return null;
	if (step.selections && typeof step.selections === "object")
		return step.selections;
	for (key in step) {
		if (Object.prototype.hasOwnProperty.call(step, key) && !skip[key])
			payload[key] = step[key];
	}
	return Object.keys(payload).length ? payload : null;
}

function escapeHTMLText(s) {
	return String(s == null ? "" : s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function lineageIndentPad(level) {
	return "<span style='display:inline-block; width:" + (level * 1.15) + "em;'></span>";
}

function formatLineageScalarText(value) {
	if (value === null)
		return "null";
	if (value === undefined)
		return "";
	if (typeof value === "boolean")
		return value ? "true" : "false";
	return String(value);
}

// Hierarchical text with keys (no { } [ ] quotes); nested values indented under their key.
function formatLineageValueHTML(value, level) {
	var keys, i, html, child, itemLabel;
	if (level == null)
		level = 0;
	if (value == null || typeof value !== "object")
		return "<span>" + escapeHTMLText(formatLineageScalarText(value)) + "</span>";
	if (Array.isArray(value)) {
		if (!value.length)
			return "<span style='color:#999;'>—</span>";
		html = "";
		for (i = 0; i < value.length; i++) {
			child = value[i];
			itemLabel = String(i + 1);
			if (i)
				html += "<br>";
			html += lineageIndentPad(level);
			if (child != null && typeof child === "object") {
				html += "<span style='color:#085; font-weight:600;'>" + escapeHTMLText(itemLabel) + "</span>";
				html += "<br>" + formatLineageValueHTML(child, level + 1);
			} else {
				html += "<span style='color:#085; font-weight:600;'>" + escapeHTMLText(itemLabel) + "</span>";
				html += "<span style='color:#666;'>: </span>";
				html += "<span>" + escapeHTMLText(formatLineageScalarText(child)) + "</span>";
			}
		}
		return html;
	}
	keys = Object.keys(value);
	if (!keys.length)
		return "<span style='color:#999;'>—</span>";
	html = "";
	for (i = 0; i < keys.length; i++) {
		child = value[keys[i]];
		if (i)
			html += "<br>";
		html += lineageIndentPad(level);
		html += "<span style='color:#085; font-weight:600;'>" + escapeHTMLText(keys[i]) + "</span>";
		if (child != null && typeof child === "object")
			html += "<br>" + formatLineageValueHTML(child, level + 1);
		else {
			html += "<span style='color:#666;'>: </span>";
			html += "<span>" + escapeHTMLText(formatLineageScalarText(child)) + "</span>";
		}
	}
	return html;
}

function lineageStepObjectForDisplay(step) {
	var obj = {}, key, skip = { label: 1, description: 1, selections: 1, at: 1, branchSteps: 1 };
	if (!step || typeof step !== "object")
		return null;
	if (step.tool != null) obj.tool = step.tool;
	if (step.date != null) obj.date = step.date;
	else if (step.at != null) obj.date = step.at;
	if (step.selections && typeof step.selections === "object") {
		for (key in step.selections) {
			if (Object.prototype.hasOwnProperty.call(step.selections, key))
				obj[key] = step.selections[key];
		}
	}
	for (key in step) {
		if (Object.prototype.hasOwnProperty.call(step, key) && !skip[key] && key !== "tool" && key !== "date")
			obj[key] = step[key];
	}
	return obj;
}

function lineageToolTitle(step) {
	var tool = step && step.tool ? step.tool : "";
	var label;
	if (step && step.label)
		return DonaCadena(step.label);
	if (typeof GetProcessToolLabel === "function" && tool) {
		label = GetProcessToolLabel(tool + ".png");
		if (label)
			return DonaCadena(label);
	}
	return tool || DonaCadena({cat: "Pas", spa: "Paso", eng: "Step"});
}

function lineageStepSummary(step) {
	var payload, summary;
	if (!step)
		return "";
	if (step.description)
		return step.description;
	payload = processStepPayloadForDisplay(step);
	if (typeof ProcessSelectionsSummary === "function" && step.tool)
		summary = ProcessSelectionsSummary(step.tool + ".png", payload || step.selections || {});
	return summary || "";
}

function processMetadataAsHTML(process) {
	var cdns = [], steps, i, step, label, payload;
	if (!process || !process.steps || !process.steps.length)
		return "";
	steps = process.steps;
	cdns.push("<section style='margin:0 0 1em 0;'>");
	cdns.push("<h2 style='margin:0 0 0.55em 0; font-size:1.15em; border-bottom:1px solid #ddd; padding-bottom:0.25em;'>",
		DonaCadena({cat: "Llinatge de dades", spa: "Linaje de datos", eng: "Data lineage"}),
		" <small style='color:#777; font-weight:normal;'>(", steps.length, " ",
		DonaCadena({cat: "passos", spa: "pasos", eng: "steps"}), ")</small></h2>");
	cdns.push("<ol style='list-style:none; padding:0; margin:0; counter-reset: lineage-step;'>");
	for (i = 0; i < steps.length; i++) {
		step = steps[i];
		label = lineageToolTitle(step);
		payload = lineageStepObjectForDisplay(step);
		cdns.push("<li style='counter-increment: lineage-step; margin:0 0 0.75em 0; padding:0.7em 0.8em 0.7em 2.4em; background:#fafafa; border:1px solid #e5e5e5; border-radius:8px; position:relative;'>");
		cdns.push("<span style='position:absolute; left:0.55em; top:0.7em; width:1.5em; height:1.5em; border-radius:50%; background:#555; color:#fff; font-size:0.85em; display:inline-flex; align-items:center; justify-content:center;'>", (i + 1), "</span>");
		cdns.push("<div style='font-weight:700; font-size:1.02em; margin-bottom:0.45em;'>", escapeHTMLText(label), "</div>");
		if (payload)
			cdns.push("<div style='font-family: Consolas, Monaco, monospace; font-size:12px; line-height:1.45; background:#fff; border:1px solid #eee; border-radius:6px; padding:0.55em 0.7em; overflow:auto;'>",
				formatLineageValueHTML(payload, 0), "</div>");
		if (step.tool === "EditRecord")
			cdns.push(editRecordChangesAsHTML(step.selections || step));
		if (step.branchSteps && step.branchSteps.length) {
			cdns.push("<div style='margin-top:0.5em;'>");
			cdns.push("<div style='font-weight:600; margin-bottom:0.25em; color:#085;'>branchSteps</div>");
			cdns.push("<div style='font-family: Consolas, Monaco, monospace; font-size:12px; line-height:1.45; background:#fff; border:1px solid #eee; border-radius:6px; padding:0.55em 0.7em; overflow:auto;'>");
			cdns.push(formatLineageValueHTML(step.branchSteps.map(function (br) {
				return lineageStepObjectForDisplay(br) || { tool: br.tool };
			}), 0));
			cdns.push("</div></div>");
		}
		cdns.push("</li>");
	}
	cdns.push("</ol></section>");
	return cdns.join("");
}

function qualityParamsToObject(params) {
	var obj = {}, i;
	if (!params || !params.length)
		return obj;
	for (i = 0; i < params.length; i++) {
		if (params[i] && params[i].name != null)
			obj[params[i].name] = params[i].value;
	}
	return obj;
}

function qualityReportObjectForDisplay(report) {
	var obj = {}, domains, domainObj, results, resultObj, metric, values, d, rr;
	if (!report)
		return null;
	if (report.type)
		obj.type = getUpperCammelCaseAsTitle(report.type);
	if (report.measureIdentification) {
		if (report.measureIdentification.code)
			obj.measure = getUpperCammelCaseAsTitle(report.measureIdentification.code);
		domains = report.measureIdentification.domains;
		if (domains && domains.length) {
			if (domains.length === 1) {
				domainObj = { name: getUpperCammelCaseAsTitle(domains[0].name) };
				Object.assign(domainObj, qualityParamsToObject(domains[0].params));
				obj.domain = domainObj;
			} else {
				obj.domains = [];
				for (d = 0; d < domains.length; d++) {
					domainObj = { name: getUpperCammelCaseAsTitle(domains[d].name) };
					Object.assign(domainObj, qualityParamsToObject(domains[d].params));
					obj.domains.push(domainObj);
				}
			}
		}
		if (report.results && report.results.length) {
			results = [];
			for (rr = 0; rr < report.results.length; rr++) {
				resultObj = {};
				if (report.results[rr].errorStatistic && report.results[rr].errorStatistic.metric && report.results[rr].errorStatistic.metric.name) {
					metric = report.results[rr].errorStatistic.metric;
					resultObj.metric = getUpperCammelCaseAsTitle(metric.name);
					Object.assign(resultObj, qualityParamsToObject(metric.params));
				} else if (report.results[rr].type)
					resultObj.resultType = report.results[rr].type;
				values = report.results[rr].values;
				if (values && values.length) {
					if (values.length === 1)
						resultObj.value = values[0];
					else
						resultObj.values = values.slice();
				}
				results.push(resultObj);
			}
			if (results.length === 1)
				obj.result = results[0];
			else if (results.length)
				obj.results = results;
		}
	}
	return obj;
}

function qualityReportLinksHTML(report, q, r) {
	var cdns = [], d, rr, metric;
	if (!report || !report.measureIdentification)
		return "";
	if (report.measureIdentification.code && qualityMLMeasures.includes(report.measureIdentification.code))
		cdns.push("<span style='margin-right:0.6em;'>",
			DonaCadena({cat: "Mesura", spa: "Medida", eng: "Measure"}),
			UnfoldButtonIFrame("ShowQualitat_q" + q + "_r" + r, RootURLQualityML + "1.0/measure/" + report.measureIdentification.code),
			"</span>");
	if (report.measureIdentification.domains) {
		for (d = 0; d < report.measureIdentification.domains.length; d++) {
			if (qualityMLDomains.includes(report.measureIdentification.domains[d].name))
				cdns.push("<span style='margin-right:0.6em;'>",
					DonaCadena({cat: "Domini", spa: "Dominio", eng: "Domain"}),
					UnfoldButtonIFrame("ShowQualitat_q" + q + "_r" + r + "_d" + d, RootURLQualityML + "1.0/domain/" + report.measureIdentification.domains[d].name),
					"</span>");
		}
	}
	if (report.results) {
		for (rr = 0; rr < report.results.length; rr++) {
			if (report.results[rr].errorStatistic && report.results[rr].errorStatistic.metric) {
				metric = report.results[rr].errorStatistic.metric;
				if (metric.name && qualityMLMetrics.includes(metric.name))
					cdns.push("<span style='margin-right:0.6em;'>",
						DonaCadena({cat: "Mètrica", spa: "Métrica", eng: "Metric"}),
						UnfoldButtonIFrame("ShowQualitat_q" + q + "_r" + r + "_rr" + rr, RootURLQualityML + "1.0/metrics/" + metric.name),
						"</span>");
			}
		}
	}
	return cdns.length ? ("<div style='margin:0.2em 0 0.45em 0; font-size:0.85em; color:#555;'>" + cdns.join("") + "</div>") : "";
}

function dataQualityInfosAsHTML(dataQualityInfos) {
	var cdns = [], q, r, report, payload, n = 0, idx;
	if (!dataQualityInfos || !dataQualityInfos.length)
		return "";
	for (q = 0; q < dataQualityInfos.length; q++) {
		if (dataQualityInfos[q].reports)
			n += dataQualityInfos[q].reports.length;
	}
	cdns.push("<section style='margin:1.1em 0 0 0; padding-top:0.85em; border-top:2px solid #c5d4e0;'>");
	cdns.push("<h2 style='margin:0 0 0.55em 0; font-size:1.15em; border-bottom:1px solid #c5d4e0; padding-bottom:0.25em; color:#1f4e79;'>",
		DonaCadena({cat: "Qualitat de les dades", spa: "Calidad de los datos", eng: "Data quality"}),
		" <small style='color:#5a7a9a; font-weight:normal;'>(", n, ")</small></h2>");
	cdns.push("<ol style='list-style:none; padding:0; margin:0;'>");
	idx = 0;
	for (q = 0; q < dataQualityInfos.length; q++) {
		if (!dataQualityInfos[q].reports)
			continue;
		for (r = 0; r < dataQualityInfos[q].reports.length; r++) {
			report = dataQualityInfos[q].reports[r];
			payload = qualityReportObjectForDisplay(report);
			idx++;
			cdns.push("<li style='margin:0 0 0.75em 0; padding:0.7em 0.8em 0.7em 2.4em; background:#f4f8fb; border:1px solid #c5d4e0; border-left:4px solid #2a6fad; border-radius:8px; position:relative;'>");
			cdns.push("<span style='position:absolute; left:0.55em; top:0.7em; width:1.5em; height:1.5em; border-radius:50%; background:#2a6fad; color:#fff; font-size:0.78em; display:inline-flex; align-items:center; justify-content:center;'>Q", idx, "</span>");
			cdns.push("<div style='font-weight:700; font-size:1.02em; margin-bottom:0.2em; color:#1f4e79;'>",
				escapeHTMLText(payload && payload.type ? payload.type : DonaCadena({cat: "Informe de qualitat", spa: "Informe de calidad", eng: "Quality report"})),
				"</div>");
			cdns.push(qualityReportLinksHTML(report, q, r));
			if (payload)
				cdns.push("<div style='font-family: Consolas, Monaco, monospace; font-size:12px; line-height:1.45; background:#fff; border:1px solid #d7e3ee; border-radius:6px; padding:0.55em 0.7em; overflow:auto;'>",
					formatLineageValueHTML(payload, 0), "</div>");
			cdns.push("</li>");
		}
	}
	cdns.push("</ol></section>");
	return cdns.join("");
}

function metadataAsHTML(metadata) {
	var cdns = [];
	if (!metadata)
		return "";
	if (metadata.dataLineage)
		cdns.push(processMetadataAsHTML(metadata.dataLineage));
	if (metadata.dataQualityInfos && metadata.dataQualityInfos.length)
		cdns.push(dataQualityInfosAsHTML(metadata.dataQualityInfos));
	if (!cdns.length)
		cdns.push("<p style='color:#666;'>", DonaCadena({cat: "Aquest node encara no té metadades de llinatge ni de qualitat.", spa: "Este nodo aún no tiene metadatos de linaje ni de calidad.", eng: "This node has no lineage or quality metadata yet."}), "</p>");
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
	

    groupingObject.MeanLong=longitudeMean;
    groupingObject.MeanLat= latitudeMean;
    groupingObject.RMSE= RMSE.toPrecision(3);
}

function accuracyFromUncertaintyThematicQuality(data, metadata, uncertaintyAttribute) {
	return accuracyFromUncertaintyQuality(data, metadata, uncertaintyAttribute, "DQ_QuantitativeAttributeAccuracy", "DifferentialErrors1D", "Thematic uncertanty column", "MeanAbsolute");
}

function accuracyFromAlfaNumValuesInThematicQuality (data, metadata, thematicAttributeSelected, grouped,  newColumns){
	
	var groupingGroupsObject=createObjectWithDifferentPossibilitiesInColumnsInQualityThematicAlfaNum(data, grouped,thematicAttributeSelected);

	if (newColumns){
		 for (var g=0;g<data.length;g++){
            data[g]["percentageIngroup"]= groupingGroupsObject[data[g][grouped]].values[data[g][thematicAttributeSelected]];
			data[g]["groupMode"]=groupingGroupsObject[data[g][grouped]].mode;        
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
					"type": "DQ_NonQuantitativeAttributeAccuracy",
					"measureIdentification": {
						"code": "ModePercentage", 
						"domains": [
							{
								"name": "CategoricalCorrespondance",
								"params": [
										{
										"name": "column",
										"value":thematicAttributeSelected
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
											"value": 0.683
										}
									]
								}
							},
							"valueType": "number",
							"values":globalAccuracyValue 
						}
					]
				}
			]
		});
		return {"accuracyValue":globalAccuracyValue};
}

function createObjectWithDifferentPossibilitiesInColumnsInQualityThematicAlfaNum(data,groupingColumn, valuesColumn){
	SortTableByColumns(data, [groupingColumn], "asc");

	var groupingGroupsObject={};
	var currentGroupName;
	
	for (var i=0;i<data.length;i++){	
		if (groupingColumn)currentGroupName= data[i][groupingColumn];
		else currentGroupName= "all"
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

function accuracyFromNumValuesInThematicQuality (data, metadata, thematicAttributeSelected, grouped, newColumns){
	var attributes = getDataAttributes(data); 
	if (attributes[thematicAttributeSelected].type != "integer" && attributes[thematicAttributeSelected].type != "number") return null;
	var groupingGroupsObject=createObjectWithDifferentPossibilitiesInColumnsInQualityThematicNum(data, grouped,thematicAttributeSelected)
		if (newColumns){
		 for (var g=0;g<data.length;g++){
            data[g]["groupUncertainty"]= groupingGroupsObject[data[g][grouped]].groupUncertainty;   
        }
	}

	var uncertainties=[];
	var groupingGroupsObjectKeys= Object.keys(groupingGroupsObject)
	for (var i=0; i<groupingGroupsObjectKeys.length; i++){
		uncertainties.push(groupingGroupsObject[groupingGroupsObjectKeys[i]].groupUncertainty);
	}
	var accuracyValue=(uncertainties.length==1)?uncertainties[0]:aggrFuncMean(uncertainties); 

	if (!metadata.dataQualityInfos)metadata.dataQualityInfos=[];

	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_QuantitativeAttributeAccuracy",
					"measureIdentification": {
						"code": "RootMeanSquare", 
						"domains": [
							{
								"name": "RootMeanSquareError2D",
								"params": [
										{
										"name": "column",
										"value":thematicAttributeSelected
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
											"value": 0.683
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
	return {"accuracyValue":accuracyValue};
}

function createObjectWithDifferentPossibilitiesInColumnsInQualityThematicNum(data,groupingColumn, valuesColumn){
	SortTableByColumns(data, [groupingColumn], "asc");

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
		obj[objKeys[a]]= (Number.isInteger(obj[objKeys[a]]/sum *100))?obj[objKeys[a]]/sum *100:(obj[objKeys[a]]/sum *100);
	}

	mode= (Number.isInteger(mode/sum *100))?mode/sum *100:(mode/sum *100);
	return mode
}


function calculateDesVestInObject(obj){
	var sum=0, mean, sumSquaredDistances=0; 

	for (var i=0;i<obj.values.length;i++){
		sum+=obj.values[i]
	}
	mean= sum/obj.values.length;

	for (var e=0;e<obj.values.length;e++){
		sumSquaredDistances+= (obj.values[e]-mean)**2;
	}
	obj.groupUncertainty= Math.sqrt(sumSquaredDistances/obj.values.length);
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
		if(flag)dataToEvaluate[a]["thematicValidity"]=itsValid
	}
	if (!metadata.dataQualityInfos)	metadata.dataQualityInfos=[];
	metadata.dataQualityInfos.push(
		{
			"reports": [
				{
					"type": "DQ_ThematicValidity",
					"measureIdentification": {
						"code": "ValueDomain",
						"domains": [
							{
								"name": "Conformance",
								"params":[ {
									"name": "reference column",
									"value":referenceAttribute 
									},
									{
									"name": "assess column",
									"value":attributeToEvaluate 
									}]
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
    return {"trueThematicValidity":count, "thematicValidityRate":(count / dataToEvaluate.length) * 100 };

}

function calculateDataQualityThematicValidityWithRange(data,from, to,  metadata, thematicAttributeSelected,flag){
	//Mirar si es numero la clumna e vaors triat
	if (!from && !to)return DonaCadena({cat: "Cal indicar un número d'inici o de final", spa: "Es necesario indicar un número de inicio o de fin", eng: "It is necessary to indicate a from or to number"}); 
	if (from) {
		var fromNumber= Number(from);
		if (isNaN(fromNumber)) return DonaCadena({cat: "El valor \"From\" no és un número", spa: "El valor \"From\" no es un número", eng: "\"From\" value is not a number"}); 
	}
	if (to) {
		var toNumber= Number(to);
		if (isNaN(toNumber)) return DonaCadena({cat: "El valor \"To\" no és un número", spa: "El valor \"To\" no es un número", eng: "\"To\" value is not a number"}); 
	}
	var count=0;
	for (var i=0; i<data.length;i++){
		if (from){
			if (data[i][thematicAttributeSelected]>from){
				if (to){
					if (data[i][thematicAttributeSelected]<to){
						count++;
						if(flag)data[i]["thematicValidity"]=true;
					}else{
						if(flag)data[i]["thematicValidity"]=false;
					}
				}
			}
			continue;
		}
		if (to){
			if (data[i][thematicAttributeSelected]<to){
				count++
				if(flag)data[i]["thematicValidity"]=true;
			}else{
				if(flag)data[i]["thematicValidity"]=false;
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
						"code": "ValueDomain",
						"domains": [
							{
								"name": "Conformance",
								"params": [ {
									"name": "column",
									"value":thematicAttributeSelected 
									},
									{
									"name": "min value",
									"value":from 
									},
									{
									"name": "max value",
									"value":to 
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
    return {"trueThematicValidity":count, "thematicValidityRate":(count / data.length) * 100 };

}
function calculateDataQualityMisclassificationMatrix(data, metadata, classifiedReferencedAttributes, confusionMatrixResult) {
	var confusionMatrix = {}, classified, reference, categoriesClassification=[], categoriesReference=[];
	for (var a = 0; a < data.length; a++) {
		for (var e = 0; e<classifiedReferencedAttributes.classified.length; e++) {
			//build attributes
			if (e == 0) {
				classified = data[a][classifiedReferencedAttributes.classified[e]];
				reference = data[a][classifiedReferencedAttributes.reference[e]];
			} else {
				classified += "-" + data[a][classifiedReferencedAttributes.classified[e]];
				reference += "-" + data[a][classifiedReferencedAttributes.reference[e]];
			}
			//add to matrix
			if (e == classifiedReferencedAttributes.classified.length - 1) {

				if (Object.hasOwn(confusionMatrix, classified)) {
					if (Object.hasOwn(confusionMatrix[classified], reference)) {
						confusionMatrix[classified][reference] += 1;
					} else {
						confusionMatrix[classified][reference] = 1;
					}
				} else {
					confusionMatrix[classified] = {};
					confusionMatrix[classified][reference] = 1;
				}
			}
			if (e==classifiedReferencedAttributes.classified.length-1){
				if(!categoriesClassification.includes(classified))categoriesClassification.push(classified);
				if(!categoriesReference.includes(reference))categoriesReference.push(reference);
			}

		}
	}
	//All categories together to add classification and references categories. To calculate index Kappa is necessary to have it all. 
	var allCategories= [...new Set([...categoriesClassification,...categoriesReference])];
	//If a classified doesn't exist in reference or other way round:
	for (var f=0;f<allCategories.length;f++){
		if (!Object.hasOwn(confusionMatrix, allCategories[f]))confusionMatrix[allCategories[f]]={};
		for(var g=0;g<allCategories.length;g++){
			if (!Object.hasOwn(confusionMatrix[allCategories[f]], allCategories[g]))confusionMatrix[allCategories[f]][allCategories[g]]=0;
		}
	}


	//matrix
	var matrix=[], rows;
	for (var r=0;r<allCategories.length;r++){
		rows=[];
		for (var s=0;s<allCategories.length;s++){
			rows.push(confusionMatrix[allCategories[r]][allCategories[s]])
		}
		matrix.push(rows)
	}
	var valuesInMetadata=  [{"rows": allCategories, "columns": allCategories, "matrix": matrix}];
	


	//calculate  totalClassified, totalReference, wellClassified
	confusionMatrixResult.totalSamples= data.length;
	confusionMatrixResult.matrix = valuesInMetadata;
	var classificationKeys= Object.keys(confusionMatrix);
	var referenceKeys, totalClassified={}, totalReference={},wellClassified={} ;
	for (var i=0;i<classificationKeys.length;i++){ //same keys as confusionmatrix
		referenceKeys= Object.keys(confusionMatrix[classificationKeys[i]]);
		totalClassified[classificationKeys[i]]=0
		wellClassified[classificationKeys[i]] = 0; //it is possible to have empty cathegories
		for (var u=0;u<referenceKeys.length;u++){
			totalClassified[classificationKeys[i]]+=confusionMatrix[classificationKeys[i]][referenceKeys[u]];
			if(Object.hasOwn(totalReference, referenceKeys[u]))totalReference[referenceKeys[u]]+=confusionMatrix[classificationKeys[i]][referenceKeys[u]]
			else totalReference[referenceKeys[u]]=confusionMatrix[classificationKeys[i]][referenceKeys[u]];
			if(classificationKeys[i]==referenceKeys[u])wellClassified[classificationKeys[i]]= confusionMatrix[classificationKeys[i]][referenceKeys[u]]
		}
	}
	confusionMatrixResult.totalClassified=totalClassified;
	confusionMatrixResult.totalReference=totalReference;
	confusionMatrixResult.wellClassified=wellClassified;
	var wellClassifiedKeys=Object.keys(wellClassified);
	var numberOfWellClassified=0;
	var producerAccuracy={}, producerAccuracyValue, userAccuracy={},userAccuracyValue, omissionError={},comissionError={};
	for (var b=0;b<wellClassifiedKeys.length;b++){
		numberOfWellClassified+=wellClassified[wellClassifiedKeys[b]];
		//producerAccuracy
		producerAccuracyValue= wellClassified[wellClassifiedKeys[b]]/totalReference[wellClassifiedKeys[b]]
		producerAccuracy[wellClassifiedKeys[b]]= producerAccuracyValue;
		omissionError[wellClassifiedKeys[b]]= 1- producerAccuracyValue;
		//UserAccuracy
		userAccuracyValue= wellClassified[wellClassifiedKeys[b]]/totalClassified[wellClassifiedKeys[b]];
		userAccuracy[wellClassifiedKeys[b]]= userAccuracyValue;
		comissionError[wellClassifiedKeys[b]]= 1-userAccuracyValue;

	}
	confusionMatrixResult.numberOfWellClassified=numberOfWellClassified;
	confusionMatrixResult.producerAccuracy=producerAccuracy;
	confusionMatrixResult.userAccuracy=userAccuracy;
	confusionMatrixResult.omissionError=omissionError;
	confusionMatrixResult.comissionError=comissionError;
	confusionMatrixResult.overallAccuracy= numberOfWellClassified/confusionMatrixResult.totalSamples;
	confusionMatrixResult.overallError= 1-confusionMatrixResult.overallAccuracy;
	confusionMatrixResult.indexKappa={}
	confusionMatrixResult.indexKappa.observedAgreement= numberOfWellClassified/confusionMatrixResult.totalSamples;
	var totalClassified_totalReference_product=0;

	var totalClassified_totalReference_keys= [...new Set([ ...Object.keys(totalClassified), ...Object.keys(totalReference)])]
	
	for(var d=0;d<totalClassified_totalReference_keys.length;d++){
				totalClassified_totalReference_product+=totalClassified[totalClassified_totalReference_keys[d]] * totalReference[totalClassified_totalReference_keys[d]]
 			if(Number.isNaN(totalClassified_totalReference_product))debugger
	}
	confusionMatrixResult.indexKappa.expectedAgreement= totalClassified_totalReference_product/confusionMatrixResult.totalSamples**2;
	confusionMatrixResult.indexKappa.result= (confusionMatrixResult.indexKappa.observedAgreement-confusionMatrixResult.indexKappa.expectedAgreement)/(1-confusionMatrixResult.indexKappa.expectedAgreement);
	
	if (!metadata.dataQualityInfos)	metadata.dataQualityInfos=[];
		metadata.dataQualityInfos.push(
			{
				"reports": [
					{
					"type": "DQ_ThematicClassificationCorrectness",
					"measureIdentification": {
						"code": "Misclassification",
						"domains": [
						{
							"name": "PredictedValues",
							"params": [
								{
									"name": "classified attribute",
									"value": classified
								},
								{
									"name": "reference attribute",
									"value": reference
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
							"name": "ConfusionMatrix",
							"params": [
								{
								"name": "subtype",
								"value": "matrix"
								}
							]
							}
						},

						"valueType": "matrix",

						"values": [
							JSON.stringify(valuesInMetadata)
						],

						"derivedResults": {
							"overallAccuracy": confusionMatrixResult.overallAccuracy,
							"overallError": confusionMatrixResult.overallError,

							"kappa": {
								"value": confusionMatrixResult.indexKappa.result,
								"observedAgreement": confusionMatrixResult.indexKappa.observedAgreement,
								"expectedAgreement": confusionMatrixResult.indexKappa.expectedAgreement
							},

							"producerAccuracy": confusionMatrixResult.producerAccuracy,
							"userAccuracy": confusionMatrixResult.userAccuracy,

							"omissionError": confusionMatrixResult.omissionError,
							"commissionError": confusionMatrixResult.comissionError
						}
						}
					]
					}
				]
				})





	return confusionMatrixResult;


}



