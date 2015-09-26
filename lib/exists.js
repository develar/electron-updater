var async = require('async')
	semver = require('semver'),
	path = require('path'),
	util = require('util'),
	file = require('./file.js'),
	fs = process.versions.electron ? require('original-fs') : require('fs'),
	directory = require('./directory.js')

function satisfy(desired, current, callback) {
	var valid = semver.satisfies(current, desired);
	callback(null, valid);
}

function checkDependency(name, callback) {
	var desired = this.dependencies[name];
	var packageDir = path.join(this.appDir, 'node_modules', name);
	file.isLink(packageDir, function (isLinked) {
		var packagePath = path.join(packageDir, 'package.json');
		file.readJson(packagePath, function (err, pkg) {
			if(err || !pkg || !pkg.version) return callback(null, {
				name: name,
				dir: packageDir,
				current: null,
				desired: desired,
				valid: isLinked
			});
			var current = (pkg && pkg.version);			
			if (isLinked) return callback(null, { // If the dependency is linked, its always valid.
				name: name,
				dir: packageDir,
				current: current,
				desired: desired,
				valid: true
			});
			var valid = semver.satisfies(current, desired);
			callback(null, {
				name: name,
				dir: packageDir,
				current: current,
				desired: desired,
				valid: valid
			});
		});
	});
}

function checkPlugin(name, callback) {
	var appName = this.name;
	var appVersion = this.version;
	var publisher = this.publisher;
	var plugins = this.plugins;
	var desired = this.plugins[name];
	var appData = directory.appDir(publisher, appName);
	var currentPluginsPath = path.join(appData, '.current');
	file.readJson(currentPluginsPath, function (err, data) {
		var current = data && data[name] ? data[name] : '0.0.0';
		async.map(
			['link', current],
			function (v, callback) {
				var packageDir = path.join(appData, 'plugins', name, v);
				var packagePath = path.join(packageDir, 'package.json');
				fs.stat(packagePath, function (err, stat) {
					if(err) return callback(null, {
						name: name,
						current: current,
						desired: desired,
						valid: false
					});
					callback(null, {
						name: name,
						current: current,
						desired: desired,
						valid: true
					});
				});
			},
			function (err, results) {
				if(err) return callback(err);
				if(results[0].valid) return callback(null, { // if linked, always true
					name: name,
					current: current,
					desired: desired,
					valid: true,
					linked: true
				});
				if(!results[1].valid) return callback(null, { // if missing always false
					name: name,
					current: current,
					desired: desired,
					valid: false
				});
				var valid = semver.satisfies(current, desired);
				callback(null, {
					name: name,
					current: current,
					desired: desired,
					valid: valid
				});
			});
	});
}

function allValid(items) {
	for(var i = 0; i < items.length; i++) {
		if(!items[i].valid)
			return false;
	}
	return true;
}

function check(item, callback) {
	switch(item.kind) {
		case 'dependencies':
			async.map(Object.getOwnPropertyNames(item.context.dependencies), checkDependency.bind(item.context), function (err, results) {
				if(err) return callback(err);
				var valid = allValid(results);
				if (!valid) item.logger.log('dependency check: ' + util.inspect(results));
				callback(null, valid);
			});
			break;
		case 'plugins':
			async.map(Object.getOwnPropertyNames(item.context.plugins), checkPlugin.bind(item.context), function (err, results) {
				if(err) return callback(err);
				var valid = allValid(results);
				if (!valid) item.logger.log('plugin check: ' + util.inspect(results));
				callback(null, valid);
			});
			break;
		default:
			return callback(new Error('invalid dependency kind detected'));
	}
}

module.exports = {
	check: check
}