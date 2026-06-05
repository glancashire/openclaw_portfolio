'use strict';

/* Test orderSafeguards: cover sell-without-approval, below-market sell floor,
 * above-market buy ceiling, leg notional cap, basket cap, stale-quote guard. */

const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateLeg, evaluateBasketSafeguards, DEFAULTS } = require('../src/execution/orderSafeguards');

const goodQuote = { bid: 100, ask: 100.10, last: 100.05 };

test('SELL without envelope.sellApproved is refused', () => {
  const r = evaluateLeg({
    leg: { action: 'SELL', limitPrice: 99.95, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: goodQuote,
    fxToChf: 1,
    envelope: { sellApproved: false },
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'sell_not_envelope_approved');
});

test('SELL with envelope.sellApproved=true and on-market limit passes', () => {
  const r = evaluateLeg({
    leg: { action: 'SELL', limitPrice: 99.5, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: goodQuote,
    fxToChf: 1,
    envelope: { sellApproved: true },
  });
  assert.equal(r.ok, true);
});

test('SELL more than 5% below bid is blocked', () => {
  const r = evaluateLeg({
    leg: { action: 'SELL', limitPrice: 90.0, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: goodQuote, // bid=100
    fxToChf: 1,
    envelope: { sellApproved: true },
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'sell_below_market_floor');
});

test('SELL exactly 5% below bid passes (boundary inclusive of floor)', () => {
  const r = evaluateLeg({
    leg: { action: 'SELL', limitPrice: 95.0, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: goodQuote, // bid=100, drift=-5%
    fxToChf: 1,
    envelope: { sellApproved: true },
  });
  assert.equal(r.ok, true);
});

test('BUY more than 5% above ask is blocked (fat-finger)', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 110.0, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: goodQuote, // ask=100.10
    fxToChf: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'buy_above_market_ceiling');
});

test('Leg notional > maxLegChf is blocked', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100, quantity: 1000, currency: 'CHF', conid: 1 },
    liveQuote: goodQuote,
    fxToChf: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'leg_notional_cap');
});

test('Crossed/invalid quote is blocked', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 110, ask: 100, last: 105 }, // crossed
    fxToChf: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'crossed_quote');
});

test('Zero/negative bid is blocked', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 0, ask: 100.10, last: 100.05 },
    fxToChf: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'bad_bid');
});

test('Basket-level: any SELL leg without envelope.sellApproved blocks the whole basket', async () => {
  const envelope = {
    legs: [
      { legId: 'l1', action: 'BUY', limitPrice: 100, quantity: 5, currency: 'CHF', conid: 1, instrument: 'X' },
      { legId: 'l2', action: 'SELL', limitPrice: 99.5, quantity: 5, currency: 'CHF', conid: 2, instrument: 'Y' },
    ],
  };
  const r = await evaluateBasketSafeguards({
    envelope,
    fetchLiveQuote: async () => goodQuote,
    fxLookup: () => 1,
  });
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.code === 'sell_not_envelope_approved'));
});

test('Basket-level: total notional over cap is blocked', async () => {
  const envelope = {
    legs: Array.from({ length: 3 }, (_, i) => ({
      legId: `l${i}`,
      action: 'BUY',
      limitPrice: 100,
      quantity: 200, // 20k CHF each, total 60k > 50k cap
      currency: 'CHF',
      conid: i + 1,
      instrument: 'X',
    })),
  };
  const r = await evaluateBasketSafeguards({
    envelope,
    fetchLiveQuote: async () => goodQuote,
    fxLookup: () => 1,
  });
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.code === 'basket_notional_cap'));
});

test('Basket with all clean BUYs and good quotes passes', async () => {
  const envelope = {
    legs: [
      { legId: 'l1', action: 'BUY', limitPrice: 100, quantity: 5, currency: 'CHF', conid: 1, instrument: 'X' },
      { legId: 'l2', action: 'BUY', limitPrice: 100, quantity: 5, currency: 'CHF', conid: 2, instrument: 'Y' },
    ],
  };
  const r = await evaluateBasketSafeguards({
    envelope,
    fetchLiveQuote: async () => goodQuote,
    fxLookup: () => 1,
  });
  assert.equal(r.ok, true);
});

test('Defaults are sane', () => {
  assert.equal(DEFAULTS.maxBelowMarketPct, 5.0);
  assert.equal(DEFAULTS.maxAboveMarketPct, 5.0);
  assert.equal(DEFAULTS.maxLegChf, 25000);
  assert.equal(DEFAULTS.maxBasketChf, 50000);
  assert.equal(DEFAULTS.maxBuyDailyMovePct, 3.0);
});

test('BUY blocked when price up > 3% vs prior close (trend guard)', () => {
  // bid=100, ask=100.10, last=104 (4% above prevClose=100)
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100.10, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 100, ask: 100.10, last: 104, prevClose: 100 },
    fxToChf: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'buy_trend_guard');
});

test('BUY allowed when up exactly 3% (boundary inclusive)', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100.10, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 100, ask: 100.10, last: 103, prevClose: 100 },
    fxToChf: 1,
  });
  assert.equal(r.ok, true);
});

test('BUY allowed when up 1% (well within trend guard)', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100.10, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 100, ask: 100.10, last: 101, prevClose: 100 },
    fxToChf: 1,
  });
  assert.equal(r.ok, true);
});

test('BUY allowed when prevClose missing (do not block on missing data)', () => {
  const r = evaluateLeg({
    leg: { action: 'BUY', limitPrice: 100.10, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 100, ask: 100.10, last: 110 }, // no prevClose
    fxToChf: 1,
  });
  assert.equal(r.ok, true);
});

test('SELL not affected by trend guard (only BUYs)', () => {
  const r = evaluateLeg({
    leg: { action: 'SELL', limitPrice: 100, quantity: 10, currency: 'CHF', conid: 1 },
    liveQuote: { bid: 100, ask: 100.10, last: 110, prevClose: 100 }, // 10% up
    fxToChf: 1,
    envelope: { sellApproved: true },
  });
  // selling into a pump is fine — trend guard only blocks BUYs
  assert.equal(r.ok, true);
});
