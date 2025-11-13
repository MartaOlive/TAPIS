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