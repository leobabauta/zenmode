import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { toDayKey, formatDayLabel } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { Colors } from '../lib/colors';

interface SnoozeOption {
  label: string;
  dayKey: string | null;
  isLater: boolean;
}

function getOptions(): SnoozeOption[] {
  const now = new Date();
  return [
    { label: `In 2 days — ${formatDayLabel(addDays(now, 2))}`, dayKey: toDayKey(addDays(now, 2)), isLater: false },
    { label: `In 3 days — ${formatDayLabel(addDays(now, 3))}`, dayKey: toDayKey(addDays(now, 3)), isLater: false },
    { label: `Next week — ${formatDayLabel(addDays(now, 7))}`, dayKey: toDayKey(addDays(now, 7)), isLater: false },
    { label: `In 2 weeks — ${formatDayLabel(addDays(now, 14))}`, dayKey: toDayKey(addDays(now, 14)), isLater: false },
    { label: 'Later (no date)', dayKey: null, isLater: true },
  ];
}

interface SnoozeModalProps {
  visible: boolean;
  colors: Colors;
  onSelect: (dayKey: string | null, isLater: boolean) => void;
  onClose: () => void;
}

export function SnoozeModal({ visible, colors, onSelect, onClose }: SnoozeModalProps) {
  const options = getOptions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: colors.text }]}>Move to...</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.option}
              onPress={() => { onSelect(opt.dayKey, opt.isLater); onClose(); }}
              activeOpacity={0.6}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.cancelBtn, { borderTopColor: colors.border }]} onPress={onClose} activeOpacity={0.6}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '85%',
    borderRadius: 16,
    paddingTop: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
  },
  cancelBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
