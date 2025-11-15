/**
 * Bot detection utilities
 * These are basic heuristics to help identify bot traffic
 */

export interface BotDetectionResult {
  isLikelyBot: boolean;
  reasons: string[];
  confidence: number; // 0-1
}

/**
 * Check if a user agent string looks suspicious
 */
export function checkUserAgent(userAgent: string | null): BotDetectionResult {
  if (!userAgent) {
    return {
      isLikelyBot: true,
      reasons: ["Missing user agent"],
      confidence: 0.8,
    };
  }

  const reasons: string[] = [];
  let confidence = 0;

  // Common bot patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http/i,
    /httpclient/i,
    /scrapy/i,
    /headless/i,
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      reasons.push(`User agent matches bot pattern: ${pattern}`);
      confidence += 0.3;
    }
  }

  // Missing common browser indicators
  if (!userAgent.includes("Mozilla") && !userAgent.includes("Chrome") && !userAgent.includes("Safari") && !userAgent.includes("Firefox")) {
    reasons.push("Missing browser indicators");
    confidence += 0.4;
  }

  // Very short user agents are suspicious
  if (userAgent.length < 20) {
    reasons.push("Unusually short user agent");
    confidence += 0.2;
  }

  return {
    isLikelyBot: confidence > 0.5,
    reasons,
    confidence: Math.min(confidence, 1),
  };
}

/**
 * Check request headers for suspicious patterns
 */
export function checkRequestHeaders(headers: Headers): BotDetectionResult {
  const reasons: string[] = [];
  let confidence = 0;

  // Missing referer is suspicious (though not always a bot)
  const referer = headers.get("referer");
  if (!referer) {
    reasons.push("Missing referer header");
    confidence += 0.2;
  }

  // Missing accept header
  const accept = headers.get("accept");
  if (!accept) {
    reasons.push("Missing accept header");
    confidence += 0.3;
  }

  // Missing accept-language
  const acceptLanguage = headers.get("accept-language");
  if (!acceptLanguage) {
    reasons.push("Missing accept-language header");
    confidence += 0.2;
  }

  // Check user agent
  const userAgent = headers.get("user-agent");
  const uaCheck = checkUserAgent(userAgent);
  if (uaCheck.isLikelyBot) {
    reasons.push(...uaCheck.reasons);
    confidence += uaCheck.confidence * 0.5;
  }

  return {
    isLikelyBot: confidence > 0.5,
    reasons,
    confidence: Math.min(confidence, 1),
  };
}

/**
 * Log bot detection result (for monitoring)
 */
export function logBotDetection(
  path: string,
  result: BotDetectionResult,
  additionalInfo?: Record<string, unknown>
) {
  if (result.isLikelyBot) {
    console.warn("[BOT_DETECTION]", {
      path,
      isLikelyBot: result.isLikelyBot,
      confidence: result.confidence,
      reasons: result.reasons,
      ...additionalInfo,
      timestamp: new Date().toISOString(),
    });
  }
}

