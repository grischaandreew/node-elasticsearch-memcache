var net = require('net'),
    util = require('util'),
    querystring = require('querystring');

var crlf = "\r\n",
    crlf_length = crlf.length;

function es(config, callback){
  var that = this;
  config = config || {};
  config.port = config.port || 11211;
  config.reconnect_timeout = config.reconnect_timeout || 120;
  config.timeout = config.timeout || 1000 * 120;
  
  net.Socket.call(this);
  
  
  var __queue = [], _in_progress = false;
  
  var _puffer = [],
      _in_response = false,
      buffer,
      callbacks = {},
      callback_lines = {};
      current = [];
  
  
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
    _in_progress = false;
    _check_next();
  }
  
  
  function reconnect(){
    _in_progress = true;
    if( config.port && config.host ){
      that.connect(config.port, config.host, _reset);
    } else {
      that.connect(config.port, _reset);
    }
  }
  
  this.on("connect", function(){
    
    this.setNoDelay(true);
    this.setKeepAlive(true);
    this.setTimeout( 1000 * config.reconnect_timeout, function(){
      _in_progress = true;
      this.once("end", reconnect);
      try {
        this.end("quit");
      } catch(err) {
        reconnect();
      }
    });
  });
  
  if( config.port && config.host ){
    this.connect(config.port, config.host, callback);
  } else {
    this.connect(config.port, callback);
  }
  
  this.on("error", function(){
    _in_progress = true;
    this.once("end", reconnect);
    try {
      this.end("quit");
    } catch(err) {
      reconnect();
    }
  });
  
  
  function _call_event(lines){
    _in_progress = false;
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
    _check_next();
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
  
  
  
  function _check_next(){
    var n = __queue.shift();
    if(!n) return;
    
    _in_progress = false;
    _write(n[0], n[1]);
  };
  
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
    
    if(_in_progress && cid) {
      __queue.push([write, callback]);
      return that;
    }
    
    if(cid) {
      _in_progress = true;
    }
    try {
      that.write(write + crlf);
    } catch(err){
      __queue.push([write, callback]);
      if( config.port && config.host ){
        this.connect(config.port, config.host, _reset);
      } else {
        this.connect(config.port, _reset);
      }
    }
    
    return that;
  };
  
  this._in_progress = function(){
    return _in_progress;
  }
  
  
  
  this.get = function(key, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    if(opt) key += (key.indexOf("?") == -1 ? "?" : "&") + querystring.stringify(opt);
    /*
    var status = false,
        ti = setTimeout(function(){
          status = true;
          callback(new Error("call timeout"), null);
        }, config.timeout);
    */
    return _write( "get " + key, function(error, success){
      //if(status) return;
      //clearTimeout(ti);
      if( error == null && success == null ){
        that.get(key, opt, callback);
      } else {
        callback(error, success)
      }
    } );
  };
  
  this.mget = function(docs, callback){
    var qs = querystring.stringify({
      source: docs
    });
    /*
    var status = false,
        ti = setTimeout(function(){
          status = true;
          callback(new Error("call timeout"), null);
        }, config.timeout);
    */
    return this.get( "/_mget?"+qs, function(error, success){
      //if(status) return;
      //clearTimeout(ti);
      if( error == null && success == null ){
        that.mget(docs, callback);
      } else {
        callback(error, success)
      }
    } );
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
  	/*
  	var status = false,
        ti = setTimeout(function(){
          status = true;
          callback(new Error("call timeout"), null);
        }, config.timeout);
    */
    return _write( query.join(' ') + crlf + value, function(error, success){
      //if(status) return;
      //clearTimeout(ti);
      if( error == null && success == null ){
        that.set(key, value, opt, callback);
      } else {
        callback(error, success)
      }
    } );
  };
  
  this.up = function(key, value, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    if(opt) key += (key.indexOf("?") == -1 ? "?" : "&") + querystring.stringify(opt);
    
    key += "/_update";
    if( !value.script && !value.doc && !value.params ){ value = {doc: value}; }
    /*
    var status = false,
        ti = setTimeout(function(){
          status = true;
          callback(new Error("call timeout"), null);
        }, config.timeout);
    */
    return this.set(key, value, function(error, success){
      //if(status) return;
      //clearTimeout(ti);
      if( error == null && success == null ){
        that.up(key, value, opt, callback);
      } else {
        callback(error, success)
      }
    });
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


function pool(config, callback){
  config = config || {};
  config.port = config.port || 11211;
  config.reconnect_timeout = config.reconnect_timeout || 60;
  config.size = config.size || 10;
  
  var pool = [];
  var queue = [];
  var that = this;
  
  (function(){
    var i, steps = 0, step = 0;
    for( i=0; i < config.size; i++ ){
      steps++;
      (function(){
        var socket = new es(config, function(){
          step++;
          pool.push(socket);
          if( step >= steps ){
            if(callback) callback(that);
          }
        });
      })();
    }
  })();
  
  
  function cmd(){
    var _args = Array.prototype.slice.call(arguments);
    var i, l = pool.length, socket;
    for( i = 0; i < l; i++){
      if(!pool[i]._in_progress()){
        socket = pool[i];
        break;
      }
    }
    if(socket){
      socket[_args.shift()].apply(socket, _args);
    } else {
      queue.push(_args);
    }
    return that;
  }
  
  function check(){
    var p = queue.shift();
    if(!p) return;
    cmd.apply(process, p);
  }
  
  this.get = function(key, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    cmd("get", key, opt, function(){
      check();
      callback.apply(process, arguments);
    });
    return that;
  };
  
  this.mget = function(docs, callback){
    cmd("mget", docs, function(){
      check();
      callback.apply(process, arguments);
    });
    return that;
  };
  
  this.set = function(key, value, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    
    cmd("set", key, value, opt, function(){
      callback.apply(process, arguments);
      check();
    });
    return that;
  };
  
  this.up = function(key, value, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    cmd("up", key, value, opt, function(){
      check();
      callback.apply(process, arguments);
    });
    return that;
  };
  
  this.del = function(key, opt, callback){
    if( typeof(opt) == "function" ) { callback = opt; opt = null; }
    cmd("del", key, opt, function(){
      check();
      callback.apply(process, arguments);
    });
    return that;
  };
  
  this.quit = function(callback){
    var steps = 0, step = 0;
    pool.forEach(function(socket){
      steps++;
      socket.quit(function(){
        step++;
        if( step >= steps ){ if(callback) callback(); }
      });
    });
    return that;
  };
}

es.pool = pool;
module.exports = es;