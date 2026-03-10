import { useState, useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import type { Colors } from '../lib/colors';

interface AddTaskFABProps {
  colors: Colors;
  placeholder?: string;
  onAdd: (text: string) => void;
}

export function AddTaskFAB({ colors, placeholder = 'Add a task...', onAdd }: AddTaskFABProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const fabScale = useSharedValue(1);
  const fabTranslateY = useSharedValue(0);
  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(20);

  useEffect(() => {
    if (open) {
      // Animate FAB up and show input
      fabTranslateY.value = withSpring(-70);
      fabScale.value = withSpring(0.85);
      inputOpacity.value = withTiming(1, { duration: 200 });
      inputTranslateY.value = withSpring(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      // Animate FAB back down
      inputOpacity.value = withTiming(0, { duration: 150 });
      inputTranslateY.value = withTiming(20, { duration: 150 });
      fabTranslateY.value = withSpring(0);
      fabScale.value = withSpring(1);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
      setOpen(false);
      Keyboard.dismiss();
    }
  };

  const handleClose = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
    }
    setText('');
    setOpen(false);
    Keyboard.dismiss();
  };

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: fabTranslateY.value },
      { scale: fabScale.value },
    ],
  }));

  const inputAnimStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputTranslateY.value }],
  }));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Input row (appears above FAB) */}
      {open && (
        <Animated.View style={[styles.inputContainer, inputAnimStyle]}>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
              blurOnSubmit={false}
            />
          </View>
        </Animated.View>
      )}

      {/* FAB button */}
      <Animated.View style={[styles.fabContainer, fabAnimStyle]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={open ? handleSubmit : () => setOpen(true)}
          onLongPress={open ? handleClose : undefined}
          activeOpacity={0.8}
        >
          <Animated.Text style={[styles.fabText, { color: colors.accentText }]}>+</Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingBottom: 24,
  },
  fabContainer: {},
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
  inputContainer: {
    width: '100%',
    paddingLeft: 24,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
