import { useState, useEffect } from 'react';

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/havuq/homechronicle/releases?per_page=10';
const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const DISMISS_KEY = 'hc_update_dismissed';

// ---------------------------------------------------------------------------
// Semver comparison — supports v0.1.3, v0.1.3-beta.5, etc.
// ---------------------------------------------------------------------------

function parseVersion(tag) {
  const m = tag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.?(\d+)?)?/i);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ?? null,          // "beta" or null
    preNum: m[5] != null ? Number(m[5]) : null,
  };
}

/** Returns true if `a` is strictly newer than `b`. */
function isNewer(a, b) {
  if (!a || !b) return false;
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  if (a.patch !== b.patch) return a.patch > b.patch;
  // Same major.minor.patch — compare pre-release
  // stable > beta, beta.6 > beta.5
  if (a.pre && !b.pre) return false;  // beta is NOT newer than stable
  if (!a.pre && b.pre) return true;   // stable IS newer than beta
  if (a.pre && b.pre) {
    if (a.pre !== b.pre) return a.pre > b.pre;
    return (a.preNum ?? 0) > (b.preNum ?? 0);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUpdateCheck(currentBuild) {
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.localStorage.getItem('hc_disable_update_check') === 'true') return undefined;

    const currentVersion = parseVersion(currentBuild);

    async function check() {
      try {
        const res = await fetch(GITHUB_RELEASES_URL);
        if (!res.ok) return;
        const releases = await res.json();
        if (!Array.isArray(releases) || releases.length === 0) return;

        // Determine if the current build is a pre-release (beta)
        const runningBeta = currentVersion?.pre != null;

        // Find the latest release the user should care about:
        // - If running a beta, consider both stable and beta releases
        // - If running stable, only consider stable releases
        let candidate = null;
        for (const release of releases) {
          const ver = parseVersion(release.tag_name);
          if (!ver) continue;
          if (!runningBeta && ver.pre) continue; // stable users skip betas
          if (!candidate || isNewer(ver, candidate.version)) {
            candidate = { version: ver, release };
          }
        }

        if (!candidate) return;

        if (isNewer(candidate.version, currentVersion)) {
          const tag = candidate.release.tag_name;
          // Check if user already dismissed this exact version
          try {
            if (window.localStorage.getItem(DISMISS_KEY) === tag) return;
          } catch { /* ignore */ }

          setUpdate({
            tag,
            url: candidate.release.html_url,
            isPrerelease: candidate.release.prerelease,
            publishedAt: candidate.release.published_at,
          });
        } else {
          setUpdate(null);
        }
      } catch {
        // Silently fail — update checks are best-effort
      }
    }

    check();
    const timer = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, [currentBuild]);

  function dismiss() {
    if (update?.tag) {
      try { window.localStorage.setItem(DISMISS_KEY, update.tag); } catch { /* ignore */ }
    }
    setUpdate(null);
  }

  return { update, dismiss };
}
