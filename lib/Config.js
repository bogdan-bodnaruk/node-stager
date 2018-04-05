const fs = require('fs');
const Logger = require('./Logger');

class Config {
  static pm2(name) {
    if (!name) {
      Logger.error(`Please specify pm2 config name`);
      return false;
    }

    try {
      const config = require(`../config/${name}/pm2.json`);
      if (config.name) {
        Logger.error('Static names for the instances are not supported');
      }

      return config;
    } catch (e) {
      Logger.error(`Can't load config/${name}/pm2.json file`);
      return e;
    }
  }

  static app(name) {
    if (!name) {
      Logger.error(`Please specify app name`);
      return false;
    }

    try {
      const config = require(`../config/${name}/app.json`);
      if (config.name) {
        Logger.error('Static names for the instances are not supported');
      }

      return config;
    } catch (e) {
      Logger.error(`Can't load config/${name}/app.json file`);
      return e;
    }
  }

  static apacheTemplate(name) {
    if (!name) {
      Logger.error(`Please specify app name`);
      return false;
    }

    try {
      return fs.readFileSync(`./config/${name}/vhost`, "utf8");
    } catch (e) {
      Logger.error(`Can't load config/${name}/vhost file`);
      return e;
    }
  }
}

module.exports = Config;
