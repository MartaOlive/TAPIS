# STAmetadata.dataLineage — exemples per **totes** les eines

Document de treball: **edita les claus** (`tool` i la resta) on calgui.
Després de la teva revisió, s’adaptarà el codi.

Estructura comuna de cada pas a `node.STAmetadata.dataLineage.steps[]`:

```json
{
  "tool": "NomEinaSensePng",
  "url": "...",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Notes:
- Les claus del procés (`url`, `columns`, `filter`, …) van al mateix nivell que `tool`.
- Si l’eina té **diversos pares**, inclou `parentNodeIds` (ids dels nodes pares, en ordre).
- On diu *(proposta)*: encara no hi ha el mateix nivell de detall al codi; és el model suggerit.
- `dataQualityInfos` pot coexistir amb `dataLineage` als nodes de qualitat.

---

# 1. ServicesAndAPIs (inputs)

## sta

```json
{
  "tool": "sta",
  "url": "https://example.com/FROST-Server/v1.1",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ogcAPICols

```json
{
  "tool": "ogcAPICols",
  "url": "https://example.com/collections",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ogcAPIItems

```json
{
  "tool": "ogcAPIItems",
  "url": "https://example.com/collections/mycol/items",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## csw

```json
{
  "tool": "csw",
  "url": "https://example.com/csw",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## s3Service

```json
{
  "tool": "s3Service",
  "url": "https://minio.example.com",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## s3Bucket

```json
{
  "tool": "s3Bucket",
  "url": "https://minio.example.com/my-bucket",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## edc

```json
{
  "tool": "edc",
  "url": "https://edc.example.com/catalog",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## edcAsset

```json
{
  "tool": "edcAsset",
  "assetId": "asset-1",
  "offerId": "offer-1",
  "mediaType": "application/json",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ImportCSV

URL:

```json
{
  "tool": "ImportCSV",
  "option": "url",
  "url": "https://example.com/data.csv",
  "meaningSource": "none",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Fitxer local:

```json
{
  "tool": "ImportCSV",
  "option": "file",
  "file": "dades.csv",
  "meaningSource": "none",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Fitxer local + meaning CSVW (fitxer):

```json
{
  "tool": "ImportCSV",
  "option": "file",
  "file": "dades.csv",
  "meaningSource": "file",
  "meaningFile": "dades.csvw",
  "date": "2026-11-11T11:00:00.000Z"
}
```

URL + meaning CSVW (URL):

```json
{
  "tool": "ImportCSV",
  "option": "url",
  "url": "https://example.com/data.csv",
  "meaningSource": "url",
  "meaningUrl": "https://example.com/data.csvw",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Taula buida basada en CSVW + meaning auto:

```json
{
  "tool": "ImportCSV",
  "option": "emptyTable",
  "meaningSource": "auto",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Text enganxat (sense fitxer):

```json
{
  "tool": "ImportCSV",
  "option": "text",
  "meaningSource": "none",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`option`: `emptyTable` | `file` | `url` | `text`; `meaningSource`: `none` | `file` | `url` | `auto`)

## ImportDBF

```json
{
  "tool": "ImportDBF",
  "url": "https://example.com/data.dbf",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ImportGPKG

URL:

```json
{
  "tool": "ImportGPKG",
  "option": "url",
  "url": "https://example.com/data.gpkg",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Fitxer local:

```json
{
  "tool": "ImportGPKG",
  "option": "file",
  "file": "dades.gpkg",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`option`: `file` | `url`)

## ImportGPKGTable

```json
{
  "tool": "ImportGPKGTable",
  "tableName": "roads",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ImportJSONLD

URL:

```json
{
  "tool": "ImportJSONLD",
  "option": "url",
  "url": "https://example.com/data.jsonld",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Fitxer local:

```json
{
  "tool": "ImportJSONLD",
  "option": "file",
  "file": "dades.jsonld",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Text enganxat:

```json
{
  "tool": "ImportJSONLD",
  "option": "text",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`option`: `file` | `url` | `text`)

## ImportJSON

URL:

```json
{
  "tool": "ImportJSON",
  "option": "url",
  "url": "https://example.com/data.json",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Fitxer local:

```json
{
  "tool": "ImportJSON",
  "option": "file",
  "file": "dades.json",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Llista d'URL (cada URL és un JSON):

```json
{
  "tool": "ImportJSON",
  "option": "urlList",
  "urls": [
    "https://example.com/a.json",
    "https://example.com/b.json",
    "https://example.com/c.json"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

Text enganxat:

```json
{
  "tool": "ImportJSON",
  "option": "text",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`option`: `file` | `url` | `urlList` | `text`)

## ImportGeoJSON

URL + meaning esquema (fitxer):

```json
{
  "tool": "ImportGeoJSON",
  "option": "url",
  "url": "https://example.com/data.geojson",
  "meaningSource": "file",
  "meaningFile": "schema.json",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Fitxer local + meaning esquema (URL):

```json
{
  "tool": "ImportGeoJSON",
  "option": "file",
  "file": "dades.geojson",
  "meaningSource": "url",
  "meaningUrl": "https://example.com/schema.json",
  "date": "2026-11-11T11:00:00.000Z"
}
```

URL + meaning auto:

```json
{
  "tool": "ImportGeoJSON",
  "option": "url",
  "url": "https://example.com/data.geojson",
  "meaningSource": "auto",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Dades externes (p. ex. des d’un altre node) + meaning esquema (fitxer):

```json
{
  "tool": "ImportGeoJSON",
  "option": "externalData",
  "externalData": "https://example.com/from-parent.geojson",
  "meaningSource": "file",
  "meaningFile": "schema.json",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Text enganxat:

```json
{
  "tool": "ImportGeoJSON",
  "option": "text",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`option`: `file` | `url` | `externalData` | `text`; `meaningSource`: `file` | `url` | `auto`)

## CreateDGGS

```json
{
  "tool": "CreateDGGS",
  "minLong": 0.5,
  "minLat": 40.5,
  "maxLong": 3.5,
  "maxLat": 42.5,
  "level": 5,
  "DGGS": "DGGRID_ISEA7H",
  "parents": false,
  "centroid": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## CreateNewTable

```json
{
  "tool": "CreateNewTable",
  "columns": [
    "Ciutat",
    "poblacio"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## connectASensor

```json
{
  "tool": "connectASensor",
  "connectionMode": "usb",
  "displayName": "Sensor A",
  "intervalSec": 60,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## readSDFromSensor

```json
{
  "tool": "readSDFromSensor",
  "fileName": "mesures.csv",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## staRoot

```json
{
  "tool": "staRoot",
  "url": "https://example.com/FROST-Server/v1.1",
  "date": "2026-11-11T11:00:00.000Z"
}
```

---

# 2. STA entities (lectura)

Patró comú *(proposta / herència del pare + URL)*:

```json
{
  "tool": "Things",
  "url": "https://example.com/FROST-Server/v1.1/Things",
  "entityName": "Things",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Campaigns

```json
{
  "tool": "Campaigns",
  "url": ".../Campaigns",
  "entityName": "Campaigns",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Cells

```json
{
  "tool": "Cells",
  "url": ".../Cells",
  "entityName": "Cells",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Datastreams

```json
{
  "tool": "Datastreams",
  "url": ".../Datastreams",
  "entityName": "Datastreams",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## FeaturesOfInterest

```json
{
  "tool": "FeaturesOfInterest",
  "url": ".../FeaturesOfInterest",
  "entityName": "FeaturesOfInterest",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## HistoricalLocations

```json
{
  "tool": "HistoricalLocations",
  "url": ".../HistoricalLocations",
  "entityName": "HistoricalLocations",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Licenses

```json
{
  "tool": "Licenses",
  "url": ".../Licenses",
  "entityName": "Licenses",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Locations

```json
{
  "tool": "Locations",
  "url": ".../Locations",
  "entityName": "Locations",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## MultiDatastreams

```json
{
  "tool": "MultiDatastreams",
  "url": ".../MultiDatastreams",
  "entityName": "MultiDatastreams",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ObservationGroups

```json
{
  "tool": "ObservationGroups",
  "url": ".../ObservationGroups",
  "entityName": "ObservationGroups",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Observations

```json
{
  "tool": "Observations",
  "url": ".../Observations",
  "entityName": "Observations",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ObservedProperties

```json
{
  "tool": "ObservedProperties",
  "url": ".../ObservedProperties",
  "entityName": "ObservedProperties",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Parties

```json
{
  "tool": "Parties",
  "url": ".../Parties",
  "entityName": "Parties",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Relations

```json
{
  "tool": "Relations",
  "url": ".../Relations",
  "entityName": "Relations",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Sensors

```json
{
  "tool": "Sensors",
  "url": ".../Sensors",
  "entityName": "Sensors",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## Things

```json
{
  "tool": "Things",
  "url": ".../Things",
  "entityName": "Things",
  "date": "2026-11-11T11:00:00.000Z"
}
```

---

# 3. STA special queries

## ObsLayer

```json
{
  "tool": "ObsLayer",
  "url": ".../Observations?$orderby=phenomenonTime%20desc&$expand=...",
  "query": "ObservationsLayer",
  "date": "2026-11-11T11:00:00.000Z"
}
```

---

# 4. STA operations

## RecursiveExpandSTA

```json
{
  "tool": "RecursiveExpandSTA",
  "selected": [
    "name",
    "description"
  ],
  "expanded": {
    "Locations": {
      "selected": [
        "location"
      ],
      "expanded": {}
    }
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ExpandColumnSTA

```json
{
  "tool": "ExpandColumnSTA",
  "entity": "Datastream",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(Una sola entitat; s’expandeixen totes les propietats. L’arbre `selected`/`expanded` niats és de RecursiveExpandSTA.)

## MergeExpandsSTA

```json
{
  "tool": "MergeExpandsSTA",
  "parentNodeIds": [
    "expandObsPropNode",
    "expandThingNode"
  ],
  "parentBranches": [
    "ObservedProperties",
    "Thing"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SelectColumnsSTA

```json
{
  "tool": "SelectColumnsSTA",
  "selected": [
    "@iot.id",
    "name",
    "description"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SelectRowSTA

```json
{
  "tool": "SelectRowSTA",
  "resourceId": 42,
  "url": ".../Things(42)",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SelectResourceSTA

```json
{
  "tool": "SelectResourceSTA",
  "resourceId": "abc-uuid",
  "url": ".../Things('abc-uuid')",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## FilterRowsSTA

```json
{
  "tool": "FilterRowsSTA",
  "filter": "name eq 'Barcelona'",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## FilterRowsByTime

```json
{
  "tool": "FilterRowsByTime",
  "property": "phenomenonTime",
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-12-31T23:59:59Z",
  "aggregate": false,
  "aggregation": null,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## GeoFilterPolSTA

```json
{
  "tool": "GeoFilterPolSTA",
  "parentNodeIds": [
    "staEntityNode",
    "polygonTableNode"
  ],
  "geometryColumn": "geometry",
  "filter": "geo.intersects(location, geography'POLYGON((...))')",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## GeoFilterPntSTA

```json
{
  "tool": "GeoFilterPntSTA",
  "route": "Locations/location",
  "lon": 2.17,
  "lat": 41.38,
  "operator": "lt",
  "distance": 1000,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SortBySTA

```json
{
  "tool": "SortBySTA",
  "attribute": "phenomenonTime",
  "desc": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## RangeSTA

```json
{
  "tool": "RangeSTA",
  "top": 100,
  "skip": 0,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## UploadObservations

```json
{
  "tool": "UploadObservations",
  "url": "https://example.com/FROST-Server/v1.1",
  "uploadedCount": 12,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## CalculateStatisticsSTA

```json
{
  "tool": "CalculateStatisticsSTA",
  "url": "https://example.com/FROST-Server/v1.1",
  "observedProperty": "temperature",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## CountResultsSTA

```json
{
  "tool": "CountResultsSTA",
  "url": ".../Observations",
  "count": 15432,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ViewQuerySTA

```json
{
  "tool": "ViewQuerySTA",
  "url": ".../Things?$select=name",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## OneValueSTA

```json
{
  "tool": "OneValueSTA",
  "timeVariable": "phenomenonTime",
  "variable": "result",
  "refreshSeconds": 30,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SubscribeSTA

```json
{
  "tool": "SubscribeSTA",
  "url": ".../Observations",
  "webSub": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## me

```json
{
  "tool": "me",
  "url": ".../Parties/me",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## staEntityBuilder

```json
{
  "tool": "staEntityBuilder",
  "parentNodeIds": [
    "primaryTableNode",
    "lateralTableNode"
  ],
  "entities": [
    "Thing",
    "Location",
    "Sensor"
  ],
  "groups": [
    {
      "name": "temp",
      "entities": [
        "Datastream",
        "Observation"
      ]
    },
    {
      "name": "hum",
      "entities": [
        "Datastream",
        "Observation"
      ]
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`entities`: nivell general; `groups`: cada grup amb les seves entitats. Sense mapa columna→propietat. `parentNodeIds` si hi ha més d’un pare.)

## staPublisher

```json
{
  "tool": "staPublisher",
  "url": "https://example.com/FROST-Server/v1.1",
  "created": {
    "Things": 1,
    "Locations": 1,
    "Sensors": 1,
    "ObservedProperties": 2,
    "Datastreams": 2,
    "Observations": 48,
    "Relations": 0
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`created`: nombre d’entitats creades/publicades per tipus.)

---

# 5. Table operations

## Table

```json
{
  "tool": "Table",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## EditRecord

```json
{
  "tool": "EditRecord",
  "edited": [
    {
      "index": 1,
      "before": {
        "Ciutat": "Barcelona"
      },
      "after": {
        "Ciutat": "Girona"
      }
    }
  ],
  "created": [
    {
      "index": 2,
      "data": {
        "Ciutat": "Lleida",
        "poblacio": 50
      }
    }
  ],
  "deleted": [
    {
      "index": 4
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

Notes: `index` 0-based; a la UI es mostra com `#index+1`. A `edited`, només els camps que han canviat (`before`/`after`). A `created`, el registre a `data`. A `deleted`, només l’`index`.

## Meaning

```json
{
  "tool": "Meaning",
  "changed": [
    {
      "column": "poblacio",
      "before": {
        "type": "string",
        "description": ""
      },
      "after": {
        "type": "number",
        "description": "Població",
        "definition": "http://example.org/pop",
        "UoM": "person",
        "UoMSymbol": "p",
        "UoMDefinition": "http://example.org/uom/person"
      }
    },
    {
      "column": "Ciutat",
      "renamedTo": "municipi",
      "before": {
        "description": ""
      },
      "after": {
        "description": "Municipi"
      }
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

(Només columnes/camps que han canviat: `type`, `description`, `definition`, `UoM`, `UoMSymbol`, `UoMDefinition`; rename amb `renamedTo`.)

## SelectColumnsTable

```json
{
  "tool": "SelectColumnsTable",
  "columns": [
    "Ciutat",
    "poblacio"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SelectRowTable

```json
{
  "tool": "SelectRowTable",
  "index": 2,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SelectRowsTable

```json
{
  "tool": "SelectRowsTable",
  "indexes": [
    0,
    2,
    5
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## FilterRowsTable

```json
{
  "tool": "FilterRowsTable",
  "filter": "Ciutat == \"Barcelona\"",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(o arbre de filtre si no hi ha expressió textual)

## Replace

```json
{
  "tool": "Replace",
  "searchValue": "BCN",
  "replaceValue": "Barcelona",
  "numbersAsText": false,
  "datesAsText": false,
  "scope": "column",
  "column": "Ciutat",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## JoinTables

```json
{
  "tool": "JoinTables",
  "parentNodeIds": {
    "leftTable": "leftTableNode",
    "rightTable": "rightTableNode"
  },
  "NotMatch": "LeftTable",
  "RowMatching": [
    {
      "left": [
        "id"
      ],
      "right": [
        "city_id"
      ]
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ConcatenateTables

```json
{
  "tool": "ConcatenateTables",
  "parentNodeIds": [
    "tableNodeA",
    "tableNodeB",
    "tableNodeC"
  ],
  "mode": "allColumns",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(Accepta 2 o més pares; `parentNodeIds` és una llista ordenada.)

## GroupBy

```json
{
  "tool": "GroupBy",
  "groupByAttr": [
    "Ciutat"
  ],
  "groupByDate": [],
  "aggregationAttr": {
    "poblacio": [
      "sum",
      "mean"
    ]
  },
  "sourceParentId": "abc123",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SortByTables

```json
{
  "tool": "SortByTables",
  "sort": [
    {
      "attribute": "Ciutat",
      "desc": false
    },
    {
      "attribute": "poblacio",
      "desc": true
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## AggregateColumns

```json
{
  "tool": "AggregateColumns",
  "columns": [
    {
      "selectedAttributes": [
        "a",
        "b"
      ],
      "aggregation": "sum",
      "columnName": "total",
      "decimals": {
        "option": "yes",
        "value": 2
      }
    },
    {
      "selectedAttributes": [
        "a",
        "b",
        "c"
      ],
      "aggregation": "mean",
      "columnName": "mitjana_abc",
      "decimals": {
        "option": "allDecimals"
      }
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

(Cada entrada: `selectedAttributes`, `aggregation`, `columnName`, `decimals.option` (`yes` | `allDecimals`) i `decimals.value` si `option` és `yes`.)

## CreateColumns

```json
{
  "tool": "CreateColumns",
  "columns": [
    {
      "typeOfOperation": "constantValue",
      "columnName": "pais",
      "value": "Catalunya"
    },
    {
      "typeOfOperation": "autoincrementalValue",
      "columnName": "id",
      "value": 1
    },
    {
      "typeOfOperation": "empty",
      "columnName": "notes"
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`typeOfOperation`: `constantValue` | `autoincrementalValue` | `empty`; `value` quan cal.)

## AddColumnPnt

Exemple entrada lon/lat → sortida GeoJSON:

```json
{
  "tool": "AddColumnPnt",
  "input": {
    "format": "LL",
    "CRS": "EPSG:4326",
    "longitude": "lon",
    "latitude": "lat"
  },
  "output": {
    "format": "JSON",
    "columnName": "geometry"
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

Altres entrades possibles (`input.format`): `JSON` (+ `geometry`), `WKT` (+ `wkt`), `DGGS` (+ `DGGS`, `zoneId`).
Altres sortides (`output.format`): `WKT` (+ `columnName`), `DGGS` (+ `DGGS`, `level`, `columnName`), `LL` (+ `CRS`, `longitude`, `latitude`).

## AddColumnBBox

Exemple entrada coordenades → sortida GeoJSON:

```json
{
  "tool": "AddColumnBBox",
  "input": {
    "format": "LL",
    "CRS": "EPSG:4326",
    "minLongitude": "xmin",
    "minLatitude": "ymin",
    "maxLongitude": "xmax",
    "maxLatitude": "ymax"
  },
  "output": {
    "format": "JSON",
    "columnName": "bbox"
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

Altres entrades (`input.format`): `JSON` (+ `geometry`), `WKT` (+ `wkt`).
Altres sortides (`output.format`): `WKT` (+ `columnName`), `LL` (+ `CRS`, `minLongitude`, `minLatitude`, `maxLongitude`, `maxLatitude`).

## ColumnsCalculator

```json
{
  "tool": "ColumnsCalculator",
  "columns": [
    {
      "formula": "poblacio * 2",
      "columnName": "doble_pob",
      "decimals": {
        "option": "yes",
        "value": 2
      }
    },
    {
      "formula": "poblacio / superficie",
      "columnName": "densitat",
      "decimals": {
        "option": "allDecimals"
      }
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

(Cada columna: `formula`, `columnName`, `decimals.option` (`yes` | `allDecimals`) i `decimals.value` si `option` és `yes`.)

## PivotTable

```json
{
  "tool": "PivotTable",
  "Rows": [
    "Ciutat"
  ],
  "Columns": [
    "any"
  ],
  "Values": [
    "poblacio"
  ],
  "aggregation": "Sum",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## TransposeTable

```json
{
  "tool": "TransposeTable",
  "headerColumn": "Ciutat",
  "attributeColumnName": "Column",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ColumnStatistics

```json
{
  "tool": "ColumnStatistics",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SeparateColumns

Objectes JSON → columnes noves:

```json
{
  "tool": "SeparateColumns",
  "mode": "json",
  "arraysAsRecords": false,
  "removeAlreadyPresent": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

Llista en una columna → columnes noves:

```json
{
  "tool": "SeparateColumns",
  "mode": "arrayColumns",
  "columnName": "tags",
  "delimiter": ",",
  "date": "2026-11-11T11:00:00.000Z"
}
```

Llista en una columna → registres nous:

```json
{
  "tool": "SeparateColumns",
  "mode": "arrayRecords",
  "columnName": "tags",
  "delimiter": ",",
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`mode`: `json` | `arrayColumns` | `arrayRecords`)

## SaveTable

```json
{
  "tool": "SaveTable",
  "format": "CSV",
  "includeCSVW": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ViewSTAMetadata

Visor (no afegeix pas al `dataLineage` del pare; mostra i descarrega `STAmetadata` del node pare).

```json
{
  "tool": "ViewSTAMetadata",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## SaveLayer

```json
{
  "tool": "SaveLayer",
  "longitude": "lon",
  "latitude": "lat",
  "format": "GeoJSON",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## guf

```json
{
  "tool": "guf",
  "title": "Dataset X",
  "code": "https://example.com/data",
  "codespace": "https://example.com",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## uploadToIC

Sempre el mateix catàleg (hardcoded al codi).

Exemple amb columnes:

```json
{
  "tool": "uploadToIC",
  "catalogUrl": "https://ic.ogc.secd.eu/stac",
  "collection": "DQ4STA",
  "title": "My dataset",
  "author": "TAPIS",
  "license": "CC BY",
  "geographic": {
    "option": "columns",
    "longitude": "lon",
    "latitude": "lat"
  },
  "temporal": {
    "option": "column",
    "column": "phenomenonTime"
  },
  "addGeoJSONCheckNode": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

Exemple manual:

```json
{
  "tool": "uploadToIC",
  "catalogUrl": "https://ic.ogc.secd.eu/stac",
  "collection": "DQ4STA",
  "title": "My dataset",
  "author": "TAPIS",
  "license": "CC BY",
  "geographic": {
    "option": "manual",
    "xmin": -1.5,
    "xmax": 3.5,
    "ymin": 40.0,
    "ymax": 43.0
  },
  "temporal": {
    "option": "manual",
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "addGeoJSONCheckNode": false,
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`geographic.option`: `columns` | `manual`; `temporal.option`: `column` | `manual`)

---

# 6. Statistics & visualization

## ColumnStatistics

(vegeu també TableOperations; mateix `tool` si es crea des del grup de visualització)

```json
{
  "tool": "ColumnStatistics",
  "statistics": [
    "Mean",
    "Median",
    "Q1",
    "Q3",
    "Min.value",
    "Max.value",
    "Mode",
    "StandardDeviation",
    "Variance",
    "Range",
    "FirstValue",
    "LastValue",
    "RandomValue",
    "Count"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

(Llista fixa del diàleg/codi; es calcula per a cada columna de la taula pare. Al diàleg també es menciona Sum, però el codi no el calcula.)

## ScatterPlot

```json
{
  "tool": "ScatterPlot",
  "parentNodeIds": [
    "seriesNode1",
    "seriesNode2"
  ],
  "xColumn": "lon",
  "yColumn": "lat",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## BarPlot

```json
{
  "tool": "BarPlot",
  "parentNodeIds": [
    "n1",
    "n2"
  ],
  "orientation": "vertical",
  "series": [
    {
      "nodeId": "n1",
      "labelColumn": "Ciutat",
      "valueColumn": "poblacio"
    },
    {
      "nodeId": "n2",
      "labelColumn": "Ciutat",
      "valueColumn": "superficie"
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## RadarPlot

```json
{
  "tool": "RadarPlot",
  "parentNodeIds": [
    "n1",
    "n2"
  ],
  "mode": "radar",
  "axes": [
    "a",
    "b",
    "c"
  ],
  "series": [
    {
      "nodeId": "n1",
      "valueColumns": [
        "a",
        "b",
        "c"
      ]
    },
    {
      "nodeId": "n2",
      "valueColumns": [
        "a",
        "b",
        "c"
      ]
    }
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

## circularChart

```json
{
  "tool": "circularChart",
  "type": "pie",
  "labelColumn": "Ciutat",
  "valueColumn": "poblacio",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## ImageViewer

```json
{
  "tool": "ImageViewer",
  "urlColumn": "imageUrl",
  "date": "2026-11-11T11:00:00.000Z"
}
```

## OpenMap

Sense sèrie temporal (lon/lat):

```json
{
  "tool": "OpenMap",
  "title": "Layer from TAPIS",
  "position": {
    "symbolizer": "FeatureOfInterest/description"
  },
  "geometry": {
    "option": "LL",
    "longitude": "lon",
    "latitude": "lat"
  },
  "timeSeries": false,
  "date": "2026-11-11T11:00:00.000Z"
}
```

Amb sèrie temporal:

```json
{
  "tool": "OpenMap",
  "title": "Observations map",
  "position": {
    "symbolizer": "FeatureOfInterest/description"
  },
  "geometry": {
    "option": "LL",
    "longitude": "FeatureOfInterest/feature/coordinates_0",
    "latitude": "FeatureOfInterest/feature/coordinates_1"
  },
  "timeSeries": {
    "time": "phenomenonTime",
    "variable": "Datastream/ObservedProperty/name",
    "variableDescription": "Datastream/ObservedProperty/description",
    "variableDefinition": "Datastream/ObservedProperty/definition",
    "variableUoM": "Datastream/unitOfMeasurement/name",
    "variableUoMSymbol": "Datastream/unitOfMeasurement/symbol",
    "variableUoMDefinition": "Datastream/unitOfMeasurement/definition",
    "value": "result"
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

Altres `geometry.option`: `geometry` (+ `column`), `DGGS` (+ `DGGS`, `zoneId`).
`timeSeries`: `false` si no s’omple; objecte amb els camps del fieldset si sí.

---

# 7. Data quality

## uncertainty

```json
{
  "tool": "uncertainty",
  "resultColumn": "result",
  "temporalGrouping": {
    "column": "phenomenonTime",
    "period": 1,
    "unit": "hours"
  },
  "positionalGrouping": {
    "columnX": "lon",
    "columnY": "lat",
    "distance": 100
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`temporalGrouping.unit`: `years` | `months` | `days` | `hours` | `minutes` | `seconds`)

## completness

```json
{
  "tool": "completness",
  "omission": {
    "enabled": true,
    "column": "Ciutat",
    "flagBadRecords": false
  },
  "commission": {
    "enabled": true,
    "column": "id",
    "lowerUpperCaseIdentical": false,
    "flagBadRecords": false
  },
  "commissionExcess": {
    "enabled": false,
    "column": "",
    "expectedRecords": 0
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

## misclassificationMatrix

```json
{
  "tool": "misclassificationMatrix",
  "columnsToCompare": {
    "classified": [
      "class_pred"
    ],
    "reference": [
      "class_ref"
    ]
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

## logicalConsistency

```json
{
  "tool": "logicalConsistency",
  "parentNodeIds": [
    "nodeA",
    "nodeB"
  ],
  "attributePairs": [
    {
      "target": "id",
      "reference": "ref_id"
    }
  ],
  "flagBadRecords": true,
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`parentNodeIds[0]` = taula target, `parentNodeIds[1]` = taula reference.)

## formatConsistency

```json
{
  "tool": "formatConsistency",
  "column": "email",
  "format": {
    "option": "email"
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

Altres `format.option` i camps:

```json
{
  "tool": "formatConsistency",
  "column": "phone",
  "format": {
    "option": "telephone",
    "telPrefixMode": "value",
    "telPrefix": "+34",
    "telNumberLength": 9
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`format.option`: `date` (+ `datePattern`) | `time` (+ `timePattern`) | `coordinates` (+ `coordPattern`) | `telephone` | `email` | `uuid` (+ `uuidAllowNoHyphens`) | `dottedNumbers` | `custom` (+ `patternTokens`))

## temporalQuality

```json
{
  "tool": "temporalQuality",
  "temporalColumn": "phenomenonTime",
  "temporalAccuracy": {
    "enabled": true,
    "option": "uncertaintyColumn",
    "uncertaintyColumn": "u_time"
  },
  "temporalValidity": {
    "enabled": true,
    "from": "2020-01-01T00:00:00Z",
    "to": "2025-01-01T00:00:00Z"
  },
  "temporalResolution": {
    "enabled": false
  },
  "temporalConsistency": {
    "enabled": false
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`temporalAccuracy.option`: `uncertaintyColumn` | `calculate` (+ `groupingMode`: `grouped` | `all`, `groupingColumn`, `createNewColumns`))

## positionalQuality

```json
{
  "tool": "positionalQuality",
  "geographicCoordinates": {
    "longitude": "lon",
    "latitude": "lat"
  },
  "positionalAccuracy": {
    "enabled": true,
    "option": "uncertaintyColumn",
    "uncertaintyColumn": "u_pos"
  },
  "positionalValidity": {
    "enabled": false
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

Altres `positionalAccuracy.option`: `evaluateColumn` (+ `units` `deg`|`m`, `groupingMode`, `groupingColumn`, `createNewColumns`).
`positionalValidity` quan enabled: `xmin`, `xmax`, `ymin`, `ymax`, `flagBadRecords`.

## thematicQuality

```json
{
  "tool": "thematicQuality",
  "parentNodeIds": [
    "assessTableNode",
    "referenceTableNode"
  ],
  "attributeSelection": {
    "column": "class"
  },
  "thematicAccuracyByColumn": {
    "enabled": false
  },
  "thematicAccuracyByValues": {
    "enabled": true,
    "way": "alfaNum",
    "grouping": {
      "option": "grouped",
      "column": "Ciutat",
      "createNewColumns": true
    }
  },
  "thematicValidity": {
    "enabled": true,
    "option": "list",
    "referenceColumn": "allowed_class",
    "flagBadRecords": true
  },
  "date": "2026-11-11T11:00:00.000Z"
}
```

(`thematicAccuracyByValues.way`: `alfaNum` | `number`; `thematicValidity.option`: `list` | `range` (+ `from`, `to`). Segon pare opcional; cal per validity amb llista.)

## qualityResultsViewer

```json
{
  "tool": "qualityResultsViewer",
  "parentNodeIds": [
    "qualityNodeId"
  ],
  "date": "2026-11-11T11:00:00.000Z"
}
```

---

# 8. Exemple de cadena completa

CSV → GroupBy → SelectColumnsTable → EditRecord

```json
{
  "dataLineage": {
    "steps": [
      {
        "tool": "EditRecord",
        "edited": [
          {
            "index": 0,
            "before": {
              "Ciutat": "Barcelona"
            },
            "after": {
              "Ciutat": "BCN"
            }
          }
        ],
        "created": [],
        "deleted": [],
        "date": "2026-11-11T11:03:00.000Z"
      },
      {
        "tool": "SelectColumnsTable",
        "columns": [
          "Ciutat"
        ],
        "date": "2026-11-11T11:02:00.000Z"
      },
      {
        "tool": "GroupBy",
        "groupByAttr": [
          "Ciutat"
        ],
        "groupByDate": [],
        "aggregationAttr": {},
        "sourceParentId": "parentId",
        "date": "2026-11-11T11:01:00.000Z"
      },
      {
        "tool": "ImportCSV",
        "date": "2026-11-11T11:00:00.000Z"
      }
    ]
  }
}
```

---

# Com editar

1. Canvia **noms de claus** (`tool` i la resta del pas).
2. Marca amb `TODO:` el que falte o sobri.
3. Quan acabis, digues-ho i s’alinearà el codi a aquest document.

## Inventari (checklist)

**ServicesAndAPIs (20):** sta, ogcAPICols, ogcAPIItems, csw, s3Service, s3Bucket, edc, edcAsset, ImportCSV, ImportDBF, ImportGPKG, ImportGPKGTable, ImportJSONLD, ImportJSON, ImportGeoJSON, CreateDGGS, CreateNewTable, connectASensor, readSDFromSensor, staRoot

**STA entities (15):** Campaigns, Cells, Datastreams, FeaturesOfInterest, HistoricalLocations, Licenses, Locations, MultiDatastreams, ObservationGroups, Observations, ObservedProperties, Parties, Relations, Sensors, Things

**STA special (1):** ObsLayer

**STA operations (22):** RecursiveExpandSTA, ExpandColumnSTA, MergeExpandsSTA, SelectColumnsSTA, SelectRowSTA, SelectResourceSTA, FilterRowsSTA, FilterRowsByTime, GeoFilterPolSTA, GeoFilterPntSTA, SortBySTA, RangeSTA, UploadObservations, CalculateStatisticsSTA, CountResultsSTA, ViewQuerySTA, OneValueSTA, SubscribeSTA, me, staEntityBuilder, staPublisher (+ CalculateStatisticsSTA ja llistat)

**Table operations (26):** Table, EditRecord, Meaning, SelectColumnsTable, SelectRowTable, SelectRowsTable, FilterRowsTable, Replace, JoinTables, ConcatenateTables, GroupBy, SortByTables, AggregateColumns, CreateColumns, AddColumnPnt, AddColumnBBox, ColumnsCalculator, PivotTable, TransposeTable, ColumnStatistics, SeparateColumns, SaveTable, SaveLayer, guf, uploadToIC

**Visualize (7):** ColumnStatistics, ScatterPlot, BarPlot, RadarPlot, circularChart, ImageViewer, OpenMap

**Quality (9):** uncertainty, completness, misclassificationMatrix, logicalConsistency, formatConsistency, temporalQuality, positionalQuality, thematicQuality, qualityResultsViewer
