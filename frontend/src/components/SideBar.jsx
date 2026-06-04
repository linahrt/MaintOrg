import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wrench, TriangleAlert, NotebookPen, CalendarDays, Bot, LogOut } from "lucide-react";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

export default function Sidebar() {
  const navigate = useNavigate();
  const [pannesCount, setPannesCount] = useState(null);

  useEffect(() => {
    const fetchPannes = async () => {
      try {
        const result = await pb.collection("pannes").getList(1, 1, { fields: "id" });
        setPannesCount(result.totalItems);
      } catch (err) {
        console.error("Erreur chargement pannes:", err);
      }
    };

    fetchPannes();

    // Abonnement temps réel pour mettre à jour le badge automatiquement
    pb.collection("pannes").subscribe("*", () => fetchPannes());

    return () => pb.collection("pannes").unsubscribe("*");
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate("/", { replace: true });
  };

  const navItems = [
    { id: "dashboard",      label: "Dashboard",        icon: <LayoutDashboard />, href: "/" },
    { id: "equipements",    label: "Equipements",       icon: <Wrench />,          href: "/equipements" },
    { id: "pannes",         label: "Pannes",            icon: <TriangleAlert />,   href: "/pannes", badge: pannesCount },
    { id: "ordresdetravail",label: "Ordres de travail", icon: <NotebookPen />,     href: "/ordresdetravail" },
    { id: "preventif", label: "Préventif", icon: <CalendarDays />, href: "/preventif" },
    { id: "moduleia",       label: "Module IA",         icon: <Bot />,             href: "/moduleia" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-64 py-7 px-5 flex flex-col gap-1 font-[DM_Sans,sans-serif] h-screen mt-4 ml-4 mb-4">
      <p className="text-xl font-semibold text-slate-800 mb-5 px-2">MaintOrg</p>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ id, label, icon, badge, href }) => (
          <NavLink
            key={id}
            to={href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
            }
          >
            {icon}
            <span className="flex-1">{label}</span>
            {badge !== null && badge !== undefined && (
              <span className="bg-slate-200 text-slate-500 text-xs font-semibold rounded-full px-2.5 py-0.5">
                {badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="border-t border-slate-200 my-2" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-all duration-150 w-full text-left"
        >
          <LogOut />
          Log Out
        </button>
      </nav>
    </div>
  );
}