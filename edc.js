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
	var records=[], record, service, dataset, distribution, counterPartyAddress, participantId, /*originator,*/ policy;

	for (var c=0; c<(typeof catalogs.length !== "undefined" ? catalogs.length : 1); c++) {
		catalog=typeof catalogs.length !== "undefined" ? catalogs[c] : catalogs;
		if (catalog["@type"]!="dcat:Catalog")
			return null;

		if (!catalog["dcat:dataset"])
			continue;

		if (catalog["dcat:service"])
		{
			participantId=catalog["dspace:participantId"] ? catalog["dspace:participantId"] : null;
			//originator=catalog["originator"] ? catalog["originator"] : null;
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
			if (counterPartyAddress)
				record.counterPartyAddress=counterPartyAddress;
			if (participantId)
				record.participantId=participantId;
			/*if (originator)
				record.originator=originator;*/
			
			if (dataset["dcat:mediaType"])
				record.mediaType=dataset["dcat:mediaType"];
			else if (dataset["mediaType"])
				record.mediaType=dataset["mediaType"];
			else if (dataset["contenttype"])
				record.mediaType=dataset["contenttype"];

			if (dataset["dct:name"])
				record.description=dataset["dct:name"];
			else if (dataset["dct:description"])
				record.description=dataset["dct:description"];
			else if (dataset["name"])
				record.description=dataset["name"];
			else if (dataset["description"])
				record.description=dataset["description"];

			if (dataset["dct:title"])
				record.title=dataset["dct:title"];
			else if (dataset["title"])
				record.title=dataset["title"]; 

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
			if (dataset["dct:publisher"] && dataset["dct:publisher"]["http://xmlns.com/foaf/0.1/homepage"])
				record.publisher=dataset["dct:publisher"]["http://xmlns.com/foaf/0.1/homepage"];
			if (dataset["dcat:version"])
				record.version=dataset["dcat:version"];
			if (dataset["dct:creator"] && dataset["dct:creator"]["http://xmlns.com/foaf/0.1/name"])
				record.creator=dataset["dct:creator"] && dataset["dct:creator"]["http://xmlns.com/foaf/0.1/name"]
			if (dataset["metadata"]){
				var md=dataset["metadata"];
				if (md["dct:abstract"])
					record.abstract=md["dct:abstract"];
				if (md["dct:accrualPeriodicity"])
					record.updatePeriodicity=md["dct:accrualPeriodicity"];
				if (md["dct:issued"])
					record.creationDate=md["dct:issued"];
				if (md["dct:language"])
					record.language=md["dct:language"];
				for (var i=0, j=1; i<md["dct:license"]?.length; i++) {
					if (md["dct:license"][i]) {
						record["license_"+j]=md["dct:license"][i];
						j++;
					}
				}
				if (md["dct:publisher"] && md["dct:publisher"]["@id"]) {
					var publ=md["dct:publisher"]["@id"];
					if (publ.startsWith("https://catalogue.grumets.cat/geonetwork/organization/"))
						publ=publ.substring("https://catalogue.grumets.cat/geonetwork/organization/Sensor.Community".length);						
					publ=decodeURIComponent(publ.replaceAll("%25", "%"))
                        		record.publisher=publ;
				}
				if (md["dct:spatial"] && md["dct:spatial"]["http://www.opengis.net/rdf#asWKT"]) {
					var extent=md["dct:spatial"]["http://www.opengis.net/rdf#asWKT"];
					if (extent.startsWith("<http://www.opengis.net/def/crs/OGC/1.3/CRS84>"))
						extent=extent.substring("<http://www.opengis.net/def/crs/OGC/1.3/CRS84>".length);
					if (extent.charAt(0)=='\n')
						extent=extent.substring(1);
					record.extent=extent.trim();
				}
				if (md["dct:updated"])
					record.updateDate=md["dct:updated"];
				if (md["dcat:dataQuality"])
					record.quality=md["dcat:dataQuality"];
				if (md["dcat:granularity"])
					record.resolution=md["dcat:granularity"];
				for (var i=0, j=1; i<md["dcat:keyword"]?.length; i++) {
					if (md["dcat:keyword"][i]) {
						record["keyword_"+j]=md["dcat:keyword"][i];
						j++;
					}
				}
				for (var i=0, j=1; i<md["dcat:theme"]?.length; i++) {
					if (md["dcat:theme"][i]?.length && md["dcat:theme"][i]["@id"]) {
						var topCat=md["dcat:theme"][i]["@id"];
						if (topCat.startsWith("https://catalogue.grumets.cat/geonetwork/thesaurus/iso/topicCategory/"))
							topCat=topCat.substring("https://catalogue.grumets.cat/geonetwork/thesaurus/iso/topicCategory/".length);
						record["topicCategory_"+j]=topCat;
						j++;
					}
				}
				if (md["http://xmlns.com/foaf/0.1/thumbnail"] && md["http://xmlns.com/foaf/0.1/thumbnail"]["@id"])
					record.imageUrl=decodeURIComponent(md["http://xmlns.com/foaf/0.1/thumbnail"]["@id"].replaceAll("%25", "%"));
			}
			if (dataset["dcat:landingPage"])
				record.landingPage=dataset["dcat:landingPage"];
			records.push(record);
		}
	}
	return records;
}

function EDCNegociateContract(node, EDCConsumerURL, assetId, offerId, counterPartyAddress, participantId, mediaType) {
	var obj={
		"@context": {"edc": "https://w3id.org/edc/v0.0.1/ns/"},
		"@type": "ContractRequest",
		"counterPartyAddress": counterPartyAddress,
		"protocol": "dataspace-protocol-http",
		"policy": {
			"@context": "http://www.w3.org/ns/odrl.jsonld",
			"@id": offerId,
			"@type": "Offer",
			"assigner": participantId,
			"target": assetId,
			"permission": []
		}
	};
	HTTPJSONData(EDCConsumerURL+"/management/v3/contractnegotiations", null, "POST", obj).then(
				function(value) {
					if (value.obj && value.obj["@type"] && value.obj["@type"]=="IdResponse" && value.obj["@id"]) {
						showInfoMessage('EDC contract negociation iniciated...');
						EDCWaitForNegociationCompletition(node, EDCConsumerURL, value.obj["@id"], mediaType, 0);
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

function EDCWaitForNegociationCompletition(node, EDCConsumerURL, id, mediaType, n) {
	setTimeout(EDCVerifyNegociationCompletition, 1000, node, EDCConsumerURL, id, mediaType, n);
}

function EDCVerifyNegociationCompletition(node, EDCConsumerURL, id, mediaType, n) {
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
						EDCWaitForNegociationCompletition(node, EDCConsumerURL, id, mediaType, n+1);
						return;
					} 	
					if (!value.obj.contractAgreementId) {
						showInfoMessage('EDC contract negociation failed: ' + JSON.stringify(value.obj));
						return;
					}				
					showInfoMessage('EDC contract negociation successful.');
					EDCRequestTransfer(node, EDCConsumerURL, value.obj.contractAgreementId, value.obj.counterPartyAddress, mediaType)
				},
				function(error) { 
					showInfoMessage('EDC contract negociation failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function EDCRequestTransfer(node, EDCConsumerURL, contractAgreementId, counterPartyAddress, mediaType) {
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
		/*"dataDestination": {
			"type": "HttpProxy",
		},
		"callbackAddresses": [ {"events": ["transfer.process.started"], 
			"uri": "https://consback-edc-connector.apps.paas-dev.psnc.pl/Observations"}]*/
	};
	HTTPJSONData(EDCConsumerURL+"/management/v2/transferprocesses", null, "POST", obj).then(
				function(value) { 
					if (value.obj && value.obj["@type"] && value.obj["@type"]=="IdResponse" && value.obj["@id"]) {
						showInfoMessage('EDC transfer requested...');
						EDCWaitForTransferStarted(node, EDCConsumerURL, value.obj["@id"], mediaType, 0);
					} else {
						showInfoMessage('EDC transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
					}
				},
				function(error) { 
					showInfoMessage('Error in requesting EDC catalog. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error) ;
				}
			);	
}

function EDCWaitForTransferStarted(node, EDCConsumerURL, id, mediaType, n) {
	setTimeout(EDCVerifyEDCTransferStarted, 1000, node, EDCConsumerURL, id, mediaType, n);
}

function EDCVerifyEDCTransferStarted(node, EDCConsumerURL, id, mediaType, n) {
	HTTPJSONData(EDCConsumerURL+"/management/v3/transferprocesses/"+id).then(
				function(value) {
					if (!value.obj || !value.obj["@type"] || value.obj["@type"]!="TransferProcess" || !value.obj.state) {
						showInfoMessage('EDC transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
						return;
					}
					if (value.obj.state=="TERMINATED") {
						showInfoMessage('EDC transfer request failed.' + (value.obj.errorDetail) ? " Details are: " + value.obj.errorDetail : "");
						return;
					}
					if (value.obj.state!="STARTED") {
						if (n==20) {
							showInfoMessage('EDC transfer request failed after ' + n + ' iterations');
							return;
						}
						EDCWaitForTransferStarted(node, EDCConsumerURL, id, mediaType, n+1);
						return;
					} 	
					/*if (!value.obj.contractId) {
						showInfoMessage('EDC transfer request failed: ' + JSON.stringify(value.obj));
						return;
					}*/				
					showInfoMessage('EDC transfer request start confirmed.');
					EDCGetAddressToTransfer(node, EDCConsumerURL, id, mediaType);
				},
				function(error) { 
					showInfoMessage('EDC transfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function EDCGetAddressToTransfer(node, EDCConsumerURL, id, mediaType) {
	HTTPJSONData(EDCConsumerURL+"/management/v3/edrs/"+id+"/dataaddress").then(
				function(value) {
					if (!value.obj || !value.obj["@type"] || value.obj["@type"]!="DataAddress" || !value.obj.endpoint || !value.obj.authorization) {
						showInfoMessage('EDC getting URL for transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));
						return;
					}
					showInfoMessage('EDC URL for transfer obtained.');
					EDCExectuteTransfer(node, value.obj.endpoint, value.obj.authorization, mediaType);
				},
				function(error) { 
					showInfoMessage('EDC getting URL for transfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					console.log(error);
				}
			);
}

function EDCExectuteTransfer(node, url, authorization, mediaType) {
	AddCircularImageInterpretingURL(url, mediaType, {Authorization: authorization});
	//HTTPJSONData(url, ["Content-Type", "Content-Length"], null, null, {'Accept': '*/*', 'Authorization': authorization}).then(
	/*			function(value) {
					showInfoMessage('EDC Raw data transfer completed. It it is not automatically transformed into a table, use the relevant "format" tool to do so.');
					node.STAURL=url;
					if (!node.STAsecurity)
						node.STAsecurity={};
					node.STAsecurity.authorization=authorization;
					node.OGCType="fileURL";
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
			);*/
}