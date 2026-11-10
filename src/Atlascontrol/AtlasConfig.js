/**
 * Central atlas configuration.
 *
 * Every supported atlas (Schaefer, AAL90, HCP360, ...) is described here by
 * a config object that tells the loader where the parcel files live and how
 * to map a file index to a global 1-based parcel ID.
 *
 * Each config exposes:
 *   levels          - available parcel counts
 *   levelPath(level)- base directory for one scale
 *   getCount(level) - parcels per hemisphere
 *   filePattern     - VTK file naming per hemisphere
 *   getGlobalParcelId(i, hemisphere, halfCount) - file index to parcel ID
 *   levelsDetail    - per-level parcel / hemisphere counts
 *
 * Usage:
 *   import ATLAS_CONFIGS, { getAtlasConfig } from './AtlasConfig.js';
 *   const cfg = ATLAS_CONFIGS.schaefer;
 *   const count = cfg.getCount(400);
 */

const ATLAS_CONFIGS = {
  schaefer: {
    id: "schaefer",
    displayName: "Schaefer",

    levels: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],

    hemispheres: ["L", "R"],

    hemisphereNames: {
      L: "left",
      R: "right",
    },

    basePath: "/public/models/atlases/",

    levelPath(level) {
      return `${this.basePath}schaefer${level}/parcels/`;
    },

    getCount(level) {
      return level / 2;
    },

    getGlobalParcelId(i, hemisphere, halfCount) {
      return hemisphere === "L" ? i : halfCount + i;
    },

    filePattern: {
      left(index) {
        return `L_parcel_${index}.vtk`;
      },
      right(index, halfCount) {
        return `R_parcel_${index + halfCount}.vtk`;
      },
    },

    // Parcel files missing from the dataset: skipped without a request.
    missingFiles: {
      1000: ["R_parcel_533.vtk", "R_parcel_903.vtk"],
    },

    makeParcelName(side, index) {
      return `parcel${side}${index}`;
    },

    get totalFiles() {
      return this.levels.reduce((sum, level) => sum + level, 0);
    },

    levelsDetail: {
      100: { parcelCount: 100, leftCount: 50, rightCount: 50 },
      200: { parcelCount: 200, leftCount: 100, rightCount: 100 },
      300: { parcelCount: 300, leftCount: 150, rightCount: 150 },
      400: { parcelCount: 400, leftCount: 200, rightCount: 200 },
      500: { parcelCount: 500, leftCount: 250, rightCount: 250 },
      600: { parcelCount: 600, leftCount: 300, rightCount: 300 },
      700: { parcelCount: 700, leftCount: 350, rightCount: 350 },
      800: { parcelCount: 800, leftCount: 400, rightCount: 400 },
      900: { parcelCount: 900, leftCount: 450, rightCount: 450 },
      1000: { parcelCount: 1000, leftCount: 500, rightCount: 500 },
    },
  },

  aal90: {
    id: "aal90",
    displayName: "AAL90",

    levels: [90],

    hemispheres: ["L", "R"],

    hemisphereNames: {
      L: "left",
      R: "right",
    },

    basePath: "/public/models/atlases/",

    levelPath(level) {
      return `${this.basePath}AAL${level}/parcels/`;
    },

    getCount(level) {
      return 41;
    },

    // VTK file index (0-40) → JSON parcel ID mapping
    // Left hemisphere: skip IDs 71, 73, 75, 77 (volume) and 91+ (cerebellum)
    // Right hemisphere: skip IDs 72, 74, 76, 78 (volume) and 92+ (cerebellum)
    vtkIndexToJsonId: {
      L: [
        1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37,
        39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 79, 81,
        83, 85, 87, 89,
      ],
      R: [
        2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38,
        40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 80, 82,
        84, 86, 88, 90,
      ],
    },

    getGlobalParcelId(i, hemisphere, halfCount) {
      // i is 1-based index (1-41), convert to 0-based for array access
      const vtkIndex = i - 1;
      return this.vtkIndexToJsonId[hemisphere]?.[vtkIndex] ?? i;
    },

    filePattern: {
      left(index) {
        return `L_parcel_${index - 1}.vtk`;
      },
      right(index, halfCount) {
        return `R_parcel_${index - 1}.vtk`;
      },
    },

    makeParcelName(side, index) {
      return `parcel${side}${index}`;
    },

    get totalFiles() {
      return 82;
    },

    levelsDetail: {
      90: { parcelCount: 82, leftCount: 41, rightCount: 41 },
    },
  },

  hcp360: {
    id: "hcp360",
    displayName: "HCP360",

    levels: [360],

    hemispheres: ["L", "R"],

    hemisphereNames: {
      L: "left",
      R: "right",
    },

    basePath: "/public/models/atlases/",

    levelPath(level) {
      return `${this.basePath}HCP${level}/parcels/`;
    },

    getCount(level) {
      return 180;
    },

    getGlobalParcelId(i, hemisphere, halfCount) {
      return hemisphere === "L" ? 180 + i : i;
    },

    filePattern: {
      left(index) {
        return `L_parcel_${180 + index}.vtk`;
      },
      right(index, halfCount) {
        return `R_parcel_${index}.vtk`;
      },
    },

    makeParcelName(side, index) {
      return `parcel${side}${index}`;
    },

    get totalFiles() {
      return 360;
    },

    levelsDetail: {
      360: { parcelCount: 360, leftCount: 180, rightCount: 180 },
    },
  },

  // Add future atlases here, for example:
  // glasser: {
  //     id: 'glasser',
  //     displayName: 'Glasser',
  //     levels: [360],
  //     ...
  // }
};

// Flat index of every config keyed by its id.
const ATLAS_REGISTRY = {};

Object.values(ATLAS_CONFIGS).forEach((config) => {
  ATLAS_REGISTRY[config.id] = config;
});

// Helper accessors over the registry.
function getAvailableAtlasIds() {
  return Object.keys(ATLAS_REGISTRY);
}

function getAtlasConfig(id) {
  return ATLAS_REGISTRY[id] || null;
}

function getLevelDetail(atlasId, level) {
  const config = ATLAS_REGISTRY[atlasId];
  if (!config) return null;
  return config.levelsDetail[level] || null;
}

export {
  ATLAS_CONFIGS,
  ATLAS_REGISTRY,
  getAvailableAtlasIds,
  getAtlasConfig,
  getLevelDetail,
};

export default ATLAS_CONFIGS;