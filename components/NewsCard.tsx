import {
  Button,
  Card,
  CardProps,
  H3,
  Image,
  XStack,
  YStack,
  ScrollView,
  Text,
} from "tamagui";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { covers } from "../covers.gen";

function NewsCard(
  props: CardProps &
    Partial<{
      title: string;
      description: React.ReactNode;
      image: string;
      bid: string;
      time: number;
    }>
) {
  return (
    <Card elevate size="$10" borderRadius="$10" bordered {...props}>
      <Card.Header
        marginTop="$20"
        paddingVertical="0"
        paddingHorizontal="$2"
        flex={1}
      >
        <H3>{props.title}</H3>
        <YStack flex={1}>
          <ScrollView>
            <YStack>{props.description}</YStack>
          </ScrollView>
        </YStack>
      </Card.Header>
      <Card.Footer padded>
        <Button
          width="100%"
          themeInverse
          onPress={async () => {
            const nativeUrl = `bilibili://video/${props.bid}?start_progress=${props.time}`;
            const webUrl = `https://www.bilibili.com/video/${props.bid}?t=34`;
            const result = await Linking.openURL(nativeUrl);
          }}
        >
          观看
        </Button>
      </Card.Footer>
      {props.image && (
        <Card.Background
          borderTopLeftRadius="$10"
          borderTopRightRadius="$10"
          height="$13"
        >
          <Image
            style={{
              width: "100%",
              height: "100%",
            }}
            source={{
              width: 320,
              height: 180,
              uri: covers[`cover_${props.image}`],
            }}
            resizeMode="cover"
          />
        </Card.Background>
      )}
    </Card>
  );
}

export default NewsCard;
