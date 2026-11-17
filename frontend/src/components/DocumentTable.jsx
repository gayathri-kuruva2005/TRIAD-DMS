
import { FileText, Download, Eye } from "lucide-react";

function DocumentTable({ documents, onView, onDownload }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="empty-documents">
        <FileText size={42} />
        <h3>No documents found</h3>
        <p>Upload a document or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="document-table-wrapper">
      <table className="document-table">
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
          {documents.map((doc) => (
            <tr key={doc.document_id}>
              <td>
                <div className="document-name">
                  <FileText size={20} />
                  <span>{doc.filename}</span>
                </div>
              </td>

              <td>
                <span className="division-badge">
                  {doc.division}
                </span>
              </td>

              <td>
                <div className="document-metadata">
                  {Object.entries(doc.metadata || {}).map(
                    ([key, value]) => (
                      <span key={key}>
                        <strong>{key}:</strong> {String(value)}
                      </span>
                    )
                  )}
                </div>
              </td>

              <td>
                {doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString()
                  : "—"}
              </td>

              <td>
                <div className="document-actions">
                  <button
                    type="button"
                    onClick={() => onView(doc)}
                    title="View details"
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDownload(doc)}
                    title="Download document"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentTable;
