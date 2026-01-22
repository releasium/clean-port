const { execFileSync } = require("node:child_process");

function getWindowsPidsForPort(portNumber) {
  const output = execFileSync(
    "netstat",
    ["-ano", "-p", "tcp"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toUpperCase().startsWith("TCP"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 5)
    .filter((parts) => {
      const localAddress = parts[1] || "";
      return localAddress.endsWith(`:${portNumber}`);
    })
    .map((parts) => Number(parts[4]))
    .filter((value) => Number.isInteger(value));
}

function getPidsForPort(port) {
  const portNumber = Number(port);
  if (!Number.isInteger(portNumber) || portNumber <= 0) {
    throw new Error(`Invalid port: ${port}`);
  }

  try {
    if (process.platform === "win32") {
      return getWindowsPidsForPort(portNumber);
    }

    // lsof returns exit code 1 when no processes are found.
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
