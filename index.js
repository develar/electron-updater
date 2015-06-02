var commands = require('./lib/commands.js'),
	util = require('util'),
	fs = require('fs'),
	spawn = require('child_process').spawn,
	ipc = require('ipc'),
	AppDirectory = require('appdirectory')

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

		var win = new BrowserWindow({ 
			width: 400,
			height: 100,
			frame: false
		})
    win.loadUrl('file://' + __dirname + '/update.html')
    ipc.on('initialize', function (event, arg) {
    	event.sender.send('initialize', args)
    })

    var _log = console.log
    console.log = function (line) {
    	_log(line)
    	fs.appendFile('update.log', line + '\n')
    }

		commands.update(process.cwd(), function (err) {
			if(err) return console.log(err)
			var dirs = new AppDirectory(args.appName)
			var appDir = path.dirname(dirs.userData())
			var updateFile = path.join(appDir, '.update')
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