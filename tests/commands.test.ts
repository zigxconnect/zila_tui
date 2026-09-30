import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllCommands } from '../dist/commands/index.js';
import { findCommand } from '../dist/commands/registry.js';

test('Command Registry - Newly added commands are registered and accessible', () => {
  registerAllCommands();

  const groupCmd = findCommand('group');
  assert.ok(groupCmd, 'group command should be registered');
  assert.equal(groupCmd.name, 'group');

  const downloadsCmd = findCommand('downloads');
  assert.ok(downloadsCmd, 'downloads command should be registered');
  assert.equal(downloadsCmd.name, 'downloads');

  const githubAuthCmd = findCommand('github-auth');
  assert.ok(githubAuthCmd, 'github-auth command should be registered');
  assert.equal(githubAuthCmd.name, 'github-auth');
  assert.equal(findCommand('gh-auth'), githubAuthCmd, 'legacy gh-auth alias should remain available');
});
