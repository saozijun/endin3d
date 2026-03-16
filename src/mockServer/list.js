export default [
  {
    url: "/3d/hostList",
    method: "post",
    response: ({ query }) => {
      return {
        code: 0,
        msg: "3D室分数据获取完毕",
        data: {
          hosts: [
            {
              id: "1648918306430312449",
              enableFlag: true,
              addTime: "2023-06-30T17:05:32.011+00:00",
              hostNum: "22080003",
              unitName: "",
              lineId: "19",
              lineName: "19号线",
              stationId: "1909",
              stationName: "双流机场2航站楼东站",
              startPower: "28",
              endPower: "33",
              startFrequency: "",
              endFrequency: "",
              hostType: "固定式主机",
              witeTime: null,
              readTime: "",
              sourcePowerCorrection: "0",
              installPosition: "",
              accurateReading: false,
              troubleshooting: false,
              ipAddress: "192.168.118.136",
              port: "1883",
              transmitPower: "33",
              frequencyStep: "",
              faultDiagnosisCycle: "",
              faultDiagnosisTime: "",
              faultDiagnosisNumber: "",
              pid: "1648918242316181505",
              probeList: null,
              deviceStatus: "设备离线",
            },
          ],
        },
      };
    },
  },

  {
    url: "/3d/station/:stationId",
    method: "post",
    response: () => {
      let antennas = [];

      for (let index = 0; index < 400; index++) {
        let antName = "";
        if (index <= 9) {
          antName = `A${index}`;
          antennas.push({
            probeId: "e2806995000040109b8592a8",
            antNumber: "01",
            antTypeName: "全向吸顶天线",
            antName: `ANT-0${index}`,
            antStatus: 3,
            pathLoss: 120,
          });
        } else if (index > 9 && index <= 99) {
          antName = `A${index}`;
          // 特殊命名模拟
          antennas.push({
            probeId: "e2806995000040109b8592a8",
            antNumber: "01",
            antTypeName: "全向吸顶天线",
            antName: `ANT-${index}`,
            antStatus: 3,
            pathLoss: 120,
          });
        } else if (index > 99 && index <= 400) {
          antName = `A${index}`;
          antennas.push({
            probeId: "e2806995000040109b8592a8",
            antNumber: "01",
            antTypeName: [305, 306, 307].includes(index)
              ? "定向天线"
              : "全向吸顶天线",
            antName: `A${index}`,
            antStatus: 3,
            pathLoss: 120,
          });
        }
        if (index === 165 || index === 164) {
          // 定向天线模拟
          antennas.push({
            probeId: "e2806995000040109b8592a8",
            antNumber: "01",
            antTypeName: "定向天线",
            antName: antName,
            antStatus: 3,
            pathLoss: 120,
          });
        } else {
          antennas.push({
            probeId: "e2806995000040109b8592a8",
            antNumber: "01",
            antTypeName: "全向吸顶天线",
            antName: antName,
            antStatus: 3,
            pathLoss: 120,
          });
        }
      }
      antennas = antennas.map((item) => {
        item.antStatus = Math.floor(Math.random() * 3 + 1);
        return item;
      });
      return {
        data: {
          hostCount: 0,
          hostError: 0,
          hostNormal: 0,
          antennaCount: 4,
          antennaOnlineCount: 0,
          antennaErrorCount: 4,
          sfInfo: [
            {
              hostNumber: "23120116",
              HostType: "固定式主机",
              startFrequency: "-1",
              endFrequency: "-1",
              startPower: "28",
              endPower: "32",
              transmitPower: "33",
              deviceStatus: "Offline",
              antennas: antennas,
            },
            {
              hostNumber: "23120117",
              HostType: "固定式主机",
              startFrequency: "-1",
              endFrequency: "-1",
              startPower: "28",
              endPower: "32",
              transmitPower: "33",
              deviceStatus: "Offline",
              antennas: [],
            },
            {
              hostNumber: "23120118",
              HostType: "固定式主机",
              startFrequency: "-1",
              endFrequency: "-1",
              startPower: "28",
              endPower: "32",
              transmitPower: "33",
              deviceStatus: "Offline",
              antennas: [],
            },
          ],
        },
        code: 0,
        msg: "3D室分数据获取完毕",
      };
    },
  },
];
