var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire')
    path = require('path')

describe('directory', function () {

    var directory,
        _fs,
        _mocks

    beforeEach(function () {
        _fs = {
            'access': sinon.stub().callsArgWith(1, new Error()),
            'mkdir': sinon.stub().callsArgWith(1, new Error())
        }
        _mocks = {
            'fs': _fs,
            'original-fs': _fs
        }
        directory = proxyquire('../lib/directory.js', _mocks)
    })

    it('does not create a directory when dir is root', function (done) {
        directory.create('/', function (err) {
            expect(_fs.mkdir.called).to.be.false
            done();
        })
    })

    if(require('os').platform() === 'win32') {
        it('does not create a directory when dir is a windows root', function (done) {
            directory.create('C:\\', function (err) {
                expect(_fs.mkdir.called).to.be.false
                done();
            });
        })

        it('creates a windows directory without errors', function (done) {
            _fs.mkdir.withArgs('C:\\a').callsArg(1);
            directory.create('C:\\a', function (err) {
                expect(err).to.not.be.ok
                expect(_fs.mkdir.called).to.be.true
                done();
            });
        })
    }

    it('creates a directory without errors', function (done) {
        _fs.mkdir.withArgs('/a').callsArg(1);
        directory.create('/a', function (err) {
            expect(err).to.not.be.ok
            expect(_fs.mkdir.called).to.be.true
            done();
        });
    })

    it('creates all directories in a path', function (done) {
        _fs.mkdir.withArgs('/a').callsArg(1);
        _fs.mkdir.withArgs('/a/b').callsArg(1);
        _fs.mkdir.withArgs('/a/b/c').callsArg(1);
        _fs.mkdir.withArgs('/a/b/c/d').callsArg(1);
        directory.create('/a/b/c/d', function (err) {
            expect(_fs.mkdir.calledWith('/a')).to.be.true
            expect(_fs.mkdir.calledWith('/a/b')).to.be.true
            expect(_fs.mkdir.calledWith('/a/b/c')).to.be.true
            expect(_fs.mkdir.calledWith('/a/b/c/d')).to.be.true
            done()
        })
    })

    it('creates directory even if part of path already exists', function (done) {
        _fs.mkdir.withArgs('/a').callsArgWith(1, {code: 'EEXIST'})
        _fs.mkdir.withArgs('/a/b').callsArgWith(1, {code: 'EEXIST'})
        _fs.mkdir.withArgs('/a/b/c').callsArg(1)
        _fs.mkdir.withArgs('/a/b/c/d').callsArg(1)
        directory.create('/a/b/c/d', function (err) {
            expect(_fs.mkdir.calledWith('/a')).to.be.true
            expect(_fs.mkdir.calledWith('/a/b')).to.be.true
            expect(_fs.mkdir.calledWith('/a/b/c')).to.be.true
            expect(_fs.mkdir.calledWith('/a/b/c/d')).to.be.true
            done()
        })
    })

    it('it succeeds even if path already exists', function (done) {
        _fs.mkdir.callsArgWith(1, {code: 'EEXIST'})
        directory.create('/a/b/c/d', function (err) {
            expect(err).to.be.undefined
            done()
        })
    })

    it('creates a relative directory', function (done) {
        _fs.mkdir.withArgs('a').callsArg(1);
        directory.create('a', function (err) {
            expect(_fs.mkdir.calledWith('a')).to.be.true
            done()
        })
    })

    it('creates all relative directories', function (done) {
        _fs.mkdir.withArgs('a').callsArg(1);
        _fs.mkdir.withArgs('a/b').callsArg(1);
        _fs.mkdir.withArgs('a/b/c').callsArg(1);
        directory.create('a/b/c', function (err) {
            expect(_fs.mkdir.calledWith('a')).to.be.true
            expect(_fs.mkdir.calledWith('a/b')).to.be.true
            expect(_fs.mkdir.calledWith('a/b/c')).to.be.true
            done()
        })
    })
})