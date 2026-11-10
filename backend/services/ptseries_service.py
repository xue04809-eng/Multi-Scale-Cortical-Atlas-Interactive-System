"""
Service layer for CIFTI ptseries processing.

Saves the uploaded file to a temp location, parses it,
converts the result into a JSON-serializable payload,
and always cleans up temporary resources.
"""

from pathlib import Path
import uuid
import shutil

from parser.ptseries_parser import PTSeriesParser
from config import TEMP_DIR


class PTSeriesService:
    """Orchestrate upload handling, parsing, and temp cleanup."""

    def __init__(self):

        self.parser = PTSeriesParser()

        self.temp_dir = Path(TEMP_DIR)

        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def parse_upload(self, upload_file):
        """
        Parse uploaded ptseries file.

        Parameters
        ----------
        upload_file :
            Flask FileStorage object

        Returns
        -------
        dict
        """

        temp_file = None

        try:

            temp_file = self._save_temp_file(upload_file)

            result = self.parser.parse(temp_file)

            # Convert numpy arrays into JSON-serializable lists.
            result = self._prepare_response(result)

            return {
                "success": True,
                "message": "PTSeries parsed successfully.",
                "data": result,
            }

        except Exception as e:

            return {"success": False, "message": str(e), "data": None}

        finally:

            if temp_file:

                self._remove_temp_file(temp_file)

    def _save_temp_file(self, upload_file):
        """
        Save uploaded file into temp directory.
        """

        suffix = Path(upload_file.filename).suffixes

        if not suffix:

            raise ValueError("Invalid filename.")

        filename = f"{uuid.uuid4()}" + "".join(suffix)

        file_path = self.temp_dir / filename

        upload_file.save(file_path)

        return file_path

    def _remove_temp_file(self, file_path):

        try:

            path = Path(file_path)

            if path.exists():

                path.unlink()

        except Exception:

            pass

    def _prepare_response(self, result):
        """
        Convert numpy objects into JSON serializable objects.
        """

        response = dict(result)

        if "values" in response:

            response["values"] = response["values"].tolist()

        return response
