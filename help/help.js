"use strict"

/*
	Resolve multilanguage {cat,spa,eng} labels for help pages.
	Help is written in English: always prefer .eng (avoids "[object Object]").
*/
function helpLabel(a) {
	var s;
	if (a == null)
		return "";
	if (typeof a !== "object")
		return String(a);
	s = a.eng || a.cat || a.spa || "";
	if (typeof s === "object")
		s = s.eng || s.cat || s.spa || "";
	return (s == null || typeof s === "object") ? "" : String(s);
}

/* Short English caption for a tool entry (prefer name, then description). */
function helpToolTitle(entry) {
	if (!entry)
		return "";
	return helpLabel(entry.name) || helpLabel(entry.description) || "";
}

/*
	Flatten all multilanguage name/description/help fields to English strings
	so every help UI path shows text (never "[object Object]").
*/
function helpFlattenI18nTools() {
	var groups, g, i, key, entry, fields, f;
	groups = [];
	if (typeof ServicesAndAPIs !== "undefined")
		groups.push(ServicesAndAPIs);
	if (typeof STAOperations !== "undefined")
		groups.push(STAOperations);
	if (typeof STASpecialQueries !== "undefined")
		groups.push(STASpecialQueries);
	if (typeof TableOperations !== "undefined")
		groups.push(TableOperations);
	if (typeof tableStatisticsVisualize !== "undefined")
		groups.push(tableStatisticsVisualize);
	if (typeof dataQuality !== "undefined")
		groups.push(dataQuality);
	fields = ["name", "description", "help"];
	for (g = 0; g < groups.length; g++) {
		if (!groups[g])
			continue;
		for (key in groups[g]) {
			if (!Object.prototype.hasOwnProperty.call(groups[g], key))
				continue;
			entry = groups[g][key];
			if (!entry || typeof entry !== "object")
				continue;
			for (f = 0; f < fields.length; f++) {
				i = fields[f];
				if (entry[i] != null && typeof entry[i] === "object")
					entry[i] = helpLabel(entry[i]);
			}
		}
	}
	if (typeof ServicesAndAPIsType !== "undefined") {
		if (ServicesAndAPIsType.singular && typeof ServicesAndAPIsType.singular === "object")
			ServicesAndAPIsType.singular = helpLabel(ServicesAndAPIsType.singular);
		if (ServicesAndAPIsType.plural && typeof ServicesAndAPIsType.plural === "object")
			ServicesAndAPIsType.plural = helpLabel(ServicesAndAPIsType.plural);
	}
	if (typeof STAOperationsType !== "undefined") {
		if (STAOperationsType.singular && typeof STAOperationsType.singular === "object")
			STAOperationsType.singular = helpLabel(STAOperationsType.singular);
		if (STAOperationsType.plural && typeof STAOperationsType.plural === "object")
			STAOperationsType.plural = helpLabel(STAOperationsType.plural);
	}
	if (typeof TableOperationsType !== "undefined") {
		if (TableOperationsType.singular && typeof TableOperationsType.singular === "object")
			TableOperationsType.singular = helpLabel(TableOperationsType.singular);
		if (TableOperationsType.plural && typeof TableOperationsType.plural === "object")
			TableOperationsType.plural = helpLabel(TableOperationsType.plural);
	}
	if (typeof STASpecialQueriesType !== "undefined") {
		if (STASpecialQueriesType.singular && typeof STASpecialQueriesType.singular === "object")
			STASpecialQueriesType.singular = helpLabel(STASpecialQueriesType.singular);
		if (STASpecialQueriesType.plural && typeof STASpecialQueriesType.plural === "object")
			STASpecialQueriesType.plural = helpLabel(STASpecialQueriesType.plural);
	}
	if (typeof tableStatisticsVisualizeType !== "undefined") {
		if (tableStatisticsVisualizeType.singular && typeof tableStatisticsVisualizeType.singular === "object")
			tableStatisticsVisualizeType.singular = helpLabel(tableStatisticsVisualizeType.singular);
		if (tableStatisticsVisualizeType.plural && typeof tableStatisticsVisualizeType.plural === "object")
			tableStatisticsVisualizeType.plural = helpLabel(tableStatisticsVisualizeType.plural);
	}
	if (typeof dataQualityType !== "undefined") {
		if (dataQualityType.singular && typeof dataQualityType.singular === "object")
			dataQualityType.singular = helpLabel(dataQualityType.singular);
		if (dataQualityType.plural && typeof dataQualityType.plural === "object")
			dataQualityType.plural = helpLabel(dataQualityType.plural);
	}
}

/* 
   This file is part of TAPIS. TAPIS is a web page and a Javascript code 
   that builds queries and explore the STAplus content, saves it as CSV or 
   GeoJSON and connects with the MiraMon Map Browser. While the project is 
   completely independent from the Orange data mining software, it has been 
   inspired by its GUI. The general idea of the application is to be able 
   to work with STA data as tables.
  
   The TAPIS client is free software under the terms of the MIT License

   Copyright (c) 2023 Joan Masó

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

   Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at uab cat) 
   dins del grup del MiraMon. MiraMon és un projecte del 
   CREAF que elabora programari de Sistema d'Informació Geogràfica 
   i de Teledetecció per a la visualització, consulta, edició i anàlisi 
   de mapes ràsters i vectorials. Aquest progamari programari inclou
   aplicacions d'escriptori i també servidors i clients per Internet.
   No tots aquests productes són gratuïts o de codi obert. 
	
   En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
	
   El TAPIS es pot actualitzar des de https://github.com/joanma747/tapis.
*/
const headerNavBar = `<div onclick="openTapisPage()">
            <table border="0" class="button">
                <tr>
                    <td>
                        <table>
                            <tr>
                                <td><img src="../logo.png" height="50"></td>
                                <td>
                                    <div style="font-size: 30px; font-weight: bold;">TAPIS</div>
                                    <div style="font-size: 20px; font-weight: bold;">Tables from APIS</div>
                                    <div style="font-size: 10px; font-weight: normal;">or an API Explerer and a Table
                                        Manager
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        <div id="content_navBar">
            <div id="navBar">
                <div id="navBar_howTAPISWorks"></div>
                <div id="navBar_servicesAndApis"></div>
                <div id="navBar_STAEntities"></div>
                <div id="navBar_STAEntities_singular"></div>
                <div id="navBar_STASpecialQueries"></div>
                <div id="navBar_STAOperations"></div>
                <div id="navBar_TableOperations"></div>
                <div id="navBar_tableStatisticsVisualize"></div>
                <div id="navBar_dataQuality"></div>
                <div id="navBar_nodeOperations"></div>
                <div id="navBar_navBarButtons"></div>
            </div>
        </div>
        <div>
            <button onclick='OpenHelpFromHelp(event);'><img src="../help.png" height="20" valign="middle">Help</button>
             <button onclick='OpenRecipesFromHelp(event);'><img src="../documentation.png" height="20"
                     valign="middle">Recipes</button>
       </div>`
function StartDocumentationPage() {
    var c = "";
    helpFlattenI18nTools();
    //howTAPISWorks
    c = `<h2 class="toolBoxParentTitle">How TAPIS Works</h2>`;
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm" class="link_a"><div class="toolBox tapisTool">
       <img src="../logoWithText.png" alt="Imatge" style="height:84px">
       <div class="toolBoxText">How to use it</div>
       </div></a>`
    document.getElementById("container_howTapisWorks").innerHTML = c;
    //Services And Apis (inputTools)
    c = `<h2 class="toolBoxParentTitle">Data input tools</h2>`;
    c += createInputTools()
    document.getElementById("container_servicesAndApis").innerHTML = c;

    //container_STAEntities (staEntities)
    c = `<h2 class="toolBoxParentTitle">STA entities reading tool</h2>`;
    c += createSTAentities()
    document.getElementById("container_STAEntities").innerHTML = c;

    //container_STAEntities singular (staEntitiesSingular)
    c = `<h2 class="toolBoxParentTitle">STA entities create, edit or delete tool</h2>`
    c += createSTAentitiesSingular()
    document.getElementById("container_STAEntities_singular").innerHTML = c;

    //STA operations (staOperations)
    c = `<h2 class="toolBoxParentTitle">STA tools</h2>`
    c += createSTAOperations()
    document.getElementById("container_STAOperations").innerHTML = c;

    //ComplexQuerys (complexQueries)
    c = `<h2 class="toolBoxParentTitle">Complex queries</h2>`
    c += createComplexOperations();
    document.getElementById("container_STASpecialQueries").innerHTML = c;

    //TableOperations (tableOperations)
    c = `<h2 class="toolBoxParentTitle">Generic table tools</h2>`
    c += createTableOperations();
    document.getElementById("container_TableOperations").innerHTML = c;

    //Table Statistics visualize (statisticsVisualize)
    c = `<h2 class="toolBoxParentTitle">Table tools for statistics and visualization</h2>`
    c += createStatisticsVisualize();
    document.getElementById("container_tableStatisticsVisualize").innerHTML = c;

    //Data quality (dataquality)
    c = `<h2 class="toolBoxParentTitle">Table tools for data quality</h2>`
    c += createDataQuality();
    document.getElementById("container_dataQuality").innerHTML = c;

    //node operations (nodeoperations)
    c = `<h2 class="toolBoxParentTitle">Node operations</h2>`
    c += createNodeOperations()

    document.getElementById("container_nodeOperations").innerHTML = c;

    //NavBar buttons (navBarButtons)
    c = `<h2 class="toolBoxParentTitle">Navegation bar buttons</h2>`
    c += createnavBarButtonsToolBox();

    document.getElementById("container_navBar").innerHTML = c;

}
//square ToolBoxes
function createInputTools() {
    var c = "";
    for (var i = 0; i < ServicesAndAPIsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/inputtools.htm#${ServicesAndAPIsArray[i]}" class="link_a"><div style="" class="toolBox">
       <img src="../${ServicesAndAPIsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${helpToolTitle(ServicesAndAPIs[ServicesAndAPIsArray[i]])}</div>
       </div></a>`
    }
    return c;
}
function createSTAentities() {
    var c = "";

    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/staentities.htm#${STAEntitiesArray[i]}" class="link_a"><div style="" class="toolBox entities">
       <img src="../${STAEntitiesArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STAEntitiesArray[i]}</div>
       </div></a>`
    }
    return c;
}
function createSTAentitiesSingular() {
    var c = "";
    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/staentitiesSingular.htm#${STAEntities[STAEntitiesArray[i]].singular}" class="link_a"><div style="" class="toolBox entities">
        <img src="../${STAEntities[STAEntitiesArray[i]].singular}.png" alt="Imatge" style="height:60px">
        <div class="toolBoxText">${STAEntities[STAEntitiesArray[i]].singular}</div>
        </div></a>`
    }
    return c;
}
function createSTAOperations() {
    var c = "";
    for (var i = 0; i < STAOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/staoperations.htm#${STAOperationsArray[i]}" class="link_a"><div style="" class="toolBox">
       <img src="../${STAOperationsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${helpToolTitle(STAOperations[STAOperationsArray[i]])}</div>
       </div></a>`
    }
    return c;
}
function createComplexOperations() {
    var c = "";
    for (var i = 0; i < STASpecialQueriesArray.length; i++) {
        c += ` <a href="https://www.tapis.grumets.cat/tapis/help/complexqueries.htm#${STASpecialQueriesArray[i]}" class="link_a"><div style="" class="toolBox">
       <img src="../${STASpecialQueriesArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${helpToolTitle(STASpecialQueries[STASpecialQueriesArray[i]])}</div>
       </div>`
    }
    return c;
}
function createTableOperations() {
    var c = "";
    for (var i = 0; i < TableOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/tableOperations.htm#${TableOperationsArray[i]}" class="link_a"><div style="" class="toolBox">
       <img src="../${TableOperationsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${helpToolTitle(TableOperations[TableOperationsArray[i]])}</div>
       </div></a>`
    }
    return c;
}
function createStatisticsVisualize() {
    var c = "";
    for (var i = 0; i < tableStatisticsVisualizeArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/statisticsvisualize.htm#${tableStatisticsVisualizeArray[i]}" class="link_a"><div style="" class="toolBox">
       <img src="../${tableStatisticsVisualizeArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${helpToolTitle(tableStatisticsVisualize[tableStatisticsVisualizeArray[i]])}</div>
       </div></a>`
    }
    return c;
}
function createDataQuality() {
    var c = "";
    for (var i = 0; i < dataQualityArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/dataquality.htm#${dataQualityArray[i]}" class="link_a"><div style="" class="toolBox">
       <img src="../${dataQualityArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${helpToolTitle(dataQuality[dataQualityArray[i]])}</div>
       </div></a>`
    }
    return c;
}
function createNodeOperations() {
    var c = "";
    //connectTwoNodes
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm#connect" class="link_a"><div style="" class="toolBox"><img src="../connect.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Connect two nodes</div></div></a>`
    //Remove
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm#remove" class="link_a"><div style="" class="toolBox"><img src="../remove.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Remove</div></div></a>`
    //Rename
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm#rename" class="link_a"><div style="" class="toolBox"><img src="../rename.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Rename</div></div></a>`

    return c;
}
function createnavBarButtonsToolBox() {
    var c = "";
    //Refresh
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#reload" class="link_a"><div style="" class="toolBox"><img src="../reload.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Refresh</div></div></a>`
    //Open
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#openNetwork" class="link_a"><div style="" class="toolBox"><img src="../OpenNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Open</div></div> </a>`
    //Oper Url
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#openURLNetwork" class="link_a"><div style="" class="toolBox"><img src="../OpenURLNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Oper Url</div></div></a>`
    //Save as...
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#saveNetwork" class="link_a"><div style="" class="toolBox"><img src="../SaveNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Save as...</div></div></a>`
    //Login
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#login" class="link_a"><div style="" class="toolBox"><img src="../login.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Login</div></div></a>`
    //Configuration
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#config" class="link_a"><div style="" class="toolBox"><img src="../config.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Configuration</div></div></a>`
    //Help
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#help" class="link_a"><div style="" class="toolBox"><img src="../help.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Help</div></div></a>`
    //Documentation
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#documentation" class="link_a"><div style="" class="toolBox"><img src="../Documentation.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Documentation</div></div></a>`

    return c
}



function openTapisPage() {
    window.open("https://www.tapis.grumets.cat/", "Tapis");
}


function addPanzoneWitSTASchema() {
    //STA Schema Image
    // STA entities schema image with zoom
    const element = document.querySelector("#imageSTA");
    const panzoom = Panzoom(element);
    document.getElementById('imageSTAZoomSTADatastream').addEventListener('wheel', panzoom.zoomWithWheel);

    // STA entities Multidatastream schema image with zoom
    const elementMulti = document.querySelector("#imageSTAMulti");
    const panzoomMulti = Panzoom(elementMulti);
    document.getElementById('imageSTAZoomMultiDatastream').addEventListener('wheel', panzoomMulti.zoomWithWheel);
}
function openToolPage(place) {
    helpFlattenI18nTools();
    document.getElementById("toolPage_header_" + place).innerHTML = headerNavBar;
    createNavBar();
    switch (place) {
        case "inputTools":
            document.getElementById("toolPage_inputTools").innerHTML = createInputTools()
            break;
        case "STAentities":
            document.getElementById("toolPage_STAentities").innerHTML = createSTAentities();
            addPanzoneWitSTASchema();
            break;
        case "STAentitiesSingular":
            document.getElementById("toolPage_STAentitiesSingular").innerHTML = createSTAentitiesSingular()
            break;
        case "STAOperations":
            document.getElementById("toolPage_STAOperations").innerHTML = createSTAOperations()
            break;
        case "complexQueries":
            document.getElementById("toolPage_complexQueries").innerHTML = createComplexOperations()
            break;
        case "tableOperations":
            document.getElementById("toolPage_tableOperations").innerHTML = createTableOperations()
            break;
        case "statisticsVisualize":
            document.getElementById("toolPage_statisticsVisualize").innerHTML = createStatisticsVisualize()
            break;
        case "dataQuality":
            document.getElementById("toolPage_dataQuality").innerHTML = createDataQuality()
            break;
        case "nodeOperations":
            document.getElementById("toolPage_nodeOperations").innerHTML = createNodeOperations()
            break;
        case "navBarButtons":
            document.getElementById("toolPage_navBarButtons").innerHTML = createnavBarButtonsToolBox()
            break;
    }
}
function createNavBar() {
    var c = "";
    //How TAPIS works
    c = `<div class="dropdown"><a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm" class="link_a"><div>How TAPIS works</div></a><div class="dropdown-content">`
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm">How works</a>
    <a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm#howStart">How start</a>
    <a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm#connectingNodes">Connecting nodes</a>
    <a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm#leafNodes">Leaf nodes</a>
    <a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm#STAnodesVsTableNodes">STAnodes vs table nodes</a>
    <a href="https://www.tapis.grumets.cat/tapis/help/HowTapisWorks.htm#URLParameters">Open an schema directly</a>`
    c += `</div></div></div>`
    document.getElementById("navBar_howTAPISWorks").innerHTML = c;
    //Services And Apis
    c = `<div class="dropdown"><a href="https://www.tapis.grumets.cat/tapis/help/inputtools.htm" class="link_a"><div>Input tools</div></a><div class="dropdown-content">`
    for (var i = 0; i < ServicesAndAPIsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/inputtools.htm#${ServicesAndAPIsArray[i]}">${helpToolTitle(ServicesAndAPIs[ServicesAndAPIsArray[i]])}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_servicesAndApis").innerHTML = c;
    //container_STAEntities
    c = `<div class="dropdown blue"><a href="https://www.tapis.grumets.cat/tapis/help/staentities.htm" class="link_a"><div>STA entities reading</div></a><div class="dropdown-content">`
    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/staentities.htm#${STAEntitiesArray[i]}">${STAEntitiesArray[i]}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STAEntities").innerHTML = c;
    //container_STAEntities singular
    c = `<div class="dropdown blue"><a href="https://www.tapis.grumets.cat/tapis/help/staentitiesSingular.htm" class="link_a"><div>STA entities create...</div></a><div class="dropdown-content">`
    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/staentitiesSingular.htm#${STAEntities[STAEntitiesArray[i]].singular}">${STAEntities[STAEntitiesArray[i]].singular}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STAEntities_singular").innerHTML = c;
    //STA operations 
    c = `<div class="dropdown blue"><a href="https://www.tapis.grumets.cat/tapis/help/staoperations.htm" class="link_a"><div>STA tools </div></a><div class="dropdown-content">`
    for (var i = 0; i < STAOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/staoperations.htm#${STAOperationsArray[i]}">${helpToolTitle(STAOperations[STAOperationsArray[i]])}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STAOperations").innerHTML = c;
    //ComplexQuerys
    c = `<div class="dropdown blue"> <a href="https://www.tapis.grumets.cat/tapis/help/complexqueries.htm" class="link_a"><div>Complex queries</div></a><div class="dropdown-content">`
    for (var i = 0; i < STASpecialQueriesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/complexqueries.htm#${STASpecialQueriesArray[i]}">${helpToolTitle(STASpecialQueries[STASpecialQueriesArray[i]])}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STASpecialQueries").innerHTML = c;
    //TableOperations
    c = `<div class="dropdown"> <a href="https://www.tapis.grumets.cat/tapis/help/TableOperations.htm" class="link_a"><div>Table tools</div></a><div class="dropdown-content">`
    for (var i = 0; i < TableOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/TableOperations.htm#${TableOperationsArray[i]}">${helpToolTitle(TableOperations[TableOperationsArray[i]])}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_TableOperations").innerHTML = c;
    //Table Statistics visualize
    c = `<div class="dropdown"> <a href="https://www.tapis.grumets.cat/tapis/help/statisticsvisualize.htm" class="link_a"><div>Statistics and visualization</div></a><div class="dropdown-content">`
    for (var i = 0; i < tableStatisticsVisualizeArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/statisticsvisualize.htm#${tableStatisticsVisualizeArray[i]}">${helpToolTitle(tableStatisticsVisualize[tableStatisticsVisualizeArray[i]])}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_tableStatisticsVisualize").innerHTML = c;
    //Data quality
    c = `<div class="dropdown"> <a href="https://www.tapis.grumets.cat/tapis/help/dataquality.htm" class="link_a"><div>Data quality</div></a><div class="dropdown-content">`
    for (var i = 0; i < dataQualityArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/tapis/help/dataquality.htm#${dataQualityArray[i]}">${helpToolTitle(dataQuality[dataQualityArray[i]])}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_dataQuality").innerHTML = c;

    //node operations
    c = `<div class="dropdown"> <a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm" class="link_a"><div>Node operations</div></a><div class="dropdown-content">`
    //connectTwoNodes
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm#connect">Connect two nodes</a>`
    //Remove
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm#remove">Remove</a>`
    //Rename
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/nodeoperations.htm#rename">Rename</a>`
    c += `</div></div></div>`
    document.getElementById("navBar_nodeOperations").innerHTML = c;
    //NavBar buttons
    c = `<div class="dropdown"> <a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm" class="link_a"><div>NavBar buttons</div></a><div class="dropdown-content">`
    //Refresh
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#reload">Refresh</a>`
    //Open
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#openNetwork">Open</a>`
    //Oper Url
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#openURLNetwork">Open URL</a>`
    //Save as...
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#saveNetwork">Save as...</a>`
    //Login
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#login">Login</a>`
    //Configuration
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#config">Configuration</a>`
    //Help
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#help">Help</a>`
    //Documentation
    c += `<a href="https://www.tapis.grumets.cat/tapis/help/navBarButtons.htm#documentation">documentation</a>`
    c += `</div></div></div>`
    document.getElementById("navBar_navBarButtons").innerHTML = c;
}

function OpenRecipesFromHelp(event) {
    window.open("https://www.tapis.grumets.cat/tapis/recipes/index.htm", "TapisRecipes");
}
function OpenHelpFromHelp(event) {
    window.open("https://www.tapis.grumets.cat/tapis/help/index.htm", "TapisHelp");
}

function zoomToImage(img) {
    img.classList.toggle("zoom");
}
