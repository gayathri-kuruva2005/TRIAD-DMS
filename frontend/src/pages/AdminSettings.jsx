
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  LoaderCircle,
  ShieldCheck,
  ListFilter,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./AdminSettings.css";

const initialForm = {
  name: "",
  field_type: "text",
  options: "",
  required: false,
};

function AdminSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = user?.role === "admin";

  // ---------------------------------------
  // FETCH METADATA FIELDS
  // ---------------------------------------

  const fetchFields = useCallback(async () => {
    try {
      // Start the API request before updating state.
      const response = await api.get("/metadata/fields");

      setFields(response.data.fields || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to load metadata fields."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------
  // INITIAL DATA LOADING
  // ---------------------------------------

  // ---------------------------------------
// INITIAL DATA LOADING
// ---------------------------------------

// ---------------------------------------
// INITIAL DATA LOADING
// ---------------------------------------

useEffect(() => {
  if (!isAdmin) return;

  let cancelled = false;

  const loadFields = async () => {
    try {
      const response = await api.get("/metadata/fields");

      if (!cancelled) {
        setFields(response.data.fields || []);
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
        setLoading(false);
      }
    }
  };

  loadFields();

  return () => {
    cancelled = true;
  };
}, [isAdmin]);

  // ---------------------------------------
  // HANDLE FORM INPUTS
  // ---------------------------------------

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "field_type" && value !== "dropdown"
        ? { options: "" }
        : {}),
    }));
  };

  // ---------------------------------------
  // RESET FORM
  // ---------------------------------------

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  // ---------------------------------------
  // EDIT METADATA FIELD
  // ---------------------------------------

  const handleEdit = (field) => {
    setEditingId(field.field_id);

    setForm({
      name: field.name,
      field_type: field.field_type,
      options: (field.options || []).join(", "),
      required: field.required || false,
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ---------------------------------------
  // CREATE / UPDATE METADATA FIELD
  // ---------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();

    if (!name) {
      setError("Please enter a field name.");
      return;
    }

    if (name.toLowerCase() === "division") {
      setError(
        "Division is system-managed and cannot be customized."
      );
      return;
    }

    let options = [];

    if (form.field_type === "dropdown") {
      options = form.options
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);

      options = [...new Set(options)];

      if (options.length === 0) {
        setError("Please enter at least one dropdown option.");
        return;
      }
    }

    const payload = {
      name,
      field_type: form.field_type,
      options,
      required: form.required,
    };

    try {
      setSaving(true);

      if (editingId) {
        const response = await api.put(
          `/metadata/fields/${editingId}`,
          payload
        );

        setSuccess(
          response.data.message ||
            "Metadata field updated successfully."
        );
      } else {
        const response = await api.post(
          "/metadata/fields",
          payload
        );

        setSuccess(
          response.data.message ||
            "Metadata field created successfully."
        );
      }

      setForm(initialForm);
      setEditingId(null);

      await fetchFields();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to save metadata field."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // DEACTIVATE METADATA FIELD
  // ---------------------------------------

  const handleDeactivate = async (field) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${field.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/metadata/fields/${field.field_id}`
      );

      setSuccess(
        response.data.message ||
          "Metadata field deactivated successfully."
      );

      if (editingId === field.field_id) {
        setForm(initialForm);
        setEditingId(null);
      }

      await fetchFields();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to deactivate metadata field."
      );
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
  // FIELD TYPE LABEL
  // ---------------------------------------

  const getFieldTypeLabel = (type) => {
    const labels = {
      text: "Text",
      number: "Number",
      date: "Date",
      dropdown: "Dropdown",
      boolean: "Boolean",
    };

    return labels[type] || type;
  };

  // ---------------------------------------
  // RENDER
  // ---------------------------------------

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} />

      <main className="dashboard-main">
        <Header user={user} onLogout={handleLogout} />

        <div className="admin-settings-content">

          {/* PAGE HEADING */}

          <div className="admin-settings-heading">
            <div>
              <span className="admin-settings-eyebrow">
                SYSTEM CONFIGURATION
              </span>

              <h1>Admin Settings</h1>

              <p>
                Manage customizable metadata fields for your
                document management system.
              </p>
            </div>

            <div className="admin-settings-heading-icon">
              <Settings size={28} />
            </div>
          </div>

          {/* ADMIN ACCESS CHECK */}

          {!isAdmin && (
            <section className="admin-access-denied">
              <ShieldCheck size={36} />

              <h2>Administrator Access Required</h2>

              <p>
                You do not have permission to manage metadata
                settings. Please contact your administrator.
              </p>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Return to Dashboard
              </button>
            </section>
          )}

          {/* ADMIN CONTENT */}

          {isAdmin && (
            <>
              {/* ERROR MESSAGE */}

              {error && (
                <div className="admin-alert admin-alert-error">
                  <span>{error}</span>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    aria-label="Dismiss error"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              {/* SUCCESS MESSAGE */}

              {success && (
                <div className="admin-alert admin-alert-success">
                  <span>{success}</span>

                  <button
                    type="button"
                    onClick={() => setSuccess("")}
                    aria-label="Dismiss success message"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              {/* ADD / EDIT FIELD FORM */}

              <section className="admin-settings-card">
                <div className="admin-card-heading">
                  <div className="admin-card-heading-icon">
                    {editingId ? (
                      <Pencil size={21} />
                    ) : (
                      <Plus size={21} />
                    )}
                  </div>

                  <div>
                    <h2>
                      {editingId
                        ? "Edit Metadata Field"
                        : "Add New Metadata Field"}
                    </h2>

                    <p>
                      Define a custom field that can be used
                      when uploading documents.
                    </p>
                  </div>
                </div>

                <form
                  className="admin-field-form"
                  onSubmit={handleSubmit}
                >
                  <div className="admin-form-grid">

                    {/* FIELD NAME */}

                    <div className="admin-form-group">
                      <label htmlFor="field-name">
                        Field Name
                      </label>

                      <input
                        id="field-name"
                        type="text"
                        name="name"
                        placeholder="e.g. Report Type"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={80}
                        required
                      />
                    </div>

                    {/* FIELD TYPE */}

                    <div className="admin-form-group">
                      <label htmlFor="field-type">
                        Field Type
                      </label>

                      <select
                        id="field-type"
                        name="field_type"
                        value={form.field_type}
                        onChange={handleChange}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>
                  </div>

                  {/* DROPDOWN OPTIONS */}

                  {form.field_type === "dropdown" && (
                    <div className="admin-form-group admin-options-group">
                      <label htmlFor="field-options">
                        Dropdown Options
                      </label>

                      <input
                        id="field-options"
                        type="text"
                        name="options"
                        placeholder="Financial, Technical, Legal"
                        value={form.options}
                        onChange={handleChange}
                      />

                      <small>
                        Separate each option with a comma.
                      </small>
                    </div>
                  )}

                  {/* REQUIRED CHECKBOX */}

                  <label className="admin-required-toggle">
                    <input
                      type="checkbox"
                      name="required"
                      checked={form.required}
                      onChange={handleChange}
                    />

                    <span>
                      Make this field mandatory when uploading
                      documents.
                    </span>
                  </label>

                  {/* FORM ACTIONS */}

                  <div className="admin-form-actions">
                    <button
                      type="submit"
                      className="admin-save-button"
                      disabled={saving}
                    >
                      {saving ? (
                        <LoaderCircle
                          size={18}
                          className="spin"
                        />
                      ) : editingId ? (
                        <Save size={18} />
                      ) : (
                        <Plus size={18} />
                      )}

                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Update Field"
                          : "Create Field"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="admin-cancel-button"
                        onClick={resetForm}
                        disabled={saving}
                      >
                        <X size={18} />
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* EXISTING METADATA FIELDS */}

              <section className="admin-settings-card">
                <div className="admin-card-heading">
                  <div className="admin-card-heading-icon">
                    <ListFilter size={21} />
                  </div>

                  <div>
                    <h2>Existing Metadata Fields</h2>

                    <p>
                      View, edit, or deactivate your configured
                      document fields.
                    </p>
                  </div>

                  <span className="admin-field-count">
                    {fields.length} Fields
                  </span>
                </div>

                {loading ? (
                  <div className="admin-loading">
                    <LoaderCircle
                      size={28}
                      className="spin"
                    />

                    <p>Loading metadata fields...</p>
                  </div>
                ) : fields.length === 0 ? (
                  <div className="admin-empty-state">
                    <ListFilter size={36} />

                    <h3>No Metadata Fields Found</h3>

                    <p>
                      Create your first custom metadata field
                      using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="admin-fields-table-wrapper">
                    <table className="admin-fields-table">
                      <thead>
                        <tr>
                          <th>Field Name</th>
                          <th>Field Type</th>
                          <th>Options</th>
                          <th>Required</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {fields.map((field) => (
                          <tr key={field.field_id}>
                            <td>
                              <strong>{field.name}</strong>
                            </td>

                            <td>
                              <span className="admin-type-badge">
                                {getFieldTypeLabel(field.field_type)}
                              </span>
                            </td>

                            <td>
                              {field.field_type === "dropdown"
                                ? (field.options || []).join(", ")
                                : "—"}
                            </td>

                            <td>
                              <span
                                className={
                                  field.required
                                    ? "admin-required-badge"
                                    : "admin-optional-badge"
                                }
                              >
                                {field.required
                                  ? "Required"
                                  : "Optional"}
                              </span>
                            </td>

                            <td>
                              <div className="admin-field-actions">
                                <button
                                  type="button"
                                  className="admin-edit-button"
                                  title="Edit field"
                                  onClick={() => handleEdit(field)}
                                >
                                  <Pencil size={17} />
                                </button>

                                <button
                                  type="button"
                                  className="admin-delete-button"
                                  title="Deactivate field"
                                  onClick={() =>
                                    handleDeactivate(field)
                                  }
                                >
                                  <Trash2 size={17} />
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

              {/* SYSTEM INFORMATION */}

              <section className="admin-system-note">
                <ShieldCheck size={21} />

                <div>
                  <strong>
                    System-managed field: Division
                  </strong>

                  <p>
                    Division is automatically assigned based on
                    the logged-in user's account. It cannot be
                    created, edited, or deactivated here.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminSettings;
