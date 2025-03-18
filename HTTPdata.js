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

function getURLWithoutQueryParams(s)
{
	var i=s.indexOf('?')
	if (i==-1)
		return s;
	return s.substring(0, i);
}

function getURLQueryParams(s)
{
	var i=s.indexOf('?')
	if (i==-1)
		return "";
	return s.substring(i+1);
}

//https://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
function transformStringIntoLocation(href) {
	var location = document.createElement("a");
	location.href = href;
	// IE doesn't populate all link properties when setting .href with a relative URL,
	// however .href will return an absolute URL which then can be used on itself
	// to populate these additional fields.
	if (location.host == "") {
		location.href = location.href;
	}
	return location;
}

//From the MiraMon Map Browser TreuAdreca()
function getFileName(s)
{
	var i=s.lastIndexOf('/');
	if (i==-1)
		i=s.lastIndexOf('\\');
	if (i==-1)
		return s;
	return s.substring(i+1);
}

//From the MiraMon Map Browser DonaAdreca()
function getAddressPath(s)
{
	if (s.charAt(s.length-1)=='/')
		return s;
	var i=s.lastIndexOf('/');
	if (i==-1)
		return "";
	return s.substring(0, i);
}

//from the MiraMon Map Browser DonaAdrecaAbsoluta()
function getAbsoluteURL(url)
{
	if (url.length>8 && (url.substring(0, 7)=="http://" || url.substring(0, 8)=="https://"))
		return url;
	if (url.charAt(0)=="/")
		return location.protocol+"//"+location.host+url;
	return location.protocol+"//"+location.host+getAddressPath(location.pathname)+url;
}

function removeExtension(name){
	var i=name.lastIndexOf(".");
	if (i==-1)
		return name;
	return name.substring(0, i);
}

//Before it was called AddKVPToURL
function AddQueryParamsToURL(url, kvp) {
	kvp=removeExtraAmpersand(kvp);
	if (!kvp)
		return url;
	if (url.indexOf('?')==-1)
		return url + "?" + kvp;
	return url + "&" + kvp;
}

function GetQueryParamFromURL(url, queryparam) {
	var queryparams=getURLQueryParams(url);
	var kvp=queryparams.split("&");
	for(var i=0; i<kvp.length; i++) {
		var j = kvp[i].indexOf("=");  // Gets the first index where a space occours
		if (j==-1)
			continue;
		if (kvp[i].substring(0, j)==queryparam)
			return kvp[i].substring(j+1);
	}
	return null;
}

function RemoveQueryParamFromURL(url, queryparam) {
	var queryparams=getURLQueryParams(url);
	if (!queryparams)
		return url;
	var kvp=queryparams.split("&");
	for(var i=0; i<kvp.length; i++) {
		var j = kvp[i].indexOf("=");  // Gets the first index where a space occours
		if (j==-1)
			continue;
		if (kvp[i].substring(0, j)==queryparam){
			kvp.splice(i, 1);
			if (kvp.length)
				return getURLWithoutQueryParams(url)+'?'+kvp.join('&');
			return getURLWithoutQueryParams(url)
		}
	}
	return url;
}

//Returns the protocol of a URL without the double slash
function getProtocol(s){
	var pos_barrabarra;
	if (-1!=(pos_barrabarra=s.indexOf("://")))
		return s.substring(0, pos_barrabarra+1);
	return "";
}

function removeParamContentType(contentType) {
	if (!contentType)
		return contentType;
	var i=contentType.indexOf(';')
	if (i<0)
		return contentType;
	else
		return contentType.substring(0, i);
}


var CriptoName=null, DisplayName="";
function AddHeadersIfNeeded(options) {
	if (CriptoName &&
		hello("authenix").getAuthResponse() &&
		hello("authenix").getAuthResponse().access_token) {
		if (!options.headers)
			options.headers={};
		options.headers['Authorization']='Bearer ' + hello("authenix").getAuthResponse().access_token;
	}
	if (PreviousGPSPoint)
	{
		if (!options.headers)
			options.headers={};
		options.headers['Geolocation']='geo:' + PreviousGPSPoint.lat + ',' + PreviousGPSPoint.long;
	}
}

function getLinkArrayFromHTTPLinkHeader(linkHeader) {
	var linkInfo, parsed_data={};

	var arrData = linkHeader.split(",")
	for (var d of arrData) {
		linkInfo = /<([^>]+)>;\s+rel="([^"]+)"/ig.exec(d);
		parsed_data[linkInfo[2]] = linkInfo[1];
	}
	return parsed_data;
}

function standardStatusText(status){
	switch (status){
		case 400:
			return "Bad Request. The request cannot be fulfilled due to bad syntax.";
		case 401: 
			return "Unauthorized. The request was a legal request, but the server is refusing to respond to it. Please authenticate using the Login button and try again.";
		case 403:
			return "Forbidden. The request was a legal request, but the server is refusing to respond to it.";
		case 404: 
			return "Not Found. The requested page could not be found but may be available again in the future.";
		case 405: 
			return "Method Not Allowed. A request was made of a page using a request method not supported by that page.";
		case 406: 
			return "Not Acceptable. The server can only generate a response that is not accepted by the client.";
		case 407: 
			return "Proxy Authentication Required. The client must first authenticate itself with the proxy.";
		case 408: 
			return "Request Timeout. The server timed out waiting for the request.";
		case 409: 
			return "Conflict. The request could not be completed because of a conflict in the request.";
		case 410: 
			return "Gone. The requested page is no longer available.";
		case 411: 
			return "Length Required. The \"Content-Length\" is not defined. The server will not accept the request without it.";
		case 412: 
			return "Precondition Failed. The precondition given in the request evaluated to false by the server.";
		case 413: 
			return "Request Too Large. The server will not accept the request, because the request entity is too large.";
		case 414: 
			return "Request-URI Too Long. The server will not accept the request, because the URI is too long. Occurs when you convert a POST request to a GET request with a long query information.";
		case 415: 
			return "Unsupported Media Type	The server will not accept the request, because the media type is not supported."; 
		case 416: 
			return "Range Not Satisfiable. The client has asked for a portion of the file, but the server cannot supply that portion.";
		case 417: 
			return "Expectation Failed.";
		default:
			return "";
	}
}

/*
Inspired in https://web.dev/fetch-api-error-handling/
Despite the name of the function, it can also be used for retrieving non-json files.
In fact, the response is an object with the following members: obj (only if the response is application/json), text: (only if the response is not application/json), responseHeaders: (only the ones listed in headersToGet), ok (always true);
*/
//url is the URL to request. To do GET it can be used with the first parameter only.
//headersToGet is an array of header names that are extracted to the response and included in the responseHeaders memeber of the function return. Can be null.
//method is the name of the method in capitals. E.g. "POST". Default is "GET".
//objToSend is a JavaScript object that will be stringify into JSON text and send as the body of the HTTP request (e.g. HTTP POST) or a string that will be send directly.
//headersToSend is an object with the headers to include in the request. It requests JSON content in 'Accept' by default. If you use headersToSend to specify headers then there is no default 'Accept' and you may specify it. headersToSend is an object like this: {'Accept': '*/*', 'Authorization': "XXX"}
//mediaToSend is the media type declared for the body content (based on objToSend). If undefined, null or blank, "application/json" is assumed
/*
When all is OK response is an object {obj: , text: , responseHeaders: , ok: };
*/
async function HTTPJSONData(url, headersToGet, method, objToSend, headersToSend, mediaToSend) {
	var response, jsonData, options={};
	try {
		if (method)
			options.method=method;
		
		if (headersToSend)
			options.headers=headersToSend;
		else
			options.headers={'Accept': 'application/json, */*;q=0.8'};

		AddHeadersIfNeeded(options);
		if (objToSend)
		{
			options.headers['Content-Type']=(mediaToSend) ? (mediaToSend) : "application/json";
			options.body=(typeof objToSend === "object") ? JSON.stringify(objToSend) : objToSend;
		}
		response = await fetch(url, options);
	}
	catch (error) {
		showInfoMessage('There was an error with ' + url + ": " + error.message);
		console.log('There was an error', error);
		return;
	}
	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		var body;
		if ((removeParamContentType(response.headers.get('Content-Type'))=="application/json" || removeParamContentType(response.headers.get('Content-Type'))=="application/ld+json") &&
			(response.headers.get('Content-Length')==null || parseInt(response.headers.get('Content-Length'))>0)) {
			body=await response.json();
			body=JSON.stringify(body);
		}
		else
			body=await response.text();
		showInfoMessage("Error: HTTP " + (method ? method : "GET") + " URL: " + url + ", HTTP code: " + response?.status + ", Description: "+ (response.statusText ? response.statusText : standardStatusText(response.status)) + (body ? ", " + body : ""));
		console.log("HTTP Response Code: " + response?.status + ": " + response?.statusText + (body ? JSON.stringify(body) : ""));
		return response;
	}
	try {
		var headersObj={};
		if (headersToGet)
		{
			for (var i=0; i<headersToGet.length; i++)
				headersObj[headersToGet[i]]=response.headers.get(headersToGet[i]);
			//Enumetates all headers: for(let entry of response.headers.entries()) console.log(entry) })
		}
		if ((removeParamContentType(response.headers.get('Content-Type'))=="application/json" || removeParamContentType(response.headers.get('Content-Type'))=="application/ld+json") &&
		(response.headers.get('Content-Length')==null || parseInt(response.headers.get('Content-Length'))>0))
			return {obj: await response.json(), text: null, responseHeaders: headersObj, ok: true};
		else
			return {obj: null, text: await response.text(), responseHeaders: headersObj, ok: true};
	} catch (error) {
		if (error instanceof SyntaxError) {
			showInfoMessage('Syntax error reading ' + url + ": " + error.message);
			console.log('There was a SyntaxError', error);
			return;
		}
		else {
			showInfoMessage('Error interpreting ' + url + ": " + error.message);
			console.log('There was an error', error);
			return;
		}
	}
}

async function HTTPHead(url, headersToGet) {
	return await HTTPJSONData(url, headersToGet, "HEAD");
}

async function HTTPBinaryData(url) {
	var response, jsonData, options={};
	try {
		response = await fetch(url, options);
	}
	catch (error) {
		showInfoMessage('There was an error with ' + url + ": " + error.message);
		console.log('There was an error', error);
		return;
	}
	// Uses the 'optional chaining' operator
	if (!(response?.ok)) {
		var body;
		if ((removeParamContentType(response.headers.get('Content-Type'))=="application/json" || removeParamContentType(response.headers.get('Content-Type'))=="application/ld+json") &&
			(response.headers.get('Content-Length')==null || parseInt(response.headers.get('Content-Length'))>0)) {
			body=await response.json();
			body=JSON.stringify(body);
		}
		else
			body=await response.text();
		showInfoMessage("Error: HTTP " + (method ? method : "GET") + " URL: " + url + ", HTTP code: " + response?.status + ", Description: "+ (response.statusText ? response.statusText : standardStatusText(response.status)) + (body ? ", " + body : ""));
		console.log("HTTP Response Code: " + response?.status + ": " + response?.statusText + (body ? JSON.stringify(body) : ""));
		return response;
	}
	try {
		return await response.arrayBuffer();
	} catch (error) {
		if (error instanceof SyntaxError) {
			showInfoMessage('Syntax error reading ' + url + ": " + error.message);
			console.log('There was a SyntaxError', error);
			return;
		}
		else {
			showInfoMessage('Error interpreting ' + url + ": " + error.message);
			console.log('There was an error', error);
			return;
		}
	}
}
