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

//proj4js format can be extracted from: https://epsg.io/23031

var crs4proj4=[
	{"id": "EPSG:25831",     "projStr": "+title=UTM 31N ETRS89 +proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"},
	{"id": "EPSG:23031",     "projStr": "+title=UTM 31N ED50 +proj=utm +zone=31 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs"},
	{"id": "EPSG:23031:ICC", "projStr": "+title=UTM 31N ED50 UB/ICC +proj=utm +zone=31 +ellps=intl +towgs84=-137.5819,-67.74147,-168.4598,0.00000020630,0.00000020630,-1.44642184700, 11.41056200000 +units=m +no_defs +type=crs"},
	{"id": "EPSG:23031:IGN", "projStr": "+title=UTM 31N ED50 IGN +proj=utm +zone=31 +ellps=intl +towgs84=-131.03,-100.25,-163.35,1.244,0.019,1.144,-9.39 +units=m +no_defs +type=crs"},
	{"id": "EPSG:27563",     "projStr": "+title=Lambert Conformal Conic Zone III NTF +proj=lcc +lat_1=44.1 +lat_0=44.1 +lon_0=0 +k_0=0.999877499 +x_0=600000 +y_0=200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs +type=crs"},
	{"id": "EPSG:27572",     "projStr": "+title=Lambert Conformal Conic Zone II ext NTF +proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs +type=crs"},
	{"id": "EPSG:27573",     "projStr": "+title=Lambert Conformal Conic Zone III ext NTF +proj=lcc +lat_1=44.1 +lat_0=44.1 +lon_0=0 +k_0=0.999877499 +x_0=600000 +y_0=3200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs +type=crs"},
	{"id": "EPSG:3035",      "projStr": "+title=Lambert Equal Area (LAEA) ETRS89 +proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"},
	{"id": "EPSG:3395",      "projStr": "+title=Mercator Equator - WGS84 +proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs"},
	{"id": "ESRI:54009",	 "projStr": "+title=Mollweide - WGS84 +proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs"}
];

var crs4proj4Alias=[
	{"id": "CRS84", "aliasOf": "EPSG:4326"}
];

//id may be null if we do not what to see it
function getTitleProj4(id, proj) {
	if (proj.title)
		return proj.title + (id ? " [" + id + "]" : "");
	if (proj.proj="utm" && proj.zone && proj.datumCode)
		return "UTM "+ proj.zone + (proj.utmSouth ? "S" : "N") + " " + proj.datumCode + (id ? " [" + id + "]" : "");
	return "";
}

function startProj4() {
	for (i=0; i<crs4proj4.length; i++)
		proj4.defs(crs4proj4[i].id, crs4proj4[i].projStr);
	for (i=0; i<crs4proj4Alias.length; i++)
		proj4.defs(crs4proj4Alias[i].id, proj4.defs(crs4proj4Alias[i].aliasOf));
}

function getOptionsSelectProj4(selectedId) {
var cdns=[], projArray = Object.keys(proj4.defs);

	for (var i=0; i<projArray.length; i++)
		cdns.push("<option value=\"", projArray[i], "\"", ((selectedId && projArray[i]==selectedId) || projArray[i]=="CRS84"? "selected=\"selected\"" : ""), ">", 
			getTitleProj4(projArray[i], proj4.defs[projArray[i]]), "</option>");
	return cdns.join("");
}

function isProj4CRS84(id) {
	if (id=="CRS84" || id=="EPSG:4326" || id=="WGS84")
		return true;
	return false;
}

function GetSelectSaveLayerDialog(id, dataAttributes, selectedOption, onChange)
{
	var thereIsSelectionOption=false;
	var dataAttributesArray = Object.keys(dataAttributes);

	var s="<select id=\""+id+"\""  + (onChange ? "onChange=\""+onChange+"\"" : "") + ">";
	for (var a=0; a<dataAttributesArray.length; a++)
	{
		if (dataAttributesArray[a]==selectedOption)
		{
			thereIsSelectionOption=true;
			break;
		}
	}
	s+="<option value=\"\""+ (!thereIsSelectionOption ? "selected=\"selected\"" : "") +"></option>";
	for (var a=0; a<dataAttributesArray.length; a++)
		s+="<option value=\""+dataAttributesArray[a]+"\""+ (dataAttributesArray[a]==selectedOption ? "selected=\"selected\"" : "") +">"+dataAttributesArray[a]+"</option>";
	s+="</select>";
	return s;
}
