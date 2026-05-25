#!/usr/bin/env node
'use strict';
const path = require('path');
const { InteractiveBrokersClient } = require(path.join(__dirname, '..', '..', 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const orders = [];
  await client.native.withApi(async ({ api }) => {
    await new Promise((resolve) => {
      const onOpen = (orderId, contract, order, orderState) => {
        orders.push({
          orderId,
          symbol: contract?.symbol,
          conId: contract?.conId,
          primaryExch: contract?.primaryExchange || contract?.primaryExch,
          currency: contract?.currency,
          action: order?.action,
          totalQuantity: order?.totalQuantity,
          lmtPrice: order?.lmtPrice,
          orderType: order?.orderType,
          tif: order?.tif,
          status: orderState?.status,
        });
      };
      const onEnd = () => { cleanup(); resolve(); };
      const timer = setTimeout(() => { cleanup(); resolve(); }, 10000);
      const cleanup = () => {
        clearTimeout(timer);
        api.off(ib.EventName.openOrder, onOpen);
        api.off(ib.EventName.openOrderEnd, onEnd);
      };
      api.on(ib.EventName.openOrder, onOpen);
      api.on(ib.EventName.openOrderEnd, onEnd);
      api.reqAllOpenOrders();
    });
  });
  console.log(`\n=== Open orders at IBKR (${orders.length}) ===\n`);
  for (const o of orders) {
    console.log(`#${o.orderId} ${o.action} ${o.totalQuantity} ${o.symbol} (${o.primaryExch}/${o.currency}) ${o.orderType} @ ${o.lmtPrice} ${o.tif} — status=${o.status}`);
  }
  console.log(`\nFull JSON:\n${JSON.stringify(orders, null, 2)}`);
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
