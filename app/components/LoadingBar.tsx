interface LoadingBarProps {
  /** Text under the bar, naming what is being waited on. */
  hint: string;
  /** Extra class on the wrapper, used to restyle the bar inside the overlay. */
  className?: string;
}

/**
 * Indeterminate progress bar.
 *
 * Indeterminate rather than a percentage because the model streams nothing
 * back that could drive one. The request either has not returned or has.
 * Rendered in two places (the response panel and the code overlay) which
 * previously had two copies of this markup.
 */
export function LoadingBar({ hint, className = "loaderWrap" }: LoadingBarProps) {
  return (
    <div className={className} aria-busy="true">
      <div className="loaderTrack">
        <div className="loaderBar" />
      </div>
      <p className="loaderHint">{hint}</p>
    </div>
  );
}
