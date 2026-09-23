# -*- coding: utf-8 -*-
"""Apply remaining DonaCadena/DonaCadenaFmt wraps for alert/showInfoMessage."""
import csv
import json
from pathlib import Path

ROOT = Path(r"C:\inetpub\wwwroot\TAPIS")
CSV_PATH = ROOT / "temporal" / "esquemes" / "tapis_i18n_review.csv"


def load_cat():
    rows = list(csv.reader(CSV_PATH.read_text(encoding="cp850").splitlines(), delimiter=";"))
    out = {}
    for r in rows[1:]:
        if len(r) < 6:
            continue
        out[(r[0], r[1])] = {"cat": r[4], "spa": r[5], "eng": r[3]}
    return out


def obj_lit(o):
    return "{cat: %s, spa: %s, eng: %s}" % (
        json.dumps(o["cat"], ensure_ascii=False),
        json.dumps(o["spa"], ensure_ascii=False),
        json.dumps(o["eng"], ensure_ascii=False),
    )


def DC(o):
    return "DonaCadena(%s)" % obj_lit(o)


def DCF(o, *args):
    return "DonaCadenaFmt(%s, %s)" % (obj_lit(o), ", ".join(args))


def main():
    cat = load_cat()

    def g(scope, key):
        o = cat.get((scope, key))
        if not o:
            raise KeyError((scope, key))
        return o

    reps = []  # (path, old, new, note)

    def add(path, old, new, note):
        reps.append((path, old, new, note))

    tapis = ROOT / "tapis.js"
    edc = ROOT / "edc.js"
    gps = ROOT / "gps.js"
    sta = ROOT / "STAfilter.js"

    # --- exact string ---
    o = g("alert", "columnNameAlreadyExists")
    add(
        tapis,
        'alert("Chosen column name already exists, change it to add column to the list ");',
        "alert(%s);" % DC(o),
        "columnNameAlreadyExists",
    )

    o = g("alert", "columnNameAlreadyExistsTpl")
    add(
        tapis,
        "alert(`Chosen column name (${referenceValue}) already exists, change it to add column to the list`)",
        "alert(%s)" % DCF(o, "referenceValue"),
        "columnNameAlreadyExistsTpl-ref",
    )
    add(
        tapis,
        "alert(`Chosen column name (${classifiedValue}) already exists, change it to add column to the list`);",
        "alert(%s);" % DCF(o, "classifiedValue"),
        "columnNameAlreadyExistsTpl-cls",
    )

    # --- query / schema ---
    # Note: existing code ends with .").  (typo: period then paren) — preserve structure
    o = g("alert", "queryUrlKvpNoEquals")
    add(
        tapis,
        '''alert("Format error in query URL '"+location.search+"', Key and value pair (KVP) '"+kvp[i_key]+"' without '='.").''',
        "alert(%s)." % DCF(o, "location.search", "kvp[i_key]"),
        "queryUrlKvpNoEquals",
    )

    o = g("clarification", "errorDownloadingSchema")
    add(
        tapis,
        '''showInfoMessage("Error downloading TAPIS schema \\'"+query["SCHEMA"]+"\\'");''',
        "showInfoMessage(%s);" % DCF(o, 'query["SCHEMA"]'),
        "errorDownloadingSchema",
    )

    o = g("clarification", "errorDownloadingSchemaWithMsg")
    add(
        tapis,
        '''showInfoMessage("Error downloading TAPIS schema \\'"+query["SCHEMA"]+"\\': " + error.message);''',
        "showInfoMessage(%s);" % DCF(o, 'query["SCHEMA"]', "error.message"),
        "errorDownloadingSchemaWithMsg",
    )

    o = g("clarification", "errorOpeningNotInSchema")
    add(
        tapis,
        '''showInfoMessage("Error opening \\'" + query["OPEN"] + "\\'. Not found in the schema");''',
        "showInfoMessage(%s);" % DCF(o, 'query["OPEN"]'),
        "errorOpeningNotInSchema",
    )

    o = g("clarification", "errorRetrieving")
    add(
        tapis,
        '''showInfoMessage("Error retrieving "+metadata['link']['@href']);''',
        "showInfoMessage(%s);" % DCF(o, "metadata['link']['@href']"),
        "errorRetrieving",
    )

    o = g("clarification", "httpResponseCode")
    add(
        tapis,
        '''showInfoMessage("HTTP Response Code: " + response?.status + " reading <small>" + node.STAURL + "</small>: " + response?.statusText);''',
        "showInfoMessage(%s);"
        % DCF(o, "response?.status", '"<small>" + node.STAURL + "</small>"', "response?.statusText"),
        "httpResponseCode",
    )

    # --- parse errors ---
    o = g("clarification", "jsonMessageParseError")
    add(
        tapis,
        '''showInfoMessage("JSON message parse error: " + e + " The file content is:\\n" + reader.result);''',
        "showInfoMessage(%s);" % DCF(o, "e", "reader.result"),
        "jsonMessageParseError",
    )

    o = g("clarification", "csvParseError")
    add(
        tapis,
        '''showInfoMessage("CSV parse error: " + e + " The file content fragment:\\n" + csvText.substring(0, 1000));''',
        "showInfoMessage(%s);" % DCF(o, "e", "csvText.substring(0, 1000)"),
        "csvParseError",
    )

    o = g("clarification", "dbfParseError")
    add(
        tapis,
        '''showInfoMessage("DBF parse error: " + e);''',
        "showInfoMessage(%s);" % DCF(o, "e"),
        "dbfParseError",
    )

    o = g("clarification", "gpkgParseError")
    add(
        tapis,
        '''showInfoMessage("Geopackage parse error: " + e);''',
        "showInfoMessage(%s);" % DCF(o, "e"),
        "gpkgParseError",
    )

    o = g("clarification", "jsonldParseError")
    add(
        tapis,
        '''showInfoMessage("JSONLD parse error: " + e + "\\n File content fragment:\\n" + jsonldText.substring(0, 1000));''',
        "showInfoMessage(%s);" % DCF(o, "e", "jsonldText.substring(0, 1000)"),
        "jsonldParseError-a",
    )
    add(
        tapis,
        '''showInfoMessage("JSONLD parse error: " + result.error + "\\n File content fragment:\\n" + jsonldText.substring(0,1000));''',
        "showInfoMessage(%s);" % DCF(o, "result.error", "jsonldText.substring(0,1000)"),
        "jsonldParseError-b",
    )
    add(
        tapis,
        '''showInfoMessage("JSONLD parse error: " + e + "\\n File content fragment:\\n" + jsonldText.substring(0,1000));''',
        "showInfoMessage(%s);" % DCF(o, "e", "jsonldText.substring(0,1000)"),
        "jsonldParseError-c",
    )

    o = g("clarification", "jsonParseError")
    add(
        tapis,
        '''showInfoMessage("JSON parse error: " + e + "\\n File content fragment:\\n" + jsonText.substring(0, 1000));''',
        "showInfoMessage(%s);" % DCF(o, "e", "jsonText.substring(0, 1000)"),
        "jsonParseError-space",
    )
    add(
        tapis,
        '''showInfoMessage("JSON parse error: " + e + "\\n File content fragment:\\n" + jsonText.substring(0,1000));''',
        "showInfoMessage(%s);" % DCF(o, "e", "jsonText.substring(0,1000)"),
        "jsonParseError-nospace",
    )

    o = g("clarification", "geojsonParseError")
    add(
        tapis,
        '''showInfoMessage("GeoJSON parse error: " + e + " The file content fragment:\\n" + jsonText.substring(0, 1000));''',
        "showInfoMessage(%s);" % DCF(o, "e", "jsonText.substring(0, 1000)"),
        "geojsonParseError",
    )

    o = g("alert", "parseErrorFieldContent")
    add(
        tapis,
        '''showInfoMessage("Parse error: " + e + " The field content is:\\n" + value);''',
        "showInfoMessage(%s);" % DCF(o, "e", "value"),
        "parseErrorFieldContent",
    )

    o = g("clarification", "jsonMessageParseErrorResponse")
    add(
        tapis,
        '''showInfoMessage("JSON message parse error: " + e + " The response was:\\n" + event.data);''',
        "showInfoMessage(%s);" % DCF(o, "e", "event.data"),
        "jsonMessageParseErrorResponse",
    )

    # --- download / request error details ---
    dl = [
        ("errorDownloadingCsvw", "Error downloading CSVW"),
        ("errorDownloadingGeojsonSchema", "Error downloading GeoJSON Schema"),
        ("errorDownloadingCsv", "Error downloading CSV"),
        ("errorDownloadingDbf", "Error downloading DBF"),
        ("errorDownloadingGpkg", "Error downloading GPKG"),
        ("errorDownloadingJsonld", "Error downloading JSONLD"),
        ("errorDownloadingJsonDetail", "Error downloading JSON"),
        ("errorDownloadingGeojson", "Error downloading GeoJSON"),
        ("errorRequestingS3", "Error in requesting S3 Bucket root folder"),
        ("errorRequestingEdc", "Error in requesting EDC catalog"),
        ("errorUploadingObs", "Error uploading Observations to STA"),
        ("errorCreatingEntity", "Error creating entity"),
        ("errorDownloadingSchemaDetail", "Error downloading TAPIS schema"),
    ]
    for key, prefix in dl:
        o = g("clarification", key)
        old = (
            "showInfoMessage('%s. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);"
            % prefix
        )
        add(
            tapis,
            old,
            "showInfoMessage(%s);" % DCF(o, "error.name", "error.message", "error.at", "error.text"),
            key,
        )

    o = g("clarification", "errorDownloadingGpkgUnexpectedType")
    add(
        tapis,
        '''showInfoMessage('Error downloading GPKG. <br>Unexpected media type: ' + value.responseHeaders["Content-type"]);''',
        "showInfoMessage(%s);" % DCF(o, 'value.responseHeaders["Content-type"]'),
        "errorDownloadingGpkgUnexpectedType",
    )

    o = g("clarification", "errorDownloadingGpkgResponse")
    add(
        tapis,
        '''showInfoMessage('Error downloading GPKG. <br>Response: ' + value.text);''',
        "showInfoMessage(%s);" % DCF(o, "value.text"),
        "errorDownloadingGpkgResponse",
    )

    # --- auth ---
    o = g("alert", "signinError")
    add(
        tapis,
        'alert("Signin error: " + e.error.message);',
        "alert(%s);" % DCF(o, "e.error.message"),
        "signinError",
    )
    o = g("alert", "signedOutFrom")
    add(
        tapis,
        'alert("Signed out from"+ " " + "authenix" + ". ");',
        "alert(%s);" % DCF(o, '"authenix"'),
        "signedOutFrom",
    )
    o = g("alert", "signedOutError")
    add(
        tapis,
        'alert("Signed out error: "  + e.error.message);',
        "alert(%s);" % DCF(o, "e.error.message"),
        "signedOutError",
    )

    # --- STA entity CRUD messages ---
    o = g("clarification", "datastreamAvailableSta")
    add(
        tapis,
        '''showInfoMessage("Datastream <a href='" + getUrlToId(url, "Datastreams", datastreamIds[i]) + "' target='_blank'>" + datastreamIds[i] + "</a> available in STA");''',
        "showInfoMessage(%s);"
        % DCF(
            o,
            '''"<a href='" + getUrlToId(url, "Datastreams", datastreamIds[i]) + "' target='_blank'>" + datastreamIds[i] + "</a>"''',
        ),
        "datastreamAvailableSta",
    )

    o = g("clarification", "observationAvailableUnderDs")
    add(
        tapis,
        '''showInfoMessage("Observation <a href='" + getUrlToId(url, "Observations", observationId) + "' target='_blank'>" + observationId + "</a> available in STA under Datastream <a href='" + getUrlToId(url, "Datastreams", datastreamIds[k]) + "' target='_blank'>" + datastreamIds[k] + "</a>");''',
        "showInfoMessage(%s);"
        % DCF(
            o,
            '''"<a href='" + getUrlToId(url, "Observations", observationId) + "' target='_blank'>" + observationId + "</a>"''',
            '''"<a href='" + getUrlToId(url, "Datastreams", datastreamIds[k]) + "' target='_blank'>" + datastreamIds[k] + "</a>"''',
        ),
        "observationAvailableUnderDs",
    )

    o = g("alert", "parentNotMultiDatastream")
    add(
        tapis,
        '''alert("Parent node (" + STAEntities[parentEntityName].singular + ") is not a/an MultiDatastream or is directly related to a/an MultiDatastream");''',
        "alert(%s);" % DCF(o, "STAEntities[parentEntityName].singular"),
        "parentNotMultiDatastream",
    )

    o = g("alert", "cannotFindIotIdInParent")
    add(
        tapis,
        '''alert("Cannot find @iot.id in parent node " + STAEntities[parentEntityName].singular + ". Did you removed in a select?");''',
        "alert(%s);" % DCF(o, "STAEntities[parentEntityName].singular"),
        "cannotFindIotIdInParent",
    )

    o = g("alert", "parentNotEntityOrRelated")
    add(
        tapis,
        '''alert("Parent node ("+STAEntities[parentEntityName].singular+") is not a/an " + STAEntities[entityName].singular + " or is directly related to a/an " +  STAEntities[entityName].singular);''',
        "alert(%s);"
        % DCF(o, "STAEntities[parentEntityName].singular", "STAEntities[entityName].singular"),
        "parentNotEntityOrRelated",
    )

    o = g("alert", "parentSameEntity")
    add(
        tapis,
        '''alert("One parent node is the same as the entity " + STAEntities[entityName].singular + ". This is for update or delete the entity. In this case, only one parent node is allowed.");''',
        "alert(%s);" % DCF(o, "STAEntities[entityName].singular"),
        "parentSameEntity",
    )

    o = g("alert", "parentsDifferentRootUrl")
    add(
        tapis,
        '''alert("Not all parent nodes are from the same root URL: " + getSTAURLRoot(parentNode.STAURL) + ", " + url);''',
        "alert(%s);" % DCF(o, "getSTAURLRoot(parentNode.STAURL)", "url"),
        "parentsDifferentRootUrl",
    )

    o = g("clarification", "creatingEntity")
    add(
        tapis,
        '''showInfoMessage("Creating a/an "+ STAEntities[entityName].singular +"...");''',
        "showInfoMessage(%s);" % DCF(o, "STAEntities[entityName].singular"),
        "creatingEntity-a",
    )
    add(
        tapis,
        '''showInfoMessage("Creating a/an " + STAEntities[entityName].singular + "...");''',
        "showInfoMessage(%s);" % DCF(o, "STAEntities[entityName].singular"),
        "creatingEntity-b",
    )

    o = g("clarification", "availableAt")
    add(
        tapis,
        '''showInfoMessage('Available at: <a href="' + getUrlToId(url, entityName, value) + '" target="_blank">' + value + '</a>');''',
        "showInfoMessage(%s);"
        % DCF(
            o,
            ''''<a href="' + getUrlToId(url, entityName, value) + '" target="_blank">' + value + '</a>' ''',
        ),
        "availableAt",
    )

    o = g("alert", "parentNotDirectlyRelated")
    add(
        tapis,
        '''alert("Parent node (" + STAEntities[parentEntityName].singular + ") is not directly related to a/an " + STAEntities[entityName].singular);''',
        "alert(%s);"
        % DCF(o, "STAEntities[parentEntityName].singular", "STAEntities[entityName].singular"),
        "parentNotDirectlyRelated",
    )

    o = g("alert", "parentQuotedMoreThanOne")
    add(
        tapis,
        '''alert("Parent node '" + STAEntities[parentEntityName].singular + "' has more than a single record. Please select a record first.");''',
        "alert(%s);" % DCF(o, "STAEntities[parentEntityName].singular"),
        "parentQuotedMoreThanOne",
    )

    o = g("clarification", "updatingEntity")
    add(
        tapis,
        '''showInfoMessage("Updating  "+ STAEntities[entityName].singular +" "+id+" ...");''',
        "showInfoMessage(%s);" % DCF(o, "STAEntities[entityName].singular", "id"),
        "updatingEntity",
    )

    o = g("clarification", "errorUpdatingEntity")
    add(
        tapis,
        '''showInfoMessage("Error updating "+STAEntities[entityName].singular +" "+"<a href='"+url+"'target='_blank'>"+id+"</a> updated.");''',
        "showInfoMessage(%s);"
        % DCF(
            o,
            "STAEntities[entityName].singular",
            '''"<a href='"+url+"'target='_blank'>"+id+"</a>"''',
        ),
        "errorUpdatingEntity",
    )

    o = g("clarification", "updatingMultiDatastream")
    add(
        tapis,
        '''showInfoMessage("Updating MultiDatastream " + id + " ...");''',
        "showInfoMessage(%s);" % DCF(o, "id"),
        "updatingMultiDatastream",
    )

    o = g("clarification", "multiDatastreamUpdated")
    add(
        tapis,
        '''showInfoMessage("MultiDatastream <a href='" + url + "'target='_blank'>" + id + "</a> updated.");''',
        "showInfoMessage(%s);"
        % DCF(o, '''"<a href='" + url + "'target='_blank'>" + id + "</a>"'''),
        "multiDatastreamUpdated",
    )

    o = g("clarification", "errorUpdatingMultiDatastream")
    add(
        tapis,
        '''showInfoMessage("Error updating MultiDatastream <a href='" + url + "'target='_blank'>" + id + "</a> updated.");''',
        "showInfoMessage(%s);"
        % DCF(o, '''"<a href='" + url + "'target='_blank'>" + id + "</a>"'''),
        "errorUpdatingMultiDatastream",
    )

    o = g("clarification", "deletingEntity")
    add(
        tapis,
        '''showInfoMessage("Deleting  "+ entityName +" "+id+" ...");''',
        "showInfoMessage(%s);" % DCF(o, "entityName", "id"),
        "deletingEntity",
    )

    # Error deleting has no placeholders in CSV — prepend static translation
    o = g("clarification", "errorDeleting")
    add(
        tapis,
        '''showInfoMessage("Error deleting"+ STAEntities[entityName].singular +" "+id);''',
        "showInfoMessage(%s + STAEntities[entityName].singular + \" \" + id);" % DC(o),
        "errorDeleting",
    )

    o = g("alert", "dggsLevelInvalid")
    add(
        tapis,
        '''alert("Level is not a positive number or it is higher than " + getMaxLevelDGGSHashUber(selectedOptions.DGGSOut) + ". The level 10 will be used instead.");''',
        "alert(%s);" % DCF(o, "getMaxLevelDGGSHashUber(selectedOptions.DGGSOut)"),
        "dggsLevelInvalid",
    )

    o = g("clarification", "errorInWallet")
    add(
        tapis,
        '''showInfoMessage("Error in wallet: " + event.data.message);''',
        "showInfoMessage(%s);" % DCF(o, "event.data.message"),
        "errorInWallet",
    )

    o = g("alert", "formatRequestNotImplemented")
    add(
        tapis,
        '''alert("The format requets from an external source (" + data.type + ") is not implemented yet")''',
        "alert(%s)" % DCF(o, "data.type"),
        "formatRequestNotImplemented",
    )

    o = g("alert", "incompatibleNode")
    add(
        tapis,
        '''alert("Incompatible node. " + errorText + ". It has not been added.");''',
        "alert(%s);" % DCF(o, "errorText"),
        "incompatibleNode",
    )

    o = g("clarification", "requestingToSta")
    add(
        tapis,
        '''showInfoMessage("Requesting " + STAEntitiesArray[IdOfSTAEntity(nodeTo)] + " to STA...");''',
        "showInfoMessage(%s);" % DCF(o, "STAEntitiesArray[IdOfSTAEntity(nodeTo)]"),
        "requestingToSta-entity",
    )
    add(
        tapis,
        '''showInfoMessage("Requesting " + STASpecialQueriesArray[IdOfSTASpecialQueries(nodeTo)] + " to STA...");''',
        "showInfoMessage(%s);" % DCF(o, "STASpecialQueriesArray[IdOfSTASpecialQueries(nodeTo)]"),
        "requestingToSta-special",
    )

    o = g("alert", "attributeAlreadyAddedIn")
    add(
        tapis,
        '''alert("This attribute has already been added in "+place);''',
        "alert(%s);" % DCF(o, "place"),
        "attributeAlreadyAddedIn",
    )

    o = g("clarification", "errorWithUrl")
    add(
        tapis,
        '''showInfoMessage('There was an error with ' + url + ": " + error.message);''',
        "showInfoMessage(%s);" % DCF(o, "url", "error.message"),
        "errorWithUrl",
    )

    # --- gps.js ---
    o = g("clarification", "geolocationIs")
    add(
        gps,
        '''showInfoMessage("Geolocation is long: " + PreviousGPSPoint.long + " lat: " + PreviousGPSPoint.lat);''',
        "showInfoMessage(%s);" % DCF(o, "PreviousGPSPoint.long", "PreviousGPSPoint.lat"),
        "geolocationIs",
    )
    o = g("clarification", "unknownLocationError")
    add(
        gps,
        '''showInfoMessage("Unknown error obtaining Location (" + error.code + ").");''',
        "showInfoMessage(%s);" % DCF(o, "error.code"),
        "unknownLocationError",
    )

    # --- edc.js ---
    o = g("clarification", "edcContractFailed")
    add(
        edc,
        '''showInfoMessage('EDC contract negociation failed: '+ JSON.stringify(value.obj));''',
        "showInfoMessage(%s);" % DCF(o, "JSON.stringify(value.obj)"),
        "edcContractFailed-a",
    )
    add(
        edc,
        '''showInfoMessage('EDC contract negociation failed: ' + JSON.stringify(value.obj));''',
        "showInfoMessage(%s);" % DCF(o, "JSON.stringify(value.obj)"),
        "edcContractFailed-b",
    )

    o = g("clarification", "edcContractFailedDetail")
    add(
        edc,
        '''showInfoMessage('EDC contract negociation failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);''',
        "showInfoMessage(%s);" % DCF(o, "error.name", "error.message", "error.at", "error.text"),
        "edcContractFailedDetail",
    )

    o_fail = g("clarification", "edcContractFailed")
    o_dot = g("clarification", "edcContractFailedDot")
    add(
        edc,
        '''showInfoMessage('EDC contract negociation failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));''',
        "showInfoMessage(value.obj ? %s : %s);"
        % (DCF(o_fail, "JSON.stringify(value.obj)"), DC(o_dot)),
        "edcContractFailed-ternary",
    )

    o = g("clarification", "edcContractFailedAfterN")
    add(
        edc,
        '''showInfoMessage('EDC contract negociation failed after ' + n + ' iterations');''',
        "showInfoMessage(%s);" % DCF(o, "n"),
        "edcContractFailedAfterN",
    )

    o_tf = g("clarification", "edcTransferFailed")
    add(
        edc,
        '''showInfoMessage('EDC transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));''',
        "showInfoMessage(%s);"
        % DCF(o_tf, '(value.obj ? ": "+ JSON.stringify(value.obj) : ".")'),
        "edcTransferFailed-ternary",
    )

    o = g("clarification", "errorRequestingEdc")
    add(
        edc,
        '''showInfoMessage('Error in requesting EDC catalog. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);''',
        "showInfoMessage(%s);" % DCF(o, "error.name", "error.message", "error.at", "error.text"),
        "errorRequestingEdc-edc",
    )

    o = g("clarification", "edcTransferFailedDetailsAre")
    # Preserve existing (buggy) operator precedence by not inventing logic changes;
    # use the CSV template when errorDetail is truthy path of intended message.
    # Match exact source string:
    add(
        edc,
        '''showInfoMessage('EDC transfer request failed.' + (value.obj.errorDetail) ? " Details are: " + value.obj.errorDetail : "");''',
        "showInfoMessage(value.obj.errorDetail ? %s : %s);"
        % (DCF(o, "value.obj.errorDetail"), DCF(o_tf, '"."')),
        "edcTransferFailedDetailsAre",
    )

    o = g("clarification", "edcTransferFailedAfterN")
    add(
        edc,
        '''showInfoMessage('EDC transfer request failed after ' + n + ' iterations');''',
        "showInfoMessage(%s);" % DCF(o, "n"),
        "edcTransferFailedAfterN",
    )

    o = g("clarification", "edcTransferFailed")
    add(
        edc,
        '''showInfoMessage('EDC transfer request failed: ' + JSON.stringify(value.obj));''',
        "showInfoMessage(%s);" % DCF(o, '": " + JSON.stringify(value.obj)'),
        "edcTransferFailed-colon",
    )

    o = g("clarification", "edcTransferFailedDetail")
    add(
        edc,
        '''showInfoMessage('EDC transfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);''',
        "showInfoMessage(%s);" % DCF(o, "error.name", "error.message", "error.at", "error.text"),
        "edcTransferFailedDetail",
    )

    o = g("clarification", "edcGettingUrlFailed")
    add(
        edc,
        '''showInfoMessage('EDC getting URL for transfer request failed' + (value.obj ? ': '+ JSON.stringify(value.obj) : '.'));''',
        "showInfoMessage(%s);"
        % DCF(o, '(value.obj ? ": "+ JSON.stringify(value.obj) : ".")'),
        "edcGettingUrlFailed",
    )
    # Detail form with br/name has no dedicated CSV row — map via suffix template
    add(
        edc,
        '''showInfoMessage('EDC getting URL for transfer request failed. <br>name: ' + error.name + ' message: ' + error.message + ' at: ' + error.at + ' text: ' + error.text);''',
        "showInfoMessage(%s);"
        % DCF(
            o,
            '''". <br>name: " + error.name + " message: " + error.message + " at: " + error.at + " text: " + error.text''',
        ),
        "edcGettingUrlFailed-detail",
    )

    # Apply (replace_all where intended for multi-occurrence exact strings)
    applied = 0
    missing = []
    touched = set()
    counts = {}

    # Group by (path, old) to use replace count
    for path, old, new, note in reps:
        src = path.read_text(encoding="utf-8")
        if old not in src:
            missing.append((path.name, note, repr(old[:90])))
            continue
        n = src.count(old)
        src2 = src.replace(old, new)
        path.write_text(src2, encoding="utf-8", newline="\n")
        applied += n
        touched.add(path.name)
        counts[note] = counts.get(note, 0) + n
        print("OK", path.name, note, "x" + str(n))

    print("---")
    print("applied", applied)
    print("touched", sorted(touched))
    print("missing", len(missing))
    for m in missing:
        print("MISSING", m[0], m[1], m[2])


if __name__ == "__main__":
    main()
