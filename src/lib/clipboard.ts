/**
 * Copy text to the clipboard and report whether it actually happened.
 *
 * The pattern this replaces — `navigator.clipboard?.writeText(text)` followed
 * by an unconditional success tick — lies in two separate ways. Outside a
 * secure context `navigator.clipboard` is undefined, so the optional call does
 * nothing whatsoever; and where it does exist `writeText` returns a promise
 * that rejects when permission is refused or the document is not focused, and
 * nothing was awaiting it. Either way the caller reported success and the user
 * went on to paste whatever had been on the clipboard beforehand.
 *
 * That matters most for a generated program: the operator believes they hold
 * the blocks on screen and pastes something else into the control.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission refused or the document was not focused. Fall through and try
    // the legacy path rather than reporting a success that did not happen.
  }

  // execCommand is deprecated, but it is the only route available on a plain
  // http:// origin — which is how a shop terminal on the local network usually
  // reaches this app, and exactly where the modern API is missing.
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
