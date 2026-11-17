
from flask import Flask, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import Config

# Initialize extensions
mongo = PyMongo()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Load application configuration
    app.config.from_object(Config)

    # Initialize MongoDB and JWT
    mongo.init_app(app)
    jwt.init_app(app)

    # Restrict CORS to configured frontend origins
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ORIGINS"]
            }
        }
    )

    # Register API routes
    from .routes import api
    app.register_blueprint(api)

    # Health check
    @app.route("/api/health", methods=["GET"])
    def health_check():
        try:
            mongo.db.command("ping")

            return jsonify({
                "status": "success",
                "message": "Flask API and MongoDB are working!"
            }), 200

        except Exception:
            app.logger.exception("MongoDB health check failed")

            return jsonify({
                "status": "error",
                "message": "Database connection is unavailable"
            }), 503

    return app
