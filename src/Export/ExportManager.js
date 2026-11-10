export default class ExportManager {
  constructor(viewManager) {
    this.viewManager = viewManager;
  }

  async exportPNG({
    width = null,
    height = null,
    dpi = 300,
    scale = 2,
    cropMode = "view",
    cropRect = null,
    filename = "brain_view.png",
  } = {}) {
    const canvas = this.compositeAllViews({
      width,
      height,
      scale,
    });

    const pngBlob = await this.canvasToPNG(canvas, dpi);

    const link = document.createElement("a");

    link.download = filename;
    link.href = URL.createObjectURL(pngBlob);
    link.click();
  }

  exportSVG() {
    const canvas = this.compositeAllViews();

    const png = canvas.toDataURL("image/png");

    const width = canvas.width;

    const height = canvas.height;

    const isDark = document.body.classList.contains("dark");

    const bgColor = isDark ? "#020617" : "#f5f7fb";

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bgColor}" />
    <image href="${png}" width="${width}" height="${height}" />
</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });

    const link = document.createElement("a");

    link.download = "brain_view.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  compositeAllViews({ scale = 2, width = null, height = null } = {}) {
    const views = this.viewManager.getVisibleViews();

    const wrapper = this.viewManager.rootContainer;

    const rect = wrapper.getBoundingClientRect();

    const outWidth = width ?? rect.width * scale;

    const outHeight = height ?? rect.height * scale;

    const canvas = document.createElement("canvas");

    canvas.width = outWidth;
    canvas.height = outHeight;

    const ctx = canvas.getContext("2d");

    const scaleX = outWidth / rect.width;
    const scaleY = outHeight / rect.height;

    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const saved = views.map((v) => ({
      view: v,
      pixelRatio: v.renderer.getPixelRatio(),
    }));

    views.forEach((view) => {
      view.renderer.setPixelRatio(Math.min(scale, 4));

      view.renderer.setSize(
        view.container.clientWidth,
        view.container.clientHeight,
        false,
      );

      view.renderer.render(view.scene, view.camera);
    });

    views.forEach((view) => {
      const viewRect = view.rootContainer.getBoundingClientRect();

      const x = viewRect.left - rect.left;

      const y = viewRect.top - rect.top;

      ctx.drawImage(
        view.renderer.domElement,
        x,
        y,
        viewRect.width,
        viewRect.height,
      );
    });

    saved.forEach(({ view, pixelRatio }) => {
      view.renderer.setPixelRatio(pixelRatio);

      view.renderer.setSize(
        view.container.clientWidth,
        view.container.clientHeight,
        false,
      );
    });

    return canvas;
  }

  async canvasToPNG(canvas, dpi = 300) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    const buffer = await blob.arrayBuffer();

    const pngBytes = this.injectDPI(new Uint8Array(buffer), dpi);

    return new Blob([pngBytes], { type: "image/png" });
  }

  injectDPI(pngBytes, dpi) {
    const ppm = Math.round(dpi / 0.0254);

    const physChunk = this.createPhysChunk(ppm, ppm);

    return this.insertChunk(pngBytes, physChunk);
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

  insertChunk(pngBytes, chunk) {
    const signature = pngBytes.slice(0, 8);

    let offset = 8;

    const chunkLength =
      (pngBytes[offset] << 24) |
      (pngBytes[offset + 1] << 16) |
      (pngBytes[offset + 2] << 8) |
      pngBytes[offset + 3];

    const ihdrEnd = offset + 4 + 4 + chunkLength + 4;

    const beforeIHDR = pngBytes.slice(0, 8);

    const ihdrChunk = pngBytes.slice(8, ihdrEnd);

    const afterIHDR = pngBytes.slice(ihdrEnd);

    return new Uint8Array([
      ...beforeIHDR,
      ...ihdrChunk,
      ...chunk,
      ...afterIHDR,
    ]);
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
}
