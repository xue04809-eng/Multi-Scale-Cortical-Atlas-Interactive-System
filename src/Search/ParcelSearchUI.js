// Parcel Search UI
// Search box + Parcel list panel management

import * as THREE from "three";
import searchEngine from "./SearchEngine.js";
import LabelSystem from "../parcel-interaction/labelSystem.js";

const NETWORK_COLORS = {
  Vis: "#7b1fa2",
  Visual: "#7b1fa2",
  SomMot: "#4981B5",
  Somatomotor: "#4981B5",
  DorsAttn: "#43a047",
  DorsalAttention: "#43a047",
  SalVentAttn: "#C639FC",
  VentralAttention: "#C639FC",
  Limbic: "#D3EA9F",
  Cont: "#E89423",
  Frontoparietal: "#E89423",
  Default: "#CE3F50",
};

class ParcelSearchUI {
  constructor(state, setSelectedParcel) {
    this.state = state;
    this.setSelectedParcel = setSelectedParcel;
  }

  init() {
    this.setupSearch();
    this.setupParcelList();
  }

  // ==========================================
  // Search Box
  // ==========================================

  setupSearch() {
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    if (!searchInput || !searchResults) return;

    let debounceTimer = null;

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const keyword = searchInput.value.trim();

        if (!keyword) {
          searchResults.style.display = "none";
          searchResults.innerHTML = "";
          return;
        }

        const results = searchEngine.search(keyword);

        if (results.length === 0) {
          searchResults.innerHTML =
            '<div class="search-no-results">No parcels found</div>';
        } else {
          searchResults.innerHTML = results
            .map(
              (r) => `
              <div class="search-result-item" data-parcel-id="${r.parcelId}" data-level="${r.level}">
                <span class="search-result-label">${r.shortLabel || r.label}</span>
                <span class="search-result-meta">
                  <span>${r.network || "-"}</span>
                  <span>Lv${r.level}</span>
                  <span>#${r.parcelId}</span>
                </span>
              </div>`,
            )
            .join("");

          searchResults
            .querySelectorAll(".search-result-item")
            .forEach((item) => {
              item.addEventListener("click", () => {
                const parcelId = Number(item.dataset.parcelId);
                const level = Number(item.dataset.level);
                this.handleSearchSelect(parcelId, level);
                searchResults.style.display = "none";
                searchInput.value = "";
              });
            });
        }

        searchResults.style.display = "block";
      }, 200);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchResults.style.display = "none";
        searchInput.value = "";
        searchInput.blur();
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !searchInput.contains(e.target) &&
        !searchResults.contains(e.target)
      ) {
        searchResults.style.display = "none";
      }
    });
  }

  handleSearchSelect(parcelId, level) {
    const view = this.state.viewManager
      ? this.state.viewManager.getView(0)
      : null;
    if (!view || !view.scene) return;

    const found = this._findParcelInScene(view.scene, parcelId, level);
    if (!found) {
      console.warn("Parcel not found in scene:", parcelId, level);
      return;
    }

    if (view.schaefer?.interaction) {
      view.schaefer.interaction.toggleParcel(found);
    }

    if (view.schaefer?.renderGroup) {
      LabelSystem.createLabelForParcel(found, view.schaefer.renderGroup);
    }

    if (view.schaefer?.onParcelSelected) {
      view.schaefer.onParcelSelected(found);
    }
  }

  _findParcelInScene(object, parcelId, level) {
    if (
      object.userData?.type === "parcel" &&
      object.userData?.parcelId === parcelId &&
      object.userData?.level === level
    ) {
      return object;
    }
    if (object.children) {
      for (const child of object.children) {
        const found = this._findParcelInScene(child, parcelId, level);
        if (found) return found;
      }
    }
    return null;
  }

  // ==========================================
  // Parcel List Panel
  // ==========================================

  setupParcelList() {
    const parcelListBtn = document.getElementById("parcelListBtn");
    const parcelListPanel = document.getElementById("parcelListPanel");
    const parcelListClose = document.getElementById("parcelListClose");
    const parcelListContent = document.getElementById("parcelListContent");
    const parcelListLevelSelect = document.getElementById(
      "parcelListLevelSelect",
    );
    const parcelListFilter = document.getElementById("parcelListFilter");

    if (!parcelListBtn || !parcelListPanel || !parcelListContent) return;

    parcelListBtn.addEventListener("click", () => {
      const isOpen = parcelListPanel.classList.contains("open");
      parcelListPanel.classList.toggle("open");
      document
        .getElementById("viewsWrapper")
        .classList.toggle("drawer-right-open", !isOpen);
      if (!isOpen) {
        this.renderParcelList(Number(parcelListLevelSelect.value));
      }
    });

    parcelListClose.addEventListener("click", () => {
      parcelListPanel.classList.remove("open");
      document
        .getElementById("viewsWrapper")
        .classList.remove("drawer-right-open");
    });

    parcelListLevelSelect.addEventListener("change", () => {
      this.renderParcelList(Number(parcelListLevelSelect.value));
    });

    let filterTimer = null;
    parcelListFilter.addEventListener("input", () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => {
        this.renderParcelList(
          Number(parcelListLevelSelect.value),
          parcelListFilter.value.trim(),
        );
      }, 150);
    });
  }

  renderParcelList(level, filterKeyword = "") {
    const parcelListContent = document.getElementById("parcelListContent");
    if (!parcelListContent) return;

    const parcels = searchEngine.getAllParcels(level);

    let filtered = parcels;
    if (filterKeyword) {
      const query = filterKeyword.toLowerCase();
      filtered = parcels.filter((p) => {
        const text =
          `${p.label} ${p.shortLabel} ${p.network} ${p.hemisphere}`.toLowerCase();
        return text.includes(query);
      });
    }

    if (filtered.length === 0) {
      parcelListContent.innerHTML =
        '<div class="parcel-list-empty">No parcels found.</div>';
      return;
    }

    parcelListContent.innerHTML = filtered
      .map((p) => {
        const networkColor = NETWORK_COLORS[p.network] || "#999";
        const hcpSwatch = p.hcpColor
          ? `<span class="parcel-item-swatch" style="background:${p.hcpColor};"></span>`
          : "";
        const displayName =
          p.level === 360 ? p.label || p.shortLabel : p.shortLabel || p.label;
        // For AAL90, show the actual parcel ID from JSON (1-116), not the mesh index
        const displayParcelId = p.level === 90 ? p.parcelId : p.parcelId;
        return `
      <div class="parcel-list-item" data-parcel-id="${p.parcelId}" data-level="${p.level}">
        <span class="parcel-item-swatch" style="background:${networkColor};"></span>
        ${hcpSwatch}
        <span class="parcel-item-name">${displayName}</span>
        <span class="parcel-item-meta">
          <span>${p.network || "-"}</span>
          <span>#${displayParcelId}</span>
        </span>
      </div>`;
      })
      .join("");

    parcelListContent.querySelectorAll(".parcel-list-item").forEach((item) => {
      item.addEventListener("click", () => {
        const parcelId = Number(item.dataset.parcelId);
        const level = Number(item.dataset.level);
        this.handleSearchSelect(parcelId, level);

        parcelListContent
          .querySelectorAll(".parcel-list-item")
          .forEach((el) => {
            el.classList.remove("active");
          });
        item.classList.add("active");
      });
    });
  }
}

export default ParcelSearchUI;
