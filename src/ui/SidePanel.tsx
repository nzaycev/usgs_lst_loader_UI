import moment from "moment";
import React, { ReactChildren, useRef, useState } from "react"
// import DatePicker from "react-datepicker";
import { SingleDatePicker } from 'react-dates';
import "./SidePanel.m.css"

const dateFormat = (date: Date) => `
    ${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}
`

const appendDate = (date: Date, days: number) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

function searchScenes(startDate: Date, loadSectors: any) {
    const endDate = appendDate(startDate, 1)
    fetch(`http://127.0.0.1:5000/search_scenes?startDate=${dateFormat(startDate)}&endDate=${dateFormat(endDate)}`)
        .then(x => x.json())
        .then(x => {
            loadSectors(x.results.map((xx: any) => ({...xx.spatialBounds, properties: xx})))
        })
}

const DateInput = (props: {value: string, setValue: (val: string) => void}) => {
    // return <>{dateFormat(new Date())}</>
    return <input type="date" min={'2013-02-11'} max={dateFormat(new Date())} onChange={e => props.setValue(e.target.value)} value={props.value} />
}

const LayersSelector = (props: {value: string, setValue: (val: string) => void}) => {
    const {value, setValue} = props
    const values = value.split(',')
    const getView = (id: string, label: string) => {
        const index = values.indexOf(id)
        const includes = index !== -1
        return <div>
            <input checked={includes} type="checkbox" id={id} onChange={e => {
                if (includes) {
                    setValue(
                        [values.slice(0, index), values.slice(index + 1)].flat().join(',')
                    )
                }
                else {
                    setValue([values, [id]].flat().join(','))
                }
            }} />
            <label htmlFor={id}>{label}</label>
        </div>
    }

    return <ul className="usgs-lst__side-panel__layers-selector">
        <li>{getView('ndvi', "NDVI")}</li>
        <li>{getView('emission', 'Emission')}</li>
        <li>{getView('vegProp', 'Vegetation property')}</li>
    </ul>
}

interface ISidePanel {
    children?: ReactChildren
    searchCount?: number
    found: boolean
    startSearching(): void
    loadSectors(sectors: any[]): void
}

export const SidePanel = ({loadSectors, searchCount, startSearching, found}: ISidePanel) => {
    const [formState, setFormState] = useState({
        sector: '',
        date: '',
        layers: ''
    })
    return <div className={'usgs-lst__side-panel__container'}>
        <div className="usgs-lst__side-panel__header">
            <h3>Welcome to</h3>
            <h4>USGS LST loader</h4>
        </div>
        <div>
            <FormField 
                label="Дата начала"
                value={formState['date']}
                CustomInput={DateInput}
                setValue={val => setFormState({...formState, 'date': val})}
            />
            {formState.date ?
                <button onClick={() => {
                    startSearching()
                    searchScenes(new Date(formState['date']), loadSectors)
                }}>Найти</button>
                : <span>Дата не выбрана</span>
            }
            {/* <FormField 
                label="Номер сектора"
                value={formState['sector']}
                setValue={val => setFormState({...formState, 'sector': val})}
            />
            <FormField 
                label="Дата"
                value={formState['date']}
                setValue={val => {
                    searchScenes(new Date(val))
                    setFormState({...formState, 'date': val})
                }}
                CustomInput={DateInput}
            />
            <FormField 
                label="Сохранить промежуточные слои"
                value={formState['layers']}
                setValue={val => setFormState({...formState, 'layers': val})}
                CustomInput={LayersSelector}
            />
            <button >
                Загрузить
            </button> */}
            {found &&
                <div className="usgs-lst__side-panel__footer">
                    {searchCount 
                        ? `Доступно ${searchCount} сцен для загрузки в выбранную дату. Для загрузки кликните на нужную сцену на карте`
                        : `Нет доступных сцен в выбранную дату`}
                </div>
            }
        </div>
    </div>
}

const FormField = (props: {
    label: string,
    value: string,
    setValue: (val: string) => void,
    CustomInput?: React.ComponentType<{
        value: string,
        setValue: (val: string) => void
    }>
}) => {
    const unique = useRef(`${new Date().getTime()}-${Math.random().toString().replace('0.', '')}`)
    const id = `Form_field_${unique}`
    const {label, value, setValue, CustomInput} = props
    return <div className="usgs-lst__side-panel__form-field">
        <label htmlFor={id}>{label}</label>
        {CustomInput
            ? <CustomInput value={value} setValue={setValue} />
            : <input type="text" value={value} onChange={e => setValue(e.target.value)} />
        }
    </div>
}