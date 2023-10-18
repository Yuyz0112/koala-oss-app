import { Button, ButtonProps } from "tamagui";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { Globe } from "@tamagui/lucide-icons";

function getWebUrl(bid = "", time = 0) {
  return `https://www.bilibili.com/video/${bid}?t=${Math.floor(
    (time || 0) / 1000
  )}`;
}

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

type Props = Partial<{
  title: string;
  description: React.ReactNode;
  image: string;
  bid: string;
  time: number;
  button: ButtonProps;
}>;

export const WatchButton: React.FC<Props> = (props) => {
  return (
    <Button
      flex={1}
      themeInverse
      onPress={async (evt) => {
        const nativeUrl = `bilibili://video/${props.bid}?start_progress=${props.time}`;
        const webUrl = getWebUrl(props.bid, props.time);

        if (Platform.OS === "web") {
          const { metaKey, ctrlKey } = evt as unknown as MouseEvent;
          if (metaKey || ctrlKey) {
            window.open(webUrl, "_blank", "noopener");
            return;
          }
        }

        await tryOpenUrl(nativeUrl, webUrl);
      }}
      {...props.button}
    >
      观看
    </Button>
  );
};

export const WatchLinkButton: React.FC<Props> = (props) => {
  return (
    <Button
      icon={Globe}
      ml="$1"
      chromeless
      onPress={() => {
        openURL(getWebUrl(props.bid, props.time));
      }}
    />
  );
};
