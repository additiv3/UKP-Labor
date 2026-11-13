import { IconCalc, IconEquipment, IconLogbook, IconMaterial, IconNotes } from './icons';

export const TABS = [
  { to: '/logbuch', label: 'Logbuch', Icon: IconLogbook },
  { to: '/rechner', label: 'Rechner', Icon: IconCalc },
  { to: '/anlagen', label: 'Anlagen', Icon: IconEquipment },
  { to: '/material', label: 'Material', Icon: IconMaterial },
  { to: '/notizen', label: 'Notizen', Icon: IconNotes },
] as const;
