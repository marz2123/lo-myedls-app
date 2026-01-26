export interface LocationSuggestion {
  general: string[];
  rooms: string[];
}

export const getLocationSuggestions = (
  propertyType: string,
  isFrench: boolean
): LocationSuggestion => {
  switch (propertyType) {
    case "building":
      return {
        general: isFrench
          ? [
              "Parties communes",
              "Cage d'escalier",
              "Hall d'entrée",
              "Ascenseur",
              "Cave commune",
              "Parking",
              "Local vélos",
              "Local poubelles",
              "Façade avant",
              "Façade arrière",
              "Toiture",
              "Palier étage 1",
              "Palier étage 2",
              "Palier étage 3",
            ]
          : [
              "Common areas",
              "Stairwell",
              "Entrance hall",
              "Elevator",
              "Common basement",
              "Parking",
              "Bike storage",
              "Trash room",
              "Front facade",
              "Back facade",
              "Roof",
              "Floor 1 landing",
              "Floor 2 landing",
              "Floor 3 landing",
            ],
        rooms: isFrench
          ? [
              "Couloir",
              "Entrée appartement",
              "Salon",
              "Cuisine",
              "Chambre",
              "Salle de bain",
              "WC",
              "Bureau",
              "Balcon",
              "Terrasse",
            ]
          : [
              "Hallway",
              "Apartment entrance",
              "Living room",
              "Kitchen",
              "Bedroom",
              "Bathroom",
              "WC",
              "Office",
              "Balcony",
              "Terrace",
            ],
      };

    case "house":
      return {
        general: isFrench
          ? [
              "Façade avant",
              "Façade arrière",
              "Façade latérale gauche",
              "Façade latérale droite",
              "Jardin avant",
              "Jardin arrière",
              "Terrasse",
              "Garage",
              "Cave",
              "Grenier",
              "Toiture",
              "Allée",
              "Portail",
            ]
          : [
              "Front facade",
              "Back facade",
              "Left side facade",
              "Right side facade",
              "Front garden",
              "Back garden",
              "Terrace",
              "Garage",
              "Basement",
              "Attic",
              "Roof",
              "Driveway",
              "Gate",
            ],
        rooms: isFrench
          ? [
              "Entrée",
              "Salon",
              "Salle à manger",
              "Cuisine",
              "Chambre parentale",
              "Chambre 1",
              "Chambre 2",
              "Salle de bain",
              "WC",
              "Bureau",
              "Buanderie",
              "Dressing",
              "Véranda",
            ]
          : [
              "Entrance",
              "Living room",
              "Dining room",
              "Kitchen",
              "Master bedroom",
              "Bedroom 1",
              "Bedroom 2",
              "Bathroom",
              "WC",
              "Office",
              "Laundry room",
              "Dressing room",
              "Conservatory",
            ],
      };

    case "apartment":
      return {
        general: isFrench
          ? [
              "Entrée principale",
              "Couloir principal",
              "Balcon",
              "Terrasse",
              "Loggia",
              "Cave privative",
              "Parking privé",
              "Box privé",
            ]
          : [
              "Main entrance",
              "Main hallway",
              "Balcony",
              "Terrace",
              "Loggia",
              "Private storage",
              "Private parking",
              "Private box",
            ],
        rooms: isFrench
          ? [
              "Salon/Séjour",
              "Cuisine",
              "Cuisine ouverte",
              "Chambre parentale",
              "Chambre 1",
              "Chambre 2",
              "Salle de bain",
              "Salle d'eau",
              "WC",
              "Bureau",
              "Dressing",
              "Cellier",
            ]
          : [
              "Living room",
              "Kitchen",
              "Open kitchen",
              "Master bedroom",
              "Bedroom 1",
              "Bedroom 2",
              "Bathroom",
              "Shower room",
              "WC",
              "Office",
              "Dressing room",
              "Pantry",
            ],
      };

    case "commercial":
      return {
        general: isFrench
          ? [
              "Façade principale",
              "Entrée principale",
              "Vitrine",
              "Arrière-boutique",
              "Réserve",
              "Zone de stockage",
              "Zone de livraison",
              "Parking clients",
              "Signalétique extérieure",
            ]
          : [
              "Main facade",
              "Main entrance",
              "Shop window",
              "Back shop",
              "Storage room",
              "Storage area",
              "Delivery area",
              "Customer parking",
              "Exterior signage",
            ],
        rooms: isFrench
          ? [
              "Espace vente",
              "Accueil",
              "Bureau",
              "Salle de réunion",
              "Sanitaires clients",
              "Sanitaires personnel",
              "Cuisine/Kitchenette",
              "Local technique",
            ]
          : [
              "Sales area",
              "Reception",
              "Office",
              "Meeting room",
              "Customer restrooms",
              "Staff restrooms",
              "Kitchen/Kitchenette",
              "Technical room",
            ],
      };

    default:
      return {
        general: isFrench
          ? [
              "Façade avant",
              "Façade arrière",
              "Extérieur",
              "Intérieur",
              "Entrée",
            ]
          : ["Front facade", "Back facade", "Exterior", "Interior", "Entrance"],
        rooms: isFrench
          ? ["Salon", "Cuisine", "Chambre", "Salle de bain", "WC"]
          : ["Living room", "Kitchen", "Bedroom", "Bathroom", "WC"],
      };
  }
};
