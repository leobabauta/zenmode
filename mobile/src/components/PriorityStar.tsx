import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Colors } from '../lib/colors';

interface PriorityStarProps {
  isPriority?: boolean;
  isMediumPriority?: boolean;
  colors: Colors;
}

export function PriorityStar({ isPriority, isMediumPriority, colors }: PriorityStarProps) {
  if (!isPriority && !isMediumPriority) return null;

  const fillColor = isPriority ? colors.priorityHigh : colors.priorityMedium;
  const ringColor = isPriority ? 'rgba(234,179,8,0.3)' : 'rgba(96,165,250,0.3)';

  return (
    <View style={[styles.container, { backgroundColor: ringColor, borderRadius: 12 }]}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill={fillColor}>
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
