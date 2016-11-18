'use strict';

var hfc  = require(__dirname+"/../../..");
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
global.config = config;
exports.ca = config.ca;
exports.peers = config.peers;
exports.orderer = config.orderer;
exports.users = config.users;
exports.deployRequest = config.deployRequest;
exports.invokeRequest = config.invokeRequest;
exports.queryRequest = config.queryRequest;
