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

const littleEnddian=true;

function ParseDBF(buffer) {
	var dataView = new DataView(buffer);

	var dbf={};
	dbf.version=dataView.getUint8(0);
	dbf.isMMExtended=(dbf.version==0x90) ? true : false;
	dbf.date=new Date(1900+dataView.getUint8(1), dataView.getUint8(2), dataView.getUint8(3));
	dbf.nRecords=dataView.getUint32(4, littleEnddian);
	dbf.offsetFirstRecord=dataView.getUint16(8, littleEnddian) + (dbf.isMMExtended ? dataView.getUint16(30,littleEnddian)<<16 : 0);
	dbf.recordBytes=dbf.isMMExtended ? dataView.getUint32(10, littleEnddian) : dataView.getUint16(10, littleEnddian);
	dbf.characterEncoding=dataView.getUint8(29);

	dbf.attributes=[];
	var i=0, c, attribute, offset=0, recordBytes=1;
	do {
		dbf.attributes[i]={};
		attribute=dbf.attributes[i];
		offset+=32;
		attribute.name="";
		for (var j=0; j<10; j++) {
			c=dataView.getUint8(offset+j);
			if (c==0) 
				break;
			attribute.name+=String.fromCharCode(dbf.characterEncoding==0x14 ? oemToAnsi(c): c);
		}
		attribute.datatype=String.fromCharCode(dataView.getUint8(offset+11));
		attribute.length=(dbf.isMMExtended && attribute.datatype=='C' && dataView.getUint8(offset+16)==0) ? dataView.getUint32(offset+21,littleEnddian) : dataView.getUint8(offset+16);
		attribute.decFigures=dataView.getUint8(offset+17);
		if (dbf.isMMExtended) {
			var offsetLongName=dataView.getUint32(offset+25, littleEnddian);
			var lengthLongName=dataView.getUint8(offset+29);
			if (lengthLongName>0 && lengthLongName<129 && offsetLongName<dbf.offsetFirstRecord) {
				attribute.longName="";
				for (var j=0; j<lengthLongName; j++) {
					c=dataView.getUint8(offsetLongName+j);
					if (c==0)
						break;
					attribute.longName+=String.fromCharCode(dbf.characterEncoding==0x14 ? oemToAnsi(c): c);
				}
			}
		}
		attribute.offsetInRecord=recordBytes;
		recordBytes+=attribute.length;
		i++;
	} while(recordBytes<dbf.recordBytes);
	var record, s;
	var dt=new Date();
	dbf.records=[];
	for (var r=0; r<dbf.nRecords; r++) {
		dbf.records[r]={};
		record=dbf.records[r];
		offset=dbf.offsetFirstRecord+dbf.recordBytes*r;
		for (var i=0; i<dbf.attributes.length; i++) {
			attribute=dbf.attributes[i];
			s="";
			switch (attribute.datatype) {
				case 'N':
				case 'F':
				case 'D':
					for (var j=0; j<attribute.length; j++) {
						c=dataView.getUint8(offset+attribute.offsetInRecord+j);
						if (c==0)
							break;
						s+=String.fromCharCode(c);
					}
					break;
				case 'C':
					for (var j=0; j<attribute.length; j++) {
						c=dataView.getUint8(offset+attribute.offsetInRecord+j);
						if (c==0)
							break;
						s+=String.fromCharCode(dbf.characterEncoding==0x14 ? oemToAnsi(c): c);
					}
					break;
			}
			var name=attribute.longName ? attribute.longName : attribute.name
			//Data types are based on https://www.dbase.com/KnowledgeBase/int/db7_file_fmt.htm
			switch (attribute.datatype) {
				case 'C':
					record[name]=s.trimEnd();
					break;
				case 'N':
				case 'F':
					record[name]=parseFloat(s.trim());
					break;
				case 'D':
					record[name]=s.substring(0,4) + '-' + s.substring(4,2) + '-' + s.substring(6,2);
					break;
				case 'L':
					s=String.fromCharCode(dataView.getUint8(offset+attribute.offsetInRecord));
					switch (s) {
						case 'T':
						case 't':
						case 'Y':
						case 'y':
						case 'S':
						case 's':
						case 'O':
						case 'o':
						case '1':
							record[name]=true;
							break;
						case 'F':
						case 'f':
						case 'N':
						case 'n':
						case '0':
							record[name]=false;
							break;
					}
					break;
				case '@':  //Timestamp
					var date=dataView.getUint32(offset+attribute.offsetInRecord, littleEnddian);
					var time=dataView.getUint32(offset+attribute.offsetInRecord+4, littleEnddian);
					//Days between Jan 1, 4713BC and Jan 1,1970: http://calendario.eugeniosongia.com/eng_duration.htm
					date-2440953;
					dt.setTime((date-2440953)*24*60*60*1000+time);
					record[name]=dt.getFullYear() + '-' + (dt.getMonth+1) + '-' + dt.getDate() + 'T' + dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds() + 'Z'; 
					break;
				case 'I':
				case '+':
					record[name]=dataView.getInt32(offset+attribute.offsetInRecord);
					break;
				case 'O':
					record[name]=dataView.getFloat64(offset+attribute.offsetInRecord);
					break;
				default:
					;		
			}
		}
	}
	return dbf;
}

function getAttributeTypeFromDBFType(datatype) {
	switch (datatype) {
		case 'C':
			return "string";
		case 'N':
		case 'F':
		case 'O':
			return "number";
		case 'I':
		case '+':
			return "integer";
		case 'D':
		case '@':  //Timestamp
			return "isodatetime";
		case 'L':
			return "boolean";
		default:
			return "string";
	}
}

function getDataAttributesDBF(dbf){
	var dataAttributes = {}, attribute;
	for (var a = 0; a < dbf.attributes.length; a++) {
		attribute=dbf.attributes[a];
		dataAttributes[attribute.longName ? attribute.longName : attribute.name]={
			"type": getAttributeTypeFromDBFType(attribute.datatype)
		};
	}
	return dataAttributes;
}

