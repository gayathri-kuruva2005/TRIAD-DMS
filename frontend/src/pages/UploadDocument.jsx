
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, ArrowLeft, CheckCircle } from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./UploadDocument.css";

function UploadDocument() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState([]);
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [loadingFields, setLoadingFields] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load dynamic metadata definitions from Flask
  useEffect(() => {
    let cancelled = false;

    const loadFields = async () => {
      try {
        const response = await api.get("/metadata/fields");

        if (!cancelled) {
          const receivedFields = response.data.fields || [];

          // Division is assigned automatically by the backend
          const editableFields = receivedFields.filter(
            (field) => field.name.toLowerCase() !== "division"
          );

          setFields(editableFields);

          const initialValues = {};
          editableFields.forEach((field) => {
            initialValues[field.name] =
              field.field_type === "boolean" ? "" : "";
          });

          setMetadata(initialValues);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
            "Unable to load metadata fields."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingFields(false);
        }
      }
    };

    loadFields();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMetadataChange = (fieldName, value, fieldType) => {
    let convertedValue = value;

    if (fieldType === "number" && value !== "") {
      convertedValue = Number(value);
    }

    if (fieldType === "boolean" && value !== "") {
      convertedValue = value === "true";
    }

    setMetadata((previous) => ({
      ...previous,
      [fieldName]: convertedValue,
    }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select a document to upload.");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    const cleanedMetadata = {};

    fields.forEach((field) => {
      const value = metadata[field.name];

      if (value !== "" && value !== null && value !== undefined) {
        cleanedMetadata[field.name] = value;
      }
    });

    formData.append("metadata", JSON.stringify(cleanedMetadata));

    try {
      setUploading(true);

      const response = await api.post(
        "/documents/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess(
        response.data.message || "Document uploaded successfully!"
      );

      setFile(null);

      setMetadata((previous) => {
        const cleared = {};
        Object.keys(previous).forEach((key) => {
          cleared[key] = "";
        });
        return cleared;
      });

      event.target.reset();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Document upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      required: field.required,
      value: metadata[field.name] ?? "",
      onChange: (event) =>
        handleMetadataChange(
          field.name,
          event.target.value,
          field.field_type
        ),
    };

    if (field.field_type === "dropdown") {
      return (
        <select {...commonProps}>
          <option value="">Select {field.name}</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.field_type === "boolean") {
      return (
        <select {...commonProps}>
          <option value="">Select an option</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    const inputType = {
      text: "text",
      number: "number",
      date: "date",
    }[field.field_type] || "text";

    return (
      <input
        {...commonProps}
        type={inputType}
        placeholder={`Enter ${field.name}`}
        step={field.field_type === "number" ? "any" : undefined}
      />
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} />

      <main className="dashboard-main">
        <Header user={user} onLogout={handleLogout} />

        <div className="upload-page-content">
          <button
            type="button"
            className="upload-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <section className="upload-heading">
            <div className="upload-heading-icon">
              <Upload size={25} />
            </div>

            <div>
              <h1>Upload Document</h1>
              <p>
                Add a document and provide its metadata for your division.
              </p>
            </div>
          </section>

          <form className="upload-form" onSubmit={handleUpload}>
            <section className="upload-form-section">
              <h2>Document Information</h2>
              <p className="upload-section-description">
                Select a PDF or image file to upload.
              </p>

              <label className="upload-label" htmlFor="document-file">
                Select Document <span>*</span>
              </label>

              <div className="file-upload-area">
                <FileText size={35} />

                <input
                  id="document-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  required
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                />

                <p>
                  Supported formats: PDF, PNG, JPG and JPEG
                </p>

                {file && (
                  <div className="selected-file">
                    <CheckCircle size={17} />
                    {file.name}
                  </div>
                )}
              </div>

              <div className="upload-division-info">
                <strong>Your Division</strong>
                <span>{user?.division || "Not available"}</span>
                <small>
                  Your document will automatically be assigned to this division.
                </small>
              </div>
            </section>

            <section className="upload-form-section">
              <h2>Custom Metadata</h2>
              <p className="upload-section-description">
                Complete the configured fields below.
              </p>

              {loadingFields ? (
                <p>Loading metadata fields...</p>
              ) : fields.length === 0 ? (
                <p>No custom metadata fields are currently configured.</p>
              ) : (
                <div className="metadata-form-grid">
                  {fields.map((field) => (
                    <div className="metadata-form-field" key={field.field_id}>
                      <label htmlFor={field.name}>
                        {field.name}
                        {field.required && <span> *</span>}
                      </label>

                      {renderField(field)}

                      <small>
                        {field.field_type}
                        {field.required ? " • Required" : " • Optional"}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {error && (
              <div className="upload-alert upload-alert-error">
                {error}
              </div>
            )}

            {success && (
              <div className="upload-alert upload-alert-success">
                <CheckCircle size={18} />
                {success}
              </div>
            )}

            <div className="upload-form-actions">
              <button
                type="button"
                className="upload-cancel-button"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="upload-submit-button"
                disabled={uploading || loadingFields}
              >
                <Upload size={17} />
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default UploadDocument;
