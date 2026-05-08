#!/usr/bin/env node
/**
 * Cross-platform runner for the pa11y-ci audit.
 *
 * Replaces `start-server-and-test`, whose tree-kill dependency shells
 * out to `wmic.exe` for child-process cleanup — Windows 11 24H2
 * removed wmic and Node 25 surfaces it as `ENOENT`. We use the
 * built-in `taskkill /F /T` on Windows and POSIX process groups
 * everywhere else, so the runner has no third-party deps.
 *
 * Steps:
 *   1. nuxt build
 *   2. nuxt preview (detached on POSIX, child on Windows)
 *   3. wait for http://localhost:3000/ to respond
 *   4. pa11y-ci --config .pa11yci.json
 *   5. tear down the preview tree, exit with pa11y's exit code
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const isWin = process.platform === 'win32'
const PORT = 3000
const URL = `http://localhost:${PORT}/`
const READY_TIMEOUT_MS = 90_000

const NPX = isWin ? 'npx.cmd' : 'npx'

let server = null
let exitCode = 0

async function waitForServer(url, timeoutMs) {
  const start = Date.now()
  let lastErr = null
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { method: 'GET' })
      if (r.status >= 200 && r.status < 500) return
    } catch (err) {
      lastErr = err
    }
    await sleep(500)
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms (last: ${lastErr?.message ?? 'no error'})`)
}

function runStreaming(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    // Windows: .cmd / .bat shims (npx.cmd, nuxt.cmd) need shell:true,
    // otherwise Node 25 throws `spawn EINVAL`. POSIX uses the binary
    // directly so shell stays off there.
    const child = spawn(cmd, args, { stdio: 'inherit', shell: isWin, ...opts })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} failed: code=${code} signal=${signal ?? ''}`))
    })
  })
}

function killTree(pid) {
  if (!pid) return
  if (isWin) {
    // taskkill ships with Windows and traverses the process tree.
    try { spawn('taskkill', ['/PID', String(pid), '/F', '/T'], { stdio: 'ignore' }) }
    catch { /* swallow — best-effort cleanup */ }
  } else {
    // detached:true above puts the child in its own process group,
    // so a negative-pid signal kills the whole tree.
    try { process.kill(-pid, 'SIGTERM') }
    catch { try { process.kill(pid, 'SIGTERM') } catch { /* gone */ } }
  }
}

async function main() {
  // 1. Build
  console.log('[a11y] Building production bundle…')
  await runStreaming(NPX, ['nuxt', 'build'])

  // 2. Start preview. shell:true on Windows so npx.cmd resolves; the
  // child still exits when we taskkill the tree.
  console.log('[a11y] Starting preview server…')
  server = spawn(NPX, ['nuxt', 'preview'], {
    stdio: 'inherit',
    shell: isWin,
    detached: !isWin,
  })
  server.on('error', err => console.error('[a11y] preview spawn error:', err))

  // 3. Wait for it
  console.log(`[a11y] Waiting for ${URL}…`)
  await waitForServer(URL, READY_TIMEOUT_MS)

  // 4. Run pa11y-ci, capture its exit code
  console.log('[a11y] Running pa11y-ci…')
  exitCode = await new Promise((resolve) => {
    const pa = spawn(NPX, ['pa11y-ci', '--config', '.pa11yci.json'], { stdio: 'inherit', shell: isWin })
    pa.on('error', (err) => { console.error('[a11y] pa11y-ci spawn error:', err); resolve(1) })
    pa.on('exit', code => resolve(typeof code === 'number' ? code : 1))
  })
}

main()
  .catch((err) => {
    console.error('[a11y]', err.message)
    exitCode = exitCode || 1
  })
  .finally(() => {
    if (server?.pid) {
      console.log('[a11y] Tearing down preview server…')
      killTree(server.pid)
    }
    // Give the kill signal a moment to propagate before exiting.
    setTimeout(() => process.exit(exitCode), 300).unref()
  })
