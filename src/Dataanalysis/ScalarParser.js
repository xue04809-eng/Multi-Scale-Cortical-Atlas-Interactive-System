import npyjs from "npyjs";

export default class ScalarParser {
  static SUPPORTED_LEVELS = [
    82, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 360,
  ];

  static ATLAS_BY_COUNT = {
    82: "aal90",
    360: "hcp360",
  };

  static resolveAtlas(count) {
    if (this.ATLAS_BY_COUNT[count]) return this.ATLAS_BY_COUNT[count];
    // Schaefer levels: 100–1000
    if (count >= 100 && count <= 1000) return "schaefer";
    return "unknown";
  }

  static async parse(data, format) {
    switch (format.toLowerCase()) {
      case "txt":
      case "plain":
        return this.parsePlainText(data);

      case "csv":
        return this.parseCSV(data);

      case "json":
        return this.parseJSON(data);

      case "npy":
        return await this.parseNPY(data);

      case "mat":
        return await this.parseMAT(data);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  static parsePlainText(text) {
    const values = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(Number);

    return this.createScalarData(values);
  }

  static parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new Error("CSV file is empty.");
    }

    const values = [];
    let hasHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(",").map((v) => v.trim());

      if (i === 0) {
        const last = Number(cols[cols.length - 1]);
        if (Number.isNaN(last)) {
          hasHeader = true;
          continue;
        }
      }

      const value = Number(cols[cols.length - 1]);
      if (Number.isNaN(value)) continue;

      values.push(value);
    }

    return this.createScalarData(values, {
      format: "csv",
      hasHeader,
      indexed: lines[0]?.split(",").length >= 2,
    });
  }

  static parseJSON(text) {
    throw new Error("JSON parser not implemented.");
  }

  static async parseNPY(buffer) {
    const npy = new npyjs();

    const result = await npy.load(buffer);

    const { data, shape, dtype } = result;

    if (shape.length !== 1) {
      throw new Error(
        `Only 1D NPY arrays are supported. Current shape: [${shape.join(", ")}]`,
      );
    }

    const values = Array.from(data);

    return this.createScalarData(values);
  }

  static async parseMAT(buffer) {
    throw new Error("MAT parser not implemented.");
  }

  static createScalarData(values, metadata = {}) {
    this.validate(values);

    return {
      type: "scalar",
      atlas: this.resolveAtlas(values.length),
      resolution: values.length,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      values,
      metadata,
    };
  }

  static validate(values) {
    if (!Array.isArray(values))
      throw new Error("Scalar values must be an array.");

    if (values.length === 0) throw new Error("Scalar file is empty.");

    if (values.some(Number.isNaN)) throw new Error("Invalid scalar values.");

    if (!this.SUPPORTED_LEVELS.includes(values.length))
      throw new Error(`Unsupported parcel count: ${values.length}`);
  }
}
