import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styled from "styled-components";

export const SceneList = styled.ul`
    list-style: none;
    width: 100%;
    padding: 60px 24px 40px 24px;
    margin: 0
`

export const SceneListItem = styled.li`
    display: flex;
    flex-direction: column;
    width: 100%;
`

export const AggregatedView = styled.div`
    display: flex;
    padding: 0 8px;
    height: 40px;
    align-items: center;
    position: relative;
    width: 100%;
    overflow: hidden;
`

export const ExpandTrigger = styled(FontAwesomeIcon).attrs({icon: faChevronDown})<{expanded: boolean}>`
    cursor: pointer;
    transform: scaleY(
        ${({expanded}) => expanded ? -1 : 1}
    );
    &:hover {
        color: blue;
    };
    flex-shrink: 0;
    margin-right: 8px;
`

export const LabelWithProgress = styled.div`
    position: relative;
    display: flex;
`

export const ProgressBar = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    z-index: -1;
    background-color: #9ceda0;
`

export const DetailsView = styled.div`
    width: 100%;
    display: grid;
    grid-template-columns: 50% 50%;
`

export const AddButton = styled.div`
    position: fixed;
    right: 24px;
    bottom: 24px;
    background-color: blue;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 24px;
    cursor: pointer;
    box-shadow: 3px 5px 18px #006edcb5;
`