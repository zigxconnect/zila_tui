import test from "node:test";
import assert from "node:assert/strict";
import { maskVerificationCode } from "../dist/screens/AuthScreen.js";

test("Auth screen masks each verification code digit", () => {
  assert.equal(maskVerificationCode(""), "");
  assert.equal(maskVerificationCode("4"), "•");
  assert.equal(maskVerificationCode("123456"), "• • • • • •");
});