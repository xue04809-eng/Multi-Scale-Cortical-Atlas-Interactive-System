/**
 * Application entry point for the multi-scale cortical atlas viewer.
 *
 * Responsibilities:
 *   1. Show the landing page, then bootstrap the main Ractive app shell.
 *   2. Create the six WebGL views, the view manager and the camera sync.
 *   3. Instantiate the feature managers: network filter, connectivity,
 *      scalar data, playback, cross-scale mapping, export and idle showcase.
 *   4. Wire UI events: theme, fullscreen, export, import, camera presets, FC.
 *   5. Keep one shared `state` object that every manager reads from.
 */

import * as THREE from "three";

import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import Ractive from "ractive";

import appTemplate from "../UI/UI1.1.js";
import { LandingPage } from "../LandingPage/LandingPage.js";
import "../UI/UI1.0.css";

import {
  topView,
  bottomView,
  leftView,
  rightView,
  frontView,
  backView,
} from "../views/cameraControls.js";

import LABELS from "../parcel-interaction/labelSystem.js";

import HierarchyManager from "../hierarchy/HierarchyManager.js";
import AtlasView from "../views/atlasview.js";
import ViewManager from "../views/viewmanager.js";
import CrossScaleManager from "../Cross-scale/CrossScaleManager.js";
import LightingController from "../views/LightingController.js";
import metadataManager from "../metadatamanagers/metadatamanager.js";
import ExportManager from "../Export/ExportManager.js";
import ExportPanel from "../Export/exporepanel.js";
import NetworkFilterManager from "../Network-fliter/NetworkFilterManager.js";
import ConnectivityManager from "../connectivity/ConnectivityManager.js";
import ConnectivityVisualizer from "../connectivity/ConnectivityVisualizer.js";
import ConnectivityPanel from "../connectivity/ConnectivityPanel.js";
import ScalarDataLoader from "../Dataanalysis/ScalarDataLoader.js";
import ScalarManager from "../Dataanalysis/ScalarManager.js";
import ScalarRenderer from "../Dataanalysis/ScalarRenderer.js";
import ColormapUI from "../Dataanalysis/ColormapUI.js";
import DataFileManager from "../Dataanalysis/DataFileManager.js";
import DataController from "../Dataanalysis/DataController.js";
import TimeSeriesManager from "../Dataanalysis/TimeSeriesManager.js";
import DataManager from "../Dataanalysis/DataManager.js";
import PlaybackManager from "../Dataanalysis/PlaybackManager.js";
import PlaybackBar from "../Dataanalysis/PlaybackBar.js";
import PTSeriesLoader from "../io/PTSeriesLoader.js";
import ParcelSearchUI from "../Search/ParcelSearchUI.js";
import IdleShowcaseManager from "../Idle-show/IdleShowcaseManager.js";

// Shared runtime state, read and mutated by all managers below.
const state = {
  schaefer: null,
  viewManager: null,
  idleShowcaseManager: null,
  networkFilterManager: null,
  connectivity: null,
  connectivityVisualizer: null,
  fcPanel: null,
  scalarManager: null,
  dataManager: null,
  timeSeriesManager: null,
  playbackManager: null,

  raycaster: null,

  manager: null,

  progress: null,
  progressBar: null,

  hierarchy: null,
  currentCrossMap: null,

  mouse: new THREE.Vector2(),

  selected: null,
  SELECTED: null,
  intersected: null,

  interacting: true,
  displayingInfo: false,
  highlightWithColors: false,
  parcelPopout: true,

  currentConnectionParcel: null,
  currentConnectionN: 0,

  resettable: false,
};

var App;

function initRactive() {
  App = new Ractive({
    el: "#app",
    template: appTemplate,
    data: {
      showScalarDrawer: false,
      themeIcon: "🌙",
      currentViewMode: 1,
      parcelId: 0,
      parcelLabel: "",
      parcelDesc: "",
      isNew: "",
      keyStudies: "",
      otherNames: "",
      sections: [],
      keyStudyNames: [],
      keyStudyLinks: [],
      connections: [],

      selectedParcelId: null,
      selectedLevel: null,
      selectedParcelName: "",
      fcKMode: "5",

      fcCustomK: 20,

      fcMaxK: 400,

      fcConnections: [],
    },
    setViewMode: function (count) {
      this.set("currentViewMode", count);

      // Changing the grid needs both a new view count and a layout pass.
      state.viewManager.setViewCount(count);
      state.viewManager.updateLayout();
    },
    changeTheme: function () {
      switchTheme();
    },
    selectSection: function selectSection(i) {
      explodeSections(this.get("sections")[i]);
    },
  });
}

function initLegend() {
  const networks = [
    { id: 1, name: "Visual", color: "#7b1fa2" },
    { id: 2, name: "Somatomotor", color: "#4981B5" },
    { id: 3, name: "Dorsal Attention", color: "#43a047" },
    { id: 4, name: "Ventral Attention", color: "#C639FC" },
    { id: 5, name: "Limbic", color: "#D3EA9F" },
    { id: 6, name: "Frontoparietal", color: "#E89423" },
    { id: 7, name: "Default", color: "#CE3F50" },
  ];

  const legend = document.getElementById("legend");
  legend.innerHTML = `<div class="legend-title">Yeo 7 RSNs:</div>`;

  networks.forEach((net) => {
    const item = document.createElement("div");
    item.className = "legend-item";

    item.dataset.networkId = net.id;

    const color = document.createElement("div");
    color.className = "legend-color";
    color.style.background = net.color;

    const label = document.createElement("span");
    label.innerText = net.name;

    item.appendChild(color);
    item.appendChild(label);

    item.addEventListener("click", () => {
      if (!state.networkFilterManager) return;

      // Clicking the active network clears the filter, otherwise apply it.
      if (state.networkFilterManager.activeNetworkFilter === net.id) {
        state.networkFilterManager.clearFilter();
      } else {
        state.networkFilterManager.applyNetworkFilter(net.id);
      }
    });

    legend.appendChild(item);
  });
}

function setEventListeners() {
  const parcelSearchUI = new ParcelSearchUI(state, setSelectedParcel);
  parcelSearchUI.init();

  // Navigate back to the landing page.
  App.on("goHome", function () {
    showLandingPage();
  });

  // Toggle the light / dark theme.
  App.on("changeTheme", function () {
    switchTheme();
  });

  // Open or close the scalar drawer.
  App.on("toggleScalarDrawer", function () {
    const current = App.get("showScalarDrawer");
    App.set("showScalarDrawer", !current);
    const wrapper = document.getElementById("viewsWrapper");
    if (wrapper) {
      wrapper.classList.toggle("drawer-left-open", !current);
    }
  });
  // Toggle browser fullscreen mode.
  App.on("toggleFullscreen", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      document.body.classList.add("fullscreen");
    } else {
      document.exitFullscreen();
      document.body.classList.remove("fullscreen");
    }
  });
  // Toggle the export panel.
  App.on("exportPanel", function () {
    if (state.exportPanel) {
      state.exportPanel.toggle();
    }
  });

  // Export the current view as a raster image.
  App.on("exportPNG", function () {
    if (state.exportManager) {
      state.exportManager.exportPNG();
    }
  });

  // Export the current view as a vector image.
  App.on("exportSVG", function () {
    if (state.exportManager) {
      state.exportManager.exportSVG();
    }
  });

  // Import a scalar or time-series file chosen by the user.
  App.on("importScalar", function () {
    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".txt,.csv,.json,.npy,.mat,.ptseries.nii";

    input.style.display = "none";

    document.body.appendChild(input);

    input.addEventListener("change", async function (e) {
      const file = e.target.files[0];

      if (!file) {
        document.body.removeChild(input);
        return;
      }

      try {
        let data;

        if (file.name.endsWith(".ptseries.nii")) {
          data = await PTSeriesLoader.load(file);
        } else {
          data = await ScalarDataLoader.loadAndParse(file);
        }

        DataController.importFile(
          state,
          file.name,
          file.name.split(".").pop(),
          data,
        );

        if (data.type === "timeseries") {
          window.renderTimeFrame = (frame) => {
            state.timeSeriesManager.goto(frame);
            DataController.renderTimeSeries(state);
          };

          window.renderTimeFrame(0);
        }
      } catch (err) {
        console.error("Failed to import scalar file:", err);
      } finally {
        document.body.removeChild(input);
      }
    });

    input.click();
  });
  // Clear all parcel labels across every view.
  App.on("toggleLabels", function () {
    state.viewManager.getAllViews().forEach((view) => {
      LABELS.clearLabels(view.schaefer.renderGroup);
    });
  });

  // Switch HCP views between original and Yeo 7-network colors.
  App.on("toggleHCPColorMode", function () {
    const views = state.viewManager.getAllViews();

    const hcpViews = views.filter(
      (view) =>
        view.schaefer && view.schaefer.cfg && view.schaefer.cfg.id === "hcp360",
    );

    if (hcpViews.length === 0) return;

    const isNetworkMode = hcpViews.some(
      (view) => view.schaefer.colorMode === "network",
    );

    const newMode = isNetworkMode ? "original" : "network";

    hcpViews.forEach((view) => {
      view.schaefer.setColorMode(newMode);
    });

    updateHCPColorModeButtonVisibility();
  });

  // Restore every parcel to its original position.
  App.on("resetParcels", function () {
    state.viewManager.getAllViews().forEach((view) => {
      view.schaefer.reset();
    });
  });

  // Atlas selector in the top-left corner of each view.
  for (let i = 1; i <= 6; i++) {
    const viewAtlasSelect = document.getElementById(`viewAtlasSelect${i}`);
    if (viewAtlasSelect) {
      viewAtlasSelect.addEventListener("change", async function () {
        const atlasId = this.value;
        const view = state.viewManager.getView(i - 1);
        if (view) {
          await view.switchAtlas(atlasId);
        }
        updateHCPColorModeButtonVisibility();
      });
    }
  }

  // Camera presets applied to the primary view.
  App.on("topview", function () {
    const view = state.viewManager.getView(0);
    topView(view.camera, view.controls);
  });
  App.on("bottomview", function () {
    const view = state.viewManager.getView(0);
    bottomView(view.camera, view.controls);
  });
  App.on("leftview", function () {
    const view = state.viewManager.getView(0);
    leftView(view.camera, view.controls);
  });
  App.on("rightview", function () {
    const view = state.viewManager.getView(0);
    rightView(view.camera, view.controls);
  });
  App.on("frontview", function () {
    const view = state.viewManager.getView(0);
    frontView(view.camera, view.controls);
  });
  App.on("backview", function () {
    const view = state.viewManager.getView(0);
    backView(view.camera, view.controls);
  });

  // Show the top-K functional connections of the selected parcel.
  App.on("showFC", function () {
    const parcel = state.selectedParcel;
    if (!parcel) {
      console.warn("No parcel selected");
      return;
    }
    let k;
    const mode = App.get("fcKMode");
    if (mode === "custom") {
      k = Number(App.get("fcCustomK"));
    } else {
      k = Number(mode);
    }

    const maxK = Number(App.get("fcMaxK"));
    if (!k || k <= 0) {
      console.warn("Invalid FC K");
      return;
    }
    if (k > maxK) {
      console.warn(`K=${k} exceeds max ${maxK}`);
      k = maxK;
      App.set("fcCustomK", maxK);
    }

    showParcelFC(parcel.parcelId, parcel.level, k);
  });

  // Toggle the export dropdown menu.
  const exportToggleBtn = document.getElementById("exportToggleBtn");
  if (exportToggleBtn) {
    exportToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const dropdown = document.getElementById("exportDropdown");
      if (dropdown) {
        dropdown.classList.toggle("show");
      }
    });
  }

  ColormapUI.init(refreshDataColors);
}

function refreshDataColors() {
  if (state.dataManager && state.dataManager.hasData()) {
    ScalarRenderer.updateColors(state.viewManager, state.dataManager);
    ScalarRenderer.updateColorBar(
      state.viewManager,
      state.dataManager.getData(),
    );
  }
}

if (!WebGL.isWebGLAvailable()) {
  document.body.appendChild(WebGL.getWebGLErrorMessage());
}

function updateHCPColorModeButtonVisibility() {
  const btn = document.getElementById("hcpColorModeBtn");
  if (!btn || !state.viewManager) return;

  const views = state.viewManager.getAllViews();
  const hasHCP = views.some(
    (view) =>
      view.schaefer && view.schaefer.cfg && view.schaefer.cfg.id === "hcp360",
  );

  if (hasHCP) {
    btn.style.display = "";
    const isNetworkMode = views.some(
      (view) =>
        view.schaefer &&
        view.schaefer.cfg.id === "hcp360" &&
        view.schaefer.colorMode === "network",
    );
    if (isNetworkMode) {
      btn.textContent = "Yeo Color";
      btn.classList.add("network-mode");
    } else {
      btn.textContent = "HCP Color";
      btn.classList.remove("network-mode");
    }
  } else {
    btn.style.display = "none";
    btn.textContent = "HCP Color";
    btn.classList.remove("network-mode");
  }
}

function switchTheme() {
  const isDark = document.body.classList.toggle("dark");

  App.set("themeIcon", isDark ? "☀" : "🌙");

  if (!state.viewManager) return;

  state.viewManager.getAllViews().forEach((view) => {
    view.updateBackground();
  });
  LABELS.refreshAllLabels();

  // Refresh colorbar to update text colors for new theme
  if (state.dataManager && state.dataManager.hasData()) {
    ScalarRenderer.updateColorBar(
      state.viewManager,
      state.dataManager.getData(),
    );
  }

  if (state.fcPanel && state.fcPanel.isVisible()) {
    state.fcPanel.refreshChart();
  }
}

// Restore the default parcel colours.
function resetColors() {
  const view = state.viewManager ? state.viewManager.getView(0) : null;
  if (!view || !view.scene) return;

  view.scene.children.forEach((obj) => {
    if (obj.userData?.type === "parcel") {
      if (obj.material) {
        obj.material.emissive.setHex(0x000000);
        obj.material.emissiveIntensity = 0.2;
      }
    }
  });
}

function setSelectedParcel(mesh) {
  const parcelId = mesh.userData?.parcelId;

  const level = mesh.userData?.level;

  if (parcelId == null) return;

  const name = metadataManager.getParcelName(level, parcelId);

  App.set("selectedParcelId", parcelId);

  App.set("selectedLevel", level);
  const maxK = getFCMaxK(level);

  App.set("fcMaxK", maxK);

  // Keep the previous custom K within the new level's range.
  const currentK = Number(App.get("fcCustomK"));

  if (currentK > maxK) {
    App.set("fcCustomK", maxK);
  }

  App.set("selectedParcelName", name);

  state.selectedParcel = {
    parcelId,

    level,

    name,
  };
}
function getFCMaxK(level) {
  if (level == null) {
    return 400;
  }

  let levelNumber;

  // level may be given as a number or as a name such as "schaefer400".
  if (typeof level === "number") {
    levelNumber = level;
  } else if (typeof level === "string") {
    levelNumber = Number(level.replace("schaefer", "").replace("Schaefer", ""));
  } else {
    return 400;
  }

  const availableLevels = [100, 200, 300, 400];

  if (availableLevels.includes(levelNumber)) {
    return levelNumber;
  }

  return 400;
}

async function showParcelFC(parcelId, level, k) {
  const availableLevels = [100, 200, 300, 400];

  // Skip scales that have no functional connectivity matrix.
  if (!availableLevels.includes(Number(level))) {
    console.warn(`FC not supported for Schaefer${level}`);

    return;
  }

  await state.connectivity.loadMatrix(level);

  const result = state.connectivity.getTopConnections(parcelId, k);

  App.set("fcConnections", result);

  state.connectivityVisualizer.showConnections(result, parcelId, level);

  // Attach the short parcel name used by the chart labels.
  const chartConnections = result.map((item) => ({
    ...item,

    name: metadataManager.getParcelShortName(level, item.target),
  }));

  const info = {
    name: metadataManager.getParcelName(level, parcelId),

    network: metadataManager.getNetwork(level, parcelId),

    level,

    connections: chartConnections,
  };

  state.fcPanel.show(info);
}

async function updateConnectivity(parcelId, level) {
  if (!state.connectivity) {
    console.warn("ConnectivityManager not ready");

    return;
  }

  await state.connectivity.loadMatrix(level);

  const connections = state.connectivity.getTopConnections(parcelId, 5);
}
function whiteOutAllParcels() {
  const scene = getMainScene();
  if (!scene) return;
  scene.children.forEach((obj) => {
    if (obj.userData?.type === "parcel") {
      if (obj.material) {
        obj.material.emissive.setHex(0xffffff);
        obj.material.emissiveIntensity = 0.75;
      }
    }
  });
}

function explodeSections(section) {
  const scene = getMainScene();
  if (!scene) return;

  const parcelNames = uniq.filter((name) => scene.getObjectByName(name));

  if (state.highlightWithColors) {
    whiteOutAllParcels();
    PARCEL_CONTROLS.recolourParcelsByName(parcelNames, scene);
  } else {
    PARCEL_CONTROLS.explodeParcelsByName(parcelNames, scene);
  }
}

function explodeConnections(parcelId, numConnections) {
  const scene = getMainScene();
  if (!scene) return;

  const parcelList = connectivityManager.getTopConnections(
    parcelId,
    numConnections,
  );

  if (!atlas || !atlas.config) return;

  const leftCount = atlas.config.leftCount;

  const parcelNames = parcelList.map((item) => {
    const realParcelId = item.target;
  });

  if (state.highlightWithColors) {
    whiteOutAllParcels();
    PARCEL_CONTROLS.recolourParcelsByName(parcelNames, scene);
  } else {
    PARCEL_CONTROLS.explodeParcelsByName(parcelNames, scene);
  }
}
async function getCrossScaleMapping(sourceParcelId, fromLevel, toLevel) {
  const result = await state.hierarchy.getOverlap(
    "L",
    fromLevel,
    toLevel,
    sourceParcelId,
  );

  return result;
}

function pickParcel(event, view) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  state.raycaster.setFromCamera(mouse, view.camera);

  const intersects = state.raycaster.intersectObjects(
    view.scene.children,
    true,
  );

  if (intersects.length > 0) {
    const hit = intersects[0].object;

    if (hit.userData?.type === "parcel") {
      return hit;
    }
  }

  return null;
}

function onDocumentMouseUp() {
  const view = state.viewManager ? state.viewManager.getView(0) : null;
  const scene = view ? view.scene : null;

  if (!scene) {
    console.warn("Scene not ready in onDocumentMouseUp");
    return;
  }

  document.body.style.cursor = "default";

  if (view && view.controls) {
    view.controls.enabled = true;
  }
}
function onDocumentMouseMove(event) {
  const width = window.innerWidth;
  const height = window.innerHeight;
}

function updateBubble(index, slider, bubble, levels) {
  const level = levels[index];
  bubble.innerText = `${level} parcels`;

  const min = +slider.min;
  const max = +slider.max;

  const percent = (index - min) / (max - min);

  const container = document.getElementById("atlasControl");
  const containerRect = container.getBoundingClientRect();

  const height = containerRect.height;

  const y = (1 - percent) * height;

  bubble.style.top = `${y}px`;
}

async function initSchaefer() {
  const view1 = state.viewManager.getView(0);

  const view2 = state.viewManager.getView(1);

  const leftToggle = document.getElementById("leftToggle");
  const rightToggle = document.getElementById("rightToggle");

  leftToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      state.viewManager.getAllViews().forEach((view) => {
        view.schaefer.showHemisphere("left");
      });
    } else {
      state.viewManager.getAllViews().forEach((view) => {
        view.schaefer.hideHemisphere("left");
      });
    }
  });

  rightToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      state.viewManager.getAllViews().forEach((view) => {
        view.schaefer.showHemisphere("right");
      });
    } else {
      state.viewManager.getAllViews().forEach((view) => {
        view.schaefer.hideHemisphere("right");
      });
    }
  });
}

async function loadCurrentAtlasFC() {
  if (atlas.loadFCMatrix) {
    await atlas.loadFCMatrix();
  } else {
    console.warn(` No FC for ${atlas.config.name}`);
  }
}
async function init() {
  initRactive();
  initLegend();

  state.progress = document.createElement("div");
  state.progress.style.width = "200px";
  state.progress.style.height = "10px";
  state.progress.style.background = "#000";
  document.body.appendChild(state.progress);

  state.progressBar = document.createElement("div");
  state.progressBar.style.height = "10px";
  state.progressBar.style.width = "0%";
  state.progressBar.style.background = "blue";
  state.progress.appendChild(state.progressBar);

  state.raycaster = new THREE.Raycaster();

  document.addEventListener("mousemove", onDocumentMouseMove);

  document.addEventListener("mouseup", onDocumentMouseUp);

  animate();

  const viewManager = new ViewManager(document.getElementById("viewsWrapper"));

  const view1 = new AtlasView(
    document.getElementById("view1"),
    "slider1",
    "sliderBubble1",
    true,
  );

  const view2 = new AtlasView(
    document.getElementById("view2"),
    "slider2",
    "sliderBubble2",
    false,
  );

  const view3 = new AtlasView(
    document.getElementById("view3"),
    "slider3",
    "sliderBubble3",
    false,
  );

  const view4 = new AtlasView(
    document.getElementById("view4"),
    "slider4",
    "sliderBubble4",
    false,
  );

  const view5 = new AtlasView(
    document.getElementById("view5"),
    "slider5",
    "sliderBubble5",
    false,
  );

  const view6 = new AtlasView(
    document.getElementById("view6"),
    "slider6",
    "sliderBubble6",
    false,
  );

  viewManager.addView(view1);
  viewManager.addView(view2);
  viewManager.addView(view3);
  viewManager.addView(view4);
  viewManager.addView(view5);
  viewManager.addView(view6);

  window.vm = viewManager;

  state.viewManager = viewManager;
  viewManager.setViewCount(1);

  LightingController.init(state.viewManager);

  window.state = state;

  state.networkFilterManager = new NetworkFilterManager(state);
  state.networkFilterManager.init({
    viewManager: state.viewManager,
  });

  state.connectivity = new ConnectivityManager();

  state.fcPanel = new ConnectivityPanel();

  state.scalarManager = new ScalarManager();

  state.dataManager = new DataManager();

  state.timeSeriesManager = new TimeSeriesManager();

  state.playbackManager = new PlaybackManager(state.timeSeriesManager);

  state.playbackManager.onFrame = ({ frame, frameCount }) => {
    PlaybackBar.updateFrame(frame, frameCount);

    DataController.renderTimeSeries(state);
  };

  PlaybackBar.render({
    onPlay: () => state.playbackManager.play(),
    onPause: () => state.playbackManager.pause(),
    onStop: () => state.playbackManager.stop(),
    onSeek: (p) => state.playbackManager.setProgress(p),
    onFPS: (fps) => state.playbackManager.setFPS(fps),
  });

  state.dataFileManager = new DataFileManager();

  DataController.init(state);

  state.connectivityVisualizer = new ConnectivityVisualizer(state);

  state.hierarchy = new HierarchyManager();
  state.crossScaleManager = new CrossScaleManager(state);

  state.crossScaleManager.init({
    state,
    viewManager: state.viewManager,
    hierarchy: state.hierarchy,
  });

  view1.onCameraChanged = () => {
    state.viewManager.getAllViews().forEach((view) => {
      if (view === view1) return;

      view.camera.position.copy(view1.camera.position);

      view.camera.quaternion.copy(view1.camera.quaternion);

      view.controls.target.copy(view1.controls.target);

      view.controls.update();
    });
  };

  // Bind selection events and create the export / idle-showcase managers.
  viewManager.bindSelectionEvents();

  state.exportManager = new ExportManager(viewManager);

  state.exportPanel = new ExportPanel(viewManager, state.exportManager);

  state.idleShowcaseManager = new IdleShowcaseManager(viewManager);

  viewManager.getAllViews().forEach((view) => {
    const original = view.schaefer.onParcelSelected;
    view.schaefer.onParcelSelected = (parcel) => {
      if (original) original(parcel);
      setSelectedParcel(parcel);
    };
  });

  view2.camera.position.copy(view1.camera.position);

  view2.camera.quaternion.copy(view1.camera.quaternion);

  view2.controls.target.copy(view1.controls.target);

  view2.controls.update();
}

function animate() {
  requestAnimationFrame(animate);

  if (state.idleShowcaseManager) {
    state.idleShowcaseManager.update();
  }
}
// Show the landing page, then rebuild the app when the user starts.
let landingPage;

function showLandingPage() {
  // Tear down the running app before returning to the landing page.
  if (App) {
    App.teardown();
    App = null;
  }

  // Remove all event listeners by reloading the page or recreating
  // For simplicity, we'll just show landing page and re-init on click

  landingPage = new LandingPage({
    onStart: () => {
      landingPage.hide();
      setTimeout(() => {
        landingPage.destroy();
        init();
        setEventListeners();
      }, 500);
    },
  });
  landingPage.init();
  landingPage.show();
}

showLandingPage();

var labelDelay = 0;

// Keep the atlas selector clear of the top bar.
function updateAtlasSelectPosition() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const topbarHeight = topbar.offsetHeight;
  const offset = topbarHeight + 8;

  document.querySelectorAll(".view-atlas-label").forEach((label) => {
    label.style.top = offset + "px";
  });
}

// Recompute on resize and once after the initial layout.
window.addEventListener("resize", updateAtlasSelectPosition);

setTimeout(updateAtlasSelectPosition, 100);

// Close the export dropdown when clicking outside of it.
document.addEventListener("click", function (e) {
  const exportDropdown = document.querySelector(".export-dropdown");

  if (exportDropdown && !exportDropdown.contains(e.target)) {
    exportDropdown.classList.remove("show");
  }
});

export default App;
