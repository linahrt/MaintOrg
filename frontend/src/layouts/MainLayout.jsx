import { Outlet } from "react-router-dom";
import Sidebar from "../components/SideBar"

export default function MainLayout() {
  return (
    <div className="flex">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Page Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

    </div>
  );
}