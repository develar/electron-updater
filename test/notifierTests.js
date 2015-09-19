var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect,
  path = require('path');

describe('notifier,', function () {

  var Notifier,
    notifier,
    _timers,
    _emit,
    _check;

  beforeEach(function () {
    _timers = {
      setInterval: sinon.stub(),
      clearInterval: sinon.stub()
    }
    _emit = sinon.stub()
    _check = sinon.stub()
    _mocks = {
      'timers': _timers
    }
    Notifier = proxyquire('../lib/notifier.js', _mocks)
    Notifier.prototype.emit = _emit
  })

  describe('construction,', function () {
    beforeEach(function () {
      notifier = new Notifier('', {}, _check);
    })
    it('should start timer on interval', function () {
      expect(_timers.setInterval.called).to.be.true
    })
    it('should set a 5 minute interval', function () {
      expect(_timers.setInterval.withArgs(sinon.match.func, 1000 * 60 * 5).called).to.be.true
    })
  })

  describe('on timer tick,', function () {
    beforeEach(function () {
      _timers.setInterval.callsArg(0)
      notifier = new Notifier('', {}, _check)
    })
    
    it('should check for updates', function () {
      expect(_check.called).to.be.true
    })
  })

  describe('on check result,', function () {
    beforeEach(function () {
      _timers.setInterval.callsArg(0)
    })
    describe('if check has an error,', function () {
      beforeEach(function () {
        _check.callsArgWith(2, 'error')
        notifier = new Notifier('', {}, _check)
      })
      it('should emit an error event', function () {
        expect(_emit.withArgs('error', 'error').called).to.be.true
      })
    })

    describe('if check does not have updates available', function () {
      beforeEach(function () {
        _check.callsArgWith(2, null, null)
        notifier = new Notifier('', {}, _check)
      })
      it('should not emit an updateAvailable event', function () {
        expect(_emit.withArgs('updateAvailable').called).to.be.false
      })
      it('should not clear the timer interval', function () {
        expect(_timers.clearInterval.called).to.be.false
      })
    })

    describe('if check does have an update available', function () {
      beforeEach(function () {
        _check.callsArgWith(2, null, {app:true})
        notifier = new Notifier('', {}, _check)
      })
      it('should emit an updateAvailable event', function () {
        expect(_emit.withArgs('updateAvailable').called).to.be.true
      })
      it('should clear the timer interval', function () {
        expect(_timers.clearInterval.called).to.be.true
      })
    })
  })
})