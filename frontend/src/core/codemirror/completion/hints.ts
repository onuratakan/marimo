/* Copyright 2023 Marimo. All rights reserved. */
import { HTMLCellId } from "@/core/cells/ids";
import { EditorView, hoverTooltip } from "@codemirror/view";
import { AUTOCOMPLETER, Autocompleter } from "./Autocompleter";
import { Logger } from "@/utils/Logger";
import { EditorState, Text } from "@codemirror/state";
import { debounce } from "lodash-es";
import { documentationAtom } from "@/core/documentation/state";
import { store } from "@/core/state/jotai";

export function hintTooltip() {
  return [
    hoverTooltip((view, pos) => requestDocumentation(view, pos, ["tooltip"]), {
      hideOnChange: true,
    }),
    cursorPositionDocumentation,
  ];
}

async function requestDocumentation(
  view: EditorView,
  pos: number,
  excludeTypes?: string[]
) {
  const cellContainer = HTMLCellId.findElement(view.dom);
  if (!cellContainer) {
    Logger.error("Failed to find active cell.");
    return null;
  }

  const cellId = HTMLCellId.parse(cellContainer.id);

  const { startToken, endToken } = getPositionAtWordBounds(view.state.doc, pos);

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
    excludeTypes: excludeTypes,
  });
  return tooltip ?? null;
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

// Checks if the cursor is in a text element
function isCursorInText(state: EditorState) {
  const { head } = state.selection.main;
  const text = state.doc.sliceString(head - 1, head);
  return /\w/.test(text);
}

// Debounce the request to avoid spamming the server
const debouncedAutocomplete = debounce(
  async (view: EditorView, position: number) => {
    const tooltip = await requestDocumentation(view, position);
    store.set(documentationAtom, {
      documentation: tooltip?.html ?? null,
    });
  },
  200
);

// Listen to cursor movement and send documentation requests
const cursorPositionDocumentation = EditorView.updateListener.of((update) => {
  if (update.selectionSet && isCursorInText(update.state)) {
    const cursorPos = update.state.selection.main.head;
    debouncedAutocomplete(update.view, cursorPos);
  }
});
