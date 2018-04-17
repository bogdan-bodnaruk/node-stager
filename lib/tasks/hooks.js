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
      Logger.proggress(`Started ${when} ${hook} hooks`);
      const Commander = require('../Commander');

      this.config[hook][when].forEach(
        (task) => {
          if (task instanceof Object) {
            if (task.plugin || task.cmd) {
              let folder = task.path ? format(task.path, this.config) : this.config.appDir;
              if (!path.isAbsolute(folder)) {
                folder = path.resolve(this.config.appDir, folder);
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

              args.push(`repository=${this.config.repository}`);
              args.push(`branch=${this.config.branch}`);

              cd(folder);

              if (task.plugin) {
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
          cd(this.config.appDir);
          exec(command);
          return true;
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
