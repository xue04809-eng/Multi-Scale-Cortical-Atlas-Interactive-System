export default class PlaybackBar {
  static render(callbacks = {}) {
    const container = document.getElementById("playbackContainer");

    if (!container) {
      console.error("Playback container not found.");
      return;
    }

    container.className = "playback-bar";
    container.innerHTML = "";

    const {
      onPlay = null,
      onPause = null,
      onStop = null,
      onSeek = null,
      onFPS = null,
    } = callbacks;

    const playBtn = document.createElement("button");

    playBtn.className = "playback-btn";

    playBtn.textContent = "▶";

    playBtn.title = "Play";

    playBtn.onclick = () => {
      if (onPlay) onPlay();
    };

    const pauseBtn = document.createElement("button");

    pauseBtn.className = "playback-btn";

    pauseBtn.textContent = "⏸";

    pauseBtn.title = "Pause";

    pauseBtn.onclick = () => {
      if (onPause) onPause();
    };

    const stopBtn = document.createElement("button");

    stopBtn.className = "playback-btn";

    stopBtn.textContent = "■";

    stopBtn.title = "Stop";

    stopBtn.onclick = () => {
      if (onStop) onStop();
    };

    const slider = document.createElement("input");

    slider.type = "range";

    slider.min = 0;

    slider.max = 100;

    slider.value = 0;

    slider.className = "playback-slider";

    slider.oninput = () => {
      if (onSeek) {
        onSeek(slider.value / 100);
      }
    };

    const frameLabel = document.createElement("span");

    frameLabel.className = "playback-frame";

    frameLabel.textContent = "0 / 0";

    const fpsLabel = document.createElement("span");

    fpsLabel.textContent = "FPS";

    fpsLabel.className = "playback-fps-label";

    const fpsInput = document.createElement("input");

    fpsInput.type = "number";

    fpsInput.min = 1;

    fpsInput.max = 60;

    fpsInput.step = 1;

    fpsInput.value = 10;

    fpsInput.className = "playback-fps";

    fpsInput.onchange = () => {
      if (onFPS) {
        onFPS(Number(fpsInput.value));
      }
    };

    container.appendChild(playBtn);

    container.appendChild(pauseBtn);

    container.appendChild(stopBtn);

    container.appendChild(slider);

    container.appendChild(frameLabel);

    container.appendChild(fpsLabel);

    container.appendChild(fpsInput);

    this.container = container;

    this.slider = slider;

    this.frameLabel = frameLabel;

    this.fpsInput = fpsInput;

    this.playBtn = playBtn;

    this.pauseBtn = pauseBtn;

    this.stopBtn = stopBtn;
  }

  static updateFrame(frame, total) {
    if (!this.slider) return;

    if (total <= 1) {
      this.slider.value = 0;

      this.frameLabel.textContent = "0 / 0";

      return;
    }

    this.slider.value = (frame / (total - 1)) * 100;

    this.frameLabel.textContent = `${frame + 1} / ${total}`;
  }

  static setFPS(fps) {
    if (!this.fpsInput) return;

    this.fpsInput.value = fps;
  }

  static enable(enabled = true) {
    if (!this.container) return;

    const opacity = enabled ? "1" : "0.5";

    this.container.style.opacity = opacity;

    this.playBtn.disabled = !enabled;

    this.pauseBtn.disabled = !enabled;

    this.stopBtn.disabled = !enabled;

    this.slider.disabled = !enabled;

    this.fpsInput.disabled = !enabled;
  }

  static show() {
    if (!this.container) return;

    this.container.style.display = "flex";
  }

  static hide() {
    if (!this.container) return;

    this.container.style.display = "none";
  }

  static updatePlayState(playing) {
    if (!this.playBtn || !this.pauseBtn) return;

    this.playBtn.disabled = playing;

    this.pauseBtn.disabled = !playing;
  }
}
