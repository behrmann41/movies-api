const express     = require('express');
const bodyParser  = require('body-parser');
const compress    = require('compression');

const app = express();

// Basic Middleware
app.use(compress());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json(), function(err, req, res, next){
  next(new Error('INVALID_JSON', err));
});

// Routing
app.use('/', require('./routes/index'));

// Start application
app.listen(process.env.PORT || 8000, function(){
  console.info(`Who loves movies!? Listening on port: ${this.address().port}`);
});
app.on('error', function (err) {
  console.error(err);
  process.exit(1);
});

