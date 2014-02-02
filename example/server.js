"use strict";

var DynRepl = require('dyn-repl');
var http = require('http');
var PORT = process.env.npm_package_config_port || 8080;


var srv = http.createServer(function(req, res){
	req.setHeader('Content-Type','text/plain');
	req.end('Just some response!');
});

var sharedData = {
	server : srv
};
var opts = {
	verbose : true ,
	// file : './package.json'
}

var repl = DynRepl(sharedData, opts).start();

srv.listen(PORT, function(){
	console.log('server listening on port', PORT, 'yay!');
});

process.on('SIGINT', function(){
	repl.end();
	repl.on('end', process.exit);
});

