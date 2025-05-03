"use client";

import { Button, useMantineColorScheme } from "@mantine/core";

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Button
      size="xs"
      variant="outline"
      style={{ marginLeft: 10, marginTop: 10 }}
      onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
    >
      {colorScheme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
    </Button>
  );
} 

