var directory = require('./directory.js'),
  path = require('path'),
  fs = require('fs'),
  async = require('async'),
  file = require('./file.js'),
  AppDirectory = require('appdirectory')

function isDevDirectory(appDir, callback) {
  var gitDir = path.join(appDir, '.git')
  var svnDir = path.join(appDir, '.svn')
  fs.readdir(gitDir, function (err) {
    if(!err) return callback(true)
    fs.readdir(svnDir, function (err) {
      if(!err) return callback(true)
      callback(false)
    })
  })
}

function load(appDir, callback) {
  if(!appDir || !callback) throw new Error('Failed to load app context: invalid argument')
  isDevDirectory(appDir, function (dev) {
    var packagePath = path.join(appDir, 'package.json')
    file.readJson(packagePath, function (err, package) {
      if (err) return callback(err)
      var name = package.name
      var version = package.version
      var dirs = new AppDirectory(name)
      var appData = path.dirname(dirs.userData())
      var pendingUpdatePath = path.join(appData, '.update')
      var channelPath = path.join(appData, '.channel')
      fs.readFile(channelPath, function (err, channel) {
        channel = channel || 'latest'
        fs.stat(pendingUpdatePath, function (err, stat) {
          var pendingUpdate = !err && stat.isFile()
          callback(null, {
            name: name,
            version: version,
            channel: channel,
            dev: dev,
            pendingUpdate: pendingUpdate,
            registry: "https://registry.npmjs.org", // resolve from .npmrc's
            appDir: appDir,
            dependencies: package.dependencies || {},
            plugins: package.plugins || {}
          })
        })
      })
    })
  })
}

module.exports = {
  load: load
}