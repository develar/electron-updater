
var util = require('util'),
	fs = require('fs'),
	async = require('async'),
	semver = require('semver'),
	checker = require('./lib/check.js'),
	updater = require('./lib/update.js'),
	context = require('./lib/context.js'),
	exists = require('./lib/exists.js'),
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
			var r1 = !!results[0]
			var r2 = !!results[1]
			callback(null, r1 && r2)
		})
	})
}

function start() {

	console.log('starting!')
	var that = this
	var i = process.argv.indexOf('--electron-update')
	var updating = i > 0
	if(updating) {
		var tmpDir = path.dirname(process.execPath)
		var appDir = process.argv[i + 1]
		if (tmpDir === appDir) {
			throw new Error('Updater cannot update itself')
		}

		process.cwd(appDir)
		//process.versions.electron [0.25.1]
		//process.arch     			[ia32]
		//process.platform 			[win32]
		//process.argv				[path/to/electron.exe,arg1,arg2,...]
		//process.execPath			[path/to/electron.exe]
		//process.cwd()				[current working dir]

		// todo: show updating splash screen
		update(function (err) {
			// log errors...
			// todo: restart app
		})
	} else {
		isValid(function (err, valid) {
			// todo: log error
			if(valid) {
				that.emit('ready')
				check(function (err, result) {
					//todo: log error
					if(result && result.dependencies) {
						that.emit('updateAvailable')
					} else if (result && result.plugins) {
						update(function (err) {
							// todo: log errors
							this.emit('updateAvailable')
						})
					}
				})
			} else {
				console.log('mandatory update...')
				// todo: Update is mandatory
				//   - copy to temp dir
				//   - run app from temp dir, passing `--electron-update ${process.pwd()}`
			}
		})
	}
}

util.inherits(ElectronUpdater, EventEmitter)
ElectronUpdater.prototype.update = update
ElectronUpdater.prototype.watch = watch
ElectronUpdater.prototype.check = check
ElectronUpdater.prototype.list = list
ElectronUpdater.prototype.start = start
ElectronUpdater.prototype.isValid = isValid
module.exports = new ElectronUpdater()