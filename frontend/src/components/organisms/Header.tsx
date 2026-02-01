import { useState } from 'react'
import { Button } from "@/components/atoms/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/Avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/Sheet"
import { Menu, Bell, LogOut, User } from "lucide-react"
import Sidebar from "./Sidebar"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { LogoutConfirmDialog } from "./LogoutConfirmDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu"
import { cn } from "@/lib/utils"

/**
 * Header Component - Deep Focus Design
 * 
 * Clean, minimal header with:
 * - Mobile: Menu + title
 * - Desktop: Just the right-side actions (theme, notifications, user)
 */
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
        setShowLogoutConfirm(true);
      } else {
        console.error('Logout failed:', error);
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
    <header className={cn(
      "h-16 flex items-center justify-between px-6 lg:px-8",
      "bg-surface-ground border-b border-border-subtle lg:border-none"
    )}>
      {/* Mobile menu + title */}
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center ml-auto gap-4">
        <ThemeSwitcher />
        
        {/* Notifications */}
        <button 
          className="text-text-muted hover:text-text-secondary transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {/* Notification indicator */}
          <span className={cn(
            "absolute top-0 right-0 block h-2 w-2 rounded-full",
            "bg-accent-primary ring-2 ring-surface-ground",
            "transform translate-x-1/2 -translate-y-1/2"
          )} />
        </button>
        
        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              "bg-surface-sunken text-text-tertiary",
              "hover:bg-accent-primary-subtle hover:text-accent-primary",
              "cursor-pointer transition-colors"
            )}>
              {user?.username ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" alt={user.username} />
                  <AvatarFallback className="text-xs">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-4 w-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="text-semantic-danger"
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
