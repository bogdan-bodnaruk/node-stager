const fp = require('find-free-port');
const Logger = require('../Logger');

class FreePortTask {
  constructor(config) {
    this.config = config;
    if (!this.config.pm2 || !this.config.pm2.enabled) {
      Logger.info('Skipping searching free port because pm2 is disabled or not configured');
      return true;
    }

    const {
      start,
      end,
    } = this.config.pm2.portsRange;

    if (!start || !end) {
      Logger.error('Please specify ports range in pm2 config file');
    }

    return this.getPort(start, end);
  }

  async getPort(start, end) {
    Logger.proggress(`Looking for free ports in range from ${start} to ${end}`);

    const freePort = await fp(
      start,
      end,
      '127.0.0.1',
    );
    const port = freePort.shift();

    Logger.success(`Selected port: ${port}`);

    return port;
  }
}

module.exports = FreePortTask;
