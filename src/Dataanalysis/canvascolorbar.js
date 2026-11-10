export default class ColorBar {
  static render(container, scalarData, colorMapper) {
    if (!container || !scalarData) return;

    let min = scalarData.min;
    let max = scalarData.max;

    if (min == null || Number.isNaN(min)) {
      min = 0;
    }
    if (max == null || Number.isNaN(max)) {
      max = 1;
    }

    if (min === max) {
      const range = Math.abs(min) * 0.1 || 1;
      min = min - range;
      max = max + range;
    }

    const colorbarInfo = colorMapper.getColorbarInfo(min, max);
    const displayMin = colorbarInfo.min;
    const displayMax = colorbarInfo.max;

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "colorbar-wrapper";

    wrapper.style.display = "flex";
    wrapper.style.alignItems = "stretch";
    wrapper.style.gap = "8px";

    const canvas = document.createElement("canvas");

    canvas.width = 22;
    canvas.height = 220;

    const ctx = canvas.getContext("2d");

    const steps = canvas.height;

    for (let y = 0; y < steps; y++) {
      const t = 1 - y / (steps - 1);

      const value = displayMin + t * (displayMax - displayMin);

      const color = colorMapper.getColor(value, min, max);

      ctx.fillStyle = `rgb(
        ${Math.round(color.r * 255)},
        ${Math.round(color.g * 255)},
        ${Math.round(color.b * 255)}
      )`;

      ctx.fillRect(0, y, canvas.width, 1);
    }

    canvas.style.border =
      "1px solid " +
      getComputedStyle(document.body).getPropertyValue("--border").trim();
    canvas.style.borderRadius = "3px";

    const tickCount = 5;

    const normalizedLabels = document.createElement("div");

    normalizedLabels.style.height = canvas.height + "px";
    normalizedLabels.style.display = "flex";
    normalizedLabels.style.flexDirection = "column";
    normalizedLabels.style.justifyContent = "space-between";
    normalizedLabels.style.fontSize = "11px";
    normalizedLabels.style.fontWeight = "400";
    normalizedLabels.style.fontFamily = "Arial";
    normalizedLabels.style.color = getComputedStyle(document.body)
      .getPropertyValue("--colorbar-text")
      .trim();
    normalizedLabels.style.opacity = "0.7";
    normalizedLabels.style.userSelect = "none";
    normalizedLabels.style.marginRight = "4px";

    if (colorbarInfo.showNormalized) {
      for (let i = 0; i < tickCount; i++) {
        const t = i / (tickCount - 1);

        const normalizedValue = 1 - t;

        const label = document.createElement("div");

        label.textContent = normalizedValue.toFixed(1);

        normalizedLabels.appendChild(label);
      }
    }

    const labels = document.createElement("div");

    labels.style.height = canvas.height + "px";
    labels.style.display = "flex";
    labels.style.flexDirection = "column";
    labels.style.justifyContent = "space-between";
    labels.style.fontSize = "12px";
    labels.style.fontWeight = "600";
    labels.style.fontFamily = "Arial";
    labels.style.color = getComputedStyle(document.body)
      .getPropertyValue("--colorbar-text")
      .trim();
    labels.style.userSelect = "none";

    if (colorbarInfo.showReal) {
      for (let i = 0; i < tickCount; i++) {
        const t = i / (tickCount - 1);

        const value = displayMax - t * (displayMax - displayMin);

        const label = document.createElement("div");

        label.textContent = this.formatValue(value);

        labels.appendChild(label);
      }
    }

    wrapper.appendChild(normalizedLabels);
    wrapper.appendChild(canvas);
    wrapper.appendChild(labels);

    container.appendChild(wrapper);
  }

  static clear(container) {
    if (!container) return;

    container.innerHTML = "";
  }

  static formatValue(value) {
    if (Number.isInteger(value)) {
      return value.toString();
    }

    const str = value.toPrecision(10);
    return parseFloat(str).toString();
  }
}
