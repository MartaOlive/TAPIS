"use strict"

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
        </div>`

function StartDocumentationPage() {
    var c="";
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

    //NavBar buttons (navbarbuttons)
    c = `<h2 class="toolBoxParentTitle">Navegation bar buttons</h2>`
    c += createNavBarButtonsToolBox();

    document.getElementById("container_navBar").innerHTML = c;

}
//square ToolBoxes
function createInputTools() {
    var c="";
    for (var i = 0; i < ServicesAndAPIsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/inputtools.htm#${ServicesAndAPIsArray[i]}" class="toolBox_a"><div style="" class="toolBox">
       <img src="../${ServicesAndAPIsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${ServicesAndAPIs[ServicesAndAPIsArray[i]].description}</div>
       </div></a>`
    }
    return c;
}
function createSTAentities() {
    var c="";

    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/staentities.htm#${STAEntitiesArray[i]}" class="toolBox_a"><div style="" class="toolBox entities">
       <img src="../${STAEntitiesArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STAEntitiesArray[i]}</div>
       </div></a>`
    }
    return c;
}
function createSTAentitiesSingular() {
    var c="";
    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/staentitiesSingular.htm#${STAEntities[STAEntitiesArray[i]].singular}" class="toolBox_a"><div style="" class="toolBox entities">
        <img src="../${STAEntities[STAEntitiesArray[i]].singular}.png" alt="Imatge" style="height:60px">
        <div class="toolBoxText">${STAEntities[STAEntitiesArray[i]].singular}</div>
        </div></a>`
    }
    return c;
}
function createSTAOperations() {
    var c="";
    for (var i = 0; i < STAOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/staoperations.htm#${STAOperationsArray[i]}" class="toolBox_a"><div style="" class="toolBox">
       <img src="../${STAOperationsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STAOperations[STAOperationsArray[i]].description}</div>
       </div></a>`
    }
    return c;
}
function createComplexOperations() {
    var c="";
    for (var i = 0; i < STASpecialQueriesArray.length; i++) {
        c += ` <a href="https://www.tapis.grumets.cat/documentation/complexqueries.htm#${STASpecialQueriesArray[i]}" class="toolBox_a"><div style="" class="toolBox">
       <img src="../${STASpecialQueriesArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STASpecialQueries[STASpecialQueriesArray[i]].description}</div>
       </div>`
    }
    return c;
}
function createTableOperations() {
    var c="";
    for (var i = 0; i < TableOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/tableoperations.htm#${TableOperationsArray[i]}" class="toolBox_a"><div style="" class="toolBox">
       <img src="../${TableOperationsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${TableOperations[TableOperationsArray[i]].description}</div>
       </div></a>`
    }
    return c;
}
function createStatisticsVisualize() {
    var c="";
    for (var i = 0; i < tableStatisticsVisualizeArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/statisticsvisualize.htm#${tableStatisticsVisualizeArray[i]}" class="toolBox_a"><div style="" class="toolBox">
       <img src="../${tableStatisticsVisualizeArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${tableStatisticsVisualize[tableStatisticsVisualizeArray[i]].description}</div>
       </div></a>`
    }
    return c;
}
function createDataQuality() {
    var c="";
    for (var i = 0; i < dataQualityArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/dataquality.htm#${dataQualityArray[i]}" class="toolBox_a"><div style="" class="toolBox">
       <img src="../${dataQualityArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${dataQuality[dataQualityArray[i]].description}</div>
       </div></a>`
    }
    return c;
}
function createNodeOperations() {
    var c="";
    //connectTwoNodes
    c += `<a href="https://www.tapis.grumets.cat/documentation/nodeoperations.htm#connect" class="toolBox_a"><div style="" class="toolBox"><img src="../connect.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Connect two nodes</div></div></a>`
    //Remove
    c += `<a href="https://www.tapis.grumets.cat/documentation/nodeoperations.htm#remove" class="toolBox_a"><div style="" class="toolBox"><img src="../remove.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Remove</div></div></a>`
    //Rename
    c += `<a href="https://www.tapis.grumets.cat/documentation/nodeoperations.htm#rename" class="toolBox_a"><div style="" class="toolBox"><img src="../rename.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Rename</div></div></a>`

    return c;
}
function createNavBarButtonsToolBox() {
    var c="";
    //Refresh
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#reload" class="toolBox_a"><div style="" class="toolBox"><img src="../reload.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Refresh</div></div></a>`
    //Open
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#openNetwork" class="toolBox_a"><div style="" class="toolBox"><img src="../OpenNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Open</div></div> </a>`
    //Oper Url
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#openURLNetwork" class="toolBox_a"><div style="" class="toolBox"><img src="../OpenURLNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Oper Url</div></div></a>`
    //Save as...
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#saveNetwork" class="toolBox_a"><div style="" class="toolBox"><img src="../SaveNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Save as...</div></div></a>`
    //Login
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#login" class="toolBox_a"><div style="" class="toolBox"><img src="../login.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Login</div></div></a>`
    //Configuration
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#config" class="toolBox_a"><div style="" class="toolBox"><img src="../config.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Configuration</div></div></a>`
    //Help
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#help" class="toolBox_a"><div style="" class="toolBox"><img src="../help.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Help</div></div></a>`
    //Documentation
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#documentation" class="toolBox_a"><div style="" class="toolBox"><img src="../Documentation.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Documentation</div></div></a>`

    return c
}



function openTapisPage() {
    window.open("https://www.tapis.grumets.cat/", "Tapis");
}
function openToolPage(place) {
    document.getElementById("toolPage_header_" + place).innerHTML = headerNavBar;
    createNavBar();
    switch (place){
        case "inputTools":
        document.getElementById("container_servicesAndApis_inToolPage").innerHTML= createInputTools()
        break;
    }
}
function createNavBar() {
    var c="";
    //Services And Apis
    c = `<div class="dropdown"><div>Input tools</div><div class="dropdown-content">`
    for (var i = 0; i < ServicesAndAPIsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/inputtools.htm#${ServicesAndAPIsArray[i]}">${ServicesAndAPIs[ServicesAndAPIsArray[i]].description}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_servicesAndApis").innerHTML = c;
    //container_STAEntities
    c = `<div class="dropdown blue"><div>STA entities reading</div><div class="dropdown-content">`
    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/staentities.htm#${STAEntitiesArray[i]}">${STAEntitiesArray[i]}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STAEntities").innerHTML = c;
    //container_STAEntities singular
    c = `<div class="dropdown blue"><div>STA entities create...</div><div class="dropdown-content">`
    for (var i = 0; i < STAEntitiesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/staentitiesSingular.htm#${STAEntities[STAEntitiesArray[i]].singular}">${STAEntities[STAEntitiesArray[i]].singular}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STAEntities_singular").innerHTML = c;
    //STA operations 
    c = `<div class="dropdown blue"><div>STA tools </div><div class="dropdown-content">`
    for (var i = 0; i < STAOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/staoperations.htm#${STAOperationsArray[i]}">${STAOperations[STAOperationsArray[i]].description}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STAOperations").innerHTML = c;
    //ComplexQuerys
    c = `<div class="dropdown blue"><div>Complex queries</div><div class="dropdown-content">`
    for (var i = 0; i < STASpecialQueriesArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/complexqueries.htm#${STASpecialQueriesArray[i]}">${STASpecialQueries[STASpecialQueriesArray[i]].description}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_STASpecialQueries").innerHTML = c;
    //TableOperations
    c = `<div class="dropdown"><div>Table tools</div><div class="dropdown-content">`
    for (var i = 0; i < TableOperationsArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/tableoperations.htm#${TableOperationsArray[i]}">${TableOperations[TableOperationsArray[i]].description}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_TableOperations").innerHTML = c;
    //Table Statistics visualize
    c = `<div class="dropdown"><div>Statistics and visualization</div><div class="dropdown-content">`
    for (var i = 0; i < tableStatisticsVisualizeArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/statisticsvisualize.htm#${tableStatisticsVisualizeArray[i]}">${tableStatisticsVisualize[tableStatisticsVisualizeArray[i]].description}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_tableStatisticsVisualize").innerHTML = c;
    //Data quality
    c = `<div class="dropdown"><div>Data quality</div><div class="dropdown-content">`
    for (var i = 0; i < dataQualityArray.length; i++) {
        c += `<a href="https://www.tapis.grumets.cat/documentation/dataquality.htm#${dataQualityArray[i]}">${dataQuality[dataQualityArray[i]].description}</a>`
    }
    c += `</div></div></div>`
    document.getElementById("navBar_dataQuality").innerHTML = c;

    //node operations
    c = `<div class="dropdown"><div>Node operations</div><div class="dropdown-content">`
    //connectTwoNodes
    c += `<a href="https://www.tapis.grumets.cat/documentation/nodeoperations.htm#connect">Connect two nodes</a>`
    //Remove
    c += `<a href="https://www.tapis.grumets.cat/documentation/nodeoperations.htm#remove">Remove</a>`
    //Rename
    c += `<a href="https://www.tapis.grumets.cat/documentation/nodeoperations.htm#rename">Rename</a>`
    c += `</div></div></div>`
    document.getElementById("navBar_nodeOperations").innerHTML = c;
    //NavBar buttons
    c = `<div class="dropdown"><div>NavBar buttons</div><div class="dropdown-content">`
    //Refresh
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#reload">Refresh</a>`
    //Open
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#openNetwork">Open</a>`
    //Oper Url
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#openURLNetwork">Open URL</a>`
    //Save as...
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#saveNetwork">Save as...</a>`
    //Login
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#login">Login</a>`
    //Configuration
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#config">Configuration</a>`
    //Help
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#help">Help</a>`
    //Documentation
    c += `<a href="https://www.tapis.grumets.cat/documentation/navbarbuttons.htm#documentation">documentation</a>`
    c += `</div></div></div>`
    document.getElementById("navBar_navBarButtons").innerHTML = c;
}

