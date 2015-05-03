var commands = require('./lib/commands.js'),
	directory = require('./lib/directory.js'),
	fs = require('fs'),
	spawn = require('child_process').spawn

console.log('loading electron updater...')
var i = process.argv.indexOf('--electron-update')
if (i > 0) {
	var app = require('app'),
		BrowserWindow = require('browser-window')

	var args = JSON.parse(process.argv[i + 1])
	// {
	//	name: appName,
	// 	cwd: process.cwd(),
	// 	argv: process.argv
	// }

	app.on('ready', function () {
		// todo: show updater splash...
		commands.update(function (err) {
			if(err) return console.log('' + util.inspect(err))			
			console.log('updated!')
			var tmpDir = path.join(directory.appData(), args.appName)
			var updateFile = path.join(tmpDir, '.update')
			fs.unlink(updateFile, function () {
				var execPath = args.argv.shift()
				var child = spawn(execPath, args.argv, {
					detached: true,
					cwd: args.cwd,
					stdio: [ 'ignore', 'pipe', 'pipe'] // out, err]
				});
				child.unref();

				console.log('restarting app!')
				app.quit()
			})
		})
	})
} else {
	module.exports = commands
}