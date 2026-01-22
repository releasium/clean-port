const { execFileSync } = require("node:child_process");

function dedupePids(pids) {
  return [...new Set(pids)];
}

function normalizeOptions(options) {
  const { signal = "SIGTERM", waitMs = 300, retries = 5, force = false } =
    options;

  const waitMsNumber = Number(waitMs);
  if (!Number.isFinite(waitMsNumber) || waitMsNumber < 0) {
    throw new Error(`Invalid waitMs: ${waitMs}`);
  }

  const retriesNumber = Number(retries);
  if (!Number.isInteger(retriesNumber) || retriesNumber < 0) {
    throw new Error(`Invalid retries: ${retries}`);
  }

  return {
    signal,
    waitMs: waitMsNumber,
    retries: retriesNumber,
    force: Boolean(force),
  };
}

function sleepMs(delay) {
  if (delay <= 0) {
    return;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
}

function getWindowsPidsForPort(portNumber) {
  const output = execFileSync(
    "netstat",
    ["-ano", "-p", "tcp"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );

  const pids = output
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
  return dedupePids(pids);
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
    const pids = output
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    return dedupePids(pids);
  } catch {
    return [];
  }
}

function clearPort(port, options = {}) {
  const { signal, waitMs, retries, force } = normalizeOptions(options);
  const pids = getPidsForPort(port);

  if (pids.length === 0) {
    return {
      cleared: false,
      status: "already_clear",
      pids: [],
      remainingPids: [],
    };
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

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const remaining = getPidsForPort(port);
    if (remaining.length === 0) {
      return {
        cleared: true,
        status: "cleared",
        pids,
        remainingPids: [],
      };
    }

    if (attempt < retries - 1) {
      sleepMs(waitMs);
    }
  }

  const remaining = getPidsForPort(port);
  if (force && remaining.length > 0) {
    for (const pid of remaining) {
      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        if (error && error.code !== "ESRCH") {
          throw error;
        }
      }
    }

    const afterForce = getPidsForPort(port);
    if (afterForce.length === 0) {
      return {
        cleared: true,
        status: "force_cleared",
        pids,
        remainingPids: [],
      };
    }

    return {
      cleared: false,
      status: "still_in_use",
      pids,
      remainingPids: afterForce,
    };
  }

  return {
    cleared: false,
    status: "still_in_use",
    pids,
    remainingPids: remaining,
  };
}

module.exports = {
  clearPort,
  getPidsForPort,
};
