// Feliactyl Launcher — handles first-run setup then starts the app
"use strict";

const { isSetupComplete, runSetup } = require('./setup.js');
const { spawn } = require('child_process');
const chalk = require('chalk');

async function main() {
  if (!isSetupComplete()) {
    await runSetup();
    console.log(chalk.green.bold("\n  ✅ Setup complete! Starting Feliactyl...\n"));
  }

  // Launch the actual app
  const child = spawn(process.execPath, ['index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  child.on('exit', (code) => process.exit(code || 0));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
