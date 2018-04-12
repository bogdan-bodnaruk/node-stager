#!/usr/bin/env node
/* eslint semi-style: 0 */
const cli = require('commander');
const Commander = require('../lib/Commander');

Commander.ensure('git');
Commander.ensure('pm2');

cli
  .version('1.0.0')
  .description('node-stager')
;

cli
  .command('config [repository]')
  .option('-a, --all', 'Show all configs')
  .alias('c')
  .description('Show configs')
  .action(Commander.config)
;

cli
  .command('deploy <repository> <branch> [args...]')
  .alias('d')
  .description('Deploy branch')
  .action(Commander.deploy)
;

cli
  .command('remove [repository] [branch]')
  .option('-a, --all', 'Remove all')
  .alias('del')
  .description('Delete all instances')
  .action(Commander.remove)
;

cli
  .command('status')
  .alias('s')
  .description('Show all instances')
  .action(Commander.status)
;

cli
  .command('prune <repository>')
  .alias('p')
  .description('Prune unused instances')
  .action(Commander.prune)
;

cli
  .command('update <repository> <branch>')
  .alias('u')
  .description('Update deployed branch')
  .action(Commander.update)
;

cli
  .command('branches <repository>')
  .alias('b')
  .description('Show branches list')
  .action(Commander.branches)
;

cli
  .command('startup')
  .alias('su')
  .description('Configure automate startup for pm2 instances')
  .action(Commander.startup)
;

cli
  .command('plugin <name> [args...]')
  .allowUnknownOption()
  .alias('p')
  .description('Run pre-installed plugin')
  .action(Commander.plugin)
;

cli.parse(process.argv);
