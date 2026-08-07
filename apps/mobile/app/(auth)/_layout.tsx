import { Stack } from 'expo-router';
import { COLORS } from '../../src/lib/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.black } }} />
  );
}
