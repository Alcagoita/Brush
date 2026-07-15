import { searchPlaceTypesLocal } from '../../services/poiTypeCache';

export function getTypeSuggestions(q: string): { type: string; label: string }[] {
  return searchPlaceTypesLocal(q);
}
