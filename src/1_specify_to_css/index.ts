import { env } from "node:process";
import { kebabCase } from "change-case";
import { matchIsTextStyleTokenState } from "@specifyapp/specify-design-token-format";
import { createSpecifyClient } from "@specifyapp/sdk";
import {
  getParentDirectoryName,
  writeOutputToFile,
} from "../utils/fileSystem.js";

const FONT_FAMILY_FALLBACK = "sans-serif";

function mapFigmaFontWeightToCSS(fontWeight: string | number) {
  if (typeof fontWeight === "number") {
    return fontWeight;
  }
  switch (fontWeight.toLowerCase()) {
    case "thin":
      return 100;
    case "extralight":
      return 200;
    case "light":
      return 300;
    case "regular":
      return 400;
    case "medium":
      return 500;
    case "semibold":
      return 600;
    case "semi-bold":
      return 600;
    case "bold":
      return 700;
    case "extrabold":
      return 800;
    case "black":
      return 900;
    default:
      return 400;
  }
}

export async function computeSpecifyToCSSChallenge() {
  const specifyClient = createSpecifyClient();

  await specifyClient.authenticate(env.SPECIFY_PERSONAL_ACCESS_TOKEN);

  const repositoryTokenTree =
    await specifyClient.getRepositoryTokenTreeByName("challenge-us-1");

  const textStyleTokens = repositoryTokenTree.sdtfEngine.query
    .getAllTokenStates()
    .filter((tokenState) => tokenState.type === "textStyle")
    .map((tokenState) => {
      if (matchIsTextStyleTokenState(tokenState)) {
        const tokenValue = tokenState
          .getStatefulValueResult()
          .mapUnresolvableTopLevelAlias(() => {
            throw new Error("Unresolvable top level alias");
          })
          .mapResolvableTopLevelAlias(() => {
            throw new Error("Top level alias not supported");
          })
          .mapTopLevelValue((topLevelValue) => {
            return topLevelValue
              .resolveDeepValue()
              .mapRawValue((rawValue) => {
                const fontValue = rawValue.font.unwrapValue();
                const fontSizeValue = rawValue.fontSize.unwrapValue();
                const lineHeightValue = rawValue.lineHeight.unwrapValue();

                let lineHeight = undefined;
                if (lineHeightValue !== null) {
                  const lineHeightNumberValue =
                    lineHeightValue.value.unwrapValue();
                  const fontSizeHeightNumberValue =
                    fontSizeValue.value.unwrapValue();
                  lineHeight = `${Math.round((lineHeightNumberValue / fontSizeHeightNumberValue + Number.EPSILON) * 100) / 100}`;
                }

                return {
                  "font-family": [
                    `"${fontValue.family.unwrapValue()}"`,
                    FONT_FAMILY_FALLBACK,
                  ].join(", "),
                  "font-weight": mapFigmaFontWeightToCSS(
                    fontValue.weight.unwrapValue(),
                  ),
                  "font-size": `${fontSizeValue.value.unwrapValue()}${fontSizeValue.unit.unwrapValue()}`,
                  "line-height": lineHeight,
                };
              })
              .mapUnresolvableModeLevelAlias(() => {
                throw new Error("Unresolvable mode level alias");
              })
              .mapResolvableModeLevelAlias(() => {
                throw new Error("Mode level alias not supported");
              })
              .pickMode("default");
          })
          .unwrap();

        const a = tokenState.value;

        return {
          // @ts-expect-error - TS2590: Expression produces a union type that is too complex to represent.
          cssClass: `text-${kebabCase(tokenState.name)}`,
          style: tokenValue,
        };
      }
    });

  const cssOutput = `@layer utilities {
${textStyleTokens
  .map((entry) =>
    entry
      ? `  .${entry.cssClass} {
${Object.entries(entry.style)
  .map(([key, value]) => `    ${key}: ${value};`)
  .join("\n")}
  }`
      : "",
  )
  .join("\n\n")}
}
`;

  const challengeDirName = getParentDirectoryName(import.meta.url);
  writeOutputToFile(challengeDirName, "text-styles.css", cssOutput);
}
