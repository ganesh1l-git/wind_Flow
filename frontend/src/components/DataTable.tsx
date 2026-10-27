import { useState, useMemo } from "react";
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
      // Status filter
      if (statusFilter !== "ALL" && row.match_status !== statusFilter) {
        return false;
      }
      // Search filter
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
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination slice
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className="table-card">
      {/* Table controls */}
      <div className="table-header-controls">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Search box */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px" }} />
            <input
              type="text"
              className="select-input"
              style={{ paddingLeft: "30px", width: "220px" }}
              placeholder="Search date (e.g. 2026-01-15)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="select-input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Statuses ({series.length})</option>
              <option value="MATCHED">Matched Only ({series.filter((s) => s.match_status === "MATCHED").length})</option>
              <option value="MISSING_FORECAST">Missing Forecast ({series.filter((s) => s.match_status === "MISSING_FORECAST").length})</option>
            </select>
          </div>
        </div>

        {/* Export & page size */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <span>Rows:</span>
            <select
              className="select-input"
              style={{ padding: "4px 8px" }}
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

          <button className="btn-secondary" onClick={onExportCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Responsive table */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("delivery_start")} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Delivery Interval (UK Local / UTC) <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("settlement_period")} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  SP <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("actual_generation_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  Actual (MW) <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("forecast_generation_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  Forecast (MW) <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("error_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  Error (MW) <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("abs_error_mw")} style={{ cursor: "pointer", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  Abs Error (MW) <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Publish Time (UTC)</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Vintage Audit</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No intervals match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={row.delivery_start}
                  className="row-interactive"
                  onClick={() => onInspectInterval(row.delivery_start)}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {row.delivery_start_uk}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                      UTC: {row.delivery_start}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono">{row.settlement_period || "-"}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="font-mono" style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                      {row.actual_generation_mw !== null && row.actual_generation_mw !== undefined
                        ? row.actual_generation_mw.toLocaleString()
                        : "-"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="font-mono" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                      {row.forecast_generation_mw !== null && row.forecast_generation_mw !== undefined
                        ? row.forecast_generation_mw.toLocaleString()
                        : "-"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {row.error_mw !== null && row.error_mw !== undefined ? (
                      <span
                        className="font-mono"
                        style={{
                          fontWeight: 600,
                          color: row.error_mw > 0 ? "var(--accent-amber)" : "var(--accent-rose)"
                        }}
                      >
                        {row.error_mw > 0 ? `+${row.error_mw.toLocaleString()}` : row.error_mw.toLocaleString()}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                      {row.abs_error_mw !== null && row.abs_error_mw !== undefined
                        ? row.abs_error_mw.toLocaleString()
                        : "-"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {row.selected_publish_time
                        ? row.selected_publish_time.replace("T", " ").replace("Z", " UTC")
                        : "None eligible"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        row.match_status === "MATCHED"
                          ? "badge-matched"
                          : row.match_status === "MISSING_FORECAST"
                          ? "badge-missing"
                          : "badge-excluded"
                      }`}
                    >
                      {row.match_status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "0.6875rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectInterval(row.delivery_start);
                      }}
                      title="Inspect all forecast vintages for this interval"
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

      {/* Pagination bar */}
      <div className="pagination-container">
        <div>
          Showing {paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
          {Math.min(currentPage * pageSize, totalRows)} of {totalRows} records
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </div>
  );
};
