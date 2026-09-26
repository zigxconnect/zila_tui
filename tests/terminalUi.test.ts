import test from 'node:test';
import assert from 'node:assert/strict';
import { theme } from '../dist/ui/theme.js';

test('Terminal UI - Theme symbols are emoji-free', () => {
  // Test key indicators to verify emojis are replaced with clean CLI characters
  assert.equal(theme.symbols.checkmark, '[OK]');
  assert.equal(theme.symbols.xmark, '[FAIL]');
  assert.equal(theme.symbols.trophy, '[TOP]');
  assert.equal(theme.symbols.folder, '[DIR]');
  assert.equal(theme.symbols.file, '[FILE]');
});
