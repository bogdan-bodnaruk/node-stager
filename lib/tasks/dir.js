const {
  test,
  mkdir,
  rm,
} = require('shelljs');
const Logger = require('../Logger');

class DirTask {
  constructor(config) {
    this.appDir = global.config.appDir;
    this.dir = global.config.dir;
    this.projectDir = global.config.projectDir;

    if (config) {
      this.appDir = config.appDir;
      this.dir = config.dir;
      this.projectDir = config.projectDir;
    }

    if (!this.dir || !this.appDir || !this.projectDir) {
      Logger.error('Something wrong with your directories or with a config for it.');
    }
  }

  isCreated() {
    const exists = test('-d', this.appDir);
    if (exists) {
      Logger.info(`Folder ${this.appDir} already existed`);
    }

    return exists;
  }

  create() {
    if (test('-d', this.dir)) {
      Logger.info(`Folder ${this.dir} already existed. Skipping this step.`);
      return;
    }

    Logger.info(`Creating dir: ${this.dir}`, '📂');
    mkdir('-p', [this.dir]);
  }

  removeProject() {
    Logger.proggress(`Deleting all folders in: ${this.projectDir}`);
    rm('-rf', this.projectDir);
  }

  removeAppDir() {
    Logger.proggress(`Deleting folder ${this.appDir}`);
    rm('-rf', this.appDir);
  }
}

module.exports = DirTask;
