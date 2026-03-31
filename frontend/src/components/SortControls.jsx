import { ArrowUpDown, ArrowUp, ArrowDown, Sparkles, GripVertical, TrendingUp, TrendingDown } from "lucide-react";

function SortControls({ sortBy, sortOrder, onSortChange }) {
  const sortOptions = [
    { value: "manual", label: "Manual", icon: GripVertical },
    { value: "name", label: "Nombre", icon: Sparkles },
    { value: "price", label: "Precio", icon: TrendingUp },
    { value: "sku", label: "SKU", icon: ArrowUpDown },
  ];

  const handleSortChange = (field) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, "asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const getPriceIcon = () => {
    if (sortBy !== "price") return <ArrowUpDown size={14} />;
    return sortOrder === "asc" ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
  };

  return (
    <div className="sort-controls">
      <span className="sort-label">Ordenar por:</span>
      <div className="sort-buttons">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              className={`sort-btn ${sortBy === option.value ? "active" : ""}`}
              onClick={() => handleSortChange(option.value)}
            >
              <Icon size={14} />
              <span>{option.label}</span>
              <span className="sort-icon">
                {option.value === "price" ? (
                  sortBy === "price" ? (sortOrder === "asc" ? <TrendingUp size={12} /> : <TrendingDown size={12} />) : <ArrowUpDown size={12} />
                ) : option.value === "manual" ? null : (
                  getSortIcon(option.value)
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SortControls;