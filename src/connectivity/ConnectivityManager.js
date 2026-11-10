/**
 * Loads and caches Schaefer functional-connectivity matrices.
 *
 * One CSV matrix is available per scale (100 / 200 / 300 / 400 parcels).
 * Matrices are fetched lazily on first use, kept in memory per scale, and
 * queried through getTopConnections to obtain the k strongest partners of
 * a parcel. Parcel IDs are 1-based; matrix row/column index is id - 1.
 */
export default class ConnectivityManager {
  constructor() {
    this.files = {
      100: "/data/connectivity/schaefer100_fc.csv",

      200: "/data/connectivity/schaefer200_fc.csv",

      300: "/data/connectivity/schaefer300_fc.csv",

      400: "/data/connectivity/schaefer400_fc.csv",
    };

    // Parsed matrices cached per scale.
    this.cache = {};

    // Scale most recently loaded or queried.
    this.currentLevel = null;
  }

  async loadMatrix(level) {
    if (this.cache[level]) {
      this.currentLevel = level;

      return;
    }

    const path = this.files[level];

    if (!path) {
      console.warn("Unsupported FC level:", level);

      return;
    }

    const res = await fetch(path);

    const text = await res.text();

    const rows = text
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) =>
        r.includes("\t") ? r.split("\t").map(Number) : r.split(",").map(Number),
      );

    // Drop the CSV header row; remaining rows are the matrix itself.
    const matrix = rows.slice(1);

    this.cache[level] = matrix;

    this.currentLevel = level;
  }

  getMatrix(level = null) {
    level = level || this.currentLevel;

    return this.cache[level];
  }

  getTopConnections(parcelId, k = 5, level = null) {
    level = level || this.currentLevel;

    const matrix = this.getMatrix(level);

    if (!matrix) {
      console.warn("FC matrix not loaded");

      return [];
    }

    const fcIdx = parcelId - 1;

    const row = matrix[fcIdx];

    if (!row) {
      console.warn("Invalid parcel index:", parcelId);

      return [];
    }

    return row

      .map((value, idx) => ({
        target: idx + 1,

        strength: value,
      }))

      .filter(
        (item) => item.target !== parcelId && !Number.isNaN(item.strength),
      )

      .sort((a, b) => b.strength - a.strength)

      .slice(0, k);
  }
}
