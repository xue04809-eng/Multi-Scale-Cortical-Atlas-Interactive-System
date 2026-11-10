import FigureLayout from "./figurelayout.js";

export default class FigureEditor {
    constructor() {
        this.layout = new FigureLayout();
        this.canvas = null;
        this.ctx = null;
        this.images = [];
        this.annotations = [];
        this.options = {
            width: 1920,
            height: 1080,
            bgColor: "#020617",
            fitMode: "contain",
            showGrid: false,
            labelColor: "#ffffff",
            labelBgColor: "rgba(0, 0, 0, 0.5)",
        };
    }

    init(container) {
        this.container = container;
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.background = "#1a1a2e";
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
    }

    setOptions(options) {
        this.options = { ...this.options, ...options };
    }

    setImages(images) {
        this.images = images;
    }

    addAnnotation(annotation) {
        this.annotations.push(annotation);
    }

    clearAnnotations() {
        this.annotations = [];
    }

    async render() {
        if (!this.canvas) {
            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;

        await this.layout.renderToCanvas(
            this.canvas,
            this.images,
            this.options
        );

        this.drawAnnotations();
    }

    drawAnnotations() {
        if (!this.ctx || this.annotations.length === 0) return;

        const ctx = this.ctx;

        this.annotations.forEach((annotation) => {
            if (annotation.type === "text") {
                ctx.font = `${annotation.fontSize || 24}px Arial, sans-serif`;
                ctx.fillStyle = annotation.color || "#ffffff";
                ctx.textAlign = annotation.align || "center";
                ctx.textBaseline = annotation.baseline || "middle";
                ctx.fillText(
                    annotation.text,
                    annotation.x,
                    annotation.y
                );
            } else if (annotation.type === "rect") {
                ctx.strokeStyle = annotation.color || "#ffffff";
                ctx.lineWidth = annotation.lineWidth || 2;
                ctx.strokeRect(
                    annotation.x,
                    annotation.y,
                    annotation.width,
                    annotation.height
                );
            } else if (annotation.type === "line") {
                ctx.strokeStyle = annotation.color || "#ffffff";
                ctx.lineWidth = annotation.lineWidth || 2;
                ctx.beginPath();
                ctx.moveTo(annotation.x1, annotation.y1);
                ctx.lineTo(annotation.x2, annotation.y2);
                ctx.stroke();
            }
        });
    }

    getCanvas() {
        return this.canvas;
    }

    async toBlob(format = "image/png", quality = 0.95) {
        if (!this.canvas) return null;

        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, format, quality);
        });
    }

    async toDataURL(format = "image/png", quality = 0.95) {
        if (!this.canvas) return null;
        return this.canvas.toDataURL(format, quality);
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}