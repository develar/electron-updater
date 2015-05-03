var commands = require('./lib/commands.js'),
	executor = require('./lib/executor.js'),
	spawn = require('child_process').spawn

console.log('loading electron updater...')
var i = process.argv.indexOf('--electron-update')
if (i > 0) {
	var app = require('app'),
		BrowserWindow = require('browser-window')

	var arg = process.argv[i + 1]
	var args = JSON.parse(process.argv[i + 1])
	// {
	// 	execPath: process.execPath,
	// 	cwd: process.cwd(),
	// 	argv: process.argv
	// }

	app.on('ready', function () {
		// todo: show updater splash...
		commands.update(function (err) {
			if(err) return console.log('' + util.inspect(err))			
			console.log('updated!')
			//var execName = path.basename(process.execPath)

			args.argv.shift()
			var child = spawn(args.execPath, args.argv, {
				detached: true,
				cwd: args.cwd,
				stdio: [ 'ignore', 'pipe', 'pipe'] // out, err]
			});
			child.unref();
			
			console.log('restarting app!')
			app.quit()
		})
	})
} else {
	module.exports = commands
}