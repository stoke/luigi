var Readable     = require('stream').Readable,
    util         = require('util'),
    _            = require('lodash'),
    EventEmitter = require('events').EventEmitter;

// I hate node streams sometimes
var Packetize = module.exports = function Packetize(socket) {
  var self = this;

  Readable.call(this);

  var buffer       = this.buffer       = [];
  var socketBuffer = this.socketBuffer = new Buffer(0);
  var ee           = this.ee           = new EventEmitter;

  socket.on('data', function bufferize(chunk) {
    if (self.socketBuffer.length)
      chunk = Buffer.concat([self.socketBuffer, chunk]);

    self.socketBuffer = self.socketBuffer = new Buffer(0);

    console.log(chunk);

    if (!chunk.length)
      throw new Error;

    var length  = chunk.readUIntBE(2, 3),
        payload = chunk.slice(7);
    
    if (payload.length < length)
      self.socketBuffer = chunk;
    else if (payload.length == length) {
      self.buffer.push(chunk);
      ee.emit('data');
    }
    else if (payload.length > length) {
      console.log('%d > %d', payload.length, length);

      self.buffer.push(chunk.slice(0, 7 + length));
      ee.emit('data');

      bufferize(chunk.slice(7 + length));
    }
  });
};

util.inherits(Packetize, Readable);

Packetize.prototype._read = function() {
  var self = this;

  this.ee.on('data', function() {
    self.buffer.forEach(function(packet) {
      self.push(packet);
    });

    self.buffer = [];
  });
};
