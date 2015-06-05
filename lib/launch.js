
var spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    AppDirectory = require('appdirectory'),
    os = require('os')

function elevateWindows(appName, process, argv, cwd, callback) {
    exec('net session', function (error) {
        if(error) {
            var dirs = new AppDirectory(appName)
            var appDir = path.dirname(dirs.userData())
            var updateScript = path.join(appDir, 'update.vbs')
            var args = argv.join(' ')
            var script = 
                'Set UAC = CreateObject("Shell.Application") \n' +
                `UAC.ShellExecute "${process}", "${args}", "", "runas", 1`

            fs.writeFile(updateScript, script, function (err) {
                if(err) return callback(err)
                var child = spawn("wscript", [updateScript], {
                    //detached: true,
                    cwd: cwd,
                    stdio: ['ignore', 'pipe', 'pipe']
                })
                callback(null, child)
            })

        } else {
            callback()
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