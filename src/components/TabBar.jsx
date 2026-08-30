import { BookIcon, HomeIcon, PersonIcon, PlusIcon, SearchIcon } from "./Icons.jsx";

const items = [
  { id: "home", label: "홈", Icon: HomeIcon },
  { id: "explore", label: "탐색", Icon: SearchIcon },
  { id: "trips", label: "여행 기록", Icon: BookIcon },
  { id: "profile", label: "프로필", Icon: PersonIcon },
];

/**
 * The floating black pill. The centre slot is a raised action rather than a
 * destination, so it sits between 탐색 and 여행 기록 exactly as the design shows.
 */
export default function TabBar({ active, onNavigate, onAdd }) {
  const [home, explore, trips, profile] = items;

  const tab = (item) => {
    const { id, label, Icon } = item;
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
  };

  return (
    <nav className="tab-bar" aria-label="주요 화면">
      {tab(home)}
      {tab(explore)}
      <button type="button" className="tab-fab" onClick={onAdd} aria-label="장소 기록 추가">
        <PlusIcon />
      </button>
      {tab(trips)}
      {tab(profile)}
    </nav>
  );
}
