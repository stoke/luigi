var Transform = require('stream').Transform,
    util      = require('util');

var Middleware = module.exports = function Middleware(n) {
  Transform.call(this);

  this.buffer = [];
  this.n = n;
};

util.inherits(Middleware, Transform);

Middleware.prototype._transform = function(data, encoding, callback) {
  var id = data.readUInt16BE(0),
      interesting = id !== 14102 && id !== 20108 && id !== 24715 && id !== 10108;
  
  if (interesting)
    console.log(data.readUInt16BE(0));

  if (this.n)
    console.log('clientToServer');
  else
    console.log('serverToClient');

  callback(null, data);
};
