const Config = require('./config.js');
const Middleware = require('./middleware.js');
const router = require('./router.js');
const extend = require('./extend.js');
const common = require('./common.js');
const extendMethod = require('./util.js').extend;

/**
 * Loader
 */
class Loader {
  /**
   * constructor
   */
  constructor(appPath) {
    this.appPath = appPath;
  }
  /**
   * load config
   */
  loadConfig(env) {
    return (new Config()).load(this.appPath, env);
  }
  /**
   * load controller
   */
  loadController() {
    return common.load(this.appPath, 'controller');
  }
  /**
   * load logic
   */
  loadLogic() {
    return common.load(this.appPath, 'logic');
  }
  /**
   * load model
   */
  loadModel() {
    return common.load(this.appPath, 'model');
  }
  /**
   * load service
   */
  loadService() {
    return common.load(this.appPath, 'service');
  }
  /**
   * load validator
   */
  loadValidator() {
    return common.load(this.appPath, 'validator');
  }

  /**
   * load middleware
   */
  loadMiddleware(app) {
    return (new Middleware()).load(this.appPath, app);
  }
  /**
   * load router
   */
  loadRouter() {
    return router.load(this.appPath);
  }
  /**
   * load extend
   */
  loadExtend() {
    return extend.load(this.appPath);
  }
  /**
   * load use defined file
   */
  loadCommon(name) {
    return common.load(this.appPath, name);
  }
}

Loader.extend = extendMethod;

module.exports = Loader;
