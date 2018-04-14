const {
  exec,
} = require('shelljs');
const Logger = require('../../lib/Logger');

class Composer {
  constructor() {
    this.config = global.config;
  }

  index() {
    Logger.error('No action here');
  }

  install() {
    Logger.proggress('Starting installing php packages...');
    const { stderr, code } = exec('composer install');
    if (stderr && code !== 0) {
      Logger.error(`Error has happened while installing composer packages: ${stderr}`);
    }

    Logger.success('Composer installed packages successfully');
  }
}

module.exports = Composer;
