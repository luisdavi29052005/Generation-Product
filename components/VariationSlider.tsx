import React from 'react';

interface VariationSliderProps {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  disabled?: boolean;
}

const VariationSlider: React.FC<VariationSliderProps> = ({ label, value, onChange, min, max, disabled }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center">
        <label htmlFor="variation-slider" className="font-semibold text-slate-300 text-base">
          {label}
        </label>
        <span className="w-12 text-center bg-slate-700 text-blue-300 font-bold text-lg rounded-md py-1">
          {value}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          id="variation-slider"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${percentage}%, #334155 ${percentage}%)`
          }}
        />
      <style>{`
        .slider-thumb::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            background: #ffffff;
            border-radius: 50%;
            border: 3px solid #3b82f6;
            cursor: pointer;
            transition: transform 0.1s ease-in-out;
        }
        .slider-thumb:active::-webkit-slider-thumb {
            transform: scale(1.1);
        }
        .slider-thumb::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: #ffffff;
            border-radius: 50%;
            border: 3px solid #3b82f6;
            cursor: pointer;
            transition: transform 0.1s ease-in-out;
        }
        .slider-thumb:active::-moz-range-thumb {
            transform: scale(1.1);
        }
      `}</style>
      </div>
    </div>
  );
};

export default VariationSlider;
