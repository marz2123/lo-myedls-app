export type DetailLevel = 'simplified' | 'detailed' | 'very-detailed' | 'exhaustive';

export const TEMPLATES = {
  building: {
    simplified: {
      fr: `État général de l'immeuble :
- Année de construction : 
- État général : 
- Travaux à prévoir : 

Observations :
- `,
      en: `Building general condition:
- Year of construction: 
- General condition: 
- Planned works: 

Observations:
- `
    },
    detailed: {
      fr: `État général de l'immeuble :
- Année de construction : 
- Nombre d'étages : 
- Type de chauffage : (collectif/individuel)
- Présence d'ascenseur : 
- État de la façade : 
- État des parties communes : 
- État de la toiture : 
- Isolation : 

Équipements communs :
- Interphone/digicode : 
- Local vélo : 
- Local poubelles : 
- Gardien : 

Travaux récents ou à prévoir :
- 

Observations particulières :
- `,
      en: `Building general condition:
- Year of construction: 
- Number of floors: 
- Heating type: (collective/individual)
- Elevator: 
- Facade condition: 
- Common areas condition: 
- Roof condition: 
- Insulation: 

Common facilities:
- Intercom/keypad: 
- Bike storage: 
- Trash room: 
- Caretaker: 

Recent or planned works:
- 

Special observations:
- `
    },
    'very-detailed': {
      fr: `État général de l'immeuble :
- Année de construction : 
- Nombre d'étages : 
- Nombre de logements total : 
- Type de chauffage : (collectif/individuel)
- Combustible : (gaz, électrique, fioul, autre)
- Présence d'ascenseur : (nombre, marque, année d'installation)
- État de la façade : (crépi, pierre, brique)
- État des parties communes : (escaliers, couloirs, cave)
- État de la toiture : (tuiles, ardoise, zinc)
- Isolation thermique : (simple vitrage, double vitrage)
- Isolation phonique : 

Équipements communs :
- Interphone/digicode : (marque, état)
- Visiophone : 
- Local vélo : (capacité, sécurisé)
- Local poubelles : (tri sélectif)
- Gardien/concierge : (temps de présence)
- Espaces verts : 

Sécurité :
- Système de sécurité : 
- Éclairage parties communes : 
- Détecteur de fumée : 
- Extincteurs : 

Raccordements et réseaux :
- Eau : (compteurs individuels/collectifs)
- Électricité : (puissance disponible)
- Gaz : 
- Fibre optique : 
- Antenne collective : 

Travaux et entretien :
- Date du dernier ravalement : 
- Date de la dernière réfection de toiture : 
- Travaux récents : 
- Travaux votés en AG : 
- Travaux à prévoir : 

Observations particulières :
- `,
      en: `Building general condition:
- Year of construction: 
- Number of floors: 
- Total number of units: 
- Heating type: (collective/individual)
- Fuel: (gas, electric, oil, other)
- Elevator: (number, brand, installation year)
- Facade condition: (plaster, stone, brick)
- Common areas condition: (stairs, hallways, basement)
- Roof condition: (tiles, slate, zinc)
- Thermal insulation: (single glazing, double glazing)
- Sound insulation: 

Common facilities:
- Intercom/keypad: (brand, condition)
- Video intercom: 
- Bike storage: (capacity, secured)
- Trash room: (recycling)
- Caretaker: (time of presence)
- Green spaces: 

Security:
- Security system: 
- Common areas lighting: 
- Smoke detector: 
- Fire extinguishers: 

Connections and networks:
- Water: (individual/collective meters)
- Electricity: (available power)
- Gas: 
- Fiber optic: 
- Collective antenna: 

Works and maintenance:
- Last facade renovation date: 
- Last roof repair date: 
- Recent works: 
- Works voted in general assembly: 
- Planned works: 

Special observations:
- `
    },
    exhaustive: {
      fr: `IDENTIFICATION DU BIEN
- Adresse complète : 
- Année de construction : 
- Architecte : 
- Permis de construire n° : 
- Nombre d'étages : 
- Nombre de logements total : 
- Nombre de caves : 
- Nombre de parkings : 
- Surface totale du terrain : 

STRUCTURE ET GROS ŒUVRE
- Type de construction : (béton, pierre, brique)
- État des fondations : 
- État de la structure porteuse : 
- État des murs extérieurs : 
- État de la charpente : 
- Type et état de la toiture : 
- État des évacuations d'eau de pluie : 
- Présence de fissures : (localisation, importance)

CHAUFFAGE ET ÉNERGIES
- Type de chauffage : 
- Combustible : 
- Marque et modèle de la chaudière : 
- Date d'installation de la chaudière : 
- Dernière révision : 
- Consommation énergétique annuelle : 
- DPE : (note énergétique)
- Émissions de GES : 
- Panneaux solaires : 
- Autres sources d'énergie renouvelable : 

ÉQUIPEMENTS TECHNIQUES
- Ascenseur(s) : (nombre, marque, capacité, dernière révision)
- Vide-ordures : 
- VMC : (type, état)
- Système de sécurité incendie : 
- Éclairage automatique : 
- Détection de fumée : 
- Portes coupe-feu : 

ÉQUIPEMENTS COMMUNS
- Interphone/visiophone : (marque, modèle, état)
- Digicode : 
- Badge d'accès : 
- Local vélo : (capacité, sécurisé, équipé)
- Local poussettes : 
- Local poubelles : (tri sélectif, composteur)
- Gardien/concierge : (loge, temps de présence, missions)
- Espaces verts : (surface, entretien)
- Aire de jeux : 
- Salle commune : 

RACCORDEMENTS ET RÉSEAUX
- Compteurs d'eau : (individuels/collectifs, relevé)
- Compteurs électriques : (individuels/collectifs, puissance)
- Compteurs de gaz : 
- Fibre optique : (opérateurs disponibles)
- Antenne collective TV : 
- Réseau téléphone : 

ISOLATION ET PERFORMANCES
- Isolation thermique : (murs, combles, sol)
- Type de vitrage : (simple, double, triple)
- Isolation phonique : (entre logements, extérieure)
- Ventilation : 
- Étanchéité : 

ACCESSIBILITÉ ET NORMES
- Accessibilité PMR : 
- Rampes d'accès : 
- Ascenseur adapté : 
- Portes élargies : 
- Conformité ERP : 
- Normes de sécurité : 

GESTION ET ADMINISTRATION
- Syndic : (nom, coordonnées)
- Nombre de copropriétaires : 
- Quote-part : 
- Charges mensuelles moyennes : 
- Fonds travaux : 
- Procès-verbaux d'AG disponibles : 

TRAVAUX ET ENTRETIEN
- Date du dernier ravalement : 
- Date de la dernière réfection de toiture : 
- Date de remplacement des fenêtres : 
- Travaux d'isolation réalisés : 
- Travaux de mise aux normes : 
- Travaux récents : 
- Travaux votés en AG : 
- Travaux à prévoir dans les 5 ans : 
- Budget prévu : 

ENVIRONNEMENT ET VOISINAGE
- Nuisances sonores : 
- Commerces de proximité : 
- Transports en commun : 
- Écoles : 
- Espaces verts à proximité : 
- Stationnement dans la rue : 

OBSERVATIONS PARTICULIÈRES ET RECOMMANDATIONS
- `,
      en: `PROPERTY IDENTIFICATION
- Complete address: 
- Year of construction: 
- Architect: 
- Building permit no.: 
- Number of floors: 
- Total number of units: 
- Number of cellars: 
- Number of parking spaces: 
- Total land area: 

STRUCTURE AND SHELL
- Construction type: (concrete, stone, brick)
- Foundation condition: 
- Load-bearing structure condition: 
- External walls condition: 
- Framework condition: 
- Roof type and condition: 
- Rainwater drainage condition: 
- Presence of cracks: (location, importance)

HEATING AND ENERGY
- Heating type: 
- Fuel: 
- Boiler brand and model: 
- Boiler installation date: 
- Last service: 
- Annual energy consumption: 
- Energy performance certificate: (energy rating)
- GHG emissions: 
- Solar panels: 
- Other renewable energy sources: 

TECHNICAL EQUIPMENT
- Elevator(s): (number, brand, capacity, last service)
- Garbage chute: 
- Mechanical ventilation: (type, condition)
- Fire safety system: 
- Automatic lighting: 
- Smoke detection: 
- Fire doors: 

COMMON FACILITIES
- Intercom/video intercom: (brand, model, condition)
- Keypad: 
- Access badge: 
- Bike storage: (capacity, secured, equipped)
- Stroller storage: 
- Trash room: (recycling, composter)
- Caretaker: (lodge, presence time, duties)
- Green spaces: (area, maintenance)
- Playground: 
- Common room: 

CONNECTIONS AND NETWORKS
- Water meters: (individual/collective, reading)
- Electric meters: (individual/collective, power)
- Gas meters: 
- Fiber optic: (available operators)
- Collective TV antenna: 
- Telephone network: 

INSULATION AND PERFORMANCE
- Thermal insulation: (walls, attic, floor)
- Glazing type: (single, double, triple)
- Sound insulation: (between units, external)
- Ventilation: 
- Waterproofing: 

ACCESSIBILITY AND STANDARDS
- Disability access: 
- Access ramps: 
- Adapted elevator: 
- Widened doors: 
- ERP compliance: 
- Safety standards: 

MANAGEMENT AND ADMINISTRATION
- Property manager: (name, contact)
- Number of co-owners: 
- Share quota: 
- Average monthly fees: 
- Works fund: 
- General assembly minutes available: 

WORKS AND MAINTENANCE
- Last facade renovation date: 
- Last roof repair date: 
- Window replacement date: 
- Insulation works completed: 
- Compliance works: 
- Recent works: 
- Works voted in general assembly: 
- Works planned in next 5 years: 
- Estimated budget: 

ENVIRONMENT AND NEIGHBORHOOD
- Noise pollution: 
- View: 
- Overlooking: 
- Amenities: 
- Transport: 
- Schools: 

SPECIAL OBSERVATIONS AND RECOMMENDATIONS
- `
    }
  },
  house: {
    simplified: {
      fr: `État général de la maison :
- Année de construction : 
- Surface habitable : 
- État général : 
- Travaux à prévoir : 

Observations :
- `,
      en: `House general condition:
- Year of construction: 
- Living area: 
- General condition: 
- Planned works: 

Observations:
- `
    },
    detailed: {
      fr: `État général de la maison :
- Année de construction : 
- Surface habitable : 
- Surface du terrain : 
- Type de chauffage : 
- État de la toiture : 
- État des façades : 
- Isolation : 

Équipements extérieurs :
- Jardin : 
- Terrasse : 
- Piscine : 
- Portail : 
- Clôture : 

Dépendances :
- Garage : 
- Cave : 
- Grenier : 
- Abri de jardin : 

Travaux récents ou à prévoir :
- 

Observations particulières :
- `,
      en: `House general condition:
- Year of construction: 
- Living area: 
- Land area: 
- Heating type: 
- Roof condition: 
- Facade condition: 
- Insulation: 

Outdoor facilities:
- Garden: 
- Terrace: 
- Pool: 
- Gate: 
- Fence: 

Annexes:
- Garage: 
- Cellar: 
- Attic: 
- Garden shed: 

Recent or planned works:
- 

Special observations:
- `
    },
    'very-detailed': {
      fr: `État général de la maison :
- Année de construction : 
- Architecte : 
- Style architectural : 
- Surface habitable : 
- Surface du terrain : 
- Nombre de pièces : 
- Nombre de chambres : 
- Nombre de salles de bain : 
- Nombre de WC : 
- Nombre de niveaux : 

Structure et gros œuvre :
- Type de construction : 
- État des fondations : 
- État de la charpente : 
- Type et état de la toiture : 
- État des façades : 
- Présence de fissures : 

Chauffage et énergie :
- Type de chauffage : 
- Combustible : 
- DPE : 
- Isolation thermique : 
- Type de vitrage : 

Équipements intérieurs :
- Cuisine : (équipée, aménagée)
- Cheminée : 
- Climatisation : 
- VMC : 

Équipements extérieurs :
- Jardin : (surface, paysagé, arboré)
- Terrasse : (surface, matériau)
- Piscine : (dimensions, chauffée, sécurisée)
- Portail : (manuel, motorisé)
- Clôture : (type, hauteur)
- Éclairage extérieur : 
- Arrosage automatique : 

Dépendances :
- Garage : (nombre de places, fermé/ouvert)
- Cave : (surface)
- Grenier : (aménageable)
- Abri de jardin : 
- Local technique : 

Raccordements :
- Tout-à-l'égout : 
- Fosse septique : 
- Eau de ville : 
- Puits : 

Travaux et entretien :
- Travaux récents : 
- Travaux à prévoir : 
- Budget estimé : 

Observations particulières :
- `,
      en: `House general condition:
- Year of construction: 
- Architect: 
- Architectural style: 
- Living area: 
- Land area: 
- Number of rooms: 
- Number of bedrooms: 
- Number of bathrooms: 
- Number of toilets: 
- Number of levels: 

Structure and shell:
- Construction type: 
- Foundation condition: 
- Framework condition: 
- Roof type and condition: 
- Facade condition: 
- Presence of cracks: 

Heating and energy:
- Heating type: 
- Fuel: 
- Energy performance: 
- Thermal insulation: 
- Glazing type: 

Indoor facilities:
- Kitchen: (equipped, fitted)
- Fireplace: 
- Air conditioning: 
- Mechanical ventilation: 

Outdoor facilities:
- Garden: (area, landscaped, trees)
- Terrace: (area, material)
- Pool: (dimensions, heated, secured)
- Gate: (manual, motorized)
- Fence: (type, height)
- Outdoor lighting: 
- Automatic watering: 

Annexes:
- Garage: (number of spaces, closed/open)
- Cellar: (area)
- Attic: (convertible)
- Garden shed: 
- Technical room: 

Connections:
- Main sewer: 
- Septic tank: 
- City water: 
- Well: 

Works and maintenance:
- Recent works: 
- Planned works: 
- Estimated budget: 

Special observations:
- `
    },
    exhaustive: {
      fr: `IDENTIFICATION
- Adresse complète : 
- Année de construction : 
- Architecte : 
- Style architectural : 
- Surface habitable : 
- Surface du terrain : 
- Cadastre : 
- Mitoyenneté : 
- Orientation : 

DISTRIBUTION
- Nombre total de pièces : 
- Nombre de chambres : 
- Nombre de salles de bain : 
- Nombre de salles d'eau : 
- Nombre de WC : 
- Nombre de niveaux : 
- Sous-sol : 
- Combles : 

STRUCTURE ET GROS ŒUVRE
- Type de construction : 
- État des fondations : 
- État de la structure porteuse : 
- État de la charpente : 
- Type de toiture : 
- Année de réfection de la toiture : 
- État des façades : 
- Ravalement : (date du dernier)
- Présence de fissures : 
- État de l'étanchéité : 

MENUISERIES ET FERMETURES
- Type de fenêtres : 
- Nombre de fenêtres : 
- Type de vitrage : 
- État des fenêtres : 
- Volets : (type, état)
- Portes : (matériau, état)
- Porte d'entrée : (blindée, sécurisée)

CHAUFFAGE ET ÉNERGIE
- Type de chauffage principal : 
- Combustible : 
- Marque et modèle : 
- Année d'installation : 
- Chauffage d'appoint : 
- Programmation : 
- DPE : (note énergétique)
- GES : 
- Consommation annuelle : 

ISOLATION ET PERFORMANCES
- Isolation des murs : 
- Isolation du toit : 
- Isolation du sol : 
- Ponts thermiques : 
- Isolation phonique : 
- Étanchéité à l'air : 

ÉLECTRICITÉ
- Installation aux normes : 
- Tableau électrique : 
- Nombre de prises : 
- Puissance souscrite : 
- Éclairages : 

PLOMBERIE ET SANITAIRES
- État général : 
- Évacuations : 
- Arrivée d'eau : 
- Production d'eau chaude : 
- Salles de bain : (équipement)
- WC : (nombre, état)

CUISINE
- Surface : 
- Équipement : 
- Électroménager : 
- État général : 

REVÊTEMENTS INTÉRIEURS
- Sols : (type par pièce)
- Murs : 
- Plafonds : 
- État général : 

ÉQUIPEMENTS INTÉRIEURS
- Cheminée(s) : 
- Poêle : 
- Climatisation : 
- VMC : 
- Domotique : 
- Alarme : 
- Vidéosurveillance : 

EXTÉRIEUR ET TERRAIN
- Surface du jardin : 
- Paysagé : 
- Arboré : (essences)
- Pelouse : 
- Haies : 
- Portail : (type, motorisation)
- Clôture : (matériau, hauteur)
- Accès : 

TERRASSE ET BALCON
- Nombre : 
- Surface : 
- Matériau : 
- Orientation : 
- Couverture : 

PISCINE
- Dimensions : 
- Type : 
- Revêtement : 
- Système de filtration : 
- Chauffée : 
- Couverture : 
- Sécurité : 
- Local technique : 

DÉPENDANCES
- Garage : (nombre de places, fermé/ouvert, motorisé)
- Cave : (surface, état)
- Grenier : (aménageable, surface)
- Abri de jardin : 
- Local technique : 
- Atelier : 

RACCORDEMENTS
- Tout-à-l'égout : 
- Fosse septique : (capacité, dernière vidange)
- Eau de ville : 
- Puits : (profondeur, débit)
- Électricité : 
- Gaz : 
- Fibre optique : 
- Téléphone : 

TRAVAUX ET ENTRETIEN
- Travaux de rénovation récents : 
- Travaux de mise aux normes : 
- Travaux à prévoir : 
- Budget estimé : 
- Garanties en cours : 

ENVIRONNEMENT
- Nuisances sonores : 
- Vue : 
- Vis-à-vis : 
- Commodités : 
- Transports : 
- Écoles : 

OBSERVATIONS PARTICULIÈRES
- `,
      en: `IDENTIFICATION
- Complete address: 
- Year of construction: 
- Architect: 
- Architectural style: 
- Living area: 
- Land area: 
- Land registry: 
- Party wall: 
- Orientation: 

LAYOUT
- Total number of rooms: 
- Number of bedrooms: 
- Number of bathrooms: 
- Number of shower rooms: 
- Number of toilets: 
- Number of levels: 
- Basement: 
- Attic: 

STRUCTURE AND SHELL
- Construction type: 
- Foundation condition: 
- Load-bearing structure condition: 
- Framework condition: 
- Roof type: 
- Roof repair year: 
- Facade condition: 
- Facade renovation: (last date)
- Presence of cracks: 
- Waterproofing condition: 

JOINERY AND CLOSURES
- Window type: 
- Number of windows: 
- Glazing type: 
- Window condition: 
- Shutters: 
- Doors: (material, condition)
- Entrance door: (reinforced, secured)

HEATING AND ENERGY
- Main heating type: 
- Fuel: 
- Brand and model: 
- Installation year: 
- Supplementary heating: 
- Programming: 
- Energy performance: (rating)
- GHG: 
- Annual consumption: 

INSULATION AND PERFORMANCE
- Wall insulation: 
- Roof insulation: 
- Floor insulation: 
- Thermal bridges: 
- Sound insulation: 
- Air tightness: 

ELECTRICITY
- Up-to-standard installation: 
- Electrical panel: 
- Number of outlets: 
- Subscribed power: 
- Lighting: 

PLUMBING AND SANITATION
- General condition: 
- Drainage: 
- Water supply: 
- Hot water production: 
- Bathrooms: (equipment)
- Toilets: (number, condition)

KITCHEN
- Area: 
- Equipment: 
- Appliances: 
- General condition: 

INTERIOR FINISHES
- Floors: (type per room)
- Walls: 
- Ceilings: 
- General condition: 

INDOOR FACILITIES
- Fireplace(s): 
- Stove: 
- Air conditioning: 
- Mechanical ventilation: 
- Home automation: 
- Alarm: 
- Video surveillance: 

EXTERIOR AND LAND
- Garden area: 
- Landscaped: 
- Trees: (species)
- Lawn: 
- Hedges: 
- Gate: (type, motorization)
- Fence: (material, height)
- Access: 

TERRACE AND BALCONY
- Number: 
- Area: 
- Material: 
- Orientation: 
- Cover: 

POOL
- Dimensions: 
- Type: 
- Coating: 
- Filtration system: 
- Heated: 
- Cover: 
- Safety: 
- Technical room: 

ANNEXES
- Garage: (number of spaces, closed/open, motorized)
- Cellar: (area, condition)
- Attic: (convertible, area)
- Garden shed: 
- Technical room: 
- Workshop: 

CONNECTIONS
- Main sewer: 
- Septic tank: (capacity, last emptying)
- City water: 
- Well: (depth, flow rate)
- Electricity: 
- Gas: 
- Fiber optic: 
- Telephone: 

WORKS AND MAINTENANCE
- Recent renovation works: 
- Compliance works: 
- Planned works: 
- Estimated budget: 
- Current warranties: 

ENVIRONMENT
- Noise pollution: 
- View: 
- Overlooking: 
- Amenities: 
- Transport: 
- Schools: 

SPECIAL OBSERVATIONS
- `
    }
  },
  apartment: {
    simplified: {
      fr: `État général de l'appartement :
- Étage : 
- Surface habitable : 
- État général : 
- Charges mensuelles : 

Observations :
- `,
      en: `Apartment general condition:
- Floor: 
- Living area: 
- General condition: 
- Monthly fees: 

Observations:
- `
    },
    detailed: {
      fr: `État général de l'appartement :
- Étage : 
- Surface habitable : 
- Exposition : 
- Type de chauffage : 
- État général : 
- Isolation phonique : 
- Isolation thermique : 

Équipements :
- Balcon/Terrasse : 
- Cave : 
- Parking : 
- Ascenseur : 

Charges de copropriété :
- Montant mensuel : 
- Inclus dans les charges : 

Travaux de copropriété :
- Travaux récents : 
- Travaux votés : 
- Travaux à prévoir : 

Observations particulières :
- `,
      en: `Apartment general condition:
- Floor: 
- Living area: 
- Exposure: 
- Heating type: 
- General condition: 
- Sound insulation: 
- Thermal insulation: 

Facilities:
- Balcony/Terrace: 
- Cellar: 
- Parking: 
- Elevator: 

Condominium fees:
- Monthly amount: 
- Included in fees: 

Condominium works:
- Recent works: 
- Voted works: 
- Planned works: 

Special observations:
- `
    },
    'very-detailed': {
      fr: `État général de l'appartement :
- Étage : 
- Ascenseur : 
- Surface habitable : 
- Surface Carrez : 
- Nombre de pièces : 
- Nombre de chambres : 
- Exposition : 
- Vue : 
- Luminosité : 
- Hauteur sous plafond : 

Chauffage et énergie :
- Type de chauffage : 
- Combustible : 
- Individuel/collectif : 
- DPE : 
- Isolation thermique : 
- Type de vitrage : 

État général :
- Revêtements sols : 
- Revêtements murs : 
- Menuiseries : 
- Isolation phonique : 

Équipements intérieurs :
- Cuisine : (équipée, aménagée)
- Salle de bain : 
- Salle d'eau : 
- WC : 
- Placards : 

Équipements extérieurs :
- Balcon : (surface, exposition)
- Terrasse : (surface)
- Loggia : 
- Cave : (numéro, surface)
- Parking : (numéro, couvert/découvert)
- Box : 

Copropriété :
- Nombre de lots : 
- Charges mensuelles : 
- Inclus dans les charges : 
- Provisions sur charges : 
- Syndic : 
- Procédures en cours : 

Travaux de copropriété :
- Travaux récents : 
- Travaux votés : 
- Travaux à prévoir : 
- Montant appelé : 

Observations particulières :
- `,
      en: `Apartment general condition:
- Floor: 
- Elevator: 
- Living area: 
- Carrez area: 
- Number of rooms: 
- Number of bedrooms: 
- Exposure: 
- View: 
- Brightness: 
- Ceiling height: 

Heating and energy:
- Heating type: 
- Fuel: 
- Individual/collective: 
- Energy performance: 
- Thermal insulation: 
- Glazing type: 

General condition:
- Floor coverings: 
- Wall coverings: 
- Joinery: 
- Sound insulation: 

Indoor facilities:
- Kitchen: (equipped, fitted)
- Bathroom: 
- Shower room: 
- Toilet: 
- Closets: 

Outdoor facilities:
- Balcony: (area, exposure)
- Terrace: (area)
- Loggia: 
- Cellar: (number, area)
- Parking: (number, covered/uncovered)
- Garage box: 

Condominium:
- Number of lots: 
- Monthly fees: 
- Included in fees: 
- Provisions for fees: 
- Property manager: 
- Ongoing proceedings: 

Condominium works:
- Recent works: 
- Voted works: 
- Planned works: 
- Called amount: 

Special observations:
- `
    },
    exhaustive: {
      fr: `IDENTIFICATION
- Étage : 
- Nombre d'étages du bâtiment : 
- Présence d'ascenseur : 
- Surface habitable : 
- Surface Carrez : 
- Surface au sol : 
- Orientation générale : 
- Exposition : 
- Vue : 
- Vis-à-vis : 
- Luminosité : 

DISTRIBUTION
- Nombre de pièces : 
- Nombre de chambres : 
- Nombre de salles de bain : 
- Nombre de salles d'eau : 
- Nombre de WC : 
- Entrée : 
- Séjour : (surface)
- Cuisine : (surface)
- Dégagements : 
- Hauteur sous plafond : 

MENUISERIES
- Type de fenêtres : 
- Type de vitrage : 
- Nombre de fenêtres : 
- État des fenêtres : 
- Volets : 
- Portes intérieures : 
- Porte d'entrée : 

CHAUFFAGE ET ÉNERGIE
- Type de chauffage : 
- Combustible : 
- Individuel/collectif : 
- Émetteurs : (radiateurs, plancher chauffant)
- Programmation : 
- DPE : 
- GES : 
- Consommation annuelle : 

ISOLATION
- Isolation thermique : 
- Isolation phonique : 
- Isolation entre étages : 
- Isolation avec les voisins : 

ÉLECTRICITÉ
- Installation aux normes : 
- Tableau électrique : 
- Interrupteurs : 
- Prises : 
- Éclairages : 

PLOMBERIE
- État général : 
- Évacuations : 
- Production d'eau chaude : 
- Robinetterie : 

CUISINE
- Surface : 
- Aménagement : 
- Équipements : 
- État : 

SALLE(S) DE BAIN / D'EAU
- Nombre : 
- Équipement : 
- État : 

WC
- Nombre : 
- Séparé : 
- État : 

REVÊTEMENTS
- Sols : (type par pièce)
- Murs : 
- Plafonds : 
- État général : 

RANGEMENTS
- Placards muraux : 
- Dressing : 
- Autres : 

ÉQUIPEMENTS EXTÉRIEURS
- Balcon : (surface, orientation, vue)
- Terrasse : (surface, orientation)
- Loggia : 
- Cave : (numéro, surface, état)
- Parking extérieur : (numéro, emplacement)
- Box fermé : (numéro, dimensions)
- Place de garage : 

COPROPRIÉTÉ
- Année de construction de l'immeuble : 
- Nombre total de lots : 
- Nombre de lots d'habitation : 
- Quote-part : 
- Charges trimestrielles : 
- Charges annuelles : 
- Inclus dans les charges : 
- Syndic : (nom, coordonnées)
- Gardien : 
- Procédures en cours : 
- Impayés : 

PARTIES COMMUNES
- État des parties communes : 
- Interphone/visiophone : 
- Digicode : 
- Éclairage : 
- Propreté : 

TRAVAUX
- Travaux récents dans l'immeuble : 
- Travaux votés : 
- Travaux à prévoir : 
- Montant des appels de fonds : 
- Fonds travaux : 

ENVIRONNEMENT
- Nuisances sonores : 
- Commerces : 
- Transports en commun : 
- Écoles : 
- Services : 

OBSERVATIONS PARTICULIÈRES
- `,
      en: `IDENTIFICATION
- Floor: 
- Building floors: 
- Elevator: 
- Living area: 
- Carrez area: 
- Floor area: 
- General orientation: 
- Exposure: 
- View: 
- Overlooking: 
- Brightness: 

LAYOUT
- Number of rooms: 
- Number of bedrooms: 
- Number of bathrooms: 
- Number of shower rooms: 
- Number of toilets: 
- Entrance: 
- Living room: (area)
- Kitchen: (area)
- Hallways: 
- Ceiling height: 

JOINERY
- Window type: 
- Glazing type: 
- Number of windows: 
- Window condition: 
- Shutters: 
- Interior doors: 
- Entrance door: 

HEATING AND ENERGY
- Heating type: 
- Fuel: 
- Individual/collective: 
- Emitters: (radiators, floor heating)
- Programming: 
- Energy performance: 
- GHG: 
- Annual consumption: 

INSULATION
- Thermal insulation: 
- Sound insulation: 
- Floor insulation: 
- Insulation from neighbors: 

ELECTRICITY
- Up-to-standard installation: 
- Electrical panel: 
- Switches: 
- Outlets: 
- Lighting: 

PLUMBING
- General condition: 
- Drainage: 
- Hot water production: 
- Faucets: 

KITCHEN
- Area: 
- Layout: 
- Equipment: 
- Condition: 

BATHROOM(S) / SHOWER ROOM(S)
- Number: 
- Equipment: 
- Condition: 

TOILET
- Number: 
- Separate: 
- Condition: 

FINISHES
- Floors: (type per room)
- Walls: 
- Ceilings: 
- General condition: 

STORAGE
- Built-in closets: 
- Dressing room: 
- Other: 

OUTDOOR FACILITIES
- Balcony: (area, orientation, view)
- Terrace: (area, orientation)
- Loggia: 
- Cellar: (number, area, condition)
- Outdoor parking: (number, location)
- Closed garage: (number, dimensions)
- Parking space: 

CONDOMINIUM
- Building construction year: 
- Total number of lots: 
- Number of residential lots: 
- Share quota: 
- Quarterly fees: 
- Annual fees: 
- Included in fees: 
- Property manager: (name, contact)
- Caretaker: 
- Ongoing proceedings: 
- Unpaid fees: 

COMMON AREAS
- Common areas condition: 
- Intercom/video intercom: 
- Keypad: 
- Lighting: 
- Cleanliness: 

WORKS
- Recent works in building: 
- Voted works: 
- Planned works: 
- Called funds amount: 
- Works fund: 

ENVIRONMENT
- Noise pollution: 
- Shops: 
- Public transport: 
- Schools: 
- Services: 

SPECIAL OBSERVATIONS
- `
    }
  },
  commercial: {
    simplified: {
      fr: `État général du local commercial :
- Surface : 
- Type d'activité : 
- État général : 
- Charges mensuelles : 

Observations :
- `,
      en: `Commercial property general condition:
- Area: 
- Activity type: 
- General condition: 
- Monthly fees: 

Observations:
- `
    },
    detailed: {
      fr: `État général du local commercial :
- Surface : 
- Type d'activité autorisée : 
- Vitrine : 
- Accès : 
- État général : 
- Hauteur sous plafond : 
- Type de chauffage : 

Équipements :
- Sanitaires : 
- Point d'eau : 
- Électricité : 
- Climatisation : 
- Système de sécurité : 

Visibilité et emplacement :
- Passage piéton : 
- Stationnement à proximité : 
- Transports en commun : 

Charges et réglementation :
- Charges mensuelles : 
- Normes ERP : 
- Accessibilité PMR : 

Observations particulières :
- `,
      en: `Commercial property general condition:
- Area: 
- Authorized activity type: 
- Shop window: 
- Access: 
- General condition: 
- Ceiling height: 
- Heating type: 

Facilities:
- Restrooms: 
- Water point: 
- Electricity: 
- Air conditioning: 
- Security system: 

Visibility and location:
- Foot traffic: 
- Nearby parking: 
- Public transport: 

Fees and regulations:
- Monthly fees: 
- ERP standards: 
- Disability access: 

Special observations:
- `
    },
    'very-detailed': {
      fr: `État général du local commercial :
- Surface totale : 
- Surface de vente : 
- Surface de réserve : 
- Surface de bureau : 
- Type d'activité autorisée : 
- Activités interdites : 
- Vitrine : (linéaire, matériau)
- Accès : (piéton, véhicule)
- Visibilité : 
- État général : 
- Hauteur sous plafond : 

Aménagement :
- Cloisonnement : 
- Sols : 
- Murs : 
- Plafonds : 
- Éclairage : 
- Signalétique : 

Chauffage et climatisation :
- Type de chauffage : 
- Climatisation : 
- Ventilation : 
- VMC : 

Équipements :
- Sanitaires : (nombre, normes PMR)
- Vestiaires : 
- Point d'eau : 
- Évacuation : 
- Électricité : (puissance)
- Alarme : 
- Vidéosurveillance : 
- Système anti-intrusion : 

Zone de stockage :
- Surface : 
- Accès : 
- Équipement : 

Extérieur :
- Terrasse : 
- Parking privé : 
- Zone de livraison : 
- Enseigne : 

Visibilité et emplacement :
- Zone commerciale : 
- Passage piéton : 
- Stationnement public : 
- Transports en commun : 
- Commerces à proximité : 

Charges et réglementation :
- Loyer mensuel : 
- Charges mensuelles : 
- Taxe foncière : 
- CFE : 
- Normes ERP : (catégorie)
- Accessibilité PMR : 
- Commission de sécurité : 

Observations particulières :
- `,
      en: `Commercial property general condition:
- Total area: 
- Sales area: 
- Storage area: 
- Office area: 
- Authorized activity type: 
- Prohibited activities: 
- Shop window: (linear, material)
- Access: (pedestrian, vehicle)
- Visibility: 
- General condition: 
- Ceiling height: 

Layout:
- Partitioning: 
- Floors: 
- Walls: 
- Ceilings: 
- Lighting: 
- Signage: 

Heating and air conditioning:
- Heating type: 
- Air conditioning: 
- Ventilation: 
- Mechanical ventilation: 

Facilities:
- Restrooms: (number, disability access standards)
- Changing rooms: 
- Water point: 
- Drainage: 
- Electricity: (power)
- Alarm: 
- Video surveillance: 
- Anti-intrusion system: 

Storage area:
- Area: 
- Access: 
- Equipment: 

Exterior:
- Terrace: 
- Private parking: 
- Delivery area: 
- Sign: 

Visibility and location:
- Shopping area: 
- Foot traffic: 
- Public parking: 
- Public transport: 
- Nearby shops: 

Fees and regulations:
- Monthly rent: 
- Monthly fees: 
- Property tax: 
- Business tax: 
- ERP standards: (category)
- Disability access: 
- Safety commission: 

Special observations:
- `
    },
    exhaustive: {
      fr: `IDENTIFICATION
- Adresse complète : 
- Surface totale : 
- Surface de vente : 
- Surface de réserve : 
- Surface de bureau : 
- Surface de terrasse : 
- Étage : 
- Type de local : (pied d'immeuble, centre commercial, zone d'activité)

ACTIVITÉ
- Type d'activité autorisée : 
- Activités interdites : 
- Destination du bail : 
- Changement de destination possible : 
- Autorisation d'exploitation : 

VITRINE ET FAÇADE
- Linéaire de vitrine : 
- Matériau : 
- État : 
- Enseigne : (type, dimensions, éclairée)
- Possibilité de pose d'enseigne : 
- Visibilité depuis la rue : 

ACCÈS ET CIRCULATION
- Accès piéton : 
- Accès véhicule : 
- Livraison : (horaires, zone dédiée)
- Accès PMR : 
- Largeur de porte : 
- Zone de déchargement : 

AMÉNAGEMENT INTÉRIEUR
- Cloisonnement : 
- Sols : (matériau, état)
- Murs : (matériau, état)
- Plafonds : (hauteur, matériau)
- Isolation phonique : 
- Isolation thermique : 

ÉCLAIRAGE
- Éclairage naturel : 
- Éclairage artificiel : (type, puissance)
- Vitrines éclairées : 
- Éclairage de sécurité : 

CHAUFFAGE ET CLIMATISATION
- Type de chauffage : 
- Combustible : 
- Puissance : 
- Climatisation : (type, puissance)
- Ventilation : 
- VMC : 
- Extraction : 

ÉLECTRICITÉ
- Puissance souscrite : 
- Nombre de circuits : 
- Tableau électrique : 
- Prises : 
- Éclairages : 
- Installation aux normes : 

EAU ET SANITAIRES
- Arrivée d'eau : 
- Évacuations : 
- WC : (nombre, normes PMR)
- Lave-mains : 
- Point d'eau : 
- Vestiaires : 

SÉCURITÉ
- Alarme : (type, marque)
- Vidéosurveillance : (nombre de caméras)
- Système anti-intrusion : 
- Détection incendie : 
- Extincteurs : (nombre, type)
- Éclairage de sécurité : 
- Issues de secours : 
- Registre de sécurité : 

STOCKAGE ET RÉSERVE
- Surface : 
- Accès : 
- Étagères : 
- Chambres froides : 
- Équipements spécifiques : 

BUREAU ET ADMINISTRATION
- Surface de bureau : 
- Nombre de postes : 
- Aménagement : 

EXTÉRIEUR
- Terrasse : (surface, autorisée)
- Parking privé : (nombre de places)
- Zone de livraison : 
- Cour : 
- Accès arrière : 

VISIBILITÉ ET EMPLACEMENT
- Type de zone : (centre-ville, périphérie, ZAC)
- Passage piéton : (fréquentation)
- Stationnement public : 
- Transports en commun : 
- Commerces voisins : 
- Attractivité de la zone : 

BAIL ET CHARGES
- Type de bail : 
- Durée : 
- Loyer mensuel HT : 
- Charges mensuelles : 
- Dépôt de garantie : 
- Clause de révision : 
- Durée préavis : 
- Pas-de-porte : 

FISCALITÉ
- Taxe foncière : 
- CFE : 
- CVAE : 
- Taxe d'enlèvement des ordures : 

RÉGLEMENTATION
- Catégorie ERP : 
- Effectif autorisé : 
- Accessibilité PMR : 
- Commission de sécurité : (dernière visite)
- Mise aux normes : 
- Diagnostic amiante : 
- Diagnostic électrique : 
- DPE : 

COPROPRIÉTÉ
- Nombre de lots : 
- Syndic : 
- Charges de copropriété : 
- Règlement de copropriété : 
- Travaux votés : 

ÉQUIPEMENTS SPÉCIFIQUES
- Hotte aspirante : 
- Extraction : 
- Chambre froide : 
- Système de caisse : 
- Système de paiement : 
- Wifi : 
- Téléphonie : 

OBSERVATIONS PARTICULIÈRES
- `,
      en: `IDENTIFICATION
- Complete address: 
- Total area: 
- Sales area: 
- Storage area: 
- Office area: 
- Terrace area: 
- Floor: 
- Type of premises: (ground floor, shopping center, business park)

ACTIVITY
- Authorized activity type: 
- Prohibited activities: 
- Lease purpose: 
- Change of use possible: 
- Operating license: 

SHOP WINDOW AND FACADE
- Shop window linear: 
- Material: 
- Condition: 
- Sign: (type, dimensions, illuminated)
- Possibility of sign installation: 
- Visibility from street: 

ACCESS AND CIRCULATION
- Pedestrian access: 
- Vehicle access: 
- Delivery: (hours, dedicated zone)
- Disability access: 
- Door width: 
- Unloading zone: 

INTERIOR LAYOUT
- Partitioning: 
- Floors: (material, condition)
- Walls: (material, condition)
- Ceilings: (height, material)
- Sound insulation: 
- Thermal insulation: 

LIGHTING
- Natural lighting: 
- Artificial lighting: (type, power)
- Illuminated shop windows: 
- Safety lighting: 

HEATING AND AIR CONDITIONING
- Heating type: 
- Fuel: 
- Power: 
- Air conditioning: (type, power)
- Ventilation: 
- Mechanical ventilation: 
- Extraction: 

ELECTRICITY
- Subscribed power: 
- Number of circuits: 
- Electrical panel: 
- Outlets: 
- Lighting: 
- Up-to-standard installation: 

WATER AND SANITATION
- Water supply: 
- Drainage: 
- Toilets: (number, disability access standards)
- Hand basin: 
- Water point: 
- Changing rooms: 

SECURITY
- Alarm: (type, brand)
- Video surveillance: (number of cameras)
- Anti-intrusion system: 
- Fire detection: 
- Fire extinguishers: (number, type)
- Safety lighting: 
- Emergency exits: 
- Safety register: 

STORAGE AND RESERVE
- Area: 
- Access: 
- Shelves: 
- Cold rooms: 
- Specific equipment: 

OFFICE AND ADMINISTRATION
- Office area: 
- Number of workstations: 
- Layout: 

EXTERIOR
- Terrace: (area, authorized)
- Private parking: (number of spaces)
- Delivery area: 
- Courtyard: 
- Rear access: 

VISIBILITY AND LOCATION
- Zone type: (city center, suburbs, business park)
- Foot traffic: (frequency)
- Public parking: 
- Public transport: 
- Neighboring shops: 
- Zone attractiveness: 

LEASE AND FEES
- Lease type: 
- Duration: 
- Monthly rent excl. tax: 
- Monthly fees: 
- Security deposit: 
- Revision clause: 
- Notice period: 
- Key money: 

TAXATION
- Property tax: 
- Business tax: 
- CVAE: 
- Waste collection tax: 

REGULATIONS
- ERP category: 
- Authorized capacity: 
- Disability access: 
- Safety commission: (last visit)
- Compliance: 
- Asbestos assessment: 
- Electrical assessment: 
- Energy performance: 

CONDOMINIUM
- Number of lots: 
- Property manager: 
- Condominium fees: 
- Condominium rules: 
- Voted works: 

SPECIFIC EQUIPMENT
- Extractor hood: 
- Extraction: 
- Cold room: 
- Cash register system: 
- Payment system: 
- Wifi: 
- Telephony: 

SPECIAL OBSERVATIONS
- `
    }
  }
};
