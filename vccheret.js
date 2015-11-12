/**
 * Created by vcoulter on 11/12/15.
 */
console.log('Loading function version 1440');
var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });

var x = 0; // This is sort of a codepath tracker.

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
        x++;

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
                    x += 10;
                    // 3. Parse the characters
                    //  (Waited til now to do this in case of errors.)
                    // TODO

                    // 4. Work thru names.
                    // stream = s3Request1.createReadStream();
                    stream = s3.getObject(fileParams).createReadStream();

                    stream.on('error', function(err) {
                        console.log("While reading data, received error: ", err);
                        context.fail("Error while reading file.");
                    });

                    stream.on('end', function() {
                        console.log("Reached end of the file.");
                    });

                    stream.on('data', function(data) {
                        console.log("Read data: " + data);
                    });


                    context.succeed();
                } // end else getObject() worked.
            });
        }  // end if message had necessary configuration.
    }  // end if we could parse into message.

    // Now that I've done that, how much time do I have left?
    console.log("Time remaining " + context.getRemainingTimeInMillis() + " ms, x = " + x);

};