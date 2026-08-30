import { useTheme } from "@/providers/ThemeProvider";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import React, { useEffect, useState } from "react";

const DarkModeToggle = ({
  variants,
}: {
  variants: "fixed" | "block" | "icon";
}) => {
  const { theme, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-6" />;
  }

  return (
    <div className={`${variants} right-3 top-3`}>
      <motion.button
        className={`relative rounded-full ${
          variants === "block"
            ? "bg-secondary w-12 h-6"
            : "bg-transparent w-10 h-10"
        } flex items-center transition-colors`}
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      >
        <motion.div
          className={`absolute rounded-full ${
            variants === "block"
              ? "bg-primary w-4 h-4 shadow-md"
              : "bg-gray-800 dark:bg-yellow-300 w-6 h-6"
          }`}
          animate={{
            x: isDark
              ? variants === "block"
                ? 28
                : 0
              : variants === "block"
              ? 4
              : 0,
            rotate: isDark ? 360 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {variants === "icon" && (
            <div className="w-full h-full flex items-center justify-center">
              {isDark ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-4 h-4 text-primary-foreground"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-4 h-4 text-primary-foreground"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </div>
          )}
        </motion.div>
        {variants === "block" && (
          <>
            <div className="absolute left-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-primary-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="absolute right-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-gray-500 dark:text-primary-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default DarkModeToggle;
