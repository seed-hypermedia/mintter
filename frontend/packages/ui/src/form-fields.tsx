import {PropsWithChildren} from "react";
import {Label, YStack} from "tamagui";

export function Field({
  id,
  label,
  children,
}: PropsWithChildren<{label: string; id: string}>) {
  return (
    <YStack borderWidth={1} borderColor="$color7" borderRadius="$3" f={1}>
      <Label
        position="absolute"
        htmlFor={id}
        size="$1"
        bg="$background"
        color="$color8"
        marginLeft="$2"
        style={{transform: "translateY(-50%)"}}
        paddingHorizontal="$2"
      >
        {label}
      </Label>
      {children}
    </YStack>
  );
}
