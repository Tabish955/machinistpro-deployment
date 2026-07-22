// Client-side signal collection. Not the trust boundary — server re-hashes with IP+UA+pepper.
// Combines multiple hard-to-spoof signals to make casual bypass (clearing localStorage,
// incognito mode, changing browsers) ineffective.
export interface DeviceSignals {
  screen: string; tz: string; lang: string; platform: string;
  hardware: string; canvas: string; webgl: string; fonts: string;
}

function canvasHash(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240; c.height = 60;
    const ctx = c.getContext("2d");
    if (!ctx) return "n/a";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60"; ctx.fillRect(10, 10, 100, 30);
    ctx.fillStyle = "#069"; ctx.fillText("MachinistPro-fp", 12, 15);
    ctx.strokeStyle = "rgba(120,180,220,0.7)"; ctx.arc(50, 30, 20, 0, Math.PI * 2); ctx.stroke();
    return c.toDataURL().slice(-96);
  } catch { return "err"; }
}

function webglHash(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "no-webgl";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}`.slice(0, 200);
  } catch { return "err"; }
}

function fontsHash(): string {
  const test = ["Arial", "Helvetica", "Times", "Courier", "Verdana", "Georgia", "Comic Sans MS", "Impact"];
  const found: string[] = [];
  const baseline = document.createElement("span");
  baseline.style.font = "72px monospace"; baseline.textContent = "mmmmmmmmmm";
  document.body.appendChild(baseline);
  const bw = baseline.offsetWidth;
  for (const f of test) {
    const s = document.createElement("span");
    s.style.font = `72px '${f}', monospace`; s.textContent = "mmmmmmmmmm";
    document.body.appendChild(s);
    if (s.offsetWidth !== bw) found.push(f);
    document.body.removeChild(s);
  }
  document.body.removeChild(baseline);
  return found.join(",");
}

export async function collectSignals(): Promise<DeviceSignals> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    lang: navigator.languages?.join(",").slice(0, 32) || navigator.language,
    platform: navigator.platform,
    hardware: `${navigator.hardwareConcurrency || 0}c/${nav.deviceMemory || 0}g`,
    canvas: canvasHash(),
    webgl: webglHash(),
    fonts: fontsHash(),
  };
}
