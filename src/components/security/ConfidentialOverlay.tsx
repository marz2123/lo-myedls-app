import React from 'react';
import { Lock, EyeOff } from 'lucide-react';
import { useConfidentialMode } from '@/contexts/ConfidentialModeContext';
import { cn } from '@/lib/utils';

interface ConfidentialOverlayProps {
  children: React.ReactNode;
  className?: string;
  showMessage?: boolean;
  type?: 'blur' | 'hide' | 'placeholder';
}

export const ConfidentialOverlay: React.FC<ConfidentialOverlayProps> = ({
  children,
  className,
  showMessage = true,
  type = 'blur'
}) => {
  const { isConfidential, blurIntensity } = useConfidentialMode();

  if (!isConfidential) {
    return <>{children}</>;
  }

  if (type === 'hide') {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 bg-muted/50 rounded-lg border border-dashed",
        className
      )}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">Confidentiel</span>
        </div>
      </div>
    );
  }

  if (type === 'placeholder') {
    return (
      <div className={cn(
        "bg-muted/30 rounded-lg animate-pulse",
        className
      )}>
        <div className="h-full w-full flex items-center justify-center min-h-[100px]">
          <Lock className="w-6 h-6 text-muted-foreground/50" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div 
        className="transition-all duration-300"
        style={{ filter: `blur(${blurIntensity}px)` }}
      >
        {children}
      </div>
      
      {showMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm rounded-lg">
          <div className="flex items-center gap-2 px-4 py-2 bg-background/90 rounded-full shadow-lg">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Mode confidentiel</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper for text content
export const ConfidentialText: React.FC<{
  children: React.ReactNode;
  placeholder?: string;
}> = ({ children, placeholder = "••••••••" }) => {
  const { isConfidential } = useConfidentialMode();

  if (isConfidential) {
    return <span className="text-muted-foreground">{placeholder}</span>;
  }

  return <>{children}</>;
};

// Wrapper for images
export const ConfidentialImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const { isConfidential, blurIntensity } = useConfidentialMode();

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-300",
          isConfidential && "scale-105"
        )}
        style={isConfidential ? { filter: `blur(${blurIntensity * 2}px)` } : undefined}
      />
      {isConfidential && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-2 bg-background/80 rounded-full">
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
};
