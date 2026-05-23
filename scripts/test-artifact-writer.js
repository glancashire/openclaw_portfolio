const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeTextIfChanged, writeJsonIfChanged } = require('../src/reporting/artifactWriter');

(function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-writer-'));
  const textPath = path.join(tmpDir, 'sample.txt');
  const jsonPath = path.join(tmpDir, 'sample.json');

  const firstText = writeTextIfChanged(textPath, 'hello\n');
  const secondText = writeTextIfChanged(textPath, 'hello\n');
  const thirdText = writeTextIfChanged(textPath, 'hello world\n');

  assert.strictEqual(firstText.wrote, true);
  assert.strictEqual(secondText.wrote, false);
  assert.strictEqual(thirdText.wrote, true);
  assert.strictEqual(fs.readFileSync(textPath, 'utf8'), 'hello world\n');

  const firstJson = writeJsonIfChanged(jsonPath, { a: 1, b: 2 });
  const secondJson = writeJsonIfChanged(jsonPath, { a: 1, b: 2 });
  const thirdJson = writeJsonIfChanged(jsonPath, { a: 1, b: 3 });

  assert.strictEqual(firstJson.wrote, true);
  assert.strictEqual(secondJson.wrote, false);
  assert.strictEqual(thirdJson.wrote, true);
  assert.strictEqual(fs.readFileSync(jsonPath, 'utf8'), JSON.stringify({ a: 1, b: 3 }, null, 2) + '\n');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
