"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  RefreshCw,
  Trash2,
  Upload,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateSkinImageInput,
  YOUCAM_FILE_CONSTRAINTS,
  type ImageValidationResult,
} from "@/lib/youcam/validation";
import type { AnalysisMode } from "@/lib/youcam/types";
import { PrivacyNotice } from "./PrivacyNotice";

export interface SelectedSkinImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  validation: ImageValidationResult;
}

export interface SkinImageUploaderProps {
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  selectedImage: SelectedSkinImage | null;
  onImageChange: (next: SelectedSkinImage | null) => void;
  onSubmitAnalysis: () => void;
  isBusy: boolean;
  liveApiConfigured: boolean | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function readImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error("Could not decode the selected image file."));
    };
    img.src = objectUrl;
  });
}

export function SkinImageUploader({
  mode,
  onModeChange,
  selectedImage,
  onImageChange,
  onSubmitAnalysis,
  isBusy,
  liveApiConfigured,
}: SkinImageUploaderProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  // Live Camera Capture Modal State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCameraDialogChange = useCallback(
    (nextOpen: boolean) => {
      setCameraOpen(nextOpen);
      setCameraError(null);
      setCameraReady(false);
      if (!nextOpen) {
        releaseCameraTracks();
      }
    },
    [releaseCameraTracks]
  );

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }

    let cancelled = false;

    async function initCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError(
            "Your current browser does not expose camera capture here. Please upload a portrait file instead."
          );
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1440 },
            height: { ideal: 1920 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          if (!cancelled) {
            setCameraReady(true);
          }
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera permission was declined or no webcam was detected. You can select an existing portrait photo instead."
          );
        }
      }
    }

    void initCamera();

    return () => {
      cancelled = true;
      releaseCameraTracks();
    };
  }, [cameraOpen, releaseCameraTracks]);

  const handleModeSelect = useCallback(
    (nextMode: AnalysisMode) => {
      onModeChange(nextMode);
      if (selectedImage) {
        const updatedValidation = validateSkinImageInput({
          mimeType: selectedImage.file.type,
          sizeBytes: selectedImage.file.size,
          width: selectedImage.width,
          height: selectedImage.height,
          mode: nextMode,
        });
        onImageChange({
          ...selectedImage,
          validation: updatedValidation,
        });
      }
    },
    [onModeChange, onImageChange, selectedImage]
  );

  const processFile = useCallback(
    async (file: File) => {
      setDecodeError(null);

      // Preliminary MIME/size check before image decoding
      const preCheck = validateSkinImageInput({
        mimeType: file.type,
        sizeBytes: file.size,
        mode,
      });

      const previewUrl = URL.createObjectURL(file);

      if (!preCheck.valid && !file.type.toLowerCase().startsWith("image/")) {
        URL.revokeObjectURL(previewUrl);
        setDecodeError(preCheck.errors.join(" "));
        onImageChange(null);
        return;
      }

      try {
        const { width, height } = await readImageDimensions(previewUrl);
        const fullValidation = validateSkinImageInput({
          mimeType: file.type,
          sizeBytes: file.size,
          width,
          height,
          mode,
        });

        if (selectedImage?.previewUrl) {
          URL.revokeObjectURL(selectedImage.previewUrl);
        }

        onImageChange({
          file,
          previewUrl,
          width,
          height,
          validation: fullValidation,
        });
      } catch {
        URL.revokeObjectURL(previewUrl);
        setDecodeError(
          "This file could not be read as a valid JPEG or PNG image. Please try another portrait photograph."
        );
      }
    },
    [mode, onImageChange, selectedImage]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isBusy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleRemoveImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setDecodeError(null);
    onImageChange(null);
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally so the selfie matches natural mirror orientation
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `dew-form-portrait-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        handleCameraDialogChange(false);
        void processFile(capturedFile);
      },
      "image/jpeg",
      0.92
    );
  };

  const canSubmit =
    Boolean(selectedImage) &&
    Boolean(selectedImage?.validation.valid) &&
    !isBusy;

  return (
    <div className="space-y-6">
      {/* Analysis Precision Mode Selector (SD vs HD — strictly unmixed per YouCam spec) */}
      <div className="rounded-editorial border border-stone-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-secondary">
              Analysis Resolution Preset
            </p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              YouCam processes either Standard (SD) or High-Definition (HD) concern sets per task.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="YouCam analysis resolution mode"
            className="inline-grid grid-cols-2 rounded-editorial border border-stone-border bg-canvas p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "sd"}
              disabled={isBusy}
              onClick={() => handleModeSelect("sd")}
              className={cn(
                "min-h-[38px] rounded-editorial px-3.5 py-1.5 text-xs font-medium transition-colors",
                mode === "sd"
                  ? "bg-forest text-surface"
                  : "text-ink-secondary hover:text-ink"
              )}
            >
              Standard (SD &ge; 480px)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "hd"}
              disabled={isBusy}
              onClick={() => handleModeSelect("hd")}
              className={cn(
                "min-h-[38px] rounded-editorial px-3.5 py-1.5 text-xs font-medium transition-colors",
                mode === "hd"
                  ? "bg-forest text-surface"
                  : "text-ink-secondary hover:text-ink"
              )}
            >
              High-Def (HD &ge; 1080px)
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Accessible File Input */}
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        onChange={handleFileInput}
        disabled={isBusy}
        className="sr-only"
      />

      {/* Upload Dropzone OR Selected Portrait Preview */}
      {!selectedImage ? (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            if (!isBusy) setIsDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isBusy) setIsDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragActive(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "rounded-editorial border border-dashed p-7 transition-colors duration-200 sm:p-10",
            isDragActive
              ? "border-forest bg-sage-soft/60"
              : "border-stone-strong bg-surface hover:border-forest/70"
          )}
        >
          <div className="mx-auto flex max-w-lg flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-editorial border border-stone-border bg-canvas text-forest">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </div>

            <h3 className="mt-4 font-serif text-2xl text-ink">
              Select a front-facing portrait
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Drag and drop a clear, makeup-free daylight photo here, choose a file from your
              device, or capture a frame with your camera.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor={fileInputId}
                className={cn(
                  "inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-editorial bg-forest px-5 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-forest-hover focus-within:ring-2 focus-within:ring-forest focus-within:ring-offset-2",
                  isBusy && "pointer-events-none opacity-60"
                )}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Choose portrait file</span>
              </label>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleCameraDialogChange(true)}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-editorial border border-stone-strong bg-canvas px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-sage-soft/60"
              >
                <Camera className="h-4 w-4 text-sage-botanical" aria-hidden="true" />
                <span>Use camera</span>
              </button>
            </div>

            {/* Actual Backend Constraints */}
            <dl className="mt-7 grid w-full grid-cols-1 gap-2.5 border-t border-stone-border pt-5 text-left text-xs text-ink-secondary sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Accepted Formats
                </dt>
                <dd className="mt-0.5 font-medium text-ink">JPEG (.jpg) or PNG (.png)</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Size &amp; Dimensions
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  &lt; {YOUCAM_FILE_CONSTRAINTS.maxFileSizeLabel} &middot; &ge;{" "}
                  {YOUCAM_FILE_CONSTRAINTS.minShortSidePx[mode]}px short side
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Framing Target
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  Face {YOUCAM_FILE_CONSTRAINTS.recommendedFaceWidthRatio}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        /* Selected Image Review Card */
        <div className="rounded-editorial border border-stone-border bg-surface p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-editorial border border-stone-border bg-canvas-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.previewUrl}
                  alt="Selected portrait preview prior to skin analysis submission"
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2.5 top-2.5 rounded-editorial border border-stone-border bg-surface/95 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-ink">
                  Local Preview &middot; Unanalysed
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between sm:col-span-7">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="eyebrow-label text-sage-botanical">Selected Portrait</p>
                  <span className="font-mono text-xs text-ink-secondary">
                    {selectedImage.width} &times; {selectedImage.height} px &middot;{" "}
                    {formatFileSize(selectedImage.file.size)}
                  </span>
                </div>

                <h3 className="mt-1.5 truncate font-serif text-xl text-ink" title={selectedImage.file.name}>
                  {selectedImage.file.name}
                </h3>

                <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                  This preview exists only in your browser tab and has not yet been submitted to
                  YouCam AI Skin Analysis.
                </p>

                {/* Validation Status Feedback */}
                {selectedImage.validation.valid ? (
                  <div className="mt-4 flex items-start gap-2.5 rounded-editorial border border-sage-muted bg-sage-soft/55 p-3 text-xs text-ink">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-forest"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-forest">
                        Meets {mode.toUpperCase()} technical file requirements
                      </p>
                      <p className="mt-0.5 text-ink-secondary">
                        Ensure lighting is even across both cheeks and your forehead is uncovered
                        before submitting.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    role="alert"
                    className="mt-4 rounded-editorial border border-clay/60 bg-clay-soft/65 p-3.5 text-xs text-clay-deep"
                  >
                    <p className="font-medium">File validation check did not pass:</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4">
                      {selectedImage.validation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedImage.validation.warnings.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-editorial border border-stone-border bg-canvas p-3 text-xs text-ink-secondary">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay"
                      aria-hidden="true"
                    />
                    <ul className="space-y-1">
                      {selectedImage.validation.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Replace / Remove & Primary Submit CTA */}
              <div className="mt-6 space-y-3 border-t border-stone-border pt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-editorial border border-stone-strong bg-canvas px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-sage-soft/50 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Replace image</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleRemoveImage}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-editorial border border-stone-border bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary transition-colors hover:border-clay hover:text-clay-deep disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={onSubmitAnalysis}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-editorial bg-forest px-6 py-3 text-sm font-medium tracking-wide text-surface transition-colors duration-150 hover:bg-forest-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Analysis in progress…" : "Analyse my skin"}
                </button>

                {liveApiConfigured === false && (
                  <p className="text-[11px] leading-relaxed text-ink-secondary">
                    Server note:{" "}
                    <code className="font-mono text-[11px] text-ink">YOUCAM_API_KEY</code> is not
                    currently set in this environment; pressing{" "}
                    <strong className="font-medium text-ink">Analyse my skin</strong> will confirm
                    server status and offer the labeled Development Fixture preview.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone file decode / format error when no image preview could be mounted */}
      {decodeError && (
        <div
          role="alert"
          className="rounded-editorial border border-clay/60 bg-clay-soft/65 p-4 text-xs text-clay-deep"
        >
          <p className="font-medium">Unable to load selected file</p>
          <p className="mt-1">{decodeError}</p>
        </div>
      )}

      {/* Privacy Notice */}
      <PrivacyNotice />

      {/* Live Browser Camera Dialog */}
      <Dialog.Root open={cameraOpen} onOpenChange={handleCameraDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-editorial border border-stone-border bg-surface p-5 shadow-sm focus:outline-none sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-stone-border pb-3.5">
              <div>
                <Dialog.Title className="font-serif text-xl text-ink">
                  Portrait Camera Capture
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-ink-secondary">
                  Align your face inside the guide (60–80% of frame width) in even front lighting.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-editorial border border-stone-border bg-canvas text-ink hover:bg-sage-soft/50"
                  aria-label="Close camera capture"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-4">
              {cameraError ? (
                <div className="rounded-editorial border border-clay/50 bg-clay-soft/60 p-4 text-xs leading-relaxed text-clay-deep">
                  {cameraError}
                </div>
              ) : (
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-editorial border border-stone-border bg-ink">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full -scale-x-100 object-cover"
                  />
                  {/* Framing oval guide */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <div className="h-[74%] w-[68%] rounded-full border border-dashed border-surface/80" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center rounded-editorial border border-stone-strong bg-canvas px-4 py-2 text-xs font-medium text-ink hover:bg-sage-soft/50"
                >
                  Cancel
                </button>
              </Dialog.Close>

              {!cameraError && (
                <button
                  type="button"
                  disabled={!cameraReady}
                  onClick={captureFromCamera}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-editorial bg-forest px-5 py-2 text-xs font-medium text-surface hover:bg-forest-hover disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Capture portrait</span>
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
