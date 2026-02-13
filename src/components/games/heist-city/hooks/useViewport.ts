import { useRef, useState, useCallback, useEffect, RefObject } from 'react';
import { SVG_WIDTH, SVG_HEIGHT } from '../data/mapConstants';

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseViewportReturn {
  viewBox: ViewBox;
  zoom: number;
  isPanning: boolean;
  screenToSVG: (clientX: number, clientY: number) => { x: number; y: number };
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleFitToWindow: () => void;
  startPan: (clientX: number, clientY: number) => void;
  updatePan: (clientX: number, clientY: number) => void;
  endPan: () => void;
}

export function useViewport(
  svgRef: RefObject<SVGSVGElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  readOnly: boolean,
): UseViewportReturn {
  const [zoom, setZoom] = useState(1);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: SVG_WIDTH, height: SVG_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Keep zoom/panOffset in refs for the wheel handler (avoids re-registering on every change)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;

  // Update viewBox based on zoom and pan
  useEffect(() => {
    setViewBox({
      x: panOffset.x,
      y: panOffset.y,
      width: SVG_WIDTH / zoom,
      height: SVG_HEIGHT / zoom,
    });
  }, [zoom, panOffset]);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setViewBox({ x: 0, y: 0, width: SVG_WIDTH, height: SVG_HEIGHT });
  }, []);

  const handleFitToWindow = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerAspect = container.clientWidth / container.clientHeight;
    const mapAspect = SVG_WIDTH / SVG_HEIGHT;

    let newZoom = 1;
    if (containerAspect > mapAspect) {
      newZoom = container.clientHeight / SVG_HEIGHT;
    } else {
      newZoom = container.clientWidth / SVG_WIDTH;
    }

    setZoom(newZoom);
    setPanOffset({ x: 0, y: 0 });
  }, [containerRef]);

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
  }, [svgRef]);

  // Ctrl+wheel zoom (native event listener for passive: false)
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || readOnly) return;
      e.preventDefault();

      const svg = svgElement;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM()!.inverse());

      const currentZoom = zoomRef.current;
      const currentPanOffset = panOffsetRef.current;
      const delta = -e.deltaY / 1000;
      const newZoom = Math.min(Math.max(currentZoom + delta, 0.25), 4);

      if (newZoom !== currentZoom) {
        const newWidth = SVG_WIDTH / newZoom;
        const newHeight = SVG_HEIGHT / newZoom;
        const oldWidth = SVG_WIDTH / currentZoom;
        const oldHeight = SVG_HEIGHT / currentZoom;

        const mouseXRatio = (svgPoint.x - currentPanOffset.x) / oldWidth;
        const mouseYRatio = (svgPoint.y - currentPanOffset.y) / oldHeight;

        const newPanX = svgPoint.x - mouseXRatio * newWidth;
        const newPanY = svgPoint.y - mouseYRatio * newHeight;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    svgElement.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      svgElement.removeEventListener('wheel', handleNativeWheel);
    };
  }, [svgRef, readOnly]);

  // Pan controls
  const startPan = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX, y: clientY });
  }, []);

  const updatePan = useCallback((clientX: number, clientY: number) => {
    if (!panStart) return;
    const currentZoom = zoomRef.current;
    const dx = (panStart.x - clientX) / currentZoom;
    const dy = (panStart.y - clientY) / currentZoom;
    setPanOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    setPanStart({ x: clientX, y: clientY });
  }, [panStart]);

  const endPan = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
  }, [isPanning]);

  return {
    viewBox,
    zoom,
    isPanning,
    screenToSVG,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFitToWindow,
    startPan,
    updatePan,
    endPan,
  };
}
