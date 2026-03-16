/**
 * Custom Car Icon Component for Retro Map
 * Creates SVG icon URLs for Google Maps markers
 */

// Color mapping for vehicle status
const statusColors = {
  active: '#00ff41',      // Phosphor green
  parked: '#00cc33',      // Dim green
  maintenance: '#ffb000', // Amber
  emergency: '#ff0040',   // Red
};

// Create car SVG with glow effect
const createCarSvg = (heading = 0, color, isEmergency = false) => {
  const glowFilter = isEmergency
    ? `<filter id="glow">
         <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
         <feMerge>
           <feMergeNode in="coloredBlur"/>
           <feMergeNode in="SourceGraphic"/>
         </feMerge>
       </filter>`
    : '';

  const filterAttr = isEmergency ? 'filter="url(#glow)"' : '';
  const pulseAnim = isEmergency
    ? `<animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/>`
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <defs>
        ${glowFilter}
      </defs>
      <g transform="rotate(${heading}, 16, 16)" ${filterAttr}>
        ${pulseAnim}
        <!-- Car body -->
        <path
          fill="${color}"
          stroke="#001100"
          stroke-width="0.5"
          d="M16 4 L22 12 L22 24 L20 26 L12 26 L10 24 L10 12 Z"
        />
        <!-- Windshield -->
        <path
          fill="#003300"
          stroke="${color}"
          stroke-width="0.5"
          d="M13 10 L19 10 L20 14 L12 14 Z"
        />
        <!-- Headlights -->
        <rect x="12" y="5" width="2" height="2" fill="${isEmergency ? '#ff0040' : '#00ff41'}" rx="0.5"/>
        <rect x="18" y="5" width="2" height="2" fill="${isEmergency ? '#ff0040' : '#00ff41'}" rx="0.5"/>
        <!-- Side markers -->
        <rect x="10" y="14" width="1" height="4" fill="${color}" opacity="0.7"/>
        <rect x="21" y="14" width="1" height="4" fill="${color}" opacity="0.7"/>
        <!-- Tail lights -->
        <rect x="12" y="24" width="2" height="1.5" fill="#ff0040" rx="0.25"/>
        <rect x="18" y="24" width="2" height="1.5" fill="#ff0040" rx="0.25"/>
      </g>
    </svg>
  `;
};

// Create a Google Maps icon object with the car SVG
export const createCarIcon = (heading = 0, status = 'active') => {
  const color = statusColors[status] || statusColors.active;
  const isEmergency = status === 'emergency';
  const svg = createCarSvg(heading, color, isEmergency);

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 32, height: 32 },
    anchor: { x: 16, y: 16 },
  };
};

// Alternative: Simple arrow/direction indicator for minimal style
export const createDirectionIcon = (heading = 0, status = 'active') => {
  const color = statusColors[status] || statusColors.active;
  const isEmergency = status === 'emergency';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
      <defs>
        <filter id="carGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g transform="rotate(${heading}, 12, 12)" filter="url(#carGlow)">
        <!-- Outer ring -->
        <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="1" opacity="0.5"/>
        <!-- Direction arrow -->
        <polygon
          points="12,3 18,18 12,14 6,18"
          fill="${color}"
          stroke="#001100"
          stroke-width="0.5"
        />
        ${isEmergency ? '<animate attributeName="opacity" values="1;0.4;1" dur="0.3s" repeatCount="indefinite"/>' : ''}
      </g>
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 28, height: 28 },
    anchor: { x: 14, y: 14 },
  };
};

// Parking marker icon
export const createParkingIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="2" y="2" width="20" height="20" fill="#001100" stroke="#00ff41" stroke-width="1"/>
      <text x="12" y="17" text-anchor="middle" fill="#00ff41" font-family="monospace" font-size="14" font-weight="bold">P</text>
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 24, height: 24 },
    anchor: { x: 12, y: 12 },
  };
};

// Route endpoint icons
export const createEndpointIcon = (type = 'start') => {
  const isStart = type === 'start';
  const color = isStart ? '#00ff41' : '#ff0040';
  const label = isStart ? 'A' : 'B';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
      <defs>
        <filter id="endpointGlow">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#endpointGlow)">
        <rect x="2" y="2" width="16" height="16" fill="#001100" stroke="${color}" stroke-width="1.5"/>
        <text x="10" y="14" text-anchor="middle" fill="${color}" font-family="monospace" font-size="10" font-weight="bold">${label}</text>
      </g>
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 20, height: 20 },
    anchor: { x: 10, y: 10 },
  };
};

export default createCarIcon;
