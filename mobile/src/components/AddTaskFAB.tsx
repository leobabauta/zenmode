import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { Colors } from '../lib/colors';
import { parseReminder, detectPossibleReminder } from '../../../shared/lib/reminderParser';

export type AddDestination = 'today' | 'inbox' | { listId: string; listName: string };

interface AddTaskFABProps {
  colors: Colors;
  placeholder?: string;
  /** The default destination label shown below the input */
  defaultDestination?: AddDestination;
  onAdd: (text: string, destination: AddDestination) => void;
}

function destinationLabel(dest: AddDestination): string {
  if (dest === 'today') return 'Today';
  if (dest === 'inbox') return 'Inbox';
  return dest.listName;
}

export function AddTaskFAB({ colors, placeholder = 'Add a task...', defaultDestination = 'today', onAdd }: AddTaskFABProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [destination, setDestination] = useState<AddDestination>(defaultDestination);
  const [showPicker, setShowPicker] = useState(false);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const detectedReminder = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed || parseReminder(trimmed)) return null;
    return detectPossibleReminder(trimmed);
  }, [text]);

  useEffect(() => {
    if (open) {
      setDestination(defaultDestination);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultDestination]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) { setOpen(false); Keyboard.dismiss(); return; }

    // If there's a detected reminder without @, ask for confirmation
    if (detectedReminder && !showReminderConfirm) {
      setShowReminderConfirm(true);
      return;
    }

    setShowReminderConfirm(false);
    onAdd(trimmed, destination);
    setText('');
    setOpen(false);
    Keyboard.dismiss();
  };

  const acceptDetectedReminder = () => {
    if (!detectedReminder) return;
    // Call onAdd with the @ prefix so the screen's handleAdd parses it as a reminder
    const withAt = detectedReminder.cleanText + ' @' + new Date(detectedReminder.reminderAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
    // Actually, just format with the reminderAt info directly — pass the original text with @ inserted
    const reminderDate = new Date(detectedReminder.reminderAt);
    const h = reminderDate.getHours();
    const m = reminderDate.getMinutes();
    const timeTag = m > 0 ? `@${h}:${String(m).padStart(2, '0')}` : `@${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`;
    onAdd(detectedReminder.cleanText + ' ' + timeTag, destination);
    setText('');
    setShowReminderConfirm(false);
    setOpen(false);
    Keyboard.dismiss();
  };

  const handleClose = () => {
    const trimmed = text.trim();
    if (trimmed) onAdd(trimmed, destination);
    setText('');
    setOpen(false);
    Keyboard.dismiss();
  };

  const switchOptions: AddDestination[] = defaultDestination === 'today'
    ? ['inbox']
    : defaultDestination === 'inbox'
      ? ['today']
      : ['today', 'inbox'];

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

      {/* Modal with input */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <Pressable style={styles.inputWrapper} onPress={(e) => e.stopPropagation()}>
              <View style={styles.inputGroup}>
                <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: colors.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={text}
                    onChangeText={(t) => { setText(t); setShowReminderConfirm(false); }}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.submitPlus}>
                    <View style={[styles.plusH, { backgroundColor: colors.accentText }]} />
                    <View style={[styles.plusV, { backgroundColor: colors.accentText }]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Reminder confirmation */}
              {showReminderConfirm && detectedReminder && (
                <View style={[styles.reminderConfirm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.reminderConfirmText, { color: colors.text }]}>
                    Set reminder for {new Date(detectedReminder.reminderAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}?
                  </Text>
                  <View style={styles.reminderConfirmButtons}>
                    <TouchableOpacity
                      onPress={acceptDetectedReminder}
                      style={[styles.reminderConfirmYes]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.reminderConfirmYesText}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setShowReminderConfirm(false);
                        onAdd(text.trim(), destination);
                        setText('');
                        setOpen(false);
                        Keyboard.dismiss();
                      }}
                      style={[styles.reminderConfirmNo, { borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reminderConfirmNoText, { color: colors.textMuted }]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Destination indicator */}
              <View style={styles.destinationRow}>
                <Text style={[styles.destinationLabel, { color: colors.textMuted }]}>
                  Adding to{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(!showPicker)}
                  style={[styles.destinationPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.destinationText, { color: colors.accent }]}>
                    {destinationLabel(destination)}
                  </Text>
                  <Text style={[styles.destinationChevron, { color: colors.textMuted }]}>
                    {showPicker ? '\u25B2' : '\u25BC'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Destination picker dropdown */}
              {showPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* Show current destination as selected */}
                  <Pressable
                    style={[styles.pickerOption, { backgroundColor: colors.accent + '18' }]}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.accent, fontWeight: '600' }]}>
                      {destinationLabel(destination)}
                    </Text>
                    <Text style={{ color: colors.accent, fontSize: 14 }}>{'\u2713'}</Text>
                  </Pressable>
                  {/* Show other options */}
                  {switchOptions.map((opt) => (
                    <Pressable
                      key={typeof opt === 'string' ? opt : opt.listId}
                      style={styles.pickerOption}
                      onPress={() => {
                        setDestination(opt);
                        setShowPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                        {destinationLabel(opt)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
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
  plusH: { position: 'absolute', width: 20, height: 2.5, borderRadius: 1 },
  plusV: { position: 'absolute', width: 2.5, height: 20, borderRadius: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    justifyContent: 'center',
  },
  inputWrapper: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputRow: {
    flex: 1,
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
  submitBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPlus: {
    width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  destinationLabel: {
    fontSize: 13,
  },
  destinationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  destinationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  destinationChevron: {
    fontSize: 8,
  },
  pickerDropdown: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pickerOptionText: {
    fontSize: 14,
  },
  reminderConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  reminderConfirmText: {
    fontSize: 13,
    flex: 1,
  },
  reminderConfirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderConfirmYes: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reminderConfirmYesText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  reminderConfirmNo: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reminderConfirmNoText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
