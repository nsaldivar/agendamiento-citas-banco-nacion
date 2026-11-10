import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  id?: string;
}

export function QRCodeSVG({ value, size = 180, className = '', id }: QRCodeProps) {
  // Matriz de representación gráfica de código QR determinista
  const matrixSize = 21;
  const grid: boolean[][] = [];

  // Crear un patrón pseudo-aleatorio estable basado en el hash del valor
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    grid[r] = [];
    for (let c = 0; c < matrixSize; c++) {
      // Esquinas con patrones de búsqueda (Finder patterns)
      if (
        (r < 7 && c < 7) ||
        (r < 7 && c >= matrixSize - 7) ||
        (r >= matrixSize - 7 && c < 7)
      ) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6 || r === matrixSize - 1 || r === matrixSize - 7 || c === matrixSize - 1 || c === matrixSize - 7;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const isCenterTopRight = r >= 2 && r <= 4 && c >= matrixSize - 5 && c <= matrixSize - 3;
        const isCenterBottomLeft = r >= matrixSize - 5 && r <= matrixSize - 3 && c >= 2 && c <= 4;
        grid[r][c] = isBorder || isCenter || isCenterTopRight || isCenterBottomLeft;
      } else {
        const cellHash = Math.sin(hash + r * 31 + c * 17) * 10000;
        grid[r][c] = cellHash - Math.floor(cellHash) > 0.45;
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <div className={`inline-block bg-white p-3 rounded-xl border-2 border-slate-200 shadow-md ${className}`}>
      <svg id={id} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={size} height={size} fill="#FFFFFF" rx="8" />
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0F172A"
                rx={cellSize * 0.15}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}
