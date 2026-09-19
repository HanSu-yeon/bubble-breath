// Run against the CommonJS build of src/audio/breathDetector.ts.
const { BreathEnvelope } = require(process.argv[2]);
const assert = require('node:assert/strict');

function feed(envelope, level, frames, noise = 1) {
  let result = 0;
  for (let i = 0; i < frames; i++) result = envelope.update(level, noise, 16);
  assert.ok(Number.isFinite(result) && result >= 0 && result <= 1);
  return result;
}
function calibrated(ambient) {
  const envelope = new BreathEnvelope();
  assert.equal(feed(envelope, ambient, 75), 0, 'calibration must not inflate');
  assert.equal(envelope.calibrated, true);
  return envelope;
}
const quiet = calibrated(0.002);
assert.equal(feed(quiet, 0.002, 60), 0, 'ambient stays idle');
assert.equal(feed(quiet, 0.2, 3), 0, 'short transient is rejected');
feed(quiet, 0.002, 20);
assert.ok(feed(quiet, 0.05, 30) > 0.3, 'sustained breath inflates');
assert.ok(feed(quiet, 0.002, 60) < 0.01, 'stopping breath stops growth');
const noisy = calibrated(0.03);
assert.equal(feed(noisy, 0.04, 60), 0, 'ambient-relative gate rejects room noise');
assert.ok(feed(noisy, 0.3, 30) > 0.8, 'strong breath survives noisy calibration');
const gentle = feed(calibrated(0.002), 0.025, 30);
const strong = feed(calibrated(0.002), 0.1, 30);
assert.ok(strong > gentle, 'stronger breath gives faster growth');
const tonal = feed(calibrated(0.002), 0.08, 30, 0);
const broadband = feed(calibrated(0.002), 0.08, 30, 1);
assert.ok(broadband > tonal, 'broadband noise is favored over tones');
const softBreath = feed(calibrated(0.002), 0.008, 30, 0.2);
assert.ok(softBreath > 0.12, 'gentle breath clears the growth gate even with low spectral flatness');
console.log('Breath detection: 9 checks passed');
