//iNaturalistToSTA+
function applyAutocompleteFunctioniNaturalist(node) {

    document.getElementById("DialogMultiCreateSTAINaturalist").showModal();
}
function addINatEntitiesInfoToNode(node) {
    var photos = (document.getElementById("ObservationsToCreate_photo").checked) ? true : false;
    var userIdentification = (document.getElementById("ObservationsToCreate_userIdentification").checked) ? true : false;
    var othersIdentification = (document.getElementById("ObservationsToCreate_othersIdentification").checked) ? true : false;
    var license = "";
    //var license = GetSTALicense(license);

    var entities = {
        general: {
            observationGroup: {
                name: "ObservationGroup",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "uri", text: "" },
                    description: { attribute: "", text: "Observation of <b> attribute from species_guess </b>" },
                    creationTime: { attribute: "created_at_utc", text: "" }
                },
            }
        }
    };
    if (photos) {
        entities.photos = {
            Party: {
                name:"Party",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    displayName: { attribute: "user_login", text: "" },
                    role: { attribute: "", text: "individual" }
                }
            },
            observedProperty: {
                name: "ObservedProperty",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Species picture" },
                    description: { attribute: "", text: "A picture for species identification" },
                    definition: { attribute: "", text: "https://www.inaturalist.org/guides/2465" }
                }
            },
            sensor: {
                name:"Sensor",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Generic camera" },
                    description: { attribute: "", text: "A camera or a smartphone build-in camera" },
                    encodingType: { attribute: "", text: "text/html" },
                    metadata: { attribute: "", text: "https://en.wikipedia.org/wiki/Camera" }
                }
            },
            thing: {
                name:  "Thing",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Camera of <b> attribute from user_login </b>" },
                    description: { attribute: "", text: "Camera of <b> attribute from user_login </b> as a sensor to identify a species" },
                }
            },
            datastream: {
                name: "Datastream",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    unitOfMeasurement: { attribute: "", text: '{"name":"N/A","symbol": "","definition": "N/A"}' },
                    observationType: { attribute: "", text: "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement" },
                    name: { attribute: "", text: "Pictures for Species Identification (<b> attribute from user_login </b>, Taxon)" },
                    description: { attribute: "", text: "Observations of species pictures for identification of the iNaturalist user <b> attribute from user_login </b> from the camera sersor observing the property 'taxon' under the license '<b> attribute from license </b>" }

                }
            },
            observation: {
                name: "Observation",
                radioChecked:"properties",
                properties: {
                    result: { attribute: "", text: " <b> from attribute large_url </b>" }, //obj.natObs.observation[obj.iPictureObservation].photo.large_url,--> Array 
                    resultTime: { attribute: "s", text: "Date <b> from attribute created_at </b>  " },  // d.toISOString(), 	var d = new Date(obj.natObs.observation_photos[obj.iPictureObservation].photo.created_at);	
                    phenomenonTime: { attribute: "time_observed_at_utc ", text: "" }, //(obj.natObs.time_observed_at_utc ? obj.natObs.time_observed_at_utc : obj.natObs.created_at_utc),
                    parameters: { attribute: "", text: '{"species_guess" : <b> from attribute species_guess </b>}' }

                }
            },
            featureOfInterest_photos: { //photo and identification from user
                name:  "FeatureOfInterest", 
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "place_guess", text: "" },
                    description: { attribute: "", text: "<b> attribute from place_guess </b>.Posicional accurancy: If exist <b> attribute from positional_accuracy </b>, Positioning device: If exist <b> attribute from positioning_device </b>, Positioning method: If exist <b> attribute from positioning_method </b>, Coordinates obscured: If exist <b> attribute from coordinates_obscured </b> " },
                    encodingType: { attribute: "", text: "application/geo+json" },
                    feature: { attribute: "", text: '{"type": "Feature","geometry": { type": "Point","coordinates": [<b> attribute from longitude </b>, <b> attribute from latitud </b>]}}' }

                }
            },
            //license: license

        }
    };

    if (userIdentification) {
        entities.userIdentification = {
            Party: {
                name:  "Party",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    displayName: { attribute: "user_login", text: "" },
                    role: { attribute: "", text: "individual" }
                }
            },
            observedProperty: {
                name: "ObservedProperty", 
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Taxon" },
                    description: { attribute: "", text: "GBIF Backbone Taxonomy" },
                    definition: { attribute: "", text: "https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c" },
                }
            }
            ,
            sensor: {
                name: "Sensor", 
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Human Eye" },
                    description: { attribute: "", text: "Eye of the observer" },
                    encodingType: { attribute: "", text: "text/html" },
                    metadata: { attribute: "", text: "https://en.wikipedia.org/wiki/Human_eye" }
                }

            },
            thing: {
                name:  "Thing",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "user_login", text: "" },
                    description: { attribute: "", text: "Human as a sensor" }
                }

            },
            datastream: {
                name: "Datastream", 
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    unitOfMeasurement: { attribute: "", text: '{"name":"Identifier","symbol": "","definition": "https://www.gbif.org/species"}' },
                    observationType: { attribute: "", text: "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement" },
                    name: { attribute: "", text: "Community Agreed Species Identification (<b> attribute from user_loguin </b>, Taxon)" },
                    description: { attribute: "", text: "Agreed Observations of species identification started by the iNaturalist user <b> attribute from user_loguin </b>  from the eyes of a human acting as a sersor observing the property 'taxon' under the license <b> attribute from license </b>" },

                }
            },
            observation: {
                name:"Observation",
                radioChecked:"properties",
                properties: {
                    result: { attribute: "", text: "If exist <b> attribute from community_taxon_id</b> or <b> attribute from taxon_id</b> " },
                    resultTime: { attribute: "created_at", text: "" },
                    phenomenonTime: { attribute: "", text: "If exist <b> attribute from time_observed_at_utc</b> or <b> attribute from created_at_utc</b> " },

                }

            },
            featureOfInterest: { //photo and identification from user
                name: "FeatureOfInterest",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "place_guess", text: "" },
                    description: { attribute: "", text: "<b> attribute from place_guess </b>.Posicional accurancy: If exist <b> attribute from positional_accuracy </b>, Positioning device: If exist <b> attribute from positioning_device </b>, Positioning method: If exist <b> attribute from positioning_method </b>, Coordinates obscured: If exist <b> attribute from coordinates_obscured </b> " },
                    encodingType: { attribute: "", text: "application/geo+json" },
                    feature: { attribute: "", text: '{"type": "Feature","geometry": { type": "Point","coordinates": [<b> attribute from longitude </b>, <b> attribute from latitud </b>]}}' }
                }
            },
            // license: license
        }
    };
    if (othersIdentification) {
        entities.othersIdentification = {
            party: {
                name: "Party",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    displayName: { attribute: "", text: "user.login" },
                    role: { attribute: "", text: "individual" }
                }
            },
            sensor: {
                name:  "Sensor",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Human Eye" },
                    description: { attribute: "", text: "Eye of the observer" },
                    encodingType: { attribute: "", text: "text/html" },
                    metadata: { attribute: "", text: "https://en.wikipedia.org/wiki/Human_eye" }
                }
            },
            observedProperty: {
                name: "ObservedProperty",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "Taxon" },
                    description: { attribute: "", text: "GBIF Backbone Taxonomy" },
                    definition: { attribute: "", text: "https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c" },
                }

            },
            thing: {
                name: "Thing",
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    name: { attribute: "", text: "user" },
                    description: { attribute: "", text: "Human as a sensor" }
                }

            },
            datastream: {
                name:  "Datastream", 
                radioChecked:"properties",
                properties: {
                    id: { attribute: "", text: "" },
                    unitOfMeasurement: { attribute: "", text: '{"name":"Identifier","symbol": "","definition": "https://www.gbif.org/species"}' },
                    observationType: { attribute: "", text: "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement" },
                    name: { attribute: "", text: "Community Agreed Species Identification (<b> attribute from user.loguin </b>, Taxon)" },
                    description: { attribute: "", text: "Agreed Observations of species identification started by the iNaturalist user <b> attribute from user.loguin </b>  from the eyes of a human acting as a sersor observing the property 'taxon' </b>" },

                }
            },
            observation: {
                name: "Observation",
                radioChecked:"properties",
                properties: {
                    result: { attribute: "", text: "If exist <b> attribute from community_taxon_id</b> or <b> attribute from taxon_id </b> " },
                    resultTime: { attribute: "created_at", text: "" },
                    phenomenonTime: { attribute: "", text: "<b> attribute from created_at</b> " },
                }

            },
        }
    };
    node.STAMultiCreateInformation. infoSaved.origin[0]== "general";
    node.STAMultiCreateInformation.infoSaved.origin[1]=="Observations"

    node.STAMultiCreateInformation.infoSaved.entities = entities;
    networkNodes.update(node);
}


function ChooseObservationsToCreateINAT2STAPlus(event) {
    event.preventDefault();
    var node = getNodeDialog("DialogMultiCreateSTA");
    addINatEntitiesInfoToNode(node)
    drawEntitiesInDialogMultiCreateSTA(node)
    document.getElementById("DialogMultiCreateSTAINaturalist").close()



}

function drawEntitiesInDialogMultiCreateSTA(node) {
    var entitiesInInfoSaved = node.STAMultiCreateInformation.infoSaved.entities;
    var parentsInformation = node.STAMultiCreateInformation.parentsInformation;
    var parentsInformationKeys = Object.keys(parentsInformation);
    //Tabs
    var c = [];
    c.push(`<fieldset><legend>STAService connected: </legend>
	<label><b>url:</b> ${node.STAMultiCreateInformation.STAService}</label>
	</fieldset>`);
    //Observation group
    // c.push(`<fieldset><legend>${entitiesInInfoSaved.observationGroup.name.text}</legend>
    //     <div style="border: 1px solid black; background-color: #b4dff7; padding-top:5px;padding-bottom:5px; margin-bottom:5px">
    //     < input type = "radio" value = "id" name = "DialogMultiCreateSTA_entitiesProperty_INat_observationGroup_observationGroup}"
    //     id = "DialogMultiCreateSTA_entitiesProperty_INat_observationGroup_observationGroup_id"
    //     onclick = "radiobuttonSelectedPropertiesOrIdMulticreateSTAINat('observationGroup','observationGroup', 'id')" >
    //     </div>
    //     < div style = "border: 1px solid black;" >
    //     < input type = "radio" value = "id" name = "DialogMultiCreateSTA_entitiesProperty_INat_observationGroup_observationGroup" 
    //      id = "DialogMultiCreateSTA_entitiesProperty_INat_observationGroup_observationGroup_properties"
    //      onclick = "radiobuttonSelectedPropertiesOrIdMulticreateSTAINat('observationGroup','observationGroup','properties')" >
	// 	<span style="font-weight: bold;">Properties</span><ul>
    //     <li><label style="font-weight: bold" for="autocompleteTabINat_photos_propertiesSelect_${entity.name.name}_${objectKeys[e]}">${objectKeys[e]}:</label>
    //     <select id="autocompleteTabINat_observationGroup_propertiesSelect_observationGroup_name" ${(entitiesInInfoSaved.observationGroup["name"].text != "") ? "style='display: none;'" : ""}>
    //     `);
    
    // for (var s = 0; s < parentsInformationKeys.length; s++) {//every key (parentNode) has ther attributes
    //     c.push(`<optgroup label="${parentsInformation[parentsInformationKeys[s]].label}">`)
    //     for (var att = 0; att < parentsInformation[parentsInformationKeys[s]].attributesKeys.length; att++) { //parentNode attributes (keys)
    //         value = `${parentsInformationKeys[s]}_${parentsInformation[parentsInformationKeys[s]].attributesKeys[att]}`
    //         c.push(`<option value="${value}"`); //value: idNode_attributeValue
    //         valueToEvaluate = parentsInformationKeys[s] + "_" + entity.properties[objectKeys[e]].attribute
    //         if (valueToEvaluate == value) { //Options of select
    //             c.push(" selected ")
    //         }
    //         c.push(`>${parentsInformation[parentsInformationKeys[s]].attributesKeys[att]}</option>`);
    //     }
    //     c.push("</optgroup>")
    // }
    // c.push(`</select> <span>${entity.properties[objectKeys[e]].text} </span> <button onClick="changeInfoInNodeINat2STAPlus(" photos","${entity} ", "${objectKeys[e]} ")" ${(entity.properties[objectKeys[e]].text == "") ? "style='display: none;'" : ""}> Select an attribute</button > <br>`)





    c.push(`< div id = "autocompleteTabINat_bar" > `)
    if (entitiesInInfoSaved.photos) {
        c.push(`< div id = "autocompleteTabINat_tab_photos" onClick = "changeTabINatBar('photos')" style = "border: 1px solid black;display: inline-block" > Photos</div > `);
    }
    if (entitiesInInfoSaved.userIdentification) {
        c.push(`< div id = "autocompleteTabINat_tab_photos" onClick = "changeTabINatBar('userIdentification')" style = "border: 1px solid black;display: inline-block" > User identification</div > `);
    }
    if (entitiesInInfoSaved.othersIdentification) {
        c.push(`< div id = "autocompleteTabINat_tab_photos" onClick = "changeTabINatBar('userIdentification')" style = "border: 1px solid black;display: inline-block" > Other users identification</div > `);
    }
    c.push(`</div > `);
    c.push(`< div id = "autocompleteTabINat_div_containingPages" > `);

    //pages
    var objectKeys, entitiesInPage, entity;

    var valueToEvaluate;
    var firstPropertyAdded;

    if (entitiesInInfoSaved.photos) {
        entitiesInPage = Object.keys(entitiesInInfoSaved.photos);
        c.push(`< div id = "autocompleteTabINat_div_containingPages_photos" > <span>Photos</span>`);
        for (var i = 0; i < entitiesInPage.length; i++) { //entities
            firstPropertyAdded = false;
            entity = entitiesInInfoSaved.photos[entitiesInPage[i]];
            objectKeys = Object.keys(entity.properties);
            c.push(`< fieldset > <legend>${entity.name.text}</legend>`);
            for (var e = 0; e < objectKeys.length; e++) { //properties
                if (objectKeys[e] == "id") {
                    c.push(`< div style = "border: 1px solid black; background-color: #b4dff7; padding-top:5px;padding-bottom:5px; margin-bottom:5px" > `);
                    c.push(`< input type = "radio" value = "id" name = "DialogMultiCreateSTA_entitiesProperty_INat_photos_${entitiesInPage[i]}"
                    id = "DialogMultiCreateSTA_entitiesProperty_INat_photos_${entitiesInPage[i]}_id"
                    onclick = "radiobuttonSelectedPropertiesOrIdMulticreateSTAINat('photos','${entitiesInPage[i]}', 'id')" > `);
                    // ${(infoSaved.entities[STAEntitiesArray[i]][properties[e].name].checked == "true") ? "checked" : ""}
                } else if (firstPropertyAdded == false) {
                    c.push(`< div style = "border: 1px solid black;" > `);
                    firstPropertyAdded = true;
                    c.push(`< input type = "radio" value = "id" name = "DialogMultiCreateSTA_entitiesProperty_INat_photos_${entitiesInPage[i]} " 
                    id = "DialogMultiCreateSTA_entitiesProperty_INat_photos_${entitiesInPage[i]}_properties"
                        onclick = "radiobuttonSelectedPropertiesOrIdMulticreateSTAINat('photos','${entitiesInPage[i]}', 'properties')" >
						<span style="font-weight: bold;">Properties</span><ul>`);
                    // ${(infoSaved.entities[STAEntitiesArray[i]][properties[e].name].checked == "true") ? "checked" : ""}

                }
                if (objectKeys[e] != "id") c.push("<li>")
                c.push(`<label style="font-weight: bold" for="autocompleteTabINat_photos_propertiesSelect_${entity.name.name}_${objectKeys[e]}">${objectKeys[e]}:</label>
                <select id="autocompleteTabINat_photos_propertiesSelect_${entity.name.name}_${objectKeys[e]}" ${(entity.properties[objectKeys[e]].text != "") ? "style='display: none;'" : ""}>`); //Hidde if there is text
                c.push(`<option value="">-- Select the corresponding attribute -- </option>`)

                for (var s = 0; s < parentsInformationKeys.length; s++) {//every key (parentNode) has ther attributes
                    c.push(`<optgroup label="${parentsInformation[parentsInformationKeys[s]].label}">`)
                    for (var att = 0; att < parentsInformation[parentsInformationKeys[s]].attributesKeys.length; att++) { //parentNode attributes (keys)
                        value = `${parentsInformationKeys[s]}_${parentsInformation[parentsInformationKeys[s]].attributesKeys[att]}`
                        c.push(`<option value="${value}"`); //value: idNode_attributeValue
                        valueToEvaluate = parentsInformationKeys[s] + "_" + entity.properties[objectKeys[e]].attribute
                        if (valueToEvaluate == value) { //Options of select
                            c.push(" selected ")
                        }
                        c.push(`>${parentsInformation[parentsInformationKeys[s]].attributesKeys[att]}</option>`);
                    }
                    c.push("</optgroup>")
                }
                c.push(`</select> <span>${entity.properties[objectKeys[e]].text} </span> <button onClick="changeInfoInNodeINat2STAPlus(" photos","${entity} ", "${objectKeys[e]} ")" ${(entity.properties[objectKeys[e]].text == "") ? "style='display: none;'" : ""}> Select an attribute</button > <br>`)
                if (objectKeys[e] == "id") c.push(`</div >`);
            }
            c.push(`</fieldset > `)
        }

        c.push(`</div > `);

    }
    if (entitiesInInfoSaved.userIdentification) {
        c.push(`< div id = "autocompleteTabINat_div_containingPages_userIdentification" > <span>User identification</span>`);
        c.push(`</div > `);
    }
    if (entitiesInInfoSaved.othersIdentification) {
        c.push(`< div id = "autocompleteTabINat_div_containingPages_othersIdentification" > <span>Other users identification</span>`);
        c.push(`</div > `);
    }
    c.push(`</div > `);
    document.getElementById("DialogMultiCreateSTA_span").innerHTML = c.join("");

}
function changeInfoInNodeINat2STAPlus(tab, entity, property, selectInfo) {

}
function radiobuttonSelectedPropertiesOrIdMulticreateSTAINat(page, entity, property) {

}
function GetSTALicense(natLicense) {

}



















//valueToShowText = [true or false, if true, only when this column is selected. False with "", always, value is text]
// var entitiesForTaxon = {


// };
// var entitiesForPicture={

// }

// var party = {
//     "displayName": (obj.iIdentification == -1 ? obj.natObs.user_login : obj.natObs.identifications[obj.iIdentification].user.login),
//     "role": "individual",  //"institution"
//     "@iot.id": create_UUID(true)  //Only specify if you want to have control on the @iot.id value.
// }
// var sensor = {
//     "name": "Human Eye",
//     "description": "Eye of the observer",
//     "encodingType": "text/html",
//     "metadata": "https://en.wikipedia.org/wiki/Human_eye"

/*
var observedProperty = {
    "name": "Taxon",
    "description": "GBIF Backbone Taxonomy",
    "definition": "https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
}
var datastream = {
    "unitOfMeasurement": {
        "name": "Identifier",
        "symbol": "",
        "definition": "https://www.gbif.org/species"
    },
    "observationType": "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement",
    "name": "Community Agreed Species Identification (" + obj.natObs.user_login + ", Taxon)",
    "description": "Agreed Observations of species identification started by the iNaturalist user '" + obj.natObs.user_login + "'" + (obj.projectId ? " in the project '" + obj.natObs.project_observations[0].project.title + "'" : "") + " from the eyes of a human acting as a sersor observing the property 'taxon' under the license '" + obj.natObs.license + "'.",
    "Party": { "@iot.id": obj.startingPartyId },
    "Sensor": { "@iot.id": obj.humanSensorId },
    "ObservedProperty": { "@iot.id": obj.taxonObservedPropertyId },
    "Thing": { "@iot.id": obj.startingHumanThingId },
};
var thing = {
    "name": (obj.iIdentification == -1 ? obj.natObs.user_login : obj.natObs.identifications[obj.iIdentification].user.login),
    "description": "Human as a sensor",
    "Party": { "@iot.id": obj.startingPartyId }
}
var location; //NO se si existeix... sha de buscar
var historicalLocation; //No existeix

var observation = {
    "result": (obj.iIdentification == -1 ? (obj.natObs.community_taxon_id ? obj.natObs.community_taxon_id : obj.natObs.taxon_id) : obj.natObs.identifications[obj.iIdentification].taxon_id),
    "resultTime": created_at,
    "phenomenonTime": (obj.natObs.time_observed_at_utc ? obj.natObs.time_observed_at_utc : obj.natObs.created_at_utc),
    "FeatureOfInterest": { "@iot.id": obj.featureOfInterestId },
    "Groups": [{ "@iot.id": obj.groupId }]
};
var featureOfInterest = {
    "name": obj.natObs.place_guess,
    "description": obj.natObs.place_guess + (obj.natObs.positional_accuracy ? " positional accuracy: " + obj.natObs.positional_accuracy : "") + (obj.natObs.positioning_device ? " positioning device: " + obj.natObs.positioning_device : "") + (obj.natObs.positioning_method ? " positioning method: " + obj.natObs.positioning_method : "") + (obj.natObs.coordinates_obscured ? " coordinates obscured" : "") + ".",
    "encodingType": "application/geo+json",
    "feature": {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [obj.natObs.longitude, obj.natObs.latitude]
        }
    }
};
//License 
var license = GetSTALicense(obj.natObs.license);
function GetSTALicense(natLicense) {
    if (natLicense == "CC0") {
        return {
            "name": "CC0",
            "description": "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/cc-zero.png",
            "definition": "https://creativecommons.org/publicdomain/zero/1.0/"
        };
    }
    if (natLicense == "CC-BY") {
        return {
            "name": "CC BY 3.0",
            "description": "The Creative Commons Attribution license",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by.png",
            "definition": "https://creativecommons.org/licenses/by/3.0/de/deed.en"
        };
    }
    if (natLicense == "CC-BY-NC") {
        return {
            "name": "CC BY-NC 3.0",
            "description": "The Creative Commons Attribution-NonCommercial license",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by-nc.png",
            "definition": "https://creativecommons.org/licenses/by-nc/3.0/de/deed.en"
        };
    }
    if (natLicense == "CC-BY-SA") {
        return {
            "name": "CC BY-SA 3.0",
            "description": "The Creative Commons Attribution & Share-alike license",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by-sa.png",
            "definition": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en"
        };
    }
    if (natLicense == "CC-BY-ND") {
        return {
            "name": "CC BY-ND 3.0",
            "description": "The Creative Commons Attribution & No Derivatives license",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by-nd.png",
            "definition": "https://creativecommons.org/licenses/by-nd/3.0/de/deed.en"
        };
    }
    if (natLicense == "CC-BY-NC-SA") {
        return {
            "name": "CC BY-NC-SA 3.0",
            "description": "The Creative Commons Attribution & Share-alike non-commercial license",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by-nc-sa.png",
            "definition": "https://creativecommons.org/licenses/by-nc-sa/3.0/de/deed.en"
        };
    }
    if (natLicense == "CC-BY-NC-ND") {
        return {
            "name": "CC BY-NC-ND 3.0",
            "description": "The Creative Commons Attribution, non-commercial & No Derivatives license",
            "logo": "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by-nc-nd.png",
            "definition": "https://creativecommons.org/licenses/by-nc-nd/3.0/de/deed.en"
        };
    }
    if (!natLicense || natLicense == "")
        return null;
    return {
        "name": natLicense,
        "description": ""
    };
}

var Campaign; //Sembla que no nhi ha
var observationGroup = {
    "name": obj.natObs.uri,
    "description": "Observation of a " + obj.natObs.species_guess,
    "creationTime": obj.natObs.created_at_utc
}
var relation; //no existeix

*/
