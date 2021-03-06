const helper = require('kao-helper');
/**
 * invoke logic
 */
function invokeLogic(options, app) {
  return (ctx, next) => {
    const logics = app.logics;

    if (!ctx.controller || !ctx.action) {
      return ctx.throw(404);
    }

    // logics empty
    if (helper.isEmpty(logics)) {
      return next();
    }

    const Logic = logics[ctx.controller];
    // logic not exist
    if (helper.isEmpty(Logic)) {
      return next();
    }

    const instance = new Logic(ctx);
    let promise = Promise.resolve();
    if (instance.__before) {
      promise = Promise.resolve(instance.__before());
    }

    // if return false, it will be prevent next process
    return promise.then(data => {
      if (data === false) return false;
      let method = `${ctx.action}Action`;

      // magic call method
      if (!instance[method]) {
        method = '__call';
      }

      if (instance[method]) {
        const ret = instance[method](); // to get the allowMethods

        // allowMethods validate
        let allowMethods = instance.allowMethods;
        if (!helper.isEmpty(allowMethods)) {
          if (helper.isString(allowMethods)) {
            allowMethods = allowMethods.split(',').map(e => {
              return e.trim().toUpperCase();
            });
          }
          if (allowMethods.indexOf(ctx.method) === -1) {
            return ctx.fail(ctx.config('validateDefaultErrno'), 'METHOD_NOT_ALLOWED');
          }
        }

        return ret;
      }
    }).then(data => {
      if (data === false) return false;
      if (instance.__after) {
        return instance.__after();
      } else {
        // if (!instance['INVOKED'])
        // const rules = instance.getCombineRules(instance.scope, instance.rules);
        const rules = helper.extend({}, instance.scope, instance.rules);
        if (!helper.isEmpty(rules) && !instance.validate(rules)) {
          return ctx.fail(ctx.config('validateDefaultErrno'), instance.validateErrors);
        }
      }
    }).then(data => {
      if (data !== false) {
        return next();
      }
    });
  };
}

module.exports = invokeLogic;
