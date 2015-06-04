
var spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    AppDirectory = require('appdirectory'),
    os = require('os')

function runasWindows(appName, process, argv, cwd) {
    exec('echo hi', function (error) {
        if(error) {
            var dirs = new AppDirectory(appName)
            var appDir = path.dirname(dirs.userData())
            var updateScript = path.join(appDir, 'update.vbs')
            var args = argv.join(' ')
            var script = 
                'Set UAC = CreateObject("Shell.Application")' + '\n' +
                `UAC.ShellExecute "${process}", "${args}", "", "runas", 1`

            fs.writeFile(updateScript, script, function (err) {
                if(err) console.log(err)
                var child = spawn("wscript", [updateScript], {
                    detached: true,
                    cwd: cwd,
                    stdio: ['ignore', 'pipe', 'pipe']
                })
                child.unref()
            })

        } else {
            runasDefault(appName, process, argv, cwd)
        }
    })    
}

function runasDefault(appName, process, argv, cwd) {
    var child = spawn(process, argv, {
        detached: true,
        cwd: cwd,
        stdio: [ 'ignore', 'pipe', 'pipe']
    });
    child.unref();
}

function runas(appName, process, argv, cwd) {
    switch(os.platform()) {
        case 'win32':
            runasWindows(appName, process, argv, cwd)
            break
        default:
            runasDefault(appName, process, argv, cwd)
            break
    }
}

module.exports = runas