import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PetManager } from '../js/engine/PetManager.js';
import { CONFIG } from '../js/config.js';

test('PetManager - Initial biological state and needs bounds', () => {
  localStorage.clear();
  const pet = new PetManager();

  assert.equal(pet.hunger, 80);
  assert.equal(pet.energy, 85);
  assert.equal(pet.cleanliness, 90);
  assert.equal(pet.state, 'AWAKE');
  assert.equal(pet.activeEvolution, 'baby');
  assert.ok(pet.globalExp >= 0);
});

test('PetManager - Natural biological decay over time', () => {
  localStorage.clear();
  const pet = new PetManager();
  
  const startHunger = pet.hunger;
  const startClean = pet.cleanliness;

  const expectedHunger = startHunger - (CONFIG.NEEDS.HUNGER.decayPerHour / 60);
  const expectedClean = startClean - (CONFIG.NEEDS.CLEANLINESS.decayPerHour / 60);

  pet.tickMinute();

  assert.equal(pet.hunger.toFixed(4), expectedHunger.toFixed(4));
  assert.equal(pet.cleanliness.toFixed(4), expectedClean.toFixed(4));
});

test('PetManager - Pantry actions: Feeding biscuit replenishes hunger and awards global EXP', () => {
  localStorage.clear();
  const pet = new PetManager();
  pet.hunger = 50;
  pet.pantry.biscuit = 5;

  const initialExp = pet.globalExp;
  const res = pet.feedBiscuit();

  assert.equal(res.success, true);
  assert.equal(pet.hunger, 75);
  assert.equal(pet.pantry.biscuit, 4);
  assert.equal(pet.globalExp, initialExp + CONFIG.GLOBAL_PROGRESSION.EXP_FEED_BISCUIT);
});

test('PetManager - Pantry actions: Offering coffee increases energy and awards global EXP', () => {
  localStorage.clear();
  const pet = new PetManager();
  pet.energy = 50;
  pet.pantry.coffee = 3;

  const initialExp = pet.globalExp;
  const res = pet.offerCoffee();

  assert.equal(res.success, true);
  assert.equal(pet.energy, 75);
  assert.equal(pet.pantry.coffee, 2);
  assert.equal(pet.globalExp, initialExp + CONFIG.GLOBAL_PROGRESSION.EXP_OFFER_COFFEE);
});

test('PetManager - Pantry actions: Sponge cleaning restores cleanliness and awards global EXP', () => {
  localStorage.clear();
  const pet = new PetManager();
  pet.cleanliness = 40;
  pet.pantry.sponge = 2;

  const initialExp = pet.globalExp;
  const res = pet.cleanWithSponge();

  assert.equal(res.success, true);
  assert.equal(pet.cleanliness, 70);
  assert.equal(pet.pantry.sponge, 1);
  assert.equal(pet.globalExp, initialExp + CONFIG.GLOBAL_PROGRESSION.EXP_CLEAN_SPONGE);
});

test('PetManager - Sleep state machine: biscuit blocked while sleeping, coffee restores energy', () => {
  localStorage.clear();
  const pet = new PetManager();
  pet.fallAsleep();

  assert.equal(pet.state, 'ASLEEP');

  // Feeding biscuit while sleeping must be gently blocked
  const feedRes = pet.feedBiscuit();
  assert.equal(feedRes.success, false);

  // Coffee must be accepted and replenish energy
  pet.energy = 60;
  const coffeeRes = pet.offerCoffee();
  assert.equal(coffeeRes.success, true);
  assert.equal(pet.energy, 85);
});
