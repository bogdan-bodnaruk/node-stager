const path = require('path');
const fs = require('fs');
const {
  ls,
  rm,
} = require('shelljs');
const Logger = require('./Logger');
const deepAssign = require('deep-assign');

class App {
  get all() {
    const get = ls('-A', path.resolve(__dirname, '../apps/*[^_pm2].json'));

    if (get.stderr && get.code !== 0) {
      Logger.warning(`Can't find any deployed applications`);
      return [];
    }

    return get.stdout.split("\n").map(
      (app) => {
        if (app) {
          return require(app);
        }
        return false;
      },
    ).filter(app => app);
  }

  getRepository(repository) {
    return this.all.filter(app => app.repository === repository);
  }

  getApp(repository, branch) {
    return this.getRepository(repository).filter(app => app.branch === branch);
  }

  save(config) {
    const filename = path.resolve(__dirname, `../apps/${config.name}.json`);
    fs.writeFileSync(filename, JSON.stringify(config, null, 2), 'utf8', (err) => {
      if (err) {
        Logger.error(`We weren't able to save config file: ${err}`);
      }

      Logger.success(`Config file was successfully saved: ${filename}`);
    });
  }

  remove(config) {
    const appName = config.name || `${config.repository}:${config.branch}`;

    rm('-f', path.resolve(__dirname, `../apps/${appName}.json`));

    if (config.pm2 && config.pm2.enabled) {
      rm('-f', path.resolve(__dirname, `../apps/${appName}_pm2.json`));
    }
  }

  savePM2(config) {
    const appName = config.name || `${config.repository}:${config.branch}`;
    const json = deepAssign({
      name: appName,
      env: {
        NODE_PORT: config.port,
      },
      cwd: config.appDir,
    }, config.pm2);

    const filename = path.resolve(__dirname, `../apps/${appName}_pm2.json`);

    fs.writeFileSync(filename, JSON.stringify(json, null, 2), 'utf8', (err) => {
      if (err) {
        Logger.error(`Save app file error: ${err}`);
      }

      Logger.success(`Config file has been successfully saved: ${filename}`);
    });

    return filename;
  }
}

module.exports = new App();
