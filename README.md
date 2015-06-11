# electron-updater 
Cross platform auto-updater for electron apps

[![Build Status](https://travis-ci.org/EvolveLabs/electron-updater.svg?branch=master)](https://travis-ci.org/EvolveLabs/electron-updater)

# Install
There are two separate packages that make up the `electron-updater`. The updater itself runs in your app's main process while the plugins project loads the plugins downloaded by the updater into the render process. If you don't use plugins, then you don't need the second project.

    $ npm install electron-updater --save
    $ npm install electron-plugins --save
    
### Related
See the [`electron-builder`](https://www.npmjs.com/package/electron-builder) project for creating installers for
various platforms.

See the [`sinopia`](https://www.npmjs.com/package/sinopia) project for hosting your own npm packages.

## Features
 * Cross platform (win32, darwin, linux)
 * Update notifications
 * Update electron binaries in place
 * Update your application and dependencies in place
 * Download prebuilt binaries per-platform
 * Side-by-Side update of plugins
 * Leverages npm for distribution
 * Fully based on javascript and node
 * Designed for [`electron`](https://github.com/atom/electron)
 * Works well with [`electron-builder`](https://npmjs.org/package/electron-builder)
 
## Example main.js
```JavaScript
var app = require('app'),
    BrowserWindow = require('browser-window'),
    updater = require('electron-updater')

var mainWindow = null

app.on('ready', function() {
    updater.on('ready', function () {
        mainWindow = new BrowserWindow({width: 800, height: 600})
        mainWindow.loadUrl('file://' + __dirname + '/index.html')
        mainWindow.openDevTools({detach:true})        
        mainWindow.on('closed', function() {
            mainWindow = null;
        })
    })
    updater.on('updateRequired', function () {        
        app.quit();
    })
    updater.on('updateAvailable', function () {
        mainWindow.webContents.send('update-available');
    })
    updater.start()
})
```

## Example index.js (running in render process)
```JavaScript
var plugins = require('electron-plugins'),
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
