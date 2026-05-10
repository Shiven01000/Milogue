import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Body, Caption } from '@/components/common/Typography';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { ConversationMessage } from '@/types/checkin';
import { formatTime } from '@/utils/dateUtils';

interface ConversationBubbleProps {
  message: ConversationMessage;
  onPlayAudio?: (uri: string) => void;
}

export function ConversationBubble({ message, onPlayAudio }: ConversationBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {message.isStreaming && message.content === '' ? (
          <Caption color={colors.textTertiary}>Thinking...</Caption>
        ) : (
          <Body style={isUser ? styles.userText : styles.aiText}>{message.content}</Body>
        )}
      </View>
      <View style={[styles.meta, isUser && styles.metaRight]}>
        <Caption>{formatTime(message.timestamp)}</Caption>
        {message.audioUri && onPlayAudio && (
          <TouchableOpacity
            onPress={() => onPlayAudio(message.audioUri!)}
            accessibilityRole="button"
            accessibilityLabel="Play recording"
            style={styles.playButton}
          >
            <Caption color={colors.primary}>▶ Play</Caption>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userText: {
    color: colors.textInverse,
  },
  aiText: {
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 3,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  metaRight: {
    justifyContent: 'flex-end',
  },
  playButton: {
    padding: 2,
  },
});
