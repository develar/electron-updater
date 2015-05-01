var directory = require('./directory.js'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	file = require('./file.js')

function load(callback) {
	file.readJson('package.json', function (err, package) {
		if (err) return callback(err)
		var name = package.name
		var version = package.version
		var appData = directory.appData()
		var channelPath = path.join(appData, '.channel')
		file.readJson(channelPath, function(err, channel) {
			callback(null, {
				name: name,
				version: version,
				channel: channel,
				registry: "https://registry.npmjs.org", // resolve from .npmrc's
				dependencies: package.dependencies || {},
				plugins: package.plugins || {}
			})
		})
	})
}

module.exports = {
	load: load
}