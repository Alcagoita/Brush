/**
 * StorePickerField — KAN-76
 *
 * An inline form field that lets the user search for and tag a specific named
 * store to a task. Backed by the Places Autocomplete API.
 *
 * States:
 *   IDLE (value === null)
 *     A text input with placeholder. Typing debounces (300ms) and calls the
 *     Places Autocomplete API. A spinner shows while loading.
 *     Results appear in a dropdown below the input (max 5). Each row shows
 *     the store name (bold) and secondary address (muted).
 *
 *   SELECTED (value !== null)
 *     The search input is replaced by a dismissible chip:
 *     [BuildingIcon] [store name]  [×]
 *     Tapping × clears the selection and returns to IDLE.
 *
 * Accessibility:
 *   - Input has accessibilityLabel "Store name search"
 *   - Each result row has accessibilityRole="button"
 *   - Clear chip button has accessibilityLabel="Remove store"
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { BuildingIcon, CloseIcon } from './AppIcon';
import {
  searchPlacesAutocomplete,
  PlaceAutocompleteSuggestion,
} from '../services/maps';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface StoreSelection {
  placeId: string;
  name:    string;
  address: string;
}

export interface StorePickerFieldProps {
  /** Currently selected store, or null if none. */
  value: StoreSelection | null;
  /** Called when the selection changes. Null = cleared. */
  onChange: (store: StoreSelection | null) => void;
  /** Device latitude — used to bias autocomplete results. Optional. */
  lat?: number;
  /** Device longitude — used to bias autocomplete results. Optional. */
  lng?: number;
}

// ─── Injectable search function (for tests) ──────────────────────────────────

type SearchFn = typeof searchPlacesAutocomplete;
let _searchFn: SearchFn = searchPlacesAutocomplete;
export function __setSearchFn(fn: SearchFn): void { _searchFn = fn; }
export function __resetSearchFn(): void           { _searchFn = searchPlacesAutocomplete; }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

// ─── Component ────────────────────────────────────────────────────────────────

export default function StorePickerField({
  value,
  onChange,
  lat,
  lng,
}: StorePickerFieldProps) {
  const { palette } = useTheme();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<PlaceAutocompleteSuggestion[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search on query change (debounced) ──────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); }

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await _searchFn(query, lat, lng);
        setResults(suggestions);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) { clearTimeout(debounceRef.current); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lat, lng]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelect = useCallback((suggestion: PlaceAutocompleteSuggestion) => {
    onChange({ placeId: suggestion.placeId, name: suggestion.name, address: suggestion.address });
    setQuery('');
    setResults([]);
    setFocused(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery('');
    setResults([]);
  }, [onChange]);

  // ── Selected chip ───────────────────────────────────────────────────────────

  if (value) {
    return (
      <View
        style={[
          styles.chip,
          {
            backgroundColor: palette.surface,
            borderColor:     palette.line,
          },
        ]}>
        <BuildingIcon color={palette.accent} size={14} />
        <Text
          style={[styles.chipLabel, { color: palette.text }]}
          numberOfLines={1}>
          {value.name}
        </Text>
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove store">
          <CloseIcon color={palette.muted} size={14} />
        </Pressable>
      </View>
    );
  }

  // ── Search input + dropdown ─────────────────────────────────────────────────

  const showDropdown = focused && (results.length > 0 || loading);

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: palette.surface,
            borderColor:     focused ? palette.muted : palette.line,
          },
        ]}>
        <BuildingIcon color={palette.faint} size={16} />
        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholder="Search for a store…"
          placeholderTextColor={palette.faint}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Small delay so the dropdown tap registers before blur fires.
            setTimeout(() => setFocused(false), 150);
          }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Store name search"
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={palette.muted}
            accessibilityLabel="Searching"
          />
        )}
        {!!query && !loading && (
          <Pressable onPress={() => { setQuery(''); setResults([]); }} hitSlop={6}>
            <CloseIcon color={palette.faint} size={14} />
          </Pressable>
        )}
      </View>

      {/* Dropdown */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: palette.surface,
              borderColor:     palette.line,
            },
          ]}>
          {results.map((s, idx) => (
            <Pressable
              key={s.placeId}
              style={({ pressed }) => [
                styles.resultRow,
                idx < results.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: palette.line,
                },
                pressed && { backgroundColor: palette.surface2 },
              ]}
              onPress={() => handleSelect(s)}
              accessibilityRole="button"
              accessibilityLabel={s.name}>
              <Text
                style={[styles.resultName, { color: palette.text }]}
                numberOfLines={1}>
                {s.name}
              </Text>
              {!!s.address && (
                <Text
                  style={[styles.resultAddress, { color: palette.muted }]}
                  numberOfLines={1}>
                  {s.address}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  container: {
    position: 'relative',
  },

  // ── Search input ──
  inputRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderRadius:      radius.card,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  input: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    padding:    0,    // reset platform default padding
  },

  // ── Dropdown ──
  dropdown: {
    position:     'absolute',
    top:          '100%',
    left:         0,
    right:        0,
    zIndex:       999,
    borderRadius: radius.card,
    borderWidth:  StyleSheet.hairlineWidth,
    marginTop:    4,
    overflow:     'hidden',
  },
  resultRow: {
    paddingHorizontal: 12,
    paddingVertical:   10,
  },
  resultName: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },
  resultAddress: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    marginTop:  2,
  },

  // ── Selected chip ──
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    gap:               6,
    paddingHorizontal: spacing.page - 8,
    paddingVertical:   7,
    borderRadius:      radius.chip,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
    maxWidth:   200,
  },
});
