var net = require('net'),
    co  = require('co'),
    dispatcher = require('./lib/dispatcher');

co(function *() {
  var server = net.createServer(),
      dispatch = dispatcher();

  dispatch.init();

  server.on('connection', function(c) {
    dispatch.dumpFrom(c);
  });
  
  server.listen(9339);
}).catch(function(e) {
  console.log(e);
  throw e;
});
