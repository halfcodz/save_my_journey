/** Shown when a newer build is waiting; tapping it swaps in the new version. */
export default function UpdateBanner({ onReload }) {
  return (
    <button type="button" className="update-banner" onClick={onReload}>
      새 버전이 준비됐어요
      <span>새로고침</span>
    </button>
  );
}
