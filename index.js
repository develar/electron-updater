
var util = require('util')
	fs = require('fs')
	async = require('async')
	semver = require('semver')
	checker = require('./lib/check.js')
	updater = require('./lib/update.js')
	context = require('./lib/context.js')

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

module.exports = {
	update: update,
	watch: watch,
	check: check,
	list: list
}