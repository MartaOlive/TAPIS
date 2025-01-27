const ServicesAndAPIs =
{
    sta: { name: "STA plus", description: "STA service", startNode: true, help: "Connects to a SensorThings API or a STAplus instance and returns a table with the list of entities suported" },
    ogcAPICols: { name: "OGC API cols", description: "OGC API collections", startNode: true, help: "Connects to the root of a OGC Web API and returns a table with the list collections available" },
    ogcAPIItems: { name: "OGC API items", description: "OGC API items", startNode: true, help: "Connects to a collection on an OGC Web API Features or derivatives and returns a table with the items available. On of the columns in the table will be the geometry object as a GeoJSON" },
    s3Service: { name: "S3 Service", description: "S3 Service", startNode: true },
    s3Bucket: { name: "S3 Bucket", description: "S3 Bucket", startNode: true },


    edc: { name: "DS catalogue", description: "DataSpace cat.", startNode: true },
   
    ImportCSV: { name: "CSV", description: "Import CSV", startNode: true, help: "Allows you to import all data from a CSV and returns a table with them" },
    ImportDBF: { name: "DBF", description: "Import DBF", startNode: true, help: "Allows you to import all data from a DBF and returns a table with them" },
    ImportGeoJSON: { name: "GeoJSON", description: "Import GeoJSON", startNode: true, help: "Allows you to import all data from GeoJSON and returns a table with them" },
    staRoot: { name: "STA root", description: "STA root", help: "Return the url root from the STAplus service in use, taking out extra parameters added" },

    csw: { name: "Catalogue", description: "OGC CSW", startNode: true, help: "Connects to a OGC CSW cataloge service. The result is a table with a list of record in the catalogue that have data associated with it " }




};











const ServicesAndAPIsArray = Object.keys(ServicesAndAPIs);
const STAEntities = {
    ObservedProperties: { singular: "ObservedProperty", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "definition", dataType: "URI", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the ObservedProperties of this STAPlus service" },
    Observations: { singular: "Observation", entities: [{ name: "Datastream", required: "true" }, { name: "MultiDatastream", required: "true" }, { name: "FeatureOfInterest", required: "false" }, { name: "ObservationGroups", required: "false" }, { name: "Subjects", required: "false" }, { name: "Objects", required: "false" }], properties: [{ name: "phenomenonTime", dataType: "object", required: "true" }, { name: "resultTime", dataType: "isodatetime", required: "true" }, { name: "result", dataType: "", required: "true" }, { name: "resultQuality", dataType: "object", required: "false" }, { name: "validTime", dataType: "data_isoperiod", required: "false" }, { name: "parameters", dataType: "JSON", required: "false" }], entityRelations: ["Object", "Subject"], help: "Visualize through a table the Observations of this STAPlus service" },
    FeaturesOfInterest: { singular: "FeatureOfInterest", entities: [{ name: "Observations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "encodingType", dataType: "string", required: "true" }, { name: "feature", dataType: "", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the FeaturesOfInterest of this STAPlus service" },
    Sensors: { singular: "Sensor", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "encodingType", dataType: "string", required: "true" }, { name: "metadata", dataType: "", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the Sensors of this STAPlus service" },
    Things: { singular: "Thing", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Party", required: "true" }, { name: "Locations", required: "false" }, { name: "HistoricalLocations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the Things of this STAPlus service" },
    Locations: { singular: "Location", entities: [{ name: "Things", required: "false" }, { name: "HistoricalLocations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "encodingType", dataType: "string", required: "true" }, { name: "location", dataType: "", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the Locations of this STAPlus service" },
    HistoricalLocations: { singular: "HistoricalLocation", entities: [{ name: "Things", required: "true" }, { name: "Location", required: "true" }], properties: [{ name: "time", dataType: "isodatetime", required: "true" }], help: "Visualize through a table the HistoricalLocations of this STAPlus service" },
    Datastreams: { singular: "Datastream", entities: [{ name: "Party", required: "true" }, { name: "Sensor", required: "true" }, { name: "ObservedProperty", required: "true" }, { name: "Campaigns", required: "false" }, { name: "License", required: "false" }, { name: "Observations", required: "false" }, { name: "Thing", required: "true" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "observationType", dataType: "string", required: "true" }, { name: "unitOfMeasurement", dataType: "JSON", required: "true" }, { name: "observedArea", dataType: "object", required: "false" }, { name: "phenomenonTime", dataType: "data_isoperiod", required: "false" }, { name: "resultTime", dataType: "data_isoperiod", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the Datastreams of this STAPlus service" },
    MultiDatastreams: { singular: "MultiDatastream", entities: [{ name: "Party", required: "true" }, { name: "Sensor", required: "true" }, { name: "ObservedProperty", required: "true" }, { name: "Campaigns", required: "false" }, { name: "License", required: "false" }, { name: "Observations", required: "false" }, { name: "Thing", required: "true" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "observationType", dataType: "string", required: "true" }, { name: "unitOfMeasurement", dataType: "JSON", required: "true" }, { name: " observedArea", dataType: "object", required: "false" }, { name: "phenomenonTime", dataType: "data_isoperiod", required: "false" }, { name: "resultTime", dataType: "data_isoperiod", required: "false" }, { name: "multiObservationDataType", dataType: "JSON", required: "true" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the MultiDatastreams of this STAPlus service" },
    Parties: { singular: "Party", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Campaigns", required: "false" }, { name: "ObservationGroups", required: "false" }, { name: "Things", required: "false" }], properties: [{ name: "description", dataType: "string", required: "false" }, { name: "authId", dataType: "string", required: "false" }, { name: "role", dataType: "PartyRoleCode", required: "true" }, { name: "displayName", dataType: "string", required: "false" }], help: "Visualize through a table the Parties of this STAPlus service" },
    Campaigns: { singular: "Campaign", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Party", required: "true" }, { name: "License", required: "false" }, { name: "ObservationGroups", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "classification", dataType: "string", required: "false" }, { name: "termsOfUse", dataType: "string", required: "true" }, { name: "privacyPolicy", dataType: "string", required: "false" }, { name: "creationTime", dataType: "isodatetime", required: "true" }, { name: "url", dataType: "URI", required: "false" }, { name: "startTime", dataType: "isodatetime", required: "false" }, { name: "endTime", dataType: "isodatetime", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the Campaigns of this STAPlus service" },
    Licenses: { singular: "License", entities: [{ name: "Datastreams", required: "false" }, { name: "MultiDatastreams", required: "false" }, { name: "Campaigns", required: "false" }, { name: "ObservationGroups", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "definition", dataType: "URI", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "logo", dataType: "string", required: "false" }, { name: "attributionText", dataType: "JSON", required: "false" }], help: "Visualize through a table the Licenses of this STAPlus service" },
    ObservationGroups: { singular: "ObservationGroup", entities: [{ name: "Party", required: "true" }, { name: "Campaigns", required: "false" }, { name: "License", required: "false" }, { name: "Observations", required: "false" }, { name: "Relations", required: "false" }], properties: [{ name: "name", dataType: "string", required: "true" }, { name: "description", dataType: "string", required: "true" }, { name: "purpose", dataType: "string", required: "false" }, { name: "creationTime", dataType: "isodatetime", required: "false" }, { name: "endTime", dataType: "isodatetime", required: "false" }, { name: "termsOfUsed", dataType: "string", required: "false" }, { name: "privacyPolicy", dataType: "string", required: "false" }, { name: "dataQuality", dataType: "JSON", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }], help: "Visualize through a table the ObservationGroups of this STAPlus service" },
    Relations: { singular: "Relation", entities: [{ name: "Object", required: "true" }, { name: "Subject", required: "true" }, { name: "ObservationGroups", required: "false" }], properties: [{ name: "role", dataType: "URI", required: "true" }, { name: "description", dataType: "string", required: "false" }, { name: "externalObject", dataType: "URI", required: "false" }, { name: "properties", dataType: "JSON", required: "false" }], entityRelations: ["Objects", "Subjects"], help: "Visualize through a table the Relations of this STAPlus service" }
};
const STAEntitiesArray = Object.keys(STAEntities);
const STASpecialQueries = { ObsLayer: { description: "Observations Layer", query: "Observations?$orderby=phenomenonTime%20desc&$expand=Datastream($select=unitOfMeasurement),Datastream/ObservedProperty($select=name,description,definition),FeatureOfInterest($select=description,feature)&$select=phenomenonTime,result", help: "Link to STAplus service to add a query to this url to obtain a table with phenomenomTime and results from Observations, unitsOfMeasurements and ObservedProperty from Datastreams and a description from the featureOfInterest related " } };
const STASpecialQueriesArray = Object.keys(STASpecialQueries);
const STAOperations = {
    SelectColumnsSTA: { description: "Select Columns", callSTALoad: true, help: "To obtain a table only with columns selected. Only with STA data" },
    ExpandColumnsSTA: { description: "Expand Columns", callSTALoad: true, help: "To add to your table properties from another entity. Only with STA data" },
    SelectRowSTA: { description: "Select Row", callSTALoad: true, help: "To obtain a table only with the selected register. Needed to link to another entity. Only with STA data" },
    FilterRowsSTA: { description: "Filter Rows", callSTALoad: true, help: "To obtain a table with the registers that match with your parameters selected.Only with STA data" },
    FilterRowsByTime: { description: "Filter Rows by time", help: "To obtain a table with the registers that match with your time interval selected. It is possible to group them by time periods. Only with STA data" },
    GeoFilterPolSTA: { description: "Filter Rows by Polygon", callSTALoad: true, help: "To obtain a table with the registers contained within a poligon designed through a GeoJSON import.Only with STA data" },
    GeoFilterPntSTA: { description: "Filter Rows by Distance", callSTALoad: true, help: "To obtain a table with the registers contained between a point designed through a GeoJSON import and a distance established.Only with STA data" },
    SortBySTA: { description: "Sort by", callSTALoad: true, help: "To obtain a table with data sorted by your chose. Is possible to stablish the number of registers you want to obtain from the STAplus service with this tool. Only with STA data " },
    UploadObservations: { description: "Upload in STA", leafNode: true },
    //UploadTimeAverages: {description: "Upload time averages", leafNode: true},
    OneValueSTA: { description: "One Value", leafNode: true, help: "Returns last value posted. This value will be updated according to the time period you set. Only with STA data" },
    CountResultsSTA: { description: "Count results", leafNode: true, help: "Returns the total number of records that match the parameters selected so far, not just those loaded into TAPIS. Only with STA data" }
};
const STAOperationsArray = Object.keys(STAOperations);

const TableOperations = {
    Table: { description: "View Table", leafNode: true, help: "Visualize table in full screen mode" },
    ViewQuerySTA: { description: "View Query", leafNode: true, help: "Visualize completed url that makes the query to obtain this data" },
    EditRecord: { description: "Edit record", help: "Edit a register in your data uploaded. If you are using data from a web service and you ask again for data, you will lose this change" },
    Meaning: { description: "Column meaning", help: "To check (visualize ande edit) semantics of fields (columns)" },
    SelectColumnsTable: { description: "Select Columns", help: "Obtain a table only with columns selected. It has to be related to data from a table, not STAplus service" },
    SelectRowTable: { description: "Select Row", help: "To obtain a table only with the selected register. It has to be related to data from a table, not STAplus service" },
    FilterRowsTable: { description: "Filter Rows", help: "To obtain a table with the registers that match with your parameters selected. It has to be related to data from a table, not STAplus service" },
    JoinTables: { description: "Join Tables", help: "To create a table combining two different tables. Different types of merge are available. It is not necessary to share a column between tables" }, //He posat combine per no tornar a posar join, perque si no s'entén que fa join... 
    ConcatenateTables: { description: "Concatenate Columns", help: "To create a table the result of which will be to add the records of one table under the records of the other table, whether they share columns or not" },
    GroupBy: { description: "GroupBy", help: "To create a new table which result will be the statistics of the aggregation of the values by one or more parameters." },
    AggregateColumns: { description: "Aggregate Columns", help: "To add a new column to your table. The column will be filled with the aggregation of other columns selected that already exist" },
    CreateColumns: { description: "Create Columns", help: "To add a new column to your table. This column will be empty, filled with a constant value or with an autoincremental value" },
    ColumnsCalculator: { description: "Columns calculator", help: "To add a new column to your table. This column will be filled with the result of the operation you create using the values of the other columns" },
    ColumnStatistics: { description: "Columns statistics", help: "To create a table with main statistics of your data" },
    SeparateColumns: { description: "Separate Columns", help: "To split JSON object from one column into different columns. This will add these new columns to your table" },
    ScatterPlot: { description: "Scatter Plot", leafNode: true, help: "Create a scatter plot with your data" },
    BarPlot: { description: "Bar Plot", leafNode: true, help: "Create a bar plot graph with your data" },
    ImageViewer: { description: "Image Viewer", leafNode: true, help: "To see the picture if the data of the column is a url linked to pictures" },
    SaveTable: { description: "Save Table", leafNode: true, help: "To save data that contains this node as a CSV or CSVW." },
    SaveLayer: { description: "Save Layer", leafNode: true, help: "Save data as GeoJSON..." }, //són unes condiciosn tant específiques que no se com posar-ho
    OpenMap: { description: "Open Map", leafNode: true },
    guf: { description: "Feedback", help: "" }
};