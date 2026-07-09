"use client";

import { trackMetric } from "./TrackMetric";

/** Source URL that also pings metric:source:{postId} on click. */
export default function SourceLink({
  href,
  postId,
  label,
}: {
  href: string;
  postId: string;
  label: string;
}) {
  return (
    <a
      className="post__source"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackMetric("source", postId)}
    >
      {label}
    </a>
  );
}
