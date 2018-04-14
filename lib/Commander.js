const path = require('path');
const {
  exit,
  which,
  ls,
  exec,
} = require('shelljs');
const Logger = require('./Logger');
const ConfigTask = require('./tasks/configs');
const FreePortTask = require('./tasks/freePort');
const GitTask = require('./tasks/git');
const DirTask = require('./tasks/dir');
const PM2Task = require('./tasks/pm2');
const ApacheTask = require('./tasks/apache');

class Commander {
  static ensure(dependency) {
    if (!which(dependency)) {
      Logger.error(`Sorry, the ${dependency} package is required for node-stager`, '️⛔');
    }
  }

  static status() {
    const pm2 = new PM2Task();
    pm2.status();
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
          global.config = false;
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
      const pm2 = new PM2Task();
      Logger.proggress('Started updating all instances...');
      const configs = Commander.config(false, { silent: true });

      configs.forEach(
        (repoConf) => {
          const repoInstances = pm2.list(repoConf.repository);
          repoInstances.forEach(
            instance => exec(`stager update ${repoConf.repository} ${instance}`),
          );
        },
      );
      exit(1);
    }

    const config = new ConfigTask(repository, branch);
    const pm2 = new PM2Task();
    const git = new GitTask();

    if (config.pruneOnDeployOrUpdate) {
      Commander.prune(repository);
    }

    git.update();
    pm2.restart();
    pm2.status();
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
    const dir = new DirTask();
    const git = new GitTask();
    const pm2 = new PM2Task();
    const apache = new ApacheTask();

    Logger.dir(config);

    if (dir.isCreated()) {
      Commander.update(repository, config.branch);
      exit(1);
    }

    if (global.config.pruneOnDeployOrUpdate) {
      Commander.prune(repository);
    }

    global.config.port = await new FreePortTask();

    dir.create();
    git.clone();

    pm2.start();

    if (config.apache) {
      apache.create();
      apache.restart();
    }
  }

  static remove(repository = false, branch = false, command) {

    if (command.all) {
      const pm2 = new PM2Task();
      const configs = Commander.config(false, { silent: true });
      configs.forEach(
        (repoConf) => {
          const repoInstances = pm2.list(repoConf.repository);
          repoInstances.forEach(
            instance => exec(`stager remove ${repoConf.repository} ${instance}`),
          );
        },
      );
      exit(1);
    }

    if (!repository) {
      Logger.error('Please specify repository and branch that you want to delete');
    }

    const config = new ConfigTask(repository, branch);
    const pm2 = new PM2Task();
    const dir = new DirTask();

    if (!config.branch) {
      Logger.error('Please specify branch that you want to delete');
    }

    dir.removeAppDir();

    if (config.apache) {
      const apache = new ApacheTask();
      apache.remove();
      apache.restart();
    }

    pm2.delete({
      repository,
      branch: config.branch,
    });
    pm2.status();
  }

  static branches(repository = false) {
    new ConfigTask(repository);
    const git = new GitTask();

    git.list();
  }

  static prune(repository = false, command = {}) {
    if (!repository || command.all) {
      const configs = Commander.config(false, { silent: true });
      configs.forEach(
        config => exec(`stager prune ${config.repository}`),
      );
      exit(1);
    }

    new ConfigTask(repository);
    const git = new GitTask();
    const pm2 = new PM2Task();

    Logger.proggress('Running prune process...');

    const branches = git.list();
    const instances = pm2.list(repository);
    const toPrune = [];

    instances.forEach(
      (instance) => {
        const isCreated = branches.find(branch => branch === instance);
        if (!isCreated) {
          toPrune.push(instance);
        }
      },
    );

    if (toPrune.length) {
      Logger.data(`${toPrune.length} found instance(s) to prune.`);
      toPrune.forEach(
        instance => Commander.remove(repository, instance, false),
      );
      return true;
    }

    Logger.info('Nothing to prune.');
    return true;
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

    const config = {};
    command.forEach(
      (cmd) => {
        const [key, value] = cmd.split('=');
        config[key] = value;
      },
    );

    new ConfigTask(config.repository, config.branch, config);
    const filename = path.resolve(`${__dirname}/../plugins/${name}/index.js`);
    try {
      const Plugin = require(filename);
      const plugin = new Plugin();

      plugin[config.action || 'index']();
    } catch (e) {
      Logger.error(`Can't load plugin ${name}. Error: ${e}`);
    }
  }
}

module.exports = Commander;
