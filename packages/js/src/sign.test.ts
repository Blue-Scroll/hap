/**
 * Tests for HAP signing functions
 */

import { describe, test, expect } from "vitest";
import {
  generateId,
  generateTestId,
  isTestId,
  createClaim,
  hashContent,
} from "./sign";
import { ID_REGEX, TEST_ID_REGEX } from "./types";

describe("HAP ID Generation", () => {
  describe("generateId", () => {
    test("generates valid HAP ID format", () => {
      const id = generateId();
      expect(id).toMatch(ID_REGEX);
    });

    test("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    test("starts with hap_", () => {
      const id = generateId();
      expect(id.startsWith("hap_")).toBe(true);
    });

    test("has 12 character suffix", () => {
      const id = generateId();
      expect(id.length).toBe(16); // "hap_" + 12 chars
    });
  });

  describe("generateTestId", () => {
    test("generates valid test HAP ID format", () => {
      const id = generateTestId();
      expect(id).toMatch(TEST_ID_REGEX);
    });

    test("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTestId());
      }
      expect(ids.size).toBe(100);
    });

    test("starts with hap_test_", () => {
      const id = generateTestId();
      expect(id.startsWith("hap_test_")).toBe(true);
    });

    test("has 8 character suffix", () => {
      const id = generateTestId();
      expect(id.length).toBe(17); // "hap_test_" + 8 chars
    });
  });

  describe("isTestId", () => {
    test("returns true for test IDs", () => {
      expect(isTestId("hap_test_abcd1234")).toBe(true);
      expect(isTestId(generateTestId())).toBe(true);
    });

    test("returns false for production IDs", () => {
      expect(isTestId("hap_abc123xyz456")).toBe(false);
      expect(isTestId(generateId())).toBe(false);
    });

    test("returns false for invalid IDs", () => {
      expect(isTestId("invalid")).toBe(false);
      expect(isTestId("hap_test_")).toBe(false);
      expect(isTestId("hap_test_toolong1234")).toBe(false);
    });
  });
});

describe("Claim Creation", () => {
  describe("createClaim", () => {
    test("creates valid claim with required fields", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet with handwritten cover letter",
        recipientName: "Acme Corp",
        domain: "acme.com",
        issuer: "ballista.jobs",
      });

      expect(claim.v).toBe("0.1");
      expect(claim.id).toMatch(ID_REGEX);
      expect(claim.method).toBe("ba_priority_mail");
      expect(claim.description).toBe("Priority mail packet with handwritten cover letter");
      expect(claim.to.name).toBe("Acme Corp");
      expect(claim.to.domain).toBe("acme.com");
      expect(claim.iss).toBe("ballista.jobs");
    });

    test("sets expiration when specified", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet",
        recipientName: "Acme Corp",
        issuer: "ballista.jobs",
        expiresInDays: 365,
      });

      expect(claim.exp).toBeDefined();
      const expDate = new Date(claim.exp!);
      const now = new Date();
      const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(364);
      expect(diffDays).toBeLessThan(366);
    });

    test("includes tier when specified", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet",
        recipientName: "Acme Corp",
        tier: "premium",
        issuer: "ballista.jobs",
      });

      expect(claim.tier).toBe("premium");
    });

    test("includes cost when specified", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet",
        recipientName: "Acme Corp",
        issuer: "ballista.jobs",
        cost: { amount: 1500, currency: "USD" },
      });

      expect(claim.cost).toEqual({ amount: 1500, currency: "USD" });
    });

    test("includes time when specified", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet",
        recipientName: "Acme Corp",
        issuer: "ballista.jobs",
        time: 1800,
      });

      expect(claim.time).toBe(1800);
    });

    test("includes physical when specified", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet",
        recipientName: "Acme Corp",
        issuer: "ballista.jobs",
        physical: true,
      });

      expect(claim.physical).toBe(true);
    });

    test("includes energy when specified", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet",
        recipientName: "Acme Corp",
        issuer: "ballista.jobs",
        energy: 150,
      });

      expect(claim.energy).toBe(150);
    });

    test("includes all effort dimensions", () => {
      const claim = createClaim({
        method: "ba_priority_mail",
        description: "Priority mail packet with handwritten cover letter",
        recipientName: "Acme Corp",
        domain: "acme.com",
        issuer: "ballista.jobs",
        tier: "standard",
        cost: { amount: 1500, currency: "USD" },
        time: 1800,
        physical: true,
        energy: 150,
      });

      expect(claim.method).toBe("ba_priority_mail");
      expect(claim.description).toBe("Priority mail packet with handwritten cover letter");
      expect(claim.cost).toEqual({ amount: 1500, currency: "USD" });
      expect(claim.time).toBe(1800);
      expect(claim.physical).toBe(true);
      expect(claim.energy).toBe(150);
    });

    test("handles claim without domain", () => {
      const claim = createClaim({
        method: "ba_standard_mail",
        description: "Standard mail packet",
        recipientName: "Acme Corp",
        issuer: "ballista.jobs",
      });

      expect(claim.to.name).toBe("Acme Corp");
      expect(claim.to.domain).toBeUndefined();
    });
  });
});

describe("Content Hashing", () => {
  describe("hashContent", () => {
    test("returns sha256: prefixed hash", async () => {
      const hash = await hashContent("hello world");
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test("produces consistent hashes", async () => {
      const hash1 = await hashContent("test content");
      const hash2 = await hashContent("test content");
      expect(hash1).toBe(hash2);
    });

    test("produces different hashes for different content", async () => {
      const hash1 = await hashContent("content 1");
      const hash2 = await hashContent("content 2");
      expect(hash1).not.toBe(hash2);
    });

    test("handles empty string", async () => {
      const hash = await hashContent("");
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test("handles unicode content", async () => {
      const hash = await hashContent("Hello 世界 🌍");
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });
});
