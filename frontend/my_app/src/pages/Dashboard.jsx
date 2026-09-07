import React, { useEffect, useState } from "react";
import { getVehicles, getGPSLocations } from "../api/fleetApi";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError("");

        // Fetch registered fleet vehicles
        const vehicleData = await getVehicles();
        if (Array.isArray(vehicleData)) {
          setVehicles(vehicleData);

          // Fetch recent GPS pings for the first vehicle if available
          if (vehicleData.length > 0) {
            const firstVehicleId = vehicleData[0].id;
            const locationData = await getGPSLocations(firstVehicleId);
            if (Array.isArray(locationData)) {
              setRecentLocations(locationData.slice(0, 5)); // Keep latest 5 entries
            }
          }
        }
      } catch (err) {
        console.error("Dashboard Data Fetch Error:", err);
        setError("Failed to load dashboard data. Check backend API status.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Compute summary metrics
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.is_active).length;
  const inactiveVehicles = totalVehicles - activeVehicles;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Fleet Control Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview and system status summary
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
            System Live
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Fleet
            </span>
            <p className="text-3xl font-extrabold text-gray-800 mt-2">
              {loading ? "..." : totalVehicles}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Active Vehicles
            </span>
            <p className="text-3xl font-extrabold text-green-600 mt-2">
              {loading ? "..." : activeVehicles}
            </p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Inactive / Idle
            </span>
            <p className="text-3xl font-extrabold text-amber-500 mt-2">
              {loading ? "..." : inactiveVehicles}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vehicles List Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Registered Vehicles</h2>
          
          {loading ? (
            <p className="text-sm text-gray-500 py-4">Loading vehicles fleet...</p>
          ) : vehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Vehicle Number</th>
                    <th className="py-3 px-4">Device / IMEI ID</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-semibold text-gray-700">#{v.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{v.vehicle_number}</td>
                      <td className="py-3 px-4">{v.device_id || "N/A"}</td>
                      <td className="py-3 px-4">{v.vendor_name || "Unassigned"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            v.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {v.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">
              No registered vehicles found in database.
            </p>
          )}
        </div>

        {/* Live System Log & Activity Panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Location Pings</h2>

          {loading ? (
            <p className="text-sm text-gray-500 py-4">Fetching logs...</p>
          ) : recentLocations.length > 0 ? (
            <div className="space-y-4">
              {recentLocations.map((loc, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">
                      Vehicle #{loc.vehicle}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {loc.latitude}, {loc.longitude}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-600 block">
                      {loc.speed} km/h
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {loc.gps_timestamp ? new Date(loc.gps_timestamp).toLocaleTimeString() : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">
              No recent telemetry pings recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}