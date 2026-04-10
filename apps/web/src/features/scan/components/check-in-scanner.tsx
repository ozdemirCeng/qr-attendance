"use client";

import { BrowserMultiFormatReader, Result } from "@zxing/library";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { scanAttendance } from "@/lib/attendance";
import { ApiError } from "@/lib/api";

import { clearScanContext, saveScanContext } from "../lib/scan-context";

type CheckInScannerProps = {
  eventId: string;
};

type ScanLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

type ScanState = "idle" | "starting" | "scanning" | "processing" | "error";

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

export function CheckInScanner({ eventId }: CheckInScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  const startScannerRef = useRef<() => Promise<void>>(async () => {
    return Promise.resolve();
  });

  const [state, setState] = useState<ScanState>("idle");
  const [scannerMode, setScannerMode] = useState<
    "barcode" | "zxing" | "manual"
  >("manual");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [location, setLocation] = useState<ScanLocation | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isPulseVisible, setIsPulseVisible] = useState(false);

  // Identity verification step
  const [detectedToken, setDetectedToken] = useState<string | null>(null);
  const [identityInput, setIdentityInput] = useState("");
  const [identitySubmitting, setIdentitySubmitting] = useState(false);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    void startScannerRef.current();
  }, []);

  async function startScanner() {
    setErrorMessage(null);

    if (!window.isSecureContext) {
      setState("error");
      setErrorMessage(
        "Kamera ve konum için güvenli bağlantı gerekir. HTTPS veya localhost ile açın.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMessage("Bu tarayıcı kamera erişimini desteklemiyor.");
      return;
    }

    setState("starting");

    const currentLocation = await captureLocation();

    if (window.BarcodeDetector) {
      setScannerMode("barcode");
      await startWithBarcodeDetector(currentLocation);
      return;
    }

    setScannerMode("zxing");
    await startWithZxing(currentLocation);
  }

  startScannerRef.current = startScanner;

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
            setLocationNotice(
              "Konum izni verilmedi. Check-in konum doğrulaması başarısız olabilir.",
            );
          } else if (positionError.code === 3) {
            setLocationNotice(
              "Konum zamanı aşımına uğradı. Lütfen tekrar deneyin.",
            );
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

  async function startWithBarcodeDetector(
    initialLocation: ScanLocation | null,
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Kamera alanı bulunamadı.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const BarcodeDetectorCtor = window.BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        throw new Error("BarcodeDetector başlatılamadı.");
      }
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

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
              await onTokenDetected(rawValue, initialLocation ?? location);
              return;
            }
          }
        } catch {
          setErrorMessage("Kamera tarama hatası oluştu.");
          setState("error");
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
      setErrorMessage(
        "Kamera başlatılamadı. Tarayıcı izinlerini kontrol edin.",
      );
    }
  }

  async function startWithZxing(initialLocation: ScanLocation | null) {
    try {
      if (!videoRef.current) {
        throw new Error("Kamera alanı bulunamadı.");
      }

      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;

      setState("scanning");

      await reader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result: Result | undefined) => {
          if (!result || processingRef.current) {
            return;
          }

          void onTokenDetected(result.getText(), initialLocation ?? location);
        },
      );
    } catch {
      setState("error");
      setErrorMessage("Kamera açılamadı. Manuel token girmeyi deneyin.");
    }
  }

  async function onTokenDetected(
    token: string,
    _currentLocation: ScanLocation | null,
  ) {
    const normalizedToken = token.trim();

    if (!normalizedToken || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsPulseVisible(true);
    window.setTimeout(() => {
      setIsPulseVisible(false);
    }, 500);

    // Stop scanner and show identity verification step
    stopScanner();
    setDetectedToken(normalizedToken);
    setIdentityInput("");
    setErrorMessage(null);
    setState("idle");
    processingRef.current = false;
  }

  async function onIdentitySubmit() {
    if (!detectedToken || identitySubmitting) return;

    const trimmedIdentity = identityInput.trim();
    if (!trimmedIdentity) {
      setErrorMessage("E-posta veya telefon numaranızı girin.");
      return;
    }

    setIdentitySubmitting(true);
    setErrorMessage(null);

    const isEmail = trimmedIdentity.includes("@");

    try {
      const response = await scanAttendance({
        token: detectedToken,
        lat: location?.lat,
        lng: location?.lng,
        locationAccuracy: location?.accuracy,
        email: isEmail ? trimmedIdentity : undefined,
        phone: !isEmail ? trimmedIdentity : undefined,
      });

      router.replace(
        `/check-in/result?status=success&name=${encodeURIComponent(
          response.data.participant.name,
        )}&event=${encodeURIComponent(response.data.event.name)}&eventId=${encodeURIComponent(
          eventId,
        )}`,
      );
      return;
    } catch (error) {
      if (error instanceof ApiError && error.code === "REGISTRATION_REQUIRED") {
        saveScanContext({
          eventId,
          token: detectedToken,
          lat: location?.lat,
          lng: location?.lng,
          locationAccuracy: location?.accuracy,
          savedAt: new Date().toISOString(),
        });

        router.push(`/check-in/${eventId}/guest-form`);
        return;
      }

      const code =
        error instanceof ApiError
          ? (error.code ?? "HTTP_EXCEPTION")
          : "UNKNOWN_ERROR";
      if (
        code === "EXPIRED_TOKEN" ||
        code === "REPLAY_ATTACK" ||
        code === "SESSION_INACTIVE"
      ) {
        clearScanContext();
      }
      router.replace(
        `/check-in/result?status=error&code=${encodeURIComponent(code)}&eventId=${encodeURIComponent(
          eventId,
        )}`,
      );
      return;
    } finally {
      setIdentitySubmitting(false);
    }
  }

  function onCancelIdentity() {
    setDetectedToken(null);
    setIdentityInput("");
    setErrorMessage(null);
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">QR Giriş</h1>
            <Link href="/scan" className="btn-secondary min-h-11 text-sm">Geri Dön</Link>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Etkinlik: {eventId}</p>
          {location ? (
            <p className="mt-1 text-xs" style={{ color: "var(--success)" }}>📍 Konum hazır: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
          ) : (
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>{locationNotice ?? "Konum bilgisi alınmadı."}</p>
          )}
        </div>

        {/* ─── Identity Verification Step ─── */}
        {detectedToken ? (
          <article className="glass-elevated animate-scale-in rounded-2xl p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "var(--surface-soft)" }}>🔐</div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Kimliğini Doğrula</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>QR kodu başarıyla okundu. Kayıtlı e-posta veya telefon numaranı gir.</p>

            <div className="mt-4 space-y-3">
              <input
                value={identityInput}
                onChange={(e) => { setIdentityInput(e.target.value); }}
                placeholder="E-posta veya telefon numarası"
                className="glass-input w-full py-3 text-base"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") { void onIdentitySubmit(); } }}
              />

              {errorMessage ? <p className="text-sm" style={{ color: "var(--error)" }}>{errorMessage}</p> : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { void onIdentitySubmit(); }}
                  disabled={identitySubmitting}
                  className="btn-primary min-h-11 flex-1 text-base"
                >
                  {identitySubmitting ? "Kontrol ediliyor..." : "Giriş Yap"}
                </button>
                <button type="button" onClick={onCancelIdentity} className="btn-secondary min-h-11 text-base">İptal</button>
              </div>
            </div>

            <div className="mt-4 rounded-xl p-3" style={{ background: "var(--surface-soft)" }}>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Kayıtlı değil misiniz?{" "}
                <Link href={`/register/${eventId}`} className="font-semibold" style={{ color: "var(--primary)" }}>
                  Önce kayıt olun
                </Link>{" "}
                veya doğrudan bilgilerinizi girerek devam edin.
              </p>
            </div>
          </article>
        ) : (
          <>
            {/* ─── Camera + Scanner ─── */}
            <article className="glass rounded-2xl p-5">
              <div className="relative mx-auto h-[58vh] w-full max-w-2xl overflow-hidden rounded-2xl sm:h-auto sm:aspect-video" style={{ background: "#0a0a0f", border: "1px solid var(--border)" }}>
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className={`h-56 w-56 rounded-3xl border-4 transition ${isPulseVisible ? "border-emerald-400" : "border-white/70"}`} />
                </div>
                <div className="pointer-events-none absolute inset-x-8 top-4 h-1 rounded-full opacity-70" style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)" }} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { void startScanner(); }}
                  disabled={state === "starting" || state === "processing" || state === "scanning"}
                  className="btn-primary min-h-11 text-base"
                >
                  {state === "starting" ? "Başlatılıyor..." : "Taramaya Başla"}
                </button>
                <button type="button" onClick={stopScanner} className="btn-secondary min-h-11 text-base">Durdur</button>
              </div>

              <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Mod: {scannerMode === "barcode" ? "BarcodeDetector" : scannerMode === "zxing" ? "ZXing" : "Manuel"}
              </p>

              {errorMessage ? <p className="mt-2 text-sm" style={{ color: "var(--error)" }}>{errorMessage}</p> : null}
            </article>

            {/* ─── Manual Token Entry ─── */}
            <article className="glass rounded-2xl p-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Manuel Doğrulama Girişi</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={manualToken}
                  onChange={(event) => { setManualToken(event.target.value); }}
                  placeholder="Kısa doğrulama kodu veya QR token"
                  className="glass-input w-full py-3 text-base"
                />
                <button
                  type="button"
                  disabled={!manualToken.trim() || state === "processing"}
                  onClick={() => { void onTokenDetected(manualToken, location); }}
                  className="btn-primary min-h-11 shrink-0 text-base"
                >
                  Gönder
                </button>
              </div>
            </article>

            {/* ─── Quick Links ─── */}
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-soft)" }}>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Henüz kayıtlı değil misiniz?{" "}
                <Link href={`/register/${eventId}`} className="font-semibold" style={{ color: "var(--primary)" }}>
                  Önce kayıt olun →
                </Link>
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}


