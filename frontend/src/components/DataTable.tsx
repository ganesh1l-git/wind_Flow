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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlement Period Interval Ledger</h1>
          <p className="page-subtitle">
            Complete record of all 1,488 half-hourly settlement intervals across January 2026 with exact timestamp pairing
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={onExportCsv}>
            <Download size={14} />
            Export Full Dataset (CSV)
          </button>
        </div>
      </div>

      <div className="surface-card">
        {/* Toolbar */}
        <div className="surface-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-canvas)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              width: "300px"
            }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search date or interval (e.g. 2026-01-15)..."
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
                  fontSize: "0.82rem",
                  width: "100%"
                }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                className="cutoff-select"
                style={{
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 14px",
                  fontSize: "0.82rem"
                }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Statuses ({series.length})</option>
                <option value="MATCHED">Matched Intervals ({series.filter((s) => s.match_status === "MATCHED").length})</option>
                <option value="MISSING_FORECAST">Missing Forecast ({series.filter((s) => s.match_status === "MISSING_FORECAST").length})</option>
              </select>
            </div>
          </div>

          {/* Page size */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            <span>Rows per page:</span>
            <select
              className="cutoff-select"
              style={{
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px"
              }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="data-table-container">
          <table className="pro-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("delivery_start")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    Delivery Target (UK Local / UTC) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort("settlement_period")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    SP <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort("actual_generation_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                    Realized Outturn (MW) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort("forecast_generation_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                    Selected Forecast (MW) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort("error_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                    Forecast Error (MW) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort("abs_error_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                    Abs Error (MW) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Selected Vintage (UTC)</th>
                <th>Match Status</th>
                <th style={{ textAlign: "center" }}>Inspect Vintages</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No intervals match the current search filter.
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
                      <div style={{ fontWeight: 700, color: "var(--text-white)" }}>
                        {row.delivery_start_uk}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        UTC: {row.delivery_start}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono">{row.settlement_period || "—"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono" style={{ color: "var(--color-actual)", fontWeight: 700 }}>
                        {row.actual_generation_mw !== null && row.actual_generation_mw !== undefined
                          ? `${row.actual_generation_mw.toLocaleString()} MW`
                          : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono" style={{ color: "var(--color-forecast)", fontWeight: 700 }}>
                        {row.forecast_generation_mw !== null && row.forecast_generation_mw !== undefined
                          ? `${row.forecast_generation_mw.toLocaleString()} MW`
                          : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.error_mw !== null && row.error_mw !== undefined ? (
                        <span
                          className="font-mono"
                          style={{
                            color: row.error_mw > 0 ? "var(--color-deficit)" : "var(--color-surplus)",
                            fontWeight: 700
                          }}
                        >
                          {row.error_mw > 0 ? `+${row.error_mw.toLocaleString()}` : row.error_mw.toLocaleString()} MW
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono">
                        {row.abs_error_mw !== null && row.abs_error_mw !== undefined
                          ? `${row.abs_error_mw.toLocaleString()} MW`
                          : "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {row.selected_publish_time
                        ? row.selected_publish_time.replace("T", " ").replace("Z", " UTC")
                        : "None (Hourly Resolution)"}
                    </td>
                    <td>
                      <span className={`badge-status ${row.match_status === "MATCHED" ? "actual" : "deficit"}`}>
                        {row.match_status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectInterval(row.delivery_start);
                        }}
                      >
                        <Eye size={12} />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.82rem",
          color: "var(--text-secondary)"
        }}>
          <div>
            Showing {sortedData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} settlement intervals
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="font-mono" style={{ padding: "0 8px" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
