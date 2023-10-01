import {
  Button,
  Card,
  CardProps,
  H3,
  Image,
  YStack,
  ScrollView,
} from "tamagui";
import * as Linking from "expo-linking";
import { covers } from "../covers.gen";
import { Platform } from "react-native";

async function tryOpenUrl(nativeUrl: string, webUrl: string) {
  try {
    if (Platform.OS === "web") {
      let hasFocus = true;
      let timer: number | null;
      const checkFocus = () => {
        hasFocus = false;
        timer && clearTimeout(timer);
        document.removeEventListener("visibilitychange", checkFocus);
      };
      document.addEventListener("visibilitychange", checkFocus);
      timer = window.setTimeout(function () {
        if (hasFocus) {
          // still not redirected
          Linking.openURL(webUrl);
        }
      }, 1000);
    }

    await Linking.openURL(nativeUrl);
    // TODO: use webUrl in native platforms
  } catch (error) {
    console.error(error);
  }
}

export async function openURL(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener");
  } else {
    await Linking.openURL(url);
  }
}

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
          onPress={async (evt) => {
            const nativeUrl = `bilibili://video/${props.bid}?start_progress=${props.time}`;
            const webUrl = `https://www.bilibili.com/video/${
              props.bid
            }?t=${Math.floor((props.time || 0) / 1000)}`;

            if (Platform.OS === "web") {
              const { metaKey, ctrlKey } = evt as unknown as MouseEvent;
              if (metaKey || ctrlKey) {
                window.open(webUrl, "_blank", "noopener");
              }
            }

            await tryOpenUrl(nativeUrl, webUrl);
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
