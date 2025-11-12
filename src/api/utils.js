export const formatAntennaList = (data) => {
  const { sfInfo } = data;
  let hostList = [],
    antennaList = [];
  sfInfo.map((host, idx) => {
    const { antennas, ...hostInfo } = host;
    // 1. 只有一个主机时，主机名称为RRU，否则为RRU-1、RRU-2...
    // 2. 主机状态：1-在线，4-离线
    // 3. 主机的编号不与模型绑定，但绑定后需要一直是该编号。
    hostList.push({
      ...hostInfo,
      antName: idx > 0 ? `RRU-${idx}` : "RRU",
      antStatus: hostInfo.deviceStatus === "Offline" ? 4 : 1,
    });
    antennaList = antennaList.concat(antennas);
  });
  return { hostList, antennaList };
};
