'use strict';
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
var util = require('util');
//var hfc  = require("/anodesdk/Nov03/fabric-sdk-node");
var hfc  = require(__dirname+"/../../..");
/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
  deploy: deploy
};

/*
  Functions in a127 controllers used for operations should take two parameters:

  Param 1: a handle to the request object
  Param 2: a handle to the response object
 */
function deploy(req, res) {
	console.log("**** start deploy ****");

	var name = req.swagger.params.name.value;
	if(!name) {
		writeError(res, null, "User to perform the deploy is missing");
	}
	var admin = global.admin;
	if(!admin) {
		writeError(res, null, "User to perform the deploy was not enrolled");
	}

	var chaincodename  = req.swagger.params.chaincodename.value;
	if (!chaincodename) {
		writeError(res, null, "Chain code name is missing");
		return;
	}

	var chaincodepath  = req.swagger.params.chaincodepath.value;
	if (!chaincodepath) {
		writeError(res, 500, "Chain code path is missing");
		return;
	}
	process.env.GOPATH = __dirname+'/../..';

  var args  = req.swagger.params.args.value;
	if (!args) {
    //TODO: Proces args
    args = "a,100,b,200";
		//writeError(res, 500, "Chain code path is missing");
		return;
	}
	console.log(" -- have user name of " + name);

	//
	// Create and configure the chain
	//
	var chain = global.chain;
	if(chain) {
		console.log(" -- chain is setup");
	} else {
		console.log(" -- chain was not found, run enroll to get chain and member");
    	writeError(res, err, " chain was not created, run enroll to get chain and member");
    	return;
	}

	// send proposal to endorser
	var deployRequest = {
		targets: [hfc.getPeer('grpc://localhost:7051'), hfc.getPeer('grpc://localhost:7056')],
		chaincodePath: chaincodepath,
		chaincodeId: chaincodename,
		fcn: 'init',
		args: ['a', '100', 'b', '200']
	};

	admin.sendDeploymentProposal(deployRequest)
	.then(
		function(results) {
			var proposalResponses = results[0];
			console.log('proposalResponses:'+JSON.stringify(proposalResponses));
			var proposal = results[1];
			if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
				console.log(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
				return admin.sendTransaction(proposalResponses, proposal);
			} else {
				console.log(JSON.stringify(proposalResponses[0]));
				console.log('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
				return Promise.reject('failed');
			}
		},
		function(err) {
			console.log('Failed to send deployment proposal due to error: ' + err.stack ? err.stack : err);
			return Promise.reject(err);
		}
	)
	.then(
		function(response) {
			if (response.Status === 'SUCCESS') {
				console.log('Successfully ordered deployment endorsement.');
	        	writeResponse(res, 200, "Chain code " + chaincodename + " was successfully endorsed and submitted to Orderer");
			} else {
				console.log('Failed to deploy due to error: ' + response);
	        	writeError(res, err, " problem with the deploy");
			}
		},
		function(err) {
			console.log('Failed to deploy due to error: ' + err.stack ? err.stack : err);
           	writeError(res, err, " problem with the deploy");
		}
	)
    .catch(
        function(err) {
			console.log('Failed to deploy due to error: ' + err.stack ? err.stack : err);
           	writeError(res, err, " problem with the deploy");
        }
    );
}

function writeError(res, err, default_error_msg) {
	console.log(" *** " + default_error_msg + "::" + err);
	var error_msg = default_error_msg;
	if (err && err.description) {
		error_msg = err.description;
	}
	writeResponse(res, 500, error_msg);

}

/**
 * Utility method to handle the message returned to the REST caller
 */
function writeResponse(res, code, msg) {
	res.status(code).json({
		message : msg
	});
}
