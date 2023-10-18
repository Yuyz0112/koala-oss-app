import React, { useMemo, useState } from "react";
import { FlatList } from "react-native";
import { Items } from "./types";
import { YStack, Input, H5, XStack } from "tamagui";
import { WatchButton, WatchLinkButton } from "./components/WatchButton";

function Card({ item }: { item: Items[0] }) {
  return (
    <YStack
      marginTop="$2"
      p="$2"
      borderBottomColor="$gray8"
      borderBottomWidth="1px"
    >
      <H5 fontWeight="bold">{item.title}</H5>
      {item.link}
      <XStack>
        <WatchButton
          {...item}
          button={{
            flex: 0,
            themeInverse: true,
            variant: "outlined",
            borderColor: "$background",
            color: "$background",
          }}
        />
        <WatchLinkButton {...item} />
      </XStack>
    </YStack>
  );
}

export default function ListView({ items: _items }: { items: Items }) {
  const [searchQuery, setSearchQuery] = useState("");
  const items = useMemo(() => {
    if (!searchQuery) {
      return _items;
    }

    const reg = new RegExp(searchQuery, "i");
    return _items.filter((item) => item.title.match(reg));
  }, [_items, searchQuery]);

  return (
    <YStack flex={1} width="80%" maxWidth={320} margin="auto" paddingTop="$8">
      <Input
        placeholder="搜索你感兴趣的内容..."
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
        size="$3"
        padding="$3"
        width="100%"
      />
      <FlatList
        data={items}
        renderItem={({ item }) => <Card item={item} />}
        keyExtractor={(item, index) => index.toString()}
      />
    </YStack>
  );
}
