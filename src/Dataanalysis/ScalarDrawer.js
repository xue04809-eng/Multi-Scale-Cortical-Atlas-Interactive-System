export default class ScalarDrawer {
  static refresh(fileManager, callbacks = {}) {
    const container = document.getElementById("scalarFileList");

    if (!container) return;

    container.style.overflowY = "auto";
    container.style.maxHeight = "calc(100vh - 300px)";
    container.style.flex = "1 1 0%";
    container.style.minHeight = "0";

    container.innerHTML = "";

    const files = fileManager.getFiles();

    const current = fileManager.getCurrentFile();

    const { onSelect = null, onDelete = null } = callbacks;

    if (files.length === 0) {
      container.appendChild(this.createEmpty());

      return;
    }

    for (const file of files) {
      const item = this.createFileItem(
        file,
        current && current.id === file.id,
        onSelect,
        onDelete,
      );

      container.appendChild(item);
    }
  }

  static createEmpty() {
    const empty = document.createElement("div");

    empty.className = "scalar-empty";

    empty.textContent = "No data files loaded.";

    return empty;
  }

  static createFileItem(
    file,
    active = false,
    onSelect = null,
    onDelete = null,
  ) {
    const item = document.createElement("div");

    item.className = active ? "scalar-file active" : "scalar-file";

    const info = document.createElement("div");

    info.className = "scalar-file-info";

    const name = document.createElement("div");

    name.className = "scalar-file-name";

    name.textContent = file.name;

    const meta = document.createElement("div");

    meta.className = "scalar-file-meta";

    let metaText = "";

    if (file.dataType === "scalar") {
      metaText = `${file.fileType.toUpperCase()} • ${file.data.count} Values`;
    } else if (file.dataType === "partial-scalar") {
      const provided = file.data.providedCount || 0;
      const total = file.data.count;
      metaText = `${file.fileType.toUpperCase()} • Partial ${provided}/${total} Values`;
    } else if (file.dataType === "timeseries") {
      metaText = `${file.fileType.toUpperCase()} • ${file.data.roiCount} ROI × ${file.data.frameCount} Frames`;
    } else {
      metaText = file.fileType.toUpperCase();
    }

    meta.textContent = metaText;

    info.appendChild(name);

    info.appendChild(meta);

    const del = document.createElement("button");

    del.className = "scalar-delete";

    del.title = "Delete";

    del.textContent = "🗑";

    item.addEventListener("click", () => {
      if (onSelect) {
        onSelect(file);
      }
    });

    del.addEventListener("click", (event) => {
      event.stopPropagation();

      if (onDelete) {
        onDelete(file);
      }
    });

    item.appendChild(info);

    item.appendChild(del);

    return item;
  }
}
