const path = require('path');
const Logger = require('../Logger');
const {
  cd,
  exec,
} = require('shelljs');
const format = require('template-format');

class HookTasks {
  constructor(config) {
    this.config = config;
  }

  run(hook, when) {
    if (when !== 'before' && when !== 'after') {
      Logger.info('Skipping hooks');
    }

    if (this.config[hook] && this.config[hook][when] && this.config[hook][when].length) {
      const folder = path.dirname(this.config.pm2.env.NODE_PATH);
      Logger.proggress(`Running ${when} ${hook} hooks in ${folder}.`);
      cd(folder);

      this.config[hook][when].forEach(
        (task) => {
          const command = format(task, this.config);
          Logger.proggress(`Running task ${command}`);
          exec(command);
        },
      );
      Logger.success(`${when} ${hook} run hooks were finished!`);
    }
  }

  beforeDeploy() {
    return this.run('deploy', 'before');
  }

  aftereDeploy() {
    return this.run('deploy', 'after');
  }

  beforeUpdate() {
    return this.run('update', 'before');
  }

  aftereUpdate() {
    return this.run('update', 'after');
  }
}

module.exports = HookTasks;
