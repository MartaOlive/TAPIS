
const STAEntities = {
    ObservedProperties: {
        singular: "ObservedProperty",
        entities: ["Datastreams", "MultiDatastreams"],
        properties: ["name", "definition", "description", "properties"]
    },

    Observations: {
        singular: "Observation",
        entities: ["Datastream", "MultiDatastream", "FeatureOfInterest", "ObservationGroups", "Subjects", "Objects"],
        properties: ["phenomenonTime", "resultTime", "result", "resultQuality", "validTime", "parameters"]
    },
    FeaturesOfInterest: {
        singular: "FeatureOfInterest",
        entities: ["Observations"],
        properties: ["name", "description", "encodingType", "feature", "properties"]
    },
    Sensors: {
        singular: "Sensor",
        entities: ["Datastreams", "MultiDatastreams"],
        properties: ["name", "description", "encodingType", "metadata", "properties"]
    },
    Things: {
        singular: "Thing",
        entities: ["Datastreams", "MultiDatastreams", "Party", "Locations", "HistoricalLocations"],
        properties: ["name", "description", "properties"]
    },
    Locations: {
        singular: "Location",
        entities: ["Things", "HistoricalLocations"],
        properties: ["name", "description", "encodingType", "location", "properties"]
    },
    HistoricalLocations: {
        singular: "HistoricalLocation",
        entities: ["Things", "Location"],
        properties: ["time"]
    },
    Datastreams: {
        singular: "Datastream",
        entities: ["Party", "Sensor", "ObservedProperty", "Campaigns", "License", "Observations", "Thing"],
        properties: ["name", "description", "unitOfMeasurement", "observationType", "observedArea", "phenomenonTime", "resultTime", "properties"]
    },
    MultiDatastreams: {
        singular: "MultiDatastream",
        entities: ["Party", "Sensor", "ObservedProperties", "Campaigns", "License", "Observations", "Thing"],
        properties: ["name", "description", "unitOfMeasurements", "observationType", "observedArea", "phenomenonTime", "resultTime", "multiObservationDataTypes", "properties"]
    },
    Parties: {
        singular: "Party",
        entities: ["Datastreams", "MultiDatastreams", "Campaigns", "ObservationGroups", "Things"],
        properties: ["description", "authId", "role", "displayName"]
    },
    Campaigns: {
        singular: "Campaign",
        entities: ["Datastreams", "MultiDatastreams", "Party", "License"],
        properties: ["name", "description", "classification", "termsOfUse", "privacyPolicy", "creationTime", "startTime", "endTime", "url", "properties"]
    },
    Licenses: {
        singular: "License",
        entities: ["Datastreams", "MultiDatastreams", "Campaigns", "ObservationGroups"],
        properties: ["name", "description", "definition", "logo", "attributionText"]
    },
    ObservationGroups: {
        singular: "ObservationGroup",
        entities: ["Party", "Campaigns", "License", "Observations", "Relations"],
        properties: ["name", "description", "purpose", "creationTime", "endTime", "termsOfUsed", "privacyPolicy", "properties", "dataQuality"]
    },
    Relations: {
        singular: "Relation",
        entities: ["Object", "Subject", "ObservationGroups"],
        properties: ["role", "description", "externalObject", "properties"]
    }
};