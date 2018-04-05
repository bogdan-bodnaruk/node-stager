const fp = require('find-free-port');
const Logger = require('../Logger');

class FreePortTask {
  constructor() {
    this.range = global.config.ports;
    if (!this.range || !this.range.start || !this.range.end) {
      Logger.error('Please specify ports range in config file');
    }

    return this.getPort();
  }

  async getPort() {
    Logger.proggress(`Looking for free ports in range from ${this.range.start} to ${this.range.end}`);

    const freePort = await fp(
      this.range.start,
      this.range.end,
      '127.0.0.1',
    );
    const port = freePort.shift();

    Logger.success(`Selected port: ${port}`);

    return port;
  }
}

module.exports = FreePortTask;
