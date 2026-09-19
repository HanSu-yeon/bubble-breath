const assert = require('node:assert/strict');
const { BubbleManager } = require(process.argv[2]);
for (const maxRadius of [100, 150, 380]) {
  const manager = new BubbleManager(200, 600);
  manager.setWandPosition(200, 600, 62, maxRadius);
  let releases = 0;
  let pops = 0;
  manager.onDetach = () => releases++;
  manager.onPop = () => pops++;
  for (let i = 0; i < 60; i++) manager.update(16, 0);
  assert.equal(releases, 0, 'idle must not release');
  for (let i = 0; i < 300 && !releases; i++) manager.update(16, 0.6);
  assert.equal(releases, 1, 'blowing releases automatically');
  assert.equal(manager.attached.radius, 22, 'next bubble is ready');
  const first = manager.floating[0];
  assert.equal(first.state, 'floating');
  assert.ok(first.vy < 0, 'released bubble rises');
  assert.ok(manager.tryPopAt(first.x, first.y));
  assert.equal(pops, 1, 'pop triggers sound event once');
  assert.equal(manager.tryPopAt(first.x, first.y), false);
  assert.equal(pops, 1);
  for (let i = 0; i < 300 && releases < 2; i++) manager.update(16, 0.6);
  assert.equal(releases, 2, 'continued breath makes another bubble');
}
console.log('Automatic release, repeat blowing, idle, and pop events passed at 3 screen sizes');
