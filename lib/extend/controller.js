const helper = require('kao-helper');
const assert = require('assert');

/**
 * extend controller
 */
module.exports = {
  /**
   * get controller instance
   * @param {String} name
   */
  controller(name) {
    const Cls = kao.app.controllers[name];
    assert(Cls, `can not find controller: ${name}`);
    return new Cls(this.ctx);
  },
  /**
   * execute action
   * @param {String} controller
   * @param {String} actionName
   */
  action(controller, actionName) {
    let instance = controller;
    // if controller is an controller instance, ignore invoke controller method
    if (helper.isString(controller)) {
      instance = this.controller(controller);
    }
    let promise = Promise.resolve();
    if (instance.__before) {
      promise = Promise.resolve(instance.__before());
    }
    return promise.then(data => {
      if (data === false) return false;
      let method = `${actionName}Action`;
      if (!instance[method]) {
        method = '__call';
      }
      if (instance[method]) return instance[method]();
    }).then(data => {
      if (data === false) return false;
      if (instance.__after) return instance.__after();
      return data;
    });
  }
};
