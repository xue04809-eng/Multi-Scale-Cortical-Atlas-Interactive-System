import ScalarManager from "./ScalarManager.js";
import TimeSeriesManager from "./TimeSeriesManager.js";

export default class DataManager {
  constructor() {
    this.scalarManager = new ScalarManager();

    this.timeSeriesManager = new TimeSeriesManager();

    this.currentType = null;
  }

  load(data) {
    if (!data) throw new Error("Invalid data.");

    switch (data.type) {
      case "scalar":
      case "partial-scalar":
        this.scalarManager.setData(data);

        this.timeSeriesManager.clear();

        this.currentType = data.type;

        break;

      case "timeseries":
        this.timeSeriesManager.load(data);

        this.scalarManager.clear();

        this.currentType = "timeseries";

        break;

      default:
        throw new Error(`Unknown data type: ${data.type}`);
    }
  }

  clear() {
    this.scalarManager.clear();

    this.timeSeriesManager.clear();

    this.currentType = null;
  }

  getType() {
    return this.currentType;
  }

  isScalar() {
    return (
      this.currentType === "scalar" || this.currentType === "partial-scalar"
    );
  }

  isTimeSeries() {
    return this.currentType === "timeseries";
  }

  hasData() {
    return this.currentType !== null;
  }

  getData() {
    if (!this.hasData()) return null;

    if (this.isScalar()) return this.scalarManager.getData();

    return this.timeSeriesManager.data;
  }

  getValue(parcelId) {
    if (!this.hasData()) return null;

    if (this.isScalar()) return this.scalarManager.getValue(parcelId);

    return this.timeSeriesManager.getValue(parcelId);
  }

  getValues() {
    if (!this.hasData()) return null;

    if (this.isScalar()) return this.scalarManager.getValues();

    return this.timeSeriesManager.getCurrentValues();
  }

  getRange() {
    if (!this.hasData()) return null;

    if (this.isScalar()) return this.scalarManager.getRange();

    return {
      min: this.timeSeriesManager.data.min,

      max: this.timeSeriesManager.data.max,
    };
  }

  getAtlas() {
    if (!this.hasData()) return null;

    if (this.isScalar()) return this.scalarManager.getData().atlas;

    return this.timeSeriesManager.data.atlas;
  }

  getResolution() {
    if (!this.hasData()) return null;

    if (this.isScalar()) return this.scalarManager.getResolution();

    return this.timeSeriesManager.data.roiCount;
  }

  getCurrentFrame() {
    if (!this.isTimeSeries()) return 0;

    return this.timeSeriesManager.currentFrame;
  }

  getFrameCount() {
    if (!this.isTimeSeries()) return 1;

    return this.timeSeriesManager.data.frameCount;
  }

  goto(frame) {
    if (!this.isTimeSeries()) return;

    this.timeSeriesManager.goto(frame);
  }

  next() {
    if (!this.isTimeSeries()) return;

    this.timeSeriesManager.next();
  }

  previous() {
    if (!this.isTimeSeries()) return;

    this.timeSeriesManager.previous();
  }

  getScalarManager() {
    return this.scalarManager;
  }

  getTimeSeriesManager() {
    return this.timeSeriesManager;
  }
}
