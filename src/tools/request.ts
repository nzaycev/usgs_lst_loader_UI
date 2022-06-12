import axios from "axios";
import { useEffect, useState } from "react";
import { INavigation } from "../ui/Router";

export const useLoader = <T>(
  loader: () => Promise<T>,
  processData = (x: any): T => x
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState<T>(null);
  useEffect(() => {
    console.log('mount loader')
    loader()
      .then((result) => {
        setData(processData(result));
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);
  return {data, error, isLoading};
};
