var Transform = require('stream').Transform,
    util      = require('util'),
    fs        = require('fs'),
    crypto    = require('crypto'),
    scrambler = require('./scrambler');

var dump = [14102, 24104, 14113, 24101, 24113];

var Middleware = module.exports = function Middleware() {
  Transform.call(this);

  this.buffer = [];
  this.o = 0;
  this.startDecipherStreams('fhsd6f86f67rt8fw78fw789we78r9789wer6renonce');

  this.events = {
    10101: this.login,
    20000: this.encryption,
    14102: this.endClientTurn
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

  return this.events[id].call(this, id, payload);
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

Middleware.prototype.endClientTurn = function(id, payload) {
  var newPayload = new Buffer(payload);

  for (var i = 4; i < 8; i++)
    newPayload[i] = 0;
};

Middleware.prototype._transform = function(data, encoding, callback) {
  var id = data.readUInt16BE(0),
      payload = data.slice(7), // id (2) + length (3) + <unknown> (2)
      payloadLength = data.readUIntBE(2, 3),
      interesting = id !== 14102 && id !== 20108 && id !== 24715 && id !== 10108;
  
  var decryptedPayload = this.decipherPayload(id, payload);

  var newPayload = this.dispatch(id, decryptedPayload);

  if (~dump.indexOf(id)) {
    console.log('[+] Dumping %d bytes... (%d)', data.readUIntBE(2, 3), decryptedPayload.length);

    console.log(decryptedPayload);
    
    fs.writeFileSync(
      'dumps/' + id.toString(),
      Buffer.concat([data.slice(0, 7), decryptedPayload])
    );

    console.log('[+] Done');
  }

  if (newPayload) {
    var keyByte;

    for (var i = 0; i < payloadLength; i++) {
      keyByte = payload[i] ^ decryptedPayload[i]; // this will get the original rc4 byte used in the keystream

      payload[i] = newPayload[i] ^ keyByte; // now we re-encode the new payload
    }

    data = Buffer.concat([
      data.slice(0, 7),
      payload
    ]);
  }

  callback(null, data);
};
