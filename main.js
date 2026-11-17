"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SortCheckedPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// sort.ts
var taskPattern = /^[-*+] \[([ xX])\]\s*(.*)$/;
var fencePattern = /^ {0,3}(`{3,}|~{3,})/;
function getTask(line) {
  const match = taskPattern.exec(line);
  if (!match) return null;
  return {
    checked: match[1].toLowerCase() === "x",
    label: match[2]
  };
}
function isFence(line) {
  return fencePattern.test(line);
}
function sortTopLevelCheckedTasks(content) {
  const sourceLines = content.split("\n");
  const output = [];
  let run = [];
  let fence = null;
  let order = 0;
  const flushRun = () => {
    if (run.length === 0) return;
    const unchecked = run.filter((block) => !block.checked);
    const checked = run.filter((block) => block.checked).sort(
      (a, b) => a.label.localeCompare(b.label, void 0, {
        sensitivity: "base",
        numeric: true
      }) || a.order - b.order
    );
    for (const block of [...unchecked, ...checked]) {
      block.lines.forEach((line, index) => {
        output.push({ line, sourceLine: block.sourceLines[index] });
      });
    }
    run = [];
  };
  for (let index = 0; index < sourceLines.length; ) {
    const line = sourceLines[index];
    const fenceMatch = fencePattern.exec(line);
    if (fence) {
      flushRun();
      output.push({ line, sourceLine: index });
      if (fenceMatch && fenceMatch[1][0] === fence.character && fenceMatch[1].length >= fence.length) {
        fence = null;
      }
      index++;
      continue;
    }
    if (fenceMatch) {
      flushRun();
      fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      output.push({ line, sourceLine: index });
      index++;
      continue;
    }
    const task = getTask(line);
    if (!task) {
      flushRun();
      output.push({ line, sourceLine: index });
      index++;
      continue;
    }
    const block = {
      lines: [line],
      sourceLines: [index],
      ...task,
      order: order++
    };
    index++;
    while (index < sourceLines.length && (sourceLines[index] === "" || /^[ \t]/.test(sourceLines[index])) && !isFence(sourceLines[index])) {
      block.lines.push(sourceLines[index]);
      block.sourceLines.push(index);
      index++;
    }
    run.push(block);
  }
  flushRun();
  const lineMap = new Array(sourceLines.length);
  output.forEach((entry, destinationLine) => {
    lineMap[entry.sourceLine] = destinationLine;
  });
  return { text: output.map((entry) => entry.line).join("\n"), lineMap };
}

// main.ts
var SortCheckedPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.sortTimer = null;
  }
  onload() {
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor) => {
        if (this.sortTimer !== null) window.clearTimeout(this.sortTimer);
        this.sortTimer = window.setTimeout(() => {
          this.sortTimer = null;
          this.sortEditor(editor);
        }, 250);
      })
    );
  }
  onunload() {
    if (this.sortTimer !== null) window.clearTimeout(this.sortTimer);
  }
  sortEditor(editor) {
    var _a, _b;
    const original = editor.getValue();
    const result = sortTopLevelCheckedTasks(original);
    if (result.text === original) return;
    const cursor = editor.getCursor();
    const cursorLine = result.lineMap[cursor.line];
    editor.setValue(result.text);
    editor.setCursor({
      line: cursorLine != null ? cursorLine : cursor.line,
      ch: Math.min(cursor.ch, (_b = (_a = result.text.split("\n")[cursorLine != null ? cursorLine : cursor.line]) == null ? void 0 : _a.length) != null ? _b : 0)
    });
  }
};
