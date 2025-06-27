import React, { useState, useCallback, useEffect } from 'react';
import { debounce } from '../utilities/Debounce';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  initialColor: string; // Add initialColor prop
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, initialColor }) => {
  const [selectedColor, setSelectedColor] = useState<string>(initialColor); // Use initialColor for initial state

  const debouncedColorSelect = useCallback(
    debounce((color: string) => {
      onColorSelect(color);
    }, 300),
    [onColorSelect]
  );

  useEffect(() => {
    setSelectedColor(initialColor); // Update selected color when initialColor changes
  }, [initialColor]);

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
