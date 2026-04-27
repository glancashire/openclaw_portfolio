const { sendEmail } = require('../lib/mailgun');

async function main() {
  const to = process.argv[2];
  if (!to) {
    throw new Error('Usage: node scripts/test-mailgun.js <recipient@example.com>');
  }

  const result = await sendEmail({
    to,
    subject: 'C3PO Mailgun test',
    text: 'This is a Mailgun test from C3PO via OpenClaw.',
    html: '<p>This is a <strong>Mailgun test</strong> from C3PO via OpenClaw.</p>',
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
