import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetDate: string; // ISO date string
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isPast: false,
  };
}

function formatCountdown(timeLeft: TimeLeft): string {
  if (timeLeft.isPast) {
    return "Agora";
  }

  if (timeLeft.days > 0) {
    return `em ${timeLeft.days} dia${timeLeft.days > 1 ? "s" : ""}`;
  }

  if (timeLeft.hours > 0) {
    return `em ${timeLeft.hours}h ${timeLeft.minutes}min`;
  }

  if (timeLeft.minutes > 0) {
    return `em ${timeLeft.minutes}min`;
  }

  return `em ${timeLeft.seconds}s`;
}

export function Countdown({ targetDate, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(targetDate)
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Calculate initial time
    const initial = calculateTimeLeft(targetDate);
    setTimeLeft(initial);

    // Don't start interval if already past
    if (initial.isPast) {
      return;
    }

    // Start interval
    intervalRef.current = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      // Stop the interval when countdown reaches zero
      if (newTimeLeft.isPast && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [targetDate]);

  const countdownText = formatCountdown(timeLeft);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        timeLeft.isPast
          ? "text-red-600"
          : timeLeft.days === 0
          ? "text-yellow-600"
          : "text-muted-foreground",
        className
      )}
    >
      <Clock size={16} />
      <span>{countdownText}</span>
    </div>
  );
}
