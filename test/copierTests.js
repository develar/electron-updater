var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect,
  util = require('util')


describe('copier', function () {

  var copier,
    _mocks,
    _file,
    _fs,
    _directory,
    _context,
    _files

  beforeEach(function () {
    _file = {
      copy: sinon.stub()
    }
    _file.copy.callsArgWith(2, null)
    _files = []
    _fs = {
      stat: sinon.stub(),
      readFile: sinon.stub(),
      readdir: sinon.stub()
    }
    _fs.readdir.callsArgWith(1, null, [])
    _directory = {
      create: sinon.stub(),
      appDir: sinon.stub().returns(path.join('/test'))
    }
    _directory.create.callsArgWith(1)
    _mocks = {
      './file.js': _file,
      './directory.js': _directory,
      'original-fs': _fs
    }
    process.versions.electron = '1.0.0'
    copier = proxyquire('../lib/copier.js', _mocks)
  })

  function addDirs(p, item) {
    if(!item) { item = p; p = '' }
    var name = item.name
    var source = path.join(p, name)
    var dest = path.join('/test/updater/1.0.0', source)
    if(item.files) {
      var files = []
      for(var i=0,n=item.files.length;i<n;i++) {
        var f = item.files[i]
        files.push(f.name)
      }
      _fs.readdir
        .withArgs(source)
        .callsArgWith(1, null, files)
      _fs.stat
        .withArgs(source)
        .callsArgWith(1, null, { mtime: 1, isFile: sinon.stub().returns(false), isDirectory: sinon.stub().returns(true) })
      _fs.stat
        .withArgs(dest)
        .callsArgWith(1)
      for(var i=0,n=item.files.length;i<n;i++) {
        var f = item.files[i]
        addDirs(source, f)
      }
    } else {
       _fs.stat
        .withArgs(source)
        .callsArgWith(1, null, { mtime: 1, isFile: sinon.stub().returns(true) })
      _fs.stat
        .withArgs(dest)
        .callsArgWith(1)
    }
  }

  function expectDirs(p, item) {
    if(!item) { item = p; p = '' }
    var name = item.name
    var source = path.join(p, name)
    if(item.files) {
      for(var i=0,n=item.files.length;i<n;i++) {
        var f = item.files[i]
        expectDirs(source, f)
      }      
    } else {
        var dest = path.join('/test/updater/1.0.0', source)
        expect(_file.copy.calledWith(source, dest)).to.be.true
    }
  }

  it('should copies files in the same directory as electron.exe', function (done) {
    var dirs = {
      name: '/',
      files: [ { name: 'a.txt' } ]
    }
    addDirs(dirs)
    copier.copy('/electron.exe', 'app', 'test', function (err) {
      if(err) return done(err)
      expectDirs(dirs)
      done()
    })
  })
  it('should copy files in resources directory', function (done) {
    var dirs = {
      name: '/',
      files: [
        { name: 'resources', files: [{ name: 'test.txt' }] }
      ]
    }
    addDirs(dirs)
    copier.copy('/electron.exe', 'app', 'test', function (err) {
      if(err) return done(err)
      expectDirs(dirs)
      done()
    })
  })
  it('should copy files in resources/default_app directory', function (done) {
    var dirs = {
      name: '/',
      files: [{ 
        name: 'resources', 
        files: [{ 
          name: 'default_app', 
          files: [{ name: 'test.txt' }]
        }]
      }
    ]}
    addDirs(dirs)
    copier.copy('/electron.exe', 'app', 'test', function (err) {
      if(err) return done(err)
      expectDirs(dirs)
      done()
    })
  })
  it('should copy files in locales directory', function (done) {
    var dirs = {
      name: '/',
      files: [{ 
        name: 'locales', 
        files: [{ name: 'test.txt' }]
      }
    ]}
    addDirs(dirs)
    copier.copy('/electron.exe', 'app', 'test', function (err) {
      if(err) return done(err)
      expectDirs(dirs)
      done()
    })
  })
  it('should not copy files in the app directory', function (done) {
    var dirs = {
      name: '/',
      files: [{ 
        name: 'resources', 
        files: [{ 
          name: 'app', 
          files: [{ name: 'test.txt' }]
        }]
      }
    ]}
    addDirs(dirs)
    copier.copy('/electron.exe', 'app', 'test', function (err) {
      if(err) return done(err)
      var source = path.join('/', 'resources', 'app', 'test.txt')
      var dest = path.join('/', 'test', 'updater', '1.0.0', 'resources', 'app', 'test.txt')
      expect(_file.copy.calledWith(source, dest)).to.not.be.true
      done()
    })
  })
})