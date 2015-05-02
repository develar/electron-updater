
var util = require('util'),
	fs = require('fs'),
	async = require('async'),
	semver = require('semver'),
	checker = require('./lib/check.js'),
	updater = require('./lib/update.js'),
	context = require('./lib/context.js'),
	exists = require('./lib/exists.js'),
	executor = require('./lib/executor.js'),
	copier = require('./lib/copier.js'),
	EventEmitter = require('events').EventEmitter

function ElectronUpdater() {
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
			{ context: ctx, kind: 'dependencies' },
			{ context: ctx, kind: 'plugins' }
		],
		checker.check,
		function (err, results) {
			if(err) return callback(err)
			var dependencies = results[0].filter(defined)
			var plugins = results[1].filter(defined)
			if(!dependencies.length && !plugins.length) {
				callback()
			} else {
				callback(null, {
					context: ctx,
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

function fullUpdate(callback) {
	copier.copy(process.execPath, function (err, tmpExecPath) {
		// todo: log error
		var updateDir = __dirname
		executor.exec(tmpExecPath, [updateDir, '--electron-update', process.cwd()], callback)
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
			fullUpdate(function (err) {
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
					fullUpdate(function (err) {
						that.emit('updateRequired')
					})
				}
			})
		}
	})
}

util.inherits(ElectronUpdater, EventEmitter)
ElectronUpdater.prototype.update = update
ElectronUpdater.prototype.watch = watch
ElectronUpdater.prototype.check = check
ElectronUpdater.prototype.list = list
ElectronUpdater.prototype.start = start
ElectronUpdater.prototype.isValid = isValid
module.exports = new ElectronUpdater()