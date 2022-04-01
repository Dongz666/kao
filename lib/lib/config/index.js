const helper = require('kao-helper');
/**
 * config manage
 */
class Config {
  /**
   * constructor
   * @param {config} config data
   */
  constructor(config = {}) {
    this.config = config;
  }
  /**
   * get config
   * get(), get('name'), get('foo.bar.xxx')
   * @param {name} undefined|String
   */
  get(name, config) {
    if (!name) {
      return this.config;
    }
    config = config || this.config;
    if (name.indexOf('.') === -1) {
      return config[name];
    }
    name = name.split('.');
    const length = name.length;
    name.some((item, index) => {
      config = config[item];
      if (index !== length - 1 && !helper.isObject(config)) {
        config = undefined;
        return true;
      }
    });
    return config;
  }
  /**
   * set config
   * set('name', 'value'), set('foo.bar', 'value')
   */
  set(name, value) {
    if (name.indexOf('.') === -1) {
      this.config[name] = value;
      return this;
    }
    let config = this.config;
    name = name.split('.');
    if (name.some(item => /^__proto__|prototype|construcotr$/.test(item))) {
      return this;
    }
    const length = name.length;
    name.forEach((item, index) => {
      if (index === length - 1) {
        config[item] = value;
      } else {
        if (!helper.isObject(config[item])) {
          config[item] = {};
        }
        config = config[item];
      }
    });
    return this;
  }
}

function getConfigFn(configs) {
  const conf = new Config(configs);
  return (name, value) => {
    if (value === undefined) {
      return conf.get(name);
    }
    return conf.set(name, value);
  };
}

exports.Config = Config;
exports.getConfigFn = getConfigFn;
