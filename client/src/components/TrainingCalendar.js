import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const TrainingCalendar = ({ events }) => {
  return (
    <Calendar
      tileContent={({ date }) => {
        const event = events.find(e => new Date(e.date).toDateString() === date.toDateString());
        return event ? <p>{event.title}</p> : null;
      }}
    />
  );
};

export default TrainingCalendar;