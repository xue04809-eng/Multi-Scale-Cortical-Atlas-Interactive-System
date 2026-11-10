export default class LightingController {
  static DEFAULT = {
    ambient: 1,
    spot: 1,
  };

  static init(viewManager) {
    this.viewManager = viewManager;

    this.panel = document.getElementById("lightingPanel");
    this.openBtn = document.getElementById("lightingBtn");
    this.closeBtn = document.getElementById("lightingClose");

    this.ambientSlider = document.getElementById("ambientSlider");

    this.spotSlider = document.getElementById("spotSlider");

    this.ambientValue = document.getElementById("ambientValue");

    this.spotValue = document.getElementById("spotValue");

    this.resetBtn = document.getElementById("lightingReset");

    this.bindEvents();

    this.reset();
  }

  static bindEvents() {
    this.openBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      this.panel.classList.toggle("show");
    });

    this.closeBtn.addEventListener("click", () => {
      this.panel.classList.remove("show");
    });

    this.ambientSlider.addEventListener("input", () => {
      const value = parseFloat(this.ambientSlider.value);

      this.ambientValue.textContent = value.toFixed(2);

      this.updateAmbient(value);
    });

    this.spotSlider.addEventListener("input", () => {
      const value = parseFloat(this.spotSlider.value);

      this.spotValue.textContent = value.toFixed(2);

      this.updateSpot(value);
    });

    this.resetBtn.addEventListener("click", () => {
      this.reset();
    });
  }

  static updateAmbient(value) {
    this.viewManager.views.forEach((view) => {
      if (view.ambientLight) {
        view.ambientLight.intensity = value;
      }
    });
  }

  static updateSpot(value) {
    this.viewManager.views.forEach((view) => {
      if (view.spotLight) {
        view.spotLight.intensity = value;
      }
    });
  }

  static reset() {
    this.ambientSlider.value = this.DEFAULT.ambient;

    this.spotSlider.value = this.DEFAULT.spot;

    this.ambientValue.textContent = this.DEFAULT.ambient.toFixed(2);

    this.spotValue.textContent = this.DEFAULT.spot.toFixed(2);

    this.updateAmbient(this.DEFAULT.ambient);

    this.updateSpot(this.DEFAULT.spot);
  }
}
