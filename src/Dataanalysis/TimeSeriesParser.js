import npyjs from "npyjs";

export default class TimeSeriesParser {
  static SUPPORTED_LEVELS = [
    82, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 360,
  ];

  static ATLAS_BY_COUNT = {
    82: "aal90",

    360: "hcp360",
  };

  static resolveAtlas(count) {
    if (this.ATLAS_BY_COUNT[count]) return this.ATLAS_BY_COUNT[count];

    if (count >= 100 && count <= 1000) return "schaefer";

    return "unknown";
  }

  static async parse(data, format) {
    switch (format.toLowerCase()) {
      case "txt":
      case "plain":
        return this.parseTXT(data);

      case "csv":
        return this.parseCSV(data);

      case "npy":
        return await this.parseNPY(data);

      case "json":
        return this.parseJSON(data);

      default:
        throw new Error(`Unsupported time-series format: ${format}`);
    }
  }

  static parseTXT(text) {
    const rows = text
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const matrix = rows.map((row) => row.split(/[\s,]+/).map(Number));

    return this.createTimeSeriesData(matrix, {
      format: "txt",
    });
  }

  static parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (lines.length === 0) throw new Error("CSV file is empty.");

    let start = 0;

    let hasHeader = false;

    const first = lines[0].split(",").map((v) => v.trim());

    const test = Number(first[first.length - 1]);

    if (Number.isNaN(test)) {
      hasHeader = true;

      start = 1;
    }

    const matrix = [];

    for (let i = start; i < lines.length; i++) {
      const row = lines[i]
        .split(",")
        .slice(1)
        .map((v) => Number(v.trim()))
        .filter((v) => !Number.isNaN(v));

      if (row.length > 0) matrix.push(row);
    }

    return this.createTimeSeriesData(matrix, {
      format: "csv",
      hasHeader,
    });
  }

  static async parseNPY(buffer) {
    const npy = new npyjs();

    const result = await npy.load(buffer);

    const { data, shape, dtype } = result;

    if (shape.length !== 2) {
      throw new Error(
        `Only 2D NPY arrays are supported. Current shape: [${shape.join(",")}]`,
      );
    }

    const roiCount = shape[0];

    const frameCount = shape[1];

    return this.createTimeSeriesDataFromFlat(data, roiCount, frameCount, {
      format: "npy",
      dtype,
    });
  }

  static parseJSON(text) {
    throw new Error("JSON parser not implemented.");
  }

  static createTimeSeriesData(matrix, metadata = {}) {
    if (!Array.isArray(matrix) || matrix.length === 0)
      throw new Error("Time-series data is empty.");

    const roiCount = matrix.length;

    const frameCount = matrix[0].length;

    const flat = new Float32Array(roiCount * frameCount);

    for (let roi = 0; roi < roiCount; roi++) {
      if (matrix[roi].length !== frameCount)
        throw new Error("Time-series rows have inconsistent length.");

      for (let t = 0; t < frameCount; t++) {
        flat[t * roiCount + roi] = matrix[roi][t];
      }
    }

    return this.createTimeSeriesDataFromFlat(
      flat,
      roiCount,
      frameCount,
      metadata,
    );
  }

  static createTimeSeriesDataFromFlat(
    values,
    roiCount,
    frameCount,
    metadata = {},
  ) {
    this.validate(roiCount, frameCount, values);

    let min = Infinity;

    let max = -Infinity;

    for (const v of values) {
      if (v < min) min = v;

      if (v > max) max = v;
    }

    return {
      type: "timeseries",

      atlas: this.resolveAtlas(roiCount),

      resolution: roiCount,

      roiCount,

      frameCount,

      min,

      max,

      values:
        values instanceof Float32Array ? values : new Float32Array(values),

      metadata,
    };
  }

  static validate(roiCount, frameCount, values) {
    if (!this.SUPPORTED_LEVELS.includes(roiCount)) {
      throw new Error(`Unsupported ROI count: ${roiCount}`);
    }

    if (frameCount <= 0) throw new Error("Invalid frame count.");

    if (values.length !== roiCount * frameCount)
      throw new Error("Invalid time-series size.");

    for (const v of values) {
      if (Number.isNaN(v)) throw new Error("Invalid time-series values.");
    }
  }
}
