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


//https://csvw.org/
//https://w3c.github.io/csvw/metadata/#dialect-descriptions
function createCSVW(data, dataAttributesInput, delimiter) {
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

		if (dataAttribute.UoM || dataAttribute.UoMSymbol || dataAttribute.UoMDefinition)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]={};
		if (dataAttribute.UoMDefinition)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["@id"]=dataAttribute.UoMDefinition;
		if (dataAttribute.UoM)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["rdfs:label"]=dataAttribute.UoM;
		if (dataAttribute.UoMSymbol)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["http://qudt.org/schema/qudt#symbol"]=dataAttribute.UoMSymbol;

		/*if (dataAttribute.UoM)
			c.unitMeasureTitles=dataAttribute.UoM;
		if (dataAttribute.UoMSymbol)
			c.unitMeasureSymbol=dataAttribute.UoMSymbol;
		if (dataAttribute.UoMDefinition)
			c.unitMeasureUrl=dataAttribute.UoMDefinition;*/
	}
	return csvw;
}

function getDataAttributesCSVW(csvw){
	var dataAttributes = {}, c;
	for (var a = 0; a < csvw.tableSchema.columns.length; a++) {
		c=csvw.tableSchema.columns[a];
		dataAttributes[c.name]={
			"type": getAttributeTypeFromCSVWType(c.datatype),
			"description": (c.titles && typeof c.titles==="object") ? c.titles[Object.keys(c.titles)[0]] : c.titles,
			"definition": c.propertyUrl,
			"UoM": (c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"] && c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["@id"]) ? c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["@id"] : (c.unitMeasureTitles && typeof c.unitMeasureTitles === "object") ? c.unitMeasureTitles[Object.keys(c.unitMeasureTitles)[0]] : c.unitMeasureTitles,
			"UoMSymbol": (c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"] && c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["http://qudt.org/schema/qudt#symbol"]) ? c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["http://qudt.org/schema/qudt#symbol"] : c.unitMeasureSymbol,
			"UoMDefinition": (c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"] && c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["rdfs:label"]) ? c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["rdfs:label"] : c.unitMeasureUrl
		};
	}
	return dataAttributes;
}

function getCSVWTypeFromAttributeType(t)
{
	if (t=="array" || t=="null" || t=="object" || t=="undefined")
		return "json";
	if (t=="number")
		return "float";
	if (t=="isodatetime")
		return "date";
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

function getCSVReadParams(csvw){
	return csvw.dialect;
}
