import React from 'react'

type ArrayInfoProps = {
  dataShape: number[];
  chunkShape: number[] | undefined;
};

const header = "py-1.5 font-medium text-[var(--text-paragraph)]"
const dataStyle = "py-1.5 font-mono"

export const ArrayInfo = ({ dataShape, chunkShape }: ArrayInfoProps) => {
  const isChunked = chunkShape !== undefined &&
    dataShape.some((val, idx) => val !== chunkShape.at(idx));

  const chunkCount = chunkShape?.map((c, idx) => Math.ceil(dataShape[idx] / c));

  const fmt = (arr: number[]) => `[${arr.join(', ')}]`;

  return (
    <table className="w-full text-xs text-center border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th className={header}>Data shape</th>
          <th className={header}>Chunk shape</th>
          <th className={header}>Chunk count</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={dataStyle}>{fmt(dataShape)}</td>
          <td className={dataStyle} colSpan={isChunked ? 1 : 2}>
            {isChunked ? fmt(chunkShape!) : 'Not chunked'}
          </td>
          {isChunked && (
            <td className={dataStyle}>{fmt(chunkCount!)}</td>
          )}
        </tr>
      </tbody>
    </table>
  );
};


