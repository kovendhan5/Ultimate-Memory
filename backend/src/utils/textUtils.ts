/**
 * Utility functions for text processing and analysis
 */

/**
 * Estimate token count for text
 * Approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + '...';
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, limit: number = 10): string[] {
  // Remove common words (stop words)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ]);

  // Tokenize and filter
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequencies
  const frequencies = new Map<string, number>();
  words.forEach(word => {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  });

  // Sort by frequency and return top keywords
  return Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Generate summary of text
 */
export function generateSummary(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let summary = '';
  for (const sentence of sentences) {
    if ((summary + sentence).length <= maxLength) {
      summary += sentence;
    } else {
      break;
    }
  }

  return summary.trim() || text.substring(0, maxLength) + '...';
}

/**
 * Detect potential PII (Personally Identifiable Information)
 */
export function detectPII(text: string): {
  hasPII: boolean;
  types: string[];
  redactedText?: string;
} {
  const piiPatterns = [
    { type: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { type: 'phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
    { type: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
    { type: 'credit_card', regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
    { type: 'ip_address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g }
  ];

  const detectedTypes: string[] = [];
  let redactedText = text;

  for (const pattern of piiPatterns) {
    if (pattern.regex.test(text)) {
      detectedTypes.push(pattern.type);
      redactedText = redactedText.replace(pattern.regex, `[${pattern.type.toUpperCase()}_REDACTED]`);
    }
  }

  return {
    hasPII: detectedTypes.length > 0,
    types: detectedTypes,
    redactedText: detectedTypes.length > 0 ? redactedText : undefined
  };
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}
