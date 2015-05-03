var util = require('util'),
	spawn = require('child_process').spawn,
	fs = require('fs')

function exec(execPath, cwd, args, callback) {

	console.log('executing: ')
	console.log('  ' + execPath)
	console.log('  ' + util.inspect(args))
	
	//var out = fs.openSync('./out.log', 'a')
    //var err = fs.openSync('./err.log', 'a')

	var child = spawn(execPath, args, {
		detached: true,
		cwd: cwd,
		stdio: [ 'ignore', 'pipe', 'pipe'] // out, err]
	});
	child.unref();
	callback()
}

module.exports = {
	exec: exec
}