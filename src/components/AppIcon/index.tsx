/**
 * AppIcon — centralized SVG icon set for Brush, split into logical groups
 * (KAN-214): generic UI icons in ./generic, the POI type→icon resolver in
 * ./poi, shared stroke props/types in ./shared.
 *
 * Usage:
 *   import { BellIcon, PoiIcon, ChevronRightIcon } from './AppIcon';
 *   <BellIcon color={palette.text} size={20} />
 *   <PoiIcon  type="atm" color={palette.muted} size={22} />
 */

export * from './generic';
export * from './poi';
