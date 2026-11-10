class ViewManager {
  constructor(rootContainer) {
    this.rootContainer = rootContainer;

    this.views = [];

    this.visibleCount = 1;

    this.nextViewId = 1;
  }
  async createView() {
    const id = this.nextViewId++;

    const wrapper = document.createElement("div");

    wrapper.className = "view-container";

    wrapper.id = `view${id}Container`;

    const canvas = document.createElement("div");

    canvas.id = `view${id}`;

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    wrapper.appendChild(canvas);

    this.rootContainer.appendChild(wrapper);

    const view = new AtlasView(canvas);

    this.views.push(view);

    this.updateLayout();

    return view;
  }

  addView(view) {
    if (!view) return;

    this.views.push(view);

    this.updateLayout();
  }

  removeView(index) {
    const view = this.views[index];

    if (!view) return;

    if (view.rootContainer && view.rootContainer.parentNode) {
      view.rootContainer.parentNode.removeChild(view.rootContainer);
    }

    this.views.splice(index, 1);

    this.updateLayout();
  }

  getView(index) {
    return this.views[index];
  }

  getAllViews() {
    return this.views;
  }

  getCount() {
    return this.views.length;
  }

  setViewCount(count) {
    this.visibleCount = count;

    this.updateLayout();
  }
  setViewMode(count) {
    this.setViewCount(count);
    this.updateLayout();
  }

  updateLayout() {
    const count = this.visibleCount;

    this.views.forEach((view, index) => {
      if (!view.rootContainer) return;

      if (index < count) {
        view.rootContainer.style.display = "block";
      } else {
        view.rootContainer.style.display = "none";
      }
    });

    this.views.forEach((view) => {
      if (!view.rootContainer) return;
      view.rootContainer.style.gridColumn = "";
      view.rootContainer.style.gridRow = "";
    });

    if (count === 1) {
      this.applyGrid("1fr", "1fr");
    } else if (count === 2) {
      this.applyGrid("1fr 1fr", "1fr");
    } else if (count === 3) {
      this.applyGrid("1fr 1fr", "1fr 1fr");
      if (this.views[2] && this.views[2].rootContainer) {
        this.views[2].rootContainer.style.gridColumn = "1 / span 2";
        this.views[2].rootContainer.style.gridRow = "2";
      }
    } else if (count === 4) {
      this.applyGrid("1fr 1fr", "1fr 1fr");
    } else if (count === 5) {
      this.applyGrid("1fr 1fr 1fr 1fr 1fr 1fr", "1fr 1fr");
      if (this.views[0] && this.views[0].rootContainer) {
        this.views[0].rootContainer.style.gridColumn = "1 / span 2";
      }
      if (this.views[1] && this.views[1].rootContainer) {
        this.views[1].rootContainer.style.gridColumn = "3 / span 2";
      }
      if (this.views[2] && this.views[2].rootContainer) {
        this.views[2].rootContainer.style.gridColumn = "5 / span 2";
      }
      if (this.views[3] && this.views[3].rootContainer) {
        this.views[3].rootContainer.style.gridColumn = "1 / span 3";
        this.views[3].rootContainer.style.gridRow = "2";
      }
      if (this.views[4] && this.views[4].rootContainer) {
        this.views[4].rootContainer.style.gridColumn = "4 / span 3";
        this.views[4].rootContainer.style.gridRow = "2";
      }
    } else {
      this.applyGrid("1fr 1fr 1fr", "1fr 1fr");
    }

    requestAnimationFrame(() => {
      this.views.forEach((view) => {
        if (view.resize) {
          view.resize();
        }
        if (view.fitCameraToView) {
          view.fitCameraToView();
        }
      });
    });
  }

  applyGrid(columns, rows) {
    if (!this.rootContainer) return;

    this.rootContainer.style.display = "grid";

    this.rootContainer.style.gridTemplateColumns = columns;

    this.rootContainer.style.gridTemplateRows = rows;

    this.rootContainer.style.width = "100%";
    void this.rootContainer.offsetHeight;
  }
  getVisibleViews() {
    return this.views.slice(0, this.visibleCount);
  }
  async handleParcelSelected(parcel, sourceView) {
    const visibleViews = this.getVisibleViews();

    for (const targetView of visibleViews) {
      if (targetView === sourceView) continue;

      await window.state.crossScaleManager.update(
        parcel,
        sourceView,
        targetView,
      );
    }
  }
  bindSelectionEvents() {
    this.views.forEach((view) => {
      view.schaefer.onParcelSelected = (parcel) => {
        this.handleParcelSelected(parcel, view);
      };
    });
  }
}

export default ViewManager;
