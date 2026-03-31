function DocumentTypeSwitch({ value = "catalog", onChange, options = [] }) {
  const fallbackOptions = [
    { value: "catalog", label: "Catálogo" },
    { value: "quote", label: "Cotización" },
  ];

  const items = options.length ? options : fallbackOptions;

  return (
    <section className="panel">
      <div className="panelHeader compact">
        <div>
          <h3>Tipo de documento</h3>
          <p>Elige si quieres catálogo o cotización.</p>
        </div>
      </div>

      <div className="tabs">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={value === item.value ? "tab active" : "tab"}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default DocumentTypeSwitch;