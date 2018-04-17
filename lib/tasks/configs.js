const path = require('path');
const Config = require('../Config');
const Logger = require('../Logger');
const deepAssign = require('deep-assign');

class ConfigTask {
  constructor(repository, _branch, argsConfigs = {}) {
    if (!repository) {
      Logger.error('Please specify repository name');
    }

    const app = new Config(repository);
    const config = app.config();

    config.branch = _branch || config.defaultBranch;
    config.appDir = path.join(config.path, repository, config.branch);

    if (config.pm2 && config.pm2.enabled) {
      const pm2 = app.pm2(config.pm2.configFile);
      pm2.env.NODE_PATH = path.resolve(config.appDir, pm2.env.NODE_PATH || './');

      config.pm2 = deepAssign(config.pm2, pm2);
    }

    return {
      repository,
      ...config,
      ...argsConfigs,
    };
  }
}

module.exports = ConfigTask;
