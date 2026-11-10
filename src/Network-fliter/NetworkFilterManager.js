/**
 * Manages the Yeo 7-network filter across all views.
 *
 * Selecting a network keeps every parcel visible but highlights the chosen
 * network and greys out the rest. The active filter is mirrored onto each
 * atlas controller so it survives level switches, and clearFilter restores
 * the original colours.
 */
class NetworkFilterManager {
  constructor(state) {
    this.state = state;
    this.activeNetworkFilter = null;
    this.viewManager = null;
  }

  init(config = {}) {
    this.viewManager = config.viewManager;
  }

  applyNetworkFilter(networkId) {
    this.activeNetworkFilter = networkId;

    if (this.viewManager && this.viewManager.views) {
      this.viewManager.views.forEach((view) => {
        if (view.schaefer) {
          this.filterSingleController(view.schaefer, networkId);
        }
      });
    } else if (this.state.schaefer) {
      this.filterSingleController(this.state.schaefer, networkId);
    }
  }

  filterSingleController(controller, networkId) {
    const level = controller.currentLevel;
    const layer = controller.layers[level];

    if (!layer) {
      console.warn(`[NetworkFilter] Layer not ready for level ${level}`);
      return;
    }

    layer.traverse((obj) => {
      // Ghost meshes are visual only, so skip them.
      if (!obj.userData?.parcelId || obj.userData.isGhost) return;

      const isSelectedNetwork = obj.userData.networkId === networkId;

      // Parcels always stay visible; the network is conveyed by colour.
      obj.visible = true;

      if (isSelectedNetwork) {
        // Highlight the selected network.
        obj.material.vertexColors = true;
        obj.material.color.setHex(0xffffff);
        if (obj.material.emissive) {
          obj.material.emissive.setHex(0x222222);
          obj.material.emissiveIntensity = 0.5;
        }
      } else {
        // Grey out every other network.
        obj.material.vertexColors = false;
        obj.material.color.setHex(0x999999);
        if (obj.material.emissive) {
          obj.material.emissive.setHex(0x000000);
          obj.material.emissiveIntensity = 0;
        }
      }

      obj.material.needsUpdate = true;
    });

    // Mirror the filter onto the controller so level switches reapply it.
    controller.activeNetworkFilter = networkId;
  }

  clearFilter() {
    this.activeNetworkFilter = null;

    const targets = [];
    if (this.viewManager && this.viewManager.views) {
      this.viewManager.views.forEach((view) => {
        if (view.schaefer) targets.push(view.schaefer);
      });
    } else if (this.state.schaefer) {
      targets.push(this.state.schaefer);
    }

    targets.forEach((controller) => {
      controller.activeNetworkFilter = null;
      controller.showAllNetworks();
    });
  }
}

export default NetworkFilterManager;
