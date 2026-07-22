import type { MetadataRoute } from "next";

const SITE_URL = "https://gitnewstars.vercel.app";

/**
 * Explicitly welcome AI answer-engine crawlers (GEO): being crawlable by
 * GPTBot/ClaudeBot/PerplexityBot etc. is what makes articles citable inside
 * ChatGPT Search, Claude, Perplexity and Google AI Overviews. Admin and API
 * surfaces stay out of every index.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin/", "/api/"];
  const aiCrawlers = [
    "GPTBot", // OpenAI training + retrieval
    "OAI-SearchBot", // ChatGPT Search
    "ChatGPT-User", // ChatGPT live browsing
    "ClaudeBot", // Anthropic indexing
    "Claude-User", // Claude live browsing
    "Claude-SearchBot", // Claude search
    "PerplexityBot", // Perplexity index
    "Perplexity-User", // Perplexity live browsing
    "Google-Extended", // Gemini training/grounding opt-in
    "GoogleOther",
    "Bingbot", // ChatGPT Search retrieves via Bing
    "CCBot", // Common Crawl — feeds many model corpora
    "meta-externalagent",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
