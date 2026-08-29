"use client";

import React from "react";

interface DiscoverLastUpdatedProps {
  generatedAt: string;
}

function getMinutesAgo(generatedAt: string) {
  const elapsed = Date.now() - new Date(generatedAt).getTime();
  return Math.max(0, Math.floor(elapsed / 60_000));
}

export default function DiscoverLastUpdated({
  generatedAt,
}: DiscoverLastUpdatedProps) {
  const [minutesAgo, setMinutesAgo] = React.useState(0);

  React.useLayoutEffect(() => {
    const update = () => setMinutesAgo(getMinutesAgo(generatedAt));
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [generatedAt]);

  return (
    <p className="mt-4 text-center text-xs text-foreground/60">
      Last updated{" "}
      <time dateTime={generatedAt}>
        {minutesAgo} {minutesAgo === 1 ? "minute" : "minutes"} ago
      </time>
    </p>
  );
}
