import React from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClasses = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-blue-600 text-white font-semibold"
        : "text-gray-300 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg font-bold text-lg">FleetPulse</div>
      </div>

      <div className="flex items-center space-x-2">
        <NavLink to="/dashboard" className={linkClasses}>
          Dashboard
        </NavLink>
        <NavLink to="/live" className={linkClasses}>
          Live Tracking
        </NavLink>
        <NavLink to="/history" className={linkClasses}>
          History Playback
        </NavLink>
        <NavLink to="/vehicledetails" className={linkClasses}>
          Vehicle Details
        </NavLink>
        <NavLink to="/assign-route" className={linkClasses}>
          Assign Route
        </NavLink>
      </div>
    </nav>
  );
}