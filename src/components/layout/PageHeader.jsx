import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, description, breadcrumbs = [], actions }) {
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-[#8b949e] mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-[#383838]" />}
              {crumb.to || crumb.path ? (
                <Link to={crumb.to || crumb.path} className="hover:text-[#ffa116] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#eff2f6] font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#eff2f6] flex items-center gap-2.5">{title}</h1>
          {description && <p className="text-sm text-[#8b949e] mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
