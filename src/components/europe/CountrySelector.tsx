import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_COUNTRIES } from '@/types/europeanCompliance';
import type { EUCountryNorm } from '@/types/europeanCompliance';

interface CountrySelectorProps {
  selectedCountry: string;
  onSelect: (code: string) => void;
  countryNorms: EUCountryNorm[];
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelect,
  countryNorms
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Sélectionnez le pays de l'EDL
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {SUPPORTED_COUNTRIES.map((country) => {
          const isSelected = selectedCountry === country.code;
          const norm = countryNorms.find(n => n.country_code === country.code);
          
          return (
            <motion.button
              key={country.code}
              onClick={() => onSelect(country.code)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 bg-card hover:border-border hover:bg-muted/50"
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-primary"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
              
              <span className="text-2xl">{country.flag}</span>
              <span className={cn(
                "text-xs font-medium text-center truncate w-full",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {country.code}
              </span>
              
              {norm?.registration_required && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
                  REG
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Selected country info */}
      {selectedCountry && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 rounded-lg bg-muted/50 border"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry)?.flag}
            </span>
            <div className="flex-1">
              <h4 className="font-medium">
                {SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry)?.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                Langues: {SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry)?.languages.join(', ').toUpperCase()}
              </p>
            </div>
            {countryNorms.find(n => n.country_code === selectedCountry)?.legal_references && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {countryNorms.find(n => n.country_code === selectedCountry)?.legal_references.length || 0} normes
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
