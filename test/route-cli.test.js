import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../src/index.js', import.meta.url));

function runCli(args, configPath) {
  const child = spawn(process.execPath, [cliPath, ...args], {
    env: { ...process.env, TEAMCLAUDE_CONFIG: configPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => resolve({ code, stdout, stderr }));
  });
}

test('route add accepts --color before the CLI dispatcher exits', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'teamclaude-route-'));
  const configPath = join(dir, 'config.json');

  const added = await runCli([
    'route', 'add', 'fable',
    '--match', '*fable*',
    '--accounts', 'personal-max',
    '--color', 'magenta',
  ], configPath);

  assert.equal(added.code, 0, added.stderr);
  assert.match(added.stdout, /Added route "fable"/);

  const config = JSON.parse(await readFile(configPath, 'utf8'));
  assert.deepEqual(config.routes, [{
    name: 'fable',
    match: ['*fable*'],
    accounts: ['personal-max'],
    color: 'magenta',
  }]);

  const listed = await runCli(['route', 'list'], configPath);
  assert.equal(listed.code, 0, listed.stderr);
  assert.match(listed.stdout, /fable: \*fable\* .+ personal-max.+color=magenta/);
});
