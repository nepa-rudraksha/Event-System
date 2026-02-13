import { Link } from "react-router-dom";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-textMedium hover:text-gold transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-textDark font-semibold" : "text-textMedium"}>
                {item.label}
              </span>
            )}
            {!isLast && (
              <span className="text-textLight">/</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
