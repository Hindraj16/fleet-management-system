import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getVehicles,
  getVehicleById,
  getGPSLocations,
  createVehicle,
  updateVehicle,
} from "../api/fleetApi";

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fleet List State (When no ID is provided)
  const [vehicles, setVehicles] = useState([]);

  // Single Vehicle State (When ID is provided)
  const [vehicle, setVehicle] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    vehicle_number: "",
    device_id: "",
    vendor_name: "",
    is_active: true,
  });

  // Modal State for Adding New Vehicle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    vehicle_number: "",
    device_id: "",
    vendor_name: "",
    is_active: true,
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data depending on whether ID exists
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        if (id) {
          // Fetch Single Vehicle Details & Recent Locations
          const [vehicleData, locationData] = await Promise.all([
            getVehicleById(id),
            getGPSLocations(id),
          ]);

          setVehicle(vehicleData);
          setEditFormData({
            vehicle_number: vehicleData.vehicle_number || "",
            device_id: vehicleData.device_id || "",
            vendor_name: vehicleData.vendor_name || vehicleData.driver_name || "",
            is_active: vehicleData.is_active ?? true,
          });

          if (Array.isArray(locationData)) {
            setLocations(locationData.slice(0, 10));
          }
        } else {
          // Fetch Full Fleet List for Management View
          const listData = await getVehicles();
          setVehicles(Array.isArray(listData) ? listData : []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load vehicle data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // Handle Create Vehicle Submit
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!createFormData.vehicle_number.trim()) {
      setFormError("Vehicle number is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      const newVehicle = await createVehicle(createFormData);
      setIsModalOpen(false);
      setCreateFormData({
        vehicle_number: "",
        device_id: "",
        vendor_name: "",
        is_active: true,
      });

      // Redirect to newly created vehicle page
      navigate(`/vehicle/${newVehicle.id}`);
    } catch (err) {
      console.error("Failed to create vehicle:", err);
      setFormError("Error creating vehicle. Ensure inputs are valid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Vehicle Submit
  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const updated = await updateVehicle(id, editFormData);
      setVehicle(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update vehicle:", err);
      setError("Failed to update vehicle details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-1 inline-flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            {id ? `Vehicle Details #${id}` : "Vehicle Management"}
          </h1>
        </div>

        <div className="flex gap-3">
          {id && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow transition"
            >
              ✎ Edit Vehicle
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition"
          >
            + Add New Vehicle
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* VIEW 1: SINGLE VEHICLE DETAILS (EDITABLE) */}
      {id ? (
        loading ? (
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-gray-500 text-sm">
            Loading vehicle details...
          </div>
        ) : vehicle ? (
          <>
            {/* Editable Form OR Display Cards */}
            {isEditing ? (
              <form
                onSubmit={handleUpdateVehicle}
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8 space-y-4"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-2">
                  Edit Vehicle Specifications
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.vehicle_number}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          vehicle_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Device / IMEI ID
                    </label>
                    <input
                      type="text"
                      value={editFormData.device_id}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          device_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Vendor / Driver Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.vendor_name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          vendor_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editFormData.is_active}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        is_active: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <label htmlFor="edit_is_active" className="text-sm font-medium">
                    Active Status
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow disabled:bg-blue-300"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Registration Number
                  </span>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {vehicle.vehicle_number}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Device / IMEI ID
                  </span>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {vehicle.device_id || "Unassigned"}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Vendor / Driver
                  </span>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {vehicle.vendor_name || vehicle.driver_name || "Unassigned"}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </span>
                  <p className="mt-1">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        vehicle.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {vehicle.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Telemetry Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Recent Telemetry History
              </h2>

              {locations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b">
                      <tr>
                        <th className="py-3 px-4">Latitude</th>
                        <th className="py-3 px-4">Longitude</th>
                        <th className="py-3 px-4">Speed</th>
                        <th className="py-3 px-4">Ignition</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {locations.map((loc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-4">{loc.latitude}</td>
                          <td className="py-3 px-4">{loc.longitude}</td>
                          <td className="py-3 px-4 font-semibold text-blue-600">
                            {loc.speed} km/h
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                loc.ignition
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {loc.ignition ? "ON" : "OFF"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {loc.gps_timestamp
                              ? new Date(loc.gps_timestamp).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No historical GPS points recorded for this vehicle.
                </p>
              )}
            </div>
          </>
        ) : null
      ) : (
        /* VIEW 2: FULL VEHICLE LIST (When visited directly at /vehicledetails) */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            All Fleet Vehicles
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading fleet list...</p>
          ) : vehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Vehicle Number</th>
                    <th className="py-3 px-4">Device ID</th>
                    <th className="py-3 px-4">Vendor / Driver</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {v.vehicle_number}
                      </td>
                      <td className="py-3 px-4">{v.device_id || "Unassigned"}</td>
                      <td className="py-3 px-4">
                        {v.vendor_name || v.driver_name || "Unassigned"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            v.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {v.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/vehicle/${v.id}`)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded transition"
                        >
                          View / Edit →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm">
              No vehicles registered yet. Click <strong>+ Add New Vehicle</strong> above to register an asset.
            </div>
          )}
        </div>
      )}

      {/* Modal Dialog for Registering Vehicle */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Register New Vehicle
            </h3>

            {formError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-AB-1234"
                  value={createFormData.vehicle_number}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      vehicle_number: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Device / IMEI ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEV-88301"
                  value={createFormData.device_id}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      device_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Logistics"
                  value={createFormData.vendor_name}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      vendor_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={createFormData.is_active}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      is_active: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="create_is_active"
                  className="text-sm font-medium text-gray-700"
                >
                  Mark as Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition disabled:bg-blue-300"
                >
                  {isSubmitting ? "Creating..." : "Save Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}