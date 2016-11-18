'use strict';

var SwaggerExpress = require('swagger-express-mw');
var express = require('express');
var app = express();
module.exports = app; // for testing

app.use('/swagger', express.static('./node_modules/swagger-ui/dist'));
app.use('/api-docs', express.static('./api/swagger'));

var config = {
  appRoot: __dirname // required config
};

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  // install middleware
  swaggerExpress.register(app);

  var port = process.env.PORT || 8080;
  app.listen(port);

  if (swaggerExpress.runner.swagger.paths['/deploy']) {
    console.log('Sample HFC nodejs is running - try this:\nhttp://localhost:8080/swagger/?url=/api-docs/swagger.yaml#/');
  }
});
