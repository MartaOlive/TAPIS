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

//Eclipse Data Connector functions

"use strict"

function ParseEDCCatalog(catalog) {
	if (catalog["@type"]!="dcat:Catalog")
		return null;
	var records=[], record, dataset, distribution;
	if (!catalog["dcat:dataset"])
		return null;
	for (var r=0; r<(catalog["dcat:dataset"].length ? catalog["dcat:dataset"].length : 1); r++) {
		record={};
		dataset=catalog["dcat:dataset"].length ? catalog["dcat:dataset"][r] : catalog["dcat:dataset"];
		if (dataset["@type"]!="dcat:Dataset")
			continue;
		record.id=dataset["@id"];
		if (dataset["dcat:distribution"])
		{
			for (var i=0; i<(dataset["dcat:distribution"].length ? dataset["dcat:distribution"].length : 1); i++) {
				distribution=dataset["dcat:distribution"].length ? dataset["dcat:distribution"][i] : dataset["dcat:distribution"];
				if (distribution["@type"]!="dcat:Distribution")
					continue;
				if (distribution["dct:format"] && distribution["dct:format"]["@id"]=="HttpData-PULL" && distribution["dcat:accessService"] && 
						distribution["dcat:accessService"]["@type"]=="dcat:DataService") {
	        	                record.endpointDescription=distribution["dcat:accessService"]["dcat:endpointDescription"];
        	        	        record.endpointUrl=distribution["dcat:accessService"]["dcat:endpointUrl"];
					break;
				}
			}
		}
		if (dataset["dct:license"])
			record.license=dataset["dct:license"];
		if (dataset["dcat:keyword"])
		{
			for (var i=0; i<(dataset["dcat:keyword"].length ? dataset["dcat:keyword"].length : 1); i++) {
				record["keyword"+(i+1)]=dataset["dcat:keyword"].length ? dataset["dcat:keyword"][i] : dataset["dcat:keyword"];	
			}
		}
		if (dataset["dct:language"])
			record.language=dataset["dct:language"];
		if (dataset["dct:name"])
			record.description=dataset["dct:name"];
		if (dataset["dct:description"])
			record.description=dataset["dct:description"];
		if (dataset["dct:title"])
			record.title=dataset["dct:title"];
		if (dataset["dct:publisher"] && dataset["dct:publisher"]["http://xmlns.com/foaf/0.1/homepage"])
			record.publisher=dataset["dct:publisher"]["http://xmlns.com/foaf/0.1/homepage"];
		if (dataset["dcat:version"])
			record.version=dataset["dcat:version"];
		if (dataset["dct:creator"] && dataset["dct:creator"]["http://xmlns.com/foaf/0.1/name"])
			record.creator=dataset["dct:creator"] && dataset["dct:creator"]["http://xmlns.com/foaf/0.1/name"]
		if (dataset["dcat:landingPage"])
			record.landingPage=dataset["dcat:landingPage"];
		if (dataset["dcat:mediaType"])
			record.mediaType=dataset["dcat:mediaType"];
		else if (dataset["contenttype"])
			record.mediaType=dataset["contenttype"];
		records.push(record);
	}
	return records;
}
