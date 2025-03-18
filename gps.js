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

var IdGPSPosition=0;
function InitGPSPosition() {
	if (navigator.geolocation)
		IdGPSPosition=navigator.geolocation.watchPosition(UpdateGPSPosition, ErrorGPSPosition, {enableHighAccuracy: true, maximumAge: 8000});
	else
	{
		showInfoMessage("Geolocation not supported by the web browser");
		CancelGPSPosition();
	}
}

var PreviousGPSPoint=null;

function CancelGPSPosition() {
	if (IdGPSPosition) {
		navigator.geolocation.clearWatch(IdGPSPosition);
		IdGPSPosition=0;
	}
	PreviousGPSPoint=null;
}

var GPSPositionReported=false;
function UpdateGPSPosition(position) {
	PreviousGPSPoint={long: position.coords.longitude, lat: position.coords.latitude};
	if (!GPSPositionReported)
	{
		showInfoMessage("Geolocation is long: " + PreviousGPSPoint.long + " lat: " + PreviousGPSPoint.lat);
		GPSPositionReported=true;
	}
}

function ErrorGPSPosition(error) {
	switch(error.code) {
		case error.PERMISSION_DENIED:
			showInfoMessage("User denied request location.");
			CancelGPSPosition();
			break;
		case error.POSITION_UNAVAILABLE:
			showInfoMessage("Location information is unavailable.");
			CancelGPSPosition();
			break;
		case error.TIMEOUT:
			showInfoMessage("Request location timeOut.");
			CancelGPSPosition();
			break;
		case error.UNKNOWN_ERROR:
		default:
			showInfoMessage("Unknown error obtaining Location (" + error.code + ").");
			break;
	}
}
