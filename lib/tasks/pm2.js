const path = require('path');
const fs = require('fs');
const deepAssign = require('deep-assign');
const Logger = require('../Logger');
const {
  exec,
} = require('shelljs');
const App = require('../App');

class PM2Task {
  constructor(config) {
    this.config = config;
  }

  start() {
    const {
      repository,
      branch,
      port,
    } = this.config;

    Logger.proggress(`Starting the app with name ${repository}:${branch} on port ${port}`);

    const filename = App.savePM2(this.config);

    const { stderr, code } = exec(`pm2 start ${filename}`);

    if (stderr && code !== 0) {
      Logger.error(`PM2 start error: ${stderr}`);
    }

    Logger.success(`The app (${repository}:${branch}) has been started on  on port ${port}`);
    exec('pm2 save', { silent: true });

    return require(filename);
  }

  status() {
    exec('pm2 status');
  }

  restart() {
    const {
      repository,
      branch,
    } = this.config;

    Logger.proggress(`Restarting ${repository}:${branch} instance`);
    const filename = App.savePM2(this.config);

    exec(`pm2 restart ${filename}`, { silent: true });
    exec('pm2 save', { silent: true });
  }

  delete(options = {}) {
    Logger.proggress(`Running PM2 delete for ${options.repository}:${options.branch}`);

    const {
      code,
      stderr,
    } = exec(`pm2 delete ${options.repository}:${options.branch}`, { silent: true });
    exec('pm2 save', { silent: true });

    if (stderr && code !== 0) {
      Logger.error(`PM2 not deleted ${options.repository}:${options.branch} instance! ${stderr}`);
    }

    Logger.success(`PM2 deleted ${options.repository}:${options.branch} instance`);
  }

  list(repository) {
    const processes = exec('pm2 jlist', { silent: true });

    if (processes.stderr && processes.code !== 0) {
      Logger.error(`Some error has happened while fetching instances ${processes.stderr}`);
    }

    const raw = JSON.parse(processes.stdout);
    const list = {};

    raw.forEach(
      (item) => {
        const [repo, branch] = item.name.split(':');
        if (!list[repo]) {
          list[repo] = [];
        }

        list[repo].push(branch);
      },
    );

    if (!list.length) {
      Logger.info('You have no PM2 instances at this moment');
    }

    if (repository) {
      return list[repository] || [];
    }

    return list;
  }
}

module.exports = PM2Task;
