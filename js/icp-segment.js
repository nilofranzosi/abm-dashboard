/**
 * PxIcpSegment — single source of truth for reading/writing the currently
 * selected ICP segment (EMBARCADOR | TRANSPORTADORA) in the browser.
 *
 * No other file should hand-roll localStorage/query-param handling for the
 * segment — always go through window.PxIcpSegment.
 *
 * Threat model note (T-27-01): getIcpSegment() treats the `?icp=` query
 * param as untrusted input. It is only ever persisted/returned if it is a
 * member of VALID; anything else falls through to the existing
 * localStorage value or the EMBARCADOR default. setIcpSegment() enforces
 * the same whitelist before writing to localStorage.
 */
(function (window) {
  "use strict";

  var STORAGE_KEY = "pxIcpSegment";
  var DEFAULT_SEGMENT = "EMBARCADOR";

  var VALID = ["EMBARCADOR", "TRANSPORTADORA"];

  var LABELS = {
    EMBARCADOR: "Embarcador",
    TRANSPORTADORA: "Transportadora"
  };

  function isValid(segment) {
    return VALID.indexOf(segment) !== -1;
  }

  function readStoredSegment() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return isValid(stored) ? stored : null;
    } catch (err) {
      return null;
    }
  }

  function writeStoredSegment(segment) {
    try {
      window.localStorage.setItem(STORAGE_KEY, segment);
    } catch (err) {
      // localStorage unavailable (private mode, disabled, etc.) — no-op.
    }
  }

  function readUrlSegment() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = params.get("icp");
      return isValid(fromUrl) ? fromUrl : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Reads the current ICP segment. Precedence: valid `?icp=` query param
   * (persisted to localStorage as a side effect) > valid stored value >
   * DEFAULT_SEGMENT.
   */
  function getIcpSegment() {
    var fromUrl = readUrlSegment();
    if (fromUrl) {
      writeStoredSegment(fromUrl);
      return fromUrl;
    }

    var stored = readStoredSegment();
    if (stored) return stored;

    return DEFAULT_SEGMENT;
  }

  /**
   * Persists `segment` as the active ICP segment. Invalid values are
   * silently ignored — this is the whitelist boundary referenced in the
   * threat model (T-27-01/T-27-02).
   */
  function setIcpSegment(segment) {
    if (!isValid(segment)) return;
    writeStoredSegment(segment);
  }

  /** Appends `?icp=` or `&icp=` (whichever separator is correct) to `path`. */
  function withIcpParam(path) {
    var segment = getIcpSegment();
    var separator = path.indexOf("?") === -1 ? "?" : "&";
    return path + separator + "icp=" + encodeURIComponent(segment);
  }

  /**
   * Renders two segment-switch buttons into `container`. Highlights the
   * active segment via a `.active` class. On click, persists the choice
   * then either calls `onChange(segment)` if provided, or reloads the page.
   */
  function renderIcpSwitcher(container, onChange) {
    if (!container) return;
    var current = getIcpSegment();

    container.innerHTML = "";

    VALID.forEach(function (segment) {
      var button = window.document.createElement("button");
      button.type = "button";
      button.textContent = LABELS[segment];
      button.className = "px-icp-switch-btn" + (segment === current ? " active" : "");
      button.setAttribute("data-icp-segment", segment);
      button.addEventListener("click", function () {
        setIcpSegment(segment);
        if (typeof onChange === "function") {
          onChange(segment);
        } else {
          window.location.reload();
        }
      });
      container.appendChild(button);
    });
  }

  window.PxIcpSegment = {
    VALID: VALID,
    LABELS: LABELS,
    getIcpSegment: getIcpSegment,
    setIcpSegment: setIcpSegment,
    withIcpParam: withIcpParam,
    renderIcpSwitcher: renderIcpSwitcher
  };
})(window);
