import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const useStorage = ({
  defaultValue,
  storageKey,
}: {
  defaultValue: string;
  storageKey: string;
}): [string, (newValue: string) => void] => {
  const [value, setValue] = useState<string>(defaultValue);
  const { getItem, setItem } = useAsyncStorage(storageKey);

  const readItemFromStorage = async () => {
    try {
      const item = await getItem();
      if (item !== null) {
        setValue(item);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const writeItemToStorage = async (newValue: string) => {
    try {
      await setItem(newValue);
      setValue(newValue);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    readItemFromStorage();
  }, []);

  return [
    value,
    (newValue: string) => {
      setValue(newValue);
      writeItemToStorage(newValue);
    },
  ];
};
