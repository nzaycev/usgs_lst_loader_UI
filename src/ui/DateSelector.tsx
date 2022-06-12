import React, { useEffect, useState } from "react";
import { INavigation } from "./Router";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import { IModalControl } from "./Modal";
import { getUrl } from "../tools/urls";

export const DateSelector = ({
  navigation,
  modalControl,
}: {
  navigation: INavigation;
  modalControl: IModalControl;
}) => {
  const [maxDate, setMaxDate] = useState<Date>(null);
  useEffect(() => {
    axios
      .get<string>(getUrl("checkDates"))
      .then(({ data: date }) => {
        setMaxDate(new Date(date));
      })
      .catch((e) => {
        modalControl.showModal({
          title: "Error",
          body: JSON.stringify(e),
          footer: null,
        });
      });
  }, []);
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
      {!maxDate && <>Loading...</>}
      <br/>
      <Calendar
        tileDisabled={() => !maxDate}
        onChange={(date: any) => {
            navigation.go('map', new Date(date))
        }}
        maxDate={maxDate}
        minDate={new Date("2013-03-23")}
      />
      <br/>
      <button onClick={navigation.home}>Назад</button>
    </div>
  );
};
