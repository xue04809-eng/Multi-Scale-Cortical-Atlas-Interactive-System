export default class ScalarManager {
  constructor() {
    this.data = null;
  }

  setData(data) {
    this.data = data;
  }

  getData() {
    return this.data;
  }

  hasData() {
    return this.data !== null;
  }

  clear() {
    this.data = null;
  }

  getValue(parcelId) {
    if (!this.hasData()) {
      return null;
    }

    if (parcelId < 1 || parcelId > this.data.count) {
      return null;
    }

    return this.data.values[parcelId - 1];
  }

  isPartial() {
    return this.hasData() && this.data.isPartial === true;
  }

  getProvidedCount() {
    if (!this.hasData()) return 0;

    if (this.data.isPartial) {
      return this.data.values.filter((v) => v !== null).length;
    }

    return this.data.count;
  }

  getResolution() {
    if (!this.hasData()) {
      return null;
    }

    return this.data.resolution;
  }

  getValues() {
    return this.hasData() ? this.data.values : null;
  }

  getRange() {
    if (!this.hasData()) {
      return null;
    }

    return {
      min: this.data.min,
      max: this.data.max,
    };
  }

  getCount() {
    return this.hasData() ? this.data.count : 0;
  }
}
