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
function StartDocumentationPage(){
    var c;
    //Services And Apis
    c=`<h2 class="toolBoxParentTitle">Data input tools</h2>`
    for (var i=0;i<ServicesAndAPIsArray.length;i++){
       c+=`<div style="" class="toolBox">
       <img src="../${ServicesAndAPIsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${ServicesAndAPIs[ServicesAndAPIsArray[i]].description}</div>
       </div>`   
    }
    document.getElementById("container_servicesAndApis").innerHTML=c;
    //container_STAEntities
    c=`<h2 class="toolBoxParentTitle">STA entities reading tool</h2>`
    for (var i=0;i<STAEntitiesArray.length;i++){
       c+=`<div style="" class="toolBox entities">
       <img src="../${STAEntitiesArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STAEntitiesArray[i]}</div>
       </div>`   
    }
    document.getElementById("container_STAEntities").innerHTML=c;

     //container_STAEntities singular
     c=`<h2 class="toolBoxParentTitle">STA entities create, edit or delete tool</h2>`
     for (var i=0;i<STAEntitiesArray.length;i++){
        c+=`<div style="" class="toolBox entities">
        <img src="../${STAEntities[STAEntitiesArray[i]].singular}.png" alt="Imatge" style="height:60px">
        <div class="toolBoxText">${STAEntities[STAEntitiesArray[i]].singular}</div>
        </div>`   
     }
     document.getElementById("container_STAEntities_singular").innerHTML=c;
    //STA operations 
    c=`<h2 class="toolBoxParentTitle">STA tools</h2>`
    for (var i=0;i<STAOperationsArray.length;i++){
       c+=`<div style="" class="toolBox">
       <img src="../${STAOperationsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STAOperations[STAOperationsArray[i]].description}</div>
       </div>`   
    }
    document.getElementById("container_STAOperations").innerHTML=c;
        
    //ComplexQuerys
    c=`<h2 class="toolBoxParentTitle">Complex queries</h2>`
    for (var i=0;i<STASpecialQueriesArray.length;i++){
       c+=`<div style="" class="toolBox">
       <img src="../${STASpecialQueriesArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${STASpecialQueries[STASpecialQueriesArray[i]].description}</div>
       </div>`   
    }
    document.getElementById("container_STASpecialQueries").innerHTML=c;

    //TableOperations
    c=`<h2 class="toolBoxParentTitle">Generic table tools</h2>`
    for (var i=0;i<TableOperationsArray.length;i++){
       c+=`<div style="" class="toolBox">
       <img src="../${TableOperationsArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${TableOperations[TableOperationsArray[i]].description}</div>
       </div>`   
    }
    document.getElementById("container_TableOperations").innerHTML=c;
    //Table Statistics visualize
    c=`<h2 class="toolBoxParentTitle">Table tools for statistics and visualization</h2>`
    for (var i=0;i<tableStatisticsVisualizeArray.length;i++){
       c+=`<div style="" class="toolBox">
       <img src="../${tableStatisticsVisualizeArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${tableStatisticsVisualize[tableStatisticsVisualizeArray[i]].description}</div>
       </div>`   
    }
    document.getElementById("container_tableStatisticsVisualize").innerHTML=c;
    //Data quality
    c=`<h2 class="toolBoxParentTitle">Table tools for data quality</h2>`
    for (var i=0;i<dataQualityArray.length;i++){
       c+=`<div style="" class="toolBox">
       <img src="../${dataQualityArray[i]}.png" alt="Imatge" style="height:60px">
       <div class="toolBoxText">${dataQuality[dataQualityArray[i]].description}</div>
       </div>`   
    }
    document.getElementById("container_dataQuality").innerHTML=c;

    //node operations
    c=`<h2 class="toolBoxParentTitle">Node operations</h2>`
        //connectTwoNodes
    c+=`<div style="" class="toolBox"><img src="../connect.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Connect two nodes</div></div>`
            //Remove
    c+=`<div style="" class="toolBox"><img src="../remove.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Remove</div></div>`
            //Rename
    c+=`<div style="" class="toolBox"><img src="../rename.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Rename</div></div>`
    document.getElementById("container_nodeOperations").innerHTML=c;
    
    //NavBar buttons
    c= `<h2 class="toolBoxParentTitle">Navegation bar buttons</h2>`
        //Refresh
    c+=`<div style="" class="toolBox"><img src="../reload.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Refresh</div></div>`
        //Open
    c+=`<div style="" class="toolBox"><img src="../OpenNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Open</div></div>`
        //Oper Url
    c+=`<div style="" class="toolBox"><img src="../OpenURLNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Oper Url</div></div>`
        //Save as...
    c+=`<div style="" class="toolBox"><img src="../SaveNetwork.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Save as...</div></div>`
        //Login
    c+=`<div style="" class="toolBox"><img src="../login.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Login</div></div>`
        //Configuration
    c+=`<div style="" class="toolBox"><img src="../config.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Configuration</div></div>`
        //Help
    c+=`<div style="" class="toolBox"><img src="../help.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Help</div></div>`
        //Documentation
    c+=`<div style="" class="toolBox"><img src="../Documentation.png" alt="Imatge" style="height:45px">
       <div class="toolBoxText">Documentation</div></div>`
    document.getElementById("container_navBar").innerHTML=c;

}