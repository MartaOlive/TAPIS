//You need statistics.js (Som functions needed are described there)


function calculateDataQualityCompletnessOmission(data, attribute) {
    var dataQuality;
    var count = 0;

    for (var i = 0; i < data.length; i++) {
        if (data[i][attribute] == null || data[i][attribute] == undefined || data[i][attribute] == "") count++
    }

    if (count != 0) dataQuality = (count / data.length) * 100;
    else dataQuality = count;


    return [data.length, data.length - count, count, dataQuality.toFixed(2), 100 - dataQuality.toFixed(2)];//Total, true, false, %omission, %completesa
}

function addValidityFlagDataQualityCompletnessOmission(data, attribute) {
    for (var i = 0; i < data.length; i++) {
        if (data[i][attribute] == null || data[i][attribute] == undefined || data[i][attribute] == "") data[i]["Omission Flag"] = "False"
        else data[i]["Omission Flag"] = "True"
    }
    return data
}

function dataFilteredDataQualityCompletnessOmission(data, attribute) {
    var newData = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i][attribute] != null && data[i][attribute] != undefined && data[i][attribute] != "") newData.push(data[i])
    }
    return newData;
}

function calculateDataQualityLogicalConsistency(dataTarget, dataReference, targets, references, calculate, flag, filter) {
    var count = 0;

    //Create an array with all possibilities (without repetitions)
    var referenceArrays = [], temporalArray;
    for (var i = 0; i < dataReference.length; i++) {
        temporalArray = [];
        for (var r = 0; r < references.length; r++) {
            temporalArray.push(dataReference[i][references[r]]);
        }
        if (!referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i]))) referenceArrays.push(temporalArray);
    }

    //check if every combination asked exist in referenceData
    var count = 0, itExist, newData = [];
    for (var a = 0; a < dataTarget.length; a++) {
        temporalArray = [];
        for (var r = 0; r < targets.length; r++) {
            temporalArray.push(dataTarget[a][targets[r]]);
        }
        itExist = (referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i])))
        if (itExist) count++;
        if (flag) dataTarget[a]["logicalConsistenci"] = itExist;
        if (filter && itExist) newData.push(dataTarget[a]);
    }
    if (!calculate) return [newData, count];
    else {
        return [newData, count, (count / dataTarget.length) * 100];
    }

}

function calculateDataQualityTemporalValidity(data, attributeSelected, from, to, calculate, flag, filter) {
   var attributes=   getDataAttributes(data); //Està a tapis.js 
    if(attributes[attributeSelected].type!="isodatetime")return false;
    var count = 0;
    var newData = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i][attributeSelected] < from || data[i][attributeSelected] > to) {

            if (flag) data[i]["temporalValidity"] = false;
        } else if (flag) {
            data[i]["temporalValidity"] = true;
            count++;
            if (filter) newData.push(data[i]);
        }
    }
    if (!filter) newData = data;
    return ([newData, count, (count / data.length) * 100])

}
function calculateDataQualityTemporalResolution(data, attributeSelected, resolutionRadioValue, calculate, flag, filter) {
    var attributes=   getDataAttributes(data); //Està a tapis.js 
    if(attributes[attributeSelected].type!="isodatetime")return false;
    var regex, count = 0, newData = [];
    for (var i = 0; i < data.length; i++) {

        switch (resolutionRadioValue) {
            case "year":
                regex = /^\d{4}(-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2})?)?)?)?)?/;
                break;

            case "month":
                regex = /^\d{4}-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2})?)?)?)?/;
                break;

            case "day":
                regex = /^\d{4}-\d{2}-\d{2}(T\d{2}(:\d{2}(:\d{2})?)?)?/;
                break;

            case "hour":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}(:\d{2}(:\d{2})?)?/;
                break;

            case "minute":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/;
                break;

            case "second":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
                break;

            case "fraction":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/;
                break;

            default:
                return false;
        }
        if (regex.test(data[i][attributeSelected])) {
            count++;
            if (flag) {
                data[i]["temporalResolution"] = true;
                if (filter) newData.push(data[i]);
            }
        } else {
            if (flag) data[i]["temporalResolution"] = false;
        }
    }
    if (!filter) newData = data;
    return ([newData, count, (count / data.length) * 100])
}

function calculateDataQualityTemporalConsistency(data, attributeSelected, number, consistencyRadioValue, consistencyRadioMethod, tolerance, calculate, flag, filter) {
    var attributes=   getDataAttributes(data); //Està a tapis.js 
    if(attributes[attributeSelected].type!="isodatetime")return false;

    var currentDate, previousDate;
    var dateFrom, validRange;
    number = parseInt(number);
    newData = [];
    var datesGlobal = [], count = 0;

    if (consistencyRadioMethod == "global") { //GLOBAL
        for (var i = 0; i < data.length; i++) { //Creating global intervals
            if (i == 0) {
                dateFrom = new Date(data[0][attributeSelected]);
                datesGlobal.push([dateFrom, dateFrom]);
            }
            else dateFrom = new Date(dateFrom);
            switch (consistencyRadioValue) {
                case "years":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 24 * 30.44 * 12 * 1000);
                    break;
                case "months":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 24 * 30.44 * 1000);
                    break;
                case "days":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 24 * 1000);
                    break;
                case "hours":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 60 * 1000);
                    break;
                case "minutes":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 60 * 1000);
                    break;

                case "seconds":
                    validRange = returnValidRange(dateFrom, number, tolerance, consistencyRadioValue)
                    datesGlobal.push([validRange[0], validRange[1]]);
                    dateFrom = new Date(dateFrom.getTime() + number * 1000);

                    break;
                default:
                    return false;
            }
        }

        for (var i = 0; i < data.length; i++) {
            currentDate = new Date(data[i][attributeSelected]);
            if (currentDate >= datesGlobal[i][0] && currentDate <= datesGlobal[i][1]) { //Valid
                count++;
                data[i]["temporalConsistency"] = true;
                if (filter) newData.push(data[i])

            } else { //OutOfRange
                if (flag) data[i]["temporalConsistency"] = false;

            }
        }

    } else { //compared with previous record

        for (var i = 0; i < data.length; i++) {
            if (i == 0) {
                previousDate = new Date(data[i][attributeSelected]);
                count++;
                data[i]["temporalConsistency"] = true;
                if (filter) newData.push(data[i])
            }
            else {
                currentDate = new Date(data[i][attributeSelected]);
                validRange = returnValidRange(previousDate, number, tolerance, consistencyRadioValue);
                if (currentDate >= validRange[0] && currentDate <= validRange[1]) {//valid
                    count++;
                    data[i]["temporalConsistency"] = true;
                    if (filter) newData.push(data[i]);
                } else { //OutOfRange
                    if (flag) data[i]["temporalConsistency"] = false;
                }
                previousDate = new Date(data[i][attributeSelected]);
            }

        }
    }
    if (!filter) newData = data;
    return [newData, count,(count / data.length) * 100 ]
}

function returnValidRange(currentData, number, tolerance, consistencyRadioValue) {
    var start, end, DatePlusNumber, toleranceMSeconds;
    switch (consistencyRadioValue) {
        case "years":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 24 * 30.44 * 12 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 24 * 30.44 * 12 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);

            break;
        case "months":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 24 * 30.44 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 24 * 30.44 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);

            break;
        case "days":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 24 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 24 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);
            break;
        case "hours":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 60 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 60 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);

            break;
        case "minutes":
            DatePlusNumber = new Date(currentData.getTime() + number * 60 * 1000);
            toleranceMSeconds = number * tolerance / 100 * 60 * 1000
            start = new Date(DatePlusNumber.getTime() - toleranceMSeconds);
            end = new Date(DatePlusNumber.getTime() + toleranceMSeconds);
            break;

        case "seconds":
            start = new Date(currentData.getTime() + (number - number * tolerance / 100) * 1000);
            end = new Date(currentData.getTime() + (number + number * tolerance / 100) * 1000);
            break;
        default:
            return false;
    }

    return [start, end]
}
