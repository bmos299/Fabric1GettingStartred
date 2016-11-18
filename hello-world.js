/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// An end-to-end sample program on Fabric V1.0
'use strict';

process.env.GOPATH = __dirname;

var path = require('path');
var hfc = require('.');
var util = require('util');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var chain = hfc.newChain(config.chainName);
var webUser;
var chaincodeID = "hello-world";

chain.setKeyValueStore(hfc.newKeyValueStore({
    path: path.join(__dirname, "/" + config.KeyValueStore)
}));

chain.setMemberServicesUrl(config.ca.ca_url);
chain.setOrderer(config.orderer.orderer_url);
var targets = hfc.getPeer(config.peers[0].peer_url, config.peers[1].peer_url);

chain.enroll(config.users[0].username, config.users[0].secret)
    .then(
        function(admin) {
            console.log('Successfully enrolled user \'admin\'');
            webUser = admin;
            var args = getArgs(config.deployRequest.args);
            // send proposal to endorser
            var request = {
                //TODO: replace this to a single object
                targets: targets,
                chaincodePath: config.deployRequest.chaincodePath,
                chaincodeId: chaincodeID,
                fcn: config.deployRequest.functionName,
                args: args
            };
            return admin.sendDeploymentProposal(request);
        },
        function(err) {
            console.log('Failed to enroll user \'admin\'. ' + err);
            process.exit();
        }
    ).then(
        function(results) {
            var proposalResponses = results[0];
            var proposal = results[1];
            if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                console.log(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
                //chaincodeID = proposalResponse.chaincodeId;
                return webUser.sendTransaction(proposalResponses, proposal);
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
                console.log(' need to wait now for the committer to catch up');
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
    ).then(
        function() {
            var args = getArgs(config.invokeRequest.args);
            // send proposal to endorser
            var request = {
                targets: targets,
                chaincodeId: chaincodeID,
                fcn: config.invokeRequest.functionName,
                args: args
            };
            return webUser.sendTransactionProposal(request);
        },
        function(err) {
            console.log('Failed to wait due to error: ' + err.stack ? err.stack : err);
            process.exit();
        }
    ).then(
        function(results) {
            var proposalResponses = results[0];
            var proposal = results[1];
            if (proposalResponses[0].response.status === 200) {
                console.log('Successfully obtained transaction endorsement.' + JSON.stringify(proposalResponses));
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
                console.log(' need to wait now for the committer to catch up');
                return sleep(20000);
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
    ).then(
        function() {
            var args = getArgs(config.queryRequest.args);
            // send query
            var request = {
                targets: targets,
                chaincodeId: chaincodeID,
                fcn: config.queryRequest.functionName,
                args: args
            };
            return webUser.queryByChaincode(request);
        },
        function(err) {
            console.log('Failed to wait-- error: ' + err.stack ? err.stack : err);
            process.exit();
        }
    ).then(
        function(response_payload) {
	    console.log('User b now has ', response_payload.toString('utf8'));
            process.exit();
        },
        function(err) {
            console.log('Failed to send query due to error: ' + err.stack ? err.stack : err);
            process.exit();
        }
    ).catch(
        function(err) {
            console.log('Failed to end to end test with error:' + err.stack ? err.stack : err);
            process.exit();
        }
    );

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
