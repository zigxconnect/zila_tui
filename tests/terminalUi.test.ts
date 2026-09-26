import test from 'node:test';
import assert from 'node:assert/strict';
import { theme } from '../dist/ui/theme.js';
import { ClientCache } from '../dist/utils/cache.js';

test('Terminal UI - Theme symbols are emoji-free', () => {
  // Test key indicators to verify emojis are replaced with clean CLI characters
  assert.equal(theme.symbols.checkmark, '[OK]');
  assert.equal(theme.symbols.xmark, '[FAIL]');
  assert.equal(theme.symbols.trophy, '[TOP]');
  assert.equal(theme.symbols.folder, '[DIR]');
  assert.equal(theme.symbols.file, '[FILE]');
});

test('Terminal UI - Zigex Blue and White branding palette', () => {
  assert.equal(theme.colors.primary, '#155DFC');
  assert.equal(theme.colors.primaryBright, '#3B82F6');
  assert.equal(theme.colors.logoColor, '#818CF8');
  assert.equal(theme.colors.white, '#FFFFFF');
});

test('ClientCache - in-memory and wrapped execution', async () => {
  ClientCache.clear();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { cohort: 'AI/Machine Learning' };
  };

  const res1 = await ClientCache.wrap('test-cohort-key', 60, fetcher);
  assert.equal(res1.cached, false);
  assert.equal(res1.data.cohort, 'AI/Machine Learning');
  assert.equal(calls, 1);

  const res2 = await ClientCache.wrap('test-cohort-key', 60, fetcher);
  assert.equal(res2.cached, true);
  assert.equal(res2.data.cohort, 'AI/Machine Learning');
  assert.equal(calls, 1);

  ClientCache.del('test-cohort-key');
  const res3 = await ClientCache.wrap('test-cohort-key', 60, fetcher);
  assert.equal(res3.cached, false);
  assert.equal(calls, 2);
});

test('SubmitTaskScreen - renders without Text string outside <Text> error', async () => {
  const React = await import('react');
  const { render } = await import('ink');
  const { SubmitTaskScreen } = await import('../dist/screens/SubmitTaskScreen.js');
  const { SubmitReportScreen } = await import('../dist/screens/SubmitReportScreen.js');
  
  const instance1 = render(React.createElement(SubmitTaskScreen, { onComplete: () => {} }));
  instance1.unmount();

  const instance2 = render(React.createElement(SubmitReportScreen, { onComplete: () => {} }));
  instance2.unmount();
});
