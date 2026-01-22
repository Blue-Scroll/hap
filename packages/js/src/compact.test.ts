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
import { Claim } from "./types";

describe("HAP Compact Format", () => {
  const sampleClaim: Claim = {
    v: "0.1",
    id: "hap_abc123xyz456",
    method: "ba_priority_mail",
    description: "Priority mail packet with handwritten cover letter",
    to: {
      name: "Acme Corp",
      domain: "acme.com",
    },
    at: "2026-01-19T06:00:00.000Z",
    exp: "2028-01-19T06:00:00.000Z",
    iss: "ballista.jobs",
    cost: { amount: 1500, currency: "USD" },
    time: 1800,
    physical: true,
  };

  const sampleSignature = new Uint8Array(64).fill(42); // Mock 64-byte signature

  describe("encodeCompact", () => {
    test("produces valid format with 9 fields", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const parts = compact.split(".");
      expect(parts.length).toBe(9);
      expect(compact).toMatch(
        /^HAP1\.[^.]+\.[^.]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/
      );
    });

    test("encodes claim fields correctly", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const parts = compact.split(".");

      expect(parts[0]).toBe("HAP1");
      expect(parts[1]).toBe("hap_abc123xyz456");
      expect(parts[2]).toBe("ba_priority_mail");
      expect(decodeURIComponent(parts[3])).toBe("Acme Corp");
      expect(decodeURIComponent(parts[4])).toBe("acme.com");
      expect(decodeURIComponent(parts[7])).toBe("ballista.jobs");
    });

    test("URL-encodes recipient names with spaces", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      expect(compact).toContain("Acme%20Corp");
    });

    test("handles claims without expiration", () => {
      const claimNoExp: Claim = {
        v: "0.1",
        id: "hap_abc123xyz456",
        method: "ba_priority_mail",
        description: "Priority mail packet",
        to: { name: "Acme Corp", domain: "acme.com" },
        at: "2026-01-19T06:00:00.000Z",
        iss: "ballista.jobs",
      };

      const compact = encodeCompact(claimNoExp, sampleSignature);
      const parts = compact.split(".");
      expect(parts[6]).toBe("0"); // exp field should be 0
    });

    test("handles claims without domain", () => {
      const claimNoDomain: Claim = {
        ...sampleClaim,
        to: { name: "Acme Corp" },
      };

      const compact = encodeCompact(claimNoDomain, sampleSignature);
      const parts = compact.split(".");
      expect(parts[4]).toBe(""); // domain field should be empty
    });

    test("does not include effort dimensions in compact format", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      // Compact format should not contain effort dimensions
      expect(compact).not.toContain("1500"); // cost amount
      expect(compact).not.toContain("1800"); // time (unless it coincidentally matches a timestamp)
    });
  });

  describe("decodeCompact", () => {
    test("round-trips correctly", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const decoded = decodeCompact(compact);

      expect(decoded.claim.id).toBe(sampleClaim.id);
      expect(decoded.claim.method).toBe(sampleClaim.method);
      expect(decoded.claim.iss).toBe(sampleClaim.iss);
      expect(decoded.signature).toEqual(sampleSignature);
    });

    test("handles URL-encoded recipient names", () => {
      const compact =
        "HAP1.hap_abc123xyz456.ba_priority_mail.Acme%20Corp.acme%2Ecom.1737270000.1800342000.ballista%2Ejobs.KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg";
      const decoded = decodeCompact(compact);

      expect(decoded.claim.to.name).toBe("Acme Corp");
      expect(decoded.claim.to.domain).toBe("acme.com");
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

    test("decoded claim has empty description", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const decoded = decodeCompact(compact);

      // Compact format doesn't include description
      expect(decoded.claim.description).toBe("");
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
      expect(
        isValidCompact("HAP2.hap_xxx.method.name.domain.123.456.iss.sig")
      ).toBe(false);
    });
  });

  describe("buildCompactPayload", () => {
    test("builds payload without signature", () => {
      const payload = buildCompactPayload(sampleClaim);
      const parts = payload.split(".");

      expect(parts.length).toBe(8); // No signature
      expect(parts[0]).toBe("HAP1");
    });

    test("payload matches first 8 fields of compact string", () => {
      const compact = encodeCompact(sampleClaim, sampleSignature);
      const payload = buildCompactPayload(sampleClaim);

      const compactParts = compact.split(".");
      const payloadParts = payload.split(".");

      for (let i = 0; i < 8; i++) {
        expect(payloadParts[i]).toBe(compactParts[i]);
      }
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

  describe("various method identifiers", () => {
    test("encodes claims with different VA methods", () => {
      const methods = [
        "ba_priority_mail",
        "ba_standard_mail",
        "vi_video_30",
        "pa_tech_assessment",
        "x-custom-method",
      ];

      for (const method of methods) {
        const claim: Claim = {
          v: "0.1",
          id: "hap_abc123xyz456",
          method,
          description: `Test ${method}`,
          to: { name: "Test Corp", domain: "test.com" },
          at: "2026-01-19T06:00:00.000Z",
          iss: "ballista.jobs",
        };

        const compact = encodeCompact(claim, sampleSignature);
        expect(isValidCompact(compact)).toBe(true);

        const decoded = decodeCompact(compact);
        expect(decoded.claim.method).toBe(method);
      }
    });
  });
});
