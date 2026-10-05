import test from "node:test";
import assert from "node:assert/strict";
import {
  generateCohortSlug,
  mapDepartmentToDomain,
  mapLevel,
  setActiveCohort,
  getActiveCohort,
  clearActiveCohort,
} from "../dist/utils/activeCohort.js";

test("ActiveCohort - generateCohortSlug generates concise, clean slugs", () => {
  assert.equal(generateCohortSlug("Machine Learning & AI Internship", "ml"), "ai-ml");
  assert.equal(generateCohortSlug("Summer 2024 - Web Development", "web"), "web-dev");
  assert.equal(generateCohortSlug("Cybersecurity Defense", "cyber"), "cyber");
  assert.equal(generateCohortSlug("IoT & Microcontrollers", "embedded"), "embedded");
  assert.equal(generateCohortSlug("Mobile App Bootcamp", "app"), "mobile-app");
  assert.equal(generateCohortSlug("Cloud Architecture", "cloud"), "cloud");
});

test("ActiveCohort - mapDepartmentToDomain detects appropriate track keys", () => {
  assert.equal(mapDepartmentToDomain("web", "React Essentials"), "web");
  assert.equal(mapDepartmentToDomain("cyber", "Penetration Testing"), "cyber");
  assert.equal(mapDepartmentToDomain("embedded", "ESP32 Sensors"), "embeded");
  assert.equal(mapDepartmentToDomain("app", "React Native Track"), "app");
  assert.equal(mapDepartmentToDomain("cloud", "AWS DevOps"), "cloud");
  assert.equal(mapDepartmentToDomain("ml", "Machine Learning Track"), "ml");
  assert.equal(mapDepartmentToDomain(undefined, "AI Masterclass"), "ml");
});

test("ActiveCohort - mapLevel normalizes level inputs", () => {
  assert.equal(mapLevel("beginner", "Intro Python"), "beginner");
  assert.equal(mapLevel(undefined, "Beginner Track"), "beginner");
  assert.equal(mapLevel("advanced", "Transformers"), "advanced");
  assert.equal(mapLevel(undefined, "Intermediate Level"), "intermediate");
});

test("ActiveCohort - persistent storage lifecycle (set, get, clear)", () => {
  clearActiveCohort();
  assert.equal(getActiveCohort(), null);

  const cohort = {
    id: "cohort-test-123",
    name: "AI/Machine Learning Cohort 2026",
    department: "ml",
    level: "beginner",
    supervisorName: "Dr. Jane Smith",
    supervisorEmail: "janesmith@zigex.dev",
    githubRepoUrl: "https://github.com/iws3/sample_repo_zila.git",
  };

  const saved = setActiveCohort(cohort);
  assert.equal(saved.id, "cohort-test-123");
  assert.equal(saved.domainKey, "ml");
  assert.equal(saved.level, "beginner");
  assert.equal(saved.slug, "ai-ml");

  const retrieved = getActiveCohort();
  assert.ok(retrieved);
  assert.equal(retrieved?.id, "cohort-test-123");
  assert.equal(retrieved?.name, "AI/Machine Learning Cohort 2026");

  clearActiveCohort();
  assert.equal(getActiveCohort(), null);
});
