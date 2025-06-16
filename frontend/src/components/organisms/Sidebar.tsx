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
    <nav className="hidden md:flex flex-col w-64 border-r bg-background" aria-label="Main sidebar">
      <div className="p-4 border-b min-h-[73px] flex items-center">
        <h1 className="text-xl font-bold">Knowledge Vault</h1>
      </div>
      <div className="flex flex-col gap-1 p-2 flex-1">
        {routes.map((route) => (
          <NavLink
            to={route.path}
            key={route.path}
            className={({ isActive }) =>
              cn(
                "w-full justify-start gap-2 h-10",
                isActive ? "bg-secondary" : "hover:bg-secondary/50"
              )
            }
            end
          >
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-2 h-10", isActive ? "bg-secondary" : "hover:bg-secondary/50")}
                tabIndex={0}
              >
                <route.icon className="h-4 w-4" aria-hidden="true" />
                {route.name}
              </Button>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
} 