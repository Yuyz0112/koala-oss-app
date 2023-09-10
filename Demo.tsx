import { AnimatePresence } from "@tamagui/animate-presence";

import { ArrowLeft, ArrowRight } from "@tamagui/lucide-icons";

import { useEffect, useState } from "react";
import { Dimensions } from "react-native";

import { Button, Image, XStack, YStack, styled } from "tamagui";
const YStackEnterable = styled(YStack, {
  variants: {
    isLeft: { true: { x: -50, opacity: 0 } },

    isRight: { true: { x: 50, opacity: 0 } },
  } as const,
});
function AnimationsPresenceDemo() {
  const [[page, direction], setPage] = useState([0, 0]);
  const imageIndex = wrap(0, 3, page);
  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };
  const enterVariant =
    direction === 1 || direction === 0 ? "isRight" : "isLeft";

  const exitVariant = direction === 1 ? "isLeft" : "isRight";
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    //handler to get device Height
    setHeight(Dimensions.get("window").height);
    //handler to get device Width
    setWidth(Dimensions.get("window").width);
  }, []);

  return (
    <XStack
      overflow="hidden"
      backgroundColor="#000"
      position="relative"
      height="100%"
      width="100%"
      alignItems="center"
    >
      <AnimatePresence enterVariant={enterVariant} exitVariant={exitVariant}>
        <YStackEnterable
          key={page}
          animation="bouncy"
          fullscreen
          x={0}
          opacity={1}
        >
          <Image
            source={{
              uri: `https://source.unsplash.com/random/${width}x${height}?t=${Date.now()}`,
              width,
              height,
            }}
          />
        </YStackEnterable>
      </AnimatePresence>
      <Button
        accessibilityLabel="Carousel left"
        icon={ArrowLeft}
        size="$5"
        position="absolute"
        left="$4"
        circular
        elevate
        onPress={() => paginate(-1)}
      />

      <Button
        accessibilityLabel="Carousel right"
        icon={ArrowRight}
        size="$5"
        position="absolute"
        right="$4"
        circular
        elevate
        onPress={() => paginate(1)}
      />
    </XStack>
  );
}
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;

  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export default AnimationsPresenceDemo;
