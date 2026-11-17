import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  Building2,
  LoaderCircle,
  X,
  FolderSearch,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";
import Sidebar from "../components/Sidebar";

import "./AdvancedSearch.css";

function AdvancedSearch() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleSearch = async (event) => {
    event.preventDefault();

    const searchTerm = query.trim();

    if (!searchTerm) {
      setError("Please enter a search term.");
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (searchTerm.length > 200) {
      setError("Search must not exceed 200 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);
    setSearchedQuery(searchTerm);
    setResults([]);

    try {
      const response = await api.get("/search", {
        params: { q: searchTerm },
      });

      setResults(response.data.results || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to search documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  

  const handleDownload = async (document) => {
    setDownloadingId(document.document_id);
    setError("");

    try {
      const response = await api.get(
        `/documents/${document.document_id}/download`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: document.content_type || "application/octet-stream",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = downloadUrl;
      link.download = document.filename || "document";
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "You do not have permission to download this document."
          : "Unable to download the document. Please try again."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

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

  return (
    <div className="advanced-search-layout">
      <Sidebar user={user} />

      <main className="advanced-search-main">
        <header className="advanced-search-header">
          <div>
            <h1>Advanced Search</h1>
            <p>Find documents across filenames, metadata and OCR content.</p>
          </div>

          <div className="advanced-search-user">
            <div className="search-user-info">
              <span>{user?.username || user?.email || "User"}</span>
              <small>{user?.division || "Division"}</small>
            </div>

            <button
              type="button"
              className="search-logout-button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="advanced-search-content">
          <div className="search-intro">
            <div className="search-intro-icon">
              <FolderSearch size={28} />
            </div>

            <div>
              <h2>Search your documents</h2>
              <p>
                Search document names, custom metadata fields and text
                extracted from uploaded PDFs and images.
              </p>
            </div>
          </div>

          <form className="advanced-search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search size={21} />

              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter a filename, department, report type or keyword..."
                maxLength={200}
                aria-label="Search documents"
              />

              {query && (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search input"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="advanced-search-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="search-spinner" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search
                </>
              )}
            </button>
          </form>

          <div className="search-capabilities">
            <span>
              <FileText size={15} />
              Filename
            </span>
            <span>
              <Building2 size={15} />
              Dynamic metadata
            </span>
            <span>
              <Search size={15} />
              OCR content
            </span>
          </div>

          {error && (
            <div className="advanced-search-error" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <div className="search-loading">
              <LoaderCircle size={30} className="search-spinner" />
              <p>Searching your documents...</p>
            </div>
          )}

          {!loading && hasSearched && !error && (
            <section className="search-results-section">
              <div className="search-results-heading">
                <div>
                  <h2>Search Results</h2>
                  <p>
                    Results for <strong>"{searchedQuery}"</strong>
                  </p>
                </div>

                <span className="search-result-count">
                  {results.length} {results.length === 1 ? "result" : "results"}
                </span>
              </div>

              {results.length === 0 ? (
                <div className="search-empty-state">
                  <FolderSearch size={44} />
                  <h3>No matching documents found</h3>
                  <p>
                    Try another keyword or check the spelling of your search.
                  </p>
                </div>
              ) : (
                <div className="search-results-list">
                  {results.map((document) => (
                    <article
                      className="search-result-card"
                      key={document.document_id}
                    >
                      <div className="search-result-top">
                        <div className="search-result-file-icon">
                          <FileText size={25} />
                        </div>

                        <div className="search-result-title">
                          <h3>{document.filename}</h3>

                          <span className="search-result-division">
                            <Building2 size={14} />
                            {document.division}
                          </span>
                        </div>

                        <span className="search-file-type">
                          {document.filename?.split(".").pop()?.toUpperCase() ||
                            "FILE"}
                        </span>
                      </div>

                      <div className="search-result-metadata">
                        {Object.entries(document.metadata || {}).map(
                          ([key, value]) => (
                            <div
                              className="search-metadata-item"
                              key={key}
                            >
                              <span>{key}</span>
                              <strong>{String(value)}</strong>
                            </div>
                          )
                        )}
                      </div>

                      <div className="search-result-footer">
                        <span className="search-upload-date">
                          <Calendar size={15} />
                          {formatDate(document.uploaded_at)}
                        </span>

                        <div className="search-result-actions">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/documents/${document.document_id}`
                              )
                            }
                            className="search-view-button"
                          >
                            <Eye size={16} />
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(document)}
                            className="search-download-button"
                            disabled={
                              downloadingId === document.document_id
                            }
                          >
                            {downloadingId === document.document_id ? (
                              <LoaderCircle
                                size={16}
                                className="search-spinner"
                              />
                            ) : (
                              <Download size={16} />
                            )}
                            Download
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {!hasSearched && !loading && (
            <div className="search-initial-state">
              <div className="search-initial-icon">
                <Search size={35} />
              </div>
              <h3>Start searching</h3>
              <p>
                Enter a keyword above to find matching documents in your
                accessible document collection.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdvancedSearch;