"""
Flask application entry point for the PTSeries backend.

Responsibilities:
    1. Create and configure the Flask app.
    2. Enable CORS and set the upload size limit.
    3. Register API blueprints.
    4. Expose a health check endpoint.
"""

from flask import Flask
from flask_cors import CORS

from config import HOST, PORT, DEBUG, MAX_CONTENT_LENGTH

from routes.ptseries_route import ptseries_bp


def create_app():
    """Create and configure the Flask application."""

    app = Flask(__name__)

    # Allow cross-origin requests from the frontend.
    CORS(app)

    # Limit the maximum accepted upload size.
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    # Register the PTSeries API endpoints.
    app.register_blueprint(ptseries_bp)

    @app.route("/")
    def index():
        """Simple health check."""
        return {"service": "PTSeries Backend", "status": "running"}

    return app


if __name__ == "__main__":

    app = create_app()

    app.run(host=HOST, port=PORT, debug=DEBUG)
