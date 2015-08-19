var commands = require('./lib/commands.js'),
	util = require('util'),
	fs = require('fs'),
	app = require('app'),
	spawn = require('child_process').spawn,
	ipc = require('ipc'),
	minimist = require('minimist'),
	launch = require('./lib/launch.js'),
	directory = require('./lib/directory.js'),
	file = require('./lib/file.js'),
	Logger = require('./lib/logger.js'),
	BrowserWindow = require('browser-window');

var argv = minimist(process.argv.slice(2));
if (argv['electron-update']) {


	var relaunch = typeof argv.relaunch === 'boolean' ? argv.relaunch : true
	var encodedArgs = argv['electron-update']
	var decodedArgs = new Buffer(encodedArgs, 'base64').toString('ascii')
	var args = JSON.parse(decodedArgs)
	// {
	//	name: appName,
	//  publisher: publisher,
	//  exe: process.execPath,
	// 	cwd: process.cwd(),
	// 	argv: process.argv,
	//  debug: true
	// }

	var appDir = directory.appDir(args.publisher, args.appName)
	var electronDir = path.dirname(args.exe)
	var pendingUpdatePath = path.join(appDir, '.update')
	var logger = new Logger(appDir, Logger.appendToFile, args.debug)
	
	function _launch(args, logger) {
		logger.log('launching ' + args.exe)
		logger.log('  argv: ' + util.inspect(args.argv))
		logger.log('  cwd: ' + args.cwd)
		var child = spawn(args.exe, args.argv, {
			detached: true,
			cwd: args.cwd,
			stdio: [ 'ignore', 'ignore', 'ignore']
		});
		child.unref();
	}

	var unexpectedErrorWindow = null;
	function handleUnexpectedError(unexpectedError) {
		logger.error('update failed for an unexected reason.')
		logger.error(util.inspect(unexpectedError))
		file.touch(pendingUpdatePath, '', function (err) {
			if(err) logger.error(err)
			if(!unexpectedErrorWindow) {
				unexpectedErrorWindow = new BrowserWindow({
					width: 800,
					height: 600,
					'auto-hide-menu-bar': true
				})
				unexpectedErrorWindow.on('closed', function () {
					process.exit(1);
				})
				unexpectedErrorWindow.loadUrl('file://' + __dirname + '/error.html')
				unexpectedErrorWindow.webContents.on('did-finish-load', function() {
	            	unexpectedErrorWindow.webContents.send('error-info', util.inspect(unexpectedError));
	            })
			}
		})
	}
	process.on('uncaughtException', handleUnexpectedError)

	logger.log('Starting Update:')
	logger.log('  args: ' + util.inspect(args))

	// Flag an update as pending
	file.touch(pendingUpdatePath, 'INPROGRESS', function (err) {
		if(err) return handleUnexpectedError(err)

		// Attempt to actually udpate now.
		var win = new BrowserWindow({
			width: 400,
			height: 100,
			frame: false
		})
		win.on('close', function (e) {
			logger.log('Window is closing...')
		})
		win.loadUrl('file://' + __dirname + '/update.html')
		ipc.on('initialize', function (event, arg) {
			logger.log('Initialized.')
			event.sender.send('initialize', args)

			commands.update(process.cwd(), electronDir, logger, function (err) {
				logger.log('Finishing update...');
				if(err) {
					// If the update fails for security reasons, then we have to attempt to relaunch this process
					// with the right permissions.
					logger.log(err)

					if(err.code === 'EPERM') {
						logger.log('No permission to update, elevating...')

						var elevatedArgs = process.argv.slice(1)

						// Tell the elevated process not to relaunch, we will relaunch from this process when its done.
						elevatedArgs.push('--no-relaunch')

						// relaunch self as an elevated process
						launch.elevate(args.publisher, args.appName, process.execPath, elevatedArgs, process.cwd(), function (err) {
							if(err) return logger.log(err)
							// Watch for changes to the .update file, it will become empty when the update succeeds.
							fs.watchFile(pendingUpdatePath, {persistent: true, interval:500}, function () {
								fs.readFile(pendingUpdatePath, {encoding:'utf8'}, function (err, contents) {
									if(err || contents === 'PENDING') {
										// Going back to a PENDING state means that the elevated process
										// failed to update for an unexpected reason. In that case
										// just shutdown and wait for the next attempt.
										fs.unwatchFile(pendingUpdatePath)
										handleUnexpectedError(err)
									} else if(contents === '') {
										// When update is done the file will be changed to have empty content
										fs.unwatchFile(pendingUpdatePath)
										if (relaunch) {
											logger.log('relaunching from unelevated process.')
											_launch(args, logger)
										}
										app.quit()
									}
								})
							})
						})
					} else {
						handleUnexpectedError(err)
					}
				} else {
					// Update was successful!
					logger.log('updated succeeded.')
					file.touch(pendingUpdatePath, '', function (err) {
						if(err) logger.log(err)

						// If the app was already running as admin, this flag will be missing. Go ahead and re-launch the app.
						if(relaunch) _launch(args, logger)

						app.quit()
					})
				}
			})
		})
		ipc.on('log', function (event, arg) {
			logger.log(arg)
		})
	})
} else {
	module.exports = commands
}