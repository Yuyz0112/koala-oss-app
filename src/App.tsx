import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, SafeAreaView, Platform } from "react-native";
import {
  Button,
  TamaguiProvider,
  Theme,
  YStack,
  styled,
  XStack,
} from "tamagui";
import { registerRootComponent } from "expo";
import { AnimatePresence } from "@tamagui/animate-presence";
import { LinearGradient } from "tamagui/linear-gradient";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCcw,
  Link,
  Download,
} from "@tamagui/lucide-icons";
import { useState } from "react";

import config from "./tamagui.config";
import NewsCard, { openURL } from "./components/NewsCard";
import data from "../assets/data.json";

import { useInstallPrompt } from "./use-install-prompt";
import { register } from "./service-worker-registration";

register();

const YStackEnterable = styled(YStack, {
  variants: {
    isLeft: { true: { x: -300, opacity: 0 } },

    isRight: { true: { x: 300, opacity: 0 } },
  } as const,
});

const LinkButton = styled(Button, {
  chromeless: true,
  padding: "$2",
  width: "100%",
  iconAfter: Link,
});

function getRandomIndex() {
  return Math.floor((items.length - 1) * Math.random());
}

const items = data.reduce<
  {
    title: string;
    link: React.ReactNode;
    cover: string;
    bid: string;
    time: number;
  }[]
>((prev, cur) => {
  return prev.concat(
    cur.hn_items.introduces.map((introduce, index) => {
      const link = cur.hn_items.links[index];
      const time = cur.hn_items.times[index];
      return {
        title: introduce,
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
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  const [[page, direction], setPage] = useState([getRandomIndex(), 0]);
  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };
  const enterVariant =
    direction === 1 || direction === 0 ? "isRight" : "isLeft";

  const exitVariant = direction === 1 ? "isLeft" : "isRight";

  const { isInstallable, handleInstall } = useInstallPrompt();

  if (!loaded) {
    return null;
  }

  return (
    <TamaguiProvider config={config}>
      <Theme name={"light"}>
        <StatusBar style="auto" />
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient
            overflow="hidden"
            position="relative"
            height="100%"
            width="100%"
            alignItems="center"
            colors={["white", "$orange5"]}
          >
            <AnimatePresence
              enterVariant={enterVariant}
              exitVariant={exitVariant}
            >
              <YStackEnterable
                f={1}
                alignItems="center"
                justifyContent="center"
                backgroundColor="rgba(0,0,0,0)"
                key={page}
                animation="quick"
                fullscreen
                x={0}
                opacity={1}
              >
                <NewsCard
                  height="65%"
                  width="80%"
                  maxWidth={320}
                  maxHeight={560}
                  margin="$5"
                  title={items[page]?.title || ""}
                  description={items[page]?.link || ""}
                  image={items[page]?.cover}
                  bid={items[page]?.bid || ""}
                  time={items[page]?.time || 0}
                  elevate={false}
                />
              </YStackEnterable>
            </AnimatePresence>

            {isInstallable && (
              <XStack position="absolute" top="$0" right="$0">
                <Button
                  accessibilityLabel="Download"
                  icon={Download}
                  size="$5"
                  circular
                  chromeless
                  onPress={handleInstall}
                />
              </XStack>
            )}

            <XStack
              position="absolute"
              bottom="$10"
              width="100%"
              alignItems="center"
              justifyContent="space-around"
              paddingHorizontal="$4"
            >
              <Button
                accessibilityLabel="Carousel left"
                icon={ArrowLeft}
                size="$5"
                circular
                chromeless
                // themeInverse
                onPress={() => paginate(-1)}
                disabled={page === 0}
              />

              <Button
                accessibilityLabel="random"
                icon={RefreshCcw}
                size="$5"
                circular
                chromeless
                // themeInverse
                onPress={() => setPage([getRandomIndex(), 1])}
              />

              <Button
                accessibilityLabel="Carousel right"
                icon={ArrowRight}
                size="$5"
                circular
                chromeless
                // themeInverse
                onPress={() => paginate(1)}
                disabled={page === items.length - 1}
              />
            </XStack>
          </LinearGradient>
        </SafeAreaView>
      </Theme>
    </TamaguiProvider>
  );
}

registerRootComponent(App);
