import { timingSafeEqual } from 'crypto';
import { lookup as dnsLookup } from 'dns/promises';
import { isIP } from 'net';

function ipv4ToInt(ip) {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return null;
  }
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function ipv4InCidr(ip, network, bits) {
  const value = ipv4ToInt(ip);
  const base = ipv4ToInt(network);
  if (value === null || base === null || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : ((0xffffffff << (32 - bits)) >>> 0);
  return (value & mask) === (base & mask);
}

function classifyIpv4(ip, allowPrivateTargets) {
  if (ipv4InCidr(ip, '127.0.0.0', 8)) return { blocked: true, reason: 'loopback IPv4 targets are not allowed' };
  if (ipv4InCidr(ip, '169.254.0.0', 16)) return { blocked: true, reason: 'link-local IPv4 targets are not allowed' };
  if (ipv4InCidr(ip, '0.0.0.0', 8)) return { blocked: true, reason: 'unspecified IPv4 targets are not allowed' };
  if (ipv4InCidr(ip, '224.0.0.0', 4)) return { blocked: true, reason: 'multicast/broadcast IPv4 targets are not allowed' };
  if (ipv4InCidr(ip, '240.0.0.0', 4)) return { blocked: true, reason: 'reserved IPv4 targets are not allowed' };

  const privateRanges = [
    ['10.0.0.0', 8],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
    ['100.64.0.0', 10],
  ];
  if (!allowPrivateTargets && privateRanges.some(([network, bits]) => ipv4InCidr(ip, network, bits))) {
    return { blocked: true, reason: 'private IPv4 targets are disabled by policy' };
  }

  return { blocked: false };
}

function classifyIpv6(host, allowPrivateTargets) {
  const value = host.toLowerCase();
  if (value === '::1') return { blocked: true, reason: 'loopback IPv6 targets are not allowed' };
  if (value === '::') return { blocked: true, reason: 'unspecified IPv6 targets are not allowed' };
  if (value.startsWith('ff')) return { blocked: true, reason: 'multicast IPv6 targets are not allowed' };
  if (value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) {
    return { blocked: true, reason: 'link-local IPv6 targets are not allowed' };
  }
  if (!allowPrivateTargets && (value.startsWith('fc') || value.startsWith('fd'))) {
    return { blocked: true, reason: 'private IPv6 targets are disabled by policy' };
  }
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length);
    if (isIP(mapped) === 4) return classifyIpv4(mapped, allowPrivateTargets);
  }
  return { blocked: false };
}

function normalizeHostname(rawHostname) {
  return String(rawHostname ?? '').trim().toLowerCase().replace(/^\[(.*)\]$/, '$1');
}

function classifyResolvedAddress(address, allowPrivateTargets) {
  const ipType = isIP(address);
  if (ipType === 4) return classifyIpv4(address, allowPrivateTargets);
  if (ipType === 6) return classifyIpv6(address, allowPrivateTargets);
  return { blocked: true, reason: 'hostname resolved to a non-IP address' };
}

export function secureTokenEquals(expectedToken, providedToken) {
  const expected = String(expectedToken ?? '').trim();
  const provided = String(providedToken ?? '').trim();
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function validateWebhookTargetUrl(rawUrl, { allowPrivateTargets = true } = {}) {
  const url = String(rawUrl ?? '').trim();
  if (!url) return { ok: false, error: 'targetUrl is required' };

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'targetUrl must be a valid http/https URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'targetUrl must use http or https' };
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) return { ok: false, error: 'targetUrl must include a hostname' };
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { ok: false, error: 'localhost webhook targets are not allowed' };
  }

  const ipType = isIP(hostname);
  if (ipType === 4) {
    const rule = classifyIpv4(hostname, allowPrivateTargets);
    if (rule.blocked) return { ok: false, error: rule.reason };
  } else if (ipType === 6) {
    const rule = classifyIpv6(hostname, allowPrivateTargets);
    if (rule.blocked) return { ok: false, error: rule.reason };
  }

  return { ok: true, normalizedUrl: parsed.toString() };
}

export async function resolveAndValidateWebhookTarget(rawUrl, {
  allowPrivateTargets = true,
  lookup = dnsLookup,
} = {}) {
  const baseValidation = validateWebhookTargetUrl(rawUrl, { allowPrivateTargets });
  if (!baseValidation.ok) return baseValidation;

  const parsed = new URL(baseValidation.normalizedUrl);
  const hostname = normalizeHostname(parsed.hostname);
  const directIpType = isIP(hostname);

  if (directIpType === 4 || directIpType === 6) {
    return { ok: true, normalizedUrl: baseValidation.normalizedUrl, resolvedAddresses: [hostname] };
  }

  let answers;
  try {
    answers = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: `Could not resolve webhook hostname: ${hostname}` };
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return { ok: false, error: `Could not resolve webhook hostname: ${hostname}` };
  }

  const resolvedAddresses = [];
  for (const answer of answers) {
    const address = String(answer?.address ?? '').trim();
    if (!address) {
      return { ok: false, error: 'Could not resolve webhook hostname to an IP address' };
    }
    const classification = classifyResolvedAddress(address, allowPrivateTargets);
    if (classification.blocked) {
      return { ok: false, error: `${classification.reason} (${address})` };
    }
    resolvedAddresses.push(address);
  }

  return {
    ok: true,
    normalizedUrl: baseValidation.normalizedUrl,
    resolvedAddresses,
  };
}
