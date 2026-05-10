import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ConversationBubble } from './ConversationBubble';
import { ConversationMessage } from '@/types/checkin';
import { spacing } from '@/constants/spacing';

interface ConversationThreadProps {
  messages: ConversationMessage[];
  onPlayAudio?: (uri: string) => void;
}

export function ConversationThread({ messages, onPlayAudio }: ConversationThreadProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {messages.map(msg => (
        <ConversationBubble key={msg.id} message={msg} onPlayAudio={onPlayAudio} />
      ))}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  bottomPad: {
    height: spacing.xxl,
  },
});
