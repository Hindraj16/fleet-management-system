import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const INITIAL_VEHICLES = [
  {
    id: 1,
    number: "MH12 AB 1234",
    driver: "Rahul Patil",
    phone: "+91 98765 43210",
    status: "Moving",
    speed: 62,
    location: "Pune Station",
    battery: 87,
    fuel: 76,
    distance: "126 km",
    lastUpdated: "Just now",
  },
  {
    id: 2,
    number: "MH14 CD 5678",
    driver: "Amit Sharma",
    phone: "+91 98765 12345",
    status: "Idle",
    speed: 0,
    location: "Shivajinagar",
    battery: 72,
    fuel: 54,
    distance: "84 km",
    lastUpdated: "2 min ago",
  },
  {
    id: 3,
    number: "MH12 EF 9012",
    driver: "Suresh Kumar",
    phone: "+91 98765 98765",
    status: "Moving",
    speed: 48,
    location: "Kothrud",
    battery: 91,
    fuel: 82,
    distance: "142 km",
    lastUpdated: "Just now",
  },
  {
    id: 4,
    number: "MH13 GH 3456",
    driver: "Vikas More",
    phone: "+91 91234 56789",
    status: "Offline",
    speed: 0,
    location: "Viman Nagar",
    battery: 34,
    fuel: 31,
    distance: "32 km",
    lastUpdated: "45 min ago",
  },
  {
    id: 5,
    number: "MH12 JK 7890",
    driver: "Rohit Jadhav",
    phone: "+91 99887 66554",
    status: "Moving",
    speed: 55,
    location: "Hadapsar",
    battery: 65,
    fuel: 68,
    distance: "98 km",
    lastUpdated: "Just now",
  },
];

function getStatusColor(status) {
  if (status === "Moving") return "text-green-600 bg-green-50";
  if (status === "Idle") return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

function Vehicles() {
  const [vehicleList, setVehicleList] = useState(INITIAL_VEHICLES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    driver: "",
    phone: "",
    location: "",
    status: "Idle",
    fuel: 100,
    battery: 100,
  });

  const filteredVehicles = useMemo(() => {
    return vehicleList.filter((vehicle) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        vehicle.number.toLowerCase().includes(searchValue) ||
        vehicle.driver.toLowerCase().includes(searchValue) ||
        vehicle.location.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicleList, search, statusFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    const newVehicle = {
      id: vehicleList.length + 1,
      number: formData.number,
      driver: formData.driver,
      phone: formData.phone,
      status: formData.status,
      speed: formData.status === "Moving" ? 40 : 0,
      location: formData.location || "Garage",
      battery: Number(formData.battery) || 100,
      fuel: Number(formData.fuel) || 100,
      distance: "0 km",
      lastUpdated: "Just now",
    };

    setVehicleList((prev) => [newVehicle, ...prev]);

    // Reset Form & Close Modal
    setFormData({
      number: "",
      driver: "",
      phone: "",
      location: "",
      status: "Idle",
      fuel: 100,
      battery: 100,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-slate-900 text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-700 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl">
            🚗
          </div>
          <div className="text-xl font-bold">
            Track <span className="text-blue-400">Fleet</span>
          </div>
        </div>
        <nav className="px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-slate-500">
            MAIN MENU
          </p>
          <Link
            to="/dashboard"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            📊 Dashboard
          </Link>
          <Link
            to="/vehicles"
            className="mb-1 flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white"
          >
            🚘 Vehicles
          </Link>
          <Link
            to="/tracking"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            📍 Live Tracking
          </Link>
          <Link
            to="/trips"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            🛣️ Trips
          </Link>
          <Link
            to="/drivers"
            className="mb-6 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            👨‍✈️ Drivers
          </Link>
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-slate-500">
            MANAGEMENT
          </p>
          <Link
            to="/alerts"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            🔔 Alerts
            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs">
              3
            </span>
          </Link>
          <Link
            to="/geofencing"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            📐 Geofencing
          </Link>

          <Link
            to="/reports"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            📈 Reports
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            ⚙️ Settings
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold">Admin User</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="lg:ml-64">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm lg:px-8">
          <div>
            <h1 className="text-xl font-bold lg:text-2xl">Vehicles</h1>
            <p className="text-xs text-slate-500 lg:text-sm">
              Manage and monitor your fleet
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* REGISTER VEHICLE BUTTON */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:text-sm"
            >
              <span>+</span> Register Vehicle
            </button>
            <div className="hidden items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-600 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              System Online
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              AD
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          {/* SEARCH & FILTERS */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <span className="absolute left-3 top-3 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search vehicle, driver or location..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["All", "Moving", "Idle", "Offline"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                      statusFilter === status
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-semibold">Vehicle List</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing {filteredVehicles.length} of {vehicleList.length}{" "}
                  vehicles
                </p>
              </div>
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Vehicle
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Driver
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Speed
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Fuel
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Battery
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Location
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                            🚗
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {vehicle.number}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              ID: #{vehicle.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium">{vehicle.driver}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {vehicle.phone}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${getStatusColor(
                            vehicle.status
                          )}`}
                        >
                          ● {vehicle.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold">
                          {vehicle.speed}
                        </span>
                        <span className="ml-1 text-[10px] text-slate-400">
                          km/h
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-20">
                          <div className="mb-1 flex justify-between">
                            <span className="text-[10px] text-slate-400">
                              ⛽
                            </span>
                            <span className="text-[10px] font-semibold">
                              {vehicle.fuel}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-orange-500"
                              style={{ width: `${vehicle.fuel}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-20">
                          <div className="mb-1 flex justify-between">
                            <span className="text-[10px] text-slate-400">
                              🔋
                            </span>
                            <span className="text-[10px] font-semibold">
                              {vehicle.battery}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-green-500"
                              style={{ width: `${vehicle.battery}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="max-w-[150px] truncate text-xs text-slate-600">
                          📍 {vehicle.location}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {vehicle.lastUpdated}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/vehicles/${vehicle.id}`}
                          className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      🚗
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{vehicle.number}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-semibold ${getStatusColor(
                            vehicle.status
                          )}`}
                        >
                          {vehicle.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        👨‍✈️ {vehicle.driver}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        📍 {vehicle.location}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[9px] text-slate-400">Speed</p>
                      <p className="mt-1 text-sm font-bold">
                        {vehicle.speed}{" "}
                        <span className="text-[9px] font-normal">km/h</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[9px] text-slate-400">Fuel</p>
                      <p className="mt-1 text-sm font-bold text-orange-500">
                        {vehicle.fuel}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[9px] text-slate-400">Battery</p>
                      <p className="mt-1 text-sm font-bold text-green-600">
                        {vehicle.battery}%
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/vehicles/${vehicle.id}`}
                    className="mt-4 block rounded-lg bg-blue-600 px-4 py-2.5 text-center text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    View Vehicle Details
                  </Link>
                </div>
              ))}
            </div>

            {filteredVehicles.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-5xl">🔍</div>
                <h3 className="mt-4 font-semibold">No vehicles found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* REGISTER VEHICLE MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Register New Vehicle
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  name="number"
                  required
                  placeholder="e.g. MH12 AB 9999"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    name="driver"
                    required
                    placeholder="Driver Name"
                    value={formData.driver}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+91 90000 00000"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Initial Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Depot"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Initial Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Idle">Idle</option>
                    <option value="Moving">Moving</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Fuel (%)
                  </label>
                  <input
                    type="number"
                    name="fuel"
                    min="0"
                    max="100"
                    value={formData.fuel}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Battery (%)
                  </label>
                  <input
                    type="number"
                    name="battery"
                    min="0"
                    max="100"
                    value={formData.battery}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;