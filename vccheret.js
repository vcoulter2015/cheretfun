/**
 * Created by vcoulter on 11/12/15.
 */
console.log('Loading function.');
// Module-level declarations.
var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });

//  A. File processing
var gContext;
var gStream;
var gReadBlockCount = 0;
var gFileData = "";
var gSplitName = "";
//  B. String processing
var gaCharacters;
var gTotalCharCount = 0;

/**** Bucket Functions *****/

// Given a string, return a 26-element array representing the character counts.
function buildBucket(charList) {

    // Did the caller actually pass us any string data?
    if (!charList) return null;
    if ('string' !== (typeof charList)) {
        console.log("buildBucket passed '" + charList.toString() + "' which is not a string.");
        return null;
    }
    // We're still here, so yes.
    var bucket = new Uint8ClampedArray(26);
    var chars = charList.toUpperCase();
    var ch;
    for (var i = 0; i < chars.length; i++) {
        ch = chars.charCodeAt(i);
        // TODO - important - what to do if non-alphabetic characters are found?
        // If I want to disallow such strings, return null;
        // If I want to just ignore them, comment out the else.
        // (I'm curious to see how much work it would save me to disallow them.)
        if (65 <= ch && ch <= 90) {
            // Assumption: We will not have strings with more than 255 occurrences of a single letter.
            // (If this needs changed, find all the Uint8ClampedArray() declarations and upgrade them.)
            if (bucket[ch - 65] == 255) {
                gContext.fail("Cannot process!! More than 255 occurrences of " + ch + " found in '" + charList + "'!!");
                return null;
            }
            bucket[ch - 65]++;
        } else
            return null;
    } // end for
    return bucket;
}

// Given two buckets (arrays of 26 elements), do they have the same values?
// Does not type check its arguments; caller is trusted.
function doBucketsMatch(b1, b2) {

    // I suspect that checking if toString() produces the same value for each arg,
    // that would probably produce accurate results, but it probably wouldn't be as efficient.

    // Optimization: start from the end because the letters Q and U-Z are less often used in English.
    for (var i = 25; i > 0; i--)
        if (b1[i] != b2[i])
            return false;
    // Look, we're still here!
    return true;
}

/* Given two buckets (arrays of 26 elements), does the smallerBucket argument have
 * smaller values than largerBucket for each corresponding element? If false, then
 * smallerBucket can't fit in largerBucket.
 * Will also return false if smallerBucket has all the same values as largerBucket
 * (because anything added to smallerBucket will be bigger than largerBucket).
 */
function isBucketContained(smallerBucket, biggerBucket) {
    var bucketsMatch = true;
    // Optimization: start from the end because the letters Q and U-Z are less often used in English.
    for (var i = 25; i > 0; i--)
        if (smallerBucket[i] > biggerBucket[i])
            return false;
        else if (smallerBucket[i] < biggerBucket[i])
            bucketsMatch = false;

    /* If we're still here, then all the elements of smallerBucket were <= corresponding
     * element in biggerBucket. If they were all equal, then bucketsMatch is still true,
     * and we want to indicate if the smallerBucket is actually *smaller*. */
    return !bucketsMatch;
}

// Given two buckets, return a bucket with the corresponding elements added together.
function combineBuckets(b1, b2) {
    var sumb = new Uint8ClampedArray(26);
    for (var i = 0; i < 26; i++)
        sumb[i] = b1[i] + b2[i];
    return sumb;
}

// Just for debugging: Uint8ClampedArray needs a better toString() method.
function bucketToString(b) {
    if (!b) return "";
    var p = new Array(26);
    for (var i = 0; i < 26; i++)
        p[i] = b[i];
    return "u8c" + p.toString();
}

var NameClass = function (name) {
    this.name = name;
    this.length = name.length;
    this.bucket = buildBucket(name);
}
NameClass.prototype.toString = function() {
    return this.name + " (" + this.length + ") " + bucketToString(this.bucket);
}

/**** Name Search Functions *****/

/* Go thru the string and build objects with the names we need.
    Returns an Array of NameClass objects.
 */
function preProcessNames(fileData) {

    var i = 0;
    var nextNewlinePos = -1;
    var name = "";
    var nameObj = null;
    var nameList = new Array();

    do {
        nextNewlinePos = fileData.indexOf("\n", i);
        if (nextNewlinePos > -1)
            name = fileData.substring(i, nextNewlinePos).trim();
        else    // go to end of line
            name = fileData.substring(i).trim();
        // Check if we got 2 newlines in a row or something like that.
        if (name.length > 0) {
            nameObj = new NameClass(name);
            // Did the name get a bucket?
            if (nameObj.bucket)
                // Could this bucket be in the solution?
                if (nameObj.length < gTotalCharCount && isBucketContained(nameObj.bucket, gaCharacters))
                    nameList.push(nameObj);
        } // end if name actually has a value.
        i = nextNewlinePos + 1;
    } while (nextNewlinePos > -1);

    return nameList;
}

function findNames() {

    // Do not actually use split() in production, as convenient as it is,
    // because we don't want to keep all the names. Some we'll know up right away aren't part of the solution.
    // var aNames = gFileData.split("\n");
    // console.log("In findNames, received " + gFileData.length + " characters split into " + aNames.length + " names.");
    //console.log("In findNames, received " + gFileData.length + " characters");
    // TODO - after aNames is set, will setting gFileData to "" free up all that memory?
    var aNames = preProcessNames(gFileData);
    gFileData = "";
    console.log("In findNames, built list of " + aNames.length + " items.");

    var n = 0;
    var i = 0;
    var nLength = 0;
    var nBucket;
    var combined;
    var matchFound = false;

    // Multiple answers are allowed, so go thru the whole dataset.
    for (n = 0; n < aNames.length; n++) {
        nLength = aNames[n].length;
        nBucket = aNames[n].bucket;
        for (i = n+1; i < aNames.length; i++) {
            if (nLength + aNames[i].length == gTotalCharCount) {
                combined = combineBuckets(nBucket, aNames[i].bucket);
                if (doBucketsMatch(gaCharacters, combined)) {
                    matchFound = true;
                    console.log("MATCH FOUND!");
                    console.log(aNames[n].name + " and " + aNames[i].name);
                }
            }
        }
    }
    if (!matchFound)
        console.log("No match found.");
    gContext.succeed();
}

/**** Event Handling Functions *****/

// There are two data events, readable and data.
// http://neethack.com/2013/12/understand-node-stream-what-i-learned-when-fixing-aws-sdk-bug/
// talks about the differences between them, but 2 years later, they seem to do basically the same thing.
/*
 function gotReadable() {
 gReadBlockCount++;
 var data = gStream.read().toString();
 console.log("Read data: " + data);
 }
 */
function gotData(data) {
    gReadBlockCount++;
    // Data we receive may be broken up mid-name. Save the broken pieces.
    // gSplitName will contain the first bit of the first name we read (if there is such a break).
    var sData = gSplitName + data.toString();
    var lastLineBreakPos = sData.lastIndexOf("\n");
    // console.log("lastLineBreakPos is: " + lastLineBreakPos + " in data length " + sData.length);
    if (lastLineBreakPos > -1 && lastLineBreakPos < sData.length - 1) {
        gSplitName = sData.substring(lastLineBreakPos+1);
        sData = sData.substring(0, lastLineBreakPos+1); // include the \n
    } else {
        gSplitName = "";
    }
    // console.log("Read data from " + sData.substr(0, 30) + " ... to ... " + sData.substring(sData.length-30));
    // console.log("gSplitName is now: '" + gSplitName + "'");
    // TODO - instead of doing it this way, can I start processing names (asynchronously)?
    // The problems I would have to navigate around are that the array has to be thread-safe
    // and that I want to send whole names, not this split-name business, to be pre-processed.
    gFileData += sData;
}

function endOfData() {
    // If there was any split name, tag it on the end.
    if (gSplitName) {
        //console.log("endOfData: gSplitName was '" + gSplitName + "', appending to gFileData.");
        gFileData += "\n" + gSplitName;
    }
    console.log("Reached end of file after " + gReadBlockCount + " data blocks read.");
    // Now that I've done that, how much time do I have left?
    console.log("Time remaining " + gContext.getRemainingTimeInMillis() + " ms");

    // TODO - call this asynchronously? (or maybe it automatically is?)
    findNames();
}

exports.handler = function(event, context) {
    // console.log('Received event:', JSON.stringify(event, null, 2));
    var message = null;
    var searchBucket = "";
    var searchKey = "";
    var timeNow = new Date();
    // -6 because I'm in CST.
    console.log('At ' + (timeNow.getHours() - 6) + ':' + timeNow.getMinutes() + ' got message: ', event.Records[0].Sns.Message);
    try {
        message = JSON.parse(event.Records[0].Sns.Message);
    } catch (e) {
        context.fail("Did not receive a JSON-parseable message.");
    }

    // N.B. context.fail() reports an error message, but doesn't stop execution,
    // so check if message has a value.
    if (message) {
        // 1. Get the data we need
        characters = message.Characters;
        searchBucket = message.SearchBucket;
        // TODO - may need to be searchKey = decodeURIComponent(message.SearchFile.replace(/\+/g, " "));
        searchKey = message.SearchFile;
        /* TODO: in a future version of this, if Characters isn't given,
         * check if CharacterBucket and CharacterFile are set and grab them,
         * then hafta load the characters given that bucket & key.
         */

        if (!characters) {
            console.log("No \"Characters\" value given.");
        }
        if (!searchBucket) {
            console.log("No \"SearchBucket\" value given.");
        }
        if (!searchKey) {
            console.log("No \"SearchFile\" value given.");
        }
        console.log('Characters: ', characters);
        console.log('SearchBucket: ', searchBucket);
        console.log('SearchFile: ', searchKey);
        if (!(characters && searchBucket && searchKey)) {
            context.fail("Required configuration is missing.");
        } else {
            // 2. Read from the file
            var fileParams = { Bucket: searchBucket, Key: searchKey };
            // http://stackoverflow.com/questions/22143628/nodejs-how-do-i-download-a-file-to-disk-from-an-aws-s3-bucket?rq=1
            // had an example with the call s3.getObject(params, { stream : true }, ...);
            // TODO - Is there a better way to check if the object exists & is available?
            var s3Request1 = s3.getObject(fileParams, function(err, data) {
                if (err) {
                    console.log("Error getting file to search: ", err);
                    context.fail("Could not retrieve file to search. Check whether it exists.");
                } else {
                    console.log("Successfully retrieved object: " + JSON.stringify(fileParams, null, 2));

                    // Do a little more setup here now that we've successfully gotten the file.
                    gContext = context;
                    // Parse the characters into a bucket.
                    gTotalCharCount = characters.length;
                    gaCharacters = buildBucket(characters);
                    // It is remotely possible that the last call failed.
                    if (!gaCharacters) {
                        context.fail("Could not process Characters. Make sure all are alphabetic. If total length is more than 255, upgrade this function.");
                    } else {
                        console.log("Looking for characters: " + bucketToString(gaCharacters));

                        // 3. Read names.
                        // I tried calling s3Request1.createReadStream(), but that resulted in this else block being invoked over & over.
                        stream = s3.getObject(fileParams).createReadStream();
                        gStream = stream;

                        stream.on('error', function (err) {
                            console.log("While reading data, received error: ", err);
                            context.fail("Error while reading file.");
                        });

                        stream.on('end', endOfData);
                        // On readable vs data events, see comment near their declarations.
                        //stream.on('readable', gotReadable);
                        stream.on('data', gotData);
                    }  // end else buildBucket(characters) worked.
                } // end else getObject() worked.
            });
        }  // end if message had necessary configuration.
    }  // end if we could parse into message.

};