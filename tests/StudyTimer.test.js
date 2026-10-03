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
