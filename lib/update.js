var util = require('util'),
	directory = require('./directory.js'),
	unpacker = require('./unpack.js'),
	cache = require('./cache.js'),
	async = require('async'),
	path = require('path'),
	file = require('./file.js'),
	semver = require('semver'),
	got = require('got');

function getBinaries(dir, context, logger, callback) {
	var packagePath = path.join(dir, 'package.json')
	file.readJson(packagePath, function (err, package) {
		if(err && err.code == 'ENOENT') return callback() // not an error, skip if package.json is missing
		if(err) return callback(err)
		if(package && package.binaries) {
			logger.log('Getting binaries for: ' + path.basename(dir))
			async.each(package.binaries, function (url, callback) {

				// todo: remove atom/electron skip after version 0.1.9
				if (url.indexOf('atom/electron') > -1) return callback();

				url = url
					.replace(/{name}/g, package.name)
					.replace(/{version}/g, package.version)
					.replace(/{platform}/g, context.platform)
					.replace(/{arch}/g, context.arch)
					.replace(/{configuration}/g, context.configuration)
					.replace(/{channel}/g, context.channel)
				
				logger.log('  ' + url)
				cache.get(url, dir, 0, null, context, logger, callback);
			},
			callback)
		} else {
			callback() // This package doesn't have binaries
		}
	})
}

function getElectron(electronDir, context, logger, callback) {
	if(!electronDir) return callback();
	var packagePath = path.join(context.appDir, 'package.json');
	file.readJson(packagePath, function (err, package) {
		if(err) return callback(err);
		logger.log('Looking for electron binaries...');
		if(package && package.electronBinaries) {
			async.each(package.electronBinaries, function (url, callback) {
				url = url
					.replace(/{name}/g, context.name)
					.replace(/{platform}/g, context.platform)
					.replace(/{arch}/g, context.arch);

				if (context.platform === 'darwin') {
					// On mac the package is in app form, extract starting two directories higher up.
					electronDir = path.resolve(electronDir, '..', '..');
				}

				logger.log('  ' + url);
				logger.log('  to: ' + electronDir);
				cache.get(url, electronDir, 0, null, context, logger, callback);
			}, callback);
		} else {
			callback();
		}
	})
}

function getSubDependencyVersion(name, desired, context, callback) {
	var url = context.registry + '/' + name
	got(url, {json: true}, function (err, data) {
		if(err) return callback(err)
		var available
		if(!semver.validRange(desired) && data['dist-tags']) {
			// Could be a dist-tag
			desired = data['dist-tags'][desired]
		}
		if(!semver.validRange(desired)) {
			return callback({code:'EINVALID', message:'Invalid version requested'})
		}
		Object.getOwnPropertyNames(data.versions).forEach(function (v) {
			if(semver.satisfies(v, desired) && (!available || semver.gt(v, available)))
				available = v
		})

		if(!available) return callback('Version matching range ' + desired + ' not found.')
		callback(null, available)
	})
}

function updateSubDependencies(dir, context, logger, callback) {
	logger.log('Updating sub dependency: ' + path.basename(dir))
	var packagePath = path.join(dir, 'package.json')
	file.readJson(packagePath, function (err, package) {
		if(err) return callback(err)
		if(!package.dependencies) return callback()
		async.each(
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
	logger.log('Updating plugin: ' + name + '@' + version + '...')
	got(url, {json: true}, function (err, data) {
		if(err) return callback(err)
		if(!data || !data.dist || !data.dist.tarball) return callback(new Error('Tarball not found for: ' + name + '@' + version))
		var payloadUrl = data.dist.tarball
		var hash = data.dist.shasum
		cache.get(payloadUrl, dir, 1, hash, context, logger, function (err) {
			if(err) return callback(err);
			getBinaries(dir, context, logger, function (err) {
				if(err) return callback(err)
				updateSubDependencies(dir, context, logger, callback)
			})
		})
	})
}

function updateDependency(dir, name, version, context, logger, callback) {
	logger.log('Updating dependency: ' + name + '@' + version)
	var dir = path.resolve(path.join(dir, 'node_modules', name))
	var url = context.registry + '/' + name + '/' + version
	got(url, {json:true}, function (err, data) {
		if(err) return callback({err:err,dir:dir})
		var payloadUrl = data.dist.tarball
		var hash = data.dist.shasum
		directory.remove(dir, function (err) {
			// if dir was not found, ignore
			if(err && err.code != 'ENOENT') return callback(err) 
			cache.get(payloadUrl, dir, 1, hash, context, logger, function (err) {
				if(err) return callback(err)
				getBinaries(dir, context, logger, function (err) {
					if(err) return callback(err)
					updateSubDependencies(dir, context, logger, callback)
				})
			})
		})
	})
}

function updateApp(dir, name, version, electronDir, context, logger, callback) {
	var url = context.registry + '/' + name + '/' + version
	got(url, {json:true}, function (err, data) {
		if(err) return callback(err)
		var payloadUrl = data.dist.tarball
		var hash = data.dist.shasum
		cache.get(payloadUrl, dir, 1, hash, context, logger, function (err) {
			if(err) return callback(err)
			async.parallel([
				function (callback) { getBinaries(dir, context, logger, callback) },
				function (callback) { getElectron(electronDir, context, logger, callback) },
			],
			callback);
		})
	})
}

function updateEach(dep, callback) {
	var context = this
	switch(dep.kind) {
		case 'app':
			updateApp(context.appDir, dep.name, dep.version, dep.electronDir, context, dep.logger, callback)
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

function update(deps, electronDir, logger, callback) {
	var updateContexts = []
	if(deps.app && !deps.context.dev) {
		updateContexts.push({
			kind: 'app',
			name: deps.app.name,
			version: deps.app.available,
			electronDir: electronDir,
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

	var context = deps.context
	async.each(updateContexts, updateEach.bind(context), function (err) {
		if(err) return callback(err);

		// After updates are done, update the .current file to reflect
		// the new versions of updated plugins.
		var appData = directory.appDir(context.publisher, context.name)
		directory.create(appData, function (err) {
			if(err) return callback(err)
			var currentPluginsPath = path.join(appData, '.current')
			file.readJson(currentPluginsPath, function (err, data) {
				data = data || {}
				deps.plugins.forEach(function (p) {
					data[p.name] = p.available
				})
				file.writeJson(currentPluginsPath, data, callback)
			})
		})
	})
}

module.exports = {
	update: update
}