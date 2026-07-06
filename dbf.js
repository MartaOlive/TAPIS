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

function getDBFTypeFromAttributeTypeFromDBFType(datatype) {
	switch (datatype) {
		case "string":
		case "array":
		case "object":
		case "geometry":
			return "C";
		case "boolean": 
			return "L";
		case "integer":
		case "number":
			return "N";
	}
	return "";
}

function addDBFsizeDBFtypeAttributes(data, dataAttributes) {
	var dataAttributesArray = Object.keys(dataAttributes), len;
	for (var i=0; i<dataAttributesArray.length;i++) {
		var dataAttribute=dataAttributes[dataAttributesArray[i]];
		dataAttribute.DBFtype=getDBFTypeFromAttributeTypeFromDBFType(dataAttribute.type)
		dataAttribute.DBFsize=dataAttribute.DBFtype=="L" ? 1 : 0;
	}
	for (var i=0; i<data.length;i++) {
		var record=data[i];
		var keys = Object.keys(record), len;
		for (var k = 0; k < keys.length; k++) {
			if (dataAttributes[keys[k]]) {
				var dataAttribute=dataAttributes[keys[k]]
				if (dataAttribute.type=="string") {
					len=record[keys[k]].length;
				} else if (dataAttribute.type=="array" || dataAttribute.type=="object") {
					try {
						len=JSON.stringify(record[keys[k]]).length;
					} catch(error) {
						len=0;
					}
				} else if (dataAttribute.type=="integer" || dataAttribute.type=="number") {
					len=record[keys[k]]<0 ? Math.floor(Math.log10(Math.abs(record[keys[k]])))+2 : Math.floor(Math.log10(record[keys[k]]))+1;
					if (dataAttribute.type=="number")
						len+=7;  //The dot and 6 decimal figures.
				} else {
					len=0;
				}
				if (dataAttribute.DBFsize<len)
					dataAttribute.DBFsize=len;
			}
		}
	}
}

function addDBFnameAttributes(dataAttributes, isMMExtended) {
	var dataAttributesArray = Object.keys(dataAttributes);
	var c;
	var offset=32+32*dataAttributesArray.length+1;
	for (var i=0; i<dataAttributesArray.length;i++) {
		var dataAttribute=dataAttributes[dataAttributesArray[i]];
		if (!dataAttribute.DBFtype)
			continue;
		//Review the names and convert them to classic names
		//Review the size:
		//dataAttribute.DBFname=dataAttributesArray[i].length>10 ? dataAttributesArray[i].substring(0,10) : dataAttributesArray[i];
		dataAttribute.DBFname=dataAttributesArray[i];
		//Review the caracters one by one
		if (dataAttribute.DBFname.charAt(0)=="_" || (dataAttribute.DBFname.charAt(6)=="_" && (dataAttribute.DBFname.charAt(7)=='0' || dataAttribute.DBFname.charAt(7)=='1' || dataAttribute.DBFname.charAt(7)=='2')))
			dataAttribute.DBFname=dataAttribute.DBFname.substring(0,6).toUpperCase() + (i<9 ? "00" + (i+1) : (i<99 ? "0" + (i+1) : i+1));
		else {
			dataAttribute.DBFname=dataAttribute.DBFname.toUpperCase();
			for (var i_c=0; i_c<(dataAttribute.DBFname.length>10 ? 10 : dataAttribute.DBFname.length); i_c++) {
				if (dataAttribute.DBFname.length>10 && i_c==6) {
					dataAttribute.DBFname=dataAttribute.DBFname.substring(0, i_c) + "_" + (i<9 ? "00" + (i+1) : (i<99 ? "0" + (i+1) : i+1));
					break;
				}
				c=dataAttribute.DBFname.charAt(i_c);
				if ((c>='A' && c<='Z') || (c>='0' && c<='9') || c=='_')
					continue;
				dataAttribute.DBFname=dataAttribute.DBFname.substring(0, i_c) + "_" + dataAttribute.DBFname.substring(i_c+1);
			}
		}
		if (isMMExtended) {
			dataAttribute.DBFextendedName=(dataAttributesArray[i]>128 ? dataAttributesArray[i].substring(0,128) : dataAttributesArray[i]).replaceAll('`','_').replaceAll('[','_').replaceAll(']','_').replaceAll('¨','_');
			dataAttribute.DBFoffsetExtendedName=offset;
			offset+=dataAttribute.DBFextendedName.length;
		}
	}
}

function isNecessaryExtendedDBF(dataAttributes) {
	var dataAttributesArray = Object.keys(dataAttributes);
	//In dBASE III+ de max is 128, In dBASE IV is 255.
	if (dataAttributesArray.length>255)
		return true;
	for (var i=0; i<dataAttributesArray.length; i++) {
		var dataAttribute=dataAttributes[dataAttributesArray[i]];
		if (dataAttribute.DBFtype=="C" && dataAttribute.DBFsize>254)
			return true;
	}
	return false;
}

function integerToUint8Array(myArr, offset, num, size) {
	for (var i = 0; i < size; i++) {
		myArr[offset+i] = num % 256;
		num = Math.floor(num / 256);
	}
}

function createUintArrayDBF(data, dataAttributesIn, forceExtendedDBF){
	var dataAttributes=dataAttributesIn ? deapCopy(dataAttributesIn) : getDataAttributes(data);
	var dataAttributesArray = Object.keys(dataAttributes);
	
	addDBFsizeDBFtypeAttributes(data, dataAttributes);
	//Determine if this needs to be an extended DBF. 
	var isMMExtended=forceExtendedDBF ? true : isNecessaryExtendedDBF(dataAttributes);
	//We do not consider incompatible field names, as a reason to have a extended DBF. We generate compatible names instead.
	addDBFnameAttributes(dataAttributes, isMMExtended);
	var offsetFirstRecord=32+32*dataAttributesArray.length+1;
	if (isMMExtended) {
		for (var i=0; i<dataAttributesArray.length; i++)
			offsetFirstRecord+=dataAttributes[dataAttributesArray[i]].DBFextendedName.length;
	}
	var recordSize=1;
	for (var i=0; i<dataAttributesArray.length; i++)
		recordSize+=dataAttributes[dataAttributesArray[i]].DBFsize;

	var DBFarray = new Uint8Array(offsetFirstRecord + recordSize*data.length);

	DBFarray[0]=isMMExtended ? 0x90 : 0x3;  //version
	var today = new Date();
	DBFarray[1]=today.getFullYear()-1900;
	DBFarray[2]=today.getMonth()+1;
	DBFarray[3]=today.getDate();
	integerToUint8Array(DBFarray, 4, data.length, 4);  //nrows
	integerToUint8Array(DBFarray, 8, offsetFirstRecord, 2);  //two lower bytes
	integerToUint8Array(DBFarray, 10, recordSize, 4);
	DBFarray[14]=0;  //Transaction flag
	DBFarray[15]=0;  //Encription flag
	//dBaseIV multi-user environment use
	for (var i=16; i<28; i++)
		DBFarray[i]=0;
	DBFarray[28]=0;  //Production index exists
	DBFarray[29]=0x14;  //OEM850
	if (isMMExtended)
		integerToUint8Array(DBFarray, 30, Math.floor(offsetFirstRecord/65536), 2);  //two higher bytes
	else {
		DBFarray[30]=0;
		DBFarray[31]=0;	
	}
	var offset=32;
	var dataAttribute;
	for (var i=0; i<dataAttributesArray.length; i++) {
		dataAttribute=dataAttributes[dataAttributesArray[i]];
		for (var j=0; j<dataAttribute.DBFname.length; j++)
			DBFarray[offset+j]=dataAttribute.DBFname.charCodeAt(j);
		for (; j<11; j++)
			DBFarray[offset+j]=0;
		DBFarray[offset+11]=dataAttribute.DBFtype.charCodeAt(0);
		DBFarray[offset+12]=0;
		DBFarray[offset+13]=0;
		DBFarray[offset+14]=0;
		DBFarray[offset+15]=0;
		DBFarray[offset+16]=(isMMExtended && dataAttribute.DBFtype=="C") ? 0 : dataAttribute.DBFsize%256;
		DBFarray[offset+17]=dataAttribute.type=="number" ? (dataAttribute.type=="integer" ? 0 : 6) : 0;  //Decimal figures
		DBFarray[offset+18]=0;
		DBFarray[offset+19]=0;
		DBFarray[offset+20]=0;  //dBaseIV work area ID
		if (isMMExtended)
			integerToUint8Array(DBFarray, offset+21, dataAttribute.DBFsize, 4);
		else {
			DBFarray[offset+21]=0;
			DBFarray[offset+22]=0;	
			DBFarray[offset+23]=0;	
			DBFarray[offset+24]=0;	
		}
		if (isMMExtended) {
			integerToUint8Array(DBFarray, offset+25, dataAttribute.DBFoffsetExtendedName, 4);
			integerToUint8Array(DBFarray, offset+29, dataAttribute.DBFextendedName.length, 1);
		}
		else {
			DBFarray[offset+25]=0;
			DBFarray[offset+26]=0;
			DBFarray[offset+27]=0;
			DBFarray[offset+28]=0;
			DBFarray[offset+29]=0;		
		}
		DBFarray[offset+30]=0;
		DBFarray[offset+31]=0;  //Field is part of production index
		offset+=32;
	}
	DBFarray[offset]=13;  //End of header
	offset++;
	if (isMMExtended) {
		for (var i=0; i<dataAttributesArray.length; i++) {
			var dataAttribute=dataAttributes[dataAttributesArray[i]];
			for (var j=0; j<dataAttribute.DBFextendedName.length; j++) {
				DBFarray[offset+j]=ansiToOem(dataAttribute.DBFextendedName.charCodeAt(j));
			}
			offset+=dataAttribute.DBFextendedName.length;
		}
	}
	var s;
	for (var i=0; i<data.length; i++) {
		var record=data[i];
		DBFarray[offset]=0;
		offset++;
		for (var j=0; j<dataAttributesArray.length; j++) {
			var dataAttribute=dataAttributes[dataAttributesArray[j]];
			var cell=record[dataAttributesArray[j]];
			if (typeof cell !== "undefined" && cell!=null) {
				switch (dataAttribute.type) {
					case "array":
					case "object":
					case "geometry":
						try {
							s=JSON.stringify(cell);
						} catch (error) {
							s="";
						}
						break;
					case "string":
						s=cell;
						break;
					case "boolean": 
						s=cell ? "T" : "F";
						break;					
					case "integer":
						try {
							s=Number.parseFloat(cell).toFixed(0);
						} catch (error) {
							s="";
						}
						break;						
					case "number":
						try {
							s=Number.parseFloat(cell).toFixed(6);
						} catch (error) {
							s="";
						}
						break;
					default:
						s="";
				}
			} else
				s="";

			if (dataAttribute.DBFtype=="N") {
				for (var k=0; k<dataAttribute.DBFsize-s.length; k++) {
					DBFarray[offset+k]=32;
				}
				offset+=dataAttribute.DBFsize-s.length;
				for (var k=0; k<s.length; k++) {
					DBFarray[offset+k]=s.charCodeAt(k);
				}
				offset+=s.length;
			} else {
				for (var k=0; k<s.length; k++) {
					DBFarray[offset+k]=(dataAttribute.DBFtype=="C") ? ansiToOem(s.charCodeAt(k)) : s.charCodeAt(k);
				}
				for (; k<dataAttribute.DBFsize; k++) {
					DBFarray[offset+k]=32;
				}
				offset+=dataAttribute.DBFsize;
			}
		}
	}
	return DBFarray;
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
