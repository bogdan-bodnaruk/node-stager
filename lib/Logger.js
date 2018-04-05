const colors = require('colors');
const {
  exit,
  echo,
} = require('shelljs');

colors.setTheme({
  verbose: 'cyan',
  info: 'green',
  data: 'grey',
  warn: 'yellow',
  error: 'red',
});

class Logger {
  static info(message = '', emoji = '(ℹ)️') {
    echo(colors.info(`${emoji} ${message}`));
  }

  static proggress(message = '', emoji = '⏳') {
    echo(colors.verbose(`${emoji} ${message}`));
  }

  static data(message = '') {
    echo(colors.yellow(message));
  }

  static success(message = '', emoji = '✔') {
    echo(colors.info.bold(`${emoji} ${message}`));
  }

  static error(message = '', emoji = '✖️') {
    echo(colors.error.bold(`${emoji} ${message}`));
    exit(1);
  }

  static dir(object = {}) {
    console.dir(object, { colors: true });
  }

  static space() {
    console.log("\n\r");
  }
}

module.exports = Logger;
