from flask import Blueprint, request, jsonify

from services.ptseries_service import PTSeriesService

# ==========================================================
# Blueprint
# ==========================================================

ptseries_bp = Blueprint("ptseries", __name__, url_prefix="/api/ptseries")


# ==========================================================
# Service instance
# ==========================================================

ptseries_service = PTSeriesService()


# ==========================================================
# Upload and parse ptseries
# ==========================================================


@ptseries_bp.route("/parse", methods=["POST"])
def parse_ptseries():
    """
    Upload and parse CIFTI .ptseries.nii file.

    Request:
    ----------
    multipart/form-data

    key:
        file


    Response:
    ----------
    JSON
    """

    # ----------------------------------
    # Check file
    # ----------------------------------

    if "file" not in request.files:

        return (
            jsonify({"success": False, "message": "No file uploaded.", "data": None}),
            400,
        )

    file = request.files["file"]

    if file.filename == "":

        return (
            jsonify({"success": False, "message": "Empty filename.", "data": None}),
            400,
        )

    # ----------------------------------
    # Parse
    # ----------------------------------

    result = ptseries_service.parse_upload(file)

    # ----------------------------------
    # HTTP status
    # ----------------------------------

    if result["success"]:

        return jsonify(result), 200

    else:

        return jsonify(result), 500
