import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Server,
  PlusCircle,
} from "lucide-react";

// API Endpoint (Adjust to match your Django URL)
const API_URL = "http://127.0.0.1:8000/api/vehicles/";

export default function VehicleDetails() {
  const [showForm, setShowForm] = useState(true);
  const [showTable, setShowTable] = useState(true);

  // Vehicles Data & Pagination States
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    imei: "",
    type: "SWEEPER",
    category: "Primary",
  });

  // Table Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  // 1. FETCH VEHICLES FROM BACKEND SERVER
  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_URL);
      const data = response.data.results || response.data;
      setVehicles(data);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError("Failed to load vehicle details from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // 2. POPULATE FORM FOR EDITING
  const handleEditClick = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setFormData({
      name: vehicle.name || vehicle.vehicle_name || "",
      imei: vehicle.imei || vehicle.imei_number || "",
      type: vehicle.type || vehicle.vehicle_type || "SWEEPER",
      category: vehicle.category || vehicle.vehicle_category || "Primary",
    });
    setShowForm(true);
  };

  // 3. HANDLE FORM INPUT CHANGES
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 4. SUBMIT FORM (HANDLES BOTH ADD & UPDATE)
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selectedVehicleId) {
        // UPDATE Existing Vehicle (PUT)
        await axios.put(`${API_URL}${selectedVehicleId}/`, {
          name: formData.name,
          imei: formData.imei,
          type: formData.type,
          category: formData.category,
        });
        alert("Vehicle updated successfully!");
      } else {
        // CREATE New Vehicle (POST)
        await axios.post(API_URL, {
          name: formData.name,
          imei: formData.imei,
          type: formData.type,
          category: formData.category,
        });
        alert("Vehicle added successfully!");
      }

      fetchVehicles(); // Refresh table data
      handleCancel();
    } catch (err) {
      console.error("Error saving vehicle:", err);
      alert(selectedVehicleId ? "Failed to update vehicle details." : "Failed to add vehicle.");
    }
  };

  const handleCancel = () => {
    setSelectedVehicleId(null);
    setFormData({ name: "", imei: "", type: "SWEEPER", category: "Primary" });
  };

  // Filter Data Client-Side
  const filteredVehicles = vehicles.filter((v) =>
    Object.values(v).some(
      (val) =>
        val && val.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-4 font-sans text-slate-800">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* CARD 1: ADD / UPDATE VEHICLE FORM */}
        <div className="rounded border border-slate-300 bg-white shadow-sm">
          <div
            className="flex cursor-pointer items-center justify-between border-b border-slate-200 bg-white px-4 py-3"
            onClick={() => setShowForm(!showForm)}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              {selectedVehicleId ? (
                <Server className="h-4 w-4 text-slate-600" />
              ) : (
                <PlusCircle className="h-4 w-4 text-slate-600" />
              )}
              <span>{selectedVehicleId ? "Update Vehicle Details" : "Add New Vehicle"}</span>
            </div>
            <button className="text-slate-500 hover:text-slate-700">
              {showForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Vehicle Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    IMEI Number
                  </label>
                  <input
                    type="text"
                    name="imei"
                    value={formData.imei}
                    onChange={handleInputChange}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="min-w-[150px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Vehicle Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="SWEEPER">SWEEPER</option>
                    <option value="SMALL BELL TRUCK">SMALL BELL TRUCK</option>
                    <option value="COMPACTOR">COMPACTOR</option>
                  </select>
                </div>

                <div className="min-w-[150px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Vehicle Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  <button
                    type="submit"
                    className="rounded bg-[#0d8a52] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0b7545]"
                  >
                    {selectedVehicleId ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded bg-[#dc3545] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#bb2d3b]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* CARD 2: VEHICLE DETAILS TABLE */}
        <div className="rounded border border-slate-300 bg-white shadow-sm">
          <div
            className="flex cursor-pointer items-center justify-between border-b border-slate-200 bg-white px-4 py-3"
            onClick={() => setShowTable(!showTable)}
          >
            <span className="font-semibold text-slate-700">Vehicle Details</span>
            <button className="text-slate-500 hover:text-slate-700">
              {showTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {showTable && (
            <div className="p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded bg-[#0d8a52] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0b7545]">
                    Excel <FileSpreadsheet size={14} />
                  </button>
                  <button className="flex items-center gap-1.5 rounded bg-[#dc3545] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#bb2d3b]">
                    PDF <FileText size={14} />
                  </button>
                </div>

                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded border border-slate-300 py-1.5 pl-3 pr-8 text-xs outline-none focus:border-blue-500"
                  />
                  <Search
                    size={15}
                    className="absolute right-2.5 top-2.5 text-slate-400"
                  />
                </div>
              </div>

              {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                      <th className="w-16 border-r border-slate-200 px-4 py-2.5 text-center">Sr.No</th>
                      <th className="border-r border-slate-200 px-4 py-2.5 text-center">Vehicle Name</th>
                      <th className="border-r border-slate-200 px-4 py-2.5 text-center">Vehicle Type</th>
                      <th className="border-r border-slate-200 px-4 py-2.5 text-center">Vehicle Category</th>
                      <th className="border-r border-slate-200 px-4 py-2.5 text-center">IMEI No.</th>
                      <th className="w-20 px-4 py-2.5 text-center">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-4 text-center text-xs text-slate-500">
                          Loading vehicles from server...
                        </td>
                      </tr>
                    ) : filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-4 text-center text-xs text-slate-500">
                          No vehicles found.
                        </td>
                      </tr>
                    ) : (
                      filteredVehicles.slice(0, recordsPerPage).map((vehicle, index) => (
                        <tr key={vehicle.id || index} className={index % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                          <td className="border-r border-slate-200 px-4 py-2.5 text-center text-slate-600">
                            {index + 1}
                          </td>
                          <td className="border-r border-slate-200 px-4 py-2.5 text-center font-medium text-slate-800">
                            {vehicle.name || vehicle.vehicle_name}
                          </td>
                          <td className="border-r border-slate-200 px-4 py-2.5 text-center text-slate-600">
                            {vehicle.type || vehicle.vehicle_type}
                          </td>
                          <td className="border-r border-slate-200 px-4 py-2.5 text-center text-slate-600">
                            {vehicle.category || vehicle.vehicle_category}
                          </td>
                          <td className="border-r border-slate-200 px-4 py-2.5 text-center text-slate-600">
                            {vehicle.imei || vehicle.imei_number}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => handleEditClick(vehicle)}
                              className="rounded bg-[#00bcd4] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#00acc1]"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <select
                    value={recordsPerPage}
                    onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                    className="rounded border border-slate-300 bg-white px-2 py-1 outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                  <span>records per page</span>
                </div>
                <div>Showing 1 to {filteredVehicles.length} entries</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}