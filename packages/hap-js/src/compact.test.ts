/**
 * Tests for HAP Compact Format
 */

import { describe, test, expect } from "vitest";
import {
  encodeCompact,
  decodeCompact,
  isValidCompact,
  buildCompactPayload,
  generateVerificationUrl,
  extractCompactFromUrl,
} from "./compact";
import { HapClaim } from "./types";

describe("HAP Compact Format", () => {
  const sampleClaim: HapClaim = {
    v: "0.1",
    id: "hap_abc123xyz456",
    type: "human_effort",
    method: "physical_mail",
    to: {
      name: "Acme Corp",
      domain: "acme.com",
    },
    at: "2026-01-19T06:00:00.000Z",
    exp: "2028-01-19T06:00:00.000Z",
    iss: "ballista.jobs",
  };

  const sampleSignature = new Uint8Array(64).fill(42); // Mock 64-byte signature

  describe("encodeCompact", () => {
    test("produces valid format", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      expect(compact).toMatch(
        /^HAP1\.[^.]+\.[^.]+\.[^.]+\.[^.]+\.[^.]+\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/
      );
    });

    test("encodes claim fields correctly", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const parts = compact.split(".");

      expect(parts[0]).toBe("HAP1");
      expect(parts[1]).toBe("hap_abc123xyz456");
      expect(parts[2]).toBe("human_effort");
      expect(parts[3]).toBe("physical_mail");
      expect(decodeURIComponent(parts[4])).toBe("Acme Corp");
      expect(decodeURIComponent(parts[5])).toBe("acme.com");
      expect(decodeURIComponent(parts[8])).toBe("ballista.jobs");
    });

    test("URL-encodes recipient names with spaces", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      expect(compact).toContain("Acme%20Corp");
    });

    test("handles claims without expiration", () => {
      const claimNoExp: HapClaim = {
        v: "0.1",
        id: "hap_abc123xyz456",
        type: "human_effort",
        method: "physical_mail",
        to: { name: "Acme Corp", domain: "acme.com" },
        at: "2026-01-19T06:00:00.000Z",
        iss: "ballista.jobs",
      };

      const compact = encodeCompact(claimNoExp, sampleSignature);
      const parts = compact.split(".");
      expect(parts[7]).toBe("0");
    });

    test("handles claims without domain", () => {
      const claimNoDomain: HapClaim = {
        ...sampleClaim,
        to: { name: "Acme Corp" },
      };

      const compact = encodeCompact(claimNoDomain, sampleSignature);
      const parts = compact.split(".");
      expect(parts[5]).toBe("");
    });
  });

  describe("decodeCompact", () => {
    test("round-trips correctly", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const decoded = decodeCompact(compact);

      expect(decoded.claim.id).toBe(sampleClaim.id);
      expect(decoded.claim.type).toBe(sampleClaim.type);
      expect(decoded.claim.iss).toBe(sampleClaim.iss);
      expect(decoded.signature).toEqual(sampleSignature);
    });

    test("handles URL-encoded recipient names", () => {
      const compact =
        "HAP1.hap_abc123xyz456.human_effort.physical_mail.Acme%20Corp.acme%2Ecom.1737270000.1800342000.ballista%2Ejobs.KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg";
      const decoded = decodeCompact(compact);

      expect((decoded.claim as { to: { name: string } }).to.name).toBe(
        "Acme Corp"
      );
      expect((decoded.claim as { to: { domain?: string } }).to.domain).toBe(
        "acme.com"
      );
      expect(decoded.claim.iss).toBe("ballista.jobs");
    });

    test("decodes timestamps correctly", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const decoded = decodeCompact(compact);

      // Timestamps should be close (within a second due to conversion)
      const originalAt = new Date(sampleClaim.at).getTime();
      const decodedAt = new Date(decoded.claim.at).getTime();
      expect(Math.abs(originalAt - decodedAt)).toBeLessThan(1000);
    });

    test("throws on invalid format", () => {
      expect(() => decodeCompact("invalid")).toThrow("Invalid HAP Compact format");
      expect(() => decodeCompact("HAP2.xxx")).toThrow("Invalid HAP Compact format");
      expect(() => decodeCompact("HAP1.too.few.fields")).toThrow(
        "Invalid HAP Compact format"
      );
    });
  });

  describe("isValidCompact", () => {
    test("returns true for valid compact strings", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      expect(isValidCompact(compact)).toBe(true);
    });

    test("returns false for invalid formats", () => {
      expect(isValidCompact("invalid")).toBe(false);
      expect(isValidCompact("HAP2.xxx")).toBe(false);
      expect(isValidCompact("HAP1.too.few.fields")).toBe(false);
      expect(isValidCompact("")).toBe(false);
    });

    test("returns false for wrong version", () => {
      expect(isValidCompact("HAP2.hap_xxx.type.method.name.domain.123.456.iss.sig")).toBe(
        false
      );
    });
  });

  describe("buildCompactPayload", () => {
    test("builds payload without signature", () => {
      const payload = buildCompactPayload(sampleClaim);
      const parts = payload.split(".");

      expect(parts.length).toBe(9); // No signature
      expect(parts[0]).toBe("HAP1");
      expect(payload).not.toContain(sampleSignature);
    });
  });

  describe("generateVerificationUrl", () => {
    test("creates URL with compact claim", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const url = generateVerificationUrl("https://ballista.jobs/v", compact);

      expect(url).toContain("https://ballista.jobs/v?c=");
      expect(url).toContain(encodeURIComponent(compact));
    });
  });

  describe("extractCompactFromUrl", () => {
    test("extracts compact claim from URL", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const url = generateVerificationUrl("https://ballista.jobs/v", compact);

      const extracted = extractCompactFromUrl(url);
      expect(extracted).toBe(compact);
    });

    test("returns null for URL without compact param", () => {
      expect(extractCompactFromUrl("https://ballista.jobs/v/hap_xxx")).toBeNull();
    });

    test("returns null for invalid URL", () => {
      expect(extractCompactFromUrl("not a url")).toBeNull();
    });

    test("returns null for invalid compact in URL", () => {
      expect(
        extractCompactFromUrl("https://ballista.jobs/v?c=invalid")
      ).toBeNull();
    });
  });

  describe("recipient_commitment claims", () => {
    const commitmentClaim: HapClaim = {
      v: "0.1",
      id: "hap_rcp123abc456",
      type: "recipient_commitment",
      recipient: {
        name: "Test Corp",
        domain: "test.com",
      },
      commitment: "review_verified",
      at: "2026-01-19T06:00:00.000Z",
      iss: "ballista.jobs",
    };

    test("encodes recipient_commitment correctly", () => {
      const compact = encodeCompact(commitmentClaim, sampleSignature);
      const parts = compact.split(".");

      expect(parts[2]).toBe("recipient_commitment");
      expect(parts[3]).toBe("review_verified");
      expect(decodeURIComponent(parts[4])).toBe("Test Corp");
    });

    test("round-trips recipient_commitment", () => {
      const compact = encodeCompact(commitmentClaim, sampleSignature);
      const decoded = decodeCompact(compact);

      expect(decoded.claim.type).toBe("recipient_commitment");
      expect((decoded.claim as { commitment: string }).commitment).toBe(
        "review_verified"
      );
    });
  });

  describe("new claim types", () => {
    test("encodes physical_delivery claims", () => {
      const claim: HapClaim = {
        v: "0.1",
        id: "hap_phd123abc456",
        type: "physical_delivery",
        method: "physical_mail",
        to: { name: "Test Corp", domain: "test.com" },
        at: "2026-01-19T06:00:00.000Z",
        iss: "ballista.jobs",
      };

      const compact = encodeCompact(claim, sampleSignature);
      expect(isValidCompact(compact)).toBe(true);

      const decoded = decodeCompact(compact);
      expect(decoded.claim.type).toBe("physical_delivery");
    });

    test("encodes financial_commitment claims", () => {
      const claim: HapClaim = {
        v: "0.1",
        id: "hap_fin123abc456",
        type: "financial_commitment",
        method: "payment",
        to: { name: "Test Corp", domain: "test.com" },
        at: "2026-01-19T06:00:00.000Z",
        iss: "ballista.jobs",
      };

      const compact = encodeCompact(claim, sampleSignature);
      expect(isValidCompact(compact)).toBe(true);

      const decoded = decodeCompact(compact);
      expect(decoded.claim.type).toBe("financial_commitment");
    });

    test("encodes content_attestation claims", () => {
      const claim: HapClaim = {
        v: "0.1",
        id: "hap_att123abc456",
        type: "content_attestation",
        method: "truthfulness_confirmation",
        to: { name: "Test Corp", domain: "test.com" },
        at: "2026-01-19T06:00:00.000Z",
        iss: "ballista.jobs",
      };

      const compact = encodeCompact(claim, sampleSignature);
      expect(isValidCompact(compact)).toBe(true);

      const decoded = decodeCompact(compact);
      expect(decoded.claim.type).toBe("content_attestation");
    });
  });
});
