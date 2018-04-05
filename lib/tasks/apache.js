const fs = require('fs');
const template = require("string-template");
const {
  exec,
} = require('shelljs');
const Logger = require('../Logger');
const Config = require('../Config');

class ApacheTask {
  constructor(config) {
    this.config = config || global.config;
  }

  parse() {
    const apacheFile = Config.apacheTemplate(this.config.repository);
    if (apacheFile) {
      return template(apacheFile, this.config);
    }

    return false;
  }

  create() {
    const dirName = '/etc/apache2/sites-enabled/';
    const fileName = `${this.config.repository}_${this.config.branch}.vhost`;
    const content = this.parse();
    if (!content) {
      Logger.info('Skipping creation apache vhost file');
      return true;
    }
    Logger.proggress(`Creating ${this.config.repository}_${this.config.branch}.vhost`);

    fs.writeFileSync(fileName, content, (err) => {
      if (err) {
        Logger.error(`Error has happened while creating or saving vhost file. ${err}`);
      }

      Logger.success(`The apache2 configuration file ${fileName} has been created!`);
    });

    const process = exec(`sudo mv ./${fileName} ${dirName}`, { silent: true });
    if (process.stderr) {
      Logger.error(`Can't move compiled vhost file to ${dirName}`);
    }

    Logger.success('Apache vhost file was successfully created and and moved into system folder!');
  }

  restart() {
    Logger.proggress('Restarting apache...');
    const progress = exec('sudo service apache2 restart', { silent: true });
    if (progress.stderr) {
      Logger.error(`Error has happened while restarting apache2 ${progress.stderr}`);
    }

    Logger.success(`Apache2 has been restarted`);
  }
}

module.exports = ApacheTask;
