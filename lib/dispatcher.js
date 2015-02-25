var net = require('net'),
    Middleware = require('./middleware');

var Dispatcher = module.exports = function Dispatcher() {
  if (this.__proto__ !== Dispatcher.prototype)
    return new Dispatcher();

  this.connections = [];
};

Dispatcher.prototype.init = function () {
  this.connection = net.connect(9339, 'gamea.clashofclans.com');
};

Dispatcher.prototype.dumpFrom = function(connection) {
  this.connections.push(connection);

  console.log('A new client has connected');

  this.hookEvents(connection);
};

Dispatcher.prototype.hookEvents = function(connection) {
  var clientToServer = new Middleware(true),
      serverToClient = new Middleware(false);

  connection.pipe(clientToServer);
  clientToServer.pipe(this.connection);

  this.connection.pipe(serverToClient);
  serverToClient.pipe(connection);

};
