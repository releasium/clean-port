#!/usr/bin/env node

const { clearPort } = require("../src/index.js");

const COLORS = {
  red: "\u001b[31m",
  green: "\u001b[32m",
  reset: "\u001b[0m",
};

function colorize(color, text) {
  if (!process.stdout.isTTY) {
    return text;
  }
  return `${COLORS[color] || ""}${text}${COLORS.reset}`;
}

function parseNumberOption(value, name, { integer = false } = {}) {
  if (value === undefined) {
    return { error: `Missing value for ${name}.` };
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return { error: `Invalid ${name}: ${value}` };
  }
  if (integer && !Number.isInteger(numberValue)) {
    return { error: `Invalid ${name}: ${value}` };
  }
  return { value: numberValue };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let port;
  let signal = "SIGTERM";
  let force = false;
  let waitMs;
  let retries;
  let error;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--signal" || arg === "-s") {
      if (args[i + 1] === undefined) {
        error = "Missing value for --signal.";
        break;
      }
      signal = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--force" || arg === "-f") {
      force = true;
      continue;
    }
    if (arg === "--wait-ms") {
      const parsed = parseNumberOption(args[i + 1], "--wait-ms");
      if (parsed.error) {
        error = parsed.error;
        break;
      }
      waitMs = parsed.value;
      i += 1;
      continue;
    }
    if (arg === "--retries") {
      const parsed = parseNumberOption(args[i + 1], "--retries", {
        integer: true,
      });
      if (parsed.error) {
        error = parsed.error;
        break;
      }
      retries = parsed.value;
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

  return { port, signal, force, waitMs, retries, error };
}

function printHelp() {
  process.stdout.write(
    [
      "clean-port",
      "Clear a TCP port by terminating the owning process.",
      "",
      "Usage:",
      "  clean-port <port> [options]",
      "",
      "Options:",
      "  -s, --signal         Kill signal (default: SIGTERM)",
      "  -f, --force          Use force signal if still in use",
      "      --wait-ms        Delay between checks (default: 300)",
      "      --retries        Number of rechecks (default: 5)",
      "  -h, --help           Show help",
      "",
      "Examples:",
      "  clean-port 3000",
      "  clean-port 3000 --signal SIGKILL",
      "  clean-port 3000 --force",
      "  clean-port 3000 --wait-ms 500 --retries 8",
      "",
    ].join("\n")
  );
}

function printError(message) {
  process.stderr.write(`${colorize("red", "Error:")} ${message}\n`);
}

function main() {
  const { port, signal, force, waitMs, retries, help, error } =
    parseArgs(process.argv);

  if (error) {
    printError(error);
    process.exit(1);
  }

  if (help || !port) {
    printHelp();
    process.exit(help ? 0 : 1);
  }

  const portNumber = Number(port);
  if (!Number.isInteger(portNumber) || portNumber <= 0) {
    printError(`Invalid port: ${port}`);
    process.exit(1);
  }

  const result = clearPort(port, {
    signal,
    force,
    waitMs,
    retries,
  });

  if (result.status === "cleared") {
    process.stdout.write(
      [
        colorize("green", "Successfully cleaned."),
        `Port: ${portNumber}`,
        `Signal: ${signal}`,
        `Cleared PIDs: ${colorize("red", result.pids.join(", "))}`,
        "",
      ].join("\n")
    );
    return;
  }

  if (result.status === "force_cleared") {
    process.stdout.write(
      [
        colorize("green", "Successfully cleaned (forced)."),
        `Port: ${portNumber}`,
        `Signal: ${signal}`,
        `Cleared PIDs: ${colorize("red", result.pids.join(", "))}`,
        "",
      ].join("\n")
    );
    return;
  }

  if (result.status === "already_clear") {
    process.stdout.write(
      [
        colorize("green", "Port is clear."),
        `Port: ${portNumber}`,
        "",
      ].join("\n")
    );
    return;
  }

  process.stdout.write(
    [
      colorize("red", "Port is still in use."),
      `Port: ${portNumber}`,
      `Signal: ${signal}`,
      `Force: ${force ? "enabled" : "disabled"}`,
      `Tried to clear PIDs: ${colorize("red", result.pids.join(", "))}`,
      `Remaining PIDs: ${colorize("red", result.remainingPids.join(", "))}`,
      "",
    ].join("\n")
  );
}

main();
