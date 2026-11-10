
export function topView(camera, controls) {
  camera.position.set(0, 250, 0);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

export function bottomView(camera, controls) {
  camera.position.set(0, -250, 0);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

export function leftView(camera, controls) {
  camera.position.set(-250, 0, 0);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

export function rightView(camera, controls) {
  camera.position.set(250, 0, 0);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

export function frontView(camera, controls) {
  camera.position.set(0, 0, -250);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

export function backView(camera, controls) {
  camera.position.set(0, 0, 250);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}