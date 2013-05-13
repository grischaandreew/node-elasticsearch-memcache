var es = require("./lib/driver");

function test_case_sets(callback) {
  console.log( "start test case: set data" );
  var z = 0, zm = 100000;
  var start = new Date;
  
  function done(){
    end = new Date;
    
    var diff = end-start;
    console.log( zm + " set in " + diff+ "ms" );
    console.log( (diff/zm).toFixed(4) + "ms per request" );
    callback();
  }
  
  function next(){
    client.set('/test/test/' + z, {
      test: "test " + z
    }, function(){
      z++;
      if( z >= zm  ) {
        return done();
      }
      next();
    } );
  }
  
  next();
}

function test_case_gets(callback) {
  console.log( "start test case: get data" );
  var z = 0, zm = 100000;
  var start = new Date;
  
  function done(){
    end = new Date;
    
    var diff = end-start;
    console.log( zm + " get in " + diff+ "ms" );
    console.log( (diff/zm).toFixed(4) + "ms per request" );
    callback();
  }
  
  function next(){
    console.log('/test/test/' + z);
    client.get('/test/test/' + z, function(error, success){
      z++;
      console.log(z);
      if( z >= zm  ) {
        return done();
      }
      next();
    } );
  }
  
  next();
}

function install_indice_test(callback) {
  console.log( "start test case: install indice /test" );
  client.set("/test", {
    "settings": {
      "index": {
        "number_of_shards" : 1,
        "number_of_replicas" : 0
      }
    }
  }, function(){
    console.log( "end test case: install indice" );
    callback();
  } );
}

function remove_indice_test(callback) {
  console.log( "start test case: remove indice /test" );
  client.del("/test", function(){
    console.log( "end test case: remove indice /test" );
    callback();
  } );
}

function main(){
  var cases = [
    //install_indice_test,
    //test_case_sets,
    test_case_gets,
    remove_indice_test
  ];
  
  function n(){
    var fn = cases.shift();
    if( !fn ){
      client.quit();
      return;
    }
    fn(n);
  }
  
  n();
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
