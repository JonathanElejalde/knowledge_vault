import { cn } from "@/lib/utils"
import { Button } from "@/components/atoms/Button"
import { Clock, FileText, Home, Layers, BookOpen } from "lucide-react"
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
      className="hidden md:flex flex-col w-[var(--sidebar-width)] border-r border-border-subtle bg-surface-base" 
      aria-label="Main sidebar"
    >
      {/* Logo area */}
      <div className="p-[var(--space-4)] border-b border-border-subtle min-h-[73px] flex items-center">
        <h1 className="text-heading-4 text-text-primary font-bold">Knowledge Vault</h1>
      </div>
      
      {/* Navigation */}
      <div className="flex flex-col gap-[var(--space-1)] p-[var(--space-2)] flex-1">
        {routes.map((route) => (
          <NavLink
            to={route.path}
            key={route.path}
            className="block"
            end
          >
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-[var(--space-2)] h-10",
                  isActive && "bg-accent-primary-subtle border-accent-primary/20 text-accent-primary"
                )}
                tabIndex={0}
              >
                <route.icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-label">{route.name}</span>
              </Button>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Footer area (could add user info or settings) */}
      <div className="p-[var(--space-4)] border-t border-border-subtle">
        <p className="text-caption text-text-muted text-center">
          Learning OS
        </p>
      </div>
    </nav>
  )
}
