import * as THREE from "three";
import {
  topView,
  bottomView,
  leftView,
  rightView,
  frontView,
  backView,
} from "../views/cameraControls.js";

export const VIEW_ANGLES = [
  { id: "left", label: "Left", fn: leftView },
  { id: "right", label: "Right", fn: rightView },
  { id: "top", label: "Top", fn: topView },
  { id: "bottom", label: "Bottom", fn: bottomView },
  { id: "front", label: "Front", fn: frontView },
  { id: "back", label: "Back", fn: backView },
];

export default class ViewCapture {
  constructor(viewManager) {
    this.viewManager = viewManager;
    this.selectedViews = new Set(["front"]);
  }

  setSelectedViews(viewIds) {
    this.selectedViews = new Set(viewIds);
  }

  getSelectedViewAngles() {
    return VIEW_ANGLES.filter((v) => this.selectedViews.has(v.id));
  }

  async captureView(view, cameraFn, transparent = true) {
    try {
      const savedPos = view.camera.position.clone();
      const savedQuat = view.camera.quaternion.clone();
      const savedTarget = view.controls.target.clone();
      const savedBg = view.scene.background;
      const savedFov = view.camera.fov;

      cameraFn(view.camera, view.controls);

      // Reduce FOV to make the brain fill more of the frame, and move camera back to avoid clipping
      const fovFactor = 0.5;
      view.camera.fov = savedFov * fovFactor;
      view.camera.updateProjectionMatrix();

      // Move camera back along view direction to compensate for reduced FOV
      const dir = new THREE.Vector3();
      view.camera.getWorldDirection(dir);
      const moveBack =
        view.camera.position.distanceTo(savedTarget) *
        (1 / fovFactor - 1) *
        0.5;
      view.camera.position.add(dir.multiplyScalar(-moveBack));

      const pixelRatio = view.renderer.getPixelRatio();
      view.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 4));
      view.renderer.setSize(
        view.container.clientWidth,
        view.container.clientHeight,
        false,
      );

      if (transparent) {
        view.scene.background = null;
        view.renderer.setClearColor(0x000000, 0);
      }

      view.renderer.render(view.scene, view.camera);

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          view.renderer.render(view.scene, view.camera);
          resolve();
        });
      });

      // Calculate model bounding box and crop
      const bbox = new THREE.Box3();
      view.scene.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          const meshBBox = new THREE.Box3().setFromObject(obj);
          bbox.union(meshBBox);
        }
      });

      const corners = [
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
      ];

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const fullCanvas = view.renderer.domElement;
      const cw = fullCanvas.width;
      const ch = fullCanvas.height;

      corners.forEach((corner) => {
        const projected = corner.clone().project(view.camera);
        const sx = ((projected.x + 1) / 2) * cw;
        const sy = ((-projected.y + 1) / 2) * ch;
        minX = Math.min(minX, sx);
        minY = Math.min(minY, sy);
        maxX = Math.max(maxX, sx);
        maxY = Math.max(maxY, sy);
      });

      // Center on model, use the larger dimension as square size
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const bw = maxX - minX;
      const bh = maxY - minY;
      const size = Math.max(bw, bh) * 1.2; // 20% margin

      const cropX = Math.max(0, centerX - size / 2);
      const cropY = Math.max(0, centerY - size / 2);
      const cropW = Math.min(cw - cropX, size);
      const cropH = Math.min(ch - cropY, size);

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d");
      cropCtx.drawImage(
        fullCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH,
      );

      const imageData = cropCanvas.toDataURL("image/png");

      view.renderer.setPixelRatio(pixelRatio);
      view.renderer.setSize(
        view.container.clientWidth,
        view.container.clientHeight,
        false,
      );

      view.scene.background = savedBg;
      view.camera.fov = savedFov;
      view.camera.updateProjectionMatrix();
      view.camera.position.copy(savedPos);
      view.camera.quaternion.copy(savedQuat);
      view.controls.target.copy(savedTarget);
      view.controls.update();
      view.renderer.render(view.scene, view.camera);

      return {
        image: imageData,
        width: cropCanvas.width,
        height: cropCanvas.height,
        angle: cameraFn.name || "custom",
      };
    } catch (error) {
      console.error("captureView error:", error);
      return null;
    }
  }

  async captureAllSelected(transparent = true) {
    const view = this.viewManager.getView(0);
    if (!view) {
      console.error("No view found");
      return [];
    }

    const results = [];
    const angles = this.getSelectedViewAngles();

    for (const angle of angles) {
      const capture = await this.captureView(view, angle.fn, transparent);
      if (capture) {
        capture.label = angle.label;
        capture.id = angle.id;
        results.push(capture);
      }
    }

    return results;
  }

  async captureCurrentView() {
    const view = this.viewManager.getView(0);
    if (!view) return null;

    try {
      const pixelRatio = view.renderer.getPixelRatio();
      view.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 4));
      view.renderer.setSize(
        view.container.clientWidth,
        view.container.clientHeight,
        false,
      );

      view.renderer.render(view.scene, view.camera);

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          view.renderer.render(view.scene, view.camera);
          resolve();
        });
      });

      const canvas = view.renderer.domElement;
      const imageData = canvas.toDataURL("image/png");

      view.renderer.setPixelRatio(pixelRatio);
      view.renderer.setSize(
        view.container.clientWidth,
        view.container.clientHeight,
        false,
      );

      view.renderer.render(view.scene, view.camera);

      return {
        image: imageData,
        width: canvas.width,
        height: canvas.height,
        label: "Current View",
        id: "current",
      };
    } catch (error) {
      console.error("captureCurrentView error:", error);
      return null;
    }
  }
}
