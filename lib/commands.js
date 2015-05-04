var util = require('util'),
	fs = require('fs'),
	async = require('async'),
	semver = require('semver'),
	checker = require('./check.js'),
	updater = require('./update.js'),
	context = require('./context.js'),
	exists = require('./exists.js'),
	copier = require('./copier.js'),
	EventEmitter = require('events').EventEmitter,
	spawn = require('child_process').spawn

function ElectronCommands() {
}

function update(callback) {
	check(function (err, results) {
		if(err) return callback(err)
		if(!results) return callback()
		updater.update(results, callback);
	})
}

function watch(callback) {
}

function defined(item) {
	return !!item
}

function check(callback) {
	context.load(function (err, ctx) {
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

function list(callback) {
	context.load(function (err, ctx) {
		callback(err, ctx.dependencies)
	})
}

function isValid(callback) {
	context.load(function (err, ctx) {
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
		console.log('copying done.')
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

function start() {
	var that = this
	context.load(function (err, ctx) {
		// todo: handle error
		if(ctx.pendingUpdate) {
			// If there is a pending update, do a full update instead of starting the app.
			// This is set when a dependency update is available.
			console.log('pending update.')
			fullUpdate(ctx.name, function (err) {
				that.emit('updateRequired')
			})
		} else {
			isValid(function (err, valid) {
				// todo: handle error
				if(valid) {
					// If the app is valid, then go ahead and startup what we have.
					// After that, we will check for updates and notify user when they are available.
					that.emit('ready')

					// todo: watch not check
					check(function (err, result) {
						//todo: handle error
						if(result && result.dependencies) {
							// If a dependency update is available, we must 
							// restart and do the full update process to update those.
							var pendingUpdatePath = path.join(directory.appData(), ctx.name, '.update')
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
					// todo: log error
					fullUpdate(ctx.name, function (err) {
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