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
		var appStorage = path.join(appData, name)
		var pendingUpdatePath = path.join(appStorage, '.update')
		var channelPath = path.join(appStorage, '.channel')
		fs.readFile(channelPath, function (err, channel) {
			channel = channel || 'latest'
			fs.stat(pendingUpdatePath, function (err, stat) {
				var pendingUpdate = !err && stat.isFile()
				callback(null, {
					name: name,
					version: version,
					channel: channel,
					pendingUpdate: pendingUpdate,
					registry: "https://registry.npmjs.org", // resolve from .npmrc's
					dependencies: package.dependencies || {},
					plugins: package.plugins || {}
				})
			})
		})
	})
}

module.exports = {
	load: load
}