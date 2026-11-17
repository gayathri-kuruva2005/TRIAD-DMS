
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Inbox,
  RefreshCw,
  FileText,
  Building2,
  LoaderCircle,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./AccessRequests.css";

function AccessRequests() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // ---------------------------------------
  // LOAD ACCESS REQUESTS
  // ---------------------------------------

  useEffect(() => {
    let cancelled = false;

    api.get("/access/requests")
      .then((response) => {
        if (!cancelled) {
          setRequests(response.data.requests || []);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
            "Unable to load access requests."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------
  // REFRESH REQUESTS
  // ---------------------------------------

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get("/access/requests");

      setRequests(response.data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Unable to refresh access requests."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // APPROVE OR REJECT REQUEST
  // ---------------------------------------

  const handleRequestAction = async (requestId, action) => {
    try {
      setProcessingId(requestId);
      setMessage("");
      setError("");

      const endpoint =
        action === "approve"
          ? "/access/approve"
          : "/access/reject";

      const response = await api.post(endpoint, {
        request_id: requestId,
      });

      setRequests((previousRequests) =>
        previousRequests.map((item) =>
          item.request_id === requestId
            ? { ...item, status: action === "approve" ? "approved" : "rejected" }
            : item
        )
      );

      setMessage(
        response.data.message ||
        `Access request ${action}d successfully.`
      );

    } catch (err) {
      setError(
        err.response?.data?.error ||
        `Unable to ${action} this request.`
      );

      // Reload the inbox in case another user processed the request.
      try {
        const response = await api.get("/access/requests");
        setRequests(response.data.requests || []);
      } catch {
        // Keep the existing request list if refreshing also fails.
      }
    } finally {
      setProcessingId(null);
    }
  };

  // ---------------------------------------
  // FILTER REQUESTS
  // ---------------------------------------

  const filteredRequests = useMemo(() => {
    if (activeFilter === "all") {
      return requests;
    }

    return requests.filter(
      (item) => item.status === activeFilter
    );
  }, [requests, activeFilter]);

  const pendingCount = requests.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    (item) => item.status === "approved"
  ).length;

  const rejectedCount = requests.filter(
    (item) => item.status === "rejected"
  ).length;

  // ---------------------------------------
  // LOGOUT
  // ---------------------------------------

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ---------------------------------------
  // PAGE UI
  // ---------------------------------------

  return (
    <div className="dashboard-layout">

      <Sidebar user={user} />

      <main className="dashboard-main">

        <Header
          user={user}
          onLogout={handleLogout}
        />

        <div className="access-page-content">

          {/* Page heading */}

          <div className="access-page-heading">

            <div>
              <span className="access-eyebrow">
                DOCUMENT MANAGEMENT
              </span>

              <h1>Access Requests</h1>

              <p>
                Review and manage requests for documents
                belonging to your division.
              </p>
            </div>

            <button
              type="button"
              className="access-refresh-button"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={17} />
              Refresh
            </button>

          </div>

          {/* Back navigation */}

          <button
            type="button"
            className="access-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          {/* Summary cards */}

          <div className="access-stats-grid">

            <div className="access-stat-card">
              <div className="access-stat-icon total">
                <Inbox size={21} />
              </div>

              <div>
                <span>Total Requests</span>
                <strong>{requests.length}</strong>
              </div>
            </div>

            <div className="access-stat-card">
              <div className="access-stat-icon pending">
                <Clock size={21} />
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
            </div>

            <div className="access-stat-card">
              <div className="access-stat-icon approved">
                <Check size={21} />
              </div>

              <div>
                <span>Approved</span>
                <strong>{approvedCount}</strong>
              </div>
            </div>

            <div className="access-stat-card">
              <div className="access-stat-icon rejected">
                <X size={21} />
              </div>

              <div>
                <span>Rejected</span>
                <strong>{rejectedCount}</strong>
              </div>
            </div>

          </div>

          {/* Notifications */}

          {message && (
            <div className="access-success-message">
              {message}
            </div>
          )}

          {error && (
            <div className="access-error-message">
              {error}
            </div>
          )}

          {/* Request list */}

          <section className="access-requests-section">

            <div className="access-section-heading">
              <div>
                <h2>Request Inbox</h2>
                <p>
                  Requests submitted by users from other divisions.
                </p>
              </div>
            </div>

            {/* Filters */}

            <div className="access-filter-tabs">

              {[
                { label: "All Requests", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ].map((filter) => (

                <button
                  key={filter.value}
                  type="button"
                  className={
                    activeFilter === filter.value
                      ? "access-filter active"
                      : "access-filter"
                  }
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>

              ))}

            </div>

            {/* Loading */}

            {loading ? (
              <div className="access-loading">
                <LoaderCircle
                  size={30}
                  className="access-spinner"
                />
                <p>Loading access requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (

              <div className="access-empty-state">
                <Inbox size={45} />

                <h3>
                  {activeFilter === "all"
                    ? "No access requests yet"
                    : `No ${activeFilter} requests`}
                </h3>

                <p>
                  Requests for your division's documents
                  will appear here.
                </p>
              </div>

            ) : (

              <div className="access-request-list">

                {filteredRequests.map((item) => (

                  <article
                    className="access-request-card"
                    key={item.request_id}
                  >

                    <div className="access-request-top">

                      <div className="access-request-file">
                        <div className="access-file-icon">
                          <FileText size={23} />
                        </div>

                        <div>
                          <h3>
                            {item.filename || "Document"}
                          </h3>

                          <span>
                            Document ID: {item.document_id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`access-status-badge ${item.status}`}
                      >
                        {item.status}
                      </span>

                    </div>

                    <div className="access-request-details">

                      <div>
                        <span>Requested By</span>
                        <strong>
                          {item.requester_email || "Unknown user"}
                        </strong>
                      </div>

                      <div>
                        <span>Requester Division</span>

                        <strong className="access-division">
                          <Building2 size={15} />
                          {item.requester_division}
                        </strong>
                      </div>

                      <div>
                        <span>Requested On</span>
                        <strong>
                          {item.requested_at
                            ? new Date(
                                item.requested_at
                              ).toLocaleString()
                            : "Not available"}
                        </strong>
                      </div>

                    </div>

                    {item.status === "pending" && (

                      <div className="access-request-actions">

                        <button
                          type="button"
                          className="access-approve-button"
                          onClick={() =>
                            handleRequestAction(
                              item.request_id,
                              "approve"
                            )
                          }
                          disabled={processingId !== null}
                        >
                          {processingId === item.request_id
                            ? "Processing..."
                            : (
                              <>
                                <Check size={17} />
                                Approve
                              </>
                            )}
                        </button>

                        <button
                          type="button"
                          className="access-reject-button"
                          onClick={() =>
                            handleRequestAction(
                              item.request_id,
                              "reject"
                            )
                          }
                          disabled={processingId !== null}
                        >
                          <X size={17} />
                          Reject
                        </button>

                      </div>

                    )}

                    {item.status !== "pending" && (
                      <div className="access-processed-label">
                        This request has already been processed.
                      </div>
                    )}

                  </article>

                ))}

              </div>

            )}

          </section>

        </div>

      </main>

    </div>
  );
}

export default AccessRequests;
