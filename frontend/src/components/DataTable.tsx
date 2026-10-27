import React, { useState, useMemo } from "react";
import type { IntervalRecord } from "../types";
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";

interface DataTableProps {
  series: IntervalRecord[];
  onInspectInterval: (deliveryTimestamp: string) => void;
  onExportCsv: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  series,
  onInspectInterval,
  onExportCsv
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField, setSortField] = useState<keyof IntervalRecord>("delivery_start");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (field: keyof IntervalRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return series.filter((row) => {
      if (statusFilter !== "ALL" && row.match_status !== statusFilter) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDate = row.delivery_date.toLowerCase().includes(term);
        const matchesStart = row.delivery_start.toLowerCase().includes(term);
        const matchesUk = row.delivery_start_uk.toLowerCase().includes(term);
        if (!matchesDate && !matchesStart && !matchesUk) {
          return false;
        }
      }
      return true;
    });
  }, [series, statusFilter, searchTerm]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return sortDirection === "asc" ? 1 : -1;
      if (valB === null || valB === undefined) return sortDirection === "asc" ? -1 : 1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="tab-scroll-container">
      <div className="ledger-card">
        {/* Toolbar */}
        <div className="ledger-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
            {/* Search */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-root)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 8px",
              width: "240px"
            }}>
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search interval (e.g. 2026-01-15)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.74rem",
                  width: "100%"
                }}
              />
            </div>

            {/* Filter by Match Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={12} color="var(--text-muted)" />
              <select
                className="control-select"
                style={{
                  background: "var(--bg-root)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px"
                }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Statuses ({series.length})</option>
                <option value="MATCHED">Matched ({series.filter((s) => s.match_status === "MATCHED").length})</option>
                <option value="MISSING_FORECAST">Missing Forecast ({series.filter((s) => s.match_status === "MISSING_FORECAST").length})</option>
              </select>
            </div>
          </div>

          {/* Export & page size */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              <span>Rows:</span>
              <select
                className="control-select"
                style={{
                  background: "var(--bg-root)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "3px 6px"
                }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <button className="action-btn-sm" onClick={onExportCsv}>
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("delivery_start")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Delivery Target (UK / UTC) <ArrowUpDown size={11} />
                  </div>
                </th>
                <th onClick={() => handleSort("settlement_period")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    SP <ArrowUpDown size={11} />
                  </div>
                </th>
                <th onClick={() => handleSort("actual_generation_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Actual Outturn (MW) <ArrowUpDown size={11} />
                  </div>
                </th>
                <th onClick={() => handleSort("forecast_generation_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Forecast (MW) <ArrowUpDown size={11} />
                  </div>
                </th>
                <th onClick={() => handleSort("error_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Error Delta (MW) <ArrowUpDown size={11} />
                  </div>
                </th>
                <th onClick={() => handleSort("abs_error_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Abs Error (MW) <ArrowUpDown size={11} />
                  </div>
                </th>
                <th>Cutoff Selected Vintage</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No intervals match search criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr
                    key={row.delivery_start}
                    style={{ cursor: "pointer" }}
                    onClick={() => onInspectInterval(row.delivery_start)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {row.delivery_start_uk}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        UTC: {row.delivery_start}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono">{row.settlement_period || "—"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono" style={{ color: "var(--color-actual)", fontWeight: 600 }}>
                        {row.actual_generation_mw !== null && row.actual_generation_mw !== undefined
                          ? row.actual_generation_mw.toLocaleString()
                          : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono" style={{ color: "var(--color-forecast)", fontWeight: 600 }}>
                        {row.forecast_generation_mw !== null && row.forecast_generation_mw !== undefined
                          ? row.forecast_generation_mw.toLocaleString()
                          : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.error_mw !== null && row.error_mw !== undefined ? (
                        <span
                          className="font-mono"
                          style={{
                            color: row.error_mw > 0 ? "var(--color-deficit)" : "var(--color-surplus)",
                            fontWeight: 600
                          }}
                        >
                          {row.error_mw > 0 ? `+${row.error_mw.toLocaleString()}` : row.error_mw.toLocaleString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono">
                        {row.abs_error_mw !== null && row.abs_error_mw !== undefined
                          ? row.abs_error_mw.toLocaleString()
                          : "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      {row.selected_publish_time
                        ? row.selected_publish_time.replace("T", " ").replace("Z", " UTC")
                        : "None (Hourly Gap)"}
                    </td>
                    <td>
                      <span className={`status-pill ${row.match_status === "MATCHED" ? "matched" : "missing"}`}>
                        {row.match_status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="action-btn-sm"
                        style={{ padding: "2px 6px", fontSize: "0.68rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectInterval(row.delivery_start);
                        }}
                        title="Audit 24h forecast vintages before cutoff"
                      >
                        <Eye size={11} />
                        Audit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.72rem",
          color: "var(--text-secondary)",
          background: "var(--bg-panel)"
        }}>
          <div>
            Showing {sortedData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} intervals
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              className="action-btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={13} />
              Prev
            </button>
            <span className="font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="action-btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
