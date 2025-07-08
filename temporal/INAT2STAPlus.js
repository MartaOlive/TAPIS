//13 entities

var party = {
    "displayName": (obj.iIdentification == -1 ? obj.natObs.user_login : obj.natObs.identifications[obj.iIdentification].user.login),
    "role": "individual",  //"institution"
    "@iot.id": create_UUID(true)  //Only specify if you want to have control on the @iot.id value.
}
var sensor = {
    "name": "Human Eye",
    "description": "Eye of the observer",
    "encodingType": "text/html",
    "metadata": "https://en.wikipedia.org/wiki/Human_eye"
}
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
