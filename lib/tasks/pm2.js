const pm2 = require('pm2');
const path = require('path');
const deepAssign = require('deep-assign');
const Logger = require('../Logger');
const {
  cd,
  exit,
  exec,
} = require('shelljs');

class PM2Task {
  constructor() {
    this.config = global.config;
  }

  hooks(when = false) {
    if (when !== 'before' && when !== 'after') {
      Logger.info('Skipping hooks');
    }

    if (this.config.deploy[when] && this.config.deploy[when].length) {
      const folder = path.dirname(this.config.env.NODE_PATH);
      Logger.proggress(`Running ${when} deploy hooks in ${folder}.`);
      cd(folder);

      this.config.deploy[when].forEach(
        (task) => {
          Logger.proggress(`Running task ${task}`);
          exec(task);
        },
      );
      Logger.success(`${when} run hooks were finished!`);
    }
  }

  start() {
    const {
      repository,
      branch,
      port,
    } = this.config;

    pm2.connect((error) => {
      if (error) {
        Logger.error(`PM2 connection error: ${error}`);
      }

      Logger.proggress(`Starting the app with name ${repository}:${branch} on port ${port}`);

      this.hooks('before');
      pm2.start(
        deepAssign({
          name: `${repository}:${branch}`,
          env: {
            NODE_PORT: port,
          },
        }, this.config),
        (err) => {
          if (err) {
            pm2.disconnect();
            Logger.error(`PM2 app starting error: ${err}`);
          }
          this.hooks('after');
          Logger.success(`The app (${repository}:${branch}) has been started on  on port ${port}`);
          exec('pm2 save', { silent: true });
          this.status();

          exit(1);
        });
    });
  }

  status() {
    const { stdout } = exec('pm2 status', { silent: true });
    Logger.data(stdout);
  }

  restart() {
    const {
      repository,
      branch,
    } = this.config;

    Logger.proggress(`Restarting ${repository}:${branch} instance`);

    this.hooks('before');
    exec(`pm2 restart ${repository}:${branch}`, { silent: true });
    exec('pm2 save', { silent: true });
    this.hooks('after');
  }

  delete(options = {}) {
    if (options.all) {
      Logger.proggress('Running PM2 delete for all instances');
      const { stderr } = exec('pm2 delete all', { silent: true });

      if (stderr) {
        Logger.error(`Some error has happened while deleting all instances: ${stderr}`);
      }

      exec('pm2 save', { silent: true });
      Logger.success('All PM2 instances were deleted');
      exit(1);
    }

    Logger.proggress(`Running PM2 delete for ${options.repository}:${options.branch}`);

    const {
      code,
      stderr,
    } = exec(`pm2 delete ${options.repository}:${options.branch}`, { silent: true });
    exec('pm2 save', { silent: true });

    if (code) {
      Logger.error(`PM2 not deleted ${options.repository}:${options.branch} instance! ${stderr}`);
    }

    Logger.success(`PM2 deleted ${options.repository}:${options.branch} instance`);
  }

  list(repository) {
    const processes = exec('pm2 jlist', { silent: true });

    if (processes.code) {
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

    if (repository) {
      return list[repository] || [];
    }

    return list;
  }
}

module.exports = PM2Task;
