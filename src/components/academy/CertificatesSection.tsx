import React from 'react';
import { motion } from 'framer-motion';
import { Award, Download, ExternalLink, Lock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Certificate } from '@/hooks/useAcademy';

interface CertificatesSectionProps {
  certificates: Certificate[];
  modulesCompleted: number;
  totalModules: number;
  onClaimCertificate: (level: string, name: string) => void;
}

const certificateLevels = [
  {
    level: 'level_1',
    name: 'EDL Pro',
    description: 'Maîtrise des bases de l\'état des lieux',
    requiredModules: 4,
    color: 'from-blue-500 to-cyan-500',
    icon: '🏅'
  },
  {
    level: 'level_2',
    name: 'Expert MyEDLs',
    description: 'Expert en inspection et documentation',
    requiredModules: 7,
    color: 'from-purple-500 to-pink-500',
    icon: '🎖️'
  },
  {
    level: 'level_3',
    name: 'Référent Bâtiment',
    description: 'Référent technique certifié',
    requiredModules: 10,
    color: 'from-yellow-500 to-orange-500',
    icon: '🏆'
  }
];

export const CertificatesSection: React.FC<CertificatesSectionProps> = ({
  certificates,
  modulesCompleted,
  totalModules,
  onClaimCertificate
}) => {
  const hasCertificate = (level: string) => 
    certificates.some(c => c.certificate_level === level);

  const canClaim = (requiredModules: number) => 
    modulesCompleted >= requiredModules;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-yellow-500/10">
          <Award className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Certifications</h3>
          <p className="text-sm text-muted-foreground">
            {modulesCompleted} modules complétés sur {totalModules}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {certificateLevels.map((cert, index) => {
          const earned = hasCertificate(cert.level);
          const canEarn = canClaim(cert.requiredModules);
          const earnedCert = certificates.find(c => c.certificate_level === cert.level);
          
          return (
            <motion.div
              key={cert.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`
                border-border/50 overflow-hidden
                ${earned ? 'ring-2 ring-yellow-500/30' : ''}
                ${!canEarn && !earned ? 'opacity-60' : ''}
              `}>
                <div className={`
                  h-2 bg-gradient-to-r ${cert.color}
                  ${!earned && !canEarn ? 'opacity-30' : ''}
                `} />
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <span className="text-4xl">{cert.icon}</span>
                  </div>
                  
                  <h4 className="font-semibold text-center mb-1">{cert.name}</h4>
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    {cert.description}
                  </p>
                  
                  <div className="text-center mb-4">
                    {earned ? (
                      <Badge className="bg-green-500/10 text-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Obtenu
                      </Badge>
                    ) : canEarn ? (
                      <Badge className="bg-yellow-500/10 text-yellow-600">
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Lock className="w-3 h-3 mr-1" />
                        {cert.requiredModules - modulesCompleted} modules restants
                      </Badge>
                    )}
                  </div>
                  
                  {earned && earnedCert ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground text-center">
                        Obtenu le {new Date(earnedCert.issued_at).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Partager
                        </Button>
                      </div>
                    </div>
                  ) : canEarn ? (
                    <Button 
                      className="w-full"
                      onClick={() => onClaimCertificate(cert.level, cert.name)}
                    >
                      Obtenir le certificat
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <Lock className="w-3 h-3 mr-2" />
                      Verrouillé
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
