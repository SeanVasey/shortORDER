/** The shortORDER wordmark: "short" quiet, "ORDER" loud. */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="wm-quiet">short</span>
      <span className="wm-loud">ORDER</span>
    </span>
  );
}
