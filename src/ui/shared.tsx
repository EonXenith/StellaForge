import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

/** Collapsible section with chevron indicator */
export function Section({
  title,
  defaultOpen = false,
  children,
  right,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white transition-colors w-full"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="flex-1 text-left">{title}</span>
        {right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
      </button>
      {open && <div className="flex flex-col gap-1.5 pl-1">{children}</div>}
    </div>
  );
}

/** Unified slider with optional tooltip */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          {label}
          {tooltip && (
            <span className="relative group">
              <Info size={10} className="text-gray-500 cursor-help" />
              <span className="absolute left-4 top-0 z-50 hidden group-hover:block w-44 px-2 py-1 text-[10px] text-gray-200 bg-gray-800 border border-gray-600 rounded shadow-lg leading-tight">
                {tooltip}
              </span>
            </span>
          )}
        </span>
        <span className="tabular-nums">{value.toFixed(decimals)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
    </label>
  );
}

/** Toggle checkbox with label */
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-xs text-gray-300">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-500"
      />
    </label>
  );
}
