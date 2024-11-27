import React, { useState } from "react";

interface HolidayManagerProps {
  holidays: Date[];
  onAddHoliday: (date: Date) => void;
  onRemoveHoliday: (index: number) => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  onAddHoliday,
  onRemoveHoliday,
}) => {
  const [holidayInput, setHolidayInput] = useState("");

  const addHoliday = () => {
    const date = new Date(holidayInput + "T00:00:00");
    if (!isNaN(date.getTime())) {
      onAddHoliday(date);
      setHolidayInput("");
    } else {
      alert("Por favor, ingresa una fecha válida");
    }
  };

  return (
    <div>
      <input
        type="date"
        value={holidayInput}
        onChange={(e) => setHolidayInput(e.target.value)}
      />
      <button onClick={addHoliday}>Añadir Día Festivo</button>
      <ul>
        {holidays.map((holiday, index) => (
          <li key={index}>
            {holiday.toLocaleDateString()}{" "}
            <button onClick={() => onRemoveHoliday(index)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
