const helper = require('kao-helper');
const path = require('path');
const assert = require('assert');
const debug = require('debug')(`kao-loader-router-${process.pid}`);

const interopRequire = require('./util.js').interopRequire;

const RouterLoader = {

  /**
   * route loader
   */
  load(appPath) {
    const routerFile = path.join(appPath, 'config/router.js');
    if (!helper.isFile(routerFile)) {
      return [];
    }
    debug(`load file: ${routerFile}`);
    const router = interopRequire(routerFile);
    assert(helper.isArray(router), 'config/router must be an array');
    return router;
  }
};

module.exports = RouterLoader;
