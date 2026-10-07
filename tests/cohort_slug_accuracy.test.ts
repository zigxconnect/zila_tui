import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCohortSlug, mapDepartmentToDomain } from "../dist/utils/activeCohort.js";

test("Cohort Slug Accuracy - Embedded Systems training program does not falsely match AI", () => {
  const name = "SEED Inc Embedded Systems & IoT Training Program - General";
  const slug = generateCohortSlug(name);
  assert.equal(slug, "embedded", "Embedded & IoT training program must generate 'embedded', not 'ai-ml'");
  assert.notEqual(slug, "ai-ml", "Word 'training' must not trigger AI token match");
});

test("Cohort Slug Accuracy - Specific cohorts generate distinct slugs", () => {
  assert.equal(
    generateCohortSlug("The Tyros: Where Beginners Become Builders at SEED Inc - Machine Learning/AI"),
    "the-tyros"
  );
  assert.equal(
    generateCohortSlug("SEED 50 DAYS OF CODE BOOTCAMP (The Founders Program) - General"),
    "50-days-code"
  );
  assert.equal(
    generateCohortSlug("SEED Launches The Modern AI Bootcamp - General"),
    "ai-ml"
  );
  assert.equal(
    generateCohortSlug("SEED Launches Design Bootcamp: Turning Creativity Into Career-Ready Skills - General"),
    "design"
  );
});

test("Cohort Domain Mapping - Maps titles and departments to correct track domains", () => {
  assert.equal(mapDepartmentToDomain("General", "SEED Inc Embedded Systems & IoT Training Program"), "embeded");
  assert.equal(mapDepartmentToDomain("Machine Learning/AI", "The Tyros"), "ml");
  assert.equal(mapDepartmentToDomain("General", "SEED Launches Web Development"), "web");
});
