import { createAxios } from "@/api/request";
const baseUrl = "http://127.0.0.1:18080";
const request = createAxios();
import mockServer from "@/mockServer/list";
// 获取主机详情
export const getHostList = (stationId, params) =>
  request.post(`${baseUrl}/3d/hostList/${stationId}`, {
    params,
    loading: true,
  });
// 获取天线列表
export const getStationAntennaList = (stationId, params) => {
  // 判断 isTest 参数为true 或者 false
  // 如果是true则返回 mockserver 中的数据
  // 如果是 false 则返回真实接口的数据
  // 获取 url 中的isTest 参数值
  const isTest =
    location.search.indexOf("isTest") >= 0 &&
    location.search.split("isTest=")[1];
  if (isTest === "true") {
    return mockServer[1].response().data;
  } else {
    return request.post(`${baseUrl}/3d/station/${stationId}`, {
      params,
      loading: true,
    });
  }
};
