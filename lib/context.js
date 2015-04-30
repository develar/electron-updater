var directory = require('./directory.js')
	path = require('path')

function readJson(name, callback) {
	fs.readFile(name, {encoding: 'utf8'}, function (err, data) {
		if(err) return callback(err)
		var j = JSON.parse(data)
		callback(null, j)
	})
}

function load(callback) {
	readJson('package.json', function (err, package) {
		if (err) return callback(err)
		var name = package.name
		var appData = directory.appData()
		var distPath = path.join(appData, '.dist')
		var pluginsPath = path.join(appData, '.plugins')
		async.map([distPath, pluginsPath], readJson, function (err, results) {
			var dist = results[0]
			var currentPlugins = results[0] || {}
			var tag = (dist && dist.tag) || 'latest'
			package.plugins.forEach(function(p) {
				if(!currentPlugins[p]) {
					currentPlugins[p] = '0.0.0'
				}
			})
			callback(null, {
				tag: tag,
				registry: "https://registry.npmjs.org", // resolve from .npmrc's
				dependencies: package.dependencies || {},
				plugins: currentPlugins
			})
		})
	})
}

module.exports = {
	load: load
}