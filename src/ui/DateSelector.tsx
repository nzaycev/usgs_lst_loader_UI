import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAppSelector } from "../entry-points/app";
import { selectMain } from "../actions/main-actions";
import { useTypedNavigate } from "./mainWindow";

export const DateSelector = () => {
  const {lastAvailableDate} = useAppSelector(selectMain)
  const navigate = useTypedNavigate()

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: 'column'
      }}
    >
      {!lastAvailableDate && <>Loading...</>}
      <br/>
      <Calendar
        tileDisabled={() => !lastAvailableDate}
        onChange={(date: any) => {
            navigate('/map', {state: {date: new Date(date)}})
        }}
        maxDate={lastAvailableDate}
        minDate={new Date("2013-03-23")}
      />
      <br/>
      <button onClick={() => navigate('/')}>Назад</button>
    </div>
  );
};
