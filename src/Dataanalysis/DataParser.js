import ScalarParser from "./ScalarParser.js";
import TimeSeriesParser from "./TimeSeriesParser.js";
import PartialScalarParser from "./PartialScalarParser.js";
import npyjs from "npyjs";

export default class DataParser {
  static async parse(data, format) {
    switch (format.toLowerCase()) {
      case "txt":

      case "plain":
        return this.parseText(data);

      case "csv":
        return this.parseCSV(data);

      case "npy":
        return await this.parseNPY(data);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  static async tryPartialScalar(data, format) {
    try {
      const result = await PartialScalarParser.parse(data, format);
      if (result && result.isPartial) {
        return result;
      }
    } catch (err) {
      // Check if it's a "no valid ROI data" or "cannot detect atlas" error
      // These mean it IS a partial scalar file but with issues
      if (err.message.includes("ROI") || err.message.includes("atlas")) {
        throw err;
      }
    }
    return null;
  }

  static async parseText(text) {
    // Try partial scalar first
    const partialResult = await this.tryPartialScalar(text, "txt");
    if (partialResult) return partialResult;

    const rows = text
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => v);

    const first = rows[0].split(/[\s,]+/);

    if (first.length === 1) {
      return ScalarParser.parse(text, "txt");
    }

    return TimeSeriesParser.parse(text, "txt");
  }

  static async parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => v);

    if (lines.length === 0) {
      throw new Error("CSV file is empty.");
    }

    const first = lines[0].split(",").map((v) => v.trim());

    // Check if it looks like a partial scalar file (two columns, first row might be header)
    if (first.length === 2) {
      const firstCol = first[0];
      const secondCol = first[1];

      const isFirstColNumber = !Number.isNaN(Number(firstCol));
      const isSecondColNumber = !Number.isNaN(Number(secondCol));

      if (!isFirstColNumber) {
        const partialResult = await this.tryPartialScalar(text, "csv");
        if (partialResult) return partialResult;
      }

      if (isFirstColNumber && isSecondColNumber) {
        return ScalarParser.parse(text, "csv");
      }
    }

    // Try partial scalar for other cases
    const partialResult = await this.tryPartialScalar(text, "csv");
    if (partialResult) return partialResult;

    if (first.length <= 2) {
      return ScalarParser.parse(text, "csv");
    }

    return TimeSeriesParser.parse(text, "csv");
  }

  static async parseNPY(buffer) {
    const npy = new npyjs();

    const result = await npy.load(buffer);

    const shape = result.shape;

    if (shape.length === 1) {
      return ScalarParser.parse(buffer, "npy");
    }

    if (shape.length === 2) {
      return TimeSeriesParser.parse(buffer, "npy");
    }

    throw new Error(`Unsupported NPY shape: ${shape}`);
  }
}
