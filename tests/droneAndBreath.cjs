const assert = require('node:assert/strict');
const { BubbleManager } = require(process.argv[2] + '/bubble/BubbleManager.js');
const { droneSchedule } = require(process.argv[2] + '/background/droneSchedule.js');
for (let hour = 18; hour <= 23; hour++) {
  assert.equal(droneSchedule(hour + 34 / 60 + 59 / 3600).active, false);
  assert.equal(droneSchedule(hour + 35 / 60).active, true);
  assert.equal(droneSchedule(hour + 35 / 60 + 59 / 3600).active, true);
  assert.equal(droneSchedule(hour + 37 / 60 + 40 / 3600).active, false);
}
const { droneThemeIndex, DRONE_SHOW_SECONDS } = require(process.argv[2] + '/background/droneThemes.js');
assert.equal(DRONE_SHOW_SECONDS, 160);
assert.deepEqual([0, 19, 20, 39, 40, 59, 60, 79, 80, 99, 100, 120, 140, 159].map(droneThemeIndex), [0,0,1,1,2,2,3,3,4,4,5,6,7,7]);
assert.equal(droneSchedule(18 + 37 / 60 + 39 / 3600).active, true);
assert.equal(droneSchedule(12 + 35 / 60).active, false);
assert.equal(droneSchedule(23 + 43 / 60).label, '다음 드론쇼 내일 18:35');
const create = () => { const m = new BubbleManager(200, 650); m.setWandPosition(200, 650, 40, 150); return m; };
const weak = create(), strong = create();
for (let i = 0; i < 30; i++) { weak.update(16, 0.2); strong.update(16, 0.9); }
assert.ok(strong.attached.radius > weak.attached.radius + 10);
let bursts = 0, releases = 0;
strong.onBurst = () => bursts++;
strong.onDetach = () => releases++;
for (let i = 0; i < 250 && !bursts; i++) strong.update(16, 0.9);
assert.equal(bursts, 1);
assert.equal(releases, 0);
assert.equal(strong.attached.radius, 22);
assert.ok(strong.particles.length > 0);
const rescue = create();
rescue.attached.radius = rescue.attached.targetRadius = 110;
let rescued = 0;
rescue.onDetach = () => rescued++;
rescue.onBurst = () => assert.fail('short gust must not burst');
for (let i = 0; i < 10; i++) rescue.update(16, 0.9);
assert.equal(rescued, 0);
for (let i = 0; i < 20; i++) rescue.update(16, 0.2);
assert.equal(rescued, 1, 'easing breath releases the large bubble');
console.log('Drone schedule and weak/strong growth, sustained burst, and gust recovery passed');
