import DataParser from "./DataParser.js";

export default class ScalarDataLoader {
  static async loadAndParse(file) {
    const extension = this.getExtension(file.name);

    let raw;

    switch (extension) {
      case "txt":

      case "csv":

      case "json":
        raw = await this.loadText(file);

        break;

      case "npy":

      case "mat":
        raw = await this.loadBinary(file);

        break;

      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }

    const data = await DataParser.parse(raw, extension);

    return data;
  }

  static load(file) {
    const extension = this.getExtension(file.name);

    switch (extension) {
      case "txt":
      case "csv":
      case "json":
        return this.loadText(file);

      case "npy":
      case "mat":
        return this.loadBinary(file);

      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  static loadText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);

      reader.onerror = () => reject(reader.error);

      reader.readAsText(file);
    });
  }

  static loadBinary(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);

      reader.onerror = () => reject(reader.error);

      reader.readAsArrayBuffer(file);
    });
  }

  static getExtension(filename) {
    return filename.split(".").pop().toLowerCase();
  }
}
