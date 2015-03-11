// Pretty much copied from https://github.com/clanner/cocdp/wiki/Protocol, thank you clanner!

var Long = require('long');

Long.prototype.rshift = function(n) { // for whatevs reason, this is _not_ equal to the normal right shift
  var highbits = 0,
      num = this.getLowBitsUnsigned();

  if (num & Math.pow(2, 31))
    highbits = (Math.pow(2, n)-1) * Math.pow(2, (32-n));
  
  var pow = Math.pow(2, n),
      lowbits = Math.floor(num/pow);

  return new Long(lowbits|highbits, 0, true);
};

function mixbuffer(buffer) {
  var i = 0,
      j = 0, v4, v6;

  while (i < 624) { 
    i++;

//    v4 = (buffer[i % 624] & 0x7FFFFFFF) + (buffer[j] & 0x80000000);
    v4 = buffer[i % 624].and(0x7FFFFFFF).add(buffer[j].and(0x80000000));

//    v6 = (v4 >> 1) ^ buffer[(i+396) % 624];
    v6 = v4.rshift(1).xor(buffer[(i+396) % 624]);

    if (v4.and(1).getLowBits())
      v6 = v6.xor(0x9908B0DF);

    buffer[j] = v6;

    j++;
  }
}

module.exports = function *scrambler(seed) {
  var buffer = [],
      bufferIndex = 0, currentValue;
  
  seed = Long.fromInt(seed);

  // seedbuffer
  for (var i = 0; i < 624; i++) {
    buffer.push(seed);

    seed = new Long(1812433253).multiply( seed.xor( seed.rshift(30) ).add(1) );
    seed.high = 0;
  }


  while (true) {
    if (!bufferIndex)
      mixbuffer(buffer);
    
    currentValue = buffer[bufferIndex];

    bufferIndex = (bufferIndex + 1) % 624;

//    currentValue ^= (currentValue >> 11) ^ ((currentValue ^ (currentValue >> 11)) << 7) & 0x9D2C5680;
    currentValue = currentValue.xor( currentValue.rshift(11) )
                               .xor( currentValue.xor( currentValue.rshift(11) )
                                                  .shiftLeft(7) 
                                                  .and( 0x9D2C5680 ));

    currentValue = currentValue.xor( currentValue.shiftLeft(15).and( 0xEFC60000 ) )
                               .rshift(18)
                               .xor(currentValue)
                               .xor( currentValue.shiftLeft(15).and(0xEFC60000) );


//    currentValue = ((currentValue ^ (currentValue << 15) & 0xEFC60000) >> 18) ^ 
//      currentValue ^ (currentValue << 15) & 0xEFC60000;

//    if (currentValue < 0)
//      currentValue = ~currentValue + 1;

    yield currentValue.getLowBitsUnsigned() % 256;
  }
};

