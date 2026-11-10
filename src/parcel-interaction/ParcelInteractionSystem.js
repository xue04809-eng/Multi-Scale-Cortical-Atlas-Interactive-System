import * as THREE from "three";
import {
  getCenterPoint,
  getCenterOfExplosionR,
  getCenterOfExplosionL,
  moveAlong,
} from "./three-utils.js";

export default class ParcelInteractionSystem {
  constructor(renderGroup, camera, domElement = document.body) {
    this.renderGroup = renderGroup;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // state
    this.selected = null;
    this.hovered = null;

    this.DEFAULT = true;

    this.LEFT_HIDDEN = false;
    this.RIGHT_HIDDEN = false;
    this.isDragging = false;

    // drag state
    this.drag = {
      line: new THREE.Vector3(),
      position: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      prevY: 0,
      scale: 0.05,
      limit: 20,
    };
    this.hiddenHemisphere = {
      left: false,
      right: false,
    };

    this._bindEvents();
  }
  setActiveGroup(group) {
    this.activeGroup = group;
  }
  setHemisphereVisible(side, visible) {
    this.hiddenHemisphere[side] = !visible;
  }

  _bindEvents() {
    this._onMouseMove = (e) => this.onMouseMove(e);
    this._onMouseDown = (e) => this.onMouseDown(e);
    this._onMouseUp = () => this.onMouseUp();
    this.domElement.addEventListener("mousemove", this._onMouseMove);
    this.domElement.addEventListener("mousedown", this._onMouseDown);
    this.domElement.addEventListener("mouseup", this._onMouseUp);
  }

  _getMouseNDC(event) {
    const rect = this.domElement.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    return this.mouse;
  }

  _raycast(event) {
    const mouse = this._getMouseNDC(event);

    this.raycaster.setFromCamera(mouse, this.camera);

    if (!this.activeGroup) return [];

    const intersects = this.raycaster.intersectObjects(
      this.activeGroup.children,
      true,
    );

    return intersects.filter((hit) => {
      let obj = hit.object;

      if (!obj.visible) return false;

      while (obj && !obj.userData?.parcelId && obj.parent) {
        obj = obj.parent;
      }

      if (!obj) return false;

      if (obj.userData?.isGhost) return false;

      if (obj.userData?.hemisphere === "left" && this.hiddenHemisphere?.left)
        return false;

      if (obj.userData?.hemisphere === "right" && this.hiddenHemisphere?.right)
        return false;

      return true;
    });
  }

  _resolveParcel(obj) {
    while (obj) {
      if (obj.userData?.type === "parcel") {
        return obj;
      }

      obj = obj.parent;
    }

    return null;
  }

  onMouseMove(event) {
    const intersects = this._raycast(event);

    if (intersects.length > 0) {
      const obj = this._resolveParcel(intersects[0].object);

      if (obj !== this.hovered) {
        this._clearHover();

        this.hovered = obj;

        if (obj?.material?.emissive) {
          obj._oldHex = obj.material.emissive.getHex();
          obj.material.emissive.setHex(0x00ffff);
        }

        this.domElement.style.cursor = "pointer";
      }
    } else {
      this._clearHover();
      this.domElement.style.cursor = "default";
    }

    if (this.selected && this.isDragging) {
      this._drag(event);
    }
  }

  _clearHover() {
    if (this.hovered?.material?.emissive) {
      this.hovered.material.emissive.setHex(this.hovered._oldHex || 0x000000);
    }
    this.hovered = null;
  }

  onMouseDown(event) {
    const intersects = this._raycast(event);
    if (!intersects.length) return;

    const obj = this._resolveParcel(intersects[0].object);
    if (!obj) return;

    this.selected = obj;

    if (this.onParcelClick) {
      this.onParcelClick(obj);
    }

    this.drag.prevY = event.clientY;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  toggleParcel(SELECTED) {
    if (!SELECTED) return;

    let centerOfExplosion;
    let centerOfParcel;

    if (SELECTED.userData?.hemisphere === "right") {
      centerOfExplosion = getCenterOfExplosionR(this.renderGroup);
    } else {
      centerOfExplosion = getCenterOfExplosionL(this.renderGroup.parent);
    }

    if (!centerOfExplosion) return;

    const ghost = SELECTED.userData.ghost;

    if (!SELECTED.prevCenter) {
      SELECTED.prevCenter = getCenterPoint(SELECTED);
    }

    if (SELECTED.exploded && SELECTED.extruded === 1) {
      centerOfParcel = SELECTED.position.clone();

      moveAlong(SELECTED, [centerOfParcel, centerOfExplosion.clone()], {});

      SELECTED.exploded = false;
      SELECTED.extruded = 0;

      if (ghost) ghost.visible = false;
    } else if (!SELECTED.extruded || SELECTED.extruded === 0) {
      centerOfParcel = getCenterPoint(SELECTED);

      moveAlong(
        SELECTED,
        [centerOfExplosion.clone(), centerOfParcel.clone()],
        {},
      );

      SELECTED.exploded = true;
      SELECTED.extruded = 1;

      SELECTED.prevCenter = centerOfParcel.clone();

      if (ghost) ghost.visible = true;
    } else {
      centerOfParcel = getCenterPoint(SELECTED);

      moveAlong(
        SELECTED,
        [SELECTED.prevCenter.clone(), centerOfParcel.clone()],
        {},
      );

      SELECTED.prevCenter = centerOfParcel.clone();
      SELECTED.extruded++;

      if (ghost) ghost.visible = true;
    }
  }

  dispose() {
    if (this._onMouseMove) {
      this.domElement.removeEventListener("mousemove", this._onMouseMove);
      this.domElement.removeEventListener("mousedown", this._onMouseDown);
      this.domElement.removeEventListener("mouseup", this._onMouseUp);
    }
    this._clearHover();
    this.hovered = null;
    this.selected = null;
    this.activeGroup = null;
    this.renderGroup = null;
    this.camera = null;
    this.domElement = null;
  }

  _getHemisphereCenter(obj) {
    const scene = this.renderGroup.parent;

    if (obj.userData?.hemisphere === "right") {
      return getCenterOfExplosionR(scene);
    }
    return getCenterOfExplosionL(scene);
  }
}
