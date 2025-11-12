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