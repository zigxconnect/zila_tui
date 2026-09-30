import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateWithGitHub, isGitHubAuthenticated } from '../dist/utils/githubAuth.js';

test('GitHub Auth - isGitHubAuthenticated returns boolean', () => {
  const result = isGitHubAuthenticated();
  assert.equal(typeof result, 'boolean');
});

test('GitHub Auth - device flow opens verification URL and handles denial', async () => {
  const requests: Array<{ url: string; body: URLSearchParams }> = [];
  const openedUrls: string[] = [];
  let verification: { uri: string; code: string } | undefined;
  const responses = [
    { ok: true, status: 200, json: async () => ({
      device_code: 'device-code',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://github.com/login/device',
      expires_in: 600,
      interval: 5,
    }) },
    { ok: true, status: 200, json: async () => ({ error: 'access_denied' }) },
  ];

  await assert.rejects(
    authenticateWithGitHub(
      'oauth-client-id',
      (uri, code) => { verification = { uri, code }; },
      {
        fetchImpl: async (url, init) => {
          requests.push({ url: String(url), body: new URLSearchParams(init?.body as URLSearchParams) });
          return responses.shift() as Response;
        },
        openBrowser: (url) => openedUrls.push(url),
        wait: async () => {},
      },
    ),
    /authorization was denied/i,
  );

  assert.deepEqual(verification, { uri: 'https://github.com/login/device', code: 'ABCD-EFGH' });
  assert.deepEqual(openedUrls, ['https://github.com/login/device']);
  assert.equal(requests[0]?.url, 'https://github.com/login/device/code');
  assert.equal(requests[1]?.body.get('device_code'), 'device-code');
});
