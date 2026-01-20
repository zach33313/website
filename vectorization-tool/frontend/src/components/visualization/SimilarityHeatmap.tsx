import { useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useStore } from '../../stores/useStore';
import type { PlotMouseEvent, Data } from 'plotly.js';

export function SimilarityHeatmap() {
  const {
    similarityMatrix,
    selectedChunkIndex,
    setSelectedChunkIndex,
  } = useStore();

  const plotData = useMemo((): Data[] => {
    if (!similarityMatrix) return [];

    return [
      {
        type: 'heatmap',
        z: similarityMatrix.matrix,
        x: similarityMatrix.chunk_ids.map((_, i) => `Chunk ${i + 1}`),
        y: similarityMatrix.chunk_ids.map((_, i) => `Chunk ${i + 1}`),
        colorscale: 'Greens',
        hovertemplate:
          '%{x} vs %{y}<br>Similarity: %{z:.3f}<extra></extra>',
        showscale: true,
        colorbar: {
          title: {
            text: 'Similarity',
            side: 'right',
          },
          tickfont: { color: '#a0a0a0' },
          titlefont: { color: '#a0a0a0' },
        },
      } as Data,
    ];
  }, [similarityMatrix]);

  const layout = useMemo((): Partial<Plotly.Layout> => ({
    autosize: true,
    margin: { l: 80, r: 40, t: 40, b: 80 },
    paper_bgcolor: '#0a0a0a',
    plot_bgcolor: '#0a0a0a',
    font: {
      color: '#a0a0a0',
      family: 'Inter, sans-serif',
      size: 10,
    },
    xaxis: {
      tickangle: -45,
      side: 'bottom' as const,
    },
    yaxis: {
      autorange: 'reversed' as const,
    },
  }), []);

  const handleClick = useCallback(
    (event: PlotMouseEvent) => {
      const point = event.points[0];
      if (point) {
        // Extract chunk index from label
        const label = point.x as string;
        const match = label.match(/Chunk (\d+)/);
        if (match) {
          setSelectedChunkIndex(parseInt(match[1]) - 1);
        }
      }
    },
    [setSelectedChunkIndex]
  );

  if (!similarityMatrix) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#a0a0a0]">
          Compute similarity matrix to see the heatmap
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="aspect-square w-full">
        <Plot
          data={plotData}
          layout={layout}
          config={{
            displayModeBar: true,
            displaylogo: false,
            responsive: true,
          }}
          onClick={handleClick}
          className="w-full h-full"
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {selectedChunkIndex !== null && similarityMatrix.matrix[selectedChunkIndex] && (
        <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">
            Chunk {selectedChunkIndex + 1} Similarities
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {similarityMatrix.matrix[selectedChunkIndex]
              .map((sim, i) => ({ index: i, similarity: sim }))
              .filter((item) => item.index !== selectedChunkIndex)
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 5)
              .map(({ index, similarity }) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-[#a0a0a0]">Chunk {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-20 h-2 bg-[#2a2a2a] rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-primary-500"
                        style={{ width: `${similarity * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-mono w-12 text-right">
                      {(similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
