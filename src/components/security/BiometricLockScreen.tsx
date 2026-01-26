import React, { useState } from 'react';
import { Lock, Fingerprint, ScanFace, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { cn } from '@/lib/utils';

interface BiometricLockScreenProps {
  onUnlock: () => void;
  title?: string;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  onUnlock,
  title = "Contenu protégé"
}) => {
  const { biometricType, isAuthenticating, authenticate, unlockWithPasscode } = useBiometricAuth();
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleBiometricAuth = async () => {
    const success = await authenticate();
    if (success) {
      onUnlock();
    }
  };

  const handlePasscodeSubmit = async () => {
    setError('');
    const success = await unlockWithPasscode(passcode);
    if (success) {
      onUnlock();
    } else {
      setError('Code incorrect');
      setPasscode('');
    }
  };

  const BiometricIcon = biometricType === 'face' ? ScanFace : Fingerprint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
        {/* Lock Icon */}
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Déverrouillez pour afficher
          </p>
        </div>

        {!showPasscode ? (
          <>
            {/* Biometric Button */}
            <Button
              size="lg"
              className="w-full gap-3"
              onClick={handleBiometricAuth}
              disabled={isAuthenticating}
            >
              <BiometricIcon className={cn(
                "w-5 h-5",
                isAuthenticating && "animate-pulse"
              )} />
              {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
            </Button>

            {/* Passcode fallback */}
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => setShowPasscode(true)}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Utiliser le code
            </Button>
          </>
        ) : (
          <>
            {/* Passcode Input */}
            <div className="w-full space-y-3">
              <Input
                type="password"
                placeholder="Code d'accès"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button
                className="w-full"
                onClick={handlePasscodeSubmit}
                disabled={passcode.length < 4}
              >
                Déverrouiller
              </Button>
            </div>

            {/* Back to biometric */}
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => {
                setShowPasscode(false);
                setPasscode('');
                setError('');
              }}
            >
              <BiometricIcon className="w-4 h-4 mr-2" />
              Utiliser {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
