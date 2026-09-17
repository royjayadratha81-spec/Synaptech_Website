import { useRef, useState } from "react";
import {
  CheckCircle2,
  Play,
  Video,
} from "lucide-react";

export default function DemoVideoExperience({
  videoSrc = "/videos/LMS_Demo.mp4",
  title = "Synaptech LMS Demo",
  description = "Watch this short demonstration to see how the Synaptech platform can support learning, administration and digital operations.",
  onStarted,
  onProgress,
  onCompleted,
  onLiveDemoYes,
  onLiveDemoNo,
}) {
  const videoRef = useRef(null);

  const [started, setStarted] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const [trackedProgress, setTrackedProgress] =
    useState({
      25: false,
      50: false,
      75: false,
    });

  const handlePlay = () => {
    if (started) return;

    setStarted(true);

    if (onStarted) {
      onStarted();
    }
  };

  const handleTimeUpdate = () => {
    const video =
      videoRef.current;

    if (
      !video ||
      !video.duration
    ) {
      return;
    }

    const percentage =
      Math.round(
        (video.currentTime /
          video.duration) *
          100
      );

    [25, 50, 75].forEach(
      (point) => {
        if (
          percentage >= point &&
          !trackedProgress[point]
        ) {
          setTrackedProgress(
            (current) => ({
              ...current,
              [point]: true,
            })
          );

          if (onProgress) {
            onProgress(point);
          }
        }
      }
    );
  };

  const handleEnded = () => {
    setCompleted(true);

    if (onCompleted) {
      onCompleted();
    }
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.10)]">

      <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">

          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white">
            <Video className="h-5 w-5" />
          </div>

          <div>
            <div className="text-sm font-black text-slate-950">
              {title}
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-600">
              {description}
            </div>
          </div>

        </div>
      </div>

      <div className="bg-slate-950 p-2">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          playsInline
          preload="metadata"
          onPlay={handlePlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="aspect-video w-full rounded-xl bg-black"
        />
      </div>

      <div className="p-5">

        {!started && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Play className="h-4 w-4 text-orange-500" />
            Start the short demo when you're ready.
          </div>
        )}

        {started &&
          !completed && (
            <div className="text-xs font-bold text-orange-700">
              Demo in progress
            </div>
          )}

        {completed && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">

            <div className="flex items-center gap-2 text-sm font-black text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Demo completed
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              Would you like a personalised live demo with the Synaptech team for your organization?
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">

              <button
                type="button"
                onClick={
                  onLiveDemoYes
                }
                className="rounded-xl bg-orange-500 px-4 py-3 text-xs font-black text-white hover:bg-orange-600"
              >
                Yes, arrange a live demo
              </button>

              <button
                type="button"
                onClick={
                  onLiveDemoNo
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                Not right now
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}