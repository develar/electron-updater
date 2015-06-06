var commands = require('./lib/commands.js'),
	util = require('util'),
	fs = require('fs'),
	spawn = require('child_process').spawn,
	ipc = require('ipc'),
	minimist = require('minimist'),
	launch = require('./lib/launch.js'),
	directory = require('./lib/directory.js'),
	file = require('./lib/file.js')

function _launch(args) {
	console.log('relaunching app.')
	var child = spawn(args.exe, args.argv, {
		detached: true,
		cwd: args.cwd,
		stdio: [ 'ignore', 'pipe', 'pipe'] // out, err]
	});
	child.unref();
}

var argv = minimist(process.argv.slice(2))
if (argv['electron-update']) {

	var relaunch = typeof argv.relaunch === 'boolean' ? argv.relaunch : true
	var encodedArgs = argv['electron-update']
	var decodedArgs = new Buffer(encodedArgs, 'base64').toString('ascii')
	var args = JSON.parse(decodedArgs)
	// {
	//	name: appName,
	//  exe: process.execPath,
	// 	cwd: process.cwd(),
	// 	argv: process.argv
	// }

	var appDir = directory.appDir(args.appName)
	var pendingUpdatePath = path.join(appDir, '.update')
	var _updateLog = path.join(appDir, 'update.log')	
	var _log = console.log
	console.log = function (line) {
		_log(line)
		fs.appendFile(_updateLog, '- ' + line + '\n')
	}

	console.log('updating from: ' + process.pid)
	console.log('relaunch: ' + relaunch)

	// Flag an update as pending
	file.touch(pendingUpdatePath, 'INPROGRESS', function (err) {
		if(err) return console.log(err)

		// Attempt to actually udpate now.
		var app = require('app')
		var BrowserWindow = require('browser-window')

		var win = new BrowserWindow({
			width: 400,
			height: 100,
			frame: false
		})
		win.loadUrl('file://' + __dirname + '/update.html')
		ipc.on('initialize', function (event, arg) {
			event.sender.send('initialize', args)
		})

		commands.update(process.cwd(), function (err) {
			if(err) {
				// If the update fails for security reasons, then we have to attempt to relaunch this process
				// with the right permissions.
				if(err.code === 'EPERM') {
					console.log('No permission to update, elevating...')

					var elevatedArgs = process.argv.slice(1)

					// Tell the elevated process not to relaunch, we will relaunch from this process when its done.
					elevatedArgs.push('--no-relaunch')

					// relaunch self as an elevated process
					launch.elevate(args.appName, process.execPath, elevatedArgs, process.cwd(), function (err) {
						if(err) return console.log(err)
						// Watch for changes to the .update file, it will become empty when the update succeeds.
						fs.watchFile(pendingUpdatePath, {persistent: true, interval:500}, function () {
							fs.readFile(pendingUpdatePath, {encoding:'utf8'}, function (err, contents) {
								if(err) return console.log(err)
								if(contents === '') {
									// When update is done the file will be changed to have empty content
									fs.unwatchFile(pendingUpdatePath)
									if (relaunch) {
										console.log('relaunching from unelevated process.')
										_launch(args)
									}
									app.quit()
								} else if(contents === 'PENDING') {
									// Going back to a PENDING state means that the elevated process
									// failed to update for an unexpected reason. In that case
									// just shutdown and wait for the next attempt.
									fs.unwatchFile(pendingUpdatePath)
									app.quit()
								}
							})
						})
					})
				} else {
					console.log('update failed for an unexected reason.')
					console.log(err)
					file.touch(pendingUpdatePath, 'PENDING', function () {
						app.quit()
					})
				}
			} else {
				// Update was successful!
				console.log('updated succeeded!')
				file.touch(pendingUpdatePath, '', function (err) {
					if(err) console.log(err)

					// If the app was already running as admin, this flag will be missing. Go ahead and re-launch the app.
					if(relaunch) {
						console.log('relaunching app.')
						_launch(args)
					}

					app.quit()
				})
			}
		})
	})
} else {
	module.exports = commands
}