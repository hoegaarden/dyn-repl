#!/usr/bin/env node

// stolen from https://gist.github.com/jakwings/7772580

"use strict";

var addr = (
  process.argv[2] ||
  process.env.DYN_REPL_SOCK ||
  process.env.npm_package_config_dynReplSocket
);

var net = require('net');
var socket = net.connect(addr);
 
process.stdin.pipe(socket);
 
/// For backwards compatibility with Node program older than v0.10,
/// readable streams switch into "flowing mode" when a 'data' event handler
/// is added, or when the pause() or resume() methods are called.
process.stdin.on('data', function (buffer) {
  if (buffer.length === 1 && buffer[0] === 0x04) {  // EOT
    process.stdin.emit('end');  // process.stdin will be destroyed
    process.stdin.setRawMode(false);
    process.stdin.pause();  // stop emitting 'data' event
  }
});
 
/// this event won't be fired if REPL is exited by '.exit' command
process.stdin.on('end', function () {
  console.log('.exit');
  socket.destroy();
});
 
socket.pipe(process.stdout);
 
socket.on('connect', function () {
  console.log('Connected.');
  //process.stdin.resume();  // already in flowing mode
  process.stdin.setRawMode(true);
});
 
socket.on('close', function close() {
  console.log('Disconnected.');
  socket.removeListener('close', close);
});

