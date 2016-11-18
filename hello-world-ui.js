// An end-to-end sample program on Fabric V1.0
'use strict';

process.env.GOPATH = __dirname;
var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var hfc = require('.');
var util = require('util');
var fs = require('fs');

var cors = require('cors');
// Enable CORS preflight across the board.
app.options('*', cors());
app.use(cors());
app.use(express.static('public'));
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json());
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var server = http.createServer(app).listen('3000', function() {});
server.timeout = 240000;
console.log('####################### Server Up - localhost:3000 #######################');

var chain = hfc.newChain(config.chainName);
var webUser;
var chaincodeID = "hello-wrold";

chain.setKeyValueStore(hfc.newKeyValueStore({
    path: path.join(__dirname, "/" + config.KeyValueStore)
}));

chain.setMemberServicesUrl(config.ca.ca_url);
chain.setOrderer(config.orderer.orderer_url);
var targets = hfc.getPeer(config.peers[0].peer_url, config.peers[1].peer_url);

app.post('/login', function(req, res) {
    // TODO: Get rid off Hardcoding the secret
    chain.enroll(req.body.user, config.users[0].secret)
        .then(
            function(admin) {
		webUser = admin;
                console.log('Successfully enrolled user \'admin\'');
                res.send('SUCCESS')
            },
            function(err) {
                console.log('Failed to enroll user \'admin\'. ' + err);
                process.exit();
            }
        ).catch(
            function(err) {
                console.log('Failed to Register admin , hence login faled');
                process.exit();
            }
        );
});
app.post('/deploy', function(req, res) {
chain.enroll(config.users[0].username, config.users[0].secret)
        .then(
	function(admin) {
	webUser = admin;
	var args = [];//getArgs(config.deployRequest.args);
	args.push(req.body.user1);
	args.push(req.body.val1);
	args.push(req.body.user2);
	args.push(req.body.val2);
                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodePath: config.deployRequest.chaincodePath,
                    fcn: req.body.functionName,
                    args: args
                };
                console.log('###################### Deploy started');
                return admin.sendDeploymentProposal(request);    
}).then(
        function(results) {
            var proposalResponses = results[0];
            var proposal = results[1];
            if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                console.log(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponse[0].response.message, proposalResponse[0].response.payload, proposalResponse[0].endorsement.signature));
		res.send(chaincodeID);
                return webUser.sendTransaction(proposalResponse, proposal);
            } else {
                console.log('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                process.exit(0);
            }
        },
        function(err) {
            console.log('Failed to send deployment proposal due to error: ' + err.stack ? err.stack : err);
            process.exit(0);
        }
).then(
        function(response) {
            if (response.Status === 'SUCCESS') {
                console.log('Successfully ordered deployment endorsement.');
		console.log('<==== wait for '+config.deployWaitTime+' (ms) the committer to catch up');
                return sleep(parseInt(config.deployWaitTime));
            } else {
                console.log('Failed to order the deployment endorsement. Error code: ' + response.status);
                process.exit();
            }

        },
        function(err) {
            console.log('Failed to send deployment e due to error: ' + err.stack ? err.stack : err);
            process.exit();
        }
    ).catch(
            function(err) {
                console.log('Failed to send deployment proposal due to erro');
		console.log( err.stack ? err.stack : err);	
                process.exit();
            }
        );
});

app.post('/invoke', function(req, res) {
chain.enroll(config.users[0].username, config.users[0].secret)
        .then(
	function(admin) {
	webUser = admin;
	var args = [];//getArgs(config.deployRequest.args);
	args.push(req.body.method);
	args.push(req.body.user1);
	args.push(req.body.user2);
	args.push(req.body.val);
                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodeId: chaincodeID,
                    fcn: req.body.functionName,
                    args: args
                };
                console.log('###################### Invoke: sending TransactionProposal');
                return admin.sendTransactionProposal(request);    
}).then(
            function(results) {
            var proposalResponses = results[0];
            var proposal = results[1];
            if (proposalResponses[0].response.status === 200) {
                console.log('Successfully obtained transaction endorsement.' + JSON.stringify(proposalResponses));
		res.send('Successfully obtained transaction endorsement. Looks like your transaction is successful !!!');
                return webUser.sendTransaction(proposalResponses, proposal);
            } else {
                console.log('Failed to obtain transaction endorsement. Error code: ' + status);
                process.exit();
            }
        },
        function(err) {
            console.log('Failed to send transaction proposal due to error: ' + err.stack ? err.stack : err);
            process.exit();
        }
).then(
        function(response) {
            if (response.Status === 'SUCCESS') {
                console.log('Successfully ordered endorsement transaction.');
                console.log('<==== wait for '+config.transactionWaitTime+' (ms) the committer to catch up');
                return sleep(parseInt(config.transactionWaitTime));
            } else {
                console.log('Failed to order the endorsement of the transaction. Error code: ' + response.status);
                process.exit();
            }
        },
        function(err) {
            console.log('Failed to send transaction proposal due to error: ' + err.stack ? err.stack : err);
            process.exit();
        }
    ).catch(
            function(err) {
                console.log('Failed to send deployment proposal due to erro');
		console.log( err.stack ? err.stack : err);	
                process.exit();
            }
        );
});

app.post('/query', function(req, res) {
chain.enroll(config.users[0].username, config.users[0].secret)
        .then(
	function(admin) {
	webUser = admin;
	var args = [];//getArgs(config.deployRequest.args);
	args.push(req.body.method);
	args.push(req.body.user);
                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodeId: chaincodeID,
                    fcn: req.body.functionName,
                    args: args
                };
                console.log('###################### Query: queryByChaincode');
                return admin.queryByChaincode(request);    
}).then(
           function(response_payload) {
	    console.log('User b now has ', response_payload.toString('utf8'));
	    res.send(response_payload.toString('utf8'));
            //process.exit();
        },
        function(err) {
            console.log('Failed to send query due to error: ' + err.stack ? err.stack : err);
            process.exit();
        }
    ).catch(
            function(err) {
                console.log('Failed to send deployment proposal due to erro');
		console.log( err.stack ? err.stack : err);	
                process.exit();
            }
        );
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getArgs(requestArgs) {
    var args = [];
    for (var i = 0; i < requestArgs.length; i++) {
        args.push(requestArgs[i]);
    }
    return args;
}
