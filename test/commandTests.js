var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect

describe('command,', function () {

  var commands,
    _mocks,
    _context,
    _check,
    _update,
    _exists,
    _copier,
    _ctx,
    _child_process,
    _child,
    _file

  beforeEach(function () {
    _context = {
      load: sinon.stub()
    }
    _check = {
      check: sinon.stub()
    }
    _update = {
      update: sinon.stub()
    }
    _exists = {
      check: sinon.stub()
    }
    _copier = {
      copy: sinon.stub()
    },
    _child_process = {
      spawn: sinon.stub()
    }
    _child = {
      unref: sinon.stub()
    }
    _file = {
      touch: sinon.stub()
    }
    _mocks = {
      './context.js': _context,
      './check.js': _check,
      './update.js': _update,
      './exists.js': _exists,
      './copier.js': _copier,
      './file.js': _file,
      'child_process': _child_process
    }
    commands = proxyquire('../lib/commands.js', _mocks)

    _ctx = {
      name: 'test',
      version: '1.0.0',
      dependencies: {},
      plugins: {}
    }
    _context.load.callsArgWith(1, null, _ctx)
    _check.check.callsArgWith(1, null, [])
    _check.check.onFirstCall().callsArgWith(1, null)
    _update.update.callsArg(2)
    _copier.copy.callsArgWith(2, null, '/tmp/app')
    _child_process.spawn.returns(_child)
    _file.touch.callsArg(2)
  })

  describe('isValid', function () {
    beforeEach(function () {
      _exists.check.callsArgWith(1, null, false)
    })
    it('should default to main modules dir if not specified', function (done) {
      commands.isValid(function (err, result) {
        expect(_context.load.calledWith(path.dirname(process.mainModule.filename))).to.be.true
        done(err)
      })
    })
    it('should load context from appdir', function (done) {
      commands.isValid('/test', function (err, result) {
        expect(_context.load.calledWith('/test')).to.be.true
        done(err)
      })
    })
    it('should check dependencies', function (done) {
      commands.isValid(function (err, result) {
        expect(_exists.check.calledWith({kind:'dependencies', context: _ctx})).to.be.true
        done(err)
      })
    })
    it('should check plugins', function (done) {
      commands.isValid(function (err, result) {
        expect(_exists.check.calledWith({kind:'plugins', context: _ctx})).to.be.true
        done(err)
      })
    })
    it('should not check app', function (done) {
      commands.isValid(function (err, result) {
        expect(_exists.check.calledWith({kind:'app', context: _ctx})).to.be.false
        done(err)
      })
    })
    it('should return false if only dependencies exist', function (done) {
      _exists.check.onFirstCall().callsArgWith(1, null, true)
      commands.isValid(function (err, result) {
        expect(result).to.be.false
        done(err)
      })
    })
    it('should return false if only plugins exist', function (done) {
      _exists.check.onSecondCall().callsArgWith(1, null, true)
      commands.isValid(function (err, result) {
        expect(result).to.be.false
        done(err)
      })
    })
    it('should return false if dependencies and plugins do not exist', function (done) {
      commands.isValid(function (err, result) {
        expect(result).to.be.false
        done(err)
      })
    })
    it('should return true if dependencies and plugins exist', function (done) {
      _exists.check.callsArgWith(1, null, true)
      commands.isValid(function (err, result) {
        expect(result).to.be.true
        done(err)
      })
    })
  })

  describe('list', function () {
    it('should default to main modules dir if not specified', function (done) {
      commands.list(function (err, result) {
        expect(_context.load.calledWith(path.dirname(process.mainModule.filename))).to.be.true
        done(err)
      })
    })
    it('should load context from appdir', function (done) {
      commands.list('/test', function (err, result) {
        expect(_context.load.calledWith('/test')).to.be.true
        done(err)
      })
    })
    it('should return app name', function (done) {
      commands.list(function (err, result) {
        expect(result.name).to.equal('test')
        done(err)
      })
    })
    it('should return app version', function (done) {
      commands.list(function (err, result) {
        expect(result.version).to.equal('1.0.0')
        done(err)
      })
    })
    it('should return dependencies', function (done) {
      commands.list(function (err, result) {
        expect(result.dependencies).to.equal(_ctx.dependencies)
        done(err)
      })
    })
    it('should return plugins', function (done) {
      commands.list(function (err, result) {
        expect(result.plugins).to.equal(_ctx.plugins)
        done(err)
      })
    })
  })

  describe('check', function () {
    it('should default to main modules dir if not specified', function (done) {
      commands.check(function (err, result) {
        expect(_context.load.calledWith(path.dirname(process.mainModule.filename))).to.be.true
        done(err)
      })
    })
    it('should load context from appdir', function (done) {
      commands.check('/test', function (err, result) {
        expect(_context.load.calledWith('/test')).to.be.true
        done(err)
      })
    })
    it('should check app', function (done) {
      commands.check(function (err) {
        expect(_check.check.calledWith({context: _ctx, kind: 'app' })).to.be.true
        done(err)
      })
    })
    it('should check dependencies', function (done) {
      commands.check(function (err) {
        expect(_check.check.calledWith({context: _ctx, kind: 'dependencies' })).to.be.true
        done(err)
      })
    })
    it('should check plugins', function (done) {
      commands.check(function (err) {
        expect(_check.check.calledWith({context: _ctx, kind: 'plugins' })).to.be.true
        done(err)
      })
    })
    it('should return null if no updates are available', function (done) {
      commands.check(function (err, results) {
        expect(results).to.be.undefined
        done(err)
      })
    })
    it('should return app if app updates are available', function (done) {
      _check.check.onFirstCall().callsArgWith(1, null, {})  
      commands.check(function (err, results) {
        expect(results).to.deep.equal({app:{}, context: _ctx, dependencies: [], plugins: []})
        done(err)
      })
    })
    it('should return dependencies if dependency updates are available', function (done) {
      _check.check.onSecondCall().callsArgWith(1, null, [true])  
      commands.check(function (err, results) {
        expect(results).to.deep.equal({app:undefined, context: _ctx, dependencies: [true], plugins: []})
        done(err)
      })
    })
    it('should return plugins if plugin updates are available', function (done) {
      _check.check.onThirdCall().callsArgWith(1, null, [true])  
      commands.check(function (err, results) {
        expect(results).to.deep.equal({app:undefined, context: _ctx, dependencies: [], plugins: [true]})
        done(err)
      })
    })
  })

  describe('update', function () {
    describe('when there are no updates', function () {
      it('should not update', function (done) {
        commands.update(function (err) {
          expect(_update.update.called).to.be.false
          done(err)
        })
      })
    })
    describe('when there are updates', function () {
      it('should update', function (done) {
        _check.check.onFirstCall().callsArgWith(1, null, {})
        commands.update(function (err) {
          expect(_update.update.called).to.be.true
          done(err)
        })
      })
    })
  })

  describe('start,', function () {
    var _ready,
      _updateAvailable,
      _updateRequired

    beforeEach(function () {
      _exists.check.callsArgWith(1, null, false)
      commands.on('ready', (_ready = sinon.stub()))
      commands.on('updateAvailable', (_updateAvailable = sinon.stub()))
      commands.on('updateRequired', (_updateRequired = sinon.stub()))
    })
    it('should default to main module dir', function (done) {
      commands.start(function (err) {
        expect(_context.load.calledWith(path.dirname(process.mainModule.filename))).to.be.true
        done(err)
      })
    })
    it('should use appdir if supplied', function (done) {
      commands.start('/appdir', function (err) {
        expect(_context.load.calledWith('/appdir')).to.be.true
        done(err)
      })
    })
    it('should do full update if there is a pending update', function (done) {
      _ctx.pendingUpdate = true
      commands.start(function (err) {
        expect(_child_process.spawn.called).to.be.true
        done(err)
      })
    })
    describe('when valid,', function () {
      beforeEach(function () {
        _exists.check.callsArgWith(1, null, true)
      })
      it('should emit the ready event', function (done) {
        commands.start(function (err) {
          expect(_ready.called).to.be.true
          done(err)
        })
      })
      it('should touch .update file if app has an udpate available', function (done) {
        _check.check.onFirstCall().callsArgWith(1, null, {})
        commands.start(function (err) {
          expect(_file.touch.withArgs(sinon.match.string, 'PENDING').called).to.be.true
          done(err)
        })
      })
      it('should touch .update file if a dependency has an udpate available', function (done) {
        _check.check.onSecondCall().callsArgWith(1, null, [true])
        commands.start(function (err) {
          expect(_file.touch.withArgs(sinon.match.string, 'PENDING').called).to.be.true
          done(err)
        })
      })
      it('should emit update available if app has a update available', function (done) {
        _check.check.onFirstCall().callsArgWith(1, null, {})
        commands.start(function (err) {
          expect(_updateAvailable.called).to.be.true
          done(err)
        })
      })
      it('should emit updateAvailable if a dependency has a update available', function (done) {
        _check.check.onSecondCall().callsArgWith(1, null, [true])
        commands.start(function (err) {
          expect(_updateAvailable.called).to.be.true
          done(err)
        })
      })
      it('should do update if plugins have update available', function (done) {
        _check.check.onThirdCall().callsArgWith(1, null, [true])
        commands.start(function (err) {
          expect(_update.update.called).to.be.true
          done(err)
        })
      })
      it('should emit updateAvailable if it updates plugins', function (done) {
        _check.check.onThirdCall().callsArgWith(1, null, [true])
        commands.start(function (err) {
          expect(_updateAvailable.called).to.be.true
          done(err)
        })
      })
    })
    describe('when not valid', function () {
      beforeEach(function () {

      })
      it('should copy the app', function (done) {
        commands.start(function (err) {
          expect(_copier.copy.called).to.be.true
          done(err)
        })
      })
      it('should spawn the copied app', function (done) {
        commands.start(function (err) {          
          expect(_child_process.spawn.calledWith('/tmp/app')).to.be.true
          done(err)
        })
      })
      it('should pass the arg --electron-update when spawning', function (done) {
        commands.start(function (err) {
          expect(_child_process.spawn.calledWith(sinon.match.string, [sinon.match.string, sinon.match(function (value) { return value.indexOf('--electron-update=') === 0 }) ])).to.be.true
          done(err)
        })
      })
      it('should unref the child process', function (done) {
        commands.start(function (err) {
          expect(_child.unref.called).to.be.true
          done(err)
        })
      })
      it('should emit the udpateRequired event', function (done) {
        commands.start(function (err) {
          expect(_updateRequired.called).to.be.true
          done(err)
        })
      })
    })
  })
})