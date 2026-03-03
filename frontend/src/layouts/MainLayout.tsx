import { Outlet } from "react-router";
import HamburgerMenu from "../components/HamburgerMenu";
import SocialIcons from "../components/SocialIcons";
import ThemeToggle from "../components/ThemeToggle";

export default function MainLayout() {
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      <header className="flex shrink-0 items-center justify-between px-4 py-4">
        <HamburgerMenu />
        <SocialIcons />
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
