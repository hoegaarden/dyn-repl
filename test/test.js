/* jshint multistr : true */

"use strit";

var DynRepl = require('..');
var path = require('path');
var fs = require('fs');
var os = require('os');
var spawn = require('child_process').spawn;
var net = require('net');

var files = [];

var writeFile = fs.writeFileSync.bind(fs);

function tmpnam(ext) {
	return path.join(
		os.tmpdir() ,
		String(Math.random()).concat('.').concat(ext || 'tmp')
	);
}

function replaceFileContent(name, search, replace) {
	var cmd = [
		's@' , search, '@', replace, '@g'
	].join('');
	return spawn('sed', [ '-i', cmd, name ]);
}

function mkFile(cont, ext) {
	var fname = tmpnam(ext || 'json');
	writeFile(fname, cont);
	files.push(fname);
	return fname;
}

function deleteOpenFiles(cb) {
	files.forEach(function(fname){
		fs.unlinkSync(fname);
	});
	if (typeof cb === 'function') {
		cb();
	}
}

process.on('exit', deleteOpenFiles);
process.on('SIGINT', function(){
	deleteOpenFiles(process.exit.bind(process, 1));
});


var T = module.exports = {};

T['end()s'] = function(test) {
	var file = mkFile('{}');
	var repl = DynRepl({}, {file:file});

	test.expect(1);
	test.ok( typeof repl.end === 'function' );

	repl.end(test.done);
};

T['generates and deletes socket file'] = function(test) {
	var sockPath = tmpnam();
	var file = mkFile('{\
		"config" : {\
			"dynReplSocket" : "' + sockPath + '"\
		}\
	}');
	
	test.expect(3);
	test.ok( !fs.existsSync(sockPath) );

	var repl = DynRepl({}, {file:file});

	repl.on('unlisten', function(){
		test.ok( !fs.existsSync(sockPath) );
		test.done();
	});

	repl.on('listen', function(){
		test.ok( fs.existsSync(sockPath) );
		repl.end();
	});

	repl.start();
};

T['watches file'] = function(test) {
	var sockPath0 = tmpnam();
	var sockPath1 = tmpnam();
	var file = mkFile('{\
		"config" : {\
			"dynReplSocket" : "' + sockPath0 + '"\
		}\
	}');

	var repl = DynRepl({}, {file:file}).start();

	test.expect(5);

	repl.once('listen', function(){
		test.ok( fs.existsSync(sockPath0) );

		repl.once('listen', function(){
			test.ok( !fs.existsSync(sockPath0) );
			test.ok( fs.existsSync(sockPath1) );

			repl.once('unlisten', repl.end);

			replaceFileContent(file, sockPath1, '');
		});

		replaceFileContent(file, sockPath0, sockPath1);
	});

	repl.on('end', function(){
		test.ok( !fs.existsSync(sockPath0) );
		test.ok( !fs.existsSync(sockPath1) );
		test.done();
	});
};

T['connect to socket & change/share data'] = function(test){
	var sockPath = tmpnam();
	var file = mkFile('{\
		"name" : "TEST" ,\
		"config" : {\
			"dynReplSocket" : "' + sockPath + '"\
		}\
	}');
	var shared = {
		arr : []
	};
	var client1exp = '\u001b[1G\u001b[0JTEST :: \u001b[9Gdata.arr.push("hi from number one")\r\n\u001b[33m1\u001b[39m\n\u001b[1G\u001b[0JTEST :: \u001b[9G.exit\r\n';
	var client2exp = '\u001b[1G\u001b[0JTEST :: \u001b[9Gdata.arr\r\n[ \u001b[32m\'hi from number one\'\u001b[39m ]\n\u001b[1G\u001b[0JTEST :: \u001b[9G.exit\r\n';

	var repl = DynRepl({data:shared},{file:file}).start();

	repl.on('listen', function(){
		var client1Resp = '';
		var client1 = net.connect({path:sockPath}, function(){
			client1.write('data.arr.push("hi from number one")\n.exit\n');
		});
		client1.on('data', function(d){
			client1Resp = client1Resp.concat(d);
		});
		client1.on('close', function(){
			test.ok( client1Resp === client1exp );
			done();
		});

		var client2Resp = '';
		var client2 = net.connect({path:sockPath}, function(){
			client2.write('data.arr\n.exit\n');
		});
		client2.on('data', function(d){
			client2Resp = client2Resp.concat(d);
		});
		client2.on('close', function(){
			test.ok( client2Resp === client2exp );
			done();
		});
	});

	var exitCount = 2;
	function done(){
		exitCount -= 1;
		if (exitCount) {
			return;
		}

		repl.end(test.done);
	}

};