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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-md)",
          width: "100%",
          maxWidth: "820px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 18px",
          background: "var(--bg-canvas)",
          borderBottom: "1px solid var(--border-subtle)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(56, 189, 248, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShieldCheck size={16} color="var(--color-forecast)" />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-white)" }}>
                Forecast Vintage Audit & Zero Look-Ahead Verification
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Delivery Target: {data ? `${data.delivery_start_uk} (UTC: ${data.delivery_start})` : "Loading..."}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
          {isLoading || !data ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px" }}>
              <div style={{
                width: "24px",
                height: "24px",
                border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "var(--color-forecast)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }} />
              <span style={{ marginTop: "12px", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                Auditing historical forecast vintages...
              </span>
            </div>
          ) : (
            <>
              {/* Summary Stats Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "14px"
              }}>
                <div className="inspector-field">
                  <div className="inspector-field-label">Actual Generation Outturn</div>
                  <div className="inspector-field-value" style={{ color: "var(--color-actual)" }}>
                    {data.actual_generation_mw !== null && data.actual_generation_mw !== undefined
                      ? `${data.actual_generation_mw.toLocaleString()} MW`
                      : "Missing"}
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Elexon FUELHH (WIND)</div>
                </div>

                <div className="inspector-field">
                  <div className="inspector-field-label">Cutoff Selected Forecast</div>
                  <div className="inspector-field-value" style={{ color: "var(--color-forecast)" }}>
                    {data.selected_forecast_mw !== null && data.selected_forecast_mw !== undefined
                      ? `${data.selected_forecast_mw.toLocaleString()} MW`
                      : "None eligible"}
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Latest vintage ≤ Cutoff</div>
                </div>

                <div className="inspector-field">
                  <div className="inspector-field-label">Cutoff Gate Instant</div>
                  <div className="inspector-field-value" style={{ fontSize: "0.82rem", color: "var(--text-white)" }}>
                    {data.cutoff_time_uk} UK Local D-1
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>UTC: {data.decision_cutoff_utc}</div>
                </div>
              </div>

              {/* Analytical Explanation */}
              <div style={{
                background: "rgba(56, 189, 248, 0.06)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                fontSize: "0.72rem",
                color: "#e0f2fe",
                marginBottom: "14px",
                lineHeight: 1.5
              }}>
                {data.explanation}
              </div>

              {/* Vintages Table */}
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                Broadcast Vintages History ({data.vintages.length} total recorded runs)
              </div>

              {data.vintages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  No WINDFOR forecast records were published for this exact target interval.
                </div>
              ) : (
                <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Publish Timestamp (UTC)</th>
                        <th>UK Local Time</th>
                        <th style={{ textAlign: "right" }}>Forecast (MW)</th>
                        <th>Gate Eligibility</th>
                        <th>Selection Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vintages.map((v, i) => (
                        <tr
                          key={i}
                          style={{
                            background: v.is_selected
                              ? "rgba(56, 189, 248, 0.12)"
                              : !v.is_eligible
                              ? "rgba(239, 68, 68, 0.05)"
                              : undefined
                          }}
                        >
                          <td className="font-mono">{v.publish_time}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{v.publish_time_uk}</td>
                          <td style={{ textAlign: "right" }}>
                            <span className="font-mono" style={{ fontWeight: 600, color: v.is_selected ? "var(--color-forecast)" : "var(--text-primary)" }}>
                              {v.generation_mw.toLocaleString()} MW
                            </span>
                          </td>
                          <td>
                            {v.is_eligible ? (
                              <span className="status-pill matched" style={{ fontSize: "0.62rem" }}>
                                <CheckCircle2 size={10} /> Eligible (≤ Cutoff)
                              </span>
                            ) : (
                              <span className="status-pill excluded" style={{ fontSize: "0.62rem" }}>
                                <XCircle size={10} /> Excluded (&gt; Cutoff)
                              </span>
                            )}
                          </td>
                          <td>
                            {v.is_selected ? (
                              <span style={{ color: "var(--color-forecast)", fontWeight: 700, fontSize: "0.7rem" }}>
                                ★ SELECTED (Latest Eligible)
                              </span>
                            ) : v.is_eligible ? (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                                Superseded by later vintage
                              </span>
                            ) : (
                              <span style={{ color: "var(--color-alert)", fontSize: "0.68rem" }}>
                                Disqualified: Avoids look-ahead bias
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

        <div style={{
          padding: "12px 20px",
          background: "var(--bg-canvas)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button className="btn-secondary" onClick={onClose}>
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
