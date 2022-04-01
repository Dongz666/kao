const helper = require('kao-helper');
const path = require('path');
const http = require('http');
const assert = require('assert');

const KaoLoader = require('./loader.js');
const Instance = require('./instance.js');

/**
 * applition class
 */
module.exports = class Application {
  /**
   * constructor
   */
  constructor(options = {}) {
    assert(options.ROOT_PATH, 'options.ROOT_PATH must be set');
    if (!options.APP_PATH) {
      let appPath = path.join(options.ROOT_PATH, 'app');
      if (!helper.isDirectory(appPath)) {
        appPath = path.join(options.ROOT_PATH, 'src');
      }
      options.APP_PATH = appPath;
    }
    if (!options.RUNTIME_PATH) {
      options.RUNTIME_PATH = path.join(options.ROOT_PATH, 'runtime');
    }
    this.options = options;
  }
  _getInstance() {
    const port = kao.config('port');
    const host = kao.config('host');
    const instance = new Instance({
      port,
      host,
      createServer() {
        const createServerFn = kao.config('createServer');
        const callback = kao.app.callback();
        if (createServerFn) {
          assert(helper.isFunction(createServerFn), 'config.createServer must be a function');
        }
        const server = createServerFn ? createServerFn(callback) : http.createServer(callback);
        kao.app.server = server;
        return server;
      },
      logger: kao.logger.error.bind(kao.logger),
      processKillTimeout: kao.config('processKillTimeout'),
      onUncaughtException: kao.config('onUncaughtException'),
      onUnhandledRejection: kao.config('onUnhandledRejection')
    });
    kao.logger.info(`Server running at http://${host || '127.0.0.1'}:${port}`);
    kao.logger.info(`KaoJS version: ${kao.version}`);
    kao.logger.info(`Environment: ${kao.app.env}`);
    return instance;
  }
  /**
   * run in worker
   */
  runInWorker() {
    return kao.beforeStartServer().catch(err => {
      kao.logger.error(err);
    }).then(() => {
      const instance = this._getInstance();
      return instance.startServer();
    }).then(() => {
      kao.app.emit('appReady');
    });
  }
  /**
   * check test env
   */
  _isRunInTest() {
    return process.env.NODE_ENV === 'test';
  }
  runInTest() {
    return kao.beforeStartServer().catch(err => {
      kao.logger.error(err);
    }).then(() => {
      const instance = this._getInstance();
      return instance.startServer();
    }).then((server) => {
      kao.app.emit('appReady');
      return server;
    });
  }
  beforeRun(fn) {
    assert(helper.isFunction(fn), 'fn in beforeRun must be a function');
    kao.beforeStartServer(fn);
  }
  /**
   * init
   */
  init() {
    const instance = new KaoLoader(this.options);

    try {
      instance.loadAll();
      return this;
    } catch (e) {
      console.error(e.stack);
    }
  }

  /**
   * run
   */
  async run() {
    try {
      if (this._isRunInTest()) {
        return this.runInTest();
      } else {
        return this.runInWorker();
      }
    } catch (e) {
      console.error(e.stack);
    }
  }
};

module.exports.kao = global.kao;
