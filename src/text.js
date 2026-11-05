// Text helpers: cleaning documents before Claude sees them, and comparing quotes.

// Hidden text is a common way to smuggle instructions to AI tools: HTML comments,
// zero-width characters and invisible HTML. Threadline removes it and says so.
export function removeHidden(text) {
  let found = 0;
  const out = String(text)
    .replace(/<!--[\s\S]*?-->/g, () => (found++, ""))
    .replace(/<([a-z]+)[^>]*style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, () => (found++, ""))
    .replace(/[​-‍⁠﻿]/g, () => (found++, ""));
  return { text: out, hidden: found };
}

function luhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

// Secrets and payment details never reach Claude or the notes.
export function redact(text) {
  let count = 0;
  const hit = (label) => () => (count++, `[redacted ${label}]`);
  const out = String(text)
    .replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, hit("IBAN"))
    .replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => (luhn(m.replace(/\D/g, "")) ? (count++, "[redacted card number]") : m))
    .replace(/\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,}|lin_api_[A-Za-z0-9]{20,})\b/g, hit("key"))
    .replace(/((?:password|passcode|pin|contraseña|senha)\s*[:=]\s*)\S+/gi, (_, p) => (count++, `${p}[redacted]`));
  return { text: out, redacted: count };
}

export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

// For comparing a quote with its document: ignore case, spacing, quote styles and markdown marks.
export function normalizeForMatch(s) {
  return String(s || "")
    .normalize("NFC")
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const quoteIsIn = (quote, text) => {
  const q = normalizeForMatch(quote);
  return q.length >= 4 && normalizeForMatch(text).includes(q);
};

// "Sofía Medina" -> "sofia medina" for matching names; "sofia-medina" for ids.
export const nameKey = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const slug = (s) => nameKey(s).replace(/ /g, "-").slice(0, 80) || "note";
