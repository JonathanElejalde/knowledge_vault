import { cn } from "@/lib/utils"
import { Clock, FileText, Home, Layers, BookOpen, LogOut, Diamond } from "lucide-react"
import { NavLink } from "react-router-dom"

const routes = [
  { name: "Dashboard", path: "/", icon: Home },
  { name: "Pomodoro", path: "/pomodoro", icon: Clock },
  { name: "Projects", path: "/projects", icon: Layers },
  { name: "Notes", path: "/notes", icon: FileText },
  { name: "Anki Decks", path: "/anki", icon: BookOpen },
]

/**
 * Sidebar Component - Deep Focus Design
 * 
 * Collapsible sidebar:
 * - Mobile: Hidden (uses Sheet from Header)
 * - Tablet (md): Icon-only mode (w-20)
 * - Desktop (lg): Full mode with labels (w-64)
 * 
 * Features the "Deep Focus Blue" accent on active items.
 */
export default function Sidebar() {
  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col flex-shrink-0",
        "w-20 lg:w-64",
        "bg-surface-base border-r border-border-subtle",
        "transition-all duration-300"
      )}
      aria-label="Main sidebar"
    >
      {/* Logo area */}
      <div className={cn(
        "h-16 flex items-center justify-center lg:justify-start lg:px-6",
        "border-b border-border-subtle lg:border-none"
      )}>
        <Diamond className="h-6 w-6 text-accent-primary flex-shrink-0" aria-hidden="true" />
        <span className="hidden lg:block ml-3 font-semibold text-lg tracking-tight text-text-primary">
          Knowledge Vault
        </span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {routes.map((route) => (
          <NavLink
            to={route.path}
            key={route.path}
            className="block"
            end
          >
            {({ isActive }) => (
              <div 
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-[var(--radius-md)]",
                  "text-sm font-medium group transition-colors",
                  // Default state
                  "text-text-tertiary hover:text-text-primary hover:bg-accent-primary-subtle",
                  // Active state - Deep Focus Blue
                  isActive && [
                    "bg-accent-primary/10 text-accent-primary",
                    "dark:bg-accent-primary/20 dark:text-accent-primary"
                  ]
                )}
              >
                <route.icon 
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    "group-hover:scale-110 transition-transform",
                    isActive ? "text-accent-primary" : ""
                  )} 
                  strokeWidth={isActive ? 2 : 1.5}
                  aria-hidden="true" 
                />
                <span className={cn(
                  "hidden lg:block ml-3",
                  isActive && "text-accent-primary"
                )}>
                  {route.name}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
      
      {/* Footer area - Mobile only logout */}
      <div className="p-4 border-t border-border-subtle lg:hidden">
        <button 
          className={cn(
            "flex items-center justify-center w-full p-2 rounded-[var(--radius-md)]",
            "hover:bg-surface-sunken text-text-tertiary transition-colors"
          )}
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  )
}
