var download = require('./download.js'),
  semver = require('semver'),
  async = require('async'),
  path = require('path'),
  file = require('./file.js'),
  fs = require('fs'),
  directory = require('./directory.js'),
  AppDirectory = require('appdirectory')

function satisfy(registry, name, desired, current, exists, callback) {
  var url = registry + '/' + name + '/' + desired
  download.getJson(url, function (err, data) {
    if(err) return callback(err)
    var available = semver.clean(data.version)
  
    if(!exists || semver.gt(available, current)) {      
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
  var desired = context.channel
  var current = context.version
  satisfy(registry, name, desired, current, true, callback)
}

function checkDependency(name, callback) {
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
  var desired = this.plugins[name]
  var dirs = new AppDirectory(appName)
  var appData = path.dirname(dirs.userData())
  var currentPluginsPath = path.join(appData, '.current')
  file.readJson(currentPluginsPath, function (err, data) {
    var current = (data && data[name]) || '0.0.0'   
    var pluginPackagePath = path.join(appData, 'plugins', name, current, 'package.json')
    fs.stat(pluginPackagePath, function (err, stat) {
      var exists = !err
      satisfy(registry, name, desired, current, exists, callback)
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