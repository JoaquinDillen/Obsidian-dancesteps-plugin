/**
 * StepForm component
 *
 * Dialog form used to create or edit a dance step. Provides text inputs,
 * select fields with suggestions, and basic validation. Emits an object
 * compatible with StepItem (minus id/addedAt) on save.
 */
import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// Use native label to avoid external deps
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
// Replaced Radix Select with native select to avoid extra deps
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "./ui/dialog";
import { StepItem } from "../types/dance";
import { X } from "lucide-react";

/** Props for the StepForm dialog. */
interface StepFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (step: Omit<StepItem, 'id' | 'addedAt'>) => void;
  editingStep?: StepItem | null;
  suggestions?: { dances: string[]; styles: string[]; classes: string[] };
}

export function StepForm({ isOpen, onClose, onSave, editingStep, suggestions }: StepFormProps) {
  // Predefined style/variant options per dance type
  const DANCE_STYLE_OPTIONS: Record<string, string[]> = useMemo(() => ({
    Salsa: [
      "On1",
      "On2",
      "LA Style",
      "NY Style",
      "Cuban",
      "Casino",
      "Rueda de Casino",
      "Shines",
      "Partnerwork",
      "Footwork",
    ],
    Bachata: [
      "Dominican",
      "Sensual",
      "Fusion",
      "Moderna",
      "Urbana",
      "Footwork",
      "Partnerwork",
    ],
    Tango: [
      "Argentine",
      "Milonga",
      "Vals",
      "Salon",
      "Nuevo",
      "Canyengue",
      "Stage",
    ],
    Swing: [
      "Lindy Hop",
      "Charleston",
      "Balboa",
      "East Coast",
      "West Coast",
      "Shag",
      "Boogie Woogie",
      "Jive",
    ],
    Kizomba: [
      "Traditional",
      "Urban Kiz",
      "Tarraxinha",
      "Ghetto Zouk",
    ],
    Merengue: [
      "Dominican",
      "Urban",
      "Partnerwork",
      "Footwork",
    ],
    Waltz: [
      "Viennese",
      "American Smooth",
      "International Standard",
      "Country",
      "Cross-Step",
    ],
    Zouk: [
      "Lambada",
      "Traditional",
      "Flow",
      "Neo",
    ],
    "West Coast Swing": [
      "Classic",
      "Strictly",
      "Contemporary",
    ],
    "East Coast Swing": [
      "Single Step",
      "Triple Step",
      "Lindy",
    ],
    Samba: ["International", "Pagode", "Gafieira"],
    Rumba: ["International", "American"],
    "Cha Cha": ["International", "American"],
    Foxtrot: ["International", "American"],
    Quickstep: ["International"],
    Hustle: ["3-count", "4-count", "Latin Hustle"],
    Forró: ["Universitário", "Roots", "Miudinho"],
  }), []);
  const danceTypes = useMemo(() => {
    const base = [
      "Salsa",
      "Bachata",
      "Tango",
      "Swing",
      "Kizomba",
      "Merengue",
      "Waltz",
      "Zouk",
      "West Coast Swing",
      "East Coast Swing",
      "Samba",
      "Rumba",
      "Cha Cha",
      "Foxtrot",
      "Quickstep",
      "Hustle",
      "Forró",
    ];
    const fromMap = Object.keys(DANCE_STYLE_OPTIONS);
    return Array.from(new Set([...base, ...fromMap])).sort((a, b) => a.localeCompare(b));
  }, [DANCE_STYLE_OPTIONS]);
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
  const [isCustomStyle, setIsCustomStyle] = useState<boolean>(false);
  const [isCustomDance, setIsCustomDance] = useState<boolean>(false);

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
    setIsCustomStyle(false);
    setIsCustomDance(false);
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

  // Ensure custom style mode stays in sync with current values
  useEffect(() => {
    const d = formData.dance;
    const s = (formData.style || "").trim();
    const options = d ? DANCE_STYLE_OPTIONS[d] : undefined;
    if (options && s && !options.includes(s)) {
      setIsCustomStyle(true);
    } else if (options && (!s || options.includes(s))) {
      setIsCustomStyle(false);
    }
  }, [formData.dance, formData.style, DANCE_STYLE_OPTIONS]);

  // Keep custom dance toggle in sync with value list
  useEffect(() => {
    const d = (formData.dance || "").trim();
    if (d && !danceTypes.includes(d)) {
      setIsCustomDance(true);
    } else if (!d || danceTypes.includes(d)) {
      setIsCustomDance(false);
    }
  }, [formData.dance, danceTypes]);

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

  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="dr-step-desc">
        <DialogHeader>
          <div className="dr-form-header">
            <DialogTitle className="dr-form-title">
              {editingStep ? "Edit Dance Step" : "Add New Dance Step"}
            </DialogTitle>
            <div className="dr-form-actions">
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
        
        {/* Video preview (fallback on unsupported formats like AVI) */}
        {videoUrl && (
          <div className="dr-form-preview">
            <div className="dr-form-video">
              {(() => {
                const ext = (editingStep?.id || "").split(".").pop()?.toLowerCase();
                if (ext === "avi") {
                  return (
                    <div style={{ padding: 12, color: 'var(--text-muted)' }}>
                      Preview not available for .avi on this device. The video is still imported; you can edit details and save.
                    </div>
                  );
                }
                return (
                  <video src={videoUrl} controls muted playsInline preload="metadata" />
                );
              })()}
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
              value={isCustomDance ? "__custom_dance__" : (formData.dance || "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__custom_dance__") {
                  setIsCustomDance(true);
                  handleInputChange("dance", "");
                } else {
                  setIsCustomDance(false);
                  handleInputChange("dance", val);
                }
                // Reset style when dance changes or toggling custom
                setIsCustomStyle(false);
                handleInputChange("style", "");
              }}
            >
              <option value="" disabled>Select dance type</option>
              {danceTypes.map((dance) => (
                <option key={dance} value={dance}>{dance}</option>
              ))}
              <option value="__custom_dance__">Custom…</option>
            </select>
            {isCustomDance && (
              <Input
                id="dance"
                value={formData.dance}
                onChange={(e) => handleInputChange("dance", e.target.value)}
                placeholder="Type a custom dance type"
                list={suggestions?.dances?.length ? "dance-suggestions" : undefined}
              />
            )}
            {isCustomDance && suggestions?.dances?.length ? (
              <datalist id="dance-suggestions">
                {suggestions.dances.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            ) : null}
            {errors.dance && (
              <p className="text-sm text-destructive">{errors.dance}</p>
            )}
          </div>

          {/* Style / Variant */}
          <div className="dr-form-field">
            <label htmlFor="style" className="text-sm font-medium">Style/Variant</label>
            {formData.dance && DANCE_STYLE_OPTIONS[formData.dance] ? (
              <>
                <select
                  className="border rounded-md h-9 px-3 w-full border-input"
                  value={isCustomStyle ? "__custom__" : (formData.style || "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") {
                      setIsCustomStyle(true);
                      // don't set style yet; wait for input
                    } else {
                      setIsCustomStyle(false);
                      handleInputChange("style", v);
                    }
                  }}
                >
                  <option value="" disabled>Select style/variant</option>
                  {DANCE_STYLE_OPTIONS[formData.dance].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
                {isCustomStyle && (
                  <Input
                    id="style"
                    value={formData.style}
                    onChange={(e) => handleInputChange("style", e.target.value)}
                    placeholder="Type a custom style/variant"
                  />
                )}
              </>
            ) : (
              <Input
                id="style"
                value={formData.style}
                onChange={(e) => handleInputChange("style", e.target.value)}
                placeholder="e.g., On1, Sensual, Argentine"
                list={suggestions?.styles?.length ? "style-suggestions" : undefined}
              />
            )}
            {(!formData.dance || !DANCE_STYLE_OPTIONS[formData.dance]) && suggestions?.styles?.length ? (
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

          {/* Duration (from video) + Submit on same row (bottom-right) */}
          <div className="dr-form-field">
            <label className="text-sm font-medium">Duration</label>
            <div className="dr-form-duration-row">
              <div className="text-sm opacity-80">
                {computedDuration > 0 ? `${formatTime(computedDuration)} (${Math.round(computedDuration)}s)` : "Loading from video..."}
              </div>
              <Button type="submit">
                {editingStep ? "Update Step" : "Add Step"}
              </Button>
            </div>
          </div>
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
