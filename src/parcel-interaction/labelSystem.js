import * as THREE from "three";
import {
  getCenterPoint,
  getCenterOfExplosionR,
  getCenterOfExplosionL,
  noop,
  moveAlong,
  ensureUpdated,
  moveGeomVertex,
} from "../parcel-interaction/three-utils.js";

import metadataManager from "../metadatamanagers/metadatamanager.js";
const LABELS = {
  scene: null,
  NUM_PARCELS: 0,
  activeLabels: new Map(),

  clearLabels: function (scene) {
    const removeList = [];

    scene.traverse((obj) => {
      if (obj.userData?.type === "label") {
        removeList.push(obj);
      }
    });

    removeList.forEach((obj) => {
      if (obj.parent) {
        obj.parent.remove(obj);
      }
    });

    this.activeLabels.clear();
  },

  createLabelForParcel: function (parcel, scene) {
    const parcelId = parcel.userData.parcelId;
    const level = parcel.userData.level;

    const key = `${scene.uuid}_${level}_${parcelId}`;

    if (this.activeLabels.has(key)) {
      return;
    }

    const name = metadataManager.getParcelShortName(level, parcelId);

    const label = this.addLabelTo(parcel, scene, name);

    this.activeLabels.set(key, label);
  },
  createLabelsForParcels: function (parcels, scene) {
    parcels.forEach((parcel) => {
      this.createLabelForParcel(parcel, scene);
    });
  },

  updateLabels: function (scene, camera) {
    scene.traverse((obj) => {
      if (obj.type === "Sprite") {
        obj.quaternion.copy(camera.quaternion);
      }
    });
  },

  getLineStartPointForParcel: function getLineStartPointForParcel(parcel) {
    let minDist = Infinity;
    let labelStartVertexIndex = 0;

    const center = getCenterPoint(parcel);

    const position = parcel.geometry.attributes.position.array;

    const vertexCount = position.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      const vx = position[i * 3];
      const vy = position[i * 3 + 1];
      const vz = position[i * 3 + 2];

      const dx = vx - center.x;
      const dy = vy - center.y;
      const dz = vz - center.z;

      const dist = dx * dx + dy * dy + dz * dz;

      if (dist < minDist) {
        minDist = dist;
        labelStartVertexIndex = i;
      }
    }

    const i = labelStartVertexIndex;

    return new THREE.Vector3(
      position[i * 3],
      position[i * 3 + 1],
      position[i * 3 + 2],
    );
  },
  addLabelTo: function (parcel, scene, name) {
    var lineStart = this.getLineStartPointForParcel(parcel);
    var lineScale = 1.25;
    var material = new THREE.LineBasicMaterial({ color: 0 });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lineStart.x, lineStart.y, lineStart.z),
      new THREE.Vector3(
        lineStart.x * lineScale,
        lineStart.y * lineScale,
        lineStart.z * lineScale,
      ),
    ]);
    var line = new THREE.Line(geometry, material);
    var spritey = this.makeTextSprite(name, {});
    spritey.position.set(
      lineStart.x * lineScale,
      lineStart.y * lineScale,
      lineStart.z * lineScale,
    );
    line.add(spritey);
    line.userData = {
      type: "label",
      parcelId: parcel.userData.parcelId,
      level: parcel.userData.level,
      ownerParcel: parcel,
    };
    parcel.add(line);
    return line;
  },
  makeTextSprite: function makeTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};

    const fontface = parameters.fontface || "Arial";
    const fontsize = parameters.fontsize || 60;
    const padding = parameters.padding || 20;

    // 先创建 context 用于测量文本
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    context.font = "Bold " + fontsize + "px " + fontface;

    // 计算文本宽度
    const textWidth = context.measureText(message).width;

    // 调整 canvas 为 2 的幂
    function nextPowerOf2(x) {
      return Math.pow(2, Math.ceil(Math.log2(x)));
    }

    canvas.width = nextPowerOf2(textWidth + padding * 2);
    canvas.height = nextPowerOf2(fontsize + padding * 2);

    // 重新设置字体（因为 canvas resize 会重置 context）
    context.font = "Bold " + fontsize + "px " + fontface;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // 背景透明
    context.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = document.body.classList.contains("dark");

    // 深色模式下绘制半透明背景 pill，提高白色文字可读性
    if (isDark) {
      const bgX = (canvas.width - textWidth) / 2 - padding * 0.6;
      const bgY = 0;
      const bgW = textWidth + padding * 1.2;
      const bgH = canvas.height;
      const bgR = (fontsize + padding * 2) / 2;
      context.fillStyle = "rgba(0, 0, 0, 0.6)";
      context.strokeStyle = "rgba(255,255,255,0.15)";
      context.lineWidth = 1;
      this.roundRect(context, bgX, bgY, bgW, bgH, bgR);
    }

    // 绘制文字
    context.fillStyle = isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)";
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    // THREE texture
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,

      transparent: true,

      depthTest: false,

      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 999;

    sprite.userData = {
      labelMessage: message,
      labelFontface: fontface,
      labelFontsize: fontsize,
      labelPadding: padding,
      labelTextWidth: textWidth,
    };

    // 保持比例
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(6 * aspect, 6, 1);

    return sprite;
  },
  roundRect: function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  refreshAllLabels: function () {
    const isDark = document.body.classList.contains("dark");
    this.activeLabels.forEach((line) => {
      line.children.forEach((child) => {
        if (
          child.type === "Sprite" &&
          child.material.map &&
          child.userData &&
          child.userData.labelMessage
        ) {
          const canvas = child.material.map.image;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const msg = child.userData.labelMessage;
            const fontface = child.userData.labelFontface;
            const fontsize = child.userData.labelFontsize;
            const padding = child.userData.labelPadding;
            const textWidth = child.userData.labelTextWidth;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "Bold " + fontsize + "px " + fontface;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (isDark) {
              const bgX = (canvas.width - textWidth) / 2 - padding * 0.6;
              const bgY = 0;
              const bgW = textWidth + padding * 1.2;
              const bgH = canvas.height;
              const bgR = (fontsize + padding * 2) / 2;
              ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
              ctx.strokeStyle = "rgba(255,255,255,0.15)";
              ctx.lineWidth = 1;
              this.roundRect(ctx, bgX, bgY, bgW, bgH, bgR);
            }

            ctx.fillStyle = isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)";
            ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
            child.material.map.needsUpdate = true;
          }
        }
      });
    });
  },
};
export default LABELS;
