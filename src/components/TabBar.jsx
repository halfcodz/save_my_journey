import { BookIcon, PersonIcon, PlusIcon, SearchIcon } from "./Icons.jsx";

export const TABS = [
  { id: "records", label: "나만의 여행 코스", Icon: BookIcon },
  { id: "search", label: "검색", Icon: SearchIcon },
  { id: "profile", label: "프로필", Icon: PersonIcon },
];

/**
 * Three destinations in a narrow black pill. v3 lifts the add action out of the
 * bar into its own floating button, so every slot here is a place to go.
 */
export default function TabBar({ active, onNavigate }) {
  return (
    <nav className="tab-bar" aria-label="주요 화면">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            onClick={() => onNavigate(id)}
          >
            <Icon />
            {isActive ? <span className="tab-dot" /> : null}
          </button>
        );
      })}
    </nav>
  );
}

/** The 56px black circle that sits above the bar on the 기록 screen. */
export function AddButton({ onClick, label = "장소 기록 추가" }) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label={label}>
      <PlusIcon width={22} height={22} />
    </button>
  );
}
