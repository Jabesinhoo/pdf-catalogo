import { formatMoney, getQuoteNumbers } from "../utils/quoteMath";

function QuoteEditorTable({
  products,
  updateProductField,
  removeProduct,
  currency = "COP",
}) {
  if (!products.length) return null;

  return (
    <section className="panel">
      <div className="panelHeader compact">
        <div>
          <h3>Editor rápido de cotización</h3>
          <p>Edita todo en tabla sin abrir modal en cada producto.</p>
        </div>
      </div>

      <div className="quoteTableWrap">
        <table className="quoteEditorTable">
          <thead>
            <tr>
              <th>UND</th>
              <th>DESCRIPCIÓN</th>
              <th>SKU</th>
              <th>IVA</th>
              <th>VR. UNIT</th>
              <th>VR. UNIT + IVA</th>
              <th>VR. TOTAL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const q = getQuoteNumbers(product);
              const unitWithIva = q.unitValue * (1 + q.ivaRate / 100);

              return (
                <tr key={product.id}>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={product.quantity || 1}
                      onChange={(e) =>
                        updateProductField(product.id, "quantity", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={product.name || ""}
                      onChange={(e) =>
                        updateProductField(product.id, "name", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={product.sku || ""}
                      onChange={(e) =>
                        updateProductField(product.id, "sku", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <select
                      value={product.ivaRate ?? 0}
                      onChange={(e) =>
                        updateProductField(product.id, "ivaRate", e.target.value)
                      }
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="19">19%</option>
                    </select>
                  </td>

                  <td>
                    <input
                      type="text"
                      value={product.price || ""}
                      onChange={(e) =>
                        updateProductField(product.id, "price", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <div className="tableMoneyCell">
                      {formatMoney(unitWithIva, currency)}
                    </div>
                  </td>

                  <td>
                    <div className="tableMoneyCell">
                      {formatMoney(q.total, currency)}
                    </div>
                  </td>

                  <td>
                    <button
                      className="ghostBtn smallBtn"
                      onClick={() => removeProduct(product.id)}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default QuoteEditorTable;