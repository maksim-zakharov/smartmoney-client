import React, { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.tsx';

type GridSize = { rows: number; cols: number };

interface GridSizeSelectorProps {
  value?: GridSize;
  onSelect: (size: GridSize) => void;
  maxRows?: number;
  maxCols?: number;
}

const GridSizeSelector: React.FC<GridSizeSelectorProps> = ({ value, onSelect, maxRows = 6, maxCols = 6 }) => {
  const [hovered, setHovered] = useState<GridSize | null>(null);
  const [selected, setSelected] = useState<GridSize | null>(null);

  useEffect(() => {
    if (value) {
      setSelected(value);
    }
  }, [value?.cols, value?.rows]);

  return (
    <TooltipProvider>
      <div className="p-4 bg-card rounded-lg">
        <div className="mb-2 text-center font-medium">{hovered ? `${hovered.rows} x ${hovered.cols}` : 'Hover to select grid size'}</div>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${maxCols - 2}, minmax(0, 1fr))`,
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {Array.from({ length: maxRows }).map((_, rowIndex) =>
            Array.from({ length: maxCols }).map((_, colIndex) => {
              if (24 % (colIndex + 1) !== 0) {
                return null;
              }
              const isHovered = hovered && rowIndex < hovered.rows && colIndex < hovered.cols;
              const isSelected = selected && rowIndex < selected.rows && colIndex < selected.cols;

              return (
                <Tooltip key={`${rowIndex}-${colIndex}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-8 h-8 border dark:border-input cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary' : isHovered ? 'bg-primary' : 'bg-input'
                      }`}
                      onMouseEnter={() => setHovered({ rows: rowIndex + 1, cols: colIndex + 1 })}
                      onClick={() => {
                        const size = { rows: rowIndex + 1, cols: colIndex + 1 };
                        setSelected(size);
                        onSelect(size);
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{`${rowIndex + 1} x ${colIndex + 1}`}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }),
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GridSizeSelector;
