const debug = require('debug')('kao');
const KEEP_ALIVE = Symbol('kao-graceful-keepalive');

/**
 * default options
 */
const defaultOptions = {
  port: 0,
  host: '',
  createServer: () => {},
  logger: () => {},
  onUncaughtException: () => true, // onUncaughtException event handle
  onUnhandledRejection: () => true, // onUnhandledRejection event handle
  processKillTimeout: 10 * 1000 // 10s
};
/**
 * Worker
 */
class Worker {
  /**
   * constructor
   * @param {Object} options
   */
  constructor(options) {
    this.options = Object.assign({}, defaultOptions, options);
  }
  /**
   * disable keep alive
   */
  disableKeepAlive() {
    if (this[KEEP_ALIVE]) return;
    this[KEEP_ALIVE] = true;
    this.server.on('request', (req, res) => {
      req.shouldKeepAlive = false;
      res.shouldKeepAlive = false;
      if (!res.headersSent) {
        res.setHeader('Connection', 'close');
      }
    });
  }
  /**
   * close server
   */
  closeServer() {
    this.disableKeepAlive();
    const killTimeout = this.options.processKillTimeout;
    if (killTimeout) {
      const timer = setTimeout(() => {
        debug(`process exit by killed(timeout: ${killTimeout}ms), pid: ${process.pid}`);
        process.exit(1);
      }, killTimeout);
      timer.unref && timer.unref();
    }
    debug(`start close server, pid: ${process.pid}`);
    this.server.close(() => {
      debug(`server closed, pid: ${process.pid}`);
    });
  }
  /**
   * disconnect worker
   * @param {Boolean} sendSignal
   */
  disconnectWorker() {
    this.closeServer();
  }
  /**
   * capture quit signal
   */
  captureQuitSignal() {
    process.on('SIGINT', () => {
      this.disconnectWorker();
    });
  }
  /**
   * uncaughtException
   */
  uncaughtException() {
    let errTimes = 0;
    process.on('uncaughtException', err => {
      errTimes++;
      this.options.logger(`uncaughtException, times: ${errTimes}, pid: ${process.pid}`);
      this.options.logger(err);

      const flag = this.options.onUncaughtException(err);
      if (errTimes === 1 && flag) {
        this.disconnectWorker();
      }
    });
  }
  /**
   * unhandledRejection
   */
  unhandledRejection() {
    let rejectTimes = 0;
    process.on('unhandledRejection', err => {
      rejectTimes++;
      this.options.logger(`unhandledRejection, times: ${rejectTimes}, pid: ${process.pid}`);
      this.options.logger(err);
      const flag = this.options.onUnhandledRejection(err);
      if (rejectTimes === 1 && flag) {
        this.disconnectWorker();
      }
    });
  }
  /**
   * listen port
   */
  listen() {
    this.server = this.options.createServer();
    return this.server.listen(this.options.port, this.options.host);
  }
  /**
   * capture events
   */
  captureEvents() {
    this.uncaughtException();
    this.unhandledRejection();
    this.captureQuitSignal();
  }
  /**
   * start server
   */
  startServer() {
    this.captureEvents();
    return this.listen();
  }
}

module.exports = Worker;
