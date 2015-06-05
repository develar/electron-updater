var util = require('util'),
	fs = require('fs'),
	async = require('async'),
	semver = require('semver'),
	checker = require('./check.js'),
	updater = require('./update.js'),
	context = require('./context.js'),
	exists = require('./exists.js'),
	copier = require('./copier.js'),
	file = require('./file.js'),
	AppDirectory = require('appdirectory'),
	EventEmitter = require('events').EventEmitter,
	spawn = require('child_process').spawn

function ElectronCommands() {
}

function update(appDir, callback) {	
	if(typeof appDir === 'function') {
		callback = appDir
		appDir = path.dirname(process.mainModule.filename)
	}
	check(appDir, function (err, results) {
		if(err) return callback(err)
		if(!results) return callback()
		updater.update(results, callback)
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
		if(err) return callback(err)
		var updateDir = path.resolve(path.join(__dirname, '..'))
		var appDir = path.dirname(process.mainModule.filename)
		var args = JSON.stringify({
			appName: appName,
			cwd: process.cwd(),
			exe: process.execPath,
			argv: process.argv
		})
    var child = spawn(tmpExecPath, [updateDir, '--electron-update=' + args], {
        detached: true,
        cwd: cwd,
        stdio: ['ignore', 'pipe', 'pipe']
    })
		child.unref()
		callback()
	})
}

function start(appDir, callback) {
	var that = this	
	if(typeof appDir === 'function') {
		callback = appDir
		appDir = null
	}
	appDir = appDir || path.dirname(process.mainModule.filename)
	context.load(appDir, function (err, ctx) {
		if(err) return callback(err)
		if(ctx.updatePending) {
			// If there is a pending update, do a full update instead of starting the app.
			// This is set when a dependency update is available.
			fullUpdate(ctx.name, function (err) {
				if(err) return callback(err)
				that.emit('updateRequired')
				callback()
			})
		} else if(ctx.updateInProgress) {
			// This can happen if the user tries to re-launch the app while an update is
			// currently in progress. In that case just report updateRequired so that
			// the user closes the app right away.
			that.emit('updateRequired')
			callback()
		} else {
			isValid(appDir, function (err, valid) {
				if(err) return callback(err)
				if(valid) {
					// If the app is valid, then go ahead and startup what we have.
					// After that, we will check for updates and notify user when they are available.
					that.emit('ready')

					// todo: watch not check
					check(appDir, function (err, result) {
						if(err) return callback(err)
						if(result && (result.app || result.dependencies.length)) {
							// If a new version of the app is available or
							// a dependency update is available, we must 
							// restart and do the full update process to update those.
							var dirs = new AppDirectory(ctx.name)
							var appData = path.dirname(dirs.userData())
							var pendingUpdatePath = path.join(appData, '.update')
							file.touch(pendingUpdatePath, 'PENDING', function (err) {
								if(err) return callback(err)
								that.emit('updateAvailable')
								callback()
							})
						} else if (result && result.plugins.length) {
							// If only plugin updates are available we can go ahead and update those
							// right now and then notify the user that they can restart to apply them.
							updater.update(result, function (err) {
								if(err) return callback(err)
								that.emit('updateAvailable')
								callback()
							})
						} else {
							callback()
						}
					})
				} else {
					fullUpdate(ctx.name, function (err) {
						if(err) return callback(err)
						that.emit('updateRequired')
						callback()
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