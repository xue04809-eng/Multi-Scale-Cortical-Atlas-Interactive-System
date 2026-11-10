"""
Configuration for the PTSeries backend.

Defines storage directories, Flask server settings,
and the upload size limit.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Directories for temporary uploads and generated output.
TEMP_DIR = BASE_DIR / "temp"
OUTPUT_DIR = BASE_DIR / "output"

TEMP_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# Flask server settings.
HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

# Maximum upload size: 1GB.
MAX_CONTENT_LENGTH = 1024 * 1024 * 1024
