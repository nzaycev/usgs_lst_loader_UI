import React from "react"
import { INavigation } from "./Router"

interface ICard {
    label: string
    description: string
    iconSrc?: string
    onClick: () => void
}

const Card = ({label, description, ...props}: ICard) => {
    return <div className="card" {...props}>
        <img />
        <h3>{label}</h3>
        <p>{description}</p>
    </div>
}

export const WaySelector = ({navigation}: {navigation: INavigation}) => {
    return <div className="way-selector">
        <Card label="По Дате" description={`
            После выбора даты, вам будут предложены снимки, сделанные в эту дату. Область будет отображена на карте
        `} onClick={() => {
            navigation.go('by_date')
        }} />
        <Card label="По области интереса" description={`
            Вам будет предложено выбрать прямоугольник в области, где бы вы хотели получить снимки. Далее, будет предложен список доступных дат.
        `} onClick={() => {
            navigation.go('by_bounds')
        }}/>
    </div>
}
