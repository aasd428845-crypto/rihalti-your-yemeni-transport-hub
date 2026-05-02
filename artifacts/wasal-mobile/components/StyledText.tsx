import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

export function AppText({ style, ...props }: TextProps) {
  return <Text style={[styles.base, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: "Cairo_400Regular" },
});
