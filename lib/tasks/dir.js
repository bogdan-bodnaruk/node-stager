const {
  test,
  mkdir,
  rm,
} = require('shelljs');
const path = require('path');
const Logger = require('../Logger');

class DirTask {
  constructor(config) {
    this.config = config;
  }

  isCreated() {
    const exists = test('-d', this.config.appDir);
    if (exists) {
      Logger.info(`Folder ${this.config.appDir} already existed`);
    }

    return exists;
  }

  create() {
    const folder = path.join(this.config.path, this.config.repository);

    if (test('-d', folder)) {
      Logger.info(`Folder ${folder} already existed. Skipping this step.`);
      return;
    }

    Logger.info(`Creating dir: ${folder}`, '📂');
    mkdir('-p', [folder]);
  }

  removeAppDir() {
    Logger.proggress(`Deleting folder ${this.config.appDir}`);
    rm('-rf', this.config.appDir);
  }
}

module.exports = DirTask;
