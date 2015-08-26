# electron-updater 
Cross platform auto-updater for electron apps

[![Build Status](https://travis-ci.org/EvolveLabs/electron-updater.svg?branch=master)](https://travis-ci.org/EvolveLabs/electron-updater)

# Install
There are two separate packages that make up the `electron-updater`. The updater itself runs in your app's main process while the plugins project loads the plugins downloaded by the updater into the render process. If you don't use plugins, then you don't need the second project.

    $ npm install electron-updater --save
    $ npm install electron-plugins --save
    $ npm install electron-updater-tools -g
    
# Usage
Integrate the electron-updater into your electron main process. Below is a simplified example of the [Electron Quick Start](http://electron.atom.io/docs/latest/tutorial/quick-start/#write-your-first-electron-app) code with the `electron-updater` mixed in.
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

# Publishing Updates
There are two kinds of updates you can publish:
 * The Application itself
 * Plugins

Both kinds of updatable packages are distributed through [npm](http://npmjs.org). This means that publishing updates to your application and plugins are essentially done like this:
```
$ npm pack
$ npm pub
```
The application will periodically check npm for updates to any packages and update them when it can.

## Hosting your own npm server
If you are developing a commercial application, or just want to control distribution yourself, you should host your own packages on your own npm server.

Add a path to your registry in the applications `package.json`:
```
  "registry": "http://npm.mycompany.com:4873",
```
To tell npm to use this registry also, create a [.npmrc file](https://docs.npmjs.com/files/npmrc) in your application root directory containing:
```
registry=http://npm.mycompany.com:4873
```

Fortunately, hosting your own npm server is very easy to do with [sinopia](http://npmjs.org/packages/sinopia).
```
$ npm install sinopia -g
$ sinopia
```
To run sinopia as a service, you can use [forever](http://npmjs.org/packages/forever).
```
$ npm install forever -g
$ forever start sinopia
```

## Plugins
Plugins are different than normal dependencies. To establish a link to a plugin, add a `plugins` entry into your applications `package.json`:
```
  "dependencies": {
    # ...
  },
  "plugins": {
    "electron-updater-example-plugin": "~0.1.0"
  },
```
When your application runs it will download and install these plugins into your users [AppDirectory.userData()](https://www.npmjs.com/package/appdirectory) folder. The main benefits of plugins is:
 * Gauranteed user directory, does not require elevation to update.
 * Supports side-by-side installation, so they can be updated while the app is running.
 * Application can be refreshed instead of restarted to apply updates.
 * Load arbitrary plugins using [electron-plugins](https://npmjs.org/packages/electron-plugins), instead of having fixed dependencies only.

In the `userData` folder there is also a `.current` file created, which is used to maintain the list of currently installed plugins. You can add items to that file to install non-default plugins.

# Distributing binaries
TODO...

### Related
See the [`electron-builder`](https://www.npmjs.com/package/electron-builder) project for creating installers for
various platforms.
