import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveTracking from "./pages/LiveTracking";
import HistoryPlayback from "./pages/HistoryPlayback";
import VehicleDetails from "./pages/VehicleDetails";
import MainPage from "./RouteManagement/MainPage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracking" element={<LiveTracking />} />
          <Route path="/live" element={<LiveTracking />} />
          <Route path="/history" element={<HistoryPlayback />} />
          <Route path="/assign-route" element={<MainPage />} />
          <Route path="/vehiclehistorymap/:id" element={<HistoryPlayback />}/>
          <Route path="/vehicledetails" element={<VehicleDetails />} />
          <Route path="/vehicle/:id" element={<VehicleDetails />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />}/>
        </Routes>
      </main>
    </BrowserRouter>
  );
}
export default App;