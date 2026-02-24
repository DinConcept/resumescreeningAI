/**
 * ResumeUploader - Drag and drop bulk resume upload component
 */
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseResume, ParsedResume } from '@/lib/resume-parser';
import { useResumeContext } from '@/context/ResumeContext';

export function ResumeUploader() {
  const { resumes, addResumes, clearResumes } = useResumeContext();
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const ext = f.name.toLowerCase().split('.').pop();
      return ext === 'pdf' || ext === 'docx' || ext === 'doc';
    });
    const invalidFiles = fileArray.filter(f => {
      const ext = f.name.toLowerCase().split('.').pop();
      return ext !== 'pdf' && ext !== 'docx' && ext !== 'doc';
    });

    if (invalidFiles.length > 0) {
      setErrors(invalidFiles.map(f => `${f.name}: Unsupported format. Use PDF or DOCX.`));
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    const parsed: ParsedResume[] = [];
    const newErrors: string[] = [];

    for (const file of validFiles) {
      try {
        const result = await parseResume(file);
        parsed.push(result);
      } catch (err: any) {
        newErrors.push(`${file.name}: ${err.message}`);
      }
    }

    if (newErrors.length > 0) setErrors(prev => [...prev, ...newErrors]);
    if (parsed.length > 0) addResumes(parsed);
    setUploading(false);
  }, [addResumes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <motion.div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50 hover:bg-muted/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('resume-input')?.click()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <input
          id="resume-input"
          type="file"
          multiple
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={handleInputChange}
        />
        <motion.div
          animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-glow">
            <Upload className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {isDragging ? 'Drop resumes here' : 'Upload Resumes'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag & drop PDF or DOCX files, or click to browse
            </p>
          </div>
        </motion.div>

        {uploading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Processing resumes...</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Upload Errors</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setErrors([])}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-muted-foreground">{err}</p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Files List */}
      {resumes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Uploaded Resumes ({resumes.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={clearResumes} className="text-muted-foreground hover:text-destructive">
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {resumes.map((resume, i) => (
                <motion.div
                  key={resume.fileName + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-card"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{resume.candidateName}</p>
                    <p className="text-xs text-muted-foreground truncate">{resume.fileName}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-score-high flex-shrink-0 ml-auto" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
