var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect

describe('commands', function () {

  var commands,
    _mocks,
    _context,
    _check,
    _update,
    _exists,
    _copier,
    _ctx

  beforeEach(function () {
    _context = {
      load: sinon.stub()
    }
    _check = {}
    _update = {}
    _exists = {
      check: sinon.stub()
    }
    _copier = {}
    _mocks = {
      './context.js': _context,
      './check.js': _check,
      './update.js': _update,
      './exists.js': _exists,
      './copier.js': _copier
    }
    commands = proxyquire('../lib/commands.js', _mocks)

    _ctx = {}
    _context.load.callsArgWith(1, null, _ctx)
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

  })

  describe('check', function () {

  })

  describe('update', function () {

  })

  describe('start', function () {

  })

})