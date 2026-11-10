import { ScalarColorMapper } from "./ScalarRenderer.js";

const CUSTOM_GRADIENT_KEY = "__custom_gradient__";

export default class ColormapUI {
  static init(refreshDataColors) {
    const colormapMenu = document.getElementById("colormapMenu");
    const colormapTrigger = document.getElementById("colormapTrigger");
    const colormapTriggerLabel = document.getElementById(
      "colormapTriggerLabel",
    );
    const colorModeSelect = document.getElementById("colorModeSelect");

    function buildColormapMenu() {
      if (!colormapMenu) return;

      colormapMenu.innerHTML = "";

      const maps = ["Viridis", "Turbo", "Magma", "CoolWarm"];

      for (const name of maps) {
        const item = document.createElement("div");
        item.className = "colormap-dropdown-item";
        item.dataset.value = name;

        if (ScalarColorMapper.colorMap === name) {
          item.classList.add("active");
        }

        const preview = document.createElement("canvas");
        preview.className = "gradient-preview";
        preview.width = 60;
        preview.height = 14;
        drawGradientPreview(preview, name);

        const label = document.createElement("span");
        label.className = "item-label";
        label.textContent = name;

        item.appendChild(preview);
        item.appendChild(label);
        colormapMenu.appendChild(item);
      }

      const sep = document.createElement("div");
      sep.className = "colormap-dropdown-separator";
      colormapMenu.appendChild(sep);

      const customItem = document.createElement("div");
      customItem.className = "colormap-dropdown-item";
      customItem.dataset.value = "__custom__";

      const customLabel = document.createElement("span");
      customLabel.className = "item-label";
      customLabel.textContent = "🖌 Custom Gradient...";

      customItem.appendChild(customLabel);
      colormapMenu.appendChild(customItem);
    }

    function drawGradientPreview(canvas, colormapName) {
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;

      for (let x = 0; x < w; x++) {
        const t = x / (w - 1);
        const color = ScalarColorMapper.sampleLUT(colormapName, t);
        ctx.fillStyle = `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`;
        ctx.fillRect(x, 0, 1, h);
      }
    }

    function updateTriggerLabel(name) {
      if (colormapTriggerLabel) {
        colormapTriggerLabel.textContent =
          name === CUSTOM_GRADIENT_KEY ? "Custom" : name;
      }
    }

    function selectColormap(name) {
      if (name === "__custom__") {
        const panel = document.getElementById("customGradientPanel");
        if (panel) {
          panel.style.display = "block";
          updateGradientPreview();
        }

        if (!ScalarColorMapper.hasColorMap(CUSTOM_GRADIENT_KEY)) {
          const c1 = document.getElementById("customColor1").value;
          const c2 = document.getElementById("customColor2").value;
          const steps =
            parseInt(document.getElementById("customGradientSteps").value) ||
            10;
          ScalarColorMapper.createTwoColorGradient(
            CUSTOM_GRADIENT_KEY,
            c1,
            c2,
            steps,
          );
        }

        ScalarColorMapper.setColorMap(CUSTOM_GRADIENT_KEY);
        updateTriggerLabel(CUSTOM_GRADIENT_KEY);
      } else {
        const panel = document.getElementById("customGradientPanel");
        if (panel) panel.style.display = "none";

        ScalarColorMapper.setColorMap(name);
        updateTriggerLabel(name);
      }

      refreshDataColors();
    }

    colormapTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = colormapMenu.style.display === "block";
      colormapMenu.style.display = isOpen ? "none" : "block";

      const panel = document.getElementById("customGradientPanel");
      if (!isOpen && panel) panel.style.display = "none";

      if (!isOpen) buildColormapMenu();
    });

    colormapMenu.addEventListener("click", function (e) {
      const item = e.target.closest(".colormap-dropdown-item");
      if (!item) return;

      const value = item.dataset.value;
      selectColormap(value);
      colormapMenu.style.display = "none";
    });

    document.addEventListener("click", function (e) {
      if (colormapMenu) colormapMenu.style.display = "none";

      const panel = document.getElementById("customGradientPanel");
      if (panel && panel.style.display === "block") {
        const dropdown = document.getElementById("colormapDropdown");
        if (dropdown && !dropdown.contains(e.target)) {
          panel.style.display = "none";
        }
      }
    });

    function updateGradientPreview() {
      const canvas = document.getElementById("customGradientPreview");
      if (!canvas) return;

      const color1 = document.getElementById("customColor1").value;
      const color2 = document.getElementById("customColor2").value;
      const steps =
        parseInt(document.getElementById("customGradientSteps").value) || 10;

      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;

      const c1 = hexToRgb(color1);
      const c2 = hexToRgb(color2);

      for (let x = 0; x < w; x++) {
        const t = x / (w - 1);
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, 0, 1, h);
      }
    }

    function hexToRgb(hex) {
      const h = hex.replace("#", "");
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
      };
    }

    document
      .getElementById("customColor1")
      .addEventListener("input", updateGradientPreview);
    document
      .getElementById("customColor2")
      .addEventListener("input", updateGradientPreview);
    document
      .getElementById("customGradientSteps")
      .addEventListener("input", updateGradientPreview);

    document
      .getElementById("applyGradientBtn")
      .addEventListener("click", function () {
        const color1 = document.getElementById("customColor1").value;
        const color2 = document.getElementById("customColor2").value;
        const steps =
          parseInt(document.getElementById("customGradientSteps").value) || 10;

        ScalarColorMapper.createTwoColorGradient(
          CUSTOM_GRADIENT_KEY,
          color1,
          color2,
          steps,
        );
        ScalarColorMapper.setColorMap(CUSTOM_GRADIENT_KEY);
        updateTriggerLabel(CUSTOM_GRADIENT_KEY);
        refreshDataColors();
      });

    document
      .getElementById("customGradientClose")
      .addEventListener("click", function () {
        const panel = document.getElementById("customGradientPanel");
        if (panel) panel.style.display = "none";
      });

    // Color mode select handler
    if (colorModeSelect) {
      colorModeSelect.addEventListener("change", function () {
        const mode = this.value;
        ScalarColorMapper.setColorMode(mode);
        refreshDataColors();
      });
    }

    buildColormapMenu();
  }
}
