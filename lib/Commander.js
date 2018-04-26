const path = require('path');
const {
  exit,
  which,
  ls,
  exec,
} = require('shelljs');
const Table = require('cli-table');
const Logger = require('./Logger');
const App = require('./App');
const ConfigTask = require('./tasks/configs');
const FreePortTask = require('./tasks/freePort');
const GitTask = require('./tasks/git');
const DirTask = require('./tasks/dir');
const PM2Task = require('./tasks/pm2');
const ApacheTask = require('./tasks/apache');
const HookTasks = require('./tasks/hooks');
const deepAssign = require('deep-assign');
const parse = require('../utils/parse');

class Commander {
  static ensure(dependency) {
    if (!which(dependency)) {
      Logger.error(`Sorry, the ${dependency} package is required for node-stager`, '️⛔');
    }
  }

  static status() {
    const table = new Table({
      head: ['Repository', 'Branch', 'App Name', 'Port'],
    });

    App.all.forEach(
      (app) => {
        table.push([
          app.repository, app.branch, app.name, app.port || 'none',
        ]);
      },
    );

    Logger.data(table.toString());
  }

  static config(repository = false, options = {}) {
    if (repository) {
      const config = new ConfigTask(repository);
      if (!config) {
        Logger.error(`We weren't able to find such config for ${repository} project`);
      }

      if (!options.silent) {
        Logger.dir(config);
      }

      return config;
    }

    const repositories = ls('-d', path.resolve(__dirname, '../config/*'));
    if (repositories.stderr) {
      Logger.error(repositories.stderr);
    }

    const configs = repositories.stdout.split("\n").map(
      (repo) => {
        if (repo) {
          const { name } = path.parse(repo);
          const config = new ConfigTask(name);
          if (!options.silent) {
            Logger.dir(config);
          }

          return config;
        }

        return false;
      },
    ).filter(repo => repo);

    if (!configs.length) {
      Logger.error('You have no configured projects');
    }

    return configs;
  }

  static update(repository, branch, command = {}) {
    if (command.all) {
      Logger.proggress('Started updating all instances...');
      App.all.forEach(
        app => Commander.update(app.repository, app.branch),
      );
      return;
    }
    const args = parse.args(command);
    const [config] = deepAssign(App.getApp(repository, branch), args);
    const git = new GitTask(config);

    if (config.prune) {
      Commander.prune(config.prune === 'all' ? false : repository);
    }

    git.update();

    const hooks = new HookTasks(config);
    hooks.beforeUpdate();

    if (config.pm2 && config.pm2.enabled) {
      Commander.ensure('pm2');
      const pm2 = new PM2Task(config);
      pm2.restart(config.pm2);
      pm2.status();
    }

    hooks.aftereUpdate();

    App.save(config);
    Commander.status();
  }

  static async deploy(repository, branch, command) {
    const args = parse.args(command);
    const config = new ConfigTask(repository, branch, args);
    const dir = new DirTask(config);
    const git = new GitTask(config);
    Logger.dir(config);

    if (dir.isCreated()) {
      Commander.update(repository, config.branch);
      exit(1);
    }

    if (config.prune) {
      Commander.prune(config.prune === 'all' ? false : repository);
    }

    dir.create();
    git.clone();

    config.name = config.name || `${repository}:${config.branch}`;

    const hooks = new HookTasks(config);
    hooks.beforeDeploy();

    if (config.pm2 && config.pm2.enabled) {
      Commander.ensure('pm2');
      config.port = await new FreePortTask(config);

      const pm2 = new PM2Task(config);
      config.pm2 = pm2.start();
      config.name = config.pm2.name;
    }

    if (config.apache && config.apache.enabled) {
      const apache = new ApacheTask(config);
      apache.create();
      apache.restart();
    }

    hooks.aftereDeploy();

    App.save(config);
  }

  static remove(repository = false, branch = false, command = {}) {
    if (command.all) {
      App.all.forEach(
        app => Commander.remove(app.repository, app.branch),
      );
      return;
    }

    if (!repository) {
      Logger.error('Please specify repository and branch that you want to delete');
    }

    const config = new ConfigTask(repository, branch);
    const dir = new DirTask(config);

    if (!config.branch) {
      Logger.error('Please specify branch that you want to delete');
    }

    dir.removeAppDir();

    if (config.apache && config.apache.enabled) {
      const apache = new ApacheTask(config);
      apache.remove();
      apache.restart();
    }

    if (config.pm2 && config.pm2.enabled) {
      const pm2 = new PM2Task(config);

      pm2.delete({
        repository,
        branch: config.branch,
      });
      pm2.status();
    }

    App.remove(config);
  }

  static branches(repository = false) {
    const config = new ConfigTask(repository);
    const git = new GitTask(config);

    git.list();
  }

  static prune(repository = false, command = {}) {
    if (!repository || command.all) {
      const configs = Commander.config(false, { silent: true });
      configs.forEach(
        config => Commander.prune(config.repository),
      );
      return;
    }

    const config = new ConfigTask(repository);
    const git = new GitTask(config);

    Logger.proggress('Running prune process...');

    const branches = git.list();
    const toPrune = [];

    App.getRepository(repository).forEach(
      (app) => {
        const isCreated = branches.find(branch => branch === app.branch);
        if (!isCreated) {
          toPrune.push(app.branch);
        }
      },
    );

    if (toPrune.length) {
      Logger.data(`${toPrune.length} found instance(s) to prune.`);

      toPrune.forEach(
        app => Commander.remove(repository, app),
      );
      return;
    }

    Logger.info('Nothing to prune.');
  }

  static startup() {
    const process = exec('pm2 startup', { silent: true });
    if (process.stderr) {
      Logger.error(`Error while trying to add to system startup pm2 instance ${process.stderr}`);
    }

    const sudo = exec(process.stdout, { silent: true });
    if (sudo.stderr) {
      Logger.error(`Error while running "${process.stdout}"`);
    }

    Logger.success('pm2 has been added to system startup!');
  }

  static plugin(name, command = []) {
    if (!command.length) {
      Logger.error('Plugin command expects arguments. At least we need repository');
    }

    const args = parse.args(command);
    const config = new ConfigTask(args.repository, args.branch, args);
    const filename = path.resolve(__dirname, `../plugins/${name}/index.js`);
    try {
      const Plugin = require(filename);
      const plugin = new Plugin(config);

      plugin[args.action || 'index']();
    } catch (e) {
      Logger.error(`Can't load plugin ${name}. Error: ${e}`);
    }
  }
}

module.exports = Commander;
