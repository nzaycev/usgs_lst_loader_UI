import React, { ReactNode, useEffect, useState } from "react";


interface IRouter {
    children(navigation: INavigation): {
        routes: (typeof Route)[]
    },
    additionalProps: any
}

export interface INavigation {
    go(key: string, data?: any): void
    home(): void
    getData(): any
}

interface IRouterState {
    currentNode: IRoute
    temporalData: any
}

/**
 * 
 * some notes
 */
export const Router = ({children, additionalProps}: IRouter) => {

    if (!children) {
        return
    }

    const navigation: INavigation = {
        go: (key, data) => {
            const node = currentState.routes.find(x => x.key === key)
            if (!node) {
                throw new Error('No such key')
            }
            updateRoutingState({currentNode: node, temporalData: data})
        },
        home: () => {
            const node = currentState.routes.find(x => x.home)
            if (!node) {
                throw new Error('No home provided')
            }
            updateRoutingState({'currentNode': node})
        },
        getData: () => {
            return routingState.temporalData
        }
    }

    const currentState = children(navigation)
    const [routingState, setRoutingState] = useState<IRouterState>({
        currentNode: currentState.routes.find(x => x.home),
        temporalData: null
    })


    const updateRoutingState = (newState: Partial<IRouterState>) => {
        setRoutingState(state => ({
            ...state,
            ...newState
        }))
    }
    
    // useEffect(() => {
    //     
    //     
    //     updateRoutingState('currentNode', home.component)
    // }, [currentState])
    // return <h3>12 {}</h3>
    const Component = routingState.currentNode.component
    return <>
        <Component navigation={navigation} {...additionalProps} />
    </>
}

interface IRoute {
    key: string
    component: React.FC<{navigation: any}>
    home?: boolean
}

export const useRoute = ({component, home, key}: IRoute) => {
    return {component, home, key}
}
const Route = useRoute({component: null, home: true, key: ''})
