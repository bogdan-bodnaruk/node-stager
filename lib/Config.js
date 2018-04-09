const fs = require('fs');
const path = require('path');
const Logger = require('./Logger');

class Config {
  static pm2(name) {
    if (!name) {
      Logger.error(`Please specify pm2 config name`);
      return false;
    }

    const filename = path.resolve(`config/${name}/pm2.json`);
    try {
      const config = require(filename);
      if (config.name) {
        Logger.error('Static names for the instances are not supported');
      }

      return config;
    } catch (e) {
      Logger.error(`Can't load ${filename} file`);
      return e;
    }
  }

  static app(name) {
    if (!name) {
      Logger.error(`Please specify app name`);
      return false;
    }

    const filename = path.resolve(`config/${name}/app.json`);
    try {
      const config = require(filename);
      if (config.name) {
        Logger.error('Static names for the instances are not supported');
      }

      return config;
    } catch (e) {
      Logger.error(`Can't load ${filename} file`);
      return e;
    }
  }

  static apacheTemplate(name) {
    if (!name) {
      Logger.error(`Please specify app name`);
      return false;
    }

    const filename = path.resolve(`config/${name}/vhost`);
    try {
      return fs.readFileSync(filename, "utf8");
    } catch (e) {
      Logger.error(`Can't load ${filename} file`);
      return e;
    }
  }
}

module.exports = Config;
