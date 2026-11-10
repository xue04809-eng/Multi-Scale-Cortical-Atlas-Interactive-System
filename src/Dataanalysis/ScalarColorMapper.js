import * as THREE from "three";

export default class ScalarColorMapper {
  static colorMap = "Viridis";

  static colorMode = "auto";

  static fixedRange = { min: 0, max: 1 };

  static globalRange = null;

  static LUT = {
    Viridis: [
      [0.267, 0.004, 0.329],
      [0.283, 0.141, 0.458],
      [0.254, 0.265, 0.53],
      [0.207, 0.372, 0.553],
      [0.164, 0.471, 0.558],
      [0.128, 0.567, 0.551],
      [0.135, 0.659, 0.518],
      [0.267, 0.749, 0.441],
      [0.478, 0.821, 0.318],
      [0.741, 0.873, 0.15],
      [0.993, 0.906, 0.144],
    ],

    Magma: [
      [0.0, 0.0, 0.015],
      [0.136, 0.075, 0.227],
      [0.329, 0.151, 0.386],
      [0.533, 0.218, 0.436],
      [0.741, 0.3, 0.404],
      [0.905, 0.464, 0.298],
      [0.987, 0.69, 0.239],
      [0.987, 0.965, 0.643],
    ],

    Turbo: [
      [0.189, 0.071, 0.232],
      [0.194, 0.255, 0.618],
      [0.146, 0.457, 0.789],
      [0.157, 0.684, 0.68],
      [0.477, 0.821, 0.318],
      [0.812, 0.868, 0.12],
      [0.987, 0.698, 0.149],
      [0.993, 0.393, 0.153],
    ],

    CoolWarm: [
      [0.23, 0.299, 0.754],
      [0.404, 0.534, 0.932],
      [0.603, 0.731, 0.999],
      [0.776, 0.84, 0.946],

      [0.865, 0.865, 0.865],

      [0.939, 0.822, 0.804],
      [0.968, 0.657, 0.537],
      [0.907, 0.459, 0.359],
      [0.706, 0.016, 0.15],
    ],
  };

  static customLUT = {};

  static get COLOR_MAPS() {
    return [...Object.keys(this.LUT), ...Object.keys(this.customLUT)];
  }

  static getAllColorMaps() {
    return this.COLOR_MAPS;
  }

  static setColorMap(name) {
    if (this.LUT[name] || this.customLUT[name]) {
      this.colorMap = name;
    }
  }

  static addCustomColorMap(name, colors) {
    if (!Array.isArray(colors) || colors.length < 2) {
      console.warn("Custom colormap must have at least 2 colors.");
      return false;
    }

    for (const c of colors) {
      if (!Array.isArray(c) || c.length < 3) {
        console.warn("Each color must be an array of [r, g, b].");
        return false;
      }
    }

    this.customLUT[name] = colors;
    return true;
  }

  static createTwoColorGradient(name, color1, color2, steps = 10) {
    if (steps < 2) steps = 2;

    const c1 = color1 instanceof THREE.Color ? color1 : new THREE.Color(color1);
    const c2 = color2 instanceof THREE.Color ? color2 : new THREE.Color(color2);

    const colors = [];

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = c1.r + (c2.r - c1.r) * t;
      const g = c1.g + (c2.g - c1.g) * t;
      const b = c1.b + (c2.b - c1.b) * t;
      colors.push([r, g, b]);
    }

    this.customLUT[name] = colors;
    return true;
  }

  static removeCustomColorMap(name) {
    if (this.customLUT[name]) {
      delete this.customLUT[name];

      if (this.colorMap === name) {
        this.colorMap = "Viridis";
      }

      return true;
    }

    return false;
  }

  static isCustom(name) {
    return name in this.customLUT;
  }

  static hasColorMap(name) {
    return name in this.LUT || name in this.customLUT;
  }

  static setColorMode(mode) {
    if (["auto", "fixed", "real"].includes(mode)) {
      this.colorMode = mode;
    }
  }

  static setGlobalRange(min, max) {
    if (min !== null && max !== null && max > min) {
      this.globalRange = { min, max };
    } else {
      this.globalRange = null;
    }
  }

  static getEffectiveRange(dataMin, dataMax) {
    if (this.colorMode === "fixed") {
      return this.fixedRange;
    }
    if (this.colorMode === "real" && this.globalRange) {
      return this.globalRange;
    }
    return { min: dataMin, max: dataMax };
  }

  static normalize(value, min, max) {
    const effectiveRange = this.getEffectiveRange(min, max);
    const effMin = effectiveRange.min;
    const effMax = effectiveRange.max;

    if (effMax === effMin) {
      return 0.5;
    }
    if (effMax < effMin) {
      return THREE.MathUtils.clamp((value - effMax) / (effMin - effMax), 0, 1);
    }
    return THREE.MathUtils.clamp((value - effMin) / (effMax - effMin), 0, 1);
  }

  static getColor(value, min, max) {
    const t = this.normalize(value, min, max);
    return this.sampleLUT(this.colorMap, t);
  }

  static getColorbarInfo(dataMin, dataMax) {
    if (this.colorMode === "fixed") {
      return {
        min: this.fixedRange.min,
        max: this.fixedRange.max,
        labels: "fixed",
        showNormalized: false,
        showReal: true,
      };
    }
    if (this.colorMode === "real") {
      const range = this.globalRange || { min: dataMin, max: dataMax };
      return {
        min: range.min,
        max: range.max,
        labels: "real",
        showNormalized: false,
        showReal: true,
      };
    }

    return {
      min: dataMin,
      max: dataMax,
      labels: "auto",
      showNormalized: true,
      showReal: true,
    };
  }

  static sampleLUT(name, t) {
    const lut = this.customLUT[name] || this.LUT[name] || this.LUT.Viridis;

    const n = lut.length - 1;
    const x = t * n;
    const i = Math.floor(x);
    const f = x - i;

    const c1 = lut[i];
    const c2 = lut[Math.min(i + 1, n)];

    const r = c1[0] + (c2[0] - c1[0]) * f;
    const g = c1[1] + (c2[1] - c1[1]) * f;
    const b = c1[2] + (c2[2] - c1[2]) * f;

    return new THREE.Color(r, g, b);
  }

  static apply(mesh, scalarData) {
    if (mesh.userData.scalar == null) {
      // Check if this is partial data - apply gray color
      if (scalarData.isPartial) {
        const grayColor = new THREE.Color(0.5, 0.5, 0.5);
        this.setMeshColor(mesh, grayColor);
      }
      return;
    }

    const color = this.getColor(
      mesh.userData.scalar,
      scalarData.min,
      scalarData.max,
    );

    this.setMeshColor(mesh, color);
  }

  static setMeshColor(mesh, color) {
    const geometry = mesh.geometry;

    if (!geometry.userData.originalColors) {
      const original = geometry.getAttribute("color");

      if (original) {
        geometry.userData.originalColors = new Float32Array(original.array);
      }
    }

    const vertexCount = geometry.attributes.position.count;

    let colors = geometry.getAttribute("color");

    if (!colors || colors.count !== vertexCount) {
      colors = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);

      geometry.setAttribute("color", colors);
    }

    const array = colors.array;

    for (let i = 0; i < vertexCount; i++) {
      const j = i * 3;

      array[j] = color.r;
      array[j + 1] = color.g;
      array[j + 2] = color.b;
    }

    colors.needsUpdate = true;
  }

  static restore(mesh) {
    const geometry = mesh.geometry;

    const original = geometry.userData.originalColors;

    if (!original) return;

    let colors = geometry.getAttribute("color");

    if (!colors) {
      colors = new THREE.BufferAttribute(new Float32Array(original.length), 3);

      geometry.setAttribute("color", colors);
    }

    colors.array.set(original);

    colors.needsUpdate = true;
  }
}
