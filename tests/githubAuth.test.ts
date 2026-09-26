import test from 'node:test';
import assert from 'node:assert/strict';
import { isGitHubAuthenticated } from '../dist/utils/githubAuth.js';

test('GitHub Auth - isGitHubAuthenticated returns boolean', () => {
  const result = isGitHubAuthenticated();
  assert.equal(typeof result, 'boolean');
});
