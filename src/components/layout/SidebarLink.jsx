import { NavLink } from 'react-router-dom';

export default function SidebarLink({ to, icon: Icon, label, badge, onClick }) {
  if (to) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
          isActive ? 'sidebar-link-active' : 'sidebar-link'
        }
      >
        {Icon && <Icon size={18} />}
        <span className="flex-1">{label}</span>
        {badge !== undefined && (
          <span className="ml-auto bg-[#6C5CE7] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="sidebar-link w-full text-left"
    >
      {Icon && <Icon size={18} />}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-[#6C5CE7] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
