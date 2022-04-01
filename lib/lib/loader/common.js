const helper = require('kao-helper');
const path = require('path');
const debug = require('debug')(`kao-loader-common-${process.pid}`);

const interopRequire = require('./util.js').interopRequire;

const CommonLoader = {
  loadFiles(dir) {
    const files = helper.getdirFiles(dir).filter(file => {
      return /^(?!\.).+\.js$/i.test(file);
    });
    const cache = {};
    files.forEach(file => {
      // replace \\ to / in windows
      const name = file.replace(/\\/g, '/').replace(/\.js$/, '');
      const filepath = path.join(dir, file);
      const fileExport = interopRequire(filepath);
      // add __filename to export when is class
      // if (helper.isFunction(fileExport)) {
      //   fileExport.prototype.__filename = filepath;
      // }
      debug(`load file: ${filepath}`);
      cache[name] = fileExport;
    });
    return cache;
  },
  load(appPath, type) {
    const dir = path.join(appPath, type);
    return CommonLoader.loadFiles(dir);
  }
};

module.exports = CommonLoader;
