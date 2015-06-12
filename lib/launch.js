
var spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    os = require('os'),
    directory = require('./directory.js')

function escape(argv) {
    for(var i=0, n=argv.length; i<n; i++) {
        var arg = argv[i]
        argv[i] = '""' + arg + '""'
    }
    return argv.join(' ')
}

function elevateWindows(appName, process, argv, cwd, callback) {
    exec('net session', function (error) {
        if(error) {
            var appDir = directory.appDir(appName)
            var updateScript = path.join(appDir, 'update.vbs')
            var args = escape(argv)
            var script = 
                'Set UAC = CreateObject("Shell.Application") \n' +
                `UAC.ShellExecute "${process}", "${args}", "", "runas", 1`

            // We're using vbs here because we can't use native modules in the updater (yet).
            fs.writeFile(updateScript, script, function (err) {
                if(err) return callback(err)
                var child = spawn("wscript", [updateScript], {
                    detached: true,
                    cwd: cwd,
                    stdio: ['ignore', 'pipe', 'pipe']
                })
                child.unref()
                callback(null, child)
            })

        } else {
            callback(new Error('Already elevated.'))
        }
    })
}

function elevate(appName, process, argv, cwd, callback) {
    switch(os.platform()) {
        case 'win32':
            elevateWindows(appName, process, argv, cwd, callback)
            break
        default:
            callback(new Error('Not implemented on this platform.'))
            break
    }
}

module.exports = {
    elevate: elevate
}