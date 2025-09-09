import type React from "react";
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
}

export function GridLibrary({ steps, onStepSelect, onEditStep, onDeleteStep }: GridLibraryProps) {
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
                  // Fallback to showing first video frame when no thumbnail is available
                  <video
                    src={step.videoImport}
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}

                {/* Options Menu (top-right) */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="dr-card-menu"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical style={{ width: 12, height: 12 }} />
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
                  <div className="dr-play-circle">
                    <Play style={{ width: 16, height: 16, color: '#fff' }} />
                  </div>
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
