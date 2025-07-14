/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023-2025 Joan Masó

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

var SQLite=null;

async function ParseGPKGDatabase(buffer) {
	var gpkg={}, table, nTables, count, contents=null, tableName;
	const uInt8Array = new Uint8Array(buffer);
	if (!SQLite)
		SQLite=await initSqlJs({locateFile: file => "sql-wasm.wasm"})

	gpkg.db = new SQLite.Database(uInt8Array);
	const tables = gpkg.db.exec("SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'gpkg_%' AND name NOT LIKE 'gpkgext_%'");
	const exists_content = gpkg.db.exec("SELECT name FROM sqlite_schema WHERE type ='table' AND name LIKE 'gpkg_contents'")
	if (exists_content.length)
		contents = gpkg.db.exec("SELECT * FROM gpkg_contents");
	nTables=contents ? contents[0].values.length : tables[0].values.length;
	gpkg.records=[];
	for (var i=0; i<nTables; i++) {
		tableName=contents ? contents[0].values[i][0] : tables[0].values[i][0];
		if (tableName.startsWith("gpkgext_"))
			continue;
		table = gpkg.db.exec("pragma table_info('" + tableName + "')");
		count = gpkg.db.exec("SELECT COUNT(*) FROM " + tableName);
		gpkg.records.push({tableName: tableName,
				nRows: count[0].values[0][0],
				nColumns: table[0].columns.length});
		if (contents) {
			gpkg.records[gpkg.records.length-1].type=contents[0].values[i][1];
			gpkg.records[gpkg.records.length-1].description=contents[0].values[i][3];
			gpkg.records[gpkg.records.length-1].lastChange=contents[0].values[i][4];
		}
	}
	gpkg.attributes={tableName: {type:"string"},
			nRows: {type:"integer"},
			nColumns: {type:"integer"}};
	if (contents) {
		gpkg.attributes.type={type:"string"};
		gpkg.attributes.description={type:"string"};
		gpkg.attributes.lastChange={type:"isodatetime"};
	}
	
	return gpkg;
}

function ParseGPKGTable(db, tableName){
	var gpkg={}, record;
	var table= db.exec("SELECT * FROM " + tableName);
	var tableInfo = db.exec("pragma table_info('" + tableName + "')");	
	gpkg.records=[];
	var nRows=table[0].values.length;
	var nColumns=table[0].columns.length;
	for (var i=0; i<nRows; i++) {
		record=gpkg.records[i]={};
		for (var j=0; j<nColumns; j++) {
			record[table[0].columns[j]]=table[0].values[i][j];
		}
	}
	gpkg.attributes={};
	for (var j=0; j<tableInfo[0].values.length; j++) {
		gpkg.attributes[tableInfo[0].values[j][1]]={type: getAttributeTypeFromGPKGType(tableInfo[0].values[j][2])};
	}
	return gpkg;
}

function getAttributeTypeFromGPKGType(datatype) {
	switch (datatype) {
		case 'NUMERIC':
		case 'NUMERIC':
		case 'DECIMAL(10,5)':
		case 'REAL':
		case 'DOUBLE':
		case 'DOUBLE PRECISION':
		case 'FLOAT':
			return "number";
		case 'INT':
		case 'INTEGER':
		case 'TINYINT':
		case 'SMALLINT':
		case 'MEDIUMINT':
		case 'BIGINT':
		case 'UNSIGNED BIG INT':
		case 'INT2':
		case 'INT8':
			return "integer";
		case 'BOOLEAN':
			return "boolean";
		case 'DATE':
		case 'DATETIME':
			return "isodatetime";
		case 'TEXT':
		default:
			return "string";
	}
}

