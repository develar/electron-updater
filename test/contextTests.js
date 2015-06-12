var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect

describe('context', function () {

  var context,
    _file,
    _fs,
    _mocks,
    _context

  beforeEach(function () {
    _file = {
      readJson: sinon.stub()
    }
    _fs = {
      stat: sinon.stub(),
      readFile: sinon.stub(),
      readdir: sinon.stub()
    }
    _mocks = {
      './file.js': _file,
      'fs': _fs
    }
    context = proxyquire('../lib/context.js', _mocks)
  })

  describe('load', function () {
    beforeEach(function () {
      _fs.readdir
        .callsArgWith(1, 'ENOENT')
      _fs.readFile
        .callsArgWith(2, 'ENOENT')
      _fs.stat
        .callsArgWith(1, 'ENOENT')
      _file.readJson
        .callsArgWith(1, null, {name:'test'})
    })
    describe('dev repo', function () {
      ['.git', '.svn'].forEach(function (devDir) {
        describe('when in a ' + devDir + ' repo', function () {
          it('should set dev: true in context', function (done) {           
            _fs.readdir
              .withArgs(path.join('/test', devDir))
              .callsArgWith(1, null, {})
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.dev).to.be.true
              done()  
            })
          })
        })
      })
    })
    describe('channel', function () {
      describe('when .channel is available', function () {
        it('should set the channel to file contents', function (done) {
          _fs.readFile.onSecondCall().callsArgWith(2, null, 'beta')
          context.load('/test', function (err, context) {
            if(err) return done(err)
            expect(context.channel).to.equal('beta')
            done()
          })
        })
      })
      describe('when the .channel is not available', function () {
        describe('and is set in package.json', function () {
          it('should default the channel to default', function (done) {
            _file.readJson.callsArgWith(1, null, {name:'test', defaultChannel:'default'})
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.channel).to.equal('default')
              done()
            })
          })
        })
        describe('and is not set in package.json', function () {
          it('should default the channel to "latest"', function (done) {
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.channel).to.equal('latest')
              done()
            })
          })
        })
      })
    })
    describe('pending update', function () {
      describe('when the .update file is available', function () {
        describe('and contains PENDING', function () {
          beforeEach(function () {
            _fs.readFile.callsArgWith(2, null, 'PENDING')
          })
          it('should set updatePending to true', function (done) {
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.updatePending).to.be.true
              done()
            })
          })
          it('should set updateInProgress to false', function (done) {
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.updateInProgress).to.be.false
              done()
            })
          })
        })
        describe('and contains INPROGRESS', function (done) {
          beforeEach(function () {
            _fs.readFile.callsArgWith(2, null, 'INPROGRESS')
          })
          it('should set updatePending to true', function (done) {
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.updatePending).to.be.false
              done()
            })
          })
          it('should set updateInProgress to false', function (done) {
            context.load('/test', function (err, context) {
              if(err) return done(err)
              expect(context.updateInProgress).to.be.true
              done()
            })
          })
        })
      })
      describe('when the .update file is not available', function () {
        it('should set pendingUpdate to false', function (done) {
          context.load('/test', function (err, context) {
            if(err) return done(err)
            expect(context.updatePending).to.be.false
            done()
          })
        })
      })
    })
    describe('dependencies', function () {
      describe('when the package has dependencies', function () {
        it('should set dependencies to package dependencies', function (done) {
          var deps = {}
          _file.readJson.callsArgWith(1, null, {name: 'test', dependencies: deps})
          context.load('/test', function (err, context) {
            if(err) return done(err)
            expect(context.dependencies).to.equal(deps)
            done()
          })
        })  
      })
      describe('when the package doesnt have dependencies', function () {
        it('should default dependencies to {}', function (done) {
          context.load('/test', function (err, context) {
            if(err) return done(err)
            expect(context.dependencies).to.deep.equal({})
            done()
          })
        })
      })
    })
    describe('plugins', function () {
      describe('when the package has plugins', function () {
        it('should set the plugins to package plugins', function (done) {
          var plugins = {}
          _file.readJson.callsArgWith(1, null, {name: 'test', plugins: plugins})
          context.load('/test', function (err, context) {
            if(err) return done(err)
            expect(context.plugins).to.equal(plugins)
            done()
          })
        })
      })
      describe('when the package has no plugins', function () {
        it('should default to {}', function (done) {
          context.load('/test', function (err, context) {
            if(err) return done(err)
            expect(context.plugins).to.deep.equal({})
            done()
          })
        })
      })
    })
    it('should set name to the package name', function (done) {
      context.load('/test', function (err, context) {
        if(err) return done(err)
        expect(context.name).to.equal('test')
        done()
      })
    })
    it('should set version to the package version', function (done) {
      _file.readJson.callsArgWith(1, null, {name: 'test', version: '1.0.0'})
      context.load('/test', function (err, context) {
        if(err) return done(err)
        expect(context.version).to.equal('1.0.0')
        done()
      })
    })
    it('should set appDir to the provided appDir', function (done) {
      context.load('/test', function (err, context) {
        if(err) return done(err)
        expect(context.appDir).to.equal('/test')
        done()
      })
    })    
    it('should resolve the registry from .npmrc settings', function (done) {
      _fs.readFile.onFirstCall().callsArgWith(2, null, 'registry=http://private.registry.com')
      context.load('/test', function (err, context) {
        expect(context.registry).to.equal('http://private.registry.com')
        done(err)
      })
    })
  })
})