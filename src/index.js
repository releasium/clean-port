const { execFileSync } = require("node:child_process");

function getPidsForPort(port) {
  const portNumber = Number(port);
  if (!Number.isInteger(portNumber) || portNumber <= 0) {
    throw new Error(`Invalid port: ${port}`);
  }

  // lsof returns exit code 1 when no processes are found.
  try {
    const output = execFileSync(
      "lsof",
      ["-ti", `tcp:${portNumber}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return output
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
  } catch {
    return [];
  }
}

function clearPort(port, options = {}) {
  const { signal = "SIGTERM" } = options;
  const pids = getPidsForPort(port);

  if (pids.length === 0) {
    return { cleared: false, pids: [] };
  }

  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch (error) {
      if (error && error.code !== "ESRCH") {
        throw error;
      }
    }
  }

  return { cleared: true, pids };
}

module.exports = {
  clearPort,
  getPidsForPort,
};
