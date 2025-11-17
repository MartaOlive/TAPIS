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

//depends on crypto.js

async function DiscoverSTATopic(url) {
	var r=await HTTPHead(url, ["link"]);

	if (!r.responseHeaders["link"])
		return null;

	var links=getLinkArrayFromHTTPLinkHeader(r.responseHeaders["link"])

	if (!links['hub'])
		return null;
	return {hub: links['hub'], self: (links['self'] ? links['self'] : url)};
}

var webSocket=null
var webSocketId="";
var WSfupdataNodeId=null;  //Callback function that manages the updates. Adopts the value send to SubscribeTopicToWebHub()
var WSfmessage=null;       //Callback function that manages the error and information messages. Adopts the value send to SubscribeTopicToWebHub()
var WebHubSubs=[]; // array with the information of the subscriptions alive

function getSubscSecret() {
	let result = "";
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	const max=199; // The secret MUST be less than 200 bytes in length.
	while (counter < max) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter++;
    	}
	return result;
}

function createMD5Hash(input) {
	return CryptoJS.MD5(input).toString();
}

function removeSubsc(subsc){
	var index = WebHubSubs.indexOf(subsc);
	if (index > -1) // only splice array when item is found
		WebHubSubs.splice(index, 1);
	return WebHubSubs;
}

var XAPIKey="TestXAPIKey9876543210";

/*
Entry point to the library. Subscribes to a topic and starts the websocket if necessary. 
WebSocketUrl is the url of the websocket service. Starts with ws: or wss: 
WebHookUrl is the url of the webhook service. 
WebSubUrl is the websub service that the webhook will communicate with The subcriptions sent POST messatges to subcribe to topics. 
topic is the STA request to subcribe. It cannot contain $top, $count, $skip or $orderby in the root.
nodeId is the id of the object to be updated. It is passed to the first parameter of f_updateNodeId
lease_seconds is the resubscription period for the WebSub. The function takes care of the resubscription
f_updateNodeId is the callback function to call if there are updates. It gests 2 parametres: nodeId and record
f_message is the callback function to call to show an information or error message
resubsc is internal. Indicates if this is a resubscripton
*/
async function SubscribeTopicToWebHub(WebSocketUrl, WebHookUrl, WebSubUrl, topic, nodeId, lease_seconds, f_updateNodeId, f_message, resubsc) {
	if(!topic)
		return;	

	if (!webSocket)
		createWS(WebSocketUrl, f_updateNodeId, f_message);

	if (!webSocketId) {
		setTimeout(SubscribeTopicToWebHub, 500, WebSocketUrl, WebHookUrl, WebSubUrl, topic, nodeId, lease_seconds);
		return;
	}
		
	var subsc=null;
	for(var i=0; i<WebHubSubs.length; i++)
	{
		if(topic.toLowerCase()==WebHubSubs[i].topic.toLowerCase())
		{
			// Resubscription
			subsc=WebHubSubs[i];
			for (var j=0; j<subsc.nodeIds.length; j++)
				if (subsc.nodeIds[j]==nodeId)
					break;
			if (j==subsc.nodeIds.length)
				subsc.nodeIds.push(nodeId);
			break;
		}
	}
	if(!subsc)	
	{
		if (resubsc)
			return;  //We do not resubcribe to a topic that is not there
		WebHubSubs.push({WebSubUrl: WebSubUrl,
			topic: topic,
			nodeIds: [nodeId],
			callback: WebHookUrl+"?WSId="+webSocketId+"&topic="+createMD5Hash(topic),
			hub_secret: getSubscSecret(),
			x_api_key: XAPIKey,
			lease_seconds: lease_seconds ? lease_seconds: 20
		});
		subsc=WebHubSubs[WebHubSubs.length-1];
	}	

	// Sending a POST message with some headers and with the data in application/x-www-form-urlencoded' format.	
	var cdns=[];
	cdns.push("hub.callback=" , encodeURIComponent(subsc.callback),
				"&hub.topic=", encodeURIComponent(subsc.topic), 
				"&hub.mode=subscribe",
				"&hub.lease_seconds=", subsc.lease_seconds, 
				"&hub.secret=", subsc.hub_secret,
				"&webhook.x_api_key=",subsc.x_api_key);
		
	HTTPJSONData(subsc.WebSubUrl, null, "POST", cdns.join(""), {'Accept': 'text/plain'}, "application/x-www-form-urlencoded; charset=utf-8").then(
				function(value) {
					if (!resubsc)
						WSfmessage("Subscription to topic \""+subsc.topic+"\" completed. Waiting for notifications..."); 
					//Automatic resubscription
					subsc.timeOut=setTimeout(SubscribeTopicToWebHub, lease_seconds*1000, WebSocketUrl, WebHookUrl, WebSubUrl, topic, nodeId, lease_seconds, f_updateNodeId, f_message, true);
				},
				function(error) { 
					WSfmessage('Subscription to topic \"'+subsc.topic+'\" failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					removeSubscription(subsc);
					console.log(error);
				}
			);
	return;
}

//Unsubscribes a node to a topic. If no node is subcribed to a topic, the topic is unsubcribed. 
//If no subscriptions, the websocket is closed. 
function UnSubscribeTopicToWebHub(nodeId) {

	var subsc=null;
	for(var i=0; i<WebHubSubs.length; i++) {
		if (!WebHubSubs[i].nodeIds.length)
			continue;
		for(var j=0; j<WebHubSubs[i].nodeIds.length; j++) {
			if (nodeId==WebHubSubs[i].nodeIds[j])
				break;
		}
		if (j<WebHubSubs[i].nodeIds.length) {
			WebHubSubs[i].nodeIds.splice(j, 1);
			if (WebHubSubs[i].nodeIds.length)
				return;
			subsc=WebHubSubs[i];
			break;
		}
	}
	if (!subsc) {	
		if (WSfmessage) WSfmessage("Subscription for the node not found");
		return;
	}

	// Sending a POST message with some headers and with the data in application/x-www-form-urlencoded' format.		
	var cdns=[];
	cdns.push("hub.callback=" , encodeURIComponent(subsc.callback),
				"&hub.topic=", encodeURIComponent(subsc.topic), 
				"&hub.mode=unsubscribe",
				"&hub.secret=", subsc.hub_secret,
				"&webhook.x_api_key=", subsc.x_api_key);
	
	HTTPJSONData(subsc.WebSubUrl, null, "POST", cdns.join(""), {'Accept': 'text/plain'}, "application/x-www-form-urlencoded; charset=utf-8").then(
				function(value) { 
					WSfmessage("Unsubscription to topic \""+subsc.topic+"\" completed."); 
					clearTimeout(subsc.timeOut);
					removeSubsc(subsc);
					if (WebHubSubs.length)
						return;
					//No subscription left.
					closeWS();
				},
				function(error) { 
					WSfmessage('Unsubscription to topic \"'+subsc.topic+'\" failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);
					removeSubscription(subsc);
					console.log(error);
				}
			);
	return;

	one_subs.ajax.setHandlerErr(ErrorResponseSendUnSubscription);		
	
	return;
}


//--------WebSocket management-------------

function onWSOpen(event) {    
	WSfmessage("Websocket opened. Waiting for WebSocketId...");
	return;
}

function onWSError (event) {    
	WSfmessage("Error in websocket" + event);
}

async function onWSMessage (event) {    
	// Listen for messages from server
	var data=await event.data;
	try {
		var data_json=JSON.parse(data);
	} catch (error) {
		if (error instanceof SyntaxError) {
			WSfmessage("Syntax error parsing " + data + ": " + error.message);
			console.log('There was a SyntaxError', error);
		}
	}
	if (data_json && data_json.webSocketId && !webSocketId) {
		webSocketId=data_json.webSocketId;
		WSfmessage("WebsocketId: " + webSocketId + ". Waiting for subscriptions...");
		return;
	}
	if (WSfupdataNodeId && data_json && data_json.topic && data_json.data)
	{
		for(var i=0; i<WebHubSubs.length; i++)
		{
			if(data_json.topic.toLowerCase()==decodeURIComponent(WebHubSubs[i].topic).toLowerCase() ||
			   decodeURIComponent(data_json.topic).toLowerCase()==decodeURIComponent(WebHubSubs[i].topic).toLowerCase())
			{
				var subsc=WebHubSubs[i];
				for (var j=0; j<subsc.nodeIds.length; j++)
					WSfupdataNodeId(subsc.nodeIds[j], data_json.data);
				break;
			}
		}
	}
}

function onWSClose (event) {    
	//Connection closed
	webSocketId="";
	webSocket=null;
}

function closeWS() {
	// Closing the WS connection	
	if(webSocket)
		webSocket.close();
}

function createWS(WebSocketUrl, f_updateNodeId, f_message)
{	
	closeWS();	
	
	// Create WebSocket connection.
	webSocket = new WebSocket(WebSocketUrl);
	
	// WebSocket events
	//webSocket.addEventListener("open", onWSOpen);
	webSocket.addEventListener("message", onWSMessage);
	webSocket.addEventListener("error", onWSError);
	webSocket.addEventListener("close", onWSClose);	
	if (f_updateNodeId)
		WSfupdataNodeId=f_updateNodeId;
	if (f_message)
		WSfmessage=f_message;
}
