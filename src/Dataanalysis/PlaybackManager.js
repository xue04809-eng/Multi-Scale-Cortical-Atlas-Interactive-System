export default class PlaybackManager {
  constructor(timeSeriesManager) {
    this.timeSeriesManager = timeSeriesManager;

    this.timer = null;

    this.playing = false;

    this.loop = true;

    this.fps = 10;

    this.onFrame = null;

    this.onPlay = null;

    this.onPause = null;

    this.onStop = null;
  }

  play() {
    if (this.playing) return;

    if (!this.timeSeriesManager || !this.timeSeriesManager.data) return;

    this.playing = true;

    if (this.onPlay) {
      this.onPlay();
    }

    this.startTimer();
  }

  pause() {
    if (!this.playing) return;

    this.playing = false;

    this.stopTimer();

    if (this.onPause) {
      this.onPause();
    }
  }

  stop() {
    this.pause();

    this.goto(0);

    if (this.onStop) {
      this.onStop();
    }
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  startTimer() {
    this.stopTimer();

    this.timer = setInterval(() => {
      this.step();
    }, 1000 / this.fps);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);

      this.timer = null;
    }
  }

  step() {
    if (!this.timeSeriesManager || !this.timeSeriesManager.data) return;

    const current = this.timeSeriesManager.getCurrentFrame();

    const total = this.timeSeriesManager.getFrameCount();

    if (current >= total - 1) {
      if (this.loop) {
        this.goto(0);
      } else {
        this.stop();
      }

      return;
    }

    this.timeSeriesManager.next();

    this.emitFrame();
  }

  goto(frame) {
    if (!this.timeSeriesManager || !this.timeSeriesManager.data) return;

    this.timeSeriesManager.goto(frame);

    this.emitFrame();
  }

  emitFrame() {
    if (!this.onFrame) return;

    this.onFrame({
      frame: this.timeSeriesManager.getCurrentFrame(),

      frameCount: this.timeSeriesManager.getFrameCount(),

      values: this.timeSeriesManager.getCurrentValues(),
    });
  }

  setFPS(fps) {
    fps = Number(fps);

    if (Number.isNaN(fps)) return;

    fps = Math.max(1, Math.min(60, fps));

    this.fps = fps;

    if (this.playing) {
      this.startTimer();
    }
  }

  getFPS() {
    return this.fps;
  }

  setLoop(enabled) {
    this.loop = Boolean(enabled);
  }

  getLoop() {
    return this.loop;
  }

  isPlaying() {
    return this.playing;
  }

  getProgress() {
    if (!this.timeSeriesManager || !this.timeSeriesManager.data) return 0;

    const current = this.timeSeriesManager.getCurrentFrame();

    const total = this.timeSeriesManager.getFrameCount();

    if (total <= 1) return 0;

    return current / (total - 1);
  }

  setProgress(progress) {
    if (!this.timeSeriesManager || !this.timeSeriesManager.data) return;

    const total = this.timeSeriesManager.getFrameCount();

    const frame = Math.round(progress * (total - 1));

    this.goto(frame);
  }

  destroy() {
    this.stopTimer();

    this.playing = false;
  }
}
