"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { formatMoney } from "@/lib/format";
import {
  CROP_ASPECT,
  MAX_UPLOAD_BYTES,
  JPEG_QUALITY,
  STORAGE_BUCKET,
  SUPPORTED_INPUT_EXT,
  PRICE_CENTS,
  FRAME_LABEL,
} from "@/lib/constants";
import { UploadIcon, SpinnerIcon, CheckIcon, LockIcon } from "./icons";

type Stage =
  | "idle"
  | "validating"
  | "converting"
  | "cropping"
  | "ready"
  | "uploading"
  | "error";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Export the selected crop at FULL source resolution as a JPEG blob. */
async function exportCrop(
  src: string,
  area: Area,
  quality: number,
): Promise<Blob | null> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
}

export function UploadSection() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);

  const croppedBlobRef = useRef<Blob | null>(null);
  const areaRef = useRef<Area | null>(null);
  const inFlight = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const modalOpen = stage === "cropping";
  const busy = stage === "validating" || stage === "converting";

  // Revoke object URLs on change/unmount.
  useEffect(
    () => () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    },
    [imageSrc],
  );
  useEffect(
    () => () => {
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    },
    [croppedUrl],
  );

  // Lock page scroll + focus the dialog while the crop modal is open.
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [modalOpen]);

  function setFail(message: string) {
    setError(message);
    setStage("error");
  }

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    setStage("validating");

    const name = file.name.toLowerCase();
    const isHeic =
      name.endsWith(".heic") ||
      name.endsWith(".heif") ||
      file.type === "image/heic" ||
      file.type === "image/heif";
    const looksImage =
      file.type.startsWith("image/") ||
      SUPPORTED_INPUT_EXT.some((e) => name.endsWith(e));

    if (!looksImage) {
      setFail(
        "That file type isn't supported. Please upload a JPG, PNG, or HEIC photo.",
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      let workable: Blob = file;
      if (isHeic) {
        setStage("converting");
        // Browser-only: dynamically import so SSR/prerender never loads libheif.
        const heic2any = (await import("heic2any")).default as (opts: {
          blob: Blob;
          toType?: string;
          quality?: number;
        }) => Promise<Blob | Blob[]>;
        const out = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.92,
        });
        workable = Array.isArray(out) ? out[0] : out;
      }
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(URL.createObjectURL(workable));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setStage("cropping");
    } catch (err) {
      console.error("photo read/convert failed", err);
      setFail("We couldn't read that photo — please try a different one.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    areaRef.current = areaPixels;
  }, []);

  async function confirmCrop() {
    if (!imageSrc || !areaRef.current) return;
    try {
      const blob = await exportCrop(imageSrc, areaRef.current, JPEG_QUALITY);
      if (!blob || blob.size === 0) {
        setFail("Something went wrong preparing your photo. Please try again.");
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setFail(
          "That photo is too large after processing — please try a smaller photo.",
        );
        return;
      }
      croppedBlobRef.current = blob;
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
      setCroppedUrl(URL.createObjectURL(blob));
      setError(null);
      setStage("ready");
    } catch (err) {
      console.error("crop export failed", err);
      setFail("Something went wrong preparing your photo. Please try again.");
    }
  }

  function closeModal() {
    setStage(croppedBlobRef.current ? "ready" : "idle");
  }

  function onDialogKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function orderNow() {
    if (inFlight.current || !croppedBlobRef.current) return;
    inFlight.current = true;
    setError(null);
    setStage("uploading");
    try {
      const res = await fetch("/api/upload-url", { method: "POST" });
      if (!res.ok) throw new Error("upload-url failed");
      const { path, token } = (await res.json()) as {
        path: string;
        token: string;
      };

      const { error: upErr } = await getBrowserSupabase()
        .storage.from(STORAGE_BUCKET)
        .uploadToSignedUrl(path, token, croppedBlobRef.current, {
          contentType: "image/jpeg",
        });
      if (upErr) throw upErr;

      const checkout = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoPath: path }),
      });
      if (!checkout.ok) throw new Error("checkout failed");
      const { url } = (await checkout.json()) as { url?: string };
      if (!url) throw new Error("no checkout url");

      window.location.assign(url);
    } catch (err) {
      console.error("order failed", err);
      inFlight.current = false;
      setError("We couldn't start checkout. Please try again.");
      setStage("ready");
    }
  }

  return (
    <section
      id="create"
      className="scroll-mt-20 border-t border-line bg-ivory py-20"
    >
      <div className="container-content max-w-2xl text-center">
        <p className="eyebrow">Create yours</p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
          Upload your photo
        </h2>
        <p className="mt-3 text-muted text-pretty">
          Crop it to the frame, then check out. We&rsquo;ll take it from there.
        </p>
      </div>

      <div className="container-content mt-10 max-w-xl">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          />

          {croppedUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={croppedUrl}
                alt="Your cropped photo, ready to order"
                className="aspect-[5/7] w-24 rounded-xl object-cover shadow-card"
              />
              <div>
                <p className="flex items-center gap-2 font-medium text-ink">
                  <CheckIcon className="text-amber-deep" /> Photo ready
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-1 text-sm text-amber-deep underline-offset-2 hover:underline"
                >
                  Choose a different photo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 ${
                dragging
                  ? "border-amber bg-amber/5"
                  : "border-line hover:border-amber/60"
              }`}
            >
              {busy ? (
                <>
                  <SpinnerIcon className="text-amber-deep" width={28} height={28} />
                  <span className="font-medium text-ink">
                    {stage === "converting"
                      ? "Converting your photo…"
                      : "Reading your photo…"}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-amber-deep">
                    <UploadIcon width={24} height={24} />
                  </span>
                  <span className="font-medium text-ink">
                    Drag a photo here, or click to choose
                  </span>
                  <span className="text-sm text-muted">
                    JPG, PNG, or HEIC · up to 20MB
                  </span>
                </>
              )}
            </button>
          )}

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={orderNow}
            disabled={!croppedUrl || stage === "uploading"}
            className="btn-primary mt-6 w-full text-lg"
          >
            {stage === "uploading" ? (
              <>
                <SpinnerIcon width={20} height={20} /> Starting secure checkout…
              </>
            ) : (
              <>Order now · {formatMoney(PRICE_CENTS)}</>
            )}
          </button>

          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
            <LockIcon width={14} height={14} /> Secure checkout with Stripe · Free
            shipping in Canada
          </p>
        </div>
      </div>

      {modalOpen && imageSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/70 p-4 backdrop-blur-sm"
          onKeyDown={onDialogKeyDown}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Crop your photo"
            tabIndex={-1}
            className="flex w-full max-w-md flex-col rounded-3xl bg-ivory p-5 shadow-lift focus:outline-none"
          >
            <h3 className="font-display text-lg font-semibold">
              Crop to the frame
            </h3>
            <p className="mt-1 text-sm text-muted">
              Your lithophane is {FRAME_LABEL}, portrait.
              Drag and zoom to frame your photo.
            </p>

            <div className="relative mt-4 aspect-[5/7] w-full overflow-hidden rounded-2xl bg-espresso">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={CROP_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-muted">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-amber"
                aria-label="Zoom"
              />
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary !px-5 !py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                className="btn-primary !px-5 !py-2.5 text-sm"
              >
                Use this crop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
