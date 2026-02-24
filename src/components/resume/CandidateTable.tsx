/**
 * CandidateTable - Ranked results table with score breakdown and CSV export
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, ChevronUp, Trophy, Medal, Award, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeContext } from '@/context/ResumeContext';
import { exportToCSV, type CandidateScore } from '@/lib/scoring';

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-score-high';
  if (score >= 40) return 'text-score-medium';
  return 'text-score-low';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-score-high';
  if (score >= 40) return 'bg-score-medium';
  return 'bg-score-low';
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-score-medium" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Award className="w-5 h-5 text-score-medium/60" />;
  return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>;
}

export function CandidateTable() {
  const { results } = useResumeContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

  const handleExport = () => {
    const csv = exportToCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-screening-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground">No Results Yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload resumes and run the screening to see ranked results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{sorted.length} Candidates Ranked</h3>
          <p className="text-sm text-muted-foreground">Sorted by highest score</p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {sorted.map((candidate, i) => {
          const isExpanded = expandedId === candidate.fileName;
          return (
            <motion.div
              key={candidate.fileName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-lg border shadow-card overflow-hidden"
            >
              {/* Main Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : candidate.fileName)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  {getRankIcon(i + 1)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{candidate.candidateName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {candidate.email || candidate.fileName}
                  </p>
                </div>

                {/* Score Badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getScoreColor(candidate.totalScore)}`}>
                      {candidate.totalScore}%
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                    <motion.div
                      className={`h-full rounded-full ${getScoreBg(candidate.totalScore)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${candidate.totalScore}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded Breakdown */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t"
                  >
                    <div className="p-4 space-y-4">
                      {/* Contact Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Email</span>
                          <p className="font-medium">{candidate.email || 'Not found'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Phone</span>
                          <p className="font-medium">{candidate.phone || 'Not found'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">File</span>
                          <p className="font-medium truncate">{candidate.fileName}</p>
                        </div>
                      </div>

                      {/* Skills */}
                      {candidate.extractedSkills.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-2">Extracted Skills</span>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.extractedSkills.map(skill => (
                              <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Score Breakdown */}
                      <div>
                        <span className="text-xs text-muted-foreground block mb-3">Score Breakdown</span>
                        <div className="space-y-3">
                          {candidate.breakdown.map(b => (
                            <div key={b.category} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{b.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    weight: {b.weight}%
                                  </span>
                                  <span className={`font-bold ${getScoreColor(b.score)}`}>
                                    {b.score}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${getScoreBg(b.score)}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${b.score}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                              {b.matchedKeywords.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Matched: {b.matchedKeywords.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
