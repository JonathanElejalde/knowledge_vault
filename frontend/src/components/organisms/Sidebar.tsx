import { cn } from "@/lib/utils"
import { Clock, FileText, Home, Layers, BookOpen, Settings } from "lucide-react"
import { NavLink } from "react-router-dom"

const routes = [
  { name: "Dashboard", path: "/", icon: Home },
  { name: "Pomodoro", path: "/pomodoro", icon: Clock },
  { name: "Projects", path: "/projects", icon: Layers },
  { name: "Notes", path: "/notes", icon: FileText },
  { name: "Anki Decks", path: "/anki", icon: BookOpen },
]

export default function Sidebar() {
  return (
    <nav 
      className="hidden md:flex flex-col w-[var(--sidebar-width)] bg-surface-base" 
      aria-label="Main sidebar"
    >
      {/* Logo area - minimal, clean */}
      <div className="px-[var(--space-4)] py-[var(--space-5)] flex items-center gap-[var(--space-2)]">
        <span className="text-lg font-semibold text-text-primary tracking-tight">
          Knowledge Vault
        </span>
      </div>
      
      {/* Navigation */}
      <div className="flex flex-col gap-[var(--space-0-5)] px-[var(--space-2)] flex-1">
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
                  "flex items-center gap-[var(--space-3)] px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md)]",
                  "transition-colors duration-150 cursor-pointer",
                  "hover:bg-surface-sunken",
                  isActive && "bg-surface-sunken"
                )}
              >
                <route.icon 
                  className={cn(
                    "h-[18px] w-[18px] flex-shrink-0",
                    isActive ? "text-text-primary" : "text-text-tertiary"
                  )} 
                  strokeWidth={isActive ? 2 : 1.5}
                  aria-hidden="true" 
                />
                <span className={cn(
                  "text-sm",
                  isActive ? "text-text-primary font-medium" : "text-text-secondary"
                )}>
                  {route.name}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Footer area - minimal */}
      <div className="px-[var(--space-2)] pb-[var(--space-4)]">
        <div 
          className={cn(
            "flex items-center gap-[var(--space-3)] px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md)]",
            "transition-colors duration-150 cursor-pointer",
            "hover:bg-surface-sunken",
            "text-text-tertiary hover:text-text-secondary"
          )}
        >
          <Settings className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm">Settings</span>
        </div>
      </div>
    </nav>
  )
}
