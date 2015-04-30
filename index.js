
var npm = require('npm')
	util = require('util')
	fs = require('fs')
	async = require('async')
	semver = require('semver')
	checkDependencies = require('./lib/check.js')
	context = require('./lib/context.js')

// read package.json
// on a timer...


function ElectronUpdater() {

}

function update(callback) {

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
		checkDependencies,
		function (err, results) {
			if(err) return callback(err)
			var dependencies = results[0].filter(defined)
			var plugins = results[1].filter(defined)
			if(!dependencies.length && !plugins.length) {
				callback()
			} else {
				callback(null, {
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

ElectronUpdater.prototype.update = update
ElectronUpdater.prototype.watch = watch
ElectronUpdater.prototype.check = check
ElectronUpdater.prototype.list = list
module.exports = ElectronUpdater