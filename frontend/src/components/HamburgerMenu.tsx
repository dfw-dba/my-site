import { useState } from "react";
import { Link } from "react-router";
import ThemeToggle from "./ThemeToggle";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white dark:bg-gray-700"
        aria-label="Open menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <nav
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex flex-col h-full">
          <button
            onClick={() => setIsOpen(false)}
            className="mb-6 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <ul className="space-y-4">
            <li>
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="block text-lg font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Resume
              </Link>
            </li>
            <li>
              <Link
                to="/personal"
                onClick={() => setIsOpen(false)}
                className="block text-lg font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Personal
              </Link>
            </li>
            <li>
              <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Showcase
              </span>
              <ul className="mt-2 ml-4 space-y-2">
                <li>
                  <Link
                    to="/showcase/blog"
                    onClick={() => setIsOpen(false)}
                    className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/showcase/data"
                    onClick={() => setIsOpen(false)}
                    className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Data
                  </Link>
                </li>
                <li>
                  <Link
                    to="/showcase"
                    onClick={() => setIsOpen(false)}
                    className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    All Projects
                  </Link>
                </li>
              </ul>
            </li>
          </ul>

          <div className="mt-auto pb-4">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
