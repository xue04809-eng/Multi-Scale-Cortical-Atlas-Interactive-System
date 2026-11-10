export default class DataFileManager {
  constructor() {
    this.files = [];

    this.currentFileId = null;

    this.nextId = 1;
  }

  addFile(name, fileType, data, overwrite = false) {
    const existing = this.getFileByName(name);

    if (existing) {
      if (!overwrite) {
        return existing;
      }

      existing.fileType = fileType;
      existing.dataType = data.type;
      existing.data = data;
      existing.uploadTime = new Date();

      this.currentFileId = existing.id;

      return existing;
    }

    const file = {
      id: this.nextId++,
      name,
      fileType,
      dataType: data.type,
      data,
      uploadTime: new Date(),
    };

    this.files.push(file);

    this.currentFileId = file.id;

    return file;
  }

  removeFile(id) {
    const index = this.files.findIndex((file) => file.id === id);

    if (index === -1) return false;

    const removed = this.files.splice(index, 1)[0];

    if (removed.id === this.currentFileId) {
      if (this.files.length > 0) {
        this.currentFileId = this.files[this.files.length - 1].id;
      } else {
        this.currentFileId = null;
      }
    }

    return true;
  }

  setCurrentFile(id) {
    if (!this.getFile(id)) return false;

    this.currentFileId = id;

    return true;
  }

  getCurrentFile() {
    return this.getFile(this.currentFileId);
  }

  getFile(id) {
    return this.files.find((file) => file.id === id) || null;
  }

  getFileByName(name) {
    return this.files.find((file) => file.name === name) || null;
  }

  getFiles() {
    return this.files;
  }

  getFileCount() {
    return this.files.length;
  }

  contains(name) {
    return this.getFileByName(name) !== null;
  }

  hasFiles() {
    return this.files.length > 0;
  }

  isScalar(file) {
    return file?.dataType === "scalar";
  }

  isTimeSeries(file) {
    return file?.dataType === "timeseries";
  }

  getCurrentData() {
    const file = this.getCurrentFile();
    return file ? file.data : null;
  }

  getCurrentType() {
    const file = this.getCurrentFile();
    return file ? file.dataType : null;
  }

  clear() {
    this.files = [];
    this.currentFileId = null;
    this.nextId = 1;
  }
}
