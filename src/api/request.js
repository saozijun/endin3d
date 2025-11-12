import axios from "axios";
import { ElMessage, ElLoading } from "element-plus";

let loadingInstance = null;
let requestNum = 0;
const defaultToken =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqYWNvYi11c2VyIiwiaWF0IjoxNzE4NzE4NTc1LCJleHAiOjE3MTkyNjIwMDgsImlkIjoiMSIsImFjY291bnQiOiJhZG1pbiJ9.fgFP37mLmnFThlUwm4EOkAhKB6GImF1iV9mosfcYTWs";

const addLoading = () => {
  requestNum++;
  if (requestNum == 1) {
    loadingInstance = ElLoading.service({
      text: "正在努力加载中....",
      background: "rgba(0, 0, 0, 0)",
    });
  }
};

const cancelLoading = () => {
  requestNum--;
  if (requestNum === 0) loadingInstance?.close();
};

export const createAxios = (config) => {
  const axiosInstance = axios.create({
    timeout: 60 * 1000,
    withCredentials: true, //跨域携带cookie
    ...config,
  });

  axiosInstance.interceptors.request.use((config) => {
    config.headers = {
      "Content-Type": "application/json;charset=utf-8",
      Authorization: localStorage.getItem("eleToken") ?? defaultToken,
      ...config.headers,
    };
    addLoading();
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      const { code, data, msg } = response?.data;
      cancelLoading();

      if (code === 0) {
        return data;
      } else {
        ElMessage({
          message: msg || "Error: 请求失败",
          type: "error",
        });
        return Promise.reject(response.data);
      }
    },
    // error handler
    (error) => {
      cancelLoading();

      ElMessage({
        message: error?.data?.msg || "Error: 请求失败",
        type: "error",
      });
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
