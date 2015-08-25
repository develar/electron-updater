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
	watcher = require('./lib/watcher.js'),
	errors = require('./lib/errors.js'),
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

	// listen for uncaught exceptions.
	errors.listen(logger, pendingUpdatePath);

	logger.log('Starting Update:')
	logger.log('  args: ' + util.inspect(args))

	// Flag an update as pending
	file.touch(pendingUpdatePath, 'INPROGRESS', function (err) {
		if(err) return errors.handle(err)

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
				if(err) {
					// If the update fails for security reasons, then we have to attempt to relaunch this process
					// with the right permissions.
					if(err.code === 'EPERM') {
						logger.log('No permission to update, elevating...')

						var elevatedArgs = process.argv.slice(1)
						// Tell the elevated process not to relaunch, we will relaunch from this process when its done.
						elevatedArgs.push('--no-relaunch')

						// relaunch self as an elevated process
						launch.elevate(args.publisher, args.appName, process.execPath, elevatedArgs, process.cwd(), function (err) {
							if(err) return errors.handle(err);
							// Watch for changes to the .update file, it will become empty when the update succeeds.
							watcher.watch(pendingUpdatePath, function (err) {
								if (err) return errors.handle(err);
								file.touch(pendingUpdatePath, function () {
									if (relaunch) {
										logger.log('relaunching from unelevated process.')
										launch.detached(args, logger)
									}
									process.exit(0);
								})
							})
						})
					} else {
						errors.handle(err);
					}
				} else {
					// Update was successful!
					logger.log('updated succeeded.')
					file.touch(pendingUpdatePath, '', function (err) {
						if(err) logger.log(err)

						// If the app was already running as admin, this flag will be missing. Go ahead and re-launch the app.
						if(relaunch) launch.detached(args, logger)

						process.exit(0);
					})
				}
			})
		})
	})
} else {
	module.exports = commands
}