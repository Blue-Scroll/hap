/**
 * Tests for HAP signing functions
 */

import { describe, test, expect } from "vitest";
import {
  generateHapId,
  generateTestHapId,
  isTestHapId,
  createHumanEffortClaim,
  createPhysicalDeliveryClaim,
  createFinancialCommitmentClaim,
  createContentAttestationClaim,
  hashContent,
} from "./sign";
import { HAP_ID_REGEX, HAP_TEST_ID_REGEX } from "./types";

describe("HAP ID Generation", () => {
  describe("generateHapId", () => {
    test("generates valid HAP ID format", () => {
      const id = generateHapId();
      expect(id).toMatch(HAP_ID_REGEX);
    });

    test("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateHapId());
      }
      expect(ids.size).toBe(100);
    });

    test("starts with hap_", () => {
      const id = generateHapId();
      expect(id.startsWith("hap_")).toBe(true);
    });

    test("has 12 character suffix", () => {
      const id = generateHapId();
      expect(id.length).toBe(16); // "hap_" + 12 chars
    });
  });

  describe("generateTestHapId", () => {
    test("generates valid test HAP ID format", () => {
      const id = generateTestHapId();
      expect(id).toMatch(HAP_TEST_ID_REGEX);
    });

    test("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTestHapId());
      }
      expect(ids.size).toBe(100);
    });

    test("starts with hap_test_", () => {
      const id = generateTestHapId();
      expect(id.startsWith("hap_test_")).toBe(true);
    });

    test("has 8 character suffix", () => {
      const id = generateTestHapId();
      expect(id.length).toBe(17); // "hap_test_" + 8 chars
    });
  });

  describe("isTestHapId", () => {
    test("returns true for test IDs", () => {
      expect(isTestHapId("hap_test_abcd1234")).toBe(true);
      expect(isTestHapId(generateTestHapId())).toBe(true);
    });

    test("returns false for production IDs", () => {
      expect(isTestHapId("hap_abc123xyz456")).toBe(false);
      expect(isTestHapId(generateHapId())).toBe(false);
    });

    test("returns false for invalid IDs", () => {
      expect(isTestHapId("invalid")).toBe(false);
      expect(isTestHapId("hap_test_")).toBe(false);
      expect(isTestHapId("hap_test_toolong1234")).toBe(false);
    });
  });
});

describe("Claim Creation", () => {
  describe("createHumanEffortClaim", () => {
    test("creates valid human_effort claim", () => {
      const claim = createHumanEffortClaim({
        method: "physical_mail",
        recipientName: "Acme Corp",
        domain: "acme.com",
        issuer: "ballista.jobs",
      });

      expect(claim.type).toBe("human_effort");
      expect(claim.v).toBe("0.1");
      expect(claim.id).toMatch(HAP_ID_REGEX);
      expect((claim as { method: string }).method).toBe("physical_mail");
      expect((claim as { to: { name: string } }).to.name).toBe("Acme Corp");
    });

    test("sets expiration when specified", () => {
      const claim = createHumanEffortClaim({
        method: "physical_mail",
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
  });

  describe("createPhysicalDeliveryClaim", () => {
    test("creates valid physical_delivery claim", () => {
      const claim = createPhysicalDeliveryClaim({
        method: "physical_mail",
        recipientName: "Acme Corp",
        domain: "acme.com",
        issuer: "ballista.jobs",
      });

      expect(claim.type).toBe("physical_delivery");
      expect(claim.v).toBe("0.1");
      expect(claim.id).toMatch(HAP_ID_REGEX);
    });

    test("includes tier when specified", () => {
      const claim = createPhysicalDeliveryClaim({
        method: "physical_mail",
        recipientName: "Acme Corp",
        tier: "premium",
        issuer: "ballista.jobs",
      });

      expect((claim as { tier?: string }).tier).toBe("premium");
    });
  });

  describe("createFinancialCommitmentClaim", () => {
    test("creates valid financial_commitment claim", () => {
      const claim = createFinancialCommitmentClaim({
        method: "payment",
        recipientName: "Acme Corp",
        domain: "acme.com",
        issuer: "ballista.jobs",
      });

      expect(claim.type).toBe("financial_commitment");
      expect((claim as { method: string }).method).toBe("payment");
    });
  });

  describe("createContentAttestationClaim", () => {
    test("creates valid content_attestation claim", () => {
      const claim = createContentAttestationClaim({
        method: "truthfulness_confirmation",
        recipientName: "Acme Corp",
        domain: "acme.com",
        issuer: "ballista.jobs",
      });

      expect(claim.type).toBe("content_attestation");
      expect((claim as { method: string }).method).toBe("truthfulness_confirmation");
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
