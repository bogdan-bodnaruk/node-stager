const path = require('path');
const fs = require('fs');
const {
  exit,
  which,
  ls,
  exec,
  rm,
} = require('shelljs');
const Table = require('cli-table');
const Logger = require('./Logger');
const ConfigTask = require('./tasks/configs');
const FreePortTask = require('./tasks/freePort');
const GitTask = require('./tasks/git');
const DirTask = require('./tasks/dir');
const PM2Task = require('./tasks/pm2');
const ApacheTask = require('./tasks/apache');
const HookTasks = require('./tasks/hooks');

class Commander {
  static ensure(dependency) {
    if (!which(dependency)) {
      Logger.error(`Sorry, the ${dependency} package is required for node-stager`, '️⛔');
    }
  }

  static status() {
    const get = ls('-A', path.resolve(__dirname, '../apps/*[^_pm2].json'));

    if (get.stderr && get.code !== 0) {
      Logger.error(`Can't get applications status ${get.stderr}`);
    }

    const apps = get.stdout.split("\n").map(
      (app) => {
        if (app) {
          return require(app);
        }
        return false;
      },
    ).filter(app => app);

    const table = new Table({
      head: ['Repository', 'Branch', 'App Name', 'Port'],
    });

    apps.forEach(
      (app) => {
        table.push([
          app.repository, app.branch, app.name, app.port || 'none',
        ]);
      },
    );

    Logger.data(table.toString());
    return apps;
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
      const apps = Commander.status();

      apps.forEach(
        app => Commander.update(app.repository, app.branch),
      );
      return;
    }

    const config = new ConfigTask(repository, branch); // TODO: Load configs from json file
    const git = new GitTask(config);

    if (config.pruneOnDeployOrUpdate) {
      Commander.prune(repository);
    }

    git.update();

    const hooks = new HookTasks(config);
    hooks.beforeUpdate();

    if (config.pm2 && config.pm2.enabled) {
      Commander.ensure('pm2');
      const pm2 = new PM2Task(config);
      pm2.restart(); // TODO: Restart with the params ?
      pm2.status();
    }

    hooks.aftereUpdate();

    // TODO: Update config json file
  }

  static async deploy(repository, branch, command = []) {
    const args = {};
    if (command.length) {
      command.forEach(
        (cmd) => {
          const [key, value] = cmd.split('=');
          args[key] = value;
        },
      );
    }

    const config = new ConfigTask(repository, branch, args);
    const dir = new DirTask(config);
    const git = new GitTask(config);
    Logger.dir(config);

    if (dir.isCreated()) {
      Commander.update(repository, config.branch);
      exit(1);
    }

    if (config.pruneOnDeployOrUpdate) {
      Commander.prune(repository);
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

    const filename = path.resolve(__dirname, `../apps/${config.name}.json`);
    fs.writeFileSync(filename, JSON.stringify(config, null, 2), 'utf8', (err) => {
      if (err) {
        Logger.error(`We weren't able to save config file: ${err}`);
      }

      Logger.success(`Config file was successfully saved: ${filename}`);
    });
  }

  static remove(repository = false, branch = false, command) {
    if (command.all) {
      const apps = Commander.status();
      apps.forEach(
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

    const appName = config.name || `${repository}:${config.branch}`;
    rm('-f', path.resolve(__dirname, `../apps/${appName}.json`));
    rm('-f', path.resolve(__dirname, `../apps/${appName}_pm2.json`));
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

    const apps = Commander.status();
    apps.forEach(
      (app) => {
        if (app.repository === repository) {
          const isCreated = branches.find(branch => branch === app.branch);
          if (!isCreated) {
            toPrune.push(app.branch);
          }
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

    const args = {};
    command.forEach(
      (cmd) => {
        const [key, value] = cmd.split('=');
        args[key] = value;
      },
    );

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
