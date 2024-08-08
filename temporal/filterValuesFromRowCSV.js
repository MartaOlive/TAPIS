function filterValuesFromRowCSV(STAdata, tableResults) {
    console.log("STAdata: " + STAdata);
    console.log(tableResults);
    //agrupar els or
    var arrayOfOr = [];
    var generalArray = [];

    for (var i = 0; i < tableResults.length; i += 5) {
        if ((i - 5) > 0) {
            if (tableResults[i - 5] == "or" & tableResults[i] != "or") { //si l'anterior era or i el present ja no, es reinicia
                arrayOfOr = [];
            }
        }
        if (tableResults[i + 5] != null & tableResults[i + 5] == "or") { //posar el present
            arrayOfOr.push(tableResults[i]);
            arrayOfOr.push(tableResults[i + 1]);
            arrayOfOr.push(tableResults[i + 2]);
            if (tableResults[i + 4] == "number") {
                if (Array.isArray(tableResults[i + 3])) {
                    arrayOfOr.push([parseInt(tableResults[i + 3][0]), parseInt(tableResults[i + 3][1])]);
                } else {
                    arrayOfOr.push(parseInt(tableResults[i + 3]));
                }
            } else {
                arrayOfOr.push(tableResults[i + 3]);
            }
            arrayOfOr.push(tableResults[i + 4]);

        } else if ((tableResults[i] == "or" & (tableResults[i + 5]) != "or")) { //si el següent es un or es copiarà en el if anterior. Si no hi ha cap més, es copia el present
            arrayOfOr.push(tableResults[i]);
            arrayOfOr.push(tableResults[i + 1]);
            arrayOfOr.push(tableResults[i + 2]);
            if (tableResults[i + 4] == "number") {
                if (Array.isArray(tableResults[i + 3])) {
                    arrayOfOr.push([parseInt(tableResults[i + 3][0]), parseInt(tableResults[i + 3][1])]);
                } else {
                    arrayOfOr.push(parseInt(tableResults[i + 3]));
                }
            }
            else {
                arrayOfOr.push(tableResults[i + 3]);
            }
            arrayOfOr.push(tableResults[i + 4]);
            generalArray.push(arrayOfOr);
        }
        else {
            var interval = [];
            generalArray.push(tableResults[i]);
            generalArray.push(tableResults[i + 1]);
            generalArray.push(tableResults[i + 2]);
            if (tableResults[i + 4] == "number") {
                if (Array.isArray(tableResults[i + 3])) {
                    generalArray.push([parseInt(tableResults[i + 3][0]), parseInt(tableResults[i + 3][1])]);
                } else {
                    generalArray.push(parseInt(tableResults[i + 3]));
                }
            } else {
                generalArray.push(tableResults[i + 3]);
            }
            generalArray.push(tableResults[i + 4]);
        }
    }

    // aplicació del filtre
    var resultsFiltered, resultsFiltered2;
    for (var i = 0; i < generalArray.length; i++) { //i+2=condició, i+3 = valor (si no es un array saltarà 5 is)
        if (i == 0) {
            resultsFiltered2 = STAdata;
        } else {
            resultsFiltered2 = resultsFiltered;
        }
        if (Array.isArray(generalArray[i]) == false) {
            //filter
            if (i == 0 || generalArray[i] == "and") {
                switch (generalArray[i + 2]) {
                    case ' = ':
                        resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i + 1]] == generalArray[i + 3]);
                        console.log(resultsFiltered);
                        break;
                    case ' &ne; ':
                        resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i + 1]] != generalArray[i + 3]);
                        console.log(resultsFiltered);

                        break;
                    case ' &ge; ':
                        resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i + 1]] >= generalArray[i + 3]);
                        console.log(resultsFiltered);

                        break;
                    case ' > ':
                        resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i + 1]] > generalArray[i + 3]);
                        console.log(resultsFiltered);
                        break;
                    case ' &le; ':
                        resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i + 1]] <= generalArray[i + 3]);
                        console.log(resultsFiltered);
                        break;
                    case ' < ':
                        resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i + 1]] < generalArray[i + 3]);
                        console.log(resultsFiltered);
                        break;
                    case ' [a,b] ':
                        var interval;
                        interval = resultsFiltered2.filter(element => element[generalArray[i + 1]] >= generalArray[i + 3][0]);
                        resultsFiltered = interval.filter(element => element[generalArray[i + 1]] <= generalArray[i + 3][1]);
                        console.log(resultsFiltered);

                        break;
                    case ' (a,b] ':
                        var interval;
                        interval = resultsFiltered2.filter(element => element[generalArray[i + 1]] > generalArray[i + 3][0]);
                        resultsFiltered = interval.filter(element => element[generalArray[i + 1]] <= generalArray[i + 3][1]);
                        console.log(resultsFiltered);
                        break;
                    case ' [a,b) ':
                        var interval;
                        interval = resultsFiltered2.filter(element => element[generalArray[i + 1]] >= generalArray[i + 3][0]);
                        resultsFiltered = interval.filter(element => element[generalArray[i + 1]] < generalArray[i + 3][1]);
                        console.log(resultsFiltered);
                        break;
                    case ' (a,b) ':
                        var interval;
                        interval = resultsFiltered2.filter(element => element[generalArray[i + 1]] > generalArray[i + 3][0]);
                        resultsFiltered = interval.filter(element => element[generalArray[i + 1]] < generalArray[i + 3][1]);
                        console.log(resultsFiltered);
                        break;
                    case 'contains':
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        console.log(resultsFiltered2);
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (textInData.includes(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }

                        console.log(resultsFiltered);
                        break;
                    case 'no contains':
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (!textInData.includes(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }

                        console.log(resultsFiltered);
                        break;
                    case 'starts with':
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (textInData.startsWith(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }
                        console.log(resultsFiltered);

                        break;
                    case 'ends with':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (textInData.endsWith(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }
                        console.log(resultsFiltered);
                        break;
                    case 'year':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'month':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'day':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'hour':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'minute':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'date':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'time':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                }
            }
            else if (generalArray[i] == "not") {
                switch (generalArray[i + 2]) {
                    case ' = ':
                        resultsFiltered = resultsFiltered2.filter(element => (element[generalArray[i + 1]] != generalArray[i + 3]));
                        console.log(resultsFiltered);
                        break;
                    case ' &ne; ':
                        resultsFiltered = resultsFiltered2.filter(element => (element[generalArray[i + 1]] == generalArray[i + 3]));
                        console.log(resultsFiltered);

                        break;
                    case ' &ge; ':
                        resultsFiltered = resultsFiltered2.filter(element => (element[generalArray[i + 1]] < generalArray[i + 3]));
                        console.log(resultsFiltered);

                        break;
                    case ' > ':
                        resultsFiltered = resultsFiltered2.filter(element => (element[generalArray[i + 1]] <= generalArray[i + 3]));
                        console.log(resultsFiltered);
                        break;
                    case ' &le; ':
                        resultsFiltered = resultsFiltered2.filter(element => (element[generalArray[i + 1]] > generalArray[i + 3]));
                        console.log(resultsFiltered);
                        break;
                    case ' < ':
                        resultsFiltered = resultsFiltered2.filter(element => (element[generalArray[i + 1]] >= generalArray[i + 3]));
                        console.log(resultsFiltered);
                        break;
                    case ' [a,b] ':
                        var interval;
                        interval = resultsFiltered2.filter(element => (element[generalArray[i + 1]] < generalArray[i + 3][0]));
                        resultsFiltered = interval.filter(element => (element[generalArray[i + 1]] > generalArray[i + 3][1]));
                        console.log(resultsFiltered);

                        break;
                    case ' (a,b] ':
                        var interval;
                        interval = resultsFiltered2.filter(element => (element[generalArray[i + 1]] <= generalArray[i + 3][0]));
                        resultsFiltered = interval.filter(element => (element[generalArray[i + 1]] > generalArray[i + 3][1]));
                        console.log(resultsFiltered);
                        break;
                    case ' [a,b) ':
                        var interval;
                        interval = resultsFiltered2.filter(element => (element[generalArray[i + 1]] < generalArray[i + 3][0]));
                        resultsFiltered = interval.filter(element => (element[generalArray[i + 1]] >= generalArray[i + 3][1]));
                        console.log(resultsFiltered);
                        break;
                    case ' (a,b) ':
                        var interval;
                        interval = resultsFiltered2.filter(element => (element[generalArray[i + 1]] <= generalArray[i + 3][0]));
                        resultsFiltered = interval.filter(element => (element[generalArray[i + 1]] >= generalArray[i + 3][1]));
                        console.log(resultsFiltered);
                        break;
                    case 'contains':
                        console.log("contains")
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        console.log(resultsFiltered2);
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (!textInData.includes(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }

                        console.log(resultsFiltered);
                        break;
                    case 'no contains':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (textInData.includes(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }

                        console.log(resultsFiltered);
                        break;
                    case 'starts with':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (!textInData.startsWith(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }
                        console.log(resultsFiltered);
                        break;
                    case 'ends with':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        var textToCompare = generalArray[i + 3].toLowerCase();
                        var textInData;
                        resultsFiltered = [];
                        for (var e = 0; e < resultsFiltered2.length; e++) {
                            textInData = resultsFiltered2[e][generalArray[i + 1]].toLowerCase();
                            // console.log(textToCompare+" : "+textInData);

                            if (!textInData.endsWith(textToCompare)) {
                                resultsFiltered.push(resultsFiltered2[e]);
                            }
                        }
                        console.log(resultsFiltered);
                        break;
                    case 'year':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'month':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'day':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'hour':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'minute':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'date':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                    case 'time':
                        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                        break;
                }
            }
            i += 4;
        } else { //array dels ors (múltiple de 5). SI hi ha Or sempre hi haurà array
            //filter

            if (generalArray[i][0] == "nothing" || generalArray[i][0] == "and") {
                var temporalArray = [];
                var finalArray;
                console.log(generalArray[i]);
                for (var a = 0; a < generalArray[i].length; a += 5) { //for amb and
                    switch (generalArray[i][a + 2]) {
                        case ' = ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] == generalArray[i][a + 3]);
                            console.log(resultsFiltered)
                            break;
                        case ' &ne; ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] != generalArray[i][a + 3]);


                            break;
                        case ' &ge; ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] >= generalArray[i][a + 3]);


                            break;
                        case ' > ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] > generalArray[i][a + 3]);

                            break;
                        case ' &le; ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] <= generalArray[i][a + 3]);

                            break;
                        case ' < ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] < generalArray[i][a + 3]);

                            break;
                        case ' [a,b] ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] >= generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] <= generalArray[i][a + 3][1]);


                            break;
                        case ' (a,b] ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] > generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] <= generalArray[i][a + 3][1]);

                            break;
                        case ' [a,b) ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] >= generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] < generalArray[i][a + 3][1]);

                            break;
                        case ' (a,b) ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] > generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] < generalArray[i][a + 3][1]);

                            break;
                        case 'contains':
                            var textToCompare = generalArray[i][a + 3].toLowerCase();
                            var textInData;
                            resultsFiltered = [];
                            console.log(resultsFiltered2);
                            for (var e = 0; e < resultsFiltered2.length; e++) {
                                textInData = resultsFiltered2[e][generalArray[i][a + 1]].toLowerCase();
                                // console.log(textToCompare+" : "+textInData);

                                if (textInData.includes(textToCompare)) {
                                    resultsFiltered.push(resultsFiltered2[e]);
                                }
                            }


                            break;
                        case 'no contains':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            var textToCompare = generalArray[i][a + 3].toLowerCase();
                            var textInData;
                            resultsFiltered = [];
                            console.log(resultsFiltered2);
                            for (var e = 0; e < resultsFiltered2.length; e++) {
                                textInData = resultsFiltered2[e][generalArray[i][a + 1]].toLowerCase();
                                // console.log(textToCompare+" : "+textInData);

                                if (!textInData.includes(textToCompare)) {
                                    resultsFiltered.push(resultsFiltered2[e]);
                                }
                            }


                            break;
                        case 'starts with':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'ends with':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'year':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'month':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'day':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'hour':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'minute':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'date':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'time':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                    }

                    temporalArray.push(...resultsFiltered);
                }

                //eliminar repetits: 
                var arrayWithoutDuplicates = [];
                for (var e = 0; e < temporalArray.length; e++) {
                    console.log(temporalArray[e]["@iot.id"]);

                    if (!arrayWithoutDuplicates.find(object => object["@iot.id"] == temporalArray[e]["@iot.id"])) {
                        arrayWithoutDuplicates.push(temporalArray[e]);
                    } else {
                        // console.log("duplicat")
                    }
                }
                resultsFiltered = arrayWithoutDuplicates //actualitzem resultsFiltered sense repetits
                console.log(resultsFiltered);
            }
            else if (generalArray[i][0] == "not") { //no els dos de l'array
                var temporalArray = [];
                var finalArray;
                console.log(generalArray[i]);
                for (var a = 0; a < generalArray[i].length; a += 5) { //for amb and
                    switch (generalArray[i][a + 2]) {
                        case ' = ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] != generalArray[i][a + 3]);
                            console.log(resultsFiltered)
                            break;
                        case ' &ne; ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] == generalArray[i][a + 3]);


                            break;
                        case ' &ge; ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] < generalArray[i][a + 3]);


                            break;
                        case ' > ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] <= generalArray[i][a + 3]);

                            break;
                        case ' &le; ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] > generalArray[i][a + 3]);

                            break;
                        case ' < ':
                            resultsFiltered = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] >= generalArray[i][a + 3]);

                            break;
                        case ' [a,b] ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] < generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] > generalArray[i][a + 3][1]);


                            break;
                        case ' (a,b] ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] <= generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] > generalArray[i][a + 3][1]);

                            break;
                        case ' [a,b) ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] < generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] >= generalArray[i][a + 3][1]);

                            break;
                        case ' (a,b) ':
                            var interval;
                            interval = resultsFiltered2.filter(element => element[generalArray[i][a + 1]] <= generalArray[i][a + 3][0]);
                            resultsFiltered = interval.filter(element => element[generalArray[i][a + 1]] >= generalArray[i][a + 3][1]);

                            break;
                        case 'contains':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'no contains':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'starts with':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'ends with':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'year':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'month':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'day':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'hour':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'minute':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'date':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                        case 'time':
                            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
                            break;
                    }
                    temporalArray.push(...resultsFiltered);
                }

                //Quyedar-se amb els duplicats
                var arrayWithDuplicates = temporalArray.filter((elemento, index) => {
                    return temporalArray.indexOf(elemento) != index;
                })
                resultsFiltered = arrayWithDuplicates //actualitzem resultsFiltered sense repetits
                console.log(resultsFiltered);
            }
        }
    }
    return resultsFiltered;
}


