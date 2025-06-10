import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/Dialog';
import { Button } from '@/components/atoms/Button';
import { AlertTriangle, Timer } from 'lucide-react';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAbandon: () => Promise<void>;
  isLoading?: boolean;
}

export function LogoutConfirmDialog({
  isOpen,
  onClose,
  onConfirmAbandon,
  isLoading = false,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Active Pomodoro Session
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Timer className="w-4 h-4 text-primary" />
              <span>You have an active Pomodoro session running.</span>
            </div>
            <p>
              Logging out will abandon your current session. Your progress will be saved based on the time you've already worked.
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button 
            variant="destructive" 
            onClick={onConfirmAbandon}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Abandoning Session...
              </>
            ) : (
              'Abandon Session & Log Out'
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="w-full"
          >
            Continue Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 