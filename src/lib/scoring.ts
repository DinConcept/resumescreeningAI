/**
 * Scoring Engine Module
 * Implements TF-IDF, cosine similarity, and weighted scoring for resume evaluation
 */

export interface JobRequirement {
  id: string;
  category: 'skills' | 'experience' | 'education' | 'certifications' | 'keywords';
  label: string;
  keywords: string[];
  weight: number; // 0-100
}

export interface ScoreBreakdown {
  category: string;
  label: string;
  score: number; // 0-100
  weight: number;
  weightedScore: number;
  matchedKeywords: string[];
}

export interface CandidateScore {
  candidateName: string;
  email: string;
  phone: string;
  fileName: string;
  extractedSkills: string[];
  totalScore: number;
  breakdown: ScoreBreakdown[];
}

/**
 * Tokenize text into lowercase words
 */
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Calculate Term Frequency for a term in a document
 */
function tf(term: string, tokens: string[]): number {
  const count = tokens.filter(t => t === term || t.includes(term)).length;
  return count / (tokens.length || 1);
}

/**
 * Calculate Inverse Document Frequency across a corpus
 */
function idf(term: string, corpus: string[][]): number {
  const docsWithTerm = corpus.filter(doc =>
    doc.some(t => t === term || t.includes(term))
  ).length;
  return Math.log((corpus.length + 1) / (docsWithTerm + 1)) + 1;
}

/**
 * Calculate TF-IDF vector for a document given a vocabulary
 */
function tfidfVector(tokens: string[], vocabulary: string[], corpus: string[][]): number[] {
  return vocabulary.map(term => tf(term, tokens) * idf(term, corpus));
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate keyword match score for a category
 */
function calculateCategoryScore(
  resumeText: string,
  keywords: string[]
): { score: number; matchedKeywords: string[] } {
  if (keywords.length === 0) return { score: 0, matchedKeywords: [] };

  const lowerText = resumeText.toLowerCase();
  const resumeTokens = tokenize(resumeText);
  const matched: string[] = [];

  // Direct keyword matching
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      matched.push(keyword);
    }
  }

  // TF-IDF based similarity for more nuanced scoring
  const keywordTokens = keywords.flatMap(k => tokenize(k));
  const vocabulary = [...new Set([...keywordTokens])];
  const corpus = [resumeTokens, keywordTokens];
  
  const resumeVec = tfidfVector(resumeTokens, vocabulary, corpus);
  const keywordVec = tfidfVector(keywordTokens, vocabulary, corpus);
  const similarity = cosineSimilarity(resumeVec, keywordVec);

  // Combine direct match ratio and TF-IDF similarity
  const directMatchRatio = matched.length / keywords.length;
  const combinedScore = (directMatchRatio * 0.6 + similarity * 0.4) * 100;

  return {
    score: Math.min(100, Math.round(combinedScore)),
    matchedKeywords: matched,
  };
}

/**
 * Extract years of experience from resume text
 */
function extractExperienceYears(text: string): number {
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)/gi,
    /experience\s*:?\s*(\d+)\+?\s*years?/gi,
  ];
  
  let maxYears = 0;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      maxYears = Math.max(maxYears, parseInt(match[1]));
    }
  }
  return maxYears;
}

/**
 * Check education level in resume
 */
function checkEducation(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  const educationTerms = [
    'phd', 'doctorate', 'master', 'mba', 'bachelor', 'b.sc', 'b.s.',
    'm.sc', 'm.s.', 'b.tech', 'm.tech', 'associate',
    ...keywords.map(k => k.toLowerCase()),
  ];
  return educationTerms.filter(term => lowerText.includes(term));
}

/**
 * Score a single resume against job requirements
 */
export function scoreResume(
  resumeText: string,
  candidateInfo: { name: string; email: string; phone: string; skills: string[]; fileName: string },
  requirements: JobRequirement[]
): CandidateScore {
  const breakdown: ScoreBreakdown[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const req of requirements) {
    let categoryResult: { score: number; matchedKeywords: string[] };

    if (req.category === 'experience') {
      // Special handling for experience
      const years = extractExperienceYears(resumeText);
      const targetYears = parseInt(req.keywords[0]) || 3;
      const ratio = Math.min(years / targetYears, 1);
      categoryResult = {
        score: Math.round(ratio * 100),
        matchedKeywords: years > 0 ? [`${years} years found`] : [],
      };
    } else if (req.category === 'education') {
      const found = checkEducation(resumeText, req.keywords);
      categoryResult = {
        score: found.length > 0 ? Math.min(100, (found.length / Math.max(req.keywords.length, 1)) * 100) : 0,
        matchedKeywords: found,
      };
    } else {
      categoryResult = calculateCategoryScore(resumeText, req.keywords);
    }

    const weightedScore = (categoryResult.score * req.weight) / 100;
    totalWeightedScore += weightedScore;
    totalWeight += req.weight;

    breakdown.push({
      category: req.category,
      label: req.label,
      score: categoryResult.score,
      weight: req.weight,
      weightedScore: Math.round(weightedScore),
      matchedKeywords: categoryResult.matchedKeywords,
    });
  }

  const finalScore = totalWeight > 0
    ? Math.round((totalWeightedScore / totalWeight) * 100)
    : 0;

  return {
    candidateName: candidateInfo.name,
    email: candidateInfo.email,
    phone: candidateInfo.phone,
    fileName: candidateInfo.fileName,
    extractedSkills: candidateInfo.skills,
    totalScore: finalScore,
    breakdown,
  };
}

/**
 * Export results to CSV
 */
export function exportToCSV(results: CandidateScore[]): string {
  const headers = ['Rank', 'Candidate Name', 'Email', 'Phone', 'Score (%)', 'Skills', 'File Name'];
  const rows = results
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((r, i) => [
      i + 1,
      r.candidateName,
      r.email,
      r.phone,
      r.totalScore,
      r.extractedSkills.join('; '),
      r.fileName,
    ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Get default job requirements template
 */
export function getDefaultRequirements(): JobRequirement[] {
  return [
    {
      id: '1',
      category: 'skills',
      label: 'Technical Skills',
      keywords: ['javascript', 'react', 'python', 'sql'],
      weight: 30,
    },
    {
      id: '2',
      category: 'experience',
      label: 'Years of Experience',
      keywords: ['3'],
      weight: 25,
    },
    {
      id: '3',
      category: 'education',
      label: 'Education',
      keywords: ['bachelor', 'master', 'computer science'],
      weight: 15,
    },
    {
      id: '4',
      category: 'certifications',
      label: 'Certifications',
      keywords: ['aws certified', 'pmp', 'scrum master'],
      weight: 10,
    },
    {
      id: '5',
      category: 'keywords',
      label: 'Keywords Relevance',
      keywords: ['team player', 'problem solving', 'agile', 'leadership'],
      weight: 20,
    },
  ];
}
