var download = require('./download.js'),
	semver = require('semver'),
	async = require('async'),
	path = require('path'),
	file = require('./file.js'),
	directory = require('./directory.js')

function satisfy(registry, name, channel, desired, current, callback) {
	var url = registry + '/' + name + '/' + desired
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var available = semver.clean(data.version)
		if(semver.satisfies(available, desired) && semver.gt(available, current)) {
			callback(null, {
				name: name,
				desired: desired,
				current: current,
				available: available
			})
		} else {
			callback()
		}
	})
}

function checkDependency(name, callback) {
	var registry = this.registry
	var channel = this.channel
	var desired = this.dependencies[name]
	var packagePath = path.join('node_modules', name, 'package.json')	
	file.readJson(packagePath, function (err, pkg) {
		var current = (pkg && pkg.version) || '0.0.0'
		satisfy(registry, name, channel, desired, current, callback)
	})
}

function checkPlugin(name, callback) {
	var appName = this.name
	var registry = this.registry
	var channel = this.channel
	var desired = this.plugins[name]
	var appData = directory.appData()
	var pluginsPath = path.join(appData, appName, 'plugins')
	var currentPluginsPath = path.join(pluginsPath, '.current')
	file.readJson(currentPluginsPath, function (err, data) {
		var current = (data && data[name]) || '0.0.0'
		satisfy(registry, name, channel, desired, current, callback)
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