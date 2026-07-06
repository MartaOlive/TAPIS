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

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at ieee org) 
    dins del grup del MiraMon. MiraMon és un projecte del 
    CREAF que elabora programari de Sistema d'Informació Geogràfica 
    i de Teledetecció per a la visualització, consulta, edició i anàlisi 
    de mapes ràsters i vectorials. Aquest progamari programari inclou
    aplicacions d'escriptori i també servidors i clients per Internet.
    No tots aquests productes són gratuïts o de codi obert. 
    
    En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
    El TAPIS es pot actualitzar des de https://github.com/grumets/tapis.
*/

"use strict"


//https://dmitripavlutin.com/ecmascript-modules-dynamic-import/
async function startDGGAL() {
	const { 
		default: DGGAL,
	} = await import('./dggal.js');
	window.dggal = await DGGAL.init();
	window.DGGAL = DGGAL;
	window.DGGSDefs=getNamesAndDescriptionsDGGS();
}

function stopDGGAL(){
    dggal.terminate();
    dggal = null;
}

//returns point in format {longitude:, latitude:}
function DGGSToLongLat(dggrsName, zoneID) {
	const dggrs = dggal.createDGGRS(dggrsName);
	const point=dggrs.getZoneWGS84Centroid(dggrs.getZoneFromTextID(zoneID));
	dggrs.delete();
	return {longitude: point.lon*180/Math.PI, latitude: point.lat*180/Math.PI};
}

//point in format {longitude:, latitude:}
function LongLatToDGGS(dggrsName, point, level) {
	const dggrs = dggal.createDGGRS(dggrsName);
	const s=dggrs.getZoneTextID(dggrs.getZoneFromWGS84Centroid(level, {lon: point.longitude*Math.PI/180, lat: point.latitude*Math.PI/180}));
	dggrs.delete();
	return s;
}

//returns an array of points in json coordinates format.
function DGGSToBoundary(dggrsName, zoneID) {
	const dggrs = dggal.createDGGRS(dggrsName);
	let points=dggrs.getZoneWGS84Vertices(dggrs.getZoneFromTextID(zoneID));
	for (var i=0; i<points.length; i++)
		points[i]=[points[i].lon*180/Math.PI, points[i].lat*180/Math.PI];
	dggrs.delete();
	return points;
}

function DGGSZonesInABBox(dggrsName, minLong, minLat, maxLong, maxLat, level) {
	const dggrs = dggal.createDGGRS(dggrsName);
	let zones=dggrs.listZones(level,{ll:{lon:minLong*Math.PI/180, lat:minLat*Math.PI/180}, ur:{lon:maxLong*Math.PI/180, lat:maxLat*Math.PI/180}});
	for (var i=0; i<zones.length; i++)
		zones[i]=dggrs.getZoneTextID(zones[i]);
	dggrs.delete();
	return zones;
}

function getMaxLevelDGGS(dggrsName) {
	const dggrs = dggal.createDGGRS(dggrsName);
	const level = dggrs.getMaxDGGRSZoneLevel();
	dggrs.delete();
	return level;
}

function getNamesAndDescriptionsDGGS() {
	var l, list=dggal.listDGGRS();
	for (var i=0; i<list.length; i++) {
		l=list[i]={name:list[i]};
		switch (l.name) {
			case 'GNOSISGlobalGrid':
				l.group="Axis-aligned DGGRS in WGS84 latitude and longitude"
				l.description="Quad-tree in WGS84 latitude/longitude with special polar handling";
				break;
			case 'ISEA4R':
				l.group="Icosahedral Snyder Equal Area (ISEA) projection"
				l.description="Rhombic grid with a refinement ratio of 4, transformed into a 5x6 Cartesian space resulting in axis-aligned square zones";
				break;
			case 'ISEA9R':
				l.description="Rhombic grid with a refinement ratio of 9, transformed into a 5x6 Cartesian space resulting in axis-aligned square zones";
				break;
			case 'ISEA3H':
				l.description="Hexagonal grid with a refinement ratio of 3";
				break;
			case 'ISEA7H':
				l.description="Hexagonal grid with a refinement ratio of 7";
				break;
			case 'ISEA7H_Z7':
				l.description="Same as ISEA7H, but using the Z7 indexing";
				break;
			case 'IVEA4R':
				l.group="Icosahedral Vertex-oriented great circle Equal Area (IVEA) projection"
				l.description="Rhombic grid with a refinement ratio of 4, transformed into a 5x6 Cartesian space resulting in axis-aligned square zones";
				break;
			case 'IVEA9R':
				l.description="Rhombic grid with a refinement ratio of 9 ,transformed into a 5x6 Cartesian space resulting in axis-aligned square zones";
				break;
			case 'IVEA3H':
				l.description="Hexagonal grid with a refinement ratio of 3";
				break;
			case 'IVEA7H':
				l.description="Hexagonal grid with a refinement ratio of 7";
				break;
			case 'IVEA7H_Z7':
				l.description="Same as IVEA7H, but using the Z7 indexing";
				break;
			case 'RTEA4R':
				l.group="Rhombic Triacontahedron (Snyder) Equal-Area (RT(S)EA) projection";
				l.description="Rhombic grid with a refinement ratio of 4, transformed into a 5x6 Cartesian space resulting in axis-aligned square zones";
				break;
			case 'RTEA9R':
				l.description="Rhombic grid with a refinement ratio of 9, transformed into a 5x6 Cartesian space resulting in axis-aligned square zones";
				break;
			case 'RTEA3H':
				l.description="Hexagonal grid with a refinement ratio of 3";
				break;
			case 'RTEA7H':
				l.description="Hexagonal grid with a refinement ratio of 7";
				break;
			case 'RTEA7H_Z7':
				l.description="Same as RTEA7H, but using the Z7 indexing";
				break;
			case 'HEALPix':
				l.group="Axis-aligned and Equal-Area DGGRSs based on HEALPix Projection"
				l.description="Square zones topology and a refinement ratio of 4, using configuration Nφ/H = 4, Nθ/K = 3";
				break;
			case 'rHEALPix':
				l.description="Square zones topology and a refinement ratio of 9, using 50° E prime meridian";
				break;
		}
	}
	return list;
}

function getTitleDGGS(DGGSDef){
	if (DGGSDef.description)
		return DGGSDef.name + ": " + DGGSDef.description;
	return DGGSDef.name;
}

function getOptionsSelectDGGS(selectedId) {
var cdns=[], areThereGroup=false;

	for (var i=0; i<DGGSDefs.length; i++){
		if (DGGSDefs[i].group) {
			if (areThereGroup);
				cdns.push("</optgroup>");
			cdns.push("<optgroup label=\"", DGGSDefs[i].group, "\">");
			areThereGroup=true;
		}
		cdns.push("<option value=\"", DGGSDefs[i].name, "\"", ((selectedId && DGGSDefs[i].name==selectedId) || DGGSDefs[i].name[i]=="ISEA3H"? "selected=\"selected\"" : ""), ">", 
			getTitleDGGS(DGGSDefs[i]), "</option>");
	}
	if (areThereGroup);
		cdns.push("</optgroup>");
	return cdns.join("");
}

