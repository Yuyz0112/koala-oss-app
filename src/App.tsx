import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import {
  Button,
  TamaguiProvider,
  Theme,
  styled,
  XStack,
  YStack,
  ToggleGroup,
} from "tamagui";
import { registerRootComponent } from "expo";
import { LinearGradient } from "tamagui/linear-gradient";
import { Link, Download, Shuffle, List } from "@tamagui/lucide-icons";

import config from "./tamagui.config";
import data from "../assets/data.json";

import { useInstallPrompt } from "./use-install-prompt";
import { register } from "./service-worker-registration";
import { initSentry } from "./sentry";
import { useStorage } from "./use-storage";
import { Items } from "./types";

import RandomView from "./RandomView";
import ListView from "./ListVIew";
import { openURL } from "./components/WatchButton";

register();
initSentry();

const LinkButton = styled(Button, {
  chromeless: true,
  padding: "$2",
  width: "100%",
  iconAfter: Link,
  justifyContent: "flex-start",
});

const items = data.reduce<Items>((prev, cur) => {
  return prev.concat(
    cur.hn_items.introduces.map((introduce, index) => {
      const link = cur.hn_items.links[index];
      const time = cur.hn_items.times[index];
      return {
        title: introduce,
        linkStr: Array.isArray(link) ? link.join(",") : link || "",
        link: Array.isArray(link) ? (
          <>
            {link.map((cLink) => (
              <LinkButton
                key={cLink}
                onPress={() => {
                  openURL(cLink);
                }}
              >
                {cLink}
              </LinkButton>
            ))}
          </>
        ) : link ? (
          <LinkButton
            onPress={() => {
              openURL(link);
            }}
          >
            {link}
          </LinkButton>
        ) : (
          ""
        ),
        cover: cur.cover.toString(),
        bid: cur.bid,
        time: time ? (time.minutes * 60 + time.seconds) * 1000 - 100 : 0,
      };
    })
  );
}, []);

export default function App() {
  const [loaded] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  const { isInstallable, handleInstall } = useInstallPrompt();

  const [view, setView] = useStorage({
    defaultValue: "random",
    storageKey: "koala-oss-app:view",
  });

  if (!loaded) {
    return null;
  }

  return (
    <TamaguiProvider config={config}>
      <Theme name={"light"}>
        <StatusBar style="auto" />
        <LinearGradient
          overflow="hidden"
          position="relative"
          height="100%"
          width="100%"
          alignItems="center"
          colors={["white", "$orange5"]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <YStack width="100%" height="100%">
              <XStack position="absolute" top="$0" left="$0" zIndex={9}>
                <ToggleGroup
                  type="single"
                  marginLeft="$2"
                  marginTop="$2"
                  size="$3"
                  value={view}
                  onValueChange={setView}
                >
                  <ToggleGroup.Item value="list">
                    <List />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item value="random">
                    <Shuffle />
                  </ToggleGroup.Item>
                </ToggleGroup>
              </XStack>
              <XStack position="absolute" top="$0" right="$0" zIndex={9}>
                {isInstallable && (
                  <Button
                    accessibilityLabel="Download"
                    icon={Download}
                    size="$5"
                    circular
                    chromeless
                    onPress={handleInstall}
                  />
                )}
              </XStack>
              {(!view || view === "random") && <RandomView items={items} />}
              {view === "list" && <ListView items={items} />}
            </YStack>
          </SafeAreaView>
        </LinearGradient>
      </Theme>
    </TamaguiProvider>
  );
}

registerRootComponent(App);
