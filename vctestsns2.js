console.log('Loading function version 1650');
// TODO - after zip, added comments.

exports.handler = function(event, context) {
    // console.log('Received event:', JSON.stringify(event, null, 2));

	var message = null;
	var characters = "";
	var searchBucket = "";
	var searchKey = "";
	var timeNow = new Date();
	// TODO: say getHours() - 6.
	console.log('At ' + timeNow.getHours() + ':' + timeNow.getMinutes() + ' got message: ', event.Records[0].Sns.Message);
    try {
    	message = JSON.parse(event.Records[0].Sns.Message);
    } catch (e) {
    	context.fail("Did not receive a JSON-parseable message.");
    }

	// N.B. It's quite possible that the below code will execute even tho' it looks like it's after the context.fail() call in the catch block. So check:
	if (message != null) {
		// Get the data we need
		characters = message.Characters;
		searchBucket = message.SearchBucket;
		searchKey = message.SearchFile;
		/* TODO: in some future version of this, if Characters isn't given,
		 * check if CharacterBucket and CharacterFile are set and grab them,
		 * then hafta load the characters given that bucket & key.
		 */
	}

	if (!characters) {
		console.log("No \"Characters\" value given.");
	}
	if (!searchBucket) {
		console.log("No \"SearchBucket\" value given.");
	}
	if (!searchKey) {
		console.log("No \"SearchFile\" value given.");
	}
	if (characters && searchBucket && searchKey) {
		console.log('Characters: ', characters);
		console.log('SearchBucket: ', searchBucket);
		console.log('SearchFile: ', searchKey);
	} else {
		context.fail("Required configuration is missing.");
	}

	// Now that I've done that, how much time do I have left?
	console.log("Time remaining " + context.getRemainingTimeInMillis() + " ms.");
	// Can I check how much memory I have left? Looks unlikely at this point.
	console.log("Memory limit is " + context.memoryLimitInMB + " MB.");

    context.succeed(message);
};