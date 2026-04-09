import { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical } from 'lucide-react';
import ProductCard from './ProductCard';

const ItemTypes = {
  PRODUCT: 'product'
};

function DraggableProductCard({
  product,
  index,
  moveProduct,
  ...props
}) {
  const ref = useRef(null);
  
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PRODUCT,
    item: () => {
      console.log(`🖱️ INICIO ARRASTRE: ${product.name} (índice: ${index})`);
      return { id: product.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      console.log(`✅ FIN ARRASTRE: ${product.name}`);
    },
  });

  const [{ isOver, dragDirection }, drop] = useDrop({
    accept: ItemTypes.PRODUCT,
    hover: (item, monitor) => {
      if (!ref.current) {
        console.log('❌ ref.current es null');
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      console.log(`🔄 HOVER: ${item.id} (dragIndex: ${dragIndex}) sobre ${product.id} (hoverIndex: ${hoverIndex})`);
      
      if (dragIndex === hoverIndex) {
        console.log('⏭️ Mismo índice, ignorando');
        return;
      }
      
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        console.log('❌ clientOffset es null');
        return;
      }
      
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      console.log(`📍 Posición: X: ${hoverClientX}, Y: ${hoverClientY} | Medio X: ${hoverMiddleX}, Medio Y: ${hoverMiddleY}`);
      
      let shouldMove = false;
      
      if (dragIndex < hoverIndex) {
        // Arrastrando hacia abajo/derecha
        if (hoverClientY > hoverMiddleY || hoverClientX > hoverMiddleX) {
          shouldMove = true;
          console.log('⬇️ Mover hacia ABAJO/DERECHA');
        }
      } else {
        // Arrastrando hacia arriba/izquierda
        if (hoverClientY < hoverMiddleY || hoverClientX < hoverMiddleX) {
          shouldMove = true;
          console.log('⬆️ Mover hacia ARRIBA/IZQUIERDA');
        }
      }
      
      if (shouldMove) {
        console.log(`🔄 EJECUTANDO MOVE: de ${dragIndex} a ${hoverIndex}`);
        moveProduct(dragIndex, hoverIndex);
        item.index = hoverIndex;
      } else {
        console.log('⏸️ No mover');
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      dragDirection: (() => {
        if (!monitor.isOver()) return null;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset || !ref.current) return null;
        
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverClientX = clientOffset.x - hoverBoundingRect.left;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        
        if (hoverClientY < hoverMiddleY && hoverClientX < hoverMiddleX) return 'top-left';
        if (hoverClientY < hoverMiddleY && hoverClientX > hoverMiddleX) return 'top-right';
        if (hoverClientY > hoverMiddleY && hoverClientX < hoverMiddleX) return 'bottom-left';
        if (hoverClientY > hoverMiddleY && hoverClientX > hoverMiddleX) return 'bottom-right';
        return null;
      })(),
    }),
  });

  // Conectar drag y drop
  drag(drop(ref));

  useEffect(() => {
    console.log(`📦 Producto montado: ${product.name} (índice: ${index})`);
    return () => {
      console.log(`🗑️ Producto desmontado: ${product.name}`);
    };
  }, [product.name, index]);

  const opacity = isDragging ? 0.4 : 1;
  
  let borderStyle = 'none';
  
  if (isOver) {
    borderStyle = '2px solid var(--accent)';
    console.log(`✨ HOVER ACTIVO sobre: ${product.name}`);
  }
  
  const bgStyle = isOver ? 'rgba(138, 166, 70, 0.15)' : 'transparent';
  const transform = isDragging ? 'scale(0.98)' : 'scale(1)';

  return (
    <div
      ref={ref}
      className="draggable-product-card"
      style={{ 
        opacity, 
        border: borderStyle,
        background: bgStyle,
        transform: transform,
        transition: 'all 0.2s ease',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div className="drag-handle" style={{ cursor: 'grab' }}>
        <GripVertical size={18} />
      </div>
      <ProductCard product={product} {...props} />
    </div>
  );
}

export default DraggableProductCard;