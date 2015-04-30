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
		readJson(distPath, function (err, data) {
			var tag = (data && data.tag) || 'latest'
			callback(null, {
				tag: tag,
				registry: "https://registry.npmjs.org", // resolve from .npmrc's
				dependencies: package.dependencies || {},
				plugins: package.plugins || []
			})
		})
	})
}

module.exports = {
	load: load
}