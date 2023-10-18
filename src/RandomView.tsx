import { AnimatePresence } from "@tamagui/animate-presence";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCcw,
  History,
} from "@tamagui/lucide-icons";
import NewsCard from "./components/NewsCard";
import { Items } from "./types";
import { YStack, styled, XStack, Button } from "tamagui";

enum Direction {
  Left = -1,
  Right = 1,
  Random = 0,
}

function getRandomIndex<T>(items: T[]) {
  return Math.floor((items.length - 1) * Math.random());
}

const YStackEnterable = styled(YStack, {
  variants: {
    isLeft: { true: { x: -300, opacity: 0 } },

    isRight: { true: { x: 300, opacity: 0 } },
  } as const,
});

const IconButton = styled(Button, {
  chromeless: true,
  size: "$5",
  circular: true,
});

export default function RandomView({ items }: { items: Items }) {
  const [[page, direction], _setPage] = useState([
    getRandomIndex(items),
    Direction.Random,
  ]);
  const [indexHistory, setIndexHistory] = useState<number[]>([]);

  const paginate = (newIndex: number, newDirection: Direction) => {
    _setPage([newIndex, newDirection]);
    setIndexHistory((prev) => {
      const cur = [page].concat(prev);
      // 3 is the max history depth
      if (cur.length > 3) {
        cur.pop();
      }
      return cur;
    });
  };
  const undo = () => {
    if (indexHistory.length < 1) {
      return;
    }

    const [index, ...remain] = indexHistory;
    _setPage([index!, Direction.Left]);
    setIndexHistory(remain);
  };

  const enterVariant =
    direction === Direction.Right || direction === Direction.Random
      ? "isRight"
      : "isLeft";

  const exitVariant = direction === Direction.Right ? "isLeft" : "isRight";

  return (
    <>
      <AnimatePresence enterVariant={enterVariant} exitVariant={exitVariant}>
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

      <XStack
        position="absolute"
        bottom="$10"
        width="100%"
        alignItems="center"
        justifyContent="space-around"
        paddingHorizontal="$4"
      >
        <IconButton
          accessibilityLabel="Carousel left"
          icon={ArrowLeft}
          onPress={() => paginate(page - 1, Direction.Left)}
          disabled={page === 0}
        />

        <XStack>
          <IconButton
            accessibilityLabel="undo"
            icon={History}
            onPress={undo}
            disabled={indexHistory.length === 0}
            opacity={indexHistory.length === 0 ? 0.25 : 1}
          />
          <IconButton
            accessibilityLabel="random"
            icon={RefreshCcw}
            onPress={() => paginate(getRandomIndex(items), Direction.Random)}
          />
        </XStack>

        <IconButton
          accessibilityLabel="Carousel right"
          icon={ArrowRight}
          onPress={() => paginate(page + 1, Direction.Right)}
          disabled={page === items.length - 1}
        />
      </XStack>
    </>
  );
}
