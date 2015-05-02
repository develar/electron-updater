var async = require('async')
	semver = require('semver'),
	path = require('path'),
	file = require('./file.js'),
	directory = require('./directory.js')

function satisfy(desired, current, callback) {
	var valid = semver.satisfies(current, desired)
	callback(null, valid)
}

function checkDependency(name, callback) {
	var desired = this.dependencies[name]
	var packagePath = path.join('node_modules', name, 'package.json')
	file.readJson(packagePath, function (err, pkg) {
		if(err) return callback(null, false)
		if(!pkg || !pkg.version) return callback(null, false)
		var current = (pkg && pkg.version)
		satisfy(desired, current, callback)
	})
}

function checkPlugin(name, callback) {
	var appName = this.name
	var desired = this.plugins[name]
	var appData = directory.appData()
	var pluginsPath = path.join(appData, appName, 'plugins')
	var currentPluginsPath = path.join(pluginsPath, '.current')
	file.readJson(currentPluginsPath, function (err, data) {
		if(err) return callback(null, false)
		if(!data || !data[name]) return callback(null, false)
		var current = (data && data[name])
		satisfy(desired, current, callback)
	})
}

function check(item, callback) {
	switch(item.kind) {
		case 'dependencies':
			async.map(Object.getOwnPropertyNames(item.context.dependencies), checkDependency.bind(item.context), callback)
			break;
		case 'plugins':
			async.map(Object.getOwnPropertyNames(item.context.plugins), checkPlugin.bind(item.context), callback)
			break;
		default:
			return callback(new Error('invalid dependency kind detected'))
	}
}

module.exports = {
	check: check
}