var rewire         = require('rewire');
var sinon          = require('sinon');
var chai           = require('chai');
var sinonChai      = require("sinon-chai");

var App              = require('../../../../lib/express/app.js');
var AppManager       = require('../../../../lib/express/appManager.js');
var ConfigMock       = require('../../mocks/config.js');
var ServerMock       = require('../../mocks/server.js');
var CLI              = require('../../../../lib/cli');
var lsCmd            = rewire('../../../../lib/cli/commands/ls.js');

chai.use(sinonChai);
chai.should();

describe('`ls` command', function() {
    before(function() {
        this.models = {
            odm: {},
            orm: {}
        };
        this.config = new ConfigMock();

        this.appManager = new AppManager(this.config, this.models);

        var app = this.app = this.appManager.buildApp();
        var app2 = this.app2 = this.appManager.buildApp();

        app.server = new ServerMock;
        app2.server = new ServerMock;

        this.cli = new CLI({
            apps: [app, app2]
        });

        var router = app.buildRouter({
            version: '1.0',
            url: '/'
        });

        var router2 = app.buildRouter({
            version: '1.0',
            url: '/'
        });

        router.buildRoute({
            url: '/app',
            type: 'get'
        });

        router2.buildRoute({
            url: '/app2',
            type: 'get'
        });

        this.logStub = sinon.stub();
        this.logErrStub = sinon.stub();

        this.consoleStubRevert = lsCmd.__set__({
            console: {
                log: this.logStub,
                error: this.logErrStub
            }
        });

        this.action = lsCmd.action(this.cli);
    });

    beforeEach(function() {
        this.logStub.reset();
        this.logErrStub.reset();
    });

    after(function() {
        this.consoleStubRevert();
    });

    describe('action', function() {
        before(function() {
            this.printAppsSpy = sinon.spy(lsCmd, 'printApps');
            this.printRoutesSpy = sinon.spy(lsCmd, 'printRoutes');
        });

        after(function() {
            this.printAppsSpy.restore();
            this.printRoutesSpy.restore();
        });

        beforeEach(function() {
            this.printAppsSpy.reset();
            this.printRoutesSpy.reset();
        });

        describe('list apps', function() {
            it('should print available app list', function() {
                this.action({options: {apps: true}}, sinon.spy());

                this.printAppsSpy.should.have.been.calledOnce;
                this.printAppsSpy.should.have.been.calledWith(this.cli.options.apps);

                this.logStub.should.have.been.calledOnce;
                this.logStub.should.have.been.calledWith(
                    this.printAppsSpy.firstCall.returnValue
                );
            });

            it('should call the callback', function() {
                var callbackSpy = sinon.spy();
                this.action({options: {apps: true}}, callbackSpy);

                callbackSpy.should.have.been.calledOnce;
            });
        });

        describe('list routes', function() {
            it('should print all routes of connected apps', function() {
                //connect apps to cli
                this.cli.apps = [this.app, this.app2];

                this.action({options: {routes: true}}, sinon.spy());

                this.printRoutesSpy.should.have.been.calledOnce;
                this.printRoutesSpy.should.have.been.calledWith(this.cli.apps);

                this.logStub.should.have.been.calledOnce;
                this.logStub.should.have.been.calledWith(
                    this.printRoutesSpy.firstCall.returnValue
                );

                //disconnect all apps
                this.cli.apps = [];
            });

            it('should print an error when the is no app connected', function() {
                this.action({options: {routes: true}}, sinon.spy());

                this.logErrStub.should.have.been.calledOnce;
                this.logErrStub.should.have.been.calledWith(
                    sinon.match.string
                );
            });

            it('should call the callback', function() {
                var callbackSpy = sinon.spy();
                this.action({options: {routes: true}}, callbackSpy);

                callbackSpy.should.have.been.calledOnce;
            });
        });
    });

    describe('printApps', function() {
        it('should return a string printing a table WITH header', function() {
            var output = lsCmd.printApps([
                this.app,
                this.app2,
            ], {
                header: true
            });

            var port = this.app.server.address().port;
            var port2 = this.app2.server.address().port;

            var expected = `ID  PORT  STATUS\n` +
                           `--  ----  ------\n` +
                           `0   ${port }  init  \n` +
                           `1   ${port2}  init  \n`

            output.should.be.equal(expected);
        });

        it('should return a string printing a table WITHOUT header', function() {
            var output = lsCmd.printApps([
                this.app,
                this.app2,
            ], {
                header: false
            });

            var expected = `0  ${this.app.server.address().port }  init\n`+
                           `1  ${this.app2.server.address().port}  init\n`;

            output.should.be.equal(expected);
        });
    });

    describe('printRoutes', function() {
        it('should return string listing routes', function() {
            var output = lsCmd.printRoutes([
                this.app,
                this.app2,
            ]);

            var expected = 'GET  /app   getApp_v1.0 \n'+
                           'GET  /app2  getApp2_v1.0\n';

            output.should.be.equal(expected);
        });
    });
});