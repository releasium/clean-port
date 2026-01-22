# clean-port

Clear a TCP port by terminating the process that currently owns it. Works on
macOS, Linux, and Windows.

## Requirements

- macOS or Linux: `lsof` must be available
- Windows: `netstat` must be available (included with Windows)

## Install

```bash
npm install clean-port -g
```

## Quick start

### Library

```js
const { clearPort } = require("clean-port");

const result = clearPort(3000);
console.log(result);
```

Force cleanup if the port remains in use:

```js
const { clearPort } = require("clean-port");

const result = clearPort(3000, { force: true });
console.log(result);
```

### CLI

```bash
npx clean-port 3000
npx clean-port 3000 --force
npx clean-port 3000 --signal SIGKILL
```

## CLI options

- `-s`, `--signal` kill signal (default `SIGTERM`)
- `-f`, `--force` use `SIGKILL` if still in use
- `--wait-ms` delay between checks (default `300`)
- `--retries` number of rechecks (default `5`)

## API

`clearPort(port, options)`

- `port` number or numeric string
- `options.signal` kill signal (default `SIGTERM`)
- `options.waitMs` delay between checks in ms (default `300`, non-negative)
- `options.retries` number of rechecks (default `5`, non-negative integer)
- `options.force` use `SIGKILL` if still in use (default `false`)

Returns:

`{ cleared: boolean, status: "cleared" | "force_cleared" | "already_clear" | "still_in_use", pids: number[], remainingPids: number[] }`

## Best practices

- Start with `SIGTERM` and allow a short wait before retrying.
- Use `force` only when you can safely terminate the process.
- Run as the same user that owns the process; use `sudo` only when required.
- Avoid auto-restart supervisors while cleaning a port in dev scripts.
- For CI/automation, set `waitMs` and `retries` explicitly.

## Troubleshooting

If the port is still in use after `SIGTERM`, retry with `SIGKILL` or use
elevated permissions:

```bash
sudo npx clean-port 3000 --signal SIGKILL
```