export default class ColorManager {
  constructor() {
    this.layerStates = new Map();
  }

  grayLayer(layer) {
    if (!layer) {
      return;
    }
    layer.children.forEach((parcel) => {
      if (!parcel.isMesh) {
        return;
      }
      parcel.material = parcel.material.clone();
      parcel.material.vertexColors = false;
      parcel.material.color.setHex(0x999999);
      parcel.material.needsUpdate = true;
    });
  }

  highlightParcel(parcel) {
    if (!parcel || !parcel.material) {
      return;
    }
    parcel.material = parcel.material.clone();
    parcel.material.vertexColors = true;
    parcel.material.color.setHex(0xffffff);
    parcel.material.needsUpdate = true;
  }

  applyHighlightMode(layer, targetParcels = []) {
    if (!layer) {
      return;
    }

    this.grayLayer(layer);

    targetParcels.forEach((parcel) => {
      this.highlightParcel(parcel);
    });
  }
}
