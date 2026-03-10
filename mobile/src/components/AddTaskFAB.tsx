import { useState, useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
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

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
    }
    setOpen(false);
    Keyboard.dismiss();
  };

  const handleClose = () => {
    const trimmed = text.trim();
    if (trimmed) onAdd(trimmed);
    setText('');
    setOpen(false);
    Keyboard.dismiss();
  };

  return (
    <>
      {/* FAB button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <View style={styles.fabPlus}>
          <View style={[styles.plusH, { backgroundColor: colors.accentText }]} />
          <View style={[styles.plusV, { backgroundColor: colors.accentText }]} />
        </View>
      </TouchableOpacity>

      {/* Modal with input positioned at mid-screen */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <Pressable style={styles.inputWrapper} onPress={(e) => e.stopPropagation()}>
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
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
  fabPlus: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  plusH: { position: 'absolute', width: 22, height: 2.5, borderRadius: 1 },
  plusV: { position: 'absolute', width: 2.5, height: 22, borderRadius: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
  },
  inputWrapper: {
    paddingHorizontal: 24,
    marginBottom: 80,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
