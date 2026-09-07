import React from "react";

export default function Sidebar({
  vehicles = [],
  selectedVehicle,
  onSelectVehicle,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onApplyFilters,
}) {
  return (
    <aside className="w-full lg:w-72 bg-white rounded-xl shadow-md border border-gray-100 p-5 flex flex-col gap-6">
      <h2 className="text-lg font-bold text-gray-800 border-b pb-3 border-gray-100">
        Fleet Filter & Control
      </h2>

      {/* Vehicle Selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Select Vehicle
        </label>
        <select
          value={selectedVehicle}
          onChange={(e) => onSelectVehicle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {vehicles.length > 0 ? (
            vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number || `Vehicle #${v.id}`}
              </option>
            ))
          ) : (
            <option value="">No vehicles found</option>
          )}
        </select>
      </div>

      {/* Date Range Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={onApplyFilters}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition duration-150"
      >
        Apply Parameters
      </button>
    </aside>
  );
}