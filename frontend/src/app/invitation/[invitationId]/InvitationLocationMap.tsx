"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type KakaoLatLng = object;

type KakaoMap = {
  setCenter: (position: KakaoLatLng) => void;
  relayout: () => void;
};

type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
};

type KakaoAddressResult = {
  x: string;
  y: string;
};

type KakaoGeocoder = {
  addressSearch: (address: string, callback: (result: KakaoAddressResult[], status: string) => void) => void;
};

type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng }) => KakaoMarker;
  services: {
    Geocoder: new () => KakaoGeocoder;
    Status: {
      OK: string;
    };
  };
};

const KAKAO_MAPS_SCRIPT_SELECTOR = "script[data-kakao-maps-sdk='true']";

type InvitationLocationMapProps = {
  address?: string;
};

export default function InvitationLocationMap({ address }: InvitationLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const kakaoLoadPromiseRef = useRef<Promise<KakaoMapsApi> | null>(null);
  const [kakaoJsKey, setKakaoJsKey] = useState("");
  const [mapMessage, setMapMessage] = useState("지도를 준비 중입니다.");
  const normalizedAddress = address?.trim() ?? "";

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const payload = await apiFetch<{ kakaoJsKey?: string }>("/api/public/config", {
          cache: "no-store",
        });
        if (!active) return;
        if (payload.kakaoJsKey && payload.kakaoJsKey.trim().length > 10) {
          setKakaoJsKey(payload.kakaoJsKey.trim());
        }
      } catch {
        // 기본값 사용
      }
    };
    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  const ensureKakaoMapsReady = useCallback(async (): Promise<KakaoMapsApi> => {
    if (typeof window === "undefined") {
      throw new Error("브라우저 환경이 아닙니다.");
    }
    const kakaoWindow = window as Window & { kakao?: { maps: KakaoMapsApi } };

    const normalizedKey = kakaoJsKey.trim();
    if (!normalizedKey) {
      throw new Error("카카오 JavaScript 키가 비어 있습니다.");
    }

    if (kakaoWindow.kakao?.maps) {
      return new Promise<KakaoMapsApi>((resolve) => {
        kakaoWindow.kakao!.maps.load(() => resolve(kakaoWindow.kakao!.maps));
      });
    }

    if (!kakaoLoadPromiseRef.current) {
      kakaoLoadPromiseRef.current = new Promise<KakaoMapsApi>((resolve, reject) => {
        const sdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${normalizedKey}&libraries=services&autoload=false`;

        const waitForMaps = (remainingTries: number) => {
          if (kakaoWindow.kakao?.maps) {
            kakaoWindow.kakao.maps.load(() => resolve(kakaoWindow.kakao!.maps));
            return;
          }
          if (remainingTries <= 0) {
            reject(new Error("kakao.maps 객체를 생성하지 못했습니다."));
            return;
          }
          window.setTimeout(() => waitForMaps(remainingTries - 1), 100);
        };

        const staleScript = document.querySelector<HTMLScriptElement>(KAKAO_MAPS_SCRIPT_SELECTOR);
        if (staleScript && staleScript.src !== sdkUrl) {
          staleScript.remove();
        }

        const existingScript = document.querySelector<HTMLScriptElement>(KAKAO_MAPS_SCRIPT_SELECTOR);
        if (existingScript) {
          if (existingScript.getAttribute("data-loaded") === "true") {
            waitForMaps(50);
            return;
          }
          existingScript.addEventListener(
            "load",
            () => {
              existingScript.setAttribute("data-loaded", "true");
              waitForMaps(50);
            },
            { once: true },
          );
          existingScript.addEventListener("error", () => reject(new Error("카카오 지도 SDK 로드 실패")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = sdkUrl;
        script.async = true;
        script.setAttribute("data-kakao-maps-sdk", "true");
        script.onload = () => {
          script.setAttribute("data-loaded", "true");
          waitForMaps(50);
        };
        script.onerror = () => reject(new Error("카카오 지도 SDK 로드 실패"));
        document.head.appendChild(script);
      }).catch((error) => {
        kakaoLoadPromiseRef.current = null;
        throw error;
      });
    }

    return kakaoLoadPromiseRef.current;
  }, [kakaoJsKey]);

  useEffect(() => {
    if (!kakaoJsKey.trim()) {
      return;
    }
    if (!normalizedAddress) {
      return;
    }

    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    let cancelled = false;

    const run = async () => {
      try {
        const maps = await ensureKakaoMapsReady();
        if (cancelled) return;
        const geocoder = new maps.services.Geocoder();
        geocoder.addressSearch(normalizedAddress, (result: KakaoAddressResult[], status: string) => {
          if (cancelled) return;
          if (status !== maps.services.Status.OK || result.length === 0) {
            setMapMessage("지도를 불러오지 못했습니다.");
            return;
          }

          const coords = new maps.LatLng(Number(result[0].y), Number(result[0].x));
          mapContainer.innerHTML = "";
          const map = new maps.Map(mapContainer, { center: coords, level: 3 });
          const marker = new maps.Marker({ map, position: coords });

          mapRef.current = map;
          markerRef.current = marker;

          map.relayout();
          map.setCenter(coords);
          setMapMessage("");
        });
      } catch {
        if (cancelled) return;
        setMapMessage("지도를 불러오지 못했습니다.");
      }
    };

    void run();
    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
    };
  }, [ensureKakaoMapsReady, normalizedAddress]);

  const displayMessage = !normalizedAddress ? "주소 정보가 없습니다." : mapMessage;

  return (
    <div className="h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
      {displayMessage ? (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-xs text-theme-secondary">{displayMessage}</div>
      ) : null}
    </div>
  );
}
