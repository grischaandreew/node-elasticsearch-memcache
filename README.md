elasticsearch-memcache
======================

nodejs elasticsearch client over memcache


Install
=======

To install the most recent release from npm, run:

    npm install elasticsearch-memcache

To install the latest from the repository, run:

    npm install path/to/elasticsearch-memcache

You need also the memcached plugin installed at your elasticsearch instance, take a look here [elasticsearch memcached plugin](http://www.elasticsearch.org/guide/reference/modules/memcached/) installable over [github elasticsearch-transport-memcached](https://github.com/elasticsearch/elasticsearch-transport-memcached)


Introduction
============

```javascript
		var es = require("elasticsearch-memcache");
		
    var client = new es({
			"host": "127.0.0.1",
			"port": 11211
		}, function(){
			
			client.set("/test/test/1", {
				"Lorizzle fo shizzle": "dolizzle sit amizzle",
				"consectetuer adipiscing": "elit.",
				"Nullam fo velit": "my shizz pizzle, suscipit quis, gravida vel, arcu.",
				"Pellentesque gangsta tortizzle.": "Sed eros. Fusce izzle dolor dapibus turpis tempizzle pimpin'."
			}, function(error, success){
				
				client.up("/test/test/1", {
					"Maurizzle ass away izzle turpis.": "Mofo izzle tortizzle.",
					"Pellentesque eleifend rhoncizzle boom shackalack.": "In bow wow wow shiznit platea dictumst."
				}, function(){
					
					client.get("/test/test/1", function(error, doc){
						console.log(doc);
						client.quit();
					})
				})
			})
		});
		
		client.on('error', function() {
		  console.log('client error', arguments);
		});

		client.on('end', function() {
		  console.log('client disconnected');
		});
```

API
============

```javascript
		.get( key, ?GET_PARAMETER, callback ) -> GET Request, get an document, indice, setting or something else over the API.
			
			es.get("/test/test/1", function(error, doc){ console.log(doc); })
			es.get("/test/test/1", { fields: "fieldkey1,fieldkey2" }, function(error, doc){ console.log(doc); })
			es.get("/_stats", function(error, stats){ console.log(stats); })
			
		.mget( docs, callback ) -> GET Request, collect multiple documents over one request
			es.mget({
				"docs": [
					{ "_index": "test", "_type": "test", "_id": 1 },
					{ "_index": "test", "_type": "test", "_id": 2 },
				]
			}, function(error, docs){})
		
		.set( key, value, ?GET_PARAMETER, callback ) -> POST Request, can be an document, the indice settings or whatever over the API.
			es.set("/test/test/1", { "fieldkey1": "fieldvalue1", "fieldkey2": "fieldvalue2" }, function(error, success){})
		
		.up( key, value, ?GET_PARAMETER, callback ) -> Update an document
			es.set("/test/test/1", { "fieldkey3": "fieldvalue3" }, function(error, success){})
		
		.del( key, ?GET_PARAMETER, callback ) -> send DELETE Request, can delete and document indice or something else over the API
			es.del("/test/test/1", function(error, success){})
			
		.quit(callback) -> quit connection
			es.quit(function(){})
```


GitHub information
==================

The source code is available at https://github.com/grischaandreew/node-elasticsearch-memcache
You can either clone the repository or download a tarball of the latest release.


Examples
========

For examples look in the example.js file. You can execute the examples using node.

    $ node example.js