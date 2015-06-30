var util = require('util'),
	directory = require('./directory.js'),
	unpacker = require('./unpack.js'),
	async = require('async'),
	path = require('path'),
	file = require('./file.js'),
	semver = require('semver'),
	got = require('got')

// todo: download prebuilt binaries recursively

function getSubDependencyVersion(name, desired, context, callback) {
	var url = context.registry + '/' + name
	got(url, {json: true}, function (err, data) {
		if(err) return callback(err)
		var available
		Object.getOwnPropertyNames(data.versions).forEach(function (v) {
			if(semver.satisfies(v, desired) && (!available || semver.gt(v, available)))
				available = v
		})

		if(!available) return callback('Version matching range ' + desired + ' not found.')
		callback(null, available)
	})
}

function updateSubDependencies(dir, context, logger, callback) {
	var packagePath = path.join(dir, 'package.json')
	file.readJson(packagePath, function (err, package) {
		if(err) return callback(err)
		if(!package.dependencies) return callback()
		async.forEach(
			Object.getOwnPropertyNames(package.dependencies),
			function (name, callback) {
				var desired = package.dependencies[name]
				getSubDependencyVersion(name, desired, context, function (err, version) {
					updateDependency(dir, name, version, context, logger, callback)
				})
			},
			callback)
	})
}

function updatePlugin(name, version, context, logger, callback) {
	var appData = directory.appDir(context.publisher, context.name)
	var pluginsDir = path.join(appData, 'plugins')
	var dir = path.join(pluginsDir, name, version)
	var url = context.registry + '/' + name + '/' + version
	logger.log('Updating plugin: ' + name + '@' + version)
	got(url, {json: true}, function (err, data) {
		if(err) return callback(err)
		if(!data || !data.dist || !data.dist.tarball) return callback(new Error('Tarball not found for: ' + name + '@' + version))
		var payloadUrl = data.dist.tarball
		var res = got(payloadUrl)
		unpacker.extract(dir, res, function (err) {
			if(err) return callback(err)
			updateSubDependencies(dir, context, logger, function (err) {
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

function updateDependency(dir, name, version, context, logger, callback) {
	logger.log('Updating dependency: ' + name + '@' + version)
	var dir = path.resolve(path.join(dir, 'node_modules', name))
	var url = context.registry + '/' + name + '/' + version
	got(url, {json:true}, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		var res = got(payloadUrl)
		directory.remove(dir, function (err) {
			if(err && err.errno != -4058) return callback(err) // dir not found is 
			unpacker.extract(dir, res, function (err) {
				if(err) return callback(err)
				updateSubDependencies(dir, context, logger, callback)
			})
		})
	})
}

function updateApp(dir, name, version, context, logger, callback) {
	logger.log('Updating app: ' + name + '@' + version)
	logger.log('  at: ' + dir)
	var url = context.registry + '/' + name + '/' + version
	got(url, {json:true}, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		var res = got(payloadUrl)
		if(err) return callback(err)
		unpacker.extract(dir, res, callback)
	})
}

function updateEach(dep, callback) {
	var context = this
	switch(dep.kind) {
		case 'app':
			updateApp(context.appDir, dep.name, dep.version, context, dep.logger, callback)
			break
		case 'dependency':
			updateDependency(context.appDir, dep.name, dep.version, context, dep.logger, callback)
			break
		case 'plugin':
			updatePlugin(dep.name, dep.version, context, dep.logger, callback)
			break
		default:
			callback(new Error('Updating unexpected kind.'))
			break
	}
}

function update(deps, logger, callback) {
	var updateContexts = []
	if(deps.app && !deps.context.dev) {
		updateContexts.push({
			kind: 'app',
			name: deps.app.name,
			version: deps.app.available,
			logger: logger
		})
	}
	if(!deps.context.dev) {
		deps.dependencies.forEach(function (dep) {
			updateContexts.push({
				kind: 'dependency',
				name: dep.name,
				version: dep.available,
				logger: logger
			})
		})
	}
	deps.plugins.forEach(function (plugin) {
		updateContexts.push({
			kind: 'plugin',
			name: plugin.name,
			version: plugin.available,
			logger: logger
		})
	})

	async.map(updateContexts, updateEach.bind(deps.context), callback)
}

module.exports = {
	update: update
}