import ScalarApplicator from "./ScalarApplicator.js";
import ScalarColorMapper from "./ScalarColorMapper.js";
import ColorBar from "./canvascolorbar.js";

export default class ScalarRenderer {
  static globalScalarRange = null;

  static render(viewManager, dataManager) {
    if (!dataManager.hasData()) {
      console.warn("No scalar data loaded.");
      return;
    }

    const scalarData = dataManager.getData();

    this.applyScalar(viewManager, dataManager);
    this.updateColors(viewManager, dataManager);
    this.updateLegend(dataManager);

    this.updateColorBar(viewManager, scalarData);
  }

  static applyScalar(viewManager, dataManager) {
    ScalarApplicator.apply(viewManager, dataManager);
  }

  static updateColors(viewManager, dataManager) {
    const scalarData = dataManager.getData();

    for (const view of viewManager.getVisibleViews()) {
      const renderGroup = view.schaefer?.renderGroup;

      if (!renderGroup) continue;

      renderGroup.traverse((object) => {
        if (!object.isMesh) return;

        if (object.userData.type !== "parcel") return;

        if (object.userData.scalar === undefined) return;

        ScalarColorMapper.apply(object, scalarData);
      });
    }
  }

  static computeViewStats(view, originalScalarData) {
    const renderGroup = view.schaefer?.renderGroup;

    if (!renderGroup) return null;

    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    let grayCount = 0;
    let atlas = null;
    let resolution = 0;
    let isPartial = false;

    renderGroup.traverse((object) => {
      if (!object.isMesh) return;

      if (object.userData.type !== "parcel") return;

      if (object.userData.scalar === undefined) return;

      const value = object.userData.scalar;

      if (value === null) {
        grayCount++;
        return;
      }

      if (value < min) min = value;
      if (value > max) max = value;

      count++;

      if (!atlas) atlas = object.userData.atlas;

      if (object.userData.level !== undefined) {
        resolution = object.userData.level;
      }
    });

    if (count === 0 && grayCount === 0) return null;

    if (originalScalarData && originalScalarData.isPartial) {
      isPartial = true;

      min = originalScalarData.min;
      max = originalScalarData.max;
      resolution = originalScalarData.resolution;
      atlas = originalScalarData.atlas;
    }

    return {
      type: isPartial ? "partial-scalar" : "scalar",
      atlas: atlas || "schaefer",
      resolution,
      count: count + grayCount,
      min,
      max,
      values: null,
      isPartial,
      providedCount: count,
      grayCount,
    };
  }

  static updateColorBar(viewManager, scalarData) {
    const containers = document.querySelectorAll(".view-colorbar");

    if (!containers.length) return;

    const views = viewManager.getAllViews();

    const useGlobalRange = this.globalScalarRange !== null;

    containers.forEach((container, index) => {
      const view = views[index];

      if (!view) {
        ColorBar.clear(container);
        return;
      }

      let stats;
      if (useGlobalRange) {
        stats = this.computeViewStats(view, scalarData);
        if (stats) {
          stats.min = this.globalScalarRange.min;
          stats.max = this.globalScalarRange.max;
        }
      } else {
        stats = this.computeViewStats(view, scalarData);
      }

      if (stats) {
        if (useGlobalRange) {
          const originalMode = ScalarColorMapper.colorMode;
          const originalGlobalRange = ScalarColorMapper.globalRange;
          ScalarColorMapper.colorMode = "real";
          ScalarColorMapper.globalRange = this.globalScalarRange;
          ColorBar.render(container, stats, ScalarColorMapper);
          ScalarColorMapper.colorMode = originalMode;
          ScalarColorMapper.globalRange = originalGlobalRange;
        } else {
          ColorBar.render(container, stats, ScalarColorMapper);
        }
        container.classList.add("has-colorbar");
      } else {
        ColorBar.clear(container);
        container.classList.remove("has-colorbar");
      }
    });
  }

  static updateLegend(scalarManager) {
    // Reserved
    // Future:
    //  - Color bar
    //  - Min / Max
    //  - Tick labels
    //  - Current colormap
  }

  static renderFromValues(viewManager, values, metadata = {}) {
    const {
      atlas = "schaefer",
      resolution = values.length,
      min: userMin,
      max: userMax,
    } = metadata;

    let min = userMin ?? Infinity;
    let max = userMax ?? -Infinity;
    if (userMin === undefined || userMax === undefined) {
      for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    const scalarData = {
      type: "scalar",
      atlas,
      resolution,
      count: values.length,
      min,
      max,
      values,
    };

    // Save global range for consistent colorbar
    this.globalScalarRange = { min, max };

    const adapter = {
      hasData: () => true,
      getData: () => scalarData,
      getResolution: () => resolution,
      getValue: (parcelId) => {
        if (parcelId < 1 || parcelId > values.length) return null;
        return values[parcelId - 1];
      },
    };

    ScalarApplicator.apply(viewManager, adapter);
    this.updateColors(viewManager, adapter);
    this.updateColorBar(viewManager, scalarData);
  }

  static clear(viewManager) {
    this.globalScalarRange = null;

    for (const view of viewManager.getVisibleViews()) {
      const renderGroup = view.schaefer?.renderGroup;

      if (!renderGroup) continue;

      renderGroup.traverse((object) => {
        if (!object.isMesh) return;

        if (object.userData.type !== "parcel") return;

        ScalarColorMapper.restore(object);

        delete object.userData.scalar;
      });
    }

    const containers = document.querySelectorAll(".view-colorbar");

    containers.forEach((container) => {
      ColorBar.clear(container);
      container.classList.remove("has-colorbar");
    });
  }
}

export { ScalarColorMapper };
