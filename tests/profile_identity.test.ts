import test from "node:test";
import assert from "node:assert/strict";
import { resolveAccountProfile } from "../dist/screens/AboutScreen.js";

test("About Me accepts the profile for the signed-in email", () => {
  const profile = resolveAccountProfile({
    id: "profile-1",
    user_id: "user-1",
    full_name: "Fonyuy Gita",
    email: "FonyuyJudeGita@gmail.com",
  }, "fonyuyjudegita@gmail.com");

  assert.equal(profile.full_name, "Fonyuy Gita");
  assert.equal(profile.email, "FonyuyJudeGita@gmail.com");
});

test("About Me refuses to display a different account's profile", () => {
  assert.throws(
    () => resolveAccountProfile({
      id: "profile-2",
      user_id: "user-2",
      full_name: "Sanda Maurice",
      email: "sanda@example.com",
    }, "fonyuyjudegita@gmail.com"),
    /profile belongs to sanda@example.com/,
  );
});