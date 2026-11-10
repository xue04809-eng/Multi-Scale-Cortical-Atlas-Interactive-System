/**
 * Central access point for atlas parcel metadata.
 *
 * Every supported scale (Schaefer 100-1000, AAL90, HCP360) has a JSON table
 * keyed by parcel id. This singleton exposes lookups by id, by section,
 * by free-text search, plus a few normalised accessors (name, network) that
 * hide the fact that the different atlases use different field names.
 *
 * Keys are looked up both as numbers and strings, because the JSON tables
 * mix both forms.
 */

import info100 from "../atlas/schaefer100/schaefer100_info.json";
import info200 from "../atlas/schaefer200/schaefer200_info.json";
import info300 from "../atlas/schaefer300/schaefer300_info.json";
import info400 from "../atlas/schaefer400/schaefer400_info.json";
import info500 from "../atlas/schaefer500/schaefer500_info.json";
import info600 from "../atlas/schaefer600/schaefer600_info.json";
import info700 from "../atlas/schaefer700/schaefer700_info.json";
import info800 from "../atlas/schaefer800/schaefer800_info.json";
import info900 from "../atlas/schaefer900/schaefer900_info.json";
import info1000 from "../atlas/schaefer1000/schaefer1000_info.json";
import aal90 from "../../dist/public/models/atlases/AAL90/AALinfo1.json";
import hcp360 from "../../dist/public/models/atlases/HCP360/hcp360_info.json";

class MetadataManager {
  constructor() {
    this.metadata = {
      100: info100,
      200: info200,
      300: info300,
      400: info400,
      500: info500,
      600: info600,
      700: info700,
      800: info800,
      900: info900,
      1000: info1000,
      90: aal90,
      360: hcp360,
    };
  }

  getAtlas(level) {
    const atlas = this.metadata[level];

    if (!atlas) {
      console.warn(`[MetadataManager] Atlas ${level} not found`);

      return null;
    }

    return atlas;
  }

  getParcelInfo(level, parcelId) {
    const atlas = this.getAtlas(level);

    if (!atlas) return null;

    const info = atlas[parcelId] || atlas[String(parcelId)];

    if (!info) {
      console.warn(
        `[MetadataManager] Parcel ${parcelId} not found in ${level}`,
      );

      return null;
    }

    return info;
  }

  hasMesh(level, parcelId) {
    const info = this.getParcelInfo(level, parcelId);

    if (!info) return false;

    return info.mesh === "surface";
  }

  getParcelName(level, parcelId) {
    const info = this.getParcelInfo(level, parcelId);

    if (!info) {
      return `Parcel ${parcelId}`;
    }

    return (
      info.label ||
      info.Label ||
      info.fullLabel ||
      info.shortLabel ||
      info.name ||
      info.Name ||
      `Parcel ${parcelId}`
    );
  }

  getParcelShortName(level, parcelId) {
    const info = this.getParcelInfo(level, parcelId);

    if (!info) {
      return `Parcel ${parcelId}`;
    }

    return info.shortLabel || info.label;
  }

  getParcelsForSection(level, section) {
    const atlas = this.getAtlas(level);

    if (!atlas) return [];

    const result = [];

    Object.entries(atlas).forEach(([parcelId, info]) => {
      const sections = info.Sections || [];

      const sectionArray = Array.isArray(sections)
        ? sections
        : sections.toString().split(",").map(Number);

      if (sectionArray.includes(section)) {
        result.push(Number(parcelId));
      }
    });

    return result;
  }

  searchParcel(level, keyword) {
    const atlas = this.getAtlas(level);

    if (!atlas) return [];

    const result = [];

    const query = keyword.toLowerCase();

    Object.entries(atlas).forEach(([parcelId, info]) => {
      const text = JSON.stringify(info).toLowerCase();

      if (text.includes(query)) {
        result.push({
          parcelId: Number(parcelId),

          info,
        });
      }
    });

    return result;
  }

  getAllParcelIds(level, onlyWithMesh = false) {
    const atlas = this.getAtlas(level);

    if (!atlas) return [];

    const allIds = Object.keys(atlas).map(Number);

    if (onlyWithMesh) {
      return allIds.filter((id) => this.hasMesh(level, id));
    }

    return allIds;
  }

  getParcelCount(level) {
    const atlas = this.getAtlas(level);

    if (!atlas) return 0;

    return Object.keys(atlas).length;
  }
  getInfo(mesh) {
    const level = mesh?.userData?.level;

    const parcelId = mesh?.userData?.parcelId;

    if (level == null || parcelId == null) {
      return null;
    }

    return this.getParcelInfo(level, parcelId);
  }

  getNetwork(level, parcelId) {
    const info = this.getParcelInfo(level, parcelId);

    if (!info) {
      return "Unknown";
    }

    if (info.network) {
      return info.network;
    }

    const label =
      info.label || info.Label || info.fullLabel || info.shortLabel || "";

    const labelStr = String(label);

    if (!labelStr) {
      return "Unknown";
    }

    if (labelStr.includes("Vis")) return "Visual";

    if (labelStr.includes("SomMot")) return "Somatomotor";

    if (labelStr.includes("DorsAttn")) return "Dorsal Attention";

    if (labelStr.includes("SalVentAttn")) return "Ventral Attention";

    if (labelStr.includes("Limbic")) return "Limbic";

    if (labelStr.includes("Cont")) return "Frontoparietal";

    if (labelStr.includes("Default")) return "Default";

    return "Unknown";
  }
}

const metadataManager = new MetadataManager();

export default metadataManager;
