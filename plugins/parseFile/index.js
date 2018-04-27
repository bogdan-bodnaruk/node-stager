const fs = require('fs');
const path = require('path');
const Logger = require('../../lib/Logger');
const format = require('template-format');

class ParseIni {
  constructor(config) {
    this.config = config;
  }

  index() {
    Logger.info(`Starting parseFile plugin`);
    if (!this.config.input) {
      Logger.error('parseFile plugin failed: Please specify the file that need to be parsed!');
    }

    if (!this.config.output) {
      Logger.error('parseFile plugin failed: Please specify the file that need to be parsed!');
    }

    try {
      const inputFile = path.join(this.config.appDir, this.config.input);
      const outputFile = path.join(this.config.appDir, this.config.output);
      const input = fs.readFileSync(inputFile, "utf8");
      const content = format(input, this.config, {
        skipUndefined: true,
        regex: /{([a-zA-Z0-9.]*?)}/g,
      });

      fs.writeFileSync(outputFile, content, (err) => {
        if (err) {
          Logger.error(`parseFile plugin failed: File is not created ${outputFile}. ${err}`);
        }
      });

      Logger.success(`File was parsed and created ${outputFile}`);
    } catch (e) {
      Logger.error(`parseFile plugin failed: ${e}`);
    }
  }
}

module.exports = ParseIni;
