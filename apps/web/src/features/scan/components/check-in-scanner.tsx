"use client";

import { BrowserMultiFormatReader, Result } from "@zxing/library";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { scanAttendance } from "@/lib/attendance";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

import { clearScanContext, saveScanContext } from "../lib/scan-context";
import { VerificationSelfieCapture } from "./verification-selfie-capture";

type CheckInScannerProps = {
  eventId?: string;
  initialToken?: string;
};

type ScanLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

type ScanState = "idle" | "starting" | "scanning" | "error";

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function resolveScanErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "UNKNOWN_ERROR";
  }

  const maybeError = error as {
    code?: unknown;
    statusCode?: unknown;
    message?: unknown;
  };

  if (typeof maybeError.code === "string" && maybeError.code.trim()) {
    return maybeError.code;
  }

  const message =
    typeof maybeError.message === "string"
      ? maybeError.message.toLowerCase()
      : "";

  if (message.includes("kayit bulunamadi")) {
    return "REGISTRATION_REQUIRED";
  }

  if (maybeError.statusCode === 400) return "BAD_REQUEST";
  if (maybeError.statusCode === 401) return "UNAUTHORIZED";
  if (maybeError.statusCode === 403) return "FORBIDDEN";
  if (maybeError.statusCode === 404) return "NOT_FOUND";
  if (maybeError.statusCode === 409) return "ALREADY_CHECKED_IN";
  if (maybeError.statusCode === 429) return "TOO_MANY_REQUESTS";
  if (maybeError.statusCode === 500) return "INTERNAL_SERVER_ERROR";

  return "UNKNOWN_ERROR";
}

/**
 * QR content may be a full URL like:
 *   https://site.com/check-in/EVENT_ID?token=BASE64TOKEN
 * Or a raw token string. Extract the token either way.
 */
function extractTokenFromQrContent(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const tokenParam = url.searchParams.get("token");
    if (tokenParam) return tokenParam;
  } catch {
    // Not a URL, treat as raw token
  }
  return trimmed;
}

export function CheckInScanner({ eventId, initialToken }: CheckInScannerProps) {
  const router = useRouter();
  const { participantUser } = useParticipantAuth();
  const resolvedEventId = eventId?.trim();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const [state, setState] = useState<ScanState>("idle");
  const [scannerMode, setScannerMode] = useState<
    "barcode" | "zxing" | "manual"
  >("manual");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [location, setLocation] = useState<ScanLocation | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [detectedToken, setDetectedToken] = useState<string | null>(null);
  const [identityInput, setIdentityInput] = useState("");
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [verificationPhotoDataUrl, setVerificationPhotoDataUrl] = useState<
    string | null
  >(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Auto-process token from URL (QR display flow)
  useEffect(() => {
    if (!initialToken) return;
    const extracted = extractTokenFromQrContent(initialToken);
    if (!extracted) return;

    // If participant is logged in, auto-submit with empty photo
    if (participantUser) {
      setDetectedToken(extracted);
      setIdentityInput(participantUser.email);
      setState("idle");
      void submitWithIdentity(extracted, participantUser.email, "");
      return;
    }

    // Otherwise show identity step
    setDetectedToken(extracted);
    setIdentityInput("");
    setErrorMessage(null);
    setState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  function stopScanner() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (zxingReaderRef.current) {
      zxingReaderRef.current.reset();
      zxingReaderRef.current = null;
    }

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

    processingRef.current = false;
    setState("idle");
  }

  async function captureLocation() {
    if (!navigator.geolocation) {
      setLocationNotice("Bu cihazda konum servisi desteklenmiyor.");
      return null;
    }

    return new Promise<ScanLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          setLocation(nextLocation);
          setLocationNotice(null);
          resolve(nextLocation);
        },
        (positionError) => {
          if (positionError.code === 1) {
            setLocationNotice("Konum izni verilmedi.");
          } else if (positionError.code === 3) {
            setLocationNotice("Konum alma işlemi zaman aşımına uğradı.");
          } else {
            setLocationNotice("Konum bilgisi alınamadı.");
          }

          resolve(null);
        },
        {
          timeout: 10_000,
          maximumAge: 30_000,
          enableHighAccuracy: true,
        },
      );
    });
  }

  async function startScanner() {
    setErrorMessage(null);

    if (!window.isSecureContext) {
      setState("error");
      setErrorMessage("Kamera ve konum için HTTPS veya localhost gerekir.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMessage("Bu tarayıcı kamera erişimini desteklemiyor.");
      return;
    }

    setState("starting");

    const currentLocation = await captureLocation();

    if (!currentLocation) {
      setState("error");
      setErrorMessage("Konum hazır olmadan tarama başlatılamaz.");
      return;
    }

    if (window.BarcodeDetector) {
      setScannerMode("barcode");
      await startWithBarcodeDetector(currentLocation);
      return;
    }

    setScannerMode("zxing");
    await startWithZxing(currentLocation);
  }

  async function startWithBarcodeDetector(initialLocation: ScanLocation) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      const video = videoRef.current;

      if (!video) {
        throw new Error("Kamera alanı bulunamadı.");
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const BarcodeDetectorCtor = window.BarcodeDetector;

      if (!BarcodeDetectorCtor) {
        throw new Error("BarcodeDetector kullanılamadı.");
      }

      const detector = new BarcodeDetectorCtor({
        formats: ["qr_code"],
      });

      setState("scanning");

      const detectLoop = async () => {
        if (!videoRef.current || processingRef.current) {
          return;
        }

        try {
          if (
            videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            const result = await detector.detect(videoRef.current);
            const rawValue = result.find(
              (item) => typeof item.rawValue === "string",
            )?.rawValue;

            if (rawValue) {
              await onTokenDetected(rawValue, initialLocation);
              return;
            }
          }
        } catch {
          setState("error");
          setErrorMessage("Tarama sırasında bir hata oluştu.");
          return;
        }

        animationFrameRef.current = window.requestAnimationFrame(() => {
          void detectLoop();
        });
      };

      animationFrameRef.current = window.requestAnimationFrame(() => {
        void detectLoop();
      });
    } catch {
      setState("error");
      setErrorMessage("Kamera başlatılamadı. İzinleri kontrol edin.");
    }
  }

  async function startWithZxing(initialLocation: ScanLocation) {
    try {
      const video = videoRef.current;

      if (!video) {
        throw new Error("Kamera alanı bulunamadı.");
      }

      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      setState("scanning");

      await reader.decodeFromVideoDevice(
        null,
        video,
        (result: Result | undefined) => {
          if (!result || processingRef.current) {
            return;
          }

          void onTokenDetected(result.getText(), initialLocation);
        },
      );
    } catch {
      setState("error");
      setErrorMessage("Kamera açılamadı. Manuel giriş ile devam edin.");
    }
  }

  async function onTokenDetected(
    rawContent: string,
    currentLocation: ScanLocation | null,
  ) {
    const normalizedToken = extractTokenFromQrContent(rawContent);

    if (!normalizedToken || processingRef.current) {
      return;
    }

    if (!currentLocation) {
      setState("error");
      setErrorMessage("Konum hazır değil. Önce konumu yenileyin.");
      return;
    }

    processingRef.current = true;
    stopScanner();
    setDetectedToken(normalizedToken);
    setIdentityInput(
      participantUser?.email?.trim() || participantUser?.phone?.trim() || "",
    );
    setVerificationPhotoDataUrl(null);
    setErrorMessage(null);
    processingRef.current = false;
  }

  async function submitWithIdentity(
    token: string,
    identity: string,
    currentPhoto: string,
  ) {
    if (!location) {
      setErrorMessage("Konum olmadan yoklama tamamlanamaz.");
      return;
    }

    setIdentitySubmitting(true);
    setErrorMessage(null);

    const isEmail = identity.includes("@");

    try {
      const response = await scanAttendance({
        token,
        lat: location.lat,
        lng: location.lng,
        locationAccuracy: location.accuracy,
        email: isEmail ? identity : undefined,
        phone: !isEmail ? identity : undefined,
        verificationPhotoDataUrl: currentPhoto,
      });

      clearScanContext();
      router.replace(
        `/check-in/result?status=success&name=${encodeURIComponent(
          response.data.participant.name,
        )}&event=${encodeURIComponent(
          response.data.event.name,
        )}&eventId=${encodeURIComponent(response.data.event.id)}`,
      );
      return;
    } catch (error) {
      const code = resolveScanErrorCode(error);

      if (code === "REGISTRATION_REQUIRED") {
        saveScanContext({
          token,
          lat: location.lat,
          lng: location.lng,
          locationAccuracy: location.accuracy,
          verificationPhotoDataUrl: currentPhoto,
          savedAt: new Date().toISOString(),
        });

        router.push(
          resolvedEventId
            ? `/check-in/${encodeURIComponent(resolvedEventId)}/guest-form`
            : "/check-in/guest-form",
        );
        return;
      }

      if (
        code === "EXPIRED_TOKEN" ||
        code === "REPLAY_ATTACK" ||
        code === "SESSION_INACTIVE"
      ) {
        clearScanContext();
      }

      const eventIdParam = resolvedEventId
        ? `&eventId=${encodeURIComponent(resolvedEventId)}`
        : "";

      router.replace(
        `/check-in/result?status=error&code=${encodeURIComponent(
          code,
        )}${eventIdParam}`,
      );
    } finally {
      setIdentitySubmitting(false);
    }
  }

  async function onIdentitySubmit() {
    if (!detectedToken || identitySubmitting) {
      return;
    }

    const trimmedIdentity = identityInput.trim();

    if (!trimmedIdentity) {
      setErrorMessage("E-posta veya telefon numarası girin.");
      return;
    }

    if (!location) {
      setErrorMessage("Konum olmadan devam edemezsiniz.");
      return;
    }

    if (!verificationPhotoDataUrl) {
      setErrorMessage("Devam etmek için selfie ekleyin.");
      return;
    }

    await submitWithIdentity(
      detectedToken,
      trimmedIdentity,
      verificationPhotoDataUrl,
    );
  }

  function onCancelIdentity() {
    setDetectedToken(null);
    setIdentityInput("");
    setVerificationPhotoDataUrl(null);
    setErrorMessage(null);
    void startScanner();
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1
              className="text-2xl font-extrabold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              QR Giriş
            </h1>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void captureLocation();
                }}
                className="btn-secondary min-h-11 text-sm"
              >
                Konumu Yenile
              </button>
              <Link href="/scan" className="btn-secondary min-h-11 text-sm">
                Geri Dön
              </Link>
            </div>
          </div>

          {resolvedEventId ? (
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Etkinlik: {resolvedEventId}
            </p>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Etkinlik bilgisi QR kodunun içinde yer alır.
            </p>
          )}

          {location ? (
            <p className="mt-1 text-xs" style={{ color: "var(--success)" }}>
              Konum hazır: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          ) : (
            <p className="mt-1 text-xs" style={{ color: "var(--warning)" }}>
              {locationNotice ?? "Konum henüz hazır değil."}
            </p>
          )}

          <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Yoklama için konum ve selfie doğrulaması zorunludur.
          </p>
        </div>

        {detectedToken ? (
          <article className="glass-elevated rounded-2xl p-6">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold"
              style={{ background: "var(--surface-soft)" }}
            >
              QR
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Bilgilerini Doğrula
            </h2>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              QR kodu okundu. Kayıtlı e-posta veya telefon bilginiz ve selfie ile
              devam edin.
            </p>

            {participantUser ? (
              <div
                className="mt-3 rounded-xl p-3 text-sm"
                style={{
                  background: "var(--success-soft)",
                  color: "var(--success)",
                }}
              >
                Hesap tanındı: {participantUser.name}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <input
                value={identityInput}
                onChange={(event) => {
                  setIdentityInput(event.target.value);
                }}
                placeholder="E-posta veya telefon numarası"
                className="glass-input w-full py-3 text-base"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void onIdentitySubmit();
                  }
                }}
              />

              <VerificationSelfieCapture
                value={verificationPhotoDataUrl}
                onChange={setVerificationPhotoDataUrl}
                description="Net görünen bir selfie çekin veya galeriden seçin."
              />

              {errorMessage ? (
                <p className="text-sm" style={{ color: "var(--error)" }}>
                  {errorMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void onIdentitySubmit();
                  }}
                  disabled={identitySubmitting}
                  className="btn-primary min-h-11 flex-1 text-base"
                >
                  {identitySubmitting ? "Kontrol ediliyor..." : "Yoklama Yap"}
                </button>
                <button
                  type="button"
                  onClick={onCancelIdentity}
                  className="btn-secondary min-h-11 text-base"
                >
                  İptal
                </button>
              </div>
            </div>

            <div
              className="mt-4 rounded-xl p-3"
              style={{ background: "var(--surface-soft)" }}
            >
              <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
                {resolvedEventId ? (
                  <>
                    Kayıtlı değilseniz{" "}
                    <Link
                      href={`/register/${resolvedEventId}`}
                      className="font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      önce kayıt olun
                    </Link>{" "}
                    veya bilgilerinizi girerek devam edin.
                  </>
                ) : (
                  <>Kayıt için yöneticinin paylaştığı linki kullanın.</>
                )}
              </p>
            </div>
          </article>
        ) : (
          <>
            <article className="glass rounded-2xl p-5">
              <div
                className="relative mx-auto h-[58vh] w-full max-w-2xl overflow-hidden rounded-2xl sm:h-auto sm:aspect-video"
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border-strong)",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="h-56 w-56 rounded-3xl border-4"
                    style={{
                      borderColor: "var(--border-strong)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void startScanner();
                  }}
                  disabled={state === "starting" || state === "scanning"}
                  className="btn-primary min-h-11 text-base"
                >
                  {state === "starting" ? "Başlatılıyor..." : "Taramayı Başlat"}
                </button>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="btn-secondary min-h-11 text-base"
                >
                  Durdur
                </button>
              </div>

              <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Mod:{" "}
                {scannerMode === "barcode"
                  ? "BarcodeDetector"
                  : scannerMode === "zxing"
                    ? "ZXing"
                    : "Manuel"}
              </p>

              {errorMessage ? (
                <p className="mt-2 text-sm" style={{ color: "var(--error)" }}>
                  {errorMessage}
                </p>
              ) : null}
            </article>

            <article className="glass rounded-2xl p-5">
              <h2
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                Manuel Doğrulama
              </h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={manualToken}
                  onChange={(event) => {
                    setManualToken(event.target.value);
                  }}
                  placeholder="Kısa doğrulama kodu veya QR token"
                  className="glass-input w-full py-3 text-base"
                />
                <button
                  type="button"
                  disabled={!manualToken.trim()}
                  onClick={() => {
                    if (!location) {
                      setErrorMessage("Manuel giriş için önce konumu açın.");
                      return;
                    }

                    void onTokenDetected(manualToken, location);
                  }}
                  className="btn-primary min-h-11 shrink-0 text-base"
                >
                  Gönder
                </button>
              </div>
            </article>

            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--surface-soft)" }}
            >
              <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
                {resolvedEventId ? (
                  <>
                    Henüz kayıtlı değil misiniz?{" "}
                    <Link
                      href={`/register/${resolvedEventId}`}
                      className="font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      Önce kayıt olun
                    </Link>
                  </>
                ) : (
                  <>Ön kayıt için yöneticinin paylaştığı linki kullanın.</>
                )}
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
