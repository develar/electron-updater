var util = require('util'),
	async = require('async'),
	semver = require('semver'),
	path = require('path'),
	checker = require('./check.js'),
	updater = require('./update.js'),
	context = require('./context.js'),
	exists = require('./exists.js'),
	copier = require('./copier.js'),
	file = require('./file.js'),
	Logger = require('./logger.js'),
	directory = require('./directory.js'),
	assert = require('assert'),
	EventEmitter = require('events').EventEmitter,
	spawn = require('child_process').spawn;

function expect() {
	var types = []
	var args = arguments[arguments.length - 2]
	var values = []
	for(var i = 0, n = arguments.length - 1; i < n; i++) {
		types.push(arguments[i])
	}
	var x = 0
	for(var i = 0, n = types.length; i < n; i++) {
		if (typeof args[x] === types[i]) {
			values[i] = args[x++]
		}
	}
	arguments[arguments.length - 1](values)
}

function ElectronCommands() {
}

function update(appDir, electronDir, logger, callback) {
	expect('string', 'string', 'object', 'function', arguments, function (values) {
		appDir = values[0] || path.dirname(process.mainModule.filename)
		electronDir = values[1] || null
		logger = values[2] || Logger.default
		assert.ok(callback = values[3])
	})
	logger.log('appDir: ' + appDir)
	logger.log('electronDir: ' + electronDir)
	check(appDir, logger, function (err, results) {
		if(err) return callback(err)
		if(!results) return callback()

		logger.log('Updating...')
		updater.update(results, electronDir, logger, callback)
	})
}

function watch(appDir, callback) {
}

function defined(item) {
	return !!item
}

function check(appDir, logger, callback) {
	expect('string', 'object', 'function', arguments, function (values) {
		appDir = values[0] || path.dirname(process.mainModule.filename)
		logger = values[1] || Logger.default
		assert.ok(callback = values[2])
	})

	logger.log('Checking for updates.')
	context.load(appDir, function (err, ctx) {
		if(err) return callback(err)
		async.map([
			{ context: ctx, kind: 'app' },
			{ context: ctx, kind: 'dependencies' },
			{ context: ctx, kind: 'plugins' }
		],
		checker.check,
		function (err, results) {
			if(err) return callback(err)
			var app = results[0]
			var dependencies = results[1].filter(defined)
			var plugins = results[2].filter(defined)
			if(!app && !dependencies.length && !plugins.length) {
				logger.log('Updates are not available.')
				callback()
			} else {
				logger.log('Updates are available.')
				callback(null, {
					context: ctx,
					app: app,
					dependencies: dependencies,
					plugins: plugins
				})
			}
		})
	})
}

function list(appDir, logger, callback) {	
	expect('string', 'object', 'function', arguments, function (values) {
		appDir = values[0] || path.dirname(process.mainModule.filename)
		logger = values[1] || Logger.default
		assert.ok(callback = values[2])
	})
	logger.log('Listing dependencies.')
	context.load(appDir, function (err, ctx) {
		callback(err, {
			name: ctx.name,
			version: ctx.version,
			dependencies: ctx.dependencies,
			plugins: ctx.plugins,
		})
	})
}

function isValid(appDir, logger, callback) {
	expect('string', 'object', 'function', arguments, function (values) {
		appDir = values[0] || path.dirname(process.mainModule.filename)
		logger = values[1] || Logger.default
		assert.ok(callback = values[2])
	})
	logger.log('Checking validity.')
	context.load(appDir, function (err, ctx) {
		if(err) return callback(err)
		async.map([
			{ context: ctx, kind: 'dependencies' },
			{ context: ctx, kind: 'plugins' }
		],
		exists.check,
		function (err, results) {
			if(err) return callback(err)
			var r1 = results[0]
			var r2 = results[1]
			var valid = r1 && r2
			callback(null, valid)
		})
	})
}

function fullUpdate(publisher, appName, logger, callback) {
	logger.log('execPath:' + process.execPath)
	copier.copy(process.execPath, publisher, appName, logger, function (err, tmpExecPath) {
		if(err) return callback(err)
		var updateDir = path.resolve(path.join(__dirname, '..'))
		var appDir = path.dirname(process.mainModule.filename)
		var args = JSON.stringify({
			appName: appName,
			publisher: publisher,
			cwd: process.cwd(),
			exe: process.execPath,
			argv: process.argv.slice(1)
		})

		logger.log('Launching update process: ')
		logger.log('  args: ' + util.inspect(args))
		logger.log('  exe: ' + tmpExecPath)
		logger.log('  cwd:  ' + appDir)
		logger.log('  updateDir: ' + updateDir)

		var encodedArgs = new Buffer(args).toString('base64')
		var child = spawn(tmpExecPath, [updateDir, '--electron-update=' + encodedArgs], {
			detached: true,
			cwd: appDir,
			stdio: ['ignore', 'ignore', 'ignore']
		})
		child.unref();
		callback();
	})
}

function start(appDir, logger, callback) {
	var that = this
	expect('string', 'object', 'function', arguments, function (values) {
		appDir = values[0] || path.dirname(process.mainModule.filename)
		logger = values[1] || Logger.default
		callback = values[2] || function (err) { if(err) logger.error(err) }
	})
	logger.log('Starting...')
	context.load(appDir, function (err, ctx) {
		if(err) return callback(err)
		if(logger === Logger.default && ctx.name && ctx.publisher) {
			logger = new Logger(directory.appDir(ctx.publisher, ctx.name), null, true)
		}

		if(ctx.updatePending) {
			// If there is a pending update, do a full update instead of starting the app.
			// This is set when a dependency update is available.
			fullUpdate(ctx.publisher, ctx.name, logger, function (err) {
				if(err) return callback(err);
				that.emit('updateRequired');
				callback();
			})
		} else if(ctx.updateInProgress) {
			// This can happen if the user tries to re-launch the app while an update is
			// currently in progress. In that case just report updateRequired so that
			// the user closes the app right away.
			that.emit('updateRequired');
			callback();
		} else {
			isValid(appDir, logger, function (err, valid) {
				if(err) return callback(err);
				if(valid) {
					// If the app is valid, then go ahead and startup what we have.
					// After that, we will check for updates and notify user when they are available.
					that.emit('ready');

					// todo: watch not check
					check(appDir, logger, function (err, result) {
						if(err) return callback(err);
						if(result && (result.app || result.dependencies.length)) {
							// If a new version of the app is available or
							// a dependency update is available, we must 
							// restart and do the full update process to update those.
							var appData = directory.appDir(ctx.publisher, ctx.name)
							var pendingUpdatePath = path.join(appData, '.update')
							file.touch(pendingUpdatePath, 'PENDING', function (err) {
								if(err) return callback(err)
								that.emit('updateAvailable')
								callback()
							})
						} else if (result && result.plugins.length) {
							// If only plugin updates are available we can go ahead and update those
							// right now and then notify the user that they can restart to apply them.
							updater.update(result, null, logger, function (err) {
								if(err) return callback(err)
								that.emit('updateAvailable')
								callback()
							})
						} else {
							callback();
						}
					})
				} else {
					fullUpdate(ctx.publisher, ctx.name, logger, function (err) {
						if(err) return callback(err);
						that.emit('updateRequired');
						callback();
					})
				}
			})
		}
	})
}

util.inherits(ElectronCommands, EventEmitter)
ElectronCommands.prototype.update = update
ElectronCommands.prototype.watch = watch
ElectronCommands.prototype.check = check
ElectronCommands.prototype.list = list
ElectronCommands.prototype.start = start
ElectronCommands.prototype.isValid = isValid
module.exports = new ElectronCommands()