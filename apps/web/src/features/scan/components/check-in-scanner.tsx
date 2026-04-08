"use client";

import { BrowserMultiFormatReader, Result } from "@zxing/library";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { scanAttendance } from "@/lib/attendance";
import { ApiError } from "@/lib/api";

import { saveScanContext } from "../lib/scan-context";

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
  const [scannerMode, setScannerMode] = useState<"barcode" | "zxing" | "manual">("manual");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [location, setLocation] = useState<ScanLocation | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isPulseVisible, setIsPulseVisible] = useState(false);

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
        "Kamera ve konum icin guvenli baglanti gerekir. HTTPS veya localhost ile acin.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMessage("Bu tarayici kamera erisimini desteklemiyor.");
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
            setLocationNotice("Konum izni verilmedi. Check-in konum dogrulamasi basarisiz olabilir.");
          } else if (positionError.code === 3) {
            setLocationNotice("Konum zamani asimina ugradi. Lutfen tekrar deneyin.");
          } else {
            setLocationNotice("Konum bilgisi alinamadi.");
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

  async function startWithBarcodeDetector(initialLocation: ScanLocation | null) {
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
        throw new Error("Kamera alani bulunamadi.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const BarcodeDetectorCtor = window.BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        throw new Error("BarcodeDetector baslatilamadi.");
      }
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

      setState("scanning");

      const detectLoop = async () => {
        if (!videoRef.current || processingRef.current) {
          return;
        }

        try {
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const result = await detector.detect(videoRef.current);
            const rawValue = result.find((item) => typeof item.rawValue === "string")?.rawValue;

            if (rawValue) {
              await onTokenDetected(rawValue, initialLocation ?? location);
              return;
            }
          }
        } catch {
          setErrorMessage("Kamera tarama hatasi olustu.");
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
      setErrorMessage("Kamera baslatilamadi. Tarayici izinlerini kontrol edin.");
    }
  }

  async function startWithZxing(initialLocation: ScanLocation | null) {
    try {
      if (!videoRef.current) {
        throw new Error("Kamera alani bulunamadi.");
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
      setErrorMessage("Kamera acilamadi. Manuel token girmeyi deneyin.");
    }
  }

  async function onTokenDetected(token: string, currentLocation: ScanLocation | null) {
    const normalizedToken = token.trim();

    if (!normalizedToken || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsPulseVisible(true);
    window.setTimeout(() => {
      setIsPulseVisible(false);
    }, 500);

    setState("processing");

    try {
      const response = await scanAttendance({
        token: normalizedToken,
        lat: currentLocation?.lat,
        lng: currentLocation?.lng,
        locationAccuracy: currentLocation?.accuracy,
      });

      stopScanner();
      router.replace(
        `/check-in/result?status=success&name=${encodeURIComponent(
          response.data.participant.name,
        )}&event=${encodeURIComponent(response.data.event.name)}`,
      );
      return;
    } catch (error) {
      if (error instanceof ApiError && error.code === "REGISTRATION_REQUIRED") {
        saveScanContext({
          eventId,
          token: normalizedToken,
          lat: currentLocation?.lat,
          lng: currentLocation?.lng,
          locationAccuracy: currentLocation?.accuracy,
          savedAt: new Date().toISOString(),
        });

        stopScanner();
        router.push(`/check-in/${eventId}/guest-form`);
        return;
      }

      const code = error instanceof ApiError ? error.code ?? "HTTP_EXCEPTION" : "UNKNOWN_ERROR";
      stopScanner();
      router.replace(`/check-in/result?status=error&code=${encodeURIComponent(code)}`);
      return;
    } finally {
      processingRef.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-4 text-zinc-900 sm:px-6 sm:py-6">
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">QR Check-in</h1>
            <Link
              href="/scan"
              className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Geri
            </Link>
          </div>
          <p className="mt-2 text-sm text-zinc-600">Etkinlik: {eventId}</p>
          {location ? (
            <p className="mt-1 text-xs text-zinc-500">
              Konum hazir: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">{locationNotice ?? "Konum bilgisi alinmadi."}</p>
          )}
        </div>

        <article className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="relative mx-auto h-[58vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 sm:h-auto sm:aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-56 w-56 rounded-3xl border-4 transition ${
                  isPulseVisible ? "border-emerald-400" : "border-white/70"
                }`}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void startScanner();
              }}
              disabled={state === "starting" || state === "processing" || state === "scanning"}
              className="min-h-11 rounded-xl bg-zinc-900 px-4 py-2 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {state === "starting" ? "Baslatiliyor..." : "Taramaya Basla"}
            </button>
            <button
              type="button"
              onClick={stopScanner}
              className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-base font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Durdur
            </button>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Mod: {scannerMode === "barcode" ? "BarcodeDetector" : scannerMode === "zxing" ? "ZXing" : "Manuel"}
          </p>

          {errorMessage ? <p className="mt-2 text-sm text-rose-700">{errorMessage}</p> : null}
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Manuel Token Giris</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={manualToken}
              onChange={(event) => {
                setManualToken(event.target.value);
              }}
              placeholder="QR token"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
            <button
              type="button"
              disabled={!manualToken.trim() || state === "processing"}
              onClick={() => {
                void onTokenDetected(manualToken, location);
              }}
              className="min-h-11 rounded-xl bg-zinc-900 px-4 py-2 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Gonder
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
