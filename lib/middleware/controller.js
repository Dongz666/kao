const helper = require('kao-helper');

const defaultOptions = {
  emptyController: '',
  preSetStatus: 200
};

function invokeController(options, app) {
  options = Object.assign({}, defaultOptions, options);
  return (ctx, next) => {
    const controllers = app.controllers || {};

    if (!ctx.controller || !ctx.action) {
      return ctx.throw(404);
    }

    let Controller = controllers[ctx.controller];

    // controller not exist
    if (helper.isEmpty(Controller)) {
      const emptyController = options.emptyController;
      if (emptyController && controllers[emptyController]) {
        Controller = controllers[emptyController];
      } else {
        return next();
      }
    }

    const instance = new Controller(ctx);
    let promise = Promise.resolve();
    if (instance.__before) {
      promise = Promise.resolve(instance.__before());
    }
    // if return false, it will be prevent next process
    return promise.then(data => {
      if (data === false) return false;
      let method = `${ctx.action}Action`;
      if (!instance[method]) {
        method = '__call';
      }
      if (instance[method]) {
        // pre set request status
        if (ctx.body === undefined && options.preSetStatus) {
          ctx.status = options.preSetStatus;
        }
        return instance[method]();
      }
    }).then(data => {
      if (data === false) return false;
      if (instance.__after) return instance.__after();
    }).then(data => {
      if (data !== false) return next();
    });
  };
}

module.exports = invokeController;
