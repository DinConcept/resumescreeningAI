/**
 * Dashboard Page - Main resume screening interface with tabs
 */
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Settings, BarChart3, Play, Loader2, FileText, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResumeUploader } from '@/components/resume/ResumeUploader';
import { JobRequirementsForm } from '@/components/resume/JobRequirementsForm';
import { CandidateTable } from '@/components/resume/CandidateTable';
import { useResumeContext } from '@/context/ResumeContext';
import { scoreResume } from '@/lib/scoring';

const Index = () => {
  const {
    resumes, requirements, results,
    setResults, isProcessing, setIsProcessing,
    processingProgress, setProcessingProgress,
    activeTab, setActiveTab,
  } = useResumeContext();

  const handleScreen = useCallback(async () => {
    if (resumes.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    const scores = [];

    for (let i = 0; i < resumes.length; i++) {
      const resume = resumes[i];
      const result = scoreResume(
        resume.text,
        {
          name: resume.candidateName,
          email: resume.email,
          phone: resume.phone,
          skills: resume.extractedSkills,
          fileName: resume.fileName,
        },
        requirements
      );
      scores.push(result);
      setProcessingProgress(Math.round(((i + 1) / resumes.length) * 100));
      // Small delay to show progress
      await new Promise(r => setTimeout(r, 100));
    }

    setResults(scores);
    setIsProcessing(false);
    setActiveTab('results');
  }, [resumes, requirements, setResults, setIsProcessing, setProcessingProgress, setActiveTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary border-b">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
                  <Target className="w-5 h-5 text-accent-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-primary-foreground">ResumeAI</h1>
              </div>
              <p className="text-sm text-primary-foreground/70 mt-1 ml-[52px]">
                AI-Powered Resume Screening System
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-primary-foreground/70">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs">Resumes</span>
                </div>
                <p className="text-lg font-bold text-primary-foreground">{resumes.length}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-primary-foreground/70">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">Screened</span>
                </div>
                <p className="text-lg font-bold text-primary-foreground">{results.length}</p>
              </div>
              {results.length > 0 && (
                <div className="text-center">
                  <div className="flex items-center gap-1.5 text-primary-foreground/70">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="text-xs">Avg Score</span>
                  </div>
                  <p className="text-lg font-bold text-primary-foreground">
                    {Math.round(results.reduce((s, r) => s + r.totalScore, 0) / results.length)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="bg-card border shadow-card">
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="requirements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="w-4 h-4 mr-2" />
                Requirements
              </TabsTrigger>
              <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="w-4 h-4 mr-2" />
                Results
                {results.length > 0 && (
                  <span className="ml-1.5 text-xs bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">
                    {results.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Screen Button */}
            <Button
              onClick={handleScreen}
              disabled={resumes.length === 0 || isProcessing}
              className="gradient-accent text-accent-foreground shadow-glow hover:opacity-90 transition-opacity"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Screening... {processingProgress}%
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Screen Resumes ({resumes.length})
                </>
              )}
            </Button>
          </div>

          {/* Processing Bar */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-1.5 bg-muted rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full gradient-accent rounded-full"
                animate={{ width: `${processingProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          )}

          <TabsContent value="upload" className="animate-fade-in">
            <ResumeUploader />
          </TabsContent>

          <TabsContent value="requirements" className="animate-fade-in">
            <JobRequirementsForm />
          </TabsContent>

          <TabsContent value="results" className="animate-fade-in">
            <CandidateTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
