import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// Use native label to avoid external deps
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
// Replaced Radix Select with native select to avoid extra deps
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "./ui/dialog";
import { StepItem } from "../types/dance";
import { X } from "lucide-react";

interface StepFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (step: Omit<StepItem, 'id' | 'addedAt'>) => void;
  editingStep?: StepItem | null;
  suggestions?: { dances: string[]; styles: string[]; classes: string[] };
}

export function StepForm({ isOpen, onClose, onSave, editingStep, suggestions }: StepFormProps) {
  const [formData, setFormData] = useState({
    stepName: "",
    description: "",
    class: "",
    dance: "",
    style: "",
    duration: 0,
    playCount: 0,
    lastPlayedAt: Date.now()
  });
  const videoUrl = editingStep?.videoImport || "";
  const [computedDuration, setComputedDuration] = useState<number>(0);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (editingStep) {
      setFormData({
        stepName: editingStep.stepName,
        description: editingStep.description || "",
        class: editingStep.class || "",
        dance: editingStep.dance || "",
        style: editingStep.style || "",
        duration: editingStep.duration || 0,
        playCount: editingStep.playCount || 0,
        lastPlayedAt: editingStep.lastPlayedAt || Date.now()
      });
    } else {
      // Reset form for new step
      setFormData({
        stepName: "",
        description: "",
        class: "",
        dance: "",
        style: "",
        duration: 0,
        playCount: 0,
        lastPlayedAt: Date.now()
      });
    }
    setErrors({});
  }, [editingStep, isOpen]);

  // Compute duration from the video URL metadata
  useEffect(() => {
    if (!videoUrl) return;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;
    const onLoaded = () => {
      const d = isFinite(video.duration) ? Math.max(0, video.duration) : 0;
      setComputedDuration(d);
      setFormData((prev) => ({ ...prev, duration: Math.round(d) }));
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [videoUrl]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.stepName.trim()) {
      newErrors.stepName = "Step name is required";
    }
    
    if (!formData.dance.trim()) {
      newErrors.dance = "Dance type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave({
      ...formData,
      duration: Math.round(formData.duration || computedDuration || 0),
      // Preserve the original video path in the payload
      videoImport: videoUrl,
    } as any);
    
    onClose();
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const danceTypes = ["Salsa", "Bachata", "Tango", "Swing", "Kizomba", "Merengue", "Waltz"];
  const skillLevels = ["Beginner", "Intermediate", "Advanced"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="dr-step-desc">
        <DialogHeader>
          <div className="dr-form-header">
            <DialogTitle className="dr-form-title">
              {editingStep ? "Edit Dance Step" : "Add New Dance Step"}
            </DialogTitle>
            <div className="dr-form-actions">
              <Button type="submit" form="dr-step-form">
                {editingStep ? "Update Step" : "Add Step"}
              </Button>
              <DialogClose aria-label="Close" className="dr-close-btn" onClick={onClose}>
                <X className="w-4 h-4" />
              </DialogClose>
            </div>
          </div>
          <DialogDescription id="dr-step-desc">
            {/* Visually hidden description to satisfy Radix a11y */}
            <span style={{position:"absolute",width:1,height:1,margin:-1,clip:"rect(0 0 0 0)",overflow:"hidden"}}>
              Edit the dance step name, description, dance type, style and class.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        {/* Video preview */}
        {videoUrl && (
          <div className="dr-form-preview">
            <div className="dr-form-video">
              <video src={videoUrl} controls muted playsInline preload="metadata" />
              {computedDuration > 0 && (
                <div className="dr-duration-badge"><Badge variant="secondary">{formatTime(computedDuration)}</Badge></div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="dr-form-grid" id="dr-step-form">
          {/* Step Name */}
          <div className="dr-form-field">
            <label htmlFor="stepName" className="text-sm font-medium">Step Name *</label>
            <Input
              id="stepName"
              value={formData.stepName}
              onChange={(e) => handleInputChange("stepName", e.target.value)}
              placeholder="e.g., Cross Body Lead"
              className={errors.stepName ? "border-destructive" : ""}
            />
            {errors.stepName && (
              <p className="text-sm text-destructive">{errors.stepName}</p>
            )}
          </div>

          {/* Description */}
          <div className="dr-form-field">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the step"
              rows={3}
            />
          </div>

          {/* Dance Type */}
          <div className="dr-form-field">
            <label className="text-sm font-medium">Dance Type *</label>
            <select
              className={`border rounded-md h-9 px-3 w-full ${errors.dance ? "border-destructive" : "border-input"}`}
              value={formData.dance}
              onChange={(e) => handleInputChange("dance", e.target.value)}
            >
              <option value="" disabled>Select dance type</option>
              {danceTypes.map((dance) => (
                <option key={dance} value={dance}>{dance}</option>
              ))}
            </select>
            {errors.dance && (
              <p className="text-sm text-destructive">{errors.dance}</p>
            )}
          </div>

          {/* Style */}
          <div className="dr-form-field">
            <label htmlFor="style" className="text-sm font-medium">Style/Variant</label>
            <Input id="style" value={formData.style} onChange={(e) => handleInputChange("style", e.target.value)} placeholder="e.g., On1, Sensual, Argentine" list={suggestions?.styles?.length ? "style-suggestions" : undefined} />
            {suggestions?.styles?.length ? (
              <datalist id="style-suggestions">
                {suggestions.styles.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            ) : null}
          </div>

          {/* Class */}
          <div className="dr-form-field">
            <label htmlFor="class" className="text-sm font-medium">Class</label>
            <Input id="class" value={formData.class} onChange={(e) => handleInputChange("class", e.target.value)} placeholder="e.g., Beginner Salsa 2025-01" list={suggestions?.classes?.length ? "class-suggestions" : undefined} />
            {suggestions?.classes?.length ? (
              <datalist id="class-suggestions">
                {suggestions.classes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            ) : null}
          </div>

          {/* Duration (from video) */}
          <div className="dr-form-field">
            <label className="text-sm font-medium">Duration</label>
            <div className="text-sm opacity-80">
              {computedDuration > 0 ? `${formatTime(computedDuration)} (${Math.round(computedDuration)}s)` : "Loading from video..."}
            </div>
          </div>

          {/* Footer removed: primary action moved to header */}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
