const assert = require('assert');

const BasicAdapter = require('./adapter/base');
const ConsoleAdapter = require('./adapter/console');
const FileAdapter = require('./adapter/file');
const DateFileAdapter = require('./adapter/datefile');

const adapterMap = {
  base: BasicAdapter,
  console: ConsoleAdapter,
  file: FileAdapter,
  dateFile: DateFileAdapter
};

class Logger {
  constructor(config = {}) {
    const Handle = adapterMap[config.type] || ConsoleAdapter;

    this._logger = new Handle(config);
    ['trace', 'debug', 'info', 'warn', 'error'].forEach(level => {
      assert(this._logger[level], `adapter function ${level} not exist!`);
      this[level] = this._logger[level].bind(this._logger);
    });
  }
}

Logger.Basic = BasicAdapter;
Logger.Console = ConsoleAdapter;
Logger.File = FileAdapter;
Logger.DateFile = DateFileAdapter;
module.exports = Logger;
