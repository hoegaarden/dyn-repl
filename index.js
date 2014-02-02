"use strict";

var Repl = require('repl');
var fs = require('fs');
var net = require('net');
var path = require('path');
var Emitter = require('events').EventEmitter;
var util = require('util');

var CONF_KEY = 'dynReplSocket';

function DynRepl(ctx, opts) {
	if (!(this instanceof DynRepl)) {
		return new DynRepl(ctx, opts);
	}

	var self = this;

	Emitter.call(self);

	var prompt_ = ':: ';
	var sockPath_;
	var srv_;
	var watcher_;
	
	opts = opts || {};
	var verbose_ = opts.verbose || false;
	var file = opts.file || './package.json';

	watcher_ = getWatcher(file);

	function getWatcher(file) {
		file = path.resolve(file);
		var watcher = fs.watch(file, {permanent:false});

		watcher.on('change', function(){
			watcher_.close();
			watcher_ = getWatcher(file);
			readUncachedFile(file, reInit);
		});

		return watcher;
	}

	function log() {
		if (verbose_) {
			console.log.apply(console, Array.prototype.slice.call(arguments));
		}
	}

	function reInit(cont) {
		if (!cont) {
			return stopRepl();
		}

		var newPath = (cont.config||{})[CONF_KEY] || null;

		if (newPath === sockPath_) {
			return self;
		}

		if (newPath) {
			stopRepl(function(){
				sockPath_ = newPath;
				prompt_ = (cont.name||'dynRepl').concat(' :: ') || prompt_;
				startRepl();
			});
		} else {
			stopRepl();
		}

		return self;
	}

	function readUncachedFile(file, cb) {
		file = path.resolve(file);

		if (require.cache.hasOwnProperty(file)) {
			delete require.cache[file];
		}

		var content = null;
		try {
			content = require(file);
		} catch(e) {
			;
		}
		cb(content);
		return self;
	}

	function startRepl(cb) {
		if (!sockPath_) {
			return self;
		}

		var srv = net.createServer(function(sock){
			var repl = Repl.start({
				prompt : prompt_ ,
				input : sock ,
				output : sock ,
				terminal : true ,
				useColors  : true ,
				useGlobal : false
			}).on('exit', function(){
				sock.end();
			});

			Object.keys(ctx).forEach(function(key){
				repl.context[key] = ctx[key];
			});

			self.emit('connection', sock, repl);
		}).on('error', function(e){
			log('REPL Error:', e);
			self.emit('error', e);
		});

		srv.unref();

		srv.listen(sockPath_, function(){
			srv_ = srv;
			log('REPL listening on', sockPath_);
			self.emit('listen', srv);
			callCb(cb);
		});

		return self;
	}

	function stopRepl(cb) {
		if (srv_ && srv_.close) {
			srv_.close(function(){
				srv_ = undefined;
				log('REPL on', sockPath_, 'closed');
				self.emit('unlisten', srv_);
				callCb(cb);
			});
		} else {
			callCb(cb);
		}
		return self;
	}

	function callCb(cb) {
		if (typeof cb === 'function') {
			cb();
		}
	}

	self.end = function(cb){
		if (watcher_ && watcher_.close()) {
			watcher_.close();
		}
		stopRepl(function(){
			callCb(cb);
			self.emit('end');
		});
		return self;
	};

	self.start = function(){
		readUncachedFile(file, reInit);
		return self;
	};

	return self;
}
util.inherits(DynRepl, Emitter);

module.exports = DynRepl;
