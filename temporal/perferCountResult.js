function prepareRefreshCountResults(event) {
    event.preventDefault(); // We don't want to submit this form
    document.getElementById("DialogCountResults").close();

    var node = networkNodes.get(startingNodeContextId);
    if (!node)
        return;
    startingNodeContextId = null;
    if (node.STAtimeOut) {
        clearTimeout(node.STAtimeOut);
        node.STAtimeOut = null;
    }
    node.STAredrawPeriod = document.getElementById("DialogCountResultsRefreshPeriod").value;
    networkNodes.update(currentNode);

    requestLastObservationAndRefreshountResults(node, node.STAredrawPeriod);
}
async function repequestLastObservationAndRefreshountResults(currentNode, period) {
    var parentNode = GetFirstParentNode(currentNode);
    if (!parentNode)
        return;
    currentNode.STAURL = AddQueryParamsToURL(parentNode.STAURL, "?$count=true&$top=0");
    currentNode.STAExpectedLength = 1;
    networkNodes.update(currentNode);
    showInfoMessage("Getting number of results");
    var numberOfResults = await loadAPIDataWithReturn(currentNode);

    //Redraw the label
    currentNode.label += " (" + numberOfResults + ")";

    //Redraw
    showInfoMessage(currentNode.label + ". Waiting " + period + " seconds ...");
    currentNode.STAtimeOut = setTimeout(requestLastObservationAndRefreshountResults, period * 1000, currentNode, period);
    networkNodes.update(currentNode);
}

function stopRefreshOneValue(event) {
    event.preventDefault(); // We don't want to submit this form
    document.getElementById("DialogCountResults").close();

    var node = networkNodes.get(startingNodeContextId);
    if (!node)
        return;
    if (node.STAtimeOut) {
        clearTimeout(node.STAtimeOut);
        showInfoMessage("Refresh cancelled.");
    }
}
function closeDialogCountResults(event) {
    event.preventDefault(); // We don't want to submit this form
    document.getElementById("DialogCountResults").close();
}