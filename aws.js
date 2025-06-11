/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023-2024 Joan Masó

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

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at ieee org) 
    dins del grup del MiraMon. MiraMon és un projecte del 
    CREAF que elabora programari de Sistema d'Informació Geogràfica 
    i de Teledetecció per a la visualització, consulta, edició i anàlisi 
    de mapes ràsters i vectorials. Aquest progamari programari inclou
    aplicacions d'escriptori i també servidors i clients per Internet.
    No tots aquests productes són gratuïts o de codi obert. 
    
    En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
    El TAPIS es pot actualitzar des de https://github.com/joanma747/tapis.
*/

"use strict"

//https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.js
//https://stackoverflow.com/questions/72383502/aws-api-gateway-iam-authorization-generating-signature-using-crypto-js

function createSHA256Hash(input) {
	return CryptoJS.enc.Hex.stringify(CryptoJS.SHA256(input))
}
/*test: getAWSSignedHeaders("minio-ad4gd-api.mlops.ari-aidata.eu", null, {"accessKey": "Ij3X86wXIhSBtDarOgOg",
						"secretKey": "QrfVQPA4ZYOLQHhexArtAeOqq1jQtlRU4jN5h3us",
						"service", "s3"});*/
function getAWSSignedHeaders(host, path, s3security) {
	var region="us-east-1";

    // Task 1: Create a canonical request for Signature Version 4
    // Arrange the contents of your request (host, action, headers, etc.) into a standard (canonical) format. The canonical request is one of the inputs used to create a string to sign.

	var date = new Date().toISOString().split('.')[0] + 'Z';
  	//var date = "2024-12-16T21:11:34Z";
  	const amzDate = date.split("-").join("").split(":").join("")
  	const dateWithoutTime = date.split("T")[0]

	const httpRequestMethod = "GET"
	const canonicalURI = path ? path : '/';
    	const canonicalQueryString = ''
    	const canonicalHeaders= 'host:' + host + '\n' + 'x-amz-date:' + amzDate + '\n'
	const signedHeaders = 'host;x-amz-date'
	const data=null;
	const payload = data ? JSON.stringify(data) : ''
	const hashedPayload = createSHA256Hash(payload)

	const canonicalRequest =
		httpRequestMethod + '\n' +
		canonicalURI + '\n' +
		canonicalQueryString + '\n' +
		canonicalHeaders + '\n' +
		signedHeaders + '\n' +
		hashedPayload

	const hashedCanonicalRequest = createSHA256Hash(canonicalRequest);

	//   if you used SHA256, you will specify AWS4-HMAC-SHA256 as the signing algorithm

	// Task 2: Create a string to sign for Signature Version 4
	// Create a string to sign with the canonical request and extra information such as the algorithm, request date, credential scope, and the digest (hash) of the canonical request.
	const algorithm = 'AWS4-HMAC-SHA256'
	const requestDateTime = amzDate
	const dateStamp = amzDate.split("T")[0] // Date w/o time, used in credential scope
	const credentialScope = dateStamp + '/' + region + '/' + s3security.service + '/' + 'aws4_request'

	const stringToSign =
        	algorithm + '\n' +
	        requestDateTime + '\n' +
        	credentialScope + '\n' +
	        hashedCanonicalRequest

	// Task 3: Calculate the signature for AWS Signature Version 4
	// Derive a signing key by performing a succession of keyed hash operations (HMAC operations) on the request date, Region, and service, with your AWS secret access key as the key for the initial hashing operation. After you derive the signing key, you then calculate the signature by performing a keyed hash operation on the string to sign. Use the derived signing key as the hash key for this operation.

	var kDate = CryptoJS.HmacSHA256(dateStamp, "AWS4" + s3security.secretKey);
	var kRegion = CryptoJS.HmacSHA256(region, kDate);
	var kService = CryptoJS.HmacSHA256(s3security.service, kRegion);
	var kSigning = CryptoJS.HmacSHA256("aws4_request", kService);
	//console.log('kSigning: ', CryptoJS.enc.Hex.stringify(kSigning))

	const signature = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(stringToSign, kSigning));

	// Task 4: Add the signature to the HTTP request
	// After you calculate the signature, add it to an HTTP header or to the query string of the request.
	const authorizationHeader = algorithm + ' Credential=' + s3security.accessKey + '/' + credentialScope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature

	const headers = {
		'Accept': '*/*',
        	'X-Amz-Date': amzDate,
	        'Authorization': authorizationHeader,
	        'Host': host
	}

	return headers;
}

function ParseS3BucketsList(url, bucketsListXMLText) {
	if (!bucketsListXMLText)
		return null;
	var jsonData=JSON.parse(xml2json(parseXml(bucketsListXMLText), false, null));

	if (!jsonData['ListAllMyBucketsResult'] || !jsonData['ListAllMyBucketsResult']['Buckets'])
		return null;

	var buckets=jsonData['ListAllMyBucketsResult']['Buckets']['Bucket'];
	var records=[], record, bucket;
	for (var r=0; r<(buckets.length ? buckets.length : 1); r++) {
		record={};
		bucket=buckets.length ? buckets[r] : buckets;
		if (!bucket.Name)
			continue;
		record.name=bucket.Name;
		record.creationDate=bucket.CreationDate;
		record.href=url + (url.charAt(url.length - 1) == '/' ? '':'/') + bucket.Name;
		records.push(record);
	}
	return records;	
}

function ParseS3Bucket(url, bucketXMLText) {
	if (!bucketXMLText)
		return null;
	var jsonData=JSON.parse(xml2json(parseXml(bucketXMLText), false, null));

	if (!jsonData['ListBucketResult'] || !jsonData['ListBucketResult']['Contents'])
		return null;

	var files=jsonData['ListBucketResult']['Contents'];
	var records=[], record, file;
	for (var r=0; r<(files.length ? files.length : 1); r++) {
		record={};
		file=files.length ? files[r] : files;
		if (!file.Key)
			continue;
		record.href=url + (url.charAt(url.length - 1) == '/' ? '':'/') + file.Key;
        	record.lastModified=file.LastModified;
	        //file.ETag>
        	record.size=file.Size;
		//file.Owner.ID
		if (file.Owner)
			record.ownerName=file.Owner.DisplayName;
		record.storageClass=file.StorageClass
		records.push(record);
	}
	return records;	
}
