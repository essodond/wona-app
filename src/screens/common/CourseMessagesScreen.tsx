import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { CourseMessage } from '../../types/api';
import { deliveryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseMessages'>;

export default function CourseMessagesScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CourseMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setMessages(await deliveryApi.messages(route.params.courseId));
  }, [route.params.courseId]);

  useEffect(() => {
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, [load]);

  const send = async () => {
    const contenu = text.trim();
    if (!contenu || sending) return;
    setSending(true);
    try {
      const message = await deliveryApi.sendMessage(route.params.courseId, contenu);
      setMessages((items) => [...items, message]);
      setText('');
    } catch (error) {
      Alert.alert('Message non envoyé', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TopBar title="Messagerie de course" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.messages}>
        {messages.map((message) => {
          const mine = message.auteur_role === user?.role;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.other]}>
              <Text style={mine ? styles.mineText : styles.otherText}>{message.contenu}</Text>
              <Text style={[styles.time, mine && { color: 'rgba(255,255,255,.7)' }]}>
                {new Date(message.date_creation).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          maxLength={500}
          placeholder="Votre message…"
          placeholderTextColor={colors.outline}
          multiline
        />
        <Pressable style={styles.send} onPress={send} disabled={sending || !text.trim()}>
          <MaterialCommunityIcons name="send" size={21} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  messages: { flexGrow: 1, padding: spacing.container, gap: spacing.xs, justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: radii.lg, padding: spacing.sm },
  mine: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  other: { backgroundColor: colors.surfaceHigh, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  mineText: { color: colors.white, fontSize: 14 },
  otherText: { color: colors.textPrimary, fontSize: 14 },
  time: { fontSize: 9, color: colors.textSecondary, alignSelf: 'flex-end', marginTop: 3 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineLight,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

