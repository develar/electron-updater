var directory = require('./directory.js'),
  path = require('path'),
  fs = process.versions.electron ? require('original-fs') : require('fs'),
  async = require('async'),
  file = require('./file.js'),
  os = require('os')

var defaultRegistry = "https://registry.npmjs.org"

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

function readNpmrc(appDir, callback) {
  var npmrc = path.join(appDir, '.npmrc')
  fs.readFile(npmrc, {encoding:'utf8'}, function (err, contents) {
    if (err) return callback(defaultRegistry)
    var registry = defaultRegistry
    var match = 'registry='
    contents.split('\n').forEach(function (line) {
      line = line.trim()
      if(line.indexOf(match) === 0) {
        registry = line.substring(match.length).replace(/\n/g, '')
        return false
      }
    })
    callback(registry)
  })
}

function load(appDir, callback) {
  if(!appDir || !callback) throw new Error('Failed to load app context: invalid argument')
  isDevDirectory(appDir, function (dev) {
    readNpmrc(appDir, function (registry) {
      var packagePath = path.join(appDir, 'package.json')
      file.readJson(packagePath, function (err, package) {
        if (err) return callback(err)
        var name = package.name
        var version = package.version
        var publisher = package.publisher || name
        var defaultChannel = package.defaultChannel || 'latest'
        var appData = directory.appDir(publisher, name)
        var pendingUpdatePath = path.join(appData, '.update')
        var channelPath = path.join(appData, '.channel')
        fs.readFile(channelPath, {encoding: 'utf8'}, function (err, channel) {
          channel = channel || defaultChannel
          fs.readFile(pendingUpdatePath, {encoding: 'utf8'}, function (err, updateContents) {
            var updatePending = !err && updateContents === 'PENDING'
            var updateInProgress = !err && updateContents === 'INPROGRESS'
            var ctx = {
              name: name,
              version: version,
              publisher: publisher,
              channel: channel,
              dev: dev,
              platform: os.platform(),
              arch: os.arch(),
              configuration: dev ? 'debug' : 'release',
              updatePending: updatePending,
              updateInProgress: updateInProgress,
              registry: registry,
              appDir: appDir,
              dependencies: package.dependencies || {},
              plugins: package.plugins || {}
            }
            callback(null, ctx)
          })
        })
      })
    })
  })
}

module.exports = {
  load: load
}