import React, { useState } from 'react';
import { Park, Route, ClaimedRoute } from '../types/VanLifeTypes';

// Alaska's 8 National Parks with approximate SVG coordinates
// ViewBox: 0 0 1000 680
// Coord mapping: x = (170 - lon) / 40 * 820 + 80, y = (72 - lat) / 18 * 600 + 40
export const PARKS: Park[] = [
  { id: 'denali',     name: 'Denali',              abbr: 'DNL', x: 480, y: 330 },
  { id: 'wrangell',   name: 'Wrangell-St. Elias',  abbr: 'WSE', x: 654, y: 407 },
  { id: 'kenai',      name: 'Kenai Fjords',         abbr: 'KNF', x: 496, y: 443 },
  { id: 'glacier',    name: 'Glacier Bay',          abbr: 'GCB', x: 757, y: 487 },
  { id: 'katmai',     name: 'Katmai',               abbr: 'KAT', x: 390, y: 490 },
  { id: 'lake-clark', name: 'Lake Clark',           abbr: 'LKC', x: 420, y: 413 },
  { id: 'kobuk',      name: 'Kobuk Valley',         abbr: 'KBK', x: 303, y: 197 },
  { id: 'gates',      name: 'Gates of the Arctic',  abbr: 'GOA', x: 422, y: 180 },
];

export const ROUTES: Route[] = [
  { id: 'kobuk-gates',    from: 'kobuk',      to: 'gates',      color: '#4CAF50', segments: 2 },
  { id: 'gates-denali',   from: 'gates',      to: 'denali',     color: '#2196F3', segments: 3 },
  { id: 'kobuk-denali',   from: 'kobuk',      to: 'denali',     color: '#FF9800', segments: 4 },
  { id: 'denali-lkclark', from: 'denali',     to: 'lake-clark', color: '#FFEB3B', segments: 2 },
  { id: 'denali-kenai',   from: 'denali',     to: 'kenai',      color: '#F44336', segments: 2 },
  { id: 'denali-wrang',   from: 'denali',     to: 'wrangell',   color: '#9C27B0', segments: 3 },
  { id: 'lkclark-katmai', from: 'lake-clark', to: 'katmai',     color: '#4CAF50', segments: 2 },
  { id: 'lkclark-kenai',  from: 'lake-clark', to: 'kenai',      color: '#2196F3', segments: 2 },
  { id: 'kenai-wrang',    from: 'kenai',      to: 'wrangell',   color: '#F44336', segments: 2 },
  { id: 'wrang-glacier',  from: 'wrangell',   to: 'glacier',    color: '#FFEB3B', segments: 2 },
];

// Alaska land polygon path (clockwise from Barrow)
const ALASKA_PATH = `
  M 351,63
  L 511,90
  L 676,123
  L 676,440
  L 726,457
  L 777,507
  L 890,592
  L 839,541
  L 757,473
  L 695,457
  L 634,457
  L 531,447
  L 502,437
  L 459,453
  L 492,400
  L 420,413
  L 390,490
  L 336,573
  L 224,607
  L 244,540
  L 230,490
  L 162,457
  L 152,390
  L 121,253
  L 234,207
  L 224,173
  Z
`;

interface RouteSegmentProps {
  route: Route;
  parks: Park[];
  claimed?: ClaimedRoute;
  onClaim?: (routeId: string) => void;
}

function RouteSegments({ route, parks, claimed, onClaim }: RouteSegmentProps) {
  const from = parks.find(p => p.id === route.from)!;
  const to = parks.find(p => p.id === route.to)!;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const totalLen = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / totalLen;
  const uy = dy / totalLen;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const inset = 28;
  const gap = 5;
  const rectW = 22;
  const rectH = 13;

  const availLen = totalLen - 2 * inset;
  const segLen = (availLen - (route.segments - 1) * gap) / route.segments;

  const fillColor = claimed ? claimed.playerColor : route.color;
  const fillOpacity = claimed ? 1 : 0.75;

  const rects = [];
  for (let i = 0; i < route.segments; i++) {
    const distFromStart = inset + i * (segLen + gap) + segLen / 2;
    const sx = from.x + ux * distFromStart;
    const sy = from.y + uy * distFromStart;
    rects.push(
      <rect
        key={i}
        x={sx - rectW / 2}
        y={sy - rectH / 2}
        width={rectW}
        height={rectH}
        rx={3}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke="white"
        strokeWidth={1.5}
        transform={`rotate(${angle}, ${sx}, ${sy})`}
      />
    );
  }

  return (
    <g
      className="cursor-pointer"
      onClick={() => !claimed && onClaim && onClaim(route.id)}
    >
      {/* Shadow/backing line */}
      <line
        x1={from.x + ux * inset}
        y1={from.y + uy * inset}
        x2={to.x - ux * inset}
        y2={to.y - uy * inset}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={rectH + 2}
        strokeLinecap="round"
      />
      {rects}
    </g>
  );
}

interface ParkMarkerProps {
  park: Park;
  visited?: boolean;
}

function ParkMarker({ park, visited }: ParkMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const r = 20;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drop shadow */}
      <circle cx={park.x + 2} cy={park.y + 2} r={r} fill="rgba(0,0,0,0.3)" />
      {/* Main circle */}
      <circle
        cx={park.x}
        cy={park.y}
        r={r}
        fill={visited ? '#8B6914' : '#F5E6C8'}
        stroke="#5D3A1A"
        strokeWidth={2.5}
      />
      {/* Inner ring */}
      <circle
        cx={park.x}
        cy={park.y}
        r={r - 5}
        fill="none"
        stroke="#8B6914"
        strokeWidth={1}
      />
      {/* Abbreviation */}
      <text
        x={park.x}
        y={park.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={8}
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="#3D1C02"
      >
        {park.abbr}
      </text>

      {/* Tooltip on hover */}
      {hovered && (
        <g>
          <rect
            x={park.x - 60}
            y={park.y - r - 28}
            width={120}
            height={22}
            rx={4}
            fill="#3D1C02"
            fillOpacity={0.9}
          />
          <text
            x={park.x}
            y={park.y - r - 17}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontFamily="Georgia, serif"
            fill="#F5E6C8"
          >
            {park.name}
          </text>
        </g>
      )}
    </g>
  );
}

// Decorative mountain triangles
function Mountains() {
  const mountains = [
    // Alaska Range (between Denali and Wrangell)
    { x: 540, y: 370, size: 22 },
    { x: 565, y: 380, size: 18 },
    { x: 520, y: 375, size: 16 },
    { x: 590, y: 375, size: 20 },
    { x: 610, y: 370, size: 17 },
    // Brooks Range (north interior)
    { x: 430, y: 230, size: 18 },
    { x: 455, y: 225, size: 15 },
    { x: 480, y: 235, size: 16 },
    { x: 505, y: 228, size: 14 },
    { x: 370, y: 240, size: 15 },
    // Chugach (south)
    { x: 580, y: 425, size: 14 },
    { x: 600, y: 430, size: 12 },
    { x: 620, y: 422, size: 16 },
    // Wrangell Mountains
    { x: 640, y: 380, size: 16 },
    { x: 660, y: 375, size: 13 },
  ];

  return (
    <g>
      {mountains.map((m, i) => (
        <polygon
          key={i}
          points={`${m.x},${m.y - m.size} ${m.x - m.size * 0.7},${m.y + m.size * 0.4} ${m.x + m.size * 0.7},${m.y + m.size * 0.4}`}
          fill="#C8A96E"
          stroke="#8B6914"
          strokeWidth={1}
          fillOpacity={0.6}
        />
      ))}
    </g>
  );
}

// Spruce tree decorations
function Trees() {
  const trees = [
    { x: 350, y: 310 }, { x: 360, y: 320 }, { x: 340, y: 325 },
    { x: 290, y: 280 }, { x: 305, y: 290 }, { x: 275, y: 285 },
    { x: 445, y: 360 }, { x: 460, y: 370 }, { x: 435, y: 365 },
  ];

  return (
    <g opacity={0.5}>
      {trees.map((t, i) => (
        <g key={i}>
          <polygon
            points={`${t.x},${t.y - 8} ${t.x - 5},${t.y + 4} ${t.x + 5},${t.y + 4}`}
            fill="#4A7A4A"
          />
          <rect x={t.x - 1} y={t.y + 3} width={2} height={4} fill="#5D3A1A" />
        </g>
      ))}
    </g>
  );
}

interface AlaskaMapProps {
  claimedRoutes?: ClaimedRoute[];
  onClaimRoute?: (routeId: string) => void;
}

const AlaskaMap: React.FC<AlaskaMapProps> = ({ claimedRoutes = [], onClaimRoute }) => {
  const getClaimedRoute = (routeId: string) =>
    claimedRoutes.find(cr => cr.routeId === routeId);

  return (
    <div className="w-full overflow-auto">
      <svg
        viewBox="0 0 1000 680"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-5xl mx-auto"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <defs>
          {/* Paper texture filter */}
          <filter id="paper" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blend" />
            <feComposite in="blend" in2="SourceGraphic" operator="in" />
          </filter>
          {/* Vignette gradient */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(50,30,10,0.3)" />
          </radialGradient>
        </defs>

        {/* Ocean background */}
        <rect width="1000" height="680" fill="#8BBAD4" rx={8} />
        {/* Ocean texture lines */}
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={60 + i * 55}
            x2={1000}
            y2={60 + i * 55}
            stroke="#7AABC5"
            strokeWidth={0.5}
            opacity={0.4}
          />
        ))}

        {/* Alaska land mass */}
        <path
          d={ALASKA_PATH}
          fill="#D4B878"
          stroke="#7A5C28"
          strokeWidth={2.5}
          strokeLinejoin="round"
          filter="url(#paper)"
        />
        {/* Land inner shadow/depth */}
        <path
          d={ALASKA_PATH}
          fill="none"
          stroke="#8B6914"
          strokeWidth={1}
          strokeLinejoin="round"
          opacity={0.4}
          transform="translate(2, 2)"
        />

        {/* Interior decorations */}
        <Mountains />
        <Trees />

        {/* Alaska label */}
        <text
          x={400}
          y={280}
          textAnchor="middle"
          fontSize={28}
          fontWeight="bold"
          fontFamily="Georgia, serif"
          fill="#5D3A1A"
          opacity={0.25}
          letterSpacing={6}
        >
          ALASKA
        </text>

        {/* Routes (drawn before parks so parks appear on top) */}
        {ROUTES.map(route => (
          <RouteSegments
            key={route.id}
            route={route}
            parks={PARKS}
            claimed={getClaimedRoute(route.id)}
            onClaim={onClaimRoute}
          />
        ))}

        {/* Park markers */}
        {PARKS.map(park => (
          <ParkMarker key={park.id} park={park} />
        ))}

        {/* Park name labels */}
        {PARKS.map(park => {
          // Position label above or below park based on location
          const labelY = park.y > 400 ? park.y + 30 : park.y - 28;
          return (
            <text
              key={`label-${park.id}`}
              x={park.x}
              y={labelY}
              textAnchor="middle"
              fontSize={8.5}
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fill="#3D1C02"
              stroke="#F5E6C8"
              strokeWidth={2.5}
              paintOrder="stroke"
            >
              {park.name}
            </text>
          );
        })}

        {/* Vignette overlay */}
        <rect width="1000" height="680" fill="url(#vignette)" rx={8} />

        {/* Border frame */}
        <rect
          x={4} y={4} width={992} height={672}
          fill="none"
          stroke="#5D3A1A"
          strokeWidth={4}
          rx={6}
        />
        <rect
          x={8} y={8} width={984} height={664}
          fill="none"
          stroke="#8B6914"
          strokeWidth={1.5}
          rx={4}
        />

        {/* Title banner */}
        <rect x={60} y={14} width={200} height={30} rx={4} fill="#5D3A1A" />
        <text x={160} y={34} textAnchor="middle" fontSize={13} fontWeight="bold"
          fontFamily="Georgia, serif" fill="#F5E6C8" letterSpacing={2}>
          VAN LIFE
        </text>

        {/* Legend */}
        <g transform="translate(800, 20)">
          <rect width={170} height={130} rx={4} fill="#3D1C02" fillOpacity={0.8} />
          <text x={85} y={18} textAnchor="middle" fontSize={9} fill="#F5E6C8"
            fontFamily="Georgia, serif" fontWeight="bold" letterSpacing={1}>
            NATIONAL PARKS
          </text>
          {PARKS.map((park, i) => (
            <g key={park.id} transform={`translate(8, ${28 + i * 13})`}>
              <circle cx={6} cy={0} r={5} fill="#F5E6C8" stroke="#8B6914" strokeWidth={1} />
              <text x={6} y={1} textAnchor="middle" dominantBaseline="middle"
                fontSize={4.5} fontWeight="bold" fill="#3D1C02" fontFamily="Georgia, serif">
                {park.abbr}
              </text>
              <text x={16} y={1} dominantBaseline="middle" fontSize={8}
                fill="#F5E6C8" fontFamily="Georgia, serif">
                {park.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default AlaskaMap;
