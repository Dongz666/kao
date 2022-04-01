const helper = require('kao-helper');
const path = require('path');
const assert = require('assert');
const debug = require('debug')(`kao-loader-extend-${process.pid}`);

const util = require('./util.js');
const interopRequire = util.interopRequire;
const extendObj = util.extend;

const SYS_EXTENDS = {
  context: require('../../extend/context'),
  controller: require('../../extend/controller')
};

const ExtendLoader = {

  allowExtends: ['kao', 'application', 'context', 'request', 'response', 'controller', 'logic', 'service'],

  load(appPath) {
    const allowExtends = ExtendLoader.allowExtends;

    let extend = [];
    const filepath = path.join(appPath, 'config/extend.js');
    if (helper.isFile(filepath)) {
      debug(`load file: ${filepath}`);
      extend = extend.concat(interopRequire(filepath));
    }

    const ret = {};
    function assign(type, ext) {
      if (!ret[type]) {
        ret[type] = {};
      }
      ret[type] = extendObj(ret[type], ext);
    }
    // system extend
    allowExtends
      .filter(type => SYS_EXTENDS[type])
      .forEach(type => assign(type, SYS_EXTENDS[type]));

    // config extend
    extend.forEach(item => {
      if (helper.isFunction(item)) {
        console.error(`extend item can not be a function, ${item.name}`);
        return;
      }
      for (const type in item) {
        assert(allowExtends.indexOf(type) > -1, `extend type=${type} not allowed, allow types: ${allowExtends.join(', ')}`);
        assign(type, item[type]);
      }
    });
    // application extend
    allowExtends.forEach(type => {
      const filepath = path.join(appPath, `extend/${type}.js`);
      if (!helper.isFile(filepath)) {
        return;
      }
      debug(`load file: ${filepath}`);
      assign(type, interopRequire(filepath));
    });
    return ret;
  }
};

module.exports = ExtendLoader;
