const Logger = require('../Logger');
const {
  exec,
  test,
  cd,
} = require('shelljs');

class GitTask {
  constructor() {
    this.config = global.config;
  }

  clone() {
    const {
      branch,
      git,
      dir,
      appDir,
    } = this.config;

    if (!branch) {
      Logger.error('No branch specified! We even wasn\'t able to pick default branch from config file');
    }

    if (!git) {
      Logger.error('Git remote wasn\'t found in config file. Please update it and try one more time');
    }

    if (!dir || !appDir) {
      Logger.error('Something wrong with your directories or with a config for it.');
    }

    if (test('-d', appDir)) {
      Logger.info('This branch was already cloned. Skipping cloning step.');
      return;
    }

    Logger.proggress(`Starting cloning the branch ${branch} (of ${git}) to ${dir}`);

    const cloneCmd = `git clone -b ${branch} ${git} ${appDir}`;
    const {
      code,
      stderr,
    } = exec(cloneCmd, { silent: true });

    if (stderr && code !== 0) {
      Logger.error(`Git clone failed: ${cloneCmd} with error: ${stderr}`);
    }

    Logger.success('Cloning complete');
  }

  update() {
    if (!test('-d', this.config.appDir)) {
      Logger.error('Can\'t update project because folder is not existed');
    }

    Logger.proggress('Updating sources');
    cd(this.config.appDir);
    exec(`git pull origin ${this.config.branch}`);
  }

  list() {
    Logger.proggress(`Fetching: ${this.config.git}`);

    const ls = exec(`git ls-remote --heads ${this.config.git}`, {
      silent: true,
    });

    if (ls.stderr && ls.code !== 0) {
      Logger.error(ls.stderr);
    }

    const branches = ls.stdout.split("\n").map(
      (branch) => {
        if (branch) {
          return branch.split('\t')[1].replace(/refs\/heads\//gi, '');
        }

        return false;
      },
    ).filter(branch => branch);

    Logger.data(`Available branches on remote: ${branches.join(', ')}`);

    return branches;
  }
}

module.exports = GitTask;
