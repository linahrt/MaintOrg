import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import MainLayout from "./layouts/MainLayout";

// Pages
import Dashboard from "./pages/dashboard";
import Equipements from "./pages/equipements"
import LoginPage from "./pages/login"
import Pannes from "./pages/pannes";
import OrdresTravail from './pages/ordresTravail'
import CalendrierPreventif from "./pages/calendrier"
import ModuleIA from "./pages/moduleia"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<MainLayout />}>
        <Route path="/moduleia" element={<ModuleIA />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipements" element={<Equipements />} />
          <Route path="/pannes" element={<Pannes />} />
          <Route path="/ordresdetravail" element={<OrdresTravail />} />
          <Route path="/preventif" element={<CalendrierPreventif />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;