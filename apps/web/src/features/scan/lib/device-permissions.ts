"use client";

export type DeviceLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type DeviceLocationResult =
  | {
      ok: true;
      location: DeviceLocation;
    }
  | {
      ok: false;
      reason: "insecure" | "unsupported" | "denied" | "unavailable" | "timeout";
      message: string;
    };

export function isLikelyInAppBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /FBAN|FBAV|Instagram|Line|Twitter|TikTok|wv|WebView/i.test(
    navigator.userAgent || "",
  );
}

export function getLocationHelpText() {
  if (typeof navigator === "undefined") {
    return "";
  }

  const isAppleDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");

  if (isAppleDevice) {
    return "iPhone'da Ayarlar > Gizlilik ve Güvenlik > Konum Servisleri açık olmalı. Ayrıca Ayarlar > Safari veya Chrome > Konum için izin verilmeli.";
  }

  return "Telefon ayarlarında tarayıcı için konum iznini açıp tekrar deneyin.";
}

export async function requestDeviceLocation(): Promise<DeviceLocationResult> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      reason: "unsupported",
      message: "Konum sadece tarayıcıda alınabilir.",
    };
  }

  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: "insecure",
      message:
        "Konum izni için site HTTPS üzerinden açılmalıdır. http:// veya yerel IP adresi ile iPhone konum penceresi göstermez.",
    };
  }

  if (!navigator.geolocation) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Bu tarayıcı konum servisini desteklemiyor.",
    };
  }

  return new Promise<DeviceLocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            ok: false,
            reason: "denied",
            message: isLikelyInAppBrowser()
              ? "Uygulama içi tarayıcı konumu engelleyebilir. Linki Safari veya Chrome'da açıp tekrar deneyin."
              : `Konum izni verilmedi veya daha önce engellendi. ${getLocationHelpText()}`,
          });
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          resolve({
            ok: false,
            reason: "unavailable",
            message:
              "Konum alınamadı. GPS/konum servislerini açıp açık alanda tekrar deneyin.",
          });
          return;
        }

        resolve({
          ok: false,
          reason: "timeout",
          message:
            "Konum alma işlemi zaman aşımına uğradı. Telefonun konum servislerini kontrol edip tekrar deneyin.",
        });
      },
      {
        timeout: 20_000,
        maximumAge: 0,
        enableHighAccuracy: false,
      },
    );
  });
}
