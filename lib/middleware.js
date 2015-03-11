var Transform = require('stream').Transform,
    util      = require('util'),
    fs        = require('fs'),
    crypto    = require('crypto'),
    scrambler = require('./scrambler');

var dump = [20104];

var Middleware = module.exports = function Middleware() {
  Transform.call(this);

  this.buffer = [];
  this.o = 0;
  this.startDecipherStreams('fhsd6f86f67rt8fw78fw789we78r9789wer6renonce');

  this.events = {
    10101: this.login,
    20000: this.encryption
  };
};


util.inherits(Middleware, Transform);

Middleware.prototype.startDecipherStreams = function(key) {
  if (key)
    this.key = key;

  this.decipherStreamClient = crypto.createDecipheriv("rc4", this.key, '');
  this.decipherStreamServer = crypto.createDecipheriv("rc4", this.key, '');

  this.decipherStreamClient.update(
    new Array(this.key.length + 1).join('a') // skips key.length bytes from decipher
  );

  this.decipherStreamServer.update(
    new Array(this.key.length + 1).join('a') // skips key.length bytes from decipher
  );
};

Middleware.prototype.decipherPayload = function(id, payload) {
  var decipherStream = (id < 20000) ? this.decipherStreamClient : this.decipherStreamServer;

  return decipherStream.update(payload);
};

Middleware.prototype.dispatch = function(id, payload) {
  if (!this.events[id])
    return;

  this.events[id].call(this, id, payload);
};

Middleware.prototype.login = function(id, payload) {
  this.seed = payload.readInt32BE(payload.length - 4);

  if (this.serverMid)
    this.serverMid.seed = this.seed;
};

Middleware.prototype.hookSeed = function(m) {
  this.serverMid = m;
};

Middleware.prototype.hookKey = function(m) {
  this.clientMid = m;
};

Middleware.prototype.encryption = function(id, payload) {
  this.serverRandom = payload.slice(4, payload.length - 4);

  var scramblerStream = scrambler(this.seed),
      nonce = new Buffer(this.serverRandom),
      hByte;

  for (var i = 0; i < 100; i++)
    hByte = scramblerStream.next().value;

  for (var x = 0; x < nonce.length; x++) {
    var n = scramblerStream.next().value,
        byteKey = n & hByte;
    
    nonce[x] = nonce[x] ^ byteKey;
  }

  var key = Buffer.concat([
    new Buffer('fhsd6f86f67rt8fw78fw789we78r9789wer6re'),
    nonce
  ]);

  this.startDecipherStreams(key);

  if (this.clientMid)
    this.clientMid.startDecipherStreams(key);
};

Middleware.prototype._transform = function(data, encoding, callback) {
  var id = data.readUInt16BE(0),
      payload = data.slice(7), // id (2) + length (3) + <unknown> (2)
      payloadLength = data.readUIntBE(2, 3),
      interesting = id !== 14102 && id !== 20108 && id !== 24715 && id !== 10108;
  
  payload = this.decipherPayload(id, payload);

  this.dispatch(id, payload);

  if (~dump.indexOf(id)) {
    console.log('[+] Dumping %d bytes... (%d)', data.readUIntBE(2, 3), payload.length);
    
    fs.writeFileSync(
      'dump',
      Buffer.concat([data.slice(0, 6), payload])
    );

    console.log('[+] Done');
  }

  callback(null, data);
};
