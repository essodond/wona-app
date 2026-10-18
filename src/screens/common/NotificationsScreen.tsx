import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { AppNotification } from '../../types/api';
import { notificationsApi } from '../../services/api';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const notifications = await notificationsApi.list();
      setItems(notifications);
      const unread = notifications.filter((item) => !item.lu_le).map((item) => item.id);
      if (unread.length) await notificationsApi.markRead(unread);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <View style={styles.container}>
      <TopBar title="Notifications" onBack={() => navigation.goBack()} />
      {loading && !items.length ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
          {!items.length ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={colors.outline} />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyText}>
                Les changements de statut et messages apparaîtront ici.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[styles.card, !item.lu_le && styles.unread]}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons name="bell-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.titre}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.date}>
                    {new Date(item.cree_le).toLocaleString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, gap: spacing.sm, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.surface },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  message: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: 10, color: colors.outline, marginTop: 5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
});

