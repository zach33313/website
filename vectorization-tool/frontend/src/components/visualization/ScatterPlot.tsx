import { useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useStore } from '../../stores/useStore';
import type { PlotMouseEvent } from 'plotly.js';

interface ScatterPlotProps {
  is3D?: boolean;
}

function getClusterColor(index: number): string {
  const colors = [
    '#22c55e', // green
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];
  return colors[index % colors.length];
}

export function ScatterPlot({ is3D = false }: ScatterPlotProps) {
  const {
    points2D,
    points3D,
    clusters,
    selectedChunkIndex,
    setSelectedChunkIndex,
    hoveredPointIndex,
    setHoveredPointIndex,
  } = useStore();

  const points = is3D ? points3D : points2D;

  const plotData = useMemo(() => {
    if (!points) return [];

    // If we have clusters, color by cluster
    if (clusters) {
      const clusterGroups: Record<number, typeof points> = {};

      points.forEach((point, i) => {
        const label = clusters.labels[i] ?? 0;
        if (!clusterGroups[label]) {
          clusterGroups[label] = [];
        }
        clusterGroups[label].push(point);
      });

      return Object.entries(clusterGroups).map(([label, groupPoints]) => {
        const color = getClusterColor(parseInt(label));

        const trace: Partial<Plotly.Data> = {
          type: is3D ? 'scatter3d' : 'scatter',
          mode: 'markers',
          name: `Cluster ${parseInt(label) + 1}`,
          x: groupPoints.map((p) => p.x),
          y: groupPoints.map((p) => p.y),
          text: groupPoints.map((p) => p.preview),
          customdata: groupPoints.map((p) => p.chunk_index),
          hovertemplate: '<b>Chunk %{customdata}</b><br>%{text}<extra></extra>',
          marker: {
            size: 10,
            color,
            opacity: 0.8,
            line: {
              color: '#ffffff',
              width: 1,
            },
          },
        };

        if (is3D) {
          (trace as any).z = groupPoints.map((p: any) => p.z ?? 0);
        }

        return trace;
      });
    }

    // Default: single trace with gradient coloring
    const trace: Partial<Plotly.Data> = {
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'markers',
      name: 'Chunks',
      x: points.map((p) => p.x),
      y: points.map((p) => p.y),
      text: points.map((p) => p.preview),
      customdata: points.map((p) => p.chunk_index),
      hovertemplate: '<b>Chunk %{customdata}</b><br>%{text}<extra></extra>',
      marker: {
        size: points.map((_, i) =>
          i === selectedChunkIndex ? 16 : i === hoveredPointIndex ? 14 : 10
        ),
        color: points.map((_, i) => i),
        colorscale: 'Viridis',
        opacity: 0.8,
        line: {
          color: points.map((_, i) =>
            i === selectedChunkIndex ? '#22c55e' : '#ffffff'
          ),
          width: points.map((_, i) => (i === selectedChunkIndex ? 3 : 1)),
        },
      },
    };

    if (is3D) {
      (trace as any).z = points.map((p: any) => p.z ?? 0);
    }

    return [trace];
  }, [points, clusters, selectedChunkIndex, hoveredPointIndex, is3D]);

  const layout = useMemo((): Partial<Plotly.Layout> => {
    const baseLayout: Partial<Plotly.Layout> = {
      autosize: true,
      margin: { l: 40, r: 40, t: 40, b: 40 },
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: {
        color: '#a0a0a0',
        family: 'Inter, sans-serif',
      },
      showlegend: clusters !== null,
      legend: {
        bgcolor: 'rgba(20, 20, 20, 0.8)',
        bordercolor: '#2a2a2a',
        borderwidth: 1,
      },
      hovermode: 'closest',
    };

    if (is3D) {
      return {
        ...baseLayout,
        scene: {
          xaxis: {
            gridcolor: '#2a2a2a',
            zerolinecolor: '#3a3a3a',
            showbackground: true,
            backgroundcolor: '#0a0a0a',
          },
          yaxis: {
            gridcolor: '#2a2a2a',
            zerolinecolor: '#3a3a3a',
            showbackground: true,
            backgroundcolor: '#0a0a0a',
          },
          zaxis: {
            gridcolor: '#2a2a2a',
            zerolinecolor: '#3a3a3a',
            showbackground: true,
            backgroundcolor: '#0a0a0a',
          },
          camera: {
            eye: { x: 1.5, y: 1.5, z: 1.5 },
          },
        },
      };
    }

    return {
      ...baseLayout,
      xaxis: {
        gridcolor: '#2a2a2a',
        zerolinecolor: '#3a3a3a',
        title: { text: 'Dimension 1' },
      },
      yaxis: {
        gridcolor: '#2a2a2a',
        zerolinecolor: '#3a3a3a',
        title: { text: 'Dimension 2' },
      },
    };
  }, [is3D, clusters]);

  const handleClick = useCallback(
    (event: PlotMouseEvent) => {
      const point = event.points[0];
      if (point && typeof point.customdata === 'number') {
        setSelectedChunkIndex(point.customdata);
      }
    },
    [setSelectedChunkIndex]
  );

  const handleHover = useCallback(
    (event: PlotMouseEvent) => {
      const point = event.points[0];
      if (point && typeof point.customdata === 'number') {
        setHoveredPointIndex(point.customdata);
      }
    },
    [setHoveredPointIndex]
  );

  const handleUnhover = useCallback(() => {
    setHoveredPointIndex(null);
  }, [setHoveredPointIndex]);

  if (!points || points.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#a0a0a0]">
          Generate reduced dimensions to see the scatter plot
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="aspect-square w-full">
        <Plot
          data={plotData as Plotly.Data[]}
          layout={layout}
          config={{
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false,
            responsive: true,
          }}
          onClick={handleClick}
          onHover={handleHover}
          onUnhover={handleUnhover}
          className="w-full h-full"
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
