import re
from .ocr import extract_text
import json
from datetime import datetime, timezone
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from bson import ObjectId
from gridfs import GridFS

from app import mongo
from werkzeug.utils import secure_filename
from PIL import Image

# Create API Blueprint
api = Blueprint("api", __name__, url_prefix="/api")


# ==========================================
# 1. USER REGISTRATION
# ==========================================

@api.route("/auth/register", methods=["POST"])
def register():

    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    division = data.get("division", "").strip()

    if not username or not email or not password or not division:
        return jsonify({"error": "All fields are required"}), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters"
        }), 400

    existing_user = mongo.db.users.find_one({"email": email})

    if existing_user:
        return jsonify({"error": "Email already registered"}), 409

    hashed_password = generate_password_hash(password)

    user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "division": division,
        "role": "user"
    }

    result = mongo.db.users.insert_one(user)

    return jsonify({
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }), 201


# ==========================================
# 2. USER LOGIN
# ==========================================

@api.route("/auth/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    user = mongo.db.users.find_one({"email": email})

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(
        identity=str(user["_id"]),
        additional_claims={
            "division": user["division"],
            "role": user["role"]
        }
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "division": user["division"],
            "role": user["role"]
        }
    }), 200


# ==========================================
# 3. GET CURRENT LOGGED-IN USER
# ==========================================

@api.route("/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():

    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return jsonify({"error": "Invalid user ID"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "division": user["division"],
        "role": user["role"]
    }), 200


# ==========================================
# 4. UPLOAD DOCUMENT USING GRIDFS
# WITH DYNAMIC METADATA VALIDATION
# ==========================================

@api.route("/documents/upload", methods=["POST"])
@jwt_required()
def upload_document():

    # --------------------------------------
    # 1. Validate uploaded file
    # --------------------------------------

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if not file or not file.filename:
        return jsonify({"error": "No file selected"}), 400

    # Sanitize filename
    safe_filename = secure_filename(file.filename)

    if not safe_filename:
        return jsonify({"error": "Invalid filename"}), 400

    # Validate extension
    allowed_extensions = {"pdf", "png", "jpg", "jpeg"}

    extension = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else ""

    if extension not in allowed_extensions:
        return jsonify({
            "error": "Only PDF and image files are allowed"
        }), 400

    # Determine content type from the allowed extension
    content_types = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg"
    }

    detected_content_type = content_types[extension]

    # --------------------------------------
    # 2. Get authenticated user
    # --------------------------------------

    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return jsonify({"error": "Invalid user ID"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    user_division = user["division"]

    # --------------------------------------
    # 3. Read metadata JSON
    # --------------------------------------

    metadata_string = request.form.get("metadata", "{}")

    try:
        metadata = json.loads(metadata_string)

        if not isinstance(metadata, dict):
            return jsonify({
                "error": "Metadata must be a JSON object"
            }), 400

    except (json.JSONDecodeError, TypeError):
        return jsonify({
            "error": "Invalid metadata JSON"
        }), 400

    # Ensure metadata keys are strings
    if not all(isinstance(key, str) for key in metadata):
        return jsonify({
            "error": "Metadata field names must be strings"
        }), 400

    # --------------------------------------
    # 4. Validate Division
    # --------------------------------------

    for key, value in metadata.items():

        if key.strip().casefold() == "division":

            if value != user_division:
                return jsonify({
                    "error": "You can only upload documents to your own division"
                }), 403

    # --------------------------------------
    # 5. Get active dynamic field definitions
    # --------------------------------------

    field_definitions = list(
        mongo.db.metadata_fields.find({
            "active": True
        })
    )

    fields_by_name = {
        field["name"].casefold(): field
        for field in field_definitions
    }

    # Normalize metadata field names
    normalized_metadata = {}

    for key, value in metadata.items():

        normalized_key = key.strip().casefold()

        if normalized_key == "division":
            continue

        if normalized_key in normalized_metadata:
            return jsonify({
                "error": f"Duplicate metadata field: {key}"
            }), 400

        if normalized_key not in fields_by_name:
            return jsonify({
                "error": f"Unknown metadata field: {key}"
            }), 400

        field_name = fields_by_name[normalized_key]["name"]

        normalized_metadata[field_name] = value

    # --------------------------------------
    # 6. Validate required fields and types
    # --------------------------------------

    for field in field_definitions:

        field_name = field["name"]
        field_type = field["field_type"]
        required = field.get("required", False)

        value = normalized_metadata.get(field_name)

        # Check required fields
        if required and (
            value is None or
            (isinstance(value, str) and not value.strip())
        ):
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

        # Skip optional fields that were not provided
        if value is None:
            continue

        # Validate text
        if field_type == "text":

            if not isinstance(value, str) or not value.strip():
                return jsonify({
                    "error": f"{field_name} must be valid text"
                }), 400

        # Validate number
        elif field_type == "number":

            if (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
            ):
                return jsonify({
                    "error": f"{field_name} must be a number"
                }), 400

        # Validate date (YYYY-MM-DD)
        elif field_type == "date":

            if not isinstance(value, str):
                return jsonify({
                    "error": f"{field_name} must be a date in YYYY-MM-DD format"
                }), 400

            try:
                datetime.strptime(value, "%Y-%m-%d")
            except ValueError:
                return jsonify({
                    "error": f"{field_name} must be a date in YYYY-MM-DD format"
                }), 400

        # Validate dropdown
        elif field_type == "dropdown":

            if value not in field.get("options", []):
                return jsonify({
                    "error": f"Invalid value for {field_name}. Allowed values: {field.get('options', [])}"
                }), 400

        # Validate boolean
        elif field_type == "boolean":

            if not isinstance(value, bool):
                return jsonify({
                    "error": f"{field_name} must be true or false"
                }), 400

    # Division is always controlled by the server
    normalized_metadata["Division"] = user_division

    # -------------
    # 7. Read and validate actual file content
    # --------------------------------------

    try:
        file_bytes = file.read()

        if not file_bytes:
            return jsonify({
                "error": "The uploaded file is empty"
            }), 400

        # Check file size
        max_file_size = current_app.config["MAX_CONTENT_LENGTH"]

        if len(file_bytes) > max_file_size:
            return jsonify({
                "error": "File size exceeds the allowed limit"
            }), 413

        # Validate PDF signature
        if extension == "pdf":

            if b"%PDF-" not in file_bytes[:1024]:
                return jsonify({
                    "error": "Invalid PDF file content"
                }), 400

        # Validate image format and content
        else:

            with Image.open(BytesIO(file_bytes)) as image:

                actual_format = image.format
                width, height = image.size

                expected_formats = {
                    "png": "PNG",
                    "jpg": "JPEG",
                    "jpeg": "JPEG"
                }

                if actual_format != expected_formats[extension]:
                    return jsonify({
                        "error": "File extension does not match actual image format"
                    }), 400

                # Prevent excessively large image dimensions
                if width * height > 40_000_000:
                    return jsonify({
                        "error": "Image dimensions exceed the allowed limit"
                    }), 400

                image.verify()

        # Extract text only after file validation
        extracted_text = extract_text(file_bytes, safe_filename)

    except Exception:
        current_app.logger.exception("Document validation or OCR failed")

        return jsonify({
            "error": "Invalid file or text extraction failed"
        }), 400

    # --------------------------------------
    # 8. Store original file in GridFS
    # --------------------------------------

    file_id = None
    fs = GridFS(mongo.db)

    try:
        file_id = fs.put(
            BytesIO(file_bytes),
            filename=safe_filename,
            content_type=detected_content_type,
            metadata={
                "uploaded_by": user_id,
                "division": user_division
            }
        )

        # ----------------------------------
        # 9. Store document information
        # ----------------------------------

        document = {
            "filename": safe_filename,
            "file_id": file_id,
            "uploaded_by": user_id,
            "division": user_division,
            "metadata": normalized_metadata,
            "content_type": detected_content_type,
            "uploaded_at": datetime.now(timezone.utc),
            "extracted_text": extracted_text
        }

        result = mongo.db.documents.insert_one(document)

        return jsonify({
            "message": "Document uploaded successfully",
            "document_id": str(result.inserted_id),
            "file_id": str(file_id),
            "filename": safe_filename,
            "division": user_division,
            "metadata": normalized_metadata,
            "extracted_text_length": len(extracted_text)
        }), 201

    except Exception:
        # Remove GridFS file if document record creation fails
        if file_id is not None:
            try:
                fs.delete(file_id)
            except Exception:
                pass

        return jsonify({
            "error": "Document upload failed"
        }), 500


# ==========================================
# 5. GET DOCUMENTS (DIVISION-BASED LISTING)
# ==========================================

@api.route("/documents", methods=["GET"])
@jwt_required()
def get_documents():

    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return jsonify({"error": "Invalid user ID"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    user_division = user["division"]

    # Restrict documents to the user's own division
    filters = {
        "division": user_division
    }

    # Apply dynamic metadata filters
    for key, value in request.args.items():

        # Never allow query parameters to override division
        if key.strip().lower() == "division":
            continue

        filters[f"metadata.{key}"] = value

    documents = mongo.db.documents.find(filters)

    result = []

    for doc in documents:

        result.append({
            "document_id": str(doc["_id"]),
            "filename": doc["filename"],
            "division": doc["division"],
            "metadata": doc.get("metadata", {}),
            "content_type": doc.get("content_type"),
            "uploaded_at": (
                doc.get("uploaded_at").isoformat()
                if doc.get("uploaded_at") else None
            )
        })

    return jsonify({
        "message": "Documents retrieved successfully",
        "count": len(result),
        "documents": result
    }), 200


# ==========================================
# 6.1. GET INDIVIDUAL DOCUMENT DETAILS
# ==========================================

@api.route("/documents/<doc_id>", methods=["GET"])
@jwt_required()
def get_document_details(doc_id):

    user_id = get_jwt_identity()

    # 1. Validate document ID
    if not ObjectId.is_valid(doc_id):
        return jsonify({"error": "Invalid document ID"}), 400

    # 2. Find logged-in user
    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    # 3. Find requested document
    document = mongo.db.documents.find_one({
        "_id": ObjectId(doc_id)
    })

    if not document:
        return jsonify({"error": "Document not found"}), 404

    # 4. Check division access
    same_division = user["division"] == document["division"]

    # 5. Check whether cross-division access was approved
    approved_access = None

    if not same_division:
        approved_access = mongo.db.access_grants.find_one({
            "user_id": user_id,
            "doc_id": ObjectId(doc_id)
        })

    has_access = same_division or bool(approved_access)

    # 6. Determine access-request status
    access_status = "not_required" if same_division else "none"

    if not same_division:
        if approved_access:
            access_status = "approved"
        else:
            latest_request = mongo.db.access_requests.find_one(
                {
                    "requester_id": user_id,
                    "doc_id": ObjectId(doc_id)
                },
                sort=[("requested_at", -1)]
            )

            if latest_request:
                access_status = latest_request["status"]

    # 7. Return limited information if access is not approved
    if not has_access:
        return jsonify({
            "document": {
                "document_id": str(document["_id"]),
                "division": document["division"],
                "access_status": access_status,
                "can_download": False,
                "can_request_access": access_status != "pending"
            }
        }), 200

    # 8. Return full details for authorized users
    uploaded_at = document.get("uploaded_at")

    return jsonify({
        "document": {
            "document_id": str(document["_id"]),
            "filename": document["filename"],
            "division": document["division"],
            "content_type": document.get("content_type"),
            "metadata": document.get("metadata", {}),
            "uploaded_at": (
                uploaded_at.isoformat()
                if uploaded_at and hasattr(uploaded_at, "isoformat")
                else None
            ),
            "access_status": access_status,
            "can_download": True,
            "can_request_access": False
        }
    }), 200

# ==========================================
# 6. DOWNLOAD DOCUMENT WITH APPROVED ACCESS
# ==========================================

@api.route("/documents/<doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):

    user_id = get_jwt_identity()

    if not ObjectId.is_valid(doc_id):
        return jsonify({"error": "Invalid document ID"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    document = mongo.db.documents.find_one({
        "_id": ObjectId(doc_id)
    })

    if not document:
        return jsonify({"error": "Document not found"}), 404

    # Check whether the user belongs to the document's division
    same_division = user["division"] == document["division"]

    # If the user belongs to another division,
    # check whether an approved access grant exists.
    if not same_division:

        approved_access = mongo.db.access_grants.find_one({
            "user_id": user_id,
            "doc_id": ObjectId(doc_id)
        })

        if not approved_access:
            return jsonify({
                "error": "Access denied. No approved access request found."
            }), 403

    # User has permission: retrieve file from GridFS
    try:
        fs = GridFS(mongo.db)

        grid_file = fs.get(document["file_id"])

        file_data = BytesIO(grid_file.read())

        return send_file(
            file_data,
            mimetype=document.get(
                "content_type",
                "application/octet-stream"
            ),
            as_attachment=True,
            download_name=document["filename"]
        )

    except Exception:
        return jsonify({
            "error": "Unable to retrieve document from storage"
        }), 500


# ==========================================
# 7. REQUEST ACCESS TO ANOTHER DIVISION'S DOCUMENT
# ==========================================

@api.route("/access/request", methods=["POST"])
@jwt_required()
def request_document_access():

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    doc_id = data.get("doc_id", "")

    if not isinstance(doc_id, str) or not ObjectId.is_valid(doc_id):
        return jsonify({"error": "Valid document ID is required"}), 400

    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    document = mongo.db.documents.find_one({
        "_id": ObjectId(doc_id)
    })

    if not document:
        return jsonify({"error": "Document not found"}), 404

    # Same-division users already have access
    if user["division"] == document["division"]:
        return jsonify({
            "error": "You already have access to this document"
        }), 400

    # Check whether access was already approved
    existing_grant = mongo.db.access_grants.find_one({
        "user_id": user_id,
        "doc_id": ObjectId(doc_id)
    })

    if existing_grant:
        return jsonify({
            "message": "You already have approved access"
        }), 409

    # Avoid duplicate pending requests
    existing_request = mongo.db.access_requests.find_one({
        "requester_id": user_id,
        "doc_id": ObjectId(doc_id),
        "status": "pending"
    })

    if existing_request:
        return jsonify({
            "message": "Your access request is already pending",
            "request_id": str(existing_request["_id"])
        }), 409

    access_request = {
        "requester_id": user_id,
        "requester_division": user["division"],
        "doc_id": ObjectId(doc_id),
        "owner_division": document["division"],
        "status": "pending",
        "requested_at": datetime.now(timezone.utc)
    }

    result = mongo.db.access_requests.insert_one(access_request)

    return jsonify({
        "message": "Access request submitted successfully",
        "request_id": str(result.inserted_id),
        "status": "pending"
    }), 201


# ==========================================
# 8. VIEW INCOMING ACCESS REQUESTS
# ==========================================

@api.route("/access/requests", methods=["GET"])
@jwt_required()
def get_access_requests():

    user_id = get_jwt_identity()

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    requests_list = mongo.db.access_requests.find({
        "owner_division": user["division"]
    }).sort("requested_at", -1)

    results = []

    for access_request in requests_list:

        requester = mongo.db.users.find_one({
            "_id": ObjectId(access_request["requester_id"])
        })

        document = mongo.db.documents.find_one({
            "_id": access_request["doc_id"]
        })

        results.append({
            "request_id": str(access_request["_id"]),
            "requester_id": access_request["requester_id"],
            "requester_email": requester["email"] if requester else None,
            "requester_division": access_request["requester_division"],
            "document_id": str(access_request["doc_id"]),
            "filename": document["filename"] if document else None,
            "status": access_request["status"],
            "requested_at": access_request["requested_at"].isoformat()
        })

    return jsonify({
        "count": len(results),
        "requests": results
    }), 200


# ==========================================
# 9. APPROVE ACCESS REQUEST
# ==========================================

@api.route("/access/approve", methods=["POST"])
@jwt_required()
def approve_access_request():

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    request_id = data.get("request_id", "")

    if not isinstance(request_id, str) or not ObjectId.is_valid(request_id):
        return jsonify({"error": "Valid request ID is required"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    access_request = mongo.db.access_requests.find_one({
        "_id": ObjectId(request_id)
    })

    if not access_request:
        return jsonify({"error": "Access request not found"}), 404

    # Only the document owner's division can approve
    if user["division"] != access_request["owner_division"]:
        return jsonify({
            "error": "You are not authorized to approve this request"
        }), 403

    if access_request["status"] != "pending":
        return jsonify({
            "error": "This request has already been processed"
        }), 409

    document = mongo.db.documents.find_one({
        "_id": access_request["doc_id"]
    })

    if not document:
        return jsonify({"error": "Document no longer exists"}), 404

    # Create permission for this specific user and document
    grant = {
        "user_id": access_request["requester_id"],
        "doc_id": access_request["doc_id"],
        "granted_by": user_id,
        "granted_at": datetime.now(timezone.utc)
    }

    mongo.db.access_grants.insert_one(grant)

    mongo.db.access_requests.update_one(
        {
            "_id": ObjectId(request_id),
            "status": "pending"
        },
        {
            "$set": {
                "status": "approved",
                "approved_by": user_id,
                "approved_at": datetime.now(timezone.utc)
            }
        }
    )

    return jsonify({
        "message": "Access request approved successfully",
        "status": "approved"
    }), 200


# ==========================================
# 10. REJECT ACCESS REQUEST
# ==========================================

@api.route("/access/reject", methods=["POST"])
@jwt_required()
def reject_access_request():

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    request_id = data.get("request_id", "")

    if not isinstance(request_id, str) or not ObjectId.is_valid(request_id):
        return jsonify({"error": "Valid request ID is required"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    access_request = mongo.db.access_requests.find_one({
        "_id": ObjectId(request_id)
    })

    if not access_request:
        return jsonify({"error": "Access request not found"}), 404

    if user["division"] != access_request["owner_division"]:
        return jsonify({
            "error": "You are not authorized to reject this request"
        }), 403

    if access_request["status"] != "pending":
        return jsonify({
            "error": "This request has already been processed"
        }), 409

    mongo.db.access_requests.update_one(
        {
            "_id": ObjectId(request_id),
            "status": "pending"
        },
        {
            "$set": {
                "status": "rejected",
                "rejected_by": user_id,
                "rejected_at": datetime.now(timezone.utc)
            }
        }
    )

    return jsonify({
        "message": "Access request rejected successfully",
        "status": "rejected"
    }), 200


# ==========================================
# 11. GET ACTIVE METADATA FIELD DEFINITIONS
# ==========================================

@api.route("/metadata/fields", methods=["GET"])
@jwt_required()
def get_metadata_fields():

    fields = mongo.db.metadata_fields.find({
        "active": True
    }).sort("created_at", 1)

    results = []

    for field in fields:
        results.append({
            "field_id": str(field["_id"]),
            "name": field["name"],
            "field_type": field["field_type"],
            "options": field.get("options", []),
            "required": field.get("required", False)
        })

    return jsonify({
        "count": len(results),
        "fields": results
    }), 200


# ==========================================
# 12. CREATE A CUSTOM METADATA FIELD
# ADMIN ONLY
# ==========================================

@api.route("/metadata/fields", methods=["POST"])
@jwt_required()
def create_metadata_field():

    user_id = get_jwt_identity()

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("role") != "admin":
        return jsonify({
            "error": "Only administrators can create metadata fields"
        }), 403

    data = request.get_json(silent=True) or {}

    name = data.get("name")
    field_type = data.get("field_type")
    options = data.get("options", [])
    required = data.get("required", False)

    allowed_types = {
        "text", "number", "date", "dropdown", "boolean"
    }

    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "Field name is required"}), 400

    name = name.strip()

    if name.lower() == "division":
        return jsonify({
            "error": "Division is system-managed and cannot be customized"
        }), 400

    if field_type not in allowed_types:
        return jsonify({
            "error": "Invalid field type"
        }), 400

    if not isinstance(required, bool):
        return jsonify({"error": "Required must be true or false"}), 400

    if field_type == "dropdown":
        if (
            not isinstance(options, list)
            or len(options) == 0
            or not all(isinstance(option, str) and option.strip() for option in options)
        ):
            return jsonify({
                "error": "Dropdown fields require a list of valid options"
            }), 400

        options = list(dict.fromkeys(
            option.strip() for option in options
        ))

    else:
        options = []

    existing = mongo.db.metadata_fields.find_one({
        "name_key": name.casefold()
    })

    if existing:
        return jsonify({
            "error": "A metadata field with this name already exists"
        }), 409

    field = {
        "name": name,
        "name_key": name.casefold(),
        "field_type": field_type,
        "options": options,
        "required": required,
        "active": True,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = mongo.db.metadata_fields.insert_one(field)

    return jsonify({
        "message": "Metadata field created successfully",
        "field_id": str(result.inserted_id),
        "name": name,
        "field_type": field_type
    }), 201


# ==========================================
# 13. UPDATE A CUSTOM METADATA FIELD
# ADMIN ONLY
# ==========================================

@api.route("/metadata/fields/<field_id>", methods=["PUT"])
@jwt_required()
def update_metadata_field(field_id):

    user_id = get_jwt_identity()

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("role") != "admin":
        return jsonify({
            "error": "Only administrators can update metadata fields"
        }), 403

    if not ObjectId.is_valid(field_id):
        return jsonify({"error": "Invalid field ID"}), 400

    field = mongo.db.metadata_fields.find_one({
        "_id": ObjectId(field_id)
    })

    if not field:
        return jsonify({"error": "Metadata field not found"}), 404

    data = request.get_json(silent=True) or {}

    allowed_types = {
        "text", "number", "date", "dropdown", "boolean"
    }

    updates = {}

    if "name" in data:
        name = data["name"]

        if not isinstance(name, str) or not name.strip():
            return jsonify({"error": "Invalid field name"}), 400

        name = name.strip()

        if name.lower() == "division":
            return jsonify({"error": "Division is system-managed"}), 400

        name_key = name.casefold()

        duplicate = mongo.db.metadata_fields.find_one({
            "name_key": name_key,
            "_id": {"$ne": ObjectId(field_id)}
        })

        if duplicate:
            return jsonify({"error": "Field name already exists"}), 409

        updates["name"] = name
        updates["name_key"] = name_key

    new_type = data.get("field_type", field["field_type"])

    if new_type not in allowed_types:
        return jsonify({"error": "Invalid field type"}), 400

    if "field_type" in data:
        updates["field_type"] = new_type

    if new_type == "dropdown":
        options = data.get("options", field.get("options", []))

        if (
            not isinstance(options, list)
            or len(options) == 0
            or not all(isinstance(option, str) and option.strip() for option in options)
        ):
            return jsonify({
                "error": "Dropdown fields require valid options"
            }), 400

        updates["options"] = list(dict.fromkeys(
            option.strip() for option in options
        ))

    else:
        updates["options"] = []

    if "required" in data:
        if not isinstance(data["required"], bool):
            return jsonify({"error": "Required must be true or false"}), 400

        updates["required"] = data["required"]

    updates["updated_at"] = datetime.now(timezone.utc)

    mongo.db.metadata_fields.update_one(
        {"_id": ObjectId(field_id)},
        {"$set": updates}
    )

    return jsonify({
        "message": "Metadata field updated successfully"
    }), 200


# ==========================================
# 14. DEACTIVATE A CUSTOM METADATA FIELD
# ADMIN ONLY
# ==========================================

@api.route("/metadata/fields/<field_id>", methods=["DELETE"])
@jwt_required()
def deactivate_metadata_field(field_id):

    user_id = get_jwt_identity()

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("role") != "admin":
        return jsonify({
            "error": "Only administrators can deactivate metadata fields"
        }), 403

    if not ObjectId.is_valid(field_id):
        return jsonify({"error": "Invalid field ID"}), 400

    result = mongo.db.metadata_fields.update_one(
        {"_id": ObjectId(field_id)},
        {
            "$set": {
                "active": False,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        return jsonify({"error": "Metadata field not found"}), 404

    return jsonify({
        "message": "Metadata field deactivated successfully"
    }), 200


# ==========================================
# SEARCH DOCUMENTS (FILENAME, METADATA, OCR)
# ==========================================

@api.route("/search", methods=["GET"])
@jwt_required()
def search_documents():

    user_id = get_jwt_identity()

    # Validate user
    if not ObjectId.is_valid(user_id):
        return jsonify({"error": "Invalid user ID"}), 400

    user = mongo.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Read search query
    search_query = request.args.get("q", "").strip()

    if not search_query:
        return jsonify({
            "error": "Search query parameter 'q' is required"
        }), 400

    if len(search_query) > 200:
        return jsonify({
            "error": "Search query must not exceed 200 characters"
        }), 400

    # Escape special regex characters
    search_pattern = re.escape(search_query)

    user_division = user["division"]

    # Find documents for which this user has approved access
    approved_grants = mongo.db.access_grants.find(
        {"user_id": user_id},
        {"doc_id": 1}
    )

    granted_doc_ids = [
        grant["doc_id"] for grant in approved_grants
    ]

    # Restrict search to:
    # 1. Documents belonging to the user's division
    # 2. Documents with approved cross-division access
    access_filter = {
        "$or": [
            {"division": user_division},
            {"_id": {"$in": granted_doc_ids}}
        ]
    }

    # Search filenames, OCR text, and every dynamic metadata value
    search_filter = {
        "$or": [
            {
                "filename": {
                    "$regex": search_pattern,
                    "$options": "i"
                }
            },
            {
                "extracted_text": {
                    "$regex": search_pattern,
                    "$options": "i"
                }
            },
            {
                "$expr": {
                    "$anyElementTrue": [
                        {
                            "$map": {
                                "input": {
                                    "$objectToArray": {
                                        "$ifNull": ["$metadata", {}]
                                    }
                                },
                                "as": "item",
                                "in": {
                                    "$regexMatch": {
                                        "input": {
                                            "$convert": {
                                                "input": "$$item.v",
                                                "to": "string",
                                                "onError": "",
                                                "onNull": ""
                                            }
                                        },
                                        "regex": search_pattern,
                                        "options": "i"
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]
    }

    # Apply both access control and search conditions
    pipeline = [
        {
            "$match": {
                "$and": [
                    access_filter,
                    search_filter
                ]
            }
        },
        {
            "$sort": {
                "uploaded_at": -1
            }
        },
        {
            "$limit": 100
        }
    ]

    documents = list(
        mongo.db.documents.aggregate(pipeline)
    )

    results = []

    for doc in documents:
        results.append({
            "document_id": str(doc["_id"]),
            "filename": doc["filename"],
            "division": doc["division"],
            "metadata": doc.get("metadata", {}),
            "content_type": doc.get("content_type"),
            "uploaded_at": (
                doc["uploaded_at"].isoformat()
                if doc.get("uploaded_at") else None
            )
        })

    return jsonify({
        "message": "Search completed successfully",
        "query": search_query,
        "count": len(results),
        "results": results
    }), 200
