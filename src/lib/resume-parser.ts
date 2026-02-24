/**
 * Resume Parser Module
 * Extracts text from PDF and DOCX files using pdfjs-dist and mammoth
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedResume {
  fileName: string;
  text: string;
  candidateName: string;
  email: string;
  phone: string;
  extractedSkills: string[];
}

/**
 * Extract text from a PDF file
 */
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n');
}

/**
 * Extract text from a DOCX file using mammoth
 */
async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract candidate name from resume text (heuristic: first line or prominent name pattern)
 */
function extractName(text: string): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  // First non-empty line is often the name
  const firstLine = lines[0]?.trim() || '';
  // Check if it looks like a name (2-4 words, no special chars)
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/;
  if (namePattern.test(firstLine) && firstLine.length < 50) {
    return firstLine;
  }
  // Try finding a name pattern in first few lines
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (namePattern.test(trimmed) && trimmed.length < 50) {
      return trimmed;
    }
  }
  return firstLine.substring(0, 40) || 'Unknown Candidate';
}

/**
 * Extract email from resume text
 */
function extractEmail(text: string): string {
  const emailPattern = /[\w.+-]+@[\w-]+\.[\w.]+/;
  const match = text.match(emailPattern);
  return match ? match[0] : '';
}

/**
 * Extract phone number from resume text
 */
function extractPhone(text: string): string {
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const match = text.match(phonePattern);
  return match ? match[0] : '';
}

/**
 * Extract skills from resume text based on common technical and soft skills
 */
function extractSkills(text: string): string[] {
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'swift',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'git', 'ci/cd', 'jenkins', 'github actions',
    'machine learning', 'deep learning', 'nlp', 'computer vision', 'tensorflow', 'pytorch',
    'agile', 'scrum', 'kanban', 'jira',
    'rest api', 'graphql', 'microservices',
    'figma', 'sketch', 'adobe', 'photoshop',
    'excel', 'power bi', 'tableau',
    'leadership', 'management', 'communication', 'teamwork', 'problem solving',
    'project management', 'data analysis', 'data science',
    'devops', 'linux', 'networking', 'security',
    'salesforce', 'sap', 'oracle',
  ];

  const lowerText = text.toLowerCase();
  return commonSkills.filter(skill => lowerText.includes(skill));
}

/**
 * Parse a resume file and extract structured data
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  let text = '';

  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf') {
    text = await extractPdfText(file);
  } else if (ext === 'docx' || ext === 'doc') {
    text = await extractDocxText(file);
  } else {
    throw new Error(`Unsupported file format: .${ext}. Please upload PDF or DOCX files.`);
  }

  return {
    fileName: file.name,
    text,
    candidateName: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    extractedSkills: extractSkills(text),
  };
}
