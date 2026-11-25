import { useApi } from "./useApi.js";
export function useList(url, params = {}, options = {}) {
  const { data, ...state } = useApi(url, params, options);
  return {
    result: data,
    ...state,
  };
}
export default useList;
