import { Outlet } from "react-router";
import HamburgerMenu from "../components/HamburgerMenu";
import ThemeToggle from "../components/ThemeToggle";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <HamburgerMenu />
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <main className="p-6 pt-16">
        <Outlet />
      </main>
    </div>
  );
}
