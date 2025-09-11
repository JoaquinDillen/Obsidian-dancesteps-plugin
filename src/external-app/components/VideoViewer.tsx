import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X as CloseIcon,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
// Replaced Radix Slider with native range for precise styling
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { StepItem } from "../types/dance";

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
  autoPlayInitial?: boolean;
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
  autoPlayInitial,
}: VideoViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pendingAutoplay, setPendingAutoplay] = useState<boolean>(!!autoPlayInitial);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const railEl = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

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

  const handleTimeChange = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Custom slider helpers
  const setTimeFromClientX = (clientX: number) => {
    const railDom = railEl.current;
    const d = duration || 0;
    if (!railDom || d <= 0) return;
    const rect = railDom.getBoundingClientRect();
    const rel = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = rel / rect.width;
    handleTimeChange(pct * d);
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
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      if (pendingAutoplay) {
        // Attempt to play; if blocked, user can tap center button
        video.play().catch(() => {});
        setPendingAutoplay(false);
      }
      // compute rail after metadata (we know aspect)
      computeRail();
    };
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

  // Compute the visible video width within the stage and position rails accordingly
  const computeRail = () => {
    const st = stageRef.current;
    const v = videoRef.current;
    if (!st || !v) return;
    const sw = st.clientWidth;
    const sh = st.clientHeight;
    const vw = v.videoWidth || 0;
    const vh = v.videoHeight || 0;
    if (!sw || !sh || !vw || !vh) {
      setRail({ left: 0, width: sw });
      return;
    }
    const aspect = vw / vh;
    let dispW = sw;
    let dispH = sw / aspect;
    if (dispH > sh) {
      dispH = sh;
      dispW = sh * aspect;
    }
    const left = Math.max(0, Math.round((sw - dispW) / 2));
    setRail({ left, width: Math.round(dispW) });
  };

  // Recompute on resize and when stage size changes
  useEffect(() => {
    computeRail();
    const ro = new (window as any).ResizeObserver?.(() => computeRail());
    if (ro && stageRef.current) ro.observe(stageRef.current);
    const onResize = () => computeRail();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (ro && stageRef.current) ro.unobserve(stageRef.current);
    };
  }, []);

  // Drag listeners for custom slider
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isScrubbing) return;
      const x = (e as TouchEvent).touches && (e as TouchEvent).touches.length
        ? (e as TouchEvent).touches[0].clientX
        : (e as MouseEvent).clientX;
      setTimeFromClientX(x);
    };
    const onUp = () => setIsScrubbing(false);
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('touchmove', onMove as any, { passive: false } as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchmove', onMove as any as any);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isScrubbing, duration]);

  // Reset video when step changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    // duration will refresh when new metadata loads
    if (autoPlayInitial) {
      setPendingAutoplay(true);
    }
  }, [step.id]);

  return (
    <div className="dr-vv-root">
      {/* Video Container (fullscreen) */}
      <div className="dr-vv-stage" ref={stageRef}>
        {/* Real video element (plays vault file) */}
        <video
          ref={videoRef}
          className="dr-vv-video"
          src={step.videoImport}          // vault URL (from adapter)
          poster={step.thumbnail || undefined}
          muted={isMuted}
          playsInline
          preload="metadata"
        />

        {/* Top overlay: Back + Menu */}
        <div className="dr-vv-top" style={{ left: rail.left, right: 'auto', width: rail.width }}>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={onBack} className="dr-vv-close-btn">
            <CloseIcon className="dr-vv-close-icon" strokeWidth={3} />
          </Button>
        </div>

        {/* Middle navigation arrows removed per design; swipe still works */}

        {/* Info overlay (only when paused) */}
        {!isPlaying && (
          <div
            className="dr-vv-info pointer-events-none"
            style={{ left: rail.left, right: 'auto', width: rail.width, bottom: 150 }}
          >
            <div className="dr-vv-info-inner">
              <h2 className="dr-vv-title">{step.stepName}</h2>
              {step.description && (
                <p className="dr-vv-desc line-clamp-3">
                  {step.description}
                </p>
              )}
              <div className="dr-vv-tags">
                {step.class && (
                  <Badge variant="secondary" className="dr-vv-badge">
                    {step.class}
                  </Badge>
                )}
                {step.dance && (
                  <Badge variant="secondary" className="dr-vv-badge">
                    {step.dance}
                  </Badge>
                )}
                {step.style && (
                  <Badge variant="secondary" className="dr-vv-badge">
                    {step.style}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Bottom controls row: prev / play-pause / next / mute */}
      <div
        className="dr-vv-controls"
        style={{ left: rail.left, width: rail.width }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => { e.stopPropagation(); }}
      >
          <Button
            variant="ghost"
            size="icon"
            className="dr-ctrl-btn"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            aria-label="Previous"
          >
            <ChevronLeft className="dr-ctrl-icon" />
          </Button>
          <Button
            size="lg"
            className="dr-ctrl-btn rounded-full w-12 h-12"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="dr-ctrl-icon" /> : <Play className="dr-ctrl-icon" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="dr-ctrl-btn"
            onClick={goToNext}
            disabled={currentIndex === allSteps.length - 1}
            aria-label="Next"
          >
            <ChevronRight className="dr-ctrl-icon" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="dr-ctrl-btn"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="dr-ctrl-icon" /> : <Volume2 className="dr-ctrl-icon" />}
          </Button>
      </div>

      {/* Bottom edge gradient (always from screen bottom) */}
      <div className="dr-vv-bottom-fade" />

      {/* Bottom controls overlay: progress + times (interactive) */}
      <div
        className="dr-vv-progress"
        style={{ left: rail.left, width: rail.width }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => { e.stopPropagation(); }}
      >
        <div>
          <div className="dr-vv-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || step.duration || 0)}</span>
          </div>
          {/* Custom slider: black rail, white progress, white circular knob */}
          <div
            ref={railEl}
            className="dr-vv-rail"
            onPointerDown={(e) => { setIsScrubbing(true); setTimeFromClientX(e.clientX); }}
            onMouseDown={(e) => { setIsScrubbing(true); setTimeFromClientX(e.clientX); }}
            onTouchStart={(e) => { setIsScrubbing(true); setTimeFromClientX((e.touches?.[0]?.clientX) || 0); }}
            style={{ position: 'relative', height: 16, borderRadius: 999, background: '#000' }}
            aria-label="Seek"
          >
            {/* Progress */}
            <div
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(duration ? (currentTime / duration) : 0) * 100}%`, background: '#fff', borderRadius: 999 }}
            />
            {/* Thumb */}
            <div
              style={{ position: 'absolute', top: '50%', left: `${(duration ? (currentTime / duration) : 0) * 100}%`, transform: 'translate(-50%, -50%)', width: 28, height: 28, borderRadius: '50%', background: '#fff', border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.25)', pointerEvents: 'none' }}
            />
          </div>
        </div>
      </div>
      </div>
      {/* Floating small controls can go here if needed */}
    </div>
  );
}
