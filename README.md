# TAPIS: Tables from APIs for Sensors. An STAplus Explorer
## What is TAPIS
TAPIS is a lightweight multipurpose tool. It is useful for:
* exploring APIs and services such as SensorThings API (STA), STAplus, S3, Eclipse Data Space Connector, Catalogue Service for the Web (CSW) and OGC API collections, features, records and STAC. TAPIS is designed as a middle-ground solution between a URL based query interface such as Postman or curl and specialised domain-specific GUIs. This makes TAPIS an essential tool for conducting interoperability tests on newly developed or deployed services and API server instances. 
* direct reading of CSV, DBF, GeoPackage, JSON, JSON-LD and GeoJSON file formats. TAPIS is also a table editor, capable of selecting, filtering, merging, adding grouping, sorting, pivoting and semantically enrich tabular information. A part of a classical rows and columns tabular representation, data can be presented as bar charts, pie charts, scatter plots, and maps. TAPIS is integrated with [NiMMbus](https://github.com/grumets/nimmbus) (MiraMon implementation of the Geospatial User Feedback) and with the [MiraMon Map Browser](https://github.com/grumets/MiraMonMapBrowser).
 
Internally, TAPIS organizes the information into structured tables (with columns that represent fields and rows that represent records), each one stored in a node-edge interface that facilitates chain operations building data workflows interactively that can be saved and reused. TAPIS is under continuous development and new functionalities to support evolving needs are being regularly implemented. TAPIS enables users to train and educate others on using SensorThings API or other supported services, APIs and file formats facilitating detailed exploration of the data without needing to build a GUI. In that respect it’s a platform to help people get familiar with supported services, APIs and file formats.

## Where to use TAPIS
You are free to deploy your own copy of the code and offer it as a web service. An official
deployment can be found ready to use here: https://www.tapis.grumets.cat

## Lineage
While the project is completely independent from the [Orange data mining](https://orangedatamining.com/) software, it has been inspired by its GUI design. If you have used Orange in the past, you will immediately know how TAPIS works.

But there are some differences with Orange:
* TAPIS is a JavaScript interface that does not required installation
* Columns can be semantically tagged adding meaning to the data fields
* TAPIS connect with external APIS such as SensorThings API (STA) and STAplus as sources for tabular data. 

![STA Plus Explorer](STAplusExplorer.png)

## Read and see more about TAPIS
* You can find [recipes](https://www.tapis.grumets.cat/help/#recipes) on how to use TAPIS in practice.
* You can see a video about [using TAPIS to connect to an Eclipse Data Connector](https://www.youtube.com/watch?v=oozPg1w7MZQ&list=PL5v0XQ3VTFly2cHEcXbL2D69s4MaXPUEj&index=7) in a the Green Deal Data Space prototype
* You can read a CitiObs press release: [TAPIS: A Simple Web Tool for Analyzing Citizen-Generated Data](https://citiobs.eu/tapis-a-simple-web-tool-for-analyzing-citizen-generated-data/)
* TAPIS was presented in the EGU 2025 as a poster. Read the abstract: [Tables as a way to deal with a variety of data formats and APIs in data spaces](https://meetingorganizer.copernicus.org/EGU25/EGU25-13567.html)
* TAPIS is promoted by the [Horizon 2020 Framework project](https://www.framework-biodiversity.eu/) in the Recodo platform: [TAPIS (Tool for Analysing and Processing Information from Sensors)](https://recodo.io/page/tapis)
* TAPIS as part of the [AD4GD components](https://ad4gd.eu/project/component_tapis)

## Funding acknowledgement
![EuropeanFlag](eu_flag.jpg)  Co-funded by the European Union.

TAPIS is developed under the [AD4GD](https://ad4gd.eu/), [more4nature](https://www.more4nature.eu/), [CitiObs](https://citiobs.eu/), [Framework](https://www.framework-biodiversity.eu/) and [SAGE](https://www.greendealdata.eu/) projects as part of the Horizon 2020 and Horizon Europe research programs.

TAPIS is developed by the [GRUMETS research group](https://www.grumets.cat/) and is hosted by [CREAF](https://www.creaf.cat/en). TAPIS is distributed under the [MIT license](LICENSE).

