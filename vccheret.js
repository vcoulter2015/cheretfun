/**
 * Created by vcoulter on 11/12/15.
 */
console.log('Loading function.');
var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });

// Module-level variables.
var gContext;
var gStream;
var gReadBlockCount = 0;

/*
// I was using this for the data event until
// http://neethack.com/2013/12/understand-node-stream-what-i-learned-when-fixing-aws-sdk-bug/
// pointed out that there's a readable event, see it below.
function gotData(data) {
    gReadBlockCount++;
    console.log("Read data: " + data.toString());
}
*/
function gotReadable() {
    gReadBlockCount++;
    var data = gStream.read();
    console.log("Read data: " + data.toString());
    }

function endOfData() {
    console.log("Reached end of file after " + gReadBlockCount + " data blocks read.");
    // Now that I've done that, how much time do I have left?
    console.log("Time remaining " + gContext.getRemainingTimeInMillis() + " ms");
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
                    // TODO

                    // 4. Work thru names.
                    // I tried calling s3Request1.createReadStream(), but that resulted in this else block being invoked over & over.
                    stream = s3.getObject(fileParams).createReadStream();
                    gStream = stream;

                    stream.on('error', function(err) {
                        console.log("While reading data, received error: ", err);
                        context.fail("Error while reading file.");
                    });

                    stream.on('end', endOfData);
                    stream.on('readable', gotReadable);
                    //stream.on('data', gotData(data));

                } // end else getObject() worked.
            });
        }  // end if message had necessary configuration.
    }  // end if we could parse into message.

};