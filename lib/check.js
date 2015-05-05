var download = require('./download.js'),
	semver = require('semver'),
	async = require('async'),
	path = require('path'),
	file = require('./file.js'),
	directory = require('./directory.js')

function satisfy(registry, name, desired, current, callback) {
	var url = registry + '/' + name + '/' + desired
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var available = semver.clean(data.version)
		if(!semver.validRange(desired) && semver.gt(available, current)) {
			callback(null, {
				name: name,
				desired: desired,
				current: current,
				available: available
			})
		} else if(semver.satisfies(available, desired) && semver.gt(available, current)) {
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

function checkApp(context, callback) {
	if(context.dev) return callback() // do not update app in a dev repo
	var registry = context.registry
	var name = context.name
	var desired = context.channel
	var current = context.version
	satisfy(registry, name, desired, current, callback)
}

function checkDependency(name, callback) {
	if(this.dev) return callback() // do not update dependencies in a dev repo
	var registry = this.registry
	var desired = this.dependencies[name]
	var packagePath = path.join('node_modules', name, 'package.json')	
	file.readJson(packagePath, function (err, pkg) {
		var current = (pkg && pkg.version) || '0.0.0'
		satisfy(registry, name, desired, current, callback)
	})
}

function checkPlugin(name, callback) {
	var appName = this.name
	var registry = this.registry
	var desired = this.plugins[name]
	var appData = directory.appData()
	var pluginsPath = path.join(appData, appName, 'plugins')
	var currentPluginsPath = path.join(pluginsPath, '.current')
	file.readJson(currentPluginsPath, function (err, data) {
		var current = (data && data[name]) || '0.0.0'
		satisfy(registry, name, desired, current, callback)
	})
}

function check(item, callback) {
	switch(item.kind) {
		case 'app':
			checkApp(item.context, callback)
			break;
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