import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../entry-points/app";

interface IMainState {
    lastAvailableDate?: Date
}

const initialState: IMainState = {}

const mainActions = createSlice({
    name: 'main',
    initialState,
    reducers: {
        setDate(
            state,
            action: PayloadAction<string>
        ) {
            state.lastAvailableDate = new Date(action.payload)
        }
    }
})

export const {setDate} = mainActions.actions

export const selectMain = (state: RootState) => state.main

export {mainActions}