import ViewCapture, { VIEW_ANGLES } from "./ViewCapture.js";
import FigureLayout from "./figurelayout.js";
import ScalarColorMapper from "../Dataanalysis/ScalarColorMapper.js";

export default class ExportPanel {
  constructor(viewManager, exportManager) {
    this.viewManager = viewManager;
    this.exportManager = exportManager;
    this.viewCapture = new ViewCapture(viewManager);
    this.layout = new FigureLayout();
    this.isVisible = false;
    this.capturedImages = [];
    this.selectedViewAngles = new Set(["front"]);
    this.currentFormat = "png";
    this.currentDPI = 300;
    this.currentLayout = "single";
    this.canvasWidth = 1920;
    this.canvasHeight = 1080;
    this.bgColor = "#020617";
    this.showGrid = false;
    this.components = [];
    this.eventsBound = false;

    this.overlay = document.getElementById("exportPanelOverlay");
    this.panel = document.getElementById("exportPanel");

    this.initPanel();
  }

  initPanel() {
    const viewAngleGrid = document.getElementById("viewAngleGrid");
    if (viewAngleGrid) {
      viewAngleGrid.innerHTML = VIEW_ANGLES.map(
        (angle) => `
                <label class="view-angle-checkbox">
                    <input type="checkbox" 
                           data-angle="${angle.id}" 
                           ${this.selectedViewAngles.has(angle.id) ? "checked" : ""}>
                    <span>${angle.label}</span>
                </label>
            `,
      ).join("");
    }
  }

  bindEvents() {
    const closeBtn = document.getElementById("exportCloseBtn");
    const captureBtn = document.getElementById("captureViewsBtn");
    const exportBtn = document.getElementById("exportBtn");
    const refreshBtn = document.getElementById("refreshPreviewBtn");

    if (closeBtn) closeBtn.addEventListener("click", () => this.hide());

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    document
      .querySelectorAll(".view-angle-checkbox input")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          const angle = e.target.dataset.angle;
          if (e.target.checked) this.selectedViewAngles.add(angle);
          else this.selectedViewAngles.delete(angle);
        });
      });

    if (captureBtn)
      captureBtn.addEventListener("click", () => this.captureViews());

    document.querySelectorAll(".layout-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".layout-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentLayout = btn.dataset.layout;
        this.applyLayout();
        this.renderPreview();
      });
    });

    const bgColorPicker = document.getElementById("bgColorPicker");
    if (bgColorPicker)
      bgColorPicker.addEventListener("input", (e) => {
        this.bgColor = e.target.value;
        this.renderPreview();
      });

    document.querySelectorAll(".bg-preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.bgColor = btn.dataset.color;
        const picker = document.getElementById("bgColorPicker");
        if (picker) picker.value = this.bgColor;
        this.renderPreview();
      });
    });

    const showGridCheckbox = document.getElementById("showGridCheckbox");
    if (showGridCheckbox)
      showGridCheckbox.addEventListener("change", (e) => {
        this.showGrid = e.target.checked;
        this.renderPreview();
      });

    document.querySelectorAll(".component-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.addComponent(btn.dataset.component),
      );
    });

    const formatSelect = document.getElementById("formatSelect");
    if (formatSelect)
      formatSelect.addEventListener("change", (e) => {
        this.currentFormat = e.target.value;
      });

    const dpiSelect = document.getElementById("dpiSelect");
    if (dpiSelect)
      dpiSelect.addEventListener("change", (e) => {
        if (e.target.value === "custom") {
          const row = document.getElementById("customDpiRow");
          if (row) row.style.display = "flex";
        } else {
          const row = document.getElementById("customDpiRow");
          if (row) row.style.display = "none";
          this.currentDPI = parseInt(e.target.value);
        }
      });

    const customDpiInput = document.getElementById("customDpiInput");
    if (customDpiInput)
      customDpiInput.addEventListener("input", (e) => {
        this.currentDPI = parseInt(e.target.value) || 300;
      });

    const sizeSelect = document.getElementById("sizeSelect");
    if (sizeSelect)
      sizeSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        if (value === "custom") {
          const row = document.getElementById("customSizeRow");
          if (row) row.style.display = "flex";
        } else {
          const row = document.getElementById("customSizeRow");
          if (row) row.style.display = "none";
          const [w, h] =
            value === "A4"
              ? [2480, 3508]
              : value === "A3"
                ? [3508, 4961]
                : value.split("x").map(Number);
          this.canvasWidth = w;
          this.canvasHeight = h;
          const wi = document.getElementById("widthInput");
          const hi = document.getElementById("heightInput");
          if (wi) wi.value = w;
          if (hi) hi.value = h;
          this.renderPreview();
        }
      });

    const widthInput = document.getElementById("widthInput");
    if (widthInput)
      widthInput.addEventListener("input", (e) => {
        this.canvasWidth = parseInt(e.target.value) || 1920;
        this.renderPreview();
      });

    const heightInput = document.getElementById("heightInput");
    if (heightInput)
      heightInput.addEventListener("input", (e) => {
        this.canvasHeight = parseInt(e.target.value) || 1080;
        this.renderPreview();
      });

    if (refreshBtn)
      refreshBtn.addEventListener("click", () => this.renderPreview());

    if (exportBtn) exportBtn.addEventListener("click", () => this.export());
  }

  async captureViews() {

    try {
      this.viewCapture.setSelectedViews(Array.from(this.selectedViewAngles));
      this.capturedImages = await this.viewCapture.captureAllSelected(true);

      if (this.capturedImages.length === 0) {
        alert(
          "Failed to capture any view images. Please check the console for errors.",
        );
        return;
      }

      this.applyLayout();
      this.renderImageSizeControls();
      await this.renderPreview();
    } catch (error) {
      console.error("captureViews error:", error);
      alert("Failed to capture view: " + error.message);
    }
  }

  applyLayout() {
    if (this.capturedImages.length === 0) return;

    const positions = this.layout.getLayoutPositions(
      this.currentLayout,
      this.capturedImages.length,
    );

    this.capturedImages.forEach((img, i) => {
      if (positions[i]) {
        img.cellX = positions[i].x;
        img.cellY = positions[i].y;
        img.cellWidth = positions[i].width;
        img.cellHeight = positions[i].height;

        // Initial size fills 100% of cell
        const scale = 1.0;
        const imgAspect = img.width / img.height;
        const cellAspect = img.cellWidth / img.cellHeight;

        let baseWidth, baseHeight;
        if (imgAspect > cellAspect) {
          baseWidth = img.cellWidth * scale;
          baseHeight = baseWidth / imgAspect;
        } else {
          baseHeight = img.cellHeight * scale;
          baseWidth = baseHeight * imgAspect;
        }

        img.width = baseWidth;
        img.height = baseHeight;
        img.x = img.cellX + (img.cellWidth - img.width) / 2;
        img.y = img.cellY + (img.cellHeight - img.height) / 2;
      }
    });
  }

  renderImageSizeControls() {
    const container = document.getElementById("imageSizeControls");
    if (!container) return;

    container.innerHTML = this.capturedImages
      .map((img, i) => {
        const label = img.label || `Image ${i + 1}`;
        return `<div class="image-size-info"><span class="image-size-label">${label}</span></div>`;
      })
      .join("");
  }

  addComponent(type) {
    if (type === "colorbar_h" || type === "colorbar_v") {
      const hasActiveColorbar = this.checkActiveColorbar();
      if (!hasActiveColorbar) {
        alert(
          "No colorbar is currently active. Please load scalar data to enable colorbars.",
        );
        return;
      }
    }

    const component = {
      type,
      id: Date.now(),
      x: this.canvasWidth / 2,
      y: 50,
      draggable: true,
    };

    if (type === "legend") {
      component.text = "Legend";
      component.fontSize = 16;
      component.color = "#ffffff";
      component.items = [
        "Visual",
        "Somatomotor",
        "Dorsal Attention",
        "Ventral Attention",
        "Limbic",
        "Frontoparietal",
        "Default",
      ];
      component.colors = [
        "#7b1fa2",
        "#4981B5",
        "#43a047",
        "#C639FC",
        "#D3EA9F",
        "#E89423",
        "#CE3F50",
      ];
    } else if (type === "colorbar_h") {
      component.min = 0;
      component.max = 1;
      component.gradient = this.getCurrentColormapGradient();
      component.orientation = "horizontal";
      component.width = 300;
      component.height = 30;
    } else if (type === "colorbar_v") {
      component.min = 0;
      component.max = 1;
      component.gradient = this.getCurrentColormapGradient();
      component.orientation = "vertical";
      component.width = 30;
      component.height = 300;
    }

    this.components.push(component);
    this.updateComponentList();
    this.renderPreview();
  }

  checkActiveColorbar() {
    const containers = document.querySelectorAll(".view-colorbar");
    for (const container of containers) {
      if (container.classList.contains("has-colorbar")) {
        return true;
      }
    }
    return false;
  }

  getCurrentColormapGradient() {
    const currentMap = ScalarColorMapper.colorMap || "Viridis";
    const lut =
      ScalarColorMapper.LUT[currentMap] || ScalarColorMapper.LUT["Viridis"];

    return lut.map(([r, g, b]) => {
      const hex =
        "#" +
        [r, g, b]
          .map((v) =>
            Math.round(v * 255)
              .toString(16)
              .padStart(2, "0"),
          )
          .join("");
      return hex;
    });
  }

  removeComponent(id) {
    this.components = this.components.filter((c) => c.id !== id);
    this.updateComponentList();
    this.renderPreview();
  }

  updateComponentList() {
    const list = document.getElementById("componentList");
    if (!list) return;

    list.innerHTML = this.components
      .map((comp) => {
        const label =
          comp.type === "legend"
            ? `Legend (${comp.items?.length || 0} items)`
            : comp.type === "colorbar_h"
              ? `Colorbar (Horizontal)`
              : `Colorbar (Vertical)`;
        return `
                <div class="component-item" data-id="${comp.id}">
                    <span>${label}</span>
                    <button class="component-remove" data-id="${comp.id}">&times;</button>
                </div>
            `;
      })
      .join("");

    list.querySelectorAll(".component-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.removeComponent(parseInt(btn.dataset.id));
      });
    });
  }

  async renderPreview() {
    if (this.capturedImages.length === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext("2d");

    if (this.bgColor !== "transparent") {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    } else {
      // Transparent background shows checkerboard
      const size = 20;
      for (let x = 0; x < this.canvasWidth; x += size) {
        for (let y = 0; y < this.canvasHeight; y += size) {
          ctx.fillStyle =
            (x / size + y / size) % 2 === 0 ? "#e0e0e0" : "#ffffff";
          ctx.fillRect(x, y, size, size);
        }
      }
    }

    if (this.showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      for (let x = 0; x < this.canvasWidth; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y < this.canvasHeight; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvasWidth, y);
        ctx.stroke();
      }
    }

    for (const img of this.capturedImages) {
      if (img.image) {
        await this.drawImage(ctx, img);
      }
    }

    for (const comp of this.components) {
      this.drawComponent(ctx, comp);
    }

    const container = document.getElementById("previewContainer");
    if (container) {
      container.innerHTML = "";
      const previewClone = document.createElement("canvas");
      previewClone.width = canvas.width;
      previewClone.height = canvas.height;
      previewClone.style.width = "100%";
      previewClone.style.height = "auto";
      previewClone.style.maxWidth = "100%";
      previewClone.style.borderRadius = "8px";
      previewClone.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
      previewClone.style.cursor = "default";

      const pCtx = previewClone.getContext("2d");
      pCtx.drawImage(canvas, 0, 0);

      container.appendChild(previewClone);

      previewClone.addEventListener("mousedown", (e) =>
        this.startDragCanvas(e),
      );
      previewClone.addEventListener("wheel", (e) => this.onWheelResize(e));
      previewClone.addEventListener("mousemove", (e) => this.onMouseMove(e));
      previewClone.addEventListener("mouseleave", () => {
        previewClone.style.cursor = "default";
      });
    }
  }

  onMouseMove(e) {
    const container = document.getElementById("previewContainer");
    if (!container) return;

    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    const rect = container.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check components first
    for (let i = this.components.length - 1; i >= 0; i--) {
      const comp = this.components[i];
      const bounds = this.getComponentBounds(comp);
      if (
        mouseX >= bounds.x &&
        mouseX <= bounds.x + bounds.w &&
        mouseY >= bounds.y &&
        mouseY <= bounds.y + bounds.h
      ) {
        canvas.style.cursor = "grab";
        return;
      }
    }

    // Check images
    for (const img of this.capturedImages) {
      if (
        mouseX >= img.x &&
        mouseX <= img.x + img.width &&
        mouseY >= img.y &&
        mouseY <= img.y + img.height
      ) {
        canvas.style.cursor = "grab";
        return;
      }
    }

    canvas.style.cursor = "default";
  }

  onWheelResize(e) {
    const container = document.getElementById("previewContainer");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    for (const img of this.capturedImages) {
      if (
        mouseX >= img.x &&
        mouseX <= img.x + img.width &&
        mouseY >= img.y &&
        mouseY <= img.y + img.height
      ) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const aspectRatio = img.width / img.height;

        const newWidth = Math.max(
          50,
          Math.min(this.canvasWidth, img.width * factor),
        );
        const newHeight = newWidth / aspectRatio;

        // Zoom centered on mouse position
        const ratio = newWidth / img.width;
        img.x = mouseX - (mouseX - img.x) * ratio;
        img.y = mouseY - (mouseY - img.y) * ratio;
        img.width = newWidth;
        img.height = newHeight;

        this.renderPreview();
        return;
      }
    }
  }

  startDragCanvas(e) {
    const container = document.getElementById("previewContainer");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check components first (drawn on top)
    for (let i = this.components.length - 1; i >= 0; i--) {
      const comp = this.components[i];
      const bounds = this.getComponentBounds(comp);
      if (
        mouseX >= bounds.x &&
        mouseX <= bounds.x + bounds.w &&
        mouseY >= bounds.y &&
        mouseY <= bounds.y + bounds.h
      ) {
        this.dragComponent(comp, e, container, scaleX, scaleY);
        return;
      }
    }

    // Then check images for dragging
    for (const img of this.capturedImages) {
      if (
        mouseX >= img.x &&
        mouseX <= img.x + img.width &&
        mouseY >= img.y &&
        mouseY <= img.y + img.height
      ) {
        this.dragImage(img, e, container, scaleX, scaleY);
        return;
      }
    }
  }

  getComponentBounds(comp) {
    if (comp.type === "legend") {
      const itemHeight = 20;
      const totalHeight = (comp.items?.length || 0) * itemHeight + 20;
      return { x: comp.x - 10, y: comp.y - 10, w: 200, h: totalHeight };
    } else if (comp.type === "colorbar_h") {
      const w = comp.width || 300;
      const h = (comp.height || 30) + 25;
      return { x: comp.x, y: comp.y, w, h };
    } else if (comp.type === "colorbar_v") {
      const w = (comp.width || 30) + 30;
      const h = comp.height || 300;
      return { x: comp.x, y: comp.y, w, h };
    }
    return { x: comp.x, y: comp.y, w: 50, h: 50 };
  }

  dragComponent(comp, e, container, scaleX, scaleY) {
    const canvas = container.querySelector("canvas");
    if (canvas) canvas.style.cursor = "grabbing";
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = comp.x;
    const origY = comp.y;

    const onMove = (e) => {
      const dx = (e.clientX - startX) * scaleX;
      const dy = (e.clientY - startY) * scaleY;
      comp.x = Math.max(0, Math.min(this.canvasWidth, origX + dx));
      comp.y = Math.max(0, Math.min(this.canvasHeight, origY + dy));
      this.renderPreview();
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (canvas) canvas.style.cursor = "default";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  dragImage(img, e, container, scaleX, scaleY) {
    const canvas = container.querySelector("canvas");
    if (canvas) canvas.style.cursor = "grabbing";
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = img.x;
    const origY = img.y;

    // Draw selection border
    const drawSelection = () => {
      const pCtx = canvas.getContext("2d");
      pCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      if (this.bgColor !== "transparent") {
        pCtx.fillStyle = this.bgColor;
        pCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      } else {
        const size = 20;
        for (let x = 0; x < this.canvasWidth; x += size) {
          for (let y = 0; y < this.canvasHeight; y += size) {
            pCtx.fillStyle =
              (x / size + y / size) % 2 === 0 ? "#e0e0e0" : "#ffffff";
            pCtx.fillRect(x, y, size, size);
          }
        }
      }
      if (this.showGrid) {
        pCtx.strokeStyle = "rgba(255,255,255,0.1)";
        pCtx.lineWidth = 1;
        for (let x = 0; x < this.canvasWidth; x += 50) {
          pCtx.beginPath();
          pCtx.moveTo(x, 0);
          pCtx.lineTo(x, this.canvasHeight);
          pCtx.stroke();
        }
        for (let y = 0; y < this.canvasHeight; y += 50) {
          pCtx.beginPath();
          pCtx.moveTo(0, y);
          pCtx.lineTo(this.canvasWidth, y);
          pCtx.stroke();
        }
      }
      for (const i of this.capturedImages) {
        if (i.image) this.drawImage(pCtx, i);
      }
      for (const comp of this.components) {
        this.drawComponent(pCtx, comp);
      }
      pCtx.strokeStyle = "#4a9eff";
      pCtx.lineWidth = 2;
      pCtx.setLineDash([6, 3]);
      pCtx.strokeRect(img.x - 2, img.y - 2, img.width + 4, img.height + 4);
      pCtx.setLineDash([]);
    };

    const onMove = (e) => {
      const dx = (e.clientX - startX) * scaleX;
      const dy = (e.clientY - startY) * scaleY;
      img.x = Math.max(0, Math.min(this.canvasWidth - img.width, origX + dx));
      img.y = Math.max(0, Math.min(this.canvasHeight - img.height, origY + dy));
      drawSelection();
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (canvas) canvas.style.cursor = "default";
      this.renderPreview();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  drawImage(ctx, img) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, img.x, img.y, img.width, img.height);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = img.image;
    });
  }

  drawComponent(ctx, comp) {
    if (comp.type === "legend") {
      const itemHeight = 22;
      const totalHeight = (comp.items?.length || 0) * itemHeight;
      const boxWidth = 200;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(
        comp.x - 10,
        comp.y - 10,
        boxWidth + 20,
        totalHeight + 20,
        8,
      );
      ctx.fill();

      ctx.font = `${comp.fontSize || 14}px Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      (comp.items || []).forEach((item, i) => {
        const y = comp.y + i * itemHeight + itemHeight / 2;
        ctx.fillStyle = comp.colors?.[i] || "#ffffff";
        ctx.beginPath();
        ctx.roundRect(comp.x, y - 7, 14, 14, 3);
        ctx.fill();
        ctx.fillStyle = comp.color || "#ffffff";
        ctx.fillText(item, comp.x + 22, y);
      });
    } else if (comp.type === "colorbar_h") {
      const w = comp.width || 300;
      const h = comp.height || 30;
      const gradient = ctx.createLinearGradient(comp.x, 0, comp.x + w, 0);
      const colors = comp.gradient || [
        "#000080",
        "#0000ff",
        "#00ffff",
        "#ffff00",
        "#ff0000",
        "#800000",
      ];
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(comp.x, comp.y, w, h, 4);
      ctx.fill();

      const isLightBg = this.isLightBackground();
      const textColor = isLightBg ? "#000000" : "#ffffff";
      const tickColor = isLightBg ? "#333333" : "#ffffff";

      ctx.fillStyle = textColor;
      ctx.font = "12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const tickCount = 5;
      for (let i = 0; i <= tickCount; i++) {
        const ratio = i / tickCount;
        const val =
          (comp.min ?? 0) + ratio * ((comp.max ?? 1) - (comp.min ?? 0));
        const x = comp.x + ratio * w;
        ctx.fillText(val.toFixed(2), x, comp.y + h + 4);
        ctx.beginPath();
        ctx.moveTo(x, comp.y + h);
        ctx.lineTo(x, comp.y + h + 3);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (comp.type === "colorbar_v") {
      const w = comp.width || 30;
      const h = comp.height || 300;
      const gradient = ctx.createLinearGradient(0, comp.y + h, 0, comp.y);
      const colors = comp.gradient || [
        "#000080",
        "#0000ff",
        "#00ffff",
        "#ffff00",
        "#ff0000",
        "#800000",
      ];
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(comp.x, comp.y, w, h, 4);
      ctx.fill();

      const isLightBg = this.isLightBackground();
      const textColor = isLightBg ? "#000000" : "#ffffff";
      const tickColor = isLightBg ? "#333333" : "#ffffff";

      ctx.fillStyle = textColor;
      ctx.font = "12px Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const tickCount = 5;
      for (let i = 0; i <= tickCount; i++) {
        const ratio = i / tickCount;
        const val =
          (comp.min ?? 0) + ratio * ((comp.max ?? 1) - (comp.min ?? 0));
        const y = comp.y + h - ratio * h;
        ctx.fillText(val.toFixed(2), comp.x - 6, y);
        ctx.beginPath();
        ctx.moveTo(comp.x, y);
        ctx.lineTo(comp.x - 3, y);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  isLightBackground() {
    if (this.bgColor === "transparent") return true;
    const hex = this.bgColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  async export() {
    if (this.capturedImages.length === 0) {
      alert("Please capture view images first.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext("2d");

    if (this.bgColor !== "transparent") {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    for (const img of this.capturedImages) {
      if (img.image) await this.drawImage(ctx, img);
    }

    for (const comp of this.components) {
      this.drawComponent(ctx, comp);
    }

    if (this.currentFormat === "svg") {
      await this.exportSVG(canvas);
    } else if (this.currentFormat === "jpg") {
      await this.exportRaster(canvas, "image/jpeg", 0.95);
    } else {
      await this.exportRaster(canvas, "image/png");
    }

    this.hide();
  }

  async exportRaster(canvas, mimeType, quality) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality),
    );
    if (!blob) return;

    let finalBlob = blob;
    if (this.currentFormat === "png") {
      finalBlob = await this.injectDPI(blob, this.currentDPI);
    }

    const link = document.createElement("a");
    link.download = `brain_export.${this.currentFormat}`;
    link.href = URL.createObjectURL(finalBlob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async injectDPI(blob, dpi) {
    const buffer = await blob.arrayBuffer();
    const pngBytes = new Uint8Array(buffer);
    const ppm = Math.round(dpi / 0.0254);
    const physChunk = this.createPhysChunk(ppm, ppm);

    const chunkOffset = 8;
    const chunkLength =
      (pngBytes[chunkOffset] << 24) |
      (pngBytes[chunkOffset + 1] << 16) |
      (pngBytes[chunkOffset + 2] << 8) |
      pngBytes[chunkOffset + 3];
    const ihdrEnd = chunkOffset + 4 + 4 + chunkLength + 4;

    return new Blob(
      [pngBytes.slice(0, ihdrEnd), physChunk, pngBytes.slice(ihdrEnd)],
      { type: "image/png" },
    );
  }

  createPhysChunk(ppux, ppuy) {
    const type = new TextEncoder().encode("pHYs");
    const data = new Uint8Array(9);
    const view = new DataView(data.buffer);
    view.setUint32(0, ppux);
    view.setUint32(4, ppuy);
    view.setUint8(8, 1);

    const chunk = new Uint8Array(12 + data.length);
    const chunkView = new DataView(chunk.buffer);
    chunkView.setUint32(0, data.length);
    chunk.set(type, 4);
    chunk.set(data, 8);

    const crc = this.crc32(chunk.slice(4, 8 + data.length));
    chunkView.setUint32(8 + data.length, crc);
    return chunk;
  }

  crc32(data) {
    let crc = ~0;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return ~crc >>> 0;
  }

  async exportSVG(canvas) {
    const svgElements = this.components
      .map((comp) => {
        if (comp.type === "legend") {
          let svg = `<rect x="${comp.x - 10}" y="${comp.y - 10}" width="220" height="${(comp.items?.length || 0) * 22 + 20}" fill="rgba(0,0,0,0.6)" rx="8"/>`;
          (comp.items || []).forEach((item, i) => {
            const y = comp.y + i * 22 + 11;
            svg += `<rect x="${comp.x}" y="${y - 7}" width="14" height="14" fill="${comp.colors?.[i] || "#fff"}" rx="3"/>`;
            svg += `<text x="${comp.x + 22}" y="${y}" font-size="14" fill="#fff" font-family="Arial">${item}</text>`;
          });
          return svg;
        } else if (comp.type === "colorbar_h") {
          const w = comp.width || 300;
          const h = comp.height || 30;
          const stops = (comp.gradient || [])
            .map(
              (c, i, a) =>
                `<stop offset="${(i / (a.length - 1)) * 100}%" stop-color="${c}"/>`,
            )
            .join("");
          const min = comp.min ?? 0;
          const max = comp.max ?? 1;
          const range = max - min;
          const isLightBg = this.isLightBackground();
          const textColor = isLightBg ? "#000000" : "#ffffff";
          const tickColor = isLightBg ? "#333333" : "#ffffff";
          let ticks = "";
          const tickCount = 5;
          for (let i = 0; i <= tickCount; i++) {
            const ratio = i / tickCount;
            const val = (min + ratio * range).toFixed(2);
            const x = comp.x + ratio * w;
            ticks += `<line x1="${x}" y1="${comp.y + h}" x2="${x}" y2="${comp.y + h + 3}" stroke="${tickColor}" stroke-width="1"/>`;
            ticks += `<text x="${x}" y="${comp.y + h + 16}" font-size="12" fill="${textColor}" text-anchor="middle" font-family="Arial">${val}</text>`;
          }
          return `<defs><linearGradient id="cbh" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient></defs>
                    <rect x="${comp.x}" y="${comp.y}" width="${w}" height="${h}" fill="url(#cbh)" rx="4"/>
                    ${ticks}`;
        } else if (comp.type === "colorbar_v") {
          const w = comp.width || 30;
          const h = comp.height || 300;
          const stops = (comp.gradient || [])
            .map(
              (c, i, a) =>
                `<stop offset="${(i / (a.length - 1)) * 100}%" stop-color="${c}"/>`,
            )
            .join("");
          const min = comp.min ?? 0;
          const max = comp.max ?? 1;
          const range = max - min;
          const isLightBg = this.isLightBackground();
          const textColor = isLightBg ? "#000000" : "#ffffff";
          const tickColor = isLightBg ? "#333333" : "#ffffff";
          let ticks = "";
          const tickCount = 5;
          for (let i = 0; i <= tickCount; i++) {
            const ratio = i / tickCount;
            const val = (min + ratio * range).toFixed(2);
            const y = comp.y + h - ratio * h;
            ticks += `<line x1="${comp.x}" y1="${y}" x2="${comp.x - 3}" y2="${y}" stroke="${tickColor}" stroke-width="1"/>`;
            ticks += `<text x="${comp.x - 6}" y="${y}" font-size="12" fill="${textColor}" text-anchor="end" dominant-baseline="middle" font-family="Arial">${val}</text>`;
          }
          return `<defs><linearGradient id="cbv" x1="0" y1="1" x2="0" y2="0">${stops}</linearGradient></defs>
                    <rect x="${comp.x}" y="${comp.y}" width="${w}" height="${h}" fill="url(#cbv)" rx="4"/>
                    ${ticks}`;
        }
        return "";
      })
      .join("\n");

    const bgRect =
      this.bgColor === "transparent"
        ? ""
        : `<rect width="100%" height="100%" fill="${this.bgColor}" />`;

    // 将每张捕获的图片作为独立元素嵌入，方便单独编辑
    const imageElements = this.capturedImages
      .filter((img) => img.image)
      .map((img, i) => {
        return `<image id="brain-view-${i + 1}" x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" href="${img.image}" />`;
      })
      .join("\n    ");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvasWidth}" height="${this.canvasHeight}" viewBox="0 0 ${this.canvasWidth} ${this.canvasHeight}">
    ${bgRect}
    ${imageElements}
    ${svgElements}
</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "brain_export.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  show() {
    if (!this.eventsBound) {
      this.bindEvents();
      this.eventsBound = true;
    }
    this.overlay.style.display = "flex";
    this.panel.style.display = "flex";
    this.isVisible = true;
  }

  hide() {
    this.overlay.style.display = "none";
    this.panel.style.display = "none";
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) this.hide();
    else this.show();
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
