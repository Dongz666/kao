const helper = require('kao-helper');
const { pathToRegexp } = require('path-to-regexp');
const querystring = require('querystring');
const assert = require('assert');
const debug = require('debug')('kao-router');

/**
 * default options
 */
const defaultOptions = {
  defaultController: 'index', // default controller name
  defaultAction: 'index', // default action name
  enableDefaultRouter: true,
  optimizeHomepageRouter: true
};

/**
 * format Rule
 * @param {Array} rule
 */
const formatRule = rule => {
  const query = [];
  const match = pathToRegexp(rule[0], query);

  // [/match/, 'rest'] for simple restful router
  if (rule.length === 2 && rule[1].toUpperCase() === 'REST') {
    rule[2] = rule[1];
    rule[1] = null;
  }

  return {
    match,
    path: rule[1],
    method: rule[2] && rule[2].toUpperCase(),
    options: rule[3] || {},
    query
  };
};

/**
 * format routers
 * @param {Array|Object} routers
 */
const formatRouters = routers => {
  if (helper.isArray(routers)) {
    return routers.map(item => {
      if (item.isFormatted) return item;
      if (item.rules) {
        item.match = pathToRegexp(item.match);
        item.rules = item.rules.map(rule => {
          return formatRule(rule);
        });
      } else {
        item = formatRule(item);
      }
      item.isFormatted = 1;
      return item;
    });
  }
  for (const m in routers) {
    if (routers[m].isFormatted) continue;
    if (routers[m].match) {
      routers[m].match = pathToRegexp(routers[m].match);
    }
    routers[m].rules = formatRouters(routers[m].rules);
    routers[m].isFormatted = 1;
  }

  return routers;
};

/**
 *
 * rules = [
 *    ['/index', 'test', 'get']
 * ]
 *
 * rules = [
 *  {
 *    match: /match/,
 *    rules: [match, path, method, options]
 *  }
 * ]
 *
 * rules = [
 *  {
 *    match: /match/,
 *    rules: [match, path, method, options]
 *  },
 *  ['/index', 'test', 'get']
 * ]
 *
 *
 * rules = {
 *  admin: {
 *    match: '',
 *    rules: [
 *      ['/index', 'test', 'get']
 *    ]
 *  }
 * }
 */
class Router {
  /**
   * constructor
   * @param {Object} ctx koa ctx
   * @param {Function} next  koa next
   * @param {Object} options middleware options
   */
  constructor(ctx, next, options) {
    this.ctx = ctx;
    this.next = next;
    this.options = options;
    this.controllers = this.ctx.app.controllers;
    this.pathname = this.ctx.path || '';
    this.rules = this.ctx.app.routers;
    this.ctxMethod = ctx.method.toUpperCase();
  }

  /**
   * detect rule match
   */
  getMatchedRule(rules) {
    let rule;
    const specialMethods = ['REDIRECT', 'REST'];
    rules.some(item => {
      if (!item.rules) {
        // check rule'method matched
        const itemMethod = item.method;
        if (itemMethod && specialMethods.indexOf(itemMethod) === -1) {
          if (itemMethod.indexOf(this.ctxMethod) === -1) return;
        }
        // check rule'match matched
        assert(helper.isRegExp(item.match), 'router.match must be a RegExp');
        const match = item.match.exec(this.pathname);
        if (!match) return;
        // parse query
        assert(helper.isArray(item.query), 'router.query must be an array');
        const query = {};
        let pathname = item.path || this.pathname;
        item.query.forEach((queryItem, index) => {
          if (/^\d+$/.test(queryItem.name)) {
            const index = parseInt(queryItem.name) + 1;
            pathname = pathname.replace(new RegExp(`:${index}`, 'g'), match[index] || '');
          } else {
            query[queryItem.name] = match[index + 1];
            pathname = pathname.replace(new RegExp(`:${queryItem.name}`, 'g'), query[queryItem.name]);
          }
        });
        rule = Object.assign({}, item, {query, path: pathname});
        return true;
      } else {
        const multiMatch = item.match.exec(this.pathname);
        if (!multiMatch) return;
        rule = this.getMatchedRule(item.rules);
      }
    });
    return rule;
  }

  /**
    parse controller
   */
  parseController({ pathname, controllers }) {
    let controller = '';
    // only check multiple layer controller, because single layer can get controller from pathname
    for (const name in controllers) {
      if (name.indexOf('/') === -1) break; // if single layer, break the loop
      if (name === pathname || pathname.indexOf(`${name}/`) === 0) {
        controller = name;
        pathname = pathname.slice(name.length + 1);
        break; // if already have matched, break the loop
      }
    }
    if (controller === '') {
      const pos = pathname.indexOf('/');
      controller = pos === -1 ? pathname : pathname.slice(0, pos);
      pathname = pos === -1 ? '' : pathname.slice(pos + 1);
    }
    controller = controller || this.options.defaultController;
    return { controller, pathname };
  }

  /**
   * parse action
   */
  parseAction({ pathname, ruleMethod }) {
    let action = '';
    pathname = pathname.split('/');
    action = ruleMethod === 'REST' ? this.ctxMethod.toLowerCase() : pathname[0];
    action = action || this.options.defaultAction;
    return { action };
  }

  /**
   * parser item rule
   */
  parseRule(rule) {
    const ruleMethod = rule.method;
    // redirect url
    if (ruleMethod === 'REDIRECT') {
      if (rule.options && rule.options.statusCode) {
        this.ctx.status = rule.options.statusCode;
      }
      return this.ctx.redirect(rule.path);
    }
    // remove needless `/` in pathname
    let pathname = rule.path.replace(/^\/|\/$/g, '').replace(/\/{2,}/g, '/');
    let query = rule.query || {};
    const queryPos = pathname.indexOf('?');
    // parse query in path
    if (queryPos > -1) {
      query = Object.assign(query, querystring.parse(pathname.slice(queryPos + 1)));
      pathname = pathname.slice(0, queryPos);
    }
    // remove when query value is undefined or empty string
    for (const name in query) {
      const isUndefind = query[name] === undefined;
      const isEmptyString = helper.isString(query[name]) && query[name].trim() === '';
      const isEmptyArray = helper.isArray(query[name]) && query[name].every(val => !val);
      if (isUndefind || isEmptyString || isEmptyArray) {
        delete query[name];
      }
    }

    // parse controller
    const parseControllerResult = this.parseController({ pathname, controllers: this.controllers });
    const { controller } = parseControllerResult;
    pathname = parseControllerResult.pathname;

    // parse action
    const { action } = this.parseAction({ pathname, ruleMethod });

    this.ctx.controller = controller;
    this.ctx.action = action;
    this.ctx.param(query);
    debug(`RouterParser: path=${this.ctx.path}, controller=${this.ctx.controller}, action=${this.ctx.action}, query=${JSON.stringify(query)}`);
    return this.next();
  }

  /**
   * parse router
   */
  run() {
    const pathname = this.pathname;
    // ignore user defined rules for home page request, optimize request performance
    // default home page pathname is `/`, when user define prefix, it may be an empty string
    if (this.options.optimizeHomepageRouter && (pathname === '' || pathname === '/')) {
      this.ctx.controller = this.options.defaultController;
      this.ctx.action = this.options.defaultAction;
      debug(`RouterParser: path=${this.ctx.path}, controller=${this.ctx.controller}, action=${this.ctx.action}`);
      return this.next();
    }
    // parse rules
    const rules = this.rules;
    const matchedRule = this.getMatchedRule(rules);
    if (matchedRule) {
      debug(`matchedRule: ${JSON.stringify(matchedRule)}`);
      return this.parseRule(matchedRule);
    }
    if (this.options.enableDefaultRouter) {
      return this.parseRule({path: this.pathname});
    }
    return this.next();
  }
}

/**
 * parse router
 */
module.exports = function parseRouter(options, app) {
  options = Object.assign(defaultOptions, options);
  // format routers when routerChange event fired
  app.on('routerChange', routers => {
    app.routers = formatRouters(routers);
  });

  // format routers when app ready
  app.once('appReady', () => {
    app.routers = formatRouters(app.routers);
  });

  return function router(ctx, next) {
    const instance = new Router(ctx, next, options);
    return instance.run();
  };
};
