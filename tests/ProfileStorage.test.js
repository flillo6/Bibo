import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileStorage } from '../js/storage/ProfileStorage.js';

test('ProfileStorage - Generates sovereign 3-word secret phrase', () => {
  localStorage.clear();
  const ps = new ProfileStorage();

  assert.ok(ps.profile.secretKey.startsWith('bibo-'));
  const parts = ps.profile.secretKey.split('-');
  assert.equal(parts.length, 4); // 'bibo', wordA, wordB, wordC
  assert.equal(ps.profile.nickname, 'Studente');
  assert.equal(ps.profile.lifetimeSeconds, 0);
});

test('ProfileStorage - Restores profile from secret key', () => {
  localStorage.clear();
  const ps1 = new ProfileStorage();
  ps1.profile.nickname = 'Leonardo';
  ps1.profile.lifetimeSeconds = 3600;
  ps1.saveProfile();

  const originalKey = ps1.profile.secretKey;

  // New storage instance simulating another device
  const ps2 = new ProfileStorage();
  const restored = ps2.restoreWithKey(originalKey);

  assert.equal(restored, true);
  assert.equal(ps2.profile.nickname, 'Leonardo');
  assert.equal(ps2.profile.lifetimeSeconds, 3600);
});
