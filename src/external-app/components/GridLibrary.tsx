import React, { useEffect, useRef, useState } from "react";
import { StepItem } from "../types/dance";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Play, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface GridLibraryProps {
  steps: StepItem[];
  onStepSelect: (step: StepItem) => void;
  onEditStep: (step: StepItem) => void;
  onDeleteStep: (stepId: string) => void;
  onPlayFull?: (step: StepItem) => void;
}

export function GridLibrary({ steps, onStepSelect, onEditStep, onDeleteStep, onPlayFull }: GridLibraryProps) {
  if (steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No dance steps found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dr-grid-scroll">
      <div className="dr-grid">
        {steps.map((step) => (
          <Card 
            key={step.id} 
            className="overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onStepSelect(step)}
          >
            <CardContent className="p-0">
              {/* Thumbnail with overlays */}
              <div className="dr-card-thumb">
                {step.thumbnail ? (
                  <ImageWithFallback
                    src={step.thumbnail}
                    alt={step.stepName}
                  />
                ) : (
                  <VideoThumb src={step.videoImport} alt={step.stepName} />
                )}

                {/* Options Menu (top-right) */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="dr-card-menu"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="dr-card-menu-icon" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEditStep(step);
                      }}
                    >
                      <Edit style={{ width: 12, height: 12, marginRight: 6 }} />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDeleteStep(step.id);
                      }}
                    >
                      <Trash2 style={{ width: 12, height: 12, marginRight: 6 }} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Center play icon */}
                <div className="dr-card-play">
                  <button
                    type="button"
                    className="dr-play-circle"
                    onClick={(e) => { e.stopPropagation(); onPlayFull?.(step); }}
                    aria-label="Play fullscreen"
                  >
                    <Play style={{ width: 16, height: 16, color: '#fff' }} />
                  </button>
                </div>

                {/* Title + tags overlay with bottom gradient */}
                <div className="dr-card-title">
                  <div className="dr-card-title-text">{step.stepName}</div>
                  {(step.dance || step.style) && (
                    <div className="dr-card-tag-row">
                      {step.dance && (
                        <span className="dr-tag-badge">{step.dance}</span>
                      )}
                      {step.style && (
                        <span className="dr-tag-badge">{step.style}</span>
                      )}
                    </div>
                  )}
                  {step.description && (
                    <div className="dr-card-desc-inline" title={step.description}>{step.description}</div>
                  )}
                </div>
              </div>

              <div className="dr-card-body">
                {/* Play count (sticks to bottom of card body) */}
                <div className="dr-card-meta">
                  <div className="dr-card-count">Played {step.playCount ?? 0} times</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VideoThumb({ src, alt }: { src: string; alt?: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (!src || triedRef.current) return;
    triedRef.current = true;
    const video = document.createElement("video");
    video.muted = true;
    (video as any).playsInline = true;
    video.preload = "auto";
    video.src = src;
    const onLoaded = async () => {
      try {
        // Seek to a tiny offset to ensure a frame is available
        try { video.currentTime = Math.min(0.1, (video.duration || 1) * 0.01); } catch {}
        const w = video.videoWidth || 320;
        const h = video.videoHeight || 180;
        const canvas = document.createElement("canvas");
        // Normalize size to reduce memory
        const targetW = 320;
        const targetH = Math.round((h / w) * targetW) || 180;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          const url = canvas.toDataURL("image/jpeg", 0.7);
          setThumbUrl(url);
        }
      } catch {
        // ignore, fallback to inline video element
      }
    };
    video.addEventListener("loadeddata", onLoaded, { once: true });
    return () => {
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, [src]);

  if (thumbUrl) {
    return <img src={thumbUrl} alt={alt} />;
  }
  // Fallback to inline video preview (may not render a frame on some Android devices)
  return (
    <video
      src={src}
      muted
      preload="metadata"
      playsInline
      onLoadedData={(e) => {
        try { (e.currentTarget as HTMLVideoElement).pause(); } catch {}
      }}
    />
  );
}
