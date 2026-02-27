/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023-2025 Joan Masó

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


const AggregationsOptions=[{name: "Mean", desc: "Mean", definition: "https://statproofbook.github.io/D/mean-samp"},
					 {name: "Mode", desc: "Mode", definition: "https://statproofbook.github.io/D/mode"},
					 {name: "FirstValue", desc: "First value"},
					 {name: "Median", desc: "Median", definition: "https://statproofbook.github.io/D/med"},
					 {name: "StandardDeviation", desc: "Standard deviation", definition: "https://statproofbook.github.io/D/std-samp"},
					 {name: "LastValue", desc: "Last value"},
					 {name: "Q1", desc: "Q1"},
					 {name: "Variance", desc: "Variance", definition: "https://statproofbook.github.io/D/var-samp"},
					 {name: "RandomValue", desc: "Random value"},
					 {name: "Q3", desc: "Q3"},
					 {name: "Sum", desc: "Sum"},
					 {name: "CountDefined", desc: "Count defined"},
					 {name: "MinValue", desc: "Min. Value", definition: "https://statproofbook.github.io/D/min"},
					 {name: "Concatenate", desc: "Concatenate"},
					 {name: "Count", desc: "Count", definition: "https://statproofbook.github.io/D/samp-size"},
					 {name: "MaxValue", desc: "Max. value", definition: "https://statproofbook.github.io/D/max"},
					 {name: "Range", desc: "Range"},
					 {name: "ProportionDefined", desc: "Proportion defined"}]; 
const GroupByDateTimeOptions=[{name: "Year", desc: "Year"},
					 {name: "Month", desc: "Month"},
					 {name: "Day", desc: "Day"},
					 {name: "Hour", desc: "Hour"},
					 {name: "Minute", desc: "Minute"},
					 {name: "Second", desc: "Second"}]; 

const AggregationColumnsOptions=[{name: "Mean", desc: "Mean"},
	{name: "Mode", desc: "Mode"},
	{name: "FirstValue", desc: "First value"},
	{name: "Median", desc: "Median"},
	{name: "StandardDeviation", desc: "Standard deviation"},
	{name: "LastValue", desc: "Last value"},
	{name: "Q1", desc: "Q1"},
	{name: "Variance", desc: "Variance"},
	{name: "RandomValue", desc: "Random value"},
	{name: "Q3", desc: "Q3"},
	{name: "Sum", desc: "Sum"},
	{name: "CountDefined", desc: "Count defined"},
	{name: "MinValue", desc: "Min. Value"},
	{name: "Product", desc: "Product"},
	{name: "Concatenate", desc: "Concatenate"},
	//{name: "Count", desc: "Count"},
	{name: "MaxValue", desc: "Max. value"},
	{name: "Range", desc: "Range"},
	{name: "ProportionDefined", desc: "Proportion defined"}	
]; 

/*All these functions DO NOT support an array null or will zero elements or with undefined or null element. That is why "CountDefined" and "ProportionDefined" are not defined
  All these functions EXCEPT "Concatenate", "Mode", "Median", "Q1" and "Q3" expect an array of numbers*/

function aggrFuncMean(values){
var r=0, n=values.length;
	for (var i=0; i<n; i++)
		r+=values[i];
	return r/n;
}

//Returns an array of modal values
function aggrFuncModes(values) {
	var summaryOfData={}, n=values.length;     //Object. Every key is a value, every value of the key is the number of repetitions

	for (var i=0; i<n; i++) { //creating summaryOfData object
		if (summaryOfData[values[i]])
			summaryOfData[values[i]]++;
		else   //First appearance
			summaryOfData[values[i]]=1;
	}

	var max=0, numberValueArray=[];  //[value of mode], one or more
	var objectKeys=Object.keys(summaryOfData); //every key is a different value from values
	var nObjectKeys=objectKeys.length;

	for (var a=0; a<nObjectKeys; a++) { //Searching for the max number of repetitions
		if (summaryOfData[objectKeys[a]]>max)
			max = summaryOfData[objectKeys[a]]; //update number max
	}
	for (a=0; a<nObjectKeys; a++) { //Searching values with max repetitions
		if (summaryOfData[objectKeys[a]]==max) {
			if (typeof objectKeys[a] === 'string' && !isNaN(objectKeys[a]))
				numberValueArray.push(parseFloat(objectKeys[a]));
			else
				numberValueArray.push(objectKeys[a]);
		}
	}
	return numberValueArray;  //One value or more, always in a array;
}

//return a modal values. If there are more than one it selects one randomly (avoiding returning always the first)
function aggrFuncMode(values) { 
	return aggrFuncRandomValue(aggrFuncModes(values));
}

function aggrFuncFirstValue(values){
	return values[0];
}

function aggrFuncCoefficientOfVariation (values){ 
	return aggrFuncStandardDeviation(values)/aggrFuncMean(values);
}

function aggrFuncMedian(values) {
	var n = values.length;
	var middleNumber;
	var sortedValues = values.sort((a, b) => a - b);

	if (n%2) 
		return sortedValues[(n+1)/2-1];
	middleNumber = n / 2;
	return (sortedValues[middleNumber - 1] + sortedValues[middleNumber]) / 2
}

function aggrFuncStandardDeviation(values){
	if(values.length<=1)return  0; //If you use it automatically and is one value it fails. 
	return Math.sqrt(aggrFuncVariance(values));
}

function aggrFuncLastValue(values){
	return values[values.length-1];
}

function aggrFuncQ1(values) {
	var medianaPosition,numbersPerSite;
	var valuesSorted = values.sort((a, b) => a - b);

	if (valuesSorted.length%2) {
		medianaPosition = (valuesSorted.length + 1) / 2;
		if (medianaPosition% 2){//if number is odd, every side has an even number of digits
			numbersPerSite = medianaPosition - 1 - (medianaPosition -1)/2;
			return (valuesSorted[numbersPerSite - 1] + valuesSorted[numbersPerSite])/2;
		}
		return valuesSorted[medianaPosition - medianaPosition / 2 - 1];  ////if number is even, every side has an odd number of digits
	}
	medianaPosition = valuesSorted.length/2;	  
	if (medianaPosition%2) 
		return valuesSorted[medianaPosition - (medianaPosition-1) / 2 - 1];  //Every side has numberPerSite -1 numbers     
	//even
	numbersPerSite = medianaPosition - medianaPosition / 2;
	return (valuesSorted[numbersPerSite - 1] + valuesSorted[numbersPerSite])/2;
}

function aggrFuncQ3(values) {
	var medianaPosition,numbersPerSite;
	var valuesSorted = values.sort((a, b) => a - b);

	if (valuesSorted.length % 2) {
        	medianaPosition = (valuesSorted.length + 1) / 2;
        	if (medianaPosition % 2) {//if number is odd, every side has an even number of digits
			numbersPerSite = medianaPosition + (medianaPosition - 1) / 2;
			return (valuesSorted[numbersPerSite - 1] + valuesSorted[numbersPerSite]) / 2;
        	}
		return valuesSorted[medianaPosition + medianaPosition / 2 - 1];  //if number is even, every side has an odd number of digits
	}
        medianaPosition = valuesSorted.length / 2;
        if (medianaPosition % 2) //odd
		return valuesSorted[medianaPosition + (medianaPosition + 1) / 2 - 1]; //Every side has numberPerSite -1 numbers
	numbersPerSite = medianaPosition + medianaPosition / 2;
	return (valuesSorted[numbersPerSite - 1] + valuesSorted[numbersPerSite]) / 2;
}

function aggrFuncVariance(values){
	var mean= aggrFuncMean(values);
	var sum=0, value, n=values.length;

	for (var i=0; i<n; i++){
		value= values[i]-mean;
		sum+=value*value;
	}
	return sum/(n-1);
}

function aggrFuncRandomValue(values) {
	if (values.length==1)
		return values[0];
	return values[Math.floor(Math.random() * values.length)];
}



function aggrFuncSum(values){
var r=0, n=values.length;
	for (var i=0; i<n; i++)
		r+=values[i];
	return r;
}

/*function aggrFuncCountDefined(values){
}*/

function aggrFuncMinValue(values){
var r=values[0], n=values.length;
	for (var i=1; i<n; i++) {
		if (r>values[i])
			r=values[i];
	}
	return r
}

function aggrFuncConcatenate(values){
var r="", n=values.length;
	for (var i=0; i<n; i++) {
		r+=values[i]+" ";
	}
	return r.slice(0, -1);  //remove last character
}

function aggrFuncCount(values){
	return values.length;
}

function aggrFuncMaxValue(values){
var r=values[0], n=values.length;
	for (var i=1; i<n; i++) {
		if (r<values[i])
			r=values[i];
	}
	return r;
}

function aggrFuncRange(values){
var r_max,r_min, n=values.length;

	r_max=r_min=values[0];
	for (var i=1; i<n; i++) {
		if (r_min>values[i])
			r_min=values[i];
		else if (r_max<values[i])
			r_max=values[i];
	}
	return r_max-r_min;
}

/*function aggrFuncProportionDefined(values){
}*/

///-----


//Values are an array of {x: y:} The funcion assumes a linear equation y=ax+b
function linearRegressionFunc(values){
var n=values.length, sx=0, sy=0, sxx=0, sxy=0, syy=0, value;
	for (var i=0; i<n; i++) {
		value=values[i];
		sx+=value.x;
		sxx+=value.x*value.x;
		sy+=value.y;
		syy+=value.y*value.y;
		sxy+=value.x*value.y;		
	}
	var nsxx_sxsx=n*sxx-sx*sx;
	var nsxy_sxsy=n*sxy-sx*sy;
	var a=nsxy_sxsy/nsxx_sxsx;
	return {a: a, 
		b: sy/n-a*sx/n, 
		r: nsxy_sxsy/Math.sqrt(nsxx_sxsx*(n*syy-sy*sy))};
}
