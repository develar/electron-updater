var util = require('util')
	directory = require('./directory.js')
	download = require('./download.js')
	unpacker = require('./unpack.js')
	async = require('async')
	path = require('path')

// todo: update child dependencies recursively
// todo: download prebuilt binaries recursively

function updatePlugin(name, version, context, callback) {
	console.log('updating plugin: ' + util.inspect(name))
	var dir = path.resolve(path.join('plugins', name, version))
	var url = context.registry + '/' + name + '/' + version
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		download.get(payloadUrl, function (err, res) {
			if(err) return callback(err)
			unpacker.extract(dir, res, callback)
		})
	})
}

function updateDependency(name, version, context, callback) {
	var dir = path.resolve(path.join('node_modules', name))
	var url = context.registry + '/' + name + '/' + version
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		download.get(payloadUrl, function (err, res) {
			if(err) return callback(err)
			directory.remove(dir, function (err) {
				if(err) return callback(err)
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
	var updateContexts = []
	deps.dependencies.forEach(function (dep) {
		updateContexts.push({
			kind: 'dependency',
			name: dep.name,
			version: dep.available
		})
	})
	deps.plugins.forEach(function (plugin) {
		updateContexts.push({
			kind: 'plugin',
			name: plugin.name,
			version: plugin.available
		})
	})

	async.map(updateContexts, updateEach.bind(deps.context), function (err) {
		if(err) callback(err)
		console.log('success!')
	})
}

module.exports = {
	update: update
}