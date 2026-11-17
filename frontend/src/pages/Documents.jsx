
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  Building2,
  LoaderCircle,
  Files,
  RefreshCw,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";
import Sidebar from "../components/Sidebar";

import "./Documents.css";

function Documents() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  // ---------------------------------------
  // FETCH DOCUMENTS (REFRESH BUTTON)
  // ---------------------------------------

  const fetchDocuments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/documents");

      setDocuments(response.data.documents || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to load documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // INITIAL DOCUMENT LOADING
  // ---------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      try {
        const response = await api.get("/documents");

        if (!cancelled) {
          setDocuments(response.data.documents || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              "Unable to load documents. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------
  // SEARCH AND FILTER DOCUMENTS
  // ---------------------------------------

  const filteredDocuments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return documents;
    }

    return documents.filter((doc) => {
      const filename = (doc.filename || "").toLowerCase();
      const division = (doc.division || "").toLowerCase();
      const metadata = JSON.stringify(
        doc.metadata || {}
      ).toLowerCase();

      return (
        filename.includes(term) ||
        division.includes(term) ||
        metadata.includes(term)
      );
    });
  }, [documents, searchTerm]);

  // ---------------------------------------
  // FORMAT UPLOAD DATE
  // ---------------------------------------

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ---------------------------------------
  // DOWNLOAD DOCUMENT
  // ---------------------------------------

  const handleDownload = async (doc) => {
    setDownloadingId(doc.document_id);
    setError("");

    try {
      const response = await api.get(
        `/documents/${doc.document_id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: doc.content_type || "application/octet-stream",
      });

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");

      link.href = downloadUrl;
      link.download = doc.filename || "document";

      window.document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "You do not have permission to download this document."
          : "Unable to download the document."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // ---------------------------------------
  // PAGE UI
  // ---------------------------------------

  return (
    <div className="documents-layout">

      {/* Sidebar */}
      <Sidebar user={user} />

      <main className="documents-main">

        {/* Header */}
        <header className="documents-header">
          <div>
            <h1>Documents</h1>
            <p>
              Browse and manage documents in your division.
            </p>
          </div>

          <div className="documents-user">
            <div>
              <strong>
                {user?.username || user?.email || "User"}
              </strong>

              <small>
                {user?.division || "Division"}
              </small>
            </div>

            <button
              type="button"
              className="documents-logout"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <section className="documents-content">

          {/* Welcome Section */}
          <div className="documents-welcome">
            <div>
              <span className="documents-eyebrow">
                DOCUMENT MANAGEMENT
              </span>

              <h2>Document Library</h2>

              <p>
                View, search and download documents available
                to your division.
              </p>
            </div>

            <button
              type="button"
              className="documents-refresh"
              onClick={fetchDocuments}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Document Statistics */}
          <div className="documents-stats">
            <div className="documents-stat-icon">
              <Files size={24} />
            </div>

            <div>
              <span>Total Documents</span>
              <strong>{documents.length}</strong>
            </div>
          </div>

          {/* Documents Panel */}
          <section className="documents-panel">

            <div className="documents-panel-heading">
              <div>
                <h3>All Documents</h3>

                <p>
                  Documents available in your assigned division.
                </p>
              </div>

              <span className="documents-count">
                {filteredDocuments.length} Documents
              </span>
            </div>

            {/* Search Input */}
            <div className="documents-search">
              <Search size={19} />

              <input
                type="text"
                placeholder="Search filenames or metadata..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="documents-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="documents-state">
                <LoaderCircle
                  size={30}
                  className="documents-spinner"
                />

                <p>Loading documents...</p>
              </div>

            ) : filteredDocuments.length === 0 ? (

              /* Empty State */
              <div className="documents-state">
                <FileText size={42} />

                <h3>
                  {documents.length === 0
                    ? "No documents available"
                    : "No matching documents"}
                </h3>

                <p>
                  {documents.length === 0
                    ? "Upload a document to see it listed here."
                    : "Try searching with another filename or metadata value."}
                </p>
              </div>

            ) : (

              /* Documents Table */
              <div className="documents-table-wrapper">
                <table className="documents-table">

                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Division</th>
                      <th>Metadata</th>
                      <th>Uploaded On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.document_id}>

                        {/* Document Name */}
                        <td>
                          <div className="documents-file-name">
                            <FileText size={19} />

                            <span>{doc.filename}</span>
                          </div>
                        </td>

                        {/* Division */}
                        <td>
                          <span className="documents-division">
                            <Building2 size={13} />

                            {doc.division}
                          </span>
                        </td>

                        {/* Dynamic Metadata */}
                        <td>
                          <div className="documents-metadata">
                            {Object.entries(
                              doc.metadata || {}
                            ).map(([key, value]) => (
                              <div key={key}>
                                <strong>{key}:</strong>{" "}
                                {String(value)}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Upload Date */}
                        <td>
                          <span className="documents-date">
                            <Calendar size={14} />

                            {formatDate(doc.uploaded_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="documents-actions">

                            <button
                              type="button"
                              className="documents-view-button"
                              title="View Details"
                              onClick={() =>
                                navigate(
                                  `/documents/${doc.document_id}`
                                )
                              }
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              className="documents-download-button"
                              title="Download"
                              onClick={() =>
                                handleDownload(doc)
                              }
                              disabled={
                                downloadingId === doc.document_id
                              }
                            >
                              {downloadingId === doc.document_id ? (
                                <LoaderCircle
                                  size={17}
                                  className="documents-spinner"
                                />
                              ) : (
                                <Download size={17} />
                              )}
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            )}

          </section>
        </section>
      </main>
    </div>
  );
}

export default Documents;
