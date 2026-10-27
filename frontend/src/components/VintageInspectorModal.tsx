import React from "react";
import type { IntervalVintagesResponse } from "../types";
import { X, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

interface VintageInspectorModalProps {
  data: IntervalVintagesResponse | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const VintageInspectorModal: React.FC<VintageInspectorModalProps> = ({
  data,
  isOpen,
  onClose,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShieldCheck size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                Forecast Vintage Audit & Look-Ahead Bias Verification
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Delivery Target: {data ? `${data.delivery_start_uk} (UTC: ${data.delivery_start})` : "Loading..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {isLoading || !data ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px" }}>
              <div className="spinner" />
              <span style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
                Auditing historical forecast vintages...
              </span>
            </div>
          ) : (
            <>
              {/* Summary Stats Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "20px"
              }}>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Actual Generation Outturn
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-emerald)" }} className="font-mono">
                    {data.actual_generation_mw !== null && data.actual_generation_mw !== undefined
                      ? `${data.actual_generation_mw.toLocaleString()} MW`
                      : "Missing"}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    Elexon FUELHH (WIND)
                  </div>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Selected Day-Ahead Forecast
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-cyan)" }} className="font-mono">
                    {data.selected_forecast_mw !== null && data.selected_forecast_mw !== undefined
                      ? `${data.selected_forecast_mw.toLocaleString()} MW`
                      : "None eligible"}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    Latest eligible vintage at cutoff
                  </div>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Decision Cutoff Instant
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#93c5fd" }} className="font-mono">
                    {data.cutoff_time_uk} UK Local D-1
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    UTC: {data.decision_cutoff_utc}
                  </div>
                </div>
              </div>

              {/* Analytical Explanation Banner */}
              <div style={{
                background: "rgba(6, 182, 212, 0.08)",
                border: "1px solid rgba(6, 182, 212, 0.25)",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "0.8125rem",
                color: "#e0f2fe",
                marginBottom: "20px",
                lineHeight: 1.5
              }}>
                {data.explanation}
              </div>

              {/* Vintages Table */}
              <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "10px", color: "var(--text-primary)" }}>
                Retrieved Forecast Vintages Evolution ({data.vintages.length} total recorded)
              </h4>

              {data.vintages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  No WINDFOR forecast records were published for this exact target interval.
                </div>
              ) : (
                <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Publish Timestamp (UTC)</th>
                        <th>UK Local Time</th>
                        <th style={{ textAlign: "right" }}>Forecast (MW)</th>
                        <th>Cutoff Status</th>
                        <th>Audit Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vintages.map((v, i) => (
                        <tr
                          key={i}
                          style={{
                            background: v.is_selected
                              ? "rgba(6, 182, 212, 0.12)"
                              : !v.is_eligible
                              ? "rgba(244, 63, 94, 0.04)"
                              : undefined
                          }}
                        >
                          <td className="font-mono">{v.publish_time}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{v.publish_time_uk}</td>
                          <td style={{ textAlign: "right" }}>
                            <span className="font-mono" style={{ fontWeight: 600, color: v.is_selected ? "var(--accent-cyan)" : "var(--text-primary)" }}>
                              {v.generation_mw.toLocaleString()} MW
                            </span>
                          </td>
                          <td>
                            {v.is_eligible ? (
                              <span className="badge badge-matched">
                                <CheckCircle2 size={11} /> Eligible (&le; Cutoff)
                              </span>
                            ) : (
                              <span className="badge badge-excluded">
                                <XCircle size={11} /> Excluded (&gt; Cutoff)
                              </span>
                            )}
                          </td>
                          <td>
                            {v.is_selected ? (
                              <span style={{ color: "var(--accent-cyan)", fontWeight: 700, fontSize: "0.75rem" }}>
                                ★ SELECTED (Latest Eligible)
                              </span>
                            ) : v.is_eligible ? (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                Superseded by later eligible vintage
                              </span>
                            ) : (
                              <span style={{ color: "var(--accent-rose)", fontSize: "0.75rem" }}>
                                Excluded: Avoids look-ahead bias
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
