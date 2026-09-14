import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <Text className="text-3xl font-bold text-white">
        Life Reminder
      </Text>

      <Text className="mt-2 text-neutral-400">
        Uniwind is working.
      </Text>
    </View>
  );
}