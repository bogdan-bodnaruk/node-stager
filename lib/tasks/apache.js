const fs = require('fs');
const path = require('path');
const format = require('template-format');
const {
  exec,
} = require('shelljs');
const Logger = require('../Logger');
const Config = require('../Config');

class ApacheTask {
  constructor(config) {
    this.config = config;
    if (!config) {
      Logger.error('Please specify configs for the apache task');
    }

    this.dirName = this.config.apache.path || '/etc/apache2/sites-enabled/';
    this.fileName = `${this.config.repository}_${this.config.branch}.conf`;
    if (this.config.name) {
      this.fileName = `${this.config.name}.conf`;
    }
  }

  parse() {
    const app = new Config(this.config.repository);
    const apacheFile = app.apacheTemplate();

    if (apacheFile) {
      return format(apacheFile, this.config, { skipUndefined: true });
    }

    return false;
  }

  create() {
    const content = this.parse();
    if (!content) {
      Logger.info('Skipping creation apache vhost.conf file');
      return true;
    }
    Logger.proggress(`Creating ${this.fileName}`);

    fs.writeFileSync(path.resolve(this.fileName), content, (err) => {
      if (err) {
        Logger.error(`Error has happened while creating or saving vhost file. ${err}`);
      }

      Logger.success(`The apache2 configuration file ${this.fileName} has been created!`);
    });

    const process = exec(`sudo mv ${path.resolve(this.fileName)} ${this.dirName}`, { silent: true });
    if (process.stderr) {
      Logger.error(`Can't move compiled vhost file to ${this.dirName}`);
    }

    Logger.success('Apache vhost.conf file was successfully created and and moved into system folder!');
    return true;
  }

  restart() {
    Logger.proggress('Restarting apache...');
    const progress = exec('sudo service apache2 restart', { silent: true });
    if (progress.stderr) {
      Logger.error(`Error has happened while restarting apache2 ${progress.stderr}`);
    }

    Logger.success(`Apache2 has been restarted`);
  }

  remove() {
    Logger.proggress(`Removing apache file: ${this.fileName}`);

    const progress = exec(`sudo rm -f ${path.join(this.dirName, this.fileName)}`, { silent: true });
    if (progress.stderr) {
      Logger.error(`Can't delete file ${this.fileName}`);
    }

    Logger.success(`Apache2 config for instance ${this.config.branch} in project ${this.config.repository} has been restarted`);
  }
}

module.exports = ApacheTask;
