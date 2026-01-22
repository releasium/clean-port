#!/usr/bin/env node

const { clearPort } = require("../src/index.js");

function parseArgs(argv) {
  const args = argv.slice(2);
  let port;
  let signal = "SIGTERM";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--signal" || arg === "-s") {
      signal = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (!port) {
      port = arg;
    }
  }

  return { port, signal };
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: clean-port <port> [--signal SIGTERM|SIGKILL]",
      "",
      "Examples:",
      "  clean-port 3000",
      "  clean-port 3000 --signal SIGKILL",
      "",
    ].join("\n")
  );
}

function main() {
  const { port, signal, help } = parseArgs(process.argv);

  if (help || !port) {
    printHelp();
    process.exit(help ? 0 : 1);
  }

  const result = clearPort(port, { signal });
  if (result.cleared) {
    process.stdout.write(
      `Cleared port ${port}. Killed PIDs: ${result.pids.join(", ")}\n`
    );
  } else {
    process.stdout.write(`Port ${port} is already free.\n`);
  }
}

main();
