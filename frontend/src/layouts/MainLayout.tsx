import { Outlet } from "react-router";
import HamburgerMenu from "../components/HamburgerMenu";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-white">
      <HamburgerMenu />
      <main className="p-6 pt-16">
        <Outlet />
      </main>
    </div>
  );
}
