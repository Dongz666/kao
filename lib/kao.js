const helper = require('kao-helper');
const Koa = require('koa');
const pkg = require('../package.json');
const assert = require('assert');
const createError = require('http-errors');

/**
 * global kao object
 * @type {Object}
 */
global.kao = Object.create(helper);

/**
 * Koa application instance
 * @type {Koa}
 */
kao.app = new Koa();
kao.createError = createError;

/**
 * kao.env
 */
Object.defineProperty(kao, 'env', {
  get() {
    return kao.app.env;
  }
});

/**
 * add kao to kao.app
 */
kao.app.kao = kao;

/**
 * kaojs version
 */
kao.version = pkg.version;

/**
 * base controller class
 */
kao.Controller = class Controller {
  constructor(ctx) {
    this.ctx = ctx;
  }
};

/**
 * base logic class
 */
kao.Logic = class Logic extends kao.Controller {};

/**
 * service base class
 */
kao.Service = class Service {};

/**
 * get service
 */
kao.service = (name, ...args) => {
  const Cls = kao.app.services[name];
  assert(Cls, `can not find service: ${name}`);
  if (helper.isFunction(Cls)) return new Cls(...args);
  return Cls;
};

// before start server
const promises = [];
kao.beforeStartServer = fn => {
  if (fn) {
    assert(helper.isFunction(fn), 'fn in kao.beforeStartServer must be a function');
    return promises.push(fn());
  }
  const promise = Promise.all(promises);
  const timeout = helper.ms(kao.config('startServerTimeout'));
  const timeoutPromise = helper.timeout(timeout).then(() => {
    const err = new Error(`waiting for start server timeout, time: ${timeout}ms`);
    return Promise.reject(err);
  });
  return Promise.race([promise, timeoutPromise]);
};
