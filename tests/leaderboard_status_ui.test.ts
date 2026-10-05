import test from 'node:test';
import assert from 'node:assert/strict';

test('Leaderboard UI - Status badge string formatting and emoji conventions', () => {
  const formatStatusBadge = (status?: string): { text: string; isFinal: boolean } => {
    switch (status) {
      case 'accepted':
        return { text: '✔ Accepted', isFinal: true };
      case 'rejected':
        return { text: '✖ Rejected', isFinal: true };
      case 'pending':
        return { text: '⏳ Pending', isFinal: false };
      default:
        return { text: '— None', isFinal: true };
    }
  };

  const pending = formatStatusBadge('pending');
  assert.equal(pending.text, '⏳ Pending');
  assert.equal(pending.isFinal, false);

  const accepted = formatStatusBadge('accepted');
  assert.equal(accepted.text, '✔ Accepted');
  assert.equal(accepted.isFinal, true);

  const rejected = formatStatusBadge('rejected');
  assert.equal(rejected.text, '✖ Rejected');
  assert.equal(rejected.isFinal, true);

  const none = formatStatusBadge(undefined);
  assert.equal(none.text, '— None');
  assert.equal(none.isFinal, true);
});

test('Leaderboard UI - Column width layout alignment', () => {
  const columns = {
    rank: 6,
    name: 24,
    points: 10,
    latest: 10,
    status: 14,
  };

  const totalWidth = Object.values(columns).reduce((sum, w) => sum + w, 0);
  assert.equal(totalWidth, 64);
  assert.ok(totalWidth <= 78);
});
