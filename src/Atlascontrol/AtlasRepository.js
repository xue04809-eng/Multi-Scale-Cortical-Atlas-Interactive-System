/**
 * Shared geometry cache for every atlas controller.
 *
 * Two maps are kept:
 *   geometryCache - parsed geometries, keyed by "level_hemisphere_index".
 *   loadingCache  - in-flight load promises for the same key, so a second
 *                   view requesting the same parcel awaits the existing load
 *                   instead of issuing a duplicate network request.
 *
 * A single instance is exported so all views share the same cache.
 */
class AtlasRepository {
  constructor() {
    this.geometryCache = new Map();

    this.loadingCache = new Map();

    this.loadedGeometryCount = 0;
  }

  hasGeometry(key) {
    return this.geometryCache.has(key);
  }

  getGeometry(key) {
    return this.geometryCache.get(key);
  }

  setGeometry(key, geometry) {
    this.geometryCache.set(key, geometry);
    this.loadedGeometryCount++;
  }

  hasLoading(key) {
    return this.loadingCache.has(key);
  }

  getLoading(key) {
    return this.loadingCache.get(key);
  }

  setLoading(key, promise) {
    this.loadingCache.set(key, promise);
  }

  clearLoading(key) {
    this.loadingCache.delete(key);
  }

  // Drop every cached entry; used when the whole atlas is rebuilt.
  clear() {
    this.geometryCache.clear();

    this.loadingCache.clear();
  }
}

const repository = new AtlasRepository();

export default repository;
