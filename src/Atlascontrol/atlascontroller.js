import * as THREE from "three";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader.js";
import ParcelInteractionSystem from "../parcel-interaction/ParcelInteractionSystem.js";
import AtlasRepository from "./AtlasRepository.js";
import metadataManager from "../metadatamanagers/metadatamanager.js";
import LabelSystem from "../parcel-interaction/labelSystem.js";
import NetworkFilterManager from "../Network-fliter/NetworkFilterManager.js";
import ColorManager from "../parcel-interaction/ColorManager.js";
import ATLAS_CONFIGS from "./AtlasConfig.js";

window.repo = AtlasRepository;

/**
 * Controller for the Schaefer atlas of one view.
 *
 * Responsibilities:
 *   1. Load parcel VTK files per scale with limited concurrency.
 *   2. Cache geometries in AtlasRepository so views share one load.
 *   3. Build a parcel mesh plus a ghost mesh (visual only) for each parcel.
 *   4. Switch scales, filter by network, and apply colour modes.
 *   5. Reset every parcel and the interaction system to the initial state.
 */
class SchaeferController {
  constructor(scene, camera, renderer, ui = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.ui = ui;
    this.loader = new VTKLoader();

    this.cfg = ATLAS_CONFIGS.schaefer;

    this.renderGroup = new THREE.Group();
    this.scene.add(this.renderGroup);

    this.currentGroup = new THREE.Group();
    this.scene.add(this.currentGroup);
    this.liveGroup = new THREE.Group();
    this.scene.add(this.liveGroup);

    this.loadProgress = {};

    this.levels = this.cfg.levels;

    this.layers = {};
    this.loaded = {};
    this.loading = {};

    this.currentLevel = this.cfg.levels[0];
    this.atlasLevels = this.cfg.levels;

    this.currentIndex = 0;

    this.initialState = { level: this.cfg.levels[0], index: 0 };

    this.loadedFiles = 0;
    this.totalFiles = this.cfg.totalFiles;

    this.activeNetworkFilter = null;

    this.colorMode = "original";
  }

  async loadAtlas(level, count, concurrency = 8) {
    const group = new THREE.Group();
    group.visible = false;
    this.layers[level] = group;
    this.renderGroup.add(group);

    const basePath = this.cfg.levelPath(level);

    const tasks = [];

    for (let i = 1; i <= count; i++) {
      const L = `${basePath}${this.cfg.filePattern.left(i)}`;
      const R = `${basePath}${this.cfg.filePattern.right(i, count)}`;

      tasks.push(() => this.loadParcel(L, i, level, "L", group));
      tasks.push(() => this.loadParcel(R, i, level, "R", group));
    }

    await this.runWithLimit(tasks, concurrency);

    return group;
  }

  async runWithLimit(tasks, limit) {
    const executing = new Set();

    for (const task of tasks) {
      const p = Promise.resolve().then(() => task());
      executing.add(p);

      const clean = () => executing.delete(p);
      p.then(clean).catch(clean);

      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }
  isMissingFile(level, url) {
    const fileName = url.split("/").pop();
    const list = this.cfg.missingFiles?.[level];

    return Array.isArray(list) && list.includes(fileName);
  }

  async loadParcel(url, i, level, hemisphere, group) {
    const key = `${level}_${hemisphere}_${i}`;

    // Known-missing files are skipped without a request but still counted.
    if (this.isMissingFile(level, url)) {
      this.loadedFiles++;

      if (this.isPrimaryView) {
        this.updateLoadingProgress();
      }

      return;
    }

    let geometry;

    // Reuse a cached geometry, await an in-flight load, or start a new one.
    if (AtlasRepository.hasGeometry(key)) {
      geometry = AtlasRepository.getGeometry(key);
    } else if (AtlasRepository.hasLoading(key)) {
      geometry = await AtlasRepository.getLoading(key);
    } else {
      const promise = new Promise((resolve) => {
        this.loader.load(
          url,
          (geo) => {
            geo.rotateX(-Math.PI / 2);

            geo.computeVertexNormals();

            resolve(geo);
          },

          undefined,

          (err) => {
            console.warn("LOAD FAILED", url);

            resolve(null);
          },
        );
      });

      AtlasRepository.setLoading(key, promise);

      geometry = await promise;

      AtlasRepository.clearLoading(key);
      if (geometry) {
        AtlasRepository.setGeometry(key, geometry);
      }
    }

    if (geometry) {
      this.createParcelMesh(geometry, i, level, hemisphere, group);
    }

    this.loadedFiles++;

    if (this.isPrimaryView) {
      this.updateLoadingProgress();
    }
  }
  createParcelMesh(geometry, i, level, hemisphere, group) {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1, 1, 1);

    mesh.frustumCulled = false;
    mesh.renderOrder = 1;

    const halfCount = this.getCount(level);

    const globalParcelId = this.cfg.getGlobalParcelId(i, hemisphere, halfCount);
    const info = metadataManager.getParcelInfo(level, globalParcelId);

    mesh.userData = {
      atlas: this.cfg.id,
      type: "parcel",
      level,
      parcelId: globalParcelId,
      hemisphere: hemisphere === "L" ? "left" : "right",
      networkId: info?.network_id ?? null,
      network: info?.network ?? null,
      isGhost: false,
    };

    if (hemisphere === "L") {
      mesh.name = `parcelL${i}`;
    } else {
      mesh.name = `parcelR${i}`;
    }

    // Ghost mesh: visual only, never participates in interaction.
    const ghostMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      depthTest: true,
    });

    const ghost = new THREE.Mesh(geometry, ghostMaterial);
    ghost.visible = false;
    ghost.raycast = () => {};

    ghost.scale.copy(mesh.scale);

    ghost.frustumCulled = false;
    ghost.renderOrder = 0;

    ghost.userData = {
      level,
      parcelId: i,
      hemisphere: mesh.userData.hemisphere,
      isGhost: true,
      defaultVisible: false,
      visibleByMapping: false,
    };

    // Exclude the ghost from raycasting so picking always hits the parcel.
    ghost.raycast = () => {};

    // Link the parcel and its ghost so visibility can be toggled together.
    mesh.userData.ghost = ghost;
    ghost.userData.source = mesh;

    group.add(mesh);
    group.add(ghost);
  }
  updateLoadingProgress() {
    const panel = document.getElementById("loadingPanel");
    const percentText = document.getElementById("progressPercent");
    const bar = document.getElementById("progressBar");
    const loadingText = document.getElementById("loadingText");

    // Bail out if the progress DOM is not available yet.
    if (!panel || !percentText || !bar) return;

    const percent = Math.floor((this.loadedFiles / this.totalFiles) * 100);

    percentText.innerText = `${percent}%`;
    bar.style.width = `${percent}%`;

    // Only allow the completion branch to run once.
    if (this._loadingFinished) return;

    if (this.loadedFiles >= this.totalFiles) {
      this._loadingFinished = true;

      loadingText.innerText = "Ready";
      bar.style.width = "100%";

      setTimeout(() => {
        panel.style.transition = "all 0.4s ease";
        panel.style.opacity = "0";
        panel.style.transform = "translateX(-50%) translateY(20px)";

        setTimeout(() => {
          panel.style.display = "none";
        }, 400);
      }, 300);
    }
  }
  getCount(level) {
    return this.cfg.getCount(level);
  }

  async ensureLoaded(level, count) {
    if (this.loaded[level] || this.loading[level]) return;

    this.loading[level] = true;

    await this.loadAtlas(level, count, 8);

    this.loaded[level] = true;
    this.loading[level] = false;
  }
  async init() {
    this.cache = {};
    this.currentGroup = new THREE.Group();
    this.scene.add(this.currentGroup);

    const levels = this.cfg.levels;
    const firstLevel = levels[0];
    const firstCount = this.getCount(firstLevel);

    this.loadAtlas(firstLevel, firstCount);
    this.switchLevel(firstLevel);

    if (levels.length > 1) {
      for (let i = 1; i < levels.length; i++) {
        const level = levels[i];
        const count = this.getCount(level);

        setTimeout(() => this.ensureLoaded(level, count), 1000);
      }
    }
  }

  clearCurrentAtlas() {
    while (this.renderGroup.children.length > 0) {
      const child = this.renderGroup.children[0];

      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();

        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      this.renderGroup.remove(child);
    }

    this.layers = {};
    this.loaded = {};
    this.loading = {};

    if (this.interaction) {
      this.interaction.dispose();
      this.interaction = null;
    }
  }

  async switchAtlas(atlasId) {
    const newCfg = ATLAS_CONFIGS[atlasId];

    if (!newCfg) {
      console.error("Unknown atlas:", atlasId);

      return;
    }

    this.clearCurrentAtlas();

    this.cfg = newCfg;
    this.levels = this.cfg.levels;
    this.atlasLevels = this.cfg.levels;
    this.currentLevel = this.cfg.levels[0];
    this.currentIndex = 0;

    this.initialState = {
      level: this.cfg.levels[0],
      index: 0,
    };

    this.loadedFiles = 0;
    this.totalFiles = this.cfg.totalFiles;

    this._loadingFinished = false;
    this.activeNetworkFilter = null;

    this.colorMode = "original";

    await this.init();

    this.initInteraction();
  }
  switchLevel(level) {
    const layer = this.layers[level];
    if (!layer) return;

    for (const l of this.levels) {
      if (this.layers[l]) {
        this.layers[l].visible = false;
      }
    }

    layer.visible = true;

    // Restore the ghost visibility recorded by the cross-scale mapping.
    layer.traverse((obj) => {
      if (obj.userData?.isGhost) {
        obj.visible = obj.userData.visibleByMapping ?? false;
      }
    });
    this.currentLevel = level;

    if (this.interaction) {
      this.interaction.setActiveGroup(layer);
    }

    if (this.colorMode === "network") {
      this._applyColorModeToLayer(layer);
    }

    if (this.activeNetworkFilter !== null) {
      this.filterByNetwork(this.activeNetworkFilter);
    }
  }
  setAtlasIndex(index) {
    index = Math.max(0, Math.min(index, this.atlasLevels.length - 1));

    const level = this.atlasLevels[index];

    // Record the target level, then switch or lazily load it.
    this.targetLevel = level;
    this.currentIndex = index;

    if (this.layers[level]) {
      this.switchLevel(level);
    } else {
      this.ensureLoaded(level, this.getCount(level)).then(() => {
        this.switchLevel(level);
      });
    }
  }
  animate() {
    requestAnimationFrame(() => this.animate());
  }

  initInteraction() {
    this.interaction = new ParcelInteractionSystem(
      this.renderGroup,
      this.camera,
      this.renderer.domElement,
    );
    const layer = this.layers[this.currentLevel];
    if (layer) {
      this.interaction.setActiveGroup(layer);
    }
    // Bind the click behaviour: toggle the parcel, notify the owner, add a label.
    this.interaction.onParcelClick = (parcel) => {
      this.interaction.toggleParcel(parcel);
      if (this.onParcelSelected && parcel) {
        this.onParcelSelected(parcel);
      }
      LabelSystem.createLabelForParcel(parcel, this.renderGroup);
    };
  }
  hideHemisphere(side) {
    const layer = this.layers[this.currentLevel];

    layer.traverse((obj) => {
      if (!obj.userData) return;
      if (obj.userData.isGhost) return;
      if (obj.userData.parcelId === 0) return;
      if (obj.userData.hemisphere !== side) return;

      obj.visible = false;
      if (obj.userData.ghost) {
        obj.userData.ghost.visible = false;
      }
    });

    this.interaction?.setHemisphereVisible(side, false);
  }

  showHemisphere(side) {
    const layer = this.layers[this.currentLevel];

    layer.traverse((obj) => {
      if (!obj.userData) return;
      if (obj.userData.isGhost) return;
      if (obj.userData.parcelId === 0) return;
      if (obj.userData.hemisphere !== side) return;

      obj.visible = true;
      if (obj.userData.ghost) {
        obj.userData.ghost.visible = false;
      }
    });

    this.interaction?.setHemisphereVisible(side, true);
  }
  showAllNetworks() {
    this.activeNetworkFilter = null;

    const layer = this.layers[this.currentLevel];

    layer.traverse((obj) => {
      if (!obj.userData?.parcelId) return;

      if (obj.userData.isGhost) return;

      obj.visible = true;

      if (this.colorMode === "network") {
        this._applyNetworkColorToParcel(obj);
      } else {
        obj.material.vertexColors = true;
        obj.material.color.setHex(0xffffff);
        obj.material.needsUpdate = true;
      }
    });
  }

  setColorMode(mode) {
    if (this.cfg.id !== "hcp360") {
      this.colorMode = "original";
      return;
    }

    if (mode === this.colorMode) return;

    this.colorMode = mode;

    this._applyColorModeToAllLayers();
  }

  _applyColorModeToAllLayers() {
    const mode = this.colorMode;

    Object.values(this.layers).forEach((layer) => {
      if (!layer) return;
      this._applyColorModeToLayer(layer);
    });
  }

  _applyColorModeToLayer(layer) {
    const mode = this.colorMode;

    layer.traverse((obj) => {
      if (!obj.userData?.parcelId || obj.userData.isGhost) return;

      if (mode === "network") {
        this._applyNetworkColorToParcel(obj);
      } else {
        obj.material.vertexColors = true;
        obj.material.color.setHex(0xffffff);
        obj.material.needsUpdate = true;
      }
    });
  }

  _applyNetworkColorToParcel(obj) {
    const level = obj.userData.level;
    const parcelId = obj.userData.parcelId;

    const info = metadataManager.getParcelInfo(level, parcelId);

    if (info && info.yeoColor) {
      const [r, g, b] = info.yeoColor;
      obj.material.vertexColors = false;
      obj.material.color.setRGB(r / 255, g / 255, b / 255);
    } else {
      obj.material.vertexColors = false;
      obj.material.color.setHex(0x999999);
    }

    obj.material.needsUpdate = true;
  }

  resetState() {
    this.currentLevel = this.initialState.level;
    this.currentIndex = this.initialState.index;
    this.targetLevel = null;
  }
  reset() {
    // 1. Restore the initial level and clear the network filter.
    this.resetState();
    this.showAllNetworks();

    // 2. Reset every parcel in all layers to its default transform and colours.
    this.renderGroup.traverse((obj) => {
      if (!obj.userData?.parcelId) return;

      obj.position.set(0, 0, 0);

      obj.visible = true;

      obj.exploded = false;
      obj.extruded = 0;
      obj.prevCenter = null;

      if (obj.material) {
        if (obj.userData?.isGhost) {
          obj.material.opacity = 0.4;

          obj.material.transparent = true;

          obj.material.depthWrite = false;
        } else {
          if (this.colorMode === "network") {
            this._applyNetworkColorToParcel(obj);
          } else {
            obj.material.vertexColors = true;
            obj.material.color.setHex(0xffffff);
          }

          obj.material.opacity = 1;

          obj.material.transparent = false;

          if (obj.material.emissive) {
            obj.material.emissive.setHex(0x000000);
            obj.material.emissiveIntensity = 1;
          }
          obj.material.needsUpdate = true;

          if (obj.geometry && obj.geometry.attributes.color) {
            obj.geometry.attributes.color.needsUpdate = true;
          }
        }
      }

      if (obj.userData?.isGhost) {
        obj.visible = obj.userData.visibleByMapping ?? false;
      } else {
        obj.visible = true;
      }
    });

    this.switchLevel(this.initialState.level);

    // 4. Reset the interaction system.
    if (this.interaction) {
      this.interaction.hovered = null;

      this.interaction.selected = null;

      this.interaction.setActiveGroup(this.layers[this.currentLevel]);
    }

    // 5. Hide the parcel info panel.
    const infoBox = document.getElementById("infoBox");

    if (infoBox) {
      infoBox.style.visibility = "hidden";
    }

    // 6. Reset every scale slider back to the first level.
    for (let i = 1; i <= 6; i++) {
      const slider = document.getElementById(`slider${i}`);

      if (!slider) continue;

      slider.value = 0;

      slider.dispatchEvent(new Event("input"));
    }
  }
}
export default SchaeferController;
