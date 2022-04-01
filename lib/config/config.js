/**
 * default config
 */
module.exports = {
  port: 8360, // server port
  // host: '127.0.0.1', // server host
  createServer: undefined, // create server function
  startServerTimeout: 3000, // before start server time
  onUnhandledRejection: err => kao.logger.error(err), // unhandledRejection handle
  onUncaughtException: err => kao.logger.error(err), // uncaughtException handle
  processKillTimeout: 10 * 1000, // process kill timeout, default is 10s
  jsonpCallbackField: 'callback', // jsonp callback field
  jsonContentType: 'application/json', // json content type
  jsonpContentType: 'application/javascript', // jsonp content type
  errnoField: 'errno', // errno field
  errmsgField: 'errmsg', // errmsg field
  defaultErrno: 1000, // default errno
  validateDefaultErrno: 1001 // validate default errno
};
