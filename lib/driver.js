var net = require('net'),
    util = require('util'),
    querystring = require('querystring');

var crlf = "\r\n",
    crlf_length = crlf.length;

function es(config, callback){
  var that = this;
  config = config || {};
  config.port = config.port || 11211;
  config.reconnect_timeout = config.reconnect_timeout || 60;
  net.Socket.call(this);
  
  var _puffer = [],
      _in_response = false,
      buffer,
      callbacks = {},
      callback_lines = {};
      current = [];
      
  this.on("connect", function(){
    this.setNoDelay(true);
    this.setKeepAlive(true);
    this.setTimeout( 1000 * config.reconnect_timeout, function(){
      
      function _reset(){
        var i = 0;
        for( var k in callbacks ){
          callbacks[k].forEach(function(callback){
            callback();
            i++;
          });
        }

        callbacks = {};
        callback_lines = {};
      }
      
      this.once("end", function(){
        if( config.port && config.host ){
          this.connect(config.port, config.host, _reset);
        } else {
          this.connect(config.port, _reset);
        }
      })
      
      this.end();
    });
  });
  
  
  if( config.port && config.host ){
    this.connect(config.port, config.host, callback);
  } else {
    this.connect(config.port, callback);
  }
  
  function _call_event(lines){
    var cb, head, foot;
    if( lines.length == 1 ){
      head = lines.pop();
      if(callbacks["next"] && callbacks["next"].length){
        cb = callbacks["next"].shift();
        callback_lines["next"].shift();
        if( callbacks["next"].length == 0 ) {
          delete callbacks["next"];
          delete callback_lines["next"];
        }
      }
      
      
    } else {
      head = lines.shift();
      foot = lines.pop();
      
      for( var k in callbacks ){
        if( head.indexOf(k) != -1 ){
          cb = callbacks[k].shift();
          if( !callbacks[k].length ) {
            delete callbacks[k];
            delete callback_lines[k];
          }
          break;
        }
      }
      
    }
    if(cb) {
      cb.apply(that, [ null, head && foot ? JSON.parse(lines.join("\n")) : (head != "ERROR" ? true : false), head, foot] );
    }
  }
  
  function resp(data){
    if( !buffer ) buffer = data.toString();
    else buffer += data.toString();
    var buffers = buffer.split(crlf);
    buffer = buffers.pop();
    
    buffers.forEach(function(item){
      current.push(item);
      if( item == "ERROR" || item == "STORED" ){
        _call_event(current);
        current = [];
      } else if( item.substr(0,3) == "END" ){
        _call_event(current);
        current = [];
      }
    });
  }
  
  this.on('data', resp);
      
  function _write(write, callback){
    var cid = "next";
    
    if( write.substr(0,3) == "get" ){
      cid = "callback=" + (new Date).getTime() + "-" + Math.round( Math.random()*(new Date).getTime() );
      write += ( write.indexOf("?") == -1 ? "?" : "&") + cid;
    }
    
    if( callbacks[cid] && callback ) {
      callbacks[cid].push(callback);
      callback_lines[cid].push(write);
    } else if(callback) {
      callbacks[cid] = [callback];
      callback_lines[cid] = [write];
    }
    
    that.write(write + crlf);
    
    return that;
  };
  
  this.get = function(key, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    if(opt) key += (key.indexOf("?") == -1 ? "?" : "&") + querystring.stringify(opt);
    return _write( "get " + key, callback );
  };
  
  this.mget = function(docs, callback){
    var qs = querystring.stringify({
      source: docs
    });
    return this.get( "/_mget?"+qs, callback );
  };
  
  this.set = function(key, value, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    if(opt) key += (key.indexOf("?") == -1 ? "?" : "&") + querystring.stringify(opt);
    
    value = JSON.stringify(value);
    
    var set_flags = 0;
  	var exp_time  = 0;
    var tml_buf = new Buffer(value.toString());
  	var value_len = tml_buf.length || 0;
  	var query = ["set", key, set_flags, exp_time, value_len];
  	
    return _write( query.join(' ') + crlf + value, callback );
  };
  
  this.up = function(key, value, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    if(opt) key += (key.indexOf("?") == -1 ? "?" : "&") + querystring.stringify(opt);
    
    key += "/_update";
    if( !value.script && !value.doc && !value.params ){ value = {doc: value}; }
    return this.set(key, value, callback);
  };
  
  this.del = function(key, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    if(opt) key += (key.indexOf("?") == -1 ? "?" : "&") + querystring.stringify(opt);
    return _write( "delete " + key, callback );
  };
  
  this.quit = function(callback){
    if(callback) this.once("end", callback);
    return this.end("quit");
  };
  
}

util.inherits(es, net.Socket);

module.exports = es;