#!/usr/bin/env node
'use strict';
const path = require('path');
const { InteractiveBrokersClient } = require(path.join(__dirname, '..', '..', 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

const orderId = Number(process.argv[2]);
if (!Number.isFinite(orderId)) {
  console.error('Usage: node cancel-broker-order.js <orderId>');
  process.exit(1);
}

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  await client.native.withApi(async ({ api }) => {
    let cancelled = false;
    let lastStatus = null;
    let errors = [];
    const onStatus = (id, status) => {
      if (id !== orderId) return;
      lastStatus = status;
      console.log(`orderStatus #${id}: ${status}`);
      if (status === 'Cancelled' || status === 'ApiCancelled') cancelled = true;
    };
    const onError = (err, code, id) => {
      if (id !== orderId) return;
      if ([2104, 2106, 2107, 2108, 2158].includes(code)) return;
      errors.push({ code, message: err?.message || String(err) });
      console.log(`error on #${id}: code=${code} ${err?.message || err}`);
      if (code === 202) cancelled = true; // 202 = "Order Canceled - reason:..."
    };
    api.on(ib.EventName.orderStatus, onStatus);
    api.on(ib.EventName.error, onError);
    console.log(`Sending cancelOrder(${orderId})...`);
    api.cancelOrder(orderId);
    await new Promise((r) => setTimeout(r, 6000));
    api.off(ib.EventName.orderStatus, onStatus);
    api.off(ib.EventName.error, onError);
    console.log(`\n=== Result === cancelled=${cancelled} lastStatus=${lastStatus}`);
    if (errors.length) console.log(`errors=${JSON.stringify(errors)}`);
  });
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
