export default class FigureLayout {
    constructor() {
        this.layouts = {
            single: { cols: 1, rows: 1, name: "单图" },
            horizontal: { cols: 2, rows: 1, name: "横向双图" },
            vertical: { cols: 1, rows: 2, name: "纵向双图" },
            grid2x2: { cols: 2, rows: 2, name: "2×2 网格" },
            grid3x2: { cols: 3, rows: 2, name: "3×2 网格" },
            grid2x3: { cols: 2, rows: 3, name: "2×3 网格" },
            grid3x3: { cols: 3, rows: 3, name: "3×3 网格" },
        };
        this.currentLayout = "single";
        this.padding = 40;
        this.gap = 20;
    }

    setLayout(layoutName) {
        if (this.layouts[layoutName]) {
            this.currentLayout = layoutName;
        }
    }

    getLayout() {
        return this.layouts[this.currentLayout];
    }

    getLayoutPositions(layoutName, imageCount) {
        const layout = this.layouts[layoutName] || this.layouts.single;
        const { cols, rows } = layout;

        const totalCols = Math.min(cols, imageCount);
        const totalRows = Math.ceil(imageCount / cols);

        const canvasWidth = 1920;
        const canvasHeight = 1080;
        const padding = 40;
        const gap = 20;

        const availableWidth = canvasWidth - padding * 2 - gap * (totalCols - 1);
        const availableHeight = canvasHeight - padding * 2 - gap * (totalRows - 1);

        const cellWidth = availableWidth / totalCols;
        const cellHeight = availableHeight / totalRows;

        const positions = [];
        for (let i = 0; i < imageCount; i++) {
            const col = i % totalCols;
            const row = Math.floor(i / totalCols);

            const x = padding + col * (cellWidth + gap);
            const y = padding + row * (cellHeight + gap);

            positions.push({
                x,
                y,
                width: cellWidth,
                height: cellHeight,
                index: i,
            });
        }

        return positions;
    }

    calculateCellPositions(imageCount, canvasWidth, canvasHeight) {
        const layout = this.getLayout();
        const { cols, rows } = layout;

        const totalCols = Math.min(cols, imageCount);
        const totalRows = Math.ceil(imageCount / cols);

        const availableWidth = canvasWidth - this.padding * 2 - this.gap * (totalCols - 1);
        const availableHeight = canvasHeight - this.padding * 2 - this.gap * (totalRows - 1);

        const cellWidth = availableWidth / totalCols;
        const cellHeight = availableHeight / totalRows;

        const positions = [];
        for (let i = 0; i < imageCount; i++) {
            const col = i % totalCols;
            const row = Math.floor(i / totalCols);

            const x = this.padding + col * (cellWidth + this.gap);
            const y = this.padding + row * (cellHeight + this.gap);

            positions.push({
                x,
                y,
                width: cellWidth,
                height: cellHeight,
                index: i,
            });
        }

        return positions;
    }

    drawGrid(ctx, canvasWidth, canvasHeight) {
        const layout = this.getLayout();
        const { cols, rows } = layout;

        ctx.strokeStyle = "rgba(128, 128, 128, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        for (let i = 1; i < cols; i++) {
            const x = this.padding + i * ((canvasWidth - this.padding * 2) / cols);
            ctx.beginPath();
            ctx.moveTo(x, this.padding);
            ctx.lineTo(x, canvasHeight - this.padding);
            ctx.stroke();
        }

        for (let i = 1; i < rows; i++) {
            const y = this.padding + i * ((canvasHeight - this.padding * 2) / rows);
            ctx.beginPath();
            ctx.moveTo(this.padding, y);
            ctx.lineTo(canvasWidth - this.padding, y);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    drawBackground(ctx, canvasWidth, canvasHeight, bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    drawImage(ctx, imageData, position, options = {}) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const { x, y, width, height } = position;

                if (options.fitMode === "contain") {
                    const scale = Math.min(width / img.width, height / img.height);
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    const drawX = x + (width - drawWidth) / 2;
                    const drawY = y + (height - drawHeight) / 2;
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                } else if (options.fitMode === "cover") {
                    const scale = Math.max(width / img.width, height / img.height);
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    const drawX = x + (width - drawWidth) / 2;
                    const drawY = y + (height - drawHeight) / 2;
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                } else {
                    ctx.drawImage(img, x, y, width, height);
                }

                if (options.label) {
                    this.drawLabel(ctx, options.label, x, y + height, width);
                }

                resolve();
            };
            img.onerror = () => resolve();
            img.src = imageData;
        });
    }

    drawLabel(ctx, text, x, y, width, options = {}) {
        const fontSize = options.fontSize || 16;
        const color = options.color || "#ffffff";
        const bgColor = options.bgColor || "rgba(0, 0, 0, 0.5)";
        const padding = options.padding || 8;

        ctx.font = `${fontSize}px Arial, sans-serif`;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize;

        const boxX = x + (width - textWidth) / 2 - padding;
        const boxY = y + padding;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = textHeight + padding * 2;

        ctx.fillStyle = bgColor;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + width / 2, y + padding + textHeight / 2);
    }

    async renderToCanvas(
        canvas,
        images,
        options = {}
    ) {
        const ctx = canvas.getContext("2d");
        const width = options.width || 1920;
        const height = options.height || 1080;
        const bgColor = options.bgColor || "#020617";

        canvas.width = width;
        canvas.height = height;

        this.drawBackground(ctx, width, height, bgColor);

        const positions = this.calculateCellPositions(images.length, width, height);

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const pos = positions[i];

            await this.drawImage(ctx, img.image, pos, {
                fitMode: options.fitMode || "contain",
                label: img.label || img.id,
                labelColor: options.labelColor,
                labelBgColor: options.labelBgColor,
            });
        }

        if (options.showGrid) {
            this.drawGrid(ctx, width, height);
        }

        return canvas;
    }
}