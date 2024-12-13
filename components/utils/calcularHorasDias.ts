const calculateWorkingDays = (
  start: Date | null,
  end: Date | null,
  holidays: Date[]
): number | string => {
  if (!start || !end || start >= end) return "0";

  let count = 0;
  const curDate = new Date(start);

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    const isHoliday = holidays.some(
      (holiday) => holiday.toDateString() === curDate.toDateString()
    );

    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }

  return count;
};

const calculateWorkingHours = (
  start: Date | null,
  end: Date | null,
  holidays: Date[]
): string => {
  if (
    !start ||
    !end ||
    isNaN(start.getTime()) ||
    isNaN(end.getTime()) ||
    start >= end
  ) {
    return "0"; // Validate both dates and return "N/A" if invalid or start >= end
  }

  const workHoursPerDay = 8;
  let totalHours = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const isHoliday = holidays.some(
      (holiday) => holiday.toDateString() === currentDate.toDateString()
    );

    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday) {
      if (
        currentDate.toDateString() === start.toDateString() &&
        currentDate.toDateString() === end.toDateString()
      ) {
        totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      } else if (currentDate.toDateString() === start.toDateString()) {
        const endOfDay = new Date(start);
        endOfDay.setHours(17, 0, 0, 0);
        totalHours += (endOfDay.getTime() - start.getTime()) / (1000 * 60 * 60);
      } else if (currentDate.toDateString() === end.toDateString()) {
        const startOfDay = new Date(end);
        startOfDay.setHours(9, 0, 0, 0);
        totalHours += (end.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      } else {
        totalHours += workHoursPerDay;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return totalHours.toFixed(2);
};

export { calculateWorkingDays, calculateWorkingHours };
