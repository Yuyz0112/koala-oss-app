import {
  Button,
  Card,
  CardProps,
  H3,
  Image,
  Paragraph,
  XStack,
  YStack,
} from "tamagui";
import * as Linking from "expo-linking";
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
      <Card.Header marginTop="$20" paddingVertical="0" paddingHorizontal="$2">
        <H3>{props.title}</H3>
        <YStack>{props.description}</YStack>
      </Card.Header>
      <Card.Footer padded>
        <XStack flex={1} />
        <Button
          borderRadius="$10"
          theme="active"
          onPress={async () => {
            const url =
              `bilibili://video/${props.bid}?start_progress=${props.time}` ||
              `https://www.bilibili.com/video/${props.bid}?t=34`;
            const can = await Linking.canOpenURL(url);
            console.log(`canOpenURL ${url} ? ${can}`);
            const result = await Linking.openURL(url);
            console.log(`doOpenURL ${url} ? ${result}`);
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
            source={covers[`cover_${props.image}`]}
          />
        </Card.Background>
      )}
    </Card>
  );
}

export default NewsCard;
