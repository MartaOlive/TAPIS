

//https://csvw.org/
//https://w3c.github.io/csvw/metadata/#dialect-descriptions
function createCSVW(data, dataAttributesInput, delimiter) {
	var dataAttributes = dataAttributesInput ? dataAttributesInput : getDataAttributes(data);
	var dataAttributesArray = Object.keys(dataAttributes), dataAttribute, c;

	var csvw={ tableSchema: {
			"columns": []
		},
		"dialect": {
			"header": true,
			"delimiter": delimiter
		}
	};
	for (var a = 0; a < dataAttributesArray.length; a++) {
		dataAttribute=dataAttributes[dataAttributesArray[a]];
		csvw.tableSchema.columns.push({
			"name": dataAttributesArray[a],
			"datatype": getCSVWTypeFromAttributeType(dataAttribute.type),
		});
		c=csvw.tableSchema.columns[a];
		if (dataAttribute.description)
			c.titles=dataAttribute.description;
		if (dataAttribute.definition)
			c.propertyUrl=dataAttribute.definition;

		if (dataAttribute.UoM || dataAttribute.UoMSymbol || dataAttribute.UoMDefinition)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]={};
		if (dataAttribute.UoMDefinition)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["@id"]=dataAttribute.UoMDefinition;
		if (dataAttribute.UoM)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["rdfs:label"]=dataAttribute.UoM;
		if (dataAttribute.UoMSymbol)
			c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["http://qudt.org/schema/qudt#symbol"]=dataAttribute.UoMSymbol;

		/*if (dataAttribute.UoM)
			c.unitMeasureTitles=dataAttribute.UoM;
		if (dataAttribute.UoMSymbol)
			c.unitMeasureSymbol=dataAttribute.UoMSymbol;
		if (dataAttribute.UoMDefinition)
			c.unitMeasureUrl=dataAttribute.UoMDefinition;*/
	}
	return csvw;
}

function getDataAttributesCSVW(csvw){
	var dataAttributes = {}, c;
	for (var a = 0; a < csvw.tableSchema.columns.length; a++) {
		c=csvw.tableSchema.columns[a];
		dataAttributes[c.name]={
			"type": getAttributeTypeFromCSVWType(c.datatype),
			"description": (c.titles && typeof c.titles==="object") ? c.titles[Object.keys(c.titles)[0]] : c.titles,
			"definition": c.propertyUrl,
			"UoM": (c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"] && c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["@id"]) ? c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["@id"] : (c.unitMeasureTitles && typeof c.unitMeasureTitles === "object") ? c.unitMeasureTitles[Object.keys(c.unitMeasureTitles)[0]] : c.unitMeasureTitles,
			"UoMSymbol": (c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"] && c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["http://qudt.org/schema/qudt#symbol"]) ? c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["http://qudt.org/schema/qudt#symbol"] : c.unitMeasureSymbol,
			"UoMDefinition": (c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"] && c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["rdfs:label"]) ? c["http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure"]["rdfs:label"] : c.unitMeasureUrl
		};
	}
	return dataAttributes;
}

function getCSVWTypeFromAttributeType(t)
{
	if (t=="array" || t=="null" || t=="object" || t=="undefined")
		return "json";
	if (t=="number")
		return "float";
	if (t=="isodatetime")
		return "date";
	return t;
}

//Taking this into consideration: https://www.w3.org/TR/tabular-data-primer
function getAttributeTypeFromCSVWType(t) {
	if (typeof t==="object" && t.base)
		t=t.base;
	if (t=="json")
		return "object";
	if (t=="decimal" || t=="long" || t=="int" || t=="short" || t=="byte" || t=="nonNegativeInteger"  || t=="positiveInteger" || t=="unsignedLong" || t=="unsignedInt" || t=="unsignedShort" || t=="unsignedByte" || t=="nonPositiveInteger"  || t=="negativeInteger")
		return "number";
	if (t=="double" || t=="float")
		return "number";
	if (t=="date" || t=="time")
		return "isodatetime";
	if (t=="normalizedString" || t=="token" || t=="Name" || t=="NMTOKEN" || t=="xml" || t=="html")
		return "string";
	return t;
}

function getCSVReadParams(csvw){
	return csvw.dialect;
}
