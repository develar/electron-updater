var path = require('path'),
    fs = process.versions.electron ? require('original-fs') : require('fs'),
    util = require('util'),
    directory = require('./directory.js')

function pad(n, width, z) {
    z = z || 0
    n = n + ''
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

function padr(n, width, z) {
    z = z || 0
    n = n + ''
    return n.length >= width ? n : n + new Array(width - n.length + 1).join(z)
}

function formattedDateTime() {
     var d = new Date()
     var dd = pad(d.getDate(), 2)
     var MM = pad(d.getMonth() + 1, 2) //Months are zero based
     var yy = pad(d.getFullYear(), 4)
     var hh = pad(d.getHours(), 2)
     var mm = pad(d.getMinutes(), 2)
     var ss = pad(d.getSeconds(), 2)
     var mi = pad(d.getMilliseconds(), 3)
     return `${dd}/${MM}/${yy}:${hh}:${mm}:${ss}:${mi}`
}

function appendToFile(kind, message, callback) {
    var d = formattedDateTime()
    var pid = pad(process.pid, 5)
    var pre = padr(`[${d}:${kind}:${pid}]`, 37, ' ')
    var line = `${pre}${message}\n`
    var logPath = this.logPath

    this.appendToConsole(kind, message)
    directory.create(path.dirname(logPath), function (err) {
        if(err) return console.error('Error creating logger directory: ' + logPath)
        fs.appendFile(logPath, line, {encoding: 'utf8'}, function (err) {
            if(err) console.error('Error writing to log: ' + util.inspect(err))
            if(callback) callback();
        })
    })
}

function appendToConsole(kind, message, callback) {
    if(this.debug) {
        console[kind](message)
    }
    if(callback) callback();
}

function Logger(appDir, logFn, debug) {
    this.debug = !!debug
    this.logFn = logFn || appendToFile
    if(appDir) this.logPath = path.join(appDir, 'logs', 'updater.log')
}

function log(message) {
    this.logFn('log', message)
}

function info(message) {
    this.logFn('info', message)
}

function warn(message) {
    this.logFn('warn', message)
}

function error(message, callback) {
    this.logFn('error', message, callback)
}

function debug(message) {
    if(this.debug) {
        this.logFn('debug', message)
    }
}

Logger.prototype.log = log
Logger.prototype.info = info
Logger.prototype.warn = warn
Logger.prototype.error = error
Logger.prototype.debug = debug
Logger.prototype.appendToConsole = appendToConsole
Logger.appendToFile = appendToFile
Logger.appendToConsole = appendToConsole
Logger.default = new Logger(null, appendToConsole, false)
module.exports = Logger