var util = require('util'),
	fs = require('fs'),
	async = require('async'),
	semver = require('semver'),
	checker = require('./check.js'),
	updater = require('./update.js'),
	context = require('./context.js'),
	exists = require('./exists.js'),
	copier = require('./copier.js'),
	AppDirectory = require('appdirectory'),
	EventEmitter = require('events').EventEmitter,
	spawn = require('child_process').spawn

function ElectronCommands() {
}

function update(appDir, callback) {
	check(appDir, function (err, results) {
		if(err) return callback(err)
		if(!results) return callback()
		updater.update(results, callback);
	})
}

function watch(appDir, callback) {
}

function defined(item) {
	return !!item
}

function check(appDir, callback) {
	if(typeof appDir === 'function') {
		callback = appDir
		appDir = path.dirname(process.mainModule.filename)
	}
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
				callback()
			} else {
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

function list(appDir, callback) {
	if(typeof appDir === 'function') {
		callback = appDir
		appDir = path.dirname(process.mainModule.filename)
	}
	context.load(appDir, function (err, ctx) {
		callback(err, {
			name: ctx.name,
			version: ctx.version,
			dependencies: ctx.dependencies,
			plugins: ctx.plugins,
		})
	})
}

function isValid(appDir, callback) {
	if(typeof appDir === 'function') {
		callback = appDir
		appDir = path.dirname(process.mainModule.filename)
	}
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
			callback(null, r1 && r2)
		})
	})
}

function fullUpdate(appName, callback) {
	copier.copy(process.execPath, appName, function (err, tmpExecPath) {
		// todo: log error
		var updateDir = path.resolve(path.join(__dirname, '..'))
		var appDir = path.dirname(process.mainModule.filename)
		var args = JSON.stringify({
			appName: appName,
			cwd: process.cwd(),
			argv: process.argv
		})
		var child = spawn(tmpExecPath, [updateDir, '--electron-update', args], {
			detached: true,
			cwd: appDir,
			stdio: [ 'ignore', 'pipe', 'pipe'] // out, err]
		})
		child.unref()
		callback()
	})
}

function start(appDir) {
	var that = this	
	appDir = appDir || path.dirname(process.mainModule.filename)
	context.load(appDir, function (err, ctx) {
		// todo: handle error
		if(ctx.pendingUpdate) {
			// If there is a pending update, do a full update instead of starting the app.
			// This is set when a dependency update is available.
			console.log('pending update.')
			fullUpdate(ctx.name, function (err) {
				that.emit('updateRequired')
			})
		} else {
			isValid(appDir, function (err, valid) {
				if(err) {
					console.log('Error starting electron-updater')
					console.log(err)
					return;
				}

				if(valid) {
					// If the app is valid, then go ahead and startup what we have.
					// After that, we will check for updates and notify user when they are available.
					that.emit('ready')

					// todo: watch not check
					check(appDir, function (err, result) {
						//todo: handle error
						if(result && (result.app || result.dependencies)) {
							// If a new version of the app is available or
							// a dependency update is available, we must 
							// restart and do the full update process to update those.
							var dirs = new AppDirectory(ctx.name)
							var appData = path.dirname(dirs.userData())
							var pendingUpdatePath = path.join(appData, '.update')
							file.touch(pendingUpdatePath, function (err) {
								that.emit('updateAvailable')
							})
						} else if (result && result.plugins) {
							// If only plugin updates are available we can go ahead and update those
							// right now and then notify the user that they can restart to apply them.
							updater.update(results, function (err) {
								// todo: log errors
								this.emit('updateAvailable')
							})
						}
					})
				} else {
					console.log('mandatory update.')
					fullUpdate(ctx.name, function (err) {
						if(err) return console.log(err)
						that.emit('updateRequired')
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