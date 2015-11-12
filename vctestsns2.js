console.log('Loading function version 1015');

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
		// Get the data we need
		characters = message.Characters;
		searchBucket = message.SearchBucket;
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
			context.succeed();
		}
	}  // end if we could parse into message.

	// Now that I've done that, how much time do I have left?
	console.log("Time remaining " + context.getRemainingTimeInMillis() + " ms.");
	// Can I check how much memory I have left? Looks unlikely at this point.
	console.log("Memory limit is " + context.memoryLimitInMB + " MB.");

};