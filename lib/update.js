var util = require('util'),
	AppDirectory = require('appdirectory'),
	directory = require('./directory.js'),
	download = require('./download.js'),
	unpacker = require('./unpack.js'),
	async = require('async'),
	path = require('path'),
	file = require('./file.js')

// todo: update child dependencies recursively
// todo: download prebuilt binaries recursively

function updatePlugin(name, version, context, callback) {
	console.log('updating plugin: ' + name)
	var dirs = new AppDirectory(context.name)
	var appData = path.dirname(dirs.userData())
	var pluginsDir = path.join(appData, 'plugins')
	var dir = path.join(pluginsDir, name, version)
	var url = context.registry + '/' + name + '/' + version
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		download.get(payloadUrl, function (err, res) {
			if(err) return callback(err)
			unpacker.extract(dir, res, function (err) {
				if(err) return callback(err)
				directory.create(appData, function (err) {
					if(err) return callback(err)
					var currentPluginsPath = path.join(appData, '.current')
					file.readJson(currentPluginsPath, function (err, data) {
						data = data || {}
						data[name] = version
						file.writeJson(currentPluginsPath, data, callback)
					})
				})
			})
		})
	})
}

function updateDependency(name, version, context, callback) {
	var dir = path.resolve(path.join(context.appDir, 'node_modules', name))
	var url = context.registry + '/' + name + '/' + version
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		download.get(payloadUrl, function (err, res) {
			if(err) return callback(err)
			directory.remove(dir, function (err) {
				if(err && err.errno != -4058) return callback(err) // dir not found is 
				unpacker.extract(dir, res, callback)
			})
		})
	})
}

function updateEach(dep, callback) {
	var context = this
	switch(dep.kind) {
		case 'dependency':
			updateDependency(dep.name, dep.version, context, callback)
			break;
		case 'plugin':
			updatePlugin(dep.name, dep.version, context, callback)
			break;
		default:
			callback(new Error('Updating unexpected kind.'))
			break;
	}
}

function update(deps, callback) {
	// todo: update primary package itself
	// todo: get prebuilt binaries for packages
	// todo: update dependencies/plugins recursively
	var updateContexts = []
	if(deps.app && !deps.context.dev) {
		updateContexts.push({
			kind: 'app',
			name: deps.app.name,
			version: deps.app.available
		})
	}
	if(!deps.context.dev) {
		deps.dependencies.forEach(function (dep) {
			updateContexts.push({
				kind: 'dependency',
				name: dep.name,
				version: dep.available
			})
		})
	}
	deps.plugins.forEach(function (plugin) {
		updateContexts.push({
			kind: 'plugin',
			name: plugin.name,
			version: plugin.available
		})
	})

	async.map(updateContexts, updateEach.bind(deps.context), callback)
}

module.exports = {
	update: update
}