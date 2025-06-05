import React from 'react';
import FullCalendar from '@fullcalendar/react';
// Import necessary plugins for the calendar
import dayGridPlugin from '@fullcalendar/daygrid';

// Define the type for the events prop
interface MainCalendarProps {
  events: { title: string; date: string }[];
}

const MainCalendar: React.FC<MainCalendarProps> = ({ events }) => {
  return (
    <div style={{ padding: '1rem' }}>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridYear"
        height="auto"
        events={events}
      />
    </div>
  );
};

export default MainCalendar;
