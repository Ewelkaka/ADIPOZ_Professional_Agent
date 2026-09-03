import React from 'react';
import { BmiChartPointData } from './CustomBmiTooltip';

interface CustomBmiChartDotProps {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: BmiChartPointData;
  value?: number;
  index?: number;
  onSelectVisit?: (recordId: string) => void;
  showMedicationBadges?: boolean;
}

/**
 * Niestandardowy punkt na linii wykresu BMI
 * Wyróżnia wizyty, w których pacjent rozpoczął przyjmowanie nowych leków
 */
export const CustomBmiChartDot: React.FC<CustomBmiChartDotProps> = ({
  cx,
  cy,
  stroke = '#8b5cf6',
  payload,
  onSelectVisit,
  showMedicationBadges = true,
}) => {
  if (cx === undefined || cy === undefined || !payload) return null;

  const hasNewMed = Boolean(payload.hasNewMedication && payload.newMedications && payload.newMedications.length > 0);
  const firstNewMed = hasNewMed ? payload.newMedications![0] : '';
  // Skrócona nazwa pierwszego leku do etykiety
  const shortMedName = firstNewMed.length > 14 ? `${firstNewMed.substring(0, 12)}…` : firstNewMed;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (payload.recordId && onSelectVisit) {
      onSelectVisit(payload.recordId);
    }
  };

  if (hasNewMed) {
    return (
      <g 
        className="cursor-pointer group" 
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-label={`Rozpoczęcie farmakoterapii: ${payload.newMedications?.join(', ')}`}
      >
        {/* Efekt pulsującej aury */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={15} 
          fill="#ec4899" 
          fillOpacity={0.2} 
          className="animate-pulse" 
        />
        
        {/* Zewnętrzny pierścień znacznika leku */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={9} 
          fill="#db2777" 
          stroke="#ffffff" 
          strokeWidth={2.5} 
          className="transition-transform duration-200 group-hover:scale-125"
        />

        {/* Wewnętrzny symbol pigułki w SVG */}
        <path
          d={`M ${cx - 3.5} ${cy + 3.5} L ${cx + 3.5} ${cy - 3.5}`}
          stroke="#ffffff"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <circle cx={cx - 1.5} cy={cy - 1.5} r={1.2} fill="#ffffff" />
        <circle cx={cx + 1.5} cy={cy + 1.5} r={1.2} fill="#ffffff" />

        {/* Etykietka nad punktem (badge leku) */}
        {showMedicationBadges && (
          <g transform={`translate(${cx}, ${cy - 18})`} className="pointer-events-none">
            {/* Tło kapsułki */}
            <rect
              x={-34}
              y={-12}
              width={68}
              height={15}
              rx={7.5}
              fill="#831843"
              stroke="#f472b6"
              strokeWidth={1}
              fillOpacity={0.92}
            />
            {/* Tekst na kapsułce */}
            <text
              x={0}
              y={-2}
              textAnchor="middle"
              fill="#fdf2f8"
              fontSize={8.5}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              💊 {shortMedName || 'Nowy lek'}
            </text>
          </g>
        )}
      </g>
    );
  }

  // Standardowy punkt dla wizyt bez nowych leków
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.recordId ? 5 : 4}
      fill={stroke}
      stroke="#ffffff"
      strokeWidth={1.5}
      className="cursor-pointer transition-transform hover:scale-125"
      onClick={handleClick}
    />
  );
};

interface CustomBmiXAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value: string;
    index: number;
  };
  data?: BmiChartPointData[];
  onSelectVisit?: (recordId: string) => void;
}

/**
 * Niestandardowy znacznik na osi X
 * Wyświetla datę oraz ikonę pigułki 💊 w dniach, gdy wprowadzono nowe leki
 */
export const CustomBmiXAxisTick: React.FC<CustomBmiXAxisTickProps> = ({
  x = 0,
  y = 0,
  payload,
  data = [],
  onSelectVisit,
}) => {
  if (!payload) return null;

  const pointData = data.find(d => d.date === payload.value) || data[payload.index];
  const hasNewMed = Boolean(pointData?.hasNewMedication);

  const handleClick = (e: React.MouseEvent) => {
    if (pointData?.recordId && onSelectVisit) {
      e.stopPropagation();
      onSelectVisit(pointData.recordId);
    }
  };

  return (
    <g 
      transform={`translate(${x},${y})`} 
      className={hasNewMed ? 'cursor-pointer group' : ''}
      onClick={hasNewMed ? handleClick : undefined}
    >
      {/* Etykieta daty */}
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill={hasNewMed ? '#db2777' : '#64748b'}
        fontSize={11}
        fontWeight={hasNewMed ? 700 : 500}
        className="select-none"
      >
        {payload.value}
      </text>

      {/* Znacznik zdarzenia farmakoterapii na osi X */}
      {hasNewMed && (
        <g transform="translate(0, 24)">
          <rect
            x={-12}
            y={-7}
            width={24}
            height={14}
            rx={7}
            fill="#fce7f3"
            stroke="#f472b6"
            strokeWidth={1}
            className="group-hover:fill-pink-200 transition-colors"
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize={9}
            className="select-none"
          >
            💊
          </text>
        </g>
      )}
    </g>
  );
};
