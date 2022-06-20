import React, { useEffect, useRef, useState } from "react";
import { SidePanel } from "./SidePanel";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import { SystemHelper } from "./SystemHelper";

import { WaySelector } from "./WaySelector";
import { DateSelector } from "./DateSelector";
import { Router, useRoute } from "./Router";
import { BoundsSelector } from "./BoundsSelector";
import { ModalWrapper } from "./Modal";
import { SectorSelector } from "./SectorSelector";
import { DateList } from "./DateList";
import { DownloadHelper } from "./DownloadHelper";

export const MainWindow = () => {
  return (
    <div className="main-window">
      <SystemHelper />
      <ModalWrapper>
        {(modal) => (
          <Router additionalProps={{ modal }}>
            {() => ({
              routes: [
                useRoute({ component: WaySelector, key: "main", home: true }),
                useRoute({ component: DateSelector, key: "by_date" }),
                useRoute({ component: BoundsSelector, key: "by_bounds" }),
                useRoute({ component: SectorSelector, key: "map" }),
                useRoute({ component: DateList, key: "date_list" }),
                useRoute({ component: DownloadHelper, key: "download" }),
              ],
            })}
          </Router>
        )}
      </ModalWrapper>
    </div>
  );
};
