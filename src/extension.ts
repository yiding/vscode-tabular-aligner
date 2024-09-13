// Copyright 2024 Yiding Jia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from "vscode";
import { Range, TextEditor, TextEditorEdit } from "vscode";
import { range } from "./range";

let lastPattern: string | undefined;
let lastFormatString: string | undefined;

interface FormatItem {
  alignment: "l" | "c" | "r";
  pad: number;
}

/**
 * Like String.prototype.split, but keeps the delimiter.
 */
function splitWithDelim(s: string, delim: RegExp): Array<string> {
  if (!delim.global) {
    delim = new RegExp(delim, delim.flags + "g");
  }
  let result = [];
  let last = 0;
  for (let match of s.matchAll(delim)) {
    result.push(s.slice(last, match.index));
    result.push(match[0]);
    last = match.index + match[0].length;
  }
  result.push(s.slice(last));
  return result;
}

function parseFormatString(formatString: string): Array<FormatItem> | Error {
  const RE = /^([lcr])([0-9]+)/;

  let start = 0;
  let format = [];
  while (start < formatString.length) {
    const match = formatString.slice(start).match(RE);
    if (match === null) {
      return new Error(
        `Invalid format item at position ${start}, expected [lcr][0-9]+`
      );
    }
    format.push({
      alignment: match[1] as "l" | "c" | "r",
      pad: Number(match[2]),
    });
    start += match[0].length;
  }
  return format;
}

function commonPrefix(a: string, b: string): string {
  let j = 0;
  while (j < a.length && j < b.length) {
    if (a[j] !== b[j]) {
      break;
    }
    j++;
  }
  return a.slice(0, j);
}

/**
 * Detect common indentation amongst all lines in the range.
 *
 * Ignore empty lines or lines containing only whitespace.
 *
 * @returns The common indentation string, may be empty string if no common indentation.
 */
function detectCommonIndentation(lines: Array<string>): string {
  return (
    lines.reduce<string | null>((acc, line) => {
      if (line.trim().length === 0) {
        return acc;
      }
      const currentIndent = line.match(/^\s*/)?.[0] || "";
      if (acc === null) {
        return currentIndent;
      } else {
        return commonPrefix(acc, currentIndent);
      }
    }, null) ?? ""
  );
}

function tabularize(
  editor: TextEditor,
  edit: TextEditorEdit,
  pattern: RegExp,
  formats: Array<FormatItem>
) {
  let editRange;
  if (editor.selection.isEmpty) {
    // Look at neighboring lines for lines containing delimiter.
    let currentLine = editor.selection.start.line;
    let newStart = currentLine;
    let newEnd = currentLine;
    while (
      newStart > 0 &&
      pattern.test(editor.document.lineAt(newStart - 1).text)
    ) {
      newStart--;
    }
    while (
      newEnd < editor.document.lineCount - 1 &&
      pattern.test(editor.document.lineAt(newEnd + 1).text)
    ) {
      newEnd++;
    }

    editRange = new Range(
      newStart,
      0,
      newEnd,
      editor.document.lineAt(newEnd).text.length
    );
  } else {
    editRange = editor.selection;
  }

  const lines = Array.from(
    range(editRange.start.line, editRange.end.line + 1),
    (i) => editor.document.lineAt(i).text
  );
  const indentation = detectCommonIndentation(lines);

  // Avoid trimming delimiters.
  const table = lines.map((line) =>
    splitWithDelim(line, pattern).map((v, i) => (i % 2 === 1 ? v : v.trim()))
  );

  let numCols = table.reduce((acc, row) => Math.max(acc, row.length), 0);

  let columnWidths = Array.from(range(numCols), (i) =>
    table
      .map((row) => (i < row.length ? row[i].length : 0))
      .reduce((a, b) => Math.max(a, b), 0)
  );

  table.forEach((row, lineOffset) => {
    let newLine = row
      .map((cell, i) => {
        let activeFormat = formats[i % formats.length];
        let endPad = i < row.length - 1 ? " ".repeat(activeFormat.pad) : "";
        switch (activeFormat.alignment) {
          case "l":
            return cell.padEnd(columnWidths[i], " ") + endPad;
          case "r":
            return cell.padStart(columnWidths[i], " ") + endPad;
          case "c":
            let pad = columnWidths[i] - cell.length;
            let leftPad = Math.floor(pad / 2);
            let rightPad = pad - leftPad;
            return " ".repeat(leftPad) + cell + " ".repeat(rightPad) + endPad;
          default:
            throw new Error("Invalid alignment");
        }
      })
      .join("");
    let lineNo = editRange.start.line + lineOffset;

    // Can't used the passed in edit because async.
    edit.replace(
      new Range(lineNo, 0, lineNo, lines[lineOffset].length),
      indentation + newLine
    );
  });
}

async function tabularizeAction(editor: TextEditor, _edit: TextEditorEdit) {
  const patternStr = await vscode.window.showInputBox({
    title: "Tabular Aligner - (1/2 - Delimiter)",
    prompt: "Enter delimiter regex",
    value: lastPattern,
    validateInput(input: string) {
      if (input.length === 0) {
        return "Delimiter cannot be empty";
      }
      try {
        new RegExp(input);
      } catch (e) {
        if (e instanceof SyntaxError) {
          return e.message;
        }
        throw e;
      }
      return null;
    },
  });
  if (patternStr === undefined) {
    return;
  }
  let pattern = new RegExp(patternStr);
  lastPattern = patternStr;

  let formatString = await vscode.window.showInputBox({
    title: "Tabular Aligner - (2/2 - Format)",
    placeHolder: "l1",
    prompt: "Enter format specifiers: ([lcr][0-9]+)*",
    value: lastFormatString,
    validateInput(input: string) {
      const result = parseFormatString(input);
      if (result instanceof Error) {
        return result.message;
      }
    },
  });
  if (formatString === undefined) {
    return;
  }

  lastFormatString = formatString;
  if (formatString.length === 0) {
    formatString = "l1";
  }
  let formats = parseFormatString(formatString) as Array<FormatItem>;

  editor.edit((edit) => {
    tabularize(editor, edit, pattern, formats);
  });
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerTextEditorCommand(
    "tabular-aligner.tabularize",
    tabularizeAction
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
