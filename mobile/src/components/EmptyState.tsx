import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Colors } from '../lib/colors';

const allImages = [
  require('../../assets/celebrate1.png'),
  require('../../assets/celebrate2.png'),
  require('../../assets/celebrate3.png'),
  require('../../assets/celebrate4.png'),
  require('../../assets/celebrate5.png'),
  require('../../assets/celebrate6.png'),
  require('../../assets/celebrate7.png'),
  require('../../assets/celebrate8.png'),
  require('../../assets/celebrate9.png'),
  require('../../assets/celebrate10.png'),
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface EmptyInboxProps {
  colors: Colors;
}

export function EmptyInbox({ colors }: EmptyInboxProps) {
  const [img] = useState(() => pickRandom(allImages));

  return (
    <View style={styles.inboxContainer}>
      <Image source={img} style={styles.image} resizeMode="cover" />
      <Text style={[styles.title, { color: colors.text }]}>
        Hooray, your Inbox is empty!
      </Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>
        Nothing waiting for your attention. Enjoy the calm.
      </Text>
    </View>
  );
}

interface AllDoneProps {
  colors: Colors;
  onShowCompleted: () => void;
}

export function AllDoneToday({ colors, onShowCompleted }: AllDoneProps) {
  const [img] = useState(() => pickRandom(allImages));

  return (
    <View style={styles.doneContainer}>
      <Image source={img} style={styles.image} resizeMode="cover" />
      <Text style={[styles.title, { color: colors.text }]}>
        You did it! Everything's done.
      </Text>
      <Text style={[styles.messageCenter, { color: colors.textMuted }]}>
        Take a moment to feel satisfied with a good day's work. You showed up and followed through — that's what matters.
      </Text>
      <TouchableOpacity onPress={onShowCompleted}>
        <Text style={[styles.showLink, { color: colors.textMuted }]}>
          Show completed tasks
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inboxContainer: {
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  doneContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  messageCenter: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 12,
  },
  showLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
