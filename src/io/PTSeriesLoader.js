/**
 * Uploads a CIFTI-2 .ptseries.nii file to the backend parser and converts
 * the returned JSON into the internal time-series structure.
 *
 * Backend shape: values[parcel][time]
 * Internal shape: frame-major Float32Array, index = time * parcelCount + roi
 */
export default class PTSeriesLoader {
  static async load(file) {
    if (!file) {
      throw new Error("No ptseries file selected.");
    }

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      "http://127.0.0.1:5000/api/ptseries/parse",

      {
        method: "POST",

        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    return this.convert(result.data);
  }

  static convert(data) {
    const {
      atlas,

      parcelCount,

      timePoints,

      tr,

      values,

      parcelNames,

      min,

      max,
    } = data;

    // Flatten values[parcel][time] into a frame-major array so each
    // playback frame reads a contiguous slice.
    const flatValues = new Float32Array(parcelCount * timePoints);

    for (let t = 0; t < timePoints; t++) {
      for (let roi = 0; roi < parcelCount; roi++) {
        flatValues[t * parcelCount + roi] = values[roi][t];
      }
    }

    return {
      type: "timeseries",

      format: "ptseries",

      atlas: atlas.toLowerCase(),

      roiCount: parcelCount,

      frameCount: timePoints,

      tr,

      min,

      max,

      parcelNames,

      values: flatValues,
    };
  }
}
