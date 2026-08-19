import assert from "node:assert";
import test from "node:test";
import * as ui from "../index.js";

test("ui-kit exports Logo and Button", () => {
  assert.strictEqual(typeof ui.Logo, "function");
  assert.strictEqual(typeof ui.Button, "function");
  assert.strictEqual(typeof ui.Card, "function");
  assert.strictEqual(typeof ui.Spinner, "function");
  assert.strictEqual(typeof ui.Toast, "function");
  assert.strictEqual(typeof ui.useLocalStorage, "function");
  assert.strictEqual(typeof ui.ThemeProvider, "function");
});
