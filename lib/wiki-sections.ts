import {
  Rocket,
  Sparkles,
  Boxes,
  User,
  Library,
  BookOpen,
  type LucideIcon
} from 'lucide-react';

export interface WikiSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Sections Wiki centralisées - utilisées dans toute l'application
export const wikiSections: WikiSection[] = [
  { id: 'go-live', label: 'Go Live', icon: Rocket },
  { id: 'urgence', label: 'Urgence', icon: Sparkles },
  { id: 'setup-projet', label: 'Setup projet', icon: Boxes },
  { id: 'client', label: 'Client', icon: User },
  { id: 'outils', label: 'Outils', icon: Library },
  { id: 'reference', label: 'References', icon: BookOpen }
];

// Helper pour trouver une section par ID
export function getWikiSectionById(id: string): WikiSection | undefined {
  return wikiSections.find((s) => s.id === id);
}

// Helper pour trouver une section par label
export function getWikiSectionByLabel(label: string): WikiSection | undefined {
  return wikiSections.find((s) => s.label.toLowerCase() === label.toLowerCase());
}
