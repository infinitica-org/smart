/**
 * Anonymous browsing: homepage -> catalog listing -> catalog detail -> related
 * content. Protocol-level (see README "browser vs protocol testing") — this
 * measures server response, not client hydration.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { timedGet, thinkTime } from '../helpers/http.js';
import { frontendLatency, apiLatency } from '../helpers/metrics.js';

const FALLBACK_TRACK_CODE = 'TECH_FULLSTACK';

export function browsingScenario() {
  // GET homepage (web-student — busiest of the five apps)
  timedGet(`${urls.student}/`, frontendLatency, 'browsing_homepage');
  sleep(thinkTime());

  // GET listing/search page (catalog is the one real public "browse" endpoint
  // this repo has — see scenarios/catalog-search.js for the authenticated
  // free-text search endpoint, a different real endpoint)
  const listing = timedGet(
    `${urls.api}${API_PREFIX}/catalog/tracks`,
    apiLatency,
    'browsing_catalog_list',
  );
  sleep(thinkTime());

  // GET detail page — pick a real track code from the listing when possible
  // rather than assuming one exists.
  let trackCode = FALLBACK_TRACK_CODE;
  try {
    const tracks = JSON.parse(listing.body);
    if (Array.isArray(tracks) && tracks.length > 0 && tracks[0].code) trackCode = tracks[0].code;
  } catch {
    // Keep fallback — a parse failure here is a browsing-scenario data issue,
    // not a reason to abort the whole iteration.
  }
  timedGet(
    `${urls.api}${API_PREFIX}/catalog/tracks/${trackCode}`,
    apiLatency,
    'browsing_catalog_detail',
  );
  sleep(thinkTime());

  // GET related content — the public certificate-verification app's
  // homepage, a genuinely different, genuinely public surface.
  timedGet(`${urls.verify}/`, frontendLatency, 'browsing_verify_homepage');
  sleep(thinkTime());
}
