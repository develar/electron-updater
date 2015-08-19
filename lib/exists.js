var async = require('async')
	semver = require('semver'),
	path = require('path'),
	file = require('./file.js'),
	fs = process.versions.electron ? require('original-fs') : require('fs'),
	directory = require('./directory.js')

function satisfy(desired, current, callback) {
	var valid = semver.satisfies(current, desired)
	callback(null, valid)
}

function checkDependency(name, callback) {
	var desired = this.dependencies[name]
	var packagePath = path.join(this.appDir, 'node_modules', name, 'package.json')
	file.readJson(packagePath, function (err, pkg) {
		if(err) return callback(null, false)
		if(!pkg || !pkg.version) return callback(null, false)
		var current = (pkg && pkg.version)
		satisfy(desired, current, callback)
	})
}

function checkPlugin(name, callback) {
	var appName = this.name
	var appVersion = this.version
	var publisher = this.publisher
	var plugins = this.plugins
	var desired = this.plugins[name]
	var appData = directory.appDir(publisher, appName)
	var currentPluginsPath = path.join(appData, '.current')
	file.readJson(currentPluginsPath, function (err, data) {
		var current = data && data[name] ? data[name] : '0.0.0'
		async.map(
			['link', current],
			function (v, callback) {
				var packagePath = path.join(appData, 'plugins', name, v, 'package.json')
				fs.stat(packagePath, function (err, stat) {
					if(err) return callback(null, false)
					callback(null, true)
				})
			},
			function (err, results) {
				if(err) return callback(err)
				if(results[0]) return callback(null, true) 		// if linked, always true
				if(!results[1]) return callback(null, false)	// if missing always false
				satisfy(desired, current, callback)
			})
	})
}

function all(items, value) {
	for(var i = 0; i < items.length; i++) {
		if(items[i] !== value)
			return false
	}
	return true
}

function check(item, callback) {
	switch(item.kind) {
		case 'dependencies':
			async.map(Object.getOwnPropertyNames(item.context.dependencies), checkDependency.bind(item.context), function (err, results) {
				if(err) return callback(err)
				callback(null, all(results, true))
			})
			break;
		case 'plugins':
			async.map(Object.getOwnPropertyNames(item.context.plugins), checkPlugin.bind(item.context), function (err, results) {
				if(err) return callback(err)
				callback(null, all(results, true))
			})
			break;
		default:
			return callback(new Error('invalid dependency kind detected'))
	}
}

module.exports = {
	check: check
}