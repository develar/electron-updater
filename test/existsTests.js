var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire').noCallThru()
    path = require('path')

describe('exists', function () {

  var exists,
    _mocks,
    _file,
    _fs,
    _item

  beforeEach(function () {
    _file = { 
      readJson: sinon.stub() 
    }
    _fs = {
      stat: sinon.stub()
    }
    _mocks = {
      './file.js': _file,
      'fs': _fs
    }
    _item = {
      context: {
        name: 'test',
        appDir: path.join('/'),
        dependencies: { },
        plugins: { }
      }
    }
    exists = proxyquire('../lib/exists.js', _mocks)
  })

  describe('dependencies', function () {

    beforeEach(function () {
      _item.kind = 'dependencies'
      _item.context.dependencies = {
        'test-dependency': '^1.0.0' 
      }
    })

    describe('actually exist', function () {
      beforeEach(function () {
        _file.readJson.callsArgWith(1, null, {version: '1.0.0'})
      })
      it('should return true when single dependency exists', function (done) {
        exists.check(_item, function (err, result) {
          expect(result).to.be.true
          done()
        })
      })
      it('should return true when all dependencies exist', function (done) {
        _item.context.dependencies['test2-dependency'] = '1.0.0'
        exists.check(_item, function (err, result) {
          expect(result).to.be.true
          done()
        })
      })
      it('should return true when version doesnt match but semantically satisfies desired version', function (done) {
        _file.readJson.callsArgWith(1, null, {version: '1.0.1'})
        exists.check(_item, function (err, result) {
          expect(result).to.be.true
          done()
        })        
      })
      it('should return false when of incorrect version', function (done) {
        _file.readJson.callsArgWith(1, null, {version: '2.0.0'})
        exists.check(_item, function (err, result) {
          expect(result).to.be.false
          done()
        })
      })
    })

    describe('actually missing', function () {
      beforeEach(function () {
        _file.readJson.callsArgWith(1, {})
      })
      it('should return false when single dependency is missing', function (done) {
        exists.check(_item, function (err, result) {
          expect(result).to.be.false
          done()
        })
      })
      it('should return false when one of many dependencies is missing', function (done) {
        _item.context.dependencies['test2-dependency'] = '1.0.0'
        _file.readJson.onFirstCall().callsArgWith(1, null, {version: '1.0.0'})
        _file.readJson.onSecondCall().callsArgWith(1, {})
        exists.check(_item, function (err, result) {
          expect(result).to.be.false
          done()
        })
      })
      it('should return false when all dependencies are missing', function (done) {
        _item.context.dependencies['test2-dependency'] = '1.0.0'
        exists.check(_item, function (err, result) {
          expect(result).to.be.false
          done()
        })
      })
    })
  })

  describe('plugins', function () {
    beforeEach(function () {
      _item.kind = 'plugins'
      _item.context.plugins = {
        'test-plugin': '^1.0.0'
      }
    })
    describe('actually exist', function () {
      beforeEach(function () {
        _file.readJson.callsArgWith(1, null, {'test-plugin': '1.0.0'})
        _fs.stat.callsArgWith(1, null, {})
      })
      it('should return true when single plugin exists', function (done) {
        exists.check(_item, function (err, result) {
          expect(result).to.be.true
          done()
        })
      })
      it('should return true when all plugins exist', function (done) {
        _item.context.plugins['test2-plugin'] = '^1.0.0'        
        _file.readJson.callsArgWith(1, null, {'test-plugin': '1.0.0', 'test2-plugin': '1.0.0' })
        exists.check(_item, function (err, result) {
          expect(result).to.be.true
          done()
        })
      })
      it('should return true when version doesnt match but semantically satisfies desired version', function (done) {
        _file.readJson.callsArgWith(1, null, {'test-plugin': '1.0.1'})
        exists.check(_item, function (err, result) {
          expect(result).to.be.true
          done()
        })
      })
      it('should return false when of incorrect version', function (done) {
        _file.readJson.callsArgWith(1, null, {'test-plugin': '2.0.0'})
        exists.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result).to.be.false
          done()
        })
      })
    })

    describe('actually missing', function () {
      beforeEach(function () {
        _file.readJson.callsArgWith(1, null, {'test-plugin': '1.0.0'})
        _fs.stat.callsArgWith(1, {})
      })
      it('should return false when single plugin is missing', function (done) {
        exists.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result).to.be.false
          done()
        })
      })
      it('should return false when one of many plugins is missing', function (done) {
        _fs.stat.onFirstCall().callsArgWith(1, null, {})
        _fs.stat.onSecondCall().callsArgWith(1, {})
        _item.context.plugins['test2-plugin'] = '^1.0.0'
        _file.readJson.callsArgWith(1, null, {'test-plugin': '1.0.0', 'test2-plugin': '1.0.0' })
        exists.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result).to.be.false
          done()
        })
      })
      it('should return false when all plugins are missing', function (done) {
        _item.context.plugins['test2-plugin'] = '^1.0.0'
        _file.readJson.callsArgWith(1, null, {'test-plugin': '1.0.0', 'test2-plugin': '1.0.0' })
        exists.check(_item, function (err, result) {
          if(err) return done(err)
          expect(result).to.be.false
          done()
        })
      })
    })
  })
})