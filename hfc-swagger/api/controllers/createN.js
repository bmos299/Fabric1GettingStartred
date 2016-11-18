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
var fs = require('fs');
const child_process = require('child_process');
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
        createN : createN
};


function createN(req, res) {
    console.log('***** start create n peers network *****: ');

    var cfgFile = __dirname + '/' +  req.swagger.params.name.value;
    if (!cfgFile) {
        writeError(res, null, "input file name is missing");
        return;
    }
    var nOrderers = req.swagger.params.orderers.value;
    var nPeers = req.swagger.params.peers.value;
    var nReqArr = [];
    nReqArr[0] = nOrderers;
    nReqArr[1] = nPeers;
    var port = [];
    port[0] = 5151;
    port[1]=7051;
    //console.log('length=%d, [nOrderers, nPeers]=', nReqArr.length, nReqArr);
    //console.log('length=%d, port[nOrderers, nPeers]=', port.length, port);
    //var cfgFile = __dirname + "/" + "network-cfg.json";
    var dFile = __dirname + "/" + "docker-cfg.yml";
    fs.createWriteStream(dFile);

    //console.log('network cfg: ', cfgFile);
    //console.log('docker composer: ', dFile);

    var cfgContent = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));

    var lvl1_key = Object.keys(cfgContent);
    //console.log('lvl1_key ', lvl1_key);
    var buff;
    //header 1
    var req_id = 0;
    for ( var i=0; i<lvl1_key.length; i++ ) {
        var lvl1_obj = cfgContent[lvl1_key[i]];
        var lvl2_key = Object.keys(lvl1_obj);

        var idx = 0;
        var links_id=0;
        for ( var ia = 0; ia<nReqArr[req_id]; ia++) {
            // header 2
            buff = lvl1_key[i] + idx +':' + '\n';
            fs.appendFileSync(dFile, buff);
            idx++;

            // header 3
            for ( var k=0; k<lvl2_key.length; k++ ) {
                if ( lvl2_key[k] == 'environment' ) {
                    var lvl2_obj = lvl1_obj[lvl2_key[k]];
                    var lvl3_key = Object.keys(lvl2_obj);

                    buff = '  ' + lvl2_key[k] + ': ' + '\n';
                    fs.appendFileSync(dFile, buff);

                    // header 4
                    for ( var m=0; m< lvl3_key.length; m++ ) {
                        buff = '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                        fs.appendFileSync(dFile, buff);

                    }
            } else if ( lvl2_key[k] == 'image' ) {
                buff = '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                fs.appendFileSync(dFile, buff);

            } else if ( lvl2_key[k] == 'links' ) {
                var l_id = links_id%nReqArr[0];
                links_id++;

                buff = '  ' + lvl2_key[k] + ': ' + '\n';
                fs.appendFileSync(dFile, buff);

                buff = '    - ' + lvl1_obj[lvl2_key[k]] + l_id + '\n';
                fs.appendFileSync(dFile, buff);

            } else if ( lvl2_key[k] == 'expose' ) {
                buff = '  ' + lvl2_key[k] + ': ' + '\n';
                fs.appendFileSync(dFile, buff);

                //buff = '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                buff = '    - ' + port[req_id] + '\n';
                fs.appendFileSync(dFile, buff);
                port[req_id]++;

            } else {
                buff = '  ' + lvl2_key[k] + ': ' + '\n';
                fs.appendFileSync(dFile, buff);

                buff = '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                fs.appendFileSync(dFile, buff);
            }
        }
        // add a blank line
        buff = '\n';
        fs.appendFileSync(dFile, buff);

        }
        req_id++;
    }
    child_process.spawn('docker-compose', ['-f', dFile, 'up']);
    writeResponse(res, 200, 'Network ' + dFile + " was created successfully");
    console.log('Network: ' + dFile + ' was created successfully');
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

