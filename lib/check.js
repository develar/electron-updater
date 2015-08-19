var semver = require('semver'),
    fs = process.versions.electron ? require('original-fs') : require('fs'),
    async = require('async'),
    path = require('path'),
    file = require('./file.js'),
    directory = require('./directory.js'),
    got = require('got');


function satisfy(registry, name, desired, current, exists, callback) {
  var url = registry + '/' + name
  got(url, {json:true}, function (err, data) {
    if(err) return callback(err)
    var versions = data.versions
    var available;
    Object.getOwnPropertyNames(data.versions).forEach(function (v) {
      if(semver.satisfies(v, desired) && (!available || semver.gt(v, available))) {
        available = v
      }
    })
  
    if(available && (!exists || semver.gt(available, current))) {      
      return callback(null, {
        name: name,
        desired: desired,
        current: current,
        available: available
      })
    }

    // We already have the most up-to-date version
    callback()
  })
}

function checkApp(context, callback) {
  var registry = context.registry
  var name = context.name
  var channel = context.channel
  var current = context.version
  var url = registry + '/' + name
  got(url, {json:true}, function(err, data) {
    if(err) return callback(err)
    var distTags = data['dist-tags']
    var available = distTags[channel]
    if (available && semver.gt(available, current)) {
      return callback(null, {
        name: name,
        desired: channel,
        current: current,
        available: available
      })
    } else {
      callback()
    }
  })
}

function checkDependency(name, callback) {
  if(this.dev) return callback()
  var appName = this.name
  var registry = this.registry
  var desired = this.dependencies[name]
  var packagePath = path.join(this.appDir, 'node_modules', name, 'package.json')
  file.readJson(packagePath, function (err, pkg) {
    var exists = !err
    var current = (pkg && pkg.version) || '0.0.0'
    satisfy(registry, name, desired, current, exists, callback)
  })
}

function checkPlugin(name, callback) {
  var appName = this.name
  var appVersion = this.version
  var registry = this.registry
  var publisher = this.publisher
  var desired = this.plugins[name]
  var appData = directory.appDir(publisher, appName)
  var currentPluginsPath = path.join(appData, '.current')
  file.readJson(currentPluginsPath, function (err, data) {
    var current = (data && data[name]) || '0.0.0'
    var pluginPackagePath = path.join(appData, 'plugins', name, current, 'package.json')
    var pluginPackageLinkPath = path.join(appData, 'plugins', name, 'link', 'package.json')
    fs.stat(pluginPackageLinkPath, function (linkErr, stat) {
      fs.stat(pluginPackagePath, function (err, stat) {
        if (!linkErr) return callback(false)
        var exists = !err
        satisfy(registry, name, desired, current, exists, callback)
      })
    })
  })
}

function check(item, callback) {
  switch(item.kind) {
    case 'app':
      checkApp(item.context, callback)
      break;
    case 'dependencies':
      async.map(Object.getOwnPropertyNames(item.context.dependencies), checkDependency.bind(item.context), callback)
      break;
    case 'plugins':
      async.map(Object.getOwnPropertyNames(item.context.plugins), checkPlugin.bind(item.context), callback)
      break;
    default:
      return callback(new Error('invalid dependency kind detected'))
  }
}

module.exports = {
  check: check
}