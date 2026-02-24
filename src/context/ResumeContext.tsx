/**
 * Resume Context - Global state management for the resume screening app
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ParsedResume } from '@/lib/resume-parser';
import { JobRequirement, CandidateScore, getDefaultRequirements } from '@/lib/scoring';

interface ResumeContextType {
  // Parsed resumes
  resumes: ParsedResume[];
  addResumes: (newResumes: ParsedResume[]) => void;
  clearResumes: () => void;

  // Job requirements
  requirements: JobRequirement[];
  setRequirements: React.Dispatch<React.SetStateAction<JobRequirement[]>>;
  updateRequirement: (id: string, updates: Partial<JobRequirement>) => void;
  addRequirement: (req: JobRequirement) => void;
  removeRequirement: (id: string) => void;

  // Results
  results: CandidateScore[];
  setResults: React.Dispatch<React.SetStateAction<CandidateScore[]>>;

  // Processing state
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  processingProgress: number;
  setProcessingProgress: React.Dispatch<React.SetStateAction<number>>;

  // Active tab
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

const ResumeContext = createContext<ResumeContextType | null>(null);

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const [resumes, setResumes] = useState<ParsedResume[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>(getDefaultRequirements());
  const [results, setResults] = useState<CandidateScore[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');

  const addResumes = useCallback((newResumes: ParsedResume[]) => {
    setResumes(prev => [...prev, ...newResumes]);
  }, []);

  const clearResumes = useCallback(() => {
    setResumes([]);
    setResults([]);
  }, []);

  const updateRequirement = useCallback((id: string, updates: Partial<JobRequirement>) => {
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const addRequirement = useCallback((req: JobRequirement) => {
    setRequirements(prev => [...prev, req]);
  }, []);

  const removeRequirement = useCallback((id: string) => {
    setRequirements(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <ResumeContext.Provider value={{
      resumes, addResumes, clearResumes,
      requirements, setRequirements, updateRequirement, addRequirement, removeRequirement,
      results, setResults,
      isProcessing, setIsProcessing,
      processingProgress, setProcessingProgress,
      activeTab, setActiveTab,
    }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumeContext() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error('useResumeContext must be used within ResumeProvider');
  return ctx;
}
