var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect

describe('checking', function () {

  var checker,
    got,
    _file,
    _fs,
    _mocks,
    _context

  beforeEach(function () {
    _context = {
      name: 'test-app',
      version: '1.0.0',
      channel: 'latest',
      registry: 'http://npm.test.com',
      appDir: '/test'
    }
    _got = sinon.stub()
    _file = {
      readJson: sinon.stub()
    }
    _fs = {
      stat: sinon.stub()
    }
    _mocks = {
      './file.js': _file,
      'fs': _fs,
      'got': _got
    }
    checker = proxyquire('../lib/check.js', _mocks)
  })

  describe('app', function () {
    var _item;
    beforeEach(function () {
      _item = {
        kind: 'app',
        context: _context
      }
    })

    describe('when a new version is available', function () {
      beforeEach(function () {
        _got
          .withArgs('http://npm.test.com/test-app')
          .callsArgWith(2, null, {'dist-tags': {'latest': '1.0.1'}})
      })
      it('should return the available version', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result.available).to.equal('1.0.1')
          done()
        })
      })
    })

    describe('when a new version is not available', function () {
      beforeEach(function () {
        _got
          .withArgs('http://npm.test.com/test-app')
          .callsArgWith(2, null, {'dist-tags': {'latest': '1.0.0'}})
      })
      it('should return undefined', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result).to.be.undefined
          done()
        })
      })
    })
  })

  describe('dependencies', function () {

    var _item;
    beforeEach(function () {
      _context.dependencies = {
        'test-dependency': '^1.0.0'
      }
      _item = {
        kind: 'dependencies',
        context: _context
      }
    })

    describe('when the dependency doesnt exist', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, 'ENOENT')
        _got
          .withArgs('http://npm.test.com/test-dependency')
          .callsArgWith(2, null, {versions:{'1.0.0': {}}})
      })
      it('should return latest version', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0].available).to.equal('1.0.0')
          done()
        })
      })
    })

    describe('when a new version is available', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, null, {version:'1.0.0'})
        _got
          .withArgs('http://npm.test.com/test-dependency')
          .callsArgWith(2, null, {versions:{'1.0.1': {}}})
      })
      it('should return the newer version', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0].available).to.equal('1.0.1')
          done()
        })
      })
    })

    describe('when a new version is not available', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, null, {version:'1.0.0'})
        _got
          .withArgs('http://npm.test.com/test-dependency')
          .callsArgWith(2, null, {versions:{'1.0.0': {}}})
      })
      it('should return undefined', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0]).to.be.undefined
          done()
        })
      })
    })
  })

  describe('plugins', function () {
    var _item;
    beforeEach(function () {
      _context.plugins = {
        'test-plugin': '^1.0.0'
      }
      _item = {
        kind: 'plugins',
        context: _context
      }
    })

    describe('when .current file is missing', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, 'ENOENT')
        _fs.stat
          .callsArgWith(1, 'ENOENT')
        _got
          .withArgs('http://npm.test.com/test-plugin')
          .callsArgWith(2, null, {versions:{'1.0.0': {}}})
      })
      it('should return the latest version', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0].available).to.equal('1.0.0')
          done()
        })
      })
    })

    describe('when plugin is missing', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, null, {'test-plugin': '1.0.0'})
        _fs.stat
          .callsArgWith(1, 'ENOENT')
        _got
          .withArgs('http://npm.test.com/test-plugin')
          .callsArgWith(2, null, {versions:{'1.0.0': {}}})
      })
      it('should return the latest version', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0].available).to.equal('1.0.0')
          done()
        })
      })
    })

    describe('when a new version is available', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, null, {'test-plugin': '1.0.0'})
        _fs.stat
          .onFirstCall()
          .callsArgWith(1, 'ENOENT')
        _fs.stat
          .onSecondCall()
          .callsArgWith(1, null)
        _got
          .withArgs('http://npm.test.com/test-plugin')
          .callsArgWith(2, null, {versions:{'1.0.1': {}}})
      })
      it('should return the latest version', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0].available).to.equal('1.0.1')
          done()
        })
      })
      describe('when the plugin is linked', function () {
        beforeEach(function () {
          _fs.stat
            .onFirstCall()
            .callsArgWith(1, null)
        })
        it('should return false', function (done) {
          checker.check(_item, function (err, result) {
            if(err) return done(err)
            expect(result[0]).to.be.undefined
            done()
          })
        })
      })
    })

    describe('when a new version is not available', function () {
      beforeEach(function () {
        _file.readJson
          .callsArgWith(1, null, {'test-plugin': '1.0.0'})
        _fs.stat
          .onFirstCall()
          .callsArgWith(1, 'ENOENT')
        _fs.stat
          .callsArgWith(1, null)
        _got
          .withArgs('http://npm.test.com/test-plugin')
          .callsArgWith(2, null, {versions:{'1.0.0': {}}})
      })
      it('should return undefined', function (done) {
        checker.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result[0]).to.be.undefined
          done()
        })
      })
    })
  })
})