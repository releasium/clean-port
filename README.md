# clean-port

Small Node.js library to clear a TCP port by terminating the process that uses it.

## Requirements

- macOS or Linux (`lsof` must be available)
- Windows (`netstat` must be available, included with Windows)

## Install

```bash
npm install clean-port
```

## Library usage

```js
const { clearPort } = require("clean-port");

const result = clearPort(3000);
console.log(result);
```

## CLI usage

```bash
npx clean-port 3000
npx clean-port 3000 --signal SIGKILL
```

## API

`clearPort(port, options)`

- `port` number or numeric string
- `options.signal` kill signal (default `SIGTERM`)

Returns `{ cleared: boolean, pids: number[] }`.

## Publish to npm

```bash
npm login
npm publish
```
