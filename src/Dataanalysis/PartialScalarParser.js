import aal90Info from "../../dist/public/models/atlases/AAL90/AALinfo.json";
import hcp360Info from "../../dist/public/models/atlases/HCP360/hcp360_info.json";

export default class PartialScalarParser {
  static SUPPORTED_LEVELS = [
    82, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 360,
  ];

  static ATLAS_NAME_MAP = {
    aal90: ["aal", "aal90"],
    hcp360: ["hcp", "hcp360"],
    schaefer: ["schaefer"],
  };

  static async parse(data, format) {
    switch (format.toLowerCase()) {
      case "txt":
      case "plain":
        return this.parsePlainText(data);

      case "csv":
        return this.parseCSV(data);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  static parsePlainText(text) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines.length === 0) {
      throw new Error("Text file is empty.");
    }

    const roiData = [];
    let hasHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[\t,]+/).map((v) => v.trim());

      if (parts.length < 2) continue;

      // Header detection: check if the last column is not a number
      if (i === 0) {
        const last = Number(parts[parts.length - 1]);
        if (Number.isNaN(last)) {
          hasHeader = true;
          continue;
        }
      }

      const roiName = parts[0];
      const value = Number(parts[parts.length - 1]);

      if (Number.isNaN(value)) continue;

      roiData.push({ name: roiName, value });
    }

    return this.createPartialScalarData(roiData, {
      format: "txt",
      hasHeader,
    });
  }

  static parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new Error("CSV file is empty.");
    }

    const roiData = [];
    let hasHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i]
        .split(/[,，\t]+/)
        .map((v) => v.trim().replace(/^["']|["']$/g, ""))
        .filter((v) => v.length > 0);

      if (cols.length < 2) continue;

      if (i === 0) {
        const last = Number(cols[cols.length - 1]);
        if (Number.isNaN(last)) {
          hasHeader = true;
          continue;
        }
      }

      const roiName = cols[0];
      const value = Number(cols[cols.length - 1]);

      if (Number.isNaN(value)) continue;

      roiData.push({ name: roiName, value });
    }

    return this.createPartialScalarData(roiData, {
      format: "csv",
      hasHeader,
    });
  }

  static createPartialScalarData(roiData, metadata = {}) {
    if (roiData.length === 0) {
      throw new Error("No valid ROI data found.");
    }

    // Detect atlas and resolution from ROI names
    const { atlas, resolution } = this.detectAtlasFromNames(roiData);

    if (!atlas || !resolution) {
      throw new Error(
        "Cannot detect atlas type from ROI names. Please ensure ROI names match supported atlas (AAL90, HCP360, or Schaefer 100-1000).",
      );
    }

    const nameToIdMap = this.buildNameToIdMap(atlas, resolution);

    const valuesArraySize = atlas === "aal90" ? 90 : resolution;
    const values = new Array(valuesArraySize).fill(null);
    const providedValues = [];
    let unmatchedCount = 0;

    for (const { name, value } of roiData) {
      const parcelId = nameToIdMap.get(name);

      if (parcelId !== undefined) {
        values[parcelId - 1] = value;
        providedValues.push(value);
      } else {
        if (unmatchedCount < 5) {
          console.warn(`ROI name not found: ${name}`);
        }
        unmatchedCount++;
      }
    }

    if (unmatchedCount > 0) {
      console.warn(`Total unmatched ROI names: ${unmatchedCount}`);
    }

    if (providedValues.length === 0) {
      throw new Error(
        "No ROI names matched the atlas. Please check the ROI names.",
      );
    }

    // Filter out any null/undefined/NaN values before calculating min/max
    const validValues = providedValues.filter(
      (v) => v !== null && v !== undefined && !Number.isNaN(v),
    );

    if (validValues.length === 0) {
      throw new Error("No valid values found in ROI data.");
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    return {
      type: "partial-scalar",
      atlas,
      resolution,
      count: valuesArraySize,
      min,
      max,
      values,
      isPartial: true,
      providedCount: providedValues.length,
      metadata,
    };
  }

  static detectAtlasFromNames(roiData) {
    const sampleNames = roiData.slice(0, 10).map((r) => r.name);

    if (this.isAAL90(sampleNames)) {
      return { atlas: "aal90", resolution: 82 };
    }

    if (this.isHCP360(sampleNames)) {
      return { atlas: "hcp360", resolution: 360 };
    }

    const schaeferLevel = this.detectSchaeferLevel(sampleNames);
    if (schaeferLevel) {
      return { atlas: "schaefer", resolution: schaeferLevel };
    }

    return { atlas: null, resolution: null };
  }

  static isAAL90(names) {
    const aalPatterns = [
      /Precentral/,
      /Frontal_Sup/,
      /Frontal_Mid/,
      /Frontal_Inf_Oper/,
      /Rolandic_Oper/,
      /Supp_Motor_Area/,
      /Olfactory/,
      /Frontal_Sup_Orb/,
      /Frontal_Mid_Orb/,
      /Frontal_Inf_Oper/,
      /Rectus/,
      /Insula/,
      /Cingulum/,
      /Hippocampus/,
      /ParaHippocampal/,
      /Amygdala/,
      /Calcarine/,
      /Cuneus/,
      /Lingual/,
      /Occipital/,
      /Fusiform/,
      /Postcentral/,
      /Parietal_Sup/,
      /Parietal_Inf/,
      /SupraMarginal/,
      /Angular/,
      /Precuneus/,
      /Paracentral_Lobule/,
      /Caudate/,
      /Putamen/,
      /Pallidum/,
      /Thalamus/,
      /Heschl/,
      /Temporal/,
      /_L$/,
      /_R$/,
    ];

    let matchCount = 0;
    for (const name of names) {
      if (aalPatterns.some((pattern) => pattern.test(name))) {
        matchCount++;
      }
    }

    return matchCount >= 1;
  }

  static isHCP360(names) {
    const hcpPatterns = [
      /^L_/,
      /^R_/,
      /V1/,
      /V2/,
      /V3/,
      /V4/,
      /MT/,
      /MST/,
      /FST/,
      /FEF/,
      /PEF/,
      /IPS/,
    ];

    let matchCount = 0;
    for (const name of names) {
      if (hcpPatterns.some((pattern) => pattern.test(name))) {
        matchCount++;
      }
    }

    return matchCount >= 2;
  }

  static detectSchaeferLevel(names) {
    const schaeferPattern =
      /^(L|R)_(Vis|SomMot|DorsAttn|SalVentAttn|Limbic|Cont|Default)_(\d+)/;

    for (const name of names) {
      const match = name.match(schaeferPattern);
      if (match) {
        const regionNumber = parseInt(match[3]);
        // Try to determine level from region number
        const levels = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
        for (const level of levels) {
          const regionsPerNetwork = level / 7;
          if (regionNumber <= regionsPerNetwork) {
            return level;
          }
        }
      }
    }

    return null;
  }

  static buildNameToIdMap(atlas, resolution) {
    const map = new Map();

    if (atlas === "schaefer") {
      this.buildSchaeferNameMap(map, resolution);
    } else if (atlas === "aal90") {
      this.buildAAL90NameMap(map);
    } else if (atlas === "hcp360") {
      this.buildHCP360NameMap(map);
    }

    return map;
  }

  static buildSchaeferNameMap(map, resolution) {
    const networks = [
      "Vis",
      "SomMot",
      "DorsAttn",
      "SalVentAttn",
      "Limbic",
      "Cont",
      "Default",
    ];
    const regionsPerNetwork = resolution / 7;

    let parcelId = 1;

    for (const hemi of ["L", "R"]) {
      for (const network of networks) {
        for (let i = 1; i <= regionsPerNetwork; i++) {
          const name = `${hemi}_${network}_${i}`;
          map.set(name, parcelId++);
        }
      }
    }
  }

  static buildAAL90NameMap(map) {
    // Use the actual AALinfo.json data
    for (const [key, value] of Object.entries(aal90Info)) {
      if (value.label) {
        map.set(value.label, parseInt(key));
      }
    }
  }

  static buildHCP360NameMap(map) {
    console.warn("HCP360 name mapping is not fully implemented.");
  }

  static validate(roiData) {
    if (!Array.isArray(roiData)) {
      throw new Error("ROI data must be an array.");
    }

    if (roiData.length === 0) {
      throw new Error("ROI data is empty.");
    }
  }
}
