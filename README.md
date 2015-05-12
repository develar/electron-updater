# electron-updater
Cross platform auto-updater for electron apps

# Install
There are two separate packages that make up the `electron-updater`. The updater itself runs in your app's main process while the plugins project loads the plugins downloaded by the updater into the render process. If you don't use plugins, then you don't need the second project.

    $ npm install electron-updater --save
    $ npm install electron-plugins --save

## Features
 * Update notifications
 * Update electron binaries in place
 * Update application
 * Download prebuilt binaries per-platform
 * Side-by-Side update of plugins
 * Leverages npm for distribution
 * Fully based on javascript and node
 * Designed for [`electron`](https://github.com/atom/electron)
 
## Example main.js
```JavaScript
var app = require('app'),
    ipc = require('ipc'),
    util = require('util'),
    BrowserWindow = require('browser-window'),
    updater = require('electron-updater')
  
require('crash-reporter').start()

var mainWindow = null, 
    loaded = false

app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit()
})

app.on('ready', function() {
    // Instead of launching your window right away, start the updater
    // to check to see if the app is valid or not.
    // An app is invalid if any of its dependencies or plugins are missing.
    // In this case the updater will begin a 'full' update. Once updated
    // your app will be re-launched.

    updater.on('ready', function () {        
        // This event is called if your app is currently valid.
        // It may be out-of-date but it has all of the necessary
        // dependencies and plugins to launch right now.
        // Your app maybe also receive an update-available event following this

        mainWindow = new BrowserWindow({width: 800, height: 600})
        mainWindow.loadUrl('file://' + __dirname + '/index.html')
        mainWindow.openDevTools({detach:true})        
        mainWindow.on('closed', function() {
            mainWindow = null;
        });
    })
    updater.on('updateRequired', function () {
        // This event is fired if your app is not currently valid at startup.
        // The app must be exited immediately and the auto-updater will be run instead.
        // After the auto-update runs the app will be re-run.
        
        app.quit();
    })
    updater.on('updateAvailable', function () {
        // This event is fired after new versions of plugins have been downloaded and
        // before the app and dependencies are downloaded. Plugins are installed side-by-side
        // so they can be downloaded while the app is running.
        
        // After the app is restarted it will watch for updates and fire the updated required
        // event when newer versions are available.

        if(mainWindow) {
            // Send a message to your view(s)
            mainWindow.webContents.send('update-available');
        }
    })

    updater.start()
})
```

## Example index.js (running in render process)
```JavaScript
var plugins = require('electron-plugins'),
	util = require('util'),
	ipc = require('ipc')

document.addEventListener('DOMContentLoaded', function () {
	var context = { document: document }
	plugins.load(context, function (err, loaded) {
		if(err) return console.error(err)
		console.log('Plugins loaded successfully.')
	})
})

ipc.on('update-available', function () {
	console.log('there is an update available for download')
})
```
