
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Files,
  Clock3,
  FileType,
  Building2,
  Search,
  RefreshCw,
  X,
  Download,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import DocumentTable from "../components/DocumentTable";

import "./Dashboard.css";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dashboard states
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Initial document retrieval
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
            "Unable to retrieve documents. Please try again."
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

  // Refresh documents manually
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/documents");

      setDocuments(response.data.documents || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Unable to retrieve documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Search by filename and dynamic metadata
  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return documents;
    }

    return documents.filter((doc) => {
      const filename = (doc.filename || "").toLowerCase();

      const metadata = Object.entries(doc.metadata || {})
        .map(([key, value]) => `${key} ${value}`)
        .join(" ")
        .toLowerCase();

      return (
        filename.includes(query) ||
        metadata.includes(query)
      );
    });
  }, [documents, searchTerm]);

  // Calculate recent uploads
  const recentUploads = documents.filter((doc) => {
    if (!doc.uploaded_at) {
      return false;
    }

    const uploadedDate = new Date(doc.uploaded_at);
    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return (
      !Number.isNaN(uploadedDate.getTime()) &&
      uploadedDate >= sevenDaysAgo
    );
  }).length;

  // Count different file formats
  const fileTypes = new Set(
    documents
      .map((doc) => doc.content_type)
      .filter(Boolean)
  ).size;

  // Download document through authenticated API
  const handleDownload = async (doc) => {
    try {
      const response = await api.get(
        `/documents/${doc.document_id}/download`,
        {
          responseType: "blob",
        }
      );

      const fileURL = window.URL.createObjectURL(response.data);

      const link = document.createElement("a");
      link.href = fileURL;
      link.download = doc.filename || "document";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileURL);
    } catch (err) {
      if (err.response?.status === 403) {
        alert(
          "Access denied. You do not have permission to download this document."
        );
      } else {
        alert(
          "Document download failed. Please try again."
        );
      }
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-layout">

      {/* Sidebar */}
      <Sidebar user={user} />

      <main className="dashboard-main">

        {/* Header */}
        <Header
          user={user}
          onLogout={handleLogout}
        />

        <div className="dashboard-content">

          {/* Welcome Section */}
          <section className="welcome-section">
            <div>
              <p className="welcome-label">
                OVERVIEW
              </p>

              <h1>
                Welcome back, {user?.username || "User"}!
              </h1>

              <p>
                Here's what's happening with your division's documents.
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </section>

          {/* Statistics Cards */}
          <section className="stats-grid">

            <StatCard
              title="Total Documents"
              value={documents.length}
              description="Documents in your division"
              icon={Files}
              color="blue"
            />

            <StatCard
              title="Recent Uploads"
              value={recentUploads}
              description="Uploaded in the last 7 days"
              icon={Clock3}
              color="green"
            />

            <StatCard
              title="File Types"
              value={fileTypes}
              description="Different file formats"
              icon={FileType}
              color="purple"
            />

            <StatCard
              title="Your Division"
              value={user?.division || "—"}
              description="Your assigned workspace"
              icon={Building2}
              color="orange"
            />

          </section>

          {/* Document Hub */}
          <section className="documents-section">

            <div className="documents-heading">
              <div>
                <h2>Document Hub</h2>

                <p>
                  View and manage documents available to your division.
                </p>
              </div>

              <span className="document-count">
                {filteredDocuments.length} Documents
              </span>
            </div>

            {/* Search Bar */}
            <div className="document-toolbar">

              <div className="document-search">
                <Search size={19} />

                <input
                  type="text"
                  placeholder="Search filenames or metadata..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    <X size={17} />
                  </button>
                )}

              </div>

            </div>

            {/* Loading and Error States */}
            {loading ? (
              <div className="dashboard-message">
                Loading your documents...
              </div>

            ) : error ? (

              <div className="dashboard-error">
                <p>{error}</p>

                <button
                  type="button"
                  onClick={handleRefresh}
                >
                  Try Again
                </button>
              </div>

            ) : (

              <DocumentTable
                documents={filteredDocuments}
                onView={(doc) => navigate(`/documents/${doc.document_id}`)}
                onDownload={handleDownload}
              />

            )}

          </section>

        </div>
      </main>

      {/* Document Details Modal */}
      {selectedDocument && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedDocument(null)}
        >

          <div
            className="document-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="modal-heading">
              <h2>Document Details</h2>

              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <h3>
              {selectedDocument.filename}
            </h3>

            <p>
              <strong>Division:</strong>{" "}
              {selectedDocument.division}
            </p>

            <p>
              <strong>Content Type:</strong>{" "}
              {selectedDocument.content_type || "Not available"}
            </p>

            <p>
              <strong>Uploaded:</strong>{" "}
              {selectedDocument.uploaded_at
                ? new Date(
                    selectedDocument.uploaded_at
                  ).toLocaleString()
                : "Not available"}
            </p>

            <h4>Metadata</h4>

            {Object.entries(
              selectedDocument.metadata || {}
            ).length > 0 ? (

              Object.entries(
                selectedDocument.metadata
              ).map(([key, value]) => (
                <p key={key}>
                  <strong>{key}:</strong>{" "}
                  {String(value)}
                </p>
              ))

            ) : (

              <p>No metadata available.</p>

            )}

            <button
              type="button"
              className="modal-download-button"
              onClick={() =>
                handleDownload(selectedDocument)
              }
            >
              <Download size={17} />
              Download Document
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
