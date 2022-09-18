import React from "react"
import { useTypedNavigate } from "./mainWindow"

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

export const WaySelector = () => {
    const navigate = useTypedNavigate()
    return <div className="way-selector">
        <Card label="По Дате" description={`
            После выбора даты, вам будут предложены снимки, сделанные в эту дату. Область будет отображена на карте
        `} onClick={() => {
            navigate('/date-selector')
        }} />
        <Card label="По области интереса" description={`
            Вам будет предложено выбрать прямоугольник в области, где бы вы хотели получить снимки. Далее, будет предложен список доступных дат.
        `} onClick={() => {
            navigate('/bounds')
        }}/>
        <button onClick={() => {
            navigate('/download-manager')
        }}>go to dm</button>
    </div>
}
