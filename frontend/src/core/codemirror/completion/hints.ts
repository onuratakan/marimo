/* Copyright 2023 Marimo. All rights reserved. */
import { HTMLCellId } from "@/core/cells/ids";
import { hoverTooltip } from "@codemirror/view";
import { AUTOCOMPLETER, Autocompleter } from "./Autocompleter";
import { Logger } from "@/utils/Logger";
import { Text } from "@codemirror/state";

export function hintTooltip() {
  return [
    hoverTooltip(
      async (view, pos) => {
        const cellContainer = HTMLCellId.findElement(view.dom);
        if (!cellContainer) {
          Logger.error("Failed to find active cell.");
          return null;
        }

        const cellId = HTMLCellId.parse(cellContainer.id);

        const { startToken, endToken } = getPositionAtWordBounds(
          view.state.doc,
          pos
        );

        const result = await AUTOCOMPLETER.request({
          document: view.state.doc.slice(0, endToken).toString(), // convert Text to string
          cellId: cellId,
        });
        if (!result) {
          return null;
        }

        const fullWord = view.state.doc.slice(startToken, endToken).toString();
        const tooltip = Autocompleter.asHoverTooltip({
          position: endToken,
          message: result,
          exactName: fullWord,
          excludeTypes: ["tooltip"],
        });
        return tooltip ?? null;
      },
      {
        hideOnChange: true,
      }
    ),
  ];
}

export function getPositionAtWordBounds(doc: Text, pos: number) {
  let startToken = pos;
  let endToken = pos;

  // Start of word
  while (startToken > 0) {
    const prevChar = doc.sliceString(startToken - 1, startToken);
    // Anything but a letter, number, or underscore
    if (!/\w/.test(prevChar)) {
      break;
    }
    startToken--;
  }

  // End of word
  while (endToken < doc.length) {
    const nextChar = doc.sliceString(endToken, endToken + 1);
    // Anything but a letter, number, or underscore
    if (!/\w/.test(nextChar)) {
      break;
    }
    endToken++;
  }

  return { startToken, endToken };
}
