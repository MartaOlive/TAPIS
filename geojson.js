"use strict"

/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able 
	to work with STA data as tables.
  
	The TAPIS client is free software under the terms of the MIT License

	Copyright (c) 2025 Joan Masó

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

const geojsonGeometryTypes=["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"];

function isGeoJSONGeometryType(type) {
	if(0>geojsonGeometryTypes.indexOf(type))
		return false;
	return true;
}

function TransformGeoJSONFeatureToTable(feature, url) {
	var record={};
	if (feature.id)
		record.id=feature.id;
	if (url)
		record.itemLink=url+"/"+feature.id;
	if (feature.assets) {  //STAC extension
		var keys=Object.keys(feature.assets);
		for (var k = 0; k < keys.length; k++) {
			if (feature.assets[keys[k]].href)
				record[keys[k]+"OpenLink"]=feature.assets[keys[k]].href;
			if (feature.assets[keys[k]].alternate && feature.assets[keys[k]].alternate.FACTS_API_Key && feature.assets[keys[k]].alternate.FACTS_API_Key.href) {
				record[keys[k]+"AssetLink"]=feature.assets[keys[k]].alternate.FACTS_API_Key.href;
				record[keys[k]+"AssetType"]=feature.assets[keys[k]].alternate.FACTS_API_Key?.type ? feature.assets[keys[k]].alternate.FACTS_API_Key.type : "application/geopackage+sqlite3";
				record[keys[k]+"WalletUrl"]=feature.assets[keys[k]].alternate.FACTS_API_Key?.auth?.schemes?.flows?.authorizationCode?.authorizationApi ? feature.assets[keys[k]].alternate.FACTS_API_Key.auth.schemes.flows.authorizationCode.authorizationApi : "https://wallet.dataspace.secd.eu";
			}
		}
	}
	Object.assign(record, deapCopy(feature.properties)); //JSON properties are directly copied into STAdata
	record.geometry=deapCopy(feature.geometry);  //JSON geometry are directly copied into STAdata
	return record;
}

function TransformGeoJSONToTable(geojson, url) {
var data=[], feature;				

	if (geojson.type && geojson.type=="FeatureCollection") {
		for (var i=0; i<geojson.features.length; i++)
			data.push(TransformGeoJSONFeatureToTable(geojson.features[i], url))
	} else if (geojson.type && geojson.type=="Feature") {
		data.push(TransformGeoJSONFeatureToTable(geojson, url))
	} else 
		return null;
	
	return data;
}

function getFirstCoordinateGeoJSONGeometry(geometry) {
	if (!geometry.coordinates || !geometry.coordinates.length)
		return null;
	if (geometry.type==Point)
		return coordinates;
	else if ((geometry.type=="MultiPoint" || geometry.type=="LineString") && coordinates[0].length)
		return coordinates[0];
	else if ((geometry.type=="MultiLineString" || geometry.type=="Polygon") && coordinates[0].length && coordinates[0][0].length)
		return coordinates[0][0];
	else if (geometry.type=="MultiPolygon" && coordinates[0].length && coordinates[0][0].length && coordinates[0][0][0].length)
		return coordinates[0][0][0];
	else 
		return null;
}