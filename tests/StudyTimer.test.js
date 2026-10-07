import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { StudyTimer } from '../js/engine/StudyTimer.js';
import { CONFIG } from '../js/config.js';

test('StudyTimer - Default initialization and duration bounds', () => {
  const timer = new StudyTimer();
  assert.equal(timer.durationMinutes, CONFIG.STUDY.DEFAULT_DURATION_MINUTES);
  assert.equal(timer.remainingSeconds, CONFIG.STUDY.DEFAULT_DURATION_MINUTES * 60);
  assert.equal(timer.state, 'IDLE');

  // Enforces minimum and maximum limits
  timer.setDuration(1);
  assert.equal(timer.durationMinutes, CONFIG.STUDY.MIN_SESSION_MINUTES);

  timer.setDuration(500);
  assert.equal(timer.durationMinutes, CONFIG.STUDY.MAX_SESSION_MINUTES);
});

test('StudyTimer - Anti-Abuse: Verified study minutes calculation', () => {
  let completedSummary = null;
  const timer = new StudyTimer(null, (summary) => {
    completedSummary = summary;
  });

  timer.setDuration(25);
  timer.sessionElapsedSeconds = 1200; // 20 verified minutes elapsed
  timer.remainingSeconds = 0;

  const summary = timer.completeSession();

  assert.equal(summary.verifiedMinutes, 20);
  assert.ok(summary.formattedTime.includes('20'));
  assert.equal(timer.state, 'IDLE');
});

test('StudyTimer - Cumulative Multi-Session: 2x 25m Pomodoros produce 2 biscuits, 1 coffee, and 1 sponge without loss', () => {
  let summary1 = null;
  let summary2 = null;

  const timer = new StudyTimer(null, null);

  // Session 1: 25 minutes (1,500s)
  timer.setDuration(25);
  timer.sessionElapsedSeconds = 1500;
  summary1 = timer.completeSession();

  assert.equal(summary1.earnedItems.biscuit, 1, 'Session 1 must award 1 biscuit');
  assert.equal(summary1.earnedItems.coffee, 0, 'Session 1 (25m) must not award coffee yet (requires 30m)');
  assert.equal(summary1.earnedItems.sponge, 0, 'Session 1 (25m) must not award sponge yet (requires 50m)');
  assert.equal(timer.progressSpongeSeconds, 1500, '25m (1,500s) must be retained towards sponge');

  // Session 2: 25 minutes (1,500s) -> cumulative 50 minutes (3,000s)
  timer.setDuration(25);
  timer.sessionElapsedSeconds = 1500;
  summary2 = timer.completeSession();

  assert.equal(summary2.earnedItems.biscuit, 1, 'Session 2 must award 2nd biscuit');
  assert.equal(summary2.earnedItems.coffee, 1, 'Session 2 must award 1 coffee (25m + 25m = 50m >= 30m)');
  assert.equal(summary2.earnedItems.sponge, 1, 'Session 2 must unlock 1 sponge at cumulative 50 minutes!');
  assert.equal(timer.progressSpongeSeconds, 0, 'Sponge progress resets to 0 after awarding 50m sponge');
});

test('StudyTimer - Restores and persists cumulative progress across reloads via initProgress', () => {
  const fakeProfile = {
    lifetimeSeconds: 1500,
    progressBiscuitSeconds: 0,
    progressCoffeeSeconds: 1500,
    progressSpongeSeconds: 1500
  };

  const timer = new StudyTimer();
  timer.initProgress(fakeProfile);

  assert.equal(timer.progressSpongeSeconds, 1500);

  // Student does a second 25-minute study session
  timer.sessionElapsedSeconds = 1500;
  const summary = timer.completeSession();

  assert.equal(summary.earnedItems.sponge, 1, 'Sponge must be awarded using restored progress from previous session');
});
