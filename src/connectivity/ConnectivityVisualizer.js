/**
 * Visualises functional-connectivity results on the parcel meshes.
 *
 * Given a seed parcel and its top-K connections, every view highlights the
 * seed and the connected parcels in their original colours, greys out the
 * remaining ones (opacity controlled by a slider), and labels the relevant
 * parcels. Highlighting is non-destructive: the original material is stashed
 * on the mesh so it can be restored.
 */
import LABELS from "../parcel-interaction/labelSystem.js";

export default class ConnectivityVisualizer {
  constructor(state) {
    this.state = state;

    // Opacity applied to unrelated parcels; fully visible by default.
    this.opacity = 1.0;

    this.currentConnections = [];

    this.currentSeed = null;
  }

  /**
   * Highlight the seed and its connections, grey out everything else,
   * then label the highlighted parcels in every view.
   *
   * seed / targets: original colours
   * others:          grey
   */
  showConnections(connections, seedParcelId, sourceLevel) {
    this.currentConnections = connections;

    this.currentSeed = seedParcelId;

    this.sourceLevel = sourceLevel;

    const connectionIds = new Set(connections.map((c) => c.target));

    this.state.viewManager.getAllViews().forEach((view) => {
      const layer = view.schaefer.layers[sourceLevel];

      if (!layer) return;

      layer.traverse((obj) => {
        if (obj.userData?.type !== "parcel") {
          return;
        }

        const parcelId = obj.userData.parcelId;

        if (parcelId === seedParcelId) {
          this.highlight(obj);

          return;
        }

        if (connectionIds.has(parcelId)) {
          this.highlight(obj);

          return;
        }

        this.gray(obj);
      });
    });

    this.state.viewManager.getAllViews().forEach((view) => {
      const layer = view.schaefer.layers[sourceLevel];

      if (!layer) return;

      LABELS.clearLabels(layer);

      layer.traverse((obj) => {
        if (obj.userData?.type !== "parcel") return;

        const parcelId = obj.userData.parcelId;

        if (parcelId === seedParcelId || connectionIds.has(parcelId)) {
          LABELS.createLabelForParcel(obj, view.scene);
        }
      });
    });
  }

  /**
   * Restore the original material and make the mesh fully opaque.
   */
  highlight(mesh) {
    if (mesh.userData.originalMaterial) {
      mesh.material = mesh.userData.originalMaterial;

      mesh.userData.originalMaterial = null;
    }

    const material = mesh.material;

    if (!material) {
      return;
    }

    material.opacity = 1;

    material.transparent = false;

    material.needsUpdate = true;
  }

  /**
   * Grey out an unrelated parcel. The original material is stashed first
   * so highlight can restore it later.
   */
  gray(mesh) {
    if (!mesh.material) {
      return;
    }

    if (!mesh.userData.originalMaterial) {
      mesh.userData.originalMaterial = mesh.material;
    }

    mesh.material = mesh.material.clone();

    const material = mesh.material;

    // Disable vertex colours so the flat grey actually shows.
    material.vertexColors = false;

    if (material.color) {
      material.color.setHex(0x999999);
    }

    // Transparency is driven by the slider through setOpacity.
    material.transparent = true;

    material.opacity = this.opacity;

    material.needsUpdate = true;
  }

  /**
   * Reset the stored connection state. Mesh colours are restored by the
   * controller's reset, not here.
   */
  clear() {
    this.currentConnections = [];

    this.currentSeed = null;

    if (this.state.viewManager) {
      this.state.viewManager.getAllViews().forEach((view) => {
        LABELS.clearLabels(view.schaefer.renderGroup);
      });
    }
  }

  /**
   * Update the grey opacity and re-apply the current highlight.
   */
  setOpacity(value) {
    this.opacity = Number(value);

    if (this.currentConnections.length > 0) {
      this.showConnections(this.currentConnections, this.currentSeed);
    }
  }
}
