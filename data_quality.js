//You need statistics.js (Som functions needed are described there)


function calculateDataQualityCompletnessOmission(data, attribute){
    var dataQuality;
    var count=0;

    for (var i=0; i< data.length;i++){
        if (data[i][attribute]== null || data[i][attribute]== undefined || data[i][attribute]=="" ) count ++
    }

    if (count !=0) dataQuality= (count/data.length)*100;
    else dataQuality=count;


    return [data.length, data.length - count, count, dataQuality.toFixed(2), 100-dataQuality.toFixed(2) ];//Total, true, false, %omission, %completesa
}

function addValidityFlagDataQualityCompletnessOmission(data, attribute){
     for (var i=0; i< data.length;i++){
        if (data[i][attribute]== null || data[i][attribute]== undefined || data[i][attribute]=="" ) data[i]["Omission Flag"]= "False"
        else data[i]["Omission Flag"]= "True"
    }
    return data
}

function dataFilteredDataQualityCompletnessOmission(data, attribute){
    var newData=[];
    for (var i=0; i< data.length;i++){
        if (data[i][attribute]!= null && data[i][attribute]!= undefined && data[i][attribute]!="" ) newData.push(data[i])
    }
    return newData;
}

function calculateDataQualityLogicalConsistency(dataTarget, dataReference, targets, references, calculate, flag, filter){
    var count=0;

    //Create an array with all possibilities (without repetitions)
    var referenceArrays=[], temporalArray;
    for(var i=0;i<dataReference.length;i++){
        temporalArray=[];
        for (var r=0;r<references.length;r++){
            temporalArray.push(dataReference[i][references[r]]);
        }
        if(!referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i]))) referenceArrays.push(temporalArray);
    }

    //check if every combination asked exist in referenceData
    var count=0, itExist, newData=[];
    for(var a=0;a<dataTarget.length;a++){
        temporalArray=[];
        for (var r=0;r<targets.length;r++){
            temporalArray.push(dataTarget[a][targets[r]]);
        }
        itExist=(referenceArrays.some(sub => sub.every((num, i) => num === temporalArray[i])))
        if(itExist)count++;
        if(flag)dataTarget[a]["logicalConsistenci"]=itExist;
        if(filter && itExist) newData.push(dataTarget[a]);
    }
    if(!calculate) return [newData,count];
    else{
        return [newData,count, (count/dataTarget.length)*100];
    }

}

function calculateDataQualityTemporalValidity(data, attributeSelected, from, to, calculate, flag, filter){
    //S'ha de comprobar que sigui tipus DATA (Falta)
    var count=0;
    var newData=[];
    for (var i=0;i<data.length;i++){
        if(data[i][attributeSelected]<from ||data[i][attributeSelected]>to){
           
            if(flag)data[i]["temporalValidity"]=false;
        }else if (flag){
            data[i]["temporalValidity"]=true;
             count++;
            if (filter)newData.push(data[i]);
        }
    }
    if (!filter)newData=data;
    return([newData,count,  (count/data.length)*100])

}
function calculateDataQualityTemporalResolution(data, attributeSelected, resolutionRadioValue, calculate, flag, filter){
    //S'ha de comprobar que sigui tipus DATA (Falta)
    var regex, count=0, newData=[];
    for (var i=0;i<data.length;i++){

        switch(resolutionRadioValue) {
            case "year":
                regex = /^\d{4}(-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2}(\.\d{3})?)?)?)?)?)?$/;
                break;

            case "month":
                regex = /^\d{4}-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2}(\.\d{3})?)?)?)?)?$/;
                break;

            case "day":
                regex = /^\d{4}-\d{2}-\d{2}(T\d{2}(:\d{2}(:\d{2}(\.\d{3})?)?)?)?$/;
                break;

            case "hour":
                regex = /^(\d{2}(:\d{2}(:\d{2})?)?|(\d{4}-\d{2}-\d{2}T\d{2}(:\d{2}(:\d{2}(\.\d{3})?)?)?))$/;
                break;

            case "minute":
                regex =/^(\d{2}:\d{2}(:\d{2})?|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?))$/;
                break;

            case "second":
                regex = /^(\d{2}:\d{2}:\d{2}|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?))$/;
                break;

            case "fraction":
                regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/;
                break;

            default:
            return false;
        }
        if( regex.text(data[i][attributeSelected])){
            count++;
            if(flag){
                data[i]["temporalResolution"]=true;
                if(filter)newData.push(data[i]);
            }
        }else{
            if(flag)data[i]["temporalResolution"]=false;
        }
    }
    if (!filter)newData=data;
    return([newData,count,  (count/data.length)*100])
}

function calculateDataQualityTemporalConsistency(data, attributeSelected, number, consistencyRadioValue, consistencyRadioMethod, tolerance,calculate, flag, filter){
    //comprobar que siguin dates (que faig amb els hh:mm?) --> mirar dates senceres i punt

    var intervals=[];
    var previousDateSeconds, previousDate;
    var currentDateSeconds, currentDate;

   // var validValuesRange= [number -(tolerance/100), number +(tolerance/100)]
   var numberOfSeconds;
   var dateFrom, dateTo, tmp1, tmp2, tmp3, DatePlusNumber, toleranceMSeconds;
   number=parseInt(number);

    var datesGlobal=[], dateCurrentMonthYear, daysPerMonthYear, start, end, arrayTwoDates;
    if(consistencyRadioMethod== "global"){
       for(var i=0;i<data.length;i++){
        if(i==0) {
            dateFrom=  new Date(data[0][attributeSelected]);
            datesGlobal.push([dateFrom, dateFrom]);
        }
        else dateFrom= new Date(dateFrom);
            switch(consistencyRadioValue){
                case "years": 
                    DatePlusNumber= new Date(dateFrom.getTime() + number * 60 *60*24*30.44*12* 1000);
                    toleranceMSeconds = number*tolerance / 100 *60*60* 24*30.44* 12*1000
                    start= new Date(DatePlusNumber.getTime() - toleranceMSeconds);
                    end= new Date(DatePlusNumber.getTime() + toleranceMSeconds);
                    datesGlobal.push([start,end]);
                    dateFrom = new Date(dateFrom.getTime() + number *60*60*24*30.44*12*  1000);
                    break;
                case "months": 
                    DatePlusNumber= new Date(dateFrom.getTime() + number * 60 *60*24*30.44* 1000);
                    toleranceMSeconds = number*tolerance / 100 *60*60* 24*30.44* 1000
                    start= new Date(DatePlusNumber.getTime() - toleranceMSeconds);
                    end= new Date(DatePlusNumber.getTime() + toleranceMSeconds);
                    datesGlobal.push([start,end]);
                    dateFrom = new Date(dateFrom.getTime() + number *60*60*24*30.44*  1000);
                    break;
                case "days": 
                    DatePlusNumber= new Date(dateFrom.getTime() + number * 60 *60*24* 1000);
                    toleranceMSeconds = number*tolerance / 100 *60*60* 24* 1000
                    start= new Date(DatePlusNumber.getTime() - toleranceMSeconds);
                    end= new Date(DatePlusNumber.getTime() + toleranceMSeconds);
                    datesGlobal.push([start,end]);
                    dateFrom = new Date(dateFrom.getTime() + number *60*60*24*  1000);
                    break;
                case "hours": 
                    DatePlusNumber= new Date(dateFrom.getTime() + number * 60 *60* 1000);
                    toleranceMSeconds = number*tolerance / 100 *60*60* 1000
                    start= new Date(DatePlusNumber.getTime() - toleranceMSeconds);
                    end= new Date(DatePlusNumber.getTime() + toleranceMSeconds);
                    datesGlobal.push([start,end]);
                    dateFrom = new Date(dateFrom.getTime() + number *60*60* 1000);
                    break;
                case "minutes": 
                    DatePlusNumber= new Date(dateFrom.getTime() + number *60* 1000);
                    toleranceMSeconds = number*tolerance / 100 *60* 1000
                    start= new Date(DatePlusNumber.getTime() - toleranceMSeconds);
                    end= new Date(DatePlusNumber.getTime() + toleranceMSeconds);
                    datesGlobal.push([start,end]);
                    dateFrom = new Date(dateFrom.getTime() + number *60* 1000);
                    break;
                   
                case "seconds": 
                start = new Date(dateFrom.getTime() + (number - number*tolerance / 100) * 1000);
                end   = new Date(dateFrom.getTime() + (number + number*tolerance / 100) * 1000);

                datesGlobal.push([start, end]);

                dateFrom = new Date(dateFrom.getTime() + number * 1000);
                    
                    break;
                default:
                    return false;
            }
        }

    }
    for (var i=1;i<data.length;i++){
           // previousDate=new Date(data[i][attributeSelected]);;
           // previousDateSeconds= currentDate.getTime() / 1000;
        
        currentDate= new Date(data[i][attributeSelected]);
        //currentDateSeconds=currentDate.getTime() / 1000;
       if(consistencyRadioMethod== "global"){
         switch(consistencyRadioValue){
            case "years": 

                break;
            case "months": 
                break;
            case "days": 
                break;
            case "hours": 
                break;
            case "minutes": 
                break;
            case "seconds": 
                if(d.setSeconds(d.getSeconds() + 3.5))
                dateFrom= date
                numberOfSeconds= number
                break;
            default:
                return false;
        }
       }
        switch(consistencyRadioValue){
            case "years": 

                break;
            case "months": 
                break;
            case "days": 
                break;
            case "hours": 
                break;
            case "minutes": 
                break;
            case "seconds": 
                if(d.setSeconds(d.getSeconds() + 3.5))
                dateFrom= date
                numberOfSeconds= number
                break;
            default:
                return false;
        }

        if(i==1){
            previousDate=new Date(data[i][attributeSelected]);;
            previousDateSeconds= currentDate.getTime() / 1000;
        }
        if (isNaN(currentDateSeconds)){
            return false; 
        }else{

        }
    }


   // intervals.sort((a, b) => a - b); //ordenar
   //ordenar la data per la columna seleccionada
   addnewColumnAggr(data, columnName,columnsToEvaluate, aggrFuncMedian, decimalNumber);
    var median= aggrFuncMedian(intervals); //fer mediana
    var validRange =[median*(1-(tolerance/100)),median*(1+(tolerance/100)) ];

    // for(var e=0;e<intervals.length;e++){
    //     if()
    // }

}

function addPortionsToFullDate(DatePlusNumber, number, tolerance, timeUnit){
    var proportion =number*tolerance / 100;
    var timeToAdd, integer, fractional ;
    var rangeToReturn;
    switch (timeUnit){
        case "minutes":
            timeToAdd=proportion *60; //Seconds
            rangeToReturn = [new Date(DatePlusNumber.getTime() - timeToAdd * 1000), new Date(DatePlusNumber.getTime() + timeToAdd * 1000)];
            break;
        case "hours":
            timeToAdd=proportion *60; //minutes
            integer= Math.trunc(timeToAdd); //minute integer
            fractional = (timeToAdd-integer)*60; //seconds




        break;

        default:
            return false;

    }
    return rangeToReturn;

}
