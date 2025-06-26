import React, { useState, useCallback } from 'react';
import { debounce } from '../utilities/Debounce';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect }) => {
  const [selectedColor, setSelectedColor] = useState<string>('#000000');

  const debouncedColorSelect = useCallback(
    debounce((color: string) => {
      onColorSelect(color);
    }, 300), // Adjust the delay as needed
    [onColorSelect]
  );

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setSelectedColor(color);
    debouncedColorSelect(color);
  };

  return (
    <div>
      <input
        type="color"
        value={selectedColor}
        onChange={handleColorChange}
      />
    </div>
  );
};

export default ColorPicker;
