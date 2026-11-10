import LABELS from "../parcel-interaction/labelSystem.js";
import ColorManager from "../parcel-interaction/ColorManager.js";

class CrossScaleManager {
  constructor(state) {
    this.state = state;
    this.colorManager = new ColorManager();
    this.labelCache = new Map();
  }

  init(config = {}) {
    this.state = config.state || this.state;
    this.viewManager = config.viewManager;
    this.hierarchy = config.hierarchy;
  }

  async update(sourceMesh, sourceView, targetView) {
    const fromLevel = sourceView.schaefer.currentLevel;

    const toLevel = targetView.schaefer.currentLevel;
    const hemisphere = sourceMesh.userData.hemisphere === "left" ? "L" : "R";

    const id = sourceMesh.userData.parcelId;

    if (!id) return;

    const mapping = await this.state.hierarchy.getOverlap(
      hemisphere,
      fromLevel,
      toLevel,
      id,
    );

    this.state.currentCrossMap = mapping;

    this.applyMappingToView(mapping, sourceMesh, targetView, toLevel);
  }

  applyMappingToView(mapping, sourceMesh, targetView, targetLevel) {
    targetView.schaefer.switchLevel(targetLevel);

    const layer = targetView.schaefer.layers[targetLevel];

    if (!layer) {
      console.warn("Target layer missing:", targetLevel);

      return;
    }

    const colorManager = this.colorManager;

    if (!colorManager) {
      console.error("ColorManager missing in targetView");

      return;
    }

    const side = sourceMesh.userData.hemisphere === "left" ? "L" : "R";

    const halfCount = targetLevel / 2;

    const targetParcels = [];

    mapping.forEach((m) => {
      let name;

      if (side === "L") {
        name = `parcelL${m.target}`;
      } else {
        name = `parcelR${m.target - halfCount}`;
      }
      const parcel = layer.getObjectByName(name);

      if (parcel) {
        targetParcels.push(parcel);

        LABELS.createLabelForParcel(parcel, targetView.scene);
      }
    });

    colorManager.applyHighlightMode(layer, targetParcels);
  }
}

export default CrossScaleManager;
