import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, SafeAreaView } from "react-native";
import { Paragraph, Spacer, TamaguiProvider, Theme, YStack } from "tamagui";
import config from "./tamagui.config";
import Demo from "./Demo";

export default function App() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),

    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });
  if (!loaded) {
    return null;
  }
  return (
    <TamaguiProvider config={config}>
      <Theme name={colorScheme === "dark" ? "dark" : "light"}>
        <SafeAreaView style={{ flex: 1 }}>
          <YStack
            f={1}
            jc="center"
            ai="center"
            backgroundColor={"$backgroundSoft"}
          >
            <Demo />

            <StatusBar style="auto" />
          </YStack>
        </SafeAreaView>
      </Theme>
    </TamaguiProvider>
  );
}
