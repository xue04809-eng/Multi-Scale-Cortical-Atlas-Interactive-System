import * as THREE from "three";
export function getCenterPoint(mesh) {
  if (!mesh || !mesh.geometry) {
    return new THREE.Vector3();
  }

  mesh.geometry.computeBoundingBox();

  const center = new THREE.Vector3();

  mesh.geometry.boundingBox.getCenter(center);

  mesh.localToWorld(center);

  return center.clone();
}

export function getCenterOfExplosionR(scene) {
  const centerParcel = scene.getObjectByName("parcelR0");

  if (!centerParcel) {
    return new THREE.Vector3();
  }

  return centerParcel.position.clone();
}

export function getCenterOfExplosionL(scene) {
  const centerParcel = scene.getObjectByName("parcelL0");

  if (!centerParcel) {
    return new THREE.Vector3();
  }

  return centerParcel.position.clone();
}

export function noop() {}

export function moveAlong(object, shape, options) {
  options = _.merge(
    {
      from: 0,
      to: 1,
      duration: 10,
      speed: 50,
      start: true,
      yoyo: false,
      onStart: null,
      onComplete: noop,
      onUpdate: noop,
      smoothness: 100,
      easing: TWEEN.Easing.Quadratic.In,
    },
    options,
  );
  if (shape instanceof THREE.Shape) {
  } else if (Array.isArray(shape)) {
    shape = new THREE.CatmullRomCurve3(shape);
  } else {
    throw new Error("2nd argument is not a Shape, nor an array of vertices");
  }
  options.duration = options.duration || shape.getLength();
  options.length = options.duration * options.speed;
  var tween = new TWEEN.Tween({ distance: options.from })
    .to({ distance: options.to }, options.length)
    .easing(options.easing)
    .onStart(options.onStart)
    .onComplete(options.onComplete)
    .onUpdate(function () {
      var pathPosition = shape.getPointAt(this.distance);
      object.position.set(pathPosition.x, pathPosition.y, pathPosition.z);
      object.updateMatrix();
      if (options.onUpdate) {
        options.onUpdate(this, shape);
      }
    })
    .yoyo(options.yoyo);
  if (options.yoyo) {
    tween.repeat(Infinity);
  }
  if (options.start) {
    tween.start();
  }
  return tween;
}

export function ensureUpdated(object) {
  if (!object || !object.geometry) return;

  object.geometry.attributes.position.needsUpdate = true;
}
