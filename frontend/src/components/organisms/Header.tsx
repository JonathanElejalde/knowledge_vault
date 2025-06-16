import React, { useState } from 'react'
import { Button } from "@/components/atoms/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/Avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/Sheet"
import { Menu, Bell, LogOut } from "lucide-react"
import Sidebar from "./Sidebar"
import { ModeToggle } from "@/components/molecules/ModeToggle"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { LogoutConfirmDialog } from "./LogoutConfirmDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu"

export default function Header() {
  const { logout, logoutWithSessionAbandon, user } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      if (error instanceof Error && error.message === 'ACTIVE_POMODORO_SESSION') {
        // Show confirmation dialog for active session
        setShowLogoutConfirm(true);
      } else {
        console.error('Logout failed:', error);
        // Handle other logout errors if needed
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleConfirmAbandonAndLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutWithSessionAbandon();
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Failed to abandon session and logout:', error);
      // Even if abandon fails, we should still try to logout
      try {
        await logout({ skipSessionCheck: true });
        setShowLogoutConfirm(false);
      } catch (logoutError) {
        console.error('Final logout attempt failed:', logoutError);
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="border-b px-4 py-4 flex items-center justify-between bg-background">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-user.jpg" alt={user?.username || "User"} />
                <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "KV"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="text-destructive"
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logout Confirmation Dialog */}
             <LogoutConfirmDialog
         isOpen={showLogoutConfirm}
         onClose={() => setShowLogoutConfirm(false)}
         onConfirmAbandon={handleConfirmAbandonAndLogout}
         isLoading={isLoggingOut}
       />
    </header>
  )
} 