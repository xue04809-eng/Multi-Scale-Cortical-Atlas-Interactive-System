export default class TimeSeriesManager {
  constructor() {
    this.data = null;

    this.frameBuffer = null;

    this.currentFrame = 0;

    this.isPlaying = false;

    this.fps = 10;
  }

  load(data) {
    if (!data) throw new Error("Invalid time-series data.");

    if (data.type !== "timeseries")
      throw new Error("Only TimeSeriesData is supported.");

    this.data = data;

    this.frameBuffer = new Float32Array(data.roiCount);

    this.currentFrame = 0;
  }

  clear() {
    this.data = null;

    this.frameBuffer = null;

    this.currentFrame = 0;

    this.isPlaying = false;
  }

  goto(frame) {
    if (!this.data) return;

    frame = Math.floor(frame);

    if (frame < 0) frame = 0;

    if (frame >= this.data.frameCount) frame = this.data.frameCount - 1;

    this.currentFrame = frame;
  }

  next() {
    if (!this.data) return;

    this.currentFrame++;

    if (this.currentFrame >= this.data.frameCount) {
      this.currentFrame = this.data.frameCount - 1;
    }
  }

  previous() {
    if (!this.data) return;

    this.currentFrame--;

    if (this.currentFrame < 0) this.currentFrame = 0;
  }

  getCurrentValues() {
    if (!this.data) return null;

    const { roiCount, values } = this.data;

    const frame = this.currentFrame;

    for (let roi = 0; roi < roiCount; roi++) {
      this.frameBuffer[roi] = values[frame * roiCount + roi];
    }

    return this.frameBuffer;
  }

  getValue(roi, frame = this.currentFrame) {
    if (!this.data) return null;

    return this.data.values[frame * this.data.roiCount + roi];
  }

  getFrameCount() {
    return this.data ? this.data.frameCount : 0;
  }

  getCurrentFrame() {
    return this.currentFrame;
  }

  getROIValues(roi) {
    if (!this.data) return null;

    const { roiCount, frameCount, values } = this.data;

    const result = new Float32Array(frameCount);

    for (let t = 0; t < frameCount; t++) {
      result[t] = values[t * roiCount + roi];
    }

    return result;
  }

  setFPS(fps) {
    this.fps = fps;
  }

  getFPS() {
    return this.fps;
  }

  getInfo() {
    if (!this.data) return null;

    return {
      atlas: this.data.atlas,

      roiCount: this.data.roiCount,

      frameCount: this.data.frameCount,

      currentFrame: this.currentFrame,

      fps: this.fps,
    };
  }
}
