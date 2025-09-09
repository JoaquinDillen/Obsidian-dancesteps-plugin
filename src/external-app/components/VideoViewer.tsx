import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { StepItem } from "../types/dance";
import { useSwipeGesture } from "../hooks/useSwipeGesture";

interface VideoViewerProps {
  step: StepItem;
  allSteps: StepItem[];
  onBack: () => void;
  onStepChange: (step: StepItem) => void;
  onEditStep: (step: StepItem) => void;
  onDeleteStep: (stepId: string) => void;
  onOpenPath: () => void;          // <— add
  onRevealPath: () => void;        // <— add
  onCopyPath: () => void;          // <— add
}


export function VideoViewer({
  step,
  allSteps,
  onBack,
  onStepChange,
  onEditStep,
  onDeleteStep,
  onOpenPath,
  onRevealPath,
  onCopyPath,
}: VideoViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentIndex = allSteps.findIndex((s) => s.id === step.id);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onStepChange(allSteps[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < allSteps.length - 1) {
      onStepChange(allSteps[currentIndex + 1]);
    }
  };

  const swipeRef = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
  });

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
    // isPlaying will update via play/pause events below
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleTimeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Attach basic listeners to keep state in sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Reset video when step changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    // duration will refresh when new metadata loads
  }, [step.id]);

  return (
    <div className="h-full flex flex-col bg-background" ref={swipeRef}>
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-3">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 flex items-center gap-3">
          <h1 className="truncate">{step.stepName}</h1>
          <Badge variant="secondary" className="text-xs">
            {currentIndex + 1} / {allSteps.length}
          </Badge>
        </div>

        {/* Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenPath}>Open file in Obsidian</DropdownMenuItem>
              <DropdownMenuItem onClick={onRevealPath}>Reveal in vault</DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyPath}>Copy path</DropdownMenuItem>
              <div className="my-1 h-px bg-border" />
              <DropdownMenuItem onClick={() => onEditStep(step)}>
                <Edit className="w-4 h-4 mr-2" /> Edit Step
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteStep(step.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Step
              </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        {/* Real video element (plays vault file) */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          src={step.videoImport}          // vault URL (from adapter)
          poster={step.thumbnail || undefined}
          muted={isMuted}
          playsInline
          preload="metadata"
        />

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white"
          onClick={goToNext}
          disabled={currentIndex === allSteps.length - 1}
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Bottom overlay with step info */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h2 className="text-xl mb-2">{step.stepName}</h2>
            {step.description && (
              <p className="text-sm text-white/90 mb-3 line-clamp-2">
                {step.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {step.class && (
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  {step.class}
                </Badge>
              )}
              {step.dance && (
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  {step.dance}
                </Badge>
              )}
              {step.style && (
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  {step.style}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Center play/pause button overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Button
            size="lg"
            className="pointer-events-auto rounded-full w-16 h-16 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Video Controls */}
      <div className="p-4 bg-card border-t">
        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[Math.min(currentTime, duration || 0)]}
            max={duration || step.duration || 0}
            step={0.1}
            onValueChange={handleTimeChange}
            className="w-full"
            aria-label="Seek"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || step.duration || 0)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            onClick={togglePlay}
            className="rounded-full w-12 h-12"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            disabled={currentIndex === allSteps.length - 1}
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
