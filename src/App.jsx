import { useState, useEffect, useRef } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const RSS = "https://www.ozbargain.com.au/deals/feed";

const getProxiedUrl = (url) => {
  if (import.meta.env.DEV) {
    // In development, use the Vite proxy configured in vite.config.js
    return url.replace("https://www.ozbargain.com.au", "/ozproxy");
  }
  // In production, use a more reliable public CORS proxy
  return `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getNodeId  = (url) => url?.match(/\/node\/(\d+)/)?.[1] || null;
const rawImgUrl  = (id)  => id
  ? `https://files.ozbargain.com.au/n/${String(id).slice(-2)}/${id}.jpg`
  : null;

const CATS = {
  "Gaming":                   { icon: "🎮", color: "#7c3aed" },
  "Electrical & Electronics": { icon: "⚡", color: "#0ea5e9" },
  "Computing":                { icon: "💻", color: "#10b981" },
  "Travel":                   { icon: "✈️", color: "#ef4444" },
  "Fashion & Apparel":        { icon: "👗", color: "#ec4899" },
  "Home & Garden":            { icon: "🏡", color: "#22c55e" },
  "Entertainment":            { icon: "🎬", color: "#f59e0b" },
  "Groceries":                { icon: "🛒", color: "#14b8a6" },
  "Mobile":                   { icon: "📱", color: "#8b5cf6" },
  "Dining & Takeaway":        { icon: "🍕", color: "#dc2626" },
  "Health & Beauty":          { icon: "💊", color: "#e879f9" },
  "Sports & Outdoors":        { icon: "🏃", color: "#84cc16" },
  "Automotive":               { icon: "🚗", color: "#f97316" },
  "Finance & Insurance":      { icon: "💵", color: "#06b6d4" },
  "Education":                { icon: "📚", color: "#fbbf24" },
};
const getCat = (name) => CATS[name] || { icon: "💰", color: "#FF5900" };

const ago = (d) => {
  if (!d) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60)    return `${~~s}s ago`;
  if (s < 3600)  return `${~~(s / 60)}m ago`;
  if (s < 86400) return `${~~(s / 3600)}h ago`;
  return `${~~(s / 86400)}d ago`;
};

// ─── RSS Parser ───────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid RSS XML");

  return Array.from(doc.querySelectorAll("item")).map((item) => {
    // <link> in RSS can behave oddly in DOMParser; iterate childNodes to be safe
    let link = "";
    for (const n of item.childNodes)
      if (n.nodeName === "link") { link = n.textContent?.trim() || ""; break; }
    // Fallback: derive from comments URL
    if (!link)
      link = item.querySelector("comments")?.textContent?.replace(/#comments$/, "").trim() || "";

    const id       = getNodeId(link);
    const rawDesc  = item.querySelector("description")?.textContent || "";
    const tmp      = document.createElement("div");
    tmp.innerHTML  = rawDesc;
    const desc     = (tmp.textContent || rawDesc).trim();

    const rawTitle = item.querySelector("title")?.textContent || "";
    const price    = rawTitle.match(/\*(\$[\d,]+(?:\.\d+)?)\*/)?.[1]  || null;
    const store    = rawTitle.match(/@\s*([^*([\n]+?)(?:\s*[[(]|\s*\*|$)/)?.[1]?.trim() || null;
    const cats     = Array.from(item.querySelectorAll("category"))
                       .map((c) => c.textContent.trim()).filter(Boolean);
    const pd       = new Date(item.querySelector("pubDate")?.textContent || "");

    // Comment count extraction: check slash:comments, comments (if numeric), or commentRss
    let rssCommentCount = null;
    for (const child of item.childNodes) {
      const ln = child.localName || child.nodeName;
      if (ln === "comments" || ln === "slash:comments" || ln === "commentCount") {
        const txt = child.textContent?.trim();
        if (txt && /^\d+$/.test(txt)) {
          rssCommentCount = parseInt(txt);
          break;
        }
      }
    }

    return {
      uid:          id || Math.random().toString(36).slice(2),
      nodeId:       id,
      link,
      imageUrl:     rawImgUrl(id),        // no-hash CDN attempt
      title:        rawTitle.replace(/\*([^*]+)\*/g, "$1").trim(),
      description:  desc.slice(0, 300),
      categories:   cats,
      pubDate:      isNaN(pd.getTime()) ? null : pd,
      price:        price || null,
      store:        store || null,
      commentCount: rssCommentCount,
    };
  });
}

// ─── Deal Page Scraper (votes, comment count, better image, comments) ─────────
async function scrapeDealPage(url) {
  const res  = await fetch(getProxiedUrl(url));
  const html = await res.text();
  const doc  = new DOMParser().parseFromString(html, "text/html");

  // og:image has the correct hash baked in
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;

  // Vote count — try multiple Drupal/OzBargain selectors
  let votes = null;
  const voteSelectors = [
    ".voteupbox", ".voteup .number", ".voteup strong",
    ".vote-positive", ".vote-count strong", "#deal-vote",
  ];
  for (const sel of voteSelectors) {
    const el = doc.querySelector(sel);
    if (el) {
      const n = parseInt(el.textContent.trim().replace(/[^\d]/g, ""));
      if (!isNaN(n) && n >= 0) { votes = n; break; }
    }
  }

  // Comment count — find "N comments" anchor or specific header
  let commentCount = null;
  const ccEl = doc.querySelector("#comments h2, .comment-title");
  if (ccEl) {
    const m = ccEl.textContent.match(/(\d+)/);
    if (m) commentCount = parseInt(m[1]);
  }

  if (commentCount === null) {
    for (const a of doc.querySelectorAll("a")) {
      const txt = a.textContent.trim().toLowerCase();
      if (txt.includes("comment")) {
        const m = txt.match(/(\d+)/);
        if (m) { commentCount = parseInt(m[1]); break; }
      }
    }
  }

  // Parse comments
  const comments = Array.from(doc.querySelectorAll(".comment")).map((el) => {
    const author = (
      el.querySelector(".submitted a")?.textContent ||
      el.querySelector(".username")?.textContent ||
      el.querySelector("[class*='author']")?.textContent ||
      "OzBargainer"
    ).trim().replace(/^\s*by\s*/i, "");

    const contentSelectors = [".field-item", ".comment-body", ".content p", ".content"];
    const text = contentSelectors
      .map((s) => el.querySelector(s)?.textContent?.trim())
      .find((t) => t && t.length > 0) || "";

    // Try to get a timestamp
    const dateEl = el.querySelector(".date, .submitted, time");
    const date   = dateEl?.textContent?.replace(/^\s*by .+? on\s*/i, "").trim() || "";

    return { author, text: text.slice(0, 500), date };
  }).filter((c) => c.text.length > 2);

  return { ogImage, votes, commentCount, comments };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionButton({ icon, label, accentBg, accentBorder, onClick }) {
  const [pop, setPop] = useState(false);
  const trigger = () => {
    setPop(true);
    setTimeout(() => setPop(false), 220);
    onClick?.();
  };
  return (
    <button onClick={trigger} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      background: "none", border: "none", cursor: "pointer", padding: 0,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, background: accentBg, border: `1px solid ${accentBorder}`,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        transition: "transform .18s cubic-bezier(.34,1.56,.64,1)",
        transform: pop ? "scale(.78)" : "scale(1)",
        boxShadow: pop ? `0 0 18px ${accentBorder}` : "none",
      }}>{icon}</div>
      {label && (
        <span style={{
          fontSize: 12, fontWeight: 700, color: "#fff",
          textShadow: "0 1px 8px rgba(0,0,0,1)",
          fontFamily: "Chakra Petch, sans-serif", letterSpacing: .5,
          minWidth: 40, textAlign: "center",
          background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4,
        }}>{label}</span>
      )}
    </button>
  );
}

function BottomNavbar({ onHomeClick }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: 70, background: "rgba(6,6,6,0.92)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 100, borderTop: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(15px)", WebkitBackdropFilter: "blur(15px)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <button 
        onClick={onHomeClick}
        style={{
          background: "none", border: "none", color: "#FF5900", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          transition: "transform 0.1s",
        }}
        onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <div style={{ fontSize: 26 }}>🏠</div>
        <span style={{ 
          fontSize: 10, fontFamily: "Oswald, sans-serif", fontWeight: 600, 
          letterSpacing: 1, textTransform: "uppercase" 
        }}>Home</span>
      </button>
    </div>
  );
}

function HeroCard({ innerRef }) {
  return (
    <div className="ozb-card" ref={innerRef} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #121212 0%, #000 100%)",
      padding: "20px", textAlign: "center", gap: 30
    }}>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 100, animation: "flamePulse 2s ease infinite" }}>🔥</div>
        <div style={{
          position: "absolute", inset: -30, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,89,0,.2) 0%, transparent 70%)",
          animation: "flamePulse 2s ease infinite",
        }} />
      </div>
      <div style={{
        fontFamily: "Chakra Petch, sans-serif", fontSize: 42, fontWeight: 700,
        letterSpacing: 4, color: "#FF5900",
        textShadow: "0 0 40px rgba(255,89,0,.4)",
      }}>OZBARGAIN</div>
      <div style={{
        fontFamily: "DM Sans, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)",
        maxWidth: 280, lineHeight: 1.6, letterSpacing: 0.5, fontWeight: 400
      }}>
        The hottest deals from the OzBargain community, delivered in a whole new way.
      </div>
      <div style={{
        marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        animation: "swipeHint 2s infinite"
      }}>
        <span style={{ fontSize: 24, color: "rgba(255,89,0,0.5)" }}>↓</span>
        <span style={{
          fontFamily: "Oswald, sans-serif", fontSize: 11, letterSpacing: 3,
          color: "rgba(255,255,255,0.25)", textTransform: "uppercase"
        }}>Swipe up for deals</span>
      </div>
    </div>
  );
}

function CommentsPanel({ open, loading, items, title, onClose }) {
  const listRef = useRef(null);
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.65)",
          zIndex: 50, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
          transition: "opacity .3s",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "74vh",
        background: "linear-gradient(170deg, #161616 0%, #111 100%)",
        borderRadius: "22px 22px 0 0", zIndex: 60,
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform .38s cubic-bezier(.32,.72,0,1)",
        display: "flex", flexDirection: "column",
        boxShadow: "0 -10px 60px rgba(0,0,0,.8), 0 -1px 0 rgba(255,89,0,.2)",
      }}>
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2, margin: "12px auto 0",
          background: "rgba(255,255,255,.14)",
        }} />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,.07)", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{
            flex: 1, fontFamily: "Oswald, sans-serif", fontSize: 15,
            letterSpacing: 1, color: "#fff", fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title || "Comments"}</span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
            color: "rgba(255,255,255,.65)", width: 32, height: 32,
            borderRadius: "50%", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* List */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loading && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 16,
            }}>
              <div style={{ fontSize: 36, animation: "spin 1.2s linear infinite" }}>⚙️</div>
              <span style={{
                fontFamily: "Oswald, sans-serif", fontSize: 13, letterSpacing: 3,
                color: "#FF5900",
              }}>LOADING COMMENTS</span>
            </div>
          )}
          {!loading && items.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 14,
              color: "rgba(255,255,255,.28)", fontFamily: "DM Sans, sans-serif",
            }}>
              <span style={{ fontSize: 52 }}>🦗</span>
              <span style={{ fontSize: 14 }}>Crickets… no comments yet</span>
            </div>
          )}
          {!loading && items.map((c, i) => (
            <div key={i} style={{
              padding: "13px 20px",
              borderBottom: "1px solid rgba(255,255,255,.04)",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                <span style={{
                  fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 13,
                  color: "#FF5900",
                }}>@{c.author}</span>
                {c.date && (
                  <span style={{
                    fontFamily: "DM Sans, sans-serif", fontSize: 11,
                    color: "rgba(255,255,255,.25)",
                  }}>{c.date}</span>
                )}
              </div>
              <div style={{
                fontFamily: "DM Sans, sans-serif", fontSize: 13,
                color: "rgba(255,255,255,.72)", lineHeight: 1.55,
              }}>{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      width: "100%", height: "100vh", background: "#080808",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 28,
    }}>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 80, animation: "flamePulse 1.4s ease infinite" }}>🔥</div>
        <div style={{
          position: "absolute", inset: -20, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,89,0,.18) 0%, transparent 70%)",
          animation: "flamePulse 1.4s ease infinite",
        }} />
      </div>
      <div style={{
        fontFamily: "Chakra Petch, sans-serif", fontSize: 24, fontWeight: 700,
        letterSpacing: 6, color: "#FF5900",
        textShadow: "0 0 30px rgba(255,89,0,.5)",
      }}>OZBARGAIN</div>
      <div style={{
        fontFamily: "DM Sans, sans-serif", fontSize: 13, letterSpacing: 2,
        color: "rgba(255,255,255,.3)", textTransform: "uppercase",
      }}>Fetching the hottest deals…</div>
      <div style={{
        display: "flex", gap: 6, marginTop: 8,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: "#FF5900",
            animation: `dotBounce 1.1s ease ${i * .18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div style={{
      width: "100%", height: "100vh", background: "#080808",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 18, padding: "0 36px", textAlign: "center",
    }}>
      <div style={{ fontSize: 64 }}>📡</div>
      <div style={{
        fontFamily: "Oswald, sans-serif", fontSize: 24, color: "#FF5900", letterSpacing: 2,
      }}>CONNECTION FAILED</div>
      <div style={{
        fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "rgba(255,255,255,.45)",
        lineHeight: 1.7, maxWidth: 360,
      }}>
        {error}
      </div>
      <div style={{
        fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "rgba(255,255,255,.22)",
        lineHeight: 1.8, maxWidth: 340,
        padding: "14px 18px",
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 10,
      }}>
        This app uses a CORS proxy to reach OzBargain. 
        If you are seeing this, the request might be blocked by Cloudflare or the proxy service is down.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8, padding: "12px 28px", borderRadius: 8,
          background: "#FF5900", border: "none", color: "#fff",
          fontFamily: "Oswald, sans-serif", fontSize: 15, letterSpacing: 2,
          cursor: "pointer",
        }}
      >RETRY</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [deals,      setDeals]      = useState([]);
  const [status,     setStatus]     = useState("loading"); // loading | error | ok
  const [errMsg,     setErrMsg]     = useState("");
  const [activeIdx,  setActiveIdx]  = useState(0);
  const [imgErr,     setImgErr]     = useState({});         // uid → true
  const [meta,       setMeta]       = useState({});         // nodeId → { ogImage, votes, commentCount, comments }
  const [panel,      setPanel]      = useState({ open: false, loading: false, items: [], title: "" });
  const [pullY,      setPullY]      = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showHero,   setShowHero]   = useState(true);

  const feedRef  = useRef(null);
  const cardRefs = useRef([]);
  const heroRef  = useRef(null);
  const cache    = useRef({});      // nodeId → scraped data (prevent double-fetching)
  const pending  = useRef(new Set());
  const touch    = useRef({ startY: 0, pulling: false });

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");

    try {
      const r = await fetch(getProxiedUrl(RSS));
      if (!r.ok) throw new Error(`Fetch failed (HTTP ${r.status}). OzBargain may be blocking the request.`);
      const xml = await r.text();
      const parsed = parseRSS(xml);
      if (!parsed.length) throw new Error("RSS parsed but returned no deals.");
      setDeals(parsed);
      setStatus("ok");
      if (isRefresh) {
        setActiveIdx(0);
        setShowHero(false); // After refresh, go straight to deals
        feedRef.current?.scrollTo({ top: 0 });
      }
    } catch (e) {
      setErrMsg(e.message || String(e));
      setStatus("error");
    } finally {
      setRefreshing(false);
      setPullY(0);
    }
  };

  // ── Initial Fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── IntersectionObserver — track visible card ────────────────────────────────
  useEffect(() => {
    if (!deals.length || !feedRef.current) return;
    const root = feedRef.current;
    const obs  = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          if (e.target === heroRef.current) {
            // Hero is active, do nothing special for now
          } else {
            const i = cardRefs.current.findIndex((r) => r === e.target);
            if (i !== -1) {
              setActiveIdx(i);
              if (showHero) {
                // Once we swipe to the first deal, hide the hero
                // and snap the deal to the top.
                setTimeout(() => setShowHero(false), 800);
              }
            }
          }
        }
      }),
      { threshold: 0.55, root }
    );
    cardRefs.current.forEach((r) => r && obs.observe(r));
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, [deals, showHero]);

  // Adjust scroll when hero is removed
  useEffect(() => {
    if (!showHero && feedRef.current) {
      if (feedRef.current.scrollTop > 0) {
        feedRef.current.scrollTop = 0;
      }
    }
  }, [showHero]);

  // ── Lazily scrape deal page when card is active (600 ms debounce) ────────────
  useEffect(() => {
    const deal = deals[activeIdx];
    if (!deal?.nodeId || cache.current[deal.nodeId] || pending.current.has(deal.nodeId)) return;
    const t = setTimeout(async () => {
      pending.current.add(deal.nodeId);
      try {
        const data = await scrapeDealPage(deal.link);
        cache.current[deal.nodeId] = data;
        setMeta((prev) => ({ ...prev, [deal.nodeId]: data }));
      } catch { /* Silently fail */ }
      pending.current.delete(deal.nodeId);
    }, 600);
    return () => clearTimeout(t);
  }, [activeIdx, deals]);

  // ── Open comments panel ───────────────────────────────────────────────────────
  const openComments = async (deal) => {
    const title = deal.title.length > 38 ? `${deal.title.slice(0, 38)}…` : deal.title;

    if (cache.current[deal.nodeId]) {
      setPanel({ open: true, loading: false, items: cache.current[deal.nodeId].comments, title });
      return;
    }
    setPanel({ open: true, loading: true, items: [], title });
    pending.current.add(deal.nodeId);
    try {
      const data = await scrapeDealPage(deal.link);
      cache.current[deal.nodeId] = data;
      setMeta((prev) => ({ ...prev, [deal.nodeId]: data }));
      setPanel({ open: true, loading: false, items: data.comments, title });
    } catch {
      setPanel({ open: true, loading: false, items: [], title });
    }
    pending.current.delete(deal.nodeId);
  };

  // ── Pull to Refresh Handlers ──────────────────────────────────────────────────
  const onTouchStart = (e) => {
    if (!showHero && feedRef.current?.scrollTop === 0) {
      touch.current.startY = e.touches[0].clientY;
      touch.current.pulling = true;
    }
  };
  const onTouchMove = (e) => {
    if (!touch.current.pulling) return;
    const y = e.touches[0].clientY - touch.current.startY;
    if (y > 0) {
      setPullY(Math.min(y * 0.4, 80));
      if (y > 10) e.preventDefault();
    } else {
      touch.current.pulling = false;
      setPullY(0);
    }
  };
  const onTouchEnd = () => {
    if (touch.current.pulling && pullY >= 60) loadFeed(true);
    else setPullY(0);
    touch.current.pulling = false;
  };

  // ── Keyboard nav (↑ / ↓) ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown" && activeIdx < deals.length - 1)
        cardRefs.current[activeIdx + 1]?.scrollIntoView({ behavior: "smooth" });
      if (e.key === "ArrowUp" && activeIdx > 0)
        cardRefs.current[activeIdx - 1]?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIdx, deals.length]);

  // ── Render states ─────────────────────────────────────────────────────────────
  if (status === "loading") return <LoadingScreen />;
  if (status === "error")   return <ErrorScreen error={errMsg} />;

  return (
    <div style={{
      width: "100%", height: "100vh", background: "#080808",
      overflow: "hidden", position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=Chakra+Petch:wght@600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ozb-feed {
          height: 100vh;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          overscroll-behavior-y: contain;
          transition: transform .2s cubic-bezier(.2,0,.2,1);
        }
        .ozb-feed::-webkit-scrollbar { display: none; }

        .ozb-card {
          height: 100vh;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          position: relative;
          overflow: hidden;
          background: #060606;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .ozb-info { animation: slideUp .44s cubic-bezier(.22,1,.36,1) forwards; }

        @keyframes flamePulse {
          0%, 100% { transform: scale(1);    opacity: .9; }
          50%       { transform: scale(1.25); opacity: 1;  }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0); opacity: .3; }
          40%           { transform: scale(1); opacity: 1;  }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes badgePop {
          from { opacity: 0; transform: translateY(-6px) scale(.9); }
          to   { opacity: 1; transform: translateY(0)    scale(1);  }
        }
        .ozb-badge { animation: badgePop .35s cubic-bezier(.22,1,.36,1) forwards; }

        @keyframes swipeHint {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
          60% { transform: translateY(-6px); }
        }
      `}</style>

      {/* ── Refresh Indicator Overlay ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        paddingTop: "15vh",
        zIndex: 40, pointerEvents: "none",
        background: `linear-gradient(to bottom, rgba(255,89,0,${Math.min(pullY / 120, 0.4)}) 0%, transparent 100%)`,
        opacity: pullY > 10 ? 1 : 0,
        transition: refreshing ? "none" : "opacity .3s, background .3s",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          transform: `translateY(${pullY - 100}px) scale(${Math.min(pullY / 60, 1.2)})`,
          transition: refreshing ? "none" : "transform .1s ease-out",
        }}>
          <div style={{
            width: 70, height: 70, borderRadius: "50%", 
            background: "#FF5900",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(255,89,0,0.6), 0 0 80px rgba(255,89,0,0.2)",
            animation: refreshing ? "spin .8s linear infinite" : "none",
          }}>
            <span style={{ fontSize: 32, color: "#fff" }}>{refreshing ? "⚙️" : "↓"}</span>
          </div>
          <span style={{
            fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 700,
            color: "#fff", letterSpacing: 4, textTransform: "uppercase",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            opacity: pullY > 30 ? 1 : 0,
            transition: "opacity .2s",
          }}>
            {refreshing ? "Refreshing..." : pullY >= 60 ? "Release to update" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* ── Scroll Feed ── */}
      <div 
        className="ozb-feed" 
        ref={feedRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: pullY > 0 ? `translateY(${pullY}px)` : "none" }}
      >
        {showHero && <HeroCard innerRef={heroRef} />}
        {deals.map((deal, i) => {
          const m          = meta[deal.nodeId] || {};
          const c          = getCat(deal.categories[0]);
          const isActive   = (i === activeIdx);
          const failed     = imgErr[deal.uid];
          const imgSrc     = m.ogImage || deal.imageUrl;
          
          const totalComments = m.commentCount ?? deal.commentCount;
          const commentLabel  = totalComments != null ? `${totalComments}` : null;

          return (
            <div
              key={deal.uid}
              className="ozb-card"
              ref={(el) => (cardRefs.current[i] = el)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 16px 140px", // increased bottom padding for navbar
                gap: 20
              }}
            >
              {/* ── Background (Subtle) ── */}
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(circle at 50% 50%, ${c.color}15 0%, #050505 80%)`,
                zIndex: 0
              }} />

              {/* ── Square Image Container ── */}
              <div style={{
                width: "100%",
                maxWidth: "340px",
                aspectRatio: "1 / 1",
                position: "relative",
                zIndex: 1,
                borderRadius: 16,
                overflow: "hidden",
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.08)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
              }}>
                {!failed && imgSrc && (
                  <img
                    src={imgSrc}
                    alt=""
                    onError={() => setImgErr((p) => ({ ...p, [deal.uid]: true }))}
                    style={{
                      width: "100%", height: "100%",
                      objectFit: "contain", // Show full image without stretching
                      background: "#fff", // White background for the product image
                    }}
                  />
                )}
                {(failed || !imgSrc) && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 80, opacity: .2, userSelect: "none",
                  }}>{c.icon}</div>
                )}
                
                {/* ── Category badge (inside image area) ── */}
                {isActive && (
                  <div className="ozb-badge" style={{
                    position: "absolute", top: 12, left: 12, zIndex: 10,
                  }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 12,
                      background: "rgba(0,0,0,.6)",
                      border: `1px solid ${c.color}88`,
                      color: c.color,
                      fontSize: 10, fontWeight: 700, letterSpacing: .7,
                      textTransform: "uppercase", fontFamily: "DM Sans, sans-serif",
                      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    }}>
                      <span style={{ fontSize: 12 }}>{c.icon}</span>
                      {deal.categories[0] || "Deal"}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Bottom deal info ── */}
              {isActive && (
                <div
                  className="ozb-info"
                  style={{
                    width: "100%",
                    maxWidth: "340px",
                    zIndex: 1,
                    textAlign: "left"
                  }}
                >
                  {/* Store name */}
                  {deal.store && (
                    <div style={{
                      fontFamily: "Chakra Petch, sans-serif", fontSize: 11, letterSpacing: 1.8,
                      color: "rgba(255,255,255,.38)", textTransform: "uppercase", marginBottom: 5,
                    }}>@ {deal.store}</div>
                  )}

                  {/* Price & Title Row */}
                  <div style={{ marginBottom: 12 }}>
                    {deal.price && (
                      <span style={{
                        fontFamily: "Chakra Petch, sans-serif", fontSize: 32, fontWeight: 700,
                        color: "#FFD700", marginRight: 12, verticalAlign: "middle",
                        textShadow: "0 0 30px rgba(255,215,0,.3)",
                      }}>{deal.price}</span>
                    )}
                    <span style={{
                      fontFamily: "Oswald, sans-serif", fontSize: 20, fontWeight: 600,
                      color: "#fff", lineHeight: 1.2, verticalAlign: "middle",
                    }}>{deal.title}</span>
                  </div>

                  {/* Description */}
                  <div style={{
                    fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 300,
                    color: "rgba(255,255,255,.6)", lineHeight: 1.6, marginBottom: 14,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>{deal.description}</div>

                  {/* Meta row */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                    fontFamily: "DM Sans, sans-serif", fontSize: 11, letterSpacing: .4,
                    color: "rgba(255,255,255,.3)",
                  }}>
                    {deal.pubDate && <span>🕐 {ago(deal.pubDate)}</span>}
                    {deal.link && (() => {
                      try {
                        return <span>🔗 {new URL(deal.link).hostname.replace("www.", "")}</span>;
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              )}

              {/* ── Action bar (repositioned for new layout) ── */}
              <div style={{
                position: "absolute", right: 12, bottom: 90, zIndex: 10,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
              }}>
                <ActionButton
                  icon="💬"
                  label={commentLabel}
                  accentBg="rgba(255,89,0,.12)"
                  accentBorder="rgba(255,89,0,.36)"
                  onClick={() => openComments(deal)}
                />
                <ActionButton
                  icon="↗️"
                  label="Open"
                  accentBg="rgba(255,89,0,.12)"
                  accentBorder="rgba(255,89,0,.36)"
                  onClick={() => window.open(deal.link, "_blank")}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Navbar ── */}
      <BottomNavbar onHomeClick={() => loadFeed(true)} />

      {/* ── Comments panel ── */}
      <CommentsPanel
        open={panel.open}
        loading={panel.loading}
        items={panel.items}
        title={panel.title}
        onClose={() => setPanel((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
