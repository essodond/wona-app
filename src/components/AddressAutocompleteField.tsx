import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  placesApi,
  type PlaceDetails,
  type PlaceSuggestion,
} from '../services/api';
import { colors, radii, shadow, spacing } from '../theme';

type Props = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label: string;
  value: string;
  confirmed?: boolean;
  onChangeText: (value: string) => void;
  onSelect: (place: PlaceDetails) => void;
};

function newSessionToken() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export default function AddressAutocompleteField({
  label,
  value,
  confirmed = false,
  onChangeText,
  onSelect,
  ...inputProps
}: Props) {
  const sessionToken = useRef(newSessionToken());
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      placesApi
        .autocomplete(query, sessionToken.current)
        .then((result) => {
          if (cancelled) return;
          setConfigured(result.configured);
          setSuggestions(result.suggestions);
        })
        .catch((requestError) => {
          if (cancelled) return;
          setSuggestions([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Impossible de charger les propositions.',
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [focused, value]);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  const selectSuggestion = async (suggestion: PlaceSuggestion) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(false);
    setSuggestions([]);
    setLoading(true);
    setError('');
    Keyboard.dismiss();
    try {
      const details = await placesApi.details(suggestion.place_id, sessionToken.current);
      onChangeText(details.formatted_address || suggestion.description);
      onSelect(details);
      sessionToken.current = newSessionToken();
    } catch (requestError) {
      setFocused(true);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Impossible de recuperer ce lieu.',
      );
    } finally {
      setLoading(false);
    }
  };

  const showPanel = focused && value.trim().length >= 3;

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {confirmed ? (
          <View style={styles.confirmedBadge}>
            <MaterialCommunityIcons name="check-circle" size={13} color={colors.success} />
            <Text style={styles.confirmedText}>Position exacte</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons
          name="map-marker-outline"
          size={21}
          color={confirmed ? colors.success : colors.primary}
          style={styles.inputIcon}
        />
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 200);
          }}
          style={styles.input}
          placeholderTextColor={colors.outline}
        />
        {loading ? (
          <ActivityIndicator style={styles.loader} size="small" color={colors.primary} />
        ) : null}
      </View>

      {showPanel ? (
        <View style={[styles.panel, shadow.soft]}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.place_id}
              style={[
                styles.suggestion,
                index < suggestions.length - 1 && styles.suggestionDivider,
              ]}
              onPressIn={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
              onPress={() => void selectSuggestion(suggestion)}
            >
              <View style={styles.suggestionIcon}>
                <MaterialCommunityIcons name="map-marker" size={19} color={colors.primary} />
              </View>
              <View style={styles.suggestionText}>
                <Text style={styles.mainText} numberOfLines={1}>
                  {suggestion.main_text}
                </Text>
                {suggestion.secondary_text ? (
                  <Text style={styles.secondaryText} numberOfLines={2}>
                    {suggestion.secondary_text}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="arrow-top-left" size={18} color={colors.outline} />
            </Pressable>
          ))}

          {!loading && !configured ? (
            <View style={styles.messageRow}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={colors.tertiary} />
              <Text style={styles.messageText}>Propositions Google non activees sur le serveur.</Text>
            </View>
          ) : null}
          {!loading && configured && !error && suggestions.length === 0 ? (
            <Text style={styles.emptyText}>Aucune adresse trouvee au Togo.</Text>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {configured && suggestions.length > 0 ? (
            <Text style={styles.googleAttribution}>Google Maps</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: 5,
  },
  label: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  confirmedText: { fontSize: 9, fontWeight: '700', color: colors.success },
  inputContainer: { position: 'relative' },
  inputIcon: { position: 'absolute', left: spacing.sm, top: 15, zIndex: 1 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.md,
    paddingLeft: 42,
    paddingRight: 42,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  loader: { position: 'absolute', right: spacing.sm, top: 16 },
  panel: {
    marginTop: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  suggestion: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  suggestionDivider: { borderBottomWidth: 1, borderBottomColor: colors.outlineLight },
  suggestionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  suggestionText: { flex: 1 },
  mainText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  secondaryText: { marginTop: 2, fontSize: 10, lineHeight: 14, color: colors.textSecondary },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  messageText: { flex: 1, fontSize: 10, lineHeight: 14, color: colors.tertiary },
  emptyText: { padding: spacing.sm, fontSize: 11, color: colors.textSecondary },
  errorText: { padding: spacing.sm, fontSize: 11, lineHeight: 15, color: colors.error },
  googleAttribution: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineLight,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
