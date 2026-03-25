// It says `const hitArr = this.raycaster.intersectObjects(this.shootables, true);`
// If `true` is passed, it should check children recursively.
// But why are the decals not rendering?

// 1. Is the `this.shootables` array populated?
// Let's check `js/scenes/forest.js` to see what is added to `this.shootables`.
// groundMesh is added.
// tree parts: trunk, leaf are added.
// rocks are added.
// ruins are added.

// 2. Are we actually calling `update(delta)` on ProjectileManager?
// Let's check `gameManager.js` or `main.js` or `forest.js`.
