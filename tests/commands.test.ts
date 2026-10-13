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

  const viewCmd = findCommand('view');
  assert.ok(viewCmd, 'view command should be registered');
  assert.equal(viewCmd.name, 'view');
  assert.equal(findCommand('show'), viewCmd, 'show alias should point to view command');
  assert.equal(findCommand('open'), viewCmd, 'open alias should point to view command');

  const logbookCmd = findCommand('logbook');
  assert.ok(logbookCmd, 'logbook command should be registered');
});

test('Logbook and View commands toggle sidebar without demanding workspace', async () => {
  registerAllCommands();
  const logbookCmd = findCommand('logbook')!;
  const viewCmd = findCommand('view')!;

  let sidebarToggled = false;
  const mockShell = {
    toggleLogbookSidebar: (show?: boolean) => {
      sidebarToggled = typeof show === 'boolean' ? show : true;
    },
  } as any;

  const messages: string[] = [];
  const mockOutput = (msg: string) => messages.push(msg);

  // Test logbook --view
  sidebarToggled = false;
  await logbookCmd.handler(['--view'], mockOutput, mockShell);
  assert.equal(sidebarToggled, true, 'logbook --view should toggle sidebar');

  // Test logbook view
  sidebarToggled = false;
  await logbookCmd.handler(['view'], mockOutput, mockShell);
  assert.equal(sidebarToggled, true, 'logbook view should toggle sidebar');

  // Test view --logbook
  sidebarToggled = false;
  await viewCmd.handler(['--logbook'], mockOutput, mockShell);
  assert.equal(sidebarToggled, true, 'view --logbook should toggle sidebar');

  // Test view alone
  sidebarToggled = false;
  await viewCmd.handler([], mockOutput, mockShell);
  assert.equal(sidebarToggled, true, 'view command should toggle sidebar');

  // Headless mode without toggleLogbookSidebar should not throw
  const headlessMessages: string[] = [];
  await logbookCmd.handler(['--view'], (msg) => headlessMessages.push(msg), {} as any);
  assert.ok(headlessMessages.length > 0, 'headless logbook --view should output fallback info');
});
