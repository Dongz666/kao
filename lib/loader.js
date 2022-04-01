const helper = require('kao-helper');
const path = require('path');
const fs = require('fs');

const getConfigFn = require('./lib/config').getConfigFn;
const Logger = require('./lib/logger');
const Loader = require('./lib/loader');

require('./kao.js');
// KaoJS root path
const kaoPath = path.join(__dirname, '..');

/**
 * kao loader
 * @param {Object} options
 */
const kaoLoader = class {
  constructor(options = {}) {
    this.options = options;
  }
  /**
   * init path
   */
  initPath() {
    kao.ROOT_PATH = this.options.ROOT_PATH;
    kao.APP_PATH = this.options.APP_PATH;
    kao.RUNTIME_PATH = this.options.RUNTIME_PATH;

    // set env
    if (this.options.env) {
      kao.app.env = this.options.env;
    }
    // set proxy
    if (this.options.proxy) {
      kao.app.proxy = this.options.proxy;
    }
  }
  /**
   * load app data
   */
  loadData() {
    // add data to koa application
    kao.app.services = kao.loader.loadService();
    kao.app.logics = kao.loader.loadLogic();
    kao.app.controllers = kao.loader.loadController();
    kao.app.routers = kao.loader.loadRouter();
    kao.app.validators = kao.loader.loadValidator();
  }
  loadModel() {
    kao.app.models = kao.loader.loadModel();
  }
  /**
   * load middleware
   */
  loadMiddleware() {
    const middlewares = kao.loader.loadMiddleware(kao.app);
    middlewares.forEach(middleware => {
      kao.app.use(middleware);
    });
  }
  /**
   * load extend
   */
  loadExtend() {
    const exts = kao.loader.loadExtend();
    const list = [
      ['kao', kao],
      ['application', kao.app],
      ['context', kao.app.context],
      ['request', kao.app.request],
      ['response', kao.app.response],
      ['controller', kao.Controller.prototype],
      ['logic', kao.Logic.prototype],
      ['service', kao.Service.prototype]
    ];
    list.forEach(item => {
      if (!exts[item[0]]) return;
      Loader.extend(item[1], exts[item[0]]);
    });
  }
  /**
   * write config to file
   * @param {Config} config
   */
  writeConfig(config) {
    const configFilepath = path.join(kao.RUNTIME_PATH, 'config');
    helper.mkdir(configFilepath);
    fs.writeFileSync(`${configFilepath}/${kao.app.env}.json`, JSON.stringify(config, undefined, 2));
  }
  /**
   * load all data
   */
  loadAll() {
    this.initPath();
    kao.loader = new Loader(kao.APP_PATH, kaoPath);

    // write config to APP_PATH/runtime/config/[env].json file
    const config = kao.loader.loadConfig(kao.app.env);
    kao.config = getConfigFn(config);
    kao.logger = new Logger(helper.parseAdapterConfig(kao.config('logger')));
    global.logger = kao.logger;

    this.writeConfig(config);
    this.loadModel();
    this.loadExtend();
    this.loadData();
    this.loadMiddleware();
  }
};

module.exports = kaoLoader;
