var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire').noCallThru()
    path = require('path')

describe('update', function () {
    var update,
        _mocks,
        _deps,
        _download,
        _res,
        _unpack,
        _file,
        _directory

    beforeEach(function () {
        _deps = {
            context: { 
                name: 'test',
                appDir: '/test'
            },
            dependencies: [],
            plugins: []
        }
        _download = {
            getJson: sinon.stub(),
            get: sinon.stub()
        }
        _res = {
        }
        _unpack = {
            extract: sinon.stub()
        }
        _file = {
            readJson: sinon.stub(),
            writeJson: sinon.stub()
        }
        _directory = {
            create: sinon.stub(),
            remove: sinon.stub()
        }
        _mocks = {
            './download.js': _download,
            './unpack.js': _unpack,
            './file.js': _file,
            './directory.js': _directory
        }
        update = proxyquire('../lib/update.js', _mocks)

        _download.getJson.callsArgWith(1, null, { versions: { '1.0.0': {}, '1.0.1': {} }, dist: { tarball: 'http://test.com/update.tgz' } })
        _download.get.callsArgWith(1, null, _res)
        _unpack.extract.callsArgWith(2, null)
        _file.readJson.callsArgWith(1, null, { dependencies: {} })
        _file.writeJson.callsArgWith(2, null)
        _directory.create.callsArgWith(1, null)
        _directory.remove.callsArgWith(1, null)
    })

    describe('app', function () {    
        describe('update available', function () {
            beforeEach(function () {
                _deps.app = { name: 'test', available: '1.0.1' }
            })
            describe('in dev environment', function () {
                beforeEach(function () {
                    _deps.context.dev = true
                })
                it('should not update the app', function (done) {
                    update.update(_deps, function (err) {
                        expect(_download.getJson.called).to.be.false
                        done(err)
                    })
                })
            })
            it('should update the app', function (done) {
                update.update(_deps, function (err) {
                    expect(_download.get.called).to.be.true
                    expect(_unpack.extract.called).to.be.true
                    done(err)
                })
            })
        })
        describe('update not available', function () {
            it('should not update the app if its not out of date', function (done) {
                update.update(_deps, function (err) {
                    expect(_download.getJson.called).to.be.false
                    done(err)
                })        
            })        
        })
    })

    describe('dependencies', function () {
        beforeEach(function () {
            _deps.dependencies.push({ name: 'test', available: '1.0.1' })
        })
        describe('in dev environment', function () {
            beforeEach(function () {
                _deps.context.dev = true
            })
            it('should not update dependencies', function (done) {
                update.update(_deps, function (err) {
                    expect(_download.getJson.called).to.be.false
                    done(err)
                })
            })
        })
        it('should update dependencies', function (done) {
            update.update(_deps, function (err) {
                expect(_download.get.called).to.be.true
                expect(_unpack.extract.called).to.be.true
                done(err)
            })        
        })
        describe('with sub-dependencies', function () {
            beforeEach(function () {
                var pkg = { dependencies: { testSub: '^1.0.0' } }
                _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
            })
            it('should update sub dependencies', function (done) {            
                update.update(_deps, function (err) {
                    expect(_download.get.calledTwice).to.be.true
                    expect(_unpack.extract.calledTwice).to.be.true
                    done(err)
                })
            })
        })
    })

    describe('plugins', function () {
        beforeEach(function () {
            _deps.plugins.push({ name: 'test', available: '1.0.1' })
        })
        describe('in dev environment', function () {
            it('should update plugins', function (done) {
                update.update(_deps, function (err) {
                    expect(_download.get.called).to.be.true
                    expect(_unpack.extract.called).to.be.true
                    done(err)
                })
            })
        })    
        describe('with sub-dependencies', function () {
            beforeEach(function () {
                var pkg = { dependencies: { testSub: '^1.0.0' } }
                _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
            })
            it('should update sub dependencies', function (done) {            
                update.update(_deps, function (err) {
                    expect(_download.get.calledTwice).to.be.true
                    expect(_unpack.extract.calledTwice).to.be.true
                    done(err)
                })
            })
        })
        it('should update plugins', function (done) {
            update.update(_deps, function (err) {
                expect(_download.get.called).to.be.true
                expect(_unpack.extract.called).to.be.true
                done(err)
            })
        })
        it('should update the .current file', function (done) {
            update.update(_deps, function (err) {
                expect(_file.writeJson.called).to.be.true
                done(err)
            })
        })
    })
})