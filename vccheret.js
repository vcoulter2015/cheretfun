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
//  B. String processing
var gaCharacters = new Array(26);
var gSplitName = "";

function buildBucket(charList) {

    // Did the caller actually pass us any string data?
    if (!charList) return null;
    if ('string' !== (typeof charList)) {
        console.log("buildBucket passed '" + charList.toString() + "' which is not a string.");
        return null;
    }

    // We're still here, so yes.
    // var bucket = new Array(26);
    var chars = charList.toUpperCase();
    var ch;
    // Every element of bucket needs initialized to 0. This might be the fastest way to do that.
    var bucket = [0,0,0,0,0,
        0,0,0,0,0,
        0,0,0,0,0,
        0,0,0,0,0,
        0,0,0,0,0,0];

    for (var i = 0; i < chars.length; i++) {
        ch = chars.charCodeAt(i);
        // TODO - important - what to do if non-alphabetic characters are found?
        // If I want to disallow such strings, return null;
        // If I want to just ignore them, comment out the else.
        // (I'm curious to see how much work it would save me to disallow them.)
        if (65 <= ch && ch <= 90)
            bucket[ch - 65]++;
        else
            return null;
    } // end for
    return bucket;
}


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
    if (lastLineBreakPos > -1 && lastLineBreakPos < sData.length - 1) {
        gSplitName = sData.substring(lastLineBreakPos+1);
        sData = sData.substring(0, lastLineBreakPos);
    } else {
        gSplitName = "";
    }
    console.log("Read data: " + sData);
}


function endOfData() {
    console.log("Reached end of file after " + gReadBlockCount + " data blocks read.");
    // Now that I've done that, how much time do I have left?
    console.log("Time remaining " + gContext.getRemainingTimeInMillis() + " ms");
    // TODO - this is not end of processing in the finished program.
    gContext.succeed();
}

exports.handler = function(event, context) {
    // console.log('Received event:', JSON.stringify(event, null, 2));
    var message = null;
    var characters = "";
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

    // N.B. context.fail() reports an error message, but doesn't stop execution.
    if (message != null) {
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
                    // Do some more setup that wasn't done till now to save trouble in case of errors.
                    gContext = context;

                    // 3. Parse the characters
                    gaCharacters = buildBucket(characters);
                    console.log("Looking for characters: " + gaCharacters.toString());

                    // 4. Work thru names.
                    // I tried calling s3Request1.createReadStream(), but that resulted in this else block being invoked over & over.
                    stream = s3.getObject(fileParams).createReadStream();
                    gStream = stream;

                    stream.on('error', function(err) {
                        console.log("While reading data, received error: ", err);
                        context.fail("Error while reading file.");
                    });

                    stream.on('end', endOfData);
                    // On readable vs data events, see comment near their declarations.
                    //stream.on('readable', gotReadable);
                    stream.on('data', gotData);

                } // end else getObject() worked.
            });
        }  // end if message had necessary configuration.
    }  // end if we could parse into message.

};