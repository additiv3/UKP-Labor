import type { Component, ComponentType } from '../../data/types';
import type { NewEntity } from '../../data/repos/base';
import { COMPONENT_TYPE_LABEL, STATION_ART_LABEL } from '../../data/labels';
import { emptyStationParams, laserLambdas } from '../../data/equipment';
import { formatIn, formatSI } from '../../core/physics/units';

/** Neue Komponente mit leeren, typgerechten Parametern. */
export function newComponent(systemId: string, typ: ComponentType): NewEntity<Component> {
  const name = COMPONENT_TYPE_LABEL[typ];
  switch (typ) {
    case 'laserquelle':
      return { systemId, typ, name, params: { wellenlaengen: [] } };
    case 'station':
      return { systemId, typ, name, params: emptyStationParams() };
    case 'optik':
    case 'scanner':
    case 'achsen':
      return { systemId, typ, name, params: {} };
    default:
      return { systemId, typ, name, params: {} };
  }
}

/** Kurzinfo für Listen, z. B. „1030 / 515 nm · 20 W · 900 fs–10 ps“. */
export function componentSummary(c: Component): string {
  const parts: string[] = [];
  switch (c.typ) {
    case 'laserquelle': {
      const p = c.params;
      const l = laserLambdas(p);
      if (l.length) parts.push(l.map((x) => formatIn(x, 'wavelength', 'nm')).join(' / '));
      if (p.pMax !== undefined) parts.push(formatSI(p.pMax, 'W'));
      if (p.tauMin !== undefined || p.tauMax !== undefined)
        parts.push([p.tauMin, p.tauMax].filter((x) => x !== undefined).map((x) => formatSI(x, 's')).join('–'));
      break;
    }
    case 'station': {
      const p = c.params;
      if (p.art) parts.push(STATION_ART_LABEL[p.art]);
      if (p.brennweite !== undefined) parts.push(`f = ${formatSI(p.brennweite, 'm')}`);
      const n = p.strahlengaenge.length;
      if (n) parts.push(n === 1 ? '1 Strahlengang' : `${n} Strahlengänge`);
      break;
    }
    case 'optik':
      if (c.params.brennweite !== undefined) parts.push(`f = ${formatSI(c.params.brennweite, 'm')}`);
      if (c.params.w0Datenblatt !== undefined) parts.push(`w₀ = ${formatSI(c.params.w0Datenblatt, 'm')}`);
      break;
    case 'scanner':
      if (c.params.vMax !== undefined) parts.push(`v_max = ${formatSI(c.params.vMax, 'm/s')}`);
      break;
    default:
      break;
  }
  return parts.join(' · ');
}
