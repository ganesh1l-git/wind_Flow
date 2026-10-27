import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  badgeText?: string;
  badgeType?: "matched" | "missing" | "excluded" | "pilot";
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  accentColor,
  badgeText,
  badgeType = "pilot",
  tooltip
}) => {
  const displayVal = value !== null && value !== undefined ? value.toLocaleString() : "N/A";

  return (
    <div
      className="metric-card"
      style={{
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined
      }}
      title={tooltip}
    >
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        {icon && <div className="metric-icon-wrap">{icon}</div>}
      </div>

      <div className="metric-value">
        {displayVal}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "4px" }}>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        {badgeText && (
          <span className={`badge badge-${badgeType}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
