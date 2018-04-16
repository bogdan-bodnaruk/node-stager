const path = require('path');
const fs = require('fs');
const deepAssign = require('deep-assign');
const Logger = require('../Logger');
const {
  exec,
} = require('shelljs');

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

    const appName = this.config.name || `${repository}:${branch}`;
    const json = JSON.stringify(
      deepAssign({
        name: appName,
        env: {
          NODE_PORT: port,
        },
        cwd: this.config.appDir,
      }, this.config.pm2),
    );
    const filename = path.join(__dirname, '../../', 'apps/', `${appName}_pm2.json`);

    fs.writeFileSync(filename, json, 'utf8', (err) => {
      if (err) {
        Logger.error(`Save app file error: ${err}`);
      }

      Logger.success(`Config file has been successfully saved: ${filename}`);
    });

    const { stderr, code } = exec(`pm2 start ${filename}`);

    if (stderr && code !== 0) {
      Logger.error(`PM2 start error: ${stderr}`);
    }

    Logger.success(`The app (${repository}:${branch}) has been started on  on port ${port}`);
    exec('pm2 save', { silent: true });
    return json;
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

    exec(`pm2 restart ${repository}:${branch}`, { silent: true });
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
