/**
 * Cross-scale parcel mapping for the atlas hierarchy.
 *
 * Parcel IDs are scale specific, so a parcel in one scale (e.g. 100) maps
 * onto one or more parcels in another scale (e.g. 400). This manager loads
 * the pre-computed overlap tables from
 *   <basePath>/<hemisphere>/overlap_<sourceLevel>_to_<targetLevel>.json
 * and answers "which target parcels does this source parcel overlap, and
 * how strongly".
 *
 * loadHierarchy returns a tagged result:
 *   identity - same source and target scale, no file needed
 *   mapped   - table loaded successfully
 *   empty    - file missing or request failed (cached so it is not retried)
 *
 * getOverlap always returns an array of { target, weight }; callers can use
 * it without worrying about which of the three states was hit.
 */
class HierarchyManager {
  constructor() {
    this.cache = {};

    this.basePath = "/public/models/hierarchy";
  }

  async loadHierarchy(hemi, sourceLevel, targetLevel) {
    if (sourceLevel === targetLevel) {
      return {
        type: "identity",
        data: null,
      };
    }

    const key = `${hemi}_${sourceLevel}_${targetLevel}`;

    // Cache hits, including the "empty" fallback, avoid repeat requests.

    if (this.cache[key]) {
      return this.cache[key];
    }

    const path = `${this.basePath}/${hemi}/overlap_${sourceLevel}_to_${targetLevel}.json`;

    try {
      const response = await fetch(path);

      if (!response.ok) {
        console.warn(" Missing hierarchy file:", path);

        this.cache[key] = {
          type: "empty",
          data: null,
        };

        return this.cache[key];
      }

      const data = await response.json();

      const result = {
        type: "mapped",
        data,
      };

      this.cache[key] = result;

      return result;
    } catch (err) {
      console.error(" Failed to load hierarchy:", err);

      const fallback = {
        type: "empty",
        data: null,
      };

      this.cache[key] = fallback;

      return fallback;
    }
  }

  async getOverlap(hemi, sourceLevel, targetLevel, parcelId) {
    const result = await this.loadHierarchy(hemi, sourceLevel, targetLevel);

    if (result.type === "identity") {
      return [
        {
          target: parcelId,
          weight: 1,
        },
      ];
    }

    if (result.type === "empty" || !result.data) {
      return [];
    }

    const data = result.data;

    const overlap = data?.[parcelId];

    if (!overlap) {
      return [];
    }

    return overlap;
  }
}

export default HierarchyManager;
