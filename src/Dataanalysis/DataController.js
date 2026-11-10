import ScalarDrawer from "./ScalarDrawer.js";
import ScalarRenderer from "./ScalarRenderer.js";

export default class DataController {
  static callbacks = null;

  static init(state) {
    this.callbacks = {
      onSelect: (file) => {
        this.selectFile(state, file.id);
      },

      onDelete: (file) => {
        this.deleteFile(state, file.id);
      },
    };

    this.refreshDrawer(state);
  }

  static refreshDrawer(state) {
    ScalarDrawer.refresh(state.dataFileManager, this.callbacks);
  }

  static importFile(state, name, fileType, data) {
    const file = state.dataFileManager.addFile(name, fileType, data);

    if (data.type === "timeseries") {
      state.timeSeriesManager.load(file.data);

      this.renderTimeSeries(state);

      this.refreshDrawer(state);

      return file;
    }

    state.dataManager.load(file.data);

    ScalarRenderer.render(state.viewManager, state.dataManager);

    this.refreshDrawer(state);

    return file;
  }

  static selectFile(state, fileId) {
    if (!state.dataFileManager.setCurrentFile(fileId)) {
      return;
    }

    const current = state.dataFileManager.getCurrentFile();

    if (!current) return;

    if (current.data.type === "timeseries") {
      state.timeSeriesManager.load(current.data);

      this.renderTimeSeries(state);

      this.refreshDrawer(state);

      return;
    }

    state.dataManager.load(current.data);

    ScalarRenderer.render(state.viewManager, state.dataManager);

    this.refreshDrawer(state);
  }

  static deleteFile(state, fileId) {
    if (!state.dataFileManager.removeFile(fileId)) {
      return;
    }

    const current = state.dataFileManager.getCurrentFile();

    if (current) {
      if (current.data.type === "timeseries") {
        state.timeSeriesManager.load(current.data);

        this.renderTimeSeries(state);
      } else {
        state.dataManager.load(current.data);

        ScalarRenderer.render(state.viewManager, state.dataManager);
      }
    } else {
      state.dataManager.clear();

      state.timeSeriesManager.clear();

      ScalarRenderer.clear(state.viewManager);
    }

    this.refreshDrawer(state);
  }

  static reload(state) {
    const current = state.dataFileManager.getCurrentFile();

    if (!current) return;

    if (current.data.type === "timeseries") {
      this.renderTimeSeries(state);
    } else {
      state.dataManager.load(current.data);

      ScalarRenderer.render(state.viewManager, state.dataManager);
    }
  }

  static renderTimeSeries(state) {
    const values = state.timeSeriesManager.getCurrentValues();

    if (!values) return;

    ScalarRenderer.renderFromValues(state.viewManager, values, {
      atlas: state.timeSeriesManager.data.atlas,
      resolution: state.timeSeriesManager.data.roiCount,
      min: state.timeSeriesManager.data.min,
      max: state.timeSeriesManager.data.max,
    });
  }

  static render(state) {
    ScalarRenderer.render(state.viewManager, state.dataManager);
  }

  static clear(state) {
    state.dataFileManager.clear();

    state.dataManager.clear();

    state.timeSeriesManager.clear();

    ScalarRenderer.clear(state.viewManager);

    this.refreshDrawer(state);
  }
}
