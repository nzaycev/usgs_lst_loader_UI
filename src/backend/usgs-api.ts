import axios from "axios"
import { ISearchScenesFilter } from "../tools/ElectronApi";
import dotenv from 'dotenv'

console.log('dotenv', dotenv.config())
console.log('procenv', process.env)

const USGS_API_URL = 'https://m2m.cr.usgs.gov/api/api/json/stable'
const username = process.env.usgs_username
const password = process.env.usgs_password

// Init instance of axios which works with BASE_URL
export const axiosInstance = axios.create({ baseURL: USGS_API_URL });

const createSession = async () => {
  console.log("create session")
  const authParams = {
    username,
    password
  }
  console.log('auth', authParams)
  const resp = await axios.post(`${USGS_API_URL}/login`, authParams)
  const {data} = resp.data // getting cookie from request
  const [cookie] = resp.headers["set-cookie"]
  ;(axiosInstance.defaults.headers as any)['User-Agent'] = 'Node USGS'
  ;(axiosInstance.defaults.headers as any)['X-Auth-Token'] = data
  ;(axiosInstance.defaults.headers as any)['Cookie'] = cookie
  return [cookie, data]; // return Promise<cookie> because func is async
};

let isGetActiveSessionRequest = false;
let requestQueue: any[] = [];

const callRequestsFromQueue = (cookie: any, XAuth: any) => {
  requestQueue.forEach(sub => sub(cookie, XAuth));
};
const addRequestToQueue = (...sub: any) => {
  requestQueue.push(...sub);
};
const clearQueue = () => {
  requestQueue = [];
};

// registering axios interceptor which handle response's errors
axiosInstance.interceptors.response.use(null, error => {
  console.error(error.message); //logging here

  const { response = {}, config: sourceConfig } = error;

  // checking if request failed cause Unauthorized
  if (response.data.errorCode === 'UNAUTHORIZED_USER') {
    // if this request is first we set isGetActiveSessionRequest flag to true and run createSession
    if (!isGetActiveSessionRequest) {
      isGetActiveSessionRequest = true;
      createSession().then(([cookie, XAuth]) => {
        // when createSession resolve with cookie value we run all request from queue with new cookie
        isGetActiveSessionRequest = false;
        callRequestsFromQueue(cookie, XAuth);
        clearQueue(); // and clean queue
      }).catch(e => {
        isGetActiveSessionRequest = false; // Very important!
        console.error('Create session error %s', e.message);
        clearQueue();
      });
    }

    // and while isGetActiveSessionRequest equal true we create and return new promise
    const retryRequest = new Promise(resolve => {
      // we push new function to queue
      addRequestToQueue((cookie: any, XAuth: any) => {
        // function takes one param 'cookie'
        console.log("Retry with new session context %s request to %s", sourceConfig.method, sourceConfig.url);
        sourceConfig.headers.Cookie = cookie; // setting cookie to header
        sourceConfig.headers['X-Auth-Token'] = XAuth; // setting cookie to header
        resolve(axios(sourceConfig)); // and resolve promise with axios request by old config with cookie
        // we resolve exactly axios request - NOT axiosInstance's request because it could call recursion
      });
    });

    return retryRequest;
  } else {
    // if error is not related with Unauthorized we just reject promise
    return Promise.reject(error);
  }
});

const datasetName = "landsat_ot_c2_l2"

const defaultSceneFilter = {
  sceneFilter: {
    "where": {
        "filterType": "and",
        "childFilters": [
            {
                "filterType": "value",
                "filterId": '61b0ca3aec6387e5',
                "value": '8', // LC08
                "operand": "="
            },
            {
                "filterType": "value",
                "filterId": "5f6a6fb2137a3c00",
                "value": 'T1',
                "operand": "="
            },
            {
                "filterType": "value",
                "filterId": "5e83d14f567d0086",
                "value": 'SP', // L2SP
                "operand": "="
            }
        ]
    }
  }
}

export const searchScenes = async ({startDate, endDate, bounds}: ISearchScenesFilter) => {
    const filters: any = {
        datasetName,
        maxResults: 50000,
        ...defaultSceneFilter,
    }

    if (startDate && endDate) {
        filters.sceneFilter['acquisitionFilter'] = {
            "start": startDate,
            "end": endDate
        }
    }

    if (bounds) {
        const {lng, lat} = bounds
        const ll = { "longitude": Math.min(...lng), "latitude": Math.min(...lat) }
        const ur ={ "longitude": Math.max(...lng), "latitude": Math.max(...lat) }
        filters.sceneFilter["spatialFilter"] = {
            "filterType": "mbr",
            "lowerLeft": ll,
            "upperRight": ur
        }
    }

    try {
      const {data} = await axiosInstance.post('scene-search', filters)
      return {...data, ...filters}
    } catch (e) {
      throw new Error(`Can't get scenes cause of ${e}`)
    }
}

export const checkDates = async () => {
  const filters = {
    datasetName,
    maxResults: 1,
    ...defaultSceneFilter,
  }
  try {
    const {data} = await axiosInstance.post('scene-search', filters)
    // return data
    return data['data']['results'][0]['temporalCoverage']['endDate']
  } catch (error) {
    throw new Error(`Can't check dates cause of ${error}`)
  }
}