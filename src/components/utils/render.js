// 引入three.js
import * as THREE from "three";

const antennasMaterial = new THREE.MeshBasicMaterial({
  color: 0x5cdd2e,
});

// 根据不同的模型的名称渲染不同的材质
export const renderMaterial = (model) => {
  // 墙面高光对象名称列表 用于表面发光
  const wallSurfaceKey = "JZ-QT-";
  // 功分器和耦合器名称列表
  const gfKey = "GF";
  const OHKey = "OH";
  // 电梯表面名称列表 用于表面发光
  const escalatorSurfaceKey = "JZ-FT-fs";
  // 电梯名称列表
  const escalatorKey = "JZ-FT";
  // 楼梯表面名称列表 用于表面发光
  const stairsSurfaceKey = "JZ-LT-fs";
  // 楼梯名称列表
  const stairsKey = "JZ-LT";
  // 馈线名称列表
  const filamentKey = "KX";
  // 主机默认前缀（如果模型只有一个主机就用这个名称，如果多于1个则...）
  const hostPrefix = "RRU";
  // 弱电连接口
  const electricPrefix = "KX-ZD";

  const wallSurfaceMaterial = new THREE.MeshBasicMaterial({
    color: 0x3fc6e0,
    side: THREE.DoubleSide,
  });

  const filamentMaterial = new THREE.MeshBasicMaterial({
    color: 0xd62c2c,
    opacity: 0.5,
  });

  const electricMaterial = new THREE.MeshBasicMaterial({
    color: 0xe3c321,
    opacity: 0.5,
  });

  const mainMaterial = new THREE.MeshLambertMaterial({
    color: 0x22609c,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    // depthTest: false,
  });

  const gfMaterial = new THREE.MeshBasicMaterial({
    color: 0x242625,
  });

  const escalatorMaterial = new THREE.MeshLambertMaterial({
    color: 0x0c67b1,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    depthTest: false,
  });

  const escalatorSurfaceMaterial = new THREE.MeshLambertMaterial({
    color: 0x09cce1,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
  });

  model.traverse(function (child) {
    if (child.isMesh) {
      if (child.name.indexOf(wallSurfaceKey) >= 0) {
        child.material = wallSurfaceMaterial;
      } else if (child.name.indexOf(electricPrefix) >= 0) {
        child.material = electricMaterial;
      } else if (child.name.indexOf(filamentKey) >= 0) {
        child.material = filamentMaterial;
      } else if (child.name.indexOf(escalatorSurfaceKey) >= 0) {
        child.material = escalatorSurfaceMaterial;
      } else if (child.name.indexOf(escalatorKey) >= 0) {
        child.material = escalatorMaterial;
      } else if (child.name.indexOf(stairsSurfaceKey) >= 0) {
        child.material = escalatorSurfaceMaterial;
      } else if (child.name.indexOf(stairsKey) >= 0) {
        child.material = escalatorMaterial;
      } else if (
        child.name.indexOf(gfKey) >= 0 ||
        child.name.indexOf(OHKey) >= 0
      ) {
        child.material = gfMaterial;
      } else {
        child.material = mainMaterial;
      }

      if (child.name == "Plane001" || child.name == "Obj_DM") {
        child.visible = false;
      }
    }
  });
};

// 根据不同类别生成不同信息框
export const produceDialogHtml = (item) => {
  // 天线的信息框
  const antennaInfoHtml = `
  <div class="box-container-wrap">
    <div class="box-container antenna-info">
      <div class=${item.antStatus == 1 ? "tip-green" : "tip-red"} >
        <div class="title">天线</div>
        <div class="label-text">
          <div class="label-text-title">天线编号:</div>
          <span class=${
            item.antStatus == 1 ? "label-value-green" : "label-value-red"
          }>
            ${item.antName}
          </span>
        </div>
        <div class="label-text">
          <div class="label-text-title">天线状态:</div>
          <span class=${
            item.antStatus == 1 ? "status-value-green" : "status-value-red"
          }>
          </span>
        </div>
        <div class="label-text">
          <div class="label-text-title">路损值:</div>
          <span class=${
            item.antStatus == 1 ? "label-value-green" : "label-value-red"
          }>
            ${item.pathLoss}
          </span>
        </div>
      </div>
    </div>
  </div>
		  `;
  // 主机的信息框
  const hostInfoHtml = `
  <div class="box-container-wrap">
    <div class="box-container host-info">
      <div class=${item.antStatus == 1 ? "tip-green" : "tip-red"} >
        <div class="title">监控主机</div>
        <div class="label-text">
          <div class="label-text-title">主机类型:</div>
          <span class=${
            item.antStatus == 1 ? "label-value-green" : "label-value-red"
          }>
            ${item.HostType}
          </span>
          <span class="status-value-white">
          </span>
        </div>
        <div class="label-text">
          <div class="label-text-title">开始功率:</div>
          <span class=${
            item.antStatus == 1 ? "label-value-green" : "label-value-red"
          }>
            ${item.startPower}
          </span>
          <span class="label-value-white">
            ${item.startPower}B
          </span>
        </div>
        <div class="label-text">
          <div class="label-text-title">结束功率:</div>
          <span class=${
            item.antStatus == 1 ? "label-value-green" : "label-value-red"
          }>
            ${item.endPower}
          </span>
          <span class="label-value-white">
            ${item.endPower}B
          </span>
        </div>
        <div class="label-text">
          <div class="label-text-title">发射功率:</div>
          <span class=${
            item.antStatus == 1 ? "label-value-green" : "label-value-red"
          }>
            ${item.transmitPower}
          </span>
          <span class="label-value-white">
            ${item.transmitPower}B
          </span>

        </div>
      </div>
    </div>
  </div>
		  `;

  return item.hostNumber ? hostInfoHtml : antennaInfoHtml;
};

// 渲染天线模型的材质
export const renderAntennaMaterial = (model, antennas) => {
  model.traverse(function (child) {
    if (
      child.isMesh &&
      antennas.map((item) => item.antName).includes(child.name)
    ) {
      child.material = antennasMaterial;
    }
  });
};
