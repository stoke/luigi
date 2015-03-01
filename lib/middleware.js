var Transform = require('stream').Transform,
    util      = require('util'),
    fs        = require('fs'),
    crypto    = require('crypto');

var dump = [20000];

var Middleware = module.exports = function Middleware(n) {
  Transform.call(this);

  this.buffer = [];
  this.n = n;
  this.o = 0;
  this.startDecipherStream('fhsd6f86f67rt8fw78fw789we78r9789wer6renonce');
};


util.inherits(Middleware, Transform);

Middleware.prototype.startDecipherStream = function(key) {
  if (key)
    this.key = key;

  this.decipherStream = crypto.createDecipheriv("rc4", this.key, '');

  this.decipherStream.update(
    new Array(this.key.length + 1).join('a') // skips key.length bytes from decipher
  );
};

Middleware.prototype._transform = function(data, encoding, callback) {
  var id = data.readUInt16BE(0),
      payload = data.slice(7), // id (2) + length (3) + <unknown> (2)
      payloadLength = data.readUIntBE(2, 3),
      interesting = id !== 14102 && id !== 20108 && id !== 24715 && id !== 10108;
  

  console.log('%d == %d', payload.length, payloadLength);

//  payload = this.decipherStream.update(payload);


/*  if (~dump.indexOf(id)) {
    console.log('[+] Dumping %d bytes... (%d)', data.readUIntBE(2, 3), payload.length);
    
    fs.writeFileSync(
      'dump',
      Buffer.concat([data.slice(0, 6), payload])
    );

    console.log('[+] Done');
  }*/

  callback(null, data);
};
