var directory = require('./directory.js'),
  file = require('./file.js'),
  fs = process.versions.electron ? require('original-fs') : require('fs'),
  path = require('path'),
  util = require('util'),
  async = require('async');

var whitelist = [
  'resources',
  'default_app',
  'locales'
]

function copyFile(sourceDir, destDir, name, callback) {
  var sourceFile = path.join(sourceDir, name)
  var destFile = path.join(destDir, name)
  fs.stat(sourceFile, function (err, sourceStat) {
    if(err) return callback(err);
    fs.stat(destFile, function (err, destStat) {
      if(sourceStat.isFile() && (err || !destStat || (sourceStat.mtime > destStat.mtime))) {
        file.copy(sourceFile, destFile, callback)
      } else if(sourceStat.isDirectory() && whitelist.indexOf(path.basename(sourceFile)) >= 0) {
        copyDir(sourceFile, destFile, callback)
      } else {
        callback()
      }
    })
  })
}

function copyDir(sourceDir, destDir, callback) {
  directory.create(destDir, function () {
    fs.readdir(sourceDir, function (err, files) {
      if(err) return callback(err);
      async.forEach(
        files,
        function (f, callback) {
          copyFile(sourceDir, destDir, f, callback)
        },
        callback)
    })
  })
}

// copy files
function copy(execPath, publisher, appName, callback) {
  // get directory that the executable exists
  var execDir = path.join(path.dirname(execPath));
  var os = require('os');
  if (os.platform() == 'darwin') {
    execDir = path.join(execDir, '../../../');
    console.log(execDir);
    execPath = execPath + ".app";
  }
  // fetch appdata directory, OS specific
  var appData = directory.appDir(publisher, appName);
  // figure out the version of electron we're running
  var electronVersion = process.versions.electron;
  // directory to place updates in, nested within the appData/evolve-client/updates/VERSION/
  var updateDir = path.join(appData, 'updater', electronVersion);
  // recursively copy a directory and all of it's files
  require('ncp').ncp(execDir, updateDir, function (err) {
    if(err) return callback(err);
    console.log("copied exec");
    console.log(path.basename(execPath));
    // after copy back, fire off the callback
    callback(null, path.join(updateDir, path.basename(execPath)));
  });
}

module.exports = {
  copy: copy
}