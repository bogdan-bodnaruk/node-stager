const path = require('path');
const Config = require('../Config');
const Logger = require('../Logger');

class ConfigTask {
  constructor(repository, _branch, argsConfigs = {}) {
    if (!repository) {
      Logger.error('Please specify repository name');
    }

    if (global.config) {
      return global.config;
    }

    const config = Config.app(repository);
    const pm2 = Config.pm2(repository);
    const branch = _branch || config.defaultBranch;

    const dir = path.join(pm2.cwd, repository);
    const appDir = path.join(pm2.cwd, repository, branch);
    const projectDir = pm2.cwd;

    pm2.cwd = path.join(
      pm2.cwd,
      repository,
      branch,
    );

    pm2.env.NODE_PATH = path.join(appDir, pm2.env.NODE_PATH || './');

    global.config = {
      repository,
      ...config,
      ...pm2,
      dir,
      appDir,
      projectDir,
      ...argsConfigs,
      branch,
    };

    return global.config;
  }
}

module.exports = ConfigTask;
