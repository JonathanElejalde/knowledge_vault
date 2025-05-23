import { Button } from "@/components/atoms/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/Avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/Sheet"
import { Menu, Bell } from "lucide-react"
import Sidebar from "./Sidebar"
import { ModeToggle } from "@/components/molecules/ModeToggle"

export default function Header() {
  return (
    <header className="border-b px-4 py-3 flex items-center justify-between bg-background">
      {/* Mobile menu */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold">Knowledge Vault</h1>
      </div>
      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        <ModeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-user.jpg" alt="User" />
          <AvatarFallback>KV</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
} 