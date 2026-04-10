"use client";

import NextImage from "next/image";
import { useEffect, useId, useRef, useState } from "react";

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

  const maxSize = 640;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function readFileAsDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Fotoğraf yüklenemedi."));
      nextImage.src = objectUrl;
    });

    return renderImageToDataUrl(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function resolveCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Kamera izni verilmedi. Tarayıcı ayarlarından kamerayı açın.";
    }

    if (error.name === "NotFoundError") {
      return "Kullanılabilir kamera bulunamadı.";
    }

    if (error.name === "NotReadableError") {
      return "Kamera başka bir uygulama veya sekme tarafından kullanılıyor olabilir.";
    }

    if (error.name === "OverconstrainedError") {
      return "Bu cihazda desteklenen kamera ayarı bulunamadı.";
    }

    if (error.name === "SecurityError") {
      return "Tarayıcı güvenlik ayarları kamerayı engelliyor.";
    }
  }

  return "Kamera başlatılamadı. Dosyadan fotoğraf seçmeyi deneyin.";
}

async function requestSelfieStream() {
  const candidates: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 720 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: "user",
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: unknown;

  for (const constraints of candidates) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };

    const onLoadedMetadata = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Kamera goruntusu hazirlanamadi."));
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata, {
      once: true,
    });
    video.addEventListener("error", onError, { once: true });
  });
}

export function VerificationSelfieCapture({
  value,
  onChange,
  title = "Profil fotoğrafı",
  description = "Kameradan selfie çekin veya cihazınızdan fotoğraf seçin.",
}: VerificationSelfieCaptureProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
    stopCamera();

    if (!window.isSecureContext) {
      setCameraError(
        "Kamera için HTTPS veya localhost üzerinden bağlantı gerekir.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Bu tarayıcı kamera erişimini desteklemiyor.");
      return;
    }

    setIsBusy(true);
    setCameraError(null);
    setIsCameraOpen(true);

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    try {
      const stream = await requestSelfieStream();
      const video = videoRef.current;

      if (!video) {
        throw new Error("Kamera alanı hazır değil.");
      }

      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await waitForVideoReady(video);

      try {
        await video.play();
      } catch {
        // Some browsers block play() promises even when stream is attached.
      }
    } catch (error) {
      stopCamera();
      setCameraError(resolveCameraErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video) {
      setCameraError("Kamera görüntüsü hazır değil.");
      return;
    }

    const nextValue = renderImageToDataUrl(video);

    if (!nextValue) {
      setCameraError("Fotoğraf alınamadı. Tekrar deneyin.");
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
        throw new Error("Fotoğraf işlenemedi.");
      }

      onChange(nextValue);
      stopCamera();
    } catch {
      setCameraError("Fotoğraf işlenemedi. Başka bir dosya deneyin.");
    } finally {
      setIsBusy(false);
    }
  }

  const showVideo = isCameraOpen && !value;

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        <p className="text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black/5">
        {value ? (
          <div className="relative h-56 w-full">
            <NextImage
              src={value}
              alt="Profil fotoğrafı önizleme"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
          </div>
        ) : showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-56 items-center justify-center px-6 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              Kamera ile selfie çekebilir veya galeriden fotoğraf seçebilirsiniz.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!isCameraOpen ? (
          <button
            type="button"
            onClick={() => {
              void openCamera();
            }}
            disabled={isBusy}
            className="btn-primary min-h-11 text-sm"
          >
            {value ? "Fotoğrafı Yenile" : "Kamerayı Aç"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isBusy}
              className="btn-primary min-h-11 text-sm"
            >
              Fotoğrafı Kullan
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={isBusy}
              className="btn-secondary min-h-11 text-sm"
            >
              Vazgeç
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
          disabled={isBusy}
          className="btn-secondary min-h-11 text-sm"
        >
          Dosyadan Seç
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
            }}
            disabled={isBusy}
            className="btn-secondary min-h-11 text-sm"
          >
            Kaldır
          </button>
        ) : null}
      </div>

      <label htmlFor={fileInputId} className="sr-only">
        Profil fotoğrafı seç
      </label>

      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Profil fotoğrafı seç"
        title="Profil fotoğrafı seç"
        className="hidden"
        onChange={(event) => {
          void onFileSelected(event.target.files?.item(0) ?? null);
          event.currentTarget.value = "";
        }}
      />

      {cameraError ? (
        <p className="text-xs text-[var(--error)]">
          {cameraError}
        </p>
      ) : null}
    </div>
  );
}
