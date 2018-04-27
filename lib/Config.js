const fs = require('fs');
const path = require('path');
const Logger = require('./Logger');

class Config {
  constructor(repository) {
    if (!repository) {
      Logger.error(`Please specify app name`);
    }

    this.repository = repository;
  }

  config() {
    const filename = path.resolve(`${__dirname}/../config/${this.repository}/app.json`);

    try {
      return require(filename);
    } catch (e) {
      Logger.error(`Can't load ${filename} file: ${e}`);
      return e;
    }
  }

  pm2(configFile = 'pm2.json') {
    const filename = path.resolve(`${__dirname}/../config/${this.repository}/${configFile}`);

    try {
      return require(filename);
    } catch (e) {
      Logger.error(`Can't load ${filename} file: ${e}`);
      return e;
    }
  }

  apacheTemplate(configFile = 'vhost.conf') {
    const filename = path.resolve(`${__dirname}/../config/${this.repository}/${configFile}`);

    try {
      return fs.readFileSync(filename, "utf8");
    } catch (e) {
      Logger.error(`Can't load ${filename} file: ${e}`);
      return e;
    }
  }
}

module.exports = Config;
