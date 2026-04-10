import { useCallback, useEffect, useState } from "react";

const CACHE_KEY = "stelo_google_fonts";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

// Popular fonts curated subset — loaded without API key
const FALLBACK_FONTS = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins",
  "Oswald", "Raleway", "Playfair Display", "Merriweather",
  "Bebas Neue", "Abril Fatface", "Permanent Marker", "Pacifico",
  "Lobster", "Righteous", "Bangers", "Press Start 2P", "Orbitron",
  "Space Grotesk", "JetBrains Mono", "Fira Code", "Anton",
  "Archivo Black", "Russo One", "Teko", "Comfortaa", "Quicksand",
  "Nunito", "Ubuntu",
];

interface CachedFonts {
  fonts: string[];
  ts: number;
}

export function useGoogleFonts() {
  const [fonts, setFonts] = useState<string[]>(FALLBACK_FONTS);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load font list from cache or fetch popular fonts
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedFonts = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL && parsed.fonts.length > 0) {
          setFonts(parsed.fonts);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fetch top 200 popular Google Fonts (public CSS endpoint, no API key needed)
    (async () => {
      try {
        const res = await fetch(
          "https://fonts.google.com/metadata/fonts",
        );
        if (!res.ok) return;
        // Google's metadata endpoint returns JSONP-like response
        const text = await res.text();
        const json = JSON.parse(text.replace(/^\)\]\}'\n/, ""));
        const familyNames: string[] = (json.familyMetadataList || [])
          .slice(0, 200)
          .map((f: { family: string }) => f.family);
        if (familyNames.length > 0) {
          setFonts(familyNames);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ fonts: familyNames, ts: Date.now() }),
          );
        }
      } catch {
        // Keep fallback fonts
      }
    })();
  }, []);

  // Load a specific font on demand
  const loadFont = useCallback(
    async (family: string) => {
      if (loadedFonts.has(family)) return;
      setLoading(true);
      try {
        // Inject Google Fonts CSS
        const linkId = `gfont-${family.replace(/\s+/g, "-")}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement("link");
          link.id = linkId;
          link.rel = "stylesheet";
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
          document.head.appendChild(link);
        }
        // Wait for font to actually load
        await document.fonts.load(`16px "${family}"`);
        setLoadedFonts((prev) => new Set(prev).add(family));
      } catch {
        // Font load failed — text will use fallback
      } finally {
        setLoading(false);
      }
    },
    [loadedFonts],
  );

  return { fonts, loadFont, loadedFonts, loading };
}
