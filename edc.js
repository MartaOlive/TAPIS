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

function ParseEDCCatalog(catalogs) {
	var catalog;
	var records=[], record, service, dataset, distribution, counterPartyAddress, policy;

	for (var c=0; c<(typeof catalogs.length !== "undefined" ? catalogs.length : 1); c++) {
		catalog=typeof catalogs.length !== "undefined" ? catalogs[c] : catalogs;
		if (catalog["@type"]!="dcat:Catalog")
			return null;

		if (!catalog["dcat:dataset"])
			continue;

		if (catalog["dcat:service"])
		{
			counterPartyAddress=null;
			for (var s=0; s<(catalog["dcat:service"].length ? catalog["dcat:service"].length : 1); s++) {
				service=catalog["dcat:service"].length ? catalog["dcat:service"][s] : catalog["dcat:service"];
				if (service["@type"]!="dcat:DataService" || service["dcat:endpointDescription"]!="dspace:connector")
					continue;
				counterPartyAddress=service["dcat:endpointUrl"];
				break;
			}
		}
		for (var r=0; r<(catalog["dcat:dataset"].length ? catalog["dcat:dataset"].length : 1); r++) {
			dataset=catalog["dcat:dataset"].length ? catalog["dcat:dataset"][r] : catalog["dcat:dataset"];
			if (dataset["@type"]!="dcat:Dataset")
				continue;
			record={};
			if (counterPartyAddress)
				record.counterPartyAddress=counterPartyAddress;
			record.assetId=dataset["@id"];
			if (dataset["dcat:distribution"]) {
				for (var i=0; i<(dataset["dcat:distribution"].length ? dataset["dcat:distribution"].length : 1); i++) {
					distribution=dataset["dcat:distribution"].length ? dataset["dcat:distribution"][i] : dataset["dcat:distribution"];
					if (distribution["@type"]!="dcat:Distribution")
						continue;
					if (distribution["dct:format"] && distribution["dct:format"]["@id"]=="HttpData-PULL" && distribution["dcat:accessService"] && 
							distribution["dcat:accessService"]["@type"]=="dcat:DataService" && distribution["dcat:accessService"]["dcat:endpointDescription"]=="dspace:connector") {
        		        	        record.endpointUrl=distribution["dcat:accessService"]["dcat:endpointUrl"];
						break;
					}
				}
			}
			if (dataset["odrl:hasPolicy"]) {
				for (var i=0; i<(dataset["odrl:hasPolicy"].length ? dataset["odrl:hasPolicy"].length : 1); i++) {
					policy=dataset["odrl:hasPolicy"].length ? dataset["odrl:hasPolicy"][i] : dataset["odrl:hasPolicy"];
					if (policy["@type"]!="odrl:Offer")
						continue;
					if (policy["@id"]) {
        		        	        record.offerId=policy["@id"];
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
	}
	return records;
}