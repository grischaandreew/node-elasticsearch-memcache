var es = require("./lib/driver");

function main(){
  var z = 0, zm = 100000;
  console.log( "start test case" );
  var start = new Date;
  
  function set_done(){
    end = new Date;
    
    var diff = end-start;
    console.log( zm + " set in " + diff+ "ms" );
    console.log( (diff/zm).toFixed(4) + "ms per request" );
    client.quit();
  }
  
  function set(){
    client.set('/test/test/' + z, {
      test: "test " + z
    }, function(){
      z++;
      if( z >= zm  ) {
        return set_done();
      }
      set();
    } );
  }
  
  set();
}

var client = new es({
  host: "127.0.0.1",
  port: 11211
}, main);

client.on('error', function() {
  console.log('client error', arguments);
});

client.on('end', function() {
  console.log('client disconnected');
});
