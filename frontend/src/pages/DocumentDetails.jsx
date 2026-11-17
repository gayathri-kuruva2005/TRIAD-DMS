
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  FileText,
  Download,
  Lock,
  Send,
  Calendar,
  Building2,
  LoaderCircle,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./DocumentDetails.css";

function DocumentDetails() {
  const { docId } = useParams();
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [document, setDocument] = useState(null);
  const [loadedDocId, setLoadedDocId] = useState(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  const loading = loadedDocId !== docId;

  // ---------------------------------------
  // FETCH DOCUMENT DETAILS
  // ---------------------------------------

  useEffect(() => {
    let cancelled = false;

    api.get(`/documents/${docId}`)
      .then((response) => {
        if (!cancelled) {
          setDocument(response.data.document);
          setError("");
          setLoadedDocId(docId);
          setMessage("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
            "Unable to load document details."
          );

          setLoadedDocId(docId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [docId]);

  // ---------------------------------------
  // REQUEST DOCUMENT ACCESS
  // ---------------------------------------

  const handleRequestAccess = async () => {
    try {
      setRequesting(true);
      setMessage("");

      const response = await api.post("/access/request", {
        doc_id: docId,
      });

      setMessage(
        response.data.message ||
        "Access request submitted successfully."
      );

      setDocument((previous) => ({
        ...previous,
        access_status: "pending",
        can_download: false,
        can_request_access: false,
      }));

    } catch (err) {
      const status = err.response?.status;

      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to submit access request.";

      setMessage(errorMessage);

      if (status === 409) {
        if (errorMessage.toLowerCase().includes("pending")) {
          setDocument((previous) => ({
            ...previous,
            access_status: "pending",
            can_request_access: false,
          }));
        } else if (
          errorMessage.toLowerCase().includes("approved")
        ) {
          window.location.reload();
        }
      }

    } finally {
      setRequesting(false);
    }
  };

  // ---------------------------------------
  // DOWNLOAD DOCUMENT
  // ---------------------------------------

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setMessage("");

      const response = await api.get(
        `/documents/${docId}/download`,
        {
          responseType: "blob",
        }
      );

      const fileURL = window.URL.createObjectURL(response.data);

      const link = window.document.createElement("a");

      link.href = fileURL;
      link.download = document.filename || "document";

      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      window.setTimeout(() => {
        window.URL.revokeObjectURL(fileURL);
      }, 1000);

      setMessage("Document downloaded successfully.");

    } catch (error) {
      console.error("Document download error:", error);

      setMessage(
        error.response?.status === 403
          ? "Access denied. You do not have permission to download this document."
          : error.response?.status === 401
            ? "Your session has expired. Please log in again."
            : "Document download failed. Please try again."
      );

    } finally {
      setDownloading(false);
    }
  };

  // ---------------------------------------
  // LOGOUT
  // ---------------------------------------

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ---------------------------------------
  // RENDER
  // ---------------------------------------

  return (
    <div className="dashboard-layout">

      <Sidebar user={user} />

      <main className="dashboard-main">

        <Header
          user={user}
          onLogout={handleLogout}
        />

        <div className="details-page-content">

          {/* Back Button */}

          <button
            type="button"
            className="details-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          {/* Page Heading */}

          <div className="details-page-heading">
            <div>
              <span className="details-eyebrow">
                DOCUMENT MANAGEMENT
              </span>

              <h1>Document Details</h1>

              <p>
                View document information and manage access.
              </p>
            </div>
          </div>

          {/* Loading State */}

          {loading && (
            <div className="details-loading">
              <LoaderCircle size={28} className="spin" />
              <p>Loading document details...</p>
            </div>
          )}

          {/* Error State */}

          {!loading && error && (
            <div className="details-error">
              <Lock size={24} />
              <p>{error}</p>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {/* Document Details */}

          {!loading && !error && document && (
            <>

              {/* Document Header Card */}

              <section className="details-document-card">

                <div className="details-file-icon">
                  <FileText size={30} />
                </div>

                <div className="details-file-info">
                  <h2>
                    {document.filename || "Restricted document"}
                  </h2>

                  <p>
                    Document ID: {document.document_id}
                  </p>
                </div>

                <span className="details-status">
                  {document.can_download
                    ? "Accessible"
                    : document.access_status === "pending"
                      ? "Pending"
                      : "Restricted"}
                </span>

              </section>

              {/* Document Information */}

              <section className="details-information-card">

                <h3>Document Information</h3>

                <div className="details-info-grid">

                  <div className="details-info-item">
                    <Building2 size={19} />

                    <div>
                      <span>Division</span>
                      <strong>{document.division}</strong>
                    </div>
                  </div>

                  {document.content_type && (
                    <div className="details-info-item">
                      <FileText size={19} />

                      <div>
                        <span>File Type</span>
                        <strong>{document.content_type}</strong>
                      </div>
                    </div>
                  )}

                  {document.uploaded_at && (
                    <div className="details-info-item">
                      <Calendar size={19} />

                      <div>
                        <span>Uploaded On</span>

                        <strong>
                          {new Date(
                            document.uploaded_at
                          ).toLocaleDateString()}
                        </strong>
                      </div>
                    </div>
                  )}

                </div>

              </section>

              {/* Custom Metadata */}

              {document.can_download && (
                <section className="details-information-card">

                  <h3>Custom Metadata</h3>

                  {Object.keys(document.metadata || {}).length > 0 ? (

                    <div className="details-metadata-grid">

                      {Object.entries(
                        document.metadata || {}
                      ).map(([key, value]) => (

                        <div
                          className="details-metadata-item"
                          key={key}
                        >
                          <span>{key}</span>

                          <strong>{String(value)}</strong>
                        </div>

                      ))}

                    </div>

                  ) : (
                    <p>No additional metadata available.</p>
                  )}

                </section>
              )}

              {/* Document Access */}

              <section className="details-access-card">

                <div className="details-access-icon">
                  {document.can_download
                    ? <Download size={24} />
                    : <Lock size={24} />}
                </div>

                <div className="details-access-content">

                  <h3>Document Access</h3>

                  <p>
                    {document.can_download
                      ? "You have permission to access and download this document."
                      : document.access_status === "pending"
                        ? "Your access request is awaiting approval from the owning division."
                        : "You need approval from the owning division before downloading this document."}
                  </p>

                  {/* Success / Error Message */}

                  {message && (
                    <div className="details-message">
                      {message}
                    </div>
                  )}

                  {/* Download Button */}

                  {document.can_download && (
                    <button
                      type="button"
                      className="details-download-button"
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      <Download size={18} />

                      {downloading
                        ? "Downloading..."
                        : "Download Document"}
                    </button>
                  )}

                  {/* Pending Access */}

                  {!document.can_download &&
                    document.access_status === "pending" && (

                      <button
                        type="button"
                        className="details-pending-button"
                        disabled
                      >
                        <Lock size={18} />
                        Request Pending
                      </button>
                    )}

                  {/* Request Access */}

                  {!document.can_download &&
                    document.access_status !== "pending" && (

                      <button
                        type="button"
                        className="details-request-button"
                        onClick={handleRequestAccess}
                        disabled={requesting}
                      >
                        <Send size={18} />

                        {requesting
                          ? "Sending Request..."
                          : "Request Access"}
                      </button>
                    )}

                </div>

              </section>

            </>
          )}

        </div>

      </main>

    </div>
  );
}

export default DocumentDetails;
