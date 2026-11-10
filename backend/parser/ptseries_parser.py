"""
Parser for CIFTI-2 .ptseries.nii files.

Loads the file, extracts parcel time series and metadata,
and returns a dictionary. Values are shaped (parcel, time)
so the frontend can index values[parcel][time].
"""

from pathlib import Path

import nibabel as nib
import numpy as np


class PTSeriesParser:
    """Parse CIFTI-2 .ptseries.nii files into a Python dictionary."""

    def parse(self, file_path):
        """
        Parse a .ptseries.nii file.

        Parameters
        ----------
        file_path : str | Path

        Returns
        -------
        dict
        """

        file_path = Path(file_path)

        self._check_file(file_path)

        img = nib.load(str(file_path))

        if not isinstance(img, nib.cifti2.Cifti2Image):
            raise TypeError("Input file is not a valid CIFTI-2 image.")

        header = img.header

        series_axis = header.get_axis(0)
        parcel_axis = header.get_axis(1)

        data = img.get_fdata(dtype=np.float32)

        # CIFTI stores (time, parcel); transpose to (parcel, time).
        values = data.T

        parcel_names = self._get_parcel_names(parcel_axis)

        if len(parcel_names) != values.shape[0]:
            raise RuntimeError("Parcel count does not match parcel axis.")

        result = {
            "type": "timeseries",
            "format": "ptseries",
            "atlas": self._guess_atlas(values.shape[0]),
            "parcelCount": values.shape[0],
            "timePoints": values.shape[1],
            "startTime": float(series_axis.start),
            "tr": float(series_axis.step),
            "duration": float(series_axis.step) * values.shape[1],
            "parcelNames": parcel_names,
            "min": float(values.min()),
            "max": float(values.max()),
            "values": values,
        }

        return result

    def _check_file(self, file_path):

        if not file_path.exists():
            raise FileNotFoundError(file_path)

        if file_path.suffix != ".nii":
            raise ValueError("Expected a .ptseries.nii file.")

    def _get_parcel_names(self, parcel_axis):

        names = []

        for name in parcel_axis.name:
            names.append(str(name))

        return names

    def _guess_atlas(self, parcel_count):

        atlas_map = {
            90: "AAL90",
            116: "AAL116",
            360: "HCP360",
            400: "Schaefer400",
            100: "Schaefer100",
            200: "Schaefer200",
            600: "Schaefer600",
            800: "Schaefer800",
            1000: "Schaefer1000",
        }

        return atlas_map.get(parcel_count, "Unknown")
