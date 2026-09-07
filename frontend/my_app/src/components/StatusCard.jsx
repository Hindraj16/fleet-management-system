import React from "react";

export default function StatusCard({ label, value, icon, variant = "default" }) {
  const variantStyles = {
    default: "text-gray-800 bg-blue-50 text-blue-600",
    success: "text-green-600 bg-green-50 text-green-600",
    warning: "text-amber-500 bg-amber-50 text-amber-500",
    danger: "text-red-500 bg-red-50 text-red-500",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
          {label}
        </span>
        <p className="text-2xl font-extrabold mt-1 text-gray-800">
          {value ?? "N/A"}
        </p>
      </div>

      {icon && (
        <div className={`p-3 rounded-xl ${variantStyles[variant] || variantStyles.default}`}>
          {icon}
        </div>
      )}
    </div>
  );
}