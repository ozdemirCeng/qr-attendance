"use client";

import { useEffect, useRef, useState } from "react";

type VerificationSelfieCaptureProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  title?: string;
  description?: string;
};

function renderImageToDataUrl(source: CanvasImageSource) {
  const width =
    "videoWidth" in source && typeof source.videoWidth === "number"
      ? source.videoWidth
      : "naturalWidth" in source && typeof source.naturalWidth === "number"
        ? source.naturalWidth
        : 0;
  const height =
    "videoHeight" in source && typeof source.videoHeight === "number"
      ? source.videoHeight
      : "naturalHeight" in source && typeof source.naturalHeight === "number"
        ? source.naturalHeight
        : 0;

  if (!width || !height) {
    return null;
  }

  const maxSize = 480;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.78);
}

async function readFileAsDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () =>
        reject(new Error("Fotograf yuklenemedi."));
      nextImage.src = objectUrl;
    });

    return renderImageToDataUrl(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function VerificationSelfieCapture({
  value,
  onChange,
  title = "Profil dogrulama fotografi",
  description = "Kameradan selfie cekin veya cihazinizdan bir fotograf secin.",
}: VerificationSelfieCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  }

  async function openCamera() {
    if (!window.isSecureContext) {
      setCameraError(
        "Kamera acmak icin HTTPS veya localhost uzerinden erisim gerekiyor.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Bu tarayici kamera erisimini desteklemiyor.");
      return;
    }

    setIsBusy(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "user",
          },
          width: {
            ideal: 720,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Kamera alani bulunamadi.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraOpen(true);
    } catch {
      stopCamera();
      setCameraError("Kamera baslatilamadi. Izinleri kontrol edin.");
    } finally {
      setIsBusy(false);
    }
  }

  function capturePhoto() {
    if (!videoRef.current) {
      setCameraError("Kamera goruntusu hazir degil.");
      return;
    }

    const nextValue = renderImageToDataUrl(videoRef.current);

    if (!nextValue) {
      setCameraError("Fotograf yakalanamadi. Lutfen tekrar deneyin.");
      return;
    }

    onChange(nextValue);
    setCameraError(null);
    stopCamera();
  }

  async function onFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setIsBusy(true);
    setCameraError(null);

    try {
      const nextValue = await readFileAsDataUrl(file);

      if (!nextValue) {
        throw new Error("Fotograf islenemedi.");
      }

      onChange(nextValue);
    } catch {
      setCameraError("Fotograf islenemedi. Lutfen baska bir dosya deneyin.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="space-y-1">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black/5">
          <img
            src={value}
            alt="Dogrulama fotografi onizleme"
            className="h-56 w-full object-cover"
          />
        </div>
      ) : null}

      {isCameraOpen ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-56 w-full object-cover"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="btn-primary min-h-11 text-sm"
            >
              Fotografi Kullan
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn-secondary min-h-11 text-sm"
            >
              Vazgec
            </button>
          </div>
        </div>
      ) : null}

      {!isCameraOpen ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void openCamera();
            }}
            disabled={isBusy}
            className="btn-primary min-h-11 text-sm"
          >
            {value ? "Fotografi Yenile" : "Kamerayi Ac"}
          </button>
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            disabled={isBusy}
            className="btn-secondary min-h-11 text-sm"
          >
            Dosyadan Sec
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
              }}
              className="btn-secondary min-h-11 text-sm"
            >
              Kaldir
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(event) => {
          void onFileSelected(event.target.files?.item(0) ?? null);
          event.currentTarget.value = "";
        }}
      />

      {cameraError ? (
        <p className="text-xs" style={{ color: "var(--error)" }}>
          {cameraError}
        </p>
      ) : null}
    </div>
  );
}
