import html2canvas from "html2canvas";

const DEFAULT_SCALE = 2;
const DEFAULT_MAX_CANVAS_PIXELS = 32_000_000;
const DEFAULT_MAX_CANVAS_DIMENSION = 8_192;
const DEFAULT_READY_TIMEOUT_MS = 15_000;
const IMAGE_DECODE_SETTLE_TIMEOUT_MS = 750;
const NATIVE_DOWNLOAD_URL_RELEASE_DELAY_MS = 30_000;
const DEFAULT_CAPTURE_BACKGROUND_COLOR = "#101c2a";
const CLONE_LAYOUT_SETTLE_TIMEOUT_MS = 250;
const NEXT_PAINT_SETTLE_TIMEOUT_MS = 250;

/** The small, documented portion of SteamClient used by this WebKit page. */
interface SteamBrowserDownloadService {
  StartDownload(url: string): void;
}

interface SteamDownloadWindow extends Window {
  readonly URL: typeof URL;
  readonly SteamClient?: {
    readonly Browser?: SteamBrowserDownloadService;
  };
}

export interface DashboardPngExportOptions {
  /** The suggested filename for the browser download. A .png suffix is added when needed. */
  readonly filename?: string;
  /**
   * The solid output-canvas background. Passing `null` intentionally preserves
   * transparency; the default is Steam Wrapped's dark page color.
   */
  readonly backgroundColor?: string | null;
  /** Requested output scale before the memory and dimension limits are applied. */
  readonly scale?: number;
  /** Maximum number of output canvas pixels retained during rendering. */
  readonly maxCanvasPixels?: number;
  /** Maximum width or height of the output canvas in device pixels. */
  readonly maxCanvasDimension?: number;
  /** Maximum time to wait for visible images and document fonts to settle. */
  readonly readyTimeoutMs?: number;
}

export interface DashboardPngExportResult {
  readonly filename: string;
  /** The exact CSS-pixel bounds captured from the supplied element. */
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  /** The final, memory-safe rendering scale. */
  readonly scale: number;
  readonly outputWidth: number;
  readonly outputHeight: number;
  readonly byteLength: number;
}

/** A clear, user-displayable failure for an otherwise recoverable export. */
export class DashboardPngExportError extends Error {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message);
    this.name = "DashboardPngExportError";
    if (options?.cause !== undefined) {
      // `ErrorOptions.cause` is newer than the ES2020 target used by the
      // plugin. Keep the diagnostic available without relying on it.
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * Renders a dedicated dashboard container with html2canvas and starts a PNG
 * download through Steam's native Browser API. A regular anchor download is
 * retained only as a graceful fallback outside the Steam Store WebKit view.
 */
export class DashboardPngExporter {
  public async export(
    element: HTMLElement,
    options: DashboardPngExportOptions = {},
  ): Promise<DashboardPngExportResult> {
    const documentRef = element.ownerDocument;
    const windowRef = documentRef.defaultView;
    if (!windowRef || !documentRef.documentElement.contains(element)) {
      throw new DashboardPngExportError("The Steam Wrapped dashboard is no longer available to export.");
    }

    const readyTimeoutMs = positiveInteger(options.readyTimeoutMs, DEFAULT_READY_TIMEOUT_MS);
    const restoreImageLoading = prioritizeCaptureImages(element);
    let canvas: HTMLCanvasElement | undefined;
    try {
      await waitForCaptureReadiness(element, readyTimeoutMs);
      await waitForNextPaint(windowRef);

      const bounds = getCaptureBounds(element);
      const requestedScale = positiveNumber(options.scale, DEFAULT_SCALE);
      const scale = constrainScale(bounds, requestedScale, {
        maxCanvasPixels: positiveInteger(options.maxCanvasPixels, DEFAULT_MAX_CANVAS_PIXELS),
        maxCanvasDimension: positiveInteger(options.maxCanvasDimension, DEFAULT_MAX_CANVAS_DIMENSION),
      });
      const filename = normalizeFilename(options.filename);
      const backgroundColor = options.backgroundColor === undefined
        ? DEFAULT_CAPTURE_BACKGROUND_COLOR
        : options.backgroundColor;
      const capturePage = element.closest<HTMLElement>(".steam-wrapped-page");
      const restoreCloneFrameLayout = installHtml2CanvasFrameLayoutPatch(documentRef);
      try {
        canvas = await html2canvas(element, {
          allowTaint: false,
          backgroundColor,
          // Canvas rendering is more reliable than SVG foreignObject rendering
          // in the Steam CEF runtime.
          foreignObjectRendering: false,
          height: bounds.height,
          imageTimeout: readyTimeoutMs,
          logging: false,
          // Steam CDN artwork is cross-origin from the Store frame. html2canvas
          // must create CORS-safe image resources so toBlob remains available.
          useCORS: true,
          width: bounds.width,
          scrollX: windowRef.scrollX,
          scrollY: windowRef.scrollY,
          windowHeight: windowRef.innerHeight,
          windowWidth: windowRef.innerWidth,
          // html2canvas clones the whole Store document before it narrows to our
          // capture root. Steam's hidden preview videos and hidden fallback
          // artwork are unrelated to the summary and can be zero-sized in CEF.
          ignoreElements: (candidate) => shouldIgnoreDuringClone(candidate, capturePage),
          onclone: async (clonedDocument, clonedElement) => {
            await prepareClonedDashboard(clonedDocument, clonedElement, bounds);
          },
          scale,
        });
      } finally {
        restoreCloneFrameLayout();
      }

      const blob = await canvasToPngBlob(canvas);
      triggerBlobDownload(documentRef, windowRef, blob, filename);
      return {
        filename,
        sourceWidth: bounds.width,
        sourceHeight: bounds.height,
        scale,
        outputWidth: canvas.width,
        outputHeight: canvas.height,
        byteLength: blob.size,
      };
    } catch (cause) {
      if (cause instanceof DashboardPngExportError) {
        throw cause;
      }
      throw new DashboardPngExportError("Steam Wrapped could not create the PNG export.", { cause });
    } finally {
      restoreImageLoading();
      // The PNG Blob has already detached from the rendering canvas. Releasing
      // the backing store here matters for large high-resolution captures.
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
    }
  }
}

/** Convenience entry point for callers that do not need to retain an instance. */
export async function exportDashboardPng(
  element: HTMLElement,
  options?: DashboardPngExportOptions,
): Promise<DashboardPngExportResult> {
  return new DashboardPngExporter().export(element, options);
}

interface CaptureBounds {
  readonly width: number;
  readonly height: number;
}

function getCaptureBounds(element: HTMLElement): CaptureBounds {
  const rect = element.getBoundingClientRect();
  // scroll dimensions safeguard against a future dashboard section extending
  // beyond its visual box, while the normal case remains the exact element rect.
  const width = Math.ceil(Math.max(rect.width, element.scrollWidth));
  const height = Math.ceil(Math.max(rect.height, element.scrollHeight));
  if (width <= 0 || height <= 0 || element.getClientRects().length === 0) {
    throw new DashboardPngExportError("The dashboard must be visible before it can be exported.");
  }
  return { width, height };
}

async function waitForCaptureReadiness(element: HTMLElement, timeoutMs: number): Promise<void> {
  const documentRef = element.ownerDocument;
  await withTimeout(
    Promise.all([waitForFonts(documentRef), waitForVisibleImages(element)]).then(() => undefined),
    timeoutMs,
    "Timed out while waiting for Steam Wrapped images to finish loading.",
  );
}

async function waitForFonts(documentRef: Document): Promise<void> {
  // FontFaceSet is unavailable in older Steam CEF builds. In that case, the
  // browser has no richer readiness signal and rendering can proceed normally.
  if (!documentRef.fonts) {
    return;
  }
  await documentRef.fonts.ready;
}

async function waitForVisibleImages(element: HTMLElement): Promise<void> {
  const images = getVisibleImages(element);
  await Promise.all(images.map((image) => waitForImage(image)));
}

function prioritizeCaptureImages(element: HTMLElement): () => void {
  const previousLoading = new Map<HTMLImageElement, string | null>();
  for (const image of getVisibleImages(element)) {
    if (image.loading === "lazy") {
      previousLoading.set(image, image.getAttribute("loading"));
      image.setAttribute("loading", "eager");
    }
  }

  return () => {
    for (const [image, previous] of previousLoading) {
      if (previous === null) {
        image.removeAttribute("loading");
      } else {
        image.setAttribute("loading", previous);
      }
    }
  };
}

function getVisibleImages(element: HTMLElement): HTMLImageElement[] {
  return Array.from(element.querySelectorAll("img")).filter(isVisibleImage);
}

function isVisibleImage(image: HTMLImageElement): boolean {
  if (image.hidden || !image.currentSrc && !image.src) {
    return false;
  }
  const style = image.ownerDocument.defaultView?.getComputedStyle(image);
  return style?.display !== "none" && style?.visibility !== "hidden" && image.getClientRects().length > 0;
}

async function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    // decode() waits for pixels, rather than merely for the network request.
    // Failed/broken images deliberately resolve: their existing Steam-style
    // fallback remains part of the export instead of aborting the entire page.
    await decodeImage(image);
    return;
  }

  await new Promise<void>((resolve) => {
    const finish = (): void => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve();
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
  await decodeImage(image);
}

async function decodeImage(image: HTMLImageElement): Promise<void> {
  if (image.naturalWidth <= 0 || typeof image.decode !== "function") {
    return;
  }

  const windowRef = image.ownerDocument.defaultView;
  if (!windowRef) {
    return;
  }

  let timeout: number | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<void>((resolve) => {
        timeout = windowRef.setTimeout(resolve, IMAGE_DECODE_SETTLE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // Decoding can reject for a network race even after a successful load.
    // html2canvas will still use the image's currently available pixels.
  } finally {
    if (timeout !== undefined) {
      windowRef.clearTimeout(timeout);
    }
  }

  // Steam CEF can report a loaded image while leaving decode() pending. The
  // bounded wait above preserves a best-effort decode without blocking every
  // export until the overall readiness timeout expires.
}

function waitForNextPaint(windowRef: Window): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      windowRef.clearTimeout(timeout);
      resolve();
    };

    // Steam's Store CEF view can pause requestAnimationFrame while the page is
    // visible but not considered foreground by its compositor. The timeout is
    // deliberately only a fallback: a normal browser still gets two paints,
    // while CEF can continue to capture instead of leaving the button stuck
    // on "Exporting..." forever.
    const timeout = windowRef.setTimeout(finish, NEXT_PAINT_SETTLE_TIMEOUT_MS);
    windowRef.requestAnimationFrame(() => windowRef.requestAnimationFrame(finish));
  });
}

/**
 * html2canvas creates its document clone in a hidden iframe at -10000px.
 * Steam's CEF build treats that iframe as a non-layout surface, so every
 * cloned box becomes 0 x 0 before `onclone` can run. That makes otherwise
 * valid CSS gradients produce non-finite color stops during rasterization.
 *
 * Intercept html2canvas' transient layout nodes before insertion. Its clone
 * iframe must participate in layout, and its hidden font-measurement div must
 * not be caught by the page route's direct-body-child hiding rule. Both remain
 * imperceptible/non-interactive, then the original appendChild is restored as
 * soon as html2canvas has completed or rejected the render.
 */
function installHtml2CanvasFrameLayoutPatch(documentRef: Document): () => void {
  const body = documentRef.body;
  if (!body) {
    return () => undefined;
  }

  const originalOwnAppendChild = Object.getOwnPropertyDescriptor(body, "appendChild");
  const originalAppendChild = body.appendChild;
  const patchedAppendChild: typeof originalAppendChild = function appendChild<T extends Node>(
    this: Node,
    node: T,
  ): T {
    const isCloneFrame = isHtml2CanvasCloneFrame(node);
    if (isCloneFrame) {
      makeCloneFrameLayoutable(node);
    } else if (isHtml2CanvasFontMetricsContainer(node)) {
      makeFontMetricsContainerLayoutable(node);
    }

    const appended = originalAppendChild.call(this, node) as T;
    if (isCloneFrame) {
      suppressCloneFontReadiness(node);
    }
    return appended;
  };

  body.appendChild = patchedAppendChild;
  return () => {
    // Avoid clobbering another owner if a host script replaced this method
    // while html2canvas was in flight.
    if (body.appendChild === patchedAppendChild) {
      if (originalOwnAppendChild) {
        Object.defineProperty(body, "appendChild", originalOwnAppendChild);
      } else {
        // appendChild is normally inherited from Node.prototype. Restore that
        // exact shape rather than leaving a stale own-property after export.
        Reflect.deleteProperty(body, "appendChild");
      }
    }
  };
}

function isHtml2CanvasCloneFrame(node: Node): node is HTMLIFrameElement {
  if (node.nodeType !== 1) {
    return false;
  }
  const element = node as Element;
  return element.tagName === "IFRAME" && element.classList.contains("html2canvas-container");
}

function makeCloneFrameLayoutable(frame: HTMLIFrameElement): void {
  // These values override html2canvas' hidden/off-screen defaults before its
  // iframe is appended. The Steam Wrapped route hides every direct body child
  // except its own page root; that otherwise gives html2canvas' iframe a
  // computed display:none and a 0 x 0 cloned dashboard. The inline
  // !important rules win over that page rule while keeping this transient
  // frame imperceptible and non-interactive.
  frame.style.setProperty("display", "block", "important");
  frame.style.setProperty("visibility", "visible", "important");
  frame.style.setProperty("position", "fixed", "important");
  frame.style.setProperty("left", "0px", "important");
  frame.style.setProperty("top", "0px", "important");
  frame.style.setProperty("width", `${frame.width}px`, "important");
  frame.style.setProperty("height", `${frame.height}px`, "important");
  // A tiny non-zero opacity also avoids compositor suppression seen in some
  // Steam CEF builds; it is visually indistinguishable from transparent.
  frame.style.setProperty("opacity", "0.001", "important");
  frame.style.setProperty("pointer-events", "none", "important");
}

function suppressCloneFontReadiness(frame: HTMLIFrameElement): void {
  const cloneDocument = frame.contentDocument;
  if (!cloneDocument) {
    return;
  }

  try {
    // html2canvas waits for documentClone.fonts.ready before onclone. In the
    // Steam CEF iframe, copied Store @font-face entries can remain perpetually
    // loading even though the visible source document has already finished
    // loading its fonts. Source-font readiness is awaited before cloning, so
    // the isolated clone does not need a second unbounded wait.
    Object.defineProperty(cloneDocument, "fonts", {
      configurable: true,
      value: undefined,
    });
  } catch {
    // If a future CEF build disallows overriding this inherited getter, retain
    // html2canvas' native behavior rather than failing the export setup.
  }
}

function isHtml2CanvasFontMetricsContainer(node: Node): node is HTMLDivElement {
  if (node.nodeType !== 1) {
    return false;
  }

  const element = node as HTMLDivElement;
  const style = element.style;
  // These are the exact styles html2canvas applies before it inserts the
  // temporary FontMetrics measurement div. Keeping the predicate narrow avoids
  // affecting any ordinary Store element appended during capture.
  return element.tagName === "DIV" &&
    style.visibility === "hidden" &&
    style.whiteSpace === "nowrap" &&
    style.margin === "0px" &&
    style.padding === "0px" &&
    style.fontFamily.length > 0 &&
    style.fontSize.length > 0;
}

function makeFontMetricsContainerLayoutable(container: HTMLDivElement): void {
  // The route hides every direct child of body except its page root. html2canvas
  // creates FontMetrics containers directly under body, so without this rule
  // their offsets are all zero and every rendered glyph is painted too high.
  // Retain visibility:hidden: it can be measured but never becomes visible.
  container.style.setProperty("display", "block", "important");
  container.style.setProperty("position", "fixed", "important");
  container.style.setProperty("left", "0px", "important");
  container.style.setProperty("top", "0px", "important");
  container.style.setProperty("pointer-events", "none", "important");
}

async function prepareClonedDashboard(
  clonedDocument: Document,
  element: HTMLElement,
  bounds: CaptureBounds,
): Promise<void> {
  const cloneWindow = clonedDocument.defaultView;

  // html2canvas deliberately hides its off-screen iframe. On Steam's CEF
  // build an off-screen iframe can remain at a 0 × 0 layout forever, even
  // when it has width and height attributes. Move it into the viewport for
  // layout only, at zero opacity with no pointer events, so it cannot flash
  // or intercept the Store UI.
  const cloneFrame = cloneWindow?.frameElement as HTMLElement | null;
  if (cloneFrame) {
    cloneFrame.style.setProperty("display", "block", "important");
    cloneFrame.style.setProperty("left", "0px", "important");
    cloneFrame.style.setProperty("visibility", "visible", "important");
    cloneFrame.style.setProperty("opacity", "0.001", "important");
    cloneFrame.style.setProperty("pointer-events", "none", "important");
  }

  // Steam's hidden CEF iframe can report a zero-sized layout immediately
  // after html2canvas clones the Store page. Give the capture root concrete
  // dimensions from the already-visible source and wait for the clone's first
  // layout passes before html2canvas reads its bounds. This keeps all existing
  // gradients, rather than degrading the export to flat card colors.
  element.style.setProperty("display", "block", "important");
  element.style.setProperty("width", `${bounds.width}px`, "important");
  element.style.setProperty("min-width", `${bounds.width}px`, "important");
  element.style.setProperty("max-width", "none", "important");
  element.style.setProperty("height", `${bounds.height}px`, "important");
  element.style.setProperty("min-height", `${bounds.height}px`, "important");

  // View All dialogs and an open period menu are transient controls rather
  // than summary content. Removing only their cloned counterparts ensures
  // neither can cover the export or change the live Steam page.
  element
    .querySelectorAll("dialog, .steam-wrapped-period-selector__menu")
    .forEach((transient) => transient.remove());

  // html2canvas still parses background gradients on display:none descendants.
  // Steam Wrapped uses hidden artwork fallbacks (and their decorative
  // pseudo-elements) behind successfully loaded images. Those clones have a
  // zero-sized paint box in Steam's CEF build, which makes html2canvas compute
  // a non-finite gradient stop and abort the whole PNG render. They are not
  // visible in the live dashboard, so remove only the cloned hidden content.
  element.querySelectorAll("[hidden]").forEach((hidden) => hidden.remove());

  const captureStyle = clonedDocument.createElement("style");
  captureStyle.textContent =
    "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}";
  clonedDocument.head.append(captureStyle);

  await waitForCloneLayout(clonedDocument);
}

function shouldIgnoreDuringClone(node: Element, capturePage: HTMLElement | null): boolean {
  // Steam's Store document can contain a hidden tab-preview <video> that
  // html2canvas still attempts to rasterize. It is outside Steam Wrapped and
  // causes a harmless-but-noisy zero-sized canvas error in older CEF builds.
  if (node.tagName === "VIDEO" || node.hasAttribute("hidden")) {
    return true;
  }

  // Only the Steam Wrapped page is needed to reach the dedicated capture
  // container. Skipping other direct body children prevents dynamic Store
  // chrome from participating in the clone without excluding page styles.
  return capturePage !== null &&
    node.parentElement === capturePage.ownerDocument.body &&
    node !== capturePage;
}

function waitForCloneLayout(clonedDocument: Document): Promise<void> {
  const cloneWindow = clonedDocument.defaultView;
  if (!cloneWindow) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    // Timers in the hidden clone frame can be paused indefinitely by CEF. The
    // outer Store page remains live, so it owns the bounded fallback timer.
    const timeout = window.setTimeout(finish, CLONE_LAYOUT_SETTLE_TIMEOUT_MS);
    cloneWindow.requestAnimationFrame(() => {
      cloneWindow.requestAnimationFrame(finish);
    });
  });
}

function constrainScale(
  bounds: CaptureBounds,
  requestedScale: number,
  limits: { readonly maxCanvasPixels: number; readonly maxCanvasDimension: number },
): number {
  const sourcePixels = bounds.width * bounds.height;
  const pixelLimitedScale = Math.sqrt(limits.maxCanvasPixels / sourcePixels);
  const dimensionLimitedScale = Math.min(
    limits.maxCanvasDimension / bounds.width,
    limits.maxCanvasDimension / bounds.height,
  );
  const safeScale = Math.min(requestedScale, pixelLimitedScale, dimensionLimitedScale);
  if (!Number.isFinite(safeScale) || safeScale <= 0) {
    throw new DashboardPngExportError("The dashboard is too large to export safely.");
  }
  // A short decimal keeps the dimensions inside the cap while avoiding a
  // needlessly unusual high-DPI scale in normal dashboard-sized exports.
  return Math.max(0.1, Math.floor(safeScale * 100) / 100);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
          return;
        }
        reject(new DashboardPngExportError("Steam Wrapped could not encode the PNG export."));
      }, "image/png");
    } catch (cause) {
      reject(new DashboardPngExportError("Steam Wrapped could not encode the PNG export.", { cause }));
    }
  });
}

function triggerBlobDownload(
  documentRef: Document,
  windowRef: Window,
  blob: Blob,
  filename: string,
): void {
  const steamWindow = windowRef as SteamDownloadWindow;
  const objectUrl = steamWindow.URL.createObjectURL(blob);
  try {
    // Steam's own screenshot UI calls this native method. Unlike an anchor
    // click after asynchronous canvas rendering, it remains reliable in the
    // Store CEF frame and accepts the generated blob URL directly.
    if (startSteamBrowserDownload(windowRef, objectUrl)) {
      return;
    }

    startAnchorDownload(documentRef, objectUrl, filename);
  } catch (cause) {
    throw new DashboardPngExportError("Steam Wrapped could not start the PNG download.", { cause });
  } finally {
    // StartDownload is asynchronous and returns no completion signal. Keep
    // the Blob URL alive long enough for Steam's native downloader to read it.
    windowRef.setTimeout(
      () => steamWindow.URL.revokeObjectURL(objectUrl),
      NATIVE_DOWNLOAD_URL_RELEASE_DELAY_MS,
    );
  }
}

function startSteamBrowserDownload(windowRef: Window, objectUrl: string): boolean {
  const browser = (windowRef as SteamDownloadWindow).SteamClient?.Browser;
  if (typeof browser?.StartDownload !== "function") {
    return false;
  }

  try {
    browser.StartDownload(objectUrl);
    return true;
  } catch {
    // A non-Steam host or a future client change can still use the standard
    // browser fallback below.
    return false;
  }
}

function startAnchorDownload(documentRef: Document, objectUrl: string, filename: string): void {
  if (!documentRef.body) {
    throw new DashboardPngExportError("Steam Wrapped could not start the PNG download.");
  }

  const anchor = documentRef.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  try {
    documentRef.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new DashboardPngExportError(message));
    }, timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (cause: unknown) => {
        window.clearTimeout(timeout);
        reject(cause);
      },
    );
  });
}

function normalizeFilename(value: string | undefined): string {
  const base = value?.trim() || "steam-wrapped-summary";
  const safe = base.replace(/[\\/:*?\"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "steam-wrapped-summary";
  return safe.toLowerCase().endsWith(".png") ? safe : `${safe}.png`;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}
