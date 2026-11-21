import { useEffect, useState } from 'react';

export function timeOfDayGreeting(d = new Date()): string {
  const hr = d.getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLiveClock(d = new Date()): string {
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Updates every second so greeting + clock stay live. */
export function useLiveGreeting() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return {
    greeting: timeOfDayGreeting(now),
    clock: formatLiveClock(now),
  };
}
