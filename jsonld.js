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

dataTable is an array of records, each on being an object of key and value pairs.
Normaly, the same keys are present in every record, but this is
not required. values are not restricted being numbers, strings or 
objects. See a json schema and examples in /schemas/data_*.json
*/

"use strict"

function FindGraphIDJSONLD(items, id) {
	for (var i=0; i<(items.length ? items.length : 1) ; i++) {
		var item=items.length ? items[i] : items;
		if (item["@id"]==id)
			return item;
	}
	return null;
}

function ParseJSONLD(jsonld, addGeo, addObs) {
	if (!jsonld["@graph"])
		return {"error": "Encoding not supported. Expected element '@graph' missing"};
	var dataAttributes={}, records=[], record, item, members, member;
	var wkt = new Wkt.Wkt(), wkt2 = new Wkt.Wkt(), foi;
	for (var i=0; i<(jsonld["@graph"].length ? jsonld["@graph"].length : 1) ; i++) {
		item=jsonld["@graph"].length ? jsonld["@graph"][i] : jsonld["@graph"];
		var foi=null;
		if (item.hasFeatureOfInterest)
			var foi=item.hasFeatureOfInterest;
		else {
			for (var j=0; j<(item["@type"].length ? item["@type"].length : 1) ; j++) {
				var type=item["@type"].length ? item["@type"][j] : item["@type"];
				if (type=="http://www.w3.org/ns/sosa/FeatureOfInterest") {
					var foi=item;
					break;
				}
			}
			if (!foi)
				return {"error": "Encoding not supported. '@graph' item without 'hasFeatureOfInterest'"};
		}
		var lat=null, long=null, hasWKT=false;
		if (addGeo)
		{
			if (typeof foi.lat !== "undefined" && typeof foi.long !== "undefined") {
				if (!dataAttributes.lat)
					dataAttributes.lat={type: "number", description: "Latitude", definition: "http://www.opengis.net/def/sensor-model-param/BODC/ALATZZ01", 
							"UoM": "degree", "UoMSymbol": "°", "UoMDefinition": "https://qudt.org/vocab/unit/DEG"};
				if (!dataAttributes.long)		
					dataAttributes.long={type: "number", description: "Longtitude", definition: "http://www.opengis.net/def/sensor-model-param/BODC/ALONZZ01", 
								"UoM": "degree", "UoMSymbol": "°", "UoMDefinition": "https://qudt.org/vocab/unit/DEG"};
				lat=foi.lat;
				long=foi.long;			
			} else if (foi.hasGeometry || foi["http://www.opengis.net/ont/geosparql#hasGeometry"]) {
				var geom=foi.hasGeometry ? foi.hasGeometry : foi["http://www.opengis.net/ont/geosparql#hasGeometry"];
				if (typeof geom === "string")
					geom=FindGraphIDJSONLD(jsonld["@graph"], geom);					
				if (geom && (geom.asWKT || geom["http://www.opengis.net/ont/geosparql#asWKT"])) {
					var asWKTs=geom.asWKT ? geom.asWKT : geom["http://www.opengis.net/ont/geosparql#asWKT"];
					for (var g=0; g<(typeof asWKTs !== "string" && asWKTs.length ? asWKTs.length : 1); g++) {
						hasWKT=true;
						var asWKT=typeof asWKTs !== "string" && asWKTs.length ? asWKTs[g] : asWKTs;
						if (typeof asWKT === "string") {
							if (g==0)
								wkt.read(asWKT);
							else
								wkt.merge(wkt2.read(asWKT));
						} else if (typeof asWKT === "object" && asWKT["@value"]) {
							if (g==0)
								wkt.read(asWKT["@value"]);
							else
								wkt.merge(wkt2.read(asWKT["@value"]));
						}
					}
					if (!dataAttributes.geometry)
						dataAttributes.geometry={type: "object", description: "Geometry"};
	
				} else {
					continue  //return {"error": "Encoding not supported. 'hasGeometry' item without 'asWKT'"};
				}	
			}
			else
				continue;   //return {"error": "Encoding not supported. 'hasFeatureOfInterest' item without 'lat' or 'long" or geometry"};
		}
			
		if (foi.identifier && !dataAttributes.id)
			dataAttributes.id={type: "string", description: "Identifier"}
					
		if (!item.hasMember || !addObs) {
			record={};
			if (lat)
				record.lat=lat;
			if (long)
				record.long=long;
			if (hasWKT)
				record.geometry=wkt.toJson();
			if (typeof foi.identifier !== "undefined")
				record.id=foi.identifier;
			records.push(record);
			continue;
		}
		members=item.hasMember;
		for (var j=0; j<(members.length ? members.length : 1) ; j++) {
			member=members.length ? members[j] : members;
			if (member["@type"]!="http://www.w3.org/ns/sosa/Observation" || !member.hasResult)
				continue;
			if (typeof member.hasResult.numericValue === "undefined")
				continue;
			record={};
			if (lat)
				record.lat=lat;
			if (long)
				record.long=long;
			if (hasWKT)
				record.geometry=wkt.toJson();
			if (typeof foi.identifier !== "undefined")
				record.id=foi.identifier;

			record.value=member.hasResult.numericValue;
			if (!dataAttributes.value)
				dataAttributes.value={type: "number", description: "Value", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/result"};
			if (member.hasResult.unit) {
				record.UoMDefinition=member.hasResult.unit;
				if (!dataAttributes.UoMDefinition)
					dataAttributes.UoMDefinition={type: "number", description: "Unit of measurement", definition: "http://www.opengis.net/def/docs/15-078r6/Datastream/unitOfMeasurement/name"};
			}
			if (member.observedProperty && (member.observedProperty["@id"] || typeof member.observedProperty === "string")) {
				record.propertyDefinition=member.observedProperty["@id"] ? member.observedProperty["@id"] : member.observedProperty ;
				if (!dataAttributes.propertyDefinition)
					dataAttributes.propertyDefinition={type: "string", description: "Observed property definition", definition: "http://www.opengis.net/def/docs/15-078r6/ObservedProperty/definition"};
				/*if (member.observedProperty.label){
					record.propertyName=member.observedProperty.label;
					if (!dataAttributes.propertyName)
						dataAttributes.propertyName={type: "string", description: "Observed property name", definition: "http://www.opengis.net/def/docs/15-078r6/ObservedProperty/name"};
				}*/
			}
			if (member.phenomenonTime) {
				record.phenomenonTime=member.phenomenonTime;
				if (!dataAttributes.phenomenonTime)
					dataAttributes.phenomenonTime={type: "isodatetime", description: "Phenomenon time", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/phenomenonTime"};
			}
			if (member.resultTime) {
				record.resultTime=member.resultTime;
				if (!dataAttributes.resultTime)
					dataAttributes.resultTime={type: "isodatetime", description: "Result time", definition: "http://www.opengis.net/def/docs/15-078r6/Observation/resultTime"};
			}
			
			records.push(record);
		}
	}
	return {data: records, dataAttributes: dataAttributes};
}