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

    const {
      hooks = [],
      appDir,
      repository,
      branch,
    } = this.config;

    if (hooks[hook] && hooks[hook][when] && hooks[hook][when].length) {
      Logger.proggress(`Started ${when} ${hook} hooks`);
      const Commander = require('../Commander');

      hooks[hook][when].forEach(
        (task) => {
          if (task instanceof Object) {
            if (task.plugin || task.cmd) {
              let folder = task.path ? format(task.path, this.config) : appDir;
              if (!path.isAbsolute(folder)) {
                folder = path.resolve(appDir, folder);
              }

              let args = [];
              if (task.args && task.args.length) {
                args = task.args.map(
                  arg => format(arg, this.config, {
                    skipUndefined: true,
                    regex: /{([a-zA-Z0-9.]*?)}/g,
                  }),
                );
              }

              cd(folder);

              if (task.plugin) {
                args.push(`repository=${repository}`);
                args.push(`branch=${branch}`);

                Logger.proggress(`Running plugin ${task.plugin} in folder ${folder}`);
                Commander.plugin(task.plugin, args);
                return true;
              }

              if (task.cmd) {
                Logger.proggress(`Running task ${task.cmd} in folder ${folder}`);
                exec(`${task.cmd} ${args.join(' ')}`);
                return true;
              }
            }
          }

          const command = format(task, this.config, {
            skipUndefined: true,
            regex: /{([a-zA-Z0-9.]*?)}/g,
          });

          Logger.proggress(`Running task ${command}`);
          cd(appDir);
          exec(command);
          return true;
        },
      );
      Logger.success(`${when} ${hook} run hooks were finished!`);
    }
  }

  beforeDeploy() {
    if (!this.config.hooks) {
      return false;
    }

    if (this.config.hooks.runUpdateOnly) {
      return this.run('update', 'before');
    }

    return this.run('deploy', 'before');
  }

  afterDeploy() {
    if (!this.config.hooks) {
      return false;
    }

    if (this.config.hooks.runUpdateOnly) {
      return this.run('update', 'after');
    }

    return this.run('deploy', 'after');
  }

  beforeUpdate() {
    if (!this.config.hooks) {
      return false;
    }

    if (this.config.hooks.runDeployOnly) {
      return this.run('deploy', 'before');
    }

    return this.run('update', 'before');
  }

  afterUpdate() {
    if (!this.config.hooks) {
      return false;
    }

    if (this.config.hooks.runDeployOnly) {
      return this.run('deploy', 'after');
    }

    return this.run('update', 'after');
  }
}

module.exports = HookTasks;
