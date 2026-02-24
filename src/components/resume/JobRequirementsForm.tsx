/**
 * JobRequirementsForm - Editable job requirements with weight sliders
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResumeContext } from '@/context/ResumeContext';
import type { JobRequirement } from '@/lib/scoring';

const categoryLabels = {
  skills: 'Technical Skills',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
  keywords: 'Keywords',
};

const categoryColors: Record<string, string> = {
  skills: 'bg-accent/15 text-accent',
  experience: 'bg-score-medium/15 text-score-medium',
  education: 'bg-primary/15 text-primary',
  certifications: 'bg-score-high/15 text-score-high',
  keywords: 'bg-ring/15 text-ring',
};

export function JobRequirementsForm() {
  const { requirements, updateRequirement, addRequirement, removeRequirement } = useResumeContext();
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});

  const totalWeight = requirements.reduce((sum, r) => sum + r.weight, 0);

  const handleAddRequirement = () => {
    addRequirement({
      id: Date.now().toString(),
      category: 'keywords',
      label: 'New Requirement',
      keywords: [],
      weight: 10,
    });
  };

  const handleAddKeyword = (reqId: string) => {
    const keyword = newKeyword[reqId]?.trim();
    if (!keyword) return;
    const req = requirements.find(r => r.id === reqId);
    if (req) {
      updateRequirement(reqId, { keywords: [...req.keywords, keyword] });
      setNewKeyword(prev => ({ ...prev, [reqId]: '' }));
    }
  };

  const handleRemoveKeyword = (reqId: string, keyword: string) => {
    const req = requirements.find(r => r.id === reqId);
    if (req) {
      updateRequirement(reqId, { keywords: req.keywords.filter(k => k !== keyword) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Weight Summary */}
      <div className="flex items-center justify-between bg-card rounded-lg border p-4 shadow-card">
        <div>
          <p className="text-sm font-medium">Total Weight</p>
          <p className="text-xs text-muted-foreground">Sum of all category weights</p>
        </div>
        <div className={`text-2xl font-bold ${totalWeight === 100 ? 'text-score-high' : 'text-score-medium'}`}>
          {totalWeight}%
        </div>
      </div>

      {/* Requirements */}
      <AnimatePresence>
        {requirements.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-lg border shadow-card p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${categoryColors[req.category] || 'bg-muted text-muted-foreground'}`}>
                  {categoryLabels[req.category]}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeRequirement(req.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  value={req.label}
                  onChange={(e) => updateRequirement(req.id, { label: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={req.category}
                  onValueChange={(v) => updateRequirement(req.id, { category: v as JobRequirement['category'] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Weight Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Weight</Label>
                <span className="text-sm font-semibold text-accent">{req.weight}%</span>
              </div>
              <Slider
                value={[req.weight]}
                onValueChange={([v]) => updateRequirement(req.id, { weight: v })}
                min={0}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-accent [&_[role=slider]]:border-accent"
              />
            </div>

            {/* Keywords */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                {req.category === 'experience' ? 'Target Years' : 'Keywords'}
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {req.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted text-foreground cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => handleRemoveKeyword(req.id, kw)}
                  >
                    {kw}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={req.category === 'experience' ? 'e.g., 3' : 'Add keyword...'}
                  value={newKeyword[req.id] || ''}
                  onChange={(e) => setNewKeyword(prev => ({ ...prev, [req.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(req.id)}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => handleAddKeyword(req.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <Button onClick={handleAddRequirement} variant="outline" className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-2" />
        Add Requirement
      </Button>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
