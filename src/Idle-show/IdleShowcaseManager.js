export default class IdleShowcaseManager {
  constructor(viewManager) {
    this.viewManager = viewManager;

    this.enabled = false;

    this.idleDelay = 10000;

    this.timer = null;

    this.rotationSpeed = 0.0015;

    this.breathSpeed = 0.0015;

    this.breathAmplitude = 0.015;

    this.startListener();
  }

  startListener() {
    ["mousedown", "mousemove", "wheel", "keydown", "touchstart"].forEach(
      (event) => {
        window.addEventListener(event, () => this.userActive());
      },
    );

    this.resetTimer();
  }

  userActive() {
    if (this.enabled) {
      this.stop();
    }

    this.resetTimer();
  }

  resetTimer() {
    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.start();
    }, this.idleDelay);
  }

  start() {
    if (this.enabled) return;

    this.enabled = true;

    this.cameraTimer = 0;

    this.parcelTimer = 0;
  }

  stop() {
    this.enabled = false;

    const views = this.viewManager?.getAllViews() || [];

    views.forEach((view) => {
      if (view.schaefer?.renderGroup) {
        view.schaefer.renderGroup.rotation.y = 0;
        view.schaefer.renderGroup.scale.setScalar(1);
      }
    });
  }

  update(delta) {
    if (!this.enabled) return;

    const views = this.viewManager?.getAllViews() || [];

    views.forEach((view) => {
      const brain = view.schaefer?.renderGroup;

      if (!brain) return;

      brain.rotation.y += this.rotationSpeed;

      const t = performance.now() * this.breathSpeed;

      const scale = 1 + Math.sin(t) * this.breathAmplitude;

      brain.scale.setScalar(scale);
    });
  }
}
