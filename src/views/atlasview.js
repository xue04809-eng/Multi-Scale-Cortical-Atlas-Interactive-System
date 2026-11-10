import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import SchaeferController from "../Atlascontrol/atlascontroller.js";

class AtlasView {
  constructor(container, sliderId = null, bubbleId = null, isPrimary = false) {
    if (!container) {
      throw new Error("AtlasView: container not found");
    }

    this.container = container;
    this.rootContainer = container.parentElement;
    this.isPrimary = isPrimary;

    this.sliderId = sliderId;
    this.bubbleId = bubbleId;

    this.initScene();
    this.initRenderer();
    this.initControls();
    this.init();

    window.addEventListener("resize", () => this.resize());
  }

  async init() {
    await this.initAtlas();

    if (this.sliderId) {
      this.bindAtlasSlider(this.sliderId, this.bubbleId);
    }

    this.animate();
  }

  updateBackground() {
    const dark = document.body.classList.contains("dark");

    this.scene.background = new THREE.Color(dark ? 0x020617 : 0xf5f7fb);
  }
  initScene() {
    this.scene = new THREE.Scene();

    this.updateBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      5000,
    );

    this.camera.position.z = -250;

    this.scene.add(this.camera);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 1);

    this.scene.add(this.ambientLight);

    this.spotLight = new THREE.SpotLight(0xffffff, 1);

    this.spotLight.position.set(0, 1500, 200);

    this.scene.add(this.spotLight);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.enableDamping = true;

    this.controls.dampingFactor = 0.2;

    this.controls.minDistance = 100;

    this.controls.maxDistance = 1000;

    this.controls.addEventListener("change", () => {
      if (this.onCameraChanged) {
        this.onCameraChanged(this);
      }
    });
  }
  updateBubble(index, slider, bubble, levels) {
    if (!bubble) return;

    bubble.innerText = `${levels[index]} parcels`;

    const min = Number(slider.min);
    const max = Number(slider.max);

    const percent = (index - min) / (max - min);

    const sliderLength = slider.offsetWidth;

    const bubbleHeight = bubble.offsetHeight;

    const y = (1 - percent) * sliderLength;

    bubble.style.top = `${y - bubbleHeight / 2}px`;
  }

  bindAtlasSlider(sliderId, bubbleId) {
    const slider = document.getElementById(sliderId);

    const bubble = document.getElementById(bubbleId);

    if (!slider) return;

    const levels = this.getAtlasLevels();

    const initIndex = parseInt(slider.value, 10);

    this.setAtlasIndex(initIndex);

    this.updateBubble(initIndex, slider, bubble, levels);

    slider.addEventListener("input", (e) => {
      const index = parseInt(e.target.value, 10);

      this.setAtlasIndex(index);

      this.updateBubble(index, slider, bubble, levels);
    });
  }

  async initAtlas() {
    this.schaefer = new SchaeferController(
      this.scene,
      this.camera,
      this.renderer,
    );
    if (this.isPrimary) {
      window.activeController = this.schaefer;
    }

    this.schaefer.isPrimaryView = this.isPrimary;
    await this.schaefer.init();

    this.schaefer.initInteraction();
  }
  setAtlasIndex(index) {
    if (!this.schaefer) return;

    this.schaefer.setAtlasIndex(index);
  }
  getAtlasLevels() {
    if (!this.schaefer) return [];

    return this.schaefer.atlasLevels;
  }

  async switchAtlas(atlasId) {
    if (!this.schaefer) return;

    await this.schaefer.switchAtlas(atlasId);

    if (this.sliderId) {
      const slider = document.getElementById(this.sliderId);

      const bubble = document.getElementById(this.bubbleId);
      const atlasControl = slider?.closest(".atlasControl");

      if (slider) {
        const levels = this.getAtlasLevels();

        slider.max = levels.length - 1;

        slider.value = 0;

        this.updateBubble(0, slider, bubble, levels);

        if (levels.length <= 1) {
          if (atlasControl) atlasControl.style.display = "none";
        } else {
          if (atlasControl) atlasControl.style.display = "";
        }
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (typeof TWEEN !== "undefined") {
      TWEEN.update();
    }
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth;

    const h = this.container.clientHeight;

    if (w === 0 || h === 0) return;

    this.camera.aspect = w / h;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    if (this.sliderId && this.bubbleId) {
      const slider = document.getElementById(this.sliderId);

      const bubble = document.getElementById(this.bubbleId);

      const index = parseInt(slider.value, 10);

      this.updateBubble(index, slider, bubble, this.getAtlasLevels());
    }
  }

  fitCameraToView() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const refHeight = window.innerHeight - 60 - 72;
    const refDistance = 250;
    const scale = Math.sqrt(Math.min(w, h) / refHeight);
    const newDistance = Math.max(
      refDistance * scale,
      this.controls.minDistance,
    );
    const dir = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();
    this.camera.position.copy(
      this.controls.target.clone().add(dir.multiplyScalar(newDistance)),
    );
    this.controls.update();
  }
}

export default AtlasView;
