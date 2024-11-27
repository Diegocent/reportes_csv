import React from "react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  setDateRange: React.Dispatch<React.SetStateAction<{ from: Date; to: Date }>>;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  setDateRange,
}) => {
  return (
    <div className="w-full">
      <DatePickerWithRange
        date={dateRange}
        setDate={(date) =>
          setDateRange({
            from: date?.from ?? new Date(),
            to: date?.to ?? new Date(),
          })
        }
      />
    </div>
  );
};
