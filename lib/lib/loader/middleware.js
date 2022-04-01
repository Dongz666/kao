const helper = require('kao-helper');
const path = require('path');
const assert = require('assert');
const { pathToRegexp } = require('path-to-regexp');
const debug = require('debug')(`kao-loader-middleware-${process.pid}`);

const interopRequire = require('./util.js').interopRequire;

const SYS_MIDDLEWARES = {
  controller: require('../../middleware/controller'),
  logic: require('../../middleware/logic'),
  meta: require('../../middleware/meta'),
  // payload: require('../../middleware/payload'),
  resource: require('../../middleware/resource'),
  router: require('../../middleware/router')
};

class Middleware {
  /**
   * check url matched
   */
  createRegexp(match) {
    if (helper.isFunction(match)) return match;
    if (match) return pathToRegexp(match);
  }
  /**
   * check rule match
   */
  checkMatch(rule, ctx) {
    if (helper.isFunction(rule)) return rule(ctx);
    return rule.test(ctx.path);
  }
  /**
   * middleware rules(appPath/middleware.js):
   * module.exports = [
   *  'clean_pathname',
   * {
   *    handle: denyIp,
   *    options: {},
   *    enable: false,
   *    match: '',
   *    ignore: ''
   * },
   * ]
   */
  parse(middlewares = [], middlewarePkg = {}, app) {
    return middlewares.map(item => {
      if (helper.isString(item)) {
        return { handle: item };
      }
      if (helper.isFunction(item)) {
        return { handle: () => item };
      }
      return item;
    }).filter(item => {
      return !('enable' in item) || item.enable;
    }).map(item => {
      if (helper.isString(item.handle)) {
        item.handle = middlewarePkg[item.handle];
      }
      assert(helper.isFunction(item.handle), 'handle must be a function');
      const options = item.options || {};
      let handle = item.handle;
      // if options is a function, maybe want get options async
      // then hack a middleware handle, when app is ready, then get options & exec handle
      if (helper.isFunction(options)) {
        let ret = {};
        app.kao.beforeStartServer(() => {
          return Promise.resolve(options()).then(data => {
            ret = data;
          });
        });
        app.on('appReady', () => {
          handle = handle(ret, app);
        });
        item.handle = (ctx, next) => {
          return handle(ctx, next);
        };
      } else {
        item.handle = handle(options, app);
        // handle also be a function
        assert(helper.isFunction(item.handle), 'handle must return a function');
      }
      return item;
    }).map(item => {
      if (!item.match && !item.ignore) {
        return item.handle;
      }

      // create regexp here for better performance
      const match = this.createRegexp(item.match);
      const ignore = this.createRegexp(item.ignore);

      // has match or ignore
      return (ctx, next) => {
        if ((match && !this.checkMatch(match, ctx)) ||
          (ignore && this.checkMatch(ignore, ctx))) {
          return next();
        }
        return item.handle(ctx, next);
      };
    });
  }

  /**
   * get middlewares in middleware path
   * * [KAOJS_LIB_PATH]/lib/middleware
   * * [APP_PATH]/middleware
   */
  getFiles(middlewarePath) {
    const ret = {};
    helper.getdirFiles(middlewarePath).forEach(file => {
      if (!/\.(?:js|es)$/.test(file)) {
        return;
      }
      const match = file.match(/(.+)\.\w+$/);
      if (match && match[1]) {
        const filepath = path.join(middlewarePath, file);
        debug(`load file: ${filepath}`);
        ret[match[1]] = interopRequire(filepath);
      }
    });
    return ret;
  }

  /**
   * load sys and app middlewares
   */
  loadFiles(appPath) {
    const appMiddlewarePath = path.join(appPath, 'middleware');
    const appMiddlewares = this.getFiles(appMiddlewarePath);
    const middlewares = Object.assign({}, SYS_MIDDLEWARES, appMiddlewares);
    return middlewares;
  }

  load(appPath, app) {
    const filepath = path.join(appPath, 'config/middleware.js');
    if (!helper.isFile(filepath)) {
      return [];
    }
    debug(`load file: ${filepath}`);
    const middlewares = interopRequire(filepath);
    return this.parse(middlewares, this.loadFiles(appPath), app);
  }
}

module.exports = Middleware;
