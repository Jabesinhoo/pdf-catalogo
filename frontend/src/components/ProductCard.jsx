import { ExternalLink, Copy, Square, CheckSquare, Edit2, Trash2, Calculator } from "lucide-react";
import { formatMoney, parseMoney } from "../utils/quoteMath";
import { useState, useEffect, useMemo } from "react";

function ProductCard({
  product,
  checked = false,
  onToggle,
  onEdit,
  onRemove,
  onDuplicate,
  onChange,
  documentType = "catalog",
  userRole = "asesor",
  isSelectedForBatch = false,
  onSelectForBatch = null,
}) {

  const [localQuantity, setLocalQuantity] = useState(String(product?.quantity ?? 1));
  const [isEditing, setIsEditing] = useState(false);
  const [showPriceAdjust, setShowPriceAdjust] = useState(false);
  const [localPriceAdjustOp, setLocalPriceAdjustOp] = useState(product?.priceAdjustOp || '');
  const [localPriceAdjustValue, setLocalPriceAdjustValue] = useState(product?.priceAdjustValue || '');

  useEffect(() => {
    setLocalPriceAdjustOp(product?.priceAdjustOp || '');
    setLocalPriceAdjustValue(product?.priceAdjustValue || '');
  }, [product?.priceAdjustOp, product?.priceAdjustValue, product?.id]);

  const currentQuantity = isEditing
    ? (parseInt(localQuantity, 10) || 0)
    : (product?.quantity ?? 1);

  function handleCardClick(e) {
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT' ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('select')
    ) {
      return;
    }

    if (product.productUrl) {
      window.open(product.productUrl, '_blank', 'noopener,noreferrer');
    }
  }

  if (!isEditing && String(product?.quantity ?? 1) !== localQuantity) {
    setLocalQuantity(String(product?.quantity ?? 1));
  }

  const calculateAdjustedPrice = useMemo(() => {
    const originalPrice = parseMoney(product?.price || 0);
    const op = localPriceAdjustOp;
    const val = localPriceAdjustValue;
    
    if (!op || !val) return originalPrice;
    
    const value = parseFloat(val);
    if (isNaN(value)) return originalPrice;
    
    if (op === '/') {
      return originalPrice / value;
    } else if (op === '*') {
      return originalPrice * value;
    }
    return originalPrice;
  }, [product?.price, localPriceAdjustOp, localPriceAdjustValue]);

  const displayPrice = calculateAdjustedPrice;
  const displayPriceFormatted = formatMoney(displayPrice);

  const calculatePriceWithoutIva = () => {
    if (!displayPrice) return null;
    
    if (product.ivaType === 'precio_final') return null;

    let ivaRate = 0;

    if (product.ivaType === 'gravado5') ivaRate = 5;
    else if (product.ivaType === 'gravado' || product.ivaType === 'gravado19') ivaRate = 19;
    else ivaRate = product.ivaRate || 0;

    if (ivaRate === 0) return formatMoney(displayPrice);
    const priceWithoutIva = Math.round(displayPrice / (1 + ivaRate / 100));
    return formatMoney(priceWithoutIva);
  };

  const calculateIvaAmount = () => {
    if (!displayPrice) return null;
    
    if (product.ivaType === 'precio_final') return null;

    let ivaRate = 0;

    if (product.ivaType === 'gravado5') ivaRate = 5;
    else if (product.ivaType === 'gravado' || product.ivaType === 'gravado19') ivaRate = 19;
    else ivaRate = product.ivaRate || 0;

    if (ivaRate === 0) return null;
    const priceWithoutIva = Math.round(displayPrice / (1 + ivaRate / 100));
    const ivaAmount = displayPrice - priceWithoutIva;
    return formatMoney(ivaAmount);
  };

  const priceWithoutIva = calculatePriceWithoutIva();
  const ivaAmount = calculateIvaAmount();
  const isGravado = product.ivaType === 'gravado' || product.ivaType === 'gravado19' || product.ivaType === 'gravado5';
  const isExento = product.ivaType === 'exento';
  const isExcluido = product.ivaType === 'excluido';
  const isPrecioFinal = product.ivaType === 'precio_final';

  const calculateTotal = () => {
    if (!displayPrice) return null;
    const quantity = Math.max(1, currentQuantity);
    const total = displayPrice * quantity;
    return formatMoney(total);
  };

  const totalValue = calculateTotal();

  const getIvaTypeText = () => {
    if (isPrecioFinal) return 'Precio Final';
    if (isExcluido) return 'Excluido';
    if (isExento) return 'Exento 0%';
    if (product.ivaType === 'gravado5') return 'Gravado 5%';
    return 'Gravado ' + (product.ivaRate || 19) + '%';
  };

  const handleQuantityChange = (e) => {
    setLocalQuantity(e.target.value);
    setIsEditing(true);
  };

  const handleQuantityBlur = () => {
    let newQuantity = parseInt(localQuantity, 10);

    if (isNaN(newQuantity) || localQuantity.trim() === "") {
      newQuantity = 1;
      setLocalQuantity("1");
    }

    newQuantity = Math.max(1, newQuantity);
    setLocalQuantity(String(newQuantity));

    if (newQuantity !== product.quantity) {
      onChange?.({ quantity: newQuantity });
    }
    setIsEditing(false);
  };

  const handlePriceAdjustOpChange = (op) => {
    setLocalPriceAdjustOp(op);
    onChange?.({ priceAdjustOp: op, priceAdjustValue: localPriceAdjustValue });
  };

  const handlePriceAdjustValueChange = (e) => {
    const value = e.target.value;
    setLocalPriceAdjustValue(value);
    onChange?.({ priceAdjustOp: localPriceAdjustOp, priceAdjustValue: value });
  };

  const originalPriceFormatted = formatMoney(parseMoney(product?.price || 0));
  const hasAdjustment = localPriceAdjustOp && localPriceAdjustValue;

  return (
    <article
      className={'product-card ' + (product.productUrl ? 'clickable' : '') + ' ' + (isSelectedForBatch ? 'batch-selected' : '')}
      onClick={handleCardClick}
    >
      {onSelectForBatch && (
        <button
          type="button"
          className="product-card__batch-checkbox"
          onClick={(e) => {
            e.stopPropagation();
            onSelectForBatch(product.id);
          }}
          title={isSelectedForBatch ? "Deseleccionar para eliminar" : "Seleccionar para eliminar"}
        >
          {isSelectedForBatch ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>
      )}

      <div className="product-card__actions-bar">
        <button
          className="product-card__action-btn product-card__action-btn--toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={checked ? "Excluir del PDF" : "Incluir en PDF"}
        >
          {checked ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>

        <button
          className="product-card__action-btn product-card__action-btn--edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Editar producto"
        >
          <Edit2 size={16} />
        </button>

        <button
          className="product-card__action-btn product-card__action-btn--duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.();
          }}
          title="Duplicar producto"
        >
          <Copy size={16} />
        </button>

        <button
          className="product-card__action-btn product-card__action-btn--delete"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Eliminar producto"
        >
          <Trash2 size={16} />
        </button>

        <button
          className={'product-card__action-btn product-card__action-btn--adjust ' + (showPriceAdjust ? 'active' : '')}
          onClick={(e) => {
            e.stopPropagation();
            setShowPriceAdjust(!showPriceAdjust);
          }}
          title="Ajustar precio (dividir/multiplicar)"
        >
          <Calculator size={16} />
        </button>

        {product.productUrl && (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="product-card__action-btn product-card__action-btn--link"
            onClick={(e) => e.stopPropagation()}
            title="Ver producto en Tecnonacho.com"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      <div className="product-card__image">
        {product?.image ? (
          <img src={product.image} alt={product.name || "Producto"} />
        ) : (
          <div className="product-card__image-placeholder"></div>
        )}
      </div>

      <div className="product-card__content">
        <h3 className="product-card__title">{product?.name || "Sin nombre"}</h3>

        <div className="product-card__details">
          <div className="product-card__detail-row">
            <span className="product-card__detail-label">SKU</span>
            <span className="product-card__detail-value">{product?.sku || "N/D"}</span>
          </div>

          {hasAdjustment && (
            <div className="product-card__detail-row">
              <span className="product-card__detail-label">Precio original</span>
              <span className="product-card__detail-value price-original">{originalPriceFormatted}</span>
            </div>
          )}

          <div className="product-card__detail-row">
            <span className="product-card__detail-label">
              {isPrecioFinal ? "PRECIO FINAL" : (hasAdjustment ? "Precio ajustado" : "Precio (IVA incl.)")}
            </span>
            <span className={'product-card__detail-value price ' + (hasAdjustment ? 'price-adjusted' : '')}>
              {displayPriceFormatted}
            </span>
          </div>

          {hasAdjustment && (
            <div className="product-card__detail-row">
              <span className="product-card__detail-label">Ajuste aplicado</span>
              <span className="product-card__detail-value price-adjust-info">
                {localPriceAdjustOp === '/' ? 'Dividido entre' : 'Multiplicado por'} {localPriceAdjustValue}
              </span>
            </div>
          )}

          {product?.stockDisplay && (
            <div className="product-card__detail-row">
              <span className="product-card__detail-label">Disponibilidad</span>
              <span className={'product-card__stock-value ' + (product?.stockStatus === 'instock' ? 'stock-in' : product?.stockStatus === 'onbackorder' ? 'stock-backorder' : 'stock-out')}>
                {product.stockDisplay}
              </span>
            </div>
          )}

          {isGravado && ivaAmount && !isPrecioFinal && (
            <>
              <div className="product-card__detail-row">
                <span className="product-card__detail-label">Precio sin IVA</span>
                <span className="product-card__detail-value">{priceWithoutIva}</span>
              </div>
              <div className="product-card__detail-row">
                <span className="product-card__detail-label">IVA</span>
                <span className="product-card__detail-value iva-amount">{ivaAmount}</span>
              </div>
            </>
          )}

          <div className="product-card__detail-row">
            <span className="product-card__detail-label">Tipo IVA</span>
            <span className={'product-card__iva-badge ' + (isPrecioFinal ? 'precio-final' : isExcluido ? 'excluido' : isExento ? 'exento' : 'gravado')}>
              {getIvaTypeText()}
            </span>
          </div>

          {documentType === "quote" && (
            <>
              <div className="product-card__detail-row">
                <span className="product-card__detail-label">Cantidad</span>
                <span className="product-card__detail-value">{currentQuantity}</span>
              </div>
              {totalValue && (
                <div className="product-card__detail-row total">
                  <span className="product-card__detail-label">Total</span>
                  <span className="product-card__detail-value total-value">{totalValue}</span>
                </div>
              )}
            </>
          )}
        </div>

        <p className="product-card__description">
          {product?.shortDescription || "Sin descripcion corta"}
        </p>

        {showPriceAdjust && (
          <div className="product-card__price-adjust">
            <div className="product-card__field-group">
              <label>Ajuste de precio</label>
              <div className="price-adjust-controls">
                <select
                  value={localPriceAdjustOp}
                  onChange={(e) => handlePriceAdjustOpChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Seleccionar</option>
                  <option value="/">Dividir entre (/)</option>
                  <option value="*">Multiplicar por (*)</option>
                </select>
                <input
                  type="number"
                  step="any"
                  placeholder="Valor"
                  value={localPriceAdjustValue}
                  onChange={handlePriceAdjustValueChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <small className="price-adjust-hint">
                Ej: /1.05 para quitar IVA del 5% | *0.95 para descuento del 5%
              </small>
            </div>
          </div>
        )}

        <div className="product-card__edit-fields">
          <div className="product-card__field-group">
            <label>Tipo IVA</label>
            <select
              value={product?.ivaType || 'gravado'}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                onChange?.({
                  ivaType: e.target.value,
                  ivaRate: e.target.value === 'excluido' ? 0 : (e.target.value === 'gravado5' ? 5 : (e.target.value === 'precio_final' ? 0 : 19))
                })
              }
            >
              <option value="gravado">Gravado 19%</option>
              <option value="gravado5">Gravado 5%</option>
              <option value="exento">Exento 0%</option>
              <option value="excluido">Excluido</option>
              <option value="precio_final">PRECIO FINAL (Sin IVA discriminado)</option>
            </select>
          </div>

          {product?.ivaType !== 'excluido' && product?.ivaType !== 'exento' && product?.ivaType !== 'precio_final' && (
            <div className="product-card__field-group">
              <label>IVA %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={product?.ivaRate || 19}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onChange?.({
                    ivaRate: Number(e.target.value)
                  })
                }
              />
            </div>
          )}

          {documentType === "quote" && (
            <>
              <div className="product-card__field-group">
                <label>Cantidad</label>
                <input
                  type="text"
                  value={localQuantity}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                />
              </div>

              <div className="product-card__field-group full-width">
                <label>Total manual</label>
                <input
                  type="text"
                  value={product?.totalPrice || ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onChange?.({
                      totalPrice: e.target.value,
                    })
                  }
                  placeholder="Opcional"
                />
              </div>

              {totalValue && !product?.totalPrice && (
                <div className="product-card__calculated-total">
                  Calculado: <strong>{totalValue}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;