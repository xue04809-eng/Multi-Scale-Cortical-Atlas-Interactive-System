import metadataManager from "../metadatamanagers/metadatamanager.js";

class SearchEngine {
  constructor() {
    this.levels = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 90, 360];
    this.cache = null;
  }

  buildCache() {
    if (this.cache) return;
    this.cache = [];

    this.levels.forEach((level) => {
      const atlas = metadataManager.getAtlas(level);
      if (!atlas) return;

      Object.entries(atlas).forEach(([parcelId, info]) => {
        if (level === 90 && info.mesh !== "surface") return;

        const label = info.label || info.Label || info.fullLabel || "";
        const shortLabel = info.shortLabel || "";
        const network = info.network || info.Network || "";
        const hemisphere =
          info.hemisphere || info.Hemisphere || info.hemi || info.Hemi || "";
        const hcpColor = info.hcpColor
          ? `#${info.hcpColor.map((c) => c.toString(16).padStart(2, "0")).join("")}`
          : null;

        this.cache.push({
          level,
          parcelId: Number(parcelId),
          label,
          shortLabel,
          network,
          hemisphere,
          hcpColor,
          searchText:
            `${label} ${shortLabel} ${network} ${hemisphere}`.toLowerCase(),
        });
      });
    });
  }

  search(keyword) {
    if (!keyword || keyword.trim().length === 0) return [];
    this.buildCache();

    const query = keyword.toLowerCase().trim();
    const results = [];

    this.cache.forEach((entry) => {
      const score = this.matchScore(entry.searchText, query);
      if (score > 0) {
        results.push({ ...entry, score });
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20);
  }

  matchScore(text, query) {
    if (text === query) return 100;
    if (text.startsWith(query)) return 80;
    if (text.includes(query)) return 60;

    const words = query.split(/\s+/);
    let score = 0;
    words.forEach((word) => {
      if (text.includes(word)) score += 30;
    });
    return score;
  }

  getAllParcels(level) {
    this.buildCache();
    if (level) {
      return this.cache.filter((e) => e.level === level);
    }
    return this.cache;
  }
}

const searchEngine = new SearchEngine();
export default searchEngine;
