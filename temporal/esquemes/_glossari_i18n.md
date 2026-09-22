# Glossari i criteris de traducció TAPIS (eng → cat / spa)

## Regla número 1: què NO es tradueix mai

Els noms propis de l'esquema SensorThings API / STAplus i dels formats i serveis es
deixen **exactament igual** que en anglès (majúscules incloses), tant en català com en castellà:

- Entitats STA: `Thing`, `Things`, `Datastream`, `Datastreams`, `MultiDatastream`,
  `MultiDatastreams`, `Observation`, `Observations`, `ObservedProperty`, `ObservedProperties`,
  `FeatureOfInterest`, `FeaturesOfInterest`, `Location`, `Locations`, `HistoricalLocation`,
  `HistoricalLocations`, `Sensor`, `Sensors`, `Party`, `Parties`, `Campaign`, `Campaigns`,
  `License`, `Licenses`, `ObservationGroup`, `ObservationGroups`, `Relation`, `Relations`,
  `Cell`, `Cells`, `Subject`, `Subjects`, `Object`, `Objects`.
  (Compte: `Party` NO és «festa»/«partido», `Thing` NO és «cosa», `Cell` NO és «cel·la»
  quan es refereix a l'entitat, `Relation` es manté com a entitat.)
- Propietats i paràmetres STA: `@iot.id`, `phenomenonTime`, `resultTime`, `result`,
  `resultQuality`, `validTime`, `parameters`, `properties`, `unitOfMeasurement`,
  `unitOfMeasurements`, `observationType`, `multiObservationDataType`, `observedArea`,
  `encodingType`, `feature`, `location`, `name`, `description`, `definition`, `metadata`,
  `authId`, `role`, `displayName`, `classification`, `termsOfUse`, `privacyPolicy`,
  `creationTime`, `startTime`, `endTime`, `purpose`, `dataQuality`, `system`, `resolution`,
  `externalObject`, `logo`, `attributionText`.
- Opcions de consulta: `$filter`, `$select`, `$expand`, `$orderby`, `$top`, `$skip`, `$count`.
- Sigles, serveis, formats i productes: `TAPIS`, `SensorThings API`, `STA`, `STAplus`, `OGC`,
  `OGC API`, `CSW`, `EDC`, `S3`, `MinIO`, `DGGS`, `H3`, `WebSub`, `NiMMbus`, `MiraMon`,
  `CSV`, `CSVW`, `DBF`, `GeoPackage`, `GPKG`, `JSON`, `JSON-LD`, `GeoJSON`, `WKT`, `URL`,
  `URI`, `HTTP`, `DQ4STA`, `STAC`, `iNaturalist`, `Authenix`.
  **Mai** escriguis `STP`, `STDA`, `SensorTukings`, `Datastre`, `MultiDatastre`,
  `sensorThings`, `DGS` ni variants inventades: són errors de la traducció automàtica.

## Regla número 2: format

- Conserva **literalment** els marcadors de posició `{0}`, `{1}`, `{2}`, `{3}` (mateix nombre i,
  sempre que la sintaxi ho permeti, el mateix ordre lògic).
- Conserva les etiquetes HTML tal com són: `<br>`, `<small>`, `</small>`, `<hr>`, `<i>`, `<b>`,
  i les seqüències d'escapada `\n` (barra + n literal dins el CSV).
- Conserva els dos punts finals, els punts finals, els parèntesis, els asteriscs (`*`) i els
  símbols (`%`, `≥`, `≤`) que hi hagi a l'anglès.
- Si l'anglès acaba amb `...`, la traducció també.

## Regla número 3: llengua

### Català
- Apòstrof sense espais: `d'un`, `l'URL`, `s'ha`, `n'hi`, `l'eina`. Mai `d' un` ni `S' ha`.
- Punt volat correcte i sense espais: `Cancel·la`, `cel·la`, `sol·licitud`, `paral·lel`.
- Botons i ordres: imperatiu de segona persona del singular (`Afegeix`, `Selecciona`, `Desa`,
  `Obre`, `Suprimeix`).
- Textos d'ajuda i missatges: tracte de vós (`podeu`, `seleccioneu`, `heu de connectar`).

### Castellà
- Botons i ordres: infinitiu (`Añadir`, `Seleccionar`, `Guardar`, `Abrir`, `Eliminar`).
- Textos d'ajuda i missatges: tracte d'usted (`puede`, `seleccione`, `debe conectar`).
- Accentuació i signes d'obertura correctes: `¿`, `¡`, `Descripción`, `número`.

## Glossari de termes recurrents

| eng | cat | spa |
|---|---|---|
| OK | D'acord | Aceptar |
| Cancel | Cancel·la | Cancelar |
| Apply | Aplica | Aplicar |
| Close | Tanca | Cerrar |
| Done | Fet | Hecho |
| Load | Carrega | Cargar |
| Draw | Dibuixa | Dibujar |
| Create | Crea | Crear |
| Update | Actualitza | Actualizar |
| Delete | Suprimeix | Eliminar |
| Insert | Insereix | Insertar |
| Add | Afegeix | Añadir |
| Share | Comparteix | Compartir |
| Continue | Continua | Continuar |
| Upload | Puja | Subir |
| Open | Obre | Abrir |
| Save / Save as... | Desa / Desa com a... | Guardar / Guardar como... |
| Refresh | Actualitza | Actualizar |
| row / record | fila / registre | fila / registro |
| column | columna | columna |
| table | taula | tabla |
| node / start node / leaf node | node / node inicial / node final | nodo / nodo inicial / nodo final |
| query | consulta | consulta |
| filter | filtre (verb: filtra) | filtro (verbo: filtrar) |
| sort by | ordena per | ordenar por |
| group by | agrupa per | agrupar por |
| expand (STA) | expandeix | expandir |
| merge / join / concatenate | fusiona / uneix / concatena | fusionar / unir / concatenar |
| meaning (semantics) | significat | significado |
| feedback (GUF) | comentaris | comentarios |
| target | objectiu | objetivo |
| label | etiqueta | etiqueta |
| left / right | esquerra / dreta | izquierda / derecha |
| axis / axes | eix / eixos | eje / ejes |
| plot / chart | gràfic | gráfico |
| scatter plot | gràfic de dispersió | gráfico de dispersión |
| bar plot | gràfic de barres | gráfico de barras |
| pie | sectors | sectores |
| radar plot | gràfic de radar | gráfico de radar |
| recipe | recepta | receta |
| cooking method | mètode de cocció | método de cocción |
| landing page | pàgina d'inici | página de inicio |
| header column | columna de capçalera | columna de cabecera |
| bounding box / BBox | BBox (caixa envoltant) | BBox (caja envolvente) |
| centroid | centroide | centroide |
| uncertainty | incertesa | incertidumbre |
| completeness | completesa | completitud |
| omission / commission | omissió / comissió | omisión / comisión |
| misclassification matrix | matriu de classificació errònia | matriz de clasificación errónea |
| logical consistency | consistència lògica | consistencia lógica |
| format consistency | consistència de format | consistencia de formato |
| positional / thematic / temporal quality | qualitat posicional / temàtica / temporal | calidad posicional / temática / temporal |
| accuracy / validity | exactitud / validesa | exactitud / validez |
| data quality | qualitat de les dades | calidad de los datos |
| immutable catalog | catàleg immutable | catálogo inmutable |
| signed in / signed out | sessió iniciada / sessió tancada | sesión iniciada / sesión cerrada |
| parse error | error d'anàlisi | error de análisis |
| downloading / uploading | baixada / pujada | descarga / carga |
| completed | s'ha completat / completat | completado |
| warning | avís | aviso |

## Casos que cal vigilar (errors detectats a la traducció automàtica)

- `Close` → **no** «Cerca»; és `Tanca` / `Cerrar`.
- `Draw` → **no** «Dibujo»; és `Dibuixa` / `Dibujar`.
- `Open` → **no** «Abierto»; és `Obre` / `Abrir`.
- `Right label` → **no** «Etiqueta correcta»; és `Etiqueta dreta` / `Etiqueta derecha`.
- `Plot type` → **no** «Tipo de parcela»; és `Tipus de gràfic` / `Tipo de gráfico`.
- `Record range` → `Interval de registres` / `Intervalo de registros`.
- `Add centroid coordinates` → `Afegeix les coordenades del centroide` / `Añadir las coordenadas del centroide`.
- `-- Select an option--` → `-- Seleccioneu una opció--` / `-- Seleccione una opción--`
  (hi ha cel·les amb `#¿NOMBRE?`, que és un error d'Excel i s'ha de substituir).
- `mandatory` → `obligatori` / `obligatorio` (no «mandatario» ni «ordenatori»).
- `Requeres`/`Requires` (l'anglès té errates) → tradueix pel sentit: `Cal que...` / `Requiere...`.
