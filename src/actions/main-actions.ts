import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { checkDates, getDownloadDS } from "../backend/usgs-api";
import { RootState } from "../entry-points/app";


export type DisplayId = string
export type USGSLayerType = 'ST_TRAD' | 'ST_ATRAN' | 'ST_URAD' | 'ST_DRAD' | 'SR_B5' | 'SR_B4' | 'QA_PIXEL'

export interface ISceneState {
    stillLoading: boolean
    downloadPid?: number
    calculationPid?: number
    donwloadedFiles: Partial<Record<USGSLayerType, {
        url: string
        loaded: boolean
        progress: number
        size?: number
    }>>
    calculation: number
    calculated: boolean
}
interface IMainState {
    loading: boolean
    wait: boolean
    lastAvailableDate?: Date
    scenes: Partial<Record<DisplayId, ISceneState>>
}

const initialState: IMainState = {
    loading: false,
    wait: false,
    scenes: {}
}

export const watchScenesState = createAsyncThunk<Partial<Record<string, ISceneState>>, void>(
    'scenes/watch',
    async (_, thunkApi) => {
        const state = await window.ElectronAPI.invoke.watch()
        console.log('state', state)
        return state
    }
)

export const donwloadScene = createAsyncThunk<void, {entityId: string, displayId: DisplayId}>(
    'scenes/download',
    async (payload, thunkApi) => {
        try {
            const ds = await getDownloadDS(payload.entityId)
            console.log({ds})
            window.ElectronAPI.invoke.download({ds, ...payload})
        } catch(e) {
            console.error(e)
            thunkApi.rejectWithValue(e)
        }
    }
)

const mainActions = createSlice({
    name: 'main',
    initialState,
    reducers: {
        setDate(
            state,
            action: PayloadAction<string>
        ) {
            state.lastAvailableDate = new Date(action.payload)
        },
        setSceneState(
            state,
            action: PayloadAction<{displayId: DisplayId, state: ISceneState}>
        ) {
            if (!action.payload.state) {
                delete state.scenes[action.payload.displayId]
                return
            }
            state.scenes[action.payload.displayId] = action.payload.state
        }
    },
    extraReducers(builder) {
        builder
        .addCase(donwloadScene.pending, (state, action) => {
            state.wait = true
            state.scenes[action.meta.arg.displayId] = {
                stillLoading: true,
                donwloadedFiles: {},
                calculated: false,
                calculation: 0,
            }
        })
        .addCase(donwloadScene.fulfilled, (state) => {
            state.wait = false
        })
        .addCase(donwloadScene.rejected, (state, action) => {
            state.wait = false
            delete state.scenes[action.meta.arg.displayId]
        })
        .addCase(watchScenesState.pending, (state) => {
            state.loading = true
        })
        .addCase(watchScenesState.fulfilled, (state, action) => {
            state.loading = false
            state.scenes = action.payload
        })
        .addCase(watchScenesState.rejected, (state) => {
            state.loading = false
        })
    },
})

export const {setDate, setSceneState} = mainActions.actions

export const selectMain = (state: RootState) => state.main

export {mainActions}