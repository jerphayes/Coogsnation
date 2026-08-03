import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle } from "lucide-react";

interface ExternalLinkDisclaimerProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  url: string;
}

export function ExternalLinkDisclaimer({ isOpen, onClose, onContinue, url }: ExternalLinkDisclaimerProps) {
  const [domain, setDomain] = useState<string>('');

  useEffect(() => {
    if (url) {
      try {
        const urlObj = new URL(url);
        setDomain(urlObj.hostname);
      } catch {
        setDomain(url);
      }
    }
  }, [url]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-external-disclaimer">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-uh-red">
            <AlertTriangle className="w-5 h-5" />
            Leaving CoogsNation
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            You are about to leave <strong>CoogsNation.com</strong> and visit an external website.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <ExternalLink className="w-4 h-4" />
              <span>Destination:</span>
            </div>
            <div className="font-medium text-uh-black break-all" data-testid="text-destination-url">
              {domain}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          CoogsNation is not responsible for the content or privacy practices of external websites.
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-stay"
          >
            Stay on CoogsNation
          </Button>
          <Button 
            onClick={onContinue}
            className="bg-uh-red hover:bg-red-700"
            data-testid="button-continue"
          >
            Continue to {domain}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage external link clicks
export function useExternalLinkDisclaimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string>('');

  const handleExternalClick = (url: string, event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setPendingUrl(url);
    setIsOpen(true);
  };

  const handleContinue = () => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    }
    setIsOpen(false);
    setPendingUrl('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingUrl('');
  };

  // Effect to automatically handle all external links on the page
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href^="http"]') as HTMLAnchorElement;
      
      if (link && link.href && !link.href.includes(window.location.hostname)) {
        // Only show disclaimer for external links that would open in new tab
        if (link.target === '_blank') {
          handleExternalClick(link.href, event);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  return {
    isOpen,
    pendingUrl,
    handleExternalClick,
    handleContinue,
    handleClose,
  };
}