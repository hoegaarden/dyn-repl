# dyn-repl

## Install

```sh
$ npm install [-S] dyn-repl
    # or
$ npm install [-S] hoegaarden/dyn-repl
```

## Test

```sh
$ npm test
```

## Description

This module can be used to manage a [`REPL`][repl] exposed via a socket. The module watches `package.json` (or any other file, for that matter), if it finds the key `/config/dynReplSocket` it tries to start the socket server on the path given in this key.

It's ment for being used in server applications or other long running proesses, where you perhaps want to inspect internals in the future but you don't want to have a socket/REPL open all the time and don't want to restart the process.

### Example

```json
// pakage.json
{
	"name" : "myCoolApp" ,
    "dependencies" : {
    	"dyn-repl" : "*"
    } ,
    "scripts" : {
    	"start" : "node myCoolApp.js" ,
        "repl" : "DYN_REPL_SOCK=\"$npm_package_config_dynReplSocket\" npm run dyn-repl connect"
    }
}
```

```js
// myCoolApp.js
var DynRepl = require('dyn-repl');

// ... the cool application code itself ...

var exposedData = {
	app : app ,
    routes : routes ,
    ... : ...
}

var repl = DynRepl(exposedData).start();

process.on('exit', repl.end);
process.on('SIGINT', function(){
	repl.end( process.exit.bind(process, 1) );
});
```

So now when you start your application with `npm start` no socket server is started. But when you add

```json
	"config" : {
    	"dynReplSocket" : "/tmp/temporary.sock"
    }
```

to yoyr `package.json` the socket server exposing the REPL gets started. Now you either can use `socat` or similar to connect to said socket, or you just call

```sh
$ npm run repl
    ...
Connected.
myCoolApp :: console.log(app)
{ ... }
undefined
myCoolApp :: ^D
Disconnected.
$ 
```

Changing `dynReplSocket` in `package.json` again to something falsy terminates the socket server again.

## Constructor

### `DynRepl(data, opts)`

#### `data`

An Object with all the data the REPL should have access to

#### `opts`

 - `verbose`: default `false`, if set to true, it will print some messages and warnings to `STDOUT`
 - `file`: default: `./package.json`, the file it should watch and read the path to the socket from

## Methods

### `#start()`
Starts watching the file for configured socket path

### `#end(cb)`
Stops wathing the file and closes the socket server (if no more clients are connected)

## Events

### `listen`
... when a client connects to the socket
### `connection`
... when a client connects to the socket
### `unlisten`
... when a socket server gets destroyed
### `end`
... when `end()` is called and the socket server is shut down
### `error`
... on some error(s)

## Client

The client shipped with this module is shamelessly stolen from [jakwings][stolen] ... Thank you!

[repl]: http://nodejs.org/api/repl.html
[stolen]: https://gist.github.com/jakwings/7772580